const {
  parseFkWebEvent,
  normalizeHistoryRecord,
} = require("./fkweb.parser");

const {
  getDeviceHealth,
} = require("./biometricDevice.service");

const {
  FkWebCommand,
} = require("./fkwebCommand.model");

const {
  processHeartbeat,
  processEnrollment,
  processPunch,
  processHistoricalPunches,
} = require("./fkweb.service");

const {
  getNextQueuedCommand,
  buildGetLogDataCommand,
  markCommandSent,
  markCommandReceiving,
  addImportStats,
  completeCommand,
  failCommand,
  findCommandByTransaction,
} = require("./fkwebCommand.service");

/* =========================================================
   HELPERS
========================================================= */

const normalizeText = (value) =>
  String(value ?? "").trim();

const getRequestIp = (req) => {
  const forwarded =
    req.headers["x-forwarded-for"];

  if (forwarded) {
    return String(forwarded)
      .split(",")[0]
      .trim();
  }

  return String(
    req.ip ||
      req.socket?.remoteAddress ||
      ""
  ).replace("::ffff:", "");
};

const getRequestDeviceId = (req) =>
  normalizeText(
    req.headers["device_id"] ||
      req.headers["device-id"] ||
      req.headers["deviceid"] ||
      req.headers["terminal_id"] ||
      req.headers["terminal-id"] ||
      req.headers["sn"] ||
      req.headers["serial_number"] ||
      req.query?.device_id ||
      req.query?.deviceId ||
      req.query?.deviceid ||
      req.query?.terminal_id ||
      req.query?.terminalId ||
      req.query?.SN ||
      req.query?.sn ||
      req.query?.serialNumber ||
      ""
  );

const getRequestTransactionId = (req) =>
  normalizeText(
    req.headers["trans_id"] ||
      req.headers["transaction_id"] ||
      req.query?.trans_id ||
      req.query?.transactionId ||
      ""
  );

/* =========================================================
   ACKNOWLEDGE DEVICE
========================================================= */

const acknowledge = (
  res,
  event = null
) => {
  if (event?.transactionId) {
    res.setHeader(
      "trans_id",
      event.transactionId
    );
  }

  res.setHeader(
    "response_code",
    "OK"
  );

  res.setHeader(
    "Connection",
    "close"
  );

  return res
    .status(200)
    .send("");
};

/* =========================================================
   SEND FKWEB COMMAND

   Keep command serialization isolated here.

   The command service creates the normalized command.
   Once the real machine communicates, this is the only
   transport adapter that would need changing if its firmware
   requires another wire representation.
========================================================= */

const sendCommand = (
  res,
  command
) => {
  if (command?.trans_id) {
    res.setHeader(
      "trans_id",
      command.trans_id
    );
  }

  res.setHeader(
    "Connection",
    "close"
  );

  return res
    .status(200)
    .json(command);
};

/* =========================================================
   DEVICE RECEIVER
========================================================= */

exports.receive = async (
  req,
  res
) => {
  let event = null;

  try {
    event =
      parseFkWebEvent(req);

    /* -----------------------------------------------------
       COMMAND POLL
    ----------------------------------------------------- */

    if (
      event?.eventType ===
      "COMMAND_POLL"
    ) {
      await processHeartbeat(
        event,
        {
          ipAddress:
            getRequestIp(req),
        }
      );

      const queued =
        await getNextQueuedCommand(
          event.deviceId
        );

      if (!queued) {
        return acknowledge(
          res,
          event
        );
      }

      const command =
        buildGetLogDataCommand(
          queued
        );

      await markCommandSent(
        queued._id
      );

      console.log(
        "[FKWEB] Command sent",
        {
          deviceId:
            event.deviceId,

          transactionId:
            queued.transactionId,

          syncBatchId:
            queued.syncBatchId,

          from:
            queued.from,

          to:
            queued.to,
        }
      );

      return sendCommand(
        res,
        command
      );
    }

    /* -----------------------------------------------------
       HEARTBEAT
    ----------------------------------------------------- */

    if (
      event?.eventType ===
      "HEARTBEAT"
    ) {
      await processHeartbeat(
        event,
        {
          ipAddress:
            getRequestIp(req),
        }
      );

      return acknowledge(
        res,
        event
      );
    }

    /* -----------------------------------------------------
       MACHINE USER / ENROLLMENT
    ----------------------------------------------------- */

    if (
      event?.eventType ===
      "ENROLLMENT"
    ) {
      await processEnrollment(
        event
      );

      console.log(
        "[FKWEB] Machine user received",
        {
          deviceId:
            event.deviceId,

          employeeCode:
            event.employeeCode,

          employeeName:
            event.employeeName || "",
        }
      );

      return acknowledge(
        res,
        event
      );
    }

    /* -----------------------------------------------------
       LIVE ATTENDANCE PUNCH
    ----------------------------------------------------- */

    if (
      event?.eventType ===
      "PUNCH"
    ) {
      const result =
        await processPunch(
          event,
          {
            source:
              "LIVE",
          }
        );

      console.log(
        "[FKWEB] Live punch received",
        {
          deviceId:
            event.deviceId,

          employeeCode:
            event.employeeCode,

          punchTime:
            event.punchTime,

          inserted:
            result?.inserted ?? null,

          mapped:
            result?.mapped ?? null,
        }
      );

      return acknowledge(
        res,
        event
      );
    }

    /* -----------------------------------------------------
       HISTORICAL ATTENDANCE RESULT
    ----------------------------------------------------- */

    if (
      event?.eventType ===
      "COMMAND_RESULT"
    ) {
      const transactionId =
        normalizeText(
          event.transactionId
        );

      /*
       * Some non-history FKWeb command/result traffic may not
       * contain a transaction ID. ACK it without creating
       * incorrect attendance.
       */

      if (!transactionId) {
        console.warn(
          "[FKWEB] Command result without transaction ID",
          {
            deviceId:
              event.deviceId,

            records:
              Array.isArray(
                event.records
              )
                ? event.records.length
                : 0,
          }
        );

        return acknowledge(
          res,
          event
        );
      }

      const command =
        await findCommandByTransaction(
          transactionId
        );

      /*
       * Do not import unsolicited historical command data into
       * attendance. Historical data must belong to a command
       * that SE-RMS actually issued.
       */

      if (!command) {
        console.warn(
          "[FKWEB] Unknown command transaction",
          {
            deviceId:
              event.deviceId,

            transactionId,
          }
        );

        return acknowledge(
          res,
          event
        );
      }

      /*
       * Ensure the response belongs to the same physical
       * terminal.
       */

      if (
        normalizeText(
          command.deviceId
        ) !==
        normalizeText(
          event.deviceId
        )
      ) {
        await failCommand(
          transactionId,
          "FKWeb command result device mismatch."
        );

        console.error(
          "[FKWEB] Command device mismatch",
          {
            transactionId,

            expected:
              command.deviceId,

            received:
              event.deviceId,
          }
        );

        return acknowledge(
          res,
          event
        );
      }

      await markCommandReceiving(
        transactionId,
        event.commandReturnCode
      );

      const rawRecords =
        Array.isArray(
          event.records
        )
          ? event.records
          : [];

      const records =
        rawRecords
          .map((record) =>
            normalizeHistoryRecord(
              record,
              event.deviceId
            )
          )
          .filter(Boolean);

      let stats = {
        received:
          records.length,

        inserted:
          0,

        duplicates:
          0,

        mapped:
          0,

        unmapped:
          0,

        errors:
          0,
      };

      if (records.length) {
        stats =
          await processHistoricalPunches({
            deviceId:
              event.deviceId,

            records,

            syncBatchId:
              command.syncBatchId,
          });

        await addImportStats(
          transactionId,
          stats
        );
      }

      await completeCommand(
        transactionId
      );

      console.log(
        "[FKWEB] Historical attendance imported",
        {
          deviceId:
            event.deviceId,

          transactionId,

          syncBatchId:
            command.syncBatchId,

          ...stats,
        }
      );

      return acknowledge(
        res,
        event
      );
    }

    /* -----------------------------------------------------
       UNKNOWN / NON-ATTENDANCE DEVICE MESSAGE

       ACK it so the physical terminal does not enter a retry
       loop. Do not create fake attendance data.
    ----------------------------------------------------- */

    const rawBody =
  Buffer.isBuffer(req.body)
    ? req.body
        .toString("utf8")
        .slice(0, 2000)
    : typeof req.body === "string"
      ? req.body.slice(0, 2000)
      : req.body &&
          typeof req.body === "object"
        ? JSON.stringify(req.body)
            .slice(0, 2000)
        : "";

console.warn(
  "[FKWEB] Unsupported device message",
  {
    deviceId:
      event?.deviceId ||
      getRequestDeviceId(req) ||
      "UNKNOWN",

    eventType:
      event?.eventType ||
      "UNKNOWN",

    method:
      req.method,

    path:
      req.originalUrl,

    ip:
      getRequestIp(req),

    contentType:
      req.headers[
        "content-type"
      ] || "",

    userAgent:
      req.headers[
        "user-agent"
      ] || "",

    query:
      req.query || {},

    protocolHeaders: {
      device_id:
        req.headers["device_id"] || "",

      terminal_id:
        req.headers["terminal_id"] || "",

      sn:
        req.headers["sn"] || "",

      serial_number:
        req.headers["serial_number"] || "",

      cloud_id:
        req.headers["cloud_id"] || "",

      request_code:
        req.headers["request_code"] || "",

      cmd_code:
        req.headers["cmd_code"] || "",

      trans_id:
        req.headers["trans_id"] || "",
    },

    bodyLength:
      Buffer.isBuffer(req.body)
        ? req.body.length
        : Buffer.byteLength(
            rawBody,
            "utf8"
          ),

    bodyPreview:
      rawBody,
  }
);

    return acknowledge(
      res,
      event
    );
    } catch (error) {
    const deviceId =
      event?.deviceId ||
      getRequestDeviceId(req) ||
      "UNKNOWN";

    const transactionId =
      normalizeText(
        event?.transactionId ||
          getRequestTransactionId(
            req
          )
      );

    const eventType =
      normalizeText(
        event?.eventType
      ).toUpperCase() ||
      "UNKNOWN";

    console.error(
      "[FKWEB] Processing failed",
      {
        deviceId,

        eventType,

        transactionId,

        code:
          error?.code ||
          "",

        message:
          error?.message ||
          String(error),
      }
    );

    /*
     * Historical command failure.
     *
     * Persist failure state before replying to the device.
     */

    if (transactionId) {
      try {
        const command =
          await findCommandByTransaction(
            transactionId
          );

        if (command) {
          await failCommand(
            transactionId,
            error
          );
        }
      } catch (
        commandError
      ) {
        console.error(
          "[FKWEB] Unable to mark command failed",
          {
            transactionId,

            message:
              commandError?.message ||
              String(
                commandError
              ),
          }
        );
      }
    }

    /*
     * IMPORTANT:
     *
     * Never acknowledge a failed attendance punch or failed
     * command result as successfully processed.
     *
     * Returning a non-2xx response allows the physical
     * terminal/protocol to retry rather than silently losing
     * attendance data.
     */

    if (
      eventType === "PUNCH" ||
      eventType === "COMMAND_RESULT"
    ) {
      res.setHeader(
        "Connection",
        "close"
      );

      return res
        .status(500)
        .json({
          success:
            false,

          response_code:
            "ERROR",

          message:
            "FKWeb attendance data was not processed.",
        });
    }

    /*
     * For heartbeat/enrollment/unknown transport traffic,
     * ACK the request so an unsupported informational message
     * cannot cause an uncontrolled device retry loop.
     */

    return acknowledge(
      res,
      event
    );
  }
};

/* =========================================================
   HEALTH
========================================================= */

exports.ping = (
  req,
  res
) => {
  return res
    .status(200)
    .json({
      success:
        true,

      service:
        "REALTIME_FKWEB",

      receivers: [
        "/fkweb/",
        "/fkweb/device",
      ],

      time:
        new Date(),
    });
};

/* =========================================================
   DEVICE STATUS

   This does NOT create a heartbeat.

   Online state comes only from actual physical-device
   communication stored in Device Master.
========================================================= */

exports.status = async (
  req,
  res
) => {
  try {
    const deviceId =
      normalizeText(
        req.params?.deviceId
      );

    if (!deviceId) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "FKWeb deviceId is required.",
        });
    }

    const health =
      await getDeviceHealth({
        externalDeviceId:
          deviceId,

        provider:
          "REALTIME",

        onlineThresholdMinutes:
          10,
      });

    if (!health.registered) {
      return res
        .status(404)
        .json({
          success:
            false,

          backend: {
            online:
              true,
          },

          device: {
            deviceId,

            registered:
              false,

            online:
              false,
          },

          message:
            "FKWeb device is not registered in SE-RMS Device Master.",
        });
    }

    const device =
      health.device;

    const commandCounts =
      await FkWebCommand.aggregate([
        {
          $match: {
            deviceId,
          },
        },

        {
          $group: {
            _id:
              "$status",

            count: {
              $sum:
                1,
            },
          },
        },
      ]);

    const historySync = {
      queued:
        0,

      sent:
        0,

      receiving:
        0,

      completed:
        0,

      failed:
        0,

      cancelled:
        0,
    };

    for (
      const row of
      commandCounts
    ) {
      const key =
        normalizeText(
          row._id
        ).toLowerCase();

      if (
        Object.prototype
          .hasOwnProperty
          .call(
            historySync,
            key
          )
      ) {
        historySync[key] =
          Number(
            row.count ||
              0
          );
      }
    }

    const latestCommand =
      await FkWebCommand
        .findOne({
          deviceId,
        })
        .sort({
          createdAt:
            -1,
        })
        .lean();

    return res
      .status(200)
      .json({
        success:
          true,

        checkedAt:
          new Date(),

        backend: {
          online:
            true,
        },

        device: {
          id:
            device._id,

          code:
            device.code,

          name:
            device.name,

          provider:
            device.provider,

          integrationType:
            device.integrationType,

          externalDeviceId:
            device.externalDeviceId,

          serialNumber:
            device.serialNumber,

          connectionMode:
            device.connectionMode,

          configuredIpAddress:
            device.ipAddress ||
            "",

          configuredPort:
            device.port ||
            null,

          enabled:
            device.enabled,

          status:
            device.status,

          registered:
            true,

          online:
            health.online,

          secondsSinceLastSeen:
            health.secondsSinceLastSeen,

          lastHeartbeatAt:
            device.lastHeartbeatAt,

          lastConnectionAt:
            device.lastConnectionAt,

          lastPunchReceivedAt:
            device.lastPunchReceivedAt,

          lastSyncAt:
            device.lastSyncAt,

          lastSuccessfulSyncAt:
            device.lastSuccessfulSyncAt,

          syncCursorAt:
            device.syncCursorAt,

          lastSyncStatus:
            device.lastSyncStatus,

          lastSyncMessage:
            device.lastSyncMessage,

          lastSyncStats:
            device.lastSyncStats,

          lastConnectionError:
            device.lastConnectionError,
        },

        historySync,

        latestCommand:
          latestCommand
            ? {
                id:
                  latestCommand._id,

                transactionId:
                  latestCommand.transactionId,

                syncBatchId:
                  latestCommand.syncBatchId,

                commandType:
                  latestCommand.commandType,

                from:
                  latestCommand.from,

                to:
                  latestCommand.to,

                status:
                  latestCommand.status,

                queuedAt:
                  latestCommand.queuedAt,

                sentAt:
                  latestCommand.sentAt,

                receivingAt:
                  latestCommand.receivingAt,

                completedAt:
                  latestCommand.completedAt,

                failedAt:
                  latestCommand.failedAt,

                recordsReceived:
                  latestCommand.recordsReceived,

                recordsInserted:
                  latestCommand.recordsInserted,

                recordsDuplicate:
                  latestCommand.recordsDuplicate,

                recordsMapped:
                  latestCommand.recordsMapped,

                recordsUnmapped:
                  latestCommand.recordsUnmapped,

                recordsFailed:
                  latestCommand.recordsFailed,

                commandReturnCode:
                  latestCommand.commandReturnCode,

                lastError:
                  latestCommand.lastError,
              }
            : null,
      });
  } catch (error) {
    console.error(
      "[FKWEB] Status failed",
      {
        message:
          error?.message ||
          String(error),
      }
    );

    return res
      .status(500)
      .json({
        success:
          false,

        message:
          error?.message ||
          "Unable to read FKWeb device status.",
      });
  }
};
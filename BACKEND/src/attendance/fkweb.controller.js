const {
  parseFkWebEvent,
  normalizeHistoryRecord,
} =
  require(
    "./fkweb.parser"
  );

const {
  getDeviceHealth,
} =
  require(
    "./biometricDevice.service"
  );

const {
  FkWebCommand,
} =
  require(
    "./fkwebCommand.model"
  );

const {
  processHeartbeat,
  processEnrollment,
  processPunch,
  processHistoricalPunches,
} =
  require(
    "./fkweb.service"
  );

const {
  getNextQueuedCommand,
  buildGetLogDataCommand,
  markCommandSent,
  markCommandReceiving,
  addImportStats,
  completeCommand,
  failCommand,
  findCommandByTransaction,
} =
  require(
    "./fkwebCommand.service"
  );

/* =========================================================
   CONSTANTS
========================================================= */

const MAX_DIAGNOSTIC_HEX_BYTES =
  256;

const MAX_DIAGNOSTIC_TEXT_BYTES =
  1024;

/* =========================================================
   NORMALIZE
========================================================= */

const normalizeText =
  (
    value
  ) => {
    return String(
      value ??
        ""
    ).trim();
  };

/* =========================================================
   REQUEST IP
========================================================= */

const getRequestIp =
  (
    req
  ) => {
    const forwarded =
      req.headers[
        "x-forwarded-for"
      ];

    if (
      forwarded
    ) {
      return String(
        forwarded
      )
        .split(
          ","
        )[0]
        .trim();
    }

    return String(
      req.ip ||
      req.socket
        ?.remoteAddress ||
      ""
    ).replace(
      "::ffff:",
      ""
    );
  };

/* =========================================================
   DEVICE ID FROM REQUEST
========================================================= */

const getRequestDeviceId =
  (
    req
  ) => {
    return normalizeText(
      req.headers[
        "device_id"
      ] ||
      req.headers[
        "device-id"
      ] ||
      req.headers[
        "sn"
      ] ||
      req.query
        ?.device_id ||
      req.query
        ?.deviceId ||
      req.query
        ?.SN ||
      req.query
        ?.sn ||
      ""
    );
  };

/* =========================================================
   REQUEST CODE
========================================================= */

const getRequestCode =
  (
    req
  ) => {
    return normalizeText(
      req.headers[
        "request_code"
      ] ||
      req.headers[
        "request-code"
      ] ||
      req.query
        ?.request_code ||
      req.query
        ?.requestCode ||
      ""
    );
  };

/* =========================================================
   TRANSACTION ID
========================================================= */

const getRequestTransactionId =
  (
    req
  ) => {
    return normalizeText(
      req.headers[
        "trans_id"
      ] ||
      req.headers[
        "transaction_id"
      ] ||
      req.query
        ?.trans_id ||
      req.query
        ?.transactionId ||
      ""
    );
  };

/* =========================================================
   COMMAND CODE
========================================================= */

const getRequestCommandCode =
  (
    req
  ) => {
    return normalizeText(
      req.headers[
        "cmd_code"
      ] ||
      req.headers[
        "command_code"
      ] ||
      req.query
        ?.cmd_code ||
      ""
    );
  };

/* =========================================================
   COMMAND RETURN CODE
========================================================= */

const getRequestCommandReturnCode =
  (
    req
  ) => {
    return normalizeText(
      req.headers[
        "cmd_return_code"
      ] ||
      req.headers[
        "command_return_code"
      ] ||
      req.query
        ?.cmd_return_code ||
      ""
    );
  };

/* =========================================================
   BUFFER DIAGNOSTIC

   Never mutate the body here.

   This only produces a bounded diagnostic representation.
========================================================= */

const getBufferDiagnostic =
  (
    body
  ) => {
    if (
      !Buffer.isBuffer(
        body
      )
    ) {
      return null;
    }

    const hexLength =
      Math.min(
        body.length,
        MAX_DIAGNOSTIC_HEX_BYTES
      );

    const textLength =
      Math.min(
        body.length,
        MAX_DIAGNOSTIC_TEXT_BYTES
      );

    return {
      bytes:
        body.length,

      firstHex:
        body
          .subarray(
            0,
            hexLength
          )
          .toString(
            "hex"
          ),

      firstText:
        body
          .subarray(
            0,
            textLength
          )
          .toString(
            "utf8"
          )
          .replace(
            /[^\x20-\x7E\r\n\t]/g,
            "."
          ),
    };
  };

/* =========================================================
   BASIC REQUEST LOG
========================================================= */

const logIncomingRequest =
  (
    req
  ) => {
    console.log(
      "\n=============================================="
    );

    console.log(
      "[FKWEB] Incoming device request"
    );

    console.log(
      "[FKWEB] Time:",
      new Date().toISOString()
    );

    console.log(
      "[FKWEB] Method:",
      req.method
    );

    console.log(
      "[FKWEB] URL:",
      req.originalUrl
    );

    console.log(
      "[FKWEB] IP:",
      getRequestIp(
        req
      )
    );

    console.log(
      "[FKWEB] Device ID:",
      getRequestDeviceId(
        req
      ) ||
      "NOT_PROVIDED"
    );

    console.log(
      "[FKWEB] Request Code:",
      getRequestCode(
        req
      )
    );

    console.log(
      "[FKWEB] Transaction ID:",
      getRequestTransactionId(
        req
      )
    );

    console.log(
      "[FKWEB] Command Code:",
      getRequestCommandCode(
        req
      )
    );

    console.log(
      "[FKWEB] Command Return Code:",
      getRequestCommandReturnCode(
        req
      )
    );

    console.log(
      "[FKWEB] Content-Type:",
      req.headers[
        "content-type"
      ] ||
      "NOT_PROVIDED"
    );

    console.log(
      "[FKWEB] Content-Length:",
      req.headers[
        "content-length"
      ] ||
      "NOT_PROVIDED"
    );

    console.log(
      "=============================================="
    );
  };

/* =========================================================
   RAW TRANSPORT DIAGNOSTIC

   Important for FKWEB_EBKN / M50 investigation.

   We intentionally do not guess binary byte offsets here.
========================================================= */

const logFkWebPayload =
  (
    req
  ) => {
    console.log(
      "[FKWEB] Query:",
      req.query ||
      {}
    );

    console.log(
      "[FKWEB] Protocol headers:",
      {
        device_id:
          getRequestDeviceId(
            req
          ),

        request_code:
          getRequestCode(
            req
          ),

        trans_id:
          getRequestTransactionId(
            req
          ),

        cmd_code:
          getRequestCommandCode(
            req
          ),

        cmd_return_code:
          getRequestCommandReturnCode(
            req
          ),

        content_type:
          normalizeText(
            req.headers[
              "content-type"
            ]
          ),

        content_length:
          normalizeText(
            req.headers[
              "content-length"
            ]
          ),

        user_agent:
          normalizeText(
            req.headers[
              "user-agent"
            ]
          ),
      }
    );

    const diagnostic =
      getBufferDiagnostic(
        req.body
      );

    if (
      diagnostic
    ) {
      console.log(
        "[FKWEB] Raw body diagnostic:",
        diagnostic
      );

      return;
    }

    if (
      req.body &&
      typeof req.body ===
        "object"
    ) {
      console.log(
        "[FKWEB] Parsed body object:",
        req.body
      );

      return;
    }

    console.log(
      "[FKWEB] Body:",
      req.body ??
      null
    );
  };

/* =========================================================
   ERROR DIAGNOSTIC
========================================================= */

const logErrorDiagnostic =
  (
    req,
    event,
    error
  ) => {
    const diagnostic =
      getBufferDiagnostic(
        req.body
      );

    console.error(
      "[FKWEB] ERROR DIAGNOSTIC:",
      {
        time:
          new Date().toISOString(),

        message:
          error?.message ||
          String(
            error
          ),

        code:
          error?.code ||
          "",

        method:
          req.method,

        url:
          req.originalUrl,

        ip:
          getRequestIp(
            req
          ),

        deviceId:
          event?.deviceId ||
          getRequestDeviceId(
            req
          ) ||
          "UNKNOWN",

        requestCode:
          event?.requestCode ||
          getRequestCode(
            req
          ),

        eventType:
          event?.eventType ||
          "UNKNOWN",

        transactionId:
          event?.transactionId ||
          getRequestTransactionId(
            req
          ),

        commandCode:
          getRequestCommandCode(
            req
          ),

        commandReturnCode:
          getRequestCommandReturnCode(
            req
          ),

        contentType:
          normalizeText(
            req.headers[
              "content-type"
            ]
          ),

        contentLength:
          normalizeText(
            req.headers[
              "content-length"
            ]
          ),

        bodyBytes:
          diagnostic
            ?.bytes ??
          null,

        firstHex:
          diagnostic
            ?.firstHex ??
          null,

        firstText:
          diagnostic
            ?.firstText ??
          null,

        payloadLength:
          error?.payloadLength ||
          null,
      }
    );
  };

/* =========================================================
   ACK

   Device transport should receive a small successful
   acknowledgement after SE-RMS has handled the request.

   Preserve transaction ID when supplied.
========================================================= */

const acknowledge =
  (
    res,
    event
  ) => {
    if (
      event?.transactionId
    ) {
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
      .status(
        200
      )
      .send(
        ""
      );
  };

/* =========================================================
   COMMAND RESPONSE

   IMPORTANT:

   Wire serialization remains isolated here.

   We currently send normalized JSON because that is the
   command representation implemented by the current
   command service.

   If the real Delhi FKWeb firmware demonstrates that it
   requires EBKN/M50 binary command framing, change this
   adapter only after capturing the actual protocol evidence.
========================================================= */

const sendCommand =
  (
    res,
    command
  ) => {
    res.setHeader(
      "Content-Type",
      "application/json"
    );

    res.setHeader(
      "Connection",
      "close"
    );

    if (
      command?.trans_id
    ) {
      res.setHeader(
        "trans_id",
        command.trans_id
      );
    }

    console.log(
      "[FKWEB] Sending command response:",
      {
        cmd_code:
          command?.cmd_code ||
          "",

        trans_id:
          command?.trans_id ||
          "",

        begin_time:
          command?.begin_time ||
          "",

        end_time:
          command?.end_time ||
          "",
      }
    );

    return res
      .status(
        200
      )
      .json(
        command
      );
  };

/* =========================================================
   RECEIVE
========================================================= */

exports.receive =
  async (
    req,
    res
  ) => {
    let event =
      null;

    try {
      /*
       * First capture transport evidence.
       *
       * This happens BEFORE parsing so an unknown EBKN/M50
       * request still leaves enough information to diagnose.
       */
      logIncomingRequest(
        req
      );

      logFkWebPayload(
        req
      );

      /* =====================================================
         PARSE
      ===================================================== */

      event =
        parseFkWebEvent(
          req
        );

      console.log(
        "[FKWEB] Parsed:",
        {
          eventType:
            event?.eventType,

          deviceId:
            event?.deviceId,

          requestCode:
            event?.requestCode,

          transactionId:
            event?.transactionId,

          employeeCode:
            event?.employeeCode,

          punchTime:
            event?.punchTime,

          commandReturnCode:
            event?.commandReturnCode,

          records:
            Array.isArray(
              event?.records
            )
              ? event.records.length
              : null,
        }
      );

      /* =====================================================
         COMMAND POLL

         Physical device has contacted SE-RMS and is asking
         whether a command is waiting.

         This request itself counts as device communication.
      ===================================================== */

      if (
        event.eventType ===
        "COMMAND_POLL"
      ) {
        await processHeartbeat(
          event,
          {
            ipAddress:
              getRequestIp(
                req
              ),
          }
        );

        const queued =
          await getNextQueuedCommand(
            event.deviceId
          );

        if (
          !queued
        ) {
          console.log(
            "[FKWEB] Command poll: no queued command.",
            {
              deviceId:
                event.deviceId,
            }
          );

          return acknowledge(
            res,
            event
          );
        }

        const wireCommand =
          buildGetLogDataCommand(
            queued
          );

        /*
         * Mark SENT only immediately before returning the
         * command to the device.
         */
        await markCommandSent(
          queued._id
        );

        console.log(
          "[FKWEB] Historical command sent:",
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
          wireCommand
        );
      }

      /* =====================================================
         HEARTBEAT
      ===================================================== */

      if (
        event.eventType ===
        "HEARTBEAT"
      ) {
        await processHeartbeat(
          event,
          {
            ipAddress:
              getRequestIp(
                req
              ),
          }
        );

        console.log(
          "[FKWEB] Heartbeat processed:",
          {
            deviceId:
              event.deviceId,

            ip:
              getRequestIp(
                req
              ),
          }
        );

        return acknowledge(
          res,
          event
        );
      }

      /* =====================================================
         ENROLLMENT
      ===================================================== */

      if (
        event.eventType ===
        "ENROLLMENT"
      ) {
        await processEnrollment(
          event
        );

        console.log(
          "[FKWEB] Enrollment processed:",
          {
            deviceId:
              event.deviceId,

            employeeCode:
              event.employeeCode ||
              null,
          }
        );

        return acknowledge(
          res,
          event
        );
      }

      /* =====================================================
         LIVE PUNCH
      ===================================================== */

      if (
        event.eventType ===
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
          "[FKWEB] Live punch processed:",
          {
            deviceId:
              event.deviceId,

            employeeCode:
              event.employeeCode,

            punchTime:
              event.punchTime,

            inserted:
              result?.inserted ??
              null,

            mapped:
              result?.mapped ??
              null,
          }
        );

        return acknowledge(
          res,
          event
        );
      }

      /* =====================================================
         HISTORICAL COMMAND RESULT
      ===================================================== */

      if (
        event.eventType ===
        "COMMAND_RESULT"
      ) {
        const transactionId =
          normalizeText(
            event.transactionId
          );

        console.log(
          "[FKWEB] Historical command result received:",
          {
            deviceId:
              event.deviceId,

            transactionId,

            commandReturnCode:
              event.commandReturnCode,

            recordCount:
              Array.isArray(
                event.records
              )
                ? event.records.length
                : 0,
          }
        );

        if (
          !transactionId
        ) {
          console.warn(
            "[FKWEB] Command result has no transaction ID."
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

        if (
          !command
        ) {
          console.warn(
            "[FKWEB] Result received for unknown transaction:",
            transactionId
          );

          return acknowledge(
            res,
            event
          );
        }

        /*
         * Integrity:
         *
         * A command result must belong to the same physical
         * device to which the command was issued.
         */
        if (
          String(
            command.deviceId
          ) !==
          String(
            event.deviceId
          )
        ) {
          console.error(
            "[FKWEB] Command result device mismatch:",
            {
              expected:
                command.deviceId,

              received:
                event.deviceId,

              transactionId,
            }
          );

          await failCommand(
            transactionId,
            "FKWeb command result device mismatch."
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

        const normalized =
          rawRecords
            .map(
              (
                record
              ) =>
                normalizeHistoryRecord(
                  record,
                  event.deviceId
                )
            )
            .filter(
              Boolean
            );

        console.log(
          "[FKWEB] Historical normalization:",
          {
            transactionId,

            rawRecords:
              rawRecords.length,

            normalizedRecords:
              normalized.length,
          }
        );

        let stats = {
          received:
            0,

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

        if (
          normalized.length
        ) {
          stats =
            await processHistoricalPunches({
              deviceId:
                event.deviceId,

              records:
                normalized,

              syncBatchId:
                command.syncBatchId,
            });

          await addImportStats(
            transactionId,
            stats
          );

          console.log(
            "[FKWEB] Historical block processed:",
            {
              transactionId,

              syncBatchId:
                command.syncBatchId,

              ...stats,
            }
          );
        } else {
          console.warn(
            "[FKWEB] Historical result contained no normalized records.",
            {
              transactionId,

              rawRecords:
                rawRecords.length,

              commandReturnCode:
                event.commandReturnCode,
            }
          );
        }

        /*
         * Current implementation assumes one normalized
         * command-result response completes one command.
         *
         * Do NOT invent a multi-block final flag.
         *
         * If RSS20241199635 demonstrates a real final-block
         * field in captured traffic, implement it from that
         * evidence.
         */
        await completeCommand(
          transactionId
        );

        console.log(
          "[FKWEB] Historical command completed:",
          {
            transactionId,

            syncBatchId:
              command.syncBatchId,

            normalizedRecords:
              normalized.length,
          }
        );

        return acknowledge(
          res,
          event
        );
      }

      /* =====================================================
         UNKNOWN EVENT

         Do not discard diagnostic evidence.

         Raw transport was already logged before parsing.
      ===================================================== */

      console.warn(
        "[FKWEB] Unknown event:",
        {
          eventType:
            event?.eventType,

          deviceId:
            event?.deviceId,

          requestCode:
            event?.requestCode,

          transactionId:
            event?.transactionId,

          ip:
            getRequestIp(
              req
            ),
        }
      );

      return acknowledge(
        res,
        event
      );
    } catch (
      error
    ) {
      /* =====================================================
         ERROR
      ===================================================== */

      console.error(
        "[FKWEB] Receive error:",
        {
          message:
            error?.message ||
            String(
              error
            ),

          code:
            error?.code ||
            "",

          payloadLength:
            error?.payloadLength ||
            null,

          eventType:
            event?.eventType ||
            "UNKNOWN",

          deviceId:
            event?.deviceId ||
            getRequestDeviceId(
              req
            ) ||
            "UNKNOWN",
        }
      );

      /*
       * Detailed bounded diagnostic.
       *
       * Especially useful when EBKN/M50 binary decoding is
       * the failure point.
       */
      logErrorDiagnostic(
        req,
        event,
        error
      );

      /*
       * If this failure belongs to a known persistent command,
       * record the failure.
       */
      const transactionId =
        normalizeText(
          event?.transactionId ||
          getRequestTransactionId(
            req
          )
        );

      if (
        transactionId
      ) {
        try {
          const command =
            await findCommandByTransaction(
              transactionId
            );

          if (
            command
          ) {
            await failCommand(
              transactionId,
              error
            );
          }
        } catch (
          commandError
        ) {
          console.error(
            "[FKWEB] Unable to mark command failed:",
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
       * ACK device transport.
       *
       * This prevents a malformed/unsupported payload from
       * causing an uncontrolled retry storm while preserving
       * diagnostics in the server log.
       */
      return acknowledge(
        res,
        event ||
        {
          transactionId:
            getRequestTransactionId(
              req
            ),
        }
      );
    }
  };

/* =========================================================
   PING
========================================================= */

exports.ping =
  (
    req,
    res
  ) => {
    return res
      .status(
        200
      )
      .json({
        success:
          true,

        service:
          "REALTIME_FKWEB",

        receiver:
          "/fkweb/device",

        time:
          new Date(),
      });
  };

/* =========================================================
   FKWEB DEVICE STATUS

   IMPORTANT:

   This endpoint never creates a heartbeat.

   "online" is derived from actual timestamps stored against
   the registered device.
========================================================= */

exports.status =
  async (
    req,
    res
  ) => {
    try {
      const deviceId =
        normalizeText(
          req.params
            ?.deviceId
        );

      if (
        !deviceId
      ) {
        return res
          .status(
            400
          )
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

      if (
        !health.registered
      ) {
        return res
          .status(
            404
          )
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
        const row of commandCounts
      ) {
        const key =
          normalizeText(
            row._id
          )
            .toLowerCase();

        if (
          Object.prototype
            .hasOwnProperty
            .call(
              historySync,
              key
            )
        ) {
          historySync[
            key
          ] =
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
        .status(
          200
        )
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
    } catch (
      error
    ) {
      console.error(
        "[FKWEB] Status error:",
        {
          message:
            error?.message ||
            String(
              error
            ),

          stack:
            error?.stack ||
            "",
        }
      );

      return res
        .status(
          500
        )
        .json({
          success:
            false,

          message:
            error?.message ||
            "Unable to read FKWeb device status.",
        });
    }
  };
const {
  requireDevice,
  markHeartbeat,
  markPunchReceived,
} = require(
  "./biometricDevice.service"
);

const {
  ingestRawPunch,
  upsertMachineUser,
} = require(
  "./biometricIngestion.service"
);

/* =========================================================
   CONSTANTS
========================================================= */

const ESSL_PROVIDER =
  "ESSL";

const ESSL_INTEGRATION_TYPE =
  "ESSL_ADMS";

const ESSL_HISTORICAL_SYNC_DAYS =
  183;

/*
 * Physical Sonipat eSSL terminal.
 */
const ESSL_SONIPAT_SERIAL =
  "TBS2261000805";

/*
 * One command ID for this historical retrieval.
 *
 * Keep this stable for this deployment.
 */
const ESSL_HISTORY_COMMAND_ID =
  "900001";

/*
 * Historical request state.
 *
 * IMPORTANT:
 *
 * This is deliberately simple for the initial migration.
 *
 * The command remains available to /getrequest until the
 * terminal reports a device-command response.
 *
 * After Node restarts it becomes pending again. That is safe
 * because RawAttendancePunch ingestion is idempotent and
 * duplicates are already handled by ingestRawPunch().
 */
let historicalCommandAcknowledged =
  false;

let historicalCommandDelivered =
  false;

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
   RAW BODY
========================================================= */

const getBodyText =
  (
    req
  ) => {
    if (
      Buffer.isBuffer(
        req.body
      )
    ) {
      return req.body.toString(
        "utf8"
      );
    }

    if (
      typeof req.body ===
      "string"
    ) {
      return req.body;
    }

    return "";
  };

/* =========================================================
   DEVICE SERIAL
========================================================= */

const getDeviceSerial =
  (
    req
  ) => {
    return normalizeText(
      req.query?.SN ||
      req.query?.sn
    );
  };

/* =========================================================
   PARSE ESSL DATE
========================================================= */

const parseEsslTime =
  (
    value
  ) => {
    const text =
      normalizeText(
        value
      );

    const match =
      text.match(
        /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/
      );

    if (
      !match
    ) {
      return null;
    }

    const date =
      new Date(
        `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}+05:30`
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null;
    }

    return date;
  };

/* =========================================================
   RESOLVE REGISTERED DEVICE
========================================================= */

const resolveEsslDevice =
  async (
    req
  ) => {
    const serial =
      getDeviceSerial(
        req
      );

    if (
      !serial
    ) {
      throw new Error(
        "eSSL device serial number is missing."
      );
    }

    return requireDevice({
      provider:
        ESSL_PROVIDER,

      externalDeviceId:
        serial,

      serialNumber:
        serial,
    });
  };

/* =========================================================
   OPTIONS RESPONSE

   IMPORTANT:

   Historical attendance is NOT requested through the
   ATTLOGStamp handshake anymore.

   Historical retrieval is performed explicitly through:

   /getrequest
       ↓
   DATA QUERY ATTLOG

   Therefore normal live mode stays enabled.
========================================================= */

const buildOptionsResponse =
  (
    serial
  ) => {
    return [
      `GET OPTION FROM: ${serial}`,

      "ATTLOGStamp=9999",

      "OPERLOGStamp=0",

      "ATTPHOTOStamp=9999",

      "ErrorDelay=30",

      "Delay=10",

      "TransTimes=00:00;23:59",

      "TransInterval=1",

      "TransFlag=TransData AttLog OpLog EnrollUser ChgUser",

      "TimeZone=330",

      "Realtime=1",

      "Encrypt=None",

      "",
    ].join(
      "\n"
    );
  };

/* =========================================================
   FORMAT MACHINE DATE
========================================================= */

const pad2 =
  (
    value
  ) =>
    String(
      value
    ).padStart(
      2,
      "0"
    );

const formatEsslCommandDate =
  (
    date
  ) => {
    /*
     * Command dates are intentionally constructed in
     * calendar form. We are requesting complete days.
     */
    return [
      date.getFullYear(),
      "-",
      pad2(
        date.getMonth() +
        1
      ),
      "-",
      pad2(
        date.getDate()
      ),
    ].join(
      ""
    );
  };

/* =========================================================
   BUILD HISTORICAL ATTLOG COMMAND

   Request:
   last 183 days through today.

   Example:

   C:900001:DATA QUERY ATTLOG StartTime=2026-03-25 00:00:00
   EndTime=2026-09-24 23:59:59
========================================================= */

const buildHistoricalAttendanceCommand =
  () => {
    const end =
      new Date();

    const start =
      new Date(
        end.getFullYear(),
        end.getMonth(),
        end.getDate()
      );

    start.setDate(
      start.getDate() -
      ESSL_HISTORICAL_SYNC_DAYS
    );

    const startText =
      `${formatEsslCommandDate(
        start
      )} 00:00:00`;

    const endText =
      `${formatEsslCommandDate(
        end
      )} 23:59:59`;

    return (
      `C:${ESSL_HISTORY_COMMAND_ID}:DATA QUERY ATTLOG ` +
      `StartTime=${startText}\t` +
      `EndTime=${endText}`
    );
  };

/* =========================================================
   GET PENDING DEVICE COMMAND

   Called by /getrequest and /getrequest.aspx.

   Only the Sonipat terminal receives this historical
   request.

   Other terminals receive no command.
========================================================= */

const getPendingDeviceCommand =
  (
    serial
  ) => {
    const normalizedSerial =
      normalizeText(
        serial
      );

    if (
      normalizedSerial !==
      ESSL_SONIPAT_SERIAL
    ) {
      return null;
    }

    if (
      historicalCommandAcknowledged
    ) {
      return null;
    }

    const command =
      buildHistoricalAttendanceCommand();

    historicalCommandDelivered =
      true;

    console.log(
      "eSSL historical command delivered:",
      {
        serial:
          normalizedSerial,

        commandId:
          ESSL_HISTORY_COMMAND_ID,

        command,
      }
    );

    return command;
  };

/* =========================================================
   DEVICE COMMAND RESULT
========================================================= */

const processDeviceCommandResult =
  (
    req,
    body
  ) => {
    const serial =
      getDeviceSerial(
        req
      );

    const text =
      normalizeText(
        body
      );

    /*
     * Typical command response includes:
     *
     * ID=<command id>
     * Return=<result>
     *
     * Different firmware revisions can include additional
     * fields, so we preserve/log the complete raw response.
     */
    const idMatch =
      text.match(
        /(?:^|\s)ID=(\d+)/i
      );

    const returnMatch =
      text.match(
        /(?:^|\s)Return=(-?\d+)/i
      );

    const commandId =
      normalizeText(
        idMatch?.[1]
      );

    const returnCode =
      returnMatch
        ? Number(
            returnMatch[1]
          )
        : null;

    if (
      serial ===
        ESSL_SONIPAT_SERIAL &&
      commandId ===
        ESSL_HISTORY_COMMAND_ID
    ) {
      /*
       * A response proves the terminal received/executed
       * the command.
       *
       * Do not continuously resend it.
       */
      historicalCommandAcknowledged =
        true;
    }

    console.log(
      "eSSL device command result:",
      {
        serial,

        commandId,

        returnCode,

        raw:
          text,
      }
    );

    return {
      serial,

      commandId,

      returnCode,

      acknowledged:
        historicalCommandAcknowledged,
    };
  };

/* =========================================================
   DETERMINE ATTLOG SOURCE

   While the historical command has been delivered and has
   not yet completed, ATTLOG batches are considered part of
   the historical import.

   After command acknowledgement, old timestamps still need
   to be identifiable as historical. Therefore timestamps
   older than today are also classified HISTORICAL_SYNC.

   Today's realtime punches remain LIVE.
========================================================= */

const resolveAttendanceSource =
  (
    body
  ) => {
    if (
      historicalCommandDelivered &&
      !historicalCommandAcknowledged
    ) {
      return "HISTORICAL_SYNC";
    }

    const rows =
      String(
        body ||
        ""
      )
        .split(
          /\r?\n/
        )
        .map(
          (
            row
          ) =>
            row.trim()
        )
        .filter(
          Boolean
        );

    for (
      const row of rows
    ) {
      const parsed =
        parseAttendanceRow(
          row
        );

      if (
        !parsed
      ) {
        continue;
      }

      const now =
        new Date();

      const todayStart =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );

      if (
        parsed.punchTime <
        todayStart
      ) {
        return "HISTORICAL_SYNC";
      }
    }

    return "LIVE";
  };

/* =========================================================
   PARSE USER RECORD
========================================================= */

const parseUserRecord =
  (
    row
  ) => {
    const text =
      normalizeText(
        row
      );

    if (
      !/^USER\s+/i.test(
        text
      )
    ) {
      return null;
    }

    const pinMatch =
      text.match(
        /\bPIN=([^\s]+)/i
      );

    const nameMatch =
      text.match(
        /\bName=(.*?)(?=\s+Pri=|\s+Passwd=|\s+Card=|\s+Grp=|\s+TZ=|\s+Verify=|\s+ViceCard=|\s+Expires=|\s+StartDatetime=|\s+EndDatetime=|$)/i
      );

    const pin =
      normalizeText(
        pinMatch?.[1]
      );

    if (
      !pin
    ) {
      return null;
    }

    return {
      biometricCode:
        pin,

      employeeName:
        normalizeText(
          nameMatch?.[1]
        ),

      raw:
        text,
    };
  };

/* =========================================================
   PROCESS USER DIRECTORY
========================================================= */

const processUserDirectory =
  async (
    device,
    body
  ) => {
    const rows =
      String(
        body ||
        ""
      )
        .split(
          /\r?\n/
        )
        .map(
          (
            row
          ) =>
            row.trim()
        )
        .filter(
          Boolean
        );

    let saved =
      0;

    for (
      const row of rows
    ) {
      const user =
        parseUserRecord(
          row
        );

      if (
        !user
      ) {
        continue;
      }

      await upsertMachineUser({
        device,

        biometricCode:
          user.biometricCode,

        machineUserId:
          user.biometricCode,

        employeeName:
          user.employeeName,

        rawPayload: {
          protocol:
            ESSL_INTEGRATION_TYPE,

          raw:
            user.raw,
        },
      });

      saved +=
        1;
    }

    return {
      received:
        rows.length,

      saved,
    };
  };

/* =========================================================
   PARSE ATTLOG
========================================================= */

const parseAttendanceRow =
  (
    row
  ) => {
    const clean =
      normalizeText(
        row
      );

    if (
      !clean
    ) {
      return null;
    }

    let fields =
      clean.split(
        "\t"
      );

    if (
      fields.length <
      2
    ) {
      fields =
        clean.split(
          /\s{2,}/
        );
    }

    if (
      fields.length <
      2
    ) {
      return null;
    }

    const biometricCode =
      normalizeText(
        fields[0]
      );

    const punchTime =
      parseEsslTime(
        fields[1]
      );

    if (
      !biometricCode ||
      !punchTime
    ) {
      return null;
    }

    return {
      biometricCode,

      punchTime,

      machineInOutMode:
        normalizeText(
          fields[2]
        ),

      machineVerifyMode:
        normalizeText(
          fields[3]
        ),

      workCode:
        normalizeText(
          fields[4]
        ),

      raw:
        clean,
    };
  };

/* =========================================================
   HISTORICAL CUTOFF
========================================================= */

const getHistoricalCutoff =
  () => {
    const cutoff =
      new Date();

    cutoff.setDate(
      cutoff.getDate() -
      ESSL_HISTORICAL_SYNC_DAYS
    );

    return cutoff;
  };

/* =========================================================
   PROCESS ATTLOG
========================================================= */

const processAttendanceLog =
  async (
    device,
    body,
    {
      source =
        "LIVE",

      syncBatchId =
        null,
    } = {}
  ) => {
    const rows =
      String(
        body ||
        ""
      )
        .split(
          /\r?\n/
        )
        .map(
          (
            row
          ) =>
            row.trim()
        )
        .filter(
          Boolean
        );

    const historicalCutoff =
      getHistoricalCutoff();

    const stats = {
      received:
        rows.length,

      valid:
        0,

      inserted:
        0,

      duplicates:
        0,

      mapped:
        0,

      unmapped:
        0,

      ignoredBeforeCutoff:
        0,

      errors:
        0,
    };

    for (
      const row of rows
    ) {
      const parsed =
        parseAttendanceRow(
          row
        );

      if (
        !parsed
      ) {
        stats.errors +=
          1;

        continue;
      }

      stats.valid +=
        1;

      /*
       * We only retain the requested historical window.
       */
      if (
        source ===
          "HISTORICAL_SYNC" &&
        parsed.punchTime <
          historicalCutoff
      ) {
        stats
          .ignoredBeforeCutoff +=
          1;

        continue;
      }

      try {
        const result =
          await ingestRawPunch({
            device,

            biometricCode:
              parsed.biometricCode,

            punchTime:
              parsed.punchTime,

            source,

            workMode:
              "OFFICE",

            machineUserId:
              parsed.biometricCode,

            machineVerifyMode:
              parsed.machineVerifyMode,

            machineInOutMode:
              parsed.machineInOutMode,

            syncBatchId,

            rawPayload: {
              protocol:
                ESSL_INTEGRATION_TYPE,

              workCode:
                parsed.workCode,

              raw:
                parsed.raw,

              historical:
                source ===
                "HISTORICAL_SYNC",
            },
          });

        if (
          result.inserted
        ) {
          stats.inserted +=
            1;
        } else {
          stats.duplicates +=
            1;
        }

        if (
          result.mapped
        ) {
          stats.mapped +=
            1;
        } else {
          stats.unmapped +=
            1;
        }

        await markPunchReceived(
          device,
          parsed.punchTime
        );
      } catch (
        error
      ) {
        stats.errors +=
          1;

        console.error(
          "eSSL punch ingestion failed:",
          {
            device:
              device?.code ||
              device?.serialNumber ||
              device?._id,

            biometricCode:
              parsed.biometricCode,

            punchTime:
              parsed.punchTime,

            source,

            error:
              error?.message ||
              error,
          }
        );
      }
    }

    console.log(
      "eSSL ATTLOG processed:",
      {
        device:
          device?.code ||
          device?.serialNumber ||
          device?._id,

        source,

        ...stats,
      }
    );

    return stats;
  };

/* =========================================================
   HEARTBEAT
========================================================= */

const handleHeartbeat =
  async (
    req
  ) => {
    const device =
      await resolveEsslDevice(
        req
      );

    await markHeartbeat(
      device,
      {
        ipAddress:
          getRequestIp(
            req
          ),
      }
    );

    return device;
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  ESSL_PROVIDER,

  ESSL_INTEGRATION_TYPE,

  ESSL_HISTORICAL_SYNC_DAYS,

  ESSL_SONIPAT_SERIAL,

  ESSL_HISTORY_COMMAND_ID,

  getBodyText,

  getDeviceSerial,

  getRequestIp,

  parseEsslTime,

  resolveEsslDevice,

  buildOptionsResponse,

  buildHistoricalAttendanceCommand,

  getPendingDeviceCommand,

  processDeviceCommandResult,

  resolveAttendanceSource,

  parseUserRecord,

  processUserDirectory,

  parseAttendanceRow,

  processAttendanceLog,

  handleHeartbeat,
};
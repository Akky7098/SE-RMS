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

const {
  processRawPunch,
} =
  require(
    "./attendance.service"
  );

  const {
  EsslCommand,
} =
  require(
    "./esslCommand.model"
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
 * Historical biometric migration is complete.
 *
 * IMPORTANT:
 * Keep automatic historical DATA QUERY disabled during
 * normal production operation.
 *
 * Historical recovery must be triggered explicitly,
 * never automatically after every Node restart.
 */
let historicalCommandAcknowledged =
  true;

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

    /*
     * eSSL ADMS ATTLOG timestamps:
     *
     * 2026-10-06 08:15:23
     * 2026-10-06T08:15:23
     *
     * Machine time is IST.
     */
    const match =
  text.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/
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
  async (
    serial
  ) => {
    const normalizedSerial =
      normalizeText(
        serial
      );

    if (
      !normalizedSerial
    ) {
      return null;
    }

    /*
     * Only this registered eSSL terminal is currently
     * allowed to receive historical recovery commands.
     */
    if (
      normalizedSerial !==
      ESSL_SONIPAT_SERIAL
    ) {
      return null;
    }

    /*
     * Atomically claim exactly ONE pending command.
     *
     * PENDING -> SENT happens in the same DB operation,
     * preventing repeated /getrequest polls from receiving
     * the same command.
     */
    const command =
      await EsslCommand
        .findOneAndUpdate(
          {
            deviceSerialNumber:
              normalizedSerial,

            status:
              "PENDING",
          },
          {
            $set: {
              status:
                "SENT",

              sentAt:
                new Date(),
            },
          },
          {
            sort: {
              queuedAt: 1,
            },

            new: true,
          }
        )
        .lean();

    if (
      !command
    ) {
      return null;
    }

    console.log(
      "[ESSL] Queued device command sent:",
      {
        serial:
          normalizedSerial,

        commandId:
          command.commandId,

        from:
          command.from,

        to:
          command.to,
      }
    );

    return command.commandText;
  };
/* =========================================================
   DEVICE COMMAND RESULT
========================================================= */

const processDeviceCommandResult =
  async (
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
  serial &&
  commandId
) {
  await EsslCommand.updateOne(
    {
      deviceSerialNumber:
        serial,

      commandId,
    },
    {
      $set: {
        status:
          returnCode === null ||
          returnCode >= 0
            ? "ACKNOWLEDGED"
            : "FAILED",

        acknowledgedAt:
          new Date(),

        returnCode,

        rawResult:
          text,
      },
    }
  );
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
  returnCode === null ||
  returnCode >= 0,
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

    /*
     * Determine source from the actual punch timestamp.
     *
     * Do NOT use historical-command in-memory state here.
     * Live ATTLOG and historical ATTLOG can reach the same
     * endpoint.
     */

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

      /*
       * Calculate today's start in IST.
       *
       * Server timezone must not decide whether a punch
       * belongs to today in India.
       */
      const now =
        new Date();

      const istNow =
        new Date(
          now.getTime() +
          (330 * 60 * 1000)
        );

      const year =
        istNow.getUTCFullYear();

      const month =
        istNow.getUTCMonth();

      const day =
        istNow.getUTCDate();

      const todayStartIstUtc =
        new Date(
          Date.UTC(
            year,
            month,
            day,
            0,
            0,
            0
          ) -
          (330 * 60 * 1000)
        );

      if (
        parsed.punchTime <
        todayStartIstUtc
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
  const biometricCode =
    parsed.biometricCode;

  const punchTime =
    parsed.punchTime;

  const machineVerifyMode =
    parsed.machineVerifyMode;

  const machineInOutMode =
    parsed.machineInOutMode;

  const biometricEmployeeName =
  normalizeText(
    parsed.biometricEmployeeName ||
    ""
  );

  const machineRecordId =
    "";

  const rawPayload = {
    protocol:
      ESSL_INTEGRATION_TYPE,

    workCode:
      parsed.workCode,

    raw:
      parsed.raw,

    historical:
      source ===
      "HISTORICAL_SYNC",
  };

  const result =
    await ingestRawPunch({
      device,

      biometricCode,

      biometricEmployeeName,

      punchTime,

      source,

      workMode:
        "OFFICE",

      machineRecordId,

      machineUserId:
        biometricCode,

      machineVerifyMode,

      machineInOutMode,

      syncBatchId,

      rawPayload,
    });

  if (
    result?.inserted
  ) {
    stats.inserted +=
      1;
  } else {
    stats.duplicates +=
      1;
  }

  if (
    result?.mapped
  ) {
    stats.mapped +=
      1;
  } else {
    stats.unmapped +=
      1;
  }

  await markPunchReceived(
    device,
    punchTime
  );

  if (
    result?.mapped &&
    result?.punch?._id
  ) {
    try {

      await processRawPunch(
        result.punch._id
      );

    } catch (
      processingError
    ) {

      console.error(
        "[ESSL] Attendance processing failed after raw punch ingestion:",
        {
          rawPunchId:
            result?.punch?._id ||
            null,

          biometricCode,

          biometricEmployeeName,

          punchTime,

          message:
            processingError
              ?.message ||
            String(
              processingError
            ),
        }
      );
    }
  }

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
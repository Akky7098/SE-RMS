const {
  requireDevice,
  markHeartbeat,
  markPunchReceived,
} =
  require(
    "./biometricDevice.service"
  );

const {
  ingestRawPunch,
  upsertMachineUser,
} =
  require(
    "./biometricIngestion.service"
  );

/* =========================================================
   CONSTANTS
========================================================= */

const ESSL_PROVIDER =
  "ESSL";

const ESSL_INTEGRATION_TYPE =
  "ESSL_ADMS";

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

   Machine format:
   YYYY-MM-DD HH:mm:ss

   Current deployment timezone:
   Asia/Kolkata / UTC+05:30
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

   Production live mode.

   Historical retrieval is handled as a separate explicit
   synchronization operation, not automatically on every
   device connection.
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
   PARSE USER RECORD

   Example:

   USER PIN=SE1338 Name=SONU YADAV Pri=0 ...
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
   PARSE ATTLOG ROW

   Typical:

   SE1338<TAB>2026-09-13 09:02:01<TAB>255<TAB>15<TAB>0
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
   INGEST ATTLOG

   source can be:

   LIVE
   HISTORICAL_SYNC

   NO "today only" restriction.
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
          error
        );
      }
    }

    return stats;
  };

/* =========================================================
   HANDLE DEVICE HEARTBEAT
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

  getBodyText,

  getDeviceSerial,

  getRequestIp,

  parseEsslTime,

  resolveEsslDevice,

  buildOptionsResponse,

  parseUserRecord,

  processUserDirectory,

  parseAttendanceRow,

  processAttendanceLog,

  handleHeartbeat,
};
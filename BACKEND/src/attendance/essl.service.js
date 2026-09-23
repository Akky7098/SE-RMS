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

/*
 * Historical attendance requirement:
 *
 * approximately six months.
 *
 * 183 days is used so the historical synchronization
 * covers the requested period without depending on
 * calendar-month length.
 */
const ESSL_HISTORICAL_SYNC_DAYS =
  183;

/*
 * =========================================================
 * TEMPORARY HISTORICAL SYNCHRONIZATION MODE
 * =========================================================
 *
 * TRUE:
 *
 *   The options handshake requests stored ATTLOG history.
 *
 *   Incoming ATTLOG records are marked:
 *
 *   HISTORICAL_SYNC
 *
 *   Records older than ESSL_HISTORICAL_SYNC_DAYS are
 *   acknowledged but NOT persisted.
 *
 *
 * FALSE:
 *
 *   Normal production live mode.
 *
 *   Incoming ATTLOG records are marked:
 *
 *   LIVE
 *
 *
 * IMPORTANT:
 *
 * This should be TRUE only while performing the initial
 * six-month migration.
 *
 * After the historical records have been received,
 * change this to false.
 */
const ESSL_HISTORICAL_SYNC_ENABLED =
  true;

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

   Asia/Kolkata
   UTC +05:30
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

   Device identity is based on:

   provider
   serialNumber / externalDeviceId

   NOT IP address.

   Current physical Sonipat device:

   TBS2261000805
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

   NORMAL PRODUCTION:

   ATTLOGStamp=9999

   INITIAL HISTORICAL IMPORT:

   ATTLOGStamp=None

   IMPORTANT:

   Historical mode is temporary.

   We do NOT permanently request historical attendance
   every time the terminal reconnects.
========================================================= */

const buildOptionsResponse =
  (
    serial
  ) => {
    const attendanceStamp =
      ESSL_HISTORICAL_SYNC_ENABLED
        ? "None"
        : "9999";

    return [
      `GET OPTION FROM: ${serial}`,

      `ATTLOGStamp=${attendanceStamp}`,

      /*
       * Keep machine-user/name directory synchronization.
       */
      "OPERLOGStamp=0",

      /*
       * Attendance photographs are not required by the
       * current attendance architecture.
       */
      "ATTPHOTOStamp=9999",

      "ErrorDelay=30",

      "Delay=10",

      "TransTimes=00:00;23:59",

      "TransInterval=1",

      /*
       * Keep attendance and user directory data enabled.
       */
      "TransFlag=TransData AttLog OpLog EnrollUser ChgUser",

      /*
       * India timezone offset:
       *
       * UTC +05:30 = 330 minutes
       */
      "TimeZone=330",

      /*
       * Live punches remain enabled while historical
       * synchronization is taking place.
       */
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

   IMPORTANT:

   Device users are NOT automatically ERP Employees.

   upsertMachineUser() maintains the machine directory.

   If Employee.biometricCode exists, it can map the user.

   Otherwise the machine user remains biometric-only.
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

   Fields:

   0 biometric code
   1 machine punch time
   2 machine in/out mode
   3 verification mode
   4 work code
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

   We calculate this at processing time instead of keeping
   a Date constant created when Node started.

   This keeps long-running PM2 processes correct.
========================================================= */

const getHistoricalCutoff =
  () => {
    const cutoff =
      new Date();

    cutoff.setUTCDate(
      cutoff.getUTCDate() -
      ESSL_HISTORICAL_SYNC_DAYS
    );

    return cutoff;
  };

/* =========================================================
   INGEST ATTLOG

   source can be:

   LIVE
   HISTORICAL_SYNC

   IMPORTANT:

   There is NO "today only" restriction.

   Historical punches use the exact same central ingestion
   service as live punches.

   The only additional rule for HISTORICAL_SYNC is:

   records older than the required retention window are
   acknowledged but not persisted.
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

      /* =====================================================
         SIX-MONTH HISTORICAL BOUNDARY

         The terminal may contain records older than the
         requested migration window.

         Those rows are acknowledged so the device can
         continue advancing through its stored records,
         but they are NOT written to RawAttendancePunch.
      ===================================================== */

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
        /*
         * ===================================================
         * CENTRAL BIOMETRIC INGESTION
         * ===================================================
         *
         * DO NOT create Employee/User records here.
         *
         * ingestRawPunch() remains responsible for:
         *
         * - deduplication
         * - Employee.biometricCode matching
         * - employeeId assignment
         * - UNMAPPED biometric operators
         * - RawAttendancePunch persistence
         * - processing status
         *
         * Example:
         *
         * SE1451 + Employee exists
         *
         *      employeeId = Employee._id
         *
         * SE1451 + no Employee
         *
         *      employeeId = null
         *      processingStatus = UNMAPPED
         */
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

        historicalCutoff:
          source ===
            "HISTORICAL_SYNC"
            ? historicalCutoff
            : null,

        ...stats,
      }
    );

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

  ESSL_HISTORICAL_SYNC_ENABLED,

  ESSL_HISTORICAL_SYNC_DAYS,

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
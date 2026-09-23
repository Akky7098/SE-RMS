const {
  ESSL_HISTORICAL_SYNC_ENABLED,

  getBodyText,
  getDeviceSerial,
  getRequestIp,
  resolveEsslDevice,
  buildOptionsResponse,
  processUserDirectory,
  processAttendanceLog,
  handleHeartbeat,
} =
  require(
    "./essl.service"
  );

/* =========================================================
   SEND ESSL OK
========================================================= */

const sendOk =
  (
    res,
    count = null
  ) => {
    const body =
      count ===
        null
        ? "OK"
        : `OK:${count}`;

    return res
      .status(
        200
      )
      .type(
        "text/plain"
      )
      .set(
        "Cache-Control",
        "no-store"
      )
      .send(
        body
      );
  };

/* =========================================================
   GET OPTIONS

   eSSL ADMS calls this when connecting.

   Historical synchronization is controlled by
   buildOptionsResponse() in essl.service.js.

   When historical sync is enabled:
   ATTLOGStamp=None

   When normal live mode is enabled:
   ATTLOGStamp=9999
========================================================= */

exports.getOptions =
  async (
    req,
    res
  ) => {
    try {
      const device =
        await handleHeartbeat(
          req
        );

      const serial =
        getDeviceSerial(
          req
        );

      return res
        .status(
          200
        )
        .type(
          "text/plain"
        )
        .set(
          "Cache-Control",
          "no-store"
        )
        .send(
          buildOptionsResponse(
            serial ||
            device.externalDeviceId ||
            device.serialNumber
          )
        );
    } catch (
      error
    ) {
      console.error(
        "eSSL options error:",
        error
      );

      /*
       * Keep ADMS protocol alive.
       *
       * Do not expose internal errors to the biometric
       * terminal because some firmware will continuously
       * reconnect/retry on unexpected HTTP responses.
       */
      return res
        .status(
          200
        )
        .type(
          "text/plain"
        )
        .set(
          "Cache-Control",
          "no-store"
        )
        .send(
          "OK"
        );
    }
  };

/* =========================================================
   DEVICE REQUEST / HEARTBEAT

   The terminal polls:

   /iclock/getrequest
   /iclock/getrequest.aspx

   Both routes point here.
========================================================= */

exports.getRequest =
  async (
    req,
    res
  ) => {
    try {
      await handleHeartbeat(
        req
      );

      return sendOk(
        res
      );
    } catch (
      error
    ) {
      console.error(
        "eSSL heartbeat error:",
        error
      );

      /*
       * Preserve ADMS communication even if heartbeat
       * persistence temporarily fails.
       */
      return sendOk(
        res
      );
    }
  };

/* =========================================================
   RECEIVE DEVICE DATA

   Supported device payloads:

   OPERLOG
   OPLOG
   ATTLOG

   Both:

   POST /iclock/cdata
   POST /iclock/cdata.aspx

   point to this controller.
========================================================= */

exports.receiveData =
  async (
    req,
    res
  ) => {
    try {
      const device =
        await resolveEsslDevice(
          req
        );

      const body =
        getBodyText(
          req
        );

      const table =
        String(
          req.query?.table ||
          ""
        )
          .trim()
          .toUpperCase();

      const serial =
        getDeviceSerial(
          req
        );

      const ip =
        getRequestIp(
          req
        );

      /* =====================================================
         DEVICE USER DIRECTORY

         Machine users are NOT automatically ERP Employees.

         The biometric ingestion layer keeps them separately
         and maps them only when Employee.biometricCode exists.
      ===================================================== */

      if (
        table ===
          "OPERLOG" ||
        table ===
          "OPLOG"
      ) {
        const result =
          await processUserDirectory(
            device,
            body
          );

        console.log(
          "eSSL OPERLOG received:",
          {
            serial,

            ip,

            received:
              result.received,

            saved:
              result.saved,
          }
        );

        return sendOk(
          res,
          result.received
        );
      }

      /* =====================================================
         ATTENDANCE LOGS

         During the explicit historical import window every
         ATTLOG batch is labelled HISTORICAL_SYNC.

         This does NOT bypass the normal ingestion pipeline.

         It still goes through:

         ingestRawPunch()
             ↓
         Employee.biometricCode mapping
             ↓
         mapped / UNMAPPED
             ↓
         RawAttendancePunch
             ↓
         Attendance processor

         Once the historical import has completed,
         ESSL_HISTORICAL_SYNC_ENABLED must be switched back
         to false and subsequent punches are LIVE.
      ===================================================== */

      if (
        table ===
        "ATTLOG"
      ) {
        const source =
          ESSL_HISTORICAL_SYNC_ENABLED
            ? "HISTORICAL_SYNC"
            : "LIVE";

        const result =
          await processAttendanceLog(
            device,
            body,
            {
              source,
            }
          );

        console.log(
          "eSSL ATTLOG received:",
          {
            serial,

            ip,

            source,

            received:
              result.received,

            valid:
              result.valid,

            inserted:
              result.inserted,

            duplicates:
              result.duplicates,

            mapped:
              result.mapped,

            unmapped:
              result.unmapped,

            ignoredBeforeCutoff:
              result
                .ignoredBeforeCutoff,

            errors:
              result.errors,
          }
        );

        /*
         * ACK every row the terminal transmitted.
         *
         * IMPORTANT:
         *
         * This is result.received, NOT result.inserted.
         *
         * Duplicate rows and rows older than our retention
         * requirement were still successfully handled by
         * the server and therefore must be acknowledged.
         *
         * Otherwise the terminal can continuously resend
         * those rows.
         */
        return sendOk(
          res,
          result.received
        );
      }

      /*
       * Unknown/non-attendance ADMS table.
       *
       * ACK it rather than causing a retry loop.
       */
      return sendOk(
        res
      );
    } catch (
      error
    ) {
      console.error(
        "eSSL receive error:",
        error
      );

      /*
       * Preserve ADMS communication.
       *
       * Production logging/alerting records the failure,
       * while the protocol endpoint continues responding.
       */
      return sendOk(
        res
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
          "ESSL_ADMS",

        historicalSync:
          ESSL_HISTORICAL_SYNC_ENABLED,

        time:
          new Date(),
      });
  };
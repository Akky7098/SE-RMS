const {
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

   eSSL ADMS typically calls this when connecting.
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
       * Device protocol should receive a simple response.
       */
      return res
        .status(
          200
        )
        .type(
          "text/plain"
        )
        .send(
          "OK"
        );
    }
  };

/* =========================================================
   DEVICE REQUEST / HEARTBEAT
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

      return sendOk(
        res
      );
    }
  };

/* =========================================================
   RECEIVE DEVICE DATA
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

      /*
       * Device directory.
       */
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

        return sendOk(
          res,
          result.received
        );
      }

      /*
       * Attendance logs.

       * For device-initiated operation this is LIVE.
       *
       * Historical import can call the same service separately
       * with source HISTORICAL_SYNC.
       */
      if (
        table ===
        "ATTLOG"
      ) {
        const result =
          await processAttendanceLog(
            device,
            body,
            {
              source:
                "LIVE",
            }
          );

        /*
         * ACK rows received, including duplicates.

         * Otherwise device can retransmit them.
         */
        return sendOk(
          res,
          result.received
        );
      }

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

       * Production logging/alerting should record failures,
       * but protocol endpoint should not enter a resend storm.
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

        time:
          new Date(),
      });
  };
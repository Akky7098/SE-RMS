const {
  getBodyText,
  getDeviceSerial,
  getRequestIp,
  resolveEsslDevice,
  buildOptionsResponse,
  getPendingDeviceCommand,
  processDeviceCommandResult,
  resolveAttendanceSource,
  processUserDirectory,
  processAttendanceLog,
  handleHeartbeat,
} = require(
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

      console.log(
        "eSSL options request:",
        {
          serial,

          ip:
            getRequestIp(
              req
            ),
        }
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

      return sendOk(
        res
      );
    }
  };

/* =========================================================
   GETREQUEST

   Device polls here for server commands.
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

      const serial =
        getDeviceSerial(
          req
        );

      const command =
        getPendingDeviceCommand(
          serial
        );

      if (
        command
      ) {
        console.log(
          "eSSL command sent:",
          {
            serial,

            ip:
              getRequestIp(
                req
              ),

            command,
          }
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
            command
          );
      }

      return sendOk(
        res
      );
    } catch (
      error
    ) {
      console.error(
        "eSSL getrequest error:",
        error
      );

      return sendOk(
        res
      );
    }
  };

/* =========================================================
   RECEIVE DATA
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

      if (
        table ===
        "ATTLOG"
      ) {
        const source =
          resolveAttendanceSource(
            body
          );

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

        return sendOk(
          res,
          result.received
        );
      }

      console.log(
        "eSSL unknown table received:",
        {
          serial,

          table,

          ip,

          bodyLength:
            body.length,
        }
      );

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

      return sendOk(
        res
      );
    }
  };

/* =========================================================
   DEVICE COMMAND RESULT

   Terminal posts execution result here after receiving
   command through /getrequest.
========================================================= */

exports.deviceCommand =
  async (
    req,
    res
  ) => {
    try {
      await handleHeartbeat(
        req
      );

      const body =
        getBodyText(
          req
        );

      const result =
        processDeviceCommandResult(
          req,
          body
        );

      console.log(
        "eSSL devicecmd received:",
        result
      );

      return sendOk(
        res
      );
    } catch (
      error
    ) {
      console.error(
        "eSSL devicecmd error:",
        error
      );

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
          "REMOTE_DATA_QUERY",

        time:
          new Date(),
      });
  };
const QRCode =
  require("qrcode");

const {
  getBaileysStatus,
  initBaileysClient,
  startFreshQrSession,
  logoutBaileys,
} =
  require("./baileysClient");

const sleep =
  (
    ms
  ) =>
    new Promise(
      (
        resolve
      ) =>
        setTimeout(
          resolve,
          ms
        )
    );

/* =========================================================
   STATUS
========================================================= */

const getStatus =
  async (
    req,
    res
  ) => {
    try {
      const status =
        getBaileysStatus();

      return res
        .status(
          200
        )
        .json({
          success:
            true,

          ready:
            status.ready,

          state:
            status.state,

          ownerPid:
            status.ownerPid ||
            null,

          hasQr:
            Boolean(
              status.qr
            ),
        });
    } catch (
      error
    ) {
      return res
        .status(
          500
        )
        .json({
          success:
            false,

          message:
            error.message,
        });
    }
  };

/* =========================================================
   QR PAGE
========================================================= */

const showQrPage =
  async (
    req,
    res
  ) => {
    try {
      let status =
        getBaileysStatus();

      if (
        status.state ===
        "LOGGED_OUT"
      ) {
        startFreshQrSession()
          .catch(
            (
              error
            ) => {
              console.error(
                "BAILEYS FRESH QR ERROR =>",
                error.message
              );
            }
          );

        await sleep(
          2500
        );

        status =
          getBaileysStatus();
      } else if (
        [
          "NOT_STARTED",
          "DISCONNECTED",
          "ERROR",
          "PAIRING_REQUIRED",
        ].includes(
          status.state
        )
      ) {
        initBaileysClient()
          .catch(
            (
              error
            ) => {
              console.error(
                "BAILEYS INIT ERROR =>",
                error.message
              );
            }
          );

        await sleep(
          2000
        );

        status =
          getBaileysStatus();
      }

      if (
        status.ready
      ) {
        return res.send(`
<!DOCTYPE html>

<html>
<head>
  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  />

  <title>
    SE-RMS WhatsApp
  </title>
</head>

<body
  style="
    margin:0;
    min-height:100vh;
    display:flex;
    align-items:center;
    justify-content:center;
    background:#f4f6f8;
    font-family:Arial,sans-serif;
  "
>
  <div
    style="
      width:min(420px,88vw);
      background:#fff;
      padding:40px;
      border-radius:16px;
      box-shadow:0 8px 30px rgba(0,0,0,.08);
      text-align:center;
    "
  >
    <h2>
      WhatsApp Connected
    </h2>

    <p style="color:#555">
      SE-RMS WhatsApp connection is ready.
    </p>
  </div>
</body>
</html>
        `);
      }

      if (
        status.qr
      ) {
        const qrImage =
          await QRCode.toDataURL(
            status.qr,
            {
              width:
                340,

              margin:
                2,
            }
          );

        return res.send(`
<!DOCTYPE html>

<html>
<head>
  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  />

  <meta
    http-equiv="refresh"
    content="15"
  />

  <title>
    SE-RMS WhatsApp QR
  </title>
</head>

<body
  style="
    margin:0;
    min-height:100vh;
    display:flex;
    align-items:center;
    justify-content:center;
    background:#f4f6f8;
    font-family:Arial,sans-serif;
  "
>
  <div
    style="
      width:min(430px,90vw);
      background:#fff;
      padding:30px;
      border-radius:16px;
      box-shadow:0 8px 30px rgba(0,0,0,.08);
      text-align:center;
    "
  >
    <h2>
      Link SE-RMS WhatsApp
    </h2>

    <p style="color:#555">
      Open WhatsApp →
      Linked Devices →
      Link a Device
    </p>

    <img
      src="${qrImage}"
      alt="WhatsApp QR"
      style="
        width:100%;
        max-width:340px;
        margin:20px auto;
        display:block;
      "
    />

    <p
      style="
        color:#777;
        font-size:13px;
      "
    >
      This page refreshes automatically.
    </p>
  </div>
</body>
</html>
        `);
      }

      return res.send(`
<!DOCTYPE html>

<html>
<head>
  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  />

  <meta
    http-equiv="refresh"
    content="4"
  />

  <title>
    SE-RMS WhatsApp
  </title>
</head>

<body
  style="
    margin:0;
    min-height:100vh;
    display:flex;
    align-items:center;
    justify-content:center;
    background:#f4f6f8;
    font-family:Arial,sans-serif;
  "
>
  <div
    style="
      background:#fff;
      padding:40px;
      border-radius:16px;
      text-align:center;
    "
  >
    <h2>
      WhatsApp Starting...
    </h2>

    <p>
      Current state:
      <strong>
        ${status.state}
      </strong>
    </p>
  </div>
</body>
</html>
      `);
    } catch (
      error
    ) {
      console.error(
        "BAILEYS QR ERROR =>",
        error
      );

      return res
        .status(
          500
        )
        .send(
          "Unable to initialize SE-RMS WhatsApp."
        );
    }
  };

/* =========================================================
   LOGOUT
========================================================= */

const logout =
  async (
    req,
    res
  ) => {
    try {
      await logoutBaileys();

      return res
        .status(
          200
        )
        .json({
          success:
            true,

          message:
            "WhatsApp disconnected successfully.",
        });
    } catch (
      error
    ) {
      return res
        .status(
          500
        )
        .json({
          success:
            false,

          message:
            error.message,
        });
    }
  };

module.exports = {
  getStatus,
  showQrPage,
  logout,
};
const nodemailer =
  require("nodemailer");

/* =========================================================
   VALIDATE ENV
========================================================= */

const MAIL_USER =
  String(
    process.env.MAIL_USER ||
      ""
  ).trim();

const MAIL_APP_PASSWORD =
  String(
    process.env
      .MAIL_APP_PASSWORD ||
      ""
  ).trim();

if (
  !MAIL_USER ||
  !MAIL_APP_PASSWORD
) {
  console.warn(
    "[Mail] MAIL_USER or MAIL_APP_PASSWORD is missing. Email delivery will fail until configured."
  );
}

/* =========================================================
   TRANSPORTER
========================================================= */

const transporter =
  nodemailer.createTransport({
    service:
      "gmail",

    auth: {
      user:
        MAIL_USER,

      pass:
        MAIL_APP_PASSWORD,
    },

    pool:
      true,

    maxConnections:
      3,

    maxMessages:
      100,
  });

/* =========================================================
   VERIFY

   Do not crash backend if Gmail is temporarily unavailable.
========================================================= */

transporter
  .verify()
  .then(() => {
    console.log(
      "[Mail] Gmail transporter ready"
    );
  })
  .catch(
    (
      error
    ) => {
      console.error(
        "[Mail] Transporter verification failed:",
        error.message
      );
    }
  );

module.exports =
  transporter;
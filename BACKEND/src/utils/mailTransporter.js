const nodemailer =
  require("nodemailer");

/* =========================================================
   MAIL TRANSPORTER

   DEVELOPMENT:
   If SMTP credentials are not configured,
   Nodemailer Ethereal test SMTP will be used.

   PRODUCTION:
   Configure SMTP values in .env.
========================================================= */

let transporter = null;

/* =========================================================
   CREATE TRANSPORTER
========================================================= */

const createTransporter =
  async () => {
    /*
     * Reuse existing transporter.
     */
    if (transporter) {
      return transporter;
    }

    const smtpHost =
      process.env.SMTP_HOST;

    const smtpUser =
      process.env.SMTP_USER;

    const smtpPass =
      process.env.SMTP_PASS;

    /* =====================================================
       REAL SMTP
    ===================================================== */

    if (
      smtpHost &&
      smtpUser &&
      smtpPass
    ) {
      transporter =
        nodemailer.createTransport({
          host: smtpHost,

          port:
            Number(
              process.env
                .SMTP_PORT
            ) || 587,

          secure:
            String(
              process.env
                .SMTP_SECURE
            ).toLowerCase() ===
            "true",

          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

      console.log(
        "MAIL: SMTP transporter configured"
      );

      return transporter;
    }

    /* =====================================================
       DEVELOPMENT / DEMO SMTP
    ===================================================== */

    console.log(
      "MAIL: SMTP not configured. Creating demo Ethereal account..."
    );

    const testAccount =
      await nodemailer
        .createTestAccount();

    transporter =
      nodemailer.createTransport({
        host:
          "smtp.ethereal.email",

        port: 587,

        secure: false,

        auth: {
          user:
            testAccount.user,

          pass:
            testAccount.pass,
        },
      });

    console.log(
      "MAIL: Demo Ethereal transporter ready"
    );

    return transporter;
  };

/* =========================================================
   SEND MAIL

   Wrapper keeps the API similar to normal Nodemailer:

   transporter.sendMail({...})
========================================================= */

const sendMail =
  async (options) => {
    const mailTransporter =
      await createTransporter();

    const info =
      await mailTransporter
        .sendMail(options);

    console.log(
      "MAIL SENT:",
      info.messageId
    );

    /*
     * Ethereal provides a preview URL.
     *
     * Open this URL in browser to see
     * the generated demo email.
     */
    const previewUrl =
      nodemailer.getTestMessageUrl(
        info
      );

    if (previewUrl) {
      console.log(
        "MAIL PREVIEW:",
        previewUrl
      );
    }

    return info;
  };

module.exports = {
  sendMail,
};
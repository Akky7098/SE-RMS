const nodemailer = require("nodemailer");
const env = require("../config/env");

const sendEmail = async ({
  to,
  subject,
  text,
  html,
}) => {
  if (
    !env.smtpHost ||
    !env.smtpUser ||
    !env.smtpPass
  ) {
    if (
      env.nodeEnv !== "production"
    ) {
      console.warn(
        "SMTP is not configured. Email skipped."
      );

      console.log({
        to,
        subject,
        text,
      });

      return;
    }

    throw new Error(
      "SMTP configuration is missing"
    );
  }

  const transporter =
    nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });

  await transporter.sendMail({
    from: env.emailFrom,
    to,
    subject,
    text,
    html,
  });
};

module.exports = sendEmail;
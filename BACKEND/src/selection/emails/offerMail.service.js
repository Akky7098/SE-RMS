const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const {
  buildOfferSentEmail,
} = require(
  "./offerSent.template"
);

/* =========================================================
   MAIL CONFIG
========================================================= */

const getMailUser = () =>
  process.env.EMAIL_USER ||
  process.env.MAIL_USER ||
  process.env.SMTP_USER ||
  process.env.GMAIL_USER ||
  "";

const getMailPassword = () =>
  process.env.EMAIL_APP_PASSWORD ||
  process.env.EMAIL_PASSWORD ||
  process.env.MAIL_PASSWORD ||
  process.env.SMTP_PASSWORD ||
  process.env.GMAIL_APP_PASSWORD ||
  "";

const getFromAddress = () =>
  process.env.EMAIL_FROM ||
  process.env.MAIL_FROM ||
  getMailUser();

/* =========================================================
   TRANSPORT
========================================================= */

const createTransporter = () => {
  const user =
    getMailUser();

  const pass =
    getMailPassword();

  if (
    !user ||
    !pass
  ) {
    throw new Error(
      "Offer email configuration is incomplete. Email username or app password is missing."
    );
  }

  return nodemailer.createTransport({
    service: "gmail",

    auth: {
      user,
      pass,
    },
  });
};

/* =========================================================
   COMPANY LOGO
========================================================= */

const getLogoPath = () => {
  const logoPath =
    path.resolve(
      process.cwd(),
      "assets",
      "email",
      "sandeep-edge-tech-logo.jpg"
    );

  if (
    fs.existsSync(
      logoPath
    )
  ) {
    return logoPath;
  }

  return null;
};

/* =========================================================
   EMAIL NORMALIZATION
========================================================= */

const normalizeEmail = (
  value
) =>
  String(
    value ||
      ""
  )
    .trim()
    .toLowerCase();

/* =========================================================
   SEND OFFER
========================================================= */

const sendOfferLetterEmail =
  async ({
    offer,
    candidate,
    hiringHr,
  }) => {
    if (!offer) {
      throw new Error(
        "Offer Letter record is required."
      );
    }

    const candidateEmail =
      normalizeEmail(
        offer.email ||
        candidate?.email
      );

    if (
      !candidateEmail
    ) {
      throw new Error(
        "Candidate email address is missing."
      );
    }

    /* =====================================================
       PDF
    ===================================================== */

    const pdfPath =
      offer?.pdf?.path;

    if (
      !pdfPath
    ) {
      throw new Error(
        "Generated Offer Letter PDF path is missing."
      );
    }

    if (
      !fs.existsSync(
        pdfPath
      )
    ) {
      throw new Error(
        "Generated Offer Letter PDF could not be found on the server."
      );
    }

    /* =====================================================
       CC = HIRING HR
    ===================================================== */

    const hiringHrEmail =
      normalizeEmail(
        hiringHr?.email ||
        offer?.hrEmail
      );

    const cc = [];

    if (
      hiringHrEmail &&
      hiringHrEmail !==
        candidateEmail
    ) {
      cc.push(
        hiringHrEmail
      );
    }

    /* =====================================================
       EMAIL BODY
    ===================================================== */

    const mail =
      buildOfferSentEmail({
        offer,

        candidate,

        hiringHr,
      });

    /* =====================================================
       ATTACHMENTS
    ===================================================== */

    const attachments = [
      {
        filename:
          offer?.pdf?.fileName ||
          `Offer_Letter_${String(
            offer.referenceNumber ||
              "SE"
          ).replace(
            /[^a-zA-Z0-9_-]+/g,
            "_"
          )}.pdf`,

        path:
          pdfPath,

        contentType:
          "application/pdf",
      },
    ];

    const logoPath =
      getLogoPath();

    if (
      logoPath
    ) {
      attachments.push({
        filename:
          "sandeep-edge-tech-logo.jpg",

        path:
          logoPath,

        cid:
          "seCompanyLogo",

        contentDisposition:
          "inline",
      });
    }

    /* =====================================================
       SEND
    ===================================================== */

    const transporter =
      createTransporter();

    const from =
      getFromAddress();

    const info =
      await transporter.sendMail({
        from:
          `"Sandeep Edgetech | People & Culture" <${from}>`,

        to:
          candidateEmail,

        cc:
          cc.length
            ? cc
            : undefined,

        subject:
          mail.subject,

        text:
          mail.text,

        html:
          mail.html,

        attachments,
      });

    return {
      success: true,

      messageId:
        info?.messageId ||
        "",

      accepted:
        info?.accepted ||
        [],

      rejected:
        info?.rejected ||
        [],

      candidateEmail,

      cc,
    };
  };

module.exports = {
  sendOfferLetterEmail,
};
const fs =
  require(
    "fs"
  );

const path =
  require(
    "path"
  );

const transporter =
  require(
    "../config/mailTransporter"
  );

const {
  buildInterviewCheckInEmail,
} =
  require(
    "./interviewCheckInEmail.template"
  );

/* =========================================================
   ASSETS

   __dirname:
   BACKEND/src/interview

   ../../assets/email:
   BACKEND/assets/email
========================================================= */

const EMAIL_ASSET_DIR =
  path.resolve(
    __dirname,
    "../../assets/email"
  );

const LOGO_PATH =
  path.join(
    EMAIL_ASSET_DIR,
    "sandeep-edge-tech-logo.jpg"
  );

const BROCHURE_PATH =
  path.join(
    EMAIL_ASSET_DIR,
    "sandeep-edge-tech-company-brochure.pdf"
  );

/* =========================================================
   FROM
========================================================= */

const getFrom =
  () => {
    const email =
      process.env
        .MAIL_USER ||
      "";

    const name =
      process.env
        .MAIL_FROM_NAME ||
      process.env
        .COMPANY_NAME ||
      "Sandeep Edge Tech";

    return `"${name}" <${email}>`;
  };

/* =========================================================
   SEND CHECK-IN WELCOME EMAIL
========================================================= */

const sendInterviewCheckInWelcomeEmail =
  async ({
    candidate,
    interview,
  }) => {
    const email =
      String(
        candidate
          ?.email ||
          ""
      )
        .trim()
        .toLowerCase();

    if (
      !email
    ) {
      return {
        success:
          false,

        skipped:
          true,

        error:
          "Candidate email is not available",
      };
    }

    try {
      const template =
        buildInterviewCheckInEmail({
          candidate,
          interview,
        });

      const attachments =
        [];

      /* =====================================================
         INLINE COMPANY LOGO
      ===================================================== */

      if (
        fs.existsSync(
          LOGO_PATH
        )
      ) {
        attachments.push({
          filename:
            "sandeep-edge-tech-logo.jpg",

          path:
            LOGO_PATH,

          cid:
            "sandeep-edge-tech-logo",
        });
      } else {
        console.warn(
          "[Interview Check-In Mail] Logo was not found:",
          LOGO_PATH
        );
      }

      /* =====================================================
         COMPANY BROCHURE
      ===================================================== */

      if (
        fs.existsSync(
          BROCHURE_PATH
        )
      ) {
        attachments.push({
          filename:
            "Sandeep-Edge-Tech-Company-Brochure.pdf",

          path:
            BROCHURE_PATH,

          contentType:
            "application/pdf",
        });
      } else {
        /*
         * Do NOT fail candidate check-in because brochure
         * has not been uploaded yet.
         */

        console.warn(
          "[Interview Check-In Mail] Brochure was not found:",
          BROCHURE_PATH
        );
      }

      /* =====================================================
         SEND
      ===================================================== */

      const info =
        await transporter
          .sendMail({
            from:
              getFrom(),

            to:
              email,

            replyTo:
              process.env
                .MAIL_REPLY_TO ||
              process.env
                .MAIL_USER ||
              undefined,

            subject:
              template.subject,

            text:
              template.text,

            html:
              template.html,

            attachments,
          });

      return {
        success:
          true,

        skipped:
          false,

        messageId:
          info
            ?.messageId ||
          "",
      };
    } catch (
      error
    ) {
      console.error(
        "[Interview Check-In Mail] Candidate welcome email failed:",
        error
      );

      return {
        success:
          false,

        skipped:
          false,

        error:
          error
            ?.message ||
          "Candidate welcome email could not be sent",
      };
    }
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  sendInterviewCheckInWelcomeEmail,
};
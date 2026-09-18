const fs =
  require("fs");

const path =
  require("path");

const transporter =
  require(
    "../config/mailTransporter"
  );

const {
  buildCandidateSelectedEmail,
} =
  require(
    "./emails/candidateSelected.template"
  );

const {
  buildCandidateHoldEmail,
} =
  require(
    "./emails/candidateHold.template"
  );

const {
  buildCandidateRejectedEmail,
} =
  require(
    "./emails/candidateRejected.template"
  );

/* =========================================================
   ASSETS
========================================================= */

const LOGO_PATH =
  path.resolve(
    __dirname,
    "../../assets/email/sandeep-edge-tech-logo.jpg"
  );

/* =========================================================
   NORMALIZE EMAIL
========================================================= */

const normalizeEmail =
  (
    value
  ) =>
    String(
      value ||
        ""
    )
      .trim()
      .toLowerCase();

/* =========================================================
   TEMPLATE
========================================================= */

const getDecisionTemplate =
  ({
    finalDecision,
    candidate,
    evaluation,
    interview,
  }) => {
    if (
      finalDecision ===
      "SELECTED"
    ) {
      return buildCandidateSelectedEmail({
        candidate,

        evaluation,

        interview,
      });
    }

    if (
      finalDecision ===
      "HOLD"
    ) {
      return buildCandidateHoldEmail({
        candidate,

        evaluation,

        interview,
      });
    }

    return buildCandidateRejectedEmail({
      candidate,

      evaluation,

      interview,
    });
  };

/* =========================================================
   SEND
========================================================= */

const sendEvaluationDecisionEmail =
  async ({
    candidate,
    evaluation,
    interview,
    hiringHr,
  }) => {
    const candidateEmail =
      normalizeEmail(
        candidate
          ?.email
      );

    const hiringHrEmail =
      normalizeEmail(
        hiringHr
          ?.email
      );

    if (
      !candidateEmail
    ) {
      return {
        success:
          false,

        skipped:
          true,

        error:
          "Candidate email is not available",

        email:
          "",

        cc:
          hiringHrEmail
            ? [
                hiringHrEmail,
              ]
            : [],
      };
    }

    const finalDecision =
      String(
        evaluation
          ?.finalDecision ||
          ""
      )
        .trim()
        .toUpperCase();

    const template =
      getDecisionTemplate({
        finalDecision,

        candidate,

        evaluation,

        interview,
      });

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

    const attachments =
      [];

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
    }

    try {
      const result =
        await transporter
          .sendMail({
            from: {
              name:
                process.env
                  .MAIL_FROM_NAME ||
                "Sandeep Edge Tech",

              address:
                process.env
                  .MAIL_USER,
            },

            replyTo:
              process.env
                .MAIL_REPLY_TO ||
              process.env
                .MAIL_USER,

            to:
              candidateEmail,

            cc:
              cc.length
                ? cc
                : undefined,

            subject:
              template
                .subject,

            text:
              template
                .text,

            html:
              template
                .html,

            attachments,
          });

      return {
        success:
          true,

        skipped:
          false,

        email:
          candidateEmail,

        cc,

        subject:
          template
            .subject,

        messageId:
          result
            ?.messageId ||
          "",
      };
    } catch (
      error
    ) {
      console.error(
        "[Evaluation] Decision email failed:",
        error
      );

      return {
        success:
          false,

        skipped:
          false,

        email:
          candidateEmail,

        cc,

        subject:
          template
            .subject,

        error:
          error
            ?.message ||
          "Evaluation email could not be sent",
      };
    }
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  sendEvaluationDecisionEmail,
};
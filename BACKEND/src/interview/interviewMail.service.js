const fs =
  require("fs");

const path =
  require("path");

const transporter =
  require(
    "../config/mailTransporter"
  );

const {
  buildCandidateInterviewEmail,
  buildInterviewerInterviewEmail,
} =
  require(
    "./interviewEmail.template"
  );

/* =========================================================
   MAIL CONFIG
========================================================= */

const MAIL_USER =
  String(
    process.env.MAIL_USER ||
      ""
  ).trim();

const MAIL_FROM_NAME =
  String(
    process.env
      .MAIL_FROM_NAME ||
      "Sandeep Edge Tech"
  ).trim();

const MAIL_REPLY_TO =
  String(
    process.env
      .MAIL_REPLY_TO ||
      MAIL_USER
  ).trim();

/* =========================================================
   LOGO
========================================================= */

const LOGO_PATH =
  path.resolve(
    __dirname,
    "../assets/email/sandeep-edge-tech-logo.jpg"
  );

/* =========================================================
   EXISTS
========================================================= */

const fileExists = (
  filePath
) => {
  try {
    return Boolean(
      filePath &&
      fs.existsSync(
        filePath
      )
    );
  } catch {
    return false;
  }
};

/* =========================================================
   RESOLVE CANDIDATE CV

   Supports the common resume shapes already used by SE-RMS.

   It does not throw if the CV file is missing.
========================================================= */

const resolveCandidateCv =
  (
    candidate
  ) => {
    const resume =
      candidate?.resume ||
      {};

    const directPaths = [
      resume.absolutePath,
      resume.filePath,
      resume.path,
    ]
      .filter(
        Boolean
      )
      .map(
        (
          value
        ) =>
          path.isAbsolute(
            value
          )
            ? value
            : path.resolve(
                process.cwd(),
                value
              )
      );

    for (
      const filePath
      of directPaths
    ) {
      if (
        fileExists(
          filePath
        )
      ) {
        return {
          path:
            filePath,

          filename:
            resume.originalName ||
            path.basename(
              filePath
            ),
        };
      }
    }

    if (
      !resume.fileName
    ) {
      return null;
    }

    const candidateId =
      String(
        candidate?._id ||
          ""
      );

    const candidates = [
      path.resolve(
        process.cwd(),
        "uploads",
        "resumes",
        "candidates",
        candidateId,
        resume.fileName
      ),

      path.resolve(
        process.cwd(),
        "uploads",
        "resumes",
        "candidates",
        resume.fileName
      ),

      path.resolve(
        __dirname,
        "../../uploads/resumes/candidates",
        candidateId,
        resume.fileName
      ),

      path.resolve(
        __dirname,
        "../../uploads/resumes/candidates",
        resume.fileName
      ),
    ];

    const matched =
      candidates.find(
        fileExists
      );

    if (
      !matched
    ) {
      return null;
    }

    return {
      path:
        matched,

      filename:
        resume.originalName ||
        resume.fileName ||
        "Candidate-CV.pdf",
    };
  };

/* =========================================================
   COMMON ATTACHMENTS
========================================================= */

const getLogoAttachment =
  () => {
    if (
      !fileExists(
        LOGO_PATH
      )
    ) {
      console.warn(
        `[Mail] Logo file not found: ${LOGO_PATH}`
      );

      return [];
    }

    return [
      {
        filename:
          "sandeep-edge-tech-logo.jpg",

        path:
          LOGO_PATH,

        cid:
          "sandeep-edge-tech-logo",
      },
    ];
  };

/* =========================================================
   CANDIDATE MAIL
========================================================= */

const sendCandidateInterviewMail =
  async ({
    candidate,
    interview,
    interviewer,
  }) => {
    if (
      !candidate?.email
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

    const subject =
      `Interview Scheduled | ${interview.positionTitle} | Sandeep Edge Tech`;

    try {
      const info =
        await transporter.sendMail({
          from: {
            name:
              MAIL_FROM_NAME,

            address:
              MAIL_USER,
          },

          replyTo:
            MAIL_REPLY_TO,

          to:
            candidate.email,

          subject,

          html:
            buildCandidateInterviewEmail({
              candidate,
              interview,
              interviewer,
            }),

          attachments:
            getLogoAttachment(),
        });

      return {
        success:
          true,

        messageId:
          info.messageId ||
          "",
      };
    } catch (
      error
    ) {
      console.error(
        "[Interview Mail] Candidate email failed:",
        error
      );

      return {
        success:
          false,

        error:
          error.message ||
          "Candidate email could not be sent",
      };
    }
  };

/* =========================================================
   INTERVIEWER MAIL
========================================================= */

const sendInterviewerInterviewMail =
  async ({
    candidate,
    interview,
    interviewer,
    requirement,
  }) => {
    if (
      !interviewer?.email
    ) {
      return {
        success:
          false,

        skipped:
          true,

        error:
          "Interviewer email is not available",
      };
    }

    const attachments =
      [
        ...getLogoAttachment(),
      ];

    const cv =
      resolveCandidateCv(
        candidate
      );

    if (
      cv
    ) {
      attachments.push({
        filename:
          cv.filename,

        path:
          cv.path,

        contentType:
          "application/pdf",
      });
    }

    const subject =
      `Interview Assignment | ${candidate.fullName} | ${interview.positionTitle}`;

    try {
      const info =
        await transporter.sendMail({
          from: {
            name:
              MAIL_FROM_NAME,

            address:
              MAIL_USER,
          },

          replyTo:
            MAIL_REPLY_TO,

          to:
            interviewer.email,

          subject,

          html:
            buildInterviewerInterviewEmail({
              candidate,
              interview,
              interviewer,
              requirement,
            }),

          attachments,
        });

      return {
        success:
          true,

        messageId:
          info.messageId ||
          "",

        cvAttached:
          Boolean(
            cv
          ),
      };
    } catch (
      error
    ) {
      console.error(
        "[Interview Mail] Interviewer email failed:",
        error
      );

      return {
        success:
          false,

        error:
          error.message ||
          "Interviewer email could not be sent",

        cvAttached:
          false,
      };
    }
  };

/* =========================================================
   SEND BOTH

   IMPORTANT:
   Mail failure does NOT destroy a successfully-created
   interview.
========================================================= */

const sendInterviewScheduledEmails =
  async ({
    candidate,
    interview,
    interviewer,
    requirement,
  }) => {
    const [
      candidateResult,
      interviewerResult,
    ] =
      await Promise.all([
        sendCandidateInterviewMail({
          candidate,
          interview,
          interviewer,
        }),

        sendInterviewerInterviewMail({
          candidate,
          interview,
          interviewer,
          requirement,
        }),
      ]);

    return {
      candidate:
        candidateResult,

      interviewer:
        interviewerResult,
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  sendInterviewScheduledEmails,

  sendCandidateInterviewMail,

  sendInterviewerInterviewMail,

  resolveCandidateCv,
};
const evaluationService =
  require(
    "./evaluation.service"
  );

/* =========================================================
   STATUS
========================================================= */

const getStatusCode =
  (
    error,
    fallback =
      400
  ) =>
    error
      ?.statusCode ||
    error
      ?.status ||
    fallback;

/* =========================================================
   ERROR
========================================================= */

const sendError =
  (
    res,
    error,
    fallback,
    status =
      400
  ) =>
    res
      .status(
        getStatusCode(
          error,
          status
        )
      )
      .json({
        success:
          false,

        message:
          error
            ?.message ||
          fallback,
      });

/* =========================================================
   COMPLETE
========================================================= */

const complete =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await evaluationService
          .completeEvaluation({
            interviewId:
              req.params
                .interviewId,

            body:
              req.body ||
              {},

            user:
              req.user,
          });

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "Interview evaluation completed successfully",

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Interview evaluation could not be completed"
      );
    }
  };

/* =========================================================
   LIST
========================================================= */

const list =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await evaluationService
          .getEvaluations(
            req.query ||
              {}
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Evaluations could not be loaded"
      );
    }
  };

/* =========================================================
   SUMMARY
========================================================= */

const summary =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await evaluationService
          .getEvaluationSummary();

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Evaluation summary could not be loaded"
      );
    }
  };

/* =========================================================
   DETAIL
========================================================= */

const detail =
  async (
    req,
    res
  ) => {
    try {
      const data =
  await evaluationService
    .getEvaluationById(
      req.params
        .evaluationId,
      {
        repairSelection:
          true,

        userId:
          req.user
            ?._id ||
          null,
      }
    );

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Evaluation not found",
        404
      );
    }
  };

/* =========================================================
   BY INTERVIEW
========================================================= */

const byInterview =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await evaluationService
          .getEvaluationByInterview(
            req.params
              .interviewId
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Evaluation not found",
        404
      );
    }
  };

/* =========================================================
   RESEND MAIL
========================================================= */

const resendDecisionEmail =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await evaluationService
          .resendDecisionEmail({
            evaluationId:
              req.params
                .evaluationId,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Candidate decision email sent successfully",

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Candidate decision email could not be sent"
      );
    }
  };

/* =========================================================
   ATTACHMENT
========================================================= */

const attachment =
  async (
    req,
    res
  ) => {
    try {
      const file =
        await evaluationService
          .getEvaluationAttachment(
            req.params
              .evaluationId
          );

      res.type(
        file.mimeType
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${String(
          file.originalName ||
            "evaluation-document"
        ).replaceAll(
          '"',
          ""
        )}"`
      );

      return res.sendFile(
        file.path
      );
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Evaluation document could not be opened",
        404
      );
    }
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  complete,

  list,

  summary,

  detail,

  byInterview,

  resendDecisionEmail,

  attachment,
};
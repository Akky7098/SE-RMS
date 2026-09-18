const fs =
  require("fs");

const interviewService =
  require(
    "./interview.service"
  );

  const evaluationService =
  require(
    "../evaluation/evaluation.service"
  );

/* =========================================================
   STATUS
========================================================= */

const getStatusCode = (
  error,
  fallback = 400
) => {
  return (
    error?.statusCode ||
    error?.status ||
    fallback
  );
};

/* =========================================================
   COMMON ERROR
========================================================= */

const sendError =
  (
    res,
    error,
    fallbackMessage,
    fallbackStatus = 400
  ) => {
    return res
      .status(
        getStatusCode(
          error,
          fallbackStatus
        )
      )
      .json({
        success:
          false,

        message:
          error.message ||
          fallbackMessage,
      });
  };

/* =========================================================
   META
========================================================= */

const getMeta =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await interviewService
          .getInterviewMeta({
            candidateId:
              req.query
                ?.candidateId ||
              "",
          });

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
        "Interview metadata could not be loaded"
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
        await interviewService
          .getInterviews(
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
        "Interviews could not be loaded"
      );
    }
  };

/* =========================================================
   SCHEDULE
========================================================= */

const schedule =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await interviewService
          .scheduleInterview({
            candidateId:
              req.params
                .candidateId,

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
            "Interview scheduled successfully",

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Interview could not be scheduled"
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
        await interviewService
          .getInterviewById(
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
        "Interview not found",
        404
      );
    }
  };

/* =========================================================
   RESCHEDULE
========================================================= */

const reschedule =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await interviewService
          .rescheduleInterview({
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
        .status(200)
        .json({
          success:
            true,

          message:
            "Interview rescheduled successfully",

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Interview could not be rescheduled"
      );
    }
  };

/* =========================================================
   CANCEL
========================================================= */

const cancel =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await interviewService
          .cancelInterview({
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
        .status(200)
        .json({
          success:
            true,

          message:
            "Interview cancelled successfully",

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Interview could not be cancelled"
      );
    }
  };

/* =========================================================
   CHECK-IN
========================================================= */

const checkIn =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await interviewService
          .checkInInterview({
            interviewId:
              req.params
                .interviewId,

            user:
              req.user,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Candidate checked in successfully",

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Interview check-in failed"
      );
    }
  };

/* =========================================================
   UPLOAD EVALUATION DOCUMENT
========================================================= */

const uploadEvaluationAttachment =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await interviewService
          .prepareEvaluationAttachment({
            interviewId:
              req.params
                .interviewId,

            file:
              req.file,

            user:
              req.user,
          });

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "Evaluation document uploaded successfully",

          data,
        });
    } catch (
      error
    ) {
      /*
       * If service rejects after multer already saved,
       * remove the temporary file.
       */
      if (
        req.file?.path
      ) {
        try {
          await fs.promises
            .unlink(
              req.file.path
            );
        } catch {
          // Ignore cleanup errors.
        }
      }

      return sendError(
        res,
        error,
        "Evaluation document could not be uploaded"
      );
    }
  };

/* =========================================================
   REMOVE TEMP EVALUATION DOCUMENT
========================================================= */

const removeEvaluationAttachment =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await interviewService
          .removeEvaluationAttachment({
            interviewId:
              req.params
                .interviewId,

            storedName:
              req.body
                ?.storedName ||
              "",
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Evaluation document removed",

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Evaluation document could not be removed"
      );
    }
  };

/* =========================================================
   COMPLETE EVALUATION
========================================================= */

/* =========================================================
   COMPLETE EVALUATION
   COMPATIBILITY ENDPOINT

   Existing frontend:
   POST /api/v1/interviews/:interviewId/evaluation

   New logic lives inside evaluation module.
========================================================= */

const submitEvaluation =
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
      return res
        .status(
          getStatusCode(
            error
          )
        )
        .json({
          success:
            false,

          message:
            error.message ||
            "Interview evaluation could not be completed",
        });
    }
  };

/* =========================================================
   GET EVALUATION
========================================================= */

const getEvaluation =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await interviewService
          .getInterviewEvaluation(
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
        "Interview evaluation could not be loaded"
      );
    }
  };

/* =========================================================
   OPEN TEMP DOCUMENT
========================================================= */

const openTemporaryEvaluationAttachment =
  async (
    req,
    res
  ) => {
    try {
      const file =
        await interviewService
          .getEvaluationAttachment({
            interviewId:
              req.params
                .interviewId,

            storedName:
              req.params
                .storedName,

            temporary:
              true,
          });

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
   OPEN PERMANENT DOCUMENT
========================================================= */

const openEvaluationAttachment =
  async (
    req,
    res
  ) => {
    try {
      const file =
        await interviewService
          .getEvaluationAttachment({
            interviewId:
              req.params
                .interviewId,

            temporary:
              false,
          });

      if (
        file.mimeType
      ) {
        res.type(
          file.mimeType
        );
      }

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
  getMeta,

  list,

  schedule,

  detail,

  reschedule,

  cancel,

  checkIn,

  uploadEvaluationAttachment,

  removeEvaluationAttachment,

  submitEvaluation,

  getEvaluation,

  openTemporaryEvaluationAttachment,

  openEvaluationAttachment,
};
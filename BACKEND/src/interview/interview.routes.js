const express =
  require("express");

const router =
  express.Router();

const interviewController =
  require(
    "./interview.controller"
  );

const {
  uploadInterviewEvaluationAttachment,
} =
  require(
    "./interviewEvaluationUpload.middleware"
  );

const {
  authenticate,
} =
  require(
    "../middleware/auth.middleware"
  );

/* =========================================================
   AUTH
========================================================= */

router.use(
  authenticate
);

/* =========================================================
   META
========================================================= */

router.get(
  "/meta",

  interviewController
    .getMeta
);

/* =========================================================
   LIST
========================================================= */

router.get(
  "/",

  interviewController
    .list
);

/* =========================================================
   SCHEDULE
========================================================= */

router.post(
  "/candidate/:candidateId",

  interviewController
    .schedule
);

/* =========================================================
   EVALUATION DOCUMENT — TEMP UPLOAD

   IMPORTANT:
   Must appear before /:interviewId route.
========================================================= */

router.post(
  "/:interviewId/evaluation/attachment",

  uploadInterviewEvaluationAttachment,

  interviewController
    .uploadEvaluationAttachment
);

/* =========================================================
   TEMP ATTACHMENT PREVIEW
========================================================= */

router.get(
  "/:interviewId/evaluation/attachment/temp/:storedName",

  interviewController
    .openTemporaryEvaluationAttachment
);

/* =========================================================
   REMOVE TEMP ATTACHMENT
========================================================= */

router.delete(
  "/:interviewId/evaluation/attachment",

  interviewController
    .removeEvaluationAttachment
);

/* =========================================================
   PERMANENT ATTACHMENT
========================================================= */

router.get(
  "/:interviewId/evaluation/attachment",

  interviewController
    .openEvaluationAttachment
);

/* =========================================================
   GET EVALUATION
========================================================= */

router.get(
  "/:interviewId/evaluation",

  interviewController
    .getEvaluation
);

/* =========================================================
   COMPLETE EVALUATION
========================================================= */

router.post(
  "/:interviewId/evaluation",

  interviewController
    .submitEvaluation
);

/* =========================================================
   DETAIL
========================================================= */

router.get(
  "/:interviewId",

  interviewController
    .detail
);

/* =========================================================
   RESCHEDULE
========================================================= */

router.patch(
  "/:interviewId/reschedule",

  interviewController
    .reschedule
);

/* =========================================================
   CANCEL
========================================================= */

router.patch(
  "/:interviewId/cancel",

  interviewController
    .cancel
);

/* =========================================================
   CHECK-IN
========================================================= */

router.post(
  "/:interviewId/check-in",

  interviewController
    .checkIn
);

module.exports =
  router;
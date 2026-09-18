const express =
  require("express");

const router =
  express.Router();

const evaluationController =
  require(
    "./evaluation.controller"
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
   SUMMARY

   GET
   /api/v1/evaluations/summary
========================================================= */

router.get(
  "/summary",

  evaluationController
    .summary
);

/* =========================================================
   LIST

   GET
   /api/v1/evaluations

   Examples:
   ?decision=SELECTED
   ?decision=HOLD
   ?decision=REJECTED
   ?search=ankit
========================================================= */

router.get(
  "/",

  evaluationController
    .list
);

/* =========================================================
   COMPLETE INTERVIEW EVALUATION

   POST
   /api/v1/evaluations/interview/:interviewId
========================================================= */

router.post(
  "/interview/:interviewId",

  evaluationController
    .complete
);

/* =========================================================
   GET EVALUATION BY INTERVIEW
========================================================= */

router.get(
  "/interview/:interviewId",

  evaluationController
    .byInterview
);

/* =========================================================
   ATTACHMENT

   IMPORTANT:
   This comes before /:evaluationId
========================================================= */

router.get(
  "/:evaluationId/attachment",

  evaluationController
    .attachment
);

/* =========================================================
   RESEND DECISION EMAIL
========================================================= */

router.post(
  "/:evaluationId/resend-email",

  evaluationController
    .resendDecisionEmail
);

/* =========================================================
   DETAIL
========================================================= */

router.get(
  "/:evaluationId",

  evaluationController
    .detail
);

module.exports =
  router;
const express =
  require("express");

const {
  authenticate,
  authorizeRoles,
} = require(
  "../middleware/auth.middleware"
);

const recruitmentController =
  require(
    "./recruitment.controller"
  );

const router =
  express.Router();

/* =========================================================
   AUTHENTICATION
========================================================= */

router.use(
  authenticate
);

/* =========================================================
   HR / MANAGEMENT ACCESS

   Later we will move this to:
   RECRUITMENT + VIEW/CREATE/UPDATE
   permission middleware.
========================================================= */

router.use(
  authorizeRoles(
    "SUPER_ADMIN",
    "ADMIN",
    "HEAD",
    "MANAGER"
  )
);

/* =========================================================
   HR TASKS

   Keep before /candidates/:candidateId
========================================================= */

router.get(
  "/tasks/me",
  recruitmentController
    .getMyRecruitmentTasks
);

/* =========================================================
   DUPLICATE CHECK
========================================================= */

router.get(
  "/candidates/check-duplicate",
  recruitmentController
    .checkDuplicate
);

/* =========================================================
   REQUIREMENT CANDIDATES
========================================================= */

router.post(
  "/requirements/:requirementId/candidates",
  recruitmentController
    .createCandidate
);

router.get(
  "/requirements/:requirementId/candidates",
  recruitmentController
    .listRequirementCandidates
);

/* =========================================================
   CANDIDATE
========================================================= */

router.get(
  "/candidates/:candidateId",
  recruitmentController
    .getCandidate
);

/* =========================================================
   CALLING
========================================================= */

router.post(
  "/candidates/:candidateId/call",
  recruitmentController
    .addCallAttempt
);

/* =========================================================
   SCREENING
========================================================= */

router.post(
  "/candidates/:candidateId/screen",
  recruitmentController
    .screenCandidate
);

/* =========================================================
   SHORTLIST / REJECT
========================================================= */

router.post(
  "/candidates/:candidateId/shortlist",
  recruitmentController
    .shortlistCandidate
);

router.post(
  "/candidates/:candidateId/reject",
  recruitmentController
    .rejectCandidate
);

/* =========================================================
   ACTIVITY TIMELINE
========================================================= */

router.get(
  "/candidates/:candidateId/timeline",
  recruitmentController
    .getCandidateTimeline
);

module.exports =
  router;
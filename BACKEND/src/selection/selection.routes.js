const express =
  require("express");

const router =
  express.Router();

const selectionController =
  require(
    "./selection.controller"
  );

const {
  authenticate,
} =
  require(
    "../middleware/auth.middleware"
  );

/* =========================================================
   AUTH

   All routes in this file are internal SE-RMS routes.

   Candidate public portal remains completely separate under:
   /api/public/candidate/...
========================================================= */

router.use(
  authenticate
);

/* =========================================================
   SUMMARY

   GET
   /api/v1/selections/summary
========================================================= */

router.get(
  "/summary",

  selectionController
    .summary
);

/* =========================================================
   LIST

   GET
   /api/v1/selections

   Examples:

   ?status=LOI_PENDING
   ?search=ankit
   ?hiringHr=<id>
========================================================= */

router.get(
  "/",

  selectionController
    .list
);

/* =========================================================
   CREATE / ENSURE FROM EVALUATION

   Mainly repair / historical migration endpoint.

   Normal flow creates Selection automatically when
   evaluation decision becomes SELECTED.

   POST
   /api/v1/selections/from-evaluation/:evaluationId
========================================================= */

router.post(
  "/from-evaluation/:evaluationId",

  selectionController
    .createFromEvaluation
);

/* =========================================================
   BY CANDIDATE

   IMPORTANT:
   Must come before /:selectionId

   GET
   /api/v1/selections/candidate/:candidateId
========================================================= */

router.get(
  "/candidate/:candidateId",

  selectionController
    .byCandidate
);

/* =========================================================
   LOI READINESS

   GET
   /api/v1/selections/:selectionId/loi/readiness

   Determines what HR still needs to provide before the
   LOI can be generated.
========================================================= */

router.get(
  "/:selectionId/loi/readiness",

  selectionController
    .loiReadiness
);

/* =========================================================
   GENERATE / REGENERATE LOI

   POST
   /api/v1/selections/:selectionId/loi/generate

   Initial generation:

   {
     "officeLocation": "DELHI",
     "proposedJoiningDate": "2026-09-15"
   }

   Editing:
   HR changes a variable and calls the SAME endpoint again.

   Example:

   {
     "officeLocation": "SONIPAT",
     "proposedJoiningDate": "2026-09-22"
   }

   Result:
   version 1 → SUPERSEDED
   version 2 → DRAFT
========================================================= */

router.post(
  "/:selectionId/loi/generate",

  selectionController
    .generateLoi
);

/* =========================================================
   OPEN CURRENT LOI

   GET
   /api/v1/selections/:selectionId/loi

   Authenticated route.
   Streams the current LOI PDF inline for HR review.
========================================================= */

router.get(
  "/:selectionId/loi",

  selectionController
    .openCurrentLoi
);

/* =========================================================
   SEND CURRENT LOI

   POST
   /api/v1/selections/:selectionId/loi/send

   Only valid when current Selection status = LOI_DRAFT.
========================================================= */

router.post(
  "/:selectionId/loi/send",

  selectionController
    .sendLoi
);

/* =========================================================
   DETAIL

   IMPORTANT:
   Keep generic /:selectionId LAST.
========================================================= */

router.get(
  "/:selectionId",

  selectionController
    .detail
);

module.exports =
  router;
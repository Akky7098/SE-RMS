const express =
  require("express");

const {
  authenticate,
  authorizeRoles,
} = require(
  "../middleware/auth.middleware"
);

const {
  uploadResume,
} = require(
  "./resumeStorage.service"
);

const {
  parseResume,
  cancelTemporaryResume,
  viewCandidateResume,
} = require(
  "./resumeParser.controller"
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
   CURRENT TEMP AUTHORIZATION

   Later we'll replace this with effective access +
   department/recruitment permissions.
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
   PARSE RESUME
========================================================= */

router.post(
  "/parse",
  uploadResume,
  parseResume
);

/* =========================================================
   DELETE TEMPORARY RESUME
========================================================= */

router.delete(
  "/temporary",
  cancelTemporaryResume
);

/* =========================================================
   VIEW SAVED CANDIDATE CV
========================================================= */

router.get(
  "/candidate-resume/:candidateId",
  viewCandidateResume
);

module.exports =
  router;
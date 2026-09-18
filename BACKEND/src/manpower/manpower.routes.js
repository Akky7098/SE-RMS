const express =
  require(
    "express"
  );

const {
  authenticate,
} =
  require(
    "../middleware/auth.middleware"
  );

const {
  createRequirement,

  listRequirements,

  getRequirement,

  getApprovalInbox,

  approveRequirement,

  rejectRequirement,

  getHrQueue,

  getHrEmployees,

  assignHr,

  getMyHiring,

  startHiring,
} =
  require(
    "./manpower.controller"
  );

const router =
  express.Router();

/* =========================================================
   AUTH

   All manpower routes require login.
========================================================= */

router.use(
  authenticate
);

/* =========================================================
   LIST / CREATE
========================================================= */

router.get(
  "/",

  listRequirements
);

router.post(
  "/",

  createRequirement
);

/* =========================================================
   APPROVAL INBOX

   IMPORTANT:
   Must remain BEFORE /:requirementId
========================================================= */

router.get(
  "/approvals/inbox",

  getApprovalInbox
);

/* =========================================================
   HR EMPLOYEES

   Hiring Owner dropdown.

   IMPORTANT:
   Must remain BEFORE /:requirementId
========================================================= */

router.get(
  "/hr/employees",

  getHrEmployees
);

/* =========================================================
   MY HIRING

   Work specifically assigned to logged-in HR employee.

   IMPORTANT:
   Must remain BEFORE /:requirementId
========================================================= */

router.get(
  "/hr/my-hiring",

  getMyHiring
);

/* =========================================================
   HR QUEUE

   All approved/current hiring visible to HR.

   IMPORTANT:
   Must remain BEFORE /:requirementId
========================================================= */

router.get(
  "/hr/queue",

  getHrQueue
);

/* =========================================================
   ASSIGN / REASSIGN HIRING OWNER
========================================================= */

router.patch(
  "/:requirementId/assign-hr",

  assignHr
);

/* =========================================================
   APPROVAL ACTIONS
========================================================= */

router.post(
  "/:requirementId/approve",

  approveRequirement
);

router.post(
  "/:requirementId/reject",

  rejectRequirement
);

/* =========================================================
   HR START HIRING
========================================================= */

router.post(
  "/:requirementId/start-hiring",

  startHiring
);

/* =========================================================
   DETAILS

   Keep generic parameter route LAST.
========================================================= */

router.get(
  "/:requirementId",

  getRequirement
);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;
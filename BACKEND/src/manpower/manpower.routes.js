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
  manpowerApprovalPage,

  processManpowerApproval,

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
   PUBLIC WHATSAPP APPROVAL ROUTES

   IMPORTANT:

   These routes MUST remain BEFORE router.use(authenticate).

   The secure one-time token is the authorization mechanism
   for these two routes.

   Full production URL:

   GET
   https://api.nuvanata.io/api/v1/manpower/public/approval/:token?action=approve

   GET
   https://api.nuvanata.io/api/v1/manpower/public/approval/:token?action=reject

   POST
   https://api.nuvanata.io/api/v1/manpower/public/approval/:token/approve

   POST
   https://api.nuvanata.io/api/v1/manpower/public/approval/:token/reject
========================================================= */

router.get(
  "/public/approval/:token",
  manpowerApprovalPage
);

router.post(
  "/public/approval/:token/:action",
  processManpowerApproval
);

/* =========================================================
   AUTH

   Everything below this point requires normal SE-RMS login.
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
   AUTHENTICATED APPROVAL ACTIONS

   Existing web application approval endpoints remain
   completely available.

   These are separate from the secure WhatsApp link.
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
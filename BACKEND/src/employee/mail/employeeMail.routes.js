const express =
  require(
    "express"
  );

const {
  authenticate,
} =
  require(
    "../../middleware/auth.middleware"
  );

const {
  requirePermission,
} =
  require(
    "../../middleware/permission.middleware"
  );

const controller =
  require(
    "./employeeMail.controller"
  );

const router =
  express.Router();

/* =========================================================
   AUTH
========================================================= */

router.use(
  authenticate
);

/* =========================================================
   SMTP / GMAIL CHECK
========================================================= */

router.get(
  "/verify",

  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),

  controller
    .verify
);

/* =========================================================
   STATUS
========================================================= */

router.get(
  "/:employeeId",

  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),

  controller
    .status
);

/* =========================================================
   READINESS
========================================================= */

router.get(
  "/:employeeId/access/readiness",

  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),

  controller
    .accessReadiness
);

router.get(
  "/:employeeId/welcome/readiness",

  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),

  controller
    .welcomeReadiness
);

/* =========================================================
   ACCESS COMMUNICATION
========================================================= */

router.post(
  "/:employeeId/access/send",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  controller
    .sendAccess
);

router.post(
  "/:employeeId/access/resend",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  controller
    .resendAccess
);

/* =========================================================
   FINAL WELCOME
========================================================= */

router.post(
  "/:employeeId/welcome/send",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  controller
    .sendWelcome
);

router.post(
  "/:employeeId/welcome/resend",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  controller
    .resendWelcome
);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;
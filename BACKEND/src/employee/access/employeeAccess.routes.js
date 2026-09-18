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
    "./employeeAccess.controller"
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
   READINESS
========================================================= */

router.get(
  "/:employeeId/readiness",

  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),

  controller
    .readiness
);

/* =========================================================
   DETAIL
========================================================= */

router.get(
  "/:employeeId",

  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),

  controller
    .detail
);

/* =========================================================
   PREPARE
========================================================= */

router.post(
  "/:employeeId/prepare",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  controller
    .prepare
);

/* =========================================================
   CREATE ACCOUNT
========================================================= */

router.post(
  "/:employeeId/create-account",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  controller
    .createAccount
);

/* =========================================================
   OFFICIAL EMAIL
========================================================= */

router.patch(
  "/:employeeId/email",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  controller
    .updateEmail
);

/* =========================================================
   DISABLE
========================================================= */

router.patch(
  "/:employeeId/disable",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  controller
    .disable
);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;
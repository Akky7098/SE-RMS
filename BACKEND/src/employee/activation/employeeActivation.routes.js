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
    "./employeeActivation.controller"
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
   ACTIVATE
========================================================= */

router.post(
  "/:employeeId/activate",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  controller
    .activate
);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;
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
    "./appointment.controller"
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
   HISTORY

   Keep before generic/current patterns if extended later.
========================================================= */

router.get(
  "/:employeeId/history",

  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),

  controller
    .history
);

/* =========================================================
   CURRENT
========================================================= */

router.get(
  "/:employeeId",

  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),

  controller
    .current
);

/* =========================================================
   GENERATE
========================================================= */

router.post(
  "/:employeeId/generate",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  controller
    .generate
);

/* =========================================================
   REVIEW
========================================================= */

router.post(
  "/:employeeId/review",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  controller
    .review
);

/* =========================================================
   ISSUE
========================================================= */

router.post(
  "/:employeeId/issue",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  controller
    .issue
);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;
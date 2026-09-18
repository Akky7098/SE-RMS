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
  requirePermission,
} =
  require(
    "../middleware/permission.middleware"
  );

const {
  createEmployee,
  listEmployees,
  getOrganization,
  getEmployeeMeta,
  getEmployee,
  updateEmployee,
  exitEmployee,
  getDirectReports,
  getReportingTree,
  linkUser,
} =
  require(
    "./employee.controller"
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
   META
========================================================= */

router.get(
  "/meta",

  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),

  getEmployeeMeta
);

/* =========================================================
   ORGANIZATION
========================================================= */

router.get(
  "/organization",

  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),

  getOrganization
);

/* =========================================================
   LIST
========================================================= */

router.get(
  "/",

  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),

  listEmployees
);

/* =========================================================
   CREATE

   Existing/legacy employee creation still works through
   this endpoint.

   Recruitment onboarding normally uses:
   /employee-onboarding/:id/create-employee
========================================================= */

router.post(
  "/",

  requirePermission(
    "EMPLOYEE",
    "CREATE"
  ),

  createEmployee
);

/* =========================================================
   DIRECT REPORTS
========================================================= */

router.get(
  "/:id/direct-reports",

  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),

  getDirectReports
);

/* =========================================================
   REPORTING TREE
========================================================= */

router.get(
  "/:id/reporting-tree",

  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),

  getReportingTree
);

/* =========================================================
   LINK USER
========================================================= */

router.patch(
  "/:id/link-user",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  linkUser
);

/* =========================================================
   EXIT
========================================================= */

router.patch(
  "/:id/exit",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  exitEmployee
);

/* =========================================================
   DETAIL
========================================================= */

router.get(
  "/:id",

  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),

  getEmployee
);

/* =========================================================
   UPDATE
========================================================= */

router.patch(
  "/:id",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  updateEmployee
);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;
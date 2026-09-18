const express =
  require(
    "express"
  );

const router =
  express.Router();

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

const onboardingController =
  require(
    "./onboarding.controller"
  );

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
  onboardingController.meta
);

/* =========================================================
   MANAGERS
========================================================= */

router.get(
  "/managers",
  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),
  onboardingController.managers
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
  onboardingController.list
);

/* =========================================================
   READINESS
========================================================= */

router.get(
  "/selection/:selectionId/readiness",
  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),
  onboardingController.readiness
);

/* =========================================================
   GET BY SELECTION
========================================================= */

router.get(
  "/selection/:selectionId",
  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),
  onboardingController.bySelection
);

/* =========================================================
   START ONBOARDING

   IMPORTANT:
   Generic VIEW only gets request into module.

   Actual permission is checked by onboarding.service:
   - Super Admin
   - HR Head/Admin
   - Assigned HR
========================================================= */

router.post(
  "/selection/:selectionId/start",
  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),
  onboardingController.start
);

/* =========================================================
   DETAIL
========================================================= */

router.get(
  "/:onboardingId",
  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),
  onboardingController.detail
);

/* =========================================================
   UPDATE ONBOARDING

   Real mutation authority is onboarding-specific.
========================================================= */

router.patch(
  "/:onboardingId",
  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),
  onboardingController.update
);

/* =========================================================
   CREATE EMPLOYEE FROM ONBOARDING

   Do NOT require global EMPLOYEE.CREATE here.

   Assigned HR must be able to create the Employee for
   their own confirmed hire.
========================================================= */

router.post(
  "/:onboardingId/create-employee",
  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),
  onboardingController.createEmployee
);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;
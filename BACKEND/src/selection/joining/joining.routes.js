const express =
  require(
    "express"
  );

const router =
  express.Router();

const joiningController =
  require(
    "./joining.controller"
  );

const {
  authenticate,
} =
  require(
    "../../middleware/auth.middleware"
  );

/* =========================================================
   AUTH
========================================================= */

router.use(
  authenticate
);

/* =========================================================
   SUMMARY

   GET
   /api/v1/joinings/summary
========================================================= */

router.get(
  "/summary",

  joiningController
    .summary
);

/* =========================================================
   READINESS

   GET
   /api/v1/joinings/selection/:selectionId/readiness
========================================================= */

router.get(
  "/selection/:selectionId/readiness",

  joiningController
    .readiness
);

/* =========================================================
   GET JOINING

   GET
   /api/v1/joinings/selection/:selectionId
========================================================= */

router.get(
  "/selection/:selectionId",

  joiningController
    .getBySelection
);

/* =========================================================
   START / ENSURE JOINING

   POST
   /api/v1/joinings/selection/:selectionId/start
========================================================= */

router.post(
  "/selection/:selectionId/start",

  joiningController
    .ensure
);

/* =========================================================
   UPDATE JOINING

   PATCH
   /api/v1/joinings/selection/:selectionId

   Example:

   {
     "action": "RESCHEDULE",
     "joiningDate": "2026-09-17",
     "reason": "Notice period extension",
     "remarks": "Confirmed over phone."
   }
========================================================= */

router.patch(
  "/selection/:selectionId",

  joiningController
    .update
);

/* =========================================================
   CONFIRM DAY 1

   POST
   /api/v1/joinings/selection/:selectionId/day1

   {
     "actualJoiningDate": "2026-09-17",
     "remarks": "Reported at Sonipat office."
   }
========================================================= */

router.post(
  "/selection/:selectionId/day1",

  joiningController
    .confirmDay1
);

/* =========================================================
   LINK EMPLOYEE

   PATCH
   /api/v1/joinings/selection/:selectionId/employee

   {
     "employeeId": "..."
   }

   Later this will be called automatically by Employee
   creation service.
========================================================= */

router.patch(
  "/selection/:selectionId/employee",

  joiningController
    .linkEmployee
);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;
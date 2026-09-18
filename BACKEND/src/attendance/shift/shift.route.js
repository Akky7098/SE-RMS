const express =
  require(
    "express"
  );

const controller =
  require(
    "./shift.controller"
  );

const router =
  express.Router();

/* =========================================================
   AUTH GUARD

   IMPORTANT:

   Your application authentication middleware runs before
   this router and populates:

   req.user

   Do not perform role/permission authorization here.

   Authorization belongs in shift.controller.js and later
   the hierarchy/scope service.
========================================================= */

const requireAuthenticatedUser =
  (
    req,
    res,
    next
  ) => {
    if (
      !req.user
    ) {
      return res
        .status(
          401
        )
        .json({
          success:
            false,

          message:
            "Authentication required.",
        });
    }

    return next();
  };

router.use(
  requireAuthenticatedUser
);

/* =========================================================
   CALENDAR

   GET
   /api/v1/attendance/shifts/calendar/week
========================================================= */

router.get(
  "/calendar/week",
  controller.getWeek
);

/* =========================================================
   SHIFT MASTER

   GET
   /api/v1/attendance/shifts/master

   POST
   /api/v1/attendance/shifts/master

   PATCH
   /api/v1/attendance/shifts/master/:id
========================================================= */

router.get(
  "/master",
  controller.getShifts
);

router.post(
  "/master",
  controller.createShift
);

router.patch(
  "/master/:id",
  controller.updateShift
);

/* =========================================================
   WEEKLY ROSTERS

   IMPORTANT:
   Keep /rosters before /rosters/:id.
========================================================= */

/* =========================================================
   LIST / RESOLVE WEEKLY ROSTERS

   GET
   /api/v1/attendance/shifts/rosters
========================================================= */

router.get(
  "/rosters",
  controller.listRosters
);

/* =========================================================
   CREATE / ENSURE WEEK

   POST
   /api/v1/attendance/shifts/rosters
========================================================= */

router.post(
  "/rosters",
  controller.createRoster
);

/* =========================================================
   GET ROSTER

   GET
   /api/v1/attendance/shifts/rosters/:id
========================================================= */

router.get(
  "/rosters/:id",
  controller.getRoster
);

/* =========================================================
   ONE CELL ASSIGNMENT

   PUT
   /api/v1/attendance/shifts/rosters/:id/assignment
========================================================= */

router.put(
  "/rosters/:id/assignment",
  controller.assignDay
);

/* =========================================================
   BULK ASSIGNMENT

   POST
   /api/v1/attendance/shifts/rosters/:id/bulk-assign

   Body example:

   {
     "employeeIds": [
       "..."
     ],

     "dates": [
       "2026-09-14",
       "2026-09-15"
     ],

     "dayType":
       "SHIFT",

     "shiftId":
       "..."
   }
========================================================= */

router.post(
  "/rosters/:id/bulk-assign",
  controller.bulkAssign
);

/* =========================================================
   COMPLETE WEEK

   POST
   /api/v1/attendance/shifts/rosters/:id/assign-week
========================================================= */

router.post(
  "/rosters/:id/assign-week",
  controller.assignCompleteWeek
);

/* =========================================================
   COPY PREVIOUS WEEK

   POST
   /api/v1/attendance/shifts/rosters/:id/copy-previous-week
========================================================= */

router.post(
  "/rosters/:id/copy-previous-week",
  controller.copyPreviousWeek
);

/* =========================================================
   WORKFLOW
========================================================= */

/* =========================================================
   HEAD → HR

   POST
   /api/v1/attendance/shifts/rosters/:id/submit
========================================================= */

router.post(
  "/rosters/:id/submit",
  controller.submitRoster
);

/* =========================================================
   HR → PUBLISHED

   POST
   /api/v1/attendance/shifts/rosters/:id/publish
========================================================= */

router.post(
  "/rosters/:id/publish",
  controller.publishRoster
);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;
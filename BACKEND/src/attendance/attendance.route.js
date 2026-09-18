const express =
  require(
    "express"
  );

const attendanceController =
  require(
    "./attendance.controller"
  );

const {
  authenticate,
} =
  require(
    "../middleware/auth.middleware"
  );

const router =
  express.Router();

/* =========================================================
   AUTHENTICATION
========================================================= */

router.use(
  authenticate
);

/* =========================================================
   SECONDARY AUTH GUARD
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
   EMPLOYEE SELF
========================================================= */

router.get(
  "/me",
  attendanceController
    .getMyAttendance
);

/* =========================================================
   WEB ATTENDANCE

   OFFICE:
   biometric / device attendance

   WFH:
   browser check-in/check-out

   FIELD_VISIT:
   browser/mobile location attendance

   ON_DUTY:
   browser/mobile location attendance
========================================================= */

router.post(
  "/web/start",
  attendanceController
    .startWebAttendance
);

router.post(
  "/web/stop",
  attendanceController
    .stopWebAttendance
);

/* =========================================================
   ACTIVE WEB ATTENDANCE LOCATION CHECKPOINT

   Used for periodic or foreground location updates.
========================================================= */

router.post(
  "/web/location",
  attendanceController
    .addLocationCheckpoint
);

/* =========================================================
   EMPLOYEE LOCATION HISTORY

   Controller additionally enforces:
   ATTENDANCE_VIEW_FIELD_LOCATION

   Backend scope still applies:
   SELF / TEAM / DEPARTMENT / ALL
========================================================= */

router.get(
  "/location/:employeeId",
  attendanceController
    .getEmployeeLocationHistory
);

/* =========================================================
   SCOPED ATTENDANCE
========================================================= */

router.get(
  "/",
  attendanceController
    .getAttendance
);

/* =========================================================
   MONTHLY
========================================================= */

router.get(
  "/monthly",
  attendanceController
    .getMonthlySummary
);

/* =========================================================
   MONTHLY EXPORT
========================================================= */

router.get(
  "/export/monthly",
  attendanceController
    .exportMonthlyAttendance
);

/* =========================================================
   REGULARIZATION
========================================================= */

router.post(
  "/regularization",
  attendanceController
    .requestRegularization
);

router.get(
  "/regularization/me",
  attendanceController
    .getMyRegularizations
);

router.get(
  "/regularization/pending",
  attendanceController
    .getPendingRegularizations
);

router.patch(
  "/regularization/:id/approve",
  attendanceController
    .approveRegularization
);

router.patch(
  "/regularization/:id/reject",
  attendanceController
    .rejectRegularization
);

/* =========================================================
   INTERNAL / ADMIN PROCESSING

   IMPORTANT:
   Authentication is mandatory.

   These should ultimately be protected by:
   ATTENDANCE_MANAGE_DEVICE
   / ATTENDANCE_PROCESS_RAW
========================================================= */

router.post(
  "/processing/punch/:id",
  attendanceController
    .processRawPunch
);

router.post(
  "/processing/pending",
  attendanceController
    .processPending
);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;
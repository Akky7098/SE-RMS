const express =
  require("express");

const timesheetController =
  require(
    "./timesheet.controller"
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
   ALL TIMESHEET APIs REQUIRE LOGIN
========================================================= */

router.use(
  authenticate
);

/* =========================================================
   EMPLOYEE
========================================================= */

/*
 * Submit today's report
 */
router.post(
  "/",
  timesheetController
    .createTimesheet
);

/*
 * Check whether current employee
 * has submitted today's report
 */
router.get(
  "/me/today",
  timesheetController
    .getMyToday
);

/* =========================================================
   DASHBOARD SUMMARY

   IMPORTANT:
   Keep this route before /:id
   otherwise "summary" may be treated as an ID.
========================================================= */

router.get(
  "/summary",
  timesheetController
    .getTimesheetSummary
);

/* =========================================================
   TIMESHEET LIST

   Access/scoping should be handled
   by the service according to hierarchy:

   Employee -> Own reports
   Manager  -> Reportees
   Head     -> Department
   Admin    -> Permitted scope
   Super Admin -> All
========================================================= */

router.get(
  "/",
  timesheetController
    .getTimesheets
);

/* =========================================================
   SINGLE REPORT
========================================================= */

router.get(
  "/:id",
  timesheetController
    .getTimesheetById
);

/* =========================================================
   REVIEW TIMESHEET
========================================================= */

router.patch(
  "/:id/review",
  timesheetController
    .reviewTimesheet
);

module.exports =
  router;
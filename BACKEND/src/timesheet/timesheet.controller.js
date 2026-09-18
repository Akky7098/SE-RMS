const timesheetService =
  require("./timesheet.service");

/* =========================================================
   RESPONSE HELPER
========================================================= */

const success = (
  res,
  data,
  message = "Success",
  statusCode = 200
) => {
  return res
    .status(
      statusCode
    )
    .json({
      success:
        true,

      message,

      data,
    });
};

/* =========================================================
   CREATE
========================================================= */

exports.createTimesheet =
  async (
    req,
    res,
    next
  ) => {
    try {
      const data =
        await timesheetService
          .createTimesheet(
            req.body,
            req.user
          );

      return success(
        res,
        data,
        "Daily work report submitted successfully.",
        201
      );
    } catch (error) {
      return next(
        error
      );
    }
  };

/* =========================================================
   MY TODAY
========================================================= */

exports.getMyToday =
  async (
    req,
    res,
    next
  ) => {
    try {
      const data =
        await timesheetService
          .getMyToday(
            req.user
          );

      return success(
        res,
        data
      );
    } catch (error) {
      return next(
        error
      );
    }
  };

/* =========================================================
   LIST
========================================================= */

exports.getTimesheets =
  async (
    req,
    res,
    next
  ) => {
    try {
      const data =
        await timesheetService
          .getTimesheets(
            req.query,
            req.user
          );

      return success(
        res,
        data
      );
    } catch (error) {
      return next(
        error
      );
    }
  };

/* =========================================================
   SINGLE
========================================================= */

exports.getTimesheetById =
  async (
    req,
    res,
    next
  ) => {
    try {
      const data =
        await timesheetService
          .getTimesheetById(
            req.params.id,
            req.user
          );

      return success(
        res,
        data
      );
    } catch (error) {
      return next(
        error
      );
    }
  };

/* =========================================================
   REVIEW
========================================================= */

exports.reviewTimesheet =
  async (
    req,
    res,
    next
  ) => {
    try {
      const data =
        await timesheetService
          .reviewTimesheet(
            req.params.id,
            req.body,
            req.user
          );

      return success(
        res,
        data,
        "Timesheet reviewed successfully."
      );
    } catch (error) {
      return next(
        error
      );
    }
  };

/* =========================================================
   SUMMARY
========================================================= */

exports.getTimesheetSummary =
  async (
    req,
    res,
    next
  ) => {
    try {
      const data =
        await timesheetService
          .getTimesheetSummary(
            req.query,
            req.user
          );

      return success(
        res,
        data
      );
    } catch (error) {
      return next(
        error
      );
    }
  };
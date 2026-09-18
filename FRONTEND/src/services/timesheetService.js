import api from "./api";

/* =========================================================
   BASE URL

   If your backend app.js mounts:
   /api/v1/timesheet

   instead of:
   /api/v1/timesheets

   change ONLY this constant.
========================================================= */

const TIMESHEET_BASE =
  "/timesheet";

/* =========================================================
   SUBMIT TIMESHEET
========================================================= */

export const createTimesheet =
  async (
    payload
  ) => {
    const response =
      await api.post(
        TIMESHEET_BASE,
        payload
      );

    return (
      response?.data?.data ||
      response?.data ||
      null
    );
  };

/* =========================================================
   MY TODAY
========================================================= */

export const getMyTimesheetToday =
  async () => {
    const response =
      await api.get(
        `${TIMESHEET_BASE}/me/today`
      );

    return (
      response?.data?.data ||
      response?.data ||
      null
    );
  };

/* =========================================================
   SUMMARY
========================================================= */

export const getTimesheetSummary =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        `${TIMESHEET_BASE}/summary`,
        {
          params,
        }
      );

    return (
      response?.data?.data ||
      response?.data ||
      null
    );
  };

/* =========================================================
   LIST
========================================================= */

export const getTimesheets =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        TIMESHEET_BASE,
        {
          params,
        }
      );

    const payload =
      response?.data?.data ||
      response?.data ||
      {};

    return {
      records:
        payload.records ||
        payload.timesheets ||
        payload.items ||
        (
          Array.isArray(
            payload
          )
            ? payload
            : []
        ),

      pagination:
        payload.pagination ||
        {},
    };
  };

/* =========================================================
   SINGLE TIMESHEET
========================================================= */

export const getTimesheetById =
  async (
    id
  ) => {
    const response =
      await api.get(
        `${TIMESHEET_BASE}/${id}`
      );

    return (
      response?.data?.data ||
      response?.data ||
      null
    );
  };

/* =========================================================
   REVIEW TIMESHEET
========================================================= */

export const reviewTimesheet =
  async (
    id,
    payload
  ) => {
    const response =
      await api.patch(
        `${TIMESHEET_BASE}/${id}/review`,
        payload
      );

    return (
      response?.data?.data ||
      response?.data ||
      null
    );
  };
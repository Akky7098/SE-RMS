import api from "./api";

/* =========================================================
   RESPONSE
========================================================= */

const responseData =
  (
    response
  ) =>
    response?.data?.data ||
    response?.data ||
    null;

/* =========================================================
   READINESS
========================================================= */

export const getAppointmentReadiness =
  async (
    employeeId
  ) => {
    const response =
      await api.get(
        `/employee-appointments/${employeeId}/readiness`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   CURRENT
========================================================= */

export const getCurrentAppointment =
  async (
    employeeId
  ) => {
    const response =
      await api.get(
        `/employee-appointments/${employeeId}`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   HISTORY
========================================================= */

export const getAppointmentHistory =
  async (
    employeeId
  ) => {
    const response =
      await api.get(
        `/employee-appointments/${employeeId}/history`
      );

    const data =
      responseData(
        response
      );

    return Array.isArray(
      data
    )
      ? data
      : [];
  };

/* =========================================================
   GENERATE
========================================================= */

export const generateAppointment =
  async (
    employeeId,
    payload = {}
  ) => {
    const response =
      await api.post(
        `/employee-appointments/${employeeId}/generate`,
        payload
      );

    return responseData(
      response
    );
  };

/* =========================================================
   REVIEW
========================================================= */

export const reviewAppointment =
  async (
    employeeId
  ) => {
    const response =
      await api.post(
        `/employee-appointments/${employeeId}/review`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   ISSUE
========================================================= */

export const issueAppointment =
  async (
    employeeId
  ) => {
    const response =
      await api.post(
        `/employee-appointments/${employeeId}/issue`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   DEFAULT
========================================================= */

const employeeAppointmentService = {
  getAppointmentReadiness,

  getCurrentAppointment,

  getAppointmentHistory,

  generateAppointment,

  reviewAppointment,

  issueAppointment,
};

export default employeeAppointmentService;
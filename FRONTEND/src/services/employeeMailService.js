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
   MAIL SERVICE HEALTH
========================================================= */

export const verifyEmployeeMailService =
  async () => {
    const response =
      await api.get(
        "/employee-mail/verify"
      );

    return responseData(
      response
    );
  };

/* =========================================================
   STATUS
========================================================= */

export const getEmployeeMailStatus =
  async (
    employeeId
  ) => {
    const response =
      await api.get(
        `/employee-mail/${employeeId}`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   ACCESS READINESS
========================================================= */

export const getAccessMailReadiness =
  async (
    employeeId
  ) => {
    const response =
      await api.get(
        `/employee-mail/${employeeId}/access/readiness`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   WELCOME READINESS
========================================================= */

export const getWelcomeMailReadiness =
  async (
    employeeId
  ) => {
    const response =
      await api.get(
        `/employee-mail/${employeeId}/welcome/readiness`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   ACCESS SEND
========================================================= */

export const sendEmployeeAccessMail =
  async (
    employeeId
  ) => {
    const response =
      await api.post(
        `/employee-mail/${employeeId}/access/send`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   ACCESS RESEND
========================================================= */

export const resendEmployeeAccessMail =
  async (
    employeeId
  ) => {
    const response =
      await api.post(
        `/employee-mail/${employeeId}/access/resend`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   WELCOME SEND
========================================================= */

export const sendEmployeeWelcomeMail =
  async (
    employeeId
  ) => {
    const response =
      await api.post(
        `/employee-mail/${employeeId}/welcome/send`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   WELCOME RESEND
========================================================= */

export const resendEmployeeWelcomeMail =
  async (
    employeeId
  ) => {
    const response =
      await api.post(
        `/employee-mail/${employeeId}/welcome/resend`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   DEFAULT
========================================================= */

const employeeMailService = {
  verifyEmployeeMailService,

  getEmployeeMailStatus,

  getAccessMailReadiness,

  getWelcomeMailReadiness,

  sendEmployeeAccessMail,

  resendEmployeeAccessMail,

  sendEmployeeWelcomeMail,

  resendEmployeeWelcomeMail,
};

export default employeeMailService;
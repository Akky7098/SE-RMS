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

export const getEmployeeAccessReadiness =
  async (
    employeeId
  ) => {
    const response =
      await api.get(
        `/employee-access/${employeeId}/readiness`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   DETAIL
========================================================= */

export const getEmployeeAccess =
  async (
    employeeId
  ) => {
    const response =
      await api.get(
        `/employee-access/${employeeId}`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   PREPARE
========================================================= */

export const prepareEmployeeAccess =
  async (
    employeeId,
    payload = {}
  ) => {
    const response =
      await api.post(
        `/employee-access/${employeeId}/prepare`,
        payload
      );

    return responseData(
      response
    );
  };

/* =========================================================
   CREATE ACCOUNT
========================================================= */

export const createEmployeeRmsAccount =
  async (
    employeeId
  ) => {
    const response =
      await api.post(
        `/employee-access/${employeeId}/create-account`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   UPDATE OFFICIAL EMAIL
========================================================= */

export const updateEmployeeOfficialEmail =
  async (
    employeeId,
    officialEmail
  ) => {
    const response =
      await api.patch(
        `/employee-access/${employeeId}/email`,
        {
          officialEmail:
            String(
              officialEmail ||
              ""
            )
              .trim()
              .toLowerCase(),
        }
      );

    return responseData(
      response
    );
  };

/* =========================================================
   DISABLE
========================================================= */

export const disableEmployeeRmsAccess =
  async (
    employeeId,
    remarks = ""
  ) => {
    const response =
      await api.patch(
        `/employee-access/${employeeId}/disable`,
        {
          remarks,
        }
      );

    return responseData(
      response
    );
  };

/* =========================================================
   DEFAULT
========================================================= */

const employeeAccessService = {
  getEmployeeAccessReadiness,

  getEmployeeAccess,

  prepareEmployeeAccess,

  createEmployeeRmsAccount,

  updateEmployeeOfficialEmail,

  disableEmployeeRmsAccess,
};

export default employeeAccessService;
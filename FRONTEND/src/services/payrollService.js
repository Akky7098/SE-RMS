import api from "./api";

/* =========================================================
   PAYROLL SERVICE

   IMPORTANT:
   Uses the shared SE-RMS api.js instance.

   api.js already handles:
   - /api/v1 base URL
   - Authorization Bearer token
   - se_rms_access_token
   - withCredentials
   - refresh token
   - automatic 401 retry

   DO NOT create another axios instance here.
========================================================= */

/* =========================================================
   RESPONSE HELPERS
========================================================= */

const responseData = (response) => {
  return (
    response?.data?.data ||
    response?.data ||
    null
  );
};

const apiError = (error) => {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Payroll request failed";

  const err = new Error(message);

  err.status =
    error?.response?.status;

  err.data =
    error?.response?.data;

  return err;
};

/* =========================================================
   QUERY CLEANER
========================================================= */

const cleanParams = (params = {}) => {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== ""
    )
  );
};

/* =========================================================
   GENERIC REQUEST
========================================================= */

const request = async (
  method,
  url,
  options = {}
) => {
  try {
    const response = await api({
      method,
      url,

      params:
        options.params,

      data:
        options.data,

      responseType:
        options.responseType ||
        "json",
    });

    return responseData(
      response
    );
  } catch (error) {
    throw apiError(error);
  }
};

/* =========================================================
   PAYROLL POLICIES
========================================================= */

export const getPayrollPolicies =
  async (params = {}) => {
    return request(
      "GET",
      "/payroll/policies",
      {
        params:
          cleanParams(params),
      }
    );
  };

export const createPayrollPolicy =
  async (payload) => {
    return request(
      "POST",
      "/payroll/policies",
      {
        data: payload,
      }
    );
  };

export const updatePayrollPolicy =
  async (
    policyId,
    payload
  ) => {
    return request(
      "PATCH",
      `/payroll/policies/${policyId}`,
      {
        data: payload,
      }
    );
  };

/* =========================================================
   EMPLOYEE SALARY STRUCTURE
========================================================= */

export const createSalaryStructure =
  async (
    employeeId,
    payload
  ) => {
    return request(
      "POST",
      `/payroll/employees/${employeeId}/salary-structures`,
      {
        data: payload,
      }
    );
  };

export const getEmployeeSalaryHistory =
  async (employeeId) => {
    return request(
      "GET",
      `/payroll/employees/${employeeId}/salary-structures`
    );
  };

export const activateSalaryStructure =
  async (
    salaryStructureId,
    payload = {}
  ) => {
    return request(
      "POST",
      `/payroll/salary-structures/${salaryStructureId}/activate`,
      {
        data: payload,
      }
    );
  };

/* =========================================================
   SALARY STRUCTURE PDF
========================================================= */

export const getSalaryStructurePdf =
  async ({
    employeeId,
    payrollMonth,
    atDate,
  }) => {
    try {
      const response =
        await api.get(
          `/payroll/employees/${employeeId}/salary-structure/pdf`,
          {
            params:
              cleanParams({
                payrollMonth,
                atDate,
              }),

            responseType:
              "blob",
          }
        );

      return response;
    } catch (error) {
      throw apiError(error);
    }
  };

export const downloadSalaryStructurePdf =
  async ({
    employeeId,
    payrollMonth,
    atDate,
    fileName,
  }) => {
    try {
      const response =
        await getSalaryStructurePdf({
          employeeId,
          payrollMonth,
          atDate,
        });

      const contentType =
        response?.headers?.[
          "content-type"
        ] ||
        "application/pdf";

      const blob =
        response?.data instanceof Blob
          ? response.data
          : new Blob(
              [response?.data],
              {
                type:
                  contentType,
              }
            );

      const url =
        window.URL
          .createObjectURL(
            blob
          );

      const anchor =
        document.createElement(
          "a"
        );

      anchor.href =
        url;

      anchor.download =
        fileName ||
        "Salary_Structure.pdf";

      anchor.style.display =
        "none";

      document.body
        .appendChild(
          anchor
        );

      anchor.click();

      anchor.remove();

      window.setTimeout(
        () => {
          window.URL
            .revokeObjectURL(
              url
            );
        },
        1000
      );

      return {
        success: true,
      };
    } catch (error) {
      throw apiError(error);
    }
  };

export const openSalaryStructurePdf =
  async ({
    employeeId,
    payrollMonth,
    atDate,
  }) => {
    try {
      const response =
        await getSalaryStructurePdf({
          employeeId,
          payrollMonth,
          atDate,
        });

      const blob =
        response?.data instanceof Blob
          ? response.data
          : new Blob(
              [response?.data],
              {
                type:
                  "application/pdf",
              }
            );

      const url =
        window.URL
          .createObjectURL(
            blob
          );

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );

      window.setTimeout(
        () => {
          window.URL
            .revokeObjectURL(
              url
            );
        },
        60000
      );

      return {
        success: true,
      };
    } catch (error) {
      throw apiError(error);
    }
  };

/* =========================================================
   PAYROLL ADJUSTMENTS
========================================================= */

export const createPayrollAdjustment =
  async (payload) => {
    return request(
      "POST",
      "/payroll/adjustments",
      {
        data: payload,
      }
    );
  };

export const approvePayrollAdjustment =
  async (
    adjustmentId,
    payload = {}
  ) => {
    return request(
      "POST",
      `/payroll/adjustments/${adjustmentId}/approve`,
      {
        data: payload,
      }
    );
  };

/* =========================================================
   PAYROLL RUNS
========================================================= */

export const getPayrollRuns =
  async (params = {}) => {
    return request(
      "GET",
      "/payroll/runs",
      {
        params:
          cleanParams(params),
      }
    );
  };

export const getPayrollRun =
  async (runId) => {
    return request(
      "GET",
      `/payroll/runs/${runId}`
    );
  };

export const createPayrollRun =
  async (payload) => {
    return request(
      "POST",
      "/payroll/runs",
      {
        data: payload,
      }
    );
  };

/* =========================================================
   GENERATE PAYROLL
========================================================= */

export const generatePayrollRun =
  async (
    runId,
    payload = {}
  ) => {
    return request(
      "POST",
      `/payroll/runs/${runId}/generate`,
      {
        data: payload,
      }
    );
  };

/* =========================================================
   SUBMIT PAYROLL FOR REVIEW
========================================================= */

export const submitPayrollRun =
  async (
    runId,
    payload = {}
  ) => {
    return request(
      "POST",
      `/payroll/runs/${runId}/submit`,
      {
        data: payload,
      }
    );
  };

/* =========================================================
   APPROVE PAYROLL
========================================================= */

export const approvePayrollRun =
  async (
    runId,
    payload = {}
  ) => {
    return request(
      "POST",
      `/payroll/runs/${runId}/approve`,
      {
        data: payload,
      }
    );
  };

/* =========================================================
   FINALIZE / LOCK PAYROLL
========================================================= */

export const finalizePayrollRun =
  async (
    runId,
    payload = {}
  ) => {
    return request(
      "POST",
      `/payroll/runs/${runId}/finalize`,
      {
        data: payload,
      }
    );
  };

/* =========================================================
   PAYROLL REGISTER
========================================================= */

export const getPayrollRegister =
  async (
    runId,
    params = {}
  ) => {
    return request(
      "GET",
      `/payroll/runs/${runId}/register`,
      {
        params:
          cleanParams(params),
      }
    );
  };

/* =========================================================
   EMPLOYEE PAYROLL
========================================================= */

export const getEmployeePayroll =
  async (
    employeePayrollId
  ) => {
    return request(
      "GET",
      `/payroll/employee-payroll/${employeePayrollId}`
    );
  };

/* =========================================================
   REVIEW EMPLOYEE PAYROLL
========================================================= */

export const reviewEmployeePayroll =
  async (
    employeePayrollId,
    payload
  ) => {
    return request(
      "PATCH",
      `/payroll/employee-payroll/${employeePayrollId}/review`,
      {
        data: payload,
      }
    );
  };

/* =========================================================
   EMPLOYEE SELF PAYROLL
========================================================= */

export const getMyPayroll =
  async (params = {}) => {
    return request(
      "GET",
      "/payroll/me",
      {
        params:
          cleanParams(params),
      }
    );
  };

/* =========================================================
   GENERIC PAYROLL PDF DOWNLOAD
========================================================= */

export const downloadPayrollBlob =
  async (
    endpoint,
    fileName =
      "Payroll.pdf"
  ) => {
    try {
      /*
       * endpoint may be passed as:
       *
       * /runs/xxx/pdf
       *
       * OR
       *
       * /payroll/runs/xxx/pdf
       *
       * Normalize it so shared api.js always receives
       * an /api/v1 relative path.
       */

      let normalizedEndpoint =
        String(
          endpoint || ""
        ).trim();

      if (
        !normalizedEndpoint
          .startsWith("/")
      ) {
        normalizedEndpoint =
          `/${normalizedEndpoint}`;
      }

      if (
        !normalizedEndpoint
          .startsWith(
            "/payroll/"
          )
      ) {
        normalizedEndpoint =
          `/payroll${normalizedEndpoint}`;
      }

      const response =
        await api.get(
          normalizedEndpoint,
          {
            responseType:
              "blob",
          }
        );

      const contentType =
        response?.headers?.[
          "content-type"
        ] ||
        "application/pdf";

      const blob =
        response?.data instanceof Blob
          ? response.data
          : new Blob(
              [response?.data],
              {
                type:
                  contentType,
              }
            );

      const url =
        window.URL
          .createObjectURL(
            blob
          );

      const anchor =
        document.createElement(
          "a"
        );

      anchor.href =
        url;

      anchor.download =
        fileName;

      anchor.style.display =
        "none";

      document.body
        .appendChild(
          anchor
        );

      anchor.click();

      anchor.remove();

      window.setTimeout(
        () => {
          window.URL
            .revokeObjectURL(
              url
            );
        },
        1000
      );

      return {
        success: true,
        filename:
          fileName,
      };
    } catch (error) {
      throw apiError(error);
    }
  };

/* =========================================================
   DEFAULT EXPORT
========================================================= */

const payrollService = {
  /* Policies */
  getPayrollPolicies,
  createPayrollPolicy,
  updatePayrollPolicy,

  /* Salary Structure */
  createSalaryStructure,
  getEmployeeSalaryHistory,
  activateSalaryStructure,
  getSalaryStructurePdf,
  downloadSalaryStructurePdf,
  openSalaryStructurePdf,

  /* Adjustments */
  createPayrollAdjustment,
  approvePayrollAdjustment,

  /* Payroll Runs */
  getPayrollRuns,
  getPayrollRun,
  createPayrollRun,
  generatePayrollRun,
  submitPayrollRun,
  approvePayrollRun,
  finalizePayrollRun,

  /* Register */
  getPayrollRegister,

  /* Employee Payroll */
  getEmployeePayroll,
  reviewEmployeePayroll,

  /* Employee Self Service */
  getMyPayroll,

  /* PDF */
  downloadPayrollBlob,
};

export default payrollService;
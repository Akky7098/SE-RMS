import api from "./api";

/* =========================================================
   LEAVE API ROOT
========================================================= */

const BASE_URL =
  "/leaves";

/* =========================================================
   RESPONSE NORMALIZER
========================================================= */

const unwrap = (
  response
) => {
  return (
    response?.data?.data ??
    response?.data ??
    null
  );
};

/* =========================================================
   QUERY HELPERS
========================================================= */

const cleanParams = (
  params = {}
) => {
  const result = {};

  Object.entries(
    params
  ).forEach(
    ([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return;
      }

      result[key] =
        value;
    }
  );

  return result;
};

/* =========================================================
   ERROR MESSAGE
========================================================= */

export const getLeaveErrorMessage = (
  error,
  fallback =
    "Something went wrong."
) => {
  return (
    error?.response?.data
      ?.message ||
    error?.message ||
    fallback
  );
};

/* =========================================================
   LEAVE TYPES
========================================================= */

export const getLeaveTypes =
  async () => {
    const response =
      await api.get(
        `${BASE_URL}/types`
      );

    return (
      unwrap(response) ||
      []
    );
  };

/* =========================================================
   MY LEAVE BALANCES
========================================================= */

export const getMyLeaveBalances =
  async (
    year
  ) => {
    const response =
      await api.get(
        `${BASE_URL}/me/balances`,
        {
          params:
            cleanParams({
              year,
            }),
        }
      );

    return unwrap(
      response
    );
  };

/* =========================================================
   MY LEAVE REQUESTS
========================================================= */

export const getMyLeaveRequests =
  async ({
    year,
    status,
  } = {}) => {
    const response =
      await api.get(
        `${BASE_URL}/me/requests`,
        {
          params:
            cleanParams({
              year,
              status,
            }),
        }
      );

    return (
      unwrap(response) ||
      []
    );
  };

/* =========================================================
   APPLY LEAVE
========================================================= */

export const applyLeave =
  async (
    payload
  ) => {
    const response =
      await api.post(
        BASE_URL,
        payload
      );

    return unwrap(
      response
    );
  };

/* =========================================================
   SCOPED LEAVE REGISTER

   Backend determines actual visibility.

   Employee:
   SELF

   Manager:
   TEAM

   Head:
   DEPARTMENT

   HR / SUPER_ADMIN:
   ALL
========================================================= */

export const getLeaveRegister =
  async ({
    from,
    to,
    status,
    leaveTypeId,
    orgUnitCode,
  } = {}) => {
    const response =
      await api.get(
        `${BASE_URL}/scope`,
        {
          params:
            cleanParams({
              from,
              to,
              status,
              leaveTypeId,
              orgUnitCode,
            }),
        }
      );

    return (
      unwrap(response) ||
      []
    );
  };

/* =========================================================
   PENDING APPROVALS

   Backend only returns requests assigned to the
   logged-in employee as current approver.
========================================================= */

export const getPendingLeaveApprovals =
  async () => {
    const response =
      await api.get(
        `${BASE_URL}/approvals/pending`
      );

    return (
      unwrap(response) ||
      []
    );
  };

/* =========================================================
   SINGLE LEAVE REQUEST
========================================================= */

export const getLeaveRequest =
  async (
    requestId
  ) => {
    if (!requestId) {
      throw new Error(
        "Leave request ID is required."
      );
    }

    const response =
      await api.get(
        `${BASE_URL}/${requestId}`
      );

    return unwrap(
      response
    );
  };

/* =========================================================
   APPROVE LEAVE
========================================================= */

export const approveLeave =
  async (
    requestId,
    comment = ""
  ) => {
    if (!requestId) {
      throw new Error(
        "Leave request ID is required."
      );
    }

    const response =
      await api.post(
        `${BASE_URL}/${requestId}/approve`,
        {
          comment:
            String(
              comment || ""
            ).trim(),
        }
      );

    return unwrap(
      response
    );
  };

/* =========================================================
   REJECT LEAVE

   Backend requires rejection comment.
========================================================= */

export const rejectLeave =
  async (
    requestId,
    comment
  ) => {
    if (!requestId) {
      throw new Error(
        "Leave request ID is required."
      );
    }

    const reason =
      String(
        comment || ""
      ).trim();

    if (!reason) {
      throw new Error(
        "Rejection reason is required."
      );
    }

    const response =
      await api.post(
        `${BASE_URL}/${requestId}/reject`,
        {
          comment:
            reason,
        }
      );

    return unwrap(
      response
    );
  };

/* =========================================================
   CANCEL LEAVE

   Pending request:
   → backend cancels directly

   Approved request:
   → backend creates cancellation request
========================================================= */

export const cancelLeave =
  async (
    requestId,
    reason
  ) => {
    if (!requestId) {
      throw new Error(
        "Leave request ID is required."
      );
    }

    const cancellationReason =
      String(
        reason || ""
      ).trim();

    if (
      !cancellationReason
    ) {
      throw new Error(
        "Cancellation reason is required."
      );
    }

    const response =
      await api.post(
        `${BASE_URL}/${requestId}/cancel`,
        {
          reason:
            cancellationReason,
        }
      );

    return unwrap(
      response
    );
  };

/* =========================================================
   HR / SUPER ADMIN
   LEAVE BALANCE ADJUSTMENT
========================================================= */

export const adjustLeaveBalance =
  async ({
    employeeId,
    leaveTypeId,
    year,
    quantity,
    reason,
    effectiveDate,
    reference,
  }) => {
    if (!employeeId) {
      throw new Error(
        "Employee is required."
      );
    }

    if (!leaveTypeId) {
      throw new Error(
        "Leave type is required."
      );
    }

    const numericQuantity =
      Number(quantity);

    if (
      !Number.isFinite(
        numericQuantity
      ) ||
      numericQuantity === 0
    ) {
      throw new Error(
        "Adjustment must be a non-zero number."
      );
    }

    const adjustmentReason =
      String(
        reason || ""
      ).trim();

    if (
      !adjustmentReason
    ) {
      throw new Error(
        "Adjustment reason is required."
      );
    }

    const response =
      await api.post(
        `${BASE_URL}/admin/balance-adjustment`,
        {
          employeeId,

          leaveTypeId,

          year:
            Number(year),

          quantity:
            numericQuantity,

          reason:
            adjustmentReason,

          ...(effectiveDate
            ? {
                effectiveDate,
              }
            : {}),

          ...(reference
            ? {
                reference:
                  String(
                    reference
                  ).trim(),
              }
            : {}),
        }
      );

    return unwrap(
      response
    );
  };

/* =========================================================
   DASHBOARD DATA LOADER

   Loads employee-facing data together.

   This prevents LeavePage from containing repetitive
   Promise.all/API handling code.
========================================================= */

export const getMyLeaveDashboard =
  async (
    year = new Date()
      .getFullYear()
  ) => {
    const [
      types,
      balanceResult,
      requests,
    ] =
      await Promise.all([
        getLeaveTypes(),

        getMyLeaveBalances(
          year
        ),

        getMyLeaveRequests({
          year,
        }),
      ]);

    return {
      types,

      employee:
        balanceResult
          ?.employee ||
        null,

      year:
        balanceResult
          ?.year ||
        year,

      balances:
        balanceResult
          ?.balances ||
        [],

      requests:
        requests ||
        [],
    };
  };

/* =========================================================
   MANAGER DASHBOARD LOADER
========================================================= */

export const getLeaveApprovalDashboard =
  async ({
    from,
    to,
    status,
    leaveTypeId,
    orgUnitCode,
  } = {}) => {
    const [
      pending,
      register,
    ] =
      await Promise.all([
        getPendingLeaveApprovals(),

        getLeaveRegister({
          from,
          to,
          status,
          leaveTypeId,
          orgUnitCode,
        }),
      ]);

    return {
      pending:
        pending || [],

      register:
        register || [],
    };
  };

/* =========================================================
   REFRESH HELPERS

   Useful after:
   apply
   cancel
   approve
   reject
========================================================= */

export const refreshMyLeaveData =
  async (
    year
  ) => {
    const [
      balances,
      requests,
    ] =
      await Promise.all([
        getMyLeaveBalances(
          year
        ),

        getMyLeaveRequests({
          year,
        }),
      ]);

    return {
      employee:
        balances
          ?.employee ||
        null,

      year:
        balances
          ?.year ||
        year,

      balances:
        balances
          ?.balances ||
        [],

      requests:
        requests ||
        [],
    };
  };

export const refreshLeaveApprovalData =
  async (
    filters = {}
  ) => {
    return getLeaveApprovalDashboard(
      filters
    );
  };

/* =========================================================
   DEFAULT EXPORT
========================================================= */

const leaveService = {
  getLeaveTypes,

  getMyLeaveBalances,

  getMyLeaveRequests,

  getMyLeaveDashboard,

  applyLeave,

  cancelLeave,

  getLeaveRegister,

  getPendingLeaveApprovals,

  getLeaveApprovalDashboard,

  getLeaveRequest,

  approveLeave,

  rejectLeave,

  adjustLeaveBalance,

  refreshMyLeaveData,

  refreshLeaveApprovalData,

  getLeaveErrorMessage,
};

export default leaveService;
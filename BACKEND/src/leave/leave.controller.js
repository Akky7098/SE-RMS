const leaveService =
  require("./leave.service");

/* =========================================================
   RESPONSE HELPERS
========================================================= */

const sendSuccess = (
  res,
  {
    statusCode = 200,
    message = "",
    data = null,
  } = {}
) => {
  return res
    .status(statusCode)
    .json({
      success: true,

      ...(message
        ? {
            message,
          }
        : {}),

      data,
    });
};

const handleError = (
  error,
  res,
  next
) => {
  if (
    error?.statusCode
  ) {
    return res
      .status(
        error.statusCode
      )
      .json({
        success: false,

        message:
          error.message ||
          "Leave request failed.",

        ...(error.code
          ? {
              code:
                error.code,
            }
          : {}),
      });
  }

  return next(error);
};

/* =========================================================
   REQUEST META
========================================================= */

const getRequestMeta = (
  req
) => ({
  ipAddress:
    req.ip ||
    req.headers[
      "x-forwarded-for"
    ] ||
    "",

  userAgent:
    req.get(
      "user-agent"
    ) || "",
});

/* =========================================================
   LEAVE TYPES
========================================================= */

const getLeaveTypes =
  async (
    req,
    res,
    next
  ) => {
    try {
      const types =
        await leaveService
          .getLeaveTypes();

      return sendSuccess(
        res,
        {
          data:
            types,
        }
      );
    } catch (error) {
      return handleError(
        error,
        res,
        next
      );
    }
  };

/* =========================================================
   MY BALANCES
========================================================= */

const getMyBalances =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await leaveService
          .getMyBalances({
            user:
              req.user,

            year:
              req.query
                .year,
          });

      return sendSuccess(
        res,
        {
          data:
            result,
        }
      );
    } catch (error) {
      return handleError(
        error,
        res,
        next
      );
    }
  };

/* =========================================================
   MY REQUESTS
========================================================= */

const getMyRequests =
  async (
    req,
    res,
    next
  ) => {
    try {
      const requests =
        await leaveService
          .getMyRequests({
            user:
              req.user,

            filters: {
              status:
                req.query
                  .status,

              year:
                req.query
                  .year,
            },
          });

      return sendSuccess(
        res,
        {
          data:
            requests,
        }
      );
    } catch (error) {
      return handleError(
        error,
        res,
        next
      );
    }
  };

/* =========================================================
   CREATE REQUEST
========================================================= */

const createLeaveRequest =
  async (
    req,
    res,
    next
  ) => {
    try {
      const request =
        await leaveService
          .createLeaveRequest({
            user:
              req.user,

            payload:
              req.body,

            requestMeta:
              getRequestMeta(
                req
              ),
          });

      return sendSuccess(
        res,
        {
          statusCode:
            201,

          message:
            "Leave request submitted successfully.",

          data:
            request,
        }
      );
    } catch (error) {
      return handleError(
        error,
        res,
        next
      );
    }
  };

/* =========================================================
   SCOPED REQUESTS
========================================================= */

const getScopedRequests =
  async (
    req,
    res,
    next
  ) => {
    try {
      const requests =
        await leaveService
          .getScopedRequests({
            user:
              req.user,

            filters: {
              status:
                req.query
                  .status,

              leaveTypeId:
                req.query
                  .leaveTypeId,

              orgUnitCode:
                req.query
                  .orgUnitCode,

              from:
                req.query
                  .from,

              to:
                req.query
                  .to,
            },
          });

      return sendSuccess(
        res,
        {
          data:
            requests,
        }
      );
    } catch (error) {
      return handleError(
        error,
        res,
        next
      );
    }
  };

/* =========================================================
   PENDING APPROVALS
========================================================= */

const getPendingApprovals =
  async (
    req,
    res,
    next
  ) => {
    try {
      const requests =
        await leaveService
          .getPendingApprovals({
            user:
              req.user,
          });

      return sendSuccess(
        res,
        {
          data:
            requests,
        }
      );
    } catch (error) {
      return handleError(
        error,
        res,
        next
      );
    }
  };

/* =========================================================
   GET REQUEST DETAILS
========================================================= */

const getRequestById =
  async (
    req,
    res,
    next
  ) => {
    try {
      const request =
        await leaveService
          .getRequestById({
            user:
              req.user,

            requestId:
              req.params.id,
          });

      return sendSuccess(
        res,
        {
          data:
            request,
        }
      );
    } catch (error) {
      return handleError(
        error,
        res,
        next
      );
    }
  };

/* =========================================================
   APPROVE
========================================================= */

const approveRequest =
  async (
    req,
    res,
    next
  ) => {
    try {
      const request =
        await leaveService
          .approveRequest({
            user:
              req.user,

            requestId:
              req.params.id,

            comment:
              req.body
                ?.comment,

            requestMeta:
              getRequestMeta(
                req
              ),
          });

      return sendSuccess(
        res,
        {
          message:
            "Leave request approved successfully.",

          data:
            request,
        }
      );
    } catch (error) {
      return handleError(
        error,
        res,
        next
      );
    }
  };

/* =========================================================
   REJECT
========================================================= */

const rejectRequest =
  async (
    req,
    res,
    next
  ) => {
    try {
      const request =
        await leaveService
          .rejectRequest({
            user:
              req.user,

            requestId:
              req.params.id,

            comment:
              req.body
                ?.comment,

            requestMeta:
              getRequestMeta(
                req
              ),
          });

      return sendSuccess(
        res,
        {
          message:
            "Leave request rejected.",

          data:
            request,
        }
      );
    } catch (error) {
      return handleError(
        error,
        res,
        next
      );
    }
  };

/* =========================================================
   CANCEL OWN REQUEST
========================================================= */

const cancelRequest =
  async (
    req,
    res,
    next
  ) => {
    try {
      const request =
        await leaveService
          .cancelOwnRequest({
            user:
              req.user,

            requestId:
              req.params.id,

            reason:
              req.body
                ?.reason,

            requestMeta:
              getRequestMeta(
                req
              ),
          });

      return sendSuccess(
        res,
        {
          message:
            request.status ===
            "CANCEL_REQUESTED"
              ? "Leave cancellation request submitted."
              : "Leave request cancelled successfully.",

          data:
            request,
        }
      );
    } catch (error) {
      return handleError(
        error,
        res,
        next
      );
    }
  };

/* =========================================================
   HR BALANCE ADJUSTMENT
========================================================= */

const adjustBalance =
  async (
    req,
    res,
    next
  ) => {
    try {
      const balance =
        await leaveService
          .adjustBalance({
            user:
              req.user,

            payload:
              req.body,
          });

      return sendSuccess(
        res,
        {
          message:
            "Leave balance adjusted successfully.",

          data:
            balance,
        }
      );
    } catch (error) {
      return handleError(
        error,
        res,
        next
      );
    }
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  getLeaveTypes,

  getMyBalances,

  getMyRequests,

  createLeaveRequest,

  getScopedRequests,

  getPendingApprovals,

  getRequestById,

  approveRequest,

  rejectRequest,

  cancelRequest,

  adjustBalance,
};
const leaveService =
  require("./leave.service");

const {
  sendManagerApprovalRequestSafely,

  notifyEmployeeApproved,

  notifyEmployeeRejected,
} =
  require(
    "./leave.whatsapp.service"
  );

/* =========================================================
   RESPONSE
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
    .status(
      statusCode
    )
    .json({
      success:
        true,

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
        success:
          false,

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

  return next(
    error
  );
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
    ) ||
    "",
});

/* =========================================================
   HTML
========================================================= */

const escapeHtml = (
  value
) =>
  String(
    value ??
      ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

const formatDate = (
  value
) => {
  const match =
    String(
      value ||
      ""
    ).match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    return value || "-";
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
};

const renderPage = ({
  title,
  subtitle,
  body,
  tone = "blue",
}) => {
  const toneColor =
    tone === "green"
      ? "#059669"
      : tone === "red"
        ? "#dc2626"
        : "#2563eb";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(
    title
  )}</title>

<style>
*{
  box-sizing:border-box;
}

body{
  margin:0;
  min-height:100vh;
  font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  background:#f3f6fb;
  color:#172033;
  padding:24px;
}

.shell{
  width:100%;
  max-width:620px;
  margin:30px auto;
}

.brand{
  font-size:12px;
  font-weight:900;
  letter-spacing:.16em;
  color:#64748b;
  margin:0 0 10px;
}

.card{
  background:#fff;
  border:1px solid #dbe4ee;
  border-radius:18px;
  overflow:hidden;
  box-shadow:0 20px 55px rgba(15,23,42,.09);
}

.head{
  padding:24px;
  background:linear-gradient(135deg,${toneColor},#172554);
  color:#fff;
}

.head h1{
  margin:0;
  font-size:24px;
  line-height:1.2;
}

.head p{
  margin:8px 0 0;
  color:rgba(255,255,255,.84);
  font-size:14px;
  line-height:1.55;
}

.body{
  padding:22px;
}

.details{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
  margin-bottom:20px;
}

.detail{
  padding:12px;
  border:1px solid #e2e8f0;
  border-radius:10px;
  background:#f8fafc;
}

.detail.full{
  grid-column:1/-1;
}

.detail span{
  display:block;
  color:#94a3b8;
  font-size:10px;
  font-weight:900;
  letter-spacing:.1em;
  margin-bottom:5px;
}

.detail strong{
  display:block;
  font-size:13px;
  line-height:1.45;
  color:#172033;
}

textarea{
  width:100%;
  min-height:100px;
  resize:vertical;
  border:1px solid #cbd5e1;
  border-radius:10px;
  padding:12px;
  font:inherit;
  margin:0 0 14px;
}

button{
  width:100%;
  min-height:48px;
  border:0;
  border-radius:10px;
  background:${toneColor};
  color:#fff;
  font-size:14px;
  font-weight:900;
  cursor:pointer;
}

.note{
  margin:15px 0 0;
  text-align:center;
  color:#64748b;
  font-size:12px;
}

.message{
  padding:16px;
  border-radius:10px;
  background:#f8fafc;
  border:1px solid #e2e8f0;
  font-size:14px;
  line-height:1.6;
}

@media(max-width:560px){
  body{
    padding:12px;
  }

  .shell{
    margin:12px auto;
  }

  .head,
  .body{
    padding:18px;
  }

  .details{
    grid-template-columns:1fr;
  }

  .detail.full{
    grid-column:auto;
  }
}
</style>
</head>

<body>
  <main class="shell">
    <div class="brand">
      SE-RMS • LEAVE APPROVAL
    </div>

    <section class="card">
      <header class="head">
        <h1>${escapeHtml(
          title
        )}</h1>

        <p>${escapeHtml(
          subtitle
        )}</p>
      </header>

      <div class="body">
        ${body}
      </div>
    </section>
  </main>
</body>
</html>`;
};

/* =========================================================
   TYPES
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
   BALANCES
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
   CREATE

   WEB:
   DB create first
   THEN manager WhatsApp

   WhatsApp failure never rolls back leave.
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

            payload: {
              ...req.body,

              source:
                req.body
                  ?.source ||
                "WEB",
            },

            requestMeta:
              getRequestMeta(
                req
              ),
          });

      /*
       * Manager only gets message AFTER successful creation.
       */

      await sendManagerApprovalRequestSafely(
        request._id
      );

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
   SCOPED
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
   PENDING
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
   DETAILS
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
   APPROVE FROM SE-RMS
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

      await notifyEmployeeApproved(
        request,
        req.user
          ?.displayName ||
          ""
      );

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
   REJECT FROM SE-RMS
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

      await notifyEmployeeRejected(
        request,
        req.body
          ?.comment ||
          "",
        req.user
          ?.displayName ||
          ""
      );

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
   CANCEL
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
   BALANCE ADJUSTMENT
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
   PUBLIC APPROVAL PAGE

   GET = DISPLAY ONLY
========================================================= */

const getPublicApprovalPage =
  async (
    req,
    res
  ) => {
    try {
      const token =
        String(
          req.params
            .token ||
          ""
        ).trim();

      const action =
        String(
          req.query
            .action ||
          ""
        )
          .trim()
          .toLowerCase();

      if (
        ![
          "approve",
          "reject",
        ].includes(
          action
        )
      ) {
        return res
          .status(400)
          .send(
            renderPage({
              title:
                "Invalid action",

              subtitle:
                "This approval link is incomplete.",

              tone:
                "red",

              body:
                `<div class="message">Please open the original approval link sent by SE-RMS.</div>`,
            })
          );
      }

      const request =
        await leaveService
          .getLeaveByApprovalToken(
            token
          );

      if (!request) {
        return res
          .status(404)
          .send(
            renderPage({
              title:
                "Invalid link",

              subtitle:
                "This leave approval link could not be found.",

              tone:
                "red",

              body:
                `<div class="message">The link may be incorrect or no longer available.</div>`,
            })
          );
      }

      const approval =
        request
          .whatsappApproval ||
        {};

      if (
        approval.usedAt
      ) {
        return res
          .status(409)
          .send(
            renderPage({
              title:
                "Already processed",

              subtitle:
                "This approval link has already been used.",

              tone:
                "blue",

              body:
                `<div class="message">Current status: <strong>${escapeHtml(
                  request.status
                )}</strong></div>`,
            })
          );
      }

      if (
        !approval.expiresAt ||
        new Date(
          approval.expiresAt
        ).getTime() <=
          Date.now()
      ) {
        return res
          .status(410)
          .send(
            renderPage({
              title:
                "Link expired",

              subtitle:
                "This leave approval link has expired.",

              tone:
                "red",

              body:
                `<div class="message">Please review the request inside SE-RMS.</div>`,
            })
          );
      }

      if (
        request.status !==
        "PENDING_APPROVAL"
      ) {
        return res
          .status(409)
          .send(
            renderPage({
              title:
                "Request processed",

              subtitle:
                "This leave request is no longer pending.",

              tone:
                "blue",

              body:
                `<div class="message">Current status: <strong>${escapeHtml(
                  request.status
                )}</strong></div>`,
            })
          );
      }

      const employee =
        request.employeeId ||
        {};

      const leaveType =
        request.leaveTypeId ||
        {};

      const isReject =
        action ===
        "reject";

      const details = `
<div class="details">
  <div class="detail full">
    <span>REQUEST</span>
    <strong>${escapeHtml(
      request.requestNumber
    )}</strong>
  </div>

  <div class="detail">
    <span>EMPLOYEE</span>
    <strong>${escapeHtml(
      employee.fullName ||
      "-"
    )}</strong>
  </div>

  <div class="detail">
    <span>EMPLOYEE CODE</span>
    <strong>${escapeHtml(
      employee.employeeCode ||
      "-"
    )}</strong>
  </div>

  <div class="detail">
    <span>LEAVE TYPE</span>
    <strong>${escapeHtml(
      leaveType.name ||
      leaveType.code ||
      "-"
    )}</strong>
  </div>

  <div class="detail">
    <span>TOTAL</span>
    <strong>${escapeHtml(
      request.totalDays
    )} Day(s)</strong>
  </div>

  <div class="detail">
    <span>FROM</span>
    <strong>${escapeHtml(
      formatDate(
        request.fromDate
      )
    )}</strong>
  </div>

  <div class="detail">
    <span>TO</span>
    <strong>${escapeHtml(
      formatDate(
        request.toDate
      )
    )}</strong>
  </div>

  <div class="detail full">
    <span>REASON</span>
    <strong>${escapeHtml(
      request.reason ||
      "-"
    )}</strong>
  </div>
</div>`;

      const form = `
<form
  method="POST"
  action="${escapeHtml(
    req.baseUrl
  )}/public/approval/${encodeURIComponent(
    token
  )}?action=${encodeURIComponent(
    action
  )}"
>
  ${
    isReject
      ? `
<textarea
  name="comment"
  maxlength="2000"
  required
  placeholder="Enter rejection reason"
></textarea>`
      : `
<textarea
  name="comment"
  maxlength="2000"
  placeholder="Comment (optional)"
></textarea>`
  }

  <button type="submit">
    ${
      isReject
        ? "Reject Leave Request"
        : "Approve Leave Request"
    }
  </button>
</form>

<p class="note">
  This action can be completed only once.
</p>`;

      return res
        .status(200)
        .send(
          renderPage({
            title:
              isReject
                ? "Reject leave?"
                : "Approve leave?",

            subtitle:
              isReject
                ? "Review the request and enter a rejection reason."
                : "Review the request before confirming approval.",

            tone:
              isReject
                ? "red"
                : "green",

            body:
              `${details}${form}`,
          })
        );
    } catch (error) {
      return res
        .status(
          error
            ?.statusCode ||
          500
        )
        .send(
          renderPage({
            title:
              "Unable to continue",

            subtitle:
              "SE-RMS could not validate this approval link.",

            tone:
              "red",

            body:
              `<div class="message">${escapeHtml(
                error
                  ?.message ||
                "Please try again later."
              )}</div>`,
          })
        );
    }
  };

/* =========================================================
   PUBLIC APPROVAL POST
========================================================= */

const processPublicApproval =
  async (
    req,
    res
  ) => {
    try {
      const token =
        String(
          req.params
            .token ||
          ""
        ).trim();

      const action =
        String(
          req.query
            .action ||
          ""
        )
          .trim()
          .toLowerCase();

      const comment =
        String(
          req.body
            ?.comment ||
          ""
        ).trim();

      const result =
        await leaveService
          .processPublicLeaveApproval({
            token,

            action,

            comment,
          });

      const approverName =
        result
          ?.approver
          ?.displayName ||
        "";

      if (
        result.action ===
        "APPROVED"
      ) {
        await notifyEmployeeApproved(
          result.request,
          approverName
        );
      } else {
        await notifyEmployeeRejected(
          result.request,
          comment,
          approverName
        );
      }

      const approved =
        result.action ===
        "APPROVED";

      return res
        .status(200)
        .send(
          renderPage({
            title:
              approved
                ? "Leave approved"
                : "Leave rejected",

            subtitle:
              approved
                ? "The leave request has been approved successfully."
                : "The leave request has been rejected successfully.",

            tone:
              approved
                ? "green"
                : "red",

            body:
              `<div class="message">
                <strong>${escapeHtml(
                  result
                    .request
                    ?.requestNumber ||
                  "Leave request"
                )}</strong>
                has been ${
                  approved
                    ? "approved"
                    : "rejected"
                }.
              </div>`,
          })
        );
    } catch (error) {
      return res
        .status(
          error
            ?.statusCode ||
          500
        )
        .send(
          renderPage({
            title:
              "Action not completed",

            subtitle:
              "SE-RMS could not process this leave request.",

            tone:
              "red",

            body:
              `<div class="message">${escapeHtml(
                error
                  ?.message ||
                "Please try again."
              )}</div>`,
          })
        );
    }
  };

/* =========================================================
   EXPORT
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

  getPublicApprovalPage,

  processPublicApproval,
};
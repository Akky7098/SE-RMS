const express =
  require(
    "express"
  );

const leaveController =
  require(
    "./leave.controller"
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
   AUTHENTICATION
========================================================= */

router.use(
  authenticate
);

/* =========================================================
   SECONDARY AUTH GUARD
========================================================= */

const requireAuthenticatedUser =
  (
    req,
    res,
    next
  ) => {
    if (
      !req.user
    ) {
      return res
        .status(
          401
        )
        .json({
          success:
            false,

          message:
            "Authentication required.",
        });
    }

    return next();
  };

router.use(
  requireAuthenticatedUser
);

/* =========================================================
   LEAVE MASTER DATA

   Available to authenticated employees.
   Service only returns active leave types.
========================================================= */

router.get(
  "/types",
  leaveController
    .getLeaveTypes
);

/* =========================================================
   EMPLOYEE SELF — BALANCES

   Employee can only retrieve their own balance.
   Employee identity is resolved from req.user on backend.
========================================================= */

router.get(
  "/me/balances",
  leaveController
    .getMyBalances
);

/* =========================================================
   EMPLOYEE SELF — LEAVE REQUESTS

   Employee can only retrieve their own requests.
========================================================= */

router.get(
  "/me/requests",
  leaveController
    .getMyRequests
);

/* =========================================================
   EMPLOYEE SELF — APPLY LEAVE

   IMPORTANT:
   employeeId and approver are NOT accepted as authority
   from the frontend.

   Service resolves:
   req.user
      ↓
   Employee
      ↓
   Employee.reportsTo
      ↓
   currentApproverEmployeeId
========================================================= */

router.post(
  "/",
  leaveController
    .createLeaveRequest
);

/* =========================================================
   APPROVAL INBOX

   Manager / authorized approver.

   Service verifies that the logged-in employee is the
   currentApproverEmployeeId.

   Department visibility alone does NOT grant approval.
========================================================= */

router.get(
  "/approvals/pending",
  leaveController
    .getPendingApprovals
);

/* =========================================================
   SCOPED LEAVE REGISTER

   Backend service controls visibility:

   Employee
   → SELF

   Manager
   → reporting subtree

   Head / HOD
   → authorized department

   HR
   → configured/global scope

   SUPER_ADMIN
   → ALL

   IMPORTANT:
   Frontend filters must never expand backend scope.
========================================================= */

router.get(
  "/scope",
  leaveController
    .getScopedRequests
);

/* =========================================================
   HR / SUPER ADMIN — BALANCE ADJUSTMENT

   Service performs the final authorization check.

   Do not expose this simply because the route exists.
========================================================= */

router.post(
  "/admin/balance-adjustment",
  leaveController
    .adjustBalance
);

/* =========================================================
   SINGLE LEAVE REQUEST

   IMPORTANT:
   Keep all /:id routes AFTER static routes such as:
   /types
   /me/*
   /approvals/*
   /scope
   /admin/*
========================================================= */

router.get(
  "/:id",
  leaveController
    .getRequestById
);

/* =========================================================
   APPROVE LEAVE

   Normal approval requires:
   logged-in Employee._id
   ===
   LeaveRequest.currentApproverEmployeeId

   SUPER_ADMIN administrative authority is handled
   inside the service.
========================================================= */

router.post(
  "/:id/approve",
  leaveController
    .approveRequest
);

/* =========================================================
   REJECT LEAVE

   Same authority rules as approval.
========================================================= */

router.post(
  "/:id/reject",
  leaveController
    .rejectRequest
);

/* =========================================================
   CANCEL OWN LEAVE

   Pending:
   → can be cancelled directly

   Approved:
   → becomes CANCEL_REQUESTED
   → manager approval flow
========================================================= */

router.post(
  "/:id/cancel",
  leaveController
    .cancelRequest
);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;
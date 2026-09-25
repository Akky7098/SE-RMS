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
   PUBLIC WHATSAPP APPROVAL

   IMPORTANT:

   GET:
   confirmation UI only
   NO database status mutation

   POST:
   actual approval / rejection
========================================================= */

router.get(
  "/public/approval/:token",
  leaveController
    .getPublicApprovalPage
);

router.post(
  "/public/approval/:token",
  express.urlencoded({
    extended:
      false,

    limit:
      "20kb",
  }),
  leaveController
    .processPublicApproval
);

/* =========================================================
   AUTHENTICATION

   Everything below this point requires login.
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
   LEAVE TYPES
========================================================= */

router.get(
  "/types",
  leaveController
    .getLeaveTypes
);

/* =========================================================
   MY BALANCES
========================================================= */

router.get(
  "/me/balances",
  leaveController
    .getMyBalances
);

/* =========================================================
   MY REQUESTS
========================================================= */

router.get(
  "/me/requests",
  leaveController
    .getMyRequests
);

/* =========================================================
   APPLY LEAVE

   Employee identity always comes from req.user.
========================================================= */

router.post(
  "/",
  leaveController
    .createLeaveRequest
);

/* =========================================================
   APPROVAL INBOX
========================================================= */

router.get(
  "/approvals/pending",
  leaveController
    .getPendingApprovals
);

/* =========================================================
   SCOPED REGISTER
========================================================= */

router.get(
  "/scope",
  leaveController
    .getScopedRequests
);

/* =========================================================
   BALANCE ADJUSTMENT
========================================================= */

router.post(
  "/admin/balance-adjustment",
  leaveController
    .adjustBalance
);

/* =========================================================
   SINGLE REQUEST

   Keep /:id routes after static routes.
========================================================= */

router.get(
  "/:id",
  leaveController
    .getRequestById
);

/* =========================================================
   APPROVE
========================================================= */

router.post(
  "/:id/approve",
  leaveController
    .approveRequest
);

/* =========================================================
   REJECT
========================================================= */

router.post(
  "/:id/reject",
  leaveController
    .rejectRequest
);

/* =========================================================
   CANCEL
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
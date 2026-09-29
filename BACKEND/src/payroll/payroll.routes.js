const express =
  require(
    "express"
  );

const {
  authenticate,
} =
  require(
    "../middleware/auth.middleware"
  );

const controller =
  require(
    "./payroll.controller"
  );

const router =
  express.Router();

/* =========================================================
   AUTHENTICATION

   All payroll routes require a valid logged-in user.

   IMPORTANT:
   Do not globally restrict Payroll by system role here.

   SE-RMS users may have job/designation/module access that
   is different from their base User.role.

   Payroll-specific permissions/scopes should be enforced
   at controller/service level as the module matures.
========================================================= */

router.use(
  authenticate
);

/* =========================================================
   SECONDARY AUTH GUARD

   Same pattern used by Attendance.
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
   EMPLOYEE SELF SERVICE

   Used inside Employee Profile.

   Keep this before management routes.
========================================================= */

router.get(
  "/me",
  controller
    .getMySalary
);

/* =========================================================
   PAYROLL POLICY
========================================================= */

router.get(
  "/policies",
  controller
    .getPolicies
);

router.post(
  "/policies",
  controller
    .createPolicy
);

router.patch(
  "/policies/:policyId",
  controller
    .updatePolicy
);

/* =========================================================
   SALARY STRUCTURE PDF
========================================================= */

router.get(
  "/employees/:employeeId/salary-structure/pdf",
  controller
    .downloadSalaryStructurePdf
);

/* =========================================================
   SALARY STRUCTURES
========================================================= */

router.post(
  "/employees/:employeeId/salary-structures",
  controller
    .createSalaryStructure
);

router.get(
  "/employees/:employeeId/salary-structures",
  controller
    .getSalaryHistory
);

router.post(
  "/salary-structures/:salaryStructureId/activate",
  controller
    .activateSalaryStructure
);

/* =========================================================
   PAYROLL ADJUSTMENTS
========================================================= */

router.post(
  "/adjustments",
  controller
    .createAdjustment
);

router.post(
  "/adjustments/:adjustmentId/approve",
  controller
    .approveAdjustment
);

/* =========================================================
   PAYROLL RUNS
========================================================= */

router.get(
  "/runs",
  controller
    .listRuns
);

router.post(
  "/runs",
  controller
    .createRun
);

router.get(
  "/runs/:payrollRunId",
  controller
    .getRun
);

router.post(
  "/runs/:payrollRunId/generate",
  controller
    .generateRun
);

router.post(
  "/runs/:payrollRunId/submit",
  controller
    .submitRun
);

router.post(
  "/runs/:payrollRunId/approve",
  controller
    .approveRun
);

router.post(
  "/runs/:payrollRunId/finalize",
  controller
    .finalizeRun
);

/* =========================================================
   PAYROLL REGISTER
========================================================= */

router.get(
  "/runs/:payrollRunId/register",
  controller
    .getRegister
);

/* =========================================================
   EMPLOYEE PAYROLL
========================================================= */

router.get(
  "/employee-payroll/:employeePayrollId",
  controller
    .getEmployeePayroll
);

router.patch(
  "/employee-payroll/:employeePayrollId/review",
  controller
    .reviewEmployeePayroll
);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;
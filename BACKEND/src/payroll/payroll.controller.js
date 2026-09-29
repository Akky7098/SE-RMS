const asyncHandler =
  require("../utils/asyncHandler");

const ApiError =
  require("../utils/ApiError");

const payrollService =
  require("./payroll.service");

  const {
  generateSalaryStructurePdf,
} =
  require("./payroll-pdf.service");

const ok =
  (
    res,
    data,
    message =
      "Success",
    status =
      200
  ) =>
    res
      .status(status)
      .json({
        success:
          true,
        message,
        data,
      });

const actorId =
  (req) =>
    req.user?._id;

/* =========================================================
   POLICY
========================================================= */

const createPolicy =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await payrollService
          .createPayrollPolicy({
            payload:
              req.body,

            actorUserId:
              actorId(req),
          });

      return ok(
        res,
        data,
        "Payroll policy created.",
        201
      );
    }
  );

const updatePolicy =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await payrollService
          .updatePayrollPolicy({
            policyId:
              req.params.policyId,

            payload:
              req.body,

            actorUserId:
              actorId(req),
          });

      return ok(
        res,
        data,
        "Payroll policy updated."
      );
    }
  );

const getPolicies =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await payrollService
          .getPayrollPolicies(
            req.query
          );

      return ok(
        res,
        data
      );
    }
  );

/* =========================================================
   SALARY
========================================================= */

const createSalaryStructure =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await payrollService
          .createSalaryStructure({
            employeeId:
              req.params.employeeId,

            payload:
              req.body,

            actorUserId:
              actorId(req),
          });

      return ok(
        res,
        data,
        "Salary structure created.",
        201
      );
    }
  );

const activateSalaryStructure =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await payrollService
          .activateSalaryStructure({
            salaryStructureId:
              req.params.salaryStructureId,

            actorUserId:
              actorId(req),
          });

      return ok(
        res,
        data,
        "Salary structure activated and locked."
      );
    }
  );

const getSalaryHistory =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await payrollService
          .getSalaryHistory(
            req.params.employeeId
          );

      return ok(
        res,
        data
      );
    }
  );

/* =========================================================
   ADJUSTMENTS
========================================================= */

const createAdjustment =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await payrollService
          .createAdjustment({
            payload:
              req.body,

            actorUserId:
              actorId(req),
          });

      return ok(
        res,
        data,
        "Payroll adjustment created.",
        201
      );
    }
  );

const approveAdjustment =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await payrollService
          .approveAdjustment({
            adjustmentId:
              req.params.adjustmentId,

            actorUserId:
              actorId(req),
          });

      return ok(
        res,
        data,
        "Payroll adjustment approved."
      );
    }
  );

/* =========================================================
   PAYROLL RUN
========================================================= */

const createRun =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await payrollService
          .createPayrollRun({
            ...req.body,

            actorUserId:
              actorId(req),
          });

      return ok(
        res,
        data,
        "Payroll run created.",
        201
      );
    }
  );

const generateRun =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await payrollService
          .generatePayroll({
            payrollRunId:
              req.params.payrollRunId,

            actorUserId:
              actorId(req),
          });

      return ok(
        res,
        data,
        "Payroll generated."
      );
    }
  );

const submitRun =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await payrollService
          .submitPayrollForReview({
            payrollRunId:
              req.params.payrollRunId,

            actorUserId:
              actorId(req),
          });

      return ok(
        res,
        data,
        "Payroll submitted for review."
      );
    }
  );

const approveRun =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await payrollService
          .approvePayroll({
            payrollRunId:
              req.params.payrollRunId,

            actorUserId:
              actorId(req),
          });

      return ok(
        res,
        data,
        "Payroll approved."
      );
    }
  );

const finalizeRun =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await payrollService
          .finalizePayroll({
            payrollRunId:
              req.params.payrollRunId,

            actorUserId:
              actorId(req),

            lockReason:
              req.body
                ?.lockReason ||
              "",
          });

      return ok(
        res,
        data,
        "Payroll finalized and locked."
      );
    }
  );

const listRuns =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await payrollService
          .listPayrollRuns(
            req.query
          );

      return ok(
        res,
        data
      );
    }
  );

const getRun =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await payrollService
          .getPayrollRun(
            req.params.payrollRunId
          );

      return ok(
        res,
        data
      );
    }
  );

const getRegister =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await payrollService
          .getPayrollRegister({
            payrollRunId:
              req.params.payrollRunId,

            ...req.query,
          });

      return ok(
        res,
        data
      );
    }
  );

const getEmployeePayroll =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await payrollService
          .getEmployeePayroll(
            req.params.employeePayrollId
          );

      return ok(
        res,
        data
      );
    }
  );

const reviewEmployeePayroll =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await payrollService
          .updateEmployeePayrollReview({
            employeePayrollId:
              req.params.employeePayrollId,

            approvedOvertimeMinutes:
              req.body
                ?.approvedOvertimeMinutes,

            actorUserId:
              actorId(req),
          });

      return ok(
        res,
        data,
        "Employee payroll reviewed."
      );
    }
  );

/* =========================================================
   SELF / PROFILE PAYROLL
========================================================= */

const getMySalary =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const employee =
        await payrollService
          .getEmployeeByUser(
            req.user._id
          );

      if (
        !employee
      ) {
        throw new ApiError(
          404,
          "Employee profile not found"
        );
      }

      const [
        currentSalary,
        history,
        payslips,
      ] =
        await Promise.all([
          payrollService
            .getCurrentSalary(
              employee._id
            ),

          payrollService
            .getSalaryHistory(
              employee._id
            ),

          payrollService
            .getEmployeePayslips(
              employee._id
            ),
        ]);

      return ok(
        res,
        {
          employee: {
            _id:
              employee._id,

            employeeCode:
              employee.employeeCode,

            fullName:
              employee.fullName,

            designation:
              employee.designation,

            companyCode:
              employee.companyCode,

            workLocation:
              employee.workLocation,
          },

          currentSalary,
          salaryHistory:
            history,

          payslips,
        }
      );
    }
  );



  const downloadSalaryStructurePdf =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const {
        employeeId,
      } =
        req.params;

      const employee =
        await Employee
          .findById(
            employeeId
          )
          .populate(
            "department",
            "name code"
          )
          .lean();

      if (
        !employee
      ) {
        throw new ApiError(
          404,
          "Employee not found"
        );
      }

      const atDate =
        req.query.atDate
          ? new Date(
              req.query.atDate
            )
          : new Date();

      const salaryStructure =
        await EmployeeSalaryStructure
          .findOne({
            employeeId:
              employee._id,

            status: {
              $in: [
                "ACTIVE",
                "LOCKED",
                "SUPERSEDED",
              ],
            },

            effectiveFrom: {
              $lte:
                atDate,
            },

            $or: [
              {
                effectiveTo:
                  null,
              },

              {
                effectiveTo: {
                  $gte:
                    atDate,
                },
              },
            ],
          })
          .sort({
            effectiveFrom:
              -1,
          })
          .lean();

      if (
        !salaryStructure
      ) {
        throw new ApiError(
          404,
          "Salary structure not found for employee"
        );
      }

      const pdf =
        await generateSalaryStructurePdf({
          employee: {
            ...employee,

            departmentName:
              employee
                ?.department
                ?.name ||
              employee
                ?.orgUnitCode ||
              "",
          },

          salaryStructure,

          payrollMonth:
            req.query
              .payrollMonth ||
            "",
        });

      const safeEmployeeCode =
        String(
          employee
            .employeeCode ||
          employee._id
        ).replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        );

      const fileName =
        `Salary_Structure_${safeEmployeeCode}.pdf`;

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${fileName}"`
      );

      res.setHeader(
        "Content-Length",
        pdf.length
      );

      return res.end(
        pdf
      );
    }
  );



module.exports = {
  createPolicy,
  updatePolicy,
  getPolicies,

  createSalaryStructure,
  activateSalaryStructure,
  getSalaryHistory,

  createAdjustment,
  approveAdjustment,

  createRun,
  generateRun,
  submitRun,
  approveRun,
  finalizeRun,
  listRuns,
  getRun,
  getRegister,

  getEmployeePayroll,
  reviewEmployeePayroll,

  getMySalary,

  downloadSalaryStructurePdf,

};
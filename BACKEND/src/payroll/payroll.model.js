const mongoose = require("mongoose");

const {
  PAYROLL_RUN_STATUSES,
  SALARY_STRUCTURE_STATUSES,
  PAYROLL_EMPLOYEE_STATUSES,
  PAYROLL_ADJUSTMENT_TYPES,
  PAYROLL_CALCULATION_BASES,
  OVERTIME_CALCULATION_TYPES,
} = require("./payroll.constants");

const {
  Schema,
} = mongoose;

/* =========================================================
   COMMON MONEY COMPONENT
========================================================= */

const componentSchema =
  new Schema(
    {
      code: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },

      amount: {
        type: Number,
        default: 0,
        min: 0,
      },

      taxable: {
        type: Boolean,
        default: true,
      },

      proratable: {
        type: Boolean,
        default: true,
      },

      systemGenerated: {
        type: Boolean,
        default: false,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   PAYROLL POLICY APPLICABILITY

   BASE
   - Main payroll calculation policy.
   - Exactly one BASE policy should resolve for an employee.

   ADDITIONAL
   - Extra policy layered on top of BASE.
   - An employee can have multiple ADDITIONAL policies.

   HR never needs to know these internal values.
========================================================= */

const payrollPolicyApplicabilitySchema =
  new Schema(
    {
      scopeType: {
        type: String,
        enum: [
          "ALL_EMPLOYEES",
          "OFFICE",
          "DEPARTMENT",
          "EMPLOYEES",
        ],
        default: "ALL_EMPLOYEES",
        required: true,
      },

      officeCodes: {
        type: [String],
        default: [],
      },

      departmentIds: {
        type: [
          {
            type: Schema.Types.ObjectId,
            ref: "Department",
          },
        ],
        default: [],
      },

      employeeIds: {
        type: [
          {
            type: Schema.Types.ObjectId,
            ref: "Employee",
          },
        ],
        default: [],
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   PAYROLL POLICY
========================================================= */

const payrollPolicySchema =
  new Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      companyCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        index: true,
      },

      active: {
        type: Boolean,
        default: true,
        index: true,
      },

      isDefault: {
        type: Boolean,
        default: false,
      },

      /*
 * BASE:
 * Main payroll policy for the employee.
 *
 * ADDITIONAL:
 * Extra rules which may apply together with the BASE policy.
 */
policyType: {
  type: String,
  enum: [
    "BASE",
    "ADDITIONAL",
  ],
  default: "BASE",
  index: true,
},

/*
 * Determines which employees this policy applies to.
 */
applicability: {
  type: payrollPolicyApplicabilitySchema,
  default: () => ({
    scopeType:
      "ALL_EMPLOYEES",

    officeCodes: [],

    departmentIds: [],

    employeeIds: [],
  }),
},

/*
 * Payroll-month validity.
 *
 * Stored as YYYY-MM because payroll itself is monthly.
 *
 * Example:
 * effectiveFromMonth = "2026-09"
 * effectiveToMonth = null
 *
 * Means September 2026 onwards.
 */
effectiveFromMonth: {
  type: String,
  required: true,
  match: /^\d{4}-\d{2}$/,
  index: true,
},

effectiveToMonth: {
  type: String,
  default: null,
  match: /^\d{4}-\d{2}$/,
  index: true,
},

      calculationBasis: {
        type: String,
        enum: PAYROLL_CALCULATION_BASES,
        default: "CALENDAR_DAYS",
      },

      fixedPayrollDays: {
        type: Number,
        default: 30,
        min: 1,
        max: 31,
      },

      attendanceRules: {
        presentPaid: {
          type: Boolean,
          default: true,
        },

        weekOffPaid: {
          type: Boolean,
          default: true,
        },

        holidayPaid: {
          type: Boolean,
          default: true,
        },

        approvedLeavePaid: {
          type: Boolean,
          default: true,
        },

        halfDayValue: {
          type: Number,
          default: 0.5,
          min: 0,
          max: 1,
        },

        absentValue: {
          type: Number,
          default: 0,
          min: 0,
          max: 1,
        },

        notMarkedValue: {
          type: Number,
          default: 0,
          min: 0,
          max: 1,
        },
      },

      overtimeRules: {
        enabled: {
          type: Boolean,
          default: false,
        },

        requiresApproval: {
          type: Boolean,
          default: true,
        },

        calculationType: {
          type: String,
          enum: OVERTIME_CALCULATION_TYPES,
          default: "HOURLY_FIXED",
        },

        fixedHourlyRate: {
          type: Number,
          default: 0,
          min: 0,
        },

        multiplier: {
          type: Number,
          default: 1,
          min: 0,
        },

        minimumMinutes: {
          type: Number,
          default: 0,
          min: 0,
        },

        roundingMinutes: {
          type: Number,
          default: 30,
          min: 1,
        },

        maxMinutesPerDay: {
          type: Number,
          default: 0,
          min: 0,
        },
      },

      statutoryRules: {
        pfEnabled: {
          type: Boolean,
          default: false,
        },

        esiEnabled: {
          type: Boolean,
          default: false,
        },

        professionalTaxEnabled: {
          type: Boolean,
          default: false,
        },

        tdsEnabled: {
          type: Boolean,
          default: false,
        },
      },

      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

payrollPolicySchema.index({
  companyCode: 1,
  active: 1,
  policyType: 1,
});

payrollPolicySchema.index({
  companyCode: 1,
  effectiveFromMonth: 1,
  effectiveToMonth: 1,
});

payrollPolicySchema.index({
  "applicability.employeeIds": 1,
});

payrollPolicySchema.index({
  "applicability.departmentIds": 1,
});

payrollPolicySchema.index({
  "applicability.officeCodes": 1,
});

/* =========================================================
   EMPLOYEE SALARY STRUCTURE

   IMPORTANT:
   Never overwrite salary history.

   Salary revision creates a NEW structure.
========================================================= */

const salaryStructureSchema =
  new Schema(
    {
      employeeId: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
        index: true,
      },

      employeeCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        index: true,
      },

      companyCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        index: true,
      },

     /*
 * Legacy/default policy reference.
 *
 * Keep temporarily for backward compatibility with
 * already-created payroll runs.
 *
 * New payroll runs resolve policies employee-by-employee.
 */
policyId: {
  type: Schema.Types.ObjectId,
  ref: "PayrollPolicy",
  default: null,
},

/*
 * Snapshot of policies available for this payroll run.
 *
 * Actual employee-level policy usage is stored on
 * EmployeePayroll.appliedPolicies.
 */
policySnapshot: {
  type: [
    {
      policyId: {
        type: Schema.Types.ObjectId,
        ref: "PayrollPolicy",
        required: true,
      },

      name: {
        type: String,
        required: true,
      },

      policyType: {
        type: String,
        enum: [
          "BASE",
          "ADDITIONAL",
        ],
        required: true,
      },

      scopeType: {
        type: String,
        default:
          "ALL_EMPLOYEES",
      },
    },
  ],
  default: [],
},

      effectiveFrom: {
        type: Date,
        required: true,
        index: true,
      },

      effectiveTo: {
        type: Date,
        default: null,
      },

      status: {
        type: String,
        enum: SALARY_STRUCTURE_STATUSES,
        default: "DRAFT",
        index: true,
      },

      revisionNumber: {
        type: Number,
        default: 1,
        min: 1,
      },

      currency: {
        type: String,
        default: "INR",
        uppercase: true,
      },

      monthlyGross: {
        type: Number,
        required: true,
        min: 0,
      },

      annualCTC: {
        type: Number,
        default: 0,
        min: 0,
      },

      earnings: {
        type: [componentSchema],
        default: [],
      },

      fixedDeductions: {
        type: [componentSchema],
        default: [],
      },

      statutory: {
        pfEnabled: {
          type: Boolean,
          default: false,
        },

        pfAmount: {
          type: Number,
          default: 0,
          min: 0,
        },

        esiEnabled: {
          type: Boolean,
          default: false,
        },

        esiAmount: {
          type: Number,
          default: 0,
          min: 0,
        },

        tdsEnabled: {
          type: Boolean,
          default: false,
        },

        monthlyTds: {
          type: Number,
          default: 0,
          min: 0,
        },

        professionalTaxEnabled: {
          type: Boolean,
          default: false,
        },

        professionalTaxAmount: {
          type: Number,
          default: 0,
          min: 0,
        },
      },

      overtime: {
        eligible: {
          type: Boolean,
          default: false,
        },

        calculationType: {
          type: String,
          enum: OVERTIME_CALCULATION_TYPES,
          default: "HOURLY_FIXED",
        },

        hourlyRate: {
          type: Number,
          default: 0,
          min: 0,
        },

        multiplier: {
          type: Number,
          default: 1,
          min: 0,
        },
      },

      paymentMode: {
        type: String,
        enum: [
          "BANK",
          "CASH",
          "CHEQUE",
          "OTHER",
        ],
        default: "BANK",
      },

      remarks: {
        type: String,
        trim: true,
        default: "",
      },

      locked: {
        type: Boolean,
        default: false,
        index: true,
      },

      lockedAt: {
        type: Date,
        default: null,
      },

      lockedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

salaryStructureSchema.index({
  employeeId: 1,
  effectiveFrom: -1,
});

salaryStructureSchema.index({
  employeeId: 1,
  status: 1,
});

/* =========================================================
   PAYROLL ADJUSTMENT
========================================================= */

const payrollAdjustmentSchema =
  new Schema(
    {
      employeeId: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
        index: true,
      },

      companyCode: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        index: true,
      },

      payrollMonth: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}$/,
        index: true,
      },

      type: {
        type: String,
        enum: PAYROLL_ADJUSTMENT_TYPES,
        required: true,
      },

      amount: {
        type: Number,
        required: true,
        min: 0,
      },

      reason: {
        type: String,
        required: true,
        trim: true,
      },

      remarks: {
        type: String,
        trim: true,
        default: "",
      },

      status: {
        type: String,
        enum: [
          "DRAFT",
          "APPROVED",
          "REJECTED",
          "CONSUMED",
        ],
        default: "DRAFT",
        index: true,
      },

      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      approvedAt: {
        type: Date,
        default: null,
      },

      consumedByPayrollId: {
        type: Schema.Types.ObjectId,
        ref: "EmployeePayroll",
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

payrollAdjustmentSchema.index({
  employeeId: 1,
  payrollMonth: 1,
  status: 1,
});

/* =========================================================
   PAYROLL RUN
========================================================= */

const payrollRunSchema =
  new Schema(
    {
      payrollMonth: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}$/,
        index: true,
      },

      companyCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        index: true,
      },

      policyId: {
        type: Schema.Types.ObjectId,
        ref: "PayrollPolicy",
        required: true,
      },

      periodStart: {
        type: String,
        required: true,
      },

      periodEnd: {
        type: String,
        required: true,
      },

      status: {
        type: String,
        enum: PAYROLL_RUN_STATUSES,
        default: "DRAFT",
        index: true,
      },

      employeeCount: {
        type: Number,
        default: 0,
      },

      exceptionCount: {
        type: Number,
        default: 0,
      },

      totals: {
        grossEarnings: {
          type: Number,
          default: 0,
        },

        overtime: {
          type: Number,
          default: 0,
        },

        totalDeductions: {
          type: Number,
          default: 0,
        },

        netPay: {
          type: Number,
          default: 0,
        },
      },

      generatedAt: {
        type: Date,
        default: null,
      },

      generatedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      submittedAt: {
        type: Date,
        default: null,
      },

      submittedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      approvedAt: {
        type: Date,
        default: null,
      },

      approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      finalizedAt: {
        type: Date,
        default: null,
      },

      finalizedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      locked: {
        type: Boolean,
        default: false,
        index: true,
      },

      lockReason: {
        type: String,
        default: "",
        trim: true,
      },

      notes: {
        type: String,
        default: "",
        trim: true,
      },

      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

payrollRunSchema.index(
  {
    payrollMonth: 1,
    companyCode: 1,
  },
  {
    unique: true,
  }
);

/* =========================================================
   EMPLOYEE PAYROLL SNAPSHOTS
========================================================= */

const employeeSnapshotSchema =
  new Schema(
    {
      employeeCode: String,
      employeeName: String,
      companyCode: String,
      orgUnitCode: String,

      departmentId: {
        type: Schema.Types.ObjectId,
        ref: "Department",
        default: null,
      },

      designation: String,
      workLocation: String,
      employmentType: String,
      joiningDate: Date,
      exitDate: Date,
    },
    {
      _id: false,
    }
  );

const attendanceSnapshotSchema =
  new Schema(
    {
      calendarDays: {
        type: Number,
        default: 0,
      },

      attendanceRecords: {
        type: Number,
        default: 0,
      },

      presentDays: {
        type: Number,
        default: 0,
      },

      absentDays: {
        type: Number,
        default: 0,
      },

      halfDays: {
        type: Number,
        default: 0,
      },

      leaveDays: {
        type: Number,
        default: 0,
      },

      weekOffDays: {
        type: Number,
        default: 0,
      },

      holidayDays: {
        type: Number,
        default: 0,
      },

      notMarkedDays: {
        type: Number,
        default: 0,
      },

      payableDays: {
        type: Number,
        default: 0,
      },

      lopDays: {
        type: Number,
        default: 0,
      },

      lateCount: {
        type: Number,
        default: 0,
      },

      earlyExitCount: {
        type: Number,
        default: 0,
      },

      missingCheckoutCount: {
        type: Number,
        default: 0,
      },

      totalWorkingMinutes: {
        type: Number,
        default: 0,
      },

      detectedOvertimeMinutes: {
        type: Number,
        default: 0,
      },

      approvedOvertimeMinutes: {
        type: Number,
        default: 0,
      },
    },
    {
      _id: false,
    }
  );

const payrollMoneySchema =
  new Schema(
    {
      earnings: {
        type: [componentSchema],
        default: [],
      },

      deductions: {
        type: [componentSchema],
        default: [],
      },

      regularEarnings: {
        type: Number,
        default: 0,
      },

      overtimeAmount: {
        type: Number,
        default: 0,
      },

      adjustmentEarnings: {
        type: Number,
        default: 0,
      },

      absenceDeduction: {
        type: Number,
        default: 0,
      },

      adjustmentDeductions: {
        type: Number,
        default: 0,
      },

      grossEarnings: {
        type: Number,
        default: 0,
      },

      totalDeductions: {
        type: Number,
        default: 0,
      },

      netPay: {
        type: Number,
        default: 0,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   EMPLOYEE PAYROLL
========================================================= */

const employeePayrollSchema =
  new Schema(
    {
      payrollRunId: {
        type: Schema.Types.ObjectId,
        ref: "PayrollRun",
        required: true,
        index: true,
      },

      payrollMonth: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}$/,
        index: true,
      },

      employeeId: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
        index: true,
      },

      salaryStructureId: {
        type: Schema.Types.ObjectId,
        ref: "EmployeeSalaryStructure",
        required: true,
      },

      /*
 * Immutable payroll-time policy snapshot.
 *
 * One employee can have:
 * - one BASE policy
 * - zero or more ADDITIONAL policies
 */
appliedPolicies: {
  type: [
    {
      policyId: {
        type: Schema.Types.ObjectId,
        ref: "PayrollPolicy",
        required: true,
      },

      name: {
        type: String,
        required: true,
      },

      policyType: {
        type: String,
        enum: [
          "BASE",
          "ADDITIONAL",
        ],
        required: true,
      },

      calculationBasis: {
        type: String,
        default: "",
      },

      effectiveFromMonth: {
        type: String,
        default: "",
      },

      effectiveToMonth: {
        type: String,
        default: null,
      },
    },
  ],
  default: [],
},

      employeeSnapshot: {
        type: employeeSnapshotSchema,
        required: true,
      },

      salarySnapshot: {
        monthlyGross: {
          type: Number,
          required: true,
        },

        annualCTC: {
          type: Number,
          default: 0,
        },

        currency: {
          type: String,
          default: "INR",
        },

        earnings: {
          type: [componentSchema],
          default: [],
        },

        fixedDeductions: {
          type: [componentSchema],
          default: [],
        },

        statutory: {
          type: Schema.Types.Mixed,
          default: {},
        },

        overtime: {
          type: Schema.Types.Mixed,
          default: {},
        },
      },

      attendanceSnapshot: {
        type: attendanceSnapshotSchema,
        default: () => ({}),
      },

      money: {
        type: payrollMoneySchema,
        default: () => ({}),
      },

      adjustmentIds: [
        {
          type: Schema.Types.ObjectId,
          ref: "PayrollAdjustment",
        },
      ],

      exceptions: {
        type: [
          {
            code: {
              type: String,
              required: true,
            },

            message: {
              type: String,
              required: true,
            },

            severity: {
              type: String,
              enum: [
                "INFO",
                "WARNING",
                "BLOCKER",
              ],
              default: "WARNING",
            },
          },
        ],
        default: [],
      },

      status: {
        type: String,
        enum: PAYROLL_EMPLOYEE_STATUSES,
        default: "DRAFT",
        index: true,
      },

      reviewed: {
        type: Boolean,
        default: false,
      },

      reviewedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      reviewedAt: {
        type: Date,
        default: null,
      },

      locked: {
        type: Boolean,
        default: false,
        index: true,
      },

      finalizedAt: {
        type: Date,
        default: null,
      },

      finalizedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      calculationVersion: {
        type: Number,
        default: 1,
      },
    },
    {
      timestamps: true,
    }
  );

employeePayrollSchema.index(
  {
    payrollRunId: 1,
    employeeId: 1,
  },
  {
    unique: true,
  }
);

employeePayrollSchema.index({
  employeeId: 1,
  payrollMonth: -1,
});

/* =========================================================
   MODELS
========================================================= */

const PayrollPolicy =
  mongoose.models.PayrollPolicy ||
  mongoose.model(
    "PayrollPolicy",
    payrollPolicySchema
  );

const EmployeeSalaryStructure =
  mongoose.models.EmployeeSalaryStructure ||
  mongoose.model(
    "EmployeeSalaryStructure",
    salaryStructureSchema
  );

const PayrollAdjustment =
  mongoose.models.PayrollAdjustment ||
  mongoose.model(
    "PayrollAdjustment",
    payrollAdjustmentSchema
  );

const PayrollRun =
  mongoose.models.PayrollRun ||
  mongoose.model(
    "PayrollRun",
    payrollRunSchema
  );

const EmployeePayroll =
  mongoose.models.EmployeePayroll ||
  mongoose.model(
    "EmployeePayroll",
    employeePayrollSchema
  );

module.exports = {
  PayrollPolicy,
  EmployeeSalaryStructure,
  PayrollAdjustment,
  PayrollRun,
  EmployeePayroll,
};
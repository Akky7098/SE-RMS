const mongoose =
  require("mongoose");

const {
  Employee,
} =
  require("../employee/employee.model");

const {
  Attendance,
} =
  require("../attendance/attendance.model");

const {
  PayrollPolicy,
  EmployeeSalaryStructure,
  PayrollAdjustment,
  PayrollRun,
  EmployeePayroll,
} =
  require("./payroll.model");

/* =========================================================
   HELPERS
========================================================= */

const createError =
  (
    message,
    statusCode = 400
  ) => {
    const error =
      new Error(message);

    error.statusCode =
      statusCode;

    return error;
  };

const validObjectId =
  (value) =>
    Boolean(
      value &&
      mongoose.Types.ObjectId
        .isValid(value)
    );

const money =
  (value) =>
    Math.round(
      (Number(value || 0) +
        Number.EPSILON) *
        100
    ) / 100;

const sum =
  (values = []) =>
    money(
      values.reduce(
        (
          total,
          value
        ) =>
          total +
          Number(value || 0),
        0
      )
    );

const pad =
  (value) =>
    String(value)
      .padStart(2, "0");

const getMonthRange =
  (payrollMonth) => {
    if (
      !/^\d{4}-\d{2}$/.test(
        String(
          payrollMonth || ""
        )
      )
    ) {
      throw createError(
        "payrollMonth must be YYYY-MM."
      );
    }

    const [
      year,
      month,
    ] =
      payrollMonth
        .split("-")
        .map(Number);

    if (
      month < 1 ||
      month > 12
    ) {
      throw createError(
        "Invalid payroll month."
      );
    }

    const days =
      new Date(
        Date.UTC(
          year,
          month,
          0
        )
      ).getUTCDate();

    return {
      year,
      month,
      calendarDays:
        days,

      periodStart:
        `${year}-${pad(month)}-01`,

      periodEnd:
        `${year}-${pad(month)}-${pad(days)}`,

      effectiveDate:
        new Date(
          Date.UTC(
            year,
            month - 1,
            days,
            12
          )
        ),
    };
  };

const activeEmployeeQuery =
  (
    companyCode,
    periodStart,
    periodEnd
  ) => ({
    companyCode,

    joiningDate: {
      $lte:
        new Date(
          `${periodEnd}T23:59:59.999Z`
        ),
    },

    $and: [
      {
        $or: [
          {
            exitDate:
              null,
          },
          {
            exitDate: {
              $gte:
                new Date(
                  `${periodStart}T00:00:00.000Z`
                ),
            },
          },
        ],
      },

      {
        status: {
          $in: [
            "ACTIVE",
            "NOTICE_PERIOD",
            "EXITED",
          ],
        },
      },
    ],
  });

/* =========================================================
   POLICY
========================================================= */

const normalizePolicyApplicability =
  (applicability = {}) => {
    const allowedScopes = [
      "ALL_EMPLOYEES",
      "OFFICE",
      "DEPARTMENT",
      "EMPLOYEES",
    ];

    const scopeType =
      allowedScopes.includes(
        applicability.scopeType
      )
        ? applicability.scopeType
        : "ALL_EMPLOYEES";

    return {
      scopeType,

      officeCodes:
        Array.isArray(
          applicability.officeCodes
        )
          ? [
              ...new Set(
                applicability.officeCodes
                  .map((value) =>
                    String(
                      value || ""
                    )
                      .trim()
                      .toUpperCase()
                  )
                  .filter(Boolean)
              ),
            ]
          : [],

      departmentIds:
        Array.isArray(
          applicability.departmentIds
        )
          ? applicability.departmentIds
              .filter(
                validObjectId
              )
          : [],

      employeeIds:
        Array.isArray(
          applicability.employeeIds
        )
          ? applicability.employeeIds
              .filter(
                validObjectId
              )
          : [],
    };
  };


const validatePolicyApplicability =
  (applicability) => {
    if (
      applicability.scopeType ===
        "OFFICE" &&
      !applicability.officeCodes.length
    ) {
      throw createError(
        "Select at least one office for this payroll policy."
      );
    }

    if (
      applicability.scopeType ===
        "DEPARTMENT" &&
      !applicability.departmentIds.length
    ) {
      throw createError(
        "Select at least one department for this payroll policy."
      );
    }

    if (
      applicability.scopeType ===
        "EMPLOYEES" &&
      !applicability.employeeIds.length
    ) {
      throw createError(
        "Select at least one employee for this payroll policy."
      );
    }
  };


const policyIsEffectiveForMonth =
  (
    policy,
    payrollMonth
  ) => {
    if (
      !policy ||
      !payrollMonth
    ) {
      return false;
    }

    if (
      policy.effectiveFromMonth &&
      policy.effectiveFromMonth >
        payrollMonth
    ) {
      return false;
    }

    if (
      policy.effectiveToMonth &&
      policy.effectiveToMonth <
        payrollMonth
    ) {
      return false;
    }

    return true;
  };


const policyMatchesEmployee =
  (
    policy,
    employee
  ) => {
    const applicability =
      policy?.applicability || {};

    const scopeType =
      applicability.scopeType ||
      "ALL_EMPLOYEES";

    if (
      scopeType ===
      "ALL_EMPLOYEES"
    ) {
      return true;
    }

    if (
      scopeType ===
      "EMPLOYEES"
    ) {
      return (
        applicability.employeeIds ||
        []
      ).some(
        (employeeId) =>
          String(employeeId) ===
          String(employee._id)
      );
    }

    if (
      scopeType ===
      "DEPARTMENT"
    ) {
      if (
        !employee.department
      ) {
        return false;
      }

      return (
        applicability.departmentIds ||
        []
      ).some(
        (departmentId) =>
          String(departmentId) ===
          String(
            employee.department
          )
      );
    }

    if (
      scopeType ===
      "OFFICE"
    ) {
      /*
       * Employee Master currently exposes
       * workLocation in payroll snapshots.
       *
       * We match officeCodes against that value.
       * Later, if Employee Master gets a dedicated
       * officeCode field, only this helper needs
       * to change.
       */
      const employeeOffice =
        String(
          employee.workLocation ||
          employee.orgUnitCode ||
          ""
        )
          .trim()
          .toUpperCase();

      return (
        applicability.officeCodes ||
        []
      ).some(
        (officeCode) =>
          String(
            officeCode || ""
          )
            .trim()
            .toUpperCase() ===
          employeeOffice
      );
    }

    return false;
  };


const resolveEmployeePolicies =
  ({
    policies = [],
    employee,
    payrollMonth,
  }) => {
    const applicable =
      policies.filter(
        (policy) =>
          policy.active !==
            false &&
          policyIsEffectiveForMonth(
            policy,
            payrollMonth
          ) &&
          policyMatchesEmployee(
            policy,
            employee
          )
      );

    const basePolicies =
      applicable.filter(
        (policy) =>
          (
            policy.policyType ||
            "BASE"
          ) === "BASE"
      );

    const additionalPolicies =
      applicable.filter(
        (policy) =>
          policy.policyType ===
          "ADDITIONAL"
      );

    /*
     * Specific BASE policy wins over
     * company-wide BASE policy.
     *
     * HR does not need to manage a
     * numeric priority.
     */
    const scopeWeight = {
      EMPLOYEES: 400,
      DEPARTMENT: 300,
      OFFICE: 200,
      ALL_EMPLOYEES: 100,
    };

    basePolicies.sort(
      (a, b) => {
        const aWeight =
          scopeWeight[
            a.applicability
              ?.scopeType ||
              "ALL_EMPLOYEES"
          ] || 0;

        const bWeight =
          scopeWeight[
            b.applicability
              ?.scopeType ||
              "ALL_EMPLOYEES"
          ] || 0;

        if (
          bWeight !==
          aWeight
        ) {
          return (
            bWeight -
            aWeight
          );
        }

        /*
         * If specificity is identical,
         * the most recently effective
         * policy wins.
         */
        return String(
          b.effectiveFromMonth ||
          ""
        ).localeCompare(
          String(
            a.effectiveFromMonth ||
            ""
          )
        );
      }
    );

    return {
      basePolicy:
        basePolicies[0] ||
        null,

      additionalPolicies,
    };
  };


const createPayrollPolicy =
  async ({
    payload,
    actorUserId,
  }) => {
    if (
      !payload?.companyCode ||
      !payload?.name
    ) {
      throw createError(
        "Policy name and company are required."
      );
    }

    const companyCode =
      String(
        payload.companyCode
      )
        .trim()
        .toUpperCase();

    const policyType =
      payload.policyType ===
      "ADDITIONAL"
        ? "ADDITIONAL"
        : "BASE";

    const applicability =
      normalizePolicyApplicability(
        payload.applicability
      );

    validatePolicyApplicability(
      applicability
    );

    const effectiveFromMonth =
      String(
        payload.effectiveFromMonth ||
        ""
      ).trim();

    const effectiveToMonth =
      payload.effectiveToMonth
        ? String(
            payload.effectiveToMonth
          ).trim()
        : null;

    if (
      !/^\d{4}-\d{2}$/.test(
        effectiveFromMonth
      )
    ) {
      throw createError(
        "Select when this payroll policy should start."
      );
    }

    if (
      effectiveToMonth &&
      !/^\d{4}-\d{2}$/.test(
        effectiveToMonth
      )
    ) {
      throw createError(
        "Invalid policy end month."
      );
    }

    if (
      effectiveToMonth &&
      effectiveToMonth <
        effectiveFromMonth
    ) {
      throw createError(
        "Policy end month cannot be before its start month."
      );
    }

    /*
     * Only BASE policies can be default.
     *
     * ADDITIONAL policies are layered
     * automatically when applicable.
     */
    const isDefault =
      policyType === "BASE" &&
      payload.isDefault === true;

    if (
      isDefault
    ) {
      await PayrollPolicy
        .updateMany(
          {
            companyCode,

            policyType:
              "BASE",

            isDefault:
              true,
          },
          {
            $set: {
              isDefault:
                false,
            },
          }
        );
    }

    return PayrollPolicy
      .create({
        ...payload,

        companyCode,

        policyType,

        applicability,

        effectiveFromMonth,

        effectiveToMonth,

        isDefault,

        active:
          payload.active !==
          false,

        createdBy:
          actorUserId,

        updatedBy:
          actorUserId,
      });
  };

const updatePayrollPolicy =
  async ({
    policyId,
    payload,
    actorUserId,
  }) => {
    if (
      !validObjectId(
        policyId
      )
    ) {
      throw createError(
        "Invalid policyId."
      );
    }

    const policy =
      await PayrollPolicy
        .findById(
          policyId
        );

    if (
      !policy
    ) {
      throw createError(
        "Payroll policy not found.",
        404
      );
    }

    /*
     * Finalized payroll is safe because
     * EmployeePayroll stores the applied
     * policy snapshot.
     */

    const nextCompanyCode =
      payload.companyCode
        ? String(
            payload.companyCode
          )
            .trim()
            .toUpperCase()
        : policy.companyCode;

    const nextPolicyType =
      payload.policyType
        ? (
            payload.policyType ===
            "ADDITIONAL"
              ? "ADDITIONAL"
              : "BASE"
          )
        : (
            policy.policyType ||
            "BASE"
          );

    let nextApplicability =
      policy.applicability;

    if (
      payload.applicability
    ) {
      nextApplicability =
        normalizePolicyApplicability(
          payload.applicability
        );

      validatePolicyApplicability(
        nextApplicability
      );
    }

    const nextStart =
      payload.effectiveFromMonth !==
      undefined
        ? String(
            payload.effectiveFromMonth ||
            ""
          ).trim()
        : policy.effectiveFromMonth;

    const nextEnd =
      payload.effectiveToMonth !==
      undefined
        ? (
            payload.effectiveToMonth
              ? String(
                  payload.effectiveToMonth
                ).trim()
              : null
          )
        : policy.effectiveToMonth;

    if (
      !/^\d{4}-\d{2}$/.test(
        String(
          nextStart || ""
        )
      )
    ) {
      throw createError(
        "Select when this payroll policy should start."
      );
    }

    if (
      nextEnd &&
      !/^\d{4}-\d{2}$/.test(
        String(nextEnd)
      )
    ) {
      throw createError(
        "Invalid policy end month."
      );
    }

    if (
      nextEnd &&
      nextEnd <
        nextStart
    ) {
      throw createError(
        "Policy end month cannot be before its start month."
      );
    }

    const wantsDefault =
      nextPolicyType ===
        "BASE" &&
      payload.isDefault ===
        true;

    if (
      wantsDefault
    ) {
      await PayrollPolicy
        .updateMany(
          {
            companyCode:
              nextCompanyCode,

            policyType:
              "BASE",

            _id: {
              $ne:
                policy._id,
            },

            isDefault:
              true,
          },
          {
            $set: {
              isDefault:
                false,
            },
          }
        );
    }

    Object.assign(
      policy,
      payload
    );

    policy.companyCode =
      nextCompanyCode;

    policy.policyType =
      nextPolicyType;

    policy.applicability =
      nextApplicability;

    policy.effectiveFromMonth =
      nextStart;

    policy.effectiveToMonth =
      nextEnd;

    /*
     * ADDITIONAL policy can never
     * become the company default.
     */
    if (
      nextPolicyType ===
      "ADDITIONAL"
    ) {
      policy.isDefault =
        false;
    }

    policy.updatedBy =
      actorUserId;

    await policy.save();

    return policy;
  };

const getPayrollPolicies =
  async ({
    companyCode,
    active,
  } = {}) => {
    const query = {};

    if (
      companyCode
    ) {
      query.companyCode =
        String(
          companyCode
        ).toUpperCase();
    }

    if (
      active !== undefined
    ) {
      query.active =
        String(active) ===
        "true";
    }

    return PayrollPolicy
      .find(query)
      .sort({
        companyCode:
          1,
        createdAt:
          -1,
      })
      .lean();
  };

/* =========================================================
   SALARY STRUCTURE
========================================================= */

const validateSalaryStructure =
  (payload) => {
    const earnings =
      Array.isArray(
        payload.earnings
      )
        ? payload.earnings
        : [];

    const earningsTotal =
      sum(
        earnings.map(
          (item) =>
            item.amount
        )
      );

    if (
      Number(
        payload.monthlyGross
      ) < 0
    ) {
      throw createError(
        "monthlyGross cannot be negative."
      );
    }

    /*
     * monthlyGross should normally equal fixed earnings.
     * We allow a small rounding tolerance.
     */
    if (
      earnings.length &&
      Math.abs(
        earningsTotal -
          Number(
            payload.monthlyGross
          )
      ) > 1
    ) {
      throw createError(
        `Salary earnings total (${earningsTotal}) does not match monthlyGross (${payload.monthlyGross}).`
      );
    }
  };

const createSalaryStructure =
  async ({
    employeeId,
    payload,
    actorUserId,
  }) => {
    if (
      !validObjectId(
        employeeId
      )
    ) {
      throw createError(
        "Invalid employeeId."
      );
    }

    const employee =
      await Employee
        .findById(
          employeeId
        )
        .lean();

    if (
      !employee
    ) {
      throw createError(
        "Employee not found.",
        404
      );
    }

    if (
      !employee.companyCode
    ) {
      throw createError(
        "Employee companyCode is required before salary can be configured."
      );
    }

    if (
      !validObjectId(
        payload.policyId
      )
    ) {
      throw createError(
        "Valid payroll policy is required."
      );
    }

    const policy =
      await PayrollPolicy
        .findOne({
          _id:
            payload.policyId,

          companyCode:
            employee.companyCode,

          active:
            true,
        })
        .lean();

    if (
      !policy
    ) {
      throw createError(
        "Active payroll policy not found for employee company.",
        404
      );
    }

    validateSalaryStructure(
      payload
    );

    const latest =
      await EmployeeSalaryStructure
        .findOne({
          employeeId:
            employee._id,
        })
        .sort({
          revisionNumber:
            -1,
        })
        .lean();

    return EmployeeSalaryStructure
      .create({
        employeeId:
          employee._id,

        employeeCode:
          employee.employeeCode,

        companyCode:
          employee.companyCode,

        policyId:
          policy._id,

        effectiveFrom:
          payload.effectiveFrom,

        effectiveTo:
          payload.effectiveTo ||
          null,

        revisionNumber:
          Number(
            latest?.revisionNumber ||
            0
          ) + 1,

        currency:
          payload.currency ||
          "INR",

        monthlyGross:
          payload.monthlyGross,

        annualCTC:
          payload.annualCTC ||
          Number(
            payload.monthlyGross
          ) * 12,

        earnings:
          payload.earnings ||
          [],

        fixedDeductions:
          payload.fixedDeductions ||
          [],

        statutory:
          payload.statutory ||
          {},

        overtime:
          payload.overtime ||
          {},

        paymentMode:
          payload.paymentMode ||
          "BANK",

        remarks:
          payload.remarks ||
          "",

        status:
          "DRAFT",

        createdBy:
          actorUserId,

        updatedBy:
          actorUserId,
      });
  };

const activateSalaryStructure =
  async ({
    salaryStructureId,
    actorUserId,
  }) => {
    const structure =
      await EmployeeSalaryStructure
        .findById(
          salaryStructureId
        );

    if (
      !structure
    ) {
      throw createError(
        "Salary structure not found.",
        404
      );
    }

    if (
      structure.locked
    ) {
      throw createError(
        "Salary structure is already locked.",
        409
      );
    }

    const previous =
      await EmployeeSalaryStructure
        .findOne({
          employeeId:
            structure.employeeId,

          status:
            "ACTIVE",

          _id: {
            $ne:
              structure._id,
          },
        })
        .sort({
          effectiveFrom:
            -1,
        });

    if (
      previous
    ) {
      const previousEnd =
        new Date(
          new Date(
            structure.effectiveFrom
          ).getTime() -
            86400000
        );

      previous.status =
        "SUPERSEDED";

      previous.effectiveTo =
        previousEnd;

      previous.locked =
        true;

      previous.lockedAt =
        new Date();

      previous.lockedBy =
        actorUserId;

      previous.updatedBy =
        actorUserId;

      await previous.save();
    }

    structure.status =
      "ACTIVE";

    structure.locked =
      true;

    structure.lockedAt =
      new Date();

    structure.lockedBy =
      actorUserId;

    structure.updatedBy =
      actorUserId;

    await structure.save();

    return structure;
  };

const getSalaryHistory =
  async (
    employeeId
  ) => {
    if (
      !validObjectId(
        employeeId
      )
    ) {
      throw createError(
        "Invalid employeeId."
      );
    }

    return EmployeeSalaryStructure
      .find({
        employeeId,
      })
      .populate(
        "policyId",
        "name companyCode"
      )
      .sort({
        effectiveFrom:
          -1,
      })
      .lean();
  };

const getCurrentSalary =
  async (
    employeeId,
    atDate = new Date()
  ) => {
    return EmployeeSalaryStructure
      .findOne({
        employeeId,

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
  };

/* =========================================================
   ADJUSTMENTS
========================================================= */

const createAdjustment =
  async ({
    payload,
    actorUserId,
  }) => {
    if (
      !validObjectId(
        payload.employeeId
      )
    ) {
      throw createError(
        "Valid employeeId is required."
      );
    }

    const employee =
      await Employee
        .findById(
          payload.employeeId
        )
        .lean();

    if (
      !employee
    ) {
      throw createError(
        "Employee not found.",
        404
      );
    }

    getMonthRange(
      payload.payrollMonth
    );

    return PayrollAdjustment
      .create({
        employeeId:
          employee._id,

        companyCode:
          employee.companyCode,

        payrollMonth:
          payload.payrollMonth,

        type:
          payload.type,

        amount:
          money(
            payload.amount
          ),

        reason:
          payload.reason,

        remarks:
          payload.remarks ||
          "",

        status:
          "DRAFT",

        createdBy:
          actorUserId,
      });
  };

const approveAdjustment =
  async ({
    adjustmentId,
    actorUserId,
  }) => {
    const adjustment =
      await PayrollAdjustment
        .findById(
          adjustmentId
        );

    if (
      !adjustment
    ) {
      throw createError(
        "Payroll adjustment not found.",
        404
      );
    }

    if (
      adjustment.status !==
      "DRAFT"
    ) {
      throw createError(
        "Only DRAFT adjustments can be approved.",
        409
      );
    }

    adjustment.status =
      "APPROVED";

    adjustment.approvedBy =
      actorUserId;

    adjustment.approvedAt =
      new Date();

    await adjustment.save();

    return adjustment;
  };

/* =========================================================
   ATTENDANCE SNAPSHOT
========================================================= */

const buildAttendanceSnapshot =
  async ({
    employee,
    period,
    policy,
  }) => {
    const records =
      await Attendance
        .find({
          employeeId:
            employee._id,

          businessDate: {
            $gte:
              period.periodStart,

            $lte:
              period.periodEnd,
          },
        })
        .select(
          [
            "businessDate",
            "presenceStatus",
            "isLate",
            "isEarlyExit",
            "missingCheckOut",
            "totalWorkingMinutes",
            "overtimeMinutes",
          ].join(" ")
        )
        .lean();

    const snapshot = {
      calendarDays:
        period.calendarDays,

      attendanceRecords:
        records.length,

      presentDays:
        0,

      absentDays:
        0,

      halfDays:
        0,

      leaveDays:
        0,

      weekOffDays:
        0,

      holidayDays:
        0,

      notMarkedDays:
        0,

      payableDays:
        0,

      lopDays:
        0,

      lateCount:
        0,

      earlyExitCount:
        0,

      missingCheckoutCount:
        0,

      totalWorkingMinutes:
        0,

      detectedOvertimeMinutes:
        0,

      approvedOvertimeMinutes:
        0,
    };

    for (
      const record
      of records
    ) {
      switch (
        record.presenceStatus
      ) {
        case "PRESENT":
          snapshot.presentDays +=
            1;
          break;

        case "ABSENT":
          snapshot.absentDays +=
            1;
          break;

        case "HALF_DAY":
          snapshot.halfDays +=
            1;
          break;

        case "ON_LEAVE":
          snapshot.leaveDays +=
            1;
          break;

        case "WEEK_OFF":
          snapshot.weekOffDays +=
            1;
          break;

        case "HOLIDAY":
          snapshot.holidayDays +=
            1;
          break;

        case "NOT_MARKED":
          snapshot.notMarkedDays +=
            1;
          break;

        default:
          break;
      }

      if (
        record.isLate
      ) {
        snapshot.lateCount +=
          1;
      }

      if (
        record.isEarlyExit
      ) {
        snapshot.earlyExitCount +=
          1;
      }

      if (
        record.missingCheckOut
      ) {
        snapshot.missingCheckoutCount +=
          1;
      }

      snapshot.totalWorkingMinutes +=
        Number(
          record.totalWorkingMinutes ||
          0
        );

      snapshot.detectedOvertimeMinutes +=
        Number(
          record.overtimeMinutes ||
          0
        );
    }

    /*
     * Days without Attendance documents are NOT_MARKED.
     *
     * Later, once holiday/weekly-off calendars are fully
     * authoritative, this can become schedule-aware.
     */
    const uncoveredDays =
      Math.max(
        0,
        period.calendarDays -
          records.length
      );

    snapshot.notMarkedDays +=
      uncoveredDays;

    const rules =
      policy.attendanceRules ||
      {};

    snapshot.payableDays =
      money(
        (
          rules.presentPaid !==
          false
            ? snapshot.presentDays
            : 0
        ) +
          snapshot.halfDays *
            Number(
              rules.halfDayValue ??
              0.5
            ) +
          (
            rules.approvedLeavePaid !==
            false
              ? snapshot.leaveDays
              : 0
          ) +
          (
            rules.weekOffPaid !==
            false
              ? snapshot.weekOffDays
              : 0
          ) +
          (
            rules.holidayPaid !==
            false
              ? snapshot.holidayDays
              : 0
          ) +
          snapshot.absentDays *
            Number(
              rules.absentValue ||
              0
            ) +
          snapshot.notMarkedDays *
            Number(
              rules.notMarkedValue ||
              0
            )
      );

    snapshot.payableDays =
      Math.min(
        period.calendarDays,
        Math.max(
          0,
          snapshot.payableDays
        )
      );

    snapshot.lopDays =
      money(
        Math.max(
          0,
          period.calendarDays -
            snapshot.payableDays
        )
      );

    return snapshot;
  };

/* =========================================================
   PAYROLL MONEY CALCULATION
========================================================= */

const prorateComponent =
  ({
    component,
    payableDays,
    divisor,
  }) => {
    if (
      component.proratable ===
      false
    ) {
      return money(
        component.amount
      );
    }

    return money(
      Number(
        component.amount ||
        0
      ) *
        (
          Number(
            payableDays ||
            0
          ) /
          Number(
            divisor ||
            1
          )
        )
    );
  };

const calculateOvertime =
  ({
    salary,
    attendance,
    divisor,
  }) => {
    if (
      !salary.overtime
        ?.eligible
    ) {
      return {
        minutes:
          0,

        amount:
          0,
      };
    }

    /*
     * For phase 1, detected OT becomes approved OT only
     * when HR explicitly supplies it during review.
     *
     * This prevents biometric extra time from automatically
     * becoming payable OT.
     */
    const minutes =
      Number(
        attendance
          .approvedOvertimeMinutes ||
        0
      );

    if (
      minutes <= 0
    ) {
      return {
        minutes:
          0,

        amount:
          0,
      };
    }

    let hourlyRate =
      Number(
        salary.overtime
          .hourlyRate ||
        0
      );

    if (
      salary.overtime
        .calculationType ===
        "SALARY_BASED"
    ) {
      hourlyRate =
        Number(
          salary.monthlyGross ||
          0
        ) /
        Number(
          divisor ||
          1
        ) /
        8;
    }

    const multiplier =
      Number(
        salary.overtime
          .multiplier ||
        1
      );

    return {
      minutes,

      amount:
        money(
          (
            minutes /
            60
          ) *
            hourlyRate *
            multiplier
        ),
    };
  };

const calculateEmployeeMoney =
  ({
    salary,
    attendance,
    adjustments,
    divisor,
  }) => {
    const earnings = [];

    for (
      const component
      of salary.earnings ||
      []
    ) {
      earnings.push({
        ...component,

        amount:
          prorateComponent({
            component,
            payableDays:
              attendance
                .payableDays,
            divisor,
          }),
      });
    }

    const regularEarnings =
      sum(
        earnings.map(
          (item) =>
            item.amount
        )
      );

    const overtime =
      calculateOvertime({
        salary,
        attendance,
        divisor,
      });

    if (
      overtime.amount >
      0
    ) {
      earnings.push({
        code:
          "OVERTIME",

        name:
          "Overtime",

        amount:
          overtime.amount,

        taxable:
          true,

        proratable:
          false,

        systemGenerated:
          true,
      });
    }

    const adjustmentEarningTypes =
      new Set([
        "BONUS",
        "INCENTIVE",
        "ARREAR",
        "REIMBURSEMENT",
        "OTHER_EARNING",
      ]);

    const adjustmentDeductionTypes =
      new Set([
        "OTHER_DEDUCTION",
        "LOP",
        "ADVANCE_RECOVERY",
        "LOAN_RECOVERY",
      ]);

    let adjustmentEarnings =
      0;

    let adjustmentDeductions =
      0;

    for (
      const adjustment
      of adjustments
    ) {
      if (
        adjustmentEarningTypes
          .has(
            adjustment.type
          )
      ) {
        adjustmentEarnings +=
          Number(
            adjustment.amount ||
            0
          );

        earnings.push({
          code:
            adjustment.type,

          name:
            adjustment.type
              .replaceAll(
                "_",
                " "
              ),

          amount:
            money(
              adjustment.amount
            ),

          taxable:
            adjustment.type !==
            "REIMBURSEMENT",

          proratable:
            false,

          systemGenerated:
            false,
        });
      }

      if (
        adjustmentDeductionTypes
          .has(
            adjustment.type
          )
      ) {
        adjustmentDeductions +=
          Number(
            adjustment.amount ||
            0
          );
      }
    }

    const deductions = [];

    for (
      const component
      of salary.fixedDeductions ||
      []
    ) {
      deductions.push({
        ...component,

        amount:
          money(
            component.amount
          ),
      });
    }

    const statutory =
      salary.statutory ||
      {};

    if (
      statutory.pfEnabled &&
      Number(
        statutory.pfAmount ||
        0
      ) >
        0
    ) {
      deductions.push({
        code:
          "PF",

        name:
          "Provident Fund",

        amount:
          money(
            statutory.pfAmount
          ),

        taxable:
          false,

        proratable:
          false,

        systemGenerated:
          true,
      });
    }

    if (
      statutory.esiEnabled &&
      Number(
        statutory.esiAmount ||
        0
      ) >
        0
    ) {
      deductions.push({
        code:
          "ESI",

        name:
          "ESI",

        amount:
          money(
            statutory.esiAmount
          ),

        taxable:
          false,

        proratable:
          false,

        systemGenerated:
          true,
      });
    }

    if (
      statutory.tdsEnabled &&
      Number(
        statutory.monthlyTds ||
        0
      ) >
        0
    ) {
      deductions.push({
        code:
          "TDS",

        name:
          "TDS",

        amount:
          money(
            statutory.monthlyTds
          ),

        taxable:
          false,

        proratable:
          false,

        systemGenerated:
          true,
      });
    }

    if (
      statutory
        .professionalTaxEnabled &&
      Number(
        statutory
          .professionalTaxAmount ||
        0
      ) >
        0
    ) {
      deductions.push({
        code:
          "PT",

        name:
          "Professional Tax",

        amount:
          money(
            statutory
              .professionalTaxAmount
          ),

        taxable:
          false,

        proratable:
          false,

        systemGenerated:
          true,
      });
    }

    if (
      adjustmentDeductions >
      0
    ) {
      deductions.push({
        code:
          "ADJUSTMENTS",

        name:
          "Other Adjustments",

        amount:
          money(
            adjustmentDeductions
          ),

        taxable:
          false,

        proratable:
          false,

        systemGenerated:
          false,
      });
    }

    const grossEarnings =
      sum(
        earnings.map(
          (item) =>
            item.amount
        )
      );

    const totalDeductions =
      sum(
        deductions.map(
          (item) =>
            item.amount
        )
      );

    return {
      earnings,
      deductions,

      regularEarnings,

      overtimeAmount:
        overtime.amount,

      adjustmentEarnings:
        money(
          adjustmentEarnings
        ),

      /*
       * LOP is already represented by salary proration,
       * therefore this is informational.
       */
      absenceDeduction:
        money(
          Math.max(
            0,
            Number(
              salary.monthlyGross ||
              0
            ) -
              regularEarnings
          )
        ),

      adjustmentDeductions:
        money(
          adjustmentDeductions
        ),

      grossEarnings,

      totalDeductions,

      netPay:
        money(
          Math.max(
            0,
            grossEarnings -
              totalDeductions
          )
        ),
    };
  };

/* =========================================================
   EMPLOYEE EXCEPTIONS
========================================================= */

const buildExceptions =
  ({
    employee,
    salary,
    attendance,
  }) => {
    const exceptions =
      [];

    if (
      !salary
    ) {
      exceptions.push({
        code:
          "SALARY_MISSING",

        message:
          "Active salary structure is missing.",

        severity:
          "BLOCKER",
      });
    }

    if (
      attendance
        .notMarkedDays >
      0
    ) {
      exceptions.push({
        code:
          "ATTENDANCE_NOT_MARKED",

        message:
          `${attendance.notMarkedDays} attendance day(s) are not marked.`,

        severity:
          "WARNING",
      });
    }

    if (
      attendance
        .missingCheckoutCount >
      0
    ) {
      exceptions.push({
        code:
          "MISSING_CHECKOUT",

        message:
          `${attendance.missingCheckoutCount} day(s) have missing checkout.`,

        severity:
          "WARNING",
      });
    }

    if (
      employee.status ===
      "EXITED" &&
      !employee.exitDate
    ) {
      exceptions.push({
        code:
          "EXIT_DATE_MISSING",

        message:
          "Employee is EXITED but exitDate is missing.",

        severity:
          "BLOCKER",
      });
    }

    return exceptions;
  };

/* =========================================================
   PAYROLL RUN
========================================================= */

const createPayrollRun =
  async ({
    payrollMonth,
    companyCode,
    notes = "",
    actorUserId,
  }) => {
    const period =
      getMonthRange(
        payrollMonth
      );

    const normalizedCompany =
      String(
        companyCode ||
        ""
      )
        .trim()
        .toUpperCase();

    if (
      !normalizedCompany
    ) {
      throw createError(
        "Company is required."
      );
    }

    const existing =
      await PayrollRun
        .findOne({
          payrollMonth,

          companyCode:
            normalizedCompany,
        })
        .lean();

    if (
      existing
    ) {
      throw createError(
        "Payroll already exists for this company and month.",
        409
      );
    }

    /*
     * Load every policy that can
     * potentially apply this month.
     */
    const policies =
      await PayrollPolicy
        .find({
          companyCode:
            normalizedCompany,

          active:
            true,

          effectiveFromMonth: {
            $lte:
              payrollMonth,
          },

          $or: [
            {
              effectiveToMonth:
                null,
            },
            {
              effectiveToMonth: {
                $gte:
                  payrollMonth,
              },
            },
          ],
        })
        .lean();

    const basePolicies =
      policies.filter(
        (policy) =>
          (
            policy.policyType ||
            "BASE"
          ) === "BASE"
      );

    if (
      !basePolicies.length
    ) {
      throw createError(
        "No active Base Payroll Policy is available for this company and month.",
        409
      );
    }

    /*
     * Keep legacy policyId populated
     * for older screens/API consumers.
     *
     * It is NOT used to determine every
     * employee's policy anymore.
     */
    const defaultBasePolicy =
      basePolicies.find(
        (policy) =>
          policy.isDefault ===
          true
      ) ||
      basePolicies.find(
        (policy) =>
          policy.applicability
            ?.scopeType ===
          "ALL_EMPLOYEES"
      ) ||
      basePolicies[0];

    return PayrollRun
      .create({
        payrollMonth,

        companyCode:
          normalizedCompany,

        policyId:
          defaultBasePolicy
            ?._id ||
          null,

        policySnapshot:
          policies.map(
            (policy) => ({
              policyId:
                policy._id,

              name:
                policy.name,

              policyType:
                policy.policyType ||
                "BASE",

              scopeType:
                policy
                  .applicability
                  ?.scopeType ||
                "ALL_EMPLOYEES",
            })
          ),

        periodStart:
          period.periodStart,

        periodEnd:
          period.periodEnd,

        status:
          "DRAFT",

        notes,

        createdBy:
          actorUserId,

        updatedBy:
          actorUserId,
      });
  };

/* =========================================================
   GENERATE PAYROLL
========================================================= */

const generatePayroll =
  async ({
    payrollRunId,
    actorUserId,
  }) => {
    const run =
      await PayrollRun
        .findById(
          payrollRunId
        );

    if (
      !run
    ) {
      throw createError(
        "Payroll run not found.",
        404
      );
    }

    if (
      run.locked ||
      run.status ===
        "FINALIZED"
    ) {
      throw createError(
        "Finalized payroll cannot be regenerated.",
        409
      );
    }

    if (
      ![
        "DRAFT",
        "GENERATED",
      ].includes(
        run.status
      )
    ) {
      throw createError(
        `Payroll cannot be generated while status is ${run.status}.`,
        409
      );
    }

    const period =
      getMonthRange(
        run.payrollMonth
      );

    /*
     * Get every active policy that
     * is valid for this payroll month.
     */
    const policies =
      await PayrollPolicy
        .find({
          companyCode:
            run.companyCode,

          active:
            true,

          effectiveFromMonth: {
            $lte:
              run.payrollMonth,
          },

          $or: [
            {
              effectiveToMonth:
                null,
            },
            {
              effectiveToMonth: {
                $gte:
                  run.payrollMonth,
              },
            },
          ],
        })
        .lean();

    if (
      !policies.length
    ) {
      throw createError(
        "No active payroll policies are available for this company and month.",
        409
      );
    }

    const employees =
      await Employee
        .find(
          activeEmployeeQuery(
            run.companyCode,
            period.periodStart,
            period.periodEnd
          )
        )
        .lean();

    let exceptionCount =
      0;

    /*
     * Remove old generated employee
     * records that no longer belong to
     * this regenerated run.
     *
     * Finalized payroll can never reach
     * this code.
     */
    const activeEmployeeIds =
      employees.map(
        (employee) =>
          employee._id
      );

    await EmployeePayroll
      .deleteMany({
        payrollRunId:
          run._id,

        employeeId: {
          $nin:
            activeEmployeeIds,
        },

        locked: {
          $ne:
            true,
        },
      });

    for (
      const employee
      of employees
    ) {
      /*
       * Resolve policy automatically.
       *
       * HR does not choose a policy
       * during monthly payroll creation.
       */
      const {
        basePolicy,
        additionalPolicies,
      } =
        resolveEmployeePolicies({
          policies,
          employee,
          payrollMonth:
            run.payrollMonth,
        });

      /*
       * Every employee requires one
       * BASE policy.
       */
      if (
        !basePolicy
      ) {
        exceptionCount +=
          1;

        continue;
      }

      const appliedPolicies = [
        basePolicy,
        ...additionalPolicies,
      ];

      const salary =
        await getCurrentSalary(
          employee._id,
          period.effectiveDate
        );

      if (
        !salary
      ) {
        exceptionCount +=
          1;

        continue;
      }

      /*
       * BASE policy controls attendance
       * and payable-day calculation.
       *
       * ADDITIONAL policies are layered
       * separately and must not silently
       * replace the base calculation.
       */
      const attendance =
        await buildAttendanceSnapshot({
          employee,
          period,
          policy:
            basePolicy,
        });

      const adjustments =
        await PayrollAdjustment
          .find({
            employeeId:
              employee._id,

            payrollMonth:
              run.payrollMonth,

            status:
              "APPROVED",
          })
          .lean();

      let divisor =
        period.calendarDays;

      if (
        basePolicy
          .calculationBasis ===
        "FIXED_30_DAYS"
      ) {
        divisor =
          Number(
            basePolicy
              .fixedPayrollDays ||
            30
          );
      }

      if (
        basePolicy
          .calculationBasis ===
        "WORKING_DAYS"
      ) {
        divisor =
          Math.max(
            1,

            period.calendarDays -
              attendance
                .weekOffDays -
              attendance
                .holidayDays
          );
      }

      /*
       * Salary structure continues to
       * control the employee's actual
       * Basic/HRA/Conveyance/Other,
       * statutory amounts, etc.
       *
       * Policy decides payroll rules.
       */
      const moneyResult =
        calculateEmployeeMoney({
          salary,
          attendance,
          adjustments,
          divisor,
        });

      const exceptions =
        buildExceptions({
          employee,
          salary,
          attendance,
        });

      if (
        exceptions.length
      ) {
        exceptionCount +=
          1;
      }

      const payroll =
        await EmployeePayroll
          .findOneAndUpdate(
            {
              payrollRunId:
                run._id,

              employeeId:
                employee._id,
            },
            {
              $set: {
                payrollMonth:
                  run.payrollMonth,

                salaryStructureId:
                  salary._id,

                /*
                 * Snapshot every policy
                 * actually applied to
                 * this employee.
                 */
                appliedPolicies:
                  appliedPolicies.map(
                    (policy) => ({
                      policyId:
                        policy._id,

                      name:
                        policy.name,

                      policyType:
                        policy.policyType ||
                        "BASE",

                      calculationBasis:
                        policy
                          .calculationBasis ||
                        "",

                      effectiveFromMonth:
                        policy
                          .effectiveFromMonth ||
                        "",

                      effectiveToMonth:
                        policy
                          .effectiveToMonth ||
                        null,
                    })
                  ),

                employeeSnapshot: {
                  employeeCode:
                    employee
                      .employeeCode,

                  employeeName:
                    employee
                      .fullName,

                  companyCode:
                    employee
                      .companyCode,

                  orgUnitCode:
                    employee
                      .orgUnitCode,

                  departmentId:
                    employee
                      .department ||
                    null,

                  designation:
                    employee
                      .designation,

                  workLocation:
                    employee
                      .workLocation,

                  employmentType:
                    employee
                      .employmentType,

                  joiningDate:
                    employee
                      .joiningDate,

                  exitDate:
                    employee
                      .exitDate,
                },

                salarySnapshot: {
                  monthlyGross:
                    salary
                      .monthlyGross,

                  annualCTC:
                    salary
                      .annualCTC,

                  currency:
                    salary
                      .currency,

                  earnings:
                    salary
                      .earnings,

                  fixedDeductions:
                    salary
                      .fixedDeductions,

                  statutory:
                    salary
                      .statutory,

                  overtime:
                    salary
                      .overtime,
                },

                attendanceSnapshot:
                  attendance,

                money:
                  moneyResult,

                adjustmentIds:
                  adjustments.map(
                    (item) =>
                      item._id
                  ),

                exceptions,

                status:
                  exceptions.some(
                    (item) =>
                      item.severity ===
                      "BLOCKER"
                  )
                    ? "EXCEPTION"
                    : "CALCULATED",

                locked:
                  false,
              },

              $inc: {
                calculationVersion:
                  1,
              },
            },
            {
              upsert:
                true,

              returnDocument:
                "after",

              setDefaultsOnInsert:
                true,
            }
          );

      if (
        adjustments.length
      ) {
        await PayrollAdjustment
          .updateMany(
            {
              _id: {
                $in:
                  adjustments.map(
                    (item) =>
                      item._id
                  ),
              },
            },
            {
              $set: {
                consumedByPayrollId:
                  payroll._id,
              },
            }
          );
      }
    }

    const totals =
      await EmployeePayroll
        .aggregate([
          {
            $match: {
              payrollRunId:
                run._id,
            },
          },

          {
            $group: {
              _id:
                null,

              employeeCount: {
                $sum:
                  1,
              },

              grossEarnings: {
                $sum:
                  "$money.grossEarnings",
              },

              overtime: {
                $sum:
                  "$money.overtimeAmount",
              },

              totalDeductions: {
                $sum:
                  "$money.totalDeductions",
              },

              netPay: {
                $sum:
                  "$money.netPay",
              },
            },
          },
        ]);

    const summary =
      totals[0] ||
      {};

    run.employeeCount =
      Number(
        summary.employeeCount ||
        0
      );

    run.exceptionCount =
      exceptionCount;

    run.totals = {
      grossEarnings:
        money(
          summary.grossEarnings
        ),

      overtime:
        money(
          summary.overtime
        ),

      totalDeductions:
        money(
          summary.totalDeductions
        ),

      netPay:
        money(
          summary.netPay
        ),
    };

    /*
     * Refresh run-level policy snapshot.
     */
    run.policySnapshot =
      policies.map(
        (policy) => ({
          policyId:
            policy._id,

          name:
            policy.name,

          policyType:
            policy.policyType ||
            "BASE",

          scopeType:
            policy
              .applicability
              ?.scopeType ||
            "ALL_EMPLOYEES",
        })
      );

    run.status =
      "GENERATED";

    run.generatedAt =
      new Date();

    run.generatedBy =
      actorUserId;

    run.updatedBy =
      actorUserId;

    await run.save();

    return getPayrollRun(
      run._id
    );
  };

/* =========================================================
   OT APPROVAL / OVERRIDE
========================================================= */

const updateEmployeePayrollReview =
  async ({
    employeePayrollId,
    approvedOvertimeMinutes,
    actorUserId,
  }) => {
    const payroll =
      await EmployeePayroll
        .findById(
          employeePayrollId
        );

    if (
      !payroll
    ) {
      throw createError(
        "Employee payroll not found.",
        404
      );
    }

    if (
      payroll.locked
    ) {
      throw createError(
        "Finalized employee payroll cannot be edited.",
        409
      );
    }

    if (
      approvedOvertimeMinutes !==
      undefined
    ) {
      const requested =
        Math.max(
          0,
          Number(
            approvedOvertimeMinutes ||
            0
          )
        );

      payroll
        .attendanceSnapshot
        .approvedOvertimeMinutes =
        Math.min(
          requested,
          Number(
            payroll
              .attendanceSnapshot
              .detectedOvertimeMinutes ||
            requested
          )
        );
    }

    const salary =
      payroll.salarySnapshot;

    const run =
      await PayrollRun
        .findById(
          payroll.payrollRunId
        )
        .lean();

    const policy =
      await PayrollPolicy
        .findById(
          run.policyId
        )
        .lean();

    const period =
      getMonthRange(
        payroll.payrollMonth
      );

    let divisor =
      policy.calculationBasis ===
      "FIXED_30_DAYS"
        ? Number(
            policy.fixedPayrollDays ||
            30
          )
        : period.calendarDays;

    if (
      policy.calculationBasis ===
      "WORKING_DAYS"
    ) {
      divisor =
        Math.max(
          1,
          period.calendarDays -
            Number(
              payroll
                .attendanceSnapshot
                .weekOffDays ||
              0
            ) -
            Number(
              payroll
                .attendanceSnapshot
                .holidayDays ||
              0
            )
        );
    }

    const adjustments =
      await PayrollAdjustment
        .find({
          _id: {
            $in:
              payroll.adjustmentIds ||
              [],
          },
        })
        .lean();

    payroll.money =
      calculateEmployeeMoney({
        salary,
        attendance:
          payroll.attendanceSnapshot,
        adjustments,
        divisor,
      });

    payroll.reviewed =
      true;

    payroll.reviewedBy =
      actorUserId;

    payroll.reviewedAt =
      new Date();

    payroll.status =
      "REVIEWED";

    await payroll.save();

    await refreshRunTotals(
      payroll.payrollRunId
    );

    return payroll;
  };

/* =========================================================
   TOTAL REFRESH
========================================================= */

const refreshRunTotals =
  async (
    payrollRunId
  ) => {
    const totals =
      await EmployeePayroll
        .aggregate([
          {
            $match: {
              payrollRunId:
                new mongoose
                  .Types
                  .ObjectId(
                    payrollRunId
                  ),
            },
          },

          {
            $group: {
              _id:
                null,

              employeeCount: {
                $sum:
                  1,
              },

              grossEarnings: {
                $sum:
                  "$money.grossEarnings",
              },

              overtime: {
                $sum:
                  "$money.overtimeAmount",
              },

              totalDeductions: {
                $sum:
                  "$money.totalDeductions",
              },

              netPay: {
                $sum:
                  "$money.netPay",
              },
            },
          },
        ]);

    const summary =
      totals[0] ||
      {};

    await PayrollRun
      .updateOne(
        {
          _id:
            payrollRunId,
        },
        {
          $set: {
            employeeCount:
              Number(
                summary.employeeCount ||
                0
              ),

            totals: {
              grossEarnings:
                money(
                  summary.grossEarnings
                ),

              overtime:
                money(
                  summary.overtime
                ),

              totalDeductions:
                money(
                  summary.totalDeductions
                ),

              netPay:
                money(
                  summary.netPay
                ),
            },
          },
        }
      );
  };

/* =========================================================
   WORKFLOW
========================================================= */

const submitPayrollForReview =
  async ({
    payrollRunId,
    actorUserId,
  }) => {
    const run =
      await PayrollRun
        .findById(
          payrollRunId
        );

    if (
      !run
    ) {
      throw createError(
        "Payroll run not found.",
        404
      );
    }

    if (
      run.status !==
      "GENERATED"
    ) {
      throw createError(
        "Only GENERATED payroll can be submitted for review.",
        409
      );
    }

    run.status =
      "UNDER_REVIEW";

    run.submittedAt =
      new Date();

    run.submittedBy =
      actorUserId;

    run.updatedBy =
      actorUserId;

    await run.save();

    return run;
  };

const approvePayroll =
  async ({
    payrollRunId,
    actorUserId,
  }) => {
    const run =
      await PayrollRun
        .findById(
          payrollRunId
        );

    if (
      !run
    ) {
      throw createError(
        "Payroll run not found.",
        404
      );
    }

    if (
      run.status !==
      "UNDER_REVIEW"
    ) {
      throw createError(
        "Payroll must be UNDER_REVIEW before approval.",
        409
      );
    }

    const blockers =
      await EmployeePayroll
        .countDocuments({
          payrollRunId:
            run._id,

          "exceptions.severity":
            "BLOCKER",
        });

    if (
      blockers >
      0
    ) {
      throw createError(
        `Payroll has ${blockers} employee(s) with blocking exceptions.`,
        409
      );
    }

    run.status =
      "APPROVED";

    run.approvedAt =
      new Date();

    run.approvedBy =
      actorUserId;

    run.updatedBy =
      actorUserId;

    await run.save();

    await EmployeePayroll
      .updateMany(
        {
          payrollRunId:
            run._id,
        },
        {
          $set: {
            status:
              "APPROVED",
          },
        }
      );

    return run;
  };

const finalizePayroll =
  async ({
    payrollRunId,
    actorUserId,
    lockReason = "",
  }) => {
    const run =
      await PayrollRun
        .findById(
          payrollRunId
        );

    if (
      !run
    ) {
      throw createError(
        "Payroll run not found.",
        404
      );
    }

    if (
      run.status !==
      "APPROVED"
    ) {
      throw createError(
        "Only APPROVED payroll can be finalized.",
        409
      );
    }

    const now =
      new Date();

    run.status =
      "FINALIZED";

    run.locked =
      true;

    run.lockReason =
      lockReason ||
      "Payroll finalized";

    run.finalizedAt =
      now;

    run.finalizedBy =
      actorUserId;

    run.updatedBy =
      actorUserId;

    await run.save();

    await EmployeePayroll
      .updateMany(
        {
          payrollRunId:
            run._id,
        },
        {
          $set: {
            status:
              "FINALIZED",

            locked:
              true,

            finalizedAt:
              now,

            finalizedBy:
              actorUserId,
          },
        }
      );

    await PayrollAdjustment
      .updateMany(
        {
          consumedByPayrollId: {
            $in:
              await EmployeePayroll
                .find({
                  payrollRunId:
                    run._id,
                })
                .distinct(
                  "_id"
                ),
          },

          status:
            "APPROVED",
        },
        {
          $set: {
            status:
              "CONSUMED",
          },
        }
      );

    return run;
  };

/* =========================================================
   QUERIES
========================================================= */

const getPayrollRun =
  async (
    payrollRunId
  ) => {
    const run =
      await PayrollRun
        .findById(
          payrollRunId
        )
        .populate(
          "policyId",
          "name companyCode calculationBasis"
        )
        .lean();

    if (
      !run
    ) {
      throw createError(
        "Payroll run not found.",
        404
      );
    }

    return run;
  };

const listPayrollRuns =
  async ({
    companyCode,
    payrollMonth,
    status,
  } = {}) => {
    const query = {};

    if (
      companyCode
    ) {
      query.companyCode =
        String(
          companyCode
        ).toUpperCase();
    }

    if (
      payrollMonth
    ) {
      query.payrollMonth =
        payrollMonth;
    }

    if (
      status
    ) {
      query.status =
        String(
          status
        ).toUpperCase();
    }

    return PayrollRun
      .find(query)
      .sort({
        payrollMonth:
          -1,
        companyCode:
          1,
      })
      .lean();
  };

const getPayrollRegister =
  async ({
    payrollRunId,
    search = "",
    status,
    page = 1,
    limit = 100,
  }) => {
    const query = {
      payrollRunId,
    };

    if (
      status
    ) {
      query.status =
        String(
          status
        ).toUpperCase();
    }

    if (
      String(
        search ||
        ""
      ).trim()
    ) {
      const regex =
        new RegExp(
          String(search)
            .trim()
            .replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            ),
          "i"
        );

      query.$or = [
        {
          "employeeSnapshot.employeeName":
            regex,
        },
        {
          "employeeSnapshot.employeeCode":
            regex,
        },
      ];
    }

    const safePage =
      Math.max(
        1,
        Number(page) ||
        1
      );

    const safeLimit =
      Math.min(
        500,
        Math.max(
          1,
          Number(limit) ||
          100
        )
      );

    const [
      items,
      total,
    ] =
      await Promise.all([
        EmployeePayroll
          .find(query)
          .sort({
            "employeeSnapshot.employeeName":
              1,
          })
          .skip(
            (
              safePage -
              1
            ) *
              safeLimit
          )
          .limit(
            safeLimit
          )
          .lean(),

        EmployeePayroll
          .countDocuments(
            query
          ),
      ]);

    return {
      items,
      total,
      page:
        safePage,
      limit:
        safeLimit,
      pages:
        Math.ceil(
          total /
            safeLimit
        ),
    };
  };

const getEmployeePayroll =
  async (
    employeePayrollId
  ) => {
    const payroll =
      await EmployeePayroll
        .findById(
          employeePayrollId
        )
        .lean();

    if (
      !payroll
    ) {
      throw createError(
        "Employee payroll not found.",
        404
      );
    }

    return payroll;
  };

const getEmployeePayslips =
  async (
    employeeId
  ) => {
    return EmployeePayroll
      .find({
        employeeId,

        status:
          "FINALIZED",

        locked:
          true,
      })
      .select(
        "payrollMonth employeeSnapshot salarySnapshot attendanceSnapshot money finalizedAt"
      )
      .sort({
        payrollMonth:
          -1,
      })
      .lean();
  };

/* =========================================================
   EMPLOYEE BY USER
========================================================= */

const getEmployeeByUser =
  async (
    userId
  ) => {
    return Employee
      .findOne({
        user:
          userId,

        status: {
          $ne:
            "EXITED",
        },
      })
      .lean();
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  createPayrollPolicy,
  updatePayrollPolicy,
  getPayrollPolicies,

  createSalaryStructure,
  activateSalaryStructure,
  getSalaryHistory,
  getCurrentSalary,

  createAdjustment,
  approveAdjustment,

  createPayrollRun,
  generatePayroll,
  updateEmployeePayrollReview,
  submitPayrollForReview,
  approvePayroll,
  finalizePayroll,

  getPayrollRun,
  listPayrollRuns,
  getPayrollRegister,
  getEmployeePayroll,
  getEmployeePayslips,
  getEmployeeByUser,
};
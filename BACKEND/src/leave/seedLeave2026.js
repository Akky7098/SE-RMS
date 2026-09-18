require("dotenv").config();

const mongoose =
  require("mongoose");

const {
  Employee,
} =
  require(
    "../employee/employee.model"
  );

const {
  LeaveType,
} =
  require(
    "./leaveType.model"
  );

const {
  LeavePolicy,
} =
  require(
    "./leavePolicy.model"
  );

const LeaveBalance =
  require(
    "./leaveBalance.model"
  );

/* =========================================================
   CONFIGURATION
========================================================= */

const YEAR =
  2026;

const COMPANY_CODE =
  "SE";

const EFFECTIVE_FROM =
  "2026-01-01";

const EFFECTIVE_TO =
  "2026-12-31";

/*
 * =========================================================
 * COMMON STARTING BALANCE FOR ALL ACTIVE EMPLOYEES
 * =========================================================
 *
 * Change these values here if management decides to give
 * everybody a different common opening balance.
 *
 * PL = 0 because policy-based PL normally depends on
 * previous-year worked days.
 *
 * CL = 7
 * SL = 7
 * COMP_OFF = 0
 */

const STARTING_BALANCES = {
  PL: 0,
  CL: 7,
  SL: 7,
  COMP_OFF: 0,
};

/* =========================================================
   LEAVE TYPE MASTER
========================================================= */

const LEAVE_TYPES =
  [
    {
      code:
        "PL",

      name:
        "Privilege Leave",

      shortName:
        "PL",

      description:
        "Earned / Privilege Leave as per company leave policy.",

      category:
        "PAID",

      isPaid:
        true,

      requiresBalance:
        true,

      allowHalfDay:
        false,

      allowNegativeBalance:
        false,

      requiresReason:
        true,

      supportsAttachment:
        false,

      active:
        true,

      displayOrder:
        1,
    },

    {
      code:
        "CL",

      name:
        "Casual Leave",

      shortName:
        "CL",

      description:
        "Casual Leave for short personal requirements.",

      category:
        "PAID",

      isPaid:
        true,

      requiresBalance:
        true,

      allowHalfDay:
        false,

      allowNegativeBalance:
        false,

      requiresReason:
        true,

      supportsAttachment:
        false,

      active:
        true,

      displayOrder:
        2,
    },

    {
      code:
        "SL",

      name:
        "Sick Leave",

      shortName:
        "SL",

      description:
        "Sick Leave subject to company medical leave policy.",

      category:
        "PAID",

      isPaid:
        true,

      requiresBalance:
        true,

      allowHalfDay:
        false,

      allowNegativeBalance:
        false,

      requiresReason:
        true,

      supportsAttachment:
        true,

      active:
        true,

      displayOrder:
        3,
    },

    {
      code:
        "MATERNITY",

      name:
        "Maternity Leave",

      shortName:
        "Maternity",

      description:
        "Maternity Leave subject to approved company policy.",

      category:
        "STATUTORY",

      isPaid:
        true,

      /*
       * No separate balance is initialized until the
       * approved maternity entitlement is configured.
       */
      requiresBalance:
        false,

      allowHalfDay:
        false,

      allowNegativeBalance:
        false,

      requiresReason:
        true,

      supportsAttachment:
        true,

      active:
        true,

      displayOrder:
        4,
    },

    {
      code:
        "COMP_OFF",

      name:
        "Compensatory Off",

      shortName:
        "Comp Off",

      description:
        "Compensatory Off against an eligible approved weekly off or public holiday worked.",

      category:
        "COMPENSATORY",

      isPaid:
        true,

      requiresBalance:
        true,

      allowHalfDay:
        false,

      allowNegativeBalance:
        false,

      requiresReason:
        true,

      supportsAttachment:
        false,

      active:
        true,

      displayOrder:
        5,
    },

    {
      code:
        "BEREAVEMENT",

      name:
        "Bereavement Leave",

      shortName:
        "Bereavement",

      description:
        "Bereavement Leave for eligible immediate family circumstances.",

      category:
        "PAID",

      /*
       * Policy says this is adjusted against EL / PL.
       * Therefore no separate fixed balance is created.
       */
      requiresBalance:
        false,

      isPaid:
        true,

      allowHalfDay:
        false,

      allowNegativeBalance:
        false,

      requiresReason:
        true,

      supportsAttachment:
        false,

      active:
        true,

      displayOrder:
        6,
    },

    {
      code:
        "LWP",

      name:
        "Leave Without Pay",

      shortName:
        "LWP",

      description:
        "Leave Without Pay subject to management approval.",

      category:
        "UNPAID",

      isPaid:
        false,

      requiresBalance:
        false,

      allowHalfDay:
        false,

      allowNegativeBalance:
        true,

      requiresReason:
        true,

      supportsAttachment:
        false,

      active:
        true,

      displayOrder:
        7,
    },
  ];

/* =========================================================
   HELPERS
========================================================= */

const calculateAvailable =
  ({
    openingBalance = 0,

    carriedForward = 0,

    accrued = 0,

    adjustment = 0,

    used = 0,

    pending = 0,

    expired = 0,
  }) => {
    return (
      Number(
        openingBalance ||
          0
      ) +
      Number(
        carriedForward ||
          0
      ) +
      Number(
        accrued ||
          0
      ) +
      Number(
        adjustment ||
          0
      ) -
      Number(
        used ||
          0
      ) -
      Number(
        pending ||
          0
      ) -
      Number(
        expired ||
          0
      )
    );
  };

/* =========================================================
   FIND SYSTEM USER
========================================================= */

const getSeedUserId =
  () => {
    const userId =
      process.argv[2];

    if (!userId) {
      throw new Error(
        "Admin User ID is required.\n" +
        "Run: node src/leave/seedLeave2026.js <USER_ID>"
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        userId
      )
    ) {
      throw new Error(
        `Invalid User ID: ${userId}`
      );
    }

    return new mongoose.Types.ObjectId(
      userId
    );
  };

/* =========================================================
   SEED LEAVE TYPES
========================================================= */

const seedLeaveTypes =
  async (
    seedUserId
  ) => {
    console.log(
      "\n=========================================="
    );

    console.log(
      "[1/3] SEEDING LEAVE TYPES"
    );

    console.log(
      "=========================================="
    );

    const typeMap =
      {};

    for (
      const definition
      of LEAVE_TYPES
    ) {
      const leaveType =
        await LeaveType
          .findOneAndUpdate(
            {
              code:
                definition
                  .code,
            },

            {
              $set: {
                ...definition,

                updatedBy:
                  seedUserId,
              },

              $setOnInsert: {
                createdBy:
                  seedUserId,
              },
            },

            {
              upsert:
                true,

              new:
                true,

              runValidators:
                true,

              setDefaultsOnInsert:
                true,
            }
          );

      typeMap[
        definition.code
      ] =
        leaveType;

      console.log(
        `✓ ${definition.code.padEnd(
          12
        )} ${definition.name}`
      );
    }

    return typeMap;
  };

/* =========================================================
   POLICY HELPER
========================================================= */

const upsertPolicy =
  async ({
    leaveType,
    name,
    seedUserId,
    ...policy
  }) => {
    await LeavePolicy
      .findOneAndUpdate(
        {
          leaveTypeId:
            leaveType._id,

          companyCode:
            COMPANY_CODE,

          effectiveFrom:
            EFFECTIVE_FROM,
        },

        {
          $set: {
            leaveTypeId:
              leaveType._id,

            companyCode:
              COMPANY_CODE,

            name,

            ...policy,

            effectiveFrom:
              EFFECTIVE_FROM,

            effectiveTo:
              EFFECTIVE_TO,

            active:
              true,

            updatedBy:
              seedUserId,
          },

          $setOnInsert: {
            createdBy:
              seedUserId,
          },
        },

        {
          upsert:
            true,

          new:
            true,

          runValidators:
            true,

          setDefaultsOnInsert:
            true,
        }
      );

    console.log(
      `✓ ${name}`
    );
  };

/* =========================================================
   SEED 2026 POLICIES
========================================================= */

const seedPolicies =
  async (
    typeMap,
    seedUserId
  ) => {
    console.log(
      "\n=========================================="
    );

    console.log(
      "[2/3] SEEDING 2026 LEAVE POLICIES"
    );

    console.log(
      "=========================================="
    );

    /* =====================================================
       PRIVILEGE LEAVE
    ===================================================== */

    await upsertPolicy({
      leaveType:
        typeMap.PL,

      name:
        "Privilege Leave Policy 2026",

      seedUserId,

      annualEntitlement:
        0,

      accrualType:
        "WORKED_DAYS",

      monthlyAccrual:
        0,

      workedDaysThreshold:
        240,

      earnedPerWorkedDays:
        20,

      earnedDaysPerUnit:
        1,

      proRataEnabled:
        false,

      carryForwardAllowed:
        true,

      maxCarryForward:
        30,

      maxBalance:
        30,

      maxConsecutiveDays:
        null,

      minLeaveDays:
        1,

      advanceNoticeDays:
        7,

      allowHalfDay:
        false,

      countWeekOffs:
        true,

      countHolidays:
        true,

      attachmentRequired:
        false,

      attachmentRequiredAfterDays:
        null,

      confirmedEmployeeOnly:
        false,

      minimumServiceDays:
        0,

      genderEligibility:
        "ALL",

      eligibleEmploymentTypes:
        [],

      eligibleOrgUnitCodes:
        [],

      compOffValidityDays:
        null,

      allowDuringNoticePeriod:
        false,

      allowEmergencyOverride:
        true,

      notes:
        "Eligibility after 240 or more days worked in the previous calendar year. Earned at one day for every 20 days worked. Maximum carry forward 30 days. Normal application requires 7 days advance notice.",
    });

    /* =====================================================
       CASUAL LEAVE
    ===================================================== */

    await upsertPolicy({
      leaveType:
        typeMap.CL,

      name:
        "Casual Leave Policy 2026",

      seedUserId,

      annualEntitlement:
        7,

      accrualType:
        "ANNUAL",

      monthlyAccrual:
        0,

      workedDaysThreshold:
        null,

      earnedPerWorkedDays:
        null,

      earnedDaysPerUnit:
        null,

      proRataEnabled:
        false,

      carryForwardAllowed:
        false,

      maxCarryForward:
        0,

      maxBalance:
        7,

      maxConsecutiveDays:
        2,

      minLeaveDays:
        1,

      advanceNoticeDays:
        0,

      allowHalfDay:
        false,

      /*
       * CL is the documented exception to the general
       * holiday / weekly-off counting rule.
       */
      countWeekOffs:
        false,

      countHolidays:
        false,

      attachmentRequired:
        false,

      attachmentRequiredAfterDays:
        null,

      confirmedEmployeeOnly:
        false,

      minimumServiceDays:
        0,

      genderEligibility:
        "ALL",

      eligibleEmploymentTypes:
        [],

      eligibleOrgUnitCodes:
        [],

      compOffValidityDays:
        null,

      allowDuringNoticePeriod:
        false,

      allowEmergencyOverride:
        true,

      notes:
        "7 days per calendar year. Normally maximum 2 days at one time. Non-cumulative and lapses at year end. Cannot normally be prefixed or suffixed with another leave type without prior written permission.",
    });

    /* =====================================================
       SICK LEAVE
    ===================================================== */

    await upsertPolicy({
      leaveType:
        typeMap.SL,

      name:
        "Sick Leave Policy 2026",

      seedUserId,

      annualEntitlement:
        7,

      accrualType:
        "PRO_RATA",

      monthlyAccrual:
        0,

      workedDaysThreshold:
        null,

      earnedPerWorkedDays:
        null,

      earnedDaysPerUnit:
        null,

      proRataEnabled:
        true,

      carryForwardAllowed:
        false,

      maxCarryForward:
        0,

      maxBalance:
        7,

      maxConsecutiveDays:
        null,

      minLeaveDays:
        1,

      advanceNoticeDays:
        0,

      allowHalfDay:
        false,

      countWeekOffs:
        true,

      countHolidays:
        true,

      attachmentRequired:
        false,

      /*
       * > 2 consecutive days requires medical certificate.
       */
      attachmentRequiredAfterDays:
        2,

      confirmedEmployeeOnly:
        false,

      minimumServiceDays:
        0,

      genderEligibility:
        "ALL",

      eligibleEmploymentTypes:
        [],

      eligibleOrgUnitCodes:
        [],

      compOffValidityDays:
        null,

      allowDuringNoticePeriod:
        false,

      allowEmergencyOverride:
        true,

      notes:
        "7 days per calendar year on a pro-rata basis. Sick Leave exceeding 2 consecutive days requires a medical certificate. Unused Sick Leave lapses at year end.",
    });

    /* =====================================================
       COMPENSATORY OFF
    ===================================================== */

    await upsertPolicy({
      leaveType:
        typeMap.COMP_OFF,

      name:
        "Compensatory Off Policy 2026",

      seedUserId,

      annualEntitlement:
        0,

      accrualType:
        "MANUAL",

      monthlyAccrual:
        0,

      workedDaysThreshold:
        null,

      earnedPerWorkedDays:
        null,

      earnedDaysPerUnit:
        null,

      proRataEnabled:
        false,

      carryForwardAllowed:
        false,

      maxCarryForward:
        0,

      maxBalance:
        null,

      maxConsecutiveDays:
        null,

      minLeaveDays:
        1,

      advanceNoticeDays:
        0,

      allowHalfDay:
        false,

      countWeekOffs:
        true,

      countHolidays:
        true,

      attachmentRequired:
        false,

      attachmentRequiredAfterDays:
        null,

      confirmedEmployeeOnly:
        false,

      minimumServiceDays:
        0,

      genderEligibility:
        "ALL",

      eligibleEmploymentTypes:
        [],

      eligibleOrgUnitCodes:
        [],

      /*
       * Current implementation stores two months as
       * approximately 60 days.
       *
       * Exact calendar-month expiry can later be enforced
       * by the Comp Off credit service.
       */
      compOffValidityDays:
        60,

      allowDuringNoticePeriod:
        false,

      allowEmergencyOverride:
        false,

      notes:
        "Eligible supervisory-level and above employees working on a designated weekly off or public holiday may receive Compensatory Off. It must be availed within two months from the due date with prior approval.",
    });

    /*
     * =====================================================
     * MATERNITY / BEREAVEMENT / LWP
     * =====================================================
     *
     * Their LeaveType records are created so they appear
     * in the master.
     *
     * We DO NOT invent missing policy entitlement values.
     *
     * Maternity:
     * supplied policy details were incomplete.
     *
     * Bereavement:
     * supplied policy did not state a fixed number of days
     * and says adjustment is against EL / PL.
     *
     * LWP:
     * no fixed balance; management discretion after
     * applicable balances are exhausted.
     */
  };

/* =========================================================
   SEED EMPLOYEE BALANCES
========================================================= */

const seedBalances =
  async (
    typeMap
  ) => {
    console.log(
      "\n=========================================="
    );

    console.log(
      "[3/3] SEEDING EMPLOYEE BALANCES"
    );

    console.log(
      "=========================================="
    );

    const employees =
      await Employee
        .find({
          status:
            "ACTIVE",
        })
        .select(
          "_id employeeCode fullName status"
        )
        .sort({
          employeeCode:
            1,
        })
        .lean();

    console.log(
      `Active employees found: ${employees.length}`
    );

    if (
      !employees.length
    ) {
      console.log(
        "No active employees found."
      );

      return {
        employees:
          0,

        balances:
          0,
      };
    }

    let balanceCount =
      0;

    for (
      const employee
      of employees
    ) {
      console.log(
        `\n${employee.employeeCode || "NO-CODE"} - ${employee.fullName || "Unnamed Employee"}`
      );

      for (
        const [
          code,
          openingBalance,
        ]
        of Object.entries(
          STARTING_BALANCES
        )
      ) {
        const leaveType =
          typeMap[
            code
          ];

        if (
          !leaveType
        ) {
          throw new Error(
            `Leave type ${code} is missing from the leave master.`
          );
        }

        const balanceData = {
          openingBalance:
            Number(
              openingBalance ||
                0
            ),

          carriedForward:
            0,

          accrued:
            0,

          adjustment:
            0,

          used:
            0,

          pending:
            0,

          expired:
            0,
        };

        const available =
          calculateAvailable(
            balanceData
          );

        await LeaveBalance
          .findOneAndUpdate(
            {
              employeeId:
                employee._id,

              leaveTypeId:
                leaveType._id,

              year:
                YEAR,
            },

            {
              $set: {
                ...balanceData,

                available,

                lastCalculatedAt:
                  new Date(),
              },
            },

            {
              upsert:
                true,

              new:
                true,

              runValidators:
                true,

              setDefaultsOnInsert:
                true,
            }
          );

        balanceCount +=
          1;

        console.log(
          `   ✓ ${code.padEnd(
            10
          )} ${String(
            available
          ).padStart(
            5
          )} day(s)`
        );
      }
    }

    return {
      employees:
        employees.length,

      balances:
        balanceCount,
    };
  };

/* =========================================================
   MAIN SEED
========================================================= */

const seedLeave2026 =
  async () => {
    console.log(
      "\n"
    );

    console.log(
      "=============================================="
    );

    console.log(
      "        SE-RMS LEAVE MANAGEMENT 2026"
    );

    console.log(
      "=============================================="
    );

    console.log(
      `Year          : ${YEAR}`
    );

    console.log(
      `Company       : ${COMPANY_CODE}`
    );

    console.log(
      `Effective From: ${EFFECTIVE_FROM}`
    );

    console.log(
      `Effective To  : ${EFFECTIVE_TO}`
    );

    console.log(
      "=============================================="
    );

    const seedUserId =
  getSeedUserId();

    console.log(
      `Seed User     : ${seedUserId}`
    );

    const typeMap =
      await seedLeaveTypes(
        seedUserId
      );

    await seedPolicies(
      typeMap,
      seedUserId
    );

    const balanceResult =
      await seedBalances(
        typeMap
      );

    console.log(
      "\n=============================================="
    );

    console.log(
      "        LEAVE 2026 SEED COMPLETED"
    );

    console.log(
      "=============================================="
    );

    console.log(
      `Leave Types : ${LEAVE_TYPES.length}`
    );

    console.log(
      "Policies    : 4"
    );

    console.log(
      `Employees   : ${balanceResult.employees}`
    );

    console.log(
      `Balances    : ${balanceResult.balances}`
    );

    console.log(
      "----------------------------------------------"
    );

    console.log(
      `PL          : ${STARTING_BALANCES.PL}`
    );

    console.log(
      `CL          : ${STARTING_BALANCES.CL}`
    );

    console.log(
      `SL          : ${STARTING_BALANCES.SL}`
    );

    console.log(
      `COMP OFF    : ${STARTING_BALANCES.COMP_OFF}`
    );

    console.log(
      "=============================================="
    );
  };

/* =========================================================
   DATABASE CONNECTION
========================================================= */

const run =
  async () => {
    const mongoUri =
      process.env
        .MONGO_URI ||
      process.env
        .MONGODB_URI;

    if (
      !mongoUri
    ) {
      throw new Error(
        "MONGO_URI or MONGODB_URI is missing from .env"
      );
    }

    console.log(
      "[Leave Seed] Connecting to MongoDB..."
    );

    await mongoose.connect(
      mongoUri
    );

    console.log(
      "[Leave Seed] MongoDB connected."
    );

    try {
      await seedLeave2026();
    } finally {
      await mongoose.disconnect();

      console.log(
        "\n[Leave Seed] MongoDB disconnected."
      );
    }
  };

/* =========================================================
   CLI
========================================================= */

if (
  require.main ===
  module
) {
  run()
    .then(() => {
      process.exit(0);
    })
    .catch(
      (error) => {
        console.error(
          "\n=============================================="
        );

        console.error(
          "LEAVE 2026 SEED FAILED"
        );

        console.error(
          "=============================================="
        );

        console.error(
          error
        );

        process.exit(1);
      }
    );
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  seedLeave2026,

  STARTING_BALANCES,

  LEAVE_TYPES,
};
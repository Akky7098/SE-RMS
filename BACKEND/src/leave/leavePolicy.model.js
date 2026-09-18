const mongoose =
  require("mongoose");

const {
  Schema,
} = mongoose;

/* =========================================================
   CONSTANTS
========================================================= */

const ACCRUAL_TYPES = [
  "NONE",
  "ANNUAL",
  "MONTHLY",
  "PRO_RATA",
  "WORKED_DAYS",
  "MANUAL",
];

const GENDER_ELIGIBILITY = [
  "ALL",
  "MALE",
  "FEMALE",
  "OTHER",
];

/* =========================================================
   SCHEMA
========================================================= */

const leavePolicySchema =
  new Schema(
    {
      leaveTypeId: {
        type: Schema.Types.ObjectId,
        ref: "LeaveType",
        required: true,
        index: true,
      },

      companyCode: {
        type: String,
        trim: true,
        uppercase: true,
        default: "SE",
        index: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },

      /* =====================================================
         ENTITLEMENT / ACCRUAL
      ===================================================== */

      annualEntitlement: {
        type: Number,
        default: 0,
        min: 0,
      },

      accrualType: {
        type: String,
        enum: ACCRUAL_TYPES,
        default: "ANNUAL",
      },

      monthlyAccrual: {
        type: Number,
        default: 0,
        min: 0,
      },

      workedDaysThreshold: {
        type: Number,
        default: null,
        min: 0,
      },

      earnedPerWorkedDays: {
        type: Number,
        default: null,
        min: 1,
      },

      earnedDaysPerUnit: {
        type: Number,
        default: null,
        min: 0,
      },

      proRataEnabled: {
        type: Boolean,
        default: false,
      },

      /* =====================================================
         CARRY FORWARD / EXPIRY
      ===================================================== */

      carryForwardAllowed: {
        type: Boolean,
        default: false,
      },

      maxCarryForward: {
        type: Number,
        default: 0,
        min: 0,
      },

      /*
       * true:
       * unused balance lapses at the end of the policy year.
       *
       * CL and SL = true for the documented policy.
       */
      lapseAtYearEnd: {
        type: Boolean,
        default: false,
      },

      maxBalance: {
        type: Number,
        default: null,
        min: 0,
      },

      /* =====================================================
         REQUEST LIMITS
      ===================================================== */

      maxConsecutiveDays: {
        type: Number,
        default: null,
        min: 0.5,
      },

      minLeaveDays: {
        type: Number,
        default: 1,
        min: 0.5,
      },

      advanceNoticeDays: {
        type: Number,
        default: 0,
        min: 0,
      },

      allowHalfDay: {
        type: Boolean,
        default: false,
      },

      /*
       * CL policy:
       * cannot normally be prefixed/suffixed with another
       * leave type without prior written permission.
       */
      restrictAdjacentDifferentLeaveType: {
        type: Boolean,
        default: false,
      },

      allowAdjacentLeaveWithApproval: {
        type: Boolean,
        default: false,
      },

      /* =====================================================
         WEEK OFF / HOLIDAY
      ===================================================== */

      countWeekOffs: {
        type: Boolean,
        default: true,
      },

      countHolidays: {
        type: Boolean,
        default: true,
      },

      /* =====================================================
         DOCUMENTS
      ===================================================== */

      attachmentRequired: {
        type: Boolean,
        default: false,
      },

      attachmentRequiredAfterDays: {
        type: Number,
        default: null,
        min: 0,
      },

      /* =====================================================
         EMPLOYEE ELIGIBILITY
      ===================================================== */

      confirmedEmployeeOnly: {
        type: Boolean,
        default: false,
      },

      minimumServiceDays: {
        type: Number,
        default: 0,
        min: 0,
      },

      genderEligibility: {
        type: String,
        enum: GENDER_ELIGIBILITY,
        default: "ALL",
      },

      eligibleEmploymentTypes: [
        {
          type: String,
          trim: true,
          uppercase: true,
        },
      ],

      eligibleOrgUnitCodes: [
        {
          type: String,
          trim: true,
          uppercase: true,
        },
      ],

      /* =====================================================
         COMPENSATORY OFF
      ===================================================== */

      compOffValidityDays: {
        type: Number,
        default: null,
        min: 1,
      },

      compOffRequiresEarnedCredit: {
        type: Boolean,
        default: false,
      },

      /* =====================================================
         NOTICE / EMERGENCY
      ===================================================== */

      allowDuringNoticePeriod: {
        type: Boolean,
        default: false,
      },

      allowEmergencyOverride: {
        type: Boolean,
        default: false,
      },

      /* =====================================================
         EFFECTIVE PERIOD
      ===================================================== */

      effectiveFrom: {
        type: String,
        required: true,
        match:
          /^\d{4}-\d{2}-\d{2}$/,
      },

      effectiveTo: {
        type: String,
        default: null,
        validate: {
          validator:
            function (
              value
            ) {
              return (
                !value ||
                /^\d{4}-\d{2}-\d{2}$/
                  .test(value)
              );
            },

          message:
            "effectiveTo must use YYYY-MM-DD format.",
        },
      },

      active: {
        type: Boolean,
        default: true,
        index: true,
      },

      notes: {
        type: String,
        trim: true,
        default: "",
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

/* =========================================================
   VALIDATION
========================================================= */

leavePolicySchema.pre(
  "validate",
  function (
    next
  ) {
    if (
      this.effectiveFrom &&
      this.effectiveTo &&
      this.effectiveTo <
        this.effectiveFrom
    ) {
      return next(
        new Error(
          "Policy effectiveTo cannot be before effectiveFrom."
        )
      );
    }

    return next();
  }
);

/* =========================================================
   INDEXES
========================================================= */

leavePolicySchema.index({
  leaveTypeId: 1,
  companyCode: 1,
  effectiveFrom: -1,
});

leavePolicySchema.index({
  active: 1,
  effectiveFrom: 1,
  effectiveTo: 1,
});

/* =========================================================
   MODEL
========================================================= */

const LeavePolicy =
  mongoose.models.LeavePolicy ||
  mongoose.model(
    "LeavePolicy",
    leavePolicySchema
  );

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  LeavePolicy,

  ACCRUAL_TYPES,

  GENDER_ELIGIBILITY,
};
const mongoose =
  require(
    "mongoose"
  );

const {
  Schema,
} = mongoose;

/* =========================================================
   ATTENDANCE POLICY
========================================================= */

const attendancePolicySchema =
  new Schema(
    {
      /* =====================================================
         IDENTITY
      ===================================================== */

      name: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          120,
      },

      code: {
        type:
          String,

        required:
          true,

        trim:
          true,

        uppercase:
          true,

        unique:
          true,

        index:
          true,

        maxlength:
          80,
      },

      /* =====================================================
         OFFICE

         Null = organization/global policy.
      ===================================================== */

      officeId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Office",

        default:
          null,

        index:
          true,
      },

      /* =====================================================
         GRACE
      ===================================================== */

      lateGraceMinutes: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      earlyExitGraceMinutes: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      /* =====================================================
         WORKING TIME
      ===================================================== */

      minimumFullDayMinutes: {
        type:
          Number,

        default:
          480,

        min:
          0,
      },

      minimumHalfDayMinutes: {
        type:
          Number,

        default:
          240,

        min:
          0,
      },

      /*
       * If zero, shift.requiredMinutes is used.
       */
      requiredWorkingMinutes: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      /* =====================================================
         OVERTIME
      ===================================================== */

      overtimeEnabled: {
        type:
          Boolean,

        default:
          false,
      },

      overtimeAfterMinutes: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      minimumOvertimeMinutes: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      /* =====================================================
         MISSING PUNCH POLICY
      ===================================================== */

      singlePunchCountsAsPresent: {
        type:
          Boolean,

        default:
          true,
      },

      allowRegularization: {
        type:
          Boolean,

        default:
          true,
      },

      /* =====================================================
         WORK MODES
      ===================================================== */

      allowWFH: {
        type:
          Boolean,

        default:
          false,
      },

      allowFieldVisit: {
        type:
          Boolean,

        default:
          false,
      },

      allowOnDuty: {
        type:
          Boolean,

        default:
          false,
      },

      /* =====================================================
         LOCATION
      ===================================================== */

      requireWFHLocation: {
        type:
          Boolean,

        default:
          true,
      },

      requireFieldTracking: {
        type:
          Boolean,

        default:
          true,
      },

      fieldTrackingIntervalMinutes: {
        type:
          Number,

        default:
          30,

        min:
          1,
      },

      /* =====================================================
         STATUS
      ===================================================== */

      isDefault: {
        type:
          Boolean,

        default:
          false,

        index:
          true,
      },

      active: {
        type:
          Boolean,

        default:
          true,

        index:
          true,
      },

      description: {
        type:
          String,

        trim:
          true,

        default:
          "",

        maxlength:
          1000,
      },

      /* =====================================================
         AUDIT
      ===================================================== */

      createdBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      updatedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },
    },
    {
      timestamps:
        true,

      versionKey:
        false,

      minimize:
        false,
    }
  );

/* =========================================================
   VALIDATION
========================================================= */

attendancePolicySchema.pre(
  "validate",
  function () {
    if (
      typeof this.code ===
      "string"
    ) {
      this.code =
        this.code
          .trim()
          .toUpperCase();
    }

    if (
      this.minimumHalfDayMinutes >
      this.minimumFullDayMinutes
    ) {
      this.invalidate(
        "minimumHalfDayMinutes",
        "Half-day minutes cannot exceed full-day minutes."
      );
    }
  }
);

/* =========================================================
   INDEXES
========================================================= */

attendancePolicySchema.index({
  officeId:
    1,

  active:
    1,
});

attendancePolicySchema.index({
  isDefault:
    1,

  active:
    1,
});

/* =========================================================
   MODEL
========================================================= */

module.exports =
  mongoose.models
    .AttendancePolicy ||
  mongoose.model(
    "AttendancePolicy",
    attendancePolicySchema
  );
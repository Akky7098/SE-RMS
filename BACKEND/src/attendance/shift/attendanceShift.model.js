const mongoose =
  require(
    "mongoose"
  );

const {
  Schema,
} = mongoose;

/* =========================================================
   SHIFT TYPES
========================================================= */

const SHIFT_TYPES = [
  "GENERAL",
  "NIGHT",
  "FLEXIBLE",
  "ROTATIONAL",
  "CUSTOM",
];

/* =========================================================
   APPLICABLE GENDERS

   Used only to help default assignment.

   Attendance itself always uses assigned shift.
========================================================= */

const SHIFT_GENDERS = [
  "MALE",
  "FEMALE",
  "OTHER",
  "UNDISCLOSED",
];

/* =========================================================
   TIME
========================================================= */

const TIME_REGEX =
  /^([01]\d|2[0-3]):([0-5]\d)$/;

/* =========================================================
   ATTENDANCE SHIFT
========================================================= */

const attendanceShiftSchema =
  new Schema(
    {
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

      type: {
        type:
          String,

        enum:
          SHIFT_TYPES,

        default:
          "GENERAL",

        index:
          true,
      },

      /* =====================================================
         OFFICE

         null = reusable across offices.
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
         TIME
      ===================================================== */

      startTime: {
        type:
          String,

        required:
          true,

        trim:
          true,

        match:
          TIME_REGEX,
      },

      endTime: {
        type:
          String,

        required:
          true,

        trim:
          true,

        match:
          TIME_REGEX,
      },

      crossesMidnight: {
        type:
          Boolean,

        default:
          false,

        index:
          true,
      },

      timezone: {
        type:
          String,

        trim:
          true,

        default:
          "Asia/Kolkata",
      },

      utcOffsetMinutes: {
        type:
          Number,

        default:
          330,
      },

      requiredMinutes: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      punchWindowBeforeMinutes: {
        type:
          Number,

        default:
          180,

        min:
          0,
      },

      punchWindowAfterMinutes: {
        type:
          Number,

        default:
          240,

        min:
          0,
      },

      applicableGenders: {
        type: [
          String,
        ],

        enum:
          SHIFT_GENDERS,

        default:
          [],
      },

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
   CALCULATE NIGHT SHIFT
========================================================= */

attendanceShiftSchema.pre(
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
      TIME_REGEX.test(
        this.startTime ||
        ""
      ) &&
      TIME_REGEX.test(
        this.endTime ||
        ""
      )
    ) {
      const [
        startHour,
        startMinute,
      ] =
        this.startTime
          .split(":")
          .map(Number);

      const [
        endHour,
        endMinute,
      ] =
        this.endTime
          .split(":")
          .map(Number);

      const startMinutes =
        startHour *
          60 +
        startMinute;

      const endMinutes =
        endHour *
          60 +
        endMinute;

      this.crossesMidnight =
        endMinutes <=
        startMinutes;

      if (
        !this.requiredMinutes
      ) {
        this.requiredMinutes =
          this.crossesMidnight
            ? 1440 -
              startMinutes +
              endMinutes
            : endMinutes -
              startMinutes;
      }

      if (
        this.crossesMidnight &&
        this.type ===
          "GENERAL"
      ) {
        this.type =
          "NIGHT";
      }
    }
  }
);

/* =========================================================
   INDEXES
========================================================= */

attendanceShiftSchema.index({
  officeId:
    1,

  active:
    1,
});

attendanceShiftSchema.index({
  type:
    1,

  active:
    1,
});

/* =========================================================
   MODEL
========================================================= */

module.exports =
  mongoose.models
    .AttendanceShift ||
  mongoose.model(
    "AttendanceShift",
    attendanceShiftSchema
  );
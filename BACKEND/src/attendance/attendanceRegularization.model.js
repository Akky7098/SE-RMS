const mongoose =
  require(
    "mongoose"
  );

const {
  Schema,
} = mongoose;

/* =========================================================
   REGULARIZATION TYPES
========================================================= */

const REGULARIZATION_TYPES = [
  "MISSING_CHECK_IN",
  "MISSING_CHECK_OUT",
  "DEVICE_FAILURE",
  "INCORRECT_PUNCH",
  "OFFICIAL_WORK",
  "WFH",
  "FIELD_VISIT",
  "SHIFT_CORRECTION",
  "OTHER",
];

/* =========================================================
   STATUS
========================================================= */

const REGULARIZATION_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

/* =========================================================
   ATTENDANCE REGULARIZATION
========================================================= */

const attendanceRegularizationSchema =
  new Schema(
    {
      attendanceId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Attendance",

        required:
          true,

        index:
          true,
      },

      employeeId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Employee",

        required:
          true,

        index:
          true,
      },

      businessDate: {
        type:
          String,

        required:
          true,

        trim:
          true,

        match:
          /^\d{4}-\d{2}-\d{2}$/,

        index:
          true,
      },

      type: {
        type:
          String,

        enum:
          REGULARIZATION_TYPES,

        required:
          true,

        index:
          true,
      },

      /* =====================================================
         ORIGINAL ATTENDANCE SNAPSHOT
      ===================================================== */

      original: {
        firstInAt: {
          type:
            Date,

          default:
            null,
        },

        lastOutAt: {
          type:
            Date,

          default:
            null,
        },

        workMode: {
          type:
            String,

          default:
            null,
        },

        shiftId: {
          type:
            Schema.Types.ObjectId,

          ref:
            "AttendanceShift",

          default:
            null,
        },

        presenceStatus: {
          type:
            String,

          default:
            null,
        },

        totalWorkingMinutes: {
          type:
            Number,

          default:
            0,
        },
      },

      /* =====================================================
         REQUESTED CORRECTION
      ===================================================== */

      requested: {
        firstInAt: {
          type:
            Date,

          default:
            null,
        },

        lastOutAt: {
          type:
            Date,

          default:
            null,
        },

        workMode: {
          type:
            String,

          enum: [
            "OFFICE",
            "WFH",
            "FIELD_VISIT",
            "ON_DUTY",
            null,
          ],

          default:
            null,
        },

        shiftId: {
          type:
            Schema.Types.ObjectId,

          ref:
            "AttendanceShift",

          default:
            null,
        },
      },

      reason: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          2000,
      },

      attachmentUrl: {
        type:
          String,

        trim:
          true,

        default:
          null,
      },

      /* =====================================================
         WORKFLOW
      ===================================================== */

      status: {
        type:
          String,

        enum:
          REGULARIZATION_STATUSES,

        default:
          "PENDING",

        index:
          true,
      },

      requestedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required:
          true,

        index:
          true,
      },

      requestedAt: {
        type:
          Date,

        default:
          Date.now,
      },

      reviewedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      reviewedAt: {
        type:
          Date,

        default:
          null,
      },

      reviewRemarks: {
        type:
          String,

        trim:
          true,

        default:
          "",

        maxlength:
          2000,
      },

      /* =====================================================
         RESULT SNAPSHOT AFTER APPROVAL
      ===================================================== */

      recalculated: {
        firstInAt: {
          type:
            Date,

          default:
            null,
        },

        lastOutAt: {
          type:
            Date,

          default:
            null,
        },

        presenceStatus: {
          type:
            String,

          default:
            null,
        },

        totalWorkingMinutes: {
          type:
            Number,

          default:
            0,
        },

        lateMinutes: {
          type:
            Number,

          default:
            0,
        },

        earlyExitMinutes: {
          type:
            Number,

          default:
            0,
        },
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
   INDEXES
========================================================= */

attendanceRegularizationSchema.index({
  employeeId:
    1,

  businessDate:
    1,
});

attendanceRegularizationSchema.index({
  status:
    1,

  requestedAt:
    1,
});

attendanceRegularizationSchema.index({
  attendanceId:
    1,

  status:
    1,
});

/*
 * Avoid more than one pending request for the same
 * attendance record.
 */
attendanceRegularizationSchema.index(
  {
    attendanceId:
      1,

    status:
      1,
  },
  {
    unique:
      true,

    partialFilterExpression: {
      status:
        "PENDING",
    },
  }
);

/* =========================================================
   MODEL
========================================================= */

module.exports =
  mongoose.models
    .AttendanceRegularization ||
  mongoose.model(
    "AttendanceRegularization",
    attendanceRegularizationSchema
  );
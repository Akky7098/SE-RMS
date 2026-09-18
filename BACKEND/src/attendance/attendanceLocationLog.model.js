const mongoose =
  require(
    "mongoose"
  );

const {
  Schema,
} = mongoose;

/* =========================================================
   LOCATION SOURCES
========================================================= */

const LOCATION_LOG_SOURCES = [
  "CHECK_IN",
  "PERIODIC",
  "FOREGROUND",
  "MANUAL_REFRESH",
  "CHECK_OUT",
];

/* =========================================================
   LOCATION WORK MODES
========================================================= */

const LOCATION_WORK_MODES = [
  "WFH",
  "FIELD_VISIT",
  "ON_DUTY",
];

/* =========================================================
   LOCATION TYPE
========================================================= */

const LOCATION_TYPES = [
  "OFFICE",
  "OUTSIDE_OFFICE",
  "UNKNOWN",
];

/* =========================================================
   ATTENDANCE LOCATION LOG

   ONE DOCUMENT = ONE GPS CHECKPOINT.

   Periodic location history must never be embedded inside
   Attendance because it could become very large.
========================================================= */

const attendanceLocationLogSchema =
  new Schema(
    {
      /* =====================================================
         EMPLOYEE
      ===================================================== */

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

      userId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,

        index:
          true,
      },

      /* =====================================================
         ATTENDANCE
      ===================================================== */

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

      /* =====================================================
         LOCATION CAPTURE
      ===================================================== */

      capturedAt: {
        type:
          Date,

        default:
          Date.now,

        required:
          true,

        index:
          true,
      },

      latitude: {
        type:
          Number,

        required:
          true,

        min:
          -90,

        max:
          90,
      },

      longitude: {
        type:
          Number,

        required:
          true,

        min:
          -180,

        max:
          180,
      },

      accuracyMeters: {
        type:
          Number,

        default:
          null,

        min:
          0,
      },

      /* =====================================================
         CAPTURE SOURCE
      ===================================================== */

      source: {
        type:
          String,

        enum:
          LOCATION_LOG_SOURCES,

        default:
          "PERIODIC",

        index:
          true,
      },

      workMode: {
        type:
          String,

        enum:
          LOCATION_WORK_MODES,

        required:
          true,

        index:
          true,
      },

      /* =====================================================
         OFFICE RELATIONSHIP
      ===================================================== */

      officeId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "AttendanceOffice",

        default:
          null,

        index:
          true,
      },

      distanceFromOfficeMeters: {
        type:
          Number,

        default:
          null,

        min:
          0,
      },

      isWithinOffice: {
        type:
          Boolean,

        default:
          false,

        index:
          true,
      },

      locationType: {
        type:
          String,

        enum:
          LOCATION_TYPES,

        default:
          "UNKNOWN",

        index:
          true,
      },

      /* =====================================================
         LOCATION DISPLAY
      ===================================================== */

      locationAddress: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      /* =====================================================
         REQUEST / DEVICE INFORMATION
      ===================================================== */

      ipAddress: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      userAgent: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      deviceType: {
        type:
          String,

        enum: [
          "MOBILE",
          "TABLET",
          "DESKTOP",
          "UNKNOWN",
        ],

        default:
          "UNKNOWN",

        index:
          true,
      },

      /* =====================================================
         OPTIONAL DEVICE INFORMATION
      ===================================================== */

      batteryLevel: {
        type:
          Number,

        default:
          null,

        min:
          0,

        max:
          100,
      },
    },
    {
      timestamps:
        true,

      versionKey:
        false,
    }
  );

/* =========================================================
   ATTENDANCE LOCATION TIMELINE
========================================================= */

attendanceLocationLogSchema.index({
  attendanceId:
    1,

  capturedAt:
    1,
});

/* =========================================================
   EMPLOYEE DAY TIMELINE
========================================================= */

attendanceLocationLogSchema.index({
  employeeId:
    1,

  businessDate:
    1,

  capturedAt:
    1,
});

/* =========================================================
   LATEST EMPLOYEE LOCATION

   Used only for currently active Field Visit attendance
   when requester has proper authorization.
========================================================= */

attendanceLocationLogSchema.index({
  employeeId:
    1,

  capturedAt:
    -1,
});

/* =========================================================
   MODEL
========================================================= */

const AttendanceLocationLog =
  mongoose.models
    .AttendanceLocationLog ||
  mongoose.model(
    "AttendanceLocationLog",
    attendanceLocationLogSchema
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  AttendanceLocationLog,

  LOCATION_LOG_SOURCES,

  LOCATION_WORK_MODES,

  LOCATION_TYPES,
};
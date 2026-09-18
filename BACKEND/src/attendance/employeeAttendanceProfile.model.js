const mongoose =
  require(
    "mongoose"
  );

const {
  Schema,
} = mongoose;

/* =========================================================
   ALLOWED MODES
========================================================= */

const WORK_MODES = [
  "OFFICE",
  "WFH",
  "FIELD_VISIT",
  "ON_DUTY",
];

/* =========================================================
   EMPLOYEE ATTENDANCE PROFILE

   EFFECTIVE-DATED.

   Weekly published ShiftAssignment has priority.

   defaultShiftId is only fallback/default shift.
========================================================= */

const employeeAttendanceProfileSchema =
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

      /* =====================================================
         ATTENDANCE OFFICE

         IMPORTANT:
         This must reference AttendanceOffice because Attendance
         and AttendanceLocationLog use the same office master.
      ===================================================== */

      officeId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "AttendanceOffice",

        required:
          true,

        index:
          true,
      },

      /* =====================================================
         DEFAULT / FALLBACK SHIFT

         Published weekly ShiftAssignment has priority.
      ===================================================== */

      defaultShiftId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "AttendanceShift",

        required:
          true,

        index:
          true,
      },

      /* =====================================================
         SHIFT MANAGEMENT MODE
      ===================================================== */

      shiftManagementMode: {
        type:
          String,

        enum: [
          "DEFAULT",
          "WEEKLY_ROSTER",
        ],

        default:
          "DEFAULT",

        index:
          true,
      },

      /* =====================================================
         DEFAULT SHIFT FALLBACK
      ===================================================== */

      allowDefaultShiftFallback: {
        type:
          Boolean,

        default:
          true,
      },

      /* =====================================================
         ATTENDANCE POLICY
      ===================================================== */

      attendancePolicyId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "AttendancePolicy",

        required:
          true,

        index:
          true,
      },

      /* =====================================================
         ATTENDANCE SETTINGS
      ===================================================== */

      attendanceEnabled: {
        type:
          Boolean,

        default:
          true,

        index:
          true,
      },

      biometricRequired: {
        type:
          Boolean,

        default:
          true,
      },

      allowedModes: {
        type: [
          String,
        ],

        enum:
          WORK_MODES,

        default: [
          "OFFICE",
        ],
      },

      /* =====================================================
         LOCATION TRACKING

         Used for WFH / FIELD_VISIT / ON_DUTY according to
         company policy.

         Individual GPS points are stored in
         AttendanceLocationLog.
      ===================================================== */

      trackingRequired: {
        type:
          Boolean,

        default:
          false,
      },

      /* =====================================================
         EFFECTIVE DATE
      ===================================================== */

      effectiveFrom: {
        type:
          Date,

        required:
          true,

        index:
          true,
      },

      effectiveTo: {
        type:
          Date,

        default:
          null,

        index:
          true,
      },

      /* =====================================================
         REASON
      ===================================================== */

      reason: {
        type:
          String,

        trim:
          true,

        default:
          "",

        maxlength:
          500,
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

employeeAttendanceProfileSchema.pre(
  "validate",
  function () {
    if (
      this.effectiveTo &&
      this.effectiveFrom &&
      this.effectiveTo <
        this.effectiveFrom
    ) {
      this.invalidate(
        "effectiveTo",
        "effectiveTo cannot be earlier than effectiveFrom."
      );
    }

    if (
      Array.isArray(
        this.allowedModes
      )
    ) {
      this.allowedModes =
        [
          ...new Set(
            this.allowedModes
              .map(
                (
                  item
                ) =>
                  String(
                    item ||
                      ""
                  )
                    .trim()
                    .toUpperCase()
              )
              .filter(
                (
                  item
                ) =>
                  WORK_MODES.includes(
                    item
                  )
              )
          ),
        ];

      if (
        !this.allowedModes
          .length
      ) {
        this.allowedModes = [
          "OFFICE",
        ];
      }
    }
  }
);

/* =========================================================
   INDEXES
========================================================= */

employeeAttendanceProfileSchema.index(
  {
    employeeId:
      1,

    effectiveFrom:
      1,
  },
  {
    unique:
      true,
  }
);

employeeAttendanceProfileSchema.index({
  employeeId:
    1,

  effectiveFrom:
    -1,

  effectiveTo:
    1,

  attendanceEnabled:
    1,
});

employeeAttendanceProfileSchema.index({
  officeId:
    1,

  attendanceEnabled:
    1,
});

employeeAttendanceProfileSchema.index({
  defaultShiftId:
    1,

  attendanceEnabled:
    1,
});

employeeAttendanceProfileSchema.index({
  shiftManagementMode:
    1,

  attendanceEnabled:
    1,
});

/* =========================================================
   MODEL
========================================================= */

const EmployeeAttendanceProfile =
  mongoose.models
    .EmployeeAttendanceProfile ||
  mongoose.model(
    "EmployeeAttendanceProfile",
    employeeAttendanceProfileSchema
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  EmployeeAttendanceProfile;

module.exports.WORK_MODES =
  WORK_MODES;
const mongoose =
  require(
    "mongoose"
  );

const {
  Schema,
} = mongoose;

/* =========================================================
   ATTENDANCE WORK MODES

   OFFICE
     Employee works from company office/factory.

   WFH
     Approved work from home attendance.

   FIELD_VISIT
     Sales / field employee visiting customer/site.

   ON_DUTY
     Official company work away from normal workplace.
========================================================= */

const ATTENDANCE_WORK_MODES = [
  "OFFICE",
  "WFH",
  "FIELD_VISIT",
  "ON_DUTY",
];

/* =========================================================
   PRESENCE STATUS

   IMPORTANT:

   Do NOT mix attendance exceptions such as:
   - late
   - early exit
   - missing checkout
   - short hours

   into the primary presence status.

   Example:

   presenceStatus = PRESENT
   isLate = true

   is much cleaner than:
   status = LATE
========================================================= */

const ATTENDANCE_PRESENCE_STATUSES = [
  "NOT_MARKED",
  "PRESENT",
  "ABSENT",
  "HALF_DAY",
  "ON_LEAVE",
  "WEEK_OFF",
  "HOLIDAY",
  "NOT_APPLICABLE",
];

/* =========================================================
   ATTENDANCE SOURCE

   Describes how the effective daily attendance originated.
========================================================= */

const ATTENDANCE_SOURCES = [
  "BIOMETRIC",
  "WEB",
  "PWA",
  "MOBILE",
  "REGULARIZATION",
  "ADMIN",
  "SYSTEM",
];

/* =========================================================
   REGULARIZATION STATUS
========================================================= */

const REGULARIZATION_STATUSES = [
  "NONE",
  "PENDING",
  "APPROVED",
  "REJECTED",
];

/* =========================================================
   PROCESSING STATUS

   Useful for:
   - live punches
   - historical 3-month sync
   - shift correction
   - employee biometric mapping
   - reprocessing
========================================================= */

const ATTENDANCE_PROCESSING_STATUSES = [
  "PENDING",
  "PROCESSED",
  "RECALCULATION_REQUIRED",
  "ERROR",
];

/* =========================================================
   ATTENDANCE SCHEMA
========================================================= */

const attendanceSchema =
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

      /*
       * User is kept as a snapshot/reference for login-side
       * functionality.

       * Employee remains the authoritative HR identity.
       */
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

      /*
       * Snapshot.

       * Useful for:
       * - exports
       * - payroll
       * - historical reporting
       */
      employeeCode: {
        type:
          String,

        required:
          true,

        trim:
          true,

        uppercase:
          true,

        index:
          true,
      },

      employeeName: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      /*
       * Snapshot of biometric mapping used during calculation.
       *
       * Employee.biometricCode remains authoritative.
       */
      biometricCode: {
        type:
          String,

        trim:
          true,

        default:
          null,

        index:
          true,
      },

      /* =====================================================
         ORGANISATION SNAPSHOT

         IMPORTANT:

         Attendance keeps organizational information as it was
         on that attendance day.

         Example:

         Employee belonged to Production in June but Sales in
         September.

         June payroll must still show Production.
      ===================================================== */

      companyCode: {
        type:
          String,

        trim:
          true,

        default:
          null,

        index:
          true,
      },

      organizationUnitId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "OrganizationUnit",

        default:
          null,

        index:
          true,
      },

      orgUnitCode: {
        type:
          String,

        trim:
          true,

        default:
          null,

        index:
          true,
      },

      departmentId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Department",

        default:
          null,

        index:
          true,
      },

      departmentName: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      designationId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Designation",

        default:
          null,
      },

      designationName: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      reportingManagerId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Employee",

        default:
          null,

        index:
          true,
      },

      /* =====================================================
         BUSINESS DATE

         THIS IS CRITICAL.

         Never depend only on calendar date.

         Example:

         Sonipat Night Shift

         Start:
         2026-09-13 17:30

         End:
         2026-09-14 03:00

         businessDate:
         "2026-09-13"

         Both punches belong to 13 September attendance.
      ===================================================== */

      businessDate: {
        type:
          String,

        required:
          true,

        trim:
          true,

        index:
          true,

        match:
          /^\d{4}-\d{2}-\d{2}$/,
      },

      /*
       * Optional Date representation.

       * Useful for Mongo aggregation/reporting.

       * This should represent midnight of businessDate in the
       * attendance timezone.

       * businessDate string remains the safest logical key.
       */
      attendanceDate: {
        type:
          Date,

        required:
          true,

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

      /* =====================================================
         OFFICE
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

      officeCode: {
        type:
          String,

        trim:
          true,

        default:
          null,

        index:
          true,
      },

      officeName: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      /* =====================================================
         SHIFT

         Shift is stored both as reference and snapshot.

         This protects historical payroll when shift
         configuration later changes.
      ===================================================== */

      shiftId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "AttendanceShift",

        default:
          null,

        index:
          true,
      },

      shiftCode: {
        type:
          String,

        trim:
          true,

        default:
          null,

        index:
          true,
      },

      shiftName: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      shiftCrossesMidnight: {
        type:
          Boolean,

        default:
          false,
      },

      /* =====================================================
         POLICY
      ===================================================== */

      attendancePolicyId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "AttendancePolicy",

        default:
          null,

        index:
          true,
      },

      /* =====================================================
         EXPECTED SHIFT TIMES

         Exact Date values.

         Night shift example:

         expectedStartAt:
         13 Sep 17:30

         expectedEndAt:
         14 Sep 03:00
      ===================================================== */

      expectedStartAt: {
        type:
          Date,

        default:
          null,
      },

      expectedEndAt: {
        type:
          Date,

        default:
          null,
      },

      requiredMinutes: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      /* =====================================================
         WORK MODE
      ===================================================== */

      workMode: {
        type:
          String,

        enum:
          ATTENDANCE_WORK_MODES,

        default:
          "OFFICE",

        index:
          true,
      },

      /* =====================================================
         EFFECTIVE CHECK-IN

         These values are used for actual attendance
         calculation after approved regularization.
      ===================================================== */

      firstIn: {
        time: {
          type:
            Date,

          default:
            null,
        },

        source: {
          type:
            String,

          enum: [
            ...ATTENDANCE_SOURCES,
            null,
          ],

          default:
            null,
        },

        punchId: {
          type:
            Schema.Types.ObjectId,

          ref:
            "RawAttendancePunch",

          default:
            null,
        },
      },

      /* =====================================================
         EFFECTIVE CHECK-OUT
      ===================================================== */

      lastOut: {
        time: {
          type:
            Date,

          default:
            null,
        },

        source: {
          type:
            String,

          enum: [
            ...ATTENDANCE_SOURCES,
            null,
          ],

          default:
            null,
        },

        punchId: {
          type:
            Schema.Types.ObjectId,

          ref:
            "RawAttendancePunch",

          default:
            null,
        },
      },

      /* =====================================================
         ORIGINAL BIOMETRIC VALUES

         IMPORTANT:

         Never destroy original biometric attendance when an
         employee regularizes attendance.

         Example:

         biometric:
         09:42

         approved regularization:
         09:05

         firstIn.time:
         09:05

         originalFirstInAt:
         09:42
      ===================================================== */

      originalFirstInAt: {
        type:
          Date,

        default:
          null,
      },

      originalLastOutAt: {
        type:
          Date,

        default:
          null,
      },

      /* =====================================================
         PUNCH SUMMARY
      ===================================================== */

      punchCount: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      firstRawPunchId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "RawAttendancePunch",

        default:
          null,
      },

      lastRawPunchId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "RawAttendancePunch",

        default:
          null,
      },

      /* =====================================================
         TIME CALCULATION
      ===================================================== */

      totalPresenceMinutes: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      totalWorkingMinutes: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      breakMinutes: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      lateMinutes: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      earlyExitMinutes: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      shortMinutes: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      overtimeMinutes: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      /* =====================================================
         PRESENCE STATUS
      ===================================================== */

      presenceStatus: {
        type:
          String,

        enum:
          ATTENDANCE_PRESENCE_STATUSES,

        default:
          "NOT_MARKED",

        index:
          true,
      },

      /* =====================================================
         ATTENDANCE FLAGS

         These can exist together.

         Example:

         PRESENT
         +
         isLate = true
         +
         isShortHours = true
      ===================================================== */

      isLate: {
        type:
          Boolean,

        default:
          false,

        index:
          true,
      },

      isEarlyExit: {
        type:
          Boolean,

        default:
          false,

        index:
          true,
      },

      isShortHours: {
        type:
          Boolean,

        default:
          false,

        index:
          true,
      },

      missingCheckIn: {
        type:
          Boolean,

        default:
          false,

        index:
          true,
      },

      missingCheckOut: {
        type:
          Boolean,

        default:
          false,

        index:
          true,
      },

      /* =====================================================
         PRIMARY SOURCE
      ===================================================== */

      primarySource: {
        type:
          String,

        enum: [
          ...ATTENDANCE_SOURCES,
          null,
        ],

        default:
          null,

        index:
          true,
      },

      /* =====================================================
         WFH
      ===================================================== */

      wfh: {
        requested: {
          type:
            Boolean,

          default:
            false,
        },

        approved: {
          type:
            Boolean,

          default:
            false,
        },

        referenceId: {
          type:
            Schema.Types.ObjectId,

          default:
            null,
        },

        checkInLocation: {
          latitude: {
            type:
              Number,

            default:
              null,
          },

          longitude: {
            type:
              Number,

            default:
              null,
          },

          accuracyMeters: {
            type:
              Number,

            default:
              null,
          },

          capturedAt: {
            type:
              Date,

            default:
              null,
          },
        },

        checkOutLocation: {
          latitude: {
            type:
              Number,

            default:
              null,
          },

          longitude: {
            type:
              Number,

            default:
              null,
          },

          accuracyMeters: {
            type:
              Number,

            default:
              null,
          },

          capturedAt: {
            type:
              Date,

            default:
              null,
          },
        },
      },

      /* =====================================================
         FIELD VISIT / ON DUTY
      ===================================================== */

      dutyReferenceId: {
        type:
          Schema.Types.ObjectId,

        default:
          null,

        index:
          true,
      },

      dutyPurpose: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      dutyLocation: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      /* =====================================================
         FIELD TRACKING SUMMARY

         DO NOT store every GPS point here.

         Individual GPS points belong in:

         FieldTrackingPoint

         This keeps Attendance small and scalable.
      ===================================================== */

      fieldTracking: {
        enabled: {
          type:
            Boolean,

          default:
            false,
        },

        startedAt: {
          type:
            Date,

          default:
            null,
        },

        stoppedAt: {
          type:
            Date,

          default:
            null,
        },

        lastLocationAt: {
          type:
            Date,

          default:
            null,
        },

        pointCount: {
          type:
            Number,

          default:
            0,

          min:
            0,
        },

        trackingIntervalMinutes: {
          type:
            Number,

          default:
            30,

          min:
            1,
        },
      },

      /* =====================================================
         REGULARIZATION

         Full request and approval history will exist in
         AttendanceRegularization.

         Attendance only holds current summary/reference.
      ===================================================== */

      regularization: {
        requested: {
          type:
            Boolean,

          default:
            false,
        },

        requestId: {
          type:
            Schema.Types.ObjectId,

          ref:
            "AttendanceRegularization",

          default:
            null,
        },

        status: {
          type:
            String,

          enum:
            REGULARIZATION_STATUSES,

          default:
            "NONE",
        },

        approvedBy: {
          type:
            Schema.Types.ObjectId,

          ref:
            "User",

          default:
            null,
        },

        approvedAt: {
          type:
            Date,

          default:
            null,
        },
      },

      wasRegularized: {
        type:
          Boolean,

        default:
          false,

        index:
          true,
      },

      /* =====================================================
         LEAVE INTEGRATION

         We will connect this when Leave Management starts.
      ===================================================== */

      leaveRequestId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "LeaveRequest",

        default:
          null,

        index:
          true,
      },

      /* =====================================================
         PROCESSING

         Important for historical imports and reprocessing.
      ===================================================== */

      processingStatus: {
        type:
          String,

        enum:
          ATTENDANCE_PROCESSING_STATUSES,

        default:
          "PENDING",

        index:
          true,
      },

      processingVersion: {
        type:
          Number,

        default:
          1,

        min:
          1,
      },

      needsRecalculation: {
        type:
          Boolean,

        default:
          false,

        index:
          true,
      },

      lastCalculatedAt: {
        type:
          Date,

        default:
          null,

        index:
          true,
      },

      calculationError: {
        type:
          String,

        trim:
          true,

        default:
          null,

        maxlength:
          2000,
      },

      /* =====================================================
         AUDIT
      ===================================================== */

      manuallyEdited: {
        type:
          Boolean,

        default:
          false,
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

      minimize:
        false,

      versionKey:
        false,
    }
  );

/* =========================================================
   ONE ATTENDANCE RECORD PER EMPLOYEE PER BUSINESS DATE

   IMPORTANT:

   Unique key is businessDate.

   NOT raw calendar date.

   This correctly supports:

   17:30 → 03:00 night shift.
========================================================= */

attendanceSchema.index(
  {
    employeeId:
      1,

    businessDate:
      1,
  },
  {
    unique:
      true,
  }
);

/* =========================================================
   EMPLOYEE MONTHLY ATTENDANCE

   Used for:
   - self attendance
   - monthly attendance
   - payroll
========================================================= */

attendanceSchema.index({
  employeeId:
    1,

  businessDate:
    1,

  presenceStatus:
    1,
});

/* =========================================================
   COMPANY REPORTING
========================================================= */

attendanceSchema.index({
  companyCode:
    1,

  businessDate:
    1,
});

/* =========================================================
   ORGANISATION UNIT
========================================================= */

attendanceSchema.index({
  organizationUnitId:
    1,

  businessDate:
    1,
});

/* =========================================================
   DEPARTMENT ATTENDANCE

   Important for HEAD / HR department-wise view.
========================================================= */

attendanceSchema.index({
  departmentId:
    1,

  businessDate:
    1,
});

/* =========================================================
   OFFICE ATTENDANCE
========================================================= */

attendanceSchema.index({
  officeId:
    1,

  businessDate:
    1,
});

/* =========================================================
   MANAGER TEAM ATTENDANCE
========================================================= */

attendanceSchema.index({
  reportingManagerId:
    1,

  businessDate:
    1,
});

/* =========================================================
   ATTENDANCE STATUS REPORTING
========================================================= */

attendanceSchema.index({
  presenceStatus:
    1,

  businessDate:
    1,
});

/* =========================================================
   WORK MODE REPORTING
========================================================= */

attendanceSchema.index({
  workMode:
    1,

  businessDate:
    1,
});

/* =========================================================
   SHIFT REPORTING
========================================================= */

attendanceSchema.index({
  shiftId:
    1,

  businessDate:
    1,
});

/* =========================================================
   PAYROLL / EXPORT

   Department + date + status is a common monthly payroll
   reporting query.
========================================================= */

attendanceSchema.index({
  departmentId:
    1,

  businessDate:
    1,

  presenceStatus:
    1,
});

/* =========================================================
   PROCESSING QUEUE
========================================================= */

attendanceSchema.index({
  processingStatus:
    1,

  needsRecalculation:
    1,
});

/* =========================================================
   MODEL
========================================================= */

const Attendance =
  mongoose.models
    .Attendance ||
  mongoose.model(
    "Attendance",
    attendanceSchema
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  Attendance,

  ATTENDANCE_WORK_MODES,

  ATTENDANCE_PRESENCE_STATUSES,

  ATTENDANCE_SOURCES,

  REGULARIZATION_STATUSES,

  ATTENDANCE_PROCESSING_STATUSES,
};
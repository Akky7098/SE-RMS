const mongoose =
  require(
    "mongoose"
  );

const {
  Schema,
} = mongoose;

const {
  DATE_KEY_REGEX,
} =
  require(
    "./shiftCalendar.util"
  );

/* =========================================================
   DAY TYPES

   SHIFT:
   Employee should work assigned shift.

   WEEK_OFF:
   Weekly off.

   HOLIDAY:
   Usually calendar service sets this later.

   LEAVE:
   Leave Management will eventually control this.

   NOT_SCHEDULED:
   Employee intentionally not rostered.
========================================================= */

const SHIFT_DAY_TYPES = [
  "SHIFT",
  "WEEK_OFF",
  "HOLIDAY",
  "LEAVE",
  "NOT_SCHEDULED",
];

/* =========================================================
   ASSIGNMENT SOURCE
========================================================= */

const SHIFT_ASSIGNMENT_SOURCES = [
  "HEAD",
  "MANAGER",
  "HR",
  "SUPER_ADMIN",
  "SYSTEM",
  "COPY_PREVIOUS_WEEK",
  "IMPORT",
];

/* =========================================================
   NORMALIZE ORG UNIT
========================================================= */

const normalizeOrgUnitCode =
  (
    value
  ) =>
    String(
      value ||
      ""
    )
      .trim()
      .toUpperCase();

/* =========================================================
   SHIFT ASSIGNMENT

   ONE DOCUMENT =
   ONE EMPLOYEE + ONE CALENDAR DATE.

   Attendance resolver reads this before falling back to
   EmployeeAttendanceProfile.defaultShiftId.

   ORGANIZATION:

   orgUnitCode is primary.
   departmentId is optional compatibility snapshot.
========================================================= */

const shiftAssignmentSchema =
  new Schema(
    {
      rosterId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "ShiftRoster",

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

      /* =====================================================
         ORGANIZATION SNAPSHOT
      ===================================================== */

      /*
       * PRIMARY organization snapshot.
       *
       * Examples:
       * HR
       * ENGINEERING
       * OPERATIONS
       * DIR_BOARD
       */
      orgUnitCode: {
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

      /*
       * OPTIONAL reference.
       *
       * Do not require it because some SE-RMS org units may
       * not have a Department document.
       */
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
         DATE
      ===================================================== */

      assignmentDate: {
        type:
          String,

        required:
          true,

        trim:
          true,

        match:
          DATE_KEY_REGEX,

        index:
          true,
      },

      dayName: {
        type:
          String,

        enum: [
          "MONDAY",
          "TUESDAY",
          "WEDNESDAY",
          "THURSDAY",
          "FRIDAY",
          "SATURDAY",
          "SUNDAY",
        ],

        required:
          true,
      },

      /* =====================================================
         DAY TYPE
      ===================================================== */

      dayType: {
        type:
          String,

        enum:
          SHIFT_DAY_TYPES,

        default:
          "SHIFT",

        index:
          true,
      },

      /*
       * Required when dayType = SHIFT.
       *
       * Null for WEEK_OFF / HOLIDAY / LEAVE etc.
       */
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

      /* =====================================================
         SHIFT SNAPSHOT

         If the shift master is edited later, historical
         assignments retain what was originally assigned.
      ===================================================== */

      shiftCode: {
        type:
          String,

        trim:
          true,

        default:
          null,
      },

      shiftName: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      shiftStartTime: {
        type:
          String,

        trim:
          true,

        default:
          null,
      },

      shiftEndTime: {
        type:
          String,

        trim:
          true,

        default:
          null,
      },

      shiftCrossesMidnight: {
        type:
          Boolean,

        default:
          false,
      },

      /* =====================================================
         SOURCE / AUDIT
      ===================================================== */

      assignmentSource: {
        type:
          String,

        enum:
          SHIFT_ASSIGNMENT_SOURCES,

        default:
          "HEAD",

        index:
          true,
      },

      assignedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required:
          true,
      },

      assignedAt: {
        type:
          Date,

        default:
          Date.now,
      },

      /*
       * Indicates HR changed Head's original assignment.
       */
      overridden: {
        type:
          Boolean,

        default:
          false,

        index:
          true,
      },

      originalShiftId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "AttendanceShift",

        default:
          null,
      },

      overrideReason: {
        type:
          String,

        trim:
          true,

        default:
          "",

        maxlength:
          1000,
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

shiftAssignmentSchema.pre(
  "validate",
  function () {
    /* =====================================================
       ORG UNIT
    ===================================================== */

    this.orgUnitCode =
      normalizeOrgUnitCode(
        this.orgUnitCode
      );

    if (
      !this.orgUnitCode
    ) {
      this.invalidate(
        "orgUnitCode",
        "orgUnitCode is required."
      );
    }

    /* =====================================================
       SHIFT REQUIREMENT
    ===================================================== */

    if (
      this.dayType ===
        "SHIFT" &&
      !this.shiftId
    ) {
      this.invalidate(
        "shiftId",
        "shiftId is required when dayType is SHIFT."
      );
    }

    /* =====================================================
       NON-SHIFT DAYS

       Clear shift snapshot.
    ===================================================== */

    if (
      this.dayType !==
        "SHIFT"
    ) {
      this.shiftId =
        null;

      this.shiftCode =
        null;

      this.shiftName =
        "";

      this.shiftStartTime =
        null;

      this.shiftEndTime =
        null;

      this.shiftCrossesMidnight =
        false;
    }
  }
);

/* =========================================================
   ONE ASSIGNMENT PER EMPLOYEE PER DATE

   GLOBAL uniqueness.

   Prevents one employee from receiving two assignments from
   different organizational rosters on the same date.
========================================================= */

shiftAssignmentSchema.index(
  {
    employeeId:
      1,

    assignmentDate:
      1,
  },
  {
    unique:
      true,
  }
);

/* =========================================================
   ROSTER GRID
========================================================= */

shiftAssignmentSchema.index({
  rosterId:
    1,

  assignmentDate:
    1,

  employeeId:
    1,
});

/* =========================================================
   ORG UNIT WEEK VIEW

   This becomes the primary organizational reporting index.
========================================================= */

shiftAssignmentSchema.index({
  orgUnitCode:
    1,

  assignmentDate:
    1,
});

/* =========================================================
   OPTIONAL DEPARTMENT COMPATIBILITY VIEW
========================================================= */

shiftAssignmentSchema.index({
  departmentId:
    1,

  assignmentDate:
    1,
});

/* =========================================================
   OFFICE VIEW
========================================================= */

shiftAssignmentSchema.index({
  officeId:
    1,

  assignmentDate:
    1,
});

/* =========================================================
   EMPLOYEE HISTORY
========================================================= */

shiftAssignmentSchema.index({
  employeeId:
    1,

  assignmentDate:
    -1,
});

/* =========================================================
   PUBLISHED PROCESSOR SUPPORT

   Roster is populated/checked by service when attendance
   resolves final published assignment.
========================================================= */

shiftAssignmentSchema.index({
  assignmentDate:
    1,

  dayType:
    1,
});

/* =========================================================
   MODEL
========================================================= */

module.exports =
  mongoose.models
    .ShiftAssignment ||
  mongoose.model(
    "ShiftAssignment",
    shiftAssignmentSchema
  );
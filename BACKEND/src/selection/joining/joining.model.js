const mongoose =
  require(
    "mongoose"
  );

const {
  Schema,
} =
  mongoose;

/* =========================================================
   JOINING STATUS
========================================================= */

const JOINING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "RESCHEDULED",
  "FOLLOW_UP",
  "NO_SHOW",
  "DECLINED",
  "DAY1_CONFIRMED",
  "COMPLETED",
];

/* =========================================================
   JOINING ACTION
========================================================= */

const JOINING_ACTIONS = [
  "JOINING_CREATED",
  "DATE_CONFIRMED",
  "JOINING_RESCHEDULED",
  "FOLLOW_UP_REQUIRED",
  "NO_SHOW",
  "JOINING_DECLINED",
  "DAY1_CONFIRMED",
  "EMPLOYEE_CREATED",
  "JOINING_COMPLETED",
];

/* =========================================================
   HISTORY
========================================================= */

const joiningHistorySchema =
  new Schema(
    {
      action: {
        type:
          String,

        enum:
          JOINING_ACTIONS,

        required:
          true,
      },

      previousJoiningDate: {
        type:
          Date,

        default:
          null,
      },

      joiningDate: {
        type:
          Date,

        default:
          null,
      },

      reason: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      remarks: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      performedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      metadata: {
        type:
          Schema.Types.Mixed,

        default:
          null,
      },

      at: {
        type:
          Date,

        default:
          Date.now,
      },
    },
    {
      _id:
        true,
    }
  );

/* =========================================================
   JOINING RECORD
========================================================= */

const joiningSchema =
  new Schema(
    {
      selection: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Selection",

        required:
          true,

        unique:
          true,

        index:
          true,
      },

      candidate: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Candidate",

        required:
          true,

        index:
          true,
      },

      /* =====================================================
         EXPECTED JOINING
      ===================================================== */

      expectedJoiningDate: {
        type:
          Date,

        required:
          true,

        index:
          true,
      },

      originalJoiningDate: {
        type:
          Date,

        required:
          true,
      },

      /* =====================================================
         ACTUAL JOINING
      ===================================================== */

      actualJoiningDate: {
        type:
          Date,

        default:
          null,
      },

      /* =====================================================
         STATUS
      ===================================================== */

      status: {
        type:
          String,

        enum:
          JOINING_STATUSES,

        default:
          "PENDING",

        required:
          true,

        index:
          true,
      },

      /* =====================================================
         CANDIDATE CONFIRMATION
      ===================================================== */

      candidateConfirmedAt: {
        type:
          Date,

        default:
          null,
      },

      lastContactedAt: {
        type:
          Date,

        default:
          null,
      },

      /* =====================================================
         FOLLOW-UP
      ===================================================== */

      nextFollowUpAt: {
        type:
          Date,

        default:
          null,
      },

      /* =====================================================
         NO SHOW
      ===================================================== */

      noShowAt: {
        type:
          Date,

        default:
          null,
      },

      /* =====================================================
         DECLINED
      ===================================================== */

      declinedAt: {
        type:
          Date,

        default:
          null,
      },

      declinedReason: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      /* =====================================================
         DAY 1
      ===================================================== */

      day1ConfirmedAt: {
        type:
          Date,

        default:
          null,
      },

      day1ConfirmedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      /* =====================================================
         EMPLOYEE CREATION

         Employee creation will be wired to your existing
         Employee schema/service after we inspect it.
      ===================================================== */

      employee: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Employee",

        default:
          null,

        index:
          true,
      },

      employeeCreationStatus: {
        type:
          String,

        enum: [
          "NOT_STARTED",
          "PENDING",
          "CREATED",
          "FAILED",
        ],

        default:
          "NOT_STARTED",
      },

      employeeCreationError: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      /* =====================================================
         CLOSURE
      ===================================================== */

      completedAt: {
        type:
          Date,

        default:
          null,
      },

      /* =====================================================
         HISTORY
      ===================================================== */

      history: {
        type: [
          joiningHistorySchema,
        ],

        default:
          [],
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
    }
  );

/* =========================================================
   INDEX
========================================================= */

joiningSchema.index({
  status:
    1,

  expectedJoiningDate:
    1,
});

/* =========================================================
   MODEL
========================================================= */

const Joining =
  mongoose.models
    .Joining ||
  mongoose.model(
    "Joining",
    joiningSchema
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  Joining,

  JOINING_STATUSES,

  JOINING_ACTIONS,
};
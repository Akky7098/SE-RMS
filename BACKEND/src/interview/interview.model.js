const mongoose =
  require("mongoose");

const {
  Schema,
} =
  mongoose;

/* =========================================================
   ENUMS
========================================================= */

const INTERVIEW_STATUSES = [
  "SCHEDULED",
  "RESCHEDULED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

const INTERVIEW_MODES = [
  "IN_PERSON",
  "ONLINE",
  "PHONE",
];

const EMAIL_STATUSES = [
  "NOT_SENT",
  "PENDING",
  "SENT",
  "FAILED",
];

/* =========================================================
   EMAIL DELIVERY
========================================================= */

const emailDeliverySchema =
  new Schema(
    {
      status: {
        type:
          String,

        enum:
          EMAIL_STATUSES,

        default:
          "NOT_SENT",
      },

      email: {
        type:
          String,

        default:
          "",

        trim:
          true,

        lowercase:
          true,
      },

      sentAt: {
        type:
          Date,

        default:
          null,
      },

      failedAt: {
        type:
          Date,

        default:
          null,
      },

      messageId: {
        type:
          String,

        default:
          "",
      },

      error: {
        type:
          String,

        default:
          "",
      },

      lastAttemptAt: {
        type:
          Date,

        default:
          null,
      },
    },
    {
      _id:
        false,
    }
  );

/* =========================================================
   RESCHEDULE HISTORY
========================================================= */

const rescheduleHistorySchema =
  new Schema(
    {
      previousScheduledAt: {
        type:
          Date,

        required:
          true,
      },

      newScheduledAt: {
        type:
          Date,

        required:
          true,
      },

      reason: {
        type:
          String,

        default:
          "",

        trim:
          true,
      },

      changedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      changedAt: {
        type:
          Date,

        default:
          Date.now,
      },
    },
    {
      _id:
        false,
    }
  );

/* =========================================================
   INTERVIEW
========================================================= */

const interviewSchema =
  new Schema(
    {
      interviewNumber: {
        type:
          String,

        required:
          true,

        unique:
          true,

        index:
          true,

        trim:
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

      manpowerRequirement: {
        type:
          Schema.Types.ObjectId,

        ref:
          "ManpowerRequirement",

        required:
          true,

        index:
          true,
      },

      department: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Department",

        required:
          true,

        index:
          true,
      },

      positionTitle: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      roundNumber: {
        type:
          Number,

        default:
          1,

        min:
          1,

        max:
          20,
      },

      roundName: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          80,
      },

      mode: {
        type:
          String,

        enum:
          INTERVIEW_MODES,

        required:
          true,
      },

      officeLocation: {
        type:
          String,

        default:
          "",

        trim:
          true,
      },

      meetingLink: {
        type:
          String,

        default:
          "",

        trim:
          true,
      },

      scheduledAt: {
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

        default:
          "Asia/Kolkata",
      },

      durationMinutes: {
        type:
          Number,

        default:
          45,

        min:
          15,

        max:
          240,
      },

      interviewer: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required:
          true,

        index:
          true,
      },

      status: {
        type:
          String,

        enum:
          INTERVIEW_STATUSES,

        default:
          "SCHEDULED",

        index:
          true,
      },

      remarks: {
        type:
          String,

        default:
          "",

        trim:
          true,

        maxlength:
          1000,
      },

      /* =====================================================
         EMAIL DELIVERY
      ===================================================== */

      candidateEmail: {
        type:
          emailDeliverySchema,

        default:
          () => ({}),
      },

      interviewerEmail: {
        type:
          emailDeliverySchema,

        default:
          () => ({}),
      },

      /* =====================================================
   CHECK-IN WELCOME EMAIL
===================================================== */

checkInWelcomeEmail: {
  type:
    emailDeliverySchema,

  default:
    () => ({}),
},

      /* =====================================================
         CHECK-IN
      ===================================================== */

      checkInToken: {
        type:
          String,

        default:
          "",

        index:
          true,
      },

      checkedInAt: {
        type:
          Date,

        default:
          null,
      },

      checkedInBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      /* =====================================================
         COMPLETION
      ===================================================== */

      completedAt: {
        type:
          Date,

        default:
          null,
      },

      /* =====================================================
         CANCELLATION
      ===================================================== */

      cancelledAt: {
        type:
          Date,

        default:
          null,
      },

      cancelledBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      cancellationReason: {
        type:
          String,

        default:
          "",

        trim:
          true,
      },

      /* =====================================================
         RESCHEDULE
      ===================================================== */

      rescheduleHistory: {
        type: [
          rescheduleHistorySchema,
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

        required:
          true,
      },

      updatedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required:
          true,
      },

      isActive: {
        type:
          Boolean,

        default:
          true,

        index:
          true,
      },
    },
    {
      timestamps:
        true,
    }
  );

/* =========================================================
   INDEXES
========================================================= */

interviewSchema.index({
  candidate:
    1,

  scheduledAt:
    -1,
});

interviewSchema.index({
  interviewer:
    1,

  scheduledAt:
    1,
});

interviewSchema.index({
  department:
    1,

  status:
    1,

  scheduledAt:
    1,
});

/* =========================================================
   MODEL
========================================================= */

const Interview =
  mongoose.models
    .Interview ||
  mongoose.model(
    "Interview",
    interviewSchema
  );

module.exports = {
  Interview,

  INTERVIEW_STATUSES,

  INTERVIEW_MODES,

  EMAIL_STATUSES,
};
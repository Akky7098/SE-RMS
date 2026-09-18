const mongoose =
  require(
    "mongoose"
  );

const {
  Schema,
} = mongoose;

/* =========================================================
   STATUS
========================================================= */

const MANPOWER_STATUSES = [
  "DRAFT",

  "PENDING_APPROVAL",

  "APPROVED",

  "REJECTED",

  "HIRING_IN_PROGRESS",

  "FILLED",

  "CANCELLED",
];

/* =========================================================
   EMPLOYMENT TYPE
========================================================= */

const EMPLOYMENT_TYPES = [
  "FULL_TIME",

  "PART_TIME",

  "CONTRACT",

  "INTERN",

  "TEMPORARY",
];

/* =========================================================
   PRIORITY
========================================================= */

const MANPOWER_PRIORITIES = [
  "LOW",

  "NORMAL",

  "HIGH",

  "URGENT",
];

/* =========================================================
   APPROVAL HISTORY
========================================================= */

const approvalHistorySchema =
  new Schema(
    {
      action: {
        type:
          String,

        enum: [
          "SUBMITTED",
          "APPROVED",
          "REJECTED",
          "CANCELLED",
        ],

        required:
          true,
      },

      actor: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required:
          true,
      },

      remarks: {
        type:
          String,

        trim:
          true,

        maxlength:
          1000,

        default:
          "",
      },

      actionAt: {
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
   MANPOWER REQUIREMENT
========================================================= */

const manpowerRequirementSchema =
  new Schema(
    {
      /* =====================================================
         AUTO GENERATED

         Example:
         MPR-2026-000001
      ===================================================== */

      requestNumber: {
        type:
          String,

        required:
          true,

        unique:
          true,

        index:
          true,

        uppercase:
          true,

        trim:
          true,
      },

      /* =====================================================
         DEPARTMENT

         Normally automatically selected from requester's
         primary department.
      ===================================================== */

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

      /* =====================================================
         REQUESTER
      ===================================================== */

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

      /* =====================================================
         POSITION
      ===================================================== */

      positionTitle: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          150,
      },

      numberOfOpenings: {
        type:
          Number,

        required:
          true,

        min:
          1,

        max:
          500,
      },

      requiredSkills: {
        type: [
          String,
        ],

        default:
          [],
      },

      minimumExperienceYears: {
        type:
          Number,

        default:
          0,

        min:
          0,

        max:
          60,
      },

      maximumExperienceYears: {
        type:
          Number,

        default:
          null,

        min:
          0,

        max:
          60,
      },

      /* =====================================================
         BUDGET

         Monthly CTC/range for now.
      ===================================================== */

      budgetMin: {
        type:
          Number,

        default:
          null,

        min:
          0,
      },

      budgetMax: {
        type:
          Number,

        default:
          null,

        min:
          0,
      },

      currency: {
        type:
          String,

        default:
          "INR",

        uppercase:
          true,

        trim:
          true,
      },

      employmentType: {
        type:
          String,

        enum:
          EMPLOYMENT_TYPES,

        default:
          "FULL_TIME",
      },

      location: {
        type:
          String,

        trim:
          true,

        maxlength:
          150,

        default:
          "",
      },

      requiredByDate: {
        type:
          Date,

        default:
          null,
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

      priority: {
        type:
          String,

        enum:
          MANPOWER_PRIORITIES,

        default:
          "NORMAL",

        index:
          true,
      },

      /* =====================================================
         APPROVAL
      ===================================================== */

      status: {
        type:
          String,

        enum:
          MANPOWER_STATUSES,

        default:
          "PENDING_APPROVAL",

        index:
          true,
      },

      currentApprover: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,

        index:
          true,
      },

      approvalDepartment: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Department",

        default:
          null,
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

      rejectedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      rejectedAt: {
        type:
          Date,

        default:
          null,
      },

      rejectionReason: {
        type:
          String,

        trim:
          true,

        maxlength:
          1000,

        default:
          "",
      },

      approvalHistory: {
        type: [
          approvalHistorySchema,
        ],

        default:
          [],
      },

      /* =====================================================
         HR PIPELINE

         Approved requirements automatically become
         visible to HR.
      ===================================================== */

      visibleToHR: {
        type:
          Boolean,

        default:
          false,

        index:
          true,
      },

      /* =====================================================
         HIRING OWNER

         HR Admin / HR Department Super Admin selects the HR
         employee responsible for this recruitment.

         Candidates will later inherit this assignedHr.
      ===================================================== */

      assignedHr: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,

        index:
          true,
      },

      assignedHrAt: {
        type:
          Date,

        default:
          null,
      },

      assignedHrBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      /*
       * Stores the immediately previous owner when
       * requirement is reassigned.
       */

      previousAssignedHr: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      /* =====================================================
         HIRING START
      ===================================================== */

      hiringStartedAt: {
        type:
          Date,

        default:
          null,
      },

      hiringStartedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      filledOpenings: {
        type:
          Number,

        default:
          0,

        min:
          0,
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

manpowerRequirementSchema.index({
  department:
    1,

  status:
    1,

  createdAt:
    -1,
});

manpowerRequirementSchema.index({
  currentApprover:
    1,

  status:
    1,

  createdAt:
    -1,
});

manpowerRequirementSchema.index({
  visibleToHR:
    1,

  status:
    1,

  createdAt:
    -1,
});

/*
 * My Hiring / HR owner lookup.
 */

manpowerRequirementSchema.index({
  assignedHr:
    1,

  status:
    1,

  createdAt:
    -1,
});

/* =========================================================
   MODEL
========================================================= */

const ManpowerRequirement =
  mongoose.models
    .ManpowerRequirement ||
  mongoose.model(
    "ManpowerRequirement",
    manpowerRequirementSchema
  );

module.exports = {
  ManpowerRequirement,

  MANPOWER_STATUSES,

  EMPLOYMENT_TYPES,

  MANPOWER_PRIORITIES,
};
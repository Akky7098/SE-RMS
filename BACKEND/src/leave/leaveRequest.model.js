const mongoose =
  require("mongoose");

const {
  Schema,
} = mongoose;

const LEAVE_REQUEST_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "RETURNED",
  "CANCEL_REQUESTED",
  "CANCELLED",
  "AVAILED",
];

const LEAVE_DURATION_TYPES = [
  "FULL_DAY",
  "FIRST_HALF",
  "SECOND_HALF",
];

const LEAVE_REQUEST_SOURCES = [
  "WEB",
  "MOBILE",
  "WHATSAPP",
  "HR_ADMIN",
  "SYSTEM",
];

const approverSnapshotSchema =
  new Schema(
    {
      employeeId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Employee",

        default:
          null,
      },

      employeeCode: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      name: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      designation: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      orgUnitCode: {
        type:
          String,

        trim:
          true,

        uppercase:
          true,

        default:
          "",
      },
    },
    {
      _id:
        false,
    }
  );

const leaveAttachmentSchema =
  new Schema(
    {
      fileName: {
        type:
          String,

        trim:
          true,

        required:
          true,
      },

      originalName: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      mimeType: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      fileUrl: {
        type:
          String,

        trim:
          true,

        required:
          true,
      },

      uploadedAt: {
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

const leaveRequestSchema =
  new Schema(
    {
      requestNumber: {
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

        uppercase:
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

      leaveTypeId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "LeaveType",

        required:
          true,

        index:
          true,
      },

      leavePolicyId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "LeavePolicy",

        required:
          true,
      },

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

      fromDate: {
        type:
          String,

        required:
          true,

        index:
          true,
      },

      toDate: {
        type:
          String,

        required:
          true,

        index:
          true,
      },

      durationType: {
        type:
          String,

        enum:
          LEAVE_DURATION_TYPES,

        default:
          "FULL_DAY",
      },

      totalDays: {
        type:
          Number,

        required:
          true,

        min:
          0.5,
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

      emergency: {
        type:
          Boolean,

        default:
          false,
      },

      emergencyReason: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      contactDuringLeave: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      attachments: {
        type: [
          leaveAttachmentSchema,
        ],

        default:
          [],
      },

      status: {
        type:
          String,

        enum:
          LEAVE_REQUEST_STATUSES,

        default:
          "PENDING_APPROVAL",

        index:
          true,
      },

      currentApprovalLevel: {
        type:
          Number,

        default:
          1,

        min:
          1,
      },

      currentApproverEmployeeId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Employee",

        default:
          null,

        index:
          true,
      },

      currentApproverUserId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,

        index:
          true,
      },

      reportingManagerSnapshot: {
        type:
          approverSnapshotSchema,

        default:
          null,
      },

      appliedBalance: {
        balanceBefore: {
          type:
            Number,

          default:
            null,
        },

        requested: {
          type:
            Number,

          default:
            null,
        },

        balanceAfter: {
          type:
            Number,

          default:
            null,
        },
      },

      appliedAt: {
        type:
          Date,

        default:
          Date.now,
      },

      approvedAt: {
        type:
          Date,

        default:
          null,
      },

      rejectedAt: {
        type:
          Date,

        default:
          null,
      },

      returnedAt: {
        type:
          Date,

        default:
          null,
      },

      cancelRequestedAt: {
        type:
          Date,

        default:
          null,
      },

      cancelledAt: {
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

        default:
          "",
      },

      cancellationReason: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      source: {
        type:
          String,

        enum:
          LEAVE_REQUEST_SOURCES,

        default:
          "WEB",

        index:
          true,
      },

      /* =====================================================
         PUBLIC WHATSAPP APPROVAL

         Raw token is NEVER stored.
         Only SHA-256 hash is stored.

         Token is tied to the exact approver user.
      ===================================================== */

      publicApprovalTokenHash: {
        type:
          String,

        trim:
          true,

        default:
          null,

        select:
          false,

        index:
          true,
      },

      publicApprovalTokenExpiresAt: {
        type:
          Date,

        default:
          null,

        select:
          false,

        index:
          true,
      },

      publicApprovalTokenUsedAt: {
        type:
          Date,

        default:
          null,

        select:
          false,
      },

      publicApprovalApproverUserId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,

        select:
          false,

        index:
          true,
      },

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

        default:
          null,
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

/* Employee leave history */
leaveRequestSchema.index({
  employeeId:
    1,

  fromDate:
    -1,
});

/* Manager approval inbox */
leaveRequestSchema.index({
  currentApproverEmployeeId:
    1,

  status:
    1,

  appliedAt:
    -1,
});

/* Department / HOD view */
leaveRequestSchema.index({
  orgUnitCode:
    1,

  status:
    1,

  fromDate:
    -1,
});

/* HR reporting */
leaveRequestSchema.index({
  status:
    1,

  fromDate:
    1,

  toDate:
    1,
});

/* Public approval token lookup */
leaveRequestSchema.index({
  publicApprovalTokenHash:
    1,

  publicApprovalTokenExpiresAt:
    1,
});

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  LeaveRequest:
    mongoose.models
      .LeaveRequest ||
    mongoose.model(
      "LeaveRequest",
      leaveRequestSchema
    ),

  LEAVE_REQUEST_STATUSES,

  LEAVE_DURATION_TYPES,

  LEAVE_REQUEST_SOURCES,
};
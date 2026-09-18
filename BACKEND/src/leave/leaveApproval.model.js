const mongoose =
  require("mongoose");

const {
  Schema,
} = mongoose;

const LEAVE_APPROVAL_ACTIONS = [
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "RETURNED",
  "RESUBMITTED",
  "CANCEL_REQUESTED",
  "CANCEL_APPROVED",
  "CANCEL_REJECTED",
  "ADMIN_ADJUSTED",
];

const leaveApprovalSchema =
  new Schema(
    {
      leaveRequestId: {
        type: Schema.Types.ObjectId,
        ref: "LeaveRequest",
        required: true,
        index: true,
      },

      employeeId: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
        index: true,
      },

      approvalLevel: {
        type: Number,
        default: 1,
        min: 1,
      },

      approverEmployeeId: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        default: null,
        index: true,
      },

      approverUserId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true,
      },

      approverName: {
        type: String,
        trim: true,
        default: "",
      },

      approverDesignation: {
        type: String,
        trim: true,
        default: "",
      },

      approverOrgUnitCode: {
        type: String,
        trim: true,
        uppercase: true,
        default: "",
      },

      action: {
        type: String,
        enum:
          LEAVE_APPROVAL_ACTIONS,
        required: true,
        index: true,
      },

      comment: {
        type: String,
        trim: true,
        default: "",
        maxlength: 2000,
      },

      actedAt: {
        type: Date,
        default: Date.now,
        index: true,
      },

      ipAddress: {
        type: String,
        trim: true,
        default: "",
      },

      userAgent: {
        type: String,
        trim: true,
        default: "",
      },
    },
    {
      timestamps: true,
    }
  );

leaveApprovalSchema.index({
  leaveRequestId: 1,
  actedAt: 1,
});

leaveApprovalSchema.index({
  approverEmployeeId: 1,
  actedAt: -1,
});

module.exports = {
  LeaveApproval:
    mongoose.model(
      "LeaveApproval",
      leaveApprovalSchema
    ),

  LEAVE_APPROVAL_ACTIONS,
};
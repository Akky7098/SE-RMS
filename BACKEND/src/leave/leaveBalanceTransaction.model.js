const mongoose =
  require("mongoose");

const {
  Schema,
} = mongoose;

const TRANSACTION_TYPES = [
  "OPENING",
  "ACCRUAL",
  "CARRY_FORWARD",
  "LEAVE_PENDING",
  "LEAVE_APPROVED",
  "LEAVE_REJECTED",
  "LEAVE_CANCELLED",
  "HR_ADJUSTMENT",
  "EXPIRY",
  "COMP_OFF_CREDIT",
  "COMP_OFF_EXPIRY",
];

const leaveBalanceTransactionSchema =
  new Schema(
    {
      employeeId: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
        index: true,
      },

      leaveTypeId: {
        type: Schema.Types.ObjectId,
        ref: "LeaveType",
        required: true,
        index: true,
      },

      leaveBalanceId: {
        type: Schema.Types.ObjectId,
        ref: "LeaveBalance",
        required: true,
        index: true,
      },

      leaveRequestId: {
        type: Schema.Types.ObjectId,
        ref: "LeaveRequest",
        default: null,
        index: true,
      },

      year: {
        type: Number,
        required: true,
        index: true,
      },

      transactionType: {
        type: String,
        enum: TRANSACTION_TYPES,
        required: true,
        index: true,
      },

      quantity: {
        type: Number,
        required: true,
      },

      balanceBefore: {
        type: Number,
        required: true,
      },

      balanceAfter: {
        type: Number,
        required: true,
      },

      reason: {
        type: String,
        trim: true,
        default: "",
      },

      effectiveDate: {
        type: String,
        required: true,
      },

      expiresAt: {
        type: String,
        default: null,
      },

      reference: {
        type: String,
        trim: true,
        default: "",
      },

      performedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

leaveBalanceTransactionSchema.index({
  employeeId: 1,
  year: 1,
  createdAt: -1,
});

leaveBalanceTransactionSchema.index({
  leaveRequestId: 1,
  transactionType: 1,
});

module.exports = {
  LeaveBalanceTransaction:
    mongoose.model(
      "LeaveBalanceTransaction",
      leaveBalanceTransactionSchema
    ),

  TRANSACTION_TYPES,
};
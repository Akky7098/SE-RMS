const mongoose =
  require("mongoose");

const {
  Schema,
} = mongoose;

const leaveBalanceSchema =
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

      year: {
        type: Number,
        required: true,
        index: true,
      },

      openingBalance: {
        type: Number,
        default: 0,
      },

      carriedForward: {
        type: Number,
        default: 0,
      },

      accrued: {
        type: Number,
        default: 0,
      },

      adjustment: {
        type: Number,
        default: 0,
      },

      used: {
        type: Number,
        default: 0,
        min: 0,
      },

      pending: {
        type: Number,
        default: 0,
        min: 0,
      },

      expired: {
        type: Number,
        default: 0,
        min: 0,
      },

      available: {
        type: Number,
        default: 0,
      },

      lastCalculatedAt: {
        type: Date,
        default: null,
      },

      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

leaveBalanceSchema.index(
  {
    employeeId: 1,
    leaveTypeId: 1,
    year: 1,
  },
  {
    unique: true,
  }
);

module.exports =
  mongoose.model(
    "LeaveBalance",
    leaveBalanceSchema
  );
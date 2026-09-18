const mongoose =
  require("mongoose");

const {
  Schema,
} = mongoose;

/* =========================================================
   CONSTANTS
========================================================= */

const LEAVE_CATEGORIES = [
  "PAID",
  "UNPAID",
  "COMPENSATORY",
  "STATUTORY",
];

const LEAVE_TYPE_CODES = [
  "PL",
  "CL",
  "SL",
  "MATERNITY",
  "COMP_OFF",
  "BEREAVEMENT",
  "LWP",
];

/* =========================================================
   SCHEMA
========================================================= */

const leaveTypeSchema =
  new Schema(
    {
      code: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        unique: true,
        index: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },

      shortName: {
        type: String,
        trim: true,
        default: "",
      },

      description: {
        type: String,
        trim: true,
        default: "",
      },

      category: {
        type: String,
        enum: LEAVE_CATEGORIES,
        required: true,
        index: true,
      },

      isPaid: {
        type: Boolean,
        default: true,
      },

      requiresBalance: {
        type: Boolean,
        default: true,
      },

      /*
       * SE-RMS current leave-request UI is being kept
       * FULL DAY only.
       *
       * Keep this field because the model/policy architecture
       * supports future half-day enablement without migration.
       */
      allowHalfDay: {
        type: Boolean,
        default: false,
      },

      allowNegativeBalance: {
        type: Boolean,
        default: false,
      },

      requiresReason: {
        type: Boolean,
        default: true,
      },

      supportsAttachment: {
        type: Boolean,
        default: false,
      },

      active: {
        type: Boolean,
        default: true,
        index: true,
      },

      displayOrder: {
        type: Number,
        default: 0,
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

/* =========================================================
   INDEXES
========================================================= */

leaveTypeSchema.index({
  active: 1,
  displayOrder: 1,
});

/* =========================================================
   MODEL
========================================================= */

const LeaveType =
  mongoose.models.LeaveType ||
  mongoose.model(
    "LeaveType",
    leaveTypeSchema
  );

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  LeaveType,

  LEAVE_CATEGORIES,

  LEAVE_TYPE_CODES,
};
const mongoose =
  require("mongoose");

const {
  Schema,
} = mongoose;

/* =========================================================
   FKWEB COMMAND

   Persistent command queue.

   IMPORTANT:
   Never keep historical sync command state only in memory.
   Node restarts must not destroy sync state.
========================================================= */

const FKWEB_COMMAND_TYPES = [
  "GET_LOG_DATA",
];

const FKWEB_COMMAND_STATUSES = [
  "QUEUED",
  "SENT",
  "RECEIVING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
];

const fkWebCommandSchema =
  new Schema(
    {
      deviceId: {
        type:
          String,

        required:
          true,

        trim:
          true,

        index:
          true,
      },

      commandType: {
        type:
          String,

        enum:
          FKWEB_COMMAND_TYPES,

        required:
          true,

        index:
          true,
      },

      transactionId: {
        type:
          String,

        required:
          true,

        trim:
          true,

        unique:
          true,

        index:
          true,
      },

      /* =====================================================
         HISTORY WINDOW

         Stored as actual dates for audit/reporting.

         Device-specific formatting belongs in command service.
      ===================================================== */

      from: {
        type:
          Date,

        required:
          true,

        index:
          true,
      },

      to: {
        type:
          Date,

        required:
          true,

        index:
          true,
      },

      syncBatchId: {
        type:
          String,

        required:
          true,

        trim:
          true,

        index:
          true,
      },

      status: {
        type:
          String,

        enum:
          FKWEB_COMMAND_STATUSES,

        default:
          "QUEUED",

        index:
          true,
      },

      /* =====================================================
         DELIVERY
      ===================================================== */

      queuedAt: {
        type:
          Date,

        default:
          Date.now,
      },

      sentAt: {
        type:
          Date,

        default:
          null,
      },

      firstResultAt: {
        type:
          Date,

        default:
          null,
      },

      completedAt: {
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

      /* =====================================================
         COUNTERS
      ===================================================== */

      resultBlocks: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      recordsReceived: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      recordsInserted: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      recordsDuplicate: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      recordsMapped: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      recordsUnmapped: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      recordsFailed: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      /* =====================================================
         RESULT / ERROR

         Never store huge binary payloads here.

         Raw punch payload belongs in RawAttendancePunch.
      ===================================================== */

      resultCode: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      lastError: {
        type:
          String,

        trim:
          true,

        default:
          "",

        maxlength:
          4000,
      },

      metadata: {
        type:
          Schema.Types.Mixed,

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

fkWebCommandSchema.index({
  deviceId:
    1,

  status:
    1,

  queuedAt:
    1,
});

fkWebCommandSchema.index({
  deviceId:
    1,

  from:
    1,

  to:
    1,
});

const FkWebCommand =
  mongoose.models
    .FkWebCommand ||
  mongoose.model(
    "FkWebCommand",
    fkWebCommandSchema
  );

module.exports = {
  FkWebCommand,

  FKWEB_COMMAND_TYPES,

  FKWEB_COMMAND_STATUSES,
};
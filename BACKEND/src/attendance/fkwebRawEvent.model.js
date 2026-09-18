const mongoose =
  require("mongoose");

const {
  Schema,
} = mongoose;

/* =========================================================
   FKWEB RAW EVENT

   Completely independent of SE-RMS Employee master.

   Used for:
   - Realtime machine employee/enrollment data
   - Realtime biometric punch data
   - Demo/raw attendance audit
========================================================= */

const fkWebRawEventSchema =
  new Schema(
    {
      deviceId: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },

      eventType: {
        type: String,

        enum: [
          "ENROLLMENT",
          "PUNCH",
        ],

        required: true,
        index: true,
      },

      biometricCode: {
        type: String,
        trim: true,
        default: "",
        index: true,
      },

      employeeName: {
        type: String,
        trim: true,
        default: "",
      },

      eventTime: {
        type: Date,
        required: true,
        index: true,
      },

      ioMode: {
        type: String,
        trim: true,
        default: "",
      },

      verifyMode: {
        type: String,
        trim: true,
        default: "",
      },

      recordId: {
        type: String,
        trim: true,
        default: "",
      },

      transactionId: {
        type: String,
        trim: true,
        default: "",
      },

      requestCode: {
        type: String,
        trim: true,
        default: "",
      },

      protocol: {
        type: String,
        trim: true,
        default: "",
      },

      uniqueEventKey: {
        type: String,
        required: true,
        trim: true,
      },

      rawPayload: {
        type:
          Schema.Types.Mixed,

        default:
          null,
      },

      receivedAt: {
        type: Date,
        default:
          Date.now,
        index: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
      minimize: false,
    }
  );

/* =========================================================
   UNIQUE EVENT

   Prevent duplicate punch resend from creating
   duplicate attendance.
========================================================= */

fkWebRawEventSchema.index(
  {
    uniqueEventKey:
      1,
  },
  {
    unique:
      true,
  }
);

fkWebRawEventSchema.index({
  deviceId:
    1,

  eventType:
    1,

  eventTime:
    1,
});

fkWebRawEventSchema.index({
  biometricCode:
    1,

  eventTime:
    1,
});

module.exports =
  mongoose.models
    .FkWebRawEvent ||
  mongoose.model(
    "FkWebRawEvent",
    fkWebRawEventSchema
  );
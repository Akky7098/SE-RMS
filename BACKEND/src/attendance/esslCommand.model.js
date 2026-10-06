const mongoose =
  require("mongoose");

const esslCommandSchema =
  new mongoose.Schema(
    {
      deviceSerialNumber: {
        type: String,
        required: true,
        index: true,
      },

      commandId: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      commandType: {
        type: String,
        default: "DATA_QUERY_ATTLOG",
      },

      from: {
        type: Date,
        required: true,
      },

      to: {
        type: Date,
        required: true,
      },

      commandText: {
        type: String,
        required: true,
      },

      status: {
        type: String,
        enum: [
          "PENDING",
          "SENT",
          "ACKNOWLEDGED",
          "FAILED",
        ],
        default: "PENDING",
        index: true,
      },

      queuedAt: {
        type: Date,
        default: Date.now,
      },

      sentAt: {
        type: Date,
        default: null,
      },

      acknowledgedAt: {
        type: Date,
        default: null,
      },

      returnCode: {
        type: Number,
        default: null,
      },

      rawResult: {
        type: String,
        default: "",
      },
    },
    {
      timestamps: true,
    }
  );

esslCommandSchema.index({
  deviceSerialNumber: 1,
  status: 1,
  queuedAt: 1,
});

const EsslCommand =
  mongoose.models.EsslCommand ||
  mongoose.model(
    "EsslCommand",
    esslCommandSchema
  );

module.exports = {
  EsslCommand,
};
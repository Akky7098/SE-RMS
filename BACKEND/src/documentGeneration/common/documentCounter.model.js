const mongoose =
  require("mongoose");

const {
  Schema,
} = mongoose;

/* =========================================================
   DOCUMENT COUNTER

   Used for atomic document numbering.

   Example key:
   LOI:2026:SEP

   Sequence:
   1, 2, 3...
========================================================= */

const documentCounterSchema =
  new Schema(
    {
      key: {
        type: String,

        required: true,

        unique: true,

        index: true,

        trim: true,
      },

      documentType: {
        type: String,

        required: true,

        trim: true,

        uppercase: true,
      },

      year: {
        type: Number,

        required: true,
      },

      period: {
        type: String,

        trim: true,

        default: "",
      },

      sequence: {
        type: Number,

        required: true,

        default: 0,
      },
    },
    {
      timestamps: true,

      versionKey: false,
    }
  );

/* =========================================================
   MODEL
========================================================= */

const DocumentCounter =
  mongoose.models
    .DocumentCounter ||
  mongoose.model(
    "DocumentCounter",
    documentCounterSchema
  );

module.exports = {
  DocumentCounter,
};
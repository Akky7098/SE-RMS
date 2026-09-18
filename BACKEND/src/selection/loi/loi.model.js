const mongoose =
  require("mongoose");

const {
  Schema,
} = mongoose;

/* =========================================================
   CONSTANTS
========================================================= */

const LOI_STATUSES = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "DECLINED",
  "SUPERSEDED",
  "CANCELLED",
];

const LOI_SOURCES = [
  "GENERATED",
  "UPLOADED",
];

const EMAIL_STATUSES = [
  "NOT_SENT",
  "PENDING",
  "SENT",
  "FAILED",
];

/* =========================================================
   FILE
========================================================= */

const loiFileSchema =
  new Schema(
    {
      fileName: {
        type: String,
        trim: true,
        default: "",
      },

      relativePath: {
        type: String,
        trim: true,
        default: "",
      },

      mimeType: {
        type: String,
        trim: true,
        default:
          "application/pdf",
      },

      size: {
        type: Number,
        default: 0,
      },

      sha256: {
        type: String,
        trim: true,
        default: "",
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   EMAIL DELIVERY
========================================================= */

const emailDeliverySchema =
  new Schema(
    {
      status: {
        type: String,

        enum:
          EMAIL_STATUSES,

        default:
          "NOT_SENT",
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: "",
      },

      cc: [
        {
          type: String,
          trim: true,
          lowercase: true,
        },
      ],

      subject: {
        type: String,
        trim: true,
        default: "",
      },

      sentAt: {
        type: Date,
        default: null,
      },

      failedAt: {
        type: Date,
        default: null,
      },

      lastAttemptAt: {
        type: Date,
        default: null,
      },

      messageId: {
        type: String,
        trim: true,
        default: "",
      },

      error: {
        type: String,
        trim: true,
        default: "",
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   LOI
========================================================= */

const loiSchema =
  new Schema(
    {
      selection: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Selection",

        required: true,

        index: true,
      },

      candidate: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Candidate",

        required: true,

        index: true,
      },

      manpowerRequirement: {
        type:
          Schema.Types.ObjectId,

        ref:
          "ManpowerRequirement",

        required: true,
      },

      /* =====================================================
         DOCUMENT IDENTITY
      ===================================================== */

      documentNumber: {
        type: String,

        required: true,

        unique: true,

        index: true,

        trim: true,
      },

      version: {
        type: Number,

        required: true,

        min: 1,

        default: 1,
      },

      source: {
        type: String,

        enum:
          LOI_SOURCES,

        default:
          "GENERATED",

        required: true,
      },

      status: {
        type: String,

        enum:
          LOI_STATUSES,

        default:
          "DRAFT",

        required: true,

        index: true,
      },

      /* =====================================================
         SNAPSHOT

         Important:
         If candidate data changes later, we still know
         exactly what values were used in this LOI.
      ===================================================== */

      variables: {
        type:
          Schema.Types.Mixed,

        default:
          {},
      },

      positionTitle: {
        type: String,
        trim: true,
        default: "",
      },

      officeLocation: {
        type: String,
        trim: true,
        default: "",
      },

      proposedJoiningDate: {
        type: Date,
        default: null,
      },

      issueDate: {
        type: Date,
        default:
          Date.now,
      },

      /* =====================================================
         GENERATED FILE
      ===================================================== */

      file: {
        type:
          loiFileSchema,

        required: true,
      },

      /* =====================================================
         COMMUNICATION
      ===================================================== */

      candidateEmail: {
        type:
          emailDeliverySchema,

        default:
          () => ({
            status:
              "NOT_SENT",
          }),
      },

      /* =====================================================
         RESPONSE
      ===================================================== */

      sentAt: {
        type: Date,
        default: null,
      },

      acceptedAt: {
        type: Date,
        default: null,
      },

      declinedAt: {
        type: Date,
        default: null,
      },

      declineReason: {
        type: String,
        trim: true,
        default: "",
      },

      responseIp: {
        type: String,
        trim: true,
        default: "",
      },

      responseUserAgent: {
        type: String,
        trim: true,
        default: "",
      },

      /* =====================================================
         VERSIONING
      ===================================================== */

      supersedes: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Loi",

        default: null,
      },

      supersededBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Loi",

        default: null,
      },

      /* =====================================================
         AUDIT
      ===================================================== */

      generatedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default: null,
      },

      generatedAt: {
        type: Date,

        default:
          Date.now,
      },

      updatedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default: null,
      },
    },
    {
      timestamps: true,

      versionKey: false,
    }
  );

/* =========================================================
   INDEXES
========================================================= */

loiSchema.index(
  {
    selection:
      1,

    version:
      1,
  },
  {
    unique:
      true,
  }
);

loiSchema.index({
  candidate:
    1,

  createdAt:
    -1,
});

/* =========================================================
   MODEL
========================================================= */

const Loi =
  mongoose.models
    .Loi ||
  mongoose.model(
    "Loi",
    loiSchema
  );

module.exports = {
  Loi,

  LOI_STATUSES,

  LOI_SOURCES,

  EMAIL_STATUSES,
};
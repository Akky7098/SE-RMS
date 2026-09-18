const mongoose = require("mongoose");

const { Schema } = mongoose;

/* =========================================================
   CONSTANTS
========================================================= */

const OFFER_STATUSES = [
  "DRAFT",
  "GENERATED",
  "SENT",
  "ACCEPTED",
  "DECLINED",
  "CANCELLED",
];

/* =========================================================
   OFFER SCHEMA
========================================================= */

const offerSchema = new Schema(
  {
    selection: {
      type: Schema.Types.ObjectId,
      ref: "Selection",
      required: true,
      index: true,
    },

    candidate: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },

    /* =====================================================
       CONTROLLED DOCUMENT IDENTITY
    ===================================================== */

    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    version: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },

    status: {
      type: String,
      enum: OFFER_STATUSES,
      default: "DRAFT",
      index: true,
    },

    /* =====================================================
       LEGAL DOCUMENT VARIABLES
    ===================================================== */

    issueDate: {
      type: Date,
      required: true,
    },

    candidateTitle: {
      type: String,
      trim: true,
      default: "Mr.",
    },

    candidateName: {
      type: String,
      required: true,
      trim: true,
    },

    fatherName: {
      type: String,
      trim: true,
      default: "",
    },

    residentialAddress: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    mobile: {
      type: String,
      trim: true,
      default: "",
    },

    positionTitle: {
      type: String,
      required: true,
      trim: true,
    },

    officeLocation: {
      type: String,
      trim: true,
      default: "Delhi",
    },

    compensationText: {
      type: String,
      trim: true,
      default:
        "Your compensation will be as agreed during our discussions.",
    },

    reportingDate: {
      type: Date,
      required: true,
    },

    /* =====================================================
       HR CONTACT
    ===================================================== */

    hrName: {
      type: String,
      trim: true,
      default: "",
    },

    hrDesignation: {
      type: String,
      trim: true,
      default: "HR Executive",
    },

    hrEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "hrd@sandeepedgetech.com",
    },

    signatoryName: {
      type: String,
      trim: true,
      default: "Renu",
    },

    signatoryDesignation: {
      type: String,
      trim: true,
      default: "HR Manager",
    },

    /* =====================================================
       GENERATED PDF SNAPSHOT
    ===================================================== */

    pdf: {
      fileName: {
        type: String,
        trim: true,
        default: "",
      },

      path: {
        type: String,
        trim: true,
        default: "",
      },

      mimeType: {
        type: String,
        trim: true,
        default: "application/pdf",
      },

      generatedAt: {
        type: Date,
        default: null,
      },

      generatedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },

    /* =====================================================
       HR REVIEW CONTROL
    ===================================================== */

    reviewedAt: {
      type: Date,
      default: null,
    },

    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /* =====================================================
       SEND
    ===================================================== */

    sentAt: {
      type: Date,
      default: null,
    },

    sentBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    sentToEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    /* =====================================================
       CANDIDATE RESPONSE
    ===================================================== */

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

    /* =====================================================
       AUDIT
    ===================================================== */

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
    versionKey: false,
  }
);

/* =========================================================
   INDEXES
========================================================= */

offerSchema.index({
  selection: 1,
  version: -1,
});

offerSchema.index({
  candidate: 1,
  createdAt: -1,
});

/* =========================================================
   MODEL
========================================================= */

const Offer =
  mongoose.models.Offer ||
  mongoose.model(
    "Offer",
    offerSchema
  );

module.exports = {
  Offer,
  OFFER_STATUSES,
};
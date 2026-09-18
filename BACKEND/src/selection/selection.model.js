const mongoose =
  require("mongoose");

const {
  Schema,
} = mongoose;

/* =========================================================
   STATUSES

   This is the single source of truth for the
   post-selection candidate journey.
========================================================= */

const SELECTION_STATUSES = [
  "LOI_PENDING",
  "LOI_DRAFT",
  "LOI_SENT",
  "LOI_ACCEPTED",
  "LOI_DECLINED",

  "PRE_JOINING_DOCUMENTS",
  "DOCUMENTS_SUBMITTED",
  "DOCUMENT_VERIFICATION",
  "DOCUMENT_QUERY",
  "DOCUMENTS_VERIFIED",

  "READY_FOR_OFFER",
  "OFFER_DRAFT",
  "OFFER_SENT",
  "OFFER_ACCEPTED",
  "OFFER_DECLINED",

  "JOINING_PENDING",
"JOINING_RESCHEDULED",
"NO_SHOW",
"JOINING_CONFIRMED",
"JOINING_DECLINED",

"COMPLETED",
"CLOSED",
];

/* =========================================================
   OFFICE
========================================================= */

const OFFICE_LOCATIONS = [
  "DELHI",
  "SONIPAT",
];

/* =========================================================
   AUDIT EVENT
========================================================= */

const selectionAuditSchema =
  new Schema(
    {
      event: {
        type: String,
        trim: true,
        required: true,
      },

      fromStatus: {
        type: String,
        trim: true,
        default: "",
      },

      toStatus: {
        type: String,
        trim: true,
        default: "",
      },

      remarks: {
        type: String,
        trim: true,
        default: "",
      },

      performedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default: null,
      },

      metadata: {
        type:
          Schema.Types.Mixed,

        default:
          null,
      },

      at: {
        type: Date,

        default:
          Date.now,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   SELECTION
========================================================= */

const selectionSchema =
  new Schema(
    {
      /* =====================================================
         NUMBER
      ===================================================== */

      selectionNumber: {
        type: String,

        required: true,

        unique: true,

        index: true,

        trim: true,
      },

      /* =====================================================
         SOURCE RECORDS
      ===================================================== */

      candidate: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Candidate",

        required: true,

        index: true,
      },

      evaluation: {
        type:
          Schema.Types.ObjectId,

        ref:
          "InterviewEvaluation",

        required: true,

        unique: true,

        index: true,
      },

      interview: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Interview",

        required: true,

        index: true,
      },

      manpowerRequirement: {
        type:
          Schema.Types.ObjectId,

        ref:
          "ManpowerRequirement",

        required: true,

        index: true,
      },

      department: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Department",

        default: null,

        index: true,
      },

      /* =====================================================
         EMPLOYMENT
      ===================================================== */

      positionTitle: {
        type: String,

        trim: true,

        required: true,
      },

      employmentType: {
        type: String,

        trim: true,

        default:
          "FULL_TIME",
      },

      officeLocation: {
        type: String,

        enum: [
          "",
          ...OFFICE_LOCATIONS,
        ],

        default: "",
      },

      proposedJoiningDate: {
        type: Date,

        default: null,
      },

      finalJoiningDate: {
        type: Date,

        default: null,
      },

      /* =====================================================
         OWNER

         Usually copied automatically from manpower
         requirement.assignedHr.
      ===================================================== */

      hiringHr: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default: null,

        index: true,
      },

      /* =====================================================
         WORKFLOW
      ===================================================== */

      status: {
        type: String,

        enum:
          SELECTION_STATUSES,

        default:
          "LOI_PENDING",

        required: true,

        index: true,
      },

      selectedAt: {
        type: Date,

        default:
          Date.now,
      },

      /* =====================================================
         LOI

         Actual LOI data stays in Loi model.
         Selection only points to current document.
      ===================================================== */

      currentLoi: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Loi",

        default: null,
      },

      loiSentAt: {
        type: Date,
        default: null,
      },

      loiAcceptedAt: {
        type: Date,
        default: null,
      },

      loiDeclinedAt: {
        type: Date,
        default: null,
      },

      /* =====================================================
         DOCUMENTS
      ===================================================== */

      documentsSubmittedAt: {
        type: Date,
        default: null,
      },

      documentVerificationStartedAt: {
        type: Date,
        default: null,
      },

      documentsVerifiedAt: {
        type: Date,
        default: null,
      },

      /* =====================================================
         OFFER
      ===================================================== */

      currentOffer: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Offer",

        default: null,
      },

      readyForOfferAt: {
        type: Date,
        default: null,
      },

      offerSentAt: {
        type: Date,
        default: null,
      },

      offerAcceptedAt: {
        type: Date,
        default: null,
      },

      offerDeclinedAt: {
        type: Date,
        default: null,
      },

      /* =====================================================
         JOINING
      ===================================================== */

      joiningConfirmedAt: {
        type: Date,
        default: null,
      },

      /* =====================================================
         CLOSURE
      ===================================================== */

      closedAt: {
        type: Date,
        default: null,
      },

      closedReason: {
        type: String,
        trim: true,
        default: "",
      },

      isActive: {
        type: Boolean,
        default: true,
        index: true,
      },

      /* =====================================================
         AUDIT
      ===================================================== */

      auditTrail: {
        type: [
          selectionAuditSchema,
        ],

        default: [],
      },

      createdBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default: null,
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

selectionSchema.index({
  status:
    1,

  createdAt:
    -1,
});

selectionSchema.index({
  hiringHr:
    1,

  status:
    1,
});

selectionSchema.index({
  candidate:
    1,

  isActive:
    1,
});

/* =========================================================
   COUNTER

   Keeping counter in SAME FILE deliberately.

   No extra 40-line selectionCounter.model.js.
========================================================= */

const selectionCounterSchema =
  new Schema(
    {
      key: {
        type: String,

        required: true,

        unique: true,

        index: true,
      },

      sequence: {
        type: Number,

        default: 0,

        required: true,
      },
    },
    {
      timestamps: true,

      versionKey: false,
    }
  );

/* =========================================================
   MODELS
========================================================= */

const Selection =
  mongoose.models
    .Selection ||
  mongoose.model(
    "Selection",
    selectionSchema
  );

const SelectionCounter =
  mongoose.models
    .SelectionCounter ||
  mongoose.model(
    "SelectionCounter",
    selectionCounterSchema
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  Selection,

  SelectionCounter,

  SELECTION_STATUSES,

  OFFICE_LOCATIONS,
};
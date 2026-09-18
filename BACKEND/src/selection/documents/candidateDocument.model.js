const mongoose =
  require("mongoose");

const {
  Schema,
} =
  mongoose;

/* =========================================================
   DOCUMENT TYPES
========================================================= */

const DOCUMENT_TYPES = [
  "AADHAAR",
  "PAN",
  "BANK_PROOF",

  "HIGHEST_QUALIFICATION",
  "PHOTO",
  "SIGNATURE",

  "EXPERIENCE_LETTER",
  "RELIEVING_LETTER",
  "SALARY_SLIP",
  "PREVIOUS_APPOINTMENT_LETTER",

  "FORM16",
  "OTHER",
];

/* =========================================================
   DOCUMENT STATUS
========================================================= */

const DOCUMENT_STATUSES = [
  "PENDING",
  "QUERY",
  "VERIFIED",
  "REPLACED",
];

/* =========================================================
   RECORD STATUS
========================================================= */

const DOCUMENT_RECORD_STATUSES = [
  "DRAFT",
  "UNDER_VERIFICATION",
  "QUERY",
  "VERIFIED",
];

/* =========================================================
   EMAIL TRACKING
========================================================= */

const emailTrackingSchema =
  new Schema(
    {
      status: {
        type: String,

        enum: [
          "NOT_SENT",
          "PENDING",
          "SENT",
          "FAILED",
        ],

        default:
          "NOT_SENT",
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: "",
      },

      cc: {
        type: [String],
        default: [],
      },

      subject: {
        type: String,
        trim: true,
        default: "",
      },

      messageId: {
        type: String,
        trim: true,
        default: "",
      },

      lastAttemptAt: {
        type: Date,
        default: null,
      },

      sentAt: {
        type: Date,
        default: null,
      },

      failedAt: {
        type: Date,
        default: null,
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
   PERSONAL
========================================================= */

const personalSchema =
  new Schema(
    {
      currentAddress: {
        type: String,
        trim: true,
        default: "",
      },

      permanentAddress: {
        type: String,
        trim: true,
        default: "",
      },

      dateOfBirth: {
        type: Date,
        default: null,
      },

      emergencyContactName: {
        type: String,
        trim: true,
        default: "",
      },

      emergencyContactNumber: {
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
   EMPLOYMENT
========================================================= */

const employmentSchema =
  new Schema(
    {
      isFresher: {
        type: Boolean,
        default: null,
      },

      previousCompany: {
        type: String,
        trim: true,
        default: "",
      },

      previousDesignation: {
        type: String,
        trim: true,
        default: "",
      },

      lastWorkingDate: {
        type: Date,
        default: null,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   BANK
========================================================= */

const bankSchema =
  new Schema(
    {
      accountHolderName: {
        type: String,
        trim: true,
        default: "",
      },

      bankName: {
        type: String,
        trim: true,
        default: "",
      },

      accountNumber: {
        type: String,
        trim: true,
        default: "",
      },

      ifscCode: {
        type: String,
        trim: true,
        uppercase: true,
        default: "",
      },

      branch: {
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
   DOCUMENT SCAN METADATA
========================================================= */

const documentScanSchema =
  new Schema(
    {
      scanned: {
        type: Boolean,
        default: false,
      },

      sourceKind: {
        type: String,

        enum: [
          "",
          "IMAGE",
          "PDF_TEXT",
        ],

        default: "",
      },

      detectedType: {
        type: String,
        trim: true,
        default: "",
      },

      confidence: {
        type: Number,
        default: null,
      },

      qualityScore: {
        type: Number,
        default: null,
      },

      width: {
        type: Number,
        default: null,
      },

      height: {
        type: Number,
        default: null,
      },

      warning: {
        type: String,
        trim: true,
        default: "",
      },

      /*
       * Extracted information is intentionally limited.
       *
       * We do NOT store the full OCR body.
       */
      extracted: {
        ifsc: {
          type: String,
          trim: true,
          uppercase: true,
          default: "",
        },

        accountHash: {
          type: String,
          trim: true,
          default: "",
        },

        accountLast4: {
          type: String,
          trim: true,
          default: "",
        },

        panMasked: {
          type: String,
          trim: true,
          default: "",
        },

        aadhaarLast4: {
          type: String,
          trim: true,
          default: "",
        },
      },

      checkedAt: {
        type: Date,
        default: null,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   DOCUMENT
========================================================= */

const documentSchema =
  new Schema(
    {
      type: {
        type: String,
        enum: DOCUMENT_TYPES,
        required: true,
        index: true,
      },

      originalName: {
        type: String,
        trim: true,
        required: true,
      },

      storedName: {
        type: String,
        trim: true,
        required: true,
      },

      mimeType: {
        type: String,
        trim: true,
        required: true,
      },

      size: {
        type: Number,
        default: 0,
      },

      relativePath: {
        type: String,
        trim: true,
        required: true,
      },

      /*
       * SHA-256 of the exact uploaded bytes.
       *
       * Used to stop the same file being uploaded as
       * Aadhaar + PAN + Bank Proof etc.
       */
      fingerprint: {
        type: String,
        trim: true,
        lowercase: true,
        default: "",
        index: true,
      },

      scan: {
        type: documentScanSchema,
        default: () => ({}),
      },

      version: {
        type: Number,
        min: 1,
        default: 1,
      },

      isCurrent: {
        type: Boolean,
        default: true,
        index: true,
      },

      status: {
        type: String,
        enum: DOCUMENT_STATUSES,
        default: "PENDING",
        index: true,
      },

      queryMessage: {
        type: String,
        trim: true,
        default: "",
      },

      uploadedAt: {
        type: Date,
        default: Date.now,
      },

      queriedAt: {
        type: Date,
        default: null,
      },

      verifiedAt: {
        type: Date,
        default: null,
      },

      replacedAt: {
        type: Date,
        default: null,
      },

      replacedByDocument: {
        type: Schema.Types.ObjectId,
        default: null,
      },
    },
    {
      _id: true,
      timestamps: false,
    }
  );

/* =========================================================
   QUERY HISTORY
========================================================= */

const documentQueryHistorySchema =
  new Schema(
    {
      cycle: {
        type: Number,
        default: 1,
      },

      generalComment: {
        type: String,
        trim: true,
        default: "",
      },

      fieldQueries: {
        type: Schema.Types.Mixed,
        default: () => ({}),
      },

      documentQueries: [
        {
          documentId: {
            type: Schema.Types.ObjectId,
            default: null,
          },

          type: {
            type: String,
            trim: true,
            default: "",
          },

          originalName: {
            type: String,
            trim: true,
            default: "",
          },

          comment: {
            type: String,
            trim: true,
            default: "",
          },
        },
      ],

      requestedAt: {
        type: Date,
        default: Date.now,
      },

      requestedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      resubmittedAt: {
        type: Date,
        default: null,
      },

      resolvedAt: {
        type: Date,
        default: null,
      },
    },
    {
      _id: true,
    }
  );

/* =========================================================
   MAIN RECORD
========================================================= */

const candidateDocumentRecordSchema =
  new Schema(
    {
      selection: {
        type: Schema.Types.ObjectId,
        ref: "Selection",
        required: true,
        unique: true,
        index: true,
      },

      candidate: {
        type: Schema.Types.ObjectId,
        ref: "Candidate",
        required: true,
        index: true,
      },

      status: {
        type: String,
        enum: DOCUMENT_RECORD_STATUSES,
        default: "DRAFT",
        index: true,
      },

      personal: {
        type: personalSchema,
        default: () => ({}),
      },

      employment: {
        type: employmentSchema,
        default: () => ({}),
      },

      bank: {
        type: bankSchema,
        default: () => ({}),
      },

      documents: {
        type: [documentSchema],
        default: [],
      },

      /* =====================================================
         CURRENT ACTIVE HR QUERY
      ===================================================== */

      fieldQueries: {
        type: Schema.Types.Mixed,
        default: () => ({}),
      },

      generalQueryMessage: {
        type: String,
        trim: true,
        default: "",
      },

      queriedAt: {
        type: Date,
        default: null,
      },

      queriedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      queryHistory: {
        type: [documentQueryHistorySchema],
        default: [],
      },

      /* =====================================================
         SUBMISSION
      ===================================================== */

      declarationAcceptedAt: {
        type: Date,
        default: null,
      },

      submittedAt: {
        type: Date,
        default: null,
      },

      lastResubmittedAt: {
        type: Date,
        default: null,
      },

      /* =====================================================
         VERIFICATION
      ===================================================== */

      verifiedAt: {
        type: Date,
        default: null,
      },

      verifiedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      /* =====================================================
         EMAIL TRACKING
      ===================================================== */

      hrNotificationEmail: {
        type: emailTrackingSchema,
        default: () => ({}),
      },

      candidateConfirmationEmail: {
        type: emailTrackingSchema,
        default: () => ({}),
      },

      queryNotificationEmail: {
        type: emailTrackingSchema,
        default: () => ({}),
      },

      verificationEmail: {
        type: emailTrackingSchema,
        default: () => ({}),
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

candidateDocumentRecordSchema.index({
  candidate: 1,
  createdAt: -1,
});

candidateDocumentRecordSchema.index({
  status: 1,
  updatedAt: -1,
});

candidateDocumentRecordSchema.index({
  selection: 1,
  "documents.fingerprint": 1,
});

/* =========================================================
   MODEL
========================================================= */

const CandidateDocumentRecord =
  mongoose.models
    .CandidateDocumentRecord ||
  mongoose.model(
    "CandidateDocumentRecord",
    candidateDocumentRecordSchema
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  CandidateDocumentRecord,

  DOCUMENT_TYPES,

  DOCUMENT_STATUSES,

  DOCUMENT_RECORD_STATUSES,
};
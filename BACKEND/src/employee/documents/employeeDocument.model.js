const mongoose =
  require("mongoose");

const {
  Schema,
} = mongoose;

/* =========================================================
   DOCUMENT CATEGORY

   Broad permanent categories.

   Do NOT create 30 different models for different document
   types. documentType + label remain dynamic.
========================================================= */

const EMPLOYEE_DOCUMENT_CATEGORIES = [
  "RECRUITMENT",
  "IDENTITY",
  "ADDRESS",
  "EDUCATION",
  "EXPERIENCE",
  "PAYROLL",
  "BANK",
  "OFFER",
  "JOINING",
  "COMPANY_DOCUMENT",
  "ASSET",
  "APPOINTMENT",
  "SYSTEM",
  "MASTER_FILE",
  "OTHER",
];

/* =========================================================
   SOURCE
========================================================= */

const EMPLOYEE_DOCUMENT_SOURCES = [
  "RECRUITMENT",
  "CANDIDATE_PORTAL",
  "HR_UPLOAD",
  "GENERATED",
  "SYSTEM",
];

/* =========================================================
   STATUS
========================================================= */

const EMPLOYEE_DOCUMENT_STATUSES = [
  "ACTIVE",
  "REPLACED",
  "DELETED",
];

/* =========================================================
   DOCUMENT MODEL
========================================================= */

const employeeDocumentSchema =
  new Schema(
    {
      /* =====================================================
         OWNER
      ===================================================== */

      employee: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Employee",

        required:
          true,

        index:
          true,
      },

      onboarding: {
        type:
          Schema.Types.ObjectId,

        ref:
          "EmployeeOnboarding",

        default:
          null,

        index:
          true,
      },

      /* =====================================================
         DOCUMENT IDENTITY
      ===================================================== */

      category: {
        type:
          String,

        enum:
          EMPLOYEE_DOCUMENT_CATEGORIES,

        default:
          "OTHER",

        required:
          true,

        index:
          true,
      },

      /*
       * Machine-friendly dynamic type.

       * Examples:
       *
       * AADHAAR
       * PAN
       * CV
       * OFFER_LETTER
       * EXPERIENCE_LETTER
       * NDA
       * ASSET_ACKNOWLEDGEMENT
       * MASTER_EMPLOYEE_FILE
       */
      documentType: {
        type:
          String,

        trim:
          true,

        uppercase:
          true,

        required:
          true,

        maxlength:
          100,

        index:
          true,
      },

      /*
       * Human-readable label.
       */
      label: {
        type:
          String,

        trim:
          true,

        required:
          true,

        maxlength:
          160,
      },

      description: {
        type:
          String,

        trim:
          true,

        default:
          "",

        maxlength:
          1000,
      },

      /* =====================================================
         SOURCE
      ===================================================== */

      source: {
        type:
          String,

        enum:
          EMPLOYEE_DOCUMENT_SOURCES,

        default:
          "HR_UPLOAD",

        required:
          true,

        index:
          true,
      },

      /*
       * Used to prevent the same recruitment document
       * from being imported repeatedly.
       */
      sourceRecordType: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      sourceRecordId: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      sourceDocumentId: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      /*
       * Stable identifier created from source details.
       */
      sourceFingerprint: {
        type:
          String,

        trim:
          true,

        default:
          "",

        index:
          true,
      },

      /* =====================================================
         FILE
      ===================================================== */

      originalFileName: {
        type:
          String,

        trim:
          true,

        required:
          true,

        maxlength:
          255,
      },

      storedFileName: {
        type:
          String,

        trim:
          true,

        required:
          true,
      },

      absolutePath: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      relativePath: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      mimeType: {
        type:
          String,

        trim:
          true,

        required:
          true,
      },

      extension: {
        type:
          String,

        trim:
          true,

        lowercase:
          true,

        default:
          "",
      },

      fileSize: {
        type:
          Number,

        default:
          0,
      },

      /*
       * SHA-256.

       * Lets us detect accidental duplicate uploads and
       * provides permanent document-integrity evidence.
       */
      checksum: {
        type:
          String,

        required:
          true,

        trim:
          true,

        index:
          true,
      },

      /* =====================================================
         VERSION CONTROL
      ===================================================== */

      version: {
        type:
          Number,

        default:
          1,

        min:
          1,
      },

      isCurrent: {
        type:
          Boolean,

        default:
          true,

        index:
          true,
      },

      replacesDocument: {
        type:
          Schema.Types.ObjectId,

        ref:
          "EmployeeDocument",

        default:
          null,
      },

      replacedByDocument: {
        type:
          Schema.Types.ObjectId,

        ref:
          "EmployeeDocument",

        default:
          null,
      },

      /* =====================================================
         DOCUMENT INFORMATION
      ===================================================== */

      signedDate: {
        type:
          Date,

        default:
          null,
      },

      expiryDate: {
        type:
          Date,

        default:
          null,
      },

      remarks: {
        type:
          String,

        trim:
          true,

        default:
          "",

        maxlength:
          1500,
      },

      /* =====================================================
         STATUS
      ===================================================== */

      status: {
        type:
          String,

        enum:
          EMPLOYEE_DOCUMENT_STATUSES,

        default:
          "ACTIVE",

        index:
          true,
      },

      /* =====================================================
         GENERATED MASTER FILE

         For merged employee dossiers.
      ===================================================== */

      generatedFromDocuments: {
        type: [
          Schema.Types.ObjectId,
        ],

        ref:
          "EmployeeDocument",

        default:
          [],
      },

      /* =====================================================
         AUDIT
      ===================================================== */

      uploadedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      updatedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      syncedAt: {
        type:
          Date,

        default:
          null,
      },
    },
    {
      timestamps:
        true,

      versionKey:
        false,
    }
  );

/* =========================================================
   INDEXES
========================================================= */

employeeDocumentSchema.index({
  employee:
    1,

  status:
    1,

  isCurrent:
    1,

  createdAt:
    -1,
});

employeeDocumentSchema.index({
  employee:
    1,

  category:
    1,

  documentType:
    1,

  isCurrent:
    1,
});

employeeDocumentSchema.index({
  employee:
    1,

  checksum:
    1,

  status:
    1,
});

employeeDocumentSchema.index(
  {
    employee:
      1,

    sourceFingerprint:
      1,
  },
  {
    unique:
      true,

    partialFilterExpression: {
      sourceFingerprint: {
        $type:
          "string",

        $ne:
          "",
      },
    },
  }
);

/* =========================================================
   MODEL
========================================================= */

const EmployeeDocument =
  mongoose.models
    .EmployeeDocument ||
  mongoose.model(
    "EmployeeDocument",
    employeeDocumentSchema
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  EmployeeDocument,

  EMPLOYEE_DOCUMENT_CATEGORIES,

  EMPLOYEE_DOCUMENT_SOURCES,

  EMPLOYEE_DOCUMENT_STATUSES,
};
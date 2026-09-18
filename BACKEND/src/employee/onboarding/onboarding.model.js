const mongoose =
  require("mongoose");

const {
  Schema,
} = mongoose;

/* =========================================================
   COMPANIES

   Keep centralized here for now.

   Later, if company configuration becomes larger,
   this can move to a Company model without changing
   Employee records.
========================================================= */

const ONBOARDING_COMPANIES = [
  {
    code:
      "SANDEEP_EDGETECH",

    name:
      "Sandeep Edgetech",

    employeePrefix:
      "SDP",
  },

  {
    code:
      "VANIJA",

    name:
      "Vanija",

    employeePrefix:
      "VNJ",
  },
];

const COMPANY_CODES =
  ONBOARDING_COMPANIES.map(
    (
      company
    ) =>
      company.code
  );

/* =========================================================
   STATUS
========================================================= */

const ONBOARDING_STATUSES = [
  "STARTED",
  "PROFILE_READY",
  "EMPLOYEE_CREATED",

  "DOCUMENTS_PENDING",
  "COMPANY_DOCUMENTS_PENDING",
  "ASSETS_PENDING",
  "APPOINTMENT_PENDING",
  "ACCESS_PENDING",

  "FINAL_REVIEW",
  "COMPLETED",
  "CANCELLED",
];

/* =========================================================
   AUDIT
========================================================= */

const onboardingAuditSchema =
  new Schema(
    {
      event: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      remarks: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      performedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      metadata: {
        type:
          Schema.Types.Mixed,

        default:
          null,
      },

      at: {
        type:
          Date,

        default:
          Date.now,
      },
    },
    {
      _id:
        true,
    }
  );

/* =========================================================
   CHECKLIST

   These are intentionally prepared now.

   Other onboarding services will update them later:
   documents
   assets
   appointment letter
   account creation
========================================================= */

const onboardingChecklistSchema =
  new Schema(
    {
      employeeProfile: {
        type:
          Boolean,

        default:
          false,
      },

      reportingHierarchy: {
        type:
          Boolean,

        default:
          false,
      },

      employeeDocuments: {
        type:
          Boolean,

        default:
          false,
      },

      companyDocuments: {
        type:
          Boolean,

        default:
          false,
      },

      assets: {
        type:
          Boolean,

        default:
          false,
      },

      appointmentLetter: {
        type:
          Boolean,

        default:
          false,
      },

      officialEmail: {
        type:
          Boolean,

        default:
          false,
      },

      rmsAccess: {
        type:
          Boolean,

        default:
          false,
      },

      welcomeCommunication: {
        type:
          Boolean,

        default:
          false,
      },
    },
    {
      _id:
        false,
    }
  );

/* =========================================================
   ONBOARDING
========================================================= */

const onboardingSchema =
  new Schema(
    {
      /* =====================================================
         RECRUITMENT TRACEABILITY
      ===================================================== */

      selection: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Selection",

        required:
          true,

        unique:
          true,

        index:
          true,
      },

      joining: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Joining",

        required:
          true,

        unique:
          true,

        index:
          true,
      },

      candidate: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Candidate",

        required:
          true,

        index:
          true,
      },

      employee: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Employee",

        default:
          null,

        unique:
          true,

        sparse:
          true,

        index:
          true,
      },

      /* =====================================================
         COMPANY / EMPLOYEE CODE
      ===================================================== */

      companyCode: {
        type:
          String,

        enum: [
          "",
          ...COMPANY_CODES,
        ],

        default:
          "",

        index:
          true,
      },

      employeeCode: {
        type:
          String,

        trim:
          true,

        uppercase:
          true,

        default:
          "",
      },

      /* =====================================================
         PERSONAL

         Snapshot used by HR during employee creation.

         Candidate remains source record, but onboarding
         stores the reviewed employment-time information.
      ===================================================== */

      fullName: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      personalEmail: {
        type:
          String,

        trim:
          true,

        lowercase:
          true,

        default:
          "",
      },

      officialEmail: {
        type:
          String,

        trim:
          true,

        lowercase:
          true,

        default:
          "",
      },

      mobileNumber: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      fatherName: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      dateOfBirth: {
        type:
          Date,

        default:
          null,
      },

      presentAddress: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      permanentAddress: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      profilePhotoUrl: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      /* =====================================================
         EMPLOYMENT
      ===================================================== */

      designation: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      employmentType: {
        type:
          String,

        default:
          "PERMANENT",
      },

      joiningDate: {
        type:
          Date,

        default:
          null,
      },

      workLocation: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      orgUnitCode: {
        type:
          String,

        trim:
          true,

        uppercase:
          true,

        default:
          "",
      },

      department: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Department",

        default:
          null,

        index:
          true,
      },

      reportsTo: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Employee",

        default:
          null,

        index:
          true,
      },

      /* =====================================================
         SOURCE HR
      ===================================================== */

      hiringHr: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      /* =====================================================
         STATUS
      ===================================================== */

      status: {
        type:
          String,

        enum:
          ONBOARDING_STATUSES,

        default:
          "STARTED",

        required:
          true,

        index:
          true,
      },

      checklist: {
        type:
          onboardingChecklistSchema,

        default:
          () => ({}),
      },

      startedAt: {
        type:
          Date,

        default:
          Date.now,
      },

      employeeCreatedAt: {
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

      /* =====================================================
         AUDIT
      ===================================================== */

      auditTrail: {
        type: [
          onboardingAuditSchema,
        ],

        default:
          [],
      },

      createdBy: {
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
    },
    {
      timestamps:
        true,

      versionKey:
        false,
    }
  );

/* =========================================================
   INDEX
========================================================= */

onboardingSchema.index({
  status:
    1,

  createdAt:
    -1,
});

onboardingSchema.index({
  companyCode:
    1,

  status:
    1,
});

/* =========================================================
   EMPLOYEE CODE COUNTER

   Same-file counter deliberately.

   No extra model file required.
========================================================= */

const employeeCodeCounterSchema =
  new Schema(
    {
      companyCode: {
        type:
          String,

        required:
          true,

        unique:
          true,

        enum:
          COMPANY_CODES,

        index:
          true,
      },

      sequence: {
        type:
          Number,

        required:
          true,

        default:
          0,
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
   MODELS
========================================================= */

const EmployeeOnboarding =
  mongoose.models
    .EmployeeOnboarding ||
  mongoose.model(
    "EmployeeOnboarding",
    onboardingSchema
  );

const EmployeeCodeCounter =
  mongoose.models
    .EmployeeCodeCounter ||
  mongoose.model(
    "EmployeeCodeCounter",
    employeeCodeCounterSchema
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  EmployeeOnboarding,

  EmployeeCodeCounter,

  ONBOARDING_COMPANIES,

  COMPANY_CODES,

  ONBOARDING_STATUSES,
};
const mongoose =
  require("mongoose");

const {
  Schema,
} = mongoose;

/* =========================================================
   CONSTANTS
========================================================= */

const CANDIDATE_STATUSES = [
  "NEW",
  "CONTACT_PENDING",
  "CONTACTED",
  "NOT_INTERESTED",
  "FOLLOW_UP",
  "SCREENING_PENDING",
  "SCREENED",
  "SHORTLISTED",
  "REJECTED_SCREENING",

  "INTERVIEW_PENDING",
  "INTERVIEW_SCHEDULED",
  "INTERVIEWED",
  "SELECTED",
  "REJECTED_INTERVIEW",

  "LOI_PENDING",
  "LOI_SENT",
  "LOI_ACCEPTED",
  "LOI_DECLINED",

  "OFFER_PENDING",
  "OFFER_SENT",
  "OFFER_ACCEPTED",
  "OFFER_DECLINED",

  "JOINING_CONFIRMED",
  "DOCUMENT_PENDING",
  "DOCUMENT_VERIFICATION",
  "READY_FOR_ONBOARDING",
  "JOINED",
  "CLOSED",
];

const CANDIDATE_SOURCES = [
  "NAUKRI",
  "INDEED",
  "LINKEDIN",
  "REFERENCE",
  "CONSULTANT",
  "WALK_IN",
  "DATABASE",
  "WEBSITE",
  "OTHER",
];

const NEXT_ACTIONS = [
  "NONE",
  "CALL_CANDIDATE",
  "FOLLOW_UP_CALL",
  "COMPLETE_SCREENING",
  "SCHEDULE_INTERVIEW",
  "WAIT_FOR_INTERVIEW",
  "PREPARE_LOI",
  "WAIT_FOR_LOI_RESPONSE",
  "PREPARE_OFFER",
  "WAIT_FOR_OFFER_RESPONSE",
  "CONFIRM_JOINING",
  "COLLECT_DOCUMENTS",
  "VERIFY_DOCUMENTS",
  "CREATE_EMPLOYEE",
];

/* =========================================================
   RESUME
========================================================= */

const resumeSchema =
  new Schema(
    {
      originalName: {
        type: String,
        trim: true,
        default: "",
      },

      fileName: {
        type: String,
        trim: true,
        default: "",
      },

      fileUrl: {
        type: String,
        trim: true,
        default: "",
      },

      mimeType: {
        type: String,
        trim: true,
        default: "",
      },

      size: {
        type: Number,
        default: 0,
      },

      parsed: {
        type: Boolean,
        default: false,
      },

      parsedAt: {
        type: Date,
        default: null,
      },

      parserProvider: {
        type: String,
        trim: true,
        default: "",
      },

      parserConfidence: {
        type: Number,
        min: 0,
        max: 1,
        default: null,
      },

      rawParsedData: {
        type: Schema.Types.Mixed,
        default: null,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   EDUCATION
========================================================= */

const educationSchema =
  new Schema(
    {
      qualification: {
        type: String,
        trim: true,
        default: "",
      },

      specialization: {
        type: String,
        trim: true,
        default: "",
      },

      institute: {
        type: String,
        trim: true,
        default: "",
      },

      university: {
        type: String,
        trim: true,
        default: "",
      },

      year: {
        type: Number,
        default: null,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   EXPERIENCE
========================================================= */

const experienceSchema =
  new Schema(
    {
      company: {
        type: String,
        trim: true,
        default: "",
      },

      designation: {
        type: String,
        trim: true,
        default: "",
      },

      from: {
        type: Date,
        default: null,
      },

      to: {
        type: Date,
        default: null,
      },

      current: {
        type: Boolean,
        default: false,
      },

      description: {
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
   CANDIDATE
========================================================= */

const candidateSchema =
  new Schema(
    {
      candidateNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
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

        required: true,
        index: true,
      },

      positionTitle: {
        type: String,
        required: true,
        trim: true,
      },

      /* =====================================================
         BASIC INFORMATION

         Mostly populated automatically from resume.
      ===================================================== */

      fullName: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },

      mobile: {
        type: String,
        trim: true,
        default: "",
        index: true,
      },

      alternateMobile: {
        type: String,
        trim: true,
        default: "",
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: "",
        index: true,
      },

      city: {
        type: String,
        trim: true,
        default: "",
      },

      state: {
        type: String,
        trim: true,
        default: "",
      },

      /* =====================================================
         PROFESSIONAL DATA
      ===================================================== */

      currentCompany: {
        type: String,
        trim: true,
        default: "",
      },

      currentDesignation: {
        type: String,
        trim: true,
        default: "",
      },

      totalExperienceYears: {
        type: Number,
        min: 0,
        default: null,
      },

      relevantExperienceYears: {
        type: Number,
        min: 0,
        default: null,
      },

      currentSalary: {
        type: Number,
        min: 0,
        default: null,
      },

      expectedSalary: {
        type: Number,
        min: 0,
        default: null,
      },

      noticePeriodDays: {
        type: Number,
        min: 0,
        default: null,
      },

      earliestJoiningDate: {
        type: Date,
        default: null,
      },

      skills: {
        type: [
          String
        ],

        default: [],
      },

      education: {
        type: [
          educationSchema
        ],

        default: [],
      },

      experienceHistory: {
        type: [
          experienceSchema
        ],

        default: [],
      },

      /* =====================================================
         SOURCE
      ===================================================== */

      source: {
        type: String,
        enum:
          CANDIDATE_SOURCES,

        default:
          "OTHER",

        index: true,
      },

      sourceDetail: {
        type: String,
        trim: true,
        default: "",
      },

      referredBy: {
        type: String,
        trim: true,
        default: "",
      },

      /* =====================================================
         RESUME
      ===================================================== */

      resume: {
        type:
          resumeSchema,

        default:
          () => ({}),
      },

      /* =====================================================
         PIPELINE
      ===================================================== */

      status: {
        type: String,
        enum:
          CANDIDATE_STATUSES,

        default:
          "CONTACT_PENDING",

        index: true,
      },

      assignedHr: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,

        index: true,
      },

      nextAction: {
        type: String,
        enum:
          NEXT_ACTIONS,

        default:
          "CALL_CANDIDATE",

        index: true,
      },

      nextActionAt: {
        type: Date,
        default: null,
        index: true,
      },

      /* =====================================================
         SYSTEM MATCHING

         Future resume parser / AI can calculate this.
      ===================================================== */

      matchScore: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },

      matchedSkills: {
        type: [
          String
        ],

        default: [],
      },

      missingSkills: {
        type: [
          String
        ],

        default: [],
      },

      /* =====================================================
         FLAGS
      ===================================================== */

      isDuplicate: {
        type: Boolean,
        default: false,
      },

      duplicateCandidate: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Candidate",

        default:
          null,
      },

      isActive: {
        type: Boolean,
        default: true,
      },

      /* =====================================================
         AUDIT
      ===================================================== */

      createdBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required: true,
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
      minimize: false,
    }
  );

/* =========================================================
   INDEXES
========================================================= */

candidateSchema.index({
  manpowerRequirement: 1,
  status: 1,
});

candidateSchema.index({
  assignedHr: 1,
  nextActionAt: 1,
});

candidateSchema.index({
  department: 1,
  status: 1,
});

candidateSchema.index({
  mobile: 1,
  email: 1,
});

/* =========================================================
   EXPORT
========================================================= */

const Candidate =
  mongoose.models.Candidate ||
  mongoose.model(
    "Candidate",
    candidateSchema
  );

module.exports = {
  Candidate,
  CANDIDATE_STATUSES,
  CANDIDATE_SOURCES,
  NEXT_ACTIONS,
};
const mongoose =
  require("mongoose");

const {
  Schema,
} = mongoose;

const SCREENING_RESULTS = [
  "PENDING",
  "SHORTLIST",
  "HOLD",
  "REJECT",
];

const INTEREST_LEVELS = [
  "YES",
  "NO",
  "FOLLOW_UP",
  "UNKNOWN",
];

const candidateScreeningSchema =
  new Schema(
    {
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
        index: true,
      },

      screenedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required: true,
      },

      screenedAt: {
        type: Date,
        default:
          Date.now,
      },

      /* =====================================================
         RESPONSE
      ===================================================== */

      interested: {
        type: String,
        enum:
          INTEREST_LEVELS,

        default:
          "UNKNOWN",
      },

      reasonNotInterested: {
        type: String,
        trim: true,
        default: "",
      },

      reasonForChange: {
        type: String,
        trim: true,
        default: "",
      },

      /* =====================================================
         EXPERIENCE

         Values are copied into Candidate master where
         appropriate so HR does not type them again later.
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

      /* =====================================================
         COMPENSATION
      ===================================================== */

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

      /* =====================================================
         LOCATION
      ===================================================== */

      currentLocation: {
        type: String,
        trim: true,
        default: "",
      },

      preferredLocation: {
        type: String,
        trim: true,
        default: "",
      },

      /* =====================================================
         AVAILABILITY
      ===================================================== */

      availableForInterview: {
        type: Boolean,
        default: null,
      },

      preferredInterviewDate: {
        type: Date,
        default: null,
      },

      /* =====================================================
         HR RATINGS
      ===================================================== */

      communicationRating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },

      skillMatchRating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },

      experienceMatchRating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },

      /* =====================================================
         RESULT
      ===================================================== */

      result: {
        type: String,
        enum:
          SCREENING_RESULTS,

        default:
          "PENDING",
      },

      remarks: {
        type: String,
        trim: true,
        default: "",
      },

      followUpAt: {
        type: Date,
        default: null,
      },

      createdBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

candidateScreeningSchema.index({
  candidate: 1,
  createdAt: -1,
});

const CandidateScreening =
  mongoose.models
    .CandidateScreening ||
  mongoose.model(
    "CandidateScreening",
    candidateScreeningSchema
  );

module.exports = {
  CandidateScreening,
  SCREENING_RESULTS,
  INTEREST_LEVELS,
};
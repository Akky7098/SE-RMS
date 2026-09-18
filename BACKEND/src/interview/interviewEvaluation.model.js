const mongoose =
  require("mongoose");

const {
  Schema,
} = mongoose;

/* =========================================================
   CONSTANTS
========================================================= */

const RECOMMENDATIONS = [
  "STRONG_HIRE",
  "HIRE",
  "HOLD",
  "REJECT",
];

const FINAL_DECISIONS = [
  "SELECTED",
  "HOLD",
  "REJECTED",
];

const EMAIL_STATUSES = [
  "NOT_SENT",
  "PENDING",
  "SENT",
  "FAILED",
];

/* =========================================================
   ATTACHMENT
========================================================= */

const evaluationAttachmentSchema =
  new Schema(
    {
      originalName: {
        type: String,
        trim: true,
        default: "",
      },

      storedName: {
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

      relativePath: {
        type: String,
        trim: true,
        default: "",
      },

      uploadedAt: {
        type: Date,
        default: null,
      },

      uploadedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default: null,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   DECISION EMAIL
========================================================= */

const decisionEmailSchema =
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
   EVALUATION
========================================================= */

const interviewEvaluationSchema =
  new Schema(
    {
      interview: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Interview",

        required: true,

        unique: true,

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

        index: true,
      },

      interviewer: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required: true,
      },

      /* =====================================================
         RATINGS 1 - 5
      ===================================================== */

      technicalSkills: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },

      relevantExperience: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },

      communication: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },

      problemSolving: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },

      roleFit: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },

      professionalism: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },

      overallRating: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },

      /* =====================================================
         DECISION
      ===================================================== */

      recommendation: {
        type: String,

        enum:
          RECOMMENDATIONS,

        required: true,

        index: true,
      },

      finalDecision: {
        type: String,

        enum:
          FINAL_DECISIONS,

        required: true,

        index: true,
      },

      strengths: {
        type: String,
        trim: true,
        default: "",
      },

      concerns: {
        type: String,
        trim: true,
        default: "",
      },

      remarks: {
        type: String,
        trim: true,
        default: "",
      },

      /* =====================================================
         INTERVIEW DOCUMENT
      ===================================================== */

      attachment: {
        type:
          evaluationAttachmentSchema,

        default:
          null,
      },

      /* =====================================================
         CANDIDATE DECISION COMMUNICATION

         SELECTED -> congratulations
         HOLD     -> profile under consideration
         REJECTED -> respectful closure
      ===================================================== */

      decisionEmail: {
        type:
          decisionEmailSchema,

        default:
          () => ({
            status:
              "NOT_SENT",
          }),
      },

      /* =====================================================
         NEXT WORKFLOW

         Selected candidate moves into selection/LOI module.
         We store the intended next stage now without creating
         the actual LOI workflow yet.
      ===================================================== */

      nextStage: {
        type: String,

        enum: [
          "NONE",
          "LOI_PENDING",
          "UNDER_REVIEW",
          "CLOSED",
        ],

        default:
          "NONE",

        index: true,
      },

      /* =====================================================
         AUDIT
      ===================================================== */

      evaluatedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required: true,
      },

      evaluatedAt: {
        type: Date,

        default:
          Date.now,

        index: true,
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

interviewEvaluationSchema.index({
  finalDecision:
    1,

  evaluatedAt:
    -1,
});

interviewEvaluationSchema.index({
  manpowerRequirement:
    1,

  finalDecision:
    1,
});

/* =========================================================
   MODEL
========================================================= */

const InterviewEvaluation =
  mongoose.models
    .InterviewEvaluation ||
  mongoose.model(
    "InterviewEvaluation",
    interviewEvaluationSchema
  );

module.exports = {
  InterviewEvaluation,

  RECOMMENDATIONS,

  FINAL_DECISIONS,

  EMAIL_STATUSES,
};
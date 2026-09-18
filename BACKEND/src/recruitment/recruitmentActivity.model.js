const mongoose =
  require("mongoose");

const {
  Schema,
} = mongoose;

const ACTIVITY_TYPES = [
  "CANDIDATE_CREATED",
  "RESUME_UPLOADED",
  "RESUME_PARSED",

  "CALL_ATTEMPT",
  "CALL_CONNECTED",
  "CALL_NOT_ANSWERED",

  "SCREENING_COMPLETED",
  "FOLLOW_UP_SCHEDULED",

  "SHORTLISTED",
  "REJECTED",

  "EMAIL_SENT",
  "WHATSAPP_SENT",

  "INTERVIEW_SCHEDULED",
  "INTERVIEW_RESCHEDULED",
  "INTERVIEW_COMPLETED",

  "STATUS_CHANGED",

  "LOI_SENT",
  "OFFER_SENT",

  "DOCUMENT_RECEIVED",
  "DOCUMENT_VERIFIED",

  "NOTE",
];

const recruitmentActivitySchema =
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

      type: {
        type: String,
        enum:
          ACTIVITY_TYPES,

        required: true,
        index: true,
      },

      title: {
        type: String,
        required: true,
        trim: true,
      },

      remarks: {
        type: String,
        trim: true,
        default: "",
      },

      outcome: {
        type: String,
        trim: true,
        default: "",
      },

      previousStatus: {
        type: String,
        trim: true,
        default: "",
      },

      newStatus: {
        type: String,
        trim: true,
        default: "",
      },

      nextAction: {
        type: String,
        trim: true,
        default: "",
      },

      nextActionAt: {
        type: Date,
        default: null,
      },

      performedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default: null,
      },

      performedAt: {
        type: Date,
        default:
          Date.now,
        index: true,
      },

      metadata: {
        type:
          Schema.Types.Mixed,

        default:
          null,
      },
    },
    {
      timestamps: true,
      versionKey: false,
      minimize: false,
    }
  );

recruitmentActivitySchema.index({
  candidate: 1,
  performedAt: -1,
});

const RecruitmentActivity =
  mongoose.models
    .RecruitmentActivity ||
  mongoose.model(
    "RecruitmentActivity",
    recruitmentActivitySchema
  );

module.exports = {
  RecruitmentActivity,
  ACTIVITY_TYPES,
};
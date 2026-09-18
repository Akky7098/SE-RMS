const mongoose =
  require("mongoose");

const {
  Schema,
} = mongoose;

/* =========================================================
   STATUS
========================================================= */

const APPOINTMENT_STATUSES = [
  "DRAFT",
  "GENERATED",
  "REVIEWED",
  "ISSUED",
  "CANCELLED",
];

/* =========================================================
   AUDIT
========================================================= */

const appointmentAuditSchema =
  new Schema(
    {
      event: {
        type: String,

        required: true,

        trim: true,
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

        default: null,
      },

      at: {
        type: Date,

        default:
          Date.now,
      },
    },
    {
      _id: true,
    }
  );

/* =========================================================
   APPOINTMENT
========================================================= */

const appointmentSchema =
  new Schema(
    {
      employee: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Employee",

        required: true,

        index: true,
      },

      onboarding: {
        type:
          Schema.Types.ObjectId,

        ref:
          "EmployeeOnboarding",

        default: null,

        index: true,
      },

      referenceNumber: {
        type: String,

        required: true,

        unique: true,

        trim: true,

        uppercase: true,

        index: true,
      },

      version: {
        type: Number,

        default: 1,

        min: 1,
      },

      isCurrent: {
        type: Boolean,

        default: true,

        index: true,
      },

      status: {
        type: String,

        enum:
          APPOINTMENT_STATUSES,

        default:
          "DRAFT",

        required: true,

        index: true,
      },

      /* =====================================================
         SNAPSHOT
      ===================================================== */

      employeeCode: {
        type: String,

        trim: true,

        default: "",
      },

      employeeName: {
        type: String,

        trim: true,

        required: true,
      },

      designation: {
        type: String,

        trim: true,

        required: true,
      },

      departmentName: {
        type: String,

        trim: true,

        default: "",
      },

      companyCode: {
        type: String,

        trim: true,

        default: "",
      },

      joiningDate: {
        type: Date,

        required: true,
      },

      issueDate: {
        type: Date,

        required: true,
      },

      workLocation: {
        type: String,

        trim: true,

        default: "",
      },

      reportingManagerName: {
        type: String,

        trim: true,

        default: "",
      },

      employmentType: {
        type: String,

        trim: true,

        default: "",
      },

      /* =====================================================
         FILE
      ===================================================== */

      document: {
        type:
          Schema.Types.ObjectId,

        ref:
          "EmployeeDocument",

        default: null,
      },

      generatedAt: {
        type: Date,

        default: null,
      },

      reviewedAt: {
        type: Date,

        default: null,
      },

      reviewedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default: null,
      },

      issuedAt: {
        type: Date,

        default: null,
      },

      issuedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default: null,
      },

      /* =====================================================
         AUDIT
      ===================================================== */

      auditTrail: {
        type: [
          appointmentAuditSchema,
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

appointmentSchema.index({
  employee: 1,
  isCurrent: 1,
});

appointmentSchema.index({
  employee: 1,
  createdAt: -1,
});

/* =========================================================
   COUNTER
========================================================= */

const appointmentCounterSchema =
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

const EmployeeAppointment =
  mongoose.models
    .EmployeeAppointment ||
  mongoose.model(
    "EmployeeAppointment",
    appointmentSchema
  );

const EmployeeAppointmentCounter =
  mongoose.models
    .EmployeeAppointmentCounter ||
  mongoose.model(
    "EmployeeAppointmentCounter",
    appointmentCounterSchema
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  EmployeeAppointment,

  EmployeeAppointmentCounter,

  APPOINTMENT_STATUSES,
};
const mongoose =
  require(
    "mongoose"
  );

const {
  Schema,
} = mongoose;

/* =========================================================
   ACCESS STATUS
========================================================= */

const EMPLOYEE_ACCESS_STATUSES = [
  "WAITING_FOR_EMAIL",
  "READY",
  "ACCOUNT_CREATED",
  "ACCESS_MAIL_PENDING",
  "ACCESS_MAIL_SENT",
  "DISABLED",
];

/* =========================================================
   LOGIN METHODS

   GOOGLE is preferred because your current RMS already
   supports Google authentication for company accounts.

   LOCAL is kept for future fallback.
========================================================= */

const EMPLOYEE_ACCESS_METHODS = [
  "GOOGLE",
  "LOCAL",
  "GOOGLE_AND_LOCAL",
];

/* =========================================================
   AUDIT
========================================================= */

const employeeAccessAuditSchema =
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
   ACCESS MODEL
========================================================= */

const employeeAccessSchema =
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

        unique:
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

      user: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

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
         LOGIN
      ===================================================== */

      loginEmail: {
        type:
          String,

        trim:
          true,

        lowercase:
          true,

        default:
          "",

        index:
          true,
      },

      loginMethod: {
        type:
          String,

        enum:
          EMPLOYEE_ACCESS_METHODS,

        default:
          "GOOGLE",
      },

      /*
       * Existing RMS legacy/base role.

       * Department authority still comes from your
       * DepartmentMembership system.
       */
      role: {
        type:
          String,

        default:
          "EMPLOYEE",

        trim:
          true,

        uppercase:
          true,
      },

      /* =====================================================
         STATUS
      ===================================================== */

      status: {
        type:
          String,

        enum:
          EMPLOYEE_ACCESS_STATUSES,

        default:
          "WAITING_FOR_EMAIL",

        required:
          true,

        index:
          true,
      },

      preparedAt: {
        type:
          Date,

        default:
          null,
      },

      accountCreatedAt: {
        type:
          Date,

        default:
          null,
      },

      /*
       * Mail service will update these later.
       */
      accessMailSentAt: {
        type:
          Date,

        default:
          null,
      },

      accessMailSentTo: {
        type:
          String,

        trim:
          true,

        lowercase:
          true,

        default:
          "",
      },

      welcomeMailSentAt: {
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
          employeeAccessAuditSchema,
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
   INDEXES
========================================================= */

employeeAccessSchema.index({
  status:
    1,

  createdAt:
    -1,
});

employeeAccessSchema.index({
  loginEmail:
    1,

  status:
    1,
});

/* =========================================================
   MODEL
========================================================= */

const EmployeeAccess =
  mongoose.models
    .EmployeeAccess ||
  mongoose.model(
    "EmployeeAccess",
    employeeAccessSchema
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  EmployeeAccess,

  EMPLOYEE_ACCESS_STATUSES,

  EMPLOYEE_ACCESS_METHODS,
};
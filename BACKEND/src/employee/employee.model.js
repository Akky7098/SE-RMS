const mongoose =
  require(
    "mongoose"
  );

const {
  ORG_UNIT_CODES,
} =
  require(
    "../organization/organization.config"
  );

/* =========================================================
   EMPLOYMENT TYPE
========================================================= */

const EMPLOYMENT_TYPES = [
  "PERMANENT",
  "PROBATION",
  "CONTRACT",
  "TRAINEE",
  "INTERN",
  "CONSULTANT",
];

/* =========================================================
   STATUS

   ONBOARDING is new.

   Employee can exist before becoming ACTIVE.
========================================================= */

const EMPLOYEE_STATUSES = [
  "ONBOARDING",
  "ACTIVE",
  "INACTIVE",
  "NOTICE_PERIOD",
  "EXITED",
];

/* =========================================================
   SOURCE
========================================================= */

const EMPLOYEE_SOURCES = [
  "RECRUITMENT",
  "LEGACY",
  "MANUAL",
];

/* =========================================================
   COMPANY
========================================================= */

const EMPLOYEE_COMPANY_CODES = [
  "SANDEEP_EDGETECH",
  "VANIJA",
];

/* =========================================================
   SCHEMA
========================================================= */

const employeeSchema =
  new mongoose.Schema(
    {
      /* =====================================================
         IDENTIFICATION
      ===================================================== */

      employeeCode: {
        type:
          String,

        required:
          true,

        unique:
          true,

        trim:
          true,

        uppercase:
          true,

        index:
          true,

        maxlength:
          30,
      },

      companyCode: {
        type:
          String,

        enum:
          [
            null,
            ...EMPLOYEE_COMPANY_CODES,
          ],

        default:
          null,

        index:
          true,
      },

      biometricCode: {
        type:
          String,

        trim:
          true,

        default:
          null,

        index:
          true,
      },

      /* =====================================================
         PERSONAL
      ===================================================== */

      fullName: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          120,

        index:
          true,
      },

      personalEmail: {
        type:
          String,

        trim:
          true,

        lowercase:
          true,

        default:
          null,

        index:
          true,
      },

      officialEmail: {
        type:
          String,

        trim:
          true,

        lowercase:
          true,

        default:
          null,
      },

      mobileNumber: {
        type:
          String,

        trim:
          true,

        default:
          null,

        maxlength:
          20,
      },

      /* =====================================================
         ORGANIZATION
      ===================================================== */

      orgUnitCode: {
        type:
          String,

        required:
          true,

        enum:
          ORG_UNIT_CODES,

        index:
          true,
      },

      /*
       * New Department reference.
       *
       * orgUnitCode remains because existing People,
       * Attendance and Timesheet currently depend on it.
       *
       * Department gives newer workflows a dynamic
       * department reference without breaking old modules.
       */
      department: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Department",

        default:
          null,

        index:
          true,
      },

      designation: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          120,

        index:
          true,
      },

      reportsTo: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Employee",

        default:
          null,

        index:
          true,
      },

      /* =====================================================
         LOGIN
      ===================================================== */

      user: {
        type:
          mongoose.Schema.Types.ObjectId,

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
         EMPLOYMENT
      ===================================================== */

      employmentType: {
        type:
          String,

        enum:
          EMPLOYMENT_TYPES,

        default:
          "PERMANENT",

        index:
          true,
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
          null,

        maxlength:
          100,
      },

      profilePhotoUrl: {
        type:
          String,

        trim:
          true,

        default:
          null,
      },

      status: {
        type:
          String,

        enum:
          EMPLOYEE_STATUSES,

        default:
          "ACTIVE",

        index:
          true,
      },

      exitDate: {
        type:
          Date,

        default:
          null,
      },

      /* =====================================================
         SOURCE / RECRUITMENT TRACEABILITY
      ===================================================== */

      source: {
        type:
          String,

        enum:
          EMPLOYEE_SOURCES,

        default:
          "MANUAL",

        index:
          true,
      },

      recruitmentCandidate: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Candidate",

        default:
          null,

        index:
          true,
      },

      recruitmentSelection: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Selection",

        default:
          null,

        unique:
          true,

        sparse:
          true,

        index:
          true,
      },

      recruitmentJoining: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Joining",

        default:
          null,

        unique:
          true,

        sparse:
          true,

        index:
          true,
      },

      onboarding: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "EmployeeOnboarding",

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
         AUDIT
      ===================================================== */

      createdBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      updatedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

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

employeeSchema.index(
  {
    officialEmail:
      1,
  },
  {
    unique:
      true,

    sparse:
      true,
  }
);

employeeSchema.index({
  companyCode:
    1,

  status:
    1,
});

employeeSchema.index({
  orgUnitCode:
    1,

  status:
    1,
});

employeeSchema.index({
  department:
    1,

  status:
    1,
});

employeeSchema.index({
  reportsTo:
    1,

  status:
    1,
});

employeeSchema.index({
  fullName:
    "text",

  employeeCode:
    "text",

  designation:
    "text",

  officialEmail:
    "text",

  personalEmail:
    "text",
});

/*
 * IMPORTANT:
 * biometricCode already has index:true above.
 *
 * We need uniqueness though, so keep only this explicit
 * unique index and REMOVE index:true from biometricCode
 * if Mongoose warns about duplicate index.
 */

employeeSchema.index(
  {
    biometricCode:
      1,
  },
  {
    unique:
      true,

    sparse:
      true,
  }
);

/* =========================================================
   MODEL
========================================================= */

const Employee =
  mongoose.models
    .Employee ||
  mongoose.model(
    "Employee",
    employeeSchema
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  Employee,

  EMPLOYMENT_TYPES,

  EMPLOYEE_STATUSES,

  EMPLOYEE_SOURCES,

  EMPLOYEE_COMPANY_CODES,
};
const mongoose =
  require("mongoose");

/* =========================================================
   SYSTEM ROLES

   AUTHORITATIVE GLOBAL AUTHORITY.

   SUPER_ADMIN
     Entire SE-RMS organisation.

   STANDARD_USER
     Every other user.

   Department authority comes from DepartmentMembership.
========================================================= */

const SYSTEM_ROLES = [
  "SUPER_ADMIN",
  "STANDARD_USER",
];

/* =========================================================
   LEGACY / BASE ACCESS ROLES

   IMPORTANT:

   These remain temporarily because existing modules such as:
   - Employees
   - Attendance
   - Timesheet
   - older middleware

   may still use them.

   DO NOT use these to determine department authority.

   New modules should use:
   systemRole + DepartmentMembership.
========================================================= */

const USER_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "HEAD",
  "MANAGER",
  "EMPLOYEE",
];

const USER_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "PENDING",
];

const AUTH_PROVIDERS = [
  "local",
  "google",
];

/* =========================================================
   USER SCHEMA
========================================================= */

const userSchema =
  new mongoose.Schema(
    {
      displayName: {
        type:
          String,

        trim:
          true,

        maxlength:
          100,
      },

      email: {
        type:
          String,

        required:
          true,

        unique:
          true,

        lowercase:
          true,

        trim:
          true,

        index:
          true,
      },

      passwordHash: {
        type:
          String,

        select:
          false,
      },

      /* =====================================================
         GLOBAL SYSTEM AUTHORITY

         THIS is the authoritative global role going forward.
      ===================================================== */

      systemRole: {
        type:
          String,

        enum:
          SYSTEM_ROLES,

        default:
          "STANDARD_USER",

        index:
          true,
      },

      /* =====================================================
         LEGACY BASE ACCESS ROLE

         Keep temporarily for existing modules.

         Examples:
         ADMIN
         HEAD
         MANAGER
         EMPLOYEE

         Recruitment must NOT treat ADMIN as HR Admin.
      ===================================================== */

      role: {
        type:
          String,

        enum:
          USER_ROLES,

        default:
          "EMPLOYEE",

        index:
          true,
      },

      status: {
        type:
          String,

        enum:
          USER_STATUSES,

        default:
          "ACTIVE",

        index:
          true,
      },

      authProviders: {
        type: [
          {
            type:
              String,

            enum:
              AUTH_PROVIDERS,
          },
        ],

        default:
          [],
      },

      googleId: {
        type:
          String,

        default:
          null,

        sparse:
          true,
      },

      emailVerified: {
        type:
          Boolean,

        default:
          false,
      },

      employee: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Employee",

        default:
          null,
      },

      /* =====================================================
         DEPARTMENT FIELDS

         Compatibility only.

         DepartmentMembership remains the authoritative source
         for department + department role.

         These fields may be removed later after older modules
         are migrated.
      ===================================================== */

      department: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Department",

        default:
          null,
      },

      primaryDepartment: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Department",

        default:
          null,
      },

      lastLoginAt: {
        type:
          Date,

        default:
          null,
      },

      passwordChangedAt: {
        type:
          Date,

        default:
          null,
      },

      passwordResetToken: {
        type:
          String,

        select:
          false,

        default:
          null,
      },

      passwordResetExpires: {
        type:
          Date,

        select:
          false,

        default:
          null,
      },

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
   NORMALIZE SYSTEM ROLE

   Backward compatibility:

   If an older SUPER_ADMIN record has no systemRole,
   automatically preserve its global authority when saved.
========================================================= */

userSchema.pre(
  "validate",
  function () {
    if (
      this.role ===
      "SUPER_ADMIN"
    ) {
      this.systemRole =
        "SUPER_ADMIN";
    }

    if (
      this.systemRole !==
      "SUPER_ADMIN"
    ) {
      this.systemRole =
        "STANDARD_USER";
    }
  }
);

/* =========================================================
   ACTIVE
========================================================= */

userSchema.methods.isActive =
  function () {
    return (
      this.status ===
      "ACTIVE"
    );
  };

/* =========================================================
   GLOBAL SUPER ADMIN
========================================================= */

userSchema.methods.isGlobalSuperAdmin =
  function () {
    return (
      this.systemRole ===
        "SUPER_ADMIN" ||
      this.role ===
        "SUPER_ADMIN"
    );
  };

/* =========================================================
   JSON SAFETY
========================================================= */

userSchema.set(
  "toJSON",
  {
    transform:
      function (
        doc,
        ret
      ) {
        delete ret.passwordHash;

        delete ret.passwordResetToken;

        delete ret.passwordResetExpires;

        return ret;
      },
  }
);

/* =========================================================
   MODEL
========================================================= */

const User =
  mongoose.models.User ||
  mongoose.model(
    "User",
    userSchema
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  User,

  SYSTEM_ROLES,

  USER_ROLES,

  USER_STATUSES,
};
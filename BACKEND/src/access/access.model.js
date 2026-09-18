const mongoose =
  require("mongoose");

const {
  USER_ROLES,
} =
  require(
    "../user/user.model"
  );

/* =========================================================
   ERP MODULES
========================================================= */

const MODULES = [
  /* Core */
  "DASHBOARD",
  "EMPLOYEE",
  "ATTENDANCE",
  "TIMESHEET",

  /* Organisation */
  "DEPARTMENT",
  "ACCESS_MANAGEMENT",

  /* Recruitment / HR */
  "HR",
  "MANPOWER",
  "RECRUITMENT",

  /* Sales */
  "SALES",
  "CRM",
  "ENQUIRY",
  "QUOTATION",
  "ORDER",

  /* Operations */
  "PURCHASE",
  "INVENTORY",
  "DISPATCH",
  "QUALITY",
  "MANUFACTURING",

  /* Finance */
  "FINANCE",

  /* Common */
  "DOCUMENT",
  "REPORT",
  "APPROVAL",
];

/* =========================================================
   ACTIONS
========================================================= */

const ACTIONS = [
  "VIEW",
  "CREATE",
  "UPDATE",
  "DELETE",
  "APPROVE",
  "EXPORT",
  "MANAGE",
];

/* =========================================================
   DATA SCOPES
========================================================= */

const DATA_SCOPES = [
  "NONE",
  "SELF",
  "TEAM",
  "DEPARTMENT",
  "ALL",
];

/* =========================================================
   SCOPE RANK
========================================================= */

const SCOPE_RANK = {
  NONE:
    0,

  SELF:
    1,

  TEAM:
    2,

  DEPARTMENT:
    3,

  ALL:
    4,
};

/* =========================================================
   DEPARTMENT ROLES

   AUTHORITATIVE department authority.
========================================================= */

const DEPARTMENT_ROLES = [
  "DEPARTMENT_SUPER_ADMIN",
  "HOD",
  "ADMIN",
  "MEMBER",
];

/* =========================================================
   PERMISSION
========================================================= */

const permissionSchema =
  new mongoose.Schema(
    {
      module: {
        type:
          String,

        enum:
          MODULES,

        required:
          true,

        trim:
          true,
      },

      action: {
        type:
          String,

        enum:
          ACTIONS,

        required:
          true,

        trim:
          true,
      },

      scope: {
        type:
          String,

        enum:
          DATA_SCOPES,

        default:
          "NONE",

        required:
          true,
      },
    },
    {
      _id:
        false,
    }
  );

/* =========================================================
   BASE ACCESS PROFILE

   IMPORTANT:

   `role` here is now ONLY a legacy/base permission profile.

   It must NOT be interpreted as department authority.

   Example:

   Roshan:
     base role = ADMIN
     department role = DEPARTMENT_SUPER_ADMIN (HR)

   Renu:
     base role = MANAGER
     department role = MEMBER (HR)

   DepartmentMembership wins for department workflows.
========================================================= */

const accessProfileSchema =
  new mongoose.Schema(
    {
      role: {
        type:
          String,

        enum:
          USER_ROLES,

        required:
          true,

        unique:
          true,

        index:
          true,

        trim:
          true,
      },

      permissions: {
        type: [
          permissionSchema,
        ],

        default:
          [],
      },

      isActive: {
        type:
          Boolean,

        default:
          true,

        index:
          true,
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
   DUPLICATE PERMISSION GUARD
========================================================= */

accessProfileSchema.pre(
  "validate",
  function () {
    const seen =
      new Set();

    for (
      const permission
      of this.permissions
    ) {
      const key =
        `${permission.module}:${permission.action}`;

      if (
        seen.has(
          key
        )
      ) {
        throw new Error(
          `Duplicate permission: ${key}`
        );
      }

      seen.add(
        key
      );
    }
  }
);

/* =========================================================
   MODEL
========================================================= */

const AccessProfile =
  mongoose.models
    .AccessProfile ||
  mongoose.model(
    "AccessProfile",
    accessProfileSchema
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  AccessProfile,

  MODULES,

  ACTIONS,

  DATA_SCOPES,

  SCOPE_RANK,

  DEPARTMENT_ROLES,
};
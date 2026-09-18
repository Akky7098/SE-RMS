const mongoose =
  require("mongoose");

const {
  DEPARTMENT_ROLES,
} =
  require(
    "../access/access.model"
  );

const {
  Schema,
} = mongoose;

/* =========================================================
   MEMBERSHIP STATUS
========================================================= */

const MEMBERSHIP_STATUSES = [
  "ACTIVE",
  "INACTIVE",
];

/* =========================================================
   DEPARTMENT MEMBERSHIP

   A User may belong to one or more departments.

   Example:

   User: Roshan Singh
   Department: HR
   Role: DEPARTMENT_SUPER_ADMIN

   Another example:

   User: XYZ
   Department: Sales
   Role: MEMBER
========================================================= */

const departmentMembershipSchema =
  new Schema(
    {
      user: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required:
          true,

        index:
          true,
      },

      department: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Department",

        required:
          true,

        index:
          true,
      },

      /* =====================================================
         DEPARTMENT ROLE

         This is separate from User.role.
      ===================================================== */

      role: {
        type:
          String,

        enum:
          DEPARTMENT_ROLES,

        default:
          "MEMBER",

        required:
          true,

        index:
          true,
      },

      /* =====================================================
         PRIMARY DEPARTMENT

         Normally one user has one primary department.

         Later Employee creation will update this
         automatically.
      ===================================================== */

      isPrimary: {
        type:
          Boolean,

        default:
          false,

        index:
          true,
      },

      status: {
        type:
          String,

        enum:
          MEMBERSHIP_STATUSES,

        default:
          "ACTIVE",

        index:
          true,
      },

      /* =====================================================
         OPTIONAL AUTHORITY FLAGS

         We keep this simple now.

         Later we can add individual overrides without
         inventing new roles.
      ===================================================== */

      canManageMembers: {
        type:
          Boolean,

        default:
          false,
      },

      canApproveManpower: {
        type:
          Boolean,

        default:
          false,
      },

      /* =====================================================
         AUDIT
      ===================================================== */

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
   ONE MEMBERSHIP PER USER + DEPARTMENT
========================================================= */

departmentMembershipSchema.index(
  {
    user:
      1,

    department:
      1,
  },
  {
    unique:
      true,
  }
);

/* =========================================================
   QUERY INDEXES
========================================================= */

departmentMembershipSchema.index({
  department:
    1,

  role:
    1,

  status:
    1,
});

departmentMembershipSchema.index({
  user:
    1,

  status:
    1,
});

/* =========================================================
   MODEL
========================================================= */

const DepartmentMembership =
  mongoose.models
    .DepartmentMembership ||
  mongoose.model(
    "DepartmentMembership",
    departmentMembershipSchema
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  DepartmentMembership,

  MEMBERSHIP_STATUSES,
};
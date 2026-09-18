const mongoose =
  require("mongoose");

const {
  Schema,
} = mongoose;

/* =========================================================
   DEPARTMENT STATUS
========================================================= */

const DEPARTMENT_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
];

/* =========================================================
   DEPARTMENT MODEL

   User-friendly design:

   Required from frontend:
   - name

   Optional:
   - parentDepartment
   - description

   Automatically generated:
   - code
   - slug
========================================================= */

const departmentSchema =
  new Schema(
    {
      /* =====================================================
         DISPLAY NAME

         Example:
         Human Resources
         Sales
         Dispatch
      ===================================================== */

      name: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          120,
      },

      /* =====================================================
         AUTO GENERATED SHORT CODE

         Example:
         HR
         SALES
         DISPATCH
         QA

         If duplicate:
         HR-02
      ===================================================== */

      code: {
        type:
          String,

        required:
          true,

        unique:
          true,

        index:
          true,

        uppercase:
          true,

        trim:
          true,
      },

      /* =====================================================
         URL SAFE NAME

         human-resources
         sales
      ===================================================== */

      slug: {
        type:
          String,

        required:
          true,

        unique:
          true,

        index:
          true,

        lowercase:
          true,

        trim:
          true,
      },

      description: {
        type:
          String,

        trim:
          true,

        maxlength:
          500,

        default:
          "",
      },

      /* =====================================================
         DEPARTMENT HIERARCHY

         Example:

         Management
             ↓
         Operations
             ↓
         Dispatch
      ===================================================== */

      parentDepartment: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Department",

        default:
          null,

        index:
          true,
      },

      /* =====================================================
         OPTIONAL DISPLAY ORDER

         Used later for sidebar / organisation chart.
      ===================================================== */

      displayOrder: {
        type:
          Number,

        default:
          0,
      },

      /* =====================================================
         STATUS
      ===================================================== */

      status: {
        type:
          String,

        enum:
          DEPARTMENT_STATUSES,

        default:
          "ACTIVE",

        index:
          true,
      },

      /* =====================================================
         SYSTEM DEPARTMENT

         Prevent accidental deletion/archive of important
         departments later.

         Example:
         MANAGEMENT
         HR
      ===================================================== */

      isSystemDepartment: {
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
   INDEXES
========================================================= */

departmentSchema.index({
  status:
    1,

  displayOrder:
    1,

  name:
    1,
});

departmentSchema.index({
  parentDepartment:
    1,

  status:
    1,
});

/* =========================================================
   MODEL
========================================================= */

const Department =
  mongoose.models
    .Department ||
  mongoose.model(
    "Department",
    departmentSchema
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  Department,

  DEPARTMENT_STATUSES,
};
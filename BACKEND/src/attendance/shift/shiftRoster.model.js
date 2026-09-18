const mongoose =
  require(
    "mongoose"
  );

const {
  Schema,
} = mongoose;

const {
  DATE_KEY_REGEX,
} =
  require(
    "./shiftCalendar.util"
  );

/* =========================================================
   ROSTER STATUS

   DRAFT:
   Head is preparing.

   SUBMITTED:
   Head has sent to HR.

   PUBLISHED:
   Final assignments used by attendance engine.

   CANCELLED:
   Roster withdrawn.
========================================================= */

const SHIFT_ROSTER_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "PUBLISHED",
  "CANCELLED",
];

/* =========================================================
   NORMALIZE ORG UNIT
========================================================= */

const normalizeOrgUnitCode =
  (
    value
  ) =>
    String(
      value ||
      ""
    )
      .trim()
      .toUpperCase();

/* =========================================================
   SHIFT ROSTER

   IMPORTANT ORGANIZATION DESIGN

   orgUnitCode:
   Primary roster organizational scope.

   Examples:
   HR
   ENGINEERING
   OPERATIONS
   DIR_BOARD
   FINANCE

   departmentId:
   Optional compatibility/reference field.

   We DO NOT require Department ObjectId because every
   SE-RMS org unit is not guaranteed to have a Department
   document.
========================================================= */

const shiftRosterSchema =
  new Schema(
    {
      /* =====================================================
         ORGANIZATION
      ===================================================== */

      companyCode: {
        type:
          String,

        trim:
          true,

        uppercase:
          true,

        default:
          null,

        index:
          true,
      },

      /*
       * PRIMARY ORGANIZATIONAL SCOPE.
       *
       * This is what weekly shift management should use.
       *
       * Examples:
       * HR
       * ENGINEERING
       * OPERATIONS
       */
      orgUnitCode: {
        type:
          String,

        required:
          true,

        trim:
          true,

        uppercase:
          true,

        index:
          true,
      },

      /*
       * OPTIONAL compatibility/reference field.
       *
       * Some organizational units may have a Department
       * document and some may not.
       */
      departmentId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Department",

        default:
          null,

        index:
          true,
      },

      officeId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Office",

        default:
          null,

        index:
          true,
      },

      /* =====================================================
         WEEK

         ALWAYS MONDAY → SUNDAY.
      ===================================================== */

      weekStartDate: {
        type:
          String,

        required:
          true,

        trim:
          true,

        match:
          DATE_KEY_REGEX,

        index:
          true,
      },

      weekEndDate: {
        type:
          String,

        required:
          true,

        trim:
          true,

        match:
          DATE_KEY_REGEX,

        index:
          true,
      },

      /*
       * Example:
       * 2026-W36
       *
       * Display/search helper only.
       */
      weekKey: {
        type:
          String,

        required:
          true,

        trim:
          true,

        uppercase:
          true,

        index:
          true,
      },

      /* =====================================================
         WORKFLOW
      ===================================================== */

      status: {
        type:
          String,

        enum:
          SHIFT_ROSTER_STATUSES,

        default:
          "DRAFT",

        index:
          true,
      },

      /* =====================================================
         COUNTS

         Updated by service for fast UI.
      ===================================================== */

      employeeCount: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      assignmentCount: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      /* =====================================================
         OPTIONAL SOURCE FILE

         PDF/Excel from Head can be attached for reference,
         but assignments in SE-RMS remain source of truth.
      ===================================================== */

      sourceAttachmentUrl: {
        type:
          String,

        trim:
          true,

        default:
          null,
      },

      sourceAttachmentName: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      notes: {
        type:
          String,

        trim:
          true,

        default:
          "",

        maxlength:
          2000,
      },

      /* =====================================================
         CREATED BY HEAD / MANAGER
      ===================================================== */

      createdBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required:
          true,

        index:
          true,
      },

      submittedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      submittedAt: {
        type:
          Date,

        default:
          null,
      },

      /* =====================================================
         HR REVIEW
      ===================================================== */

      reviewedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      reviewedAt: {
        type:
          Date,

        default:
          null,
      },

      reviewRemarks: {
        type:
          String,

        trim:
          true,

        default:
          "",

        maxlength:
          2000,
      },

      /* =====================================================
         PUBLISH
      ===================================================== */

      publishedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      publishedAt: {
        type:
          Date,

        default:
          null,

        index:
          true,
      },

      cancelledBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      cancelledAt: {
        type:
          Date,

        default:
          null,
      },
    },
    {
      timestamps:
        true,

      versionKey:
        false,

      minimize:
        false,
    }
  );

/* =========================================================
   PRE VALIDATE

   Keep organization code canonical.
========================================================= */

shiftRosterSchema.pre(
  "validate",
  function () {
    this.orgUnitCode =
      normalizeOrgUnitCode(
        this.orgUnitCode
      );

    if (
      !this.orgUnitCode
    ) {
      this.invalidate(
        "orgUnitCode",
        "orgUnitCode is required."
      );
    }

    if (
      typeof this.companyCode ===
        "string"
    ) {
      this.companyCode =
        this.companyCode
          .trim()
          .toUpperCase() ||
        null;
    }
  }
);

/* =========================================================
   ONE ROSTER PER ORG UNIT PER OFFICE PER WEEK

   This replaces the previous departmentId unique key.

   Example:

   HR + Delhi + 2026-09-14
   ENGINEERING + Sonipat + 2026-09-14
========================================================= */

shiftRosterSchema.index(
  {
    orgUnitCode:
      1,

    officeId:
      1,

    weekStartDate:
      1,
  },
  {
    unique:
      true,
  }
);

/* =========================================================
   MANAGEMENT VIEW
========================================================= */

shiftRosterSchema.index({
  orgUnitCode:
    1,

  weekStartDate:
    -1,

  status:
    1,
});

/* =========================================================
   OPTIONAL DEPARTMENT COMPATIBILITY VIEW
========================================================= */

shiftRosterSchema.index({
  departmentId:
    1,

  weekStartDate:
    -1,

  status:
    1,
});

/* =========================================================
   STATUS VIEW
========================================================= */

shiftRosterSchema.index({
  status:
    1,

  weekStartDate:
    -1,
});

/* =========================================================
   COMPANY / ORG VIEW
========================================================= */

shiftRosterSchema.index({
  companyCode:
    1,

  orgUnitCode:
    1,

  weekStartDate:
    -1,
});

/* =========================================================
   MODEL
========================================================= */

module.exports =
  mongoose.models
    .ShiftRoster ||
  mongoose.model(
    "ShiftRoster",
    shiftRosterSchema
  );
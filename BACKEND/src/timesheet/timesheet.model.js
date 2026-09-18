const mongoose = require("mongoose");

const { Schema } = mongoose;

/* =========================================================
   TIMESHEET / DAILY WORK REPORT

   One document = one employee's report for one day.

   Employee snapshot fields are intentional.

   If an employee later changes department/designation,
   historical reports should still show where they belonged
   when the report was submitted.
========================================================= */

const timesheetSchema =
  new Schema(
    {
      /* =====================================================
         EMPLOYEE
      ====================================================== */

      employeeId: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
        index: true,
      },

      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      employeeCode: {
        type: String,
        trim: true,
        default: "",
        index: true,
      },

      employeeName: {
        type: String,
        trim: true,
        required: true,
      },

      employeeEmail: {
        type: String,
        trim: true,
        lowercase: true,
        default: "",
      },

      /* =====================================================
         ORGANISATION SNAPSHOT
      ====================================================== */

      organizationUnitId: {
        type: Schema.Types.ObjectId,
        ref: "OrganizationUnit",
        default: null,
        index: true,
      },

      departmentId: {
        type: Schema.Types.ObjectId,
        ref: "Department",
        default: null,
        index: true,
      },

      departmentName: {
        type: String,
        trim: true,
        default: "",
      },

      designationId: {
        type: Schema.Types.ObjectId,
        ref: "Designation",
        default: null,
      },

      designationName: {
        type: String,
        trim: true,
        default: "",
      },

      reportingManagerId: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        default: null,
        index: true,
      },

      reportingManagerUserId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      /* =====================================================
         REPORT DATE

         Stable UTC midnight date-key.

         Example:
         2026-08-23T00:00:00.000Z

         This represents the reporting DAY,
         not the actual submission time.
      ====================================================== */

      reportDate: {
        type: Date,
        required: true,
        index: true,
      },

      timezone: {
        type: String,
        default: "Asia/Kolkata",
      },

      /* =====================================================
         REPORT CONTENT
      ====================================================== */

      workSummary: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 10000,
      },

      challenges: {
        type: String,
        trim: true,
        default: "",
        maxlength: 5000,
      },

      nextDayPlan: {
        type: String,
        trim: true,
        default: "",
        maxlength: 10000,
      },

      /* =====================================================
         STATUS

         For initial version we mainly use SUBMITTED.

         REVIEWED is already supported so later manager/head
         can acknowledge a report without changing the model.
      ====================================================== */

      status: {
        type: String,
        enum: [
          "SUBMITTED",
          "REVIEWED",
        ],
        default: "SUBMITTED",
        index: true,
      },

      submittedAt: {
        type: Date,
        default: Date.now,
        required: true,
      },

      /* =====================================================
         REVIEW

         Optional for now.

         We don't need to build the frontend immediately,
         but having it in the model prevents redesign later.
      ====================================================== */

      reviewedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      reviewedAt: {
        type: Date,
        default: null,
      },

      reviewRemark: {
        type: String,
        trim: true,
        default: "",
        maxlength: 2000,
      },

      /* =====================================================
         EMAIL NOTIFICATION

         SMTP failure must NOT delete/fail a successfully
         submitted work report.
      ====================================================== */

      notification: {
        emailAttempted: {
          type: Boolean,
          default: false,
        },

        emailSent: {
          type: Boolean,
          default: false,
        },

        emailSentAt: {
          type: Date,
          default: null,
        },

        emailError: {
          type: String,
          trim: true,
          default: "",
        },
      },
    },
    {
      timestamps: true,
      minimize: false,
    }
  );

/* =========================================================
   UNIQUE DAILY REPORT
========================================================= */

timesheetSchema.index(
  {
    employeeId: 1,
    reportDate: 1,
  },
  {
    unique: true,
  }
);

/* =========================================================
   MANAGEMENT QUERY INDEXES
========================================================= */

timesheetSchema.index({
  organizationUnitId: 1,
  reportDate: -1,
});

timesheetSchema.index({
  departmentId: 1,
  reportDate: -1,
});

timesheetSchema.index({
  reportingManagerId: 1,
  reportDate: -1,
});

timesheetSchema.index({
  status: 1,
  reportDate: -1,
});

timesheetSchema.index({
  userId: 1,
  reportDate: -1,
});

module.exports =
  mongoose.models.Timesheet ||
  mongoose.model(
    "Timesheet",
    timesheetSchema
  );
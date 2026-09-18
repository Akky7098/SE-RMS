const express =
  require(
    "express"
  );

const cors =
  require(
    "cors"
  );

const helmet =
  require(
    "helmet"
  );

const morgan =
  require(
    "morgan"
  );

const cookieParser =
  require(
    "cookie-parser"
  );

const env =
  require(
    "./config/env"
  );

/* =========================================================
   AUTH / USERS / ACCESS
========================================================= */

const authRoutes =
  require(
    "./auth/auth.route"
  );

const userRoutes =
  require(
    "./user/user.route"
  );

const employeeRoutes =
  require(
    "./employee/employee.route"
  );

const accessRoutes =
  require(
    "./access/access.route"
  );

/* =========================================================
   EMPLOYEE ONBOARDING / PEOPLE
========================================================= */

const employeeOnboardingRoutes =
  require(
    "./employee/onboarding/onboarding.routes"
  );

const employeeDocumentRoutes =
  require(
    "./employee/documents/employeeDocument.routes"
  );

const employeeAssetRoutes =
  require(
    "./employee/assets/employeeAsset.routes"
  );

const employeeAppointmentRoutes =
  require(
    "./employee/appointment/appointment.routes"
  );

const employeeAccessRoutes =
  require(
    "./employee/access/employeeAccess.routes"
  );

const employeeMailRoutes =
  require(
    "./employee/mail/employeeMail.routes"
  );

const employeeActivationRoutes =
  require(
    "./employee/activation/employeeActivation.routes"
  );

/* =========================================================
   ATTENDANCE / SHIFT / TIMESHEET
========================================================= */

const attendanceRoutes =
  require(
    "./attendance/attendance.route"
  );
  
  const leaveRoutes =
  require("./leave/leave.route");

/*
 * Weekly Shift Management
 *
 * Attendance
 * └── shift/
 *     └── shift.route.js
 *
 * Mounted later at:
 *
 * /api/v1/attendance/shifts
 */
const attendanceShiftRoutes =
  require(
    "./attendance/shift/shift.route"
  );

const timesheetRoutes =
  require(
    "./timesheet/timesheet.route"
  );

const fkWebRoutes =
  require(
    "./attendance/fkweb.route"
  );

const esslRoutes =
  require(
    "./attendance/essl.routes"
  );

/* =========================================================
   ORGANIZATION
========================================================= */

const departmentRoutes =
  require(
    "./department/department.routes"
  );

/* =========================================================
   RECRUITMENT
========================================================= */

const manpowerRoutes =
  require(
    "./manpower/manpower.routes"
  );

const recruitmentRoutes =
  require(
    "./recruitment/recruitment.routes"
  );

const resumeParserRoutes =
  require(
    "./resumeParser/resumeParser.routes"
  );

const interviewRoutes =
  require(
    "./interview/interview.routes"
  );

const evaluationRoutes =
  require(
    "./evaluation/evaluation.routes"
  );

const selectionRoutes =
  require(
    "./selection/selection.routes"
  );

const candidatePortalRoutes =
  require(
    "./selection/portal/candidatePortal.routes"
  );

const selectionDocumentRoutes =
  require(
    "./selection/documents/document.routes"
  );

const offerRoutes =
  require(
    "./selection/offer/offer.routes"
  );

const joiningRoutes =
  require(
    "./selection/joining/joining.routes"
  );

/* =========================================================
   ERROR MIDDLEWARE
========================================================= */

const notFound =
  require(
    "./middleware/notFound.middleware"
  );

const errorHandler =
  require(
    "./middleware/error.middleware"
  );

/* =========================================================
   APP
========================================================= */

const app =
  express();

/* =========================================================
   TRUST PROXY

   Required behind Hostinger / Nginx / reverse proxy.
========================================================= */

app.set(
  "trust proxy",
  1
);

/* =========================================================
   SECURITY
========================================================= */

app.use(
  helmet()
);

/* =========================================================
   CORS
========================================================= */

app.use(
  cors({
    origin: (
      origin,
      callback
    ) => {
      /*
       * Allow Postman / curl / server tools where
       * browser Origin is not present.
       */
      if (
        !origin
      ) {
        return callback(
          null,
          true
        );
      }

      if (
        env
          .frontendUrls
          .includes(
            origin
          )
      ) {
        return callback(
          null,
          true
        );
      }

      return callback(
        new Error(
          `CORS origin not allowed: ${origin}`
        )
      );
    },

    credentials:
      true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

/* =========================================================
   FKWEB BIOMETRIC RECEIVER

   IMPORTANT:
   Must remain BEFORE express.json()
========================================================= */

app.use(
  "/fkweb",
  fkWebRoutes
);

/* =========================================================
   REQUEST PARSING
========================================================= */

app.use(
  express.json({
    limit:
      "10mb",
  })
);

app.use(
  express.urlencoded({
    extended:
      true,

    limit:
      "10mb",
  })
);

app.use(
  cookieParser()
);

/* =========================================================
   REQUEST LOGGING
========================================================= */

if (
  env.nodeEnv ===
  "development"
) {
  app.use(
    morgan(
      "dev"
    )
  );
}

/* =========================================================
   HEALTH
========================================================= */

app.get(
  "/api/health",
  (
    req,
    res
  ) => {
    return res
      .status(
        200
      )
      .json({
        success:
          true,

        message:
          "SE-RMS API is running",

        environment:
          env.nodeEnv,

        timestamp:
          new Date()
            .toISOString(),
      });
  }
);

/* =========================================================
   =========================================================
   SE-RMS MODULE ROUTES
   =========================================================
   ========================================================= */

/* =========================================================
   AUTH
========================================================= */

app.use(
  "/api/v1/auth",
  authRoutes
);

/* =========================================================
   USERS
========================================================= */

app.use(
  "/api/v1/users",
  userRoutes
);

/* =========================================================
   PEOPLE / EMPLOYEES

   Permanent Employee Master
========================================================= */

app.use(
  "/api/v1/employees",
  employeeRoutes
);

/* =========================================================
   LEGACY / GLOBAL ACCESS CONTROL
========================================================= */

app.use(
  "/api/v1/access",
  accessRoutes
);

/* =========================================================
   EMPLOYEE ONBOARDING

   Day 1 Confirmed
   → Employee Creation
========================================================= */

app.use(
  "/api/v1/employee-onboarding",
  employeeOnboardingRoutes
);

/* =========================================================
   EMPLOYEE DOCUMENT VAULT

   Recruitment documents
   Company documents
   Generated documents
   Master Employee PDF
========================================================= */

app.use(
  "/api/v1/employee-documents",
  employeeDocumentRoutes
);

/* =========================================================
   EMPLOYEE ASSETS

   Asset Assignment
   Handover PDF
   Signed Acknowledgement
========================================================= */

app.use(
  "/api/v1/employee-assets",
  employeeAssetRoutes
);

/* =========================================================
   EMPLOYEE APPOINTMENT LETTER

   7-day waiting period
   Generate
   Review
   Issue
========================================================= */

app.use(
  "/api/v1/employee-appointments",
  employeeAppointmentRoutes
);

/* =========================================================
   EMPLOYEE SE-RMS ACCESS

   Prepare Access
   Official Email
   Create User Account
========================================================= */

app.use(
  "/api/v1/employee-access",
  employeeAccessRoutes
);

/* =========================================================
   EMPLOYEE ONBOARDING MAIL

   Access Email
   Welcome Email
========================================================= */

app.use(
  "/api/v1/employee-mail",
  employeeMailRoutes
);

/* =========================================================
   FINAL EMPLOYEE ACTIVATION

   Final checklist
   ONBOARDING → ACTIVE
========================================================= */

app.use(
  "/api/v1/employee-activation",
  employeeActivationRoutes
);

/* =========================================================
   ATTENDANCE

   All routes declared inside:

   ./attendance/attendance.route.js

   become:

   /api/v1/attendance/...

   Examples:

   GET   /api/v1/attendance/me
   GET   /api/v1/attendance
   GET   /api/v1/attendance/monthly
   GET   /api/v1/attendance/export/monthly

   POST  /api/v1/attendance/regularization
   GET   /api/v1/attendance/regularization/me
   GET   /api/v1/attendance/regularization/pending

   PATCH /api/v1/attendance/regularization/:id/approve
   PATCH /api/v1/attendance/regularization/:id/reject

   POST  /api/v1/attendance/processing/punch/:id
   POST  /api/v1/attendance/processing/pending

   WFH / FIELD / LOCATION endpoints should also stay inside
   attendance.route.js when wired there.
========================================================= */

app.use(
  "/api/v1/attendance",
  attendanceRoutes
);

/* =========================================================
   SHIFT MANAGEMENT

   NEW.

   Dedicated Shift router:

   ./attendance/shift/shift.route.js

   Final API root:

   /api/v1/attendance/shifts

   Therefore shift.route.js endpoints become:

   GET
   /api/v1/attendance/shifts/calendar/week

   GET
   /api/v1/attendance/shifts/master

   POST
   /api/v1/attendance/shifts/master

   PATCH
   /api/v1/attendance/shifts/master/:id

   GET
   /api/v1/attendance/shifts/rosters

   POST
   /api/v1/attendance/shifts/rosters

   GET
   /api/v1/attendance/shifts/rosters/:id

   PUT
   /api/v1/attendance/shifts/rosters/:id/assignment

   POST
   /api/v1/attendance/shifts/rosters/:id/bulk-assign

   POST
   /api/v1/attendance/shifts/rosters/:id/assign-week

   POST
   /api/v1/attendance/shifts/rosters/:id/copy-previous-week

   POST
   /api/v1/attendance/shifts/rosters/:id/submit

   POST
   /api/v1/attendance/shifts/rosters/:id/publish
========================================================= */

app.use(
  "/api/v1/attendance/shifts",
  attendanceShiftRoutes
);

/* =========================================================
   TIMESHEET
========================================================= */

app.use(
  "/api/v1/timesheets",
  timesheetRoutes
);

/* =========================================================
   DEPARTMENTS
========================================================= */

app.use(
  "/api/v1/departments",
  departmentRoutes
);

/* =========================================================
   MANPOWER
========================================================= */

app.use(
  "/api/v1/manpower",
  manpowerRoutes
);

/* =========================================================
   RECRUITMENT
========================================================= */

app.use(
  "/api/v1/recruitment",
  recruitmentRoutes
);

/* =========================================================
   RESUME PARSER
========================================================= */

app.use(
  "/api/v1/resume-parser",
  resumeParserRoutes
);

/* =========================================================
   INTERVIEWS
========================================================= */

app.use(
  "/api/v1/interviews",
  interviewRoutes
);

/* =========================================================
   EVALUATIONS
========================================================= */

app.use(
  "/api/v1/evaluations",
  evaluationRoutes
);

/* =========================================================
   SELECTION

   Selected Candidate
   → LOI
   → Documents
   → Offer
========================================================= */

app.use(
  "/api/v1/selections",
  selectionRoutes
);

/* =========================================================
   SELECTION DOCUMENTS

   HR-side verification of candidate documents
========================================================= */

app.use(
  "/api/v1/selection-documents",
  selectionDocumentRoutes
);

/* =========================================================
   OFFERS
========================================================= */

app.use(
  "/api/v1/offers",
  offerRoutes
);

/* =========================================================
   JOINING / DAY 1
========================================================= */

app.use(
  "/api/v1/joinings",
  joiningRoutes
);

app.use(
  "/api/v1/leaves",
  leaveRoutes
);
/* =========================================================
   PUBLIC CANDIDATE PORTAL

   IMPORTANT:

   No employee authentication here.

   Security comes from secure candidate portal token.
========================================================= */

app.use(
  "/api/public/candidate",
  candidatePortalRoutes
);

/* =========================================================
   ESSL DEVICE

   Device uses /iclock directly.
========================================================= */

app.use(
  "/iclock",
  esslRoutes
);

/* =========================================================
   404

   MUST remain after absolutely ALL routes.
========================================================= */

app.use(
  notFound
);

/* =========================================================
   GLOBAL ERROR HANDLER

   MUST remain absolutely last.
========================================================= */

app.use(
  errorHandler
);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  app;
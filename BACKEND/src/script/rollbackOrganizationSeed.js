require("dotenv").config();

const mongoose =
  require("mongoose");

const {
  User,
} =
  require("../user/user.model");

const {
  Employee,
} =
  require("../employee/employee.model");

/* =========================================================
   EXACT EMPLOYEE CODES CREATED BY THE BAD SEED

   We delete ONLY these records.
   Existing employees/users outside this list are untouched.
========================================================= */

const SEEDED_EMPLOYEE_CODES = [
  "SE-DIR-001",

  "SE-OPS-001",

  "SE-ENG-001",

  "SE-IT-001",
  "SE-IT-002",
  "SE-IT-003",
  "SE-IT-004",

  "SE-ADM-001",
  "SE-ADM-002",
  "SE-ADM-003",

  "SE-FIN-001",
  "SE-FIN-002",
  "SE-FIN-003",
  "SE-FIN-004",
  "SE-FIN-005",
  "SE-FIN-006",
  "SE-FIN-007",
  "SE-FIN-008",
  "SE-FIN-009",
  "SE-FIN-010",

  "SE-MKT-001",
  "SE-MKT-002",
  "SE-MKT-003",

  "SE-LGL-001",

  "SE-PUR-001",
  "SE-PUR-002",

  "SE-HR-001",
  "SE-HR-002",
  "SE-HR-003",

  "SE-QA-001",
  "SE-QA-002",
  "SE-QA-003",

  "SE-MFG-001",

  "SE-CUT-001",

  "SE-PPC-001",

  "SE-MNT-001",
  "SE-MNT-002",

  "SE-MCH-001",
  "SE-MCH-002",
  "SE-MCH-003",
  "SE-MCH-004",
  "SE-MCH-005",

  "SE-SAL-001",
  "SE-SAL-002",
  "SE-SAL-003",
  "SE-SAL-004",
  "SE-SAL-005",
  "SE-SAL-006",
  "SE-SAL-007",
  "SE-SAL-008",
  "SE-SAL-009",
  "SE-SAL-010",
  "SE-SAL-011",
  "SE-SAL-012",
  "SE-SAL-013",

  "SE-CRM-001",
  "SE-CRM-002",

  "SE-DO-001",
  "SE-DO-002",
];

/* =========================================================
   MAIN
========================================================= */

const rollback =
  async () => {
    console.log(
      "\n=============================================="
    );

    console.log(
      " SE-RMS ORGANISATION SEED ROLLBACK"
    );

    console.log(
      "==============================================\n"
    );

    if (
      !process.env.MONGO_URI
    ) {
      throw new Error(
        "MONGO_URI missing from .env"
      );
    }

    console.log(
      "🔌 Connecting to MongoDB..."
    );

    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      "✅ MongoDB connected\n"
    );

    /* =====================================================
       FIND EXACT SEEDED EMPLOYEES
    ===================================================== */

    const employees =
      await Employee.find({
        employeeCode: {
          $in:
            SEEDED_EMPLOYEE_CODES,
        },
      })
        .select(
          "_id employeeCode fullName officialEmail user"
        )
        .lean();

    console.log(
      `Found ${employees.length} seeded employee records.\n`
    );

    if (
      employees.length ===
      0
    ) {
      console.log(
        "Nothing to rollback."
      );

      return;
    }

    /* =====================================================
       PRINT WHAT WILL BE REMOVED
    ===================================================== */

    employees.forEach(
      (
        employee
      ) => {
        console.log(
          `• ${employee.employeeCode} | ${employee.fullName} | ${employee.officialEmail || "no email"}`
        );
      }
    );

    const employeeIds =
      employees.map(
        (
          employee
        ) =>
          employee._id
      );

    const linkedUserIds =
      employees
        .map(
          (
            employee
          ) =>
            employee.user
        )
        .filter(
          Boolean
        );

    /* =====================================================
       EXTRA SAFETY

       Delete User records only when linked to one of these
       seeded employees.

       We do NOT delete based only on @sandeepedgetech.com.
    ===================================================== */

    const linkedUsers =
      await User.find({
        $or: [
          {
            _id: {
              $in:
                linkedUserIds,
            },
          },

          {
            employee: {
              $in:
                employeeIds,
            },
          },
        ],
      })
        .select(
          "_id email displayName employee"
        )
        .lean();

    console.log(
      `\nFound ${linkedUsers.length} linked user records.`
    );

    linkedUsers.forEach(
      (
        user
      ) => {
        console.log(
          `• USER | ${user.displayName || ""} | ${user.email}`
        );
      }
    );

    /* =====================================================
       DELETE USERS FIRST
    ===================================================== */

    const userResult =
      await User.deleteMany({
        _id: {
          $in:
            linkedUsers.map(
              (
                user
              ) =>
                user._id
            ),
        },
      });

    console.log(
      `\n🗑 Users deleted: ${userResult.deletedCount}`
    );

    /* =====================================================
       DELETE EMPLOYEES
    ===================================================== */

    const employeeResult =
      await Employee.deleteMany({
        _id: {
          $in:
            employeeIds,
        },
      });

    console.log(
      `🗑 Employees deleted: ${employeeResult.deletedCount}`
    );

    console.log(
      "\n=============================================="
    );

    console.log(
      " ROLLBACK COMPLETE"
    );

    console.log(
      "=============================================="
    );

    console.log(
      `Users removed     : ${userResult.deletedCount}`
    );

    console.log(
      `Employees removed : ${employeeResult.deletedCount}`
    );

    console.log(
      "\n✅ Other database records were not touched."
    );
  };

/* =========================================================
   EXECUTE
========================================================= */

rollback()
  .catch(
    (
      error
    ) => {
      console.error(
        "\n❌ ROLLBACK FAILED"
      );

      console.error(
        error
      );

      process.exitCode =
        1;
    }
  )
  .finally(
    async () => {
      try {
        await mongoose.disconnect();
      } catch (
        error
      ) {
        // Ignore disconnect error.
      }

      console.log(
        "\n🔌 MongoDB disconnected.\n"
      );
    }
  );
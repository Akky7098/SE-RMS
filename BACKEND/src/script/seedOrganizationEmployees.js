/* =========================================================
   SE-RMS CONTROLLED TEST ORGANISATION SEED

   PURPOSE:
   ---------------------------------------------------------
   This is NOT the full organisation import.

   It creates only enough users/employees to test:

   1. SUPER_ADMIN screen
   2. ADMIN / HR screen
   3. HEAD screen
   4. MANAGER screen
   5. EMPLOYEE screen
   6. Reporting hierarchy
   7. Attendance visibility
   8. Timesheet visibility
   9. Employee management frontend

   SAFE:
   ---------------------------------------------------------
   - No automatic email generation
   - No automatic name generation
   - No guessed organisation units
   - Safe to run multiple times
   - Updates existing seed records instead of duplicating
========================================================= */

require("dotenv").config();

const mongoose =
  require("mongoose");

const bcrypt =
  require("bcryptjs");

const {
  User,
} =
  require("../user/user.model");

const {
  Employee,
} =
  require("../employee/employee.model");

/* =========================================================
   CONFIGURATION
========================================================= */

const DEFAULT_PASSWORD =
  process.env
    .SEED_DEFAULT_PASSWORD;

const PASSWORD_ROUNDS =
  12;

/* =========================================================
   VALIDATION
========================================================= */

if (
  !process.env.MONGO_URI
) {
  console.error(
    "\n❌ MONGO_URI is missing in .env"
  );

  process.exit(1);
}

if (
  !DEFAULT_PASSWORD
) {
  console.error(
    "\n❌ SEED_DEFAULT_PASSWORD is missing."
  );

  console.error(
    "\nRun:"
  );

  console.error(
    'SEED_DEFAULT_PASSWORD="SE123456" node src/script/seedOrganizationEmployees.js'
  );

  process.exit(1);
}

/* =========================================================
   CONTROLLED TEST USERS

   IMPORTANT:
   Every email is explicitly written.

   No email is generated automatically.
========================================================= */

const PEOPLE = [
  /* =======================================================
     1. DIRECTOR / SUPER ADMIN
  ======================================================= */

  {
    key:
      "SANDEEP_JAIN",

    employeeCode:
      "SE-DIR-001",

    fullName:
      "Sandeep Jain",

    email:
      "sandeep@sandeepedgetech.com",

    orgUnitCode:
      "DIR_BOARD",

    designation:
      "Director / MD",

    role:
      "SUPER_ADMIN",

    reportsTo:
      null,
  },

  /* =======================================================
     2. HR / ADMIN

     ADMIN is intentional for initial testing because
     HR should be able to see organisation-wide attendance,
     timesheets and employee information.
  ======================================================= */

  {
    key:
      "ROSHAN_SINGH",

    employeeCode:
      "SE-HR-001",

    fullName:
      "Roshan Singh",

    email:
      "roshan@sandeepedgetech.com",

    orgUnitCode:
      "HR",

    designation:
      "Head - Human Resources",

    role:
      "ADMIN",

    reportsTo:
      "SANDEEP_JAIN",
  },

  /* =======================================================
     3. ENGINEERING HEAD
  ======================================================= */

  {
    key:
      "SAMYAK",

    employeeCode:
      "SE-ENG-001",

    fullName:
      "Samyak",

    email:
      "samyak@sandeepedgetech.com",

    orgUnitCode:
      "ENGINEERING",

    designation:
      "Head - Engineering",

    role:
      "HEAD",

    reportsTo:
      "SANDEEP_JAIN",
  },

  /* =======================================================
     4. OPERATIONS HEAD
  ======================================================= */

  {
    key:
      "VARUN_DHAREWA",

    employeeCode:
      "SE-OPS-001",

    fullName:
      "Varun Dharewa",

    email:
      "varun@sandeepedgetech.com",

    orgUnitCode:
      "OPERATIONS",

    designation:
      "Head - Operations",

    role:
      "HEAD",

    reportsTo:
      "SANDEEP_JAIN",
  },

  /* =======================================================
     5. HR MANAGER

     Useful for testing manager-level hierarchy.
  ======================================================= */

  {
    key:
      "RENU_RAWAT",

    employeeCode:
      "SE-HR-002",

    fullName:
      "Renu Rawat",

    email:
      "renu.rawat@sandeepedgetech.com",

    orgUnitCode:
      "HR",

    designation:
      "HR Manager",

    role:
      "MANAGER",

    reportsTo:
      "ROSHAN_SINGH",
  },

  /* =======================================================
     6. ENGINEERING EMPLOYEE

     Test employee under Samyak.
  ======================================================= */

  {
    key:
      "ENGINEERING_TEST_EMPLOYEE",

    employeeCode:
      "SE-ENG-002",

    fullName:
      "Engineering Test Employee",

    email:
      "engineering.test@sandeepedgetech.com",

    orgUnitCode:
      "ENGINEERING",

    designation:
      "Engineer",

    role:
      "EMPLOYEE",

    reportsTo:
      "SAMYAK",
  },

  /* =======================================================
     7. OPERATIONS EMPLOYEE

     Test employee under Varun.
  ======================================================= */

  {
    key:
      "OPERATIONS_TEST_EMPLOYEE",

    employeeCode:
      "SE-OPS-002",

    fullName:
      "Operations Test Employee",

    email:
      "operations.test@sandeepedgetech.com",

    orgUnitCode:
      "OPERATIONS",

    designation:
      "Operations Executive",

    role:
      "EMPLOYEE",

    reportsTo:
      "VARUN_DHAREWA",
  },
];

/* =========================================================
   STATS
========================================================= */

const stats = {
  usersCreated: 0,
  usersUpdated: 0,

  employeesCreated: 0,
  employeesUpdated: 0,

  hierarchyUpdated: 0,

  failed: 0,
};

/* =========================================================
   PRINT PERSON
========================================================= */

const printPerson =
  (
    action,
    person,
    email
  ) => {
    console.log(
      `${action} ${person.employeeCode} | ${person.fullName}`
    );

    console.log(
      `   Email       : ${email}`
    );

    console.log(
      `   Role        : ${person.role}`
    );

    console.log(
      `   Org Unit    : ${person.orgUnitCode}`
    );

    console.log(
      `   Designation : ${person.designation}`
    );
  };

/* =========================================================
   CREATE / UPDATE USER
========================================================= */

const upsertUser =
  async (
    person,
    passwordHash
  ) => {
    let user =
      await User.findOne({
        email:
          person.email
            .trim()
            .toLowerCase(),
      }).select(
        "+passwordHash"
      );

    if (!user) {
      user =
        await User.create({
          displayName:
            person.fullName,

          email:
            person.email
              .trim()
              .toLowerCase(),

          passwordHash,

          role:
            person.role,

          status:
            "ACTIVE",

          authProviders: [
            "local",
          ],

          emailVerified:
            true,
        });

      stats.usersCreated +=
        1;

      return {
        user,
        created: true,
      };
    }

    /* =====================================================
       UPDATE EXISTING TEST USER

       We intentionally refresh role/name/status.

       Password is also reset to current
       SEED_DEFAULT_PASSWORD so testing remains predictable.
    ===================================================== */

    user.displayName =
      person.fullName;

    user.role =
      person.role;

    user.status =
      "ACTIVE";

    user.emailVerified =
      true;

    user.passwordHash =
      passwordHash;

    if (
      !Array.isArray(
        user.authProviders
      )
    ) {
      user.authProviders =
        [];
    }

    if (
      !user.authProviders.includes(
        "local"
      )
    ) {
      user.authProviders.push(
        "local"
      );
    }

    /*
     * Do NOT set passwordChangedAt here.
     *
     * During seed/testing we want newly generated access
     * tokens to work normally after login.
     */

    await user.save();

    stats.usersUpdated +=
      1;

    return {
      user,
      created: false,
    };
  };

/* =========================================================
   CREATE / UPDATE EMPLOYEE
========================================================= */

const upsertEmployee =
  async (
    person,
    user
  ) => {
    /*
     * EmployeeCode is the stable identifier.
     *
     * We do not search by generated names.
     */

    let employee =
      await Employee.findOne({
        employeeCode:
          person.employeeCode,
      });

    if (!employee) {
      /*
       * Extra safety:
       * Check if same official email already belongs
       * to another employee.
       */

      const emailEmployee =
        await Employee.findOne({
          officialEmail:
            person.email
              .trim()
              .toLowerCase(),
        });

      if (
        emailEmployee
      ) {
        throw new Error(
          `Email ${person.email} already belongs to employee ${emailEmployee.employeeCode}`
        );
      }

      employee =
        await Employee.create({
          employeeCode:
            person.employeeCode,

          fullName:
            person.fullName,

          officialEmail:
            person.email
              .trim()
              .toLowerCase(),

          orgUnitCode:
            person.orgUnitCode,

          designation:
            person.designation,

          user:
            user._id,

          employmentType:
            "PERMANENT",

          status:
            "ACTIVE",
        });

      stats.employeesCreated +=
        1;

      return {
        employee,
        created: true,
      };
    }

    /* =====================================================
       UPDATE EXISTING
    ===================================================== */

    employee.fullName =
      person.fullName;

    employee.officialEmail =
      person.email
        .trim()
        .toLowerCase();

    employee.orgUnitCode =
      person.orgUnitCode;

    employee.designation =
      person.designation;

    employee.user =
      user._id;

    employee.status =
      "ACTIVE";

    employee.employmentType =
      employee.employmentType ||
      "PERMANENT";

    await employee.save();

    stats.employeesUpdated +=
      1;

    return {
      employee,
      created: false,
    };
  };

/* =========================================================
   LINK USER ↔ EMPLOYEE
========================================================= */

const linkUserEmployee =
  async (
    user,
    employee
  ) => {
    if (
      String(
        user.employee ||
        ""
      ) !==
      String(
        employee._id
      )
    ) {
      user.employee =
        employee._id;

      await user.save();
    }

    if (
      String(
        employee.user ||
        ""
      ) !==
      String(
        user._id
      )
    ) {
      employee.user =
        user._id;

      await employee.save();
    }
  };

/* =========================================================
   APPLY REPORTING HIERARCHY
========================================================= */

const applyHierarchy =
  async (
    employeeMap
  ) => {
    console.log(
      "\n=============================================="
    );

    console.log(
      " REPORTING HIERARCHY"
    );

    console.log(
      "==============================================\n"
    );

    for (
      const person of
      PEOPLE
    ) {
      const employee =
        employeeMap.get(
          person.key
        );

      if (!employee) {
        continue;
      }

      /* ===================================================
         TOP LEVEL
      =================================================== */

      if (
        !person.reportsTo
      ) {
        if (
          employee.reportsTo
        ) {
          employee.reportsTo =
            null;

          await employee.save();

          stats.hierarchyUpdated +=
            1;
        }

        console.log(
          `👑 ${person.fullName} → TOP LEVEL`
        );

        continue;
      }

      /* ===================================================
         MANAGER
      =================================================== */

      const manager =
        employeeMap.get(
          person.reportsTo
        );

      if (!manager) {
        throw new Error(
          `Reporting manager ${person.reportsTo} not found for ${person.fullName}`
        );
      }

      const needsUpdate =
        String(
          employee.reportsTo ||
          ""
        ) !==
        String(
          manager._id
        );

      if (
        needsUpdate
      ) {
        employee.reportsTo =
          manager._id;

        await employee.save();

        stats.hierarchyUpdated +=
          1;
      }

      console.log(
        `🔗 ${person.fullName} → ${manager.fullName}`
      );
    }
  };

/* =========================================================
   VERIFY DATABASE
========================================================= */

const verifySeed =
  async () => {
    console.log(
      "\n=============================================="
    );

    console.log(
      " DATABASE VERIFICATION"
    );

    console.log(
      "==============================================\n"
    );

    const employees =
      await Employee.find({
        employeeCode: {
          $in:
            PEOPLE.map(
              (
                person
              ) =>
                person.employeeCode
            ),
        },
      })
        .populate(
          "user",
          "displayName email role status"
        )
        .populate(
          "reportsTo",
          "fullName employeeCode"
        )
        .sort({
          employeeCode: 1,
        })
        .lean();

    for (
      const employee of
      employees
    ) {
      console.log(
        "--------------------------------------------------"
      );

      console.log(
        `${employee.employeeCode} | ${employee.fullName}`
      );

      console.log(
        `Email       : ${
          employee.user
            ?.email ||
          "NO USER"
        }`
      );

      console.log(
        `Role        : ${
          employee.user
            ?.role ||
          "NO ROLE"
        }`
      );

      console.log(
        `Org Unit    : ${employee.orgUnitCode}`
      );

      console.log(
        `Designation : ${employee.designation}`
      );

      console.log(
        `Reports To  : ${
          employee.reportsTo
            ?.fullName ||
          "TOP LEVEL"
        }`
      );
    }

    return employees;
  };

/* =========================================================
   MAIN
========================================================= */

const seedOrganizationEmployees =
  async () => {
    console.log(
      "\n=============================================="
    );

    console.log(
      " SE-RMS TEST ORGANISATION SEED"
    );

    console.log(
      "=============================================="
    );

    console.log(
      `\nEmployees configured : ${PEOPLE.length}`
    );

    console.log(
      "Mode                 : CONTROLLED TEST DATA"
    );

    console.log(
      "Email generation     : DISABLED"
    );

    console.log(
      "Password             : Environment variable"
    );

    /* =====================================================
       CONNECT
    ===================================================== */

    console.log(
      "\n🔌 Connecting to MongoDB..."
    );

    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      "✅ MongoDB connected"
    );

    /* =====================================================
       HASH PASSWORD
    ===================================================== */

    console.log(
      "\n🔐 Generating password hash..."
    );

    const passwordHash =
      await bcrypt.hash(
        DEFAULT_PASSWORD,
        PASSWORD_ROUNDS
      );

    console.log(
      "✅ Password hash ready\n"
    );

    const employeeMap =
      new Map();

    /* =====================================================
       CREATE / UPDATE USERS + EMPLOYEES
    ===================================================== */

    console.log(
      "=============================================="
    );

    console.log(
      " USERS + EMPLOYEES"
    );

    console.log(
      "==============================================\n"
    );

    for (
      const person of
      PEOPLE
    ) {
      try {
        const {
          user,
          created:
            userCreated,
        } =
          await upsertUser(
            person,
            passwordHash
          );

        const {
          employee,
          created:
            employeeCreated,
        } =
          await upsertEmployee(
            person,
            user
          );

        await linkUserEmployee(
          user,
          employee
        );

        employeeMap.set(
          person.key,
          employee
        );

        const userAction =
          userCreated
            ? "🟢 CREATED"
            : "🔵 UPDATED";

        const employeeAction =
          employeeCreated
            ? "Employee created"
            : "Employee updated";

        printPerson(
          userAction,
          person,
          user.email
        );

        console.log(
          `   ${employeeAction}`
        );

        console.log();
      } catch (
        error
      ) {
        stats.failed +=
          1;

        console.error(
          `❌ FAILED: ${person.fullName}`
        );

        console.error(
          `   ${error.message}\n`
        );
      }
    }

    /* =====================================================
       HIERARCHY
    ===================================================== */

    await applyHierarchy(
      employeeMap
    );

    /* =====================================================
       VERIFY
    ===================================================== */

    const verified =
      await verifySeed();

    /* =====================================================
       LOGIN TEST ACCOUNTS
    ===================================================== */

    console.log(
      "\n=============================================="
    );

    console.log(
      " LOGIN TEST ACCOUNTS"
    );

    console.log(
      "==============================================\n"
    );

    console.log(
      "SUPER ADMIN"
    );

    console.log(
      "sandeep@sandeepedgetech.com"
    );

    console.log(
      "\nHR / ADMIN"
    );

    console.log(
      "roshan@sandeepedgetech.com"
    );

    console.log(
      "\nENGINEERING HEAD"
    );

    console.log(
      "samyak@sandeepedgetech.com"
    );

    console.log(
      "\nOPERATIONS HEAD"
    );

    console.log(
      "varun@sandeepedgetech.com"
    );

    console.log(
      "\nMANAGER"
    );

    console.log(
      "renu.rawat@sandeepedgetech.com"
    );

    console.log(
      "\nEMPLOYEE"
    );

    console.log(
      "engineering.test@sandeepedgetech.com"
    );

    console.log(
      "operations.test@sandeepedgetech.com"
    );

    console.log(
      "\nPassword: value supplied through SEED_DEFAULT_PASSWORD"
    );

    /* =====================================================
       SUMMARY
    ===================================================== */

    console.log(
      "\n=============================================="
    );

    console.log(
      " SEED COMPLETE"
    );

    console.log(
      "=============================================="
    );

    console.log(
      `Users created          : ${stats.usersCreated}`
    );

    console.log(
      `Users updated          : ${stats.usersUpdated}`
    );

    console.log(
      `Employees created      : ${stats.employeesCreated}`
    );

    console.log(
      `Employees updated      : ${stats.employeesUpdated}`
    );

    console.log(
      `Hierarchy updated      : ${stats.hierarchyUpdated}`
    );

    console.log(
      `Failed                 : ${stats.failed}`
    );

    console.log(
      `Verified employees     : ${verified.length}`
    );

    if (
      stats.failed ===
      0 &&
      verified.length ===
        PEOPLE.length
    ) {
      console.log(
        "\n✅ TEST ORGANISATION READY"
      );

      console.log(
        "You can now test:"
      );

      console.log(
        "• Super Admin employee view"
      );

      console.log(
        "• HR organisation-wide view"
      );

      console.log(
        "• Engineering Head scope"
      );

      console.log(
        "• Operations Head scope"
      );

      console.log(
        "• Manager scope"
      );

      console.log(
        "• Normal employee scope"
      );

      console.log(
        "• Attendance"
      );

      console.log(
        "• Timesheets"
      );
    } else {
      console.log(
        "\n⚠️ Seed completed with errors."
      );

      console.log(
        "Review the failed entries above before frontend testing."
      );
    }
  };

/* =========================================================
   EXECUTE
========================================================= */

seedOrganizationEmployees()
  .catch(
    (
      error
    ) => {
      console.error(
        "\n❌ SEED FAILED"
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

        console.log(
          "\n🔌 MongoDB disconnected.\n"
        );
      } catch (
        error
      ) {
        console.error(
          "MongoDB disconnect failed:",
          error.message
        );
      }
    }
  );
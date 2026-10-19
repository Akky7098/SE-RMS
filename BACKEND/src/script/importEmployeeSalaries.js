require("dotenv").config();

const path = require("path");
const mongoose = require("mongoose");
const XLSX = require("xlsx");

const {
  Employee,
} = require("../employee/employee.model");

const {
  EmployeeSalaryStructure,
} = require("../payroll/payroll.model");

/* =========================================================
   CONFIG
========================================================= */

const EXCEL_PATH = path.resolve(
  __dirname,
  "Emp master.xlsx"
);

const SHEET_NAME = "Emp Master";

/*
 * SAFE DEFAULT:
 * First run = DRY RUN
 *
 * Actual insert:
 * node src/scripts/importEmployeeSalaries.js --commit
 */
const COMMIT =
  process.argv.includes("--commit");

const EFFECTIVE_FROM =
  new Date(
    "2026-04-01T00:00:00.000Z"
  );

/* =========================================================
   HELPERS
========================================================= */

const clean = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replace(/\s+/g, " ")
    .trim();
};

const upper = (value) =>
  clean(value).toUpperCase();

const number = (
  value,
  fallback = 0
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  const parsed =
    Number(
      String(value)
        .replace(/₹/g, "")
        .replace(/,/g, "")
        .replace(/%/g, "")
        .trim()
    );

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
};

const money = (value) =>
  Math.round(
    (number(value) +
      Number.EPSILON) *
      100
  ) / 100;

const yes = (value) =>
  [
    "Y",
    "YES",
    "TRUE",
    "1",
  ].includes(
    upper(value)
  );

/* =========================================================
   FLEXIBLE COLUMN FINDER
========================================================= */

function valueFrom(
  row,
  names
) {
  const keys =
    Object.keys(row);

  for (
    const name of names
  ) {
    const target =
      upper(name);

    const key =
      keys.find(
        (item) =>
          upper(item) ===
          target
      );

    if (key) {
      return row[key];
    }
  }

  return null;
}

/* =========================================================
   EMPLOYEE CODE
========================================================= */

function employeeCodeFrom(
  row
) {
  return upper(
    valueFrom(
      row,
      [
        "Employee Code",
        "EMPLOYEE CODE",
        "Emp Code",
        "EMP CODE",
      ]
    )
  ).replace(/\s+/g, "");
}

/* =========================================================
   PAYMENT MODE
========================================================= */

function paymentModeFrom(
  value
) {
  const mode =
    upper(value);

  if (
    mode.includes("CHQ") ||
    mode.includes("CHEQUE")
  ) {
    return "CHEQUE";
  }

  if (
    mode.includes("CASH") ||
    mode === "CS"
  ) {
    return "CASH";
  }

  if (
    mode.includes("BANK") ||
    mode.includes("NEFT") ||
    mode.includes("RTGS") ||
    mode.includes("IMPS")
  ) {
    return "BANK";
  }

  return "OTHER";
}

/* =========================================================
   EARNINGS COMPONENT
========================================================= */

function component(
  code,
  name,
  amount
) {
  return {
    code,
    name,
    amount: money(amount),

    taxable: true,

    proratable: true,

    systemGenerated: false,
  };
}

/* =========================================================
   READ EXCEL
========================================================= */

function readExcel() {
  const workbook =
    XLSX.readFile(
      EXCEL_PATH,
      {
        cellDates: true,
      }
    );

  const sheet =
    workbook.Sheets[
      SHEET_NAME
    ];

  if (!sheet) {
    throw new Error(
      `Sheet "${SHEET_NAME}" not found.`
    );
  }

  /*
   * Emp Master's actual header
   * starts from Excel row 3.
   */
  return XLSX.utils
    .sheet_to_json(
      sheet,
      {
        range: 2,
        defval: null,
        raw: true,
      }
    );
}

/* =========================================================
   SALARY DATA FROM ROW
========================================================= */

function salaryFromRow(
  row
) {
  /*
   * THIS IS OUR CURRENT SALARY.
   */
  const currentSalary =
    money(
      valueFrom(
        row,
        [
          "New Sal for Basic+HRA",
          "New Sal for Basic + HRA",
        ]
      )
    );

  const basic =
    money(
      valueFrom(
        row,
        ["Basic"]
      )
    );

  const hra =
    money(
      valueFrom(
        row,
        ["HRA"]
      )
    );

  const conveyance =
    money(
      valueFrom(
        row,
        ["Conveyance"]
      )
    );

  const others =
    money(
      valueFrom(
        row,
        ["Others"]
      )
    );

  /*
   * OLD / HISTORICAL INFORMATION
   *
   * We preserve it as source information.
   */
  const previousSalary =
    money(
      valueFrom(
        row,
        ["Salary"]
      )
    );

  const lastSalary =
    money(
      valueFrom(
        row,
        ["L Sal"]
      )
    );

  const incrementPercent =
    number(
      valueFrom(
        row,
        ["Inc %"]
      )
    );

  const incrementSalary =
    money(
      valueFrom(
        row,
        ["Inc 2025"]
      )
    );

  const tds =
    money(
      valueFrom(
        row,
        ["TDS"]
      )
    );

  return {
    currentSalary,

    basic,
    hra,
    conveyance,
    others,

    previousSalary,
    lastSalary,
    incrementPercent,
    incrementSalary,

    tds,
  };
}

/* =========================================================
   BUILD EARNINGS
========================================================= */

function buildEarnings(
  salary
) {
  const earnings = [];

  /*
   * Keep the actual components from Excel.
   * Zero values are allowed to be missing.
   */

  if (salary.basic > 0) {
    earnings.push(
      component(
        "BASIC",
        "Basic Pay",
        salary.basic
      )
    );
  }

  if (salary.hra > 0) {
    earnings.push(
      component(
        "HRA",
        "House Rent Allowance",
        salary.hra
      )
    );
  }

  if (
    salary.conveyance > 0
  ) {
    earnings.push(
      component(
        "CONVEYANCE",
        "Conveyance Allowance",
        salary.conveyance
      )
    );
  }

  if (
    salary.others > 0
  ) {
    earnings.push(
      component(
        "OTHERS",
        "Other Allowance",
        salary.others
      )
    );
  }

  return earnings;
}

/* =========================================================
   REMARKS / PREVIOUS SALARY DATA
========================================================= */

function buildRemarks(
  row,
  salary
) {
  const sourceRemark =
    clean(
      valueFrom(
        row,
        ["Remarks"]
      )
    );

  const parts = [
    "Salary imported from Emp master (1).xlsx",

    salary.previousSalary
      ? `Previous Salary: ₹${salary.previousSalary}`
      : "",

    salary.lastSalary
      ? `Last Salary: ₹${salary.lastSalary}`
      : "",

    salary.incrementPercent
      ? `Increment: ${salary.incrementPercent}`
      : "",

    salary.incrementSalary
      ? `Incremented Salary: ₹${salary.incrementSalary}`
      : "",

    sourceRemark
      ? `Source Remark: ${sourceRemark}`
      : "",
  ];

  return parts
    .filter(Boolean)
    .join(" | ");
}

/* =========================================================
   MAIN
========================================================= */

async function main() {
  console.log(
    "\n============================================"
  );

  console.log(
    " EMPLOYEE SALARY IMPORT"
  );

  console.log(
    "============================================"
  );

  console.log(
    COMMIT
      ? "MODE: COMMIT"
      : "MODE: DRY RUN"
  );

  console.log(
    `Effective From: ${
      EFFECTIVE_FROM
        .toISOString()
        .slice(0, 10)
    }`
  );

  /* -------------------------------------------------------
     DATABASE
  ------------------------------------------------------- */

  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error(
      "MongoDB URI missing from .env"
    );
  }

  await mongoose.connect(
    mongoUri
  );

  console.log(
    "\nMongoDB connected."
  );

  /* -------------------------------------------------------
     EXCEL
  ------------------------------------------------------- */

  const rows =
    readExcel();

  console.log(
    `Excel rows found: ${rows.length}`
  );

  const result = {
    excelRows: rows.length,

    mappedEmployees: 0,

    ready: 0,

    inserted: 0,

    skippedNoCode: 0,

    employeeNotFound: 0,

    missingCurrentSalary: 0,

    alreadyImported: 0,

    errors: 0,
  };

  const problems = [];

  /* -------------------------------------------------------
     LOOP
  ------------------------------------------------------- */

  for (
    let i = 0;
    i < rows.length;
    i += 1
  ) {
    const row =
      rows[i];

    const excelRow =
      i + 4;

    try {
      /* ===================================================
         EMPLOYEE CODE
      =================================================== */

      const employeeCode =
        employeeCodeFrom(
          row
        );

      if (!employeeCode) {
        result
          .skippedNoCode += 1;

        continue;
      }

      /* ===================================================
         FIND EMPLOYEE
      =================================================== */

      const employee =
        await Employee
          .findOne({
            employeeCode,
          })
          .lean();

      if (!employee) {
        result
          .employeeNotFound += 1;

        problems.push({
          excelRow,
          employeeCode,
          name:
            clean(
              valueFrom(
                row,
                ["NAME", "Name"]
              )
            ),

          issue:
            "EMPLOYEE_NOT_FOUND",
        });

        continue;
      }

      result
        .mappedEmployees += 1;

      /* ===================================================
         SALARY
      =================================================== */

      const salary =
        salaryFromRow(
          row
        );

      /*
       * As requested:
       *
       * New Sal for Basic+HRA
       * IS the current salary.
       *
       * We do NOT substitute old salary.
       */
      if (
        salary.currentSalary <= 0
      ) {
        result
          .missingCurrentSalary +=
          1;

        problems.push({
          excelRow,

          employeeCode,

          employee:
            employee.fullName ||
            employee.name ||
            "",

          issue:
            "NEW_CURRENT_SALARY_MISSING",
        });

        continue;
      }

      /* ===================================================
         COMPONENTS
      =================================================== */

      const earnings =
        buildEarnings(
          salary
        );

      /* ===================================================
         STATUTORY
      =================================================== */

      const pfEnabled =
        yes(
          valueFrom(
            row,
            [
              "PF to calculate (Y/N)",
            ]
          )
        );

      const esiEnabled =
        yes(
          valueFrom(
            row,
            ["ESI"]
          )
        );

      const statutory = {
        pfEnabled,

        /*
         * No amount supplied.
         * Payroll policy can calculate later.
         */
        pfAmount: 0,

        esiEnabled,

        esiAmount: 0,

        tdsEnabled:
          salary.tds > 0,

        monthlyTds:
          salary.tds,

        professionalTaxEnabled:
          false,

        professionalTaxAmount:
          0,
      };

      /* ===================================================
         OT
      =================================================== */

      const overtime = {
        eligible:
          yes(
            valueFrom(
              row,
              ["OT"]
            )
          ),

        calculationType:
          "HOURLY_FIXED",

        hourlyRate: 0,

        multiplier: 1,
      };

      /* ===================================================
         PAYMENT
      =================================================== */

      const paymentMode =
        paymentModeFrom(
          valueFrom(
            row,
            ["Chq/Cs"]
          )
        );

      /* ===================================================
         EXISTING SALARY
      =================================================== */

      const latest =
        await EmployeeSalaryStructure
          .findOne({
            employeeId:
              employee._id,
          })
          .sort({
            revisionNumber:
              -1,
          })
          .lean();

      /*
       * Prevent accidental duplicate
       * if script is run twice.
       */
      if (
        latest &&
        money(
          latest.monthlyGross
        ) ===
          salary.currentSalary &&
        latest.status ===
          "ACTIVE"
      ) {
        result
          .alreadyImported += 1;

        console.log(
          `= ${employeeCode} | ₹${salary.currentSalary} | ALREADY ACTIVE`
        );

        continue;
      }

      const revisionNumber =
        Number(
          latest
            ?.revisionNumber ||
            0
        ) + 1;

      /* ===================================================
         STRUCTURE
      =================================================== */

      const structure = {
        employeeId:
          employee._id,

        employeeCode:
          employee.employeeCode,

        companyCode:
          employee.companyCode,

        /*
         * No fake policy ID.
         *
         * Your model should only require policyId if
         * your schema defines it as required.
         */
        effectiveFrom:
          EFFECTIVE_FROM,

        effectiveTo:
          null,

        status:
          "ACTIVE",

        revisionNumber,

        currency:
          "INR",

        /*
         * MASTER CURRENT SALARY
         */
        monthlyGross:
          salary.currentSalary,

        annualCTC:
          money(
            salary.currentSalary *
              12
          ),

        /*
         * Basic / HRA /
         * Conveyance / Others
         */
        earnings,

        fixedDeductions:
          [],

        statutory,

        overtime,

        paymentMode,

        remarks:
          buildRemarks(
            row,
            salary
          ),

        locked:
          false,

        lockedAt:
          null,

        lockedBy:
          null,

        createdBy:
          null,

        updatedBy:
          null,
      };

      result.ready += 1;

      console.log(
        `${
          COMMIT
            ? "+"
            : "✓"
        } ${employeeCode} | ${
          employee.fullName ||
          employee.name ||
          ""
        } | ₹${
          salary.currentSalary
        } | BASIC ₹${
          salary.basic
        } | HRA ₹${
          salary.hra
        }`
      );

      /* ===================================================
         DRY RUN STOPS HERE
      =================================================== */

      if (!COMMIT) {
        continue;
      }

      /* ===================================================
         CLOSE PREVIOUS ACTIVE SALARY
      =================================================== */

      await EmployeeSalaryStructure
        .updateMany(
          {
            employeeId:
              employee._id,

            status:
              "ACTIVE",
          },
          {
            $set: {
              status:
                "SUPERSEDED",

              effectiveTo:
                new Date(
                  EFFECTIVE_FROM
                    .getTime() -
                    86400000
                ),

              locked:
                true,

              lockedAt:
                new Date(),

              updatedBy:
                null,
            },
          }
        );

      /* ===================================================
         INSERT CURRENT SALARY
      =================================================== */

      await EmployeeSalaryStructure
        .create(
          structure
        );

      result.inserted += 1;
    } catch (error) {
      result.errors += 1;

      problems.push({
        excelRow,

        employeeCode:
          employeeCodeFrom(
            row
          ),

        issue:
          "ERROR",

        error:
          error.message,
      });

      console.error(
        `ERROR Excel row ${excelRow}:`,
        error.message
      );
    }
  }

  /* =========================================================
     RESULT
  ========================================================= */

  console.log(
    "\n============================================"
  );

  console.log(
    " SALARY IMPORT SUMMARY"
  );

  console.log(
    "============================================"
  );

  console.table(
    result
  );

  if (
    problems.length
  ) {
    console.log(
      "\nMISSING / SKIPPED:"
    );

    console.table(
      problems
    );
  }

  if (!COMMIT) {
    console.log(
      "\nDRY RUN COMPLETE."
    );

    console.log(
      "Nothing was written to MongoDB."
    );

    console.log(
      "\nAfter checking the output run:"
    );

    console.log(
      "node src/scripts/importEmployeeSalaries.js --commit"
    );
  } else {
    console.log(
      `\nSUCCESS: ${result.inserted} employee salaries inserted.`
    );
  }

  await mongoose.disconnect();
}

/* =========================================================
   EXECUTE
========================================================= */

main()
  .then(() => {
    process.exit(0);
  })
  .catch(
    async (error) => {
      console.error(
        "\nIMPORT FAILED:"
      );

      console.error(
        error
      );

      try {
        await mongoose.disconnect();
      } catch (_) {}

      process.exit(1);
    }
  );
require("dotenv").config();

const path = require("path");
const mongoose = require("mongoose");
const XLSX = require("xlsx");

/* =========================================================
   SE-RMS LEGACY EMPLOYEE IMPORT

   SOURCE FILES:
   1. Emp master.xlsx
      -> Main employee source

   2. MERGED_MASTER_DATA (1).xlsx
      -> Mobile / email enrichment only

   IMPORTANT:
   - Salary/bank/PAN/Aadhaar are NOT imported.
   - Existing employees are NEVER updated.
   - Existing employeeCode -> skip
   - Existing exact name -> skip + manual review
   - Duplicate employeeCode inside Excel -> skip ALL duplicates
   - Samyak/current employees remain untouched.
   - reportsTo is NOT changed in this migration.
========================================================= */

/* =========================================================
   MODELS

   Script location:
   src/scripts/importLegacyEmployees.js
========================================================= */

const {
  Employee,
} = require("../employee/employee.model");

const {
  Department,
} = require("../department/department.model");

const {
  ORG_UNIT_CODES,
} = require("../organization/organization.config");

/* =========================================================
   FILES

   Keep both Excel files inside src/scripts/
========================================================= */

const EMPLOYEE_MASTER_PATH =
  path.resolve(
    __dirname,
    "Emp master.xlsx"
  );

const MERGED_MASTER_PATH =
  path.resolve(
    __dirname,
    "MERGED_MASTER_DATA (1).xlsx"
  );

const EMPLOYEE_MASTER_SHEET =
  "Emp Master";

const MERGED_MASTER_SHEET =
  "EMP Detail";

/* =========================================================
   MODE

   node src/scripts/importLegacyEmployees.js
       = DRY RUN

   node src/scripts/importLegacyEmployees.js --commit
       = REAL INSERT
========================================================= */

const DRY_RUN =
  !process.argv.includes(
    "--commit"
  );

/* =========================================================
   COMPANY MAPPING
========================================================= */

const COMPANY_MAP = {
  SE:
    "SANDEEP_ENTERPRISES",

  VESS:
    "VESS",

  SI:
    "SI",

  FERMECH:
    "FERMECH",

  SF:
    "SF",

  MULTIPACK:
    "MULTIPACK",
};

/* =========================================================
   DEPARTMENT COLLECTION MAPPING

   These must match Department.code in MongoDB.
========================================================= */

const DEPARTMENT_CODE_MAP = {
  "SALES & MARKETING":
    "SALES",

  "SALES & BD":
    "SALES",

  "BACKEND SALES & OPS":
    "SALES",

  AGENT:
    "SALES",

  "BACKEND OPS":
    "OPS",

  MACHINING:
    "PRODUCTION",

  CUTTING:
    "PRODUCTION",

  PPC:
    "PRODUCTION",

  "FLOOR SHOP":
    "PRODUCTION",

  MAINTENANCE:
    "MAINTENANCE",

  QUALITY:
    "QUALITY",

  PURCHASE:
    "PURCHASE",

  ACCOUNTS:
    "FINANCE",

  "ACCOUNTS & FINANCE":
    "FINANCE",

  MIS:
    "IT",

  IT:
    "IT",

  "HR & ADMIN":
    "HR",

  "HR & ADMINISTRATION":
    "HR",

  HR:
    "HR",

  ADMIN:
    "ADMIN",

  LOGISTICS:
    "DISPATCH",

  DRIVER:
    "DISPATCH",

  MANAGEMENT:
    "OPS",

  OFFICE:
    "ADMIN",

  STORE:
    "OPS",

  STOCK:
    "OPS",

  HOUSEKEEPING:
    "ADMIN",

  GARDEN:
    "ADMIN",

  "DIGITAL MARKETING":
    "SALES",
};

/* =========================================================
   ORG UNIT MAPPING

   These are the REAL codes from organization.config.js.
========================================================= */

const ORG_UNIT_MAP = {
  "SALES & MARKETING":
    "SALES",

  "SALES & BD":
    "SALES",

  "BACKEND SALES & OPS":
    "SALES",

  AGENT:
    "SALES",

  "BACKEND OPS":
    "OPS_BACKEND",

  MACHINING:
    "MFG_MACHINING",

  CUTTING:
    "MFG_CUTTING",

  PPC:
    "MFG_PPC",

  "FLOOR SHOP":
    "OPS_FLOOR_SHOP",

  MAINTENANCE:
    "MFG_MAINTENANCE",

  QUALITY:
    "QUALITY_ASSURANCE",

  PURCHASE:
    "FACTORY_PURCHASE",

  ACCOUNTS:
    "FIN_ACCOUNTS",

  "ACCOUNTS & FINANCE":
    "FINANCE",

  MIS:
    "MIS_IT",

  IT:
    "MIS_IT",

  "HR & ADMIN":
    "HR",

  "HR & ADMINISTRATION":
    "HR",

  HR:
    "HR",

  ADMIN:
    "ADMIN",

  LOGISTICS:
    "OPS_LOGISTICS",

  DRIVER:
    "OPS_LOGISTICS",

  MANAGEMENT:
    "DIR_BOARD",

  OFFICE:
    "OPS_OFFICE",

  STORE:
    "OPS_STORE",

  STOCK:
    "OPS_STORE",

  HOUSEKEEPING:
    "OPS_HOUSEKEEPING",

  GARDEN:
    "OPS_GARDEN",

  "DIGITAL MARKETING":
    "DIGITAL_MARKETING",
};

/* =========================================================
   BASIC HELPERS
========================================================= */

function cleanString(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function normalizeUpper(
  value
) {
  return cleanString(
    value
  ).toUpperCase();
}

function normalizeName(
  value
) {
  return cleanString(
    value
  )
    .toUpperCase()
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function normalizeEmployeeCode(
  value
) {
  return normalizeUpper(
    value
  ).replace(
    /\s+/g,
    ""
  );
}

/* =========================================================
   MOBILE

   Employee.mobileNumber:
   10-digit Indian mobile.

   Example:
   919305127159 -> 9305127159
========================================================= */

function normalizeMobile(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  let mobile =
    String(value)
      .replace(
        /\D/g,
        ""
      )
      .trim();

  if (!mobile) {
    return null;
  }

  if (
    mobile.length ===
      12 &&
    mobile.startsWith(
      "91"
    )
  ) {
    mobile =
      mobile.slice(2);
  }

  if (
    mobile.length ===
      11 &&
    mobile.startsWith(
      "0"
    )
  ) {
    mobile =
      mobile.slice(1);
  }

  if (
    !/^[6-9]\d{9}$/.test(
      mobile
    )
  ) {
    return null;
  }

  return mobile;
}

/* =========================================================
   EMAIL
========================================================= */

function normalizeEmail(
  value
) {
  const email =
    cleanString(
      value
    ).toLowerCase();

  if (!email) {
    return null;
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    return null;
  }

  return email;
}

/* =========================================================
   DATE
========================================================= */

function parseDate(
  value
) {
  if (!value) {
    return null;
  }

  if (
    value instanceof Date &&
    !Number.isNaN(
      value.getTime()
    )
  ) {
    return value;
  }

  if (
    typeof value ===
    "number"
  ) {
    const parsed =
      XLSX.SSF
        .parse_date_code(
          value
        );

    if (!parsed) {
      return null;
    }

    return new Date(
      parsed.y,
      parsed.m - 1,
      parsed.d
    );
  }

  const text =
    cleanString(
      value
    );

  if (!text) {
    return null;
  }

  const match =
    text.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/
    );

  if (match) {
    let year =
      Number(
        match[3]
      );

    if (
      year < 100
    ) {
      year +=
        2000;
    }

    const date =
      new Date(
        year,
        Number(
          match[2]
        ) - 1,
        Number(
          match[1]
        )
      );

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      return date;
    }
  }

  const date =
    new Date(
      text
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

/* =========================================================
   COLUMN HELPER
========================================================= */

function getColumn(
  row,
  candidates
) {
  const keys =
    Object.keys(
      row
    );

  for (
    const candidate
    of candidates
  ) {
    const target =
      normalizeUpper(
        candidate
      );

    const key =
      keys.find(
        (item) =>
          normalizeUpper(
            item
          ) ===
          target
      );

    if (key) {
      return row[
        key
      ];
    }
  }

  return null;
}

/* =========================================================
   STATUS
========================================================= */

function mapEmployeeStatus(
  row
) {
  const status =
    normalizeUpper(
      getColumn(
        row,
        [
          "Status",
        ]
      )
    );

  const terminatedDate =
    parseDate(
      getColumn(
        row,
        [
          "Terminated Date",
        ]
      )
    );

  if (
    terminatedDate ||
    status.includes(
      "TERMIN"
    ) ||
    status.includes(
      "EXIT"
    ) ||
    status.includes(
      "LEFT"
    )
  ) {
    return "EXITED";
  }

  if (
    status.includes(
      "INACTIVE"
    )
  ) {
    return "INACTIVE";
  }

  return "ACTIVE";
}

/* =========================================================
   EMPLOYMENT TYPE
========================================================= */

function mapEmploymentType(
  row
) {
  const type =
    normalizeUpper(
      getColumn(
        row,
        [
          "Type",
        ]
      )
    );

  if (
    type.includes(
      "CONTRACT"
    )
  ) {
    return "CONTRACT";
  }

  if (
    type.includes(
      "PROBATION"
    )
  ) {
    return "PROBATION";
  }

  if (
    type.includes(
      "TRAINEE"
    )
  ) {
    return "TRAINEE";
  }

  if (
    type.includes(
      "INTERN"
    )
  ) {
    return "INTERN";
  }

  if (
    type.includes(
      "CONSULT"
    ) ||
    type === "PROF"
  ) {
    return "CONSULTANT";
  }

  return "PERMANENT";
}

/* =========================================================
   LOAD EMP MASTER

   Actual header row is row 3.
========================================================= */

function loadEmployeeMaster() {
  const workbook =
    XLSX.readFile(
      EMPLOYEE_MASTER_PATH,
      {
        cellDates:
          true,
      }
    );

  const worksheet =
    workbook.Sheets[
      EMPLOYEE_MASTER_SHEET
    ];

  if (!worksheet) {
    throw new Error(
      `Sheet "${EMPLOYEE_MASTER_SHEET}" not found in Emp master.xlsx`
    );
  }

  return XLSX.utils
    .sheet_to_json(
      worksheet,
      {
        range:
          2,

        defval:
          null,

        raw:
          true,
      }
    );
}

/* =========================================================
   LOAD MERGED MASTER

   Actual first row is the header.
========================================================= */

function loadMergedMaster() {
  const workbook =
    XLSX.readFile(
      MERGED_MASTER_PATH,
      {
        cellDates:
          true,
      }
    );

  const worksheet =
    workbook.Sheets[
      MERGED_MASTER_SHEET
    ];

  if (!worksheet) {
    throw new Error(
      `Sheet "${MERGED_MASTER_SHEET}" not found in MERGED_MASTER_DATA (1).xlsx`
    );
  }

  return XLSX.utils
    .sheet_to_json(
      worksheet,
      {
        defval:
          null,

        raw:
          true,
      }
    );
}

/* =========================================================
   MERGED MASTER INDEX

   Actual merged file contains:
   Token No.
   Name
   MOBILE NO.
   SE PERSONAL EMAIL ID
   SE OFFICIAL EMAIL ID
========================================================= */

function buildMergedIndex(
  rows
) {
  const byCode =
    new Map();

  const byName =
    new Map();

  for (
    const row
    of rows
  ) {
    const employeeCode =
      normalizeEmployeeCode(
        getColumn(
          row,
          [
            "Token No.",
            "Employee Code",
            "Employee ID",
            "Emp Code",
          ]
        )
      );

    const fullName =
      normalizeName(
        getColumn(
          row,
          [
            "Name",
            "NAME",
            "Employee Name",
          ]
        )
      );

    const mobileNumber =
      normalizeMobile(
        getColumn(
          row,
          [
            "MOBILE NO.",
            "Mobile No.",
            "Mobile Number",
            "Mobile",
            "Phone",
          ]
        )
      );

    const personalEmail =
      normalizeEmail(
        getColumn(
          row,
          [
            "SE PERSONAL EMAIL ID",
            "Personal Email",
            "Personal Email ID",
          ]
        )
      );

    const officialEmail =
      normalizeEmail(
        getColumn(
          row,
          [
            "SE OFFICIAL EMAIL ID",
            "Official Email",
            "Official Email ID",
          ]
        )
      );

    const data = {
      employeeCode,
      fullName,
      mobileNumber,
      personalEmail,
      officialEmail,
    };

    if (
      employeeCode
    ) {
      if (
        !byCode.has(
          employeeCode
        )
      ) {
        byCode.set(
          employeeCode,
          []
        );
      }

      byCode
        .get(
          employeeCode
        )
        .push(
          data
        );
    }

    if (
      fullName
    ) {
      if (
        !byName.has(
          fullName
        )
      ) {
        byName.set(
          fullName,
          []
        );
      }

      byName
        .get(
          fullName
        )
        .push(
          data
        );
    }
  }

  return {
    byCode,
    byName,
  };
}

/* =========================================================
   RESOLVE MERGED DATA

   PRIORITY:
   1. Exact employee code
   2. Exact name ONLY when one unique matching row

   Never guess ambiguous names.
========================================================= */

function resolveMergedData({
  employeeCode,
  fullName,
  mergedIndex,
}) {
  const codeMatches =
    mergedIndex.byCode.get(
      employeeCode
    ) || [];

  if (
    codeMatches.length ===
    1
  ) {
    return {
      ...codeMatches[0],

      matchType:
        "EMPLOYEE_CODE",
    };
  }

  if (
    codeMatches.length >
    1
  ) {
    return {
      mobileNumber:
        null,

      personalEmail:
        null,

      officialEmail:
        null,

      matchType:
        "AMBIGUOUS_EMPLOYEE_CODE",
    };
  }

  const nameMatches =
    mergedIndex.byName.get(
      fullName
    ) || [];

  if (
    nameMatches.length ===
    1
  ) {
    return {
      ...nameMatches[0],

      matchType:
        "UNIQUE_NAME",
    };
  }

  if (
    nameMatches.length >
    1
  ) {
    return {
      mobileNumber:
        null,

      personalEmail:
        null,

      officialEmail:
        null,

      matchType:
        "AMBIGUOUS_NAME",
    };
  }

  return {
    mobileNumber:
      null,

    personalEmail:
      null,

    officialEmail:
      null,

    matchType:
      "NOT_FOUND",
  };
}

/* =========================================================
   MAIN
========================================================= */

async function run() {
  console.log(
    "\n=============================================="
  );

  console.log(
    " SE-RMS LEGACY EMPLOYEE IMPORT"
  );

  console.log(
    "=============================================="
  );

  console.log(
    `MODE: ${
      DRY_RUN
        ? "DRY RUN - NO DATABASE WRITES"
        : "COMMIT - DATABASE WILL BE UPDATED"
    }`
  );

  console.log(
    `Employee Master: ${EMPLOYEE_MASTER_PATH}`
  );

  console.log(
    `Merged Master:   ${MERGED_MASTER_PATH}`
  );

  /* =======================================================
     CHECK FILES
  ======================================================= */

  const fs =
    require(
      "fs"
    );

  if (
    !fs.existsSync(
      EMPLOYEE_MASTER_PATH
    )
  ) {
    throw new Error(
      `Missing file: ${EMPLOYEE_MASTER_PATH}`
    );
  }

  if (
    !fs.existsSync(
      MERGED_MASTER_PATH
    )
  ) {
    throw new Error(
      `Missing file: ${MERGED_MASTER_PATH}`
    );
  }

  /* =======================================================
     DATABASE
  ======================================================= */

  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI or MONGO_URI is missing from .env"
    );
  }

  await mongoose.connect(
    mongoUri
  );

  console.log(
    "MongoDB connected."
  );

  /* =======================================================
     VALIDATE ORG UNIT MAP AGAINST CONFIG
  ======================================================= */

  const validOrgUnits =
    new Set(
      ORG_UNIT_CODES
    );

  const invalidOrgMappings =
    Object.entries(
      ORG_UNIT_MAP
    ).filter(
      ([
        ,
        orgUnitCode,
      ]) =>
        !validOrgUnits.has(
          orgUnitCode
        )
    );

  if (
    invalidOrgMappings.length >
    0
  ) {
    console.error(
      "\nINVALID ORG UNIT MAPPINGS:"
    );

    console.error(
      invalidOrgMappings
    );

    throw new Error(
      "ORG_UNIT_MAP contains codes not present in organization.config.js"
    );
  }

  /* =======================================================
     LOAD DEPARTMENTS
  ======================================================= */

  const departments =
    await Department
      .find({
        status:
          "ACTIVE",
      })
      .select(
        "_id name code status"
      )
      .lean();

  const departmentByCode =
    new Map();

  for (
    const department
    of departments
  ) {
    departmentByCode.set(
      normalizeUpper(
        department.code
      ),
      department
    );
  }

  console.log(
    `Active Mongo departments: ${departments.length}`
  );

  /* =======================================================
     VERIFY REQUIRED DEPARTMENTS
  ======================================================= */

  const requiredDepartmentCodes =
    [
      ...new Set(
        Object.values(
          DEPARTMENT_CODE_MAP
        )
      ),
    ];

  const missingDepartments =
    requiredDepartmentCodes
      .filter(
        (code) =>
          !departmentByCode.has(
            code
          )
      );

  if (
    missingDepartments.length >
    0
  ) {
    console.error(
      "\nMISSING ACTIVE DEPARTMENTS:"
    );

    console.error(
      missingDepartments
    );

    throw new Error(
      "Required Department records are missing. No employee import performed."
    );
  }

  /* =======================================================
     LOAD EXCEL FILES
  ======================================================= */

  const employeeRows =
    loadEmployeeMaster();

  const mergedRows =
    loadMergedMaster();

  const mergedIndex =
    buildMergedIndex(
      mergedRows
    );

  console.log(
    `Employee master rows: ${employeeRows.length}`
  );

  console.log(
    `Merged master rows: ${mergedRows.length}`
  );

  /* =======================================================
     COUNT EMPLOYEE CODES INSIDE EMP MASTER

     Every duplicate occurrence will be skipped.
  ======================================================= */

  const excelCodeCounts =
    new Map();

  for (
    const row
    of employeeRows
  ) {
    const employeeCode =
      normalizeEmployeeCode(
        getColumn(
          row,
          [
            "Employee Code",
          ]
        )
      );

    if (!employeeCode) {
      continue;
    }

    excelCodeCounts.set(
      employeeCode,
      (
        excelCodeCounts.get(
          employeeCode
        ) || 0
      ) + 1
    );
  }

  /* =======================================================
     EXISTING DATABASE EMPLOYEES
  ======================================================= */

  const existingEmployees =
    await Employee
      .find({})
      .select(
        "_id employeeCode fullName source officialEmail"
      )
      .lean();

  const existingByCode =
    new Map();

  const existingByName =
    new Map();

  const existingOfficialEmails =
    new Set();

  for (
    const employee
    of existingEmployees
  ) {
    const employeeCode =
      normalizeEmployeeCode(
        employee.employeeCode
      );

    const fullName =
      normalizeName(
        employee.fullName
      );

    const officialEmail =
      normalizeEmail(
        employee.officialEmail
      );

    if (
      employeeCode
    ) {
      existingByCode.set(
        employeeCode,
        employee
      );
    }

    if (
      fullName
    ) {
      if (
        !existingByName.has(
          fullName
        )
      ) {
        existingByName.set(
          fullName,
          []
        );
      }

      existingByName
        .get(
          fullName
        )
        .push(
          employee
        );
    }

    if (
      officialEmail
    ) {
      existingOfficialEmails.add(
        officialEmail
      );
    }
  }

  console.log(
    `Existing Mongo employees: ${existingEmployees.length}`
  );

  /* =======================================================
     RESULT
  ======================================================= */

  const result = {
    employeeMasterRows:
      employeeRows.length,

    mergedMasterRows:
      mergedRows.length,

    existingMongoEmployees:
      existingEmployees.length,

    readyToCreate:
      0,

    created:
      0,

    mobileMatchedByCode:
      0,

    mobileMatchedByUniqueName:
      0,

    mobileNotFound:
      0,

    mobileAmbiguous:
      0,

    personalEmailFound:
      0,

    officialEmailFound:
      0,

    skippedExistingCode:
      0,

    skippedExistingName:
      0,

    skippedDuplicateExcelCode:
      0,

    skippedMissingIdentity:
      0,

    skippedDepartmentMapping:
      0,

    skippedDepartmentNotFound:
      0,

    skippedOrgUnitMapping:
      0,

    skippedUnknownCompany:
      0,

    errors:
      0,

    warnings:
      [],
  };

  /* =======================================================
     PROCESS
  ======================================================= */

  for (
    let index = 0;
    index <
      employeeRows.length;
    index += 1
  ) {
    const row =
      employeeRows[
        index
      ];

    // Header is Excel row 3.
    // First employee is row 4.
    const excelRow =
      index + 4;

    const employeeCode =
      normalizeEmployeeCode(
        getColumn(
          row,
          [
            "Employee Code",
          ]
        )
      );

    const fullName =
      normalizeName(
        getColumn(
          row,
          [
            "NAME",
            "Name",
          ]
        )
      );

    /* =====================================================
       EMPTY ROW
    ===================================================== */

    if (
      !employeeCode &&
      !fullName
    ) {
      continue;
    }

    /* =====================================================
       REQUIRED IDENTITY
    ===================================================== */

    if (
      !employeeCode ||
      !fullName
    ) {
      result
        .skippedMissingIdentity +=
        1;

      result.warnings.push({
        excelRow,
        employeeCode,
        fullName,
        reason:
          "MISSING_EMPLOYEE_CODE_OR_NAME",
      });

      continue;
    }

    /* =====================================================
       DUPLICATE CODE INSIDE EXCEL

       Skip every occurrence.
    ===================================================== */

    if (
      (
        excelCodeCounts.get(
          employeeCode
        ) || 0
      ) > 1
    ) {
      result
        .skippedDuplicateExcelCode +=
        1;

      result.warnings.push({
        excelRow,
        employeeCode,
        fullName,
        reason:
          "DUPLICATE_EMPLOYEE_CODE_IN_EXCEL",
      });

      console.log(
        `[SKIP DUPLICATE EXCEL CODE] ${employeeCode} | ${fullName}`
      );

      continue;
    }

    /* =====================================================
       EXISTING EMPLOYEE CODE

       Never modify existing employee.
    ===================================================== */

    if (
      existingByCode.has(
        employeeCode
      )
    ) {
      result
        .skippedExistingCode +=
        1;

      console.log(
        `[SKIP EXISTING CODE] ${employeeCode} | ${fullName}`
      );

      continue;
    }

    /* =====================================================
       EXISTING EXACT NAME

       User requested name OR code match -> avoid duplicate.
    ===================================================== */

    const existingNameMatches =
      existingByName.get(
        fullName
      ) || [];

    if (
      existingNameMatches.length >
      0
    ) {
      result
        .skippedExistingName +=
        1;

      result.warnings.push({
        excelRow,
        employeeCode,
        fullName,
        reason:
          "EXACT_NAME_ALREADY_EXISTS_IN_MONGODB",

        existingEmployeeCodes:
          existingNameMatches.map(
            (employee) =>
              employee.employeeCode
          ),
      });

      console.log(
        `[SKIP EXISTING NAME] ${employeeCode} | ${fullName}`
      );

      continue;
    }

    /* =====================================================
       SOURCE DEPARTMENT
    ===================================================== */

    const sourceDepartment =
      normalizeUpper(
        getColumn(
          row,
          [
            "Department",
          ]
        )
      );

    const departmentCode =
      DEPARTMENT_CODE_MAP[
        sourceDepartment
      ];

    if (
      !departmentCode
    ) {
      result
        .skippedDepartmentMapping +=
        1;

      result.warnings.push({
        excelRow,
        employeeCode,
        fullName,
        sourceDepartment,
        reason:
          "NO_DEPARTMENT_MAPPING",
      });

      console.log(
        `[SKIP DEPARTMENT MAP] ${employeeCode} | ${sourceDepartment}`
      );

      continue;
    }

    const department =
      departmentByCode.get(
        departmentCode
      );

    if (!department) {
      result
        .skippedDepartmentNotFound +=
        1;

      result.warnings.push({
        excelRow,
        employeeCode,
        fullName,
        departmentCode,
        reason:
          "DEPARTMENT_NOT_FOUND",
      });

      continue;
    }

    /* =====================================================
       ORG UNIT
    ===================================================== */

    const orgUnitCode =
      ORG_UNIT_MAP[
        sourceDepartment
      ];

    if (
      !orgUnitCode ||
      !validOrgUnits.has(
        orgUnitCode
      )
    ) {
      result
        .skippedOrgUnitMapping +=
        1;

      result.warnings.push({
        excelRow,
        employeeCode,
        fullName,
        sourceDepartment,
        orgUnitCode,
        reason:
          "INVALID_OR_MISSING_ORG_UNIT_MAPPING",
      });

      console.log(
        `[SKIP ORG UNIT] ${employeeCode} | ${sourceDepartment}`
      );

      continue;
    }

    /* =====================================================
       COMPANY
    ===================================================== */

    const sourceCompany =
      normalizeUpper(
        getColumn(
          row,
          [
            "COMPANY",
            "Company",
          ]
        )
      );

    const companyCode =
      COMPANY_MAP[
        sourceCompany
      ] || null;

    if (
      sourceCompany &&
      !companyCode
    ) {
      result
        .skippedUnknownCompany +=
        1;

      result.warnings.push({
        excelRow,
        employeeCode,
        fullName,
        sourceCompany,
        reason:
          "UNKNOWN_COMPANY",
      });

      console.log(
        `[SKIP UNKNOWN COMPANY] ${employeeCode} | ${sourceCompany}`
      );

      continue;
    }

    /* =====================================================
       MERGED DATA

       Mobile/email only.
       Bank/salary/PAN/Aadhaar ignored.
    ===================================================== */

    const mergedData =
      resolveMergedData({
        employeeCode,
        fullName,
        mergedIndex,
      });

    if (
      mergedData.matchType ===
      "EMPLOYEE_CODE"
    ) {
      if (
        mergedData.mobileNumber
      ) {
        result
          .mobileMatchedByCode +=
          1;
      } else {
        result
          .mobileNotFound +=
          1;
      }
    } else if (
      mergedData.matchType ===
      "UNIQUE_NAME"
    ) {
      if (
        mergedData.mobileNumber
      ) {
        result
          .mobileMatchedByUniqueName +=
          1;
      } else {
        result
          .mobileNotFound +=
          1;
      }
    } else if (
      mergedData.matchType ===
        "AMBIGUOUS_NAME" ||
      mergedData.matchType ===
        "AMBIGUOUS_EMPLOYEE_CODE"
    ) {
      result
        .mobileAmbiguous +=
        1;

      result.warnings.push({
        excelRow,
        employeeCode,
        fullName,
        reason:
          mergedData.matchType,
      });
    } else {
      result
        .mobileNotFound +=
        1;
    }

    if (
      mergedData.personalEmail
    ) {
      result
        .personalEmailFound +=
        1;
    }

    let officialEmail =
      mergedData.officialEmail;

    /*
     * officialEmail has a unique sparse index.
     *
     * If an official email already belongs to an existing
     * employee, do NOT insert that email on this new employee.
     */
    if (
      officialEmail &&
      existingOfficialEmails.has(
        officialEmail
      )
    ) {
      result.warnings.push({
        excelRow,
        employeeCode,
        fullName,
        officialEmail,
        reason:
          "OFFICIAL_EMAIL_ALREADY_EXISTS_IN_MONGODB_EMAIL_NOT_IMPORTED",
      });

      officialEmail =
        null;
    }

    if (
      officialEmail
    ) {
      result
        .officialEmailFound +=
        1;
    }

    /* =====================================================
       DESIGNATION
    ===================================================== */

    const designation =
      cleanString(
        getColumn(
          row,
          [
            "Designation",
          ]
        )
      ) ||
      "Employee";

    /* =====================================================
       DATES / STATUS
    ===================================================== */

    const status =
      mapEmployeeStatus(
        row
      );

    const terminatedDate =
      parseDate(
        getColumn(
          row,
          [
            "Terminated Date",
          ]
        )
      );

    const exitDate =
      status ===
      "EXITED"
        ? terminatedDate
        : null;

    const joiningDate =
      parseDate(
        getColumn(
          row,
          [
            "DOJ",
            "Date of Joining",
          ]
        )
      );

    /* =====================================================
       EMPLOYEE DOCUMENT

       NO PAYROLL/BANK DETAILS.
       NO USER CREATION.
       NO REPORTING HIERARCHY CHANGE.
    ===================================================== */

    const employeeData = {
      employeeCode,

      biometricCode:
        employeeCode,

      companyCode,

      fullName,

      personalEmail:
        mergedData.personalEmail ||
        null,

      officialEmail:
        officialEmail ||
        null,

      mobileNumber:
        mergedData.mobileNumber ||
        null,

      orgUnitCode,

      department:
        department._id,

      designation,

      reportsTo:
        null,

      user:
        null,

      employmentType:
        mapEmploymentType(
          row
        ),

      joiningDate,

      workLocation:
        cleanString(
          getColumn(
            row,
            [
              "Location",
            ]
          )
        ) ||
        null,

      profilePhotoUrl:
        null,

      status,

      exitDate,

      source:
        "LEGACY",

      recruitmentCandidate:
        null,

      recruitmentSelection:
        null,

      recruitmentJoining:
        null,

      onboarding:
        null,

      createdBy:
        null,

      updatedBy:
        null,
    };

    result
      .readyToCreate +=
      1;

    /* =====================================================
       DRY RUN
    ===================================================== */

    if (
      DRY_RUN
    ) {
      console.log(
        `[READY] ${employeeCode} | ${fullName} | ${sourceDepartment} -> ${orgUnitCode} | MOBILE: ${
          employeeData.mobileNumber ||
          "N/A"
        }`
      );

      continue;
    }

    /* =====================================================
       COMMIT

       create() intentionally used instead of upsert.
       Existing records are never modified.
    ===================================================== */

    try {
      const created =
        await Employee.create(
          employeeData
        );

      result.created +=
        1;

      /*
       * Immediately update local protection maps so this
       * same migration cannot insert another duplicate.
       */

      existingByCode.set(
        employeeCode,
        {
          _id:
            created._id,

          employeeCode:
            created.employeeCode,

          fullName:
            created.fullName,
        }
      );

      if (
        !existingByName.has(
          fullName
        )
      ) {
        existingByName.set(
          fullName,
          []
        );
      }

      existingByName
        .get(
          fullName
        )
        .push({
          _id:
            created._id,

          employeeCode:
            created.employeeCode,

          fullName:
            created.fullName,
        });

      if (
        officialEmail
      ) {
        existingOfficialEmails.add(
          officialEmail
        );
      }

      console.log(
        `[CREATED] ${employeeCode} | ${fullName}`
      );
    } catch (
      error
    ) {
      result.errors +=
        1;

      result.warnings.push({
        excelRow,
        employeeCode,
        fullName,

        reason:
          error.message,
      });

      console.error(
        `[ERROR] ${employeeCode} | ${fullName}`
      );

      console.error(
        error.message
      );
    }
  }

  /* =======================================================
     FINAL SUMMARY
  ======================================================= */

  console.log(
    "\n=============================================="
  );

  console.log(
    " FINAL IMPORT SUMMARY"
  );

  console.log(
    "=============================================="
  );

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

  console.log(
    "=============================================="
  );

  if (
    DRY_RUN
  ) {
    console.log(
      "\nDRY RUN COMPLETE."
    );

    console.log(
      "NO DATABASE RECORDS WERE CREATED OR MODIFIED."
    );

    console.log(
      "\nIf the summary is correct, run:"
    );

    console.log(
      "node src/scripts/importLegacyEmployees.js --commit"
    );
  } else {
    console.log(
      `\nIMPORT COMPLETE. CREATED: ${result.created}`
    );
  }
}

/* =========================================================
   RUN
========================================================= */

run()
  .catch(
    (error) => {
      console.error(
        "\n=============================================="
      );

      console.error(
        "IMPORT FAILED"
      );

      console.error(
        "=============================================="
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
        // Ignore disconnect errors.
      }
    }
  );
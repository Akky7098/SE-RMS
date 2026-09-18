/*
 * SE-RMS ORGANISATION STRUCTURE
 *
 * Important:
 * - Codes are permanent identifiers.
 * - Labels can be changed later if wording changes.
 * - Never store employee names here.
 * - Employee names/reporting relationships belong in Employee collection.
 *
 * type:
 * ROOT       = Board / organisation root
 * DEPARTMENT = major functional department
 * UNIT       = subdivision / function
 * TEAM       = team / regional grouping
 */

const ORG_UNITS = [
  // =========================================================
  // ROOT
  // =========================================================
  {
    code: "DIR_BOARD",
    name: "DIR / Board",
    parentCode: null,
    type: "ROOT",
  },

  // =========================================================
  // LEADERSHIP / CORE FUNCTIONS
  // =========================================================
  {
    code: "OPERATIONS",
    name: "Operations",
    parentCode: "DIR_BOARD",
    type: "DEPARTMENT",
  },
  {
    code: "ENGINEERING",
    name: "Engineering",
    parentCode: "DIR_BOARD",
    type: "DEPARTMENT",
  },

  // =========================================================
  // MIS / IT
  // =========================================================
  {
    code: "MIS_IT",
    name: "MIS / IT",
    parentCode: "DIR_BOARD",
    type: "DEPARTMENT",
  },

  // =========================================================
  // HO ADMIN
  // =========================================================
  {
    code: "HO_ADMIN",
    name: "HO Admin",
    parentCode: "DIR_BOARD",
    type: "DEPARTMENT",
  },
  {
    code: "HO_ADMIN_FIELD_STAFF",
    name: "Field Staff",
    parentCode: "HO_ADMIN",
    type: "UNIT",
  },

  // =========================================================
  // FINANCE
  // =========================================================
  {
    code: "FINANCE",
    name: "Finance",
    parentCode: "DIR_BOARD",
    type: "DEPARTMENT",
  },
  {
    code: "FIN_TREASURY",
    name: "Treasury Management",
    parentCode: "FINANCE",
    type: "UNIT",
  },
  {
    code: "FIN_ACCOUNTS",
    name: "Accounts",
    parentCode: "FINANCE",
    type: "UNIT",
  },
  {
    code: "FIN_INVOICING",
    name: "Invoicing",
    parentCode: "FINANCE",
    type: "UNIT",
  },
  {
    code: "FIN_STORES",
    name: "Stores",
    parentCode: "FINANCE",
    type: "UNIT",
  },
  {
    code: "FIN_TDS_IMPORT",
    name: "TDS / Import",
    parentCode: "FINANCE",
    type: "UNIT",
  },
  {
    code: "FIN_GST",
    name: "GST",
    parentCode: "FINANCE",
    type: "UNIT",
  },
  {
    code: "FIN_BANKING",
    name: "Banking",
    parentCode: "FINANCE",
    type: "UNIT",
  },
  {
    code: "FIN_RECORD_KEEPING",
    name: "Record Keeping",
    parentCode: "FINANCE",
    type: "UNIT",
  },
  {
    code: "FIN_OVERDUE_COLLECTION",
    name: "Overdue Collection",
    parentCode: "FINANCE",
    type: "UNIT",
  },

  // =========================================================
  // SALES
  // =========================================================
  {
    code: "SALES",
    name: "Sales",
    parentCode: "DIR_BOARD",
    type: "DEPARTMENT",
  },

  {
    code: "SALES_OEM_NORTH_WEST",
    name: "OEM - North / West",
    parentCode: "SALES",
    type: "TEAM",
  },
  {
    code: "SALES_TRADER_NORTH_PUNJAB",
    name: "Trader North + OEM Punjab",
    parentCode: "SALES",
    type: "TEAM",
  },
  {
    code: "SALES_TRADER_WEST",
    name: "Trader West",
    parentCode: "SALES",
    type: "TEAM",
  },
  {
    code: "SALES_TRADER_ROI_TENDERS",
    name: "Trader ROI + Tenders",
    parentCode: "SALES",
    type: "TEAM",
  },
  {
    code: "SALES_EXPORT",
    name: "Export Market",
    parentCode: "SALES",
    type: "TEAM",
  },
  {
    code: "SALES_OEM_ROI",
    name: "OEM ROI",
    parentCode: "SALES",
    type: "TEAM",
  },
  {
    code: "SALES_KEY_ACCOUNTS",
    name: "Key Accounts",
    parentCode: "SALES",
    type: "TEAM",
  },

  // =========================================================
  // CRM / DO
  // =========================================================
  {
    code: "CRM",
    name: "CRM",
    parentCode: "SALES",
    type: "UNIT",
  },
  {
    code: "DELIVERY_ORDER",
    name: "Delivery Order Department",
    parentCode: "SALES",
    type: "UNIT",
  },
  {
    code: "COST_ESTIMATION",
    name: "Cost / Estimation Engineering",
    parentCode: "SALES",
    type: "UNIT",
  },

  // =========================================================
  // DIGITAL MARKETING
  // =========================================================
  {
    code: "DIGITAL_MARKETING",
    name: "Digital Marketing",
    parentCode: "DIR_BOARD",
    type: "DEPARTMENT",
  },
  {
    code: "DIGITAL_GRAPHICS",
    name: "Graphic Design",
    parentCode: "DIGITAL_MARKETING",
    type: "UNIT",
  },

  // =========================================================
  // LEGAL
  // =========================================================
  {
    code: "LEGAL",
    name: "Legal",
    parentCode: "DIR_BOARD",
    type: "DEPARTMENT",
  },

  // =========================================================
  // RAW MATERIAL PURCHASE
  // =========================================================
  {
    code: "RAW_MATERIAL_PURCHASE",
    name: "Raw Material Purchase",
    parentCode: "DIR_BOARD",
    type: "DEPARTMENT",
  },
  {
    code: "RM_PURCHASE_IMPORT",
    name: "Raw Material - Import",
    parentCode: "RAW_MATERIAL_PURCHASE",
    type: "UNIT",
  },
  {
    code: "RM_PURCHASE_DOMESTIC",
    name: "Raw Material - Domestic",
    parentCode: "RAW_MATERIAL_PURCHASE",
    type: "UNIT",
  },

  // =========================================================
  // MANUFACTURING
  // =========================================================
  {
    code: "MANUFACTURING",
    name: "Manufacturing / Toolroom",
    parentCode: "OPERATIONS",
    type: "DEPARTMENT",
  },

  {
    code: "MFG_CUTTING",
    name: "Cutting",
    parentCode: "MANUFACTURING",
    type: "UNIT",
  },
  {
    code: "MFG_PPC",
    name: "PPC",
    parentCode: "MANUFACTURING",
    type: "UNIT",
  },
  {
    code: "MFG_MAINTENANCE",
    name: "Maintenance",
    parentCode: "MANUFACTURING",
    type: "UNIT",
  },
  {
    code: "MFG_MACHINING",
    name: "Machining",
    parentCode: "MANUFACTURING",
    type: "UNIT",
  },

  // =========================================================
  // FACTORY PURCHASE
  // =========================================================
  {
    code: "FACTORY_PURCHASE",
    name: "Factory Purchase",
    parentCode: "OPERATIONS",
    type: "DEPARTMENT",
  },
  {
    code: "FACTORY_PURCHASE_REGULAR_CAPITAL",
    name: "Regular / Capital Purchase",
    parentCode: "FACTORY_PURCHASE",
    type: "UNIT",
  },
  {
    code: "FACTORY_PURCHASE_CONSUMABLES",
    name: "Consumables",
    parentCode: "FACTORY_PURCHASE",
    type: "UNIT",
  },
  {
    code: "FACTORY_PURCHASE_VENDOR_DEV",
    name: "Vendor Development / Local Job Work",
    parentCode: "FACTORY_PURCHASE",
    type: "UNIT",
  },

  // =========================================================
  // ADMIN
  // =========================================================
  {
    code: "ADMIN",
    name: "Admin",
    parentCode: "DIR_BOARD",
    type: "DEPARTMENT",
  },

  // =========================================================
  // HR
  // =========================================================
  {
    code: "HR",
    name: "Human Resources",
    parentCode: "DIR_BOARD",
    type: "DEPARTMENT",
  },
  {
    code: "HR_RECEPTION",
    name: "Reception",
    parentCode: "HR",
    type: "UNIT",
  },

  // =========================================================
  // QUALITY
  // =========================================================
  {
    code: "QUALITY_ASSURANCE",
    name: "Quality Assurance",
    parentCode: "OPERATIONS",
    type: "DEPARTMENT",
  },
  {
    code: "QA_SHOP_QUALITY",
    name: "Shop Quality",
    parentCode: "QUALITY_ASSURANCE",
    type: "UNIT",
  },
  {
    code: "QA_CUTTING_INWARD_RM",
    name: "Cutting / Inward Raw Material",
    parentCode: "QUALITY_ASSURANCE",
    type: "UNIT",
  },
  {
    code: "QA_INWARD",
    name: "Inward",
    parentCode: "QUALITY_ASSURANCE",
    type: "UNIT",
  },
  {
    code: "QA_PDI",
    name: "PDI",
    parentCode: "QUALITY_ASSURANCE",
    type: "UNIT",
  },
  {
    code: "QA_OUTSIDE_JOB_WORK",
    name: "Outside Job Work",
    parentCode: "QUALITY_ASSURANCE",
    type: "UNIT",
  },
  {
    code: "QA_DOCUMENTATION",
    name: "Documentation",
    parentCode: "QUALITY_ASSURANCE",
    type: "UNIT",
  },
  {
    code: "QA_STANDARD_ROOM",
    name: "Standard Room / Testing / Instruments",
    parentCode: "QUALITY_ASSURANCE",
    type: "UNIT",
  },
];

const ORG_UNIT_CODES = ORG_UNITS.map((unit) => unit.code);

const getOrgUnit = (code) =>
  ORG_UNITS.find((unit) => unit.code === code) || null;

const getDirectChildren = (parentCode) =>
  ORG_UNITS.filter((unit) => unit.parentCode === parentCode);

const getDescendantCodes = (parentCode) => {
  const result = [];

  const walk = (code) => {
    const children = getDirectChildren(code);

    for (const child of children) {
      result.push(child.code);
      walk(child.code);
    }
  };

  walk(parentCode);

  return result;
};

const buildOrganizationStructure = () => {
  const buildNode = (unit) => ({
    ...unit,
    children: getDirectChildren(unit.code).map(buildNode),
  });

  return ORG_UNITS.filter((unit) => unit.parentCode === null).map(buildNode);
};

module.exports = {
  ORG_UNITS,
  ORG_UNIT_CODES,
  getOrgUnit,
  getDirectChildren,
  getDescendantCodes,
  buildOrganizationStructure,
};
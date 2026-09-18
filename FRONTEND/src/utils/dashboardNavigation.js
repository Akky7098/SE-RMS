export const DASHBOARD_APPS = [
  /* =========================================================
     HOME
  ========================================================= */

  {
    code: "HOME",

    label: "Home",

    shortLabel: "Home",

    icon: "⌂",

    module: "DASHBOARD",

    allowedRoles: [
      "SUPER_ADMIN",
      "ADMIN",
      "HEAD",
      "MANAGER",
      "EMPLOYEE",
    ],

    items: [
      {
        code: "OVERVIEW",

        label: "Overview",

        icon: "⌂",

        path: "/dashboard",

        module: "DASHBOARD",

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
          "EMPLOYEE",
        ],
      },
    ],
  },

  /* =========================================================
     RECRUITMENT
  ========================================================= */

  {
    code: "RECRUITMENT",

    label: "Recruitment",

    shortLabel: "Recruit",

    icon: "R",

    module: "RECRUITMENT",

    allowedRoles: [
      "SUPER_ADMIN",
      "ADMIN",
      "HEAD",
      "MANAGER",
      "EMPLOYEE",
    ],

    items: [
      {
        code: "RECRUITMENT_OVERVIEW",

        label: "Overview",

        icon: "◫",

        path:
          "/dashboard?app=recruitment&page=overview",

        module: "RECRUITMENT",

        section: "",

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
          "EMPLOYEE",
        ],
      },

      {
        code: "MANPOWER_REQUESTS",

        label: "Manpower Requests",

        icon: "M",

        path:
          "/dashboard?app=recruitment&page=manpower",

        module: "MANPOWER",

        section: "HIRING",

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
          "EMPLOYEE",
        ],
      },

      {
        code: "HIRING_QUEUE",

        label: "Hiring Queue",

        icon: "Q",

        path:
          "/dashboard?app=recruitment&page=hiring",

        module: "RECRUITMENT",

        section: "HIRING",

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
          "EMPLOYEE",
        ],
      },

      {
        code: "MY_HIRING",

        label: "My Hiring",

        icon: "◎",

        path:
          "/dashboard?app=recruitment&page=my-hiring",

        module: "RECRUITMENT",

        section: "HIRING",

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
          "EMPLOYEE",
        ],
      },

      {
        code: "CANDIDATES",

        label: "Candidates",

        icon: "C",

        path:
          "/dashboard?app=recruitment&page=candidates",

        module: "RECRUITMENT",

        section: "CANDIDATES",

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
          "EMPLOYEE",
        ],
      },

      {
        code: "FOLLOW_UPS",

        label: "Follow-ups",

        icon: "↻",

        path:
          "/dashboard?app=recruitment&page=follow-ups",

        module: "RECRUITMENT",

        section: "CANDIDATES",

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
          "EMPLOYEE",
        ],
      },

      {
        code: "INTERVIEWS",

        label: "Interviews",

        icon: "I",

        path:
          "/dashboard?app=recruitment&page=interviews",

        module: "RECRUITMENT",

        section: "INTERVIEWS",

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
          "EMPLOYEE",
        ],
      },

      {
        code: "EVALUATIONS",

        label: "Evaluations",

        icon: "✓",

        path:
          "/dashboard?app=recruitment&page=evaluations",

        module: "RECRUITMENT",

        section: "INTERVIEWS",

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
          "EMPLOYEE",
        ],
      },

      {
        code: "SELECTED_CANDIDATES",

        label: "Selected Candidates",

        icon: "S",

        path:
          "/dashboard?app=recruitment&page=selections",

        module: "RECRUITMENT",

        section: "SELECTION",

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
          "EMPLOYEE",
        ],
      },
    ],
  },

  /* =========================================================
     PEOPLE

     All main People pages remain inside DashboardWeb.

     Overview
       ↓
     Employees
       ↓
     Onboarding

     Employee detail/form/onboarding detail may still use
     existing dedicated routes until those pages are moved
     inside the shell later.
  ========================================================= */

  {
    code: "PEOPLE",

    label: "People",

    shortLabel: "People",

    icon: "P",

    module: "EMPLOYEE",

    allowedRoles: [
      "SUPER_ADMIN",
      "ADMIN",
      "HEAD",
      "MANAGER",
      "EMPLOYEE",
    ],

    items: [
      /* =====================================================
         OVERVIEW
      ===================================================== */

      {
        code: "PEOPLE_OVERVIEW",

        label: "Overview",

        icon: "◫",

        path:
          "/dashboard?app=people&page=overview",

        module: "EMPLOYEE",

        section: "",

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
          "EMPLOYEE",
        ],
      },

      /* =====================================================
         WORKFORCE
      ===================================================== */

      {
        code: "EMPLOYEES",

        label: "Employees",

        icon: "E",

        path:
          "/dashboard?app=people&page=employees",

        module: "EMPLOYEE",

        section: "WORKFORCE",

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
        ],
      },

      {
        code: "ONBOARDING",

        label: "Onboarding",

        icon: "O",

        path:
          "/dashboard?app=people&page=onboarding",

        module: "EMPLOYEE",

        section: "WORKFORCE",

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
        ],
      },

      /* =====================================================
         WORK
      ===================================================== */

   {
  code:
    "ATTENDANCE",

  label:
    "Attendance",

  employeeLabel:
    "My Attendance",

  icon:
    "◷",

  path:
    "/dashboard?app=people&page=attendance",

  module:
    "ATTENDANCE",

  section:
    "WORK",

  comingSoon:
    false,

  allowedRoles: [
    "SUPER_ADMIN",
    "ADMIN",
    "HEAD",
    "MANAGER",
    "EMPLOYEE",
  ],
},

{
  code:
    "LEAVE_MANAGEMENT",

  label:
    "Leave Management",

  employeeLabel:
    "My Leave",

  icon:
    "◉",

  path:
    "/dashboard?app=people&page=leave",

  module:
    "LEAVE",

  section:
    "WORK",

  comingSoon:
    false,

  allowedRoles: [
    "SUPER_ADMIN",
    "ADMIN",
    "HEAD",
    "MANAGER",
    "EMPLOYEE",
  ],
},

{
  code:
    "SHIFT_MANAGEMENT",

  label:
    "Shift Management",

  employeeLabel:
    "My Shift",

  icon:
    "⇄",

  path:
    "/dashboard?app=people&page=shifts",

  module:
    "ATTENDANCE",

  section:
    "WORK",

  comingSoon:
    false,

  allowedRoles: [
    "SUPER_ADMIN",
    "ADMIN",
    "HEAD",
    "MANAGER",
    "EMPLOYEE",
  ],
},

{
  code:
    "TIMESHEET",

        label:
          "Timesheet",

        employeeLabel:
          "My Timesheet",

        icon: "◴",

        path:
          "/timesheet",

        module:
          "TIMESHEET",

        section:
          "WORK",

        comingSoon:
          false,

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
          "EMPLOYEE",
        ],
      },

      /* =====================================================
         PERSONAL
      ===================================================== */

      {
        code:
          "MY_PROFILE",

        label:
          "My Profile",

        icon:
          "◎",

        path:
          "/profile",

        module:
          "EMPLOYEE",

        section:
          "PERSONAL",

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
          "EMPLOYEE",
        ],
      },
    ],
  },

  /* =========================================================
     SALES
  ========================================================= */

  {
    code:
      "SALES",

    label:
      "Sales",

    shortLabel:
      "Sales",

    icon:
      "S",

    module:
      "SALES",

    allowedRoles: [
      "SUPER_ADMIN",
      "ADMIN",
      "HEAD",
      "MANAGER",
    ],

    items: [
      {
        code:
          "SALES_OVERVIEW",

        label:
          "Overview",

        icon:
          "◫",

        path:
          "/sales",

        module:
          "SALES",

        comingSoon:
          true,

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
        ],
      },

      {
        code:
          "ENQUIRY",

        label:
          "Enquiries",

        icon:
          "?",

        path:
          "/enquiries",

        module:
          "ENQUIRY",

        comingSoon:
          true,

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
        ],
      },

      {
        code:
          "QUOTATION",

        label:
          "Quotations",

        icon:
          "≡",

        path:
          "/quotations",

        module:
          "QUOTATION",

        comingSoon:
          true,

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
        ],
      },

      {
        code:
          "SALES_ORDER",

        label:
          "Sales Orders",

        icon:
          "□",

        path:
          "/orders",

        module:
          "ORDER",

        comingSoon:
          true,

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
        ],
      },

      {
        code:
          "CRM",

        label:
          "CRM",

        icon:
          "◎",

        path:
          "/crm",

        module:
          "CRM",

        comingSoon:
          true,

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
        ],
      },
    ],
  },

  /* =========================================================
     OPERATIONS
  ========================================================= */

  {
    code:
      "OPERATIONS",

    label:
      "Operations",

    shortLabel:
      "Ops",

    icon:
      "O",

    module:
      "MANUFACTURING",

    allowedRoles: [
      "SUPER_ADMIN",
      "ADMIN",
      "HEAD",
      "MANAGER",
    ],

    items: [
      {
        code:
          "OPERATIONS_OVERVIEW",

        label:
          "Overview",

        icon:
          "◫",

        path:
          "/operations",

        module:
          "MANUFACTURING",

        comingSoon:
          true,

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
        ],
      },

      {
        code:
          "MANUFACTURING",

        label:
          "Manufacturing",

        icon:
          "⚙",

        path:
          "/manufacturing",

        module:
          "MANUFACTURING",

        comingSoon:
          true,

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
        ],
      },

      {
        code:
          "QUALITY",

        label:
          "Quality",

        icon:
          "✓",

        path:
          "/quality",

        module:
          "QUALITY",

        comingSoon:
          true,

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
        ],
      },

      {
        code:
          "INVENTORY",

        label:
          "Inventory",

        icon:
          "▦",

        path:
          "/inventory",

        module:
          "INVENTORY",

        comingSoon:
          true,

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
        ],
      },

      {
        code:
          "DISPATCH",

        label:
          "Dispatch",

        icon:
          "→",

        path:
          "/dispatch",

        module:
          "DISPATCH",

        comingSoon:
          true,

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
        ],
      },
    ],
  },

  /* =========================================================
     FINANCE
  ========================================================= */

  {
    code:
      "FINANCE",

    label:
      "Finance",

    shortLabel:
      "Finance",

    icon:
      "F",

    module:
      "FINANCE",

    allowedRoles: [
      "SUPER_ADMIN",
      "ADMIN",
      "HEAD",
      "MANAGER",
    ],

    items: [
      {
        code:
          "FINANCE_OVERVIEW",

        label:
          "Overview",

        icon:
          "◫",

        path:
          "/finance",

        module:
          "FINANCE",

        comingSoon:
          true,

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
        ],
      },

      {
        code:
          "RECEIVABLE",

        label:
          "Receivables",

        icon:
          "₹",

        path:
          "/receivables",

        module:
          "FINANCE",

        comingSoon:
          true,

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
        ],
      },

      {
        code:
          "REPORTS",

        label:
          "Reports",

        icon:
          "▥",

        path:
          "/reports",

        module:
          "REPORT",

        comingSoon:
          true,

        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "HEAD",
          "MANAGER",
        ],
      },
    ],
  },
];

/* =========================================================
   ROLE HELPERS
========================================================= */

export const normalizeDashboardRole =
  (
    role
  ) => {
    return String(
      role ||
      "EMPLOYEE"
    )
      .trim()
      .toUpperCase();
  };

/* =========================================================
   ITEM VISIBILITY
========================================================= */

export const canRoleSeeDashboardItem =
  (
    item,
    role
  ) => {
    const normalizedRole =
      normalizeDashboardRole(
        role
      );

    if (
      !Array.isArray(
        item?.allowedRoles
      ) ||
      item.allowedRoles
        .length === 0
    ) {
      return true;
    }

    return item.allowedRoles.includes(
      normalizedRole
    );
  };

/* =========================================================
   ROLE-AWARE LABEL
========================================================= */

export const getDashboardItemLabel =
  (
    item,
    role
  ) => {
    const normalizedRole =
      normalizeDashboardRole(
        role
      );

    if (
      normalizedRole ===
        "EMPLOYEE" &&
      item?.employeeLabel
    ) {
      return item.employeeLabel;
    }

    return (
      item?.label ||
      ""
    );
  };

/* =========================================================
   FILTER COMPLETE DASHBOARD NAVIGATION
========================================================= */

export const getDashboardAppsForRole =
  (
    role
  ) => {
    const normalizedRole =
      normalizeDashboardRole(
        role
      );

    return DASHBOARD_APPS
      .filter(
        (
          app
        ) =>
          canRoleSeeDashboardItem(
            app,
            normalizedRole
          )
      )
      .map(
        (
          app
        ) => {
          const items =
            (
              app.items ||
              []
            ).filter(
              (
                item
              ) =>
                canRoleSeeDashboardItem(
                  item,
                  normalizedRole
                )
            );

          return {
            ...app,

            items,
          };
        }
      )
      .filter(
        (
          app
        ) =>
          app.items.length >
          0
      );
  };
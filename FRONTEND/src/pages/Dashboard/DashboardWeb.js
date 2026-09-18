import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../../auth/AuthContext";

import {
  getEmployeeMeta,
  getEmployees,
} from "../../services/employeeService";

import {
  getDashboardAppsForRole,
  getDashboardItemLabel,
} from "../../utils/dashboardNavigation";

import RecruitmentWorkspace from "../Recruitment/RecruitmentWorkspace";

import "../Recruitment/Recruitment.css";

/* =========================================================
   PEOPLE
========================================================= */

import PeopleOverview from "../People/PeopleOverview";

import EmployeeListPage from "../People/Employees/EmployeeListPage";

import OnboardingListPage from "../People/Onboarding/OnboardingListPage";

import AttendancePage from "../People/Attendance/AttendancePage";

import LeavePage from "../People/Leave/LeavePage";


import ShiftPage from "../People/Attendance/Shift/ShiftPage";

import "../People/People.css";

import "../People/Employees/Employees.css";

import "../People/Onboarding/Onboarding.css";

import "./DashboardWeb.css";

/* =========================================================
   BASIC HELPERS
========================================================= */

const normalizeRole = (
  role
) =>
  String(
    role ||
      "EMPLOYEE"
  )
    .trim()
    .toUpperCase();

const normalizeValue = (
  value
) =>
  String(
    value || ""
  )
    .trim()
    .toUpperCase();

/* =========================================================
   HR DEPARTMENT HELPER
========================================================= */

const isHrDepartment = (
  department
) => {
  const code =
    normalizeValue(
      department?.code ||
        department?.department?.code
    );

  const name =
    normalizeValue(
      department?.name ||
        department?.department?.name
    );

  return (
    code === "HR" ||
    name === "HR" ||
    name ===
      "HUMAN RESOURCES"
  );
};

/* =========================================================
   DEPARTMENT MEMBERSHIP NORMALIZER
========================================================= */

const getDepartmentMemberships =
  (
    access,
    user
  ) => {
    const candidates = [
      access?.departmentMemberships,
      access?.memberships,
      access?.departments,
      user?.departmentMemberships,
      user?.memberships,
    ];

    const memberships =
      candidates.find(
        Array.isArray
      ) || [];

    const primary =
      access?.primaryDepartment ||
      user?.primaryDepartment ||
      null;

    if (
      primary &&
      typeof primary ===
        "object"
    ) {
      return [
        ...memberships,
        primary,
      ];
    }

    return memberships;
  };

/* =========================================================
   HR PROFILE
========================================================= */

const getHrAccessProfile =
  ({
    user,
    access,
  }) => {
    const systemRole =
      normalizeRole(
        access?.systemRole ||
          user?.systemRole ||
          user?.role
      );

    const globalSuperAdmin =
      Boolean(
        access?.globalSuperAdmin ||
          access?.superAdmin ||
          systemRole ===
            "SUPER_ADMIN"
      );

    if (
      globalSuperAdmin
    ) {
      return {
        globalSuperAdmin:
          true,

        hrMember:
          true,

        hrManager:
          true,

        departmentRole:
          "GLOBAL_SUPER_ADMIN",
      };
    }

    const memberships =
      getDepartmentMemberships(
        access,
        user
      );

    const hrMembership =
      memberships.find(
        (
          membership
        ) =>
          isHrDepartment(
            membership
          )
      );

    const primaryDepartment =
      access?.primaryDepartment ||
      user?.primaryDepartment ||
      null;

    const primaryIsHr =
      isHrDepartment(
        primaryDepartment
      );

    const departmentRole =
      normalizeValue(
        hrMembership?.role ||
          hrMembership?.departmentRole ||
          primaryDepartment
            ?.role ||
          primaryDepartment
            ?.departmentRole
      );

    const hrMember =
      Boolean(
        hrMembership ||
          primaryIsHr
      );

    const hrManager =
      hrMember &&
      [
        "DEPARTMENT_SUPER_ADMIN",
        "HOD",
        "ADMIN",
      ].includes(
        departmentRole
      );

    return {
      globalSuperAdmin:
        false,

      hrMember,

      hrManager,

      departmentRole,
    };
  };

/* =========================================================
   ITEM PAGE HELPER
========================================================= */

const getRecruitmentItemPage =
  (
    item
  ) => {
    if (
      !item?.path
    ) {
      return "";
    }

    try {
      const [
        ,
        search = "",
      ] =
        item.path.split(
          "?"
        );

      const params =
        new URLSearchParams(
          search
        );

      return String(
        params.get(
          "page"
        ) || ""
      )
        .trim()
        .toLowerCase();
    } catch (
      error
    ) {
      return "";
    }
  };

/* =========================================================
   RECRUITMENT PAGE META
========================================================= */

const RECRUITMENT_PAGE_META = {
  overview: {
    eyebrow:
      "TALENT ACQUISITION",

    title:
      "Recruitment Overview",

    description:
      "Track manpower, hiring ownership, candidates, follow-ups, interviews, evaluations and selection from one connected workflow.",
  },

  manpower: {
    eyebrow:
      "HIRING",

    title:
      "Manpower Requests",

    description:
      "Raise, review and track manpower requirements through the approval workflow.",
  },

  hiring: {
    eyebrow:
      "HIRING",

    title:
      "Hiring Queue",

    description:
      "Manage approved requirements, assign HR hiring owners and start recruitment.",
  },

  "my-hiring": {
    eyebrow:
      "HIRING",

    title:
      "My Hiring",

    description:
      "Your assigned hiring requirements and recruitment workload.",
  },

  "hiring-workspace": {
    eyebrow:
      "HIRING",

    title:
      "Hiring Workspace",

    description:
      "Manage candidates, follow-ups and interviews for one hiring requirement.",
  },

  candidates: {
    eyebrow:
      "CANDIDATES",

    title:
      "Candidates",

    description:
      "Candidate sourcing, CV review, screening and recruitment progress.",
  },

  candidate: {
    eyebrow:
      "CANDIDATES",

    title:
      "Candidate",

    description:
      "Candidate profile, screening, interviews and recruitment activity.",
  },

  "follow-ups": {
    eyebrow:
      "CANDIDATES",

    title:
      "Follow-ups",

    description:
      "Calls and candidate follow-ups that require action.",
  },

  interviews: {
    eyebrow:
      "INTERVIEWS",

    title:
      "Interviews",

    description:
      "Schedule and manage upcoming, completed and rescheduled interviews.",
  },

  interview: {
    eyebrow:
      "INTERVIEWS",

    title:
      "Interview",

    description:
      "Interview details, candidate information and evaluation.",
  },

  evaluations: {
    eyebrow:
      "INTERVIEWS",

    title:
      "Evaluations",

    description:
      "Review completed interview evaluations, ratings, recommendations and final decisions.",
  },

  evaluation: {
    eyebrow:
      "INTERVIEWS",

    title:
      "Evaluation Detail",

    description:
      "Review the complete interview scorecard, evaluator feedback and candidate decision.",
  },

  selections: {
    eyebrow:
      "POST-SELECTION",

    title:
      "Selected Candidates",

    description:
      "Manage selected candidates, LOI, pre-joining documents, offers and joining progress.",
  },

  selection: {
    eyebrow:
      "POST-SELECTION",

    title:
      "Selection Workspace",

    description:
      "Manage the selected candidate's LOI, documents and post-selection workflow.",
  },
};

/* =========================================================
   PEOPLE PAGE META
========================================================= */

const PEOPLE_PAGE_META = {
  overview: {
    title:
      "People Overview",
  },

  employees: {
    title:
      "Employees",
  },

  onboarding: {
    title:
      "Onboarding",
  },

  attendance: {
    title:
      "Attendance",
  },

    leave: {
    title:
      "Leave Management",
  },

  shifts: {
    title:
      "Shift Management",
  },
};

/* =========================================================
   COMPONENT
========================================================= */

const DashboardWeb =
  () => {
    const navigate =
      useNavigate();

    const location =
      useLocation();

    const {
      user,
      access,
      logout,
      hasModule,
      hasPermission,
    } =
      useAuth();

    /* =====================================================
       USER ROLE
    ===================================================== */

    const role =
      useMemo(
        () =>
          normalizeRole(
            user?.role
          ),
        [
          user?.role,
        ]
      );

    const effectiveSystemRole =
      useMemo(
        () =>
          normalizeRole(
            access?.systemRole ||
              user?.systemRole ||
              user?.role
          ),
        [
          access?.systemRole,
          user?.systemRole,
          user?.role,
        ]
      );

    const isEmployee =
      role ===
      "EMPLOYEE";

    const isManager =
      role ===
        "MANAGER" ||
      role ===
        "HEAD";

    const isAdmin =
      effectiveSystemRole ===
        "SUPER_ADMIN" ||
      role ===
        "ADMIN" ||
      role ===
        "SUPER_ADMIN";

    const isManagement =
      isAdmin ||
      isManager;

    /* =====================================================
       HR ACCESS
    ===================================================== */

    const hrAccess =
      useMemo(
        () =>
          getHrAccessProfile({
            user,
            access,
          }),
        [
          user,
          access,
        ]
      );

    /* =====================================================
       STATE
    ===================================================== */

    const [
      activeApp,
      setActiveApp,
    ] =
      useState(
        "HOME"
      );

    const [
      employeeCount,
      setEmployeeCount,
    ] =
      useState(
        0
      );

    const [
      orgUnitCount,
      setOrgUnitCount,
    ] =
      useState(
        0
      );

    const [
      loadingStats,
      setLoadingStats,
    ] =
      useState(
        false
      );

    const [
      profileOpen,
      setProfileOpen,
    ] =
      useState(
        false
      );

    /* =====================================================
       URL PARAMS
    ===================================================== */

    const searchParams =
      useMemo(
        () =>
          new URLSearchParams(
            location.search
          ),
        [
          location.search,
        ]
      );

    const currentQueryApp =
      String(
        searchParams.get(
          "app"
        ) || ""
      )
        .trim()
        .toUpperCase();

    const currentQueryPage =
      String(
        searchParams.get(
          "page"
        ) ||
          "overview"
      )
        .trim()
        .toLowerCase();

    /* =====================================================
       APPLICATIONS
    ===================================================== */

    const roleApps =
      useMemo(
        () =>
          getDashboardAppsForRole(
            role
          ),
        [
          role,
        ]
      );

    const availableApps =
      useMemo(
        () =>
          roleApps.filter(
            (
              app
            ) => {
              if (
                app.code ===
                "HOME"
              ) {
                return true;
              }

              if (
                app.code ===
                "PEOPLE"
              ) {
                return true;
              }

              if (
                app.code ===
                "RECRUITMENT"
              ) {
                return (
                  hrAccess.globalSuperAdmin ||
                  hrAccess.hrMember ||
                  hasModule(
                    "RECRUITMENT"
                  ) ||
                  hasModule(
                    "MANPOWER"
                  )
                );
              }

              if (
                access?.fullAccess
              ) {
                return true;
              }

              return hasModule(
                app.module
              );
            }
          ),
        [
          roleApps,
          access?.fullAccess,
          hasModule,
          hrAccess,
        ]
      );

    /* =====================================================
       CURRENT APP
    ===================================================== */

    const currentApp =
      useMemo(
        () =>
          availableApps.find(
            (
              app
            ) =>
              app.code ===
              activeApp
          ) ||
          availableApps[0] ||
          null,
        [
          availableApps,
          activeApp,
        ]
      );

    const isRecruitmentApp =
      currentApp?.code ===
      "RECRUITMENT";

    const isPeopleApp =
      currentApp?.code ===
      "PEOPLE";

    /* =====================================================
       CURRENT NAVIGATION ITEMS
    ===================================================== */

    const currentItems =
      useMemo(
        () => {
          if (
            !currentApp
          ) {
            return [];
          }

          const items =
            currentApp.items ||
            [];

          return items.filter(
            (
              item
            ) => {
              /* ===========================================
                 PEOPLE / EMPLOYEE
              ============================================ */

              if (
                currentApp.code ===
                  "PEOPLE" &&
                role ===
                  "EMPLOYEE"
              ) {
                return [
  "PEOPLE_OVERVIEW",
  "ATTENDANCE",
  "LEAVE_MANAGEMENT",
  "SHIFT_MANAGEMENT",
  "TIMESHEET",
  "MY_PROFILE",
].includes(
  item.code
);
              }

              /* ===========================================
                 PEOPLE / MANAGER
              ============================================ */

              if (
                currentApp.code ===
                  "PEOPLE" &&
                (
                  role ===
                    "HEAD" ||
                  role ===
                    "MANAGER"
                )
              ) {
                return (
                  item.code !==
                  "ACCESS"
                );
              }

              /* ===========================================
                 RECRUITMENT
              ============================================ */

              if (
                currentApp.code ===
                "RECRUITMENT"
              ) {
                const page =
                  getRecruitmentItemPage(
                    item
                  );

                if (
                  page ===
                    "overview" ||
                  item.code ===
                    "RECRUITMENT_OVERVIEW"
                ) {
                  return (
                    hrAccess
                      .globalSuperAdmin ||
                    hrAccess
                      .hrMember ||
                    hasModule(
                      "RECRUITMENT"
                    ) ||
                    hasModule(
                      "MANPOWER"
                    )
                  );
                }

                if (
                  page ===
                    "manpower"
                ) {
                  return (
                    hrAccess
                      .globalSuperAdmin ||
                    hasModule(
                      "MANPOWER"
                    ) ||
                    hasModule(
                      "RECRUITMENT"
                    )
                  );
                }

                if (
                  page ===
                    "hiring"
                ) {
                  return (
                    hrAccess
                      .globalSuperAdmin ||
                    hrAccess
                      .hrManager
                  );
                }

                if (
                  page ===
                    "my-hiring"
                ) {
                  return (
                    hrAccess
                      .globalSuperAdmin ||
                    hrAccess
                      .hrMember
                  );
                }

                if (
                  [
                    "hiring-workspace",
                    "candidates",
                    "candidate",
                    "follow-ups",
                    "interviews",
                    "interview",
                    "evaluations",
                    "evaluation",
                    "selections",
                    "selection",
                  ].includes(
                    page
                  )
                ) {
                  return (
                    hrAccess
                      .globalSuperAdmin ||
                    hrAccess
                      .hrMember
                  );
                }

                return (
                  hrAccess
                    .globalSuperAdmin ||
                  hasModule(
                    "RECRUITMENT"
                  )
                );
              }

              /* ===========================================
                 OTHER APPS
              ============================================ */

              if (
                effectiveSystemRole ===
                  "SUPER_ADMIN" ||
                role ===
                  "SUPER_ADMIN" ||
                role ===
                  "ADMIN"
              ) {
                return true;
              }

              if (
                access?.fullAccess
              ) {
                return true;
              }

              return hasModule(
                item.module
              );
            }
          );
        },
        [
          currentApp,
          role,
          effectiveSystemRole,
          access?.fullAccess,
          hasModule,
          hrAccess,
        ]
      );

    /* =====================================================
       URL -> ACTIVE APP
    ===================================================== */

    useEffect(
      () => {
        if (
          currentQueryApp &&
          availableApps.some(
            (
              app
            ) =>
              app.code ===
              currentQueryApp
          )
        ) {
          setActiveApp(
            currentQueryApp
          );

          return;
        }

        if (
          !availableApps.some(
            (
              app
            ) =>
              app.code ===
              activeApp
          )
        ) {
          setActiveApp(
            availableApps[0]
              ?.code ||
              "HOME"
          );
        }
      },
      [
        currentQueryApp,
        availableApps,
        activeApp,
      ]
    );

    /* =====================================================
       EMPLOYEE DEFAULT
    ===================================================== */

    useEffect(
      () => {
        if (
          isEmployee &&
          location.pathname ===
            "/dashboard" &&
          !location.search
        ) {
          const canUsePeople =
            availableApps.some(
              (
                app
              ) =>
                app.code ===
                "PEOPLE"
            );

          if (
            canUsePeople
          ) {
            setActiveApp(
              "PEOPLE"
            );
          }
        }
      },
      [
        isEmployee,
        location.pathname,
        location.search,
        availableApps,
      ]
    );

    /* =====================================================
       MANAGEMENT STATS
    ===================================================== */

    useEffect(
      () => {
        if (
          !isManagement ||
          isRecruitmentApp
        ) {
          if (
            !isManagement
          ) {
            setEmployeeCount(
              0
            );

            setOrgUnitCount(
              0
            );
          }

          setLoadingStats(
            false
          );

          return;
        }

        let active =
          true;

        const loadStats =
          async () => {
            try {
              setLoadingStats(
                true
              );

              const [
                employeeResponse,
                metaResponse,
              ] =
                await Promise.all([
                  getEmployees({
                    page: 1,
                    limit: 1,
                    status:
                      "ACTIVE",
                  }),

                  getEmployeeMeta(),
                ]);

              if (
                !active
              ) {
                return;
              }

              setEmployeeCount(
                Number(
                  employeeResponse
                    ?.pagination
                    ?.total ??
                  employeeResponse
                    ?.records
                    ?.length ??
                  0
                )
              );

              const organizationUnits =
                metaResponse
                  ?.organizationUnits ||
                metaResponse
                  ?.orgUnits ||
                [];

              setOrgUnitCount(
                Array.isArray(
                  organizationUnits
                )
                  ? organizationUnits.length
                  : 0
              );
            } catch (
              error
            ) {
              console.error(
                "Dashboard stats failed:",
                error
              );
            } finally {
              if (
                active
              ) {
                setLoadingStats(
                  false
                );
              }
            }
          };

        loadStats();

        return () => {
          active =
            false;
        };
      },
      [
        isManagement,
        isRecruitmentApp,
      ]
    );

    /* =====================================================
       USER
    ===================================================== */

    const userInitial =
      (
        user?.displayName ||
        user?.email ||
        "U"
      )
        .trim()
        .charAt(
          0
        )
        .toUpperCase();

    const roleLabel =
      isRecruitmentApp &&
      hrAccess
        .departmentRole
        ? hrAccess
            .departmentRole
            .replaceAll(
              "_",
              " "
            )
        : effectiveSystemRole
            .replaceAll(
              "_",
              " "
            );

    const greeting =
      useMemo(
        () => {
          const hour =
            new Date()
              .getHours();

          if (
            hour < 12
          ) {
            return "Good morning";
          }

          if (
            hour < 17
          ) {
            return "Good afternoon";
          }

          return "Good evening";
        },
        []
      );

    /* =====================================================
       APP DESCRIPTION
    ===================================================== */

    const currentAppDescription =
      useMemo(
        () => {
          if (
            currentApp?.code ===
            "RECRUITMENT"
          ) {
            if (
              hrAccess
                .hrManager
            ) {
              return "Talent acquisition & hiring management";
            }

            if (
              hrAccess
                .hrMember
            ) {
              return "My recruitment & hiring";
            }

            return "Talent acquisition & hiring";
          }

          if (
            currentApp?.code ===
            "PEOPLE"
          ) {
            if (
              isEmployee
            ) {
              return "My work, attendance & employment";
            }

            if (
              isManager
            ) {
              return "Team, employees & workforce";
            }

            return "Employees, onboarding & organisation";
          }

          if (
            currentApp?.code ===
            "SALES"
          ) {
            return "Customer & revenue operations";
          }

          if (
            currentApp?.code ===
            "OPERATIONS"
          ) {
            return "Manufacturing & supply operations";
          }

          if (
            currentApp?.code ===
            "FINANCE"
          ) {
            return "Finance & reporting";
          }

          return "Enterprise overview";
        },
        [
          currentApp,
          isEmployee,
          isManager,
          hrAccess,
        ]
      );

    const recruitmentPage =
      RECRUITMENT_PAGE_META[
        currentQueryPage
      ] ||
      RECRUITMENT_PAGE_META
        .overview;

    const peoplePage =
      PEOPLE_PAGE_META[
        currentQueryPage
      ] ||
      PEOPLE_PAGE_META
        .overview;

    /* =====================================================
       NAVIGATION
    ===================================================== */

    const handleAppClick =
      (
        app
      ) => {
        if (
          app.code ===
          "HOME"
        ) {
          navigate(
            "/dashboard"
          );

          return;
        }

        if (
          app.code ===
          "RECRUITMENT"
        ) {
          navigate(
            "/dashboard?app=recruitment&page=overview"
          );

          return;
        }

        if (
          app.code ===
          "PEOPLE"
        ) {
          navigate(
            "/dashboard?app=people&page=overview"
          );

          return;
        }

        const overviewItem =
          app.items?.[0];

        if (
          overviewItem?.path &&
          !overviewItem
            ?.comingSoon
        ) {
          navigate(
            overviewItem.path
          );

          return;
        }

        setActiveApp(
          app.code
        );
      };

    const handleModuleClick =
      (
        item
      ) => {
        if (
          item?.comingSoon ||
          !item?.path
        ) {
          return;
        }

        /*
         * Compatibility:
         * Until dashboardNavigation.js is updated,
         * convert old People URLs into dashboard URLs.
         */

        if (
          item.code ===
          "PEOPLE_OVERVIEW"
        ) {
          navigate(
            "/dashboard?app=people&page=overview"
          );

          return;
        }

        if (
          item.code ===
          "EMPLOYEES"
        ) {
          navigate(
            "/dashboard?app=people&page=employees"
          );

          return;
        }

        if (
          item.code ===
          "ONBOARDING"
        ) {
          navigate(
            "/dashboard?app=people&page=onboarding"
          );

          return;
        }

        if (
          item.code ===
          "ATTENDANCE"
        ) {
          navigate(
            "/dashboard?app=people&page=attendance"
          );

          return;
        }

        if (
  item.code ===
  "LEAVE_MANAGEMENT"
) {
  navigate(
    "/dashboard?app=people&page=leave"
  );

  return;
}

        if (
          item.code ===
          "SHIFT_MANAGEMENT"
        ) {
          navigate(
            "/dashboard?app=people&page=shifts"
          );

          return;
        }

        navigate(
          item.path
        );
      };

    /* =====================================================
       ACTIONS
    ===================================================== */

    const handleAttendance =
      () =>
        navigate(
          "/dashboard?app=people&page=attendance"
        );

    const handleShift =
      () =>
        navigate(
          "/dashboard?app=people&page=shifts"
        );

    const handleTimesheet =
      () =>
        navigate(
          "/timesheet"
        );

    const handleProfile =
      () =>
        navigate(
          "/profile"
        );

    const handlePeopleOverview =
      () =>
        navigate(
          "/dashboard?app=people&page=overview"
        );

    const handleEmployeeDirectory =
      () =>
        navigate(
          "/dashboard?app=people&page=employees"
        );

    const handleOnboarding =
      () =>
        navigate(
          "/dashboard?app=people&page=onboarding"
        );

    const handleAddEmployee =
      () => {
        if (
          !isManagement
        ) {
          return;
        }

        /*
         * Keep existing form route for now.
         */
        navigate(
          "/people/employees/new"
        );
      };

    const handleLogout =
      async () => {
        await logout();

        navigate(
          "/login",
          {
            replace:
              true,
          }
        );
      };

    /* =====================================================
       ACTIVE ITEM
    ===================================================== */

    const getSidebarComparablePage =
      (
        page
      ) => {
        if (
          page ===
          "evaluation"
        ) {
          return "evaluations";
        }

        if (
          page ===
          "selection"
        ) {
          return "selections";
        }

        if (
          page ===
          "interview"
        ) {
          return "interviews";
        }

        if (
          page ===
          "candidate"
        ) {
          return "candidates";
        }

        if (
          page ===
          "hiring-workspace"
        ) {
          return "my-hiring";
        }

        return page;
      };

    const isModuleItemActive =
      (
        item
      ) => {
        if (
          !item?.path
        ) {
          return false;
        }

        /*
         * PEOPLE
         *
         * Support both new dashboard paths and
         * existing item codes.
         */

        if (
          isPeopleApp
        ) {
          if (
            item.code ===
            "PEOPLE_OVERVIEW"
          ) {
            return (
              currentQueryPage ===
              "overview"
            );
          }

          if (
            item.code ===
            "EMPLOYEES"
          ) {
            return (
              currentQueryPage ===
              "employees"
            );
          }

          if (
            item.code ===
            "ONBOARDING"
          ) {
            return (
              currentQueryPage ===
              "onboarding"
            );
          }

          if (
            item.code ===
            "ATTENDANCE"
          ) {
            return (
              currentQueryPage ===
              "attendance"
            );
          }

          if (
  item.code ===
  "LEAVE_MANAGEMENT"
) {
  return (
    currentQueryPage ===
    "leave"
  );
}

          if (
            item.code ===
            "SHIFT_MANAGEMENT"
          ) {
            return (
              currentQueryPage ===
              "shifts"
            );
          }
        }

        const [
          targetPathname,
          targetSearchString,
        ] =
          item.path.split(
            "?"
          );

        if (
          location.pathname !==
          targetPathname
        ) {
          return false;
        }

        if (
          !targetSearchString
        ) {
          return (
            location.pathname ===
              item.path &&
            !location.search
          );
        }

        const targetParams =
          new URLSearchParams(
            targetSearchString
          );

        const targetApp =
          String(
            targetParams.get(
              "app"
            ) || ""
          )
            .trim()
            .toLowerCase();

        const targetPage =
          String(
            targetParams.get(
              "page"
            ) || ""
          )
            .trim()
            .toLowerCase();

        const currentAppParam =
          String(
            searchParams.get(
              "app"
            ) || ""
          )
            .trim()
            .toLowerCase();

        const currentPageParam =
          String(
            searchParams.get(
              "page"
            ) ||
              "overview"
          )
            .trim()
            .toLowerCase();

        if (
          targetApp &&
          targetApp !==
            currentAppParam
        ) {
          return false;
        }

        if (
          targetPage
        ) {
          const comparableCurrentPage =
            getSidebarComparablePage(
              currentPageParam
            );

          return (
            targetPage ===
            comparableCurrentPage
          );
        }

        return true;
      };

    /* =====================================================
       PEOPLE FULL MODULE PAGE

       Attendance and Shift render inside the People
       dashboard shell for all permitted users.
    ===================================================== */

    const isPeopleFullModulePage =
  isPeopleApp &&
  [
    "attendance",
    "leave",
    "shifts",
  ].includes(
    currentQueryPage
  );

    /* =====================================================
       PEOPLE WORKSPACE RENDERER
    ===================================================== */

    const renderPeopleWorkspace =
      () => {
        switch (
          currentQueryPage
        ) {
          case "employees":
            return (
              <EmployeeListPage />
            );

          case "onboarding":
            return (
              <OnboardingListPage />
            );

          case "attendance":
            return (
              <AttendancePage />
            );

            case "leave":
  return (
    <LeavePage />
  );
  
          case "shifts":
            return (
              <ShiftPage />
            );

          case "overview":
          default:
            return (
              <PeopleOverview />
            );
        }
      };

    /* =====================================================
       RENDER
    ===================================================== */

    return (
      <main className="se-web-dashboard">

        {/* =================================================
            PRIMARY APP RAIL
        ================================================== */}

        <aside className="se-web-dashboard-rail">

          <div className="se-web-dashboard-rail-logo">

            <img
              src="/se-logo.png"
              alt="Sandeep Edgetech"
            />

          </div>

          <nav className="se-web-dashboard-app-list">

            {availableApps.map(
              (
                app
              ) => (
                <button
                  key={
                    app.code
                  }
                  type="button"
                  className={
                    activeApp ===
                    app.code
                      ? "se-web-dashboard-app-btn active"
                      : "se-web-dashboard-app-btn"
                  }
                  onClick={() =>
                    handleAppClick(
                      app
                    )
                  }
                >

                  <span className="se-web-dashboard-app-icon">
                    {
                      app.icon
                    }
                  </span>

                  <span>
                    {
                      app.shortLabel
                    }
                  </span>

                </button>
              )
            )}

          </nav>

          <div className="se-web-dashboard-rail-bottom">

            <button
              type="button"
              className="se-web-dashboard-help-btn"
              title="Help"
            >
              ?
            </button>

          </div>

        </aside>

        {/* =================================================
            SECONDARY NAVIGATION
        ================================================== */}

        <aside className="se-web-dashboard-module-panel">

          <div className="se-web-dashboard-module-head">

            <span className="se-web-dashboard-module-eyebrow">
              SE-RMS
            </span>

            <h2>
              {isEmployee &&
              isPeopleApp
                ? "My Workspace"
                : currentApp
                    ?.label}
            </h2>

            <p>
              {
                currentAppDescription
              }
            </p>

          </div>

          <nav className="se-web-dashboard-module-list">

            {currentItems.map(
              (
                item,
                index
              ) => {
                const active =
                  isModuleItemActive(
                    item
                  );

                const previousSection =
                  index > 0
                    ? currentItems[
                        index -
                        1
                      ]?.section
                    : null;

                const showSection =
                  Boolean(
                    item.section
                  ) &&
                  item.section !==
                    previousSection;

                return (
                  <React.Fragment
                    key={
                      item.code
                    }
                  >

                    {showSection ? (
                      <div className="se-web-dashboard-nav-section">
                        {
                          item.section
                        }
                      </div>
                    ) : null}

                    <button
                      type="button"
                      disabled={
                        Boolean(
                          item.comingSoon
                        )
                      }
                      className={
                        active
                          ? "se-web-dashboard-module-btn active"
                          : "se-web-dashboard-module-btn"
                      }
                      onClick={() =>
                        handleModuleClick(
                          item
                        )
                      }
                    >

                      <span className="se-web-dashboard-module-icon">
                        {item.icon ||
                          "•"}
                      </span>

                      <span className="se-web-dashboard-module-label">
                        {getDashboardItemLabel(
                          item,
                          role
                        )}
                      </span>

                      {item.comingSoon ? (
                        <span className="se-web-dashboard-soon">
                          Soon
                        </span>
                      ) : (
                        <span className="se-web-dashboard-module-arrow">
                          ›
                        </span>
                      )}

                    </button>

                  </React.Fragment>
                );
              }
            )}

          </nav>

          {/* ===============================================
              USER CARD
          ================================================ */}

          <div className="se-web-dashboard-user-card">

            <div className="se-web-dashboard-user-avatar">
              {
                userInitial
              }
            </div>

            <div className="se-web-dashboard-user-info">

              <strong>
                {user?.displayName ||
                  "User"}
              </strong>

              <span>
                {
                  roleLabel
                }
              </span>

            </div>

            <button
              type="button"
              className="se-web-dashboard-user-menu-btn"
              onClick={() =>
                setProfileOpen(
                  (
                    current
                  ) =>
                    !current
                )
              }
            >
              •••
            </button>

            {profileOpen ? (
              <div className="se-web-dashboard-profile-menu">

                <button
                  type="button"
                  onClick={
                    handleProfile
                  }
                >
                  My Profile
                </button>

                <button
                  type="button"
                  onClick={
                    handleLogout
                  }
                >
                  Sign Out
                </button>

              </div>
            ) : null}

          </div>

        </aside>

        {/* =================================================
            WORKSPACE
        ================================================== */}

        <section className="se-web-dashboard-workspace">

          <header className="se-web-dashboard-topbar">

            <div>

              <span className="se-web-dashboard-path">

                {isEmployee &&
                isPeopleApp
                  ? "My Workspace"
                  : currentApp
                      ?.label}

                {" / "}

                {isRecruitmentApp
                  ? recruitmentPage
                      .title
                  : isPeopleApp
                    ? peoplePage
                        .title
                    : "Overview"}

              </span>

              <h1>
                {
                  greeting
                }
                ,{" "}
                {user?.displayName ||
                  "User"}
              </h1>

            </div>

            <div className="se-web-dashboard-top-actions">

              <button
                type="button"
                className="se-web-dashboard-search"
              >
                <span>
                  Search SE-RMS
                </span>

                <kbd>
                  ⌘ K
                </kbd>
              </button>

              <button
                type="button"
                className="se-web-dashboard-icon-action"
                title="Notifications"
              >
                ◉
              </button>

              <button
                type="button"
                className="se-web-dashboard-top-avatar"
                onClick={() =>
                  setProfileOpen(
                    (
                      current
                    ) =>
                      !current
                  )
                }
              >
                {
                  userInitial
                }
              </button>

            </div>

          </header>

          <div
            className={
              isPeopleFullModulePage
                ? "se-web-dashboard-content se-web-dashboard-content--full-module"
                : "se-web-dashboard-content"
            }
          >

            {/* =============================================
                RECRUITMENT
            ============================================== */}

            {isRecruitmentApp ? (
              <RecruitmentWorkspace />
            ) : isPeopleFullModulePage ? (
              renderPeopleWorkspace()
            ) : isPeopleApp &&
              !isEmployee ? (
              renderPeopleWorkspace()
            ) : isEmployee ? (
              <>

                <section className="se-web-dashboard-hero">

                  <div className="se-web-dashboard-hero-copy">

                    <span className="se-web-dashboard-hero-eyebrow">
                      MY WORKSPACE
                    </span>

                    <h2>
                      Your workday. One simple workspace.
                    </h2>

                    <p>
                      Access attendance, timesheets
                      and your personal employment
                      information without unnecessary
                      management screens.
                    </p>

                  </div>

                  <div className="se-web-dashboard-hero-status">

                    <span>
                      PERSONAL ACCESS
                    </span>

                    <strong>
                      Employee workspace
                    </strong>

                    <div>

                      <span className="se-web-dashboard-live-dot" />

                      Connected

                    </div>

                  </div>

                </section>

                <section className="se-web-dashboard-stats">

                  <article
                    className="se-web-dashboard-stat-card clickable live-module"
                    onClick={
                      handleAttendance
                    }
                  >

                    <div className="se-web-dashboard-stat-top">

                      <span className="se-web-dashboard-stat-icon attendance">
                        ◷
                      </span>

                      <span className="se-web-dashboard-live-label">
                        TODAY
                      </span>

                    </div>

                    <strong>
                      ◷
                    </strong>

                    <h3>
                      My Attendance
                    </h3>

                    <p>
                      Check in, check out and
                      view your attendance history.
                    </p>

                  </article>

                  <article
                    className="se-web-dashboard-stat-card clickable"
                    onClick={
                      handleTimesheet
                    }
                  >

                    <div className="se-web-dashboard-stat-top">

                      <span className="se-web-dashboard-stat-icon time">
                        ◴
                      </span>

                      <span className="se-web-dashboard-stat-link">
                        Work
                      </span>

                    </div>

                    <strong>
                      ◴
                    </strong>

                    <h3>
                      My Timesheet
                    </h3>

                    <p>
                      Submit today's work summary
                      and review previous reports.
                    </p>

                  </article>

                  <article
                    className="se-web-dashboard-stat-card clickable"
                    onClick={
                      handleProfile
                    }
                  >

                    <div className="se-web-dashboard-stat-top">

                      <span className="se-web-dashboard-stat-icon structure">
                        ◎
                      </span>

                      <span className="se-web-dashboard-stat-link">
                        Personal
                      </span>

                    </div>

                    <strong>
                      {
                        userInitial
                      }
                    </strong>

                    <h3>
                      My Profile
                    </h3>

                    <p>
                      View your employment identity
                      and account information.
                    </p>

                  </article>

                </section>

                <section className="se-web-dashboard-grid">

                  <article className="se-web-dashboard-panel se-web-dashboard-people-panel">

                    <div className="se-web-dashboard-panel-head">

                      <div>

                        <span>
                          MY WORK
                        </span>

                        <h3>
                          Daily Workspace
                        </h3>

                        <p>
                          Everything you need
                          for your normal workday
                          in SE-RMS.
                        </p>

                      </div>

                    </div>

                    <div className="se-web-dashboard-action-grid">

                      <button
                        type="button"
                        className="se-web-dashboard-action-card attendance"
                        onClick={
                          handleAttendance
                        }
                      >

                        <span className="se-web-dashboard-action-icon attendance">
                          ◷
                        </span>

                        <div>

                          <strong>
                            My Attendance
                          </strong>

                          <p>
                            Check in/out, field work
                            and attendance history
                          </p>

                        </div>

                        <span>
                          →
                        </span>

                      </button>

                      <button
                        type="button"
                        className="se-web-dashboard-action-card shift"
                        onClick={
                          handleShift
                        }
                      >

                        <span className="se-web-dashboard-action-icon shift">
                          ⇄
                        </span>

                        <div>

                          <strong>
                            My Shift
                          </strong>

                          <p>
                            View your published weekly
                            shift schedule
                          </p>

                        </div>

                        <span>
                          →
                        </span>

                      </button>

                      <button
                        type="button"
                        className="se-web-dashboard-action-card"
                        onClick={
                          handleTimesheet
                        }
                      >

                        <span className="se-web-dashboard-action-icon">
                          ◴
                        </span>

                        <div>

                          <strong>
                            My Timesheet
                          </strong>

                          <p>
                            Daily work report
                            and next-day plan
                          </p>

                        </div>

                        <span>
                          →
                        </span>

                      </button>

                      <button
                        type="button"
                        className="se-web-dashboard-action-card"
                        onClick={
                          handleProfile
                        }
                      >

                        <span className="se-web-dashboard-action-icon">
                          ◎
                        </span>

                        <div>

                          <strong>
                            My Profile
                          </strong>

                          <p>
                            Personal and
                            employment information
                          </p>

                        </div>

                        <span>
                          →
                        </span>

                      </button>

                    </div>

                  </article>

                </section>

              </>
            ) : (
              <>

                <section className="se-web-dashboard-hero">

                  <div className="se-web-dashboard-hero-copy">

                    <span className="se-web-dashboard-hero-eyebrow">
                      {isManager
                        ? "TEAM OVERVIEW"
                        : "ORGANISATION OVERVIEW"}
                    </span>

                    <h2>
                      {isManager
                        ? "Your team. One connected workspace."
                        : "One organisation. One workspace. Every team connected."}
                    </h2>

                    <p>
                      {isManager
                        ? "Manage your permitted employees, attendance and reporting from one structured workspace."
                        : "SE-RMS connects workforce, attendance, reporting and future business operations around your organisation structure."}
                    </p>

                  </div>

                  <div className="se-web-dashboard-hero-status">

                    <span>
                      SYSTEM STATUS
                    </span>

                    <strong>
                      Core modules operational
                    </strong>

                    <div>

                      <span className="se-web-dashboard-live-dot" />

                      Connected

                    </div>

                  </div>

                </section>

                <section className="se-web-dashboard-stats">

                  <article
                    className="se-web-dashboard-stat-card clickable"
                    onClick={
                      handleEmployeeDirectory
                    }
                  >

                    <div className="se-web-dashboard-stat-top">

                      <span className="se-web-dashboard-stat-icon people">
                        👥
                      </span>

                      <span className="se-web-dashboard-stat-link">
                        {isManager
                          ? "Team"
                          : "People"}
                      </span>

                    </div>

                    <strong>
                      {loadingStats
                        ? "..."
                        : employeeCount}
                    </strong>

                    <h3>
                      Active Employees
                    </h3>

                    <p>
                      {isManager
                        ? "Employees available within your permitted scope."
                        : "Current active workforce in SE-RMS."}
                    </p>

                  </article>

                  <article className="se-web-dashboard-stat-card">

                    <div className="se-web-dashboard-stat-top">

                      <span className="se-web-dashboard-stat-icon structure">
                        ◫
                      </span>

                      <span className="se-web-dashboard-stat-link">
                        Structure
                      </span>

                    </div>

                    <strong>
                      {loadingStats
                        ? "..."
                        : orgUnitCount}
                    </strong>

                    <h3>
                      Organisation Units
                    </h3>

                    <p>
                      Departments, teams
                      and operating units.
                    </p>

                  </article>

                  <article
                    className="se-web-dashboard-stat-card live-module"
                    onClick={
                      handleAttendance
                    }
                  >

                    <div className="se-web-dashboard-stat-top">

                      <span className="se-web-dashboard-stat-icon attendance">
                        ◷
                      </span>

                      <span className="se-web-dashboard-live-label">
                        LIVE
                      </span>

                    </div>

                    <strong>
                      ◷
                    </strong>

                    <h3>
                      Attendance
                    </h3>

                    <p>
                      Biometric, office
                      and field attendance monitoring.
                    </p>

                  </article>

                  <article
                    className="se-web-dashboard-stat-card clickable"
                    onClick={
                      handleTimesheet
                    }
                  >

                    <div className="se-web-dashboard-stat-top">

                      <span className="se-web-dashboard-stat-icon time">
                        ◴
                      </span>

                      <span className="se-web-dashboard-live-label">
                        LIVE
                      </span>

                    </div>

                    <strong>
                      ◴
                    </strong>

                    <h3>
                      Timesheets
                    </h3>

                    <p>
                      Daily work reporting
                      and manager review.
                    </p>

                  </article>

                </section>

                <section className="se-web-dashboard-grid">

                  <article className="se-web-dashboard-panel se-web-dashboard-people-panel">

                    <div className="se-web-dashboard-panel-head">

                      <div>

                        <span>
                          PEOPLE
                        </span>

                        <h3>
                          {isManager
                            ? "Team Management"
                            : "Workforce Management"}
                        </h3>

                        <p>
                          Manage permitted people,
                          hierarchy, attendance
                          and reporting.
                        </p>

                      </div>

                      <button
                        type="button"
                        onClick={
                          handlePeopleOverview
                        }
                      >
                        Open People

                        <span>
                          →
                        </span>

                      </button>

                    </div>

                    <div className="se-web-dashboard-action-grid">

                      <button
                        type="button"
                        className="se-web-dashboard-action-card"
                        onClick={
                          handleEmployeeDirectory
                        }
                      >

                        <span className="se-web-dashboard-action-icon">
                          👤
                        </span>

                        <div>

                          <strong>
                            Employee Directory
                          </strong>

                          <p>
                            Profiles, departments
                            and reporting hierarchy
                          </p>

                        </div>

                        <span>
                          →
                        </span>

                      </button>

                      <button
                        type="button"
                        className="se-web-dashboard-action-card people-onboarding"
                        onClick={
                          handleOnboarding
                        }
                      >

                        <span className="se-web-dashboard-action-icon people-onboarding">
                          O
                        </span>

                        <div>

                          <strong>
                            Employee Onboarding
                          </strong>

                          <p>
                            Access, documents, assets,
                            appointment and activation
                          </p>

                        </div>

                        <span>
                          →
                        </span>

                      </button>

                      <button
                        type="button"
                        className="se-web-dashboard-action-card attendance"
                        onClick={
                          handleAttendance
                        }
                      >

                        <span className="se-web-dashboard-action-icon attendance">
                          ◷
                        </span>

                        <div>

                          <strong>
                            Attendance
                          </strong>

                          <p>
                            eSSL, office and
                            field attendance
                          </p>

                        </div>

                        <span>
                          →
                        </span>

                      </button>

                      <button
                        type="button"
                        className="se-web-dashboard-action-card shift"
                        onClick={
                          handleShift
                        }
                      >

                        <span className="se-web-dashboard-action-icon shift">
                          ⇄
                        </span>

                        <div>

                          <strong>
                            Shift Management
                          </strong>

                          <p>
                            Weekly roster, assignments
                            and published shifts
                          </p>

                        </div>

                        <span>
                          →
                        </span>

                      </button>

                      <button
                        type="button"
                        className="se-web-dashboard-action-card"
                        onClick={
                          handleTimesheet
                        }
                      >

                        <span className="se-web-dashboard-action-icon">
                          ◴
                        </span>

                        <div>

                          <strong>
                            Timesheets
                          </strong>

                          <p>
                            Employee reporting
                            and manager review
                          </p>

                        </div>

                        <span>
                          →
                        </span>

                      </button>

                      {hasPermission(
                        "EMPLOYEE",
                        "CREATE"
                      ) ? (
                        <button
                          type="button"
                          className="se-web-dashboard-action-card primary"
                          onClick={
                            handleAddEmployee
                          }
                        >

                          <span className="se-web-dashboard-action-icon">
                            +
                          </span>

                          <div>

                            <strong>
                              Add Employee
                            </strong>

                            <p>
                              Create employee
                              master record
                            </p>

                          </div>

                          <span>
                            →
                          </span>

                        </button>
                      ) : null}

                      {isAdmin ? (
                        <button
                          type="button"
                          className="se-web-dashboard-action-card"
                          onClick={
                            handleEmployeeDirectory
                          }
                        >

                          <span className="se-web-dashboard-action-icon">
                            ◫
                          </span>

                          <div>

                            <strong>
                              Organisation
                            </strong>

                            <p>
                              Departments and
                              reporting structure
                            </p>

                          </div>

                          <span>
                            →
                          </span>

                        </button>
                      ) : null}

                      {isAdmin &&
                      hasModule(
                        "ACCESS_MANAGEMENT"
                      ) ? (
                        <button
                          type="button"
                          className="se-web-dashboard-action-card"
                          onClick={() =>
                            navigate(
                              "/access"
                            )
                          }
                        >

                          <span className="se-web-dashboard-action-icon">
                            ◉
                          </span>

                          <div>

                            <strong>
                              Access Management
                            </strong>

                            <p>
                              Roles, permissions
                              and scopes
                            </p>

                          </div>

                          <span>
                            →
                          </span>

                        </button>
                      ) : null}

                    </div>

                  </article>

                  {isAdmin ? (
                    <article className="se-web-dashboard-panel se-web-dashboard-system-panel">

                      <div className="se-web-dashboard-panel-head compact">

                        <div>

                          <span>
                            PLATFORM
                          </span>

                          <h3>
                            SE-RMS Modules
                          </h3>

                        </div>

                      </div>

                      <div className="se-web-dashboard-module-progress">

                        <div>

                          <span className="done">
                            ✓
                          </span>

                          <div>

                            <strong>
                              Authentication
                            </strong>

                            <p>
                              Live
                            </p>

                          </div>

                        </div>

                        <div
                          className="clickable"
                          onClick={
                            handlePeopleOverview
                          }
                        >

                          <span className="done">
                            ✓
                          </span>

                          <div>

                            <strong>
                              People
                            </strong>

                            <p>
                              Live
                            </p>

                          </div>

                        </div>

                        <div
                          className="clickable"
                          onClick={
                            handleEmployeeDirectory
                          }
                        >

                          <span className="done">
                            ✓
                          </span>

                          <div>

                            <strong>
                              Employees
                            </strong>

                            <p>
                              Live
                            </p>

                          </div>

                        </div>

                        <div
                          className="clickable"
                          onClick={
                            handleOnboarding
                          }
                        >

                          <span className="done">
                            ✓
                          </span>

                          <div>

                            <strong>
                              Onboarding
                            </strong>

                            <p>
                              Live
                            </p>

                          </div>

                        </div>

                        <div
                          className="clickable"
                          onClick={
                            handleAttendance
                          }
                        >

                          <span className="done">
                            ✓
                          </span>

                          <div>

                            <strong>
                              Attendance
                            </strong>

                            <p>
                              Live
                            </p>

                          </div>

                        </div>

                        <div
                          className="clickable"
                          onClick={
                            handleShift
                          }
                        >

                          <span className="done">
                            ✓
                          </span>

                          <div>

                            <strong>
                              Shift Management
                            </strong>

                            <p>
                              Live
                            </p>

                          </div>

                        </div>

                        <div
                          className="clickable"
                          onClick={
                            handleTimesheet
                          }
                        >

                          <span className="done">
                            ✓
                          </span>

                          <div>

                            <strong>
                              Timesheet
                            </strong>

                            <p>
                              Live
                            </p>

                          </div>

                        </div>

                      </div>

                    </article>
                  ) : null}

                </section>

              </>
            )}

          </div>

        </section>

      </main>
    );
  };

export default DashboardWeb;
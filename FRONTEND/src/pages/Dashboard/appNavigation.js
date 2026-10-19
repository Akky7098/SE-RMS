import { getDashboardAppsForRole } from "../../utils/dashboardNavigation";

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


// Keep app navigation aligned with the desktop role and HR membership rules.
export const getAppNavigation = ({ user, access, hasModule }) => {
  const role = normalizeRole(user?.role);
  const hr = getHrAccessProfile({ user, access });
  const admin = hr.globalSuperAdmin || role === "ADMIN";
  const personal = ["PEOPLE_OVERVIEW", "ATTENDANCE", "LEAVE_MANAGEMENT", "SHIFT_MANAGEMENT", "TIMESHEET", "MY_PROFILE"];

  return getDashboardAppsForRole(role)
    .filter((app) => {
      if (["HOME", "PEOPLE"].includes(app.code)) return true;
      if (app.code === "RECRUITMENT") {
        return hr.globalSuperAdmin || hr.hrMember || hasModule("RECRUITMENT") || hasModule("MANPOWER");
      }
      return access?.fullAccess || hasModule(app.module);
    })
    .map((app) => ({
      ...app,
      items: app.items.filter((item) => {
        if (app.code === "HOME") return true;
        if (app.code === "PEOPLE" && role === "EMPLOYEE") return personal.includes(item.code);
        if (app.code === "PEOPLE" && ["HEAD", "MANAGER"].includes(role)) return item.code !== "ACCESS";
        if (app.code === "RECRUITMENT") {
          const page = getRecruitmentItemPage(item);
          if (page === "overview") return hr.globalSuperAdmin || hr.hrMember || hasModule("RECRUITMENT") || hasModule("MANPOWER");
          if (page === "manpower") return hr.globalSuperAdmin || hasModule("MANPOWER") || hasModule("RECRUITMENT");
          if (page === "hiring") return hr.globalSuperAdmin || hr.hrManager;
          if (["my-hiring", "hiring-workspace", "candidates", "candidate", "follow-ups", "interviews", "interview", "evaluations", "evaluation", "selections", "selection"].includes(page)) {
            return hr.globalSuperAdmin || hr.hrMember;
          }
          return hr.globalSuperAdmin || hasModule("RECRUITMENT");
        }
        return admin || access?.fullAccess || hasModule(item.module);
      }),
    }))
    .filter((app) => app.items.length > 0);
};

export const getAppItemPage = (item) => {
  const search = item?.path?.split("?")[1] || "";
  return new URLSearchParams(search).get("page") || "";
};

export const matchAppItem = (app, page) => {
  const aliases = { candidate: "candidates", interview: "interviews", evaluation: "evaluations", selection: "selections", "hiring-workspace": "my-hiring" };
  return app?.items.find((item) => !item.comingSoon && getAppItemPage(item) === (aliases[page] || page));
};

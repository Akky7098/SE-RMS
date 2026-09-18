/* =========================================================
   NORMALIZE
========================================================= */

const normalize = (
  value
) =>
  String(
    value ||
    ""
  )
    .trim()
    .toUpperCase();

/* =========================================================
   PERMISSIONS
========================================================= */

const collectPermissions =
  (
    user,
    access
  ) => {
    const values = [
      ...(
        Array.isArray(
          access?.permissions
        )
          ? access.permissions
          : []
      ),

      ...(
        Array.isArray(
          user?.permissions
        )
          ? user.permissions
          : []
      ),
    ];

    return new Set(
      values.map(
        normalize
      )
    );
  };

/* =========================================================
   MEMBERSHIPS
========================================================= */

const collectMemberships =
  (
    user,
    access
  ) => {
    const candidates = [
      access
        ?.departmentMemberships,

      access
        ?.memberships,

      access
        ?.departments,

      user
        ?.departmentMemberships,

      user
        ?.memberships,
    ];

    const memberships =
      candidates.find(
        Array.isArray
      ) ||
      [];

    const primary =
      access
        ?.primaryDepartment ||
      user
        ?.primaryDepartment ||
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
   HR MEMBERSHIP
========================================================= */

const findHrMembership =
  (
    memberships
  ) => {
    return memberships.find(
      (
        membership
      ) => {
        const department =
          membership
            ?.department ||
          membership ||
          {};

        const code =
          normalize(
            department
              ?.code ||
            membership
              ?.departmentCode
          );

        const name =
          normalize(
            department
              ?.name ||
            membership
              ?.departmentName
          );

        return (
          code ===
            "HR" ||
          name ===
            "HR" ||
          name ===
            "HUMAN RESOURCES"
        );
      }
    );
  };

/* =========================================================
   HEAD MEMBERSHIP
========================================================= */

const hasHeadMembership =
  (
    memberships
  ) => {
    return memberships.some(
      (
        membership
      ) => {
        const role =
          normalize(
            membership
              ?.role ||
            membership
              ?.departmentRole ||
            membership
              ?.membershipRole
          );

        return [
          "HEAD",
          "HOD",
          "DEPARTMENT_HEAD",
          "DEPARTMENT_SUPER_ADMIN",
        ].includes(
          role
        );
      }
    );
  };

/* =========================================================
   SHIFT ACCESS
========================================================= */

export const getShiftAccess =
  (
    user,
    access
  ) => {
    const permissions =
      collectPermissions(
        user,
        access
      );

    const memberships =
      collectMemberships(
        user,
        access
      );

    const systemRole =
      normalize(
        access
          ?.systemRole ||
        user
          ?.systemRole ||
        user
          ?.role
      );

    const legacyRole =
      normalize(
        user?.role
      );

    /* =====================================================
       SUPER ADMIN
    ===================================================== */

    const isSuperAdmin =
      Boolean(
        access
          ?.globalSuperAdmin ||
        access
          ?.superAdmin ||
        systemRole ===
          "SUPER_ADMIN" ||
        legacyRole ===
          "SUPER_ADMIN"
      );

    /* =====================================================
       HR
    ===================================================== */

    const hrMembership =
      findHrMembership(
        memberships
      );

    const hrRole =
      normalize(
        hrMembership
          ?.role ||
        hrMembership
          ?.departmentRole ||
        hrMembership
          ?.membershipRole
      );

    const isHr =
      Boolean(
        hrMembership
      );

    const isHrHead =
      Boolean(
        isHr &&
        [
          "HEAD",
          "HOD",
          "DEPARTMENT_HEAD",
          "DEPARTMENT_SUPER_ADMIN",
          "ADMIN",
        ].includes(
          hrRole
        )
      );

    /* =====================================================
       HEAD / MANAGER
    ===================================================== */

    const isHead =
      Boolean(
        legacyRole ===
          "HEAD" ||
        hasHeadMembership(
          memberships
        )
      );

    const isManager =
      legacyRole ===
      "MANAGER";

    /* =====================================================
       VISIBILITY
    ===================================================== */

    const canViewAll =
      Boolean(
        isSuperAdmin ||
        permissions.has(
          "ATTENDANCE_VIEW_ALL"
        )
      );

    const canViewTeam =
      Boolean(
        isSuperAdmin ||
        isHrHead ||
        isHead ||
        isManager ||
        canViewAll ||
        permissions.has(
          "ATTENDANCE_VIEW_TEAM"
        )
      );

    /* =====================================================
       ROSTER EDIT
    ===================================================== */

    const canManageRoster =
      Boolean(
        isSuperAdmin ||
        isHrHead ||
        isHead ||
        permissions.has(
          "ATTENDANCE_MANAGE_SHIFT"
        )
      );

    /* =====================================================
       SUBMIT

       Head prepares + submits.

       HR Head can also correct/submit when required.
    ===================================================== */

    const canSubmitRoster =
      Boolean(
        isSuperAdmin ||
        isHrHead ||
        isHead ||
        permissions.has(
          "ATTENDANCE_MANAGE_SHIFT"
        )
      );

    /* =====================================================
       PUBLISH

       Final publish stays HR / Super Admin.
    ===================================================== */

    const canPublishRoster =
      Boolean(
        isSuperAdmin ||
        isHrHead
      );

    /* =====================================================
       SHIFT MASTER
    ===================================================== */

    const canManageShiftMaster =
      Boolean(
        isSuperAdmin ||
        isHrHead ||
        permissions.has(
          "ATTENDANCE_MANAGE_SHIFT"
        )
      );

    return {
      systemRole,

      legacyRole,

      isSuperAdmin,

      isHr,

      isHrHead,

      isHead,

      isManager,

      canViewAll,

      canViewTeam,

      canManageRoster,

      canSubmitRoster,

      canPublishRoster,

      canManageShiftMaster,
    };
  };

export default getShiftAccess;
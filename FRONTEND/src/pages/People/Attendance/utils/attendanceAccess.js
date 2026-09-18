/* =========================================================
   ATTENDANCE FRONTEND ACCESS

   IMPORTANT:

   This controls UI visibility only.

   Backend permission + hierarchy scope remains authoritative.
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

const arrayValues = (
  value
) =>
  Array.isArray(
    value
  )
    ? value
    : [];

/* =========================================================
   PERMISSIONS
========================================================= */

export const getAttendancePermissions = (
  user
) => {
  const values = [
    ...arrayValues(
      user?.permissions
    ),

    ...arrayValues(
      user?.effectivePermissions
    ),

    ...arrayValues(
      user?.access?.permissions
    ),
  ];

  return new Set(
    values.map(
      normalize
    )
  );
};

/* =========================================================
   DEPARTMENT MEMBERSHIPS
========================================================= */

const getMemberships = (
  user
) => {
  return [
    ...arrayValues(
      user?.departmentMemberships
    ),

    ...arrayValues(
      user?.memberships
    ),
  ];
};

const isHeadMembership = (
  membership
) => {
  const role =
    normalize(
      membership?.role ||
      membership?.membershipRole ||
      membership?.authority
    );

  return [
    "HEAD",
    "HOD",
    "DEPARTMENT_HEAD",
  ].includes(
    role
  );
};

const isHrMembership = (
  membership
) => {
  const name =
    normalize(
      membership?.department?.name ||
      membership?.departmentName ||
      membership?.departmentCode ||
      membership?.orgUnitCode
    );

  return (
    name ===
      "HR" ||
    name ===
      "HUMAN_RESOURCES" ||
    name.includes(
      "HUMAN RESOURCE"
    )
  );
};

/* =========================================================
   ACCESS RESOLVER
========================================================= */

export const getAttendanceAccess = (
  user
) => {
  const permissions =
    getAttendancePermissions(
      user
    );

  const systemRole =
    normalize(
      user?.systemRole
    );

  const legacyRole =
    normalize(
      user?.role
    );

  const memberships =
    getMemberships(
      user
    );

  const isSuperAdmin =
    systemRole ===
      "SUPER_ADMIN" ||
    legacyRole ===
      "SUPER_ADMIN";

  const isHead =
    memberships.some(
      isHeadMembership
    ) ||
    legacyRole ===
      "HEAD";

  const isManager =
    legacyRole ===
      "MANAGER" ||
    permissions.has(
      "ATTENDANCE_VIEW_TEAM"
    );

  const isHr =
    memberships.some(
      isHrMembership
    ) ||
    normalize(
      user?.departmentName
    ) ===
      "HR";

  const isHrHead =
    memberships.some(
      (
        membership
      ) =>
        isHeadMembership(
          membership
        ) &&
        isHrMembership(
          membership
        )
    );

  const canViewAll =
    isSuperAdmin ||
    permissions.has(
      "ATTENDANCE_VIEW_ALL"
    );

  const canViewTeam =
    canViewAll ||
    isHead ||
    isManager ||
    permissions.has(
      "ATTENDANCE_VIEW_TEAM"
    );

  const canViewRegister =
    canViewTeam;

  const canViewLocations =
    canViewAll ||
    permissions.has(
      "ATTENDANCE_VIEW_FIELD_LOCATION"
    ) ||
    isHead ||
    isManager;

  const canRegularizeSelf =
    isSuperAdmin ||
    permissions.has(
      "ATTENDANCE_REGULARIZE_SELF"
    );

  const canApproveRegularization =
    isSuperAdmin ||
    permissions.has(
      "ATTENDANCE_APPROVE_REGULARIZATION"
    );

  /*
   * As requested:
   *
   * Attendance sheet download:
   * - SUPER_ADMIN
   * - HR Head
   * - HR with explicit export/all attendance authority
   *
   * Normal Head/Manager does NOT automatically get export.
   */
  const canExport =
    isSuperAdmin ||
    isHrHead ||
    (
      isHr &&
      (
        permissions.has(
          "ATTENDANCE_EXPORT"
        ) ||
        permissions.has(
          "ATTENDANCE_VIEW_ALL"
        )
      )
    );

  return {
    permissions,

    isSuperAdmin,

    isHead,

    isManager,

    isHr,

    isHrHead,

    canViewAll,

    canViewTeam,

    canViewRegister,

    canViewLocations,

    canRegularizeSelf,

    canApproveRegularization,

    canExport,
  };
};

export default getAttendanceAccess;
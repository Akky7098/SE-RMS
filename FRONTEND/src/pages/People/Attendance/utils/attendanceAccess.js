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

/* =========================================================
   HEAD / DEPARTMENT AUTHORITY
========================================================= */

const isHeadMembership = (
  membership
) => {
  const role =
    normalize(
      membership?.role ||
      membership?.departmentRole ||
      membership?.membershipRole ||
      membership?.authority
    );

  return [
    "HEAD",
    "HOD",
    "DEPARTMENT_HEAD",
    "DEPARTMENT_SUPER_ADMIN",
    "ADMIN",
  ].includes(
    role
  );
};

/* =========================================================
   HR MEMBERSHIP
========================================================= */

const isHrMembership = (
  membership
) => {
  const department =
    membership?.department ||
    membership;

  const code =
    normalize(
      department?.code ||
      membership?.departmentCode ||
      membership?.orgUnitCode
    );

  const name =
    normalize(
      department?.name ||
      membership?.departmentName
    );

  return (
    code ===
      "HR" ||
    code ===
      "HUMAN_RESOURCES" ||
    name ===
      "HR" ||
    name ===
      "HUMAN RESOURCES" ||
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
  user,
  authAccess = null
) => {
  /* =====================================================
     PERMISSIONS

     Merge permissions available directly on the user with
     permissions resolved by AuthContext.
  ===================================================== */

  const permissions =
    new Set([
      ...getAttendancePermissions(
        user
      ),

      ...arrayValues(
        authAccess?.permissions
      ).map(
        normalize
      ),
    ]);

  /* =====================================================
     ROLES
  ===================================================== */

  const systemRole =
    normalize(
      authAccess?.systemRole ||
      user?.systemRole ||
      user?.role
    );

  const legacyRole =
    normalize(
      user?.role
    );

  /* =====================================================
     MEMBERSHIPS

     Department authority may be exposed by the authenticated
     user or by AuthContext.

     We combine both sources for UI visibility only.

     Backend remains authoritative.
  ===================================================== */

  const memberships = [
    ...arrayValues(
      authAccess?.departmentMemberships
    ),

    ...arrayValues(
      authAccess?.memberships
    ),

    ...arrayValues(
      authAccess?.departments
    ),

    ...getMemberships(
      user
    ),

    ...(
      authAccess?.primaryDepartment &&
      typeof authAccess.primaryDepartment ===
        "object"
        ? [
            authAccess.primaryDepartment,
          ]
        : []
    ),
  ];

  /* =====================================================
     SUPER ADMIN
  ===================================================== */

  const isSuperAdmin =
    Boolean(
      authAccess?.globalSuperAdmin ||
      authAccess?.superAdmin
    ) ||
    systemRole ===
      "SUPER_ADMIN" ||
    legacyRole ===
      "SUPER_ADMIN";

  /* =====================================================
     DEPARTMENT HEAD
  ===================================================== */

  const isHead =
    memberships.some(
      isHeadMembership
    ) ||
    legacyRole ===
      "HEAD";

  /* =====================================================
     MANAGER
  ===================================================== */

  const isManager =
    legacyRole ===
      "MANAGER" ||
    permissions.has(
      "ATTENDANCE_VIEW_TEAM"
    );

  /* =====================================================
     HR
  ===================================================== */

  const isHr =
    memberships.some(
      isHrMembership
    ) ||
    normalize(
      user?.departmentName
    ) ===
      "HR";

  /* =====================================================
     HR HEAD

     HR Head requires BOTH:

     1. HR department membership
     2. Head / HOD / Department Admin authority
  ===================================================== */

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

  /* =====================================================
     VIEW ALL

     This does NOT grant backend access.

     It only decides which frontend controls can be shown.
  ===================================================== */

  const canViewAll =
    isSuperAdmin ||
    permissions.has(
      "ATTENDANCE_VIEW_ALL"
    );

  /* =====================================================
     TEAM / DEPARTMENT VISIBILITY
  ===================================================== */

  const canViewTeam =
    canViewAll ||
    isHead ||
    isManager ||
    permissions.has(
      "ATTENDANCE_VIEW_TEAM"
    );

  /* =====================================================
     WORKFORCE ATTENDANCE REGISTER

     HR Head / Head / Manager / View All users may open the
     management register.

     Backend will still resolve the real hierarchy scope.

     This is important for the biometric register because
     biometric-only workers are returned by the backend
     separately from mapped Attendance records.
  ===================================================== */

  const canViewRegister =
    canViewAll ||
    canViewTeam ||
    isHead ||
    isHrHead;

  /* =====================================================
     LOCATION VISIBILITY

     Location information is more sensitive than ordinary
     attendance data.

     Do not automatically expose field/GPS location simply
     because someone is a normal Manager.
  ===================================================== */

  const canViewLocations =
    isSuperAdmin ||
    isHrHead ||
    permissions.has(
      "ATTENDANCE_VIEW_FIELD_LOCATION"
    );

  /* =====================================================
     SELF REGULARIZATION
  ===================================================== */

  const canRegularizeSelf =
    isSuperAdmin ||
    permissions.has(
      "ATTENDANCE_REGULARIZE_SELF"
    );

  /* =====================================================
     REGULARIZATION APPROVAL
  ===================================================== */

  const canApproveRegularization =
    isSuperAdmin ||
    permissions.has(
      "ATTENDANCE_APPROVE_REGULARIZATION"
    );

  /* =====================================================
     EXPORT

     Attendance sheet download:

     - SUPER_ADMIN
     - HR Head
     - HR with explicit ATTENDANCE_EXPORT
     - HR with ATTENDANCE_VIEW_ALL

     Normal Head / Manager does NOT automatically get export.
  ===================================================== */

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

  /* =====================================================
     RESULT
  ===================================================== */

  return {
    permissions,

    systemRole,

    legacyRole,

    memberships,

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
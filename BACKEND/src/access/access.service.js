const {
  AccessProfile,
  MODULES,
  ACTIONS,
  DATA_SCOPES,
  SCOPE_RANK,
  DEPARTMENT_ROLES,
} =
  require(
    "./access.model"
  );

const {
  USER_ROLES,
} =
  require(
    "../user/user.model"
  );

const {
  DepartmentMembership,
} =
  require(
    "../department/departmentMembership.model"
  );

const ApiError =
  require(
    "../utils/ApiError"
  );

/* =========================================================
   SYSTEM ROLE

   New authoritative global authority.

   Fallback to old role === SUPER_ADMIN so existing
   database records continue working before migration.
========================================================= */

const getSystemRole =
  (
    user
  ) => {
    if (
      user?.systemRole ===
        "SUPER_ADMIN" ||
      user?.role ===
        "SUPER_ADMIN"
    ) {
      return "SUPER_ADMIN";
    }

    return "STANDARD_USER";
  };

/* =========================================================
   GLOBAL SUPER ADMIN
========================================================= */

const isGlobalSuperAdmin =
  (
    user
  ) =>
    getSystemRole(
      user
    ) ===
    "SUPER_ADMIN";

/* =========================================================
   DEFAULT BASE ACCESS

   TEMPORARY legacy baseline.

   Department authority does NOT come from these roles.
========================================================= */

const DEFAULT_ACCESS = {
  ADMIN: [
    {
      module:
        "DASHBOARD",

      action:
        "VIEW",

      scope:
        "ALL",
    },

    {
      module:
        "EMPLOYEE",

      action:
        "VIEW",

      scope:
        "ALL",
    },

    {
      module:
        "EMPLOYEE",

      action:
        "CREATE",

      scope:
        "ALL",
    },

    {
      module:
        "EMPLOYEE",

      action:
        "UPDATE",

      scope:
        "ALL",
    },

    {
      module:
        "ATTENDANCE",

      action:
        "VIEW",

      scope:
        "ALL",
    },

    {
      module:
        "ATTENDANCE",

      action:
        "UPDATE",

      scope:
        "ALL",
    },

    {
      module:
        "ATTENDANCE",

      action:
        "APPROVE",

      scope:
        "ALL",
    },

    {
      module:
        "TIMESHEET",

      action:
        "VIEW",

      scope:
        "ALL",
    },

    {
      module:
        "TIMESHEET",

      action:
        "APPROVE",

      scope:
        "ALL",
    },

    {
      module:
        "REPORT",

      action:
        "VIEW",

      scope:
        "ALL",
    },

    {
      module:
        "DEPARTMENT",

      action:
        "VIEW",

      scope:
        "ALL",
    },

    /*
     * IMPORTANT:
     *
     * No MANPOWER / RECRUITMENT authority here.
     *
     * Those workflows are department-driven.
     */
  ],

  HEAD: [
    {
      module:
        "DASHBOARD",

      action:
        "VIEW",

      scope:
        "DEPARTMENT",
    },

    {
      module:
        "EMPLOYEE",

      action:
        "VIEW",

      scope:
        "DEPARTMENT",
    },

    {
      module:
        "ATTENDANCE",

      action:
        "VIEW",

      scope:
        "DEPARTMENT",
    },

    {
      module:
        "ATTENDANCE",

      action:
        "APPROVE",

      scope:
        "DEPARTMENT",
    },

    {
      module:
        "TIMESHEET",

      action:
        "VIEW",

      scope:
        "DEPARTMENT",
    },

    {
      module:
        "TIMESHEET",

      action:
        "APPROVE",

      scope:
        "DEPARTMENT",
    },

    {
      module:
        "REPORT",

      action:
        "VIEW",

      scope:
        "DEPARTMENT",
    },

    {
      module:
        "DEPARTMENT",

      action:
        "VIEW",

      scope:
        "DEPARTMENT",
    },
  ],

  MANAGER: [
    {
      module:
        "DASHBOARD",

      action:
        "VIEW",

      scope:
        "TEAM",
    },

    {
      module:
        "EMPLOYEE",

      action:
        "VIEW",

      scope:
        "TEAM",
    },

    {
      module:
        "ATTENDANCE",

      action:
        "VIEW",

      scope:
        "TEAM",
    },

    {
      module:
        "ATTENDANCE",

      action:
        "APPROVE",

      scope:
        "TEAM",
    },

    {
      module:
        "TIMESHEET",

      action:
        "VIEW",

      scope:
        "TEAM",
    },

    {
      module:
        "TIMESHEET",

      action:
        "APPROVE",

      scope:
        "TEAM",
    },
  ],

  EMPLOYEE: [
    {
      module:
        "DASHBOARD",

      action:
        "VIEW",

      scope:
        "SELF",
    },

    {
      module:
        "EMPLOYEE",

      action:
        "VIEW",

      scope:
        "SELF",
    },

    {
      module:
        "ATTENDANCE",

      action:
        "VIEW",

      scope:
        "SELF",
    },

    {
      module:
        "ATTENDANCE",

      action:
        "CREATE",

      scope:
        "SELF",
    },

    {
      module:
        "TIMESHEET",

      action:
        "VIEW",

      scope:
        "SELF",
    },

    {
      module:
        "TIMESHEET",

      action:
        "CREATE",

      scope:
        "SELF",
    },

    {
      module:
        "TIMESHEET",

      action:
        "UPDATE",

      scope:
        "SELF",
    },
  ],
};

/* =========================================================
   NORMALIZE
========================================================= */

const normalizePermission =
  (
    permission
  ) => ({
    module:
      String(
        permission?.module ||
          ""
      )
        .trim()
        .toUpperCase(),

    action:
      String(
        permission?.action ||
          ""
      )
        .trim()
        .toUpperCase(),

    scope:
      String(
        permission?.scope ||
          "NONE"
      )
        .trim()
        .toUpperCase(),
  });

const permissionKey =
  (
    permission
  ) =>
    `${permission.module}:${permission.action}`;

/* =========================================================
   VALIDATE
========================================================= */

const validatePermission =
  (
    permission
  ) => {
    const normalized =
      normalizePermission(
        permission
      );

    if (
      !MODULES.includes(
        normalized.module
      )
    ) {
      throw new ApiError(
        400,
        `Invalid module: ${normalized.module}`
      );
    }

    if (
      !ACTIONS.includes(
        normalized.action
      )
    ) {
      throw new ApiError(
        400,
        `Invalid action: ${normalized.action}`
      );
    }

    if (
      !DATA_SCOPES.includes(
        normalized.scope
      )
    ) {
      throw new ApiError(
        400,
        `Invalid data scope: ${normalized.scope}`
      );
    }

    return normalized;
  };

/* =========================================================
   DEFAULT ACCESS PROFILES
========================================================= */

const ensureDefaultAccessProfiles =
  async () => {
    for (
      const role
      of USER_ROLES
    ) {
      if (
        role ===
        "SUPER_ADMIN"
      ) {
        continue;
      }

      const defaults =
        (
          DEFAULT_ACCESS[
            role
          ] ||
          []
        ).map(
          normalizePermission
        );

      let profile =
        await AccessProfile
          .findOne({
            role,
          });

      if (
        !profile
      ) {
        await AccessProfile
          .create({
            role,

            permissions:
              defaults,

            isActive:
              true,
          });

        console.log(
          `Access profile created: ${role}`
        );

        continue;
      }

      /*
       * Existing profiles are not automatically deleted here.
       *
       * We only add missing defaults so production custom
       * permissions are never silently destroyed.
       */

      const existingKeys =
        new Set(
          profile.permissions
            .map(
              (
                permission
              ) =>
                permissionKey(
                  permission
                )
            )
        );

      const additions =
        defaults.filter(
          (
            permission
          ) =>
            !existingKeys.has(
              permissionKey(
                permission
              )
            )
        );

      if (
        additions.length ===
        0
      ) {
        continue;
      }

      profile.permissions.push(
        ...additions
      );

      await profile.save();

      console.log(
        `Access profile updated: ${role} (+${additions.length})`
      );
    }
  };

/* =========================================================
   BASE ROLE PROFILE

   Legacy only.
========================================================= */

const getAccessProfileByRole =
  async (
    role
  ) => {
    const normalizedRole =
      String(
        role ||
          "EMPLOYEE"
      )
        .trim()
        .toUpperCase();

    if (
      !USER_ROLES.includes(
        normalizedRole
      )
    ) {
      throw new ApiError(
        400,
        "Invalid base access role"
      );
    }

    if (
      normalizedRole ===
        "SUPER_ADMIN"
    ) {
      return {
        role:
          "SUPER_ADMIN",

        isActive:
          true,

        isSuperAdmin:
          true,

        fullAccess:
          true,

        permissions:
          [],
      };
    }

    const profile =
      await AccessProfile
        .findOne({
          role:
            normalizedRole,
        })
        .lean();

    if (
      !profile
    ) {
      /*
       * Safer production fallback.
       *
       * A missing access profile should not crash login.
       */

      return {
        role:
          normalizedRole,

        isActive:
          true,

        fullAccess:
          false,

        permissions:
          DEFAULT_ACCESS[
            normalizedRole
          ] ||
          [],
      };
    }

    return profile;
  };

/* =========================================================
   DEPARTMENT ACCESS

   CANONICAL frontend structure.
========================================================= */

const getDepartmentAccessForUser =
  async (
    userId
  ) => {
    const memberships =
      await DepartmentMembership
        .find({
          user:
            userId,

          status:
            "ACTIVE",
        })
        .populate({
          path:
            "department",

          select:
            "name code slug parentDepartment status",

          match: {
            status:
              "ACTIVE",
          },
        })
        .sort({
          isPrimary:
            -1,

          createdAt:
            1,
        })
        .lean();

    return memberships
      .filter(
        (
          membership
        ) =>
          Boolean(
            membership.department
          )
      )
      .map(
        (
          membership
        ) => {
          const department =
            membership.department;

          return {
            membershipId:
              membership._id,

            /* =============================================
               CANONICAL
            ============================================== */

            department: {
              _id:
                department._id,

              name:
                department.name,

              code:
                department.code,

              slug:
                department.slug ||
                "",

              parentDepartment:
                department.parentDepartment ||
                null,
            },

            role:
              membership.role,

            isPrimary:
              Boolean(
                membership.isPrimary
              ),

            canManageMembers:
              Boolean(
                membership.canManageMembers
              ),

            canApproveManpower:
              Boolean(
                membership.canApproveManpower
              ),

            /* =============================================
               BACKWARD-COMPATIBLE ALIASES
            ============================================== */

            departmentId:
              department._id,

            departmentCode:
              department.code,

            departmentName:
              department.name,

            parentDepartmentId:
              department.parentDepartment ||
              null,

            departmentRole:
              membership.role,
          };
        }
      );
  };

/* =========================================================
   HR DEPARTMENT
========================================================= */

const isHrMembership =
  (
    membership
  ) =>
    String(
      membership
        ?.department
        ?.code ||
      membership
        ?.departmentCode ||
      ""
    )
      .trim()
      .toUpperCase() ===
    "HR";

/* =========================================================
   DEPARTMENT ROLE PERMISSIONS

   IMPORTANT:

   Department authority comes ONLY from membership.

   HR gets Recruitment module dynamically.
========================================================= */

/* =========================================================
   DEPARTMENT ROLE PERMISSIONS

   AUTHORITATIVE RULES

   GLOBAL SUPER ADMIN
   → handled outside this function

   NON-HR DEPARTMENT MEMBER
   → may raise manpower for own department
   → may view own manpower requests

   DEPARTMENT SUPER ADMIN / HOD / ADMIN
   → department manpower visibility
   → department management according to role

   HR MEMBER
   → recruitment execution only
   → My Hiring
   → candidates
   → follow-ups
   → interviews
   → CANNOT raise manpower
   → CANNOT manage Hiring Queue
   → CANNOT assign HR owners

   HR DEPARTMENT SUPER ADMIN / HOD / ADMIN
   → HR management
   → Hiring Queue
   → assign/reassign HR owner
   → start hiring
   → cross-department approved hiring visibility

   IMPORTANT:
   Actual manpower approval is contextual and remains
   enforced inside manpower.service.js using currentApprover.
========================================================= */

const getDepartmentRolePermissions =
  (
    departmentAccess
  ) => {
    const result =
      [];

    for (
      const membership
      of departmentAccess
    ) {
      const role =
        String(
          membership?.role ||
          membership
            ?.departmentRole ||
          ""
        )
          .trim()
          .toUpperCase();

      const isHr =
        isHrMembership(
          membership
        );

      const isDepartmentManager =
        [
          "DEPARTMENT_SUPER_ADMIN",
          "HOD",
          "ADMIN",
        ].includes(
          role
        );

      /* ===================================================
         MANPOWER — BASIC VISIBILITY

         Every department user may see manpower that the
         backend service determines they are entitled to see.

         This does NOT mean department-wide visibility.
      ==================================================== */

      result.push({
        module:
          "MANPOWER",

        action:
          "VIEW",

        scope:
          "SELF",
      });

      /* ===================================================
         MANPOWER — CREATE

         NORMAL DEPARTMENT USERS:
         May raise manpower for their department.

         HR MEMBER:
         Does NOT create manpower.

         HR MANAGEMENT:
         May raise manpower for HR itself when required.
      ==================================================== */

      if (
        !isHr ||
        isDepartmentManager
      ) {
        result.push({
          module:
            "MANPOWER",

          action:
            "CREATE",

          scope:
            "DEPARTMENT",
        });
      }

      /* ===================================================
         DEPARTMENT SUPER ADMIN
      ==================================================== */

      if (
        role ===
        "DEPARTMENT_SUPER_ADMIN"
      ) {
        result.push(
          {
            module:
              "DEPARTMENT",

            action:
              "VIEW",

            scope:
              "DEPARTMENT",
          },

          {
            module:
              "DEPARTMENT",

            action:
              "MANAGE",

            scope:
              "DEPARTMENT",
          },

          {
            module:
              "MANPOWER",

            action:
              "VIEW",

            scope:
              "DEPARTMENT",
          },

          {
            module:
              "MANPOWER",

            action:
              "UPDATE",

            scope:
              "DEPARTMENT",
          }
        );
      }

      /* ===================================================
         HOD / DEPARTMENT ADMIN

         Department operational management.

         IMPORTANT:
         This still does NOT automatically grant manpower
         approval. Approval is checked by currentApprover.
      ==================================================== */

      if (
        role ===
          "HOD" ||
        role ===
          "ADMIN"
      ) {
        result.push(
          {
            module:
              "DEPARTMENT",

            action:
              "VIEW",

            scope:
              "DEPARTMENT",
          },

          {
            module:
              "MANPOWER",

            action:
              "VIEW",

            scope:
              "DEPARTMENT",
          },

          {
            module:
              "MANPOWER",

            action:
              "UPDATE",

            scope:
              "DEPARTMENT",
          }
        );
      }

      /* ===================================================
         HR DEPARTMENT MEMBERSHIP
      ==================================================== */

      if (
        isHr
      ) {
        /* =================================================
           EVERY HR USER

           Gives Recruitment application visibility.
        ================================================== */

        result.push(
          {
            module:
              "HR",

            action:
              "VIEW",

            scope:
              "DEPARTMENT",
          },

          {
            module:
              "RECRUITMENT",

            action:
              "VIEW",

            scope:
              "DEPARTMENT",
          }
        );

        /* =================================================
           HR RECRUITMENT EXECUTION

           MEMBER such as Renu:
           - My Hiring
           - assigned candidates
           - calls
           - screening
           - follow-ups
           - interviews

           Actual record-level ownership remains enforced
           by recruitment/manpower services.
        ================================================== */

        result.push(
          {
            module:
              "RECRUITMENT",

            action:
              "CREATE",

            scope:
              "DEPARTMENT",
          },

          {
            module:
              "RECRUITMENT",

            action:
              "UPDATE",

            scope:
              "DEPARTMENT",
          }
        );

        /* =================================================
           HR MANAGEMENT

           Roshan:
           DEPARTMENT_SUPER_ADMIN

           Gives:
           - Hiring Queue
           - assign/reassign HR
           - manage approved hiring
           - cross-department HR visibility
        ================================================== */

        if (
          isDepartmentManager
        ) {
          result.push(
            {
              module:
                "HR",

              action:
                "MANAGE",

              scope:
                "ALL",
            },

            {
              module:
                "RECRUITMENT",

              action:
                "MANAGE",

              scope:
                "ALL",
            },

            {
              module:
                "MANPOWER",

              action:
                "VIEW",

              scope:
                "ALL",
            }
          );
        }
      }
    }

    return result;
  };

/* =========================================================
   HIGHER SCOPE
========================================================= */

const getHigherScope =
  (
    firstScope,
    secondScope
  ) => {
    const first =
      DATA_SCOPES.includes(
        firstScope
      )
        ? firstScope
        : "NONE";

    const second =
      DATA_SCOPES.includes(
        secondScope
      )
        ? secondScope
        : "NONE";

    return (
      SCOPE_RANK[
        first
      ] >=
      SCOPE_RANK[
        second
      ]
        ? first
        : second
    );
  };

/* =========================================================
   MERGE
========================================================= */

const mergePermissions =
  (
    permissionGroups
  ) => {
    const map =
      new Map();

    for (
      const group
      of permissionGroups
    ) {
      for (
        const raw
        of group ||
        []
      ) {
        const permission =
          normalizePermission(
            raw
          );

        const key =
          permissionKey(
            permission
          );

        const existing =
          map.get(
            key
          );

        if (
          !existing
        ) {
          map.set(
            key,
            permission
          );

          continue;
        }

        map.set(
          key,
          {
            ...permission,

            scope:
              getHigherScope(
                existing.scope,
                permission.scope
              ),
          }
        );
      }
    }

    return [
      ...map.values(),
    ];
  };

/* =========================================================
   ACCESS MAP
========================================================= */

const buildAccessMap =
  (
    permissions
  ) => {
    const map =
      {};

    for (
      const permission
      of permissions
    ) {
      if (
        permission.scope ===
        "NONE"
      ) {
        continue;
      }

      if (
        !map[
          permission.module
        ]
      ) {
        map[
          permission.module
        ] = {};
      }

      map[
        permission.module
      ][
        permission.action
      ] =
        permission.scope;
    }

    return map;
  };

const buildModules =
  (
    permissions
  ) => [
    ...new Set(
      permissions
        .filter(
          (
            permission
          ) =>
            permission.scope !==
            "NONE"
        )
        .map(
          (
            permission
          ) =>
            permission.module
        )
    ),
  ];

/* =========================================================
   MY ACCESS
========================================================= */

const getMyAccess =
  async (
    user
  ) => {
    if (
      !user
    ) {
      throw new ApiError(
        401,
        "Authenticated user is required"
      );
    }

    const systemRole =
      getSystemRole(
        user
      );

    /* =====================================================
       GLOBAL SUPER ADMIN
    ===================================================== */

    if (
      systemRole ===
      "SUPER_ADMIN"
    ) {
      return {
        systemRole:
          "SUPER_ADMIN",

        legacyRole:
          user.role ||
          "SUPER_ADMIN",

        globalSuperAdmin:
          true,

        /*
         * Backward compatibility.
         */
        superAdmin:
          true,

        fullAccess:
          true,

        modules:
          MODULES,

        permissions:
          [],

        accessMap: {
          "*": {
            "*":
              "ALL",
          },
        },

        departmentMemberships:
          [],

        /*
         * Compatibility alias.
         */
        departmentAccess:
          [],

        primaryDepartment:
          null,

        departmentStructureEnabled:
          true,
      };
    }

    /* =====================================================
       STANDARD USER
    ===================================================== */

    const baseRole =
      USER_ROLES.includes(
        user.role
      ) &&
      user.role !==
        "SUPER_ADMIN"
        ? user.role
        : "EMPLOYEE";

    const profile =
      await getAccessProfileByRole(
        baseRole
      );

    const departmentAccess =
      await getDepartmentAccessForUser(
        user._id
      );

    const primaryMembership =
      departmentAccess.find(
        (
          item
        ) =>
          item.isPrimary
      ) ||
      departmentAccess[0] ||
      null;

    if (
      !profile.isActive
    ) {
      return {
        systemRole:
          "STANDARD_USER",

        legacyRole:
          baseRole,

        globalSuperAdmin:
          false,

        superAdmin:
          false,

        fullAccess:
          false,

        modules:
          [],

        permissions:
          [],

        accessMap:
          {},

        departmentMemberships:
          departmentAccess,

        departmentAccess,

        primaryDepartment:
          primaryMembership,

        departmentStructureEnabled:
          true,
      };
    }

    const departmentPermissions =
      getDepartmentRolePermissions(
        departmentAccess
      );

    const permissions =
      mergePermissions([
        profile.permissions ||
          [],

        departmentPermissions,
      ]);

    return {
      /* ===================================================
         GLOBAL
      ==================================================== */

      systemRole:
        "STANDARD_USER",

      legacyRole:
        baseRole,

      globalSuperAdmin:
        false,

      superAdmin:
        false,

      fullAccess:
        false,

      /* ===================================================
         MODULE ACCESS
      ==================================================== */

      modules:
        buildModules(
          permissions
        ),

      permissions,

      accessMap:
        buildAccessMap(
          permissions
        ),

      /* ===================================================
         CANONICAL DEPARTMENT ACCESS
      ==================================================== */

      departmentMemberships:
        departmentAccess,

      primaryDepartment:
        primaryMembership,

      /* ===================================================
         COMPATIBILITY
      ==================================================== */

      departmentAccess,

      departmentStructureEnabled:
        true,
    };
  };

/* =========================================================
   LIST PROFILES
========================================================= */

const listAccessProfiles =
  async () => {
    const profiles =
      await AccessProfile
        .find()
        .sort({
          role:
            1,
        })
        .lean();

    return [
      {
        role:
          "SUPER_ADMIN",

        isActive:
          true,

        isSuperAdmin:
          true,

        fullAccess:
          true,

        permissions:
          [],
      },

      ...profiles,
    ];
  };

/* =========================================================
   UPDATE BASE ROLE ACCESS
========================================================= */

const updateRoleAccess =
  async ({
    role,
    permissions,
    actorUserId,
  }) => {
    const normalizedRole =
      String(
        role ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      !USER_ROLES.includes(
        normalizedRole
      )
    ) {
      throw new ApiError(
        400,
        "Invalid base access role"
      );
    }

    if (
      normalizedRole ===
        "SUPER_ADMIN"
    ) {
      throw new ApiError(
        403,
        "SUPER_ADMIN permissions cannot be restricted"
      );
    }

    if (
      !Array.isArray(
        permissions
      )
    ) {
      throw new ApiError(
        400,
        "permissions must be an array"
      );
    }

    const seen =
      new Set();

    const normalizedPermissions =
      [];

    for (
      const permission
      of permissions
    ) {
      const normalized =
        validatePermission(
          permission
        );

      const key =
        permissionKey(
          normalized
        );

      if (
        seen.has(
          key
        )
      ) {
        throw new ApiError(
          400,
          `Duplicate permission: ${key}`
        );
      }

      seen.add(
        key
      );

      normalizedPermissions.push(
        normalized
      );
    }

    return AccessProfile
      .findOneAndUpdate(
        {
          role:
            normalizedRole,
        },

        {
          $set: {
            permissions:
              normalizedPermissions,

            isActive:
              true,

            updatedBy:
              actorUserId,
          },

          $setOnInsert: {
            createdBy:
              actorUserId,
          },
        },

        {
          upsert:
            true,

          runValidators:
            true,

          new:
            true,
        }
      );
  };

/* =========================================================
   BASE ROLE PERMISSION

   Compatibility only.

   New modules should prefer canUser().
========================================================= */

const getPermission =
  async ({
    role,
    module,
    action,
  }) => {
    const normalizedRole =
      String(
        role ||
          ""
      )
        .trim()
        .toUpperCase();

    const normalizedModule =
      String(
        module ||
          ""
      )
        .trim()
        .toUpperCase();

    const normalizedAction =
      String(
        action ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      normalizedRole ===
      "SUPER_ADMIN"
    ) {
      return {
        allowed:
          true,

        scope:
          "ALL",
      };
    }

    const profile =
      await AccessProfile
        .findOne({
          role:
            normalizedRole,

          isActive:
            true,
        })
        .select(
          "permissions"
        )
        .lean();

    if (
      !profile
    ) {
      return {
        allowed:
          false,

        scope:
          "NONE",
      };
    }

    const permission =
      profile.permissions.find(
        (
          item
        ) =>
          item.module ===
            normalizedModule &&
          item.action ===
            normalizedAction
      );

    if (
      !permission ||
      permission.scope ===
        "NONE"
    ) {
      return {
        allowed:
          false,

        scope:
          "NONE",
      };
    }

    return {
      allowed:
        true,

      scope:
        permission.scope,
    };
  };

/* =========================================================
   EFFECTIVE USER PERMISSION
========================================================= */

const canUser =
  async (
    user,
    module,
    action
  ) => {
    if (
      !user
    ) {
      return {
        allowed:
          false,

        scope:
          "NONE",
      };
    }

    if (
      isGlobalSuperAdmin(
        user
      )
    ) {
      return {
        allowed:
          true,

        scope:
          "ALL",
      };
    }

    const access =
      await getMyAccess(
        user
      );

    const normalizedModule =
      String(
        module ||
          ""
      )
        .trim()
        .toUpperCase();

    const normalizedAction =
      String(
        action ||
          ""
      )
        .trim()
        .toUpperCase();

    const scope =
      access
        ?.accessMap
        ?.[
          normalizedModule
        ]
        ?.[
          normalizedAction
        ] ||
      "NONE";

    return {
      allowed:
        scope !==
        "NONE",

      scope,
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  DEFAULT_ACCESS,

  ensureDefaultAccessProfiles,

  getAccessProfileByRole,

  getMyAccess,

  listAccessProfiles,

  updateRoleAccess,

  getPermission,

  canUser,

  buildAccessMap,

  getHigherScope,

  getDepartmentAccessForUser,

  getSystemRole,

  isGlobalSuperAdmin,

  DEPARTMENT_ROLES,
};
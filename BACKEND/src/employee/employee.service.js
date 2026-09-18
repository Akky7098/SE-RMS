const mongoose =
  require(
    "mongoose"
  );

const {
  Employee,
  EMPLOYMENT_TYPES,
  EMPLOYEE_STATUSES,
  EMPLOYEE_SOURCES,
  EMPLOYEE_COMPANY_CODES,
} =
  require(
    "./employee.model"
  );

const {
  User,
  USER_ROLES,
} =
  require(
    "../user/user.model"
  );

const {
  getOrgUnit,
  getDescendantCodes,
  buildOrganizationStructure,
} =
  require(
    "../organization/organization.config"
  );

const {
  Department,
} =
  require(
    "../department/department.model"
  );

/*
 * IMPORTANT:
 *
 * DepartmentMembership is authoritative for:
 *
 * HR membership
 * HOD
 * Department Admin
 * Department Super Admin
 * Department hierarchy authority
 */
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

const {
  hashPassword,
} =
  require(
    "../utils/password"
  );

const env =
  require(
    "../config/env"
  );

/* =========================================================
   CONSTANTS
========================================================= */

const DEPARTMENT_LEADERSHIP_ROLES = [
  "DEPARTMENT_SUPER_ADMIN",
  "HOD",
  "ADMIN",
];

const HR_DEPARTMENT_CODES = [
  "HR",
];

const HR_DEPARTMENT_NAMES = [
  "HR",
  "HUMAN RESOURCES",
];

/* =========================================================
   HELPERS
========================================================= */

const normalizeEmail =
  (
    email
  ) => {
    if (!email) {
      return null;
    }

    return String(
      email
    )
      .trim()
      .toLowerCase();
  };

const normalizeEmployeeCode =
  (
    code
  ) =>
    String(
      code ||
      ""
    )
      .trim()
      .toUpperCase();

const normalizeValue =
  (
    value
  ) =>
    String(
      value ||
      ""
    )
      .trim()
      .toUpperCase();

const assertValidObjectId =
  (
    id,
    fieldName =
      "ID"
  ) => {
    if (
      !mongoose
        .isValidObjectId(
          id
        )
    ) {
      throw new ApiError(
        400,
        `Invalid ${fieldName}`
      );
    }
  };

const ensureEmployeeExists =
  async (
    id
  ) => {
    assertValidObjectId(
      id,
      "employee ID"
    );

    const employee =
      await Employee
        .findById(
          id
        );

    if (!employee) {
      throw new ApiError(
        404,
        "Employee not found"
      );
    }

    return employee;
  };

/* =========================================================
   GLOBAL SUPER ADMIN
========================================================= */

const isGlobalSuperAdmin =
  (
    user
  ) => {
    return (
      normalizeValue(
        user?.systemRole
      ) ===
        "SUPER_ADMIN" ||
      normalizeValue(
        user?.role
      ) ===
        "SUPER_ADMIN"
    );
  };

/* =========================================================
   ACTIVE DEPARTMENT MEMBERSHIPS
========================================================= */

const getActiveDepartmentMemberships =
  async (
    userId
  ) => {
    if (!userId) {
      return [];
    }

    return DepartmentMembership
      .find({
        user:
          userId,

        status:
          "ACTIVE",
      })
      .populate({
        path:
          "department",

        match: {
          status:
            "ACTIVE",
        },

        select:
          "_id name code slug parentDepartment status",
      })
      .sort({
        isPrimary:
          -1,

        createdAt:
          1,
      })
      .lean();
  };

/* =========================================================
   HR MEMBERSHIP
========================================================= */

const isHrDepartment =
  (
    department
  ) => {
    if (!department) {
      return false;
    }

    const code =
      normalizeValue(
        department.code
      );

    const name =
      normalizeValue(
        department.name
      );

    return (
      HR_DEPARTMENT_CODES.includes(
        code
      ) ||
      HR_DEPARTMENT_NAMES.includes(
        name
      )
    );
  };

const getHrMembership =
  (
    memberships
  ) => {
    return (
      memberships.find(
        (
          membership
        ) =>
          isHrDepartment(
            membership
              ?.department
          )
      ) ||
      null
    );
  };

/* =========================================================
   DEPARTMENT LEADERSHIP
========================================================= */

const isDepartmentLeaderMembership =
  (
    membership
  ) => {
    if (!membership) {
      return false;
    }

    const role =
      normalizeValue(
        membership.role
      );

    return (
      DEPARTMENT_LEADERSHIP_ROLES.includes(
        role
      ) ||
      Boolean(
        membership
          .canManageMembers
      )
    );
  };

/* =========================================================
   EMPLOYEE REPORTING DESCENDANTS

   Returns complete hierarchy below an employee.

   Example:

   HOD
    ├ Manager A
    │  ├ Employee 1
    │  └ Employee 2
    └ Manager B
       └ Employee 3

   HOD sees all 5 records + themselves.
========================================================= */

const getReportingHierarchyIds =
  async (
    rootEmployeeId
  ) => {
    if (
      !rootEmployeeId
    ) {
      return [];
    }

    const rootId =
      String(
        rootEmployeeId
      );

    const employees =
      await Employee
        .find({
          status: {
            $ne:
              "EXITED",
          },
        })
        .select(
          "_id reportsTo"
        )
        .lean();

    const childrenMap =
      new Map();

    for (
      const employee
      of employees
    ) {
      if (
        !employee
          .reportsTo
      ) {
        continue;
      }

      const managerId =
        String(
          employee
            .reportsTo
      );

      if (
        !childrenMap.has(
          managerId
        )
      ) {
        childrenMap.set(
          managerId,
          []
        );
      }

      childrenMap
        .get(
          managerId
        )
        .push(
          employee._id
        );
    }

    const result =
      new Set([
        rootId,
      ]);

    const queue = [
      rootId,
    ];

    while (
      queue.length >
      0
    ) {
      const currentId =
        queue.shift();

      const children =
        childrenMap.get(
          currentId
        ) ||
        [];

      for (
        const childId
        of children
      ) {
        const normalizedChildId =
          String(
            childId
          );

        if (
          result.has(
            normalizedChildId
          )
        ) {
          continue;
        }

        result.add(
          normalizedChildId
        );

        queue.push(
          normalizedChildId
        );
      }
    }

    return Array.from(
      result
    );
  };

/* =========================================================
   DEPARTMENT
========================================================= */

const validateDepartment =
  async (
    departmentId
  ) => {
    if (!departmentId) {
      return null;
    }

    assertValidObjectId(
      departmentId,
      "department ID"
    );

    const department =
      await Department
        .findOne({
          _id:
            departmentId,

          status:
            "ACTIVE",
        });

    if (!department) {
      throw new ApiError(
        400,
        "Department does not exist or is inactive"
      );
    }

    return department;
  };

/* =========================================================
   REPORTING CYCLE
========================================================= */

const assertNoReportingCycle =
  async (
    employeeId,
    managerId
  ) => {
    if (!managerId) {
      return;
    }

    assertValidObjectId(
      managerId,
      "reporting manager ID"
    );

    if (
      employeeId &&
      String(
        employeeId
      ) ===
        String(
          managerId
        )
    ) {
      throw new ApiError(
        400,
        "An employee cannot report to themselves"
      );
    }

    const manager =
      await Employee
        .findById(
          managerId
        )
        .select(
          "_id reportsTo status"
        );

    if (!manager) {
      throw new ApiError(
        400,
        "Reporting manager does not exist"
      );
    }

    if (
      [
        "EXITED",
        "INACTIVE",
      ].includes(
        manager.status
      )
    ) {
      throw new ApiError(
        400,
        "An inactive or exited employee cannot be assigned as reporting manager"
      );
    }

    if (!employeeId) {
      return;
    }

    let currentManager =
      manager;

    const visited =
      new Set();

    while (
      currentManager
    ) {
      const currentId =
        String(
          currentManager._id
        );

      if (
        visited.has(
          currentId
        )
      ) {
        throw new ApiError(
          400,
          "Existing reporting hierarchy contains a cycle"
        );
      }

      visited.add(
        currentId
      );

      if (
        currentId ===
        String(
          employeeId
        )
      ) {
        throw new ApiError(
          400,
          "This reporting manager would create a circular reporting hierarchy"
        );
      }

      if (
        !currentManager
          .reportsTo
      ) {
        break;
      }

      currentManager =
        await Employee
          .findById(
            currentManager
              .reportsTo
          )
          .select(
            "_id reportsTo"
          );
    }
  };

/* =========================================================
   CREATE
========================================================= */

const createEmployee =
  async ({
    payload,
    actorUserId,
  }) => {
    const employeeCode =
      normalizeEmployeeCode(
        payload.employeeCode
      );

    const officialEmail =
      normalizeEmail(
        payload.officialEmail
      );

    const personalEmail =
      normalizeEmail(
        payload.personalEmail
      );

    if (!employeeCode) {
      throw new ApiError(
        400,
        "Employee code is required"
      );
    }

    if (
      !payload
        .fullName
        ?.trim()
    ) {
      throw new ApiError(
        400,
        "Employee name is required"
      );
    }

    if (
      !payload.orgUnitCode
    ) {
      throw new ApiError(
        400,
        "Organisation unit is required"
      );
    }

    if (
      !getOrgUnit(
        payload.orgUnitCode
      )
    ) {
      throw new ApiError(
        400,
        "Invalid organisation unit"
      );
    }

    if (
      !payload
        .designation
        ?.trim()
    ) {
      throw new ApiError(
        400,
        "Designation is required"
      );
    }

    if (
      payload.companyCode &&
      !EMPLOYEE_COMPANY_CODES.includes(
        payload.companyCode
      )
    ) {
      throw new ApiError(
        400,
        "Invalid company"
      );
    }

    if (
      payload.employmentType &&
      !EMPLOYMENT_TYPES.includes(
        payload.employmentType
      )
    ) {
      throw new ApiError(
        400,
        "Invalid employment type"
      );
    }

    if (
      payload.status &&
      !EMPLOYEE_STATUSES.includes(
        payload.status
      )
    ) {
      throw new ApiError(
        400,
        "Invalid employee status"
      );
    }

    if (
      payload.source &&
      !EMPLOYEE_SOURCES.includes(
        payload.source
      )
    ) {
      throw new ApiError(
        400,
        "Invalid employee source"
      );
    }

    await validateDepartment(
      payload.department
    );

    const duplicateEmployeeCode =
      await Employee
        .exists({
          employeeCode,
        });

    if (
      duplicateEmployeeCode
    ) {
      throw new ApiError(
        409,
        "Employee code already exists"
      );
    }

    if (
      officialEmail
    ) {
      const duplicateEmail =
        await Employee
          .exists({
            officialEmail,
          });

      if (
        duplicateEmail
      ) {
        throw new ApiError(
          409,
          "Employee official email already exists"
        );
      }
    }

    await assertNoReportingCycle(
      null,
      payload.reportsTo
    );

    let linkedUser =
      null;

    let createdNewUser =
      false;

    const createLogin =
      payload.createLogin !==
        false &&
      Boolean(
        officialEmail
      );

    if (
      createLogin
    ) {
      if (
        !officialEmail.endsWith(
          `@${env.allowedEmailDomain}`
        )
      ) {
        throw new ApiError(
          400,
          `ERP login email must use @${env.allowedEmailDomain}`
        );
      }

      linkedUser =
        await User
          .findOne({
            email:
              officialEmail,
          });

      if (
        linkedUser
          ?.employee
      ) {
        throw new ApiError(
          409,
          "This user account is already linked to another employee"
        );
      }

      if (
        !linkedUser
      ) {
        const requestedRole =
          payload.systemRole ||
          "EMPLOYEE";

        if (
          !USER_ROLES.includes(
            requestedRole
          )
        ) {
          throw new ApiError(
            400,
            "Invalid system role"
          );
        }

        const userData = {
          displayName:
            payload
              .fullName
              .trim(),

          email:
            officialEmail,

          role:
            requestedRole,

          status:
            "ACTIVE",

          authProviders: [
            "google",
          ],

          emailVerified:
            false,

          createdBy:
            actorUserId,

          updatedBy:
            actorUserId,
        };

        if (
          payload.initialPassword
        ) {
          userData.passwordHash =
            await hashPassword(
              payload
                .initialPassword
            );

          userData
            .authProviders
            .push(
              "local"
            );
        }

        linkedUser =
          await User
            .create(
              userData
            );

        createdNewUser =
          true;
      }
    }

    try {
      const employee =
        await Employee
          .create({
            employeeCode,

            companyCode:
              payload.companyCode ||
              null,

            fullName:
              payload
                .fullName
                .trim(),

            personalEmail,

            officialEmail,

            mobileNumber:
              payload
                .mobileNumber
                ?.trim() ||
              null,

            orgUnitCode:
              payload.orgUnitCode,

            department:
              payload.department ||
              null,

            designation:
              payload
                .designation
                .trim(),

            reportsTo:
              payload.reportsTo ||
              null,

            user:
              linkedUser?._id ||
              null,

            employmentType:
              payload.employmentType ||
              "PERMANENT",

            joiningDate:
              payload.joiningDate ||
              null,

            workLocation:
              payload
                .workLocation
                ?.trim() ||
              null,

            profilePhotoUrl:
              payload
                .profilePhotoUrl
                ?.trim() ||
              null,

            status:
              payload.status ||
              "ACTIVE",

            source:
              payload.source ||
              "MANUAL",

            recruitmentCandidate:
              payload
                .recruitmentCandidate ||
              null,

            recruitmentSelection:
              payload
                .recruitmentSelection ||
              null,

            recruitmentJoining:
              payload
                .recruitmentJoining ||
              null,

            onboarding:
              payload.onboarding ||
              null,

            createdBy:
              actorUserId,

            updatedBy:
              actorUserId,
          });

      if (
        linkedUser
      ) {
        linkedUser.employee =
          employee._id;

        linkedUser.displayName =
          employee.fullName;

        linkedUser.updatedBy =
          actorUserId;

        await linkedUser.save();
      }

      return getEmployeeById(
        employee._id
      );
    } catch (
      error
    ) {
      if (
        createdNewUser &&
        linkedUser
      ) {
        await User
          .findByIdAndDelete(
            linkedUser._id
          )
          .catch(
            () => {}
          );
      }

      throw error;
    }
  };

/* =========================================================
   GET BY ID
========================================================= */

const getEmployeeById =
  async (
    employeeId
  ) => {
    assertValidObjectId(
      employeeId,
      "employee ID"
    );

    const employee =
      await Employee
        .findById(
          employeeId
        )
        .populate({
          path:
            "reportsTo",

          select:
            "employeeCode fullName designation orgUnitCode companyCode",
        })
        .populate({
          path:
            "department",

          select:
            "name code slug status",
        })
        .populate({
          path:
            "user",

          select:
            "email role systemRole status lastLoginAt authProviders",
        })
        .populate({
          path:
            "onboarding",

          select:
            "status companyCode employeeCode startedAt employeeCreatedAt completedAt checklist",
        })
        .lean();

    if (!employee) {
      throw new ApiError(
        404,
        "Employee not found"
      );
    }

    return {
      ...employee,

      orgUnit:
        getOrgUnit(
          employee
            .orgUnitCode
        ),
    };
  };

/* =========================================================
   ACCESS SCOPE

   AUTHORITATIVE EMPLOYEE VISIBILITY

   Priority:

   1. SUPER_ADMIN
        ALL

   2. HR member
        ALL employee directory records

      IMPORTANT:
      This DOES NOT mean normal HR may onboard everybody.
      Onboarding action authority belongs in onboarding
      service and will be assigned-HR-aware.

   3. Department HOD / Department Admin
        SELF + full reporting hierarchy

   4. Legacy HEAD / MANAGER
        SELF + full reporting hierarchy

   5. Explicit TEAM
        SELF + full reporting hierarchy

   6. Explicit DEPARTMENT
        Organisation unit + child units

   7. SELF
        SELF only
========================================================= */

const applyEmployeeAccessScope =
  async ({
    filter,
    accessContext,
  }) => {
    if (
      !accessContext
    ) {
      return filter;
    }

    const {
      scope,
      user,
    } =
      accessContext;

    if (!user) {
      throw new ApiError(
        403,
        "Authenticated user is required"
      );
    }

    const normalizedScope =
      normalizeValue(
        scope
      );

    const baseRole =
      normalizeValue(
        user.role
      );

    /* =====================================================
       1. GLOBAL SUPER ADMIN
    ===================================================== */

    if (
      isGlobalSuperAdmin(
        user
      )
    ) {
      return filter;
    }

    /* =====================================================
       DEPARTMENT MEMBERSHIPS

       DepartmentMembership is authoritative.
    ===================================================== */

    const memberships =
      await getActiveDepartmentMemberships(
        user._id
      );

    const hrMembership =
      getHrMembership(
        memberships
      );

    /* =====================================================
       2. HR

       Any active HR department member may VIEW the company
       Employee Directory.

       Onboarding mutation/access will be restricted in the
       onboarding service:

       HR MEMBER
         → assigned hiring only

       HR HOD / ADMIN
         → all onboarding

       SUPER_ADMIN
         → all onboarding
    ===================================================== */

    if (
      hrMembership
    ) {
      return filter;
    }

    /* =====================================================
       EVERYTHING BELOW NEEDS EMPLOYEE PROFILE
    ===================================================== */

    if (
      !user.employee
    ) {
      throw new ApiError(
        403,
        "Your user account is not linked to an employee profile"
      );
    }

    const currentEmployee =
      await Employee
        .findById(
          user.employee
        )
        .select(
          "_id orgUnitCode department reportsTo status"
        )
        .lean();

    if (
      !currentEmployee
    ) {
      throw new ApiError(
        403,
        "Employee profile not found"
      );
    }

    /* =====================================================
       3. DEPARTMENT HEAD / ADMIN

       They see their entire reporting hierarchy.

       We intentionally prefer actual reportsTo hierarchy
       rather than blindly exposing everybody in the same
       department.
    ===================================================== */

    const leadershipMemberships =
      memberships.filter(
        isDepartmentLeaderMembership
      );

    if (
      leadershipMemberships.length >
      0
    ) {
      const hierarchyIds =
        await getReportingHierarchyIds(
          currentEmployee._id
        );

      filter._id = {
        $in:
          hierarchyIds,
      };

      return filter;
    }

    /* =====================================================
       4. LEGACY HEAD / MANAGER

       Compatibility for older employee/user data where
       DepartmentMembership leadership may not yet exist.
    ===================================================== */

    if (
      [
        "HEAD",
        "MANAGER",
      ].includes(
        baseRole
      )
    ) {
      const hierarchyIds =
        await getReportingHierarchyIds(
          currentEmployee._id
        );

      filter._id = {
        $in:
          hierarchyIds,
      };

      return filter;
    }

    /* =====================================================
       5. TEAM

       Complete reporting branch, not only direct reports.
    ===================================================== */

    if (
      normalizedScope ===
      "TEAM"
    ) {
      const hierarchyIds =
        await getReportingHierarchyIds(
          currentEmployee._id
        );

      filter._id = {
        $in:
          hierarchyIds,
      };

      return filter;
    }

    /* =====================================================
       6. DEPARTMENT

       Generic DEPARTMENT permission still works for users
       explicitly configured for department visibility.

       This uses configured organisation hierarchy.
    ===================================================== */

    if (
      normalizedScope ===
      "DEPARTMENT"
    ) {
      filter.orgUnitCode = {
        $in: [
          currentEmployee
            .orgUnitCode,

          ...getDescendantCodes(
            currentEmployee
              .orgUnitCode
          ),
        ],
      };

      return filter;
    }

    /* =====================================================
       IMPORTANT:
       Do NOT let generic ALL accidentally bypass hierarchy
       for ordinary users.

       ALL is accepted only when authority is actually
       global/HR above.

       For ordinary employees, stale ALL falls back safely
       to SELF.
    ===================================================== */

    if (
      normalizedScope ===
      "ALL"
    ) {
      filter._id =
        currentEmployee._id;

      return filter;
    }

    /* =====================================================
       7. SELF / DEFAULT
    ===================================================== */

    if (
      normalizedScope ===
        "SELF" ||
      !normalizedScope
    ) {
      filter._id =
        currentEmployee._id;

      return filter;
    }

    throw new ApiError(
      403,
      "No employee data access"
    );
  };

/* =========================================================
   LIST
========================================================= */

const listEmployees =
  async ({
    page =
      1,

    limit =
      20,

    search,

    companyCode,

    orgUnitCode,

    department,

    includeChildUnits =
      false,

    status,

    employmentType,

    reportsTo,

    source,

    accessContext,
  }) => {
    page =
      Math.max(
        Number(
          page
        ) ||
        1,
        1
      );

    limit =
      Math.min(
        Math.max(
          Number(
            limit
          ) ||
          20,
          1
        ),
        100
      );

    const filter = {};

    if (
      companyCode
    ) {
      filter.companyCode =
        normalizeValue(
          companyCode
        );
    }

    if (
      status
    ) {
      filter.status =
        normalizeValue(
          status
        );
    }

    if (
      source
    ) {
      filter.source =
        normalizeValue(
          source
        );
    }

    if (
      employmentType
    ) {
      filter.employmentType =
        normalizeValue(
          employmentType
        );
    }

    if (
      department
    ) {
      assertValidObjectId(
        department,
        "department ID"
      );

      filter.department =
        department;
    }

    if (
      reportsTo
    ) {
      assertValidObjectId(
        reportsTo,
        "reporting manager ID"
      );

      filter.reportsTo =
        reportsTo;
    }

    if (
      orgUnitCode
    ) {
      if (
        !getOrgUnit(
          orgUnitCode
        )
      ) {
        throw new ApiError(
          400,
          "Invalid organisation unit"
        );
      }

      if (
        String(
          includeChildUnits
        ) ===
        "true"
      ) {
        filter.orgUnitCode = {
          $in: [
            orgUnitCode,

            ...getDescendantCodes(
              orgUnitCode
            ),
          ],
        };
      } else {
        filter.orgUnitCode =
          orgUnitCode;
      }
    }

    if (
      search?.trim()
    ) {
      const escapedSearch =
        search
          .trim()
          .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );

      const regex =
        new RegExp(
          escapedSearch,
          "i"
        );

      filter.$or = [
        {
          fullName:
            regex,
        },
        {
          employeeCode:
            regex,
        },
        {
          officialEmail:
            regex,
        },
        {
          personalEmail:
            regex,
        },
        {
          designation:
            regex,
        },
        {
          mobileNumber:
            regex,
        },
      ];
    }

    /* =====================================================
       APPLY AUTHORITATIVE VISIBILITY
    ===================================================== */

    await applyEmployeeAccessScope({
      filter,

      accessContext,
    });

    const skip =
      (
        page -
        1
      ) *
      limit;

    const [
      employees,
      total,
    ] =
      await Promise.all([
        Employee
          .find(
            filter
          )
          .populate({
            path:
              "reportsTo",

            select:
              "employeeCode fullName designation",
          })
          .populate({
            path:
              "department",

            select:
              "name code",
          })
          .populate({
            path:
              "user",

            select:
              "role systemRole status lastLoginAt",
          })
          .populate({
            path:
              "onboarding",

            select:
              "status companyCode employeeCode startedAt employeeCreatedAt completedAt checklist",
          })
          .sort({
            status:
              1,

            fullName:
              1,
          })
          .skip(
            skip
          )
          .limit(
            limit
          )
          .lean(),

        Employee
          .countDocuments(
            filter
          ),
      ]);

    const data =
      employees.map(
        (
          employee
        ) => ({
          ...employee,

          orgUnit:
            getOrgUnit(
              employee
                .orgUnitCode
            ),
        })
      );

    return {
      employees:
        data,

      pagination: {
        page,

        limit,

        total,

        pages:
          Math.max(
            1,
            Math.ceil(
              total /
              limit
            )
          ),
      },
    };
  };

/* =========================================================
   UPDATE
========================================================= */

const updateEmployee =
  async ({
    employeeId,
    payload,
    actorUserId,
  }) => {
    const employee =
      await ensureEmployeeExists(
        employeeId
      );

    if (
      payload.orgUnitCode &&
      !getOrgUnit(
        payload.orgUnitCode
      )
    ) {
      throw new ApiError(
        400,
        "Invalid organisation unit"
      );
    }

    if (
      payload.companyCode &&
      !EMPLOYEE_COMPANY_CODES.includes(
        payload.companyCode
      )
    ) {
      throw new ApiError(
        400,
        "Invalid company"
      );
    }

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          payload,
          "department"
        )
    ) {
      await validateDepartment(
        payload.department
      );
    }

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          payload,
          "reportsTo"
        )
    ) {
      await assertNoReportingCycle(
        employee._id,
        payload.reportsTo
      );
    }

    if (
      payload.employeeCode
    ) {
      const employeeCode =
        normalizeEmployeeCode(
          payload.employeeCode
        );

      const duplicate =
        await Employee
          .exists({
            employeeCode,

            _id: {
              $ne:
                employee._id,
            },
          });

      if (
        duplicate
      ) {
        throw new ApiError(
          409,
          "Employee code already exists"
        );
      }

      employee.employeeCode =
        employeeCode;
    }

    if (
      payload.fullName !==
      undefined
    ) {
      if (
        !payload
          .fullName
          ?.trim()
      ) {
        throw new ApiError(
          400,
          "Employee name cannot be empty"
        );
      }

      employee.fullName =
        payload
          .fullName
          .trim();
    }

    if (
      payload.personalEmail !==
      undefined
    ) {
      employee.personalEmail =
        normalizeEmail(
          payload.personalEmail
        );
    }

    if (
      payload.officialEmail !==
      undefined
    ) {
      const email =
        normalizeEmail(
          payload.officialEmail
        );

      if (
        email
      ) {
        const duplicate =
          await Employee
            .exists({
              officialEmail:
                email,

              _id: {
                $ne:
                  employee._id,
              },
            });

        if (
          duplicate
        ) {
          throw new ApiError(
            409,
            "Employee official email already exists"
          );
        }
      }

      if (
        employee.user &&
        email !==
          employee
            .officialEmail
      ) {
        throw new ApiError(
          400,
          "Official email cannot be changed while a login account is linked. Change the user account email through User Administration."
        );
      }

      employee.officialEmail =
        email;
    }

    const allowedFields = [
      "companyCode",
      "mobileNumber",
      "orgUnitCode",
      "department",
      "designation",
      "reportsTo",
      "employmentType",
      "joiningDate",
      "workLocation",
      "profilePhotoUrl",
      "status",
      "exitDate",
    ];

    for (
      const field
      of allowedFields
    ) {
      if (
        Object.prototype
          .hasOwnProperty
          .call(
            payload,
            field
          )
      ) {
        employee[field] =
          payload[field] ===
          ""
            ? null
            : payload[field];
      }
    }

    employee.updatedBy =
      actorUserId;

    await employee.save();

    if (
      employee.user
    ) {
      await User
        .findByIdAndUpdate(
          employee.user,
          {
            displayName:
              employee.fullName,

            updatedBy:
              actorUserId,
          }
        );
    }

    return getEmployeeById(
      employee._id
    );
  };

/* =========================================================
   DEACTIVATE / EXIT
========================================================= */

const deactivateEmployee =
  async ({
    employeeId,
    actorUserId,
    exitDate,
  }) => {
    const employee =
      await ensureEmployeeExists(
        employeeId
      );

    const directReports =
      await Employee
        .countDocuments({
          reportsTo:
            employee._id,

          status: {
            $in: [
              "ACTIVE",
              "NOTICE_PERIOD",
              "ONBOARDING",
            ],
          },
        });

    if (
      directReports >
      0
    ) {
      throw new ApiError(
        409,
        `This employee has ${directReports} active direct report(s). Reassign them before exiting the employee.`
      );
    }

    employee.status =
      "EXITED";

    employee.exitDate =
      exitDate ||
      new Date();

    employee.updatedBy =
      actorUserId;

    await employee.save();

    if (
      employee.user
    ) {
      await User
        .findByIdAndUpdate(
          employee.user,
          {
            status:
              "INACTIVE",

            updatedBy:
              actorUserId,
          }
        );
    }

    return getEmployeeById(
      employee._id
    );
  };

/* =========================================================
   DIRECT REPORTS
========================================================= */

const getDirectReports =
  async (
    employeeId
  ) => {
    await ensureEmployeeExists(
      employeeId
    );

    return Employee
      .find({
        reportsTo:
          employeeId,

        status: {
          $ne:
            "EXITED",
        },
      })
      .select(
        "employeeCode fullName designation orgUnitCode department companyCode workLocation status"
      )
      .populate(
        "department",
        "name code"
      )
      .sort({
        fullName:
          1,
      })
      .lean();
  };

/* =========================================================
   REPORTING TREE
========================================================= */

const getReportingTree =
  async (
    employeeId
  ) => {
    const root =
      await getEmployeeById(
        employeeId
      );

    const employees =
      await Employee
        .find({
          status: {
            $ne:
              "EXITED",
          },
        })
        .select(
          "employeeCode fullName designation orgUnitCode department reportsTo status companyCode"
        )
        .populate(
          "department",
          "name code"
        )
        .lean();

    const childrenMap =
      new Map();

    for (
      const employee
      of employees
    ) {
      if (
        !employee.reportsTo
      ) {
        continue;
      }

      const managerId =
        String(
          employee.reportsTo
        );

      if (
        !childrenMap.has(
          managerId
        )
      ) {
        childrenMap.set(
          managerId,
          []
        );
      }

      childrenMap
        .get(
          managerId
        )
        .push(
          employee
        );
    }

    const build =
      (
        currentId,
        visited =
          new Set()
      ) => {
        if (
          visited.has(
            String(
              currentId
            )
          )
        ) {
          return [];
        }

        const nextVisited =
          new Set(
            visited
          );

        nextVisited.add(
          String(
            currentId
          )
        );

        return (
          childrenMap.get(
            String(
              currentId
            )
          ) ||
          []
        ).map(
          (
            employee
          ) => ({
            ...employee,

            orgUnit:
              getOrgUnit(
                employee
                  .orgUnitCode
              ),

            reports:
              build(
                employee._id,
                nextVisited
              ),
          })
        );
      };

    return {
      employee:
        root,

      reports:
        build(
          employeeId
        ),
    };
  };

/* =========================================================
   ORGANIZATION TREE
========================================================= */

const getOrganizationTree =
  async () => {
    const structure =
      buildOrganizationStructure();

    const employees =
      await Employee
        .find({
          status: {
            $ne:
              "EXITED",
          },
        })
        .select(
          "employeeCode fullName designation orgUnitCode department reportsTo status workLocation companyCode"
        )
        .populate(
          "department",
          "name code"
        )
        .sort({
          fullName:
            1,
        })
        .lean();

    const employeesByUnit =
      new Map();

    for (
      const employee
      of employees
    ) {
      if (
        !employeesByUnit.has(
          employee
            .orgUnitCode
        )
      ) {
        employeesByUnit.set(
          employee
            .orgUnitCode,
          []
        );
      }

      employeesByUnit
        .get(
          employee
            .orgUnitCode
        )
        .push(
          employee
        );
    }

    const attachEmployees =
      (
        node
      ) => ({
        ...node,

        employees:
          employeesByUnit.get(
            node.code
          ) ||
          [],

        children:
          node.children.map(
            attachEmployees
          ),
      });

    return structure.map(
      attachEmployees
    );
  };

/* =========================================================
   LINK EXISTING USER
========================================================= */

const linkUserAccount =
  async ({
    employeeId,
    userId,
    actorUserId,
  }) => {
    const employee =
      await ensureEmployeeExists(
        employeeId
      );

    assertValidObjectId(
      userId,
      "user ID"
    );

    const user =
      await User
        .findById(
          userId
        );

    if (!user) {
      throw new ApiError(
        404,
        "User account not found"
      );
    }

    if (
      employee.user &&
      String(
        employee.user
      ) !==
        String(
          user._id
        )
    ) {
      throw new ApiError(
        409,
        "Employee is already linked to another user account"
      );
    }

    if (
      user.employee &&
      String(
        user.employee
      ) !==
        String(
          employee._id
        )
    ) {
      throw new ApiError(
        409,
        "User account is already linked to another employee"
      );
    }

    employee.user =
      user._id;

    employee.updatedBy =
      actorUserId;

    user.employee =
      employee._id;

    user.displayName =
      employee.fullName;

    user.updatedBy =
      actorUserId;

    await employee.save();

    await user.save();

    return getEmployeeById(
      employee._id
    );
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  createEmployee,

  getEmployeeById,

  listEmployees,

  updateEmployee,

  deactivateEmployee,

  getDirectReports,

  getReportingTree,

  getOrganizationTree,

  linkUserAccount,

  /*
   * Reused by onboarding/account services.
   */
  assertNoReportingCycle,

  /*
   * Useful for later hierarchy-aware APIs.
   */
  getReportingHierarchyIds,
};
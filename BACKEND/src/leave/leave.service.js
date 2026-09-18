const mongoose = require("mongoose");

const {
  LeaveType,
} = require("./leaveType.model");

const {
  LeavePolicy,
} = require("./leavePolicy.model");

const LeaveBalance =
  require("./leaveBalance.model");

const {
  LeaveBalanceTransaction,
} = require("./leaveBalanceTransaction.model");

const {
  LeaveRequest,
} = require("./leaveRequest.model");

const {
  LeaveApproval,
} = require("./leaveApproval.model");

/*
 * IMPORTANT:
 * Update ONLY these import paths if your Employee model
 * lives somewhere else.
 */
const {
  Employee,
} =
  require("../employee/employee.model");

/* =========================================================
   CONSTANTS
========================================================= */

const ACTIVE_REQUEST_STATUSES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "RETURNED",
  "CANCEL_REQUESTED",
];

const PENDING_REQUEST_STATUSES = [
  "PENDING_APPROVAL",
  "RETURNED",
];

const FINAL_REQUEST_STATUSES = [
  "REJECTED",
  "CANCELLED",
  "AVAILED",
];

const GLOBAL_ROLES = [
  "SUPER_ADMIN",
];

const HR_ORG_UNIT_CODES = [
  "HR",
  "HUMAN_RESOURCES",
  "HUMAN RESOURCE",
  "HUMAN RESOURCES",
];

/* =========================================================
   ERROR HELPER
========================================================= */

const createServiceError = (
  message,
  statusCode = 400,
  code = "LEAVE_ERROR"
) => {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  error.code =
    code;

  return error;
};

/* =========================================================
   GENERIC HELPERS
========================================================= */

const normalizeId = (
  value
) => {
  if (!value) return "";

  if (
    typeof value === "object" &&
    value._id
  ) {
    return String(
      value._id
    );
  }

  return String(value);
};

const normalizeText = (
  value
) =>
  String(value || "")
    .trim();

const normalizeUpper = (
  value
) =>
  normalizeText(value)
    .toUpperCase();

const isValidObjectId = (
  value
) =>
  mongoose.Types.ObjectId
    .isValid(value);

const todayDateOnly = () =>
  new Date()
    .toISOString()
    .slice(0, 10);

const getYearFromDate = (
  value
) => {
  const year =
    Number(
      String(value || "")
        .slice(0, 4)
    );

  if (
    !Number.isInteger(year)
  ) {
    throw createServiceError(
      "Invalid leave date."
    );
  }

  return year;
};

const isDateOnly = (
  value
) =>
  /^\d{4}-\d{2}-\d{2}$/
    .test(
      String(value || "")
    );

const dateOnlyToUtc = (
  value
) => {
  if (!isDateOnly(value)) {
    return null;
  }

  const date =
    new Date(
      `${value}T00:00:00.000Z`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
};

const addDays = (
  value,
  days
) => {
  const date =
    dateOnlyToUtc(value);

  if (!date) return null;

  date.setUTCDate(
    date.getUTCDate() +
      Number(days || 0)
  );

  return date
    .toISOString()
    .slice(0, 10);
};

const differenceInDays = (
  fromDate,
  toDate
) => {
  const from =
    dateOnlyToUtc(
      fromDate
    );

  const to =
    dateOnlyToUtc(
      toDate
    );

  if (!from || !to) {
    throw createServiceError(
      "Invalid leave date range."
    );
  }

  return Math.floor(
    (
      to.getTime() -
      from.getTime()
    ) /
      86400000
  );
};

const calculateCalendarDays = ({
  fromDate,
  toDate,
  durationType,
}) => {
  const difference =
    differenceInDays(
      fromDate,
      toDate
    );

  if (difference < 0) {
    throw createServiceError(
      "Leave end date cannot be before the start date."
    );
  }

  if (
    durationType ===
      "FIRST_HALF" ||
    durationType ===
      "SECOND_HALF"
  ) {
    if (
      fromDate !==
      toDate
    ) {
      throw createServiceError(
        "Half-day leave can only be applied for a single date."
      );
    }

    return 0.5;
  }

  return difference + 1;
};

const calculateAvailableBalance = (
  balance
) => {
  return (
    Number(
      balance.openingBalance ||
        0
    ) +
    Number(
      balance.carriedForward ||
        0
    ) +
    Number(
      balance.accrued ||
        0
    ) +
    Number(
      balance.adjustment ||
        0
    ) -
    Number(
      balance.used ||
        0
    ) -
    Number(
      balance.pending ||
        0
    ) -
    Number(
      balance.expired ||
        0
    )
  );
};

/* =========================================================
   AUTH / ACTOR HELPERS
========================================================= */

const getUserId = (
  user
) =>
  normalizeId(
    user?._id ||
      user?.id ||
      user?.userId
  );

const getSystemRole = (
  user
) =>
  normalizeUpper(
    user?.systemRole ||
      user?.role
  );

const isGlobalSuperAdmin = (
  user
) =>
  GLOBAL_ROLES.includes(
    getSystemRole(user)
  );

const hasPermission = (
  user,
  permission
) => {
  if (
    isGlobalSuperAdmin(
      user
    )
  ) {
    return true;
  }

  const permissions =
    Array.isArray(
      user?.permissions
    )
      ? user.permissions
      : [];

  return permissions.includes(
    permission
  );
};

/* =========================================================
   EMPLOYEE RESOLUTION
========================================================= */

const findEmployeeForUser =
  async (
    user
  ) => {
    const userId =
      getUserId(user);

    if (!userId) {
      throw createServiceError(
        "Authenticated user could not be resolved.",
        401,
        "UNAUTHENTICATED"
      );
    }

    const employee =
      await Employee
        .findOne({
          user: userId,
          status: "ACTIVE",
        })
        .lean();

    if (!employee) {
      throw createServiceError(
        "Active employee profile could not be found.",
        403,
        "EMPLOYEE_PROFILE_REQUIRED"
      );
    }

    return employee;
  };

const findEmployeeById =
  async (
    employeeId
  ) => {
    if (
      !isValidObjectId(
        employeeId
      )
    ) {
      throw createServiceError(
        "Invalid employee."
      );
    }

    const employee =
      await Employee
        .findById(
          employeeId
        )
        .lean();

    if (!employee) {
      throw createServiceError(
        "Employee not found.",
        404,
        "EMPLOYEE_NOT_FOUND"
      );
    }

    return employee;
  };

/* =========================================================
   HIERARCHY
========================================================= */

const getDirectReports =
  async (
    managerEmployeeId
  ) => {
    return Employee
      .find({
        reportsTo:
          managerEmployeeId,

        status:
          "ACTIVE",
      })
      .select(
        "_id employeeCode fullName officialEmail designation orgUnitCode reportsTo user status"
      )
      .lean();
  };

const getReportingSubtreeIds =
  async (
    rootEmployeeId
  ) => {
    const rootId =
      normalizeId(
        rootEmployeeId
      );

    const visited =
      new Set();

    const result =
      [];

    let currentLevel = [
      rootId,
    ];

    while (
      currentLevel.length
    ) {
      const validCurrent =
        currentLevel.filter(
          (id) =>
            id &&
            !visited.has(
              id
            )
        );

      if (
        !validCurrent.length
      ) {
        break;
      }

      validCurrent.forEach(
        (id) =>
          visited.add(id)
      );

      const employees =
        await Employee
          .find({
            reportsTo: {
              $in:
                validCurrent,
            },

            status:
              "ACTIVE",
          })
          .select(
            "_id"
          )
          .lean();

      const nextLevel =
        employees
          .map(
            (employee) =>
              normalizeId(
                employee._id
              )
          )
          .filter(
            (id) =>
              id &&
              !visited.has(
                id
              )
          );

      result.push(
        ...nextLevel
      );

      currentLevel =
        nextLevel;
    }

    return [
      ...new Set(
        result
      ),
    ];
  };

/*
 * Department authority should ultimately come from your
 * existing DepartmentMembership service/model.
 *
 * Until that helper is wired here, this function only uses
 * explicit authority already present on req.user.
 *
 * Do NOT derive department-head authority merely from
 * Employee.orgUnitCode.
 */
const getAuthorizedOrgUnitCodes = (
  user
) => {
  const candidates = [
    ...(Array.isArray(
      user
        ?.authorizedOrgUnitCodes
    )
      ? user
          .authorizedOrgUnitCodes
      : []),

    ...(Array.isArray(
      user
        ?.orgUnitCodes
    )
      ? user.orgUnitCodes
      : []),

    ...(Array.isArray(
      user
        ?.departmentMemberships
    )
      ? user
          .departmentMemberships
          .filter(
            (membership) =>
              [
                "HEAD",
                "HOD",
              ].includes(
                normalizeUpper(
                  membership
                    ?.role
                )
              )
          )
          .map(
            (membership) =>
              membership
                ?.orgUnitCode
          )
      : []),
  ];

  return [
    ...new Set(
      candidates
        .map(
          normalizeUpper
        )
        .filter(Boolean)
    ),
  ];
};

const hasGlobalLeaveView = (
  user
) =>
  isGlobalSuperAdmin(user) ||
  hasPermission(
    user,
    "LEAVE_VIEW_ALL"
  );

const hasGlobalLeaveAdmin = (
  user
) =>
  isGlobalSuperAdmin(user) ||
  hasPermission(
    user,
    "LEAVE_MANAGE_POLICY"
  ) ||
  hasPermission(
    user,
    "LEAVE_MANAGE_BALANCE"
  ) ||
  hasPermission(
    user,
    "LEAVE_ADJUST_BALANCE"
  );

/* =========================================================
   SCOPE BUILDER
========================================================= */

const buildLeaveVisibilityScope =
  async ({
    user,
    actorEmployee,
    includeSelf = true,
  }) => {
    if (
      hasGlobalLeaveView(
        user
      )
    ) {
      return {};
    }

    const clauses = [];

    if (
      includeSelf &&
      actorEmployee?._id
    ) {
      clauses.push({
        employeeId:
          actorEmployee._id,
      });
    }

    if (
      hasPermission(
        user,
        "LEAVE_VIEW_TEAM"
      ) ||
      hasPermission(
        user,
        "LEAVE_APPROVE_TEAM"
      )
    ) {
      const teamIds =
        await getReportingSubtreeIds(
          actorEmployee._id
        );

      if (
        teamIds.length
      ) {
        clauses.push({
          employeeId: {
            $in:
              teamIds,
          },
        });
      }
    }

    if (
      hasPermission(
        user,
        "LEAVE_VIEW_DEPARTMENT"
      )
    ) {
      const orgUnitCodes =
        getAuthorizedOrgUnitCodes(
          user
        );

      if (
        orgUnitCodes.length
      ) {
        clauses.push({
          orgUnitCode: {
            $in:
              orgUnitCodes,
          },
        });
      }
    }

    if (!clauses.length) {
      return {
        employeeId:
          actorEmployee._id,
      };
    }

    if (
      clauses.length === 1
    ) {
      return clauses[0];
    }

    return {
      $or:
        clauses,
    };
  };

/* =========================================================
   REQUEST NUMBER
========================================================= */

const generateRequestNumber =
  async () => {
    const year =
      new Date()
        .getFullYear();

    for (
      let attempt = 0;
      attempt < 10;
      attempt += 1
    ) {
      const random =
        Math.floor(
          100000 +
            Math.random() *
              900000
        );

      const requestNumber =
        `LV-${year}-${random}`;

      const exists =
        await LeaveRequest
          .exists({
            requestNumber,
          });

      if (!exists) {
        return requestNumber;
      }
    }

    return `LV-${year}-${Date.now()}`;
  };

/* =========================================================
   LEAVE TYPE / POLICY
========================================================= */

const getLeaveTypes =
  async () => {
    return LeaveType
      .find({
        active: true,
      })
      .sort({
        displayOrder: 1,
        name: 1,
      })
      .lean();
  };

const getApplicablePolicy =
  async ({
    leaveTypeId,
    employee,
    date,
  }) => {
    const targetDate =
      date ||
      todayDateOnly();

    const policies =
      await LeavePolicy
        .find({
          leaveTypeId,

          active:
            true,

          effectiveFrom: {
            $lte:
              targetDate,
          },

          $or: [
            {
              effectiveTo:
                null,
            },

            {
              effectiveTo:
                "",
            },

            {
              effectiveTo: {
                $gte:
                  targetDate,
              },
            },
          ],
        })
        .sort({
          effectiveFrom:
            -1,
        })
        .lean();

    const employeeOrgUnit =
      normalizeUpper(
        employee
          ?.orgUnitCode
      );

    const employeeType =
      normalizeUpper(
        employee
          ?.employmentType
      );

    const employeeGender =
      normalizeUpper(
        employee
          ?.gender
      );

    const policy =
      policies.find(
        (item) => {
          const orgUnits =
            (
              item
                .eligibleOrgUnitCodes ||
              []
            )
              .map(
                normalizeUpper
              )
              .filter(
                Boolean
              );

          const employmentTypes =
            (
              item
                .eligibleEmploymentTypes ||
              []
            )
              .map(
                normalizeUpper
              )
              .filter(
                Boolean
              );

          const gender =
            normalizeUpper(
              item
                .genderEligibility ||
                "ALL"
            );

          const orgUnitAllowed =
            !orgUnits.length ||
            orgUnits.includes(
              employeeOrgUnit
            );

          const employmentAllowed =
            !employmentTypes.length ||
            employmentTypes.includes(
              employeeType
            );

          const genderAllowed =
            gender === "ALL" ||
            gender ===
              employeeGender;

          return (
            orgUnitAllowed &&
            employmentAllowed &&
            genderAllowed
          );
        }
      );

    if (!policy) {
      throw createServiceError(
        "No applicable leave policy is configured for this employee.",
        400,
        "LEAVE_POLICY_NOT_FOUND"
      );
    }

    return policy;
  };

/* =========================================================
   BALANCE
========================================================= */

const getOrCreateBalance =
  async ({
    employeeId,
    leaveTypeId,
    year,
    userId = null,
  }) => {
    let balance =
      await LeaveBalance
        .findOne({
          employeeId,
          leaveTypeId,
          year,
        });

    if (balance) {
      return balance;
    }

    balance =
      await LeaveBalance
        .create({
          employeeId,
          leaveTypeId,
          year,

          openingBalance:
            0,

          carriedForward:
            0,

          accrued:
            0,

          adjustment:
            0,

          used:
            0,

          pending:
            0,

          expired:
            0,

          available:
            0,

          createdBy:
            userId ||
            null,

          updatedBy:
            userId ||
            null,
        });

    return balance;
  };

const recalculateBalance =
  async (
    balance
  ) => {
    balance.available =
      calculateAvailableBalance(
        balance
      );

    balance.lastCalculatedAt =
      new Date();

    await balance.save();

    return balance;
  };

const getMyBalances =
  async ({
    user,
    year,
  }) => {
    const employee =
      await findEmployeeForUser(
        user
      );

    const selectedYear =
      Number(
        year ||
          new Date()
            .getFullYear()
      );

    const balances =
      await LeaveBalance
        .find({
          employeeId:
            employee._id,

          year:
            selectedYear,
        })
        .populate(
          "leaveTypeId",
          "code name shortName category isPaid allowHalfDay"
        )
        .sort({
          createdAt: 1,
        })
        .lean();

    return {
      employee,
      year:
        selectedYear,
      balances,
    };
  };

/* =========================================================
   OVERLAP VALIDATION
========================================================= */

const assertNoOverlap =
  async ({
    employeeId,
    fromDate,
    toDate,
    excludeRequestId = null,
  }) => {
    const query = {
      employeeId,

      status: {
        $in:
          ACTIVE_REQUEST_STATUSES,
      },

      fromDate: {
        $lte:
          toDate,
      },

      toDate: {
        $gte:
          fromDate,
      },
    };

    if (
      excludeRequestId
    ) {
      query._id = {
        $ne:
          excludeRequestId,
      };
    }

    const existing =
      await LeaveRequest
        .findOne(query)
        .select(
          "_id requestNumber fromDate toDate status"
        )
        .lean();

    if (existing) {
      throw createServiceError(
        `Leave overlaps with ${existing.requestNumber}.`,
        409,
        "LEAVE_OVERLAP"
      );
    }
  };

/* =========================================================
   APPROVER RESOLUTION
========================================================= */

const resolveApprover =
  async (
    employee
  ) => {
    const reportsToId =
      normalizeId(
        employee
          ?.reportsTo
      );

    if (!reportsToId) {
      return null;
    }

    const manager =
      await Employee
        .findOne({
          _id:
            reportsToId,

          status:
            "ACTIVE",
        })
        .select(
          "_id employeeCode fullName designation orgUnitCode user"
        )
        .lean();

    if (!manager) {
      return null;
    }

    return manager;
  };

const buildApproverSnapshot = (
  employee
) => {
  if (!employee) {
    return null;
  }

  return {
    employeeId:
      employee._id,

    employeeCode:
      employee
        .employeeCode ||
      "",

    name:
      employee.fullName ||
      employee.name ||
      "",

    designation:
      employee.designation ||
      "",

    orgUnitCode:
      employee.orgUnitCode ||
      "",
  };
};

/* =========================================================
   POLICY VALIDATION
========================================================= */

const validateRequestAgainstPolicy =
  async ({
    employee,
    leaveType,
    policy,
    fromDate,
    toDate,
    durationType,
    totalDays,
    emergency,
    attachments,
    balance,
  }) => {
    if (
      !isDateOnly(
        fromDate
      ) ||
      !isDateOnly(
        toDate
      )
    ) {
      throw createServiceError(
        "Leave dates must use YYYY-MM-DD format."
      );
    }

    if (
      fromDate >
      toDate
    ) {
      throw createServiceError(
        "Leave end date cannot be before the start date."
      );
    }

    if (
      totalDays <
      Number(
        policy.minLeaveDays ||
          0.5
      )
    ) {
      throw createServiceError(
        `Minimum leave duration is ${policy.minLeaveDays || 0.5} day(s).`
      );
    }

    if (
      policy
        .maxConsecutiveDays &&
      totalDays >
        Number(
          policy
            .maxConsecutiveDays
        )
    ) {
      throw createServiceError(
        `Maximum consecutive leave allowed is ${policy.maxConsecutiveDays} day(s).`
      );
    }

    if (
      (
        durationType ===
          "FIRST_HALF" ||
        durationType ===
          "SECOND_HALF"
      ) &&
      !policy.allowHalfDay
    ) {
      throw createServiceError(
        `${leaveType.name} does not allow half-day leave.`
      );
    }

    if (
      Number(
        policy
          .advanceNoticeDays ||
          0
      ) > 0 &&
      !emergency
    ) {
      const earliestDate =
        addDays(
          todayDateOnly(),
          Number(
            policy
              .advanceNoticeDays
          )
        );

      if (
        fromDate <
        earliestDate
      ) {
        throw createServiceError(
          `${leaveType.name} must be applied at least ${policy.advanceNoticeDays} day(s) in advance.`
        );
      }
    }

    if (
      policy
        .attachmentRequired &&
      !attachments.length
    ) {
      throw createServiceError(
        `An attachment is required for ${leaveType.name}.`
      );
    }

    if (
      policy
        .attachmentRequiredAfterDays &&
      totalDays >
        Number(
          policy
            .attachmentRequiredAfterDays
        ) &&
      !attachments.length
    ) {
      throw createServiceError(
        `An attachment is required when ${leaveType.name} exceeds ${policy.attachmentRequiredAfterDays} day(s).`
      );
    }

    if (
      leaveType
        .requiresBalance &&
      !leaveType
        .allowNegativeBalance
    ) {
      const available =
        calculateAvailableBalance(
          balance
        );

      if (
        available <
        totalDays
      ) {
        throw createServiceError(
          `Insufficient ${leaveType.name} balance. Available balance is ${available} day(s).`,
          400,
          "INSUFFICIENT_LEAVE_BALANCE"
        );
      }
    }

    return true;
  };

/* =========================================================
   CREATE LEAVE
========================================================= */

const createLeaveRequest =
  async ({
    user,
    payload,
    requestMeta = {},
  }) => {
    const employee =
      await findEmployeeForUser(
        user
      );

    const leaveTypeId =
      payload
        ?.leaveTypeId;

    if (
      !isValidObjectId(
        leaveTypeId
      )
    ) {
      throw createServiceError(
        "A valid leave type is required."
      );
    }

    const leaveType =
      await LeaveType
        .findOne({
          _id:
            leaveTypeId,

          active:
            true,
        })
        .lean();

    if (!leaveType) {
      throw createServiceError(
        "Leave type not found.",
        404,
        "LEAVE_TYPE_NOT_FOUND"
      );
    }

    const fromDate =
      normalizeText(
        payload.fromDate
      );

    const toDate =
      normalizeText(
        payload.toDate
      );

    const durationType =
      normalizeUpper(
        payload.durationType ||
          "FULL_DAY"
      );

    const reason =
      normalizeText(
        payload.reason
      );

    const emergency =
      Boolean(
        payload.emergency
      );

    const emergencyReason =
      normalizeText(
        payload
          .emergencyReason
      );

    const attachments =
      Array.isArray(
        payload.attachments
      )
        ? payload.attachments
        : [];

    if (!reason) {
      throw createServiceError(
        "Leave reason is required."
      );
    }

    const totalDays =
      calculateCalendarDays({
        fromDate,
        toDate,
        durationType,
      });

    await assertNoOverlap({
      employeeId:
        employee._id,

      fromDate,

      toDate,
    });

    const policy =
      await getApplicablePolicy({
        leaveTypeId:
          leaveType._id,

        employee,

        date:
          fromDate,
      });

    const year =
      getYearFromDate(
        fromDate
      );

    if (
      getYearFromDate(
        toDate
      ) !== year
    ) {
      throw createServiceError(
        "A leave request cannot currently span two calendar years. Submit separate requests for each year."
      );
    }

    const balance =
      await getOrCreateBalance({
        employeeId:
          employee._id,

        leaveTypeId:
          leaveType._id,

        year,

        userId:
          getUserId(user),
      });

    await recalculateBalance(
      balance
    );

    await validateRequestAgainstPolicy({
      employee,
      leaveType,
      policy,
      fromDate,
      toDate,
      durationType,
      totalDays,
      emergency,
      attachments,
      balance,
    });

    const approver =
      await resolveApprover(
        employee
      );

    if (!approver) {
      throw createServiceError(
        "No reporting manager is configured for this employee. Leave cannot be submitted until the reporting hierarchy is configured.",
        409,
        "LEAVE_APPROVER_NOT_FOUND"
      );
    }

    const requestNumber =
      await generateRequestNumber();

    const availableBefore =
      calculateAvailableBalance(
        balance
      );

    const session =
      await mongoose
        .startSession();

    try {
      let createdRequest;

      await session.withTransaction(
        async () => {
          const created =
            await LeaveRequest
              .create(
                [
                  {
                    requestNumber,

                    employeeId:
                      employee._id,

                    leaveTypeId:
                      leaveType._id,

                    leavePolicyId:
                      policy._id,

                    orgUnitCode:
                      normalizeUpper(
                        employee
                          .orgUnitCode
                      ),

                    departmentId:
                      employee
                        .departmentId ||
                      employee
                        .department ||
                      null,

                    officeId:
                      employee
                        .officeId ||
                      employee
                        .office ||
                      null,

                    fromDate,

                    toDate,

                    durationType,

                    totalDays,

                    reason,

                    emergency,

                    emergencyReason,

                    contactDuringLeave:
                      normalizeText(
                        payload
                          .contactDuringLeave
                      ),

                    attachments,

                    status:
                      "PENDING_APPROVAL",

                    currentApprovalLevel:
                      1,

                    currentApproverEmployeeId:
                      approver._id,

                    currentApproverUserId:
                      approver.user ||
                      null,

                    reportingManagerSnapshot:
                      buildApproverSnapshot(
                        approver
                      ),

                    appliedBalance: {
                      balanceBefore:
                        availableBefore,

                      requested:
                        totalDays,

                      balanceAfter:
                        leaveType
                          .requiresBalance
                          ? availableBefore -
                            totalDays
                          : availableBefore,
                    },

                    appliedAt:
                      new Date(),

                    source:
                      normalizeUpper(
                        payload.source ||
                          "WEB"
                      ),

                    createdBy:
                      getUserId(
                        user
                      ),

                    updatedBy:
                      getUserId(
                        user
                      ),
                  },
                ],
                {
                  session,
                }
              );

          createdRequest =
            created[0];

          if (
            leaveType
              .requiresBalance
          ) {
            const before =
              calculateAvailableBalance(
                balance
              );

            balance.pending =
              Number(
                balance.pending ||
                  0
              ) +
              totalDays;

            balance.updatedBy =
              getUserId(user);

            balance.available =
              calculateAvailableBalance(
                balance
              );

            balance.lastCalculatedAt =
              new Date();

            await balance.save({
              session,
            });

            await LeaveBalanceTransaction
              .create(
                [
                  {
                    employeeId:
                      employee._id,

                    leaveTypeId:
                      leaveType._id,

                    leaveBalanceId:
                      balance._id,

                    leaveRequestId:
                      createdRequest._id,

                    year,

                    transactionType:
                      "LEAVE_PENDING",

                    quantity:
                      -totalDays,

                    balanceBefore:
                      before,

                    balanceAfter:
                      balance.available,

                    reason:
                      `Leave request ${requestNumber} submitted.`,

                    effectiveDate:
                      fromDate,

                    reference:
                      requestNumber,

                    performedBy:
                      getUserId(
                        user
                      ),
                  },
                ],
                {
                  session,
                }
              );
          }

          await LeaveApproval
            .create(
              [
                {
                  leaveRequestId:
                    createdRequest._id,

                  employeeId:
                    employee._id,

                  approvalLevel:
                    1,

                  approverEmployeeId:
                    approver._id,

                  approverUserId:
                    approver.user ||
                    null,

                  approverName:
                    approver
                      .fullName ||
                    "",

                  approverDesignation:
                    approver
                      .designation ||
                    "",

                  approverOrgUnitCode:
                    approver
                      .orgUnitCode ||
                    "",

                  action:
                    "SUBMITTED",

                  comment:
                    "",

                  actedAt:
                    new Date(),

                  ipAddress:
                    requestMeta
                      .ipAddress ||
                    "",

                  userAgent:
                    requestMeta
                      .userAgent ||
                    "",
                },
              ],
              {
                session,
              }
            );
        }
      );

      return LeaveRequest
        .findById(
          createdRequest._id
        )
        .populate(
          "leaveTypeId",
          "code name shortName category"
        )
        .populate(
          "employeeId",
          "employeeCode fullName designation orgUnitCode"
        )
        .populate(
          "currentApproverEmployeeId",
          "employeeCode fullName designation orgUnitCode"
        )
        .lean();
    } finally {
      await session.endSession();
    }
  };

/* =========================================================
   MY REQUESTS
========================================================= */

const getMyRequests =
  async ({
    user,
    filters = {},
  }) => {
    const employee =
      await findEmployeeForUser(
        user
      );

    const query = {
      employeeId:
        employee._id,
    };

    if (
      filters.status
    ) {
      query.status =
        normalizeUpper(
          filters.status
        );
    }

    if (
      filters.year
    ) {
      const year =
        Number(
          filters.year
        );

      query.fromDate = {
        $gte:
          `${year}-01-01`,

        $lte:
          `${year}-12-31`,
      };
    }

    return LeaveRequest
      .find(query)
      .populate(
        "leaveTypeId",
        "code name shortName category"
      )
      .populate(
        "currentApproverEmployeeId",
        "employeeCode fullName designation"
      )
      .sort({
        appliedAt: -1,
      })
      .lean();
  };

/* =========================================================
   PENDING APPROVALS
========================================================= */

const getPendingApprovals =
  async ({
    user,
  }) => {
    const employee =
      await findEmployeeForUser(
        user
      );

    if (
      !hasPermission(
        user,
        "LEAVE_APPROVE_TEAM"
      ) &&
      !isGlobalSuperAdmin(
        user
      )
    ) {
      throw createServiceError(
        "You do not have permission to approve leave requests.",
        403,
        "LEAVE_APPROVAL_FORBIDDEN"
      );
    }

    /*
     * Normal approval inbox is deliberately based on
     * currentApproverEmployeeId, not department visibility.
     */
    return LeaveRequest
      .find({
        currentApproverEmployeeId:
          employee._id,

        status:
          "PENDING_APPROVAL",
      })
      .populate(
        "employeeId",
        "employeeCode fullName designation orgUnitCode officialEmail"
      )
      .populate(
        "leaveTypeId",
        "code name shortName category"
      )
      .sort({
        appliedAt: 1,
      })
      .lean();
  };

/* =========================================================
   SCOPED LEAVE LIST
========================================================= */

const getScopedRequests =
  async ({
    user,
    filters = {},
  }) => {
    const employee =
      await findEmployeeForUser(
        user
      );

    const scope =
      await buildLeaveVisibilityScope({
        user,
        actorEmployee:
          employee,
        includeSelf:
          true,
      });

    const query = {
      ...scope,
    };

    if (
      filters.status
    ) {
      query.status =
        normalizeUpper(
          filters.status
        );
    }

    if (
      filters.leaveTypeId &&
      isValidObjectId(
        filters.leaveTypeId
      )
    ) {
      query.leaveTypeId =
        filters.leaveTypeId;
    }

    if (
      filters.orgUnitCode &&
      (
        hasGlobalLeaveView(
          user
        ) ||
        getAuthorizedOrgUnitCodes(
          user
        ).includes(
          normalizeUpper(
            filters
              .orgUnitCode
          )
        )
      )
    ) {
      query.orgUnitCode =
        normalizeUpper(
          filters
            .orgUnitCode
        );
    }

    if (
      filters.from ||
      filters.to
    ) {
      if (
        filters.from
      ) {
        query.toDate = {
          ...(query.toDate ||
            {}),

          $gte:
            filters.from,
        };
      }

      if (
        filters.to
      ) {
        query.fromDate = {
          ...(query.fromDate ||
            {}),

          $lte:
            filters.to,
        };
      }
    }

    return LeaveRequest
      .find(query)
      .populate(
        "employeeId",
        "employeeCode fullName designation orgUnitCode officialEmail"
      )
      .populate(
        "leaveTypeId",
        "code name shortName category"
      )
      .populate(
        "currentApproverEmployeeId",
        "employeeCode fullName designation orgUnitCode"
      )
      .sort({
        fromDate: -1,
        appliedAt: -1,
      })
      .lean();
  };

/* =========================================================
   GET ONE REQUEST WITH AUTHORITY
========================================================= */

const getRequestById =
  async ({
    user,
    requestId,
  }) => {
    if (
      !isValidObjectId(
        requestId
      )
    ) {
      throw createServiceError(
        "Invalid leave request."
      );
    }

    const employee =
      await findEmployeeForUser(
        user
      );

    const scope =
      await buildLeaveVisibilityScope({
        user,
        actorEmployee:
          employee,
        includeSelf:
          true,
      });

    const request =
      await LeaveRequest
        .findOne({
          _id:
            requestId,

          ...scope,
        })
        .populate(
          "employeeId",
          "employeeCode fullName designation orgUnitCode officialEmail"
        )
        .populate(
          "leaveTypeId",
          "code name shortName category"
        )
        .populate(
          "currentApproverEmployeeId",
          "employeeCode fullName designation orgUnitCode"
        )
        .lean();

    if (!request) {
      throw createServiceError(
        "Leave request not found or is outside your access scope.",
        404,
        "LEAVE_REQUEST_NOT_FOUND"
      );
    }

    const approvals =
      await LeaveApproval
        .find({
          leaveRequestId:
            requestId,
        })
        .sort({
          actedAt: 1,
        })
        .lean();

    return {
      ...request,
      approvals,
    };
  };

/* =========================================================
   APPROVE
========================================================= */

const approveRequest =
  async ({
    user,
    requestId,
    comment = "",
    requestMeta = {},
  }) => {
    const approver =
      await findEmployeeForUser(
        user
      );

    if (
      !hasPermission(
        user,
        "LEAVE_APPROVE_TEAM"
      ) &&
      !isGlobalSuperAdmin(
        user
      )
    ) {
      throw createServiceError(
        "You do not have permission to approve leave requests.",
        403
      );
    }

    const request =
      await LeaveRequest
        .findById(
          requestId
        );

    if (!request) {
      throw createServiceError(
        "Leave request not found.",
        404
      );
    }

    if (
      request.status !==
      "PENDING_APPROVAL"
    ) {
      throw createServiceError(
        "Only pending leave requests can be approved.",
        409
      );
    }

    /*
     * SUPER_ADMIN may administratively approve.
     * Everyone else must be the resolved approver.
     */
    if (
      !isGlobalSuperAdmin(
        user
      ) &&
      normalizeId(
        request
          .currentApproverEmployeeId
      ) !==
        normalizeId(
          approver._id
        )
    ) {
      throw createServiceError(
        "This leave request is not assigned to you for approval.",
        403,
        "NOT_CURRENT_APPROVER"
      );
    }

    const leaveType =
      await LeaveType
        .findById(
          request.leaveTypeId
        )
        .lean();

    const year =
      getYearFromDate(
        request.fromDate
      );

    const session =
      await mongoose
        .startSession();

    try {
      await session.withTransaction(
        async () => {
          if (
            leaveType
              ?.requiresBalance
          ) {
            const balance =
              await LeaveBalance
                .findOne({
                  employeeId:
                    request.employeeId,

                  leaveTypeId:
                    request.leaveTypeId,

                  year,
                })
                .session(
                  session
                );

            if (!balance) {
              throw createServiceError(
                "Leave balance record was not found.",
                409
              );
            }

            const before =
              calculateAvailableBalance(
                balance
              );

            balance.pending =
              Math.max(
                0,
                Number(
                  balance.pending ||
                    0
                ) -
                  Number(
                    request.totalDays
                  )
              );

            balance.used =
              Number(
                balance.used ||
                  0
              ) +
              Number(
                request.totalDays
              );

            balance.available =
              calculateAvailableBalance(
                balance
              );

            balance.updatedBy =
              getUserId(user);

            balance.lastCalculatedAt =
              new Date();

            await balance.save({
              session,
            });

            await LeaveBalanceTransaction
              .create(
                [
                  {
                    employeeId:
                      request.employeeId,

                    leaveTypeId:
                      request.leaveTypeId,

                    leaveBalanceId:
                      balance._id,

                    leaveRequestId:
                      request._id,

                    year,

                    transactionType:
                      "LEAVE_APPROVED",

                    quantity:
                      0,

                    balanceBefore:
                      before,

                    balanceAfter:
                      balance.available,

                    reason:
                      `Leave request ${request.requestNumber} approved.`,

                    effectiveDate:
                      request.fromDate,

                    reference:
                      request.requestNumber,

                    performedBy:
                      getUserId(
                        user
                      ),
                  },
                ],
                {
                  session,
                }
              );
          }

          request.status =
            "APPROVED";

          request.approvedAt =
            new Date();

          request.updatedBy =
            getUserId(user);

          request.currentApproverEmployeeId =
            null;

          request.currentApproverUserId =
            null;

          await request.save({
            session,
          });

          await LeaveApproval
            .create(
              [
                {
                  leaveRequestId:
                    request._id,

                  employeeId:
                    request.employeeId,

                  approvalLevel:
                    request
                      .currentApprovalLevel ||
                    1,

                  approverEmployeeId:
                    approver._id,

                  approverUserId:
                    getUserId(
                      user
                    ),

                  approverName:
                    approver
                      .fullName ||
                    "",

                  approverDesignation:
                    approver
                      .designation ||
                    "",

                  approverOrgUnitCode:
                    approver
                      .orgUnitCode ||
                    "",

                  action:
                    "APPROVED",

                  comment:
                    normalizeText(
                      comment
                    ),

                  actedAt:
                    new Date(),

                  ipAddress:
                    requestMeta
                      .ipAddress ||
                    "",

                  userAgent:
                    requestMeta
                      .userAgent ||
                    "",
                },
              ],
              {
                session,
              }
            );
        }
      );

      return LeaveRequest
        .findById(
          request._id
        )
        .populate(
          "employeeId",
          "employeeCode fullName designation orgUnitCode"
        )
        .populate(
          "leaveTypeId",
          "code name shortName"
        )
        .lean();
    } finally {
      await session.endSession();
    }
  };

/* =========================================================
   REJECT
========================================================= */

const rejectRequest =
  async ({
    user,
    requestId,
    comment,
    requestMeta = {},
  }) => {
    const approver =
      await findEmployeeForUser(
        user
      );

    const rejectionReason =
      normalizeText(
        comment
      );

    if (!rejectionReason) {
      throw createServiceError(
        "Rejection reason is required."
      );
    }

    if (
      !hasPermission(
        user,
        "LEAVE_APPROVE_TEAM"
      ) &&
      !isGlobalSuperAdmin(
        user
      )
    ) {
      throw createServiceError(
        "You do not have permission to reject leave requests.",
        403
      );
    }

    const request =
      await LeaveRequest
        .findById(
          requestId
        );

    if (!request) {
      throw createServiceError(
        "Leave request not found.",
        404
      );
    }

    if (
      request.status !==
      "PENDING_APPROVAL"
    ) {
      throw createServiceError(
        "Only pending leave requests can be rejected.",
        409
      );
    }

    if (
      !isGlobalSuperAdmin(
        user
      ) &&
      normalizeId(
        request
          .currentApproverEmployeeId
      ) !==
        normalizeId(
          approver._id
        )
    ) {
      throw createServiceError(
        "This leave request is not assigned to you for approval.",
        403
      );
    }

    const leaveType =
      await LeaveType
        .findById(
          request.leaveTypeId
        )
        .lean();

    const year =
      getYearFromDate(
        request.fromDate
      );

    const session =
      await mongoose
        .startSession();

    try {
      await session.withTransaction(
        async () => {
          if (
            leaveType
              ?.requiresBalance
          ) {
            const balance =
              await LeaveBalance
                .findOne({
                  employeeId:
                    request.employeeId,

                  leaveTypeId:
                    request.leaveTypeId,

                  year,
                })
                .session(
                  session
                );

            if (balance) {
              const before =
                calculateAvailableBalance(
                  balance
                );

              balance.pending =
                Math.max(
                  0,
                  Number(
                    balance.pending ||
                      0
                  ) -
                    Number(
                      request.totalDays
                    )
                );

              balance.available =
                calculateAvailableBalance(
                  balance
                );

              balance.updatedBy =
                getUserId(user);

              balance.lastCalculatedAt =
                new Date();

              await balance.save({
                session,
              });

              await LeaveBalanceTransaction
                .create(
                  [
                    {
                      employeeId:
                        request.employeeId,

                      leaveTypeId:
                        request.leaveTypeId,

                      leaveBalanceId:
                        balance._id,

                      leaveRequestId:
                        request._id,

                      year,

                      transactionType:
                        "LEAVE_REJECTED",

                      quantity:
                        Number(
                          request.totalDays
                        ),

                      balanceBefore:
                        before,

                      balanceAfter:
                        balance.available,

                      reason:
                        `Leave request ${request.requestNumber} rejected.`,

                      effectiveDate:
                        request.fromDate,

                      reference:
                        request.requestNumber,

                      performedBy:
                        getUserId(
                          user
                        ),
                    },
                  ],
                  {
                    session,
                  }
                );
            }
          }

          request.status =
            "REJECTED";

          request.rejectedAt =
            new Date();

          request.rejectionReason =
            rejectionReason;

          request.updatedBy =
            getUserId(user);

          request.currentApproverEmployeeId =
            null;

          request.currentApproverUserId =
            null;

          await request.save({
            session,
          });

          await LeaveApproval
            .create(
              [
                {
                  leaveRequestId:
                    request._id,

                  employeeId:
                    request.employeeId,

                  approvalLevel:
                    request
                      .currentApprovalLevel ||
                    1,

                  approverEmployeeId:
                    approver._id,

                  approverUserId:
                    getUserId(
                      user
                    ),

                  approverName:
                    approver
                      .fullName ||
                    "",

                  approverDesignation:
                    approver
                      .designation ||
                    "",

                  approverOrgUnitCode:
                    approver
                      .orgUnitCode ||
                    "",

                  action:
                    "REJECTED",

                  comment:
                    rejectionReason,

                  actedAt:
                    new Date(),

                  ipAddress:
                    requestMeta
                      .ipAddress ||
                    "",

                  userAgent:
                    requestMeta
                      .userAgent ||
                    "",
                },
              ],
              {
                session,
              }
            );
        }
      );

      return LeaveRequest
        .findById(
          request._id
        )
        .populate(
          "employeeId",
          "employeeCode fullName designation orgUnitCode"
        )
        .populate(
          "leaveTypeId",
          "code name shortName"
        )
        .lean();
    } finally {
      await session.endSession();
    }
  };

/* =========================================================
   CANCEL OWN REQUEST
========================================================= */

const cancelOwnRequest =
  async ({
    user,
    requestId,
    reason,
    requestMeta = {},
  }) => {
    const employee =
      await findEmployeeForUser(
        user
      );

    const cancellationReason =
      normalizeText(
        reason
      );

    if (!cancellationReason) {
      throw createServiceError(
        "Cancellation reason is required."
      );
    }

    const request =
      await LeaveRequest
        .findOne({
          _id:
            requestId,

          employeeId:
            employee._id,
        });

    if (!request) {
      throw createServiceError(
        "Leave request not found.",
        404
      );
    }

    if (
      FINAL_REQUEST_STATUSES.includes(
        request.status
      )
    ) {
      throw createServiceError(
        "This leave request can no longer be cancelled.",
        409
      );
    }

    /*
     * Pending request can be cancelled immediately.
     * Approved request becomes CANCEL_REQUESTED because
     * its balance/attendance implications need approval.
     */
    if (
      request.status ===
      "APPROVED"
    ) {
      request.status =
        "CANCEL_REQUESTED";

      request.cancelRequestedAt =
        new Date();

      request.cancellationReason =
        cancellationReason;

      request.updatedBy =
        getUserId(user);

      const approver =
        await resolveApprover(
          employee
        );

      request.currentApproverEmployeeId =
        approver?._id ||
        null;

      request.currentApproverUserId =
        approver?.user ||
        null;

      await request.save();

      await LeaveApproval.create({
        leaveRequestId:
          request._id,

        employeeId:
          employee._id,

        approvalLevel:
          request
            .currentApprovalLevel ||
          1,

        approverEmployeeId:
          approver?._id ||
          null,

        approverUserId:
          approver?.user ||
          null,

        approverName:
          approver
            ?.fullName ||
          "",

        approverDesignation:
          approver
            ?.designation ||
          "",

        approverOrgUnitCode:
          approver
            ?.orgUnitCode ||
          "",

        action:
          "CANCEL_REQUESTED",

        comment:
          cancellationReason,

        actedAt:
          new Date(),

        ipAddress:
          requestMeta
            .ipAddress ||
          "",

        userAgent:
          requestMeta
            .userAgent ||
          "",
      });

      return request.toObject();
    }

    const leaveType =
      await LeaveType
        .findById(
          request.leaveTypeId
        )
        .lean();

    const year =
      getYearFromDate(
        request.fromDate
      );

    const session =
      await mongoose
        .startSession();

    try {
      await session.withTransaction(
        async () => {
          if (
            leaveType
              ?.requiresBalance &&
            request.status ===
              "PENDING_APPROVAL"
          ) {
            const balance =
              await LeaveBalance
                .findOne({
                  employeeId:
                    request.employeeId,

                  leaveTypeId:
                    request.leaveTypeId,

                  year,
                })
                .session(
                  session
                );

            if (balance) {
              const before =
                calculateAvailableBalance(
                  balance
                );

              balance.pending =
                Math.max(
                  0,
                  Number(
                    balance.pending ||
                      0
                  ) -
                    Number(
                      request.totalDays
                    )
                );

              balance.available =
                calculateAvailableBalance(
                  balance
                );

              balance.updatedBy =
                getUserId(user);

              balance.lastCalculatedAt =
                new Date();

              await balance.save({
                session,
              });

              await LeaveBalanceTransaction
                .create(
                  [
                    {
                      employeeId:
                        request.employeeId,

                      leaveTypeId:
                        request.leaveTypeId,

                      leaveBalanceId:
                        balance._id,

                      leaveRequestId:
                        request._id,

                      year,

                      transactionType:
                        "LEAVE_CANCELLED",

                      quantity:
                        Number(
                          request.totalDays
                        ),

                      balanceBefore:
                        before,

                      balanceAfter:
                        balance.available,

                      reason:
                        cancellationReason,

                      effectiveDate:
                        request.fromDate,

                      reference:
                        request.requestNumber,

                      performedBy:
                        getUserId(
                          user
                        ),
                    },
                  ],
                  {
                    session,
                  }
                );
            }
          }

          request.status =
            "CANCELLED";

          request.cancelledAt =
            new Date();

          request.cancellationReason =
            cancellationReason;

          request.currentApproverEmployeeId =
            null;

          request.currentApproverUserId =
            null;

          request.updatedBy =
            getUserId(user);

          await request.save({
            session,
          });

          await LeaveApproval
            .create(
              [
                {
                  leaveRequestId:
                    request._id,

                  employeeId:
                    employee._id,

                  approvalLevel:
                    request
                      .currentApprovalLevel ||
                    1,

                  approverEmployeeId:
                    null,

                  approverUserId:
                    getUserId(
                      user
                    ),

                  approverName:
                    employee
                      .fullName ||
                    "",

                  approverDesignation:
                    employee
                      .designation ||
                    "",

                  approverOrgUnitCode:
                    employee
                      .orgUnitCode ||
                    "",

                  action:
                    "CANCEL_REQUESTED",

                  comment:
                    cancellationReason,

                  actedAt:
                    new Date(),

                  ipAddress:
                    requestMeta
                      .ipAddress ||
                    "",

                  userAgent:
                    requestMeta
                      .userAgent ||
                    "",
                },
              ],
              {
                session,
              }
            );
        }
      );

      return request.toObject();
    } finally {
      await session.endSession();
    }
  };

/* =========================================================
   HR BALANCE ADJUSTMENT
========================================================= */

const adjustBalance =
  async ({
    user,
    payload,
  }) => {
    if (
      !hasGlobalLeaveAdmin(
        user
      )
    ) {
      throw createServiceError(
        "You do not have permission to adjust leave balances.",
        403
      );
    }

    const employee =
      await findEmployeeById(
        payload.employeeId
      );

    const leaveType =
      await LeaveType
        .findById(
          payload.leaveTypeId
        )
        .lean();

    if (!leaveType) {
      throw createServiceError(
        "Leave type not found.",
        404
      );
    }

    const year =
      Number(
        payload.year ||
          new Date()
            .getFullYear()
      );

    const quantity =
      Number(
        payload.quantity
      );

    if (
      !Number.isFinite(
        quantity
      ) ||
      quantity === 0
    ) {
      throw createServiceError(
        "A non-zero adjustment quantity is required."
      );
    }

    const reason =
      normalizeText(
        payload.reason
      );

    if (!reason) {
      throw createServiceError(
        "Adjustment reason is required."
      );
    }

    const balance =
      await getOrCreateBalance({
        employeeId:
          employee._id,

        leaveTypeId:
          leaveType._id,

        year,

        userId:
          getUserId(user),
      });

    const before =
      calculateAvailableBalance(
        balance
      );

    balance.adjustment =
      Number(
        balance.adjustment ||
          0
      ) +
      quantity;

    balance.available =
      calculateAvailableBalance(
        balance
      );

    balance.updatedBy =
      getUserId(user);

    balance.lastCalculatedAt =
      new Date();

    await balance.save();

    await LeaveBalanceTransaction
      .create({
        employeeId:
          employee._id,

        leaveTypeId:
          leaveType._id,

        leaveBalanceId:
          balance._id,

        year,

        transactionType:
          "HR_ADJUSTMENT",

        quantity,

        balanceBefore:
          before,

        balanceAfter:
          balance.available,

        reason,

        effectiveDate:
          payload
            .effectiveDate ||
          todayDateOnly(),

        reference:
          normalizeText(
            payload.reference
          ),

        performedBy:
          getUserId(user),
      });

    return LeaveBalance
      .findById(
        balance._id
      )
      .populate(
        "leaveTypeId",
        "code name shortName"
      )
      .populate(
        "employeeId",
        "employeeCode fullName designation orgUnitCode"
      )
      .lean();
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createServiceError,

  getLeaveTypes,

  getApplicablePolicy,

  getMyBalances,

  getMyRequests,

  getPendingApprovals,

  getScopedRequests,

  getRequestById,

  createLeaveRequest,

  approveRequest,

  rejectRequest,

  cancelOwnRequest,

  adjustBalance,

  findEmployeeForUser,

  getDirectReports,

  getReportingSubtreeIds,

  buildLeaveVisibilityScope,
};
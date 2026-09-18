const {
  ManpowerRequirement,
} =
  require(
    "./manpowerRequirement.model"
  );

const {
  ManpowerCounter,
} =
  require(
    "./manpowerCounter.model"
  );

const {
  Department,
} =
  require(
    "../department/department.model"
  );

const {
  DepartmentMembership,
} =
  require(
    "../department/departmentMembership.model"
  );

const departmentService =
  require(
    "../department/department.service"
  );

const UserModule =
  require(
    "../user/user.model"
  );

const ApiError =
  require(
    "../utils/ApiError"
  );

const User =
  UserModule.User ||
  UserModule;

/* =========================================================
   REQUEST NUMBER

   MPR-2026-000001
========================================================= */

const generateRequestNumber =
  async () => {
    const year =
      new Date()
        .getFullYear();

    const key =
      `MANPOWER-${year}`;

    const counter =
      await ManpowerCounter
        .findOneAndUpdate(
          {
            key,
          },

          {
            $inc: {
              sequence:
                1,
            },
          },

          {
            upsert:
              true,

            new:
              true,
          }
        );

    return (
      `MPR-${year}-${String(
        counter.sequence
      ).padStart(
        6,
        "0"
      )}`
    );
  };

/* =========================================================
   ACTIVE USER MEMBERSHIPS
========================================================= */

const getActiveMemberships =
  async (
    userId
  ) => {
    return DepartmentMembership
      .find({
        user:
          userId,

        status:
          "ACTIVE",
      })
      .populate(
        "department",
        "name code status parentDepartment"
      )
      .sort({
        isPrimary:
          -1,

        createdAt:
          1,
      })
      .lean();
  };

/* =========================================================
   USER DEPARTMENT IDS
========================================================= */

const getUserDepartmentIds =
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
        .select(
          "department"
        )
        .lean();

    return memberships
      .map(
        (
          item
        ) =>
          item.department
      )
      .filter(
        Boolean
      );
  };

/* =========================================================
   DEPARTMENTS USER MANAGES FOR MANPOWER

   IMPORTANT:

   Only DEPARTMENT_SUPER_ADMIN gets department-wide
   manpower visibility.

   Plain:
   ADMIN
   HEAD
   MANAGER
   MEMBER

   do NOT get department-wide manpower access merely
   because they belong to that department.
========================================================= */

const getManagedManpowerDepartmentIds =
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

          role:
            "DEPARTMENT_SUPER_ADMIN",
        })
        .select(
          "department"
        )
        .lean();

    return memberships
      .map(
        (
          membership
        ) =>
          membership.department
      )
      .filter(
        Boolean
      );
  };

/* =========================================================
   DEPARTMENT SUPER ADMIN CHECK
========================================================= */

const isDepartmentSuperAdminFor =
  async (
    userId,
    departmentId
  ) => {
    if (
      !userId ||
      !departmentId
    ) {
      return false;
    }

    const membership =
      await DepartmentMembership
        .findOne({
          user:
            userId,

          department:
            departmentId,

          status:
            "ACTIVE",

          role:
            "DEPARTMENT_SUPER_ADMIN",
        })
        .select(
          "_id"
        )
        .lean();

    return Boolean(
      membership
    );
  };

/* =========================================================
   RESOLVE REQUEST DEPARTMENT

   Normal user:
   → own active department

   Global SUPER_ADMIN:
   → may select any active department
========================================================= */

const resolveRequestDepartment =
  async (
    user,
    requestedDepartmentId
  ) => {
    if (
      user.role ===
      "SUPER_ADMIN"
    ) {
      if (
        !requestedDepartmentId
      ) {
        throw new ApiError(
          400,
          "Please select a department"
        );
      }

      const department =
        await Department
          .findOne({
            _id:
              requestedDepartmentId,

            status:
              "ACTIVE",
          })
          .lean();

      if (
        !department
      ) {
        throw new ApiError(
          404,
          "Department not found"
        );
      }

      return department;
    }

    const memberships =
      await getActiveMemberships(
        user._id
      );

    if (
      memberships.length ===
      0
    ) {
      throw new ApiError(
        400,
        "Your account is not assigned to a department"
      );
    }

    if (
      requestedDepartmentId
    ) {
      const membership =
        memberships.find(
          (
            item
          ) =>
            String(
              item.department
                ?._id
            ) ===
            String(
              requestedDepartmentId
            )
        );

      if (
        !membership
      ) {
        throw new ApiError(
          403,
          "You cannot raise manpower for this department"
        );
      }

      return membership
        .department;
    }

    /*
     * getActiveMemberships sorts primary first.
     */
    return memberships[0]
      .department;
  };

/* =========================================================
   GLOBAL SUPER ADMIN FALLBACK
========================================================= */

const findGlobalSuperAdmin =
  async (
    excludeUserId =
      null
  ) => {
    const query = {
      role:
        "SUPER_ADMIN",

      status:
        "ACTIVE",
    };

    if (
      excludeUserId
    ) {
      query._id = {
        $ne:
          excludeUserId,
      };
    }

    return User
      .findOne(
        query
      )
      .select(
        "_id displayName email role"
      )
      .lean();
  };

/* =========================================================
   RESOLVE APPROVER

   Priority:

   1. Department Super Admin
   2. Parent Department Super Admin
   3. Global Super Admin

   Requester cannot approve own request.
========================================================= */

const resolveApprover =
  async (
    departmentId,
    requesterId
  ) => {
    const departmentApprover =
      await departmentService
        .getDepartmentApprover(
          departmentId,
          requesterId
        );

    if (
      departmentApprover
        ?.membership
        ?.user
    ) {
      const approverUserId =
        departmentApprover
          .membership
          .user
          ?._id ||
        departmentApprover
          .membership
          .user;

      const approvalDepartmentId =
        departmentApprover
          .sourceDepartment
          ?._id ||
        departmentApprover
          .sourceDepartment ||
        null;

      return {
        approver:
          approverUserId,

        approvalDepartment:
          approvalDepartmentId,

        source:
          "DEPARTMENT",
      };
    }

    const globalApprover =
      await findGlobalSuperAdmin(
        requesterId
      );

    if (
      !globalApprover
    ) {
      throw new ApiError(
        400,
        "No manpower approver is configured"
      );
    }

    return {
      approver:
        globalApprover._id,

      approvalDepartment:
        null,

      source:
        "GLOBAL_SUPER_ADMIN",
    };
  };

/* =========================================================
   POPULATE
========================================================= */

const populateRequirement =
  (
    query
  ) => {
    return query
      .populate(
        "department",
        "name code slug"
      )
      .populate(
        "requestedBy",
        "displayName email role"
      )
      .populate(
        "currentApprover",
        "displayName email role"
      )
      .populate(
        "approvalDepartment",
        "name code"
      )
      .populate(
        "approvedBy",
        "displayName email role"
      )
      .populate(
        "rejectedBy",
        "displayName email role"
      )
      .populate(
        "assignedHr",
        "displayName email role employee status"
      )
      .populate(
        "assignedHrBy",
        "displayName email role"
      )
      .populate(
        "previousAssignedHr",
        "displayName email role employee"
      )
      .populate(
        "hiringStartedBy",
        "displayName email"
      )
      .populate(
        "approvalHistory.actor",
        "displayName email role"
      );
  };

/* =========================================================
   FIND HR DEPARTMENT
========================================================= */

const getHrDepartment =
  async () => {
    let department =
      await Department
        .findOne({
          code: {
            $regex:
              /^HR$/i,
          },

          status:
            "ACTIVE",
        })
        .select(
          "_id name code status"
        )
        .lean();

    if (
      !department
    ) {
      department =
        await Department
          .findOne({
            name: {
              $regex:
                /^(HR|Human Resources)$/i,
            },

            status:
              "ACTIVE",
          })
          .select(
            "_id name code status"
          )
          .lean();
    }

    return department;
  };

/* =========================================================
   HR USER CHECK

   Any active HR department member passes.

   Global SUPER_ADMIN always passes.
========================================================= */

const isHrUser =
  async (
    user
  ) => {
    if (
      user.role ===
      "SUPER_ADMIN"
    ) {
      return true;
    }

    const hrDepartment =
      await getHrDepartment();

    if (
      !hrDepartment
    ) {
      return false;
    }

    const membership =
      await DepartmentMembership
        .findOne({
          user:
            user._id,

          department:
            hrDepartment._id,

          status:
            "ACTIVE",
        })
        .select(
          "_id role"
        )
        .lean();

    return Boolean(
      membership
    );
  };

/* =========================================================
   HR MANAGEMENT CHECK

   Can manage whole HR recruitment queue:

   - Global SUPER_ADMIN
   - HR DEPARTMENT_SUPER_ADMIN
   - HR HOD
   - HR ADMIN

   HR MEMBER cannot assign/reassign owners and cannot see
   the complete HR management queue.
========================================================= */

const canManageHrHiring =
  async (
    user
  ) => {
    if (
      user.role ===
      "SUPER_ADMIN"
    ) {
      return true;
    }

    const hrDepartment =
      await getHrDepartment();

    if (
      !hrDepartment
    ) {
      return false;
    }

    const membership =
      await DepartmentMembership
        .findOne({
          user:
            user._id,

          department:
            hrDepartment._id,

          status:
            "ACTIVE",

          role: {
            $in: [
              "DEPARTMENT_SUPER_ADMIN",
              "HOD",
              "ADMIN",
            ],
          },
        })
        .select(
          "_id role"
        )
        .lean();

    return Boolean(
      membership
    );
  };

/* =========================================================
   VERIFY SELECTED HR EMPLOYEE

   Any active HR member can be assigned as hiring owner.
========================================================= */

const getValidHrEmployee =
  async (
    hrUserId
  ) => {
    const selectedUser =
      await User
        .findOne({
          _id:
            hrUserId,

          status:
            "ACTIVE",
        })
        .select(
          "_id displayName email role status employee"
        )
        .lean();

    if (
      !selectedUser
    ) {
      throw new ApiError(
        404,
        "Selected HR employee was not found or is inactive"
      );
    }

    const hrDepartment =
      await getHrDepartment();

    if (
      !hrDepartment
    ) {
      throw new ApiError(
        500,
        "HR department is not configured in SE-RMS"
      );
    }

    const membership =
      await DepartmentMembership
        .findOne({
          user:
            selectedUser._id,

          department:
            hrDepartment._id,

          status:
            "ACTIVE",
        })
        .select(
          "_id role isPrimary canManageMembers"
        )
        .lean();

    if (
      !membership
    ) {
      throw new ApiError(
        400,
        "Selected employee is not an active member of the HR department"
      );
    }

    return {
      user:
        selectedUser,

      membership,

      department:
        hrDepartment,
    };
  };

/* =========================================================
   CREATE REQUIREMENT
========================================================= */

const createRequirement =
  async ({
    user,
    input,
  }) => {
    const department =
      await resolveRequestDepartment(
        user,
        input.department
      );

    const approver =
      await resolveApprover(
        department._id,
        user._id
      );

    const requestNumber =
      await generateRequestNumber();

    const requirement =
      await ManpowerRequirement
        .create({
          requestNumber,

          department:
            department._id,

          requestedBy:
            user._id,

          positionTitle:
            input.positionTitle,

          numberOfOpenings:
            input.numberOfOpenings,

          requiredSkills:
            input.requiredSkills,

          minimumExperienceYears:
            input.minimumExperienceYears,

          maximumExperienceYears:
            input.maximumExperienceYears,

          budgetMin:
            input.budgetMin,

          budgetMax:
            input.budgetMax,

          currency:
            input.currency,

          employmentType:
            input.employmentType,

          location:
            input.location,

          requiredByDate:
            input.requiredByDate,

          reason:
            input.reason,

          priority:
            input.priority,

          status:
            "PENDING_APPROVAL",

          currentApprover:
            approver.approver,

          approvalDepartment:
            approver
              .approvalDepartment,

          visibleToHR:
            false,

          assignedHr:
            null,

          assignedHrAt:
            null,

          assignedHrBy:
            null,

          previousAssignedHr:
            null,

          approvalHistory: [
            {
              action:
                "SUBMITTED",

              actor:
                user._id,

              remarks:
                "",

              actionAt:
                new Date(),
            },
          ],

          createdBy:
            user._id,

          updatedBy:
            user._id,
        });

    return getRequirementById(
      requirement._id,
      user
    );
  };

/* =========================================================
   GET ONE

   Visibility:

   Global SUPER_ADMIN
   → all

   Requester
   → own request

   Current approver
   → assigned pending approval

   Department SUPER ADMIN
   → own managed department

   HR management
   → HR-visible approved / hiring requests

   Assigned HR owner
   → assigned requirement
========================================================= */

const getRequirementById =
  async (
    requirementId,
    user
  ) => {
    const requirement =
      await populateRequirement(
        ManpowerRequirement
          .findById(
            requirementId
          )
      ).lean();

    if (
      !requirement
    ) {
      throw new ApiError(
        404,
        "Manpower requirement not found"
      );
    }

    if (
      user.role ===
      "SUPER_ADMIN"
    ) {
      return requirement;
    }

    const requesterId =
      String(
        requirement
          .requestedBy
          ?._id ||
        requirement
          .requestedBy ||
        ""
      );

    const approverId =
      String(
        requirement
          .currentApprover
          ?._id ||
        requirement
          .currentApprover ||
        ""
      );

    const assignedHrId =
      String(
        requirement
          .assignedHr
          ?._id ||
        requirement
          .assignedHr ||
        ""
      );

    const userId =
      String(
        user._id
      );

    const isRequester =
      requesterId ===
      userId;

    const isCurrentApprover =
      approverId ===
      userId;

    const isAssignedHiringOwner =
      assignedHrId ===
      userId;

    const managedDepartmentIds =
      await getManagedManpowerDepartmentIds(
        user._id
      );

    const managesRequirementDepartment =
      managedDepartmentIds
        .some(
          (
            departmentId
          ) =>
            String(
              departmentId
            ) ===
            String(
              requirement
                .department
                ?._id ||
              requirement
                .department
            )
        );

    const hrManager =
      requirement.visibleToHR
        ? await canManageHrHiring(
            user
          )
        : false;

    const userCanSee =
      isRequester ||
      isCurrentApprover ||
      managesRequirementDepartment ||
      isAssignedHiringOwner ||
      hrManager;

    if (
      !userCanSee
    ) {
      throw new ApiError(
        403,
        "You do not have access to this requirement"
      );
    }

    return requirement;
  };

/* =========================================================
   LIST REQUIREMENTS

   Visibility matrix:

   GLOBAL SUPER_ADMIN
   → all

   Normal requester
   → own

   Current valid approver
   → assigned request

   Department Super Admin
   → managed department

   HR management
   → approved HR-visible requests from ALL departments

   HR member
   → only assigned hiring
========================================================= */

const listRequirements =
  async ({
    user,
    status,
    departmentId,
    search,
  }) => {
    const query = {};

    if (
      status
    ) {
      query.status =
        String(
          status
        )
          .trim()
          .toUpperCase();
    }

    if (
      user.role !==
      "SUPER_ADMIN"
    ) {
      const managedDepartmentIds =
        await getManagedManpowerDepartmentIds(
          user._id
        );

      const hrManager =
        await canManageHrHiring(
          user
        );

      const visibilityConditions = [
        /*
         * Own request always visible.
         */
        {
          requestedBy:
            user._id,
        },

        /*
         * Assigned approval.
         */
        {
          currentApprover:
            user._id,
        },

        /*
         * Assigned HR work.
         */
        {
          assignedHr:
            user._id,
        },
      ];

      /*
       * Department Super Admin gets department-wide view.
       */
      if (
        managedDepartmentIds.length >
        0
      ) {
        visibilityConditions.push({
          department: {
            $in:
              managedDepartmentIds,
          },
        });
      }

      /*
       * HR management gets cross-department visibility
       * only AFTER approval.
       */
      if (
        hrManager
      ) {
        visibilityConditions.push({
          visibleToHR:
            true,

          status: {
            $in: [
              "APPROVED",
              "HIRING_IN_PROGRESS",
              "FILLED",
            ],
          },
        });
      }

      query.$or =
        visibilityConditions;
    }

    if (
      departmentId
    ) {
      query.department =
        departmentId;
    }

    if (
      search
    ) {
      const safe =
        String(
          search
        ).replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      query.$and =
        query.$and ||
        [];

      query.$and.push({
        $or: [
          {
            requestNumber: {
              $regex:
                safe,

              $options:
                "i",
            },
          },

          {
            positionTitle: {
              $regex:
                safe,

              $options:
                "i",
            },
          },
        ],
      });
    }

    return populateRequirement(
      ManpowerRequirement
        .find(
          query
        )
        .sort({
          createdAt:
            -1,
        })
    ).lean();
  };

/* =========================================================
   APPROVAL INBOX

   Global SUPER_ADMIN
   → actionable pending requests except own

   Department SUPER ADMIN
   → only requests actually assigned to them AND from
     department they manage.

   ADMIN / HEAD / MANAGER / MEMBER
   → no manpower approval authority.
========================================================= */

const getApprovalInbox =
  async (
    user
  ) => {
    /* =====================================================
       GLOBAL SUPER ADMIN
    ===================================================== */

    if (
      user.role ===
      "SUPER_ADMIN"
    ) {
      return populateRequirement(
        ManpowerRequirement
          .find({
            status:
              "PENDING_APPROVAL",

            requestedBy: {
              $ne:
                user._id,
            },
          })
          .sort({
            priority:
              -1,

            createdAt:
              1,
          })
      ).lean();
    }

    /* =====================================================
       DEPARTMENT SUPER ADMIN ONLY
    ===================================================== */

    const managedDepartmentIds =
      await getManagedManpowerDepartmentIds(
        user._id
      );

    if (
      managedDepartmentIds.length ===
      0
    ) {
      return [];
    }

    return populateRequirement(
      ManpowerRequirement
        .find({
          status:
            "PENDING_APPROVAL",

          currentApprover:
            user._id,

          requestedBy: {
            $ne:
              user._id,
          },

          $or: [
            {
              approvalDepartment: {
                $in:
                  managedDepartmentIds,
              },
            },

            {
              approvalDepartment:
                null,

              department: {
                $in:
                  managedDepartmentIds,
              },
            },
          ],
        })
        .sort({
          priority:
            -1,

          createdAt:
            1,
        })
    ).lean();
  };

/* =========================================================
   APPROVE

   Allowed:

   - Global SUPER_ADMIN
   - Current approver who is DEPARTMENT_SUPER_ADMIN of the
     approval department

   Never:
   - Requester approving own
   - Plain ADMIN
   - Other department Super Admin
========================================================= */

const approveRequirement =
  async ({
    requirementId,
    user,
    remarks,
  }) => {
    const requirement =
      await ManpowerRequirement
        .findById(
          requirementId
        );

    if (
      !requirement
    ) {
      throw new ApiError(
        404,
        "Manpower requirement not found"
      );
    }

    if (
      requirement.status !==
      "PENDING_APPROVAL"
    ) {
      throw new ApiError(
        400,
        "This requirement is no longer pending approval"
      );
    }

    if (
      String(
        requirement
          .requestedBy
      ) ===
      String(
        user._id
      )
    ) {
      throw new ApiError(
        403,
        "You cannot approve your own manpower requirement"
      );
    }

    const isGlobalSuperAdmin =
      user.role ===
      "SUPER_ADMIN";

    const isAssignedApprover =
      String(
        requirement
          .currentApprover
      ) ===
      String(
        user._id
      );

    let validDepartmentApprover =
      false;

    if (
      !isGlobalSuperAdmin &&
      isAssignedApprover
    ) {
      const approvalDepartmentId =
        requirement
          .approvalDepartment ||
        requirement
          .department;

      validDepartmentApprover =
        await isDepartmentSuperAdminFor(
          user._id,
          approvalDepartmentId
        );
    }

    const canApprove =
      isGlobalSuperAdmin ||
      (
        isAssignedApprover &&
        validDepartmentApprover
      );

    if (
      !canApprove
    ) {
      throw new ApiError(
        403,
        "Only the assigned Department Super Admin or Global Super Admin can approve this manpower requirement"
      );
    }

    const now =
      new Date();

    requirement.status =
      "APPROVED";

    requirement.currentApprover =
      null;

    requirement.approvedBy =
      user._id;

    requirement.approvedAt =
      now;

    /*
     * THIS RELEASES IT TO HR.
     */
    requirement.visibleToHR =
      true;

    requirement.updatedBy =
      user._id;

    requirement
      .approvalHistory
      .push({
        action:
          "APPROVED",

        actor:
          user._id,

        remarks:
          remarks ||
          "",

        actionAt:
          now,
      });

    await requirement.save();

    return getRequirementById(
      requirement._id,
      user
    );
  };

/* =========================================================
   REJECT

   Uses same approval authorization as APPROVE.
========================================================= */

const rejectRequirement =
  async ({
    requirementId,
    user,
    reason,
  }) => {
    const requirement =
      await ManpowerRequirement
        .findById(
          requirementId
        );

    if (
      !requirement
    ) {
      throw new ApiError(
        404,
        "Manpower requirement not found"
      );
    }

    if (
      requirement.status !==
      "PENDING_APPROVAL"
    ) {
      throw new ApiError(
        400,
        "This requirement is no longer pending approval"
      );
    }

    /*
     * Requester cannot reject through approval workflow.
     */
    if (
      String(
        requirement
          .requestedBy
      ) ===
      String(
        user._id
      )
    ) {
      throw new ApiError(
        403,
        "You cannot reject your own manpower requirement through the approval workflow"
      );
    }

    const isGlobalSuperAdmin =
      user.role ===
      "SUPER_ADMIN";

    const isAssignedApprover =
      String(
        requirement
          .currentApprover
      ) ===
      String(
        user._id
      );

    let validDepartmentApprover =
      false;

    if (
      !isGlobalSuperAdmin &&
      isAssignedApprover
    ) {
      const approvalDepartmentId =
        requirement
          .approvalDepartment ||
        requirement
          .department;

      validDepartmentApprover =
        await isDepartmentSuperAdminFor(
          user._id,
          approvalDepartmentId
        );
    }

    const canReject =
      isGlobalSuperAdmin ||
      (
        isAssignedApprover &&
        validDepartmentApprover
      );

    if (
      !canReject
    ) {
      throw new ApiError(
        403,
        "Only the assigned Department Super Admin or Global Super Admin can reject this manpower requirement"
      );
    }

    const now =
      new Date();

    requirement.status =
      "REJECTED";

    requirement.currentApprover =
      null;

    requirement.rejectedBy =
      user._id;

    requirement.rejectedAt =
      now;

    requirement.rejectionReason =
      reason;

    requirement.visibleToHR =
      false;

    requirement.updatedBy =
      user._id;

    requirement
      .approvalHistory
      .push({
        action:
          "REJECTED",

        actor:
          user._id,

        remarks:
          reason,

        actionAt:
          now,
      });

    await requirement.save();

    return getRequirementById(
      requirement._id,
      user
    );
  };

/* =========================================================
   HR MANAGEMENT QUEUE

   IMPORTANT:

   This is NOT for every HR member.

   Allowed:

   - Global SUPER_ADMIN
   - HR Department Super Admin
   - HR HOD
   - HR ADMIN

   Renu as MEMBER should use My Hiring instead.
========================================================= */

const getHrQueue =
  async (
    user
  ) => {
    const canManage =
      await canManageHrHiring(
        user
      );

    if (
      !canManage
    ) {
      throw new ApiError(
        403,
        "HR management access is required to view the hiring queue"
      );
    }

    return populateRequirement(
      ManpowerRequirement
        .find({
          visibleToHR:
            true,

          status: {
            $in: [
              "APPROVED",
              "HIRING_IN_PROGRESS",
            ],
          },
        })
        .sort({
          priority:
            -1,

          approvedAt:
            -1,

          createdAt:
            -1,
        })
    ).lean();
  };

/* =========================================================
   AVAILABLE HR EMPLOYEES

   Hiring-owner dropdown.

   Only HR management / Global SUPER_ADMIN may access.
========================================================= */

const getAvailableHrEmployees =
  async (
    user
  ) => {
    const canManage =
      await canManageHrHiring(
        user
      );

    if (
      !canManage
    ) {
      throw new ApiError(
        403,
        "You do not have permission to assign hiring owners"
      );
    }

    const hrDepartment =
      await getHrDepartment();

    if (
      !hrDepartment
    ) {
      throw new ApiError(
        500,
        "HR department is not configured in SE-RMS"
      );
    }

    const memberships =
      await DepartmentMembership
        .find({
          department:
            hrDepartment._id,

          status:
            "ACTIVE",

          role: {
            $in: [
              "DEPARTMENT_SUPER_ADMIN",
              "HOD",
              "ADMIN",
              "MEMBER",
            ],
          },
        })
        .populate({
          path:
            "user",

          select:
            "_id displayName email role status employee",

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
            membership.user
          )
      )
      .map(
        (
          membership
        ) => ({
          user:
            membership.user,

          departmentRole:
            membership.role,

          isPrimary:
            Boolean(
              membership
                .isPrimary
            ),
        })
      );
  };

/* =========================================================
   ASSIGN / REASSIGN HR OWNER

   Roshan:
   HR Department Super Admin
   → can assign Renu

   Renu:
   HR Member
   → cannot reassign herself/others
========================================================= */

const assignHrToRequirement =
  async ({
    requirementId,
    hrUserId,
    user,
  }) => {
    const canManage =
      await canManageHrHiring(
        user
      );

    if (
      !canManage
    ) {
      throw new ApiError(
        403,
        "You do not have permission to assign hiring owners"
      );
    }

    const requirement =
      await ManpowerRequirement
        .findById(
          requirementId
        );

    if (
      !requirement
    ) {
      throw new ApiError(
        404,
        "Manpower requirement not found"
      );
    }

    if (
      ![
        "APPROVED",
        "HIRING_IN_PROGRESS",
      ].includes(
        requirement.status
      )
    ) {
      throw new ApiError(
        400,
        `HR cannot be assigned when requirement status is ${requirement.status}`
      );
    }

    if (
      !requirement.visibleToHR
    ) {
      throw new ApiError(
        400,
        "This requirement has not been released to HR"
      );
    }

    const {
      user:
        selectedHr,
    } =
      await getValidHrEmployee(
        hrUserId
      );

    const currentAssignedHrId =
      requirement.assignedHr
        ? String(
            requirement
              .assignedHr
          )
        : "";

    const selectedHrId =
      String(
        selectedHr._id
      );

    if (
      currentAssignedHrId &&
      currentAssignedHrId ===
        selectedHrId
    ) {
      return getRequirementById(
        requirement._id,
        user
      );
    }

    requirement.previousAssignedHr =
      requirement.assignedHr ||
      null;

    requirement.assignedHr =
      selectedHr._id;

    requirement.assignedHrAt =
      new Date();

    requirement.assignedHrBy =
      user._id;

    requirement.updatedBy =
      user._id;

    await requirement.save();

    /*
     * Reassign existing active candidates if ownership
     * changes after candidate creation.
     */
    const {
      Candidate,
    } =
      require(
        "../recruitment/candidate.model"
      );

    await Candidate
      .updateMany(
        {
          manpowerRequirement:
            requirement._id,

          isActive:
            true,

          status: {
            $nin: [
              "NOT_INTERESTED",
              "REJECTED_SCREENING",
              "REJECTED_INTERVIEW",
              "LOI_DECLINED",
              "OFFER_DECLINED",
              "JOINED",
              "CLOSED",
            ],
          },
        },

        {
          $set: {
            assignedHr:
              selectedHr._id,

            updatedBy:
              user._id,
          },
        }
      );

    return getRequirementById(
      requirement._id,
      user
    );
  };

/* =========================================================
   MY HIRING

   HR employee sees only requirements assigned to them.

   Renu:
   → gets only Renu's hiring.
========================================================= */

const getMyHiring =
  async ({
    user,
    status,
    search,
  }) => {
    const allowed =
      await isHrUser(
        user
      );

    if (
      !allowed
    ) {
      throw new ApiError(
        403,
        "HR access is required"
      );
    }

    const query = {
      assignedHr:
        user._id,

      visibleToHR:
        true,

      status: {
        $in: [
          "APPROVED",
          "HIRING_IN_PROGRESS",
        ],
      },
    };

    if (
      status
    ) {
      const normalizedStatus =
        String(
          status
        )
          .trim()
          .toUpperCase();

      if (
        ![
          "APPROVED",
          "HIRING_IN_PROGRESS",
        ].includes(
          normalizedStatus
        )
      ) {
        throw new ApiError(
          400,
          "Invalid My Hiring status"
        );
      }

      query.status =
        normalizedStatus;
    }

    if (
      search
    ) {
      const safe =
        String(
          search
        ).replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      query.$or = [
        {
          requestNumber: {
            $regex:
              safe,

            $options:
              "i",
          },
        },

        {
          positionTitle: {
            $regex:
              safe,

            $options:
              "i",
          },
        },
      ];
    }

    return populateRequirement(
      ManpowerRequirement
        .find(
          query
        )
        .sort({
          priority:
            -1,

          requiredByDate:
            1,

          createdAt:
            -1,
        })
    ).lean();
  };

/* =========================================================
   START HIRING

   Requirement must:

   1. Be APPROVED
   2. Be visible to HR
   3. Have assigned HR owner

   May start:

   - Global SUPER_ADMIN
   - HR management
   - Assigned HR owner
========================================================= */

const startHiring =
  async ({
    requirementId,
    user,
  }) => {
    const allowedHr =
      await isHrUser(
        user
      );

    if (
      !allowedHr
    ) {
      throw new ApiError(
        403,
        "HR access is required"
      );
    }

    const requirement =
      await ManpowerRequirement
        .findById(
          requirementId
        );

    if (
      !requirement
    ) {
      throw new ApiError(
        404,
        "Manpower requirement not found"
      );
    }

    if (
      requirement.status !==
      "APPROVED"
    ) {
      throw new ApiError(
        400,
        "Only approved requirements can enter hiring"
      );
    }

    if (
      !requirement.visibleToHR
    ) {
      throw new ApiError(
        400,
        "This manpower requirement has not been released to HR"
      );
    }

    if (
      !requirement
        .assignedHr
    ) {
      throw new ApiError(
        400,
        "Please assign an HR hiring owner before starting hiring"
      );
    }

    const isAssignedOwner =
      String(
        requirement
          .assignedHr
      ) ===
      String(
        user._id
      );

    const isHrManager =
      await canManageHrHiring(
        user
      );

    if (
      !isAssignedOwner &&
      !isHrManager
    ) {
      throw new ApiError(
        403,
        "Only the assigned HR owner or HR management can start this hiring process"
      );
    }

    requirement.status =
      "HIRING_IN_PROGRESS";

    requirement.hiringStartedAt =
      new Date();

    requirement.hiringStartedBy =
      user._id;

    requirement.updatedBy =
      user._id;

    await requirement.save();

    return getRequirementById(
      requirement._id,
      user
    );
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  generateRequestNumber,

  createRequirement,

  getRequirementById,

  listRequirements,

  getApprovalInbox,

  approveRequirement,

  rejectRequirement,

  getHrQueue,

  getAvailableHrEmployees,

  assignHrToRequirement,

  getMyHiring,

  startHiring,

  isHrUser,

  canManageHrHiring,
};
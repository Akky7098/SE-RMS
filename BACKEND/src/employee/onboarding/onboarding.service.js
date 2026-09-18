const mongoose =
  require(
    "mongoose"
  );

const {
  EmployeeOnboarding,
  EmployeeCodeCounter,
  ONBOARDING_COMPANIES,
  COMPANY_CODES,
} =
  require(
    "./onboarding.model"
  );

const {
  Employee,
  EMPLOYMENT_TYPES,
} =
  require(
    "../employee.model"
  );

const employeeService =
  require(
    "../employee.service"
  );

const {
  DepartmentMembership,
} =
  require(
    "../../department/departmentMembership.model"
  );

const {
  Selection,
} =
  require(
    "../../selection/selection.model"
  );

const {
  Joining,
} =
  require(
    "../../selection/joining/joining.model"
  );

const {
  Department,
} =
  require(
    "../../department/department.model"
  );

const {
  getOrgUnit,
} =
  require(
    "../../organization/organization.config"
  );

const ApiError =
  require(
    "../../utils/ApiError"
  );

/* =========================================================
   GENERIC HELPERS
========================================================= */

const validId =
  (
    value
  ) =>
    mongoose.Types.ObjectId.isValid(
      value
    );

const clean =
  (
    value
  ) =>
    String(
      value ??
        ""
    ).trim();

const cleanUpper =
  (
    value
  ) =>
    clean(
      value
    )
      .replace(
        /[\s-]+/g,
        "_"
      )
      .toUpperCase();

const cleanEmail =
  (
    value
  ) =>
    clean(
      value
    ).toLowerCase();

const objectId =
  (
    value
  ) => {
    if (
      !value
    ) {
      return null;
    }

    if (
      typeof value ===
        "object" &&
      value._id
    ) {
      return value._id;
    }

    return value;
  };

const sameId =
  (
    first,
    second
  ) => {
    const firstId =
      objectId(
        first
      );

    const secondId =
      objectId(
        second
      );

    if (
      !firstId ||
      !secondId
    ) {
      return false;
    }

    return (
      String(
        firstId
      ) ===
      String(
        secondId
      )
    );
  };

/* =========================================================
   EMPLOYMENT TYPE NORMALIZER

   IMPORTANT:
   This is the fix for:
   "Invalid employment type."

   The frontend may send:
   PERMANENT
   Permanent
   permanent
   FULL TIME
   FULL_TIME

   We normalize all supported values here.
========================================================= */

const EMPLOYMENT_TYPE_ALIASES = {
  PERMANENT:
    "PERMANENT",

  FULL_TIME:
    "PERMANENT",

  FULLTIME:
    "PERMANENT",

  REGULAR:
    "PERMANENT",

  PROBATION:
    "PROBATION",

  PROBATIONARY:
    "PROBATION",

  CONTRACT:
    "CONTRACT",

  CONTRACTUAL:
    "CONTRACT",

  TRAINEE:
    "TRAINEE",

  INTERN:
    "INTERN",

  INTERNSHIP:
    "INTERN",

  CONSULTANT:
    "CONSULTANT",

  CONSULTANCY:
    "CONSULTANT",
};

const normalizeEmploymentType =
  (
    value,
    fallback =
      "PERMANENT"
  ) => {
    if (
      value ===
        undefined ||
      value ===
        null ||
      clean(
        value
      ) ===
        ""
    ) {
      return fallback;
    }

    const normalized =
      cleanUpper(
        value
      );

    const mapped =
      EMPLOYMENT_TYPE_ALIASES[
        normalized
      ] ||
      normalized;

    /*
     * EMPLOYMENT_TYPES from employee.model is still the
     * authoritative allowed list.
     */
    if (
      Array.isArray(
        EMPLOYMENT_TYPES
      ) &&
      EMPLOYMENT_TYPES.includes(
        mapped
      )
    ) {
      return mapped;
    }

    /*
     * Defensive support if employee.model export is stale.
     */
    const safeTypes = [
      "PERMANENT",
      "PROBATION",
      "CONTRACT",
      "TRAINEE",
      "INTERN",
      "CONSULTANT",
    ];

    if (
      safeTypes.includes(
        mapped
      )
    ) {
      return mapped;
    }

    throw new ApiError(
      400,
      `Invalid employment type: ${value}.`
    );
  };

/* =========================================================
   COMPANY
========================================================= */

const getCompany =
  (
    companyCode
  ) =>
    ONBOARDING_COMPANIES.find(
      (
        company
      ) =>
        company.code ===
        cleanUpper(
          companyCode
        )
    ) ||
    null;

/* =========================================================
   CANDIDATE HELPERS
========================================================= */

const candidateMobile =
  (
    candidate
  ) =>
    clean(
      candidate?.mobile ||
      candidate?.mobileNumber ||
      candidate?.phone ||
      candidate?.phoneNumber
    );

const candidatePersonalEmail =
  (
    candidate
  ) =>
    cleanEmail(
      candidate?.email ||
      candidate?.personalEmail
    );

const candidateAddress =
  (
    candidate
  ) =>
    clean(
      candidate?.currentAddress ||
      candidate?.presentAddress ||
      candidate?.address
    );

const candidatePermanentAddress =
  (
    candidate
  ) =>
    clean(
      candidate?.permanentAddress
    );

const candidateFatherName =
  (
    candidate
  ) =>
    clean(
      candidate?.fatherName
    );

const candidateDob =
  (
    candidate
  ) =>
    candidate?.dateOfBirth ||
    candidate?.dob ||
    null;

const candidatePhoto =
  (
    candidate
  ) =>
    clean(
      candidate?.profilePhotoUrl ||
      candidate?.photoUrl ||
      candidate?.photo
    );

/* =========================================================
   RECRUITMENT FALLBACKS

   Supports old + new recruitment records.
========================================================= */

const resolveHiringHr =
  (
    selection
  ) =>
    selection?.hiringHr ||
    selection
      ?.manpowerRequirement
      ?.assignedHr ||
    selection
      ?.candidate
      ?.assignedHr ||
    null;

const resolveDepartment =
  (
    selection
  ) =>
    selection?.department ||
    selection
      ?.manpowerRequirement
      ?.department ||
    selection
      ?.candidate
      ?.department ||
    null;

const resolveDesignation =
  (
    selection
  ) =>
    clean(
      selection?.positionTitle ||
      selection
        ?.manpowerRequirement
        ?.positionTitle ||
      selection
        ?.candidate
        ?.positionTitle ||
      selection
        ?.candidate
        ?.designation
    );

const resolveEmploymentType =
  (
    selection
  ) =>
    normalizeEmploymentType(
      selection?.employmentType ||
      selection
        ?.manpowerRequirement
        ?.employmentType ||
      "PERMANENT"
    );

const resolveWorkLocation =
  (
    selection
  ) =>
    clean(
      selection?.officeLocation ||
      selection
        ?.manpowerRequirement
        ?.location ||
      selection
        ?.candidate
        ?.workLocation
    );

/* =========================================================
   ORG UNIT
========================================================= */

const resolveOrgUnitFromDepartment =
  (
    department
  ) => {
    const code =
      cleanUpper(
        department?.code
      );

    if (
      !code
    ) {
      return "";
    }

    if (
      getOrgUnit(
        code
      )
    ) {
      return code;
    }

    return "";
  };

/* =========================================================
   EMPLOYEE CODE
========================================================= */

const formatEmployeeCode =
  (
    prefix,
    sequence
  ) =>
    `${prefix}-${String(
      sequence
    ).padStart(
      3,
      "0"
    )}`;

/* =========================================================
   EMPLOYEE CODE PREVIEW
========================================================= */

const getEmployeeCodePreview =
  async (
    companyCode
  ) => {
    const normalizedCompanyCode =
      cleanUpper(
        companyCode
      );

    const company =
      getCompany(
        normalizedCompanyCode
      );

    if (
      !company
    ) {
      return "";
    }

    const counter =
      await EmployeeCodeCounter
        .findOne({
          companyCode:
            normalizedCompanyCode,
        })
        .lean();

    const nextSequence =
      (
        counter?.sequence ||
        0
      ) + 1;

    return formatEmployeeCode(
      company.employeePrefix,
      nextSequence
    );
  };

/* =========================================================
   GENERATE EMPLOYEE CODE
========================================================= */

const generateEmployeeCode =
  async (
    companyCode
  ) => {
    const normalizedCompanyCode =
      cleanUpper(
        companyCode
      );

    const company =
      getCompany(
        normalizedCompanyCode
      );

    if (
      !company
    ) {
      throw new ApiError(
        400,
        "Invalid company."
      );
    }

    const counter =
      await EmployeeCodeCounter
        .findOneAndUpdate(
          {
            companyCode:
              normalizedCompanyCode,
          },

          {
            $inc: {
              sequence:
                1,
            },
          },

          {
            new:
              true,

            upsert:
              true,

            setDefaultsOnInsert:
              true,
          }
        );

    return formatEmployeeCode(
      company.employeePrefix,
      counter.sequence
    );
  };

/* =========================================================
   POPULATE ONBOARDING
========================================================= */

const populateOnboarding =
  (
    query
  ) =>
    query
      .populate(
        "candidate"
      )
      .populate(
        "employee",
        [
          "employeeCode",
          "fullName",
          "officialEmail",
          "personalEmail",
          "designation",
          "status",
          "companyCode",
          "joiningDate",
          "workLocation",
          "department",
          "reportsTo",
        ].join(
          " "
        )
      )
      .populate(
        "department",
        "name code slug status"
      )
      .populate(
        "reportsTo",
        "employeeCode fullName designation officialEmail orgUnitCode status"
      )
      .populate(
        "hiringHr",
        "displayName email role systemRole status"
      )
      .populate(
        "createdBy",
        "displayName email"
      )
      .populate(
        "updatedBy",
        "displayName email"
      )
      .populate(
        "auditTrail.performedBy",
        "displayName email"
      );

/* =========================================================
   GET SELECTION
========================================================= */

const getSelectionForOnboarding =
  async (
    selectionId
  ) => {
    if (
      !validId(
        selectionId
      )
    ) {
      throw new ApiError(
        400,
        "Invalid Selection ID."
      );
    }

    const selection =
      await Selection
        .findById(
          selectionId
        )
        .populate({
          path:
            "candidate",

          populate: [
            {
              path:
                "assignedHr",

              select:
                "displayName email role systemRole status",
            },

            {
              path:
                "department",

              select:
                "name code slug status",
            },
          ],
        })
        .populate(
          "department",
          "name code slug status"
        )
        .populate(
          "hiringHr",
          "displayName email role systemRole status"
        )
        .populate({
          path:
            "manpowerRequirement",

          select:
            [
              "requestNumber",
              "positionTitle",
              "employmentType",
              "location",
              "department",
              "assignedHr",
            ].join(
              " "
            ),

          populate: [
            {
              path:
                "assignedHr",

              select:
                "displayName email role systemRole status",
            },

            {
              path:
                "department",

              select:
                "name code slug status",
            },
          ],
        })
        .populate(
          "currentOffer"
        );

    if (
      !selection
    ) {
      throw new ApiError(
        404,
        "Selection record not found."
      );
    }

    return selection;
  };

/* =========================================================
   GET JOINING
========================================================= */

const getJoiningForOnboarding =
  async (
    selectionId
  ) => {
    const joining =
      await Joining
        .findOne({
          selection:
            selectionId,
        });

    if (
      !joining
    ) {
      throw new ApiError(
        404,
        "Joining record not found."
      );
    }

    if (
      ![
        "DAY1_CONFIRMED",
        "COMPLETED",
      ].includes(
        joining.status
      )
    ) {
      throw new ApiError(
        409,
        "Day 1 must be confirmed before Employee Onboarding can begin."
      );
    }

    return joining;
  };

/* =========================================================
   READINESS
========================================================= */

const getOnboardingReadiness =
  async (
    selectionId
  ) => {
    const selection =
      await getSelectionForOnboarding(
        selectionId
      );

    const joining =
      await getJoiningForOnboarding(
        selectionId
      );

    const existing =
      await EmployeeOnboarding
        .findOne({
          selection:
            selection._id,
        })
        .lean();

    const hiringHr =
      resolveHiringHr(
        selection
      );

    const department =
      resolveDepartment(
        selection
      );

    return {
      ready:
        true,

      hasOnboarding:
        Boolean(
          existing
        ),

      onboardingId:
        existing?._id ||
        null,

      selectionStatus:
        selection.status,

      joiningStatus:
        joining.status,

      actualJoiningDate:
        joining.actualJoiningDate,

      designation:
        resolveDesignation(
          selection
        ),

      employmentType:
        resolveEmploymentType(
          selection
        ),

      workLocation:
        resolveWorkLocation(
          selection
        ),

      department,

      hiringHr,

      candidate: {
        id:
          objectId(
            selection.candidate
          ),

        fullName:
          clean(
            selection
              ?.candidate
              ?.fullName
          ),

        personalEmail:
          candidatePersonalEmail(
            selection.candidate
          ),

        mobileNumber:
          candidateMobile(
            selection.candidate
          ),

        fatherName:
          candidateFatherName(
            selection.candidate
          ),

        dateOfBirth:
          candidateDob(
            selection.candidate
          ),

        presentAddress:
          candidateAddress(
            selection.candidate
          ),

        permanentAddress:
          candidatePermanentAddress(
            selection.candidate
          ),

        profilePhotoUrl:
          candidatePhoto(
            selection.candidate
          ),
      },
    };
  };

/* =========================================================
   START ONBOARDING
========================================================= */

const startOnboarding =
  async ({
    selectionId,
    actor,
    actorUserId,
  }) => {
    const selection =
      await getSelectionForOnboarding(
        selectionId
      );

    await assertOnboardingActionAccess({
      actor,
      selection,
    });

    const joining =
      await getJoiningForOnboarding(
        selectionId
      );

    const existing =
      await EmployeeOnboarding
        .findOne({
          selection:
            selection._id,
        });

    if (
      existing
    ) {
      return populateOnboarding(
        EmployeeOnboarding
          .findById(
            existing._id
          )
      );
    }

    const candidate =
      selection.candidate ||
      {};

    const department =
      resolveDepartment(
        selection
      );

    const hiringHr =
      resolveHiringHr(
        selection
      );

    const designation =
      resolveDesignation(
        selection
      );

    const employmentType =
      resolveEmploymentType(
        selection
      );

    const workLocation =
      resolveWorkLocation(
        selection
      );

    const orgUnitCode =
      resolveOrgUnitFromDepartment(
        department
      );

    const onboarding =
      await EmployeeOnboarding
        .create({
          selection:
            selection._id,

          joining:
            joining._id,

          candidate:
            objectId(
              candidate
            ),

          fullName:
            clean(
              candidate.fullName
            ),

          personalEmail:
            candidatePersonalEmail(
              candidate
            ),

          mobileNumber:
            candidateMobile(
              candidate
            ),

          fatherName:
            candidateFatherName(
              candidate
            ),

          dateOfBirth:
            candidateDob(
              candidate
            ),

          presentAddress:
            candidateAddress(
              candidate
            ),

          permanentAddress:
            candidatePermanentAddress(
              candidate
            ),

          profilePhotoUrl:
            candidatePhoto(
              candidate
            ),

          designation,

          employmentType,

          joiningDate:
            joining.actualJoiningDate ||
            selection.finalJoiningDate ||
            selection.proposedJoiningDate ||
            null,

          workLocation,

          orgUnitCode,

          department:
            objectId(
              department
            ),

          hiringHr:
            objectId(
              hiringHr
            ),

          status:
            "STARTED",

          createdBy:
            actorUserId,

          updatedBy:
            actorUserId,

          auditTrail: [
            {
              event:
                "ONBOARDING_STARTED",

              remarks:
                "Employee onboarding started from confirmed Day 1 recruitment record.",

              performedBy:
                actorUserId,
            },
          ],
        });

    return populateOnboarding(
      EmployeeOnboarding
        .findById(
          onboarding._id
        )
    );
  };

/* =========================================================
   GET ONBOARDING BY ID
========================================================= */

const getOnboardingById =
  async (
    onboardingId
  ) => {
    if (
      !validId(
        onboardingId
      )
    ) {
      throw new ApiError(
        400,
        "Invalid Onboarding ID."
      );
    }

    const onboarding =
      await populateOnboarding(
        EmployeeOnboarding
          .findById(
            onboardingId
          )
      );

    if (
      !onboarding
    ) {
      throw new ApiError(
        404,
        "Onboarding record not found."
      );
    }

    return onboarding;
  };

/* =========================================================
   GET BY SELECTION
========================================================= */

const getOnboardingBySelection =
  async (
    selectionId
  ) => {
    if (
      !validId(
        selectionId
      )
    ) {
      throw new ApiError(
        400,
        "Invalid Selection ID."
      );
    }

    return populateOnboarding(
      EmployeeOnboarding
        .findOne({
          selection:
            selectionId,
        })
    );
  };

/* =========================================================
   UPDATE ONBOARDING
========================================================= */

const updateOnboarding =
  async ({
    onboardingId,
    payload =
      {},
    actor,
    actorUserId,
  }) => {
    if (
      !validId(
        onboardingId
      )
    ) {
      throw new ApiError(
        400,
        "Invalid Onboarding ID."
      );
    }

    const onboarding =
      await EmployeeOnboarding
        .findById(
          onboardingId
        );

    if (
      !onboarding
    ) {
      throw new ApiError(
        404,
        "Onboarding record not found."
      );
    }

    /* =====================================================
       AUTHORIZATION
    ===================================================== */

    const selection =
      await getSelectionForOnboarding(
        onboarding.selection
      );

    await assertOnboardingActionAccess({
      actor,
      selection,
    });

    /* =====================================================
       STATE PROTECTION
    ===================================================== */

    if (
      onboarding.status ===
      "COMPLETED"
    ) {
      throw new ApiError(
        409,
        "Completed onboarding cannot be modified."
      );
    }

    if (
      onboarding.status ===
      "CANCELLED"
    ) {
      throw new ApiError(
        409,
        "Cancelled onboarding cannot be modified."
      );
    }

    /* =====================================================
       COMPANY
    ===================================================== */

    if (
      payload.companyCode !==
      undefined
    ) {
      const companyCode =
        cleanUpper(
          payload.companyCode
        );

      if (
        companyCode &&
        !COMPANY_CODES.includes(
          companyCode
        )
      ) {
        throw new ApiError(
          400,
          "Invalid company."
        );
      }

      onboarding.companyCode =
        companyCode;
    }

    /* =====================================================
       EMPLOYMENT TYPE

       FIXED:
       Never manually compare raw frontend value again.
    ===================================================== */

    if (
      payload.employmentType !==
      undefined
    ) {
      onboarding.employmentType =
        normalizeEmploymentType(
          payload.employmentType,
          onboarding.employmentType ||
          "PERMANENT"
        );
    }

    /* =====================================================
       ORG UNIT
    ===================================================== */

    if (
      payload.orgUnitCode !==
      undefined
    ) {
      const code =
        cleanUpper(
          payload.orgUnitCode
        );

      if (
        code &&
        !getOrgUnit(
          code
        )
      ) {
        throw new ApiError(
          400,
          `Invalid organisation unit: ${code}.`
        );
      }

      onboarding.orgUnitCode =
        code;
    }

    /* =====================================================
       DEPARTMENT
    ===================================================== */

    if (
      payload.department !==
      undefined
    ) {
      if (
        payload.department
      ) {
        if (
          !validId(
            payload.department
          )
        ) {
          throw new ApiError(
            400,
            "Invalid Department ID."
          );
        }

        const department =
          await Department
            .findOne({
              _id:
                payload.department,

              status:
                "ACTIVE",
            });

        if (
          !department
        ) {
          throw new ApiError(
            400,
            "Department is unavailable."
          );
        }

        onboarding.department =
          department._id;

        const inferredOrgUnit =
          resolveOrgUnitFromDepartment(
            department
          );

        if (
          inferredOrgUnit
        ) {
          onboarding.orgUnitCode =
            inferredOrgUnit;
        }
      } else {
        onboarding.department =
          null;
      }
    }

    /* =====================================================
       REPORTING MANAGER
    ===================================================== */

    if (
      payload.reportsTo !==
      undefined
    ) {
      if (
        payload.reportsTo
      ) {
        if (
          !validId(
            payload.reportsTo
          )
        ) {
          throw new ApiError(
            400,
            "Invalid Reporting Manager ID."
          );
        }

        const manager =
          await Employee
            .findOne({
              _id:
                payload.reportsTo,

              status: {
                $in: [
                  "ACTIVE",
                  "NOTICE_PERIOD",
                  "ONBOARDING",
                ],
              },
            });

        if (
          !manager
        ) {
          throw new ApiError(
            400,
            "Reporting Manager is unavailable."
          );
        }

        onboarding.reportsTo =
          manager._id;
      } else {
        onboarding.reportsTo =
          null;
      }
    }

    /* =====================================================
       TEXT FIELDS
    ===================================================== */

    const textFields = [
      "fullName",
      "personalEmail",
      "officialEmail",
      "mobileNumber",
      "fatherName",
      "presentAddress",
      "permanentAddress",
      "designation",
      "workLocation",
      "profilePhotoUrl",
    ];

    for (
      const field
      of textFields
    ) {
      if (
        payload[field] !==
        undefined
      ) {
        const value =
          clean(
            payload[field]
          );

        if (
          [
            "personalEmail",
            "officialEmail",
          ].includes(
            field
          )
        ) {
          onboarding[field] =
            value.toLowerCase();
        } else {
          onboarding[field] =
            value;
        }
      }
    }

    /* =====================================================
       DATES
    ===================================================== */

    if (
      payload.dateOfBirth !==
      undefined
    ) {
      onboarding.dateOfBirth =
        payload.dateOfBirth ||
        null;
    }

    if (
      payload.joiningDate !==
      undefined
    ) {
      onboarding.joiningDate =
        payload.joiningDate ||
        null;
    }

    /* =====================================================
       CHECKLIST
    ===================================================== */

    if (
      !onboarding.checklist
    ) {
      onboarding.checklist =
        {};
    }

    const profileComplete =
      Boolean(
        onboarding.companyCode &&
        onboarding.fullName &&
        onboarding.orgUnitCode &&
        onboarding.designation &&
        onboarding.joiningDate
      );

    onboarding.checklist.employeeProfile =
      profileComplete;

    onboarding.checklist.reportingHierarchy =
      Boolean(
        onboarding.reportsTo
      );

    if (
      profileComplete &&
      onboarding.status ===
        "STARTED"
    ) {
      onboarding.status =
        "PROFILE_READY";
    }

    onboarding.updatedBy =
      actorUserId;

    if (
      !Array.isArray(
        onboarding.auditTrail
      )
    ) {
      onboarding.auditTrail =
        [];
    }

    onboarding.auditTrail.push({
      event:
        "PROFILE_UPDATED",

      remarks:
        "Employee onboarding information updated.",

      performedBy:
        actorUserId,
    });

    await onboarding.save();

    return getOnboardingById(
      onboarding._id
    );
  };

/* =========================================================
   MANAGER OPTIONS

   IMPORTANT:
   Do not hard-filter by org unit.

   Same department / org unit is ranked first,
   but cross-department managers remain available.
========================================================= */

const getManagerOptions =
  async ({
    search,
    orgUnitCode,
    departmentId,
    limit =
      100,
  }) => {
    const safeLimit =
      Math.min(
        Math.max(
          Number(
            limit
          ) ||
          100,
          1
        ),
        200
      );

    const filter = {
      status: {
        $in: [
          "ACTIVE",
          "NOTICE_PERIOD",
        ],
      },
    };

    if (
      clean(
        search
      )
    ) {
      const escaped =
        clean(
          search
        ).replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      const regex =
        new RegExp(
          escaped,
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
          designation:
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
      ];
    }

    const employees =
      await Employee
        .find(
          filter
        )
        .select(
          [
            "employeeCode",
            "fullName",
            "designation",
            "officialEmail",
            "personalEmail",
            "orgUnitCode",
            "workLocation",
            "status",
            "department",
            "reportsTo",
          ].join(
            " "
          )
        )
        .populate(
          "department",
          "name code slug"
        )
        .lean();

    const requestedOrgUnit =
      cleanUpper(
        orgUnitCode
      );

    const requestedDepartment =
      clean(
        departmentId
      );

    return employees
      .map(
        (
          employee
        ) => {
          let managerPriority =
            0;

          const employeeDepartmentId =
            objectId(
              employee.department
            );

          if (
            requestedDepartment &&
            employeeDepartmentId &&
            String(
              requestedDepartment
            ) ===
              String(
                employeeDepartmentId
              )
          ) {
            managerPriority +=
              20;
          }

          if (
            requestedOrgUnit &&
            cleanUpper(
              employee.orgUnitCode
            ) ===
              requestedOrgUnit
          ) {
            managerPriority +=
              10;
          }

          return {
            ...employee,

            managerPriority,
          };
        }
      )
      .sort(
        (
          first,
          second
        ) => {
          if (
            second.managerPriority !==
            first.managerPriority
          ) {
            return (
              second.managerPriority -
              first.managerPriority
            );
          }

          return String(
            first.fullName ||
              ""
          ).localeCompare(
            String(
              second.fullName ||
                ""
            )
          );
        }
      )
      .slice(
        0,
        safeLimit
      );
  };

/* =========================================================
   CREATE EMPLOYEE
========================================================= */

const createEmployeeFromOnboarding =
  async ({
    onboardingId,
    actor,
    actorUserId,
  }) => {
    if (
      !validId(
        onboardingId
      )
    ) {
      throw new ApiError(
        400,
        "Invalid Onboarding ID."
      );
    }

    const onboarding =
      await EmployeeOnboarding
        .findById(
          onboardingId
        );

    if (
      !onboarding
    ) {
      throw new ApiError(
        404,
        "Onboarding record not found."
      );
    }

    /* =====================================================
       AUTHORIZATION
    ===================================================== */

    const selection =
      await getSelectionForOnboarding(
        onboarding.selection
      );

    await assertOnboardingActionAccess({
      actor,
      selection,
    });

    /* =====================================================
       IDEMPOTENCY
    ===================================================== */

    if (
      onboarding.employee
    ) {
      return getOnboardingById(
        onboarding._id
      );
    }

    /* =====================================================
       VALIDATE
    ===================================================== */

    if (
      !onboarding.companyCode
    ) {
      throw new ApiError(
        422,
        "Company is required before creating Employee."
      );
    }

    if (
      !COMPANY_CODES.includes(
        onboarding.companyCode
      )
    ) {
      throw new ApiError(
        422,
        "A valid company is required before creating Employee."
      );
    }

    if (
      !onboarding.fullName
    ) {
      throw new ApiError(
        422,
        "Employee name is required."
      );
    }

    if (
      !onboarding.orgUnitCode ||
      !getOrgUnit(
        onboarding.orgUnitCode
      )
    ) {
      throw new ApiError(
        422,
        "Organisation unit is required."
      );
    }

    if (
      !onboarding.designation
    ) {
      throw new ApiError(
        422,
        "Designation is required."
      );
    }

    if (
      !onboarding.joiningDate
    ) {
      throw new ApiError(
        422,
        "Joining date is required."
      );
    }

    if (
      !onboarding.reportsTo
    ) {
      throw new ApiError(
        422,
        "Reporting Manager is required."
      );
    }

    /*
     * Normalize one final time before Employee creation.
     */
    const employmentType =
      normalizeEmploymentType(
        onboarding.employmentType,
        "PERMANENT"
      );

    const employeeCode =
      await generateEmployeeCode(
        onboarding.companyCode
      );

    /* =====================================================
       CREATE
    ===================================================== */

    const employee =
      await employeeService
        .createEmployee({
          payload: {
            employeeCode,

            companyCode:
              onboarding.companyCode,

            fullName:
              onboarding.fullName,

            personalEmail:
              onboarding.personalEmail ||
              null,

            officialEmail:
              onboarding.officialEmail ||
              null,

            mobileNumber:
              onboarding.mobileNumber ||
              null,

            orgUnitCode:
              onboarding.orgUnitCode,

            department:
              onboarding.department ||
              null,

            designation:
              onboarding.designation,

            reportsTo:
              onboarding.reportsTo,

            employmentType,

            joiningDate:
              onboarding.joiningDate,

            workLocation:
              onboarding.workLocation ||
              null,

            profilePhotoUrl:
              onboarding.profilePhotoUrl ||
              null,

            /*
             * The Employee exists, but onboarding has not
             * finished yet.
             */
            status:
              "ONBOARDING",

            createLogin:
              false,

            source:
              "RECRUITMENT",

            recruitmentCandidate:
              onboarding.candidate,

            recruitmentSelection:
              onboarding.selection,

            recruitmentJoining:
              onboarding.joining,

            onboarding:
              onboarding._id,
          },

          actorUserId,
        });

    /* =====================================================
       LINK
    ===================================================== */

    onboarding.employee =
      employee._id;

    onboarding.employeeCode =
      employee.employeeCode;

    onboarding.employmentType =
      employmentType;

    onboarding.status =
      "EMPLOYEE_CREATED";

    onboarding.employeeCreatedAt =
      new Date();

    if (
      !onboarding.checklist
    ) {
      onboarding.checklist =
        {};
    }

    onboarding.checklist.employeeProfile =
      true;

    onboarding.checklist.reportingHierarchy =
      Boolean(
        onboarding.reportsTo
      );

    onboarding.updatedBy =
      actorUserId;

    if (
      !Array.isArray(
        onboarding.auditTrail
      )
    ) {
      onboarding.auditTrail =
        [];
    }

    onboarding.auditTrail.push({
      event:
        "EMPLOYEE_CREATED",

      remarks:
        `Employee ${employee.employeeCode} created from recruitment onboarding.`,

      performedBy:
        actorUserId,

      metadata: {
        employeeId:
          employee._id,

        employeeCode:
          employee.employeeCode,

        companyCode:
          onboarding.companyCode,

        employmentType,
      },
    });

    await onboarding.save();

    /* =====================================================
       UPDATE JOINING
    ===================================================== */

    await Joining
      .findByIdAndUpdate(
        onboarding.joining,
        {
          employee:
            employee._id,

          employeeCreationStatus:
            "CREATED",

          employeeCreationError:
            "",
        }
      );

    return getOnboardingById(
      onboarding._id
    );
  };

/* =========================================================
   VIEWER SCOPE
========================================================= */

const getOnboardingViewerScope =
  async (
    actor
  ) => {
    if (
      !actor?._id
    ) {
      throw new ApiError(
        401,
        "Authenticated user is required."
      );
    }

    const role =
      cleanUpper(
        actor.role
      );

    const systemRole =
      cleanUpper(
        actor.systemRole
      );

    if (
      role ===
        "SUPER_ADMIN" ||
      systemRole ===
        "SUPER_ADMIN"
    ) {
      return {
        type:
          "ALL",
      };
    }

    const memberships =
      await DepartmentMembership
        .find({
          user:
            actor._id,

          status:
            "ACTIVE",
        })
        .populate(
          "department",
          "name code slug status"
        )
        .lean();

    const hrMembership =
      memberships.find(
        (
          membership
        ) => {
          const code =
            cleanUpper(
              membership
                ?.department
                ?.code
            );

          const name =
            cleanUpper(
              membership
                ?.department
                ?.name
            );

          const slug =
            clean(
              membership
                ?.department
                ?.slug
            ).toLowerCase();

          return (
            code ===
              "HR" ||
            code ===
              "HUMAN_RESOURCES" ||
            name ===
              "HR" ||
            name ===
              "HUMAN_RESOURCES" ||
            slug ===
              "hr" ||
            slug ===
              "human-resources"
          );
        }
      );

    if (
      hrMembership
    ) {
      const hrRole =
        cleanUpper(
          hrMembership.role
        );

      const leadership =
        [
          "DEPARTMENT_SUPER_ADMIN",
          "HOD",
          "ADMIN",
          "HEAD",
        ].includes(
          hrRole
        ) ||
        Boolean(
          hrMembership
            .canManageMembers
        );

      if (
        leadership
      ) {
        return {
          type:
            "ALL",
        };
      }

      return {
        type:
          "ASSIGNED_HR",

        userId:
          actor._id,
      };
    }

    const leadershipDepartments =
      memberships
        .filter(
          (
            membership
          ) =>
            [
              "DEPARTMENT_SUPER_ADMIN",
              "HOD",
              "ADMIN",
              "HEAD",
            ].includes(
              cleanUpper(
                membership.role
              )
            ) ||
            Boolean(
              membership
                .canManageMembers
            )
        )
        .map(
          (
            membership
          ) =>
            objectId(
              membership.department
            )
        )
        .filter(
          Boolean
        );

    if (
      leadershipDepartments.length >
      0
    ) {
      return {
        type:
          "DEPARTMENTS",

        departmentIds:
          leadershipDepartments,
      };
    }

    return {
      type:
        "NONE",
    };
  };

/* =========================================================
   WRITE ACCESS
========================================================= */

const assertOnboardingActionAccess =
  async ({
    actor,
    selection,
  }) => {
    const scope =
      await getOnboardingViewerScope(
        actor
      );

    if (
      scope.type ===
      "ALL"
    ) {
      return true;
    }

    if (
      scope.type ===
      "ASSIGNED_HR"
    ) {
      const possibleHiringHrIds = [
        objectId(
          selection?.hiringHr
        ),

        objectId(
          selection
            ?.manpowerRequirement
            ?.assignedHr
        ),

        objectId(
          selection
            ?.candidate
            ?.assignedHr
        ),

        objectId(
          resolveHiringHr(
            selection
          )
        ),
      ].filter(
        Boolean
      );

      const allowed =
        possibleHiringHrIds.some(
          (
            id
          ) =>
            sameId(
              id,
              scope.userId
            )
        );

      if (
        allowed
      ) {
        return true;
      }

      throw new ApiError(
        403,
        "You can only manage onboarding assigned to you."
      );
    }

    if (
      scope.type ===
      "DEPARTMENTS"
    ) {
      throw new ApiError(
        403,
        "Department leadership may view onboarding but cannot perform HR onboarding actions."
      );
    }

    throw new ApiError(
      403,
      "You do not have permission to manage this onboarding."
    );
  };

/* =========================================================
   LIST ONBOARDING
========================================================= */

const listOnboarding =
  async ({
    query =
      {},
    actor,
  }) => {
    let page =
      Math.max(
        Number(
          query.page
        ) ||
          1,
        1
      );

    const limit =
      Math.min(
        Math.max(
          Number(
            query.limit
          ) ||
            20,
          1
        ),
        100
      );

    const search =
      clean(
        query.search
      );

    const viewerScope =
      await getOnboardingViewerScope(
        actor
      );

    if (
      viewerScope.type ===
      "NONE"
    ) {
      return {
        records:
          [],

        onboarding:
          [],

        pagination: {
          page:
            1,

          limit,

          total:
            0,

          pages:
            1,
        },

        scope: {
          type:
            "NONE",
        },
      };
    }

    const joinings =
      await Joining
        .find({
          status: {
            $in: [
              "DAY1_CONFIRMED",
              "COMPLETED",
            ],
          },
        })
        .select(
          [
            "_id",
            "selection",
            "candidate",
            "employee",
            "actualJoiningDate",
            "expectedJoiningDate",
            "day1ConfirmedAt",
            "employeeCreationStatus",
          ].join(
            " "
          )
        )
        .sort({
          day1ConfirmedAt:
            -1,

          actualJoiningDate:
            -1,
        })
        .lean();

    if (
      joinings.length ===
      0
    ) {
      return {
        records:
          [],

        onboarding:
          [],

        pagination: {
          page:
            1,

          limit,

          total:
            0,

          pages:
            1,
        },

        scope: {
          type:
            viewerScope.type,
        },
      };
    }

    const selectionIds =
      joinings
        .map(
          (
            joining
          ) =>
            joining.selection
        )
        .filter(
          Boolean
        );

    const selections =
      await Selection
        .find({
          _id: {
            $in:
              selectionIds,
          },
        })
        .populate({
          path:
            "candidate",

          populate: [
            {
              path:
                "assignedHr",

              select:
                "displayName email role systemRole status",
            },

            {
              path:
                "department",

              select:
                "name code slug status",
            },
          ],
        })
        .populate(
          "department",
          "name code slug status"
        )
        .populate(
          "hiringHr",
          "displayName email role systemRole status"
        )
        .populate({
          path:
            "manpowerRequirement",

          select:
            "requestNumber positionTitle employmentType location department assignedHr",

          populate: [
            {
              path:
                "assignedHr",

              select:
                "displayName email role systemRole status",
            },

            {
              path:
                "department",

              select:
                "name code slug status",
            },
          ],
        })
        .lean();

    const selectionMap =
      new Map(
        selections.map(
          (
            selection
          ) => [
            String(
              selection._id
            ),
            selection,
          ]
        )
      );

    const existingOnboardings =
      await populateOnboarding(
        EmployeeOnboarding
          .find({
            selection: {
              $in:
                selectionIds,
            },
          })
      );

    const onboardingMap =
      new Map(
        existingOnboardings.map(
          (
            onboarding
          ) => [
            String(
              objectId(
                onboarding.selection
              )
            ),
            onboarding,
          ]
        )
      );

    let records =
      [];

    for (
      const joining
      of joinings
    ) {
      const selection =
        selectionMap.get(
          String(
            joining.selection
          )
        );

      if (
        !selection
      ) {
        continue;
      }

      const candidate =
        selection.candidate ||
        {};

      const department =
        resolveDepartment(
          selection
        );

      const hiringHr =
        resolveHiringHr(
          selection
        );

      if (
        viewerScope.type ===
        "ASSIGNED_HR"
      ) {
        const hrIds = [
          selection?.hiringHr,
          selection
            ?.manpowerRequirement
            ?.assignedHr,
          selection
            ?.candidate
            ?.assignedHr,
          hiringHr,
        ]
          .map(
            objectId
          )
          .filter(
            Boolean
          );

        if (
          !hrIds.some(
            (
              id
            ) =>
              sameId(
                id,
                viewerScope.userId
              )
          )
        ) {
          continue;
        }
      }

      if (
        viewerScope.type ===
        "DEPARTMENTS"
      ) {
        const departmentIds = [
          selection?.department,
          selection
            ?.manpowerRequirement
            ?.department,
          selection
            ?.candidate
            ?.department,
          department,
        ]
          .map(
            objectId
          )
          .filter(
            Boolean
          );

        const allowed =
          viewerScope
            .departmentIds
            .some(
              (
                allowedId
              ) =>
                departmentIds.some(
                  (
                    candidateDepartmentId
                  ) =>
                    sameId(
                      allowedId,
                      candidateDepartmentId
                    )
                )
            );

        if (
          !allowed
        ) {
          continue;
        }
      }

      const onboarding =
        onboardingMap.get(
          String(
            selection._id
          )
        ) ||
        null;

      if (
        onboarding &&
        [
          "COMPLETED",
          "CANCELLED",
        ].includes(
          cleanUpper(
            onboarding.status
          )
        )
      ) {
        continue;
      }

      if (
        joining.status ===
          "COMPLETED" &&
        !onboarding
      ) {
        continue;
      }

      const onboardingStatus =
        onboarding?.status ||
        "DAY1_CONFIRMED";

      records.push({
        _id:
          onboarding?._id ||
          joining._id,

        recordType:
          onboarding
            ? "ONBOARDING"
            : "DAY1",

        onboardingId:
          onboarding?._id ||
          null,

        selectionId:
          selection._id,

        joiningId:
          joining._id,

        candidateId:
          objectId(
            candidate
          ) ||
          joining.candidate ||
          null,

        employeeId:
          objectId(
            onboarding?.employee
          ) ||
          joining.employee ||
          null,

        fullName:
          onboarding
            ?.fullName ||
          clean(
            candidate.fullName
          ),

        personalEmail:
          onboarding
            ?.personalEmail ||
          candidatePersonalEmail(
            candidate
          ),

        mobileNumber:
          onboarding
            ?.mobileNumber ||
          candidateMobile(
            candidate
          ),

        designation:
          onboarding
            ?.designation ||
          resolveDesignation(
            selection
          ),

        employmentType:
          onboarding
            ?.employmentType ||
          resolveEmploymentType(
            selection
          ),

        joiningDate:
          onboarding
            ?.joiningDate ||
          joining.actualJoiningDate ||
          selection.finalJoiningDate ||
          selection.proposedJoiningDate ||
          null,

        actualJoiningDate:
          joining.actualJoiningDate,

        day1ConfirmedAt:
          joining.day1ConfirmedAt,

        workLocation:
          onboarding
            ?.workLocation ||
          resolveWorkLocation(
            selection
          ),

        companyCode:
          onboarding
            ?.companyCode ||
          "",

        employeeCode:
          onboarding
            ?.employeeCode ||
          "",

        employee:
          onboarding
            ?.employee ||
          null,

        employeeCreationStatus:
          joining
            .employeeCreationStatus ||
          "PENDING",

        department:
          onboarding
            ?.department ||
          department ||
          null,

        departmentName:
          onboarding
            ?.department
            ?.name ||
          department
            ?.name ||
          "",

        orgUnitCode:
          onboarding
            ?.orgUnitCode ||
          resolveOrgUnitFromDepartment(
            department
          ),

        hiringHr:
          onboarding
            ?.hiringHr ||
          hiringHr ||
          null,

        hiringHrId:
          objectId(
            onboarding
              ?.hiringHr
          ) ||
          objectId(
            hiringHr
          ),

        hiringHrName:
          onboarding
            ?.hiringHr
            ?.displayName ||
          hiringHr
            ?.displayName ||
          "",

        status:
          onboardingStatus,

        onboardingStatus,

        checklist:
          onboarding
            ?.checklist ||
          {},

        reportsTo:
          onboarding
            ?.reportsTo ||
          null,
      });
    }

    if (
      search
    ) {
      const needle =
        search.toLowerCase();

      records =
        records.filter(
          (
            record
          ) =>
            [
              record.fullName,
              record.personalEmail,
              record.mobileNumber,
              record.designation,
              record.departmentName,
              record.hiringHrName,
              record.employeeCode,
              record.workLocation,
            ]
              .filter(
                Boolean
              )
              .some(
                (
                  value
                ) =>
                  String(
                    value
                  )
                    .toLowerCase()
                    .includes(
                      needle
                    )
              )
        );
    }

    records.sort(
      (
        first,
        second
      ) =>
        new Date(
          second.actualJoiningDate ||
          second.day1ConfirmedAt ||
          0
        ) -
        new Date(
          first.actualJoiningDate ||
          first.day1ConfirmedAt ||
          0
        )
    );

    const total =
      records.length;

    const pages =
      Math.max(
        1,
        Math.ceil(
          total /
          limit
        )
      );

    if (
      page >
      pages
    ) {
      page =
        pages;
    }

    const skip =
      (
        page -
        1
      ) *
      limit;

    const paginatedRecords =
      records.slice(
        skip,
        skip +
          limit
      );

    return {
      records:
        paginatedRecords,

      onboarding:
        paginatedRecords,

      pagination: {
        page,

        limit,

        total,

        pages,
      },

      scope: {
        type:
          viewerScope.type,
      },
    };
  };

/* =========================================================
   META
========================================================= */

const getOnboardingMeta =
  async () => {
    const previews =
      {};

    for (
      const company
      of ONBOARDING_COMPANIES
    ) {
      previews[
        company.code
      ] =
        await getEmployeeCodePreview(
          company.code
        );
    }

    const departments =
      await Department
        .find({
          status:
            "ACTIVE",
        })
        .select(
          "name code parentDepartment displayOrder"
        )
        .sort({
          displayOrder:
            1,

          name:
            1,
        })
        .lean();

    /*
     * Always return normalized employment types.
     */
    const employmentTypes =
      [
        "PERMANENT",
        "PROBATION",
        "CONTRACT",
        "TRAINEE",
        "INTERN",
        "CONSULTANT",
      ];

    return {
      companies:
        ONBOARDING_COMPANIES.map(
          (
            company
          ) => ({
            ...company,

            nextEmployeeCodePreview:
              previews[
                company.code
              ],
          })
        ),

      employmentTypes,

      departments,
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getOnboardingReadiness,

  startOnboarding,

  getOnboardingById,

  getOnboardingBySelection,

  updateOnboarding,

  getManagerOptions,

  createEmployeeFromOnboarding,

  listOnboarding,

  getOnboardingMeta,

  getEmployeeCodePreview,
};
const crypto = require("crypto");

const {
  ManpowerRequirement,
} = require(
  "./manpowerRequirement.model"
);

const {
  ManpowerCounter,
} = require(
  "./manpowerCounter.model"
);

const {
  Department,
} = require(
  "../department/department.model"
);

const {
  DepartmentMembership,
} = require(
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

const employeeModule =
  require(
    "../employee/employee.model"
  );

const ApiError =
  require(
    "../utils/ApiError"
  );

const User =
  UserModule.User ||
  UserModule;

const Employee =
  employeeModule.Employee ||
  employeeModule;

/* =========================================================
   IMPORTANT — BAILEYS

   DO NOT import baileys.client.js at the top of this file.

   baileys.client.js
        ↓
   manpower.whatsapp.service.js
        ↓
   manpower.service.js

   A top-level import here would create a circular dependency.

   We therefore load Baileys ONLY when a message must be sent.
========================================================= */

const getWhatsAppClient =
  () =>
    require(
      "../baileys/baileysClient"
    );

/* =========================================================
   WHATSAPP APPROVAL CONFIG
========================================================= */

const getApprovalPublicUrl =
  () => {
    const configured =
      String(
        process.env
          .MANPOWER_APPROVAL_PUBLIC_URL ||
        "https://api.nuvanata.io/api/v1/manpower/public/approval"
      )
        .trim()
        .replace(
          /\/+$/,
          ""
        );

    return configured;
  };

const getApprovalTokenHours =
  () => {
    const value =
      Number(
        process.env
          .MANPOWER_APPROVAL_TOKEN_HOURS ||
        72
      );

    if (
      !Number.isFinite(
        value
      ) ||
      value <= 0
    ) {
      return 72;
    }

    return value;
  };

const getConfiguredMprGroup =
  () =>
    String(
      process.env
        .WHATSAPP_MPR_GROUP_ID ||
      ""
    ).trim();

/* =========================================================
   PHONE NORMALIZATION
========================================================= */

const normalizePhone =
  (
    value
  ) => {
    let phone =
      String(
        value ||
        ""
      ).replace(
        /\D/g,
        ""
      );

    if (
      phone.length ===
      10
    ) {
      phone =
        `91${phone}`;
    }

    return phone;
  };

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

   EXISTING AUTHORITY REMAINS UNCHANGED.

   1. Department Super Admin
   2. Parent Department Super Admin
   3. Global Super Admin
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
   FIND EMPLOYEE FOR USER

   Used only to obtain the WhatsApp/mobile number.

   User remains the authority for approval.
========================================================= */

const findEmployeeForUser =
  async (
    userId
  ) => {
    if (
      !userId
    ) {
      return null;
    }

    return Employee
      .findOne({
        user:
          userId,

        status: {
          $ne:
            "EXITED",
        },
      })
      .select(
        "_id fullName employeeCode mobileNumber phone user"
      )
      .lean();
  };

/* =========================================================
   DISPLAY NAME
========================================================= */

const getUserDisplayName =
  (
    user
  ) =>
    String(
      user?.displayName ||
      user?.fullName ||
      user?.name ||
      user?.email ||
      "Employee"
    ).trim();

/* =========================================================
   DATE FORMAT
========================================================= */

const formatDate =
  (
    value
  ) => {
    if (
      !value
    ) {
      return "-";
    }

    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "-";
    }

    return [
      String(
        date.getDate()
      ).padStart(
        2,
        "0"
      ),

      String(
        date.getMonth() +
        1
      ).padStart(
        2,
        "0"
      ),

      date.getFullYear(),
    ].join(
      "/"
    );
  };

/* =========================================================
   MONEY FORMAT
========================================================= */

const formatMoney =
  (
    value
  ) => {
    const number =
      Number(
        value
      );

    if (
      !Number.isFinite(
        number
      )
    ) {
      return "-";
    }

    return new Intl.NumberFormat(
      "en-IN",
      {
        maximumFractionDigits:
          0,
      }
    ).format(
      number
    );
  };

/* =========================================================
   EXPERIENCE FORMAT
========================================================= */

const formatExperience =
  (
    minimum,
    maximum
  ) => {
    const min =
      Number(
        minimum ||
        0
      );

    if (
      maximum ===
        null ||
      maximum ===
        undefined ||
      maximum ===
        ""
    ) {
      return `${min}+ Years`;
    }

    return `${min}-${Number(
      maximum
    )} Years`;
  };

/* =========================================================
   SALARY FORMAT
========================================================= */

const formatSalary =
  (
    minimum,
    maximum
  ) => {
    const min =
      minimum !==
        null &&
      minimum !==
        undefined
        ? formatMoney(
            minimum
          )
        : "-";

    const max =
      maximum !==
        null &&
      maximum !==
        undefined
        ? formatMoney(
            maximum
          )
        : "-";

    if (
      min !== "-" &&
      max !== "-"
    ) {
      return `₹${min} - ₹${max}`;
    }

    if (
      min !== "-"
    ) {
      return `₹${min}+`;
    }

    if (
      max !== "-"
    ) {
      return `Up to ₹${max}`;
    }

    return "-";
  };

/* =========================================================
   APPROVAL TOKEN
========================================================= */

const createApprovalToken =
  () =>
    crypto
      .randomBytes(
        32
      )
      .toString(
        "hex"
      );

const hashApprovalToken =
  (
    token
  ) =>
    crypto
      .createHash(
        "sha256"
      )
      .update(
        String(
          token ||
          ""
        )
      )
      .digest(
        "hex"
      );

/* =========================================================
   BUILD APPROVAL URLS
========================================================= */

const buildApprovalUrls =
  (
    token
  ) => {
    const baseUrl =
      getApprovalPublicUrl();

    return {
      approveUrl:
        `${baseUrl}/${encodeURIComponent(
          token
        )}?action=approve`,

      rejectUrl:
        `${baseUrl}/${encodeURIComponent(
          token
        )}?action=reject`,
    };
  };

/* =========================================================
   PRIVATE APPROVER MESSAGE
========================================================= */

const buildApproverMessage = ({
  requirement,
  approveUrl,
  rejectUrl,
}) => {
  const departmentName =
    requirement?.department?.name ||
    requirement?.department?.code ||
    "-";

  const requesterName =
    getUserDisplayName(
      requirement?.requestedBy
    );

  const priority =
    String(
      requirement.priority ||
      "NORMAL"
    ).toUpperCase();

  const priorityLabel =
    priority === "HIGH" ||
    priority === "URGENT"
      ? `🔴 ${priority}`
      : priority === "MEDIUM"
      ? `🟠 ${priority}`
      : `🔵 ${priority}`;

  return [
    "🔔 *NEW MANPOWER REQUEST*",
    "",
    `*${requirement.requestNumber}*`,
    "",
    `*Department:* ${departmentName}`,
    `*Position:* ${requirement.positionTitle}`,
    `*Openings:* ${requirement.numberOfOpenings}`,
    `*Experience:* ${formatExperience(
      requirement.minimumExperienceYears,
      requirement.maximumExperienceYears
    )}`,
    `*Salary:* ${formatSalary(
      requirement.monthlySalaryMin,
      requirement.monthlySalaryMax
    )}`,
    `*Location:* ${requirement.location || "-"}`,
    `*Required By:* ${formatDate(
      requirement.requiredByDate
    )}`,
    `*Priority:* ${priorityLabel}`,
    "",
    `*Requested By:* ${requesterName}`,
    "",
    "Please review this manpower request.",
    "",
    "✅ *APPROVE REQUEST*",
    approveUrl,
    "",
    "❌ *REJECT REQUEST*",
    rejectUrl,
    "",
    "🔐 Each approval link is secure and can be used only once.",
  ].join("\n");
};

/* =========================================================
   SEND PRIVATE APPROVER WHATSAPP

   Called for BOTH:
   WEB
   WHATSAPP

   Notification failure NEVER cancels MPR creation.
========================================================= */

const sendApprovalWhatsApp =
  async (
    requirementId
  ) => {
    const requirement =
      await ManpowerRequirement
        .findById(
          requirementId
        )
        .populate(
          "department",
          "name code"
        )
        .populate(
          "requestedBy",
          "displayName email role"
        )
        .populate(
          "currentApprover",
          "displayName email role"
        );

    if (
      !requirement
    ) {
      throw new Error(
        "MPR not found while preparing approval WhatsApp"
      );
    }

    if (
      requirement.status !==
      "PENDING_APPROVAL"
    ) {
      return false;
    }

    const approverId =
      requirement
        .currentApprover
        ?._id ||
      requirement
        .currentApprover;

    if (
      !approverId
    ) {
      throw new Error(
        `No current approver found for ${requirement.requestNumber}`
      );
    }

    const approverUser =
  await User
    .findOne({
      _id:
        approverId,

      status:
        "ACTIVE",
    })
    .select(
      "_id displayName email whatsappNumber"
    )
    .lean();

if (
  !approverUser
) {
  throw new Error(
    `No active User record found for approver of ${requirement.requestNumber}`
  );
}

const phone =
  normalizePhone(
    approverUser
      .whatsappNumber
  );

if (
  !phone
) {
  throw new Error(
    `Approver does not have a registered WhatsApp number for ${requirement.requestNumber}`
  );
}
    const token =
      createApprovalToken();

    const tokenHash =
      hashApprovalToken(
        token
      );

    const now =
      new Date();

    const expiresAt =
      new Date(
        now.getTime() +
        (
          getApprovalTokenHours() *
          60 *
          60 *
          1000
        )
      );

    requirement.whatsappApproval = {
      tokenHash,

      approver:
        approverId,

      expiresAt,

      usedAt:
        null,

      action:
        "",

      sentAt:
        now,
    };

    await requirement.save();

    const {
      approveUrl,
      rejectUrl,
    } =
      buildApprovalUrls(
        token
      );

    const text =
      buildApproverMessage({
        requirement,
        approveUrl,
        rejectUrl,
      });

    const {
      sendTextToPhone,
    } =
      getWhatsAppClient();

    if (
      typeof sendTextToPhone !==
      "function"
    ) {
      throw new Error(
        "Baileys sendTextToPhone() is not available"
      );
    }

    await sendTextToPhone(
      phone,
      text
    );

    return true;
  };

/* =========================================================
   SAFE APPROVER NOTIFICATION
========================================================= */

const sendApprovalWhatsAppSafely =
  async (
    requirementId
  ) => {
    try {
      await sendApprovalWhatsApp(
        requirementId
      );
    } catch (
      error
    ) {
      console.error(
        "[MPR][WHATSAPP][APPROVAL_NOTIFICATION_FAILED]",
        error?.message ||
        error
      );
    }
  };

/* =========================================================
   REQUESTER WHATSAPP DETAILS

   WHATSAPP MPR:
   → use original sender JID.

   WEB MPR:
   → resolve Employee phone from requestedBy.
========================================================= */

const resolveRequesterWhatsApp =
  async (
    requirement
  ) => {
    const source =
      String(
        requirement
          ?.source ||
        ""
      ).toUpperCase();

    if (
      source ===
        "WHATSAPP" &&
      requirement
        ?.whatsappSource
        ?.senderJid
    ) {
      const senderJid =
        String(
          requirement
            .whatsappSource
            .senderJid
        ).trim();

      const phone =
        normalizePhone(
          requirement
            .whatsappSource
            .senderPhone ||
          senderJid.split(
            "@"
          )[0]
        );

      return {
        jid:
          senderJid,

        phone,

        tag:
          phone
            ? `@${phone}`
            : getUserDisplayName(
                requirement
                  .requestedBy
              ),
      };
    }

    const requesterId =
      requirement
        ?.requestedBy
        ?._id ||
      requirement
        ?.requestedBy;

    const employee =
      await findEmployeeForUser(
        requesterId
      );

    if (
      !employee
    ) {
      return {
        jid:
          "",

        phone:
          "",

        tag:
          getUserDisplayName(
            requirement
              .requestedBy
          ),
      };
    }

    const phone =
      normalizePhone(
        employee.mobileNumber ||
        employee.phone
      );

    if (
      !phone
    ) {
      return {
        jid:
          "",

        phone:
          "",

        tag:
          getUserDisplayName(
            requirement
              .requestedBy
          ),
      };
    }

    try {
      const {
        normalizePhoneJid,
      } =
        getWhatsAppClient();

      const jid =
        typeof normalizePhoneJid ===
        "function"
          ? normalizePhoneJid(
              phone
            )
          : `${phone}@s.whatsapp.net`;

      return {
        jid,

        phone,

        tag:
          `@${phone}`,
      };
    } catch (
      error
    ) {
      return {
        jid:
          `${phone}@s.whatsapp.net`,

        phone,

        tag:
          `@${phone}`,
      };
    }
  };

/* =========================================================
   BUILD GROUP RESULT MESSAGE
========================================================= */

const buildGroupResultMessage =
  ({
    requirement,
    action,
    requesterTag,
    remarks,
  }) => {
    const approved =
      action ===
      "APPROVED";

    const lines = [
      requesterTag,
      "",
      approved
        ? "✅ Manpower Request Approved."
        : "❌ Manpower Request Rejected.",
      "",
      `Request: ${requirement.requestNumber}`,
      `Position: ${requirement.positionTitle}`,
      `Openings: ${requirement.numberOfOpenings}`,
      `Status: ${action}`,
    ];

    const cleanRemarks =
      String(
        remarks ||
        ""
      ).trim();

    if (
      cleanRemarks
    ) {
      lines.push(
        approved
          ? `Remarks: ${cleanRemarks}`
          : `Reason: ${cleanRemarks}`
      );
    }

    return lines.join(
      "\n"
    );
  };

/* =========================================================
   GROUP RESULT NOTIFICATION
========================================================= */

const notifyManpowerGroupStatus =
  async ({
    requirementId,
    action,
    remarks,
  }) => {
    const requirement =
      await ManpowerRequirement
        .findById(
          requirementId
        )
        .populate(
          "requestedBy",
          "displayName email role"
        )
        .populate(
          "department",
          "name code"
        )
        .lean();

    if (
      !requirement
    ) {
      throw new Error(
        "MPR not found for WhatsApp status notification"
      );
    }

    const groupJid =
      getConfiguredMprGroup() ||
      String(
        requirement
          ?.whatsappSource
          ?.groupJid ||
        ""
      ).trim();

    if (
      !groupJid
    ) {
      throw new Error(
        "WHATSAPP_MPR_GROUP_ID is not configured"
      );
    }

    const requester =
      await resolveRequesterWhatsApp(
        requirement
      );

    const text =
      buildGroupResultMessage({
        requirement,
        action,
        requesterTag:
          requester.tag,
        remarks,
      });

    const mentions =
      requester.jid
        ? [
            requester.jid,
          ]
        : [];

    const {
      sendTextMessage,
    } =
      getWhatsAppClient();

    if (
      typeof sendTextMessage !==
      "function"
    ) {
      throw new Error(
        "Baileys sendTextMessage() is not available"
      );
    }

    await sendTextMessage(
      groupJid,
      text,
      {
        mentions,
      }
    );

    return true;
  };

/* =========================================================
   SAFE GROUP NOTIFICATION
========================================================= */

const notifyManpowerGroupStatusSafely =
  async (
    payload
  ) => {
    try {
      await notifyManpowerGroupStatus(
        payload
      );
    } catch (
      error
    ) {
      console.error(
        "[MPR][WHATSAPP][GROUP_NOTIFICATION_FAILED]",
        error?.message ||
        error
      );
    }
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

          monthlySalaryMin:
            input.monthlySalaryMin,

          monthlySalaryMax:
            input.monthlySalaryMax,

          budgetMin:
            input.budgetMin,

          budgetMax:
            input.budgetMax,

          currency:
            input.currency,

          employmentType:
            input.employmentType,

          shiftAvailability:
            input.shiftAvailability,

          office:
            input.office,

          location:
            input.location,

          source:
            input.source ||
            "WEB",

          whatsappSource:
            input.whatsappSource ||
            undefined,

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

    /*
     * IMPORTANT:
     *
     * No source check here.
     *
     * WEB and WHATSAPP MPR both send the private
     * approval notification.
     *
     * Notification failure must not fail MPR creation.
     */

    await sendApprovalWhatsAppSafely(
      requirement._id
    );

    return getRequirementById(
      requirement._id,
      user
    );
  };

/* =========================================================
   GET ONE
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
        {
          requestedBy:
            user._id,
        },

        {
          currentApprover:
            user._id,
        },

        {
          assignedHr:
            user._id,
        },
      ];

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
========================================================= */

const getApprovalInbox =
  async (
    user
  ) => {
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

    /*
     * FIX:
     *
     * Existing code incorrectly sent REJECTED and referenced
     * undefined variable "reason".
     */

    await notifyManpowerGroupStatusSafely({
      requirementId:
        requirement._id,

      action:
        "APPROVED",

      remarks:
        remarks ||
        "",
    });

    return getRequirementById(
      requirement._id,
      user
    );
  };

/* =========================================================
   REJECT
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

    await notifyManpowerGroupStatusSafely({
      requirementId:
        requirement._id,

      action:
        "REJECTED",

      remarks:
        reason ||
        "",
    });

    return getRequirementById(
      requirement._id,
      user
    );
  };

/* =========================================================
   GET REQUIREMENT BY WHATSAPP APPROVAL TOKEN

   Used by public confirmation-page controller.

   Raw token never reaches MongoDB.
========================================================= */

const getRequirementByApprovalToken =
  async (
    token
  ) => {
    const cleanToken =
      String(
        token ||
        ""
      ).trim();

    if (
      !cleanToken
    ) {
      return null;
    }

    const tokenHash =
      hashApprovalToken(
        cleanToken
      );

    return ManpowerRequirement
      .findOne({
        "whatsappApproval.tokenHash":
          tokenHash,
      })
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
        "whatsappApproval.approver",
        "displayName email role status"
      )
      .lean();
  };

/* =========================================================
   VALIDATE PUBLIC APPROVAL TOKEN
========================================================= */

const validateApprovalTokenRequirement =
  async (
    token
  ) => {
    const cleanToken =
      String(
        token ||
        ""
      ).trim();

    if (
      !cleanToken
    ) {
      throw new ApiError(
        400,
        "Approval token is required"
      );
    }

    const tokenHash =
      hashApprovalToken(
        cleanToken
      );

    const requirement =
      await ManpowerRequirement
        .findOne({
          "whatsappApproval.tokenHash":
            tokenHash,
        });

    if (
      !requirement
    ) {
      throw new ApiError(
        404,
        "This approval link is invalid"
      );
    }

    if (
      requirement
        .whatsappApproval
        ?.usedAt
    ) {
      throw new ApiError(
        409,
        "This approval link has already been used"
      );
    }

    const expiresAt =
      requirement
        .whatsappApproval
        ?.expiresAt;

    if (
      !expiresAt ||
      new Date(
        expiresAt
      ).getTime() <=
        Date.now()
    ) {
      throw new ApiError(
        410,
        "This approval link has expired"
      );
    }

    if (
      requirement.status !==
      "PENDING_APPROVAL"
    ) {
      throw new ApiError(
        409,
        `This manpower request has already been ${String(
          requirement.status
        ).toLowerCase()}`
      );
    }

    const tokenApproverId =
      requirement
        .whatsappApproval
        ?.approver;

    const currentApproverId =
      requirement
        .currentApprover;

    if (
      !tokenApproverId ||
      !currentApproverId ||
      String(
        tokenApproverId
      ) !==
      String(
        currentApproverId
      )
    ) {
      throw new ApiError(
        403,
        "This approval link is no longer assigned to the current approver"
      );
    }

    return {
      requirement,
      tokenHash,
    };
  };

/* =========================================================
   PROCESS WHATSAPP APPROVAL

   IMPORTANT:

   The token does NOT directly mutate approval fields.

   It resolves the exact stored approver and then calls the
   EXISTING approveRequirement / rejectRequirement functions.

   Therefore existing approval authorization remains
   authoritative.
========================================================= */

const processWhatsAppApproval =
  async ({
    token,
    action,
    remarks,
    reason,
  }) => {
    const normalizedAction =
      String(
        action ||
        ""
      )
        .trim()
        .toLowerCase();

    if (
      ![
        "approve",
        "reject",
      ].includes(
        normalizedAction
      )
    ) {
      throw new ApiError(
        400,
        "Invalid approval action"
      );
    }

    const {
      requirement,
      tokenHash,
    } =
      await validateApprovalTokenRequirement(
        token
      );

    const approverId =
      requirement
        .whatsappApproval
        .approver;

    const approver =
      await User
        .findOne({
          _id:
            approverId,

          status:
            "ACTIVE",
        });

    if (
      !approver
    ) {
      throw new ApiError(
        403,
        "The assigned approver account is no longer active"
      );
    }

    /*
     * Claim the token before executing the approval action.
     *
     * This prevents two simultaneous clicks from processing
     * the same token.
     */

    const claimedAt =
      new Date();

    const claimed =
      await ManpowerRequirement
        .findOneAndUpdate(
          {
            _id:
              requirement._id,

            status:
              "PENDING_APPROVAL",

            currentApprover:
              approverId,

            "whatsappApproval.tokenHash":
              tokenHash,

            "whatsappApproval.approver":
              approverId,

            "whatsappApproval.usedAt":
              null,

            "whatsappApproval.expiresAt": {
              $gt:
                claimedAt,
            },
          },

          {
            $set: {
              "whatsappApproval.usedAt":
                claimedAt,

              "whatsappApproval.action":
                normalizedAction ===
                "approve"
                  ? "APPROVED"
                  : "REJECTED",
            },
          },

          {
            new:
              true,
          }
        );

    if (
      !claimed
    ) {
      throw new ApiError(
        409,
        "This approval link has already been used or is no longer valid"
      );
    }

    try {
      if (
        normalizedAction ===
        "approve"
      ) {
        const result =
          await approveRequirement({
            requirementId:
              requirement._id,

            user:
              approver,

            remarks:
              String(
                remarks ||
                ""
              ).trim(),
          });

        return {
          action:
            "APPROVED",

          requirement:
            result,
        };
      }

      const cleanReason =
        String(
          reason ||
          ""
        ).trim();

      if (
        !cleanReason
      ) {
        /*
         * Release token claim because controller/user must
         * still be allowed to submit the required reason.
         */

        await ManpowerRequirement
          .updateOne(
            {
              _id:
                requirement._id,

              "whatsappApproval.tokenHash":
                tokenHash,

              "whatsappApproval.usedAt":
                claimedAt,
            },

            {
              $set: {
                "whatsappApproval.usedAt":
                  null,

                "whatsappApproval.action":
                  "",
              },
            }
          );

        throw new ApiError(
          400,
          "Rejection reason is required"
        );
      }

      const result =
        await rejectRequirement({
          requirementId:
            requirement._id,

          user:
            approver,

          reason:
            cleanReason,
        });

      return {
        action:
          "REJECTED",

        requirement:
          result,
      };
    } catch (
      error
    ) {
      /*
       * If the existing approval function fails before
       * changing status, release the token so a legitimate
       * approver is not permanently locked out.
       */

      const latest =
        await ManpowerRequirement
          .findById(
            requirement._id
          )
          .select(
            "status whatsappApproval"
          )
          .lean();

      if (
        latest?.status ===
        "PENDING_APPROVAL"
      ) {
        await ManpowerRequirement
          .updateOne(
            {
              _id:
                requirement._id,

              status:
                "PENDING_APPROVAL",

              "whatsappApproval.tokenHash":
                tokenHash,

              "whatsappApproval.usedAt":
                claimedAt,
            },

            {
              $set: {
                "whatsappApproval.usedAt":
                  null,

                "whatsappApproval.action":
                  "",
              },
            }
          );
      }

      throw error;
    }
  };

/* =========================================================
   HR MANAGEMENT QUEUE
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

    /*
     * IMPORTANT:
     *
     * There is NO approval WhatsApp notification here.
     *
     * The old file incorrectly attempted to send APPROVED
     * again when HR started hiring.
     */

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

  /*
   * Public secure WhatsApp approval workflow.
   */

  getRequirementByApprovalToken,

  processWhatsAppApproval,

  /*
   * HR workflow.
   */

  getHrQueue,

  getAvailableHrEmployees,

  assignHrToRequirement,

  getMyHiring,

  startHiring,

  isHrUser,

  canManageHrHiring,
};
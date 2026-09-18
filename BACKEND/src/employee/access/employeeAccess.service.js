const mongoose =
  require(
    "mongoose"
  );

const {
  EmployeeAccess,
} =
  require(
    "./employeeAccess.model"
  );

const {
  EmployeeOnboarding,
} =
  require(
    "../onboarding/onboarding.model"
  );

const {
  Employee,
} =
  require(
    "../employee.model"
  );

const {
  User,
  USER_ROLES,
} =
  require(
    "../../user/user.model"
  );

const ApiError =
  require(
    "../../utils/ApiError"
  );

const env =
  require(
    "../../config/env"
  );

/* =========================================================
   HELPERS
========================================================= */

const validId =
  (
    value
  ) =>
    mongoose.Types
      .ObjectId
      .isValid(
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

const normalizeEmail =
  (
    value
  ) =>
    clean(
      value
    ).toLowerCase();

/* =========================================================
   COMPANY EMAIL VALIDATION
========================================================= */

const assertCompanyEmail =
  (
    email
  ) => {
    const normalized =
      normalizeEmail(
        email
      );

    /*
     * Email is still mandatory.
     *
     * We are ONLY disabling the company-domain
     * restriction temporarily for testing.
     */
    if (
      !normalized
    ) {
      throw new ApiError(
        422,
        "Official email is required before SE-RMS access can be created."
      );
    }

    /* =====================================================
       TEMPORARILY DISABLED FOR TESTING

       This allows SE-RMS access/account creation using
       Gmail or any other email domain.

       Re-enable this block in production.
    ===================================================== */

    // const domain =
    //   clean(
    //     env.allowedEmailDomain ||
    //     "sandeepedgetech.com"
    //   ).toLowerCase();

    // if (
    //   !normalized.endsWith(
    //     `@${domain}`
    //   )
    // ) {
    //   throw new ApiError(
    //     422,
    //     `SE-RMS login email must use @${domain}.`
    //   );
    // }

    return normalized;
  };

/* =========================================================
   GET EMPLOYEE
========================================================= */

const getEmployee =
  async (
    employeeId
  ) => {
    if (
      !validId(
        employeeId
      )
    ) {
      throw new ApiError(
        400,
        "Invalid Employee ID."
      );
    }

    const employee =
      await Employee
        .findById(
          employeeId
        )
        .populate(
          "department",
          "name code status"
        )
        .populate(
          "reportsTo",
          "employeeCode fullName designation officialEmail"
        );

    if (
      !employee
    ) {
      throw new ApiError(
        404,
        "Employee not found."
      );
    }

    return employee;
  };

/* =========================================================
   POPULATE
========================================================= */

const populateAccess =
  (
    query
  ) =>
    query
      .populate(
        "employee",
        "employeeCode fullName personalEmail officialEmail designation companyCode orgUnitCode department reportsTo status joiningDate workLocation"
      )
      .populate(
        "user",
        "displayName email role systemRole status authProviders lastLoginAt employee"
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
   GET
========================================================= */

const getEmployeeAccess =
  async (
    employeeId
  ) => {
    await getEmployee(
      employeeId
    );

    return populateAccess(
      EmployeeAccess
        .findOne({
          employee:
            employeeId,
        })
    );
  };

/* =========================================================
   READINESS
========================================================= */

const getAccessReadiness =
  async (
    employeeId
  ) => {
    const employee =
      await getEmployee(
        employeeId
      );

    const access =
      await EmployeeAccess
        .findOne({
          employee:
            employee._id,
        })
        .populate(
          "user",
          "email status authProviders"
        )
        .lean();

    const officialEmail =
      normalizeEmail(
        employee
          .officialEmail
      );

    /*
 * TEMPORARY TESTING MODE
 *
 * Any non-empty official email is considered valid.
 * Restore company-domain validation before production.
 */

const emailValid =
  Boolean(
    officialEmail
  );

    return {
      ready:
        Boolean(
          officialEmail &&
          emailValid
        ),

      officialEmail,

      emailMissing:
        !officialEmail,

      emailValid,

      allowedDomain:
        env.allowedEmailDomain ||
        "sandeepedgetech.com",

      accessPrepared:
        Boolean(
          access
        ),

      accountCreated:
        Boolean(
          employee.user ||
          access?.user
        ),

      access:
        access ||
        null,
    };
  };

/* =========================================================
   PREPARE ACCESS

   Safe to call immediately after Employee creation.

   If official email is not known yet, access remains:
   WAITING_FOR_EMAIL
========================================================= */

const prepareAccess =
  async ({
    employeeId,
    payload =
      {},
    actorUserId,
  }) => {
    const employee =
      await getEmployee(
        employeeId
      );

    /* =====================================================
       OPTIONAL OFFICIAL EMAIL

       HR may enter it during this step.
    ===================================================== */

    if (
      payload.officialEmail !==
      undefined
    ) {
      const email =
        normalizeEmail(
          payload
            .officialEmail
        );

      if (
        email
      ) {
        assertCompanyEmail(
          email
        );

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
            "This official email is already assigned to another employee."
          );
        }

        employee.officialEmail =
          email;

        employee.updatedBy =
          actorUserId;

        await employee.save();
      }
    }

    const officialEmail =
      normalizeEmail(
        employee
          .officialEmail
      );

    let status =
      "WAITING_FOR_EMAIL";

    if (
      officialEmail
    ) {
      assertCompanyEmail(
        officialEmail
      );

      status =
        "READY";
    }

    const requestedRole =
      clean(
        payload.role ||
        "EMPLOYEE"
      ).toUpperCase();

    if (
      !USER_ROLES.includes(
        requestedRole
      )
    ) {
      throw new ApiError(
        400,
        "Invalid SE-RMS user role."
      );
    }

    let access =
      await EmployeeAccess
        .findOne({
          employee:
            employee._id,
        });

    if (
      !access
    ) {
      access =
        new EmployeeAccess({
          employee:
            employee._id,

          onboarding:
            employee.onboarding ||
            null,

          loginEmail:
            officialEmail,

          loginMethod:
            "GOOGLE",

          role:
            requestedRole,

          status,

          preparedAt:
            new Date(),

          createdBy:
            actorUserId,

          updatedBy:
            actorUserId,

          auditTrail: [
            {
              event:
                "RMS_ACCESS_PREPARED",

              remarks:
                officialEmail
                  ? "SE-RMS access prepared and official email validated."
                  : "SE-RMS access prepared. Official email is still required.",

              performedBy:
                actorUserId,
            },
          ],
        });
    } else {
      if (
        access.user
      ) {
        return getEmployeeAccess(
          employee._id
        );
      }

      access.loginEmail =
        officialEmail;

      access.role =
        requestedRole;

      access.status =
        status;

      access.preparedAt =
        access.preparedAt ||
        new Date();

      access.updatedBy =
        actorUserId;

      access.auditTrail.push({
        event:
          "RMS_ACCESS_PREPARED",

        remarks:
          officialEmail
            ? "SE-RMS access information updated."
            : "Official email remains pending.",

        performedBy:
          actorUserId,
      });
    }

    await access.save();

    /* =====================================================
       OFFICIAL EMAIL CHECKLIST
    ===================================================== */

    if (
      employee.onboarding
    ) {
      await EmployeeOnboarding
        .findByIdAndUpdate(
          employee.onboarding,
          {
            $set: {
              "checklist.officialEmail":
                Boolean(
                  officialEmail
                ),
            },

            updatedBy:
              actorUserId,
          }
        );
    }

    return getEmployeeAccess(
      employee._id
    );
  };

/* =========================================================
   CREATE USER ACCOUNT

   No email is sent here.

   Mail module will perform communication later.
========================================================= */

const createRmsAccount =
  async ({
    employeeId,
    actorUserId,
  }) => {
    const employee =
      await getEmployee(
        employeeId
      );

    const officialEmail =
      assertCompanyEmail(
        employee
          .officialEmail
      );

    let access =
      await EmployeeAccess
        .findOne({
          employee:
            employee._id,
        });

    if (
      !access
    ) {
      await prepareAccess({
        employeeId:
          employee._id,

        actorUserId,

        payload: {},
      });

      access =
        await EmployeeAccess
          .findOne({
            employee:
              employee._id,
          });
    }

    /* =====================================================
       IDEMPOTENT
    ===================================================== */

    if (
      employee.user
    ) {
      const linkedUser =
        await User
          .findById(
            employee.user
          );

      if (
        linkedUser
      ) {
        access.user =
          linkedUser._id;

        access.loginEmail =
          officialEmail;

        access.status =
          access.accessMailSentAt
            ? "ACCESS_MAIL_SENT"
            : "ACCESS_MAIL_PENDING";

        access.accountCreatedAt =
          access.accountCreatedAt ||
          new Date();

        access.updatedBy =
          actorUserId;

        await access.save();

        return getEmployeeAccess(
          employee._id
        );
      }
    }

    /* =====================================================
       FIND USER BY EMAIL
    ===================================================== */

    let user =
      await User
        .findOne({
          email:
            officialEmail,
        });

    if (
      user?.employee &&
      String(
        user.employee
      ) !==
        String(
          employee._id
        )
    ) {
      throw new ApiError(
        409,
        "This SE-RMS account is already linked to another employee."
      );
    }

    /* =====================================================
       CREATE USER
    ===================================================== */

    if (
      !user
    ) {
      user =
        await User
          .create({
            displayName:
              employee
                .fullName,

            email:
              officialEmail,

            systemRole:
              "STANDARD_USER",

            role:
              access.role ||
              "EMPLOYEE",

            status:
              "ACTIVE",

            /*
             * Google sign-in means there is no plaintext
             * initial password to store or email.
             */
            authProviders: [
              "google",
            ],

            emailVerified:
              false,

            employee:
              employee._id,

            department:
              employee.department ||
              null,

            primaryDepartment:
              employee.department ||
              null,

            createdBy:
              actorUserId,

            updatedBy:
              actorUserId,
          });
    } else {
      user.employee =
        employee._id;

      user.displayName =
        employee.fullName;

      user.department =
        employee.department ||
        user.department ||
        null;

      user.primaryDepartment =
        employee.department ||
        user.primaryDepartment ||
        null;

      if (
        !user.authProviders.includes(
          "google"
        )
      ) {
        user.authProviders.push(
          "google"
        );
      }

      user.status =
        "ACTIVE";

      user.updatedBy =
        actorUserId;

      await user.save();
    }

    /* =====================================================
       LINK BOTH SIDES
    ===================================================== */

    employee.user =
      user._id;

    employee.updatedBy =
      actorUserId;

    await employee.save();

    access.user =
      user._id;

    access.loginEmail =
      officialEmail;

    access.status =
      "ACCESS_MAIL_PENDING";

    access.accountCreatedAt =
      access.accountCreatedAt ||
      new Date();

    access.updatedBy =
      actorUserId;

    access.auditTrail.push({
      event:
        "RMS_ACCOUNT_CREATED",

      remarks:
        `SE-RMS account created for ${officialEmail}.`,

      performedBy:
        actorUserId,

      metadata: {
        userId:
          user._id,

        loginEmail:
          officialEmail,

        loginMethod:
          "GOOGLE",
      },
    });

    await access.save();

    /* =====================================================
       CHECKLIST
    ===================================================== */

    if (
      employee.onboarding
    ) {
      await EmployeeOnboarding
        .findByIdAndUpdate(
          employee.onboarding,
          {
            $set: {
              "checklist.officialEmail":
                true,

              "checklist.rmsAccess":
                true,
            },

            $push: {
              auditTrail: {
                event:
                  "RMS_ACCOUNT_CREATED",

                remarks:
                  `SE-RMS account created for ${officialEmail}.`,

                performedBy:
                  actorUserId,

                at:
                  new Date(),
              },
            },

            updatedBy:
              actorUserId,
          }
        );
    }

    return getEmployeeAccess(
      employee._id
    );
  };

/* =========================================================
   UPDATE OFFICIAL EMAIL BEFORE MAIL RELEASE

   Useful if HR entered the wrong official email.

   Once the user has logged in, changing email should be
   handled through User Administration instead.
========================================================= */

const updateAccessEmail =
  async ({
    employeeId,
    officialEmail,
    actorUserId,
  }) => {
    const employee =
      await getEmployee(
        employeeId
      );

    const email =
      assertCompanyEmail(
        officialEmail
      );

    const duplicateEmployee =
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
      duplicateEmployee
    ) {
      throw new ApiError(
        409,
        "Official email is already assigned to another employee."
      );
    }

    const access =
      await EmployeeAccess
        .findOne({
          employee:
            employee._id,
        });

    /*
     * If account already exists, changing the login email is
     * more sensitive and should not silently rewrite identity.
     */
    if (
      employee.user ||
      access?.user
    ) {
      throw new ApiError(
        409,
        "SE-RMS account already exists. Change login email through User Administration."
      );
    }

    employee.officialEmail =
      email;

    employee.updatedBy =
      actorUserId;

    await employee.save();

    if (
      access
    ) {
      access.loginEmail =
        email;

      access.status =
        "READY";

      access.updatedBy =
        actorUserId;

      access.auditTrail.push({
        event:
          "RMS_LOGIN_EMAIL_UPDATED",

        remarks:
          `Official login email updated to ${email}.`,

        performedBy:
          actorUserId,
      });

      await access.save();
    }

    if (
      employee.onboarding
    ) {
      await EmployeeOnboarding
        .findByIdAndUpdate(
          employee.onboarding,
          {
            $set: {
              "checklist.officialEmail":
                true,
            },

            updatedBy:
              actorUserId,
          }
        );
    }

    return getAccessReadiness(
      employee._id
    );
  };

/* =========================================================
   DISABLE ACCESS
========================================================= */

const disableRmsAccess =
  async ({
    employeeId,
    remarks,
    actorUserId,
  }) => {
    const employee =
      await getEmployee(
        employeeId
      );

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

    const access =
      await EmployeeAccess
        .findOne({
          employee:
            employee._id,
        });

    if (
      access
    ) {
      access.status =
        "DISABLED";

      access.updatedBy =
        actorUserId;

      access.auditTrail.push({
        event:
          "RMS_ACCESS_DISABLED",

        remarks:
          clean(
            remarks
          ) ||
          "SE-RMS access disabled.",

        performedBy:
          actorUserId,
      });

      await access.save();
    }

    return getEmployeeAccess(
      employee._id
    );
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getAccessReadiness,

  getEmployeeAccess,

  prepareAccess,

  createRmsAccount,

  updateAccessEmail,

  disableRmsAccess,
};
const mongoose =
  require(
    "mongoose"
  );

const nodemailer =
  require(
    "nodemailer"
  );

const {
  Employee,
} =
  require(
    "../employee.model"
  );

const {
  EmployeeOnboarding,
} =
  require(
    "../onboarding/onboarding.model"
  );

const {
  EmployeeAccess,
} =
  require(
    "../access/employeeAccess.model"
  );

const {
  User,
} =
  require(
    "../../user/user.model"
  );

const ApiError =
  require(
    "../../utils/ApiError"
  );

const {
  buildAccessCreatedEmail,
} =
  require(
    "./templates/accessCreated.template"
  );

const {
  buildWelcomeOnboardingEmail,
} =
  require(
    "./templates/welcomeOnboarding.template"
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

const uniqueEmails =
  (
    values
  ) =>
    [
      ...new Set(
        values
          .map(
            normalizeEmail
          )
          .filter(
            Boolean
          )
      ),
    ];

/* =========================================================
   CONFIG
========================================================= */

const getMailConfig =
  () => {
    const service =
      clean(
        process.env
          .MAIL_SERVICE
      ) ||
      "gmail";

    const user =
      normalizeEmail(
        process.env
          .MAIL_USER
      );

    const password =
      clean(
        process.env
          .MAIL_APP_PASSWORD
      );

    if (
      !user ||
      !password
    ) {
      throw new ApiError(
        500,
        "Employee mail configuration is incomplete."
      );
    }

    return {
      service,
      user,
      password,
    };
  };

/* =========================================================
   TRANSPORTER
========================================================= */

let transporter =
  null;

const getTransporter =
  () => {
    if (
      transporter
    ) {
      return transporter;
    }

    const config =
      getMailConfig();

    transporter =
      nodemailer
        .createTransport({
          service:
            config.service,

          auth: {
            user:
              config.user,

            pass:
              config.password,
          },
        });

    return transporter;
  };

/* =========================================================
   FROM
========================================================= */

const getFrom =
  () => {
    const company =
      clean(
        process.env
          .MAIL_FROM_NAME
      ) ||
      clean(
        process.env
          .COMPANY_NAME
      ) ||
      "Sandeep Edge Tech";

    const email =
      normalizeEmail(
        process.env
          .MAIL_USER
      );

    return `"${company} - People & Culture" <${email}>`;
  };

/* =========================================================
   LOGIN URL
========================================================= */

const getLoginUrl =
  () => {
    const base =
      clean(
        process.env
          .APP_BASE_URL
      );

    if (
      !base
    ) {
      return "";
    }

    return base.replace(
      /\/+$/,
      ""
    );
  };

/* =========================================================
   EMPLOYEE
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
          "name code"
        )
        .populate(
          "reportsTo",
          "employeeCode fullName designation officialEmail personalEmail user"
        )
        .populate(
          "user",
          "displayName email status"
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
   HR EMAIL

   Priority:

   1. Actor User email
   2. COMPANY_RECRUITMENT_EMAIL
   3. MAIL_REPLY_TO
========================================================= */

const getHrEmail =
  async (
    actorUserId
  ) => {
    if (
      actorUserId &&
      validId(
        actorUserId
      )
    ) {
      const actor =
        await User
          .findById(
            actorUserId
          )
          .select(
            "email"
          )
          .lean();

      if (
        actor?.email
      ) {
        return normalizeEmail(
          actor.email
        );
      }
    }

    return normalizeEmail(
      process.env
        .COMPANY_RECRUITMENT_EMAIL ||
      process.env
        .MAIL_REPLY_TO ||
      process.env
        .MAIL_USER
    );
  };

/* =========================================================
   ACCESS EMAIL RECIPIENT

   First access email should ideally go to personal email
   because the official company mailbox may itself still
   be part of the onboarding process.

   Fallback:
   officialEmail
========================================================= */

const getAccessRecipient =
  (
    employee
  ) => {
    const personal =
      normalizeEmail(
        employee
          .personalEmail
      );

    if (
      personal
    ) {
      return personal;
    }

    const official =
      normalizeEmail(
        employee
          .officialEmail
      );

    if (
      official
    ) {
      return official;
    }

    throw new ApiError(
      422,
      "Employee has no email address available for SE-RMS access communication."
    );
  };

/* =========================================================
   FINAL WELCOME RECIPIENT

   Final welcome communication goes to official email.
========================================================= */

const getWelcomeRecipient =
  (
    employee
  ) => {
    const official =
      normalizeEmail(
        employee
          .officialEmail
      );

    if (
      !official
    ) {
      throw new ApiError(
        422,
        "Official employee email is required before the final welcome email can be sent."
      );
    }

    return official;
  };

/* =========================================================
   CC
========================================================= */

const buildCc =
  async ({
    employee,
    actorUserId,
  }) => {
    const hrEmail =
      await getHrEmail(
        actorUserId
      );

    const managerEmail =
      normalizeEmail(
        employee
          ?.reportsTo
          ?.officialEmail
      );

    return uniqueEmails([
      managerEmail,
      hrEmail,
    ]);
  };

/* =========================================================
   SEND
========================================================= */

const sendMail =
  async ({
    to,
    cc =
      [],
    template,
  }) => {
    const mailer =
      getTransporter();

    const replyTo =
      normalizeEmail(
        process.env
          .MAIL_REPLY_TO ||
        process.env
          .MAIL_USER
      );

    const info =
      await mailer
        .sendMail({
          from:
            getFrom(),

          to,

          cc:
            cc.length
              ? cc
              : undefined,

          replyTo:
            replyTo ||
            undefined,

          subject:
            template
              .subject,

          text:
            template
              .text,

          html:
            template
              .html,
        });

    return {
      messageId:
        info
          ?.messageId ||
        "",

      accepted:
        info
          ?.accepted ||
        [],

      rejected:
        info
          ?.rejected ||
        [],

      response:
        info
          ?.response ||
        "",
    };
  };

/* =========================================================
   ACCESS MAIL READINESS
========================================================= */

const getAccessMailReadiness =
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
          "email status"
        )
        .lean();

    if (
      !access
    ) {
      return {
        ready:
          false,

        reason:
          "ACCESS_NOT_PREPARED",

        employee,

        access:
          null,
      };
    }

    if (
      !access.user
    ) {
      return {
        ready:
          false,

        reason:
          "RMS_ACCOUNT_NOT_CREATED",

        employee,

        access,
      };
    }

    let recipient =
      "";

    try {
      recipient =
        getAccessRecipient(
          employee
        );
    } catch {
      return {
        ready:
          false,

        reason:
          "RECIPIENT_EMAIL_MISSING",

        employee,

        access,
      };
    }

    return {
      ready:
        true,

      recipient,

      alreadySent:
        Boolean(
          access
            .accessMailSentAt
        ),

      access,

      employee,
    };
  };

/* =========================================================
   SEND ACCESS EMAIL
========================================================= */

const sendAccessEmail =
  async ({
    employeeId,
    force =
      false,
    actorUserId,
  }) => {
    const employee =
      await getEmployee(
        employeeId
      );

    const access =
      await EmployeeAccess
        .findOne({
          employee:
            employee._id,
        });

    if (
      !access
    ) {
      throw new ApiError(
        409,
        "Prepare SE-RMS access before sending the access email."
      );
    }

    if (
      !access.user
    ) {
      throw new ApiError(
        409,
        "Create the employee SE-RMS account before sending the access email."
      );
    }

    if (
      access.accessMailSentAt &&
      !force
    ) {
      throw new ApiError(
        409,
        "SE-RMS access email has already been sent. Use resend if another copy is required."
      );
    }

    const recipient =
      getAccessRecipient(
        employee
      );

    const cc =
      await buildCc({
        employee,
        actorUserId,
      });

    /*
     * Do not duplicate recipient in CC.
     */
    const cleanCc =
      cc.filter(
        (
          email
        ) =>
          email !==
          recipient
      );

    const template =
      buildAccessCreatedEmail({
        employee,

        access,

        loginUrl:
          getLoginUrl(),
      });

    const mail =
      await sendMail({
        to:
          recipient,

        cc:
          cleanCc,

        template,
      });

    const now =
      new Date();

    access.status =
      "ACCESS_MAIL_SENT";

    access.accessMailSentAt =
      now;

    access.accessMailSentTo =
      recipient;

    access.updatedBy =
      actorUserId;

    access.auditTrail.push({
      event:
        force
          ? "RMS_ACCESS_MAIL_RESENT"
          : "RMS_ACCESS_MAIL_SENT",

      remarks:
        `SE-RMS access communication sent to ${recipient}.`,

      performedBy:
        actorUserId,

      metadata: {
        to:
          recipient,

        cc:
          cleanCc,

        messageId:
          mail.messageId,
      },
    });

    await access.save();

    /* =====================================================
       ONBOARDING AUDIT

       Access communication itself does NOT complete the
       final welcomeCommunication step.

       That happens only after the final welcome mail.
    ===================================================== */

    if (
      employee.onboarding
    ) {
      await EmployeeOnboarding
        .findByIdAndUpdate(
          employee.onboarding,
          {
            $push: {
              auditTrail: {
                event:
                  force
                    ? "RMS_ACCESS_MAIL_RESENT"
                    : "RMS_ACCESS_MAIL_SENT",

                remarks:
                  `SE-RMS access communication sent to ${recipient}.`,

                performedBy:
                  actorUserId,

                metadata: {
                  to:
                    recipient,

                  cc:
                    cleanCc,

                  messageId:
                    mail.messageId,
                },

                at:
                  now,
              },
            },

            updatedBy:
              actorUserId,
          }
        );
    }

    return {
      sent:
        true,

      type:
        "ACCESS",

      sentAt:
        now,

      to:
        recipient,

      cc:
        cleanCc,

      messageId:
        mail.messageId,

      accessStatus:
        access.status,
    };
  };

/* =========================================================
   FINAL WELCOME READINESS

   We deliberately do NOT use activation readiness here
   because activation readiness itself requires the welcome
   email. That would create a circular dependency.

   Instead, this checks every prerequisite BEFORE the final
   welcome communication.
========================================================= */

const getWelcomeMailReadiness =
  async (
    employeeId
  ) => {
    const employee =
      await getEmployee(
        employeeId
      );

    if (
      !employee.onboarding
    ) {
      return {
        ready:
          false,

        reason:
          "ONBOARDING_NOT_FOUND",
      };
    }

    const onboarding =
      await EmployeeOnboarding
        .findById(
          employee.onboarding
        )
        .lean();

    if (
      !onboarding
    ) {
      return {
        ready:
          false,

        reason:
          "ONBOARDING_NOT_FOUND",
      };
    }

    const access =
      await EmployeeAccess
        .findOne({
          employee:
            employee._id,
        })
        .lean();

    const checks = [
      {
        key:
          "employeeProfile",

        complete:
          Boolean(
            onboarding
              .checklist
              ?.employeeProfile
          ),
      },

      {
        key:
          "reportingHierarchy",

        complete:
          Boolean(
            employee
              .reportsTo &&
            onboarding
              .checklist
              ?.reportingHierarchy
          ),
      },

      {
        key:
          "employeeDocuments",

        complete:
          Boolean(
            onboarding
              .checklist
              ?.employeeDocuments
          ),
      },

      {
        key:
          "assets",

        complete:
          Boolean(
            onboarding
              .checklist
              ?.assets
          ),
      },

      {
        key:
          "appointmentLetter",

        complete:
          Boolean(
            onboarding
              .checklist
              ?.appointmentLetter
          ),
      },

      {
        key:
          "officialEmail",

        complete:
          Boolean(
            employee
              .officialEmail &&
            onboarding
              .checklist
              ?.officialEmail
          ),
      },

      {
        key:
          "rmsAccess",

        complete:
          Boolean(
            employee
              .user &&
            access
              ?.user &&
            onboarding
              .checklist
              ?.rmsAccess
          ),
      },
    ];

    const blocking =
      checks.filter(
        (
          item
        ) =>
          !item.complete
      );

    return {
      ready:
        blocking.length ===
        0,

      employee,

      onboarding,

      access,

      alreadySent:
        Boolean(
          access
            ?.welcomeMailSentAt ||
          onboarding
            ?.checklist
            ?.welcomeCommunication
        ),

      blocking:
        blocking.map(
          (
            item
          ) =>
            item.key
        ),
    };
  };

/* =========================================================
   SEND FINAL WELCOME
========================================================= */

const sendWelcomeEmail =
  async ({
    employeeId,
    force =
      false,
    actorUserId,
  }) => {
    const readiness =
      await getWelcomeMailReadiness(
        employeeId
      );

    if (
      !readiness.ready
    ) {
      throw new ApiError(
        409,
        `Final welcome email is not ready. Pending: ${
          readiness
            .blocking
            .join(
              ", "
            )
        }.`
      );
    }

    const employee =
      await getEmployee(
        employeeId
      );

    const onboarding =
      await EmployeeOnboarding
        .findById(
          employee.onboarding
        );

    const access =
      await EmployeeAccess
        .findOne({
          employee:
            employee._id,
        });

    if (
      !access
    ) {
      throw new ApiError(
        409,
        "Employee access record not found."
      );
    }

    if (
      access.welcomeMailSentAt &&
      !force
    ) {
      throw new ApiError(
        409,
        "Final welcome email has already been sent."
      );
    }

    const recipient =
      getWelcomeRecipient(
        employee
      );

    const cc =
      await buildCc({
        employee,
        actorUserId,
      });

    const cleanCc =
      cc.filter(
        (
          email
        ) =>
          email !==
          recipient
      );

    const template =
      buildWelcomeOnboardingEmail({
        employee,

        manager:
          employee
            .reportsTo,

        loginUrl:
          getLoginUrl(),
      });

    const mail =
      await sendMail({
        to:
          recipient,

        cc:
          cleanCc,

        template,
      });

    const now =
      new Date();

    /* =====================================================
       ACCESS
    ===================================================== */

    access.welcomeMailSentAt =
      now;

    access.updatedBy =
      actorUserId;

    access.auditTrail.push({
      event:
        force
          ? "WELCOME_MAIL_RESENT"
          : "WELCOME_MAIL_SENT",

      remarks:
        `Final onboarding welcome communication sent to ${recipient}.`,

      performedBy:
        actorUserId,

      metadata: {
        to:
          recipient,

        cc:
          cleanCc,

        messageId:
          mail.messageId,
      },
    });

    await access.save();

    /* =====================================================
       ONBOARDING

       THIS unlocks Final Activation.
    ===================================================== */

    onboarding.checklist =
      onboarding.checklist ||
      {};

    onboarding.checklist
      .welcomeCommunication =
        true;

    onboarding.updatedBy =
      actorUserId;

    onboarding.auditTrail.push({
      event:
        force
          ? "WELCOME_MAIL_RESENT"
          : "WELCOME_MAIL_SENT",

      remarks:
        `Final welcome communication sent to ${recipient}.`,

      performedBy:
        actorUserId,

      metadata: {
        to:
          recipient,

        cc:
          cleanCc,

        messageId:
          mail.messageId,
      },

      at:
        now,
    });

    await onboarding.save();

    return {
      sent:
        true,

      type:
        "WELCOME",

      sentAt:
        now,

      to:
        recipient,

      cc:
        cleanCc,

      messageId:
        mail.messageId,

      activationUnlocked:
        true,
    };
  };

/* =========================================================
   COMMUNICATION STATUS
========================================================= */

const getMailStatus =
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
        .lean();

    let onboarding =
      null;

    if (
      employee.onboarding
    ) {
      onboarding =
        await EmployeeOnboarding
          .findById(
            employee.onboarding
          )
          .lean();
    }

    const accessReadiness =
      await getAccessMailReadiness(
        employeeId
      );

    const welcomeReadiness =
      await getWelcomeMailReadiness(
        employeeId
      );

    return {
      employee: {
        _id:
          employee._id,

        employeeCode:
          employee
            .employeeCode,

        fullName:
          employee
            .fullName,

        personalEmail:
          employee
            .personalEmail ||
          "",

        officialEmail:
          employee
            .officialEmail ||
          "",
      },

      accessCommunication: {
        ready:
          accessReadiness
            .ready,

        sent:
          Boolean(
            access
              ?.accessMailSentAt
          ),

        sentAt:
          access
            ?.accessMailSentAt ||
          null,

        sentTo:
          access
            ?.accessMailSentTo ||
          "",
      },

      welcomeCommunication: {
        ready:
          welcomeReadiness
            .ready,

        sent:
          Boolean(
            access
              ?.welcomeMailSentAt
          ),

        sentAt:
          access
            ?.welcomeMailSentAt ||
          null,

        checklistComplete:
          Boolean(
            onboarding
              ?.checklist
              ?.welcomeCommunication
          ),

        blocking:
          welcomeReadiness
            .blocking ||
          [],
      },
    };
  };

/* =========================================================
   VERIFY TRANSPORT

   Useful from frontend/system settings to check whether
   Gmail SMTP/App Password is working.
========================================================= */

const verifyMailTransport =
  async () => {
    const mailer =
      getTransporter();

    await mailer.verify();

    return {
      ready:
        true,

      account:
        normalizeEmail(
          process.env
            .MAIL_USER
        ),
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getAccessMailReadiness,

  getWelcomeMailReadiness,

  getMailStatus,

  sendAccessEmail,

  sendWelcomeEmail,

  verifyMailTransport,
};
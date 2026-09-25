const manpowerService =
  require(
    "./manpower.service"
  );

const {
  validateCreateManpower,
} =
  require(
    "./manpower.validation"
  );

const {
  getManpowerTemplate,
  parseManpowerRequest,
} =
  require(
    "./manpower.whatsappParser"
  );

const userModule =
  require(
    "../user/user.model"
  );

const departmentModule =
  require(
    "../department/department.model"
  );

const User =
  userModule.User ||
  userModule;

const Department =
  departmentModule.Department ||
  departmentModule;

/* =========================================================
   WARNING COOLDOWN

   Prevent group spam from:
   hello
   hello sir
   ok
   thanks
========================================================= */

const warningCache =
  new Map();

/* =========================================================
   CONFIG
========================================================= */

const enabled =
  () =>
    String(
      process.env
        .WHATSAPP_MPR_ENABLED ||
        ""
    )
      .trim()
      .toLowerCase() ===
    "true";

const configuredGroup =
  () =>
    String(
      process.env
        .WHATSAPP_MPR_GROUP_ID ||
        ""
    ).trim();

const warningCooldownMs =
  () => {
    const minutes =
      Number(
        process.env
          .WHATSAPP_MPR_WARNING_COOLDOWN_MINUTES ||
          10
      );

    return (
      Number.isFinite(
        minutes
      )
        ? minutes
        : 10
    ) *
      60 *
      1000;
  };

/* =========================================================
   PHONE
========================================================= */

const normalizePhone =
  (
    value
  ) => {
    let phone =
      String(
        value || ""
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

const phoneFromJid =
  (
    jid
  ) => {
    const raw =
      String(
        jid || ""
      ).trim();

    if (
      !raw
    ) {
      return "";
    }

    /*
     * SECURITY:
     *
     * WhatsApp LID is NOT a phone number.
     *
     * Example:
     *
     * 84353375846563@lid
     *
     * must NEVER become:
     *
     * 84353375846563
     *
     * LID -> PN resolution belongs in baileys.client.js.
     */

    if (
      raw.endsWith(
        "@lid"
      )
    ) {
      console.warn(
        "[MPR][WHATSAPP][LID_REJECTED_AS_PHONE]",
        {
          jid:
            raw,
        }
      );

      return "";
    }

    /*
     * Only a real WhatsApp PN JID is accepted here.
     *
     * Example:
     *
     * 919305127159@s.whatsapp.net
     */

    if (
      !raw.endsWith(
        "@s.whatsapp.net"
      )
    ) {
      console.warn(
        "[MPR][WHATSAPP][NON_PHONE_JID_REJECTED]",
        {
          jid:
            raw,
        }
      );

      return "";
    }

    const phonePart =
      raw
        .split(
          "@"
        )[0]
        .split(
          ":"
        )[0];

    return normalizePhone(
      phonePart
    );
  };

/* =========================================================
   TAG
========================================================= */

const tagFromJid =
  (
    jid
  ) => {
    const phone =
      phoneFromJid(
        jid
      );

    return phone
      ? `@${phone}`
      : "Requester";
  };

/* =========================================================
   SHOULD WARN?
========================================================= */

const shouldSendWarning =
  (
    senderJid
  ) => {
    const key =
      String(
        senderJid || ""
      );

    const now =
      Date.now();

    const previous =
      warningCache.get(
        key
      ) ||
      0;

    if (
      now -
        previous <
      warningCooldownMs()
    ) {
      return false;
    }

    warningCache.set(
      key,
      now
    );

    return true;
  };

/* =========================================================
   UNRELATED MESSAGE
========================================================= */

const unrelatedMessageReply =
  (
    senderJid
  ) =>
    [
      `${tagFromJid(senderJid)}`,
      "",
      "This group is only for Manpower Requests.",
      "",
      "Please submit requirements using the format below:",
      "",
      getManpowerTemplate(),
    ].join(
      "\n"
    );

/* =========================================================
   INVALID TEMPLATE
========================================================= */

const invalidTemplateReply =
  (
    senderJid,
    errors
  ) =>
    [
      `${tagFromJid(senderJid)}`,
      "",
      "Your Manpower Request could not be submitted.",
      "",
      "Please correct:",
      "",
      ...errors.map(
        (
          error
        ) =>
          `• ${error}`
      ),
      "",
      "Use this format:",
      "",
      getManpowerTemplate(),
    ].join(
      "\n"
    );

/* =========================================================
   FIND ACTIVE USER BY WHATSAPP PHONE

   IMPORTANT:

   WhatsApp / ERP access belongs to User.

   Employee is the organisation working-person record and is
   NOT required for a WhatsApp sender to create an MPR.

   Matching flow:

   WhatsApp sender number
   → User.whatsappNumber
   → ACTIVE User
========================================================= */

const findRequesterUserByWhatsAppPhone =
  async (
    phone
  ) => {
    const normalized =
      normalizePhone(
        phone
      );

    console.log(
      "[MPR][WHATSAPP][USER_LOOKUP_START]",
      {
        senderPhone:
          phone,

        normalizedPhone:
          normalized,
      }
    );

    if (
      !normalized
    ) {
      console.log(
        "[MPR][WHATSAPP][USER_LOOKUP_FAILED]",
        "Sender phone is empty after normalization"
      );

      return null;
    }

    /*
     * We intentionally do NOT use Employee.mobileNumber here.
     *
     * User.whatsappNumber is the WhatsApp / ERP identity.
     *
     * Example:
     *
     * User:
     * whatsappNumber: "919305127159"
     *
     * Incoming:
     * 919305127159@s.whatsapp.net
     *
     * Both normalize to:
     * 919305127159
     */

    const users =
      await User
        .find({
          status:
            "ACTIVE",

          whatsappNumber: {
            $nin: [
              null,
              "",
            ],
          },
        })
        .select(
          "_id displayName email role systemRole status whatsappNumber employee department primaryDepartment"
        );

    const requester =
      users.find(
        (
          user
        ) =>
          normalizePhone(
            user.whatsappNumber
          ) ===
          normalized
      ) ||
      null;

    if (
      !requester
    ) {
      console.log(
        "[MPR][WHATSAPP][USER_NOT_FOUND]",
        {
          normalizedPhone:
            normalized,

          activeUsersWithWhatsApp:
            users.length,
        }
      );

      return null;
    }

    console.log(
      "[MPR][WHATSAPP][USER_FOUND]",
      {
        userId:
          String(
            requester._id
          ),

        displayName:
          requester.displayName,

        whatsappNumber:
          requester.whatsappNumber,

        employeeId:
          requester.employee
            ? String(
                requester.employee
              )
            : null,

        department:
          requester.department
            ? String(
                requester.department
              )
            : null,

        primaryDepartment:
          requester.primaryDepartment
            ? String(
                requester.primaryDepartment
              )
            : null,
      }
    );

    return requester;
  };

/* =========================================================
   DEPARTMENT MATCH
========================================================= */

const resolveDepartment =
  async (
    value
  ) => {
    const raw =
      String(
        value || ""
      ).trim();

    if (
      !raw
    ) {
      return null;
    }

    const escaped =
      raw.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

    return Department
      .findOne({
        status:
          "ACTIVE",

        $or: [
          {
            name: {
              $regex:
                `^${escaped}$`,

              $options:
                "i",
            },
          },

          {
            code: {
              $regex:
                `^${escaped}$`,

              $options:
                "i",
            },
          },
        ],
      })
      .select(
        "_id name code"
      )
      .lean();
  };

/* =========================================================
   SUCCESS

   IMPORTANT:

   This is ONLY the group acknowledgement.

   The private approval WhatsApp is sent from
   manpower.service.js after createRequirement succeeds.

   Therefore WEB and WHATSAPP creation use exactly the same
   approval notification mechanism.
========================================================= */

const successReply =
  (
    senderJid,
    requirement
  ) =>
    [
      `${tagFromJid(senderJid)}`,
      "",
      "✅ Manpower Request successfully created.",
      "",
      `Request: ${requirement.requestNumber}`,
      `Position: ${requirement.positionTitle}`,
      `Openings: ${requirement.numberOfOpenings}`,
      `Status: ${requirement.status}`,
      "",
      "Your request has been sent to the approver.",
    ].join(
      "\n"
    );

/* =========================================================
   HANDLE MESSAGE
========================================================= */

const handleIncomingMprMessage =
  async ({
    jid,
    senderJid,
    senderPhone:
      resolvedSenderPhone,
    senderLid,
    senderIdentitySource,
    messageId,
    text,
  }) => {
    /*
     * TEMPORARY DEBUG LOG
     *
     * This lets us confirm that the manpower service actually
     * receives the event from the already-working Baileys
     * listener.
     */

   console.log(
  "[MPR][WHATSAPP][MESSAGE_RECEIVED]",
  {
    jid,

    senderJid,

    resolvedSenderPhone:
      resolvedSenderPhone ||
      null,

    senderLid:
      senderLid ||
      null,

    senderIdentitySource:
      senderIdentitySource ||
      null,

    messageId,

    textPreview:
      String(
        text || ""
      ).slice(
        0,
        160
      ),
  }
);

    /* -----------------------------------------------------
       Integration disabled
    ----------------------------------------------------- */

    if (
      !enabled()
    ) {
      console.log(
        "[MPR][WHATSAPP][IGNORED_DISABLED]"
      );

      return {
        ignored:
          true,
      };
    }

    /* -----------------------------------------------------
       Wrong group

       Absolutely no reply.
    ----------------------------------------------------- */

    if (
      !jid ||
      jid !==
        configuredGroup()
    ) {
      console.log(
        "[MPR][WHATSAPP][IGNORED_WRONG_GROUP]",
        {
          receivedGroup:
            jid,

          configuredGroup:
            configuredGroup(),
        }
      );

      return {
        ignored:
          true,
      };
    }

    console.log(
      "[MPR][WHATSAPP][GROUP_OK]",
      {
        groupJid:
          jid,
      }
    );

    /* -----------------------------------------------------
       PARSE

       Existing parser is intentionally unchanged.

       It already handles the Manpower Request template,
       including the human-readable required-by date.
    ----------------------------------------------------- */

    const parsed =
      parseManpowerRequest(
        text
      );

    console.log(
      "[MPR][WHATSAPP][PARSE_RESULT]",
      {
        isManpowerRequest:
          parsed?.isManpowerRequest,

        valid:
          parsed?.valid,

        errors:
          parsed?.errors ||
          [],
      }
    );

    /* -----------------------------------------------------
       NORMAL CHAT IN MPR GROUP

       Do not create anything.

       Warn + template, but cooldown prevents repeated spam.
    ----------------------------------------------------- */

    if (
      !parsed
        .isManpowerRequest
    ) {
      console.log(
        "[MPR][WHATSAPP][NOT_MPR]"
      );

      if (
        !shouldSendWarning(
          senderJid
        )
      ) {
        console.log(
          "[MPR][WHATSAPP][WARNING_COOLDOWN]"
        );

        return {
          ignored:
            true,
        };
      }

      return {
        ignored:
          false,

        created:
          false,

        reply:
          unrelatedMessageReply(
            senderJid
          ),

        mentions: [
          senderJid,
        ],
      };
    }

    /* -----------------------------------------------------
       INVALID MPR TEMPLATE
    ----------------------------------------------------- */

    if (
      !parsed.valid
    ) {
      console.log(
        "[MPR][WHATSAPP][INVALID_TEMPLATE]",
        {
          errors:
            parsed.errors,
        }
      );

      return {
        ignored:
          false,

        created:
          false,

        reply:
          invalidTemplateReply(
            senderJid,
            parsed.errors
          ),

        mentions: [
          senderJid,
        ],
      };
    }

    /* -----------------------------------------------------
       WHATSAPP NUMBER
    ----------------------------------------------------- */

   const senderPhone =
  normalizePhone(
    resolvedSenderPhone
  ) ||
  phoneFromJid(
    senderJid
  );

    console.log(
  "[MPR][WHATSAPP][SENDER_PHONE]",
  {
    senderJid,

    senderPhone,

    resolvedSenderPhone:
      resolvedSenderPhone ||
      null,

    senderLid:
      senderLid ||
      null,

    identitySource:
      senderIdentitySource ||
      (
        senderPhone
          ? "PN_JID"
          : "UNRESOLVED"
      ),
  }

    );

    if (
      !senderPhone
    ) {
      console.log(
        "[MPR][WHATSAPP][PHONE_NOT_IDENTIFIED]",
        {
          senderJid,
          messageId,
        }
      );

      return {
        ignored:
          false,

        created:
          false,

        reply: [
          tagFromJid(
            senderJid
          ),
          "",
          "Your WhatsApp number could not be identified.",
          "The Manpower Request was not created.",
        ].join(
          "\n"
        ),

        mentions: [
          senderJid,
        ],
      };
    }

    /* -----------------------------------------------------
       REQUESTER USER

       IMPORTANT:

       User.whatsappNumber is authoritative for WhatsApp /
       ERP access.

       Employee record is NOT required here.

       manpowerService.createRequirement() remains responsible
       for department authorization through the existing
       DepartmentMembership workflow.
    ----------------------------------------------------- */

    const requester =
      await findRequesterUserByWhatsAppPhone(
        senderPhone
      );

    if (
      !requester
    ) {
      console.log(
        "[MPR][WHATSAPP][REQUEST_REJECTED_USER_NOT_LINKED]",
        {
          senderJid,
          senderPhone,
          messageId,
        }
      );

      return {
        ignored:
          false,

        created:
          false,

        reply: [
          tagFromJid(
            senderJid
          ),
          "",
          "Your WhatsApp number is not linked with an active SE-RMS user account.",
          "",
          "The Manpower Request was not created.",
          "Please contact the SE-RMS administrator to update your registered WhatsApp number.",
        ].join(
          "\n"
        ),

        mentions: [
          senderJid,
        ],
      };
    }

    /* -----------------------------------------------------
       TEMPLATE DEPARTMENT
    ----------------------------------------------------- */

    const department =
      await resolveDepartment(
        parsed
          .raw
          .department
      );

    console.log(
      "[MPR][WHATSAPP][DEPARTMENT_LOOKUP]",
      {
        requestedDepartment:
          parsed?.raw?.department,

        matchedDepartmentId:
          department?._id
            ? String(
                department._id
              )
            : null,

        matchedDepartmentName:
          department?.name ||
          null,
      }
    );

    if (
      !department
    ) {
      console.log(
        "[MPR][WHATSAPP][DEPARTMENT_NOT_FOUND]",
        {
          requestedDepartment:
            parsed?.raw?.department,
        }
      );

      return {
        ignored:
          false,

        created:
          false,

        reply: [
          tagFromJid(
            senderJid
          ),
          "",
          `Department "${parsed.raw.department}" was not found in SE-RMS.`,
          "",
          "The Manpower Request was not created.",
        ].join(
          "\n"
        ),

        mentions: [
          senderJid,
        ],
      };
    }

    /* -----------------------------------------------------
       DEPARTMENT SECURITY

       IMPORTANT:

       Do NOT duplicate department authorization here.

       manpowerService.createRequirement() already calls
       resolveRequestDepartment().

       Therefore:

       Normal user
       → can raise only for active department membership.

       SUPER_ADMIN
       → retains existing global capability.

       Keeping the authorization in one place prevents the
       WhatsApp and WEB workflows from behaving differently.
    ----------------------------------------------------- */

    /* -----------------------------------------------------
       BUILD INPUT

       IMPORTANT:

       requester is the REAL WhatsApp sender's User.

       source = WHATSAPP stores the original message and JID
       so the requester can later be tagged in the result
       message.
    ----------------------------------------------------- */

    const rawInput = {
      ...parsed.input,

      department:
        department._id,

      source:
        "WHATSAPP",

     whatsappSource: {
  groupJid:
    jid,

  senderJid,

  senderPhone,

  senderLid:
    senderLid ||
    "",

  senderIdentitySource:
    senderIdentitySource ||
    "PN_JID",

  messageId,

  rawText:
    text,

  submittedAt:
    new Date(),
},
    };

    console.log(
      "[MPR][WHATSAPP][RAW_INPUT_READY]",
      {
        requesterUserId:
          String(
            requester._id
          ),

        requesterName:
          requester.displayName,

        departmentId:
          String(
            department._id
          ),

        departmentName:
          department.name,

        source:
          rawInput.source,

        senderPhone:
          rawInput
            .whatsappSource
            .senderPhone,
      }
    );

    /* -----------------------------------------------------
       EXISTING VALIDATION
    ----------------------------------------------------- */

    const input =
      validateCreateManpower(
        rawInput
      );

    console.log(
      "[MPR][WHATSAPP][VALIDATION_OK]",
      {
        requesterUserId:
          String(
            requester._id
          ),

        departmentId:
          String(
            department._id
          ),

        positionTitle:
          input.positionTitle,

        numberOfOpenings:
          input.numberOfOpenings,

        employmentType:
          input.employmentType,

        priority:
          input.priority,

        requiredByDate:
          input.requiredByDate,

        monthlySalaryMin:
          input.monthlySalaryMin,

        monthlySalaryMax:
          input.monthlySalaryMax,
      }
    );

    /* -----------------------------------------------------
       EXISTING MPR WORKFLOW

       requestedBy = actual sender User

       currentApprover = existing resolveApprover()

       Private approver WhatsApp is triggered by
       createRequirement() inside manpower.service.js.

       BOTH WEB and WHATSAPP-created requirements therefore
       continue using the same approval workflow.
    ----------------------------------------------------- */

    console.log(
  "[MPR][WHATSAPP][CREATE_START]",
  {
    requesterUserId:
      String(
        requester._id
      ),

    requesterName:
      requester.displayName,

    departmentId:
      String(
        department._id
      ),

    positionTitle:
      input.positionTitle,
  }
);

let requirement;

try {
  requirement =
    await manpowerService
      .createRequirement({
        user:
          requester,

        input,
      });
} catch (
  error
) {
  const errorMessage =
    String(
      error?.message ||
      "Unable to create the Manpower Request."
    ).trim();

  console.error(
    "[MPR][WHATSAPP][CREATE_FAILED]",
    {
      requesterUserId:
        String(
          requester._id
        ),

      requesterName:
        requester.displayName,

      departmentId:
        String(
          department._id
        ),

      departmentName:
        department.name,

      error:
        errorMessage,
    }
  );

  return {
    ignored:
      false,

    created:
      false,

    reply: [
      tagFromJid(
        senderJid
      ),
      "",
      "❌ *Manpower Request Not Created*",
      "",
      errorMessage,
      "",
      "Please correct the request and send it again.",
    ].join(
      "\n"
    ),

    mentions: [
      senderJid,
    ],
  };
}

console.log(
  "[MPR][WHATSAPP][MPR_CREATED]",
      {
        requirementId:
          requirement?._id
            ? String(
                requirement._id
              )
            : null,

        requestNumber:
          requirement?.requestNumber,

        status:
          requirement?.status,

        requestedBy:
          requirement
            ?.requestedBy
            ?._id
            ? String(
                requirement
                  .requestedBy
                  ._id
              )
            : String(
                requirement
                  ?.requestedBy ||
                ""
              ),

        currentApprover:
          requirement
            ?.currentApprover
            ?._id
            ? String(
                requirement
                  .currentApprover
                  ._id
              )
            : String(
                requirement
                  ?.currentApprover ||
                ""
              ),
      }
    );

    /* -----------------------------------------------------
       GROUP ACKNOWLEDGEMENT

       Baileys should send result.reply and result.mentions.

       We are NOT changing Baileys client code.
    ----------------------------------------------------- */

    const reply =
      successReply(
        senderJid,
        requirement
      );

    console.log(
      "[MPR][WHATSAPP][HANDLER_SUCCESS]",
      {
        requestNumber:
          requirement
            ?.requestNumber,

        replyReady:
          true,

        mentionJid:
          senderJid,
      }
    );

    return {
      ignored:
        false,

      created:
        true,

      requirement,

      reply,

      mentions: [
        senderJid,
      ],
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  handleIncomingMprMessage,

  normalizePhone,

  phoneFromJid,

  tagFromJid,

  getManpowerTemplate,
};
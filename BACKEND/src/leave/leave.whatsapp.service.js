const crypto =
  require("crypto");

const {
  User,
} =
  require("../user/user.model");

const {
  Employee,
} =
  require("../employee/employee.model");

const {
  LeaveType,
} =
  require("./leaveType.model");

const leaveService =
  require("./leave.service");

/* =========================================================
   CONFIG
========================================================= */

const LEAVE_GROUP_ID =
  String(
    process.env
      .WHATSAPP_LEAVE_GROUP_ID ||
      ""
  ).trim();

/* =========================================================
   LAZY BAILEYS IMPORT

   IMPORTANT:
   Prevent circular dependency:
   baileysClient -> leave.whatsapp.service -> baileysClient
========================================================= */

const getWhatsAppClient =
  () =>
    require(
      "../baileys/baileysClient"
    );

/* =========================================================
   GENERIC HELPERS
========================================================= */

const cleanText = (
  value
) =>
  String(
    value || ""
  ).trim();

const normalizeUpper = (
  value
) =>
  cleanText(
    value
  ).toUpperCase();

const normalizePhone = (
  value
) => {
  let digits =
    String(
      value || ""
    ).replace(
      /\D/g,
      ""
    );

  if (
    digits.length ===
    10
  ) {
    digits =
      `91${digits}`;
  }

  return digits;
};

const normalizeComparableName = (
  value
) =>
  String(
    value || ""
  )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();

const formatDateIndian = (
  value
) => {
  const raw =
    cleanText(
      value
    );

  if (
    !/^\d{4}-\d{2}-\d{2}$/
      .test(raw)
  ) {
    return raw;
  }

  const [
    year,
    month,
    day,
  ] =
    raw.split("-");

  return `${day}/${month}/${year}`;
};

const formatDays = (
  value
) => {
  const number =
    Number(value || 0);

  if (
    number === 0.5
  ) {
    return "0.5 Day";
  }

  return `${number} ${
    number === 1
      ? "Day"
      : "Days"
  }`;
};

const getDurationLabel = (
  value
) => {
  const duration =
    normalizeUpper(
      value
    );

  if (
    duration ===
    "FIRST_HALF"
  ) {
    return "First Half";
  }

  if (
    duration ===
    "SECOND_HALF"
  ) {
    return "Second Half";
  }

  return "Full Day";
};

/* =========================================================
   MESSAGE TEXT EXTRACTION
========================================================= */

const unwrapMessage = (
  message
) => {
  if (
    !message ||
    typeof message !==
      "object"
  ) {
    return {};
  }

  if (
    message
      .ephemeralMessage
      ?.message
  ) {
    return unwrapMessage(
      message
        .ephemeralMessage
        .message
    );
  }

  if (
    message
      .viewOnceMessage
      ?.message
  ) {
    return unwrapMessage(
      message
        .viewOnceMessage
        .message
    );
  }

  if (
    message
      .viewOnceMessageV2
      ?.message
  ) {
    return unwrapMessage(
      message
        .viewOnceMessageV2
        .message
    );
  }

  if (
    message
      .documentWithCaptionMessage
      ?.message
  ) {
    return unwrapMessage(
      message
        .documentWithCaptionMessage
        .message
    );
  }

  return message;
};

const extractMessageText = (
  message
) => {
  const content =
    unwrapMessage(
      message
    );

  return cleanText(
    content
      ?.conversation ||
    content
      ?.extendedTextMessage
      ?.text ||
    content
      ?.imageMessage
      ?.caption ||
    content
      ?.videoMessage
      ?.caption ||
    content
      ?.documentMessage
      ?.caption ||
    ""
  );
};

/* =========================================================
   JID / PHONE
========================================================= */

const phoneFromJid = (
  jid
) => {
  const raw =
    String(
      jid || ""
    ).trim();

  if (
    !raw.endsWith(
      "@s.whatsapp.net"
    )
  ) {
    return "";
  }

  return normalizePhone(
    raw.split("@")[0]
  );
};

const getPhoneCandidates = ({
  senderJid,
  participant,
  participantAlt,
}) => {
  const values = [
    senderJid,
    participant,
    participantAlt,
  ];

  return [
    ...new Set(
      values
        .map(
          phoneFromJid
        )
        .filter(Boolean)
    ),
  ];
};

/* =========================================================
   INTENT DETECTION

   We intentionally require leave intent so ordinary group
   conversation is silently ignored.
========================================================= */

const looksLikeLeaveRequest = (
  text
) => {
  const value =
    normalizeUpper(
      text
    );

  if (!value) {
    return false;
  }

  const strongPatterns = [
    /\bLEAVE\s*APPLY\b/,
    /\bAPPLY\s*LEAVE\b/,
    /\bLEAVE\s*APPLICATION\b/,
    /\bLEAVE\s*REQUEST\b/,
  ];

  if (
    strongPatterns.some(
      (pattern) =>
        pattern.test(
          value
        )
    )
  ) {
    return true;
  }

  /*
   * Also accept a structured message without heading:
   *
   * Employee Code: SDP-001
   * Leave Type: CL
   * From: ...
   */

  const hasEmployeeCode =
    /\b(?:EMPLOYEE\s*CODE|EMP\s*CODE|EMP\s*ID|EMPLOYEE\s*ID)\b/
      .test(value);

  const hasLeaveType =
    /\b(?:LEAVE\s*TYPE|TYPE)\s*[:\-]/
      .test(value);

  const hasDate =
    /\b(?:FROM|DATE)\s*[:\-]/
      .test(value);

  return (
    hasEmployeeCode &&
    hasLeaveType &&
    hasDate
  );
};

/* =========================================================
   FIELD PARSER
========================================================= */

const parseLines = (
  text
) => {
  const fields = {};

  const lines =
    String(
      text || ""
    )
      .split(
        /\r?\n/
      )
      .map(
        (line) =>
          line.trim()
      )
      .filter(Boolean);

  for (
    const line
    of lines
  ) {
    const match =
      line.match(
        /^([^:=\-]{1,50})\s*[:=\-]\s*(.+)$/i
      );

    if (!match) {
      continue;
    }

    const key =
      match[1]
        .toLowerCase()
        .replace(
          /[^a-z0-9]+/g,
          " "
        )
        .trim();

    const value =
      match[2].trim();

    if (
      !value
    ) {
      continue;
    }

    fields[key] =
      value;
  }

  return fields;
};

const firstField = (
  fields,
  keys
) => {
  for (
    const key
    of keys
  ) {
    if (
      fields[key]
    ) {
      return cleanText(
        fields[key]
      );
    }
  }

  return "";
};

/* =========================================================
   DATE PARSER

   Supports:
   15/10/2026
   15-10-2026
   2026-10-15
   15.10.2026
========================================================= */

const parseDate = (
  value
) => {
  const raw =
    cleanText(
      value
    );

  if (!raw) {
    return "";
  }

  let match =
    raw.match(
      /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/
    );

  if (match) {
    const year =
      Number(
        match[1]
      );

    const month =
      Number(
        match[2]
      );

    const day =
      Number(
        match[3]
      );

    return validateDateParts({
      year,
      month,
      day,
    });
  }

  match =
    raw.match(
      /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/
    );

  if (match) {
    const day =
      Number(
        match[1]
      );

    const month =
      Number(
        match[2]
      );

    const year =
      Number(
        match[3]
      );

    return validateDateParts({
      year,
      month,
      day,
    });
  }

  return "";
};

const validateDateParts = ({
  year,
  month,
  day,
}) => {
  if (
    !Number.isInteger(
      year
    ) ||
    !Number.isInteger(
      month
    ) ||
    !Number.isInteger(
      day
    )
  ) {
    return "";
  }

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  if (
    date.getUTCFullYear() !==
      year ||
    date.getUTCMonth() !==
      month - 1 ||
    date.getUTCDate() !==
      day
  ) {
    return "";
  }

  return [
    String(year)
      .padStart(
        4,
        "0"
      ),

    String(month)
      .padStart(
        2,
        "0"
      ),

    String(day)
      .padStart(
        2,
        "0"
      ),
  ].join("-");
};

/* =========================================================
   DURATION PARSER
========================================================= */

const parseDuration = (
  value
) => {
  const normalized =
    normalizeUpper(
      value
    )
      .replace(
        /[_\-]+/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  if (!normalized) {
    return "FULL_DAY";
  }

  if (
    [
      "FIRST HALF",
      "1ST HALF",
      "FIRST",
      "MORNING",
      "HALF DAY FIRST",
      "HALF DAY MORNING",
    ].includes(
      normalized
    )
  ) {
    return "FIRST_HALF";
  }

  if (
    [
      "SECOND HALF",
      "2ND HALF",
      "SECOND",
      "AFTERNOON",
      "HALF DAY SECOND",
      "HALF DAY AFTERNOON",
    ].includes(
      normalized
    )
  ) {
    return "SECOND_HALF";
  }

  if (
    [
      "FULL",
      "FULL DAY",
      "FULLDAY",
      "DAY",
    ].includes(
      normalized
    )
  ) {
    return "FULL_DAY";
  }

  /*
   * Generic "half day" is ambiguous.
   * Do not guess which half.
   */

  if (
    normalized.includes(
      "HALF"
    )
  ) {
    return "";
  }

  return "FULL_DAY";
};

/* =========================================================
   BOOLEAN PARSER
========================================================= */

const parseBoolean = (
  value
) => {
  const normalized =
    normalizeUpper(
      value
    );

  return [
    "YES",
    "Y",
    "TRUE",
    "1",
    "EMERGENCY",
  ].includes(
    normalized
  );
};

/* =========================================================
   PARSE LEAVE APPLICATION
========================================================= */

const parseLeaveApplication = (
  text
) => {
  const fields =
    parseLines(
      text
    );

  const employeeCode =
    firstField(
      fields,
      [
        "employee code",
        "emp code",
        "employee id",
        "emp id",
        "code",
      ]
    );

  const employeeName =
    firstField(
      fields,
      [
        "employee name",
        "name",
      ]
    );

  const leaveTypeText =
    firstField(
      fields,
      [
        "leave type",
        "type",
        "leave",
      ]
    );

  const durationRaw =
    firstField(
      fields,
      [
        "duration",
        "leave duration",
        "day type",
      ]
    );

  const singleDate =
    firstField(
      fields,
      [
        "date",
        "leave date",
      ]
    );

  let fromDate =
    parseDate(
      firstField(
        fields,
        [
          "from",
          "from date",
          "start",
          "start date",
        ]
      ) ||
      singleDate
    );

  let toDate =
    parseDate(
      firstField(
        fields,
        [
          "to",
          "to date",
          "end",
          "end date",
        ]
      ) ||
      singleDate
    );

  /*
   * Friendly behavior:
   * If user only supplied From, use same date as To.
   */

  if (
    fromDate &&
    !toDate
  ) {
    toDate =
      fromDate;
  }

  if (
    toDate &&
    !fromDate
  ) {
    fromDate =
      toDate;
  }

  const durationType =
    parseDuration(
      durationRaw
    );

  const reason =
    firstField(
      fields,
      [
        "reason",
        "leave reason",
        "purpose",
      ]
    );

  const emergency =
    parseBoolean(
      firstField(
        fields,
        [
          "emergency",
          "urgent",
        ]
      )
    );

  const emergencyReason =
    firstField(
      fields,
      [
        "emergency reason",
        "emergency details",
        "urgent reason",
      ]
    );

  const contactDuringLeave =
    firstField(
      fields,
      [
        "contact",
        "contact during leave",
        "mobile",
      ]
    );

  return {
    employeeCode:
      normalizeUpper(
        employeeCode
      ),

    employeeName,

    leaveTypeText,

    durationType,

    fromDate,

    toDate,

    reason,

    emergency,

    emergencyReason,

    contactDuringLeave,
  };
};

/* =========================================================
   FRIENDLY NAME CHECK

   IMPORTANT:
   Name is NOT identity authority.

   Sender WhatsApp + Employee Code are authority.

   "Sandeep" is accepted for "Sandeep Jain".
   "Ankit" is accepted for "ANKIT SINGH".

   We only reject a supplied name if it clearly has no
   relationship to the employee's actual name.
========================================================= */

const isFriendlyNameMatch = (
  suppliedName,
  actualName
) => {
  const supplied =
    normalizeComparableName(
      suppliedName
    );

  const actual =
    normalizeComparableName(
      actualName
    );

  if (
    !supplied
  ) {
    return true;
  }

  if (
    !actual
  ) {
    return true;
  }

  if (
    supplied ===
      actual ||
    actual.startsWith(
      `${supplied} `
    ) ||
    supplied.startsWith(
      `${actual} `
    )
  ) {
    return true;
  }

  const suppliedTokens =
    supplied
      .split(" ")
      .filter(
        (item) =>
          item.length >= 2
      );

  const actualTokens =
    new Set(
      actual
        .split(" ")
        .filter(Boolean)
    );

  if (
    !suppliedTokens.length
  ) {
    return true;
  }

  return suppliedTokens
    .every(
      (token) =>
        actualTokens.has(
          token
        )
    );
};

/* =========================================================
   RESOLVE USER FROM WHATSAPP

   User.whatsappNumber is authoritative.
========================================================= */

const resolveSenderUser = async ({
  senderJid,
  participant,
  participantAlt,
}) => {
  const phoneCandidates =
    getPhoneCandidates({
      senderJid,
      participant,
      participantAlt,
    });

  if (
    !phoneCandidates.length
  ) {
    return null;
  }

  const users =
    await User
      .find({
        status:
          "ACTIVE",

        whatsappNumber: {
          $in:
            phoneCandidates,
        },
      })
      .select(
        "_id displayName whatsappNumber employee systemRole role status"
      )
      .lean();

  if (
    users.length !==
    1
  ) {
    return null;
  }

  return users[0];
};

/* =========================================================
   RESOLVE EMPLOYEE
========================================================= */

const resolveSenderEmployee =
  async (
    user
  ) => {
    if (!user?._id) {
      return null;
    }

    return Employee
      .findOne({
        user:
          user._id,

        status:
          "ACTIVE",
      })
      .select(
        "_id employeeCode fullName designation orgUnitCode department reportsTo user employmentType gender status"
      )
      .lean();
  };

/* =========================================================
   LEAVE TYPE MATCHER

   Supports:
   CL
   Casual Leave
   Casual
   SL
   Sick Leave
   PL
   Privilege Leave

   Exact code/name/shortName wins.
   Then safe token/prefix matching.
========================================================= */

const resolveLeaveType =
  async (
    supplied
  ) => {
    const input =
      normalizeComparableName(
        supplied
      );

    if (!input) {
      return null;
    }

    const types =
      await LeaveType
        .find({
          active:
            true,
        })
        .sort({
          displayOrder:
            1,

          name:
            1,
        })
        .lean();

    const exact =
      types.find(
        (type) => {
          const values = [
            type.code,
            type.name,
            type.shortName,
          ]
            .map(
              normalizeComparableName
            )
            .filter(Boolean);

          return values.includes(
            input
          );
        }
      );

    if (exact) {
      return exact;
    }

    const candidates =
      types.filter(
        (type) => {
          const values = [
            type.name,
            type.shortName,
          ]
            .map(
              normalizeComparableName
            )
            .filter(Boolean);

          return values.some(
            (value) =>
              value.startsWith(
                `${input} `
              ) ||
              input.startsWith(
                `${value} `
              )
          );
        }
      );

    if (
      candidates.length ===
      1
    ) {
      return candidates[0];
    }

    return null;
  };

/* =========================================================
   PRIVATE SEND
========================================================= */

const sendPrivate = async (
  phone,
  text
) => {
  if (
    !phone ||
    !text
  ) {
    return false;
  }

  try {
    await getWhatsAppClient()
      .sendTextToPhone(
        phone,
        text
      );

    return true;
  } catch (
    error
  ) {
    console.error(
      "LEAVE WHATSAPP PRIVATE SEND ERROR =>",
      error.message
    );

    return false;
  }
};

/* =========================================================
   AVAILABLE LEAVE OPTIONS

   IMPORTANT:
   - We only show leave types that have an applicable policy
     for this employee on the requested date.
   - Balance-based leave is shown only when balance > 0.
   - Non-balance leave (for example LWP, when configured in
     policy) is shown as "Available".
   - Existing createLeaveRequest() remains the final authority.
========================================================= */

const getBalanceAvailable = (
  balance
) => {
  if (!balance) {
    return 0;
  }

  if (
    Number.isFinite(
      Number(
        balance.available
      )
    )
  ) {
    return Number(
      balance.available
    );
  }

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
      balance.reserved ||
        0
    ) -
    Number(
      balance.expired ||
        0
    )
  );
};

const getAvailableLeaveOptions =
  async ({
    user,
    employee,
    date,
    excludeLeaveTypeId = null,
  }) => {
    const targetDate =
      cleanText(
        date
      );

    const targetYear =
      Number(
        targetDate
          ?.slice(
            0,
            4
          )
      ) ||
      new Date()
        .getFullYear();

    const [
      leaveTypes,
      balanceResult,
    ] =
      await Promise.all([
        LeaveType
          .find({
            active:
              true,
          })
          .sort({
            displayOrder:
              1,

            name:
              1,
          })
          .lean(),

        leaveService
          .getMyBalances({
            user,
            year:
              targetYear,
          }),
      ]);

    const balances =
      Array.isArray(
        balanceResult
          ?.balances
      )
        ? balanceResult
            .balances
        : [];

    const balanceByLeaveType =
      new Map();

    for (
      const balance
      of balances
    ) {
      const leaveTypeId =
        String(
          balance
            ?.leaveTypeId
            ?._id ||
          balance
            ?.leaveTypeId ||
          ""
        );

      if (
        leaveTypeId
      ) {
        balanceByLeaveType
          .set(
            leaveTypeId,
            balance
          );
      }
    }

    const options = [];

    for (
      const leaveType
      of leaveTypes
    ) {
      const leaveTypeId =
        String(
          leaveType
            ?._id ||
          ""
        );

      if (
        !leaveTypeId
      ) {
        continue;
      }

      if (
        excludeLeaveTypeId &&
        leaveTypeId ===
          String(
            excludeLeaveTypeId
          )
      ) {
        continue;
      }

      /*
       * A globally active LeaveType is not enough.
       *
       * It must also have an applicable policy for this
       * employee on the requested leave date.
       */

      try {
        await leaveService
          .getApplicablePolicy({
            leaveTypeId:
              leaveType._id,

            employee,

            date:
              targetDate,
          });
      } catch (
        policyError
      ) {
        if (
          normalizeUpper(
            policyError
              ?.code
          ) ===
          "LEAVE_POLICY_NOT_FOUND"
        ) {
          continue;
        }

        throw policyError;
      }

      if (
        leaveType
          .requiresBalance
      ) {
        const balance =
          balanceByLeaveType
            .get(
              leaveTypeId
            );

        const available =
          getBalanceAvailable(
            balance
          );

        /*
         * Do not suggest another balance-based leave when
         * there is no usable balance.
         */

        if (
          available <= 0 &&
          !leaveType
            .allowNegativeBalance
        ) {
          continue;
        }

        options.push({
          leaveType,

          available,

          requiresBalance:
            true,
        });

        continue;
      }

      /*
       * Example: LWP.
       *
       * No balance is required, but it is shown only after
       * the applicable-policy check above succeeds.
       */

      options.push({
        leaveType,

        available:
          null,

        requiresBalance:
          false,
      });
    }

    return options;
  };

const buildAlternativeLeaveMessage =
  async ({
    user,
    employee,
    requestedLeaveType,
    parsed,
    error,
  }) => {
    let options = [];

    try {
      options =
        await getAvailableLeaveOptions({
          user,

          employee,

          date:
            parsed
              ?.fromDate,

          excludeLeaveTypeId:
            requestedLeaveType
              ?._id,
        });
    } catch (
      optionError
    ) {
      console.error(
        "LEAVE WHATSAPP AVAILABLE OPTIONS ERROR =>",
        optionError
          ?.stack ||
        optionError
          ?.message ||
        optionError
      );
    }

    const requestedCode =
      cleanText(
        requestedLeaveType
          ?.code
      );

    const requestedName =
      cleanText(
        requestedLeaveType
          ?.name
      );

    const requestedLabel =
      requestedCode &&
      requestedName
        ? `${requestedName} (${requestedCode})`
        : requestedName ||
          requestedCode ||
          "Requested Leave";

    const lines = [
      `❌ *${normalizeUpper(
        requestedLabel
      )} BALANCE NOT AVAILABLE*`,
      "",
      cleanText(
        error
          ?.message
      ) ||
        `You do not have sufficient ${requestedLabel} balance for this request.`,
      "",
      `*Requested Date:* ${formatDateIndian(
        parsed
          ?.fromDate
      )}${
        parsed
          ?.toDate &&
        parsed.toDate !==
          parsed.fromDate
          ? ` to ${formatDateIndian(
              parsed.toDate
            )}`
          : ""
      }`,
    ];

    if (
      !options.length
    ) {
      lines.push(
        "",
        "No other leave type is currently available for this request.",
        "",
        "Please contact HR if you need assistance."
      );

      return lines.join(
        "\n"
      );
    }

    lines.push(
      "",
      "*Your available leave options:*",
      ""
    );

    for (
      const option
      of options
    ) {
      const type =
        option.leaveType ||
        {};

      const code =
        cleanText(
          type.code
        );

      const name =
        cleanText(
          type.name ||
          type.shortName
        );

      const label =
        code && name
          ? `${code} - ${name}`
          : code ||
            name ||
            "Leave";

      if (
        option
          .requiresBalance
      ) {
        lines.push(
          `• *${label}:* ${formatDays(
            option.available
          )} available`
        );
      } else {
        lines.push(
          `• *${label}:* Available`
        );
      }
    }

    lines.push(
      "",
      "Please apply again using one of the available leave types above."
    );

    return lines.join(
      "\n"
    );
  };

/* =========================================================
   FRIENDLY ERROR MESSAGE

   We intentionally keep employee errors short.
========================================================= */

const getFriendlyErrorMessage = (
  error
) => {
  const code =
    normalizeUpper(
      error?.code
    );

  if (
    code ===
    "INSUFFICIENT_LEAVE_BALANCE"
  ) {
    return (
      "❌ *LEAVE NOT APPLIED*\n\n" +
      `${cleanText(
        error.message
      )}\n\n` +
      "Please choose another available leave type or date."
    );
  }

  if (
    code ===
    "LEAVE_OVERLAP"
  ) {
    return (
      "❌ *LEAVE NOT APPLIED*\n\n" +
      `${cleanText(
        error.message
      )}`
    );
  }

  if (
    code ===
    "LEAVE_POLICY_NOT_FOUND"
  ) {
    return (
      "❌ *LEAVE NOT APPLIED*\n\n" +
      "This leave type is not available for you."
    );
  }

  if (
    code ===
    "LEAVE_APPROVER_NOT_FOUND"
  ) {
    return (
      "❌ *LEAVE NOT APPLIED*\n\n" +
      "Your reporting manager is not configured. Please contact HR."
    );
  }

  return (
    "❌ *LEAVE NOT APPLIED*\n\n" +
    `${
      cleanText(
        error?.message
      ) ||
      "Unable to submit the leave request."
    }`
  );
};

/* =========================================================
   SUCCESS MESSAGE — EMPLOYEE
========================================================= */

const buildEmployeeSuccessMessage = (
  request
) => {
  const employee =
    request?.employeeId ||
    {};

  const leaveType =
    request?.leaveTypeId ||
    {};

  const approver =
    request
      ?.currentApproverEmployeeId ||
    request
      ?.reportingManagerSnapshot ||
    {};

  return [
    "✅ *LEAVE REQUEST SUBMITTED*",
    "",
    `*${request.requestNumber}*`,
    "",
    `*Employee:* ${
      employee.fullName ||
      ""
    }`,
    `*Employee Code:* ${
      employee.employeeCode ||
      ""
    }`,
    `*Leave Type:* ${
      leaveType.name ||
      leaveType.code ||
      ""
    }`,
    `*Duration:* ${getDurationLabel(
      request.durationType
    )}`,
    `*From:* ${formatDateIndian(
      request.fromDate
    )}`,
    `*To:* ${formatDateIndian(
      request.toDate
    )}`,
    `*Total:* ${formatDays(
      request.totalDays
    )}`,
    "",
    "*Status:* 🟡 Pending Approval",
    `*Reporting Manager:* ${
      approver.fullName ||
      approver.name ||
      "Reporting Manager"
    }`,
    "",
    "Your request has been submitted successfully.",
  ].join("\n");
};

/* =========================================================
   MANAGER APPROVAL MESSAGE
========================================================= */

const buildManagerApprovalMessage = ({
  request,
  approveUrl,
  rejectUrl,
}) => {
  const employee =
    request?.employeeId ||
    {};

  const leaveType =
    request?.leaveTypeId ||
    {};

  return [
    "🔔 *NEW LEAVE REQUEST*",
    "",
    `*${request.requestNumber}*`,
    "",
    `*Employee:* ${
      employee.fullName ||
      ""
    }`,
    `*Employee Code:* ${
      employee.employeeCode ||
      ""
    }`,
    `*Department:* ${
      employee.orgUnitCode ||
      request.orgUnitCode ||
      ""
    }`,
    `*Leave Type:* ${
      leaveType.name ||
      leaveType.code ||
      ""
    }`,
    `*Duration:* ${getDurationLabel(
      request.durationType
    )}`,
    `*From:* ${formatDateIndian(
      request.fromDate
    )}`,
    `*To:* ${formatDateIndian(
      request.toDate
    )}`,
    `*Total:* ${formatDays(
      request.totalDays
    )}`,
    `*Reason:* ${
      request.reason ||
      ""
    }`,
    "",
    "Please review this leave request.",
    "",
    "✅ *APPROVE REQUEST*",
    approveUrl,
    "",
    "❌ *REJECT REQUEST*",
    rejectUrl,
    "",
    "🔐 Each approval action can be used only once.",
  ].join("\n");
};

/* =========================================================
   STATUS MESSAGE — EMPLOYEE
========================================================= */

const buildEmployeeDecisionMessage = ({
  request,
  approved,
  approverName,
  comment,
}) => {
  const leaveType =
    request?.leaveTypeId ||
    {};

  const lines = [
    approved
      ? "✅ *LEAVE APPROVED*"
      : "❌ *LEAVE REJECTED*",
    "",
    `*${request.requestNumber}*`,
    "",
    approved
      ? "Your leave request has been approved."
      : "Your leave request has been rejected.",
    "",
    `*Leave Type:* ${
      leaveType.name ||
      leaveType.code ||
      ""
    }`,
    `*Duration:* ${getDurationLabel(
      request.durationType
    )}`,
    `*From:* ${formatDateIndian(
      request.fromDate
    )}`,
    `*To:* ${formatDateIndian(
      request.toDate
    )}`,
    `*Total:* ${formatDays(
      request.totalDays
    )}`,
    `*${
      approved
        ? "Approved"
        : "Rejected"
    } By:* ${
      approverName ||
      "Reporting Manager"
    }`,
  ];

  if (
    !approved &&
    cleanText(
      comment
    )
  ) {
    lines.push(
      `*Reason:* ${cleanText(
        comment
      )}`
    );
  }

  return lines.join(
    "\n"
  );
};

/* =========================================================
   NOTIFY EMPLOYEE AFTER WEB / WHATSAPP CREATE
========================================================= */

const notifyEmployeeLeaveSubmitted =
  async ({
    request,
    employeeUser,
  }) => {
    const phone =
      normalizePhone(
        employeeUser
          ?.whatsappNumber
      );

    if (!phone) {
      return false;
    }

    return sendPrivate(
      phone,
      buildEmployeeSuccessMessage(
        request
      )
    );
  };

/* =========================================================
   NOTIFY MANAGER

   Token is generated only AFTER the leave request has
   successfully passed validation and exists.

   If balance/policy/overlap fails, this function is never
   called.
========================================================= */
const notifyManagerForApproval =
  async ({
    request,
  }) => {
    console.log(
      "\n[LEAVE][MANAGER_NOTIFY][START]",
      {
        requestId:
          request?._id
            ? String(
                request._id
              )
            : null,

        requestNumber:
          request
            ?.requestNumber ||
          null,

        currentApproverEmployeeId:
          request
            ?.currentApproverEmployeeId
            ?._id
            ? String(
                request
                  .currentApproverEmployeeId
                  ._id
              )
            : (
                request
                  ?.currentApproverEmployeeId
                  ? String(
                      request
                        .currentApproverEmployeeId
                    )
                  : null
              ),

        currentApproverUserId:
          request
            ?.currentApproverUserId
            ? String(
                request
                  .currentApproverUserId
              )
            : null,
      }
    );

    const approverUserId =
      request
        ?.currentApproverUserId ||
      request
        ?.currentApproverEmployeeId
        ?.user;

    if (
      !approverUserId
    ) {
      console.error(
        "[LEAVE][MANAGER_NOTIFY][FAILED] NO_APPROVER_USER"
      );

      return {
        sent:
          false,

        reason:
          "NO_APPROVER_USER",
      };
    }

    console.log(
      "[LEAVE][MANAGER_NOTIFY][APPROVER_USER]",
      String(
        approverUserId
      )
    );

    const managerUser =
      await User
        .findOne({
          _id:
            approverUserId,

          status:
            "ACTIVE",
        })
        .select(
          "_id displayName whatsappNumber employee status"
        )
        .lean();

    console.log(
      "[LEAVE][MANAGER_NOTIFY][MANAGER_USER]",
      managerUser
        ? {
            _id:
              String(
                managerUser._id
              ),

            displayName:
              managerUser
                .displayName,

            whatsappNumber:
              managerUser
                .whatsappNumber,

            status:
              managerUser
                .status,
          }
        : null
    );

    if (
      !managerUser
    ) {
      console.error(
        "[LEAVE][MANAGER_NOTIFY][FAILED] MANAGER_USER_NOT_FOUND"
      );

      return {
        sent:
          false,

        reason:
          "MANAGER_USER_NOT_FOUND",
      };
    }

    if (
      !managerUser
        .whatsappNumber
    ) {
      console.error(
        "[LEAVE][MANAGER_NOTIFY][FAILED] NO_MANAGER_WHATSAPP"
      );

      return {
        sent:
          false,

        reason:
          "NO_MANAGER_WHATSAPP",
      };
    }

    /*
     * =====================================================
     * CHECK APPROVAL TOKEN FUNCTION
     * =====================================================
     */

    console.log(
      "[LEAVE][MANAGER_NOTIFY][TOKEN_FUNCTION_CHECK]",
      {
        issuePublicApprovalToken:
          typeof leaveService
            .issuePublicApprovalToken,

        prepareWhatsAppApproval:
          typeof leaveService
            .prepareWhatsAppApproval,

        processPublicLeaveApproval:
          typeof leaveService
            .processPublicLeaveApproval,
      }
    );

    let approval;

    try {
      /*
       * Use issuePublicApprovalToken if your leave.service
       * exports the newer function.
       */

      if (
        typeof leaveService
          .issuePublicApprovalToken ===
        "function"
      ) {
        console.log(
          "[LEAVE][MANAGER_NOTIFY][TOKEN] using issuePublicApprovalToken"
        );

        approval =
          await leaveService
            .issuePublicApprovalToken({
              requestId:
                request._id,

              approverUserId:
                managerUser._id,
            });
      }

      /*
       * Support the earlier implementation where the function
       * was named prepareWhatsAppApproval.
       */

      else if (
        typeof leaveService
          .prepareWhatsAppApproval ===
        "function"
      ) {
        console.log(
          "[LEAVE][MANAGER_NOTIFY][TOKEN] using prepareWhatsAppApproval"
        );

        approval =
          await leaveService
            .prepareWhatsAppApproval(
              request._id
            );
      }

      else {
        throw new Error(
          "Leave approval token function is not available in leave.service.js."
        );
      }

      console.log(
        "[LEAVE][MANAGER_NOTIFY][TOKEN_CREATED]",
        {
          hasApproval:
            Boolean(
              approval
            ),

          hasRequest:
            Boolean(
              approval
                ?.request
            ),

          hasApproveUrl:
            Boolean(
              approval
                ?.approveUrl
            ),

          hasRejectUrl:
            Boolean(
              approval
                ?.rejectUrl
            ),
        }
      );
    } catch (
      tokenError
    ) {
      console.error(
        "[LEAVE][MANAGER_NOTIFY][TOKEN_ERROR] =>",
        tokenError
          ?.stack ||
        tokenError
          ?.message ||
        tokenError
      );

      throw tokenError;
    }

    /*
     * =====================================================
     * VALIDATE RESULT
     * =====================================================
     */

    if (
      !approval
        ?.approveUrl ||
      !approval
        ?.rejectUrl
    ) {
      console.error(
        "[LEAVE][MANAGER_NOTIFY][FAILED] APPROVAL_URL_MISSING",
        approval
      );

      throw new Error(
        "Leave approval URLs were not generated."
      );
    }

    /*
     * Some implementations return populated request in
     * approval.request. Others only return URLs.
     *
     * Fall back to the already-created request.
     */

    const approvalRequest =
      approval
        ?.request ||
      request;

    const message =
      buildManagerApprovalMessage({
        request:
          approvalRequest,

        approveUrl:
          approval.approveUrl,

        rejectUrl:
          approval.rejectUrl,
      });

    console.log(
      "[LEAVE][MANAGER_NOTIFY][SEND_START]",
      {
        manager:
          managerUser
            .displayName,

        whatsappNumber:
          managerUser
            .whatsappNumber,

        requestNumber:
          request
            ?.requestNumber,
      }
    );

    let sent;

    try {
      sent =
        await sendPrivate(
          managerUser
            .whatsappNumber,
          message
        );
    } catch (
      sendError
    ) {
      console.error(
        "[LEAVE][MANAGER_NOTIFY][SEND_ERROR] =>",
        sendError
          ?.stack ||
        sendError
          ?.message ||
        sendError
      );

      throw sendError;
    }

    console.log(
      "[LEAVE][MANAGER_NOTIFY][SEND_RESULT]",
      {
        sent:
          Boolean(
            sent
          ),

        manager:
          managerUser
            .displayName,

        whatsappNumber:
          managerUser
            .whatsappNumber,
      }
    );

    return {
      sent:
        Boolean(
          sent
        ),

      managerUserId:
        String(
          managerUser._id
        ),

      managerWhatsappNumber:
        managerUser
          .whatsappNumber,
    };
  };

/* =========================================================
   NOTIFY EMPLOYEE DECISION
========================================================= */

const notifyEmployeeDecision =
  async ({
    request,
    approved,
    approverName,
    comment,
  }) => {
    const employeeId =
      request?.employeeId?._id ||
      request?.employeeId;

    if (!employeeId) {
      return false;
    }

    const employee =
      await Employee
        .findById(
          employeeId
        )
        .select(
          "_id user"
        )
        .lean();

    if (!employee?.user) {
      return false;
    }

    const employeeUser =
      await User
        .findOne({
          _id:
            employee.user,

          status:
            "ACTIVE",
        })
        .select(
          "_id whatsappNumber"
        )
        .lean();

    if (
      !employeeUser
        ?.whatsappNumber
    ) {
      return false;
    }

    return sendPrivate(
      employeeUser
        .whatsappNumber,
      buildEmployeeDecisionMessage({
        request,
        approved,
        approverName,
        comment,
      })
    );
  };

/* =========================================================
   PROCESS INCOMING LEAVE MESSAGE

   IMPORTANT DESIGN:
   - Group receives NO bot reply.
   - User gets private success/error.
   - Manager gets private approval only after successful create.
========================================================= */

const handleIncomingLeaveMessage =
  async ({
    jid,
    senderJid,
    participant,
    participantAlt,
    messageId,
    text,
  }) => {
    if (
      !LEAVE_GROUP_ID ||
      String(jid) !==
        LEAVE_GROUP_ID
    ) {
      return {
        ignored:
          true,
      };
    }

    if (
      !looksLikeLeaveRequest(
        text
      )
    ) {
      return {
        ignored:
          true,
      };
    }

    const user =
      await resolveSenderUser({
        senderJid,
        participant,
        participantAlt,
      });

    /*
     * If sender cannot be safely identified, do not post
     * an error in the group because we have no trusted
     * private number to reply to.
     */

    if (!user) {
      console.warn(
        "LEAVE WHATSAPP USER NOT RESOLVED =>",
        {
          senderJid,
          participant,
          participantAlt,
          messageId,
        }
      );

      return {
        handled:
          true,
      };
    }

    const employee =
      await resolveSenderEmployee(
        user
      );

    if (!employee) {
      await sendPrivate(
        user.whatsappNumber,
        "❌ *LEAVE NOT APPLIED*\n\nYour active employee profile could not be found. Please contact HR."
      );

      return {
        handled:
          true,
      };
    }

    const parsed =
      parseLeaveApplication(
        text
      );

    /*
     * Employee code is required because it is simple,
     * strong and avoids applying leave for the wrong person.
     */

    if (
      !parsed.employeeCode
    ) {
      await sendPrivate(
        user.whatsappNumber,
        [
          "❌ *LEAVE NOT APPLIED*",
          "",
          "Please include your Employee Code.",
          "",
          "Example:",
          `Employee Code: ${
            employee.employeeCode
          }`,
        ].join("\n")
      );

      return {
        handled:
          true,
      };
    }

    if (
      normalizeUpper(
        employee.employeeCode
      ) !==
      parsed.employeeCode
    ) {
      await sendPrivate(
        user.whatsappNumber,
        [
          "❌ *LEAVE NOT APPLIED*",
          "",
          "The Employee Code does not match your SE-RMS profile.",
          "",
          `Your Employee Code: *${
            employee.employeeCode
          }*`,
        ].join("\n")
      );

      return {
        handled:
          true,
      };
    }

    /*
     * Name is forgiving.
     *
     * "Sandeep" for "Sandeep Jain" is accepted.
     * Missing name is accepted.
     *
     * Only an obviously different supplied name is rejected.
     */

    if (
      parsed.employeeName &&
      !isFriendlyNameMatch(
        parsed.employeeName,
        employee.fullName
      )
    ) {
      await sendPrivate(
        user.whatsappNumber,
        [
          "❌ *LEAVE NOT APPLIED*",
          "",
          "The name in the message does not match your employee profile.",
          "",
          `Your name: *${
            employee.fullName
          }*`,
        ].join("\n")
      );

      return {
        handled:
          true,
      };
    }

    if (
      !parsed.leaveTypeText
    ) {
      await sendPrivate(
        user.whatsappNumber,
        "❌ *LEAVE NOT APPLIED*\n\nPlease mention the Leave Type, for example *CL*, *SL* or *PL*."
      );

      return {
        handled:
          true,
      };
    }

    const leaveType =
      await resolveLeaveType(
        parsed.leaveTypeText
      );

    if (!leaveType) {
      await sendPrivate(
        user.whatsappNumber,
        `❌ *LEAVE NOT APPLIED*\n\nLeave Type *${parsed.leaveTypeText}* is not available.`
      );

      return {
        handled:
          true,
      };
    }

    if (
      !parsed.durationType
    ) {
      await sendPrivate(
        user.whatsappNumber,
        "❌ *LEAVE NOT APPLIED*\n\nPlease write *First Half* or *Second Half* for half-day leave."
      );

      return {
        handled:
          true,
      };
    }

    if (
      !parsed.fromDate ||
      !parsed.toDate
    ) {
      await sendPrivate(
        user.whatsappNumber,
        "❌ *LEAVE NOT APPLIED*\n\nPlease enter a valid leave date, for example *15/10/2026*."
      );

      return {
        handled:
          true,
      };
    }

    if (
      !parsed.reason
    ) {
      await sendPrivate(
        user.whatsappNumber,
        "❌ *LEAVE NOT APPLIED*\n\nPlease mention a short Reason for leave."
      );

      return {
        handled:
          true,
      };
    }

    try {
      /*
       * Reuse the SAME leave engine as frontend.
       *
       * No separate WhatsApp balance logic is used for
       * actually creating the request.
       */

      const request =
        await leaveService
          .createLeaveRequest({
            user,

            payload: {
              leaveTypeId:
                leaveType._id,

              fromDate:
                parsed.fromDate,

              toDate:
                parsed.toDate,

              durationType:
                parsed.durationType,

              reason:
                parsed.reason,

              emergency:
                parsed.emergency,

              emergencyReason:
                parsed.emergencyReason,

              contactDuringLeave:
                parsed.contactDuringLeave,

              attachments:
                [],

              source:
                "WHATSAPP",
            },

            requestMeta: {
              ipAddress:
                "",

              userAgent:
                "SE-RMS WhatsApp",
            },

            notifyWhatsApp:
              false,
          });

      /*
       * Employee private confirmation.
       */

      await notifyEmployeeLeaveSubmitted({
        request,
        employeeUser:
          user,
      });

      /*
       * Manager notification happens ONLY after successful
       * creation.
       *
       * If balance/policy/overlap fails, createLeaveRequest
       * throws above and execution never reaches here.
       */

      try {
  const managerNotification =
    await notifyManagerForApproval({
      request,
    });

  console.log(
    "[LEAVE][MANAGER_NOTIFY][FINAL_RESULT]",
    managerNotification
  );
} catch (
  notificationError
) {
  console.error(
    "[LEAVE][MANAGER_NOTIFY][FINAL_ERROR] =>",
    notificationError
      ?.stack ||
    notificationError
      ?.message ||
    notificationError
  );
}

      return {
        handled:
          true,

        requestId:
          String(
            request._id
          ),

        requestNumber:
          request
            .requestNumber,
      };
    } catch (
      error
    ) {
      /*
       * IMPORTANT:
       *
       * If balance is unavailable:
       *
       * 1. Do NOT create another leave automatically.
       * 2. Do NOT automatically convert to LWP.
       * 3. Do NOT notify manager.
       * 4. Fetch employee's actual available alternatives.
       * 5. Send alternatives privately.
       *
       * For every other error, use normal friendly error.
       */

      const errorCode =
        normalizeUpper(
          error?.code
        );

      if (
        errorCode ===
          "INSUFFICIENT_LEAVE_BALANCE"
      ) {
        const alternativeMessage =
          await buildAlternativeLeaveMessage({
            user,

            employee,

            requestedLeaveType:
              leaveType,

            parsed,

            error,
          });

        await sendPrivate(
          user.whatsappNumber,
          alternativeMessage
        );
      } else {
        await sendPrivate(
          user.whatsappNumber,
          getFriendlyErrorMessage(
            error
          )
        );
      }

      return {
        handled:
          true,

        failed:
          true,

        code:
          error?.code ||
          "LEAVE_ERROR",
      };
    }
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  handleIncomingLeaveMessage,

  extractMessageText,

  looksLikeLeaveRequest,

  parseLeaveApplication,

  resolveSenderUser,

  resolveLeaveType,

  notifyEmployeeLeaveSubmitted,

  notifyManagerForApproval,

  notifyEmployeeDecision,

  buildEmployeeSuccessMessage,

  buildManagerApprovalMessage,

  buildEmployeeDecisionMessage,

  isFriendlyNameMatch,

  getAvailableLeaveOptions,

  buildAlternativeLeaveMessage,
};
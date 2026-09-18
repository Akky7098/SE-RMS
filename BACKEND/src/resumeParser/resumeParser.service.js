const fs =
  require("fs");

const mongoose =
  require("mongoose");

const {
  ManpowerRequirement,
} = require(
  "../manpower/manpowerRequirement.model"
);

const {
  Candidate,
} = require(
  "../recruitment/candidate.model"
);

/* =========================================================
   CONSTANTS
========================================================= */

const MONTHS = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const MONTH_TEXT =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";

const DATE_TOKEN =
  `(?:${MONTH_TEXT}\\s*[,/-]?\\s*\\d{4}|\\d{1,2}[/-]\\d{4}|\\d{4})`;

const DATE_RANGE_REGEX =
  new RegExp(
    `(${DATE_TOKEN})\\s*(?:-|–|—|to|till|until)\\s*(present|current|now|${DATE_TOKEN})`,
    "i"
  );

/* =========================================================
   SECTION HEADINGS
========================================================= */

const SECTION_HEADINGS = {
  SUMMARY: [
    "summary",
    "professional summary",
    "profile",
    "professional profile",
    "career summary",
    "career objective",
    "objective",
    "about me",
  ],

  EXPERIENCE: [
    "experience",
    "work experience",
    "professional experience",
    "employment",
    "employment history",
    "work history",
    "career history",
  ],

  SKILLS: [
    "skills",
    "technical skills",
    "key skills",
    "core technical skills",
    "core skills",
    "core competencies",
    "technical competencies",
    "technologies",
    "technology stack",
    "tech stack",
    "tools and technologies",
  ],

  EDUCATION: [
    "education",
    "educational qualification",
    "educational qualifications",
    "academic qualification",
    "academic qualifications",
    "academics",
    "education details",
  ],

  PROJECTS: [
    "projects",
    "project experience",
    "key projects",
    "professional projects",
  ],

  CERTIFICATIONS: [
    "certification",
    "certifications",
    "certificates",
    "training",
  ],

  ACHIEVEMENTS: [
    "achievements",
    "awards",
    "awards and achievements",
  ],

  PERSONAL: [
    "personal details",
    "personal information",
  ],
};

const ALL_HEADINGS =
  Object.values(
    SECTION_HEADINGS
  ).flat();

/* =========================================================
   DESIGNATION WORDS
========================================================= */

const DESIGNATION_WORDS = [
  "developer",
  "engineer",
  "executive",
  "manager",
  "architect",
  "consultant",
  "analyst",
  "associate",
  "specialist",
  "lead",
  "officer",
  "administrator",
  "coordinator",
  "recruiter",
  "supervisor",
  "director",
  "president",
  "intern",
  "trainee",
  "technician",
  "designer",
  "accountant",
  "sales",
  "marketing",
  "operations",
  "production",
  "purchase",
  "procurement",
  "quality",
];

/* =========================================================
   TECHNICAL SKILLS

   These may safely be detected anywhere in the CV.
========================================================= */

const GLOBAL_TECHNICAL_SKILLS = [
  "Java",
  "JavaScript",
  "TypeScript",
  "Python",
  "C",
  "C++",
  "C#",
  ".NET",

  "Node.js",
  "NodeJS",
  "Express",
  "Express.js",

  "React",
  "React.js",
  "Angular",
  "Vue",
  "Next.js",

  "Spring",
  "Spring Boot",
  "Hibernate",

  "Microservices",

  "REST API",
  "REST APIs",
  "GraphQL",

  "MongoDB",
  "MySQL",
  "PostgreSQL",
  "Oracle",
  "SQL",
  "Redis",
  "DynamoDB",

  "AWS",
  "Azure",
  "GCP",

  "Docker",
  "Kubernetes",
  "Jenkins",

  "CI/CD",

  "Git",
  "GitHub",
  "GitLab",
  "GitHub Actions",

  "Kafka",
  "RabbitMQ",

  "JWT",
  "OAuth2",
  "RBAC",

  "OpenAI",
  "OpenAI APIs",
  "LLM",
  "Prompt Engineering",

  "Power BI",
  "Tableau",

  "SAP",
];

/* =========================================================
   FUNCTIONAL / BUSINESS SKILLS

   These are context-sensitive.

   Example:
   "Sales Order module" does NOT mean candidate has Sales skill.
========================================================= */

const CONTEXTUAL_BUSINESS_SKILLS = [
  "Sales",
  "B2B Sales",
  "B2C Sales",
  "Business Development",
  "Lead Generation",
  "Cold Calling",
  "Negotiation",
  "Account Management",
  "Key Account Management",
  "Client Acquisition",
  "Customer Acquisition",
  "CRM",

  "Procurement",
  "Purchase",
  "Vendor Management",
  "Sourcing",

  "Quality Assurance",
  "Quality Control",
  "Inspection",

  "Production",
  "Manufacturing",
  "Operations",
  "Plant Operations",

  "Logistics",
  "Dispatch",
  "Warehouse",
  "Supply Chain",

  "Recruitment",
  "Talent Acquisition",
  "Onboarding",

  "Accounting",
  "Finance",
  "GST",
  "Taxation",

  "Marketing",
  "Digital Marketing",
];

/* =========================================================
   ROLE FAMILIES

   Used to compare requirement title against candidate profile.
========================================================= */

const ROLE_FAMILIES = [
  {
    name:
      "SALES",

    terms: [
      "sales",
      "selling",
      "b2b",
      "b2c",
      "business development",
      "bde",
      "bd executive",
      "client acquisition",
      "customer acquisition",
      "lead generation",
      "cold calling",
      "negotiation",
      "account management",
      "key account",
      "revenue",
    ],
  },

  {
    name:
      "OPERATIONS",

    terms: [
      "operations",
      "operation",
      "operational",
      "plant operations",
      "factory operations",
      "manufacturing",
      "production",
      "process operations",
      "production planning",
      "plant manager",
    ],
  },

  {
    name:
      "HR",

    terms: [
      "hr",
      "human resources",
      "recruitment",
      "recruiter",
      "talent acquisition",
      "hiring",
      "employee relations",
      "onboarding",
      "payroll",
    ],
  },

  {
    name:
      "PROCUREMENT",

    terms: [
      "procurement",
      "purchase",
      "purchasing",
      "buyer",
      "vendor management",
      "sourcing",
      "supplier management",
    ],
  },

  {
    name:
      "LOGISTICS",

    terms: [
      "logistics",
      "dispatch",
      "warehouse",
      "shipping",
      "transport",
      "transportation",
      "supply chain",
      "delivery",
    ],
  },

  {
    name:
      "QUALITY",

    terms: [
      "quality",
      "qa",
      "qc",
      "quality assurance",
      "quality control",
      "inspection",
      "testing",
      "iso",
      "nabl",
    ],
  },

  {
    name:
      "FINANCE",

    terms: [
      "finance",
      "accounts",
      "accounting",
      "accountant",
      "audit",
      "taxation",
      "gst",
      "receivable",
      "payable",
      "billing",
    ],
  },

  {
    name:
      "MARKETING",

    terms: [
      "marketing",
      "digital marketing",
      "branding",
      "campaign",
      "seo",
      "sem",
      "social media",
      "content marketing",
    ],
  },

  {
    name:
      "TECHNOLOGY",

    terms: [
      "developer",
      "software developer",
      "backend developer",
      "frontend developer",
      "full stack developer",
      "fullstack developer",
      "software engineer",
      "engineer",
      "solution architect",
      "software architect",
      "enterprise architect",
      "backend engineer",
      "frontend engineer",
      "programmer",
      "java",
      "python",
      "node.js",
      "react",
      "spring boot",
      "microservices",
      "api",
      "cloud",
      "aws",
      "database",
    ],
  },
];

/* =========================================================
   TEXT CLEANING
========================================================= */

const cleanText = (
  text = ""
) => {
  return String(
    text
  )
    .replace(
      /\u0000/g,
      ""
    )
    .replace(
      /\u00a0/g,
      " "
    )
    .replace(
      /\r\n?/g,
      "\n"
    )
    .replace(
      /[ \t]+/g,
      " "
    )
    .replace(
      /\n[ \t]+/g,
      "\n"
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();
};

const getLines = (
  text
) => {
  return cleanText(
    text
  )
    .split(
      "\n"
    )
    .map(
      (
        line
      ) =>
        line
          .replace(
            /^[•▪●◦○■◆►▶✓✔★*]+\s*/,
            ""
          )
          .trim()
    )
    .filter(
      Boolean
    );
};

/* =========================================================
   PDF TEXT
========================================================= */

const extractPdfText =
  async (
    filePath
  ) => {
    const buffer =
      await fs.promises
        .readFile(
          filePath
        );

    const pdfModule =
      require(
        "pdf-parse"
      );

    const parser =
      typeof pdfModule ===
      "function"
        ? pdfModule
        : pdfModule?.default;

    if (
      typeof parser !==
      "function"
    ) {
      throw new Error(
        "Installed pdf-parse version is not compatible"
      );
    }

    const result =
      await parser(
        buffer
      );

    return cleanText(
      result?.text ||
        ""
    );
  };

/* =========================================================
   HEADINGS / SECTIONS
========================================================= */

const normalizeHeading = (
  value
) => {
  return String(
    value ||
      ""
  )
    .trim()
    .toLowerCase()
    .replace(
      /[:\-–—]+$/g,
      ""
    )
    .replace(
      /\s+/g,
      " "
    );
};

const isHeading = (
  line,
  headings
) => {
  const value =
    normalizeHeading(
      line
    );

  return headings.some(
    (
      heading
    ) =>
      value ===
        heading ||
      value ===
        `${heading}s`
  );
};

const extractSectionLines = (
  text,
  headings
) => {
  const lines =
    getLines(
      text
    );

  let start =
    -1;

  for (
    let index = 0;
    index <
    lines.length;
    index += 1
  ) {
    if (
      isHeading(
        lines[index],
        headings
      )
    ) {
      start =
        index +
        1;

      break;
    }
  }

  if (
    start <
    0
  ) {
    return [];
  }

  const result =
    [];

  for (
    let index =
      start;
    index <
    lines.length;
    index += 1
  ) {
    const line =
      lines[index];

    if (
      isHeading(
        line,
        ALL_HEADINGS
      )
    ) {
      break;
    }

    result.push(
      line
    );

    if (
      result.length >=
      100
    ) {
      break;
    }
  }

  return result;
};

/* =========================================================
   EMAIL
========================================================= */

const extractEmails = (
  text
) => {
  const values =
    text.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
    ) ||
    [];

  return [
    ...new Set(
      values.map(
        (
          value
        ) =>
          value
            .trim()
            .toLowerCase()
      )
    ),
  ];
};

/* =========================================================
   MOBILE
========================================================= */

const extractMobiles = (
  text
) => {
  const matches =
    text.match(
      /(?:\+?91[\s.-]*)?[6-9][0-9\s.-]{8,15}/g
    ) ||
    [];

  const result =
    [];

  for (
    const match
    of matches
  ) {
    const digits =
      match.replace(
        /\D/g,
        ""
      );

    const mobile =
      digits.slice(
        -10
      );

    if (
      /^[6-9]\d{9}$/.test(
        mobile
      ) &&
      !result.includes(
        mobile
      )
    ) {
      result.push(
        mobile
      );
    }
  }

  return result;
};

/* =========================================================
   LINKEDIN
========================================================= */

const extractLinkedIn = (
  text
) => {
  const match =
    text.match(
      /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_%./-]+/i
    );

  return match?.[0] ||
    "";
};

/* =========================================================
   NAME
========================================================= */

const extractName = (
  text
) => {
  const lines =
    getLines(
      text
    ).slice(
      0,
      18
    );

  for (
    const line
    of lines
  ) {
    const value =
      line.trim();

    const lower =
      value.toLowerCase();

    if (
      [
        "resume",
        "curriculum vitae",
        "cv",
        "profile",
        "professional summary",
      ].includes(
        lower
      )
    ) {
      continue;
    }

    if (
      value.includes(
        "@"
      ) ||
      /linkedin|https?:\/\//i.test(
        value
      )
    ) {
      continue;
    }

    if (
      /\d{6,}/.test(
        value.replace(
          /\D/g,
          ""
        )
      )
    ) {
      continue;
    }

    if (
      DESIGNATION_WORDS.some(
        (
          word
        ) =>
          lower.includes(
            word
          )
      )
    ) {
      continue;
    }

    const words =
      value.split(
        /\s+/
      );

    if (
      words.length >=
        2 &&
      words.length <=
        5 &&
      value.length >=
        4 &&
      value.length <=
        65 &&
      /^[A-Za-z][A-Za-z.' -]+$/.test(
        value
      )
    ) {
      return value;
    }
  }

  return "";
};

/* =========================================================
   LOCATION
========================================================= */

const extractLocation = (
  text
) => {
  const patterns = [
    /current\s+location\s*[:\-]\s*([^\n|]+)/i,

    /location\s*[:\-]\s*([^\n|]+)/i,

    /city\s*[:\-]\s*([^\n|]+)/i,

    /address\s*[:\-]\s*([^\n]+)/i,
  ];

  for (
    const pattern
    of patterns
  ) {
    const match =
      text.match(
        pattern
      );

    if (
      match?.[1]
    ) {
      return match[1]
        .trim()
        .slice(
          0,
          130
        );
    }
  }

  const topLines =
    getLines(
      text
    ).slice(
      0,
      16
    );

  for (
    const line
    of topLines
  ) {
    if (
      /^[A-Za-z .'-]{2,40},\s*[A-Za-z .'-]{2,40}$/.test(
        line
      )
    ) {
      return line;
    }
  }

  return "";
};

const splitLocation = (
  value
) => {
  const parts =
    String(
      value ||
        ""
    )
      .split(
        ","
      )
      .map(
        (
          item
        ) =>
          item.trim()
      )
      .filter(
        Boolean
      );

  return {
    city:
      parts[0] ||
      "",

    state:
      parts[1] ||
      "",
  };
};

/* =========================================================
   DATES
========================================================= */

const parseResumeDate = (
  value
) => {
  const input =
    String(
      value ||
        ""
    )
      .trim()
      .replace(
        /,/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      );

  if (
    !input ||
    /present|current|now/i.test(
      input
    )
  ) {
    return null;
  }

  let match =
    input.match(
      /^([A-Za-z]{3,9})\s+(\d{4})$/
    );

  if (
    match
  ) {
    const month =
      MONTHS[
        match[1]
          .slice(
            0,
            3
          )
          .toLowerCase()
      ];

    const year =
      Number(
        match[2]
      );

    if (
      month !==
      undefined
    ) {
      return new Date(
        Date.UTC(
          year,
          month,
          1
        )
      );
    }
  }

  match =
    input.match(
      /^(\d{1,2})[/-](\d{4})$/
    );

  if (
    match
  ) {
    return new Date(
      Date.UTC(
        Number(
          match[2]
        ),
        Number(
          match[1]
        ) -
          1,
        1
      )
    );
  }

  match =
    input.match(
      /^(\d{4})$/
    );

  if (
    match
  ) {
    return new Date(
      Date.UTC(
        Number(
          match[1]
        ),
        0,
        1
      )
    );
  }

  return null;
};

/* =========================================================
   DESIGNATION
========================================================= */

const looksLikeDesignation = (
  value
) => {
  const lower =
    String(
      value ||
        ""
    )
      .trim()
      .toLowerCase();

  if (
    !lower ||
    lower.length >
      140
  ) {
    return false;
  }

  return DESIGNATION_WORDS.some(
    (
      word
    ) =>
      lower.includes(
        word
      )
  );
};

/* =========================================================
   COMPANY
========================================================= */

const looksLikeCompany = (
  value
) => {
  const line =
    String(
      value ||
        ""
    ).trim();

  if (
    !line ||
    line.length >
      170 ||
    looksLikeDesignation(
      line
    ) ||
    DATE_RANGE_REGEX.test(
      line
    ) ||
    /@|linkedin|https?:\/\//i.test(
      line
    )
  ) {
    return false;
  }

  if (
    /\b(?:pvt|private|limited|ltd|llp|inc|corp|company|technologies|technology|solutions|systems|services|consulting|consultancy|bank|industries|group|software|infotech|enterprises|chase|sapient)\b/i.test(
      line
    )
  ) {
    return true;
  }

  const words =
    line.split(
      /\s+/
    );

  return (
    words.length <=
      8 &&
    /^[A-Z][A-Za-z0-9&.,'() -]+$/.test(
      line
    )
  );
};

/* =========================================================
   LABEL VALUE
========================================================= */

const extractLabelValue = (
  text,
  labels
) => {
  for (
    const label
    of labels
  ) {
    const regex =
      new RegExp(
        `${label}\\s*[:\\-]\\s*([^\\n|]+)`,
        "i"
      );

    const match =
      text.match(
        regex
      );

    if (
      match?.[1]
    ) {
      return match[1]
        .trim();
    }
  }

  return "";
};

/* =========================================================
   EXPERIENCE HISTORY
========================================================= */

const extractExperienceHistory = (
  text
) => {
  let lines =
    extractSectionLines(
      text,
      SECTION_HEADINGS
        .EXPERIENCE
    );

  if (
    lines.length <
    3
  ) {
    lines =
      getLines(
        text
      );
  }

  const records =
    [];

  for (
    let index = 0;
    index <
    lines.length;
    index += 1
  ) {
    const dateLine =
      lines[index];

    const range =
      dateLine.match(
        DATE_RANGE_REGEX
      );

    if (
      !range
    ) {
      continue;
    }

    const previous = [
      lines[
        index -
          3
      ],
      lines[
        index -
          2
      ],
      lines[
        index -
          1
      ],
    ]
      .filter(
        Boolean
      );

    const next = [
      lines[
        index +
          1
      ],
      lines[
        index +
          2
      ],
    ]
      .filter(
        Boolean
      );

    let company =
      "";

    let designation =
      "";

    const beforeDate =
      dateLine
        .slice(
          0,
          range.index
        )
        .replace(
          /[-–—|]+$/g,
          ""
        )
        .trim();

    if (
      beforeDate
    ) {
      const parts =
        beforeDate
          .split(
            /\s+\|\s+|\s+at\s+/i
          )
          .map(
            (
              item
            ) =>
              item.trim()
          )
          .filter(
            Boolean
          );

      for (
        const item
        of parts
      ) {
        if (
          !designation &&
          looksLikeDesignation(
            item
          )
        ) {
          designation =
            item;

          continue;
        }

        if (
          !company &&
          looksLikeCompany(
            item
          )
        ) {
          company =
            item;
        }
      }
    }

    for (
      const line
      of previous.reverse()
    ) {
      if (
        !designation &&
        looksLikeDesignation(
          line
        )
      ) {
        designation =
          line;

        continue;
      }

      if (
        !company &&
        looksLikeCompany(
          line
        )
      ) {
        company =
          line;
      }
    }

    for (
      const line
      of next
    ) {
      if (
        !designation &&
        looksLikeDesignation(
          line
        )
      ) {
        designation =
          line;

        continue;
      }

      if (
        !company &&
        looksLikeCompany(
          line
        )
      ) {
        company =
          line;
      }
    }

    const current =
      /present|current|now/i.test(
        range[2]
      );

    const descriptions =
      [];

    for (
      let offset = 1;
      offset <=
      7;
      offset += 1
    ) {
      const line =
        lines[
          index +
            offset
        ];

      if (
        !line
      ) {
        break;
      }

      if (
        DATE_RANGE_REGEX.test(
          line
        )
      ) {
        break;
      }

      if (
        isHeading(
          line,
          ALL_HEADINGS
        )
      ) {
        break;
      }

      if (
        line ===
          company ||
        line ===
          designation
      ) {
        continue;
      }

      if (
        line.length >=
          18
      ) {
        descriptions.push(
          line
        );
      }

      if (
        descriptions
          .join(
            " "
          )
          .length >
        1200
      ) {
        break;
      }
    }

    if (
      company ||
      designation
    ) {
      records.push({
        company,

        designation,

        from:
          parseResumeDate(
            range[1]
          ),

        to:
          current
            ? null
            : parseResumeDate(
                range[2]
              ),

        current,

        description:
          descriptions
            .join(
              " "
            )
            .slice(
              0,
              1500
            ),
      });
    }
  }

  const seen =
    new Set();

  return records
    .filter(
      (
        record
      ) => {
        const key =
          `${record.company}|${record.designation}|${record.from || ""}`
            .toLowerCase();

        if (
          seen.has(
            key
          )
        ) {
          return false;
        }

        seen.add(
          key
        );

        return true;
      }
    )
    .sort(
      (
        first,
        second
      ) => {
        if (
          first.current &&
          !second.current
        ) {
          return -1;
        }

        if (
          second.current &&
          !first.current
        ) {
          return 1;
        }

        return (
          new Date(
            second.from ||
              0
          ).getTime() -
          new Date(
            first.from ||
              0
          ).getTime()
        );
      }
    )
    .slice(
      0,
      15
    );
};

/* =========================================================
   EXPERIENCE YEARS
========================================================= */

const extractExplicitExperienceYears = (
  text
) => {
  const patterns = [
    /(?:total\s+)?(?:professional\s+)?experience\s*(?:of|:|-)?\s*(\d+(?:\.\d+)?)\s*\+?\s*(?:years|yrs)/i,

    /(\d+(?:\.\d+)?)\s*\+?\s*(?:years|yrs)\s+(?:of\s+)?(?:professional\s+)?experience/i,

    /experience\s*[:\-]\s*(\d+(?:\.\d+)?)\s*(?:years|yrs)?/i,
  ];

  for (
    const pattern
    of patterns
  ) {
    const match =
      text.match(
        pattern
      );

    if (
      match?.[1]
    ) {
      const value =
        Number(
          match[1]
        );

      if (
        Number.isFinite(
          value
        ) &&
        value >=
          0 &&
        value <=
          60
      ) {
        return value;
      }
    }
  }

  return null;
};

const calculateExperienceFromHistory = (
  history
) => {
  const ranges =
    (history || [])
      .map(
        (
          item
        ) => {
          const from =
            item?.from
              ? new Date(
                  item.from
                )
              : null;

          const to =
            item?.current
              ? new Date()
              : item?.to
                ? new Date(
                    item.to
                  )
                : null;

          if (
            !from ||
            !to ||
            Number.isNaN(
              from.getTime()
            ) ||
            Number.isNaN(
              to.getTime()
            ) ||
            to <
              from
          ) {
            return null;
          }

          return [
            from.getTime(),
            to.getTime(),
          ];
        }
      )
      .filter(
        Boolean
      )
      .sort(
        (
          a,
          b
        ) =>
          a[0] -
          b[0]
      );

  if (
    !ranges.length
  ) {
    return null;
  }

  const merged =
    [];

  for (
    const range
    of ranges
  ) {
    const previous =
      merged[
        merged.length -
          1
      ];

    if (
      !previous ||
      range[0] >
        previous[1]
    ) {
      merged.push(
        [
          ...range,
        ]
      );
    } else {
      previous[1] =
        Math.max(
          previous[1],
          range[1]
        );
    }
  }

  const total =
    merged.reduce(
      (
        sum,
        item
      ) =>
        sum +
        (
          item[1] -
          item[0]
        ),
      0
    );

  const years =
    total /
    (
      365.25 *
      24 *
      60 *
      60 *
      1000
    );

  return Number(
    years.toFixed(
      1
    )
  );
};

/* =========================================================
   CURRENT EMPLOYMENT
========================================================= */

const extractCurrentEmployment = (
  text,
  history
) => {
  const explicitCompany =
    extractLabelValue(
      text,
      [
        "current company",
        "current employer",
        "current organization",
        "current organisation",
      ]
    );

  const explicitDesignation =
    extractLabelValue(
      text,
      [
        "current designation",
        "current position",
        "current role",
        "job title",
      ]
    );

  const latest =
    history.find(
      (
        item
      ) =>
        item.current
    ) ||
    history[0] ||
    {};

  return {
    currentCompany:
      (
        explicitCompany ||
        latest.company ||
        ""
      ).slice(
        0,
        150
      ),

    currentDesignation:
      (
        explicitDesignation ||
        latest.designation ||
        ""
      ).slice(
        0,
        150
      ),
  };
};

/* =========================================================
   ESCAPE REGEX
========================================================= */

const escapeRegex = (
  value
) => {
  return String(
    value ||
      ""
  ).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

/* =========================================================
   CLEAN SKILL
========================================================= */

const cleanSkill = (
  value
) => {
  return String(
    value ||
      ""
  )
    .replace(
      /^[•▪●◦○■◆►▶✓✔★*:\-–—]+\s*/,
      ""
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
};

/* =========================================================
   CONTAINS SKILL TERM
========================================================= */

const containsSkillTerm = (
  text,
  skill
) => {
  const escaped =
    escapeRegex(
      skill
    );

  const regex =
    new RegExp(
      `(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)`,
      "i"
    );

  return regex.test(
    String(
      text ||
        ""
    )
  );
};

/* =========================================================
   CANONICAL SKILL
========================================================= */

const canonicalSkillName = (
  value
) => {
  const skill =
    cleanSkill(
      value
    );

  const normalized =
    skill
      .toLowerCase()
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  const aliases = {
    nodejs:
      "Node.js",

    "node js":
      "Node.js",

    "express js":
      "Express.js",

    expressjs:
      "Express.js",

    "react.js":
      "React",

    reactjs:
      "React",

    postgres:
      "PostgreSQL",

    "amazon web services":
      "AWS",

    "rest api":
      "REST APIs",

    "rest apis":
      "REST APIs",

    "ci cd":
      "CI/CD",

    cicd:
      "CI/CD",

    "business dev":
      "Business Development",

    bde:
      "Business Development",

    "talent acquisition":
      "Talent Acquisition",
  };

  return (
    aliases[
      normalized
    ] ||
    skill
  );
};

/* =========================================================
   EXTRACT SKILLS

   Important:
   Business terms are not blindly detected from whole CV.
========================================================= */

const extractSkills = (
  text
) => {
  const values =
    [];

  const skillLines =
    extractSectionLines(
      text,
      SECTION_HEADINGS
        .SKILLS
    );

  /* =====================================================
     SKILLS SECTION
  ===================================================== */

  for (
    const line
    of skillLines
  ) {
    let content =
      line;

    content =
      content.replace(
        /^(?:languages?|backend architecture|backend|frameworks?|databases?|cloud\s*&?\s*devops|devops|enterprise design|ai\s*&?\s*emerging tech|tools?|technologies?|technical skills?|functional skills?|business skills?)\s*[:\-]?\s*/i,
        ""
      );

    values.push(
      ...content
        .split(
          /[,;|•▪●]+/
        )
        .map(
          cleanSkill
        )
        .filter(
          (
            skill
          ) =>
            skill.length >=
              2 &&
            skill.length <=
              80
        )
    );
  }

  /* =====================================================
     TECHNICAL SKILLS

     Safe to find globally.
  ===================================================== */

  for (
    const skill
    of GLOBAL_TECHNICAL_SKILLS
  ) {
    if (
      containsSkillTerm(
        text,
        skill
      )
    ) {
      values.push(
        skill
      );
    }
  }

  /* =====================================================
     FUNCTIONAL SKILLS

     Search only high-confidence candidate-skill contexts.
  ===================================================== */

  const functionalLines =
    extractSectionLines(
      text,
      [
        ...SECTION_HEADINGS
          .SKILLS,

        "strengths",
        "core strengths",
        "professional strengths",
        "functional skills",
        "business skills",
        "competencies",
        "core competencies",
      ]
    );

  const functionalText =
    functionalLines.join(
      "\n"
    );

  for (
    const skill
    of CONTEXTUAL_BUSINESS_SKILLS
  ) {
    if (
      containsSkillTerm(
        functionalText,
        skill
      )
    ) {
      values.push(
        skill
      );
    }
  }

  /* =====================================================
     CLEAN UNIQUE
  ===================================================== */

  const unique =
    new Map();

  for (
    const raw
    of values
  ) {
    const skill =
      canonicalSkillName(
        raw
      );

    if (
      !skill
    ) {
      continue;
    }

    const key =
      skill.toLowerCase();

    if (
      !unique.has(
        key
      )
    ) {
      unique.set(
        key,
        skill
      );
    }
  }

  return [
    ...unique.values(),
  ].slice(
    0,
    60
  );
};

/* =========================================================
   EDUCATION
========================================================= */

const extractEducation = (
  text
) => {
  const lines =
    extractSectionLines(
      text,
      SECTION_HEADINGS
        .EDUCATION
    );

  const result =
    [];

  let current =
    null;

  const flush =
    () => {
      if (
        current &&
        (
          current.qualification ||
          current.institute ||
          current.university
        )
      ) {
        result.push(
          current
        );
      }

      current =
        null;
    };

  const degreeRegex =
    /\b(?:b\.?\s*tech|m\.?\s*tech|b\.?\s*e\b|m\.?\s*e\b|bca|mca|bsc|msc|b\.?\s*sc|m\.?\s*sc|bba|mba|bcom|mcom|diploma|ph\.?\s*d|bachelor|master)\b/i;

  const instituteRegex =
    /\b(?:university|college|institute|school|academy|iit|nit|bits|iert|polytechnic)\b/i;

  for (
    const line
    of lines
  ) {
    const years =
      line.match(
        /\b(?:19|20)\d{2}\b/g
      ) ||
      [];

    if (
      degreeRegex.test(
        line
      )
    ) {
      flush();

      current = {
        qualification:
          line
            .replace(
              /\b(?:19|20)\d{2}\b/g,
              ""
            )
            .trim(),

        specialization:
          "",

        institute:
          "",

        university:
          "",

        year:
          years.length
            ? Number(
                years[
                  years.length -
                    1
                ]
              )
            : null,
      };

      continue;
    }

    if (
      !current
    ) {
      current = {
        qualification:
          "",

        specialization:
          "",

        institute:
          "",

        university:
          "",

        year:
          null,
      };
    }

    if (
      !current.year &&
      years.length
    ) {
      current.year =
        Number(
          years[
            years.length -
              1
          ]
        );
    }

    if (
      instituteRegex.test(
        line
      )
    ) {
      if (
        /university/i.test(
          line
        )
      ) {
        current.university =
          line
            .replace(
              /\b(?:19|20)\d{2}\b/g,
              ""
            )
            .trim();
      } else {
        current.institute =
          line
            .replace(
              /\b(?:19|20)\d{2}\b/g,
              ""
            )
            .trim();
      }

      continue;
    }

    if (
      current.qualification &&
      !current.specialization &&
      line.length <
        120 &&
      !years.length
    ) {
      current.specialization =
        line;
    }
  }

  flush();

  return result.slice(
    0,
    10
  );
};

/* =========================================================
   NOTICE PERIOD
========================================================= */

const extractNoticePeriod = (
  text
) => {
  const patterns = [
    /notice\s+period\s*[:\-]?\s*(\d+)\s*(days?|months?)/i,

    /available\s+in\s+(\d+)\s*(days?|months?)/i,
  ];

  for (
    const pattern
    of patterns
  ) {
    const match =
      text.match(
        pattern
      );

    if (
      match
    ) {
      let value =
        Number(
          match[1]
        );

      if (
        /month/i.test(
          match[2]
        )
      ) {
        value *=
          30;
      }

      return value;
    }
  }

  if (
    /immediate joiner|immediately available|immediate joining/i.test(
      text
    )
  ) {
    return 0;
  }

  return null;
};

/* =========================================================
   SALARY
========================================================= */

const parseMoney = (
  number,
  unit
) => {
  const value =
    Number(
      String(
        number
      ).replace(
        /,/g,
        ""
      )
    );

  if (
    !Number.isFinite(
      value
    )
  ) {
    return null;
  }

  const normalized =
    String(
      unit ||
        ""
    ).toLowerCase();

  if (
    /lpa|lakh|lac/.test(
      normalized
    )
  ) {
    return Math.round(
      value *
        100000
    );
  }

  if (
    /crore|cr/.test(
      normalized
    )
  ) {
    return Math.round(
      value *
        10000000
    );
  }

  return Math.round(
    value
  );
};

const extractSalary = (
  text,
  labels
) => {
  const pattern =
    new RegExp(
      `(?:${labels.join(
        "|"
      )})\\s*[:\\-]?\\s*(?:INR|Rs\\.?|₹)?\\s*([0-9]+(?:\\.[0-9]+)?(?:,[0-9]{2,3})*)\\s*(LPA|lakh|lakhs|lac|crore|cr)?`,
      "i"
    );

  const match =
    text.match(
      pattern
    );

  return match
    ? parseMoney(
        match[1],
        match[2]
      )
    : null;
};

/* =========================================================
   SUMMARY
========================================================= */

const extractSummary = (
  text
) => {
  return extractSectionLines(
    text,
    SECTION_HEADINGS
      .SUMMARY
  )
    .slice(
      0,
      8
    )
    .join(
      " "
    )
    .slice(
      0,
      1800
    );
};

/* =========================================================
   CONFIDENCE
========================================================= */

const calculateConfidence = (
  candidate
) => {
  let score =
    0;

  if (
    candidate.fullName
  ) {
    score +=
      15;
  }

  if (
    candidate.mobile
  ) {
    score +=
      12;
  }

  if (
    candidate.email
  ) {
    score +=
      12;
  }

  if (
    candidate.currentCompany
  ) {
    score +=
      12;
  }

  if (
    candidate.currentDesignation
  ) {
    score +=
      12;
  }

  if (
    candidate.totalExperienceYears !==
      null
  ) {
    score +=
      12;
  }

  if (
    candidate.skills.length
  ) {
    score +=
      10;
  }

  if (
    candidate.experienceHistory
      .length
  ) {
    score +=
      10;
  }

  if (
    candidate.education
      .length
  ) {
    score +=
      5;
  }

  return Math.min(
    100,
    score
  );
};

/* =========================================================
   LOCAL PARSER
========================================================= */

const parseLocalResume =
  async (
    filePath
  ) => {
    const text =
      await extractPdfText(
        filePath
      );

    if (
      !text ||
      text.length <
        40
    ) {
      const error =
        new Error(
          "No readable text was found in this PDF. The resume may be scanned or image-based."
        );

      error.statusCode =
        422;

      throw error;
    }

    const mobiles =
      extractMobiles(
        text
      );

    const emails =
      extractEmails(
        text
      );

    const location =
      splitLocation(
        extractLocation(
          text
        )
      );

    const experienceHistory =
      extractExperienceHistory(
        text
      );

    const currentEmployment =
      extractCurrentEmployment(
        text,
        experienceHistory
      );

    const explicitExperience =
      extractExplicitExperienceYears(
        text
      );

    const calculatedExperience =
      calculateExperienceFromHistory(
        experienceHistory
      );

    const candidate = {
      fullName:
        extractName(
          text
        ),

      mobile:
        mobiles[0] ||
        "",

      alternateMobile:
        mobiles[1] ||
        "",

      email:
        emails[0] ||
        "",

      city:
        location.city,

      state:
        location.state,

      currentCompany:
        currentEmployment
          .currentCompany,

      currentDesignation:
        currentEmployment
          .currentDesignation,

      totalExperienceYears:
        explicitExperience ??
        calculatedExperience ??
        null,

      relevantExperienceYears:
        null,

      currentSalary:
        extractSalary(
          text,
          [
            "current ctc",
            "current salary",
            "present ctc",
          ]
        ),

      expectedSalary:
        extractSalary(
          text,
          [
            "expected ctc",
            "expected salary",
            "desired ctc",
          ]
        ),

      noticePeriodDays:
        extractNoticePeriod(
          text
        ),

      earliestJoiningDate:
        null,

      skills:
        extractSkills(
          text
        ),

      education:
        extractEducation(
          text
        ),

      experienceHistory,

      profileSummary:
        extractSummary(
          text
        ),

      linkedIn:
        extractLinkedIn(
          text
        ),
    };

    return {
      candidate,

      parserMeta: {
        confidence:
          calculateConfidence(
            candidate
          ),

        textLength:
          text.length,

        lineCount:
          getLines(
            text
          ).length,

        provider:
          "LOCAL_PDF_PARSER",

        version:
          "3.0",
      },
    };
  };

/* =========================================================
   DUPLICATE
========================================================= */

const findDuplicateCandidate =
  async (
    candidate
  ) => {
    const conditions =
      [];

    if (
      candidate.mobile
    ) {
      conditions.push({
        mobile:
          candidate.mobile,
      });
    }

    if (
      candidate.email
    ) {
      conditions.push({
        email:
          candidate.email
            .toLowerCase(),
      });
    }

    if (
      !conditions.length
    ) {
      return null;
    }

    return Candidate
      .findOne({
        $or:
          conditions,
      })
      .select(
        "_id candidateNumber fullName mobile email status positionTitle"
      )
      .lean();
  };

/* =========================================================
   MATCHING HELPERS
========================================================= */

const normalizeMatchText = (
  value
) => {
  return String(
    value ||
      ""
  )
    .toLowerCase()
    .replace(
      /node\.?\s*js/g,
      "nodejs"
    )
    .replace(
      /react\.?\s*js/g,
      "react"
    )
    .replace(
      /express\.?\s*js/g,
      "express"
    )
    .replace(
      /spring\s+boot/g,
      "springboot"
    )
    .replace(
      /business\s+development/g,
      "businessdevelopment"
    )
    .replace(
      /lead\s+generation/g,
      "leadgeneration"
    )
    .replace(
      /cold\s+calling/g,
      "coldcalling"
    )
    .replace(
      /talent\s+acquisition/g,
      "talentacquisition"
    )
    .replace(
      /quality\s+assurance/g,
      "qualityassurance"
    )
    .replace(
      /quality\s+control/g,
      "qualitycontrol"
    )
    .replace(
      /supply\s+chain/g,
      "supplychain"
    )
    .replace(
      /digital\s+marketing/g,
      "digitalmarketing"
    )
    .replace(
      /[^a-z0-9+#.]+/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
};

const normalizeCompact = (
  value
) => {
  return normalizeMatchText(
    value
  ).replace(
    /\s+/g,
    ""
  );
};

/* =========================================================
   ROLE FAMILY DETECTION
========================================================= */

const getRoleFamilies = (
  value
) => {
  const text =
    normalizeCompact(
      value
    );

  if (
    !text
  ) {
    return [];
  }

  const result =
    [];

  for (
    const family
    of ROLE_FAMILIES
  ) {
    const found =
      family.terms.some(
        (
          term
        ) =>
          text.includes(
            normalizeCompact(
              term
            )
          )
      );

    if (
      found
    ) {
      result.push(
        family.name
      );
    }
  }

  return result;
};

/* =========================================================
   BUILD ROLE PROFILE

   Intentionally excludes arbitrary project/module names
   where possible.

   This avoids:
   "Sales Order module"
   making a software developer look like a sales profile.
========================================================= */

const buildCandidateRoleText = (
  candidate
) => {
  const designations =
    Array.isArray(
      candidate
        ?.experienceHistory
    )
      ? candidate
          .experienceHistory
          .map(
            (
              item
            ) =>
              item
                ?.designation ||
              ""
          )
          .filter(
            Boolean
          )
      : [];

  const skills =
    Array.isArray(
      candidate
        ?.skills
    )
      ? candidate
          .skills
      : [];

  return [
    candidate
      ?.currentDesignation,

    ...designations,

    ...skills,

    candidate
      ?.profileSummary,
  ]
    .filter(
      Boolean
    )
    .join(
      " "
    );
};

/* =========================================================
   NORMALIZE SKILL
========================================================= */

const normalizeSkill = (
  value
) => {
  const normalized =
    normalizeMatchText(
      value
    );

  const aliases = {
    nodejs:
      "nodejs",

    "node js":
      "nodejs",

    "react js":
      "react",

    reactjs:
      "react",

    "express js":
      "express",

    expressjs:
      "express",

    postgres:
      "postgresql",

    "amazon web services":
      "aws",

    "rest api":
      "restapi",

    "rest apis":
      "restapi",

    businessdevelopment:
      "businessdevelopment",

    bde:
      "businessdevelopment",

    bd:
      "businessdevelopment",

    talentacquisition:
      "talentacquisition",
  };

  const compact =
    normalized.replace(
      /\s+/g,
      ""
    );

  return (
    aliases[
      compact
    ] ||
    compact
  );
};

/* =========================================================
   SAFE SKILL MATCH
========================================================= */

const isSkillMatch = (
  candidateSkill,
  requiredSkill
) => {
  const candidateNormalized =
    normalizeSkill(
      candidateSkill
    );

  const requiredNormalized =
    normalizeSkill(
      requiredSkill
    );

  if (
    !candidateNormalized ||
    !requiredNormalized
  ) {
    return false;
  }

  if (
    candidateNormalized ===
    requiredNormalized
  ) {
    return true;
  }

  /* =====================================================
     ROLE-FAMILY RELEVANT SKILLS

     Example:
     Required: Sales
     Candidate: B2B Sales
     Candidate: Business Development

     These should count as related.
  ===================================================== */

  const requiredFamilies =
    getRoleFamilies(
      requiredSkill
    );

  const candidateFamilies =
    getRoleFamilies(
      candidateSkill
    );

  if (
    requiredFamilies.some(
      (
        family
      ) =>
        candidateFamilies.includes(
          family
        )
    )
  ) {
    return true;
  }

  /*
   * Conservative partial match.
   *
   * Avoid short generic terms causing false matches.
   */

  if (
    requiredNormalized.length >=
      6 &&
    candidateNormalized.includes(
      requiredNormalized
    )
  ) {
    return true;
  }

  if (
    candidateNormalized.length >=
      6 &&
    requiredNormalized.includes(
      candidateNormalized
    )
  ) {
    return true;
  }

  return false;
};

/* =========================================================
   ROLE RELEVANCE
========================================================= */

const calculateRoleRelevance = (
  candidate,
  requirement
) => {
  const requirementRole =
    String(
      requirement
        ?.positionTitle ||
        ""
    ).trim();

  if (
    !requirementRole
  ) {
    return {
      score:
        null,

      match:
        "UNKNOWN",

      requirementFamilies:
        [],

      candidateFamilies:
        [],
    };
  }

  const candidateRoleText =
    buildCandidateRoleText(
      candidate
    );

  const requirementFamilies =
    getRoleFamilies(
      requirementRole
    );

  const candidateFamilies =
    getRoleFamilies(
      candidateRoleText
    );

  /* =====================================================
     ROLE FAMILY MATCH
  ===================================================== */

  const commonFamilies =
    requirementFamilies.filter(
      (
        family
      ) =>
        candidateFamilies.includes(
          family
        )
    );

  if (
    requirementFamilies.length &&
    commonFamilies.length
  ) {
    return {
      score:
        100,

      match:
        "MATCH",

      requirementFamilies,

      candidateFamilies,

      matchedFamilies:
        commonFamilies,
    };
  }

  /* =====================================================
     TITLE TOKEN SIMILARITY
  ===================================================== */

  const requirementTokens =
    normalizeMatchText(
      requirementRole
    )
      .split(
        " "
      )
      .filter(
        (
          token
        ) =>
          token.length >=
          3
      );

  const candidateTokens =
    normalizeMatchText(
      candidateRoleText
    )
      .split(
        " "
      )
      .filter(
        (
          token
        ) =>
          token.length >=
          3
      );

  const genericWords =
    new Set([
      "executive",
      "manager",
      "senior",
      "junior",
      "associate",
      "assistant",
      "officer",
      "head",
      "lead",
      "specialist",
      "coordinator",
      "supervisor",
      "trainee",
      "intern",
    ]);

  const meaningfulRequirementTokens =
    requirementTokens.filter(
      (
        token
      ) =>
        !genericWords.has(
          token
        )
    );

  if (
    meaningfulRequirementTokens.length
  ) {
    const matchedTokens =
      meaningfulRequirementTokens.filter(
        (
          token
        ) =>
          candidateTokens.includes(
            token
          )
      );

    if (
      matchedTokens.length
    ) {
      const score =
        Math.round(
          (
            matchedTokens.length /
            meaningfulRequirementTokens.length
          ) *
            100
        );

      return {
        score:
          Math.max(
            55,
            score
          ),

        match:
          "RELATED",

        requirementFamilies,

        candidateFamilies,

        matchedTokens,
      };
    }
  }

  /* =====================================================
     COMPLETELY DIFFERENT ROLE FAMILY
  ===================================================== */

  if (
    requirementFamilies.length &&
    candidateFamilies.length
  ) {
    return {
      score:
        0,

      match:
        "DIFFERENT_PROFILE",

      requirementFamilies,

      candidateFamilies,
    };
  }

  return {
    score:
      20,

    match:
      "WEAK_RELATION",

    requirementFamilies,

    candidateFamilies,
  };
};

/* =========================================================
   EXPERIENCE MATCH

   Required 2-5 years:
     3 yrs  -> 100
     5 yrs  -> 100
     1.5 yr -> low
     6 yrs  -> reasonably good but overqualified
========================================================= */

const calculateExperienceMatch = (
  candidateExperience,
  minimum,
  maximum
) => {
  const experience =
    Number(
      candidateExperience
    );

  const min =
    minimum ===
      null ||
    minimum ===
      undefined
      ? null
      : Number(
          minimum
        );

  const max =
    maximum ===
      null ||
    maximum ===
      undefined
      ? null
      : Number(
          maximum
        );

  if (
    !Number.isFinite(
      experience
    )
  ) {
    return {
      score:
        null,

      match:
        "UNKNOWN",
    };
  }

  /* =====================================================
     WITHIN RANGE
  ===================================================== */

  if (
    (
      min ===
        null ||
      experience >=
        min
    ) &&
    (
      max ===
        null ||
      experience <=
        max
    )
  ) {
    return {
      score:
        100,

      match:
        "MATCH",
    };
  }

  /* =====================================================
     BELOW MINIMUM
  ===================================================== */

  if (
    min !==
      null &&
    experience <
      min
  ) {
    if (
      min <=
      0
    ) {
      return {
        score:
          100,

        match:
          "MATCH",
      };
    }

    const ratio =
      experience /
      min;

    let score;

    if (
      ratio >=
      0.9
    ) {
      score =
        75;
    } else if (
      ratio >=
      0.75
    ) {
      score =
        55;
    } else if (
      ratio >=
      0.5
    ) {
      score =
        30;
    } else {
      score =
        10;
    }

    return {
      score,

      match:
        "BELOW_RANGE",
    };
  }

  /* =====================================================
     ABOVE MAXIMUM

     Extra experience should not be treated like a bad CV.
  ===================================================== */

  if (
    max !==
      null &&
    experience >
      max
  ) {
    const excess =
      experience -
      max;

    const ratio =
      excess /
      Math.max(
        1,
        max
      );

    let score;

    if (
      ratio <=
      0.2
    ) {
      score =
        95;
    } else if (
      ratio <=
      0.5
    ) {
      score =
        85;
    } else if (
      ratio <=
      1
    ) {
      score =
        70;
    } else {
      score =
        55;
    }

    return {
      score,

      match:
        "ABOVE_RANGE",
    };
  }

  return {
    score:
      null,

    match:
      "UNKNOWN",
  };
};

/* =========================================================
   LOCATION MATCH
========================================================= */

const calculateLocationMatch = (
  candidate,
  requirement
) => {
  const candidateLocation =
    [
      candidate?.city,
      candidate?.state,
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      );

  const requirementLocation =
    String(
      requirement
        ?.location ||
        ""
    ).trim();

  if (
    !candidateLocation ||
    !requirementLocation
  ) {
    return {
      score:
        null,

      match:
        "UNKNOWN",

      candidate:
        candidateLocation,

      requirement:
        requirementLocation,
    };
  }

  const candidateNormalized =
    normalizeMatchText(
      candidateLocation
    );

  const requirementNormalized =
    normalizeMatchText(
      requirementLocation
    );

  const matched =
    candidateNormalized.includes(
      requirementNormalized
    ) ||
    requirementNormalized.includes(
      candidateNormalized
    );

  return {
    score:
      matched
        ? 100
        : 45,

    match:
      matched
        ? "MATCH"
        : "DIFFERENT",

    candidate:
      candidateLocation,

    requirement:
      requirementLocation,
  };
};

/* =========================================================
   OVERALL PROFILE LABEL
========================================================= */

const getMatchLabel = (
  score
) => {
  if (
    score ===
      null ||
    score ===
      undefined
  ) {
    return "Not enough data";
  }

  if (
    score >=
      85
  ) {
    return "Excellent match";
  }

  if (
    score >=
      70
  ) {
    return "Strong match";
  }

  if (
    score >=
      55
  ) {
    return "Good match";
  }

  if (
    score >=
      40
  ) {
    return "Partial match";
  }

  if (
    score >=
      25
  ) {
    return "Low match";
  }

  return "Very low match";
};

/* =========================================================
   CALCULATE MATCH

   Weighted model:

   ROLE RELEVANCE  35%
   SKILLS           35%
   EXPERIENCE       25%
   LOCATION          5%
========================================================= */

const calculateMatch = (
  candidate,
  requirement
) => {
  const requiredSkills =
    Array.isArray(
      requirement
        ?.requiredSkills
    )
      ? requirement
          .requiredSkills
          .map(
            (
              skill
            ) =>
              String(
                skill ||
                  ""
              ).trim()
          )
          .filter(
            Boolean
          )
      : [];

  const candidateSkills =
    Array.isArray(
      candidate
        ?.skills
    )
      ? candidate
          .skills
      : [];

  /* =====================================================
     SKILLS
  ===================================================== */

  const matchedSkills =
    [];

  const missingSkills =
    [];

  for (
    const requiredSkill
    of requiredSkills
  ) {
    const found =
      candidateSkills.some(
        (
          candidateSkill
        ) =>
          isSkillMatch(
            candidateSkill,
            requiredSkill
          )
      );

    if (
      found
    ) {
      matchedSkills.push(
        requiredSkill
      );
    } else {
      missingSkills.push(
        requiredSkill
      );
    }
  }

  const skillScore =
    requiredSkills.length
      ? Math.round(
          (
            matchedSkills.length /
            requiredSkills.length
          ) *
            100
        )
      : null;

  /* =====================================================
     ROLE
  ===================================================== */

  const role =
    calculateRoleRelevance(
      candidate,
      requirement
    );

  /* =====================================================
     EXPERIENCE
  ===================================================== */

  const experience =
    calculateExperienceMatch(
      candidate
        ?.totalExperienceYears,

      requirement
        ?.minimumExperienceYears,

      requirement
        ?.maximumExperienceYears
    );

  /* =====================================================
     LOCATION
  ===================================================== */

  const location =
    calculateLocationMatch(
      candidate,
      requirement
    );

  /* =====================================================
     WEIGHTED OVERALL SCORE

     Missing data does not automatically score zero.
     Weight is redistributed across available factors.
  ===================================================== */

  const components =
    [];

  if (
    role.score !==
      null
  ) {
    components.push({
      key:
        "role",

      score:
        role.score,

      weight:
        35,
    });
  }

  if (
    skillScore !==
      null
  ) {
    components.push({
      key:
        "skills",

      score:
        skillScore,

      weight:
        35,
    });
  }

  if (
    experience.score !==
      null
  ) {
    components.push({
      key:
        "experience",

      score:
        experience.score,

      weight:
        25,
    });
  }

  if (
    location.score !==
      null
  ) {
    components.push({
      key:
        "location",

      score:
        location.score,

      weight:
        5,
    });
  }

  const totalWeight =
    components.reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.weight,
      0
    );

  let overallScore =
    null;

  if (
    totalWeight >
    0
  ) {
    overallScore =
      Math.round(
        components.reduce(
          (
            sum,
            item
          ) =>
            sum +
            (
              item.score *
              item.weight
            ),
          0
        ) /
        totalWeight
      );
  }

  /* =====================================================
     SAFETY CAP

     If role is completely unrelated AND no required skills
     match, prevent an unrelated candidate from scoring high
     only because experience/location matches.

     Example:
     Backend Developer CV against Sales Executive.
  ===================================================== */

  if (
    role.score <=
      10 &&
    skillScore ===
      0 &&
    overallScore !==
      null
  ) {
    overallScore =
      Math.min(
        overallScore,
        30
      );
  }

  /* =====================================================
     STRONG ROLE BUT SOME MISSING SKILLS

     Do not over-penalize candidates who clearly belong to
     the right function but use different terminology.
  ===================================================== */

  if (
    role.score >=
      90 &&
    skillScore ===
      0 &&
    overallScore !==
      null
  ) {
    overallScore =
      Math.max(
        overallScore,
        45
      );
  }

  return {
    overallScore,

    profileLabel:
      getMatchLabel(
        overallScore
      ),

    roleScore:
      role.score,

    skillScore,

    experienceScore:
      experience.score,

    locationScore:
      location.score,

    matchedSkills,

    missingSkills,

    role: {
      requirement:
        requirement
          ?.positionTitle ||
        "",

      candidate:
        candidate
          ?.currentDesignation ||
        "",

      score:
        role.score,

      match:
        role.match,

      requirementFamilies:
        role
          .requirementFamilies ||
        [],

      candidateFamilies:
        role
          .candidateFamilies ||
        [],
    },

    skills: {
      required:
        requiredSkills,

      candidate:
        candidateSkills,

      matched:
        matchedSkills,

      missing:
        missingSkills,

      score:
        skillScore,
    },

    experience: {
      candidate:
        candidate
          ?.totalExperienceYears ??
        null,

      minimum:
        requirement
          ?.minimumExperienceYears ??
        null,

      maximum:
        requirement
          ?.maximumExperienceYears ??
        null,

      match:
        experience.match,

      score:
        experience.score,
    },

    location: {
      candidate:
        location.candidate,

      requirement:
        location.requirement,

      match:
        location.match,

      score:
        location.score,
    },

    components,
  };
};

/* =========================================================
   REVIEW FIELDS
========================================================= */

const getReviewFields = (
  candidate
) => {
  const result =
    [];

  const add = (
    field,
    priority,
    reason
  ) => {
    result.push({
      field,
      priority,
      reason,
    });
  };

  if (
    !candidate.fullName
  ) {
    add(
      "fullName",
      "REQUIRED",
      "Candidate name was not detected."
    );
  }

  if (
    !candidate.mobile &&
    !candidate.email
  ) {
    add(
      "contact",
      "REQUIRED",
      "Mobile number and email were not detected."
    );
  }

  if (
    !candidate.currentCompany
  ) {
    add(
      "currentCompany",
      "REVIEW",
      "Current company could not be identified confidently."
    );
  }

  if (
    !candidate.currentDesignation
  ) {
    add(
      "currentDesignation",
      "REVIEW",
      "Current designation could not be identified confidently."
    );
  }

  if (
    candidate
      .totalExperienceYears ===
    null
  ) {
    add(
      "totalExperienceYears",
      "REVIEW",
      "Total experience could not be calculated."
    );
  }

  if (
    !candidate.skills
      .length
  ) {
    add(
      "skills",
      "REVIEW",
      "No skills were detected."
    );
  }

  return result;
};

/* =========================================================
   MAIN
========================================================= */

const parseResumeForRequirement =
  async ({
    filePath,
    requirementId,
  }) => {
    if (
      !mongoose.Types
        .ObjectId
        .isValid(
          requirementId
        )
    ) {
      const error =
        new Error(
          "Valid requirementId is required"
        );

      error.statusCode =
        400;

      throw error;
    }

    const requirement =
      await ManpowerRequirement
        .findById(
          requirementId
        )
        .select(
          "_id requestNumber positionTitle requiredSkills minimumExperienceYears maximumExperienceYears location status department assignedHr"
        )
        .populate(
          "department",
          "name code"
        )
        .populate(
          "assignedHr",
          "displayName email"
        )
        .lean();

    if (
      !requirement
    ) {
      const error =
        new Error(
          "Manpower requirement not found"
        );

      error.statusCode =
        404;

      throw error;
    }

    if (
      ![
        "APPROVED",
        "HIRING_IN_PROGRESS",
      ].includes(
        requirement.status
      )
    ) {
      const error =
        new Error(
          "Resume cannot be parsed for this hiring requirement"
        );

      error.statusCode =
        400;

      throw error;
    }

    const parsed =
      await parseLocalResume(
        filePath
      );

    const candidate =
      parsed.candidate;

    const duplicate =
      await findDuplicateCandidate(
        candidate
      );

    const match =
      calculateMatch(
        candidate,
        requirement
      );

    const reviewFields =
      getReviewFields(
        candidate
      );

    return {
      requirement,

      candidate,

      duplicate: {
        found:
          Boolean(
            duplicate
          ),

        candidate:
          duplicate,
      },

      match,

      reviewFields,

      parserMeta: {
        ...parsed.parserMeta,

        needsReview:
          reviewFields.some(
            (
              field
            ) =>
              field.priority ===
                "REQUIRED" ||
              field.priority ===
                "REVIEW"
          ),

        reviewCount:
          reviewFields.length,
      },
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  extractPdfText,

  parseLocalResume,

  calculateMatch,

  parseResumeForRequirement,

  extractExperienceHistory,

  extractSkills,

  extractEducation,
};
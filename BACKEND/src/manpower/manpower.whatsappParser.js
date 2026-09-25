/* =========================================================
   MANPOWER WHATSAPP PARSER

   HIGH-TOLERANCE / HUMAN-FRIENDLY PARSER

   DESIGN GOALS:

   1. Only messages beginning with a recognizable
      MANPOWER REQUEST header are treated as MPR.

   2. Accept common field-name variations and minor typos.

   3. Normalize:
      - Department aliases
      - Dates
      - Employment type
      - Shift
      - Priority
      - Experience
      - Salary
      - Openings
      - Skills

   4. Never silently invent important business data.

   5. Keep the same output contract expected by
      manpower.whatsapp.service.js.
========================================================= */

const REQUIRED_HEADER =
  "MANPOWER REQUEST";

/* =========================================================
   BASIC NORMALIZATION
========================================================= */

const normalize =
  (
    value
  ) =>
    String(
      value || ""
    )
      .replace(
        /\u00A0/g,
        " "
      )
      .trim()
      .replace(
        /\s+/g,
        " "
      );

const normalizeKey =
  (
    value
  ) =>
    normalize(
      value
    )
      .toLowerCase()
      .replace(
        /&/g,
        " and "
      )
      .replace(
        /[^a-z0-9 ]/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

const compactKey =
  (
    value
  ) =>
    normalizeKey(
      value
    ).replace(
      /\s+/g,
      ""
    );

/* =========================================================
   TEMPLATE
========================================================= */

const getManpowerTemplate =
  () =>
    [
      "MANPOWER REQUEST",
      "",
      "Department:",
      "Position:",
      "Openings:",
      "Skills:",
      "Experience:",
      "Employment Type:",
      "Shift:",
      "Location:",
      "Monthly Salary:",
      "Required By:",
      "Priority:",
      "Reason:",
    ].join(
      "\n"
    );

/* =========================================================
   HEADER

   We remain intentionally strict enough that normal group
   conversation cannot accidentally create an MPR.

   Accepted examples:

   MANPOWER REQUEST
   Manpower Request
   MANPOWER REQUEST:
   *MANPOWER REQUEST*
   MANPOWER REQUISITION
   MPR REQUEST

   We do NOT accept a normal sentence merely containing
   "manpower".
========================================================= */

const normalizeHeader =
  (
    value
  ) =>
    normalizeKey(
      String(
        value || ""
      ).replace(
        /[*_~`]/g,
        ""
      )
    );

const isManpowerRequest =
  (
    text
  ) => {
    const raw =
      String(
        text || ""
      ).trim();

    if (
      !raw
    ) {
      return false;
    }

    const firstLine =
      raw
        .split(
          /\r?\n/
        )[0];

    const header =
      normalizeHeader(
        firstLine
      );

    const acceptedHeaders =
      new Set([
        "manpower request",
        "man power request",
        "manpower requisition",
        "man power requisition",
        "mpr request",
        "mpr",
      ]);

    return acceptedHeaders.has(
      header
    );
  };

/* =========================================================
   STRING SIMILARITY

   Used ONLY for controlled field-name typo handling.

   It is NOT used to invent arbitrary business values.
========================================================= */

const levenshteinDistance =
  (
    first,
    second
  ) => {
    const a =
      normalizeKey(
        first
      );

    const b =
      normalizeKey(
        second
      );

    if (
      a === b
    ) {
      return 0;
    }

    if (
      !a.length
    ) {
      return b.length;
    }

    if (
      !b.length
    ) {
      return a.length;
    }

    const previous =
      Array.from(
        {
          length:
            b.length +
            1,
        },
        (
          _,
          index
        ) =>
          index
      );

    for (
      let i = 1;
      i <=
      a.length;
      i += 1
    ) {
      const current =
        [
          i,
        ];

      for (
        let j = 1;
        j <=
        b.length;
        j += 1
      ) {
        const cost =
          a[
            i - 1
          ] ===
          b[
            j - 1
          ]
            ? 0
            : 1;

        current[j] =
          Math.min(
            current[
              j - 1
            ] +
              1,

            previous[j] +
              1,

            previous[
              j - 1
            ] +
              cost
          );
      }

      for (
        let j = 0;
        j <
        current.length;
        j += 1
      ) {
        previous[j] =
          current[j];
      }
    }

    return previous[
      b.length
    ];
  };

const similarity =
  (
    first,
    second
  ) => {
    const a =
      normalizeKey(
        first
      );

    const b =
      normalizeKey(
        second
      );

    const longest =
      Math.max(
        a.length,
        b.length
      );

    if (
      longest ===
      0
    ) {
      return 1;
    }

    return (
      1 -
      levenshteinDistance(
        a,
        b
      ) /
        longest
    );
  };

/* =========================================================
   FIELD ALIASES

   Exact aliases are preferred.

   Fuzzy matching below is only a fallback for small human
   mistakes such as:

   Departmnt
   Employement Type
   Requird By
   Openning
========================================================= */

const aliases = {
  department:
    "department",

  dept:
    "department",

  depart:
    "department",

  departmentname:
    "department",

  position:
    "positionTitle",

  role:
    "positionTitle",

  designation:
    "positionTitle",

  post:
    "positionTitle",

  jobposition:
    "positionTitle",

  jobrole:
    "positionTitle",

  openings:
    "numberOfOpenings",

  opening:
    "numberOfOpenings",

  vacancy:
    "numberOfOpenings",

  vacancies:
    "numberOfOpenings",

  requirement:
    "numberOfOpenings",

  requirements:
    "numberOfOpenings",

  headcount:
    "numberOfOpenings",

  manpower:
    "numberOfOpenings",

  noofopenings:
    "numberOfOpenings",

  numberofopenings:
    "numberOfOpenings",

  noofvacancies:
    "numberOfOpenings",

  numberofvacancies:
    "numberOfOpenings",

  skills:
    "requiredSkills",

  skill:
    "requiredSkills",

  requiredskills:
    "requiredSkills",

  skillrequired:
    "requiredSkills",

  skillsrequired:
    "requiredSkills",

  experience:
    "experience",

  exp:
    "experience",

  requiredexperience:
    "experience",

  experiencerequired:
    "experience",

  employmenttype:
    "employmentType",

  employment:
    "employmentType",

  jobtype:
    "employmentType",

  hiringtype:
    "employmentType",

  typeofemployment:
    "employmentType",

  shift:
    "shiftAvailability",

  shifttype:
    "shiftAvailability",

  shiftavailability:
    "shiftAvailability",

  workingshift:
    "shiftAvailability",

  location:
    "location",

  office:
    "location",

  worklocation:
    "location",

  joblocation:
    "location",

  place:
    "location",

  monthlysalary:
    "monthlySalary",

  salary:
    "monthlySalary",

  salaryrange:
    "monthlySalary",

  monthlyctc:
    "monthlySalary",

  monthlypay:
    "monthlySalary",

  pay:
    "monthlySalary",

  requiredby:
    "requiredByDate",

  needby:
    "requiredByDate",

  neededby:
    "requiredByDate",

  requiredbydate:
    "requiredByDate",

  requireddate:
    "requiredByDate",

  joiningrequiredby:
    "requiredByDate",

  targetdate:
    "requiredByDate",

  deadline:
    "requiredByDate",

  priority:
    "priority",

  urgency:
    "priority",

  requirementpriority:
    "priority",

  reason:
    "reason",

  remarks:
    "reason",

  remark:
    "reason",

  justification:
    "reason",

  hiringreason:
    "reason",

  requirementreason:
    "reason",
};

/* =========================================================
   CANONICAL FIELD LABELS

   Used for conservative fuzzy field-key matching.
========================================================= */

const canonicalFieldKeys = [
  {
    key:
      "department",
    target:
      "department",
  },

  {
    key:
      "position",
    target:
      "positionTitle",
  },

  {
    key:
      "designation",
    target:
      "positionTitle",
  },

  {
    key:
      "openings",
    target:
      "numberOfOpenings",
  },

  {
    key:
      "vacancies",
    target:
      "numberOfOpenings",
  },

  {
    key:
      "skills",
    target:
      "requiredSkills",
  },

  {
    key:
      "experience",
    target:
      "experience",
  },

  {
    key:
      "employment type",
    target:
      "employmentType",
  },

  {
    key:
      "shift",
    target:
      "shiftAvailability",
  },

  {
    key:
      "location",
    target:
      "location",
  },

  {
    key:
      "monthly salary",
    target:
      "monthlySalary",
  },

  {
    key:
      "required by",
    target:
      "requiredByDate",
  },

  {
    key:
      "priority",
    target:
      "priority",
  },

  {
    key:
      "reason",
    target:
      "reason",
  },
];

const resolveFieldTarget =
  (
    key
  ) => {
    const normalized =
      normalizeKey(
        key
      );

    const compact =
      compactKey(
        key
      );

    if (
      aliases[normalized]
    ) {
      return aliases[
        normalized
      ];
    }

    if (
      aliases[compact]
    ) {
      return aliases[
        compact
      ];
    }

    /*
     * Avoid fuzzy matching extremely short keys because a
     * typo such as "pay" or "exp" should only be handled by
     * explicit aliases.
     */

    if (
      normalized.length <
      5
    ) {
      return null;
    }

    let best =
      null;

    let bestScore =
      0;

    let secondBestScore =
      0;

    for (
      const candidate of
      canonicalFieldKeys
    ) {
      const score =
        similarity(
          normalized,
          candidate.key
        );

      if (
        score >
        bestScore
      ) {
        secondBestScore =
          bestScore;

        bestScore =
          score;

        best =
          candidate;
      } else if (
        score >
        secondBestScore
      ) {
        secondBestScore =
          score;
      }
    }

    /*
     * Strong threshold +
     * separation from second candidate.

     * This allows obvious spelling mistakes but prevents
     * arbitrary keys from being guessed.
     */

    if (
      best &&
      bestScore >=
        0.78 &&
      bestScore -
        secondBestScore >=
        0.08
    ) {
      return best.target;
    }

    return null;
  };

/* =========================================================
   EXTRACT FIELDS

   Accepts:

   Department: Sales
   Department - Sales
   Department = Sales

   Colon remains preferred.

   Continuation lines are appended to Reason / Skills where
   practical so a user can type a longer reason.
========================================================= */

const extractFields =
  (
    text
  ) => {
    const result =
      {};

    const lines =
      String(
        text || ""
      ).split(
        /\r?\n/
      );

    let lastTarget =
      null;

    for (
      let index = 1;
      index <
      lines.length;
      index += 1
    ) {
      const rawLine =
        String(
          lines[index] ||
          ""
        ).trim();

      if (
        !rawLine
      ) {
        continue;
      }

      const line =
        rawLine.replace(
          /^[•●▪◦*-]\s*/,
          ""
        );

      const match =
        line.match(
          /^\s*([^:=]+?)\s*(?::|=|\s+-\s+)\s*(.*?)\s*$/
        );

      if (
        !match
      ) {
        if (
          lastTarget ===
            "reason" &&
          result.reason
        ) {
          result.reason =
            normalize(
              `${result.reason} ${line}`
            );
        }

        continue;
      }

      const target =
        resolveFieldTarget(
          match[1]
        );

      if (
        !target
      ) {
        lastTarget =
          null;

        continue;
      }

      const value =
        normalize(
          match[2]
        );

      if (
        value
      ) {
        result[target] =
          value;

        lastTarget =
          target;
      }
    }

    return result;
  };

/* =========================================================
   DEPARTMENT NORMALIZATION

   IMPORTANT:

   This does NOT replace the actual MongoDB Department lookup.

   It normalizes obvious human terminology before the service
   resolves the active Department.

   Examples:

   sale
   sales team
   sale dept
   sales department
   → Sales

   admin
   admin team
   adminstration
   administration dept
   → Administration

   hr
   human resource
   human resources team
   → HR

   Unknown department names are preserved rather than
   invented.
========================================================= */

const departmentAliases = {
  sales:
    "Sales",

  sale:
    "Sales",

  salesteam:
    "Sales",

  salesteam:
    "Sales",

  salesdept:
    "Sales",

  saledept:
    "Sales",

  salesdepartment:
    "Sales",

  saledepartment:
    "Sales",

  businessdevelopment:
    "Sales",

  businessdevelopmentteam:
    "Sales",

  bd:
    "Sales",

  admin:
    "Administration",

  administration:
    "Administration",

  adminstration:
    "Administration",

  administraton:
    "Administration",

  administation:
    "Administration",

  adminteam:
    "Administration",

  administrationteam:
    "Administration",

  admindept:
    "Administration",

  administrationdept:
    "Administration",

  admindepartment:
    "Administration",

  administrationdepartment:
    "Administration",

  hr:
    "HR",

  hrteam:
    "HR",

  hrdept:
    "HR",

  hrdepartment:
    "HR",

  humanresource:
    "HR",

  humanresources:
    "HR",

  humanresourceteam:
    "HR",

  humanresourcesdepartment:
    "HR",

  humanresourcedepartment:
    "HR",

  it:
    "IT",

  itteam:
    "IT",

  itdept:
    "IT",

  itdepartment:
    "IT",

  informationtechnology:
    "IT",

  informationtechnologyteam:
    "IT",

  tech:
    "IT",

  technology:
    "IT",

  accounts:
    "Accounts",

  account:
    "Accounts",

  accountsteam:
    "Accounts",

  accountsdept:
    "Accounts",

  accountsdepartment:
    "Accounts",

  accounting:
    "Accounts",

  finance:
    "Finance",

  financeteam:
    "Finance",

  financedepartment:
    "Finance",

  purchase:
    "Purchase",

  purchasing:
    "Purchase",

  procurement:
    "Purchase",

  purchaseteam:
    "Purchase",

  purchasedepartment:
    "Purchase",

  production:
    "Production",

  productionteam:
    "Production",

  productiondepartment:
    "Production",

  manufacturing:
    "Production",

  quality:
    "Quality",

  qualityteam:
    "Quality",

  qualitydepartment:
    "Quality",

  qa:
    "Quality",

  qc:
    "Quality",

  qaqc:
    "Quality",

  qualitycontrol:
    "Quality",

  qualityassurance:
    "Quality",

  maintenance:
    "Maintenance",

  maintenanceteam:
    "Maintenance",

  maintenancedepartment:
    "Maintenance",

  store:
    "Stores",

  stores:
    "Stores",

  storeteam:
    "Stores",

  storesdepartment:
    "Stores",

  warehouse:
    "Stores",

  logistics:
    "Logistics",

  logistic:
    "Logistics",

  dispatch:
    "Dispatch",

  marketing:
    "Marketing",

  marketingteam:
    "Marketing",

  marketingdepartment:
    "Marketing",
};

const normalizeDepartment =
  (
    value
  ) => {
    const original =
      normalize(
        value
      );

    if (
      !original
    ) {
      return "";
    }

    const key =
      compactKey(
        original
      );

    if (
      departmentAliases[key]
    ) {
      return departmentAliases[
        key
      ];
    }

    /*
     * Controlled typo matching against known aliases.

     * Require a high score so a genuinely different custom
     * department isn't silently converted.
     */

    if (
      key.length >=
      5
    ) {
      let bestAlias =
        null;

      let bestScore =
        0;

      let secondBestScore =
        0;

      for (
        const alias of
        Object.keys(
          departmentAliases
        )
      ) {
        const score =
          similarity(
            key,
            alias
          );

        if (
          score >
          bestScore
        ) {
          secondBestScore =
            bestScore;

          bestScore =
            score;

          bestAlias =
            alias;
        } else if (
          score >
          secondBestScore
        ) {
          secondBestScore =
            score;
        }
      }

      if (
        bestAlias &&
        bestScore >=
          0.84 &&
        bestScore -
          secondBestScore >=
          0.03
      ) {
        return departmentAliases[
          bestAlias
        ];
      }
    }

    /*
     * Unknown/custom departments are preserved.

     * The service remains responsible for checking whether
     * the department actually exists in MongoDB.
     */

    return original;
  };

/* =========================================================
   NUMBER WORDS

   Allows:

   2
   02
   two
   two openings
========================================================= */

const numberWords = {
  one:
    1,

  two:
    2,

  three:
    3,

  four:
    4,

  five:
    5,

  six:
    6,

  seven:
    7,

  eight:
    8,

  nine:
    9,

  ten:
    10,

  eleven:
    11,

  twelve:
    12,

  thirteen:
    13,

  fourteen:
    14,

  fifteen:
    15,

  sixteen:
    16,

  seventeen:
    17,

  eighteen:
    18,

  nineteen:
    19,

  twenty:
    20,
};

const numberOf =
  (
    value
  ) => {
    const raw =
      normalize(
        value
      )
        .toLowerCase()
        .replace(
          /,/g,
          ""
        );

    if (
      !raw
    ) {
      return null;
    }

    const numericMatch =
      raw.match(
        /\d+/
      );

    if (
      numericMatch
    ) {
      const number =
        Number(
          numericMatch[0]
        );

      return Number.isFinite(
        number
      )
        ? number
        : null;
    }

    for (
      const [
        word,
        number,
      ] of Object.entries(
        numberWords
      )
    ) {
      if (
        new RegExp(
          `\\b${word}\\b`,
          "i"
        ).test(
          raw
        )
      ) {
        return number;
      }
    }

    return null;
  };

/* =========================================================
   EXPERIENCE

   Examples:

   Fresher
   Freshers
   0
   2
   2 years
   2-5
   2 to 5 years
   2+ years
   minimum 3 years
   at least 3 years
   upto 5 years
========================================================= */

const parseExperience =
  (
    value
  ) => {
    const raw =
      normalize(
        value
      )
        .toLowerCase()
        .replace(
          /yrs?/g,
          "years"
        )
        .replace(
          /year\(s\)/g,
          "years"
        );

    if (
      !raw
    ) {
      return {
        min:
          null,

        max:
          null,
      };
    }

    if (
      /\b(fresher|freshers|fresh|no experience|zero experience)\b/.test(
        raw
      )
    ) {
      return {
        min:
          0,

        max:
          0,
      };
    }

    const range =
      raw.match(
        /(\d+(?:\.\d+)?)\s*(?:-|–|—|to|till|upto|up to)\s*(\d+(?:\.\d+)?)/
      );

    if (
      range
    ) {
      let min =
        Number(
          range[1]
        );

      let max =
        Number(
          range[2]
        );

      if (
        max <
        min
      ) {
        [
          min,
          max,
        ] = [
          max,
          min,
        ];
      }

      return {
        min,
        max,
      };
    }

    const minimum =
      raw.match(
        /(?:minimum|min|at least)\s*(\d+(?:\.\d+)?)/
      );

    if (
      minimum
    ) {
      return {
        min:
          Number(
            minimum[1]
          ),

        max:
          null,
      };
    }

    const plus =
      raw.match(
        /(\d+(?:\.\d+)?)\s*(?:\+|plus)/
      );

    if (
      plus
    ) {
      return {
        min:
          Number(
            plus[1]
          ),

        max:
          null,
      };
    }

    const upto =
      raw.match(
        /(?:upto|up to|maximum|max)\s*(\d+(?:\.\d+)?)/
      );

    if (
      upto
    ) {
      return {
        min:
          0,

        max:
          Number(
            upto[1]
          ),
      };
    }

    const single =
      raw.match(
        /(\d+(?:\.\d+)?)/
      );

    if (
      single
    ) {
      return {
        min:
          Number(
            single[1]
          ),

        max:
          Number(
            single[1]
          ),
      };
    }

    return {
      min:
        null,

      max:
        null,
    };
  };

/* =========================================================
   SALARY NUMBER

   Examples:

   20000
   20,000
   ₹20,000
   Rs 20000
   INR 20000
   20k
   20 thousand
   0.2 lakh
========================================================= */

const salaryNumber =
  (
    value
  ) => {
    const raw =
      String(
        value || ""
      )
        .toLowerCase()
        .replace(
          /₹/g,
          ""
        )
        .replace(
          /\brs\.?\b/g,
          ""
        )
        .replace(
          /\binr\b/g,
          ""
        )
        .replace(
          /rupees?/g,
          ""
        )
        .replace(
          /per\s*month/g,
          ""
        )
        .replace(
          /monthly/g,
          ""
        )
        .replace(
          /\/\s*month/g,
          ""
        )
        .replace(
          /p\.?\s*m\.?/g,
          ""
        )
        .replace(
          /,/g,
          ""
        )
        .trim();

    const match =
      raw.match(
        /(\d+(?:\.\d+)?)\s*(k|thousand|l|lac|lakh)?/
      );

    if (
      !match
    ) {
      return null;
    }

    let number =
      Number(
        match[1]
      );

    if (
      !Number.isFinite(
        number
      )
    ) {
      return null;
    }

    const unit =
      match[2] ||
      "";

    if (
      unit ===
        "k" ||
      unit ===
        "thousand"
    ) {
      number *=
        1000;
    }

    if (
      unit ===
        "l" ||
      unit ===
        "lac" ||
      unit ===
        "lakh"
    ) {
      number *=
        100000;
    }

    return Math.round(
      number
    );
  };

/* =========================================================
   SALARY RANGE

   Examples:

   20000-25000
   20,000 - 25,000
   20k-25k
   20 to 25k
   Rs 20000 to Rs 25000
   25000
========================================================= */

const parseSalary =
  (
    value
  ) => {
    const raw =
      normalize(
        value
      );

    if (
      !raw
    ) {
      return {
        min:
          null,

        max:
          null,
      };
    }

    const parts =
      raw
        .split(
          /\s+(?:to|till)\s+|[-–—]/i
        )
        .map(
          normalize
        )
        .filter(
          Boolean
        );

    if (
      parts.length >=
      2
    ) {
      let min =
        salaryNumber(
          parts[0]
        );

      let max =
        salaryNumber(
          parts[1]
        );

      /*
       * Human shorthand:

       * 20-25k
       * → 20k - 25k

       * 0.2-0.3 lakh
       * → 0.2 lakh - 0.3 lakh
       */

      const secondLower =
        String(
          parts[1]
        ).toLowerCase();

      if (
        min !==
          null &&
        max !==
          null &&
        min <
          1000 &&
        /\b(k|thousand)\b/.test(
          secondLower
        )
      ) {
        min *=
          1000;
      }

      if (
        min !==
          null &&
        max !==
          null &&
        min <
          1000 &&
        /\b(l|lac|lakh)\b/.test(
          secondLower
        )
      ) {
        min *=
          100000;
      }

      if (
        min !==
          null &&
        max !==
          null &&
        max <
          min
      ) {
        [
          min,
          max,
        ] = [
          max,
          min,
        ];
      }

      return {
        min,
        max,
      };
    }

    const amount =
      salaryNumber(
        raw
      );

    return {
      min:
        amount,

      max:
        amount,
    };
  };

/* =========================================================
   EMPLOYMENT TYPE

   Human variants normalized to the existing enum.
========================================================= */

const parseEmployment =
  (
    value
  ) => {
    const raw =
      normalizeKey(
        value
      );

    const compact =
      compactKey(
        value
      );

    if (
      !raw
    ) {
      return null;
    }

    if (
      [
        "fulltime",
        "permanent",
        "permanentemployee",
        "regular",
        "regularjob",
        "fulltimepermanent",
      ].includes(
        compact
      )
    ) {
      return "FULL_TIME";
    }

    if (
      [
        "parttime",
        "parttimer",
      ].includes(
        compact
      )
    ) {
      return "PART_TIME";
    }

    if (
      [
        "contract",
        "contractual",
        "contractbasis",
        "contractemployee",
      ].includes(
        compact
      )
    ) {
      return "CONTRACT";
    }

    if (
      [
        "temporary",
        "temp",
        "temporaryemployee",
      ].includes(
        compact
      )
    ) {
      return "TEMPORARY";
    }

    if (
      [
        "intern",
        "internship",
        "traineeintern",
      ].includes(
        compact
      )
    ) {
      return "INTERN";
    }

    /*
     * Controlled keyword fallback.
     */

    if (
      raw.includes(
        "full time"
      )
    ) {
      return "FULL_TIME";
    }

    if (
      raw.includes(
        "part time"
      )
    ) {
      return "PART_TIME";
    }

    if (
      raw.includes(
        "contract"
      )
    ) {
      return "CONTRACT";
    }

    if (
      raw.includes(
        "temp"
      )
    ) {
      return "TEMPORARY";
    }

    if (
      raw.includes(
        "intern"
      )
    ) {
      return "INTERN";
    }

    return null;
  };

/* =========================================================
   SHIFT
========================================================= */

const parseShift =
  (
    value
  ) => {
    const raw =
      normalizeKey(
        value
      );

    const compact =
      compactKey(
        value
      );

    if (
      !raw
    ) {
      return null;
    }

    if (
      raw.includes(
        "flex"
      ) ||
      [
        "rotational",
        "rotating",
        "flexibleshift",
      ].includes(
        compact
      )
    ) {
      return "FLEXIBLE";
    }

    if (
      raw.includes(
        "night"
      )
    ) {
      return "NIGHT";
    }

    if (
      raw.includes(
        "day"
      ) ||
      raw.includes(
        "morning"
      )
    ) {
      return "DAY";
    }

    if (
      raw.includes(
        "general"
      ) ||
      raw.includes(
        "office"
      )
    ) {
      return "GENERAL";
    }

    if (
      [
        "any",
        "anyshift",
        "all",
        "allshift",
        "allshifts",
      ].includes(
        compact
      )
    ) {
      return "ANY";
    }

    return null;
  };

/* =========================================================
   PRIORITY
========================================================= */

const parsePriority =
  (
    value
  ) => {
    const raw =
      normalizeKey(
        value
      );

    const compact =
      compactKey(
        value
      );

    if (
      !raw
    ) {
      return null;
    }

    if (
      [
        "low",
        "noturgent",
      ].includes(
        compact
      )
    ) {
      return "LOW";
    }

    if (
      [
        "normal",
        "medium",
        "regular",
        "standard",
      ].includes(
        compact
      )
    ) {
      return "NORMAL";
    }

    if (
      [
        "high",
        "important",
      ].includes(
        compact
      )
    ) {
      return "HIGH";
    }

    if (
      [
        "urgent",
        "asap",
        "immediate",
        "immediately",
        "critical",
        "veryurgent",
        "toppriority",
      ].includes(
        compact
      )
    ) {
      return "URGENT";
    }

    return null;
  };

/* =========================================================
   DATE HELPERS
========================================================= */

const monthMap = {
  january:
    1,

  jan:
    1,

  february:
    2,

  feb:
    2,

  march:
    3,

  mar:
    3,

  april:
    4,

  apr:
    4,

  may:
    5,

  june:
    6,

  jun:
    6,

  july:
    7,

  jul:
    7,

  august:
    8,

  aug:
    8,

  september:
    9,

  sep:
    9,

  sept:
    9,

  october:
    10,

  oct:
    10,

  november:
    11,

  nov:
    11,

  december:
    12,

  dec:
    12,
};

const buildUtcDate =
  (
    year,
    month,
    day
  ) => {
    const numericYear =
      Number(
        year
      );

    const numericMonth =
      Number(
        month
      );

    const numericDay =
      Number(
        day
      );

    if (
      !Number.isInteger(
        numericYear
      ) ||
      !Number.isInteger(
        numericMonth
      ) ||
      !Number.isInteger(
        numericDay
      )
    ) {
      return null;
    }

    if (
      numericYear <
        2000 ||
      numericYear >
        2200 ||
      numericMonth <
        1 ||
      numericMonth >
        12 ||
      numericDay <
        1 ||
      numericDay >
        31
    ) {
      return null;
    }

    const date =
      new Date(
        Date.UTC(
          numericYear,
          numericMonth -
            1,
          numericDay,
          0,
          0,
          0,
          0
        )
      );

    /*
     * JavaScript auto-rolls invalid dates.

     * Example:
     * 31 February → March

     * We explicitly reject that.
     */

    if (
      date.getUTCFullYear() !==
        numericYear ||
      date.getUTCMonth() +
        1 !==
        numericMonth ||
      date.getUTCDate() !==
        numericDay
    ) {
      return null;
    }

    return date;
  };

/* =========================================================
   DATE

   Accepted examples:

   10/10/2026
   10-10-2026
   10.10.2026

   2026-10-10
   2026/10/10

   10 October 2026
   10 Oct 2026
   10th October 2026
   10th Oct, 2026

   October 10 2026
   October 10th, 2026

   Month names are case-insensitive.
========================================================= */

const parseDate =
  (
    value
  ) => {
    let raw =
      normalize(
        value
      )
        .toLowerCase()
        .replace(
          /,/g,
          " "
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    if (
      !raw
    ) {
      return null;
    }

    /*
     * Remove ordinal suffix:
     *
     * 10th → 10
     * 1st  → 1
     * 2nd  → 2
     * 3rd  → 3
     */

    raw =
      raw.replace(
        /\b(\d{1,2})(st|nd|rd|th)\b/g,
        "$1"
      );

    /* -----------------------------------------------------
       YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
    ----------------------------------------------------- */

    let match =
      raw.match(
        /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/
      );

    if (
      match
    ) {
      return buildUtcDate(
        match[1],
        match[2],
        match[3]
      );
    }

    /* -----------------------------------------------------
       DD-MM-YYYY / DD/MM/YYYY / DD.MM.YYYY
    ----------------------------------------------------- */

    match =
      raw.match(
        /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/
      );

    if (
      match
    ) {
      return buildUtcDate(
        match[3],
        match[2],
        match[1]
      );
    }

    /* -----------------------------------------------------
       10 October 2026
       10 Oct 2026
    ----------------------------------------------------- */

    match =
      raw.match(
        /^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/
      );

    if (
      match
    ) {
      const month =
        monthMap[
          match[2]
        ];

      if (
        month
      ) {
        return buildUtcDate(
          match[3],
          month,
          match[1]
        );
      }
    }

    /* -----------------------------------------------------
       October 10 2026
       Oct 10 2026
    ----------------------------------------------------- */

    match =
      raw.match(
        /^([a-z]+)\s+(\d{1,2})\s+(\d{4})$/
      );

    if (
      match
    ) {
      const month =
        monthMap[
          match[1]
        ];

      if (
        month
      ) {
        return buildUtcDate(
          match[3],
          month,
          match[2]
        );
      }
    }

    return null;
  };

/* =========================================================
   SKILLS
========================================================= */

const parseSkills =
  (
    value
  ) =>
    String(
      value || ""
    )
      .split(
        /[,;|]/
      )
      .map(
        normalize
      )
      .filter(
        Boolean
      )
      .filter(
        (
          skill,
          index,
          array
        ) =>
          array.findIndex(
            (
              candidate
            ) =>
              candidate
                .toLowerCase() ===
              skill
                .toLowerCase()
          ) ===
          index
      );

/* =========================================================
   PARSE REQUEST
========================================================= */

const parseManpowerRequest =
  (
    text
  ) => {
    if (
      !isManpowerRequest(
        text
      )
    ) {
      return {
        isManpowerRequest:
          false,
      };
    }

    const fields =
      extractFields(
        text
      );

    /*
     * Normalize department before it reaches the service.
     *
     * The service still performs the authoritative MongoDB
     * Department lookup.
     */

    if (
      fields.department
    ) {
      fields.department =
        normalizeDepartment(
          fields.department
        );
    }

    const errors =
      [];

    /*
     * Skills remains optional, matching the existing parser.
     */

    const requiredTextFields = [
      [
        "department",
        "Department",
      ],

      [
        "positionTitle",
        "Position",
      ],

      [
        "numberOfOpenings",
        "Openings",
      ],

      [
        "experience",
        "Experience",
      ],

      [
        "employmentType",
        "Employment Type",
      ],

      [
        "shiftAvailability",
        "Shift",
      ],

      [
        "location",
        "Location",
      ],

      [
        "monthlySalary",
        "Monthly Salary",
      ],

      [
        "requiredByDate",
        "Required By",
      ],

      [
        "priority",
        "Priority",
      ],

      [
        "reason",
        "Reason",
      ],
    ];

    for (
      const [
        field,
        label,
      ] of requiredTextFields
    ) {
      if (
        !fields[field]
      ) {
        errors.push(
          `${label} is required`
        );
      }
    }

    /* -----------------------------------------------------
       OPENINGS
    ----------------------------------------------------- */

    const openings =
      numberOf(
        fields.numberOfOpenings
      );

    if (
      fields.numberOfOpenings &&
      (
        !Number.isInteger(
          openings
        ) ||
        openings <
          1
      )
    ) {
      errors.push(
        "Openings must be at least 1"
      );
    }

    /* -----------------------------------------------------
       EXPERIENCE
    ----------------------------------------------------- */

    const experience =
      parseExperience(
        fields.experience
      );

    if (
      fields.experience &&
      experience.min ===
        null
    ) {
      errors.push(
        "Experience format is invalid"
      );
    }

    if (
      experience.min !==
        null &&
      experience.max !==
        null &&
      experience.max <
        experience.min
    ) {
      errors.push(
        "Maximum Experience cannot be less than Minimum Experience"
      );
    }

    /* -----------------------------------------------------
       SALARY
    ----------------------------------------------------- */

    const salary =
      parseSalary(
        fields.monthlySalary
      );

    if (
      fields.monthlySalary &&
      (
        salary.min ===
          null ||
        salary.max ===
          null ||
        salary.min <
          0 ||
        salary.max <
          salary.min
      )
    ) {
      errors.push(
        "Monthly Salary format is invalid"
      );
    }

    /* -----------------------------------------------------
       EMPLOYMENT
    ----------------------------------------------------- */

    const employmentType =
      parseEmployment(
        fields.employmentType
      );

    if (
      fields.employmentType &&
      !employmentType
    ) {
      errors.push(
        "Employment Type is invalid. Use Full Time, Part Time, Contract, Temporary or Intern"
      );
    }

    /* -----------------------------------------------------
       SHIFT
    ----------------------------------------------------- */

    const shiftAvailability =
      parseShift(
        fields.shiftAvailability
      );

    if (
      fields.shiftAvailability &&
      !shiftAvailability
    ) {
      errors.push(
        "Shift is invalid. Use General, Day, Night, Flexible or Any"
      );
    }

    /* -----------------------------------------------------
       PRIORITY
    ----------------------------------------------------- */

    const priority =
      parsePriority(
        fields.priority
      );

    if (
      fields.priority &&
      !priority
    ) {
      errors.push(
        "Priority is invalid. Use Low, Normal, High or Urgent"
      );
    }

    /* -----------------------------------------------------
       REQUIRED BY
    ----------------------------------------------------- */

    const requiredByDate =
      parseDate(
        fields.requiredByDate
      );

    if (
      fields.requiredByDate &&
      !requiredByDate
    ) {
      errors.push(
        "Required By date is invalid. Example: 10 October 2026, 10/10/2026 or 2026-10-10"
      );
    }

    /* -----------------------------------------------------
       SKILLS
    ----------------------------------------------------- */

    const requiredSkills =
      parseSkills(
        fields.requiredSkills
      );

    /* -----------------------------------------------------
       FINAL RESULT

       Contract remains compatible with existing service.
    ----------------------------------------------------- */

    return {
      isManpowerRequest:
        true,

      valid:
        errors.length ===
        0,

      errors,

      raw:
        fields,

      input: {
        positionTitle:
          fields.positionTitle,

        numberOfOpenings:
          openings,

        requiredSkills,

        minimumExperienceYears:
          experience.min,

        maximumExperienceYears:
          experience.max,

        monthlySalaryMin:
          salary.min,

        monthlySalaryMax:
          salary.max,

        budgetMin:
          salary.min !==
          null
            ? salary.min *
              12
            : null,

        budgetMax:
          salary.max !==
          null
            ? salary.max *
              12
            : null,

        currency:
          "INR",

        employmentType,

        shiftAvailability,

        location:
          fields.location,

        requiredByDate,

        reason:
          fields.reason,

        priority,
      },
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  REQUIRED_HEADER,

  getManpowerTemplate,

  isManpowerRequest,

  parseManpowerRequest,

  /*
   * Exported helpers are useful for unit testing.
   * Existing imports remain unaffected.
   */

  normalizeDepartment,

  parseDate,

  parseSalary,

  parseExperience,
};
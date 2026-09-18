/* =========================================================
   DATE
========================================================= */

export const pad2 = (
  value
) => {
  return String(
    value
  ).padStart(
    2,
    "0"
  );
};

export const toDateKey = (
  value
) => {
  if (!value) {
    return "";
  }

  if (
    typeof value ===
      "string" &&
    /^\d{4}-\d{2}-\d{2}/.test(
      value
    )
  ) {
    return value.slice(
      0,
      10
    );
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
    return "";
  }

  return [
    date.getFullYear(),

    pad2(
      date.getMonth() +
        1
    ),

    pad2(
      date.getDate()
    ),
  ].join("-");
};

export const todayKey =
  () => {
    return toDateKey(
      new Date()
    );
};

/* =========================================================
   DATE FORMAT
========================================================= */

export const formatDateLong = (
  value
) => {
  const key =
    toDateKey(
      value
    );

  if (!key) {
    return "—";
  }

  const [
    year,
    month,
    day,
  ] =
    key
      .split("-")
      .map(
        Number
      );

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      weekday:
        "short",

      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",
    }
  ).format(
    new Date(
      year,
      month - 1,
      day
    )
  );
};

export const formatTime = (
  value
) => {
  if (!value) {
    return "—";
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
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      hour:
        "2-digit",

      minute:
        "2-digit",

      hour12:
        true,
    }
  ).format(
    date
  );
};

/* =========================================================
   TEXT
========================================================= */

export const cleanText = (
  value
) => {
  return String(
    value || ""
  ).trim();
};

export const textPreview = (
  value,
  length = 90
) => {
  const text =
    cleanText(
      value
    );

  if (!text) {
    return "—";
  }

  if (
    text.length <=
    length
  ) {
    return text;
  }

  return (
    text.slice(
      0,
      length
    ) +
    "…"
  );
};

/* =========================================================
   EMPLOYEE
========================================================= */

export const employeeIdOf = (
  item
) => {
  return (
    item
      ?.employeeId
      ?._id ||

    (
      typeof item
        ?.employeeId ===
        "string"
        ? item.employeeId
        : ""
    ) ||

    item
      ?.employee
      ?._id ||

    item?._id ||

    item?.id ||

    ""
  );
};

export const employeeNameOf = (
  item
) => {
  return (
    item
      ?.employeeName ||

    item
      ?.displayName ||

    item?.name ||

    item
      ?.employeeId
      ?.displayName ||

    item
      ?.employeeId
      ?.name ||

    "Employee"
  );
};

export const employeeEmailOf = (
  item
) => {
  return (
    item
      ?.employeeEmail ||

    item
      ?.companyEmail ||

    item?.email ||

    item
      ?.employeeId
      ?.email ||

    ""
  );
};

export const departmentOf = (
  item
) => {
  return (
    item
      ?.departmentName ||

    item
      ?.department
      ?.name ||

    item
      ?.departmentId
      ?.name ||

    item
      ?.organizationUnit
      ?.name ||

    item
      ?.employeeId
      ?.department
      ?.name ||

    "Not Assigned"
  );
};

export const designationOf = (
  item
) => {
  return (
    item
      ?.designationName ||

    item
      ?.designation
      ?.name ||

    item
      ?.employeeId
      ?.designation
      ?.name ||

    ""
  );
};

export const initials = (
  value = ""
) => {
  const words =
    String(
      value
    )
      .trim()
      .split(
        /\s+/
      )
      .filter(
        Boolean
      );

  if (
    !words.length
  ) {
    return "E";
  }

  if (
    words.length ===
    1
  ) {
    return words[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    words[0]
      .charAt(0) +
    words[
      words.length -
        1
    ].charAt(0)
  ).toUpperCase();
};

/* =========================================================
   REVIEW STATUS
========================================================= */

export const normalizeReviewStatus = (
  item
) => {
  const value =
    String(
      item
        ?.reviewStatus ||

      item
        ?.review
        ?.status ||

      item
        ?.status ||

      ""
    ).toUpperCase();

  if (
    value.includes(
      "APPROVED"
    ) ||
    value.includes(
      "REVIEWED"
    )
  ) {
    return "REVIEWED";
  }

  if (
    value.includes(
      "NEEDS"
    ) ||
    value.includes(
      "CHANGES"
    ) ||
    value.includes(
      "REJECT"
    )
  ) {
    return "NEEDS_ATTENTION";
  }

  return "SUBMITTED";
};

/* =========================================================
   STATUS LABEL
========================================================= */

export const statusLabel = (
  value
) => {
  const status =
    String(
      value || ""
    ).toUpperCase();

  const labels = {
    SUBMITTED:
      "Submitted",

    PENDING:
      "Pending",

    REVIEWED:
      "Reviewed",

    NEEDS_ATTENTION:
      "Needs Attention",

    FUTURE:
      "Future",
  };

  return (
    labels[
      status
    ] ||
    status
      .replaceAll(
        "_",
        " "
      ) ||
    "—"
  );
};

/* =========================================================
   BUILD DAILY MANAGEMENT ROWS

   Creates one row for every employee even when no report
   exists. This is essential for 180+ employee compliance.
========================================================= */

export const buildDailyTimesheetRows = (
  employees = [],
  reports = [],
  selectedDate
) => {
  const reportMap =
    new Map();

  reports.forEach(
    (
      report
    ) => {
      if (
        toDateKey(
          report
            ?.reportDate
        ) !==
        selectedDate
      ) {
        return;
      }

      const id =
        String(
          employeeIdOf(
            report
          )
        );

      if (!id) {
        return;
      }

      reportMap.set(
        id,
        report
      );
    }
  );

  return employees.map(
    (
      employee
    ) => {
      const id =
        String(
          employee?._id ||
          employee?.id ||
          ""
        );

      const report =
        reportMap.get(
          id
        ) ||
        null;

      return {
        employeeId:
          id,

        employee,

        report,

        name:
          employeeNameOf(
            employee
          ),

        email:
          employeeEmailOf(
            employee
          ),

        department:
          departmentOf(
            employee
          ),

        designation:
          designationOf(
            employee
          ),

        status:
          report
            ? normalizeReviewStatus(
                report
              )
            : "PENDING",
      };
    }
  );
};

/* =========================================================
   SUMMARY
========================================================= */

export const summarizeTimesheetRows = (
  rows = []
) => {
  const result = {
    total:
      rows.length,

    submitted:
      0,

    pending:
      0,

    reviewed:
      0,

    needsAttention:
      0,
  };

  rows.forEach(
    (
      row
    ) => {
      switch (
        row.status
      ) {
        case "SUBMITTED":
          result.submitted +=
            1;

          break;

        case "PENDING":
          result.pending +=
            1;

          break;

        case "REVIEWED":
          result.reviewed +=
            1;

          break;

        case "NEEDS_ATTENTION":
          result.needsAttention +=
            1;

          break;

        default:
          break;
      }
    }
  );

  return result;
};

export const percentage = (
  value,
  total
) => {
  const denominator =
    Number(
      total
    );

  if (
    !denominator
  ) {
    return 0;
  }

  return Math.round(
    (
      Number(
        value
      ) /
      denominator
    ) *
      100
  );
};
/* =========================================================
   DATE
========================================================= */

export const pad2 = (
  value
) =>
  String(
    value
  ).padStart(
    2,
    "0"
  );

export const toDateKey = (
  value
) => {
  if (
    !value
  ) {
    return "";
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      String(
        value
      )
    )
  ) {
    return String(
      value
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
  ].join(
    "-"
  );
};

export const todayKey = () =>
  toDateKey(
    new Date()
  );

/* =========================================================
   ADD DAYS
========================================================= */

export const addDays = (
  dateKey,
  count
) => {
  const [
    year,
    month,
    day,
  ] =
    dateKey
      .split("-")
      .map(
        Number
      );

  const date =
    new Date(
      year,
      month - 1,
      day +
        Number(
          count
        )
    );

  return toDateKey(
    date
  );
};

/* =========================================================
   MONDAY → SUNDAY
========================================================= */

export const weekRange = (
  value
) => {
  const key =
    toDateKey(
      value
    );

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

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  const weekday =
    date.getDay();

  const diff =
    weekday ===
      0
      ? -6
      : 1 -
        weekday;

  date.setDate(
    date.getDate() +
      diff
  );

  const from =
    toDateKey(
      date
    );

  return {
    from,

    to:
      addDays(
        from,
        6
      ),
  };
};

/* =========================================================
   MONTH
========================================================= */

export const monthRange = (
  value
) => {
  const date =
    value instanceof Date
      ? value
      : new Date(
          `${toDateKey(
            value
          )}T12:00:00`
        );

  const year =
    date.getFullYear();

  const month =
    date.getMonth();

  return {
    from:
      toDateKey(
        new Date(
          year,
          month,
          1
        )
      ),

    to:
      toDateKey(
        new Date(
          year,
          month +
            1,
          0
        )
      ),
  };
};

/* =========================================================
   FORMAT DATE
========================================================= */

export const formatDate = (
  value,
  options = {}
) => {
  if (
    !value
  ) {
    return "—";
  }

  const key =
    toDateKey(
      value
    );

  const date =
    new Date(
      `${key}T12:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date
    .toLocaleDateString(
      "en-IN",
      {
        day:
          "2-digit",

        month:
          "short",

        year:
          "numeric",

        ...options,
      }
    );
};

/* =========================================================
   TIME
========================================================= */

export const formatTime = (
  value
) => {
  if (
    !value
  ) {
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

  return date
    .toLocaleTimeString(
      "en-IN",
      {
        hour:
          "2-digit",

        minute:
          "2-digit",

        hour12:
          true,
      }
    );
};

/* =========================================================
   MINUTES
========================================================= */

export const formatMinutes = (
  value
) => {
  const total =
    Math.max(
      0,
      Number(
        value
      ) ||
      0
    );

  const hours =
    Math.floor(
      total /
      60
    );

  const minutes =
    total %
    60;

  if (
    !hours
  ) {
    return `${minutes}m`;
  }

  return `${hours}h ${pad2(
    minutes
  )}m`;
};

/* =========================================================
   STATUS
========================================================= */

export const statusLabel = (
  value
) => {
  const status =
    String(
      value ||
      ""
    ).toUpperCase();

  const map = {
    PRESENT:
      "Present",

    ABSENT:
      "Absent",

    HALF_DAY:
      "Half Day",

    ON_LEAVE:
      "On Leave",

    WEEK_OFF:
      "Week Off",

    HOLIDAY:
      "Holiday",

    NOT_MARKED:
      "Not Marked",

    NOT_APPLICABLE:
      "Not Applicable",
  };

  return (
    map[
      status
    ] ||
    status ||
    "Not Marked"
  );
};

/* =========================================================
   WORK MODE
========================================================= */

export const workModeLabel = (
  value
) => {
  const mode =
    String(
      value ||
      ""
    ).toUpperCase();

  const map = {
    OFFICE:
      "Office",

    WFH:
      "Work From Home",

    WORK_FROM_HOME:
      "Work From Home",

    REMOTE:
      "Work From Home",

    FIELD_VISIT:
      "Field Visit",

    VISIT:
      "Field Visit",

    ON_DUTY:
      "On Duty",
  };

  return (
    map[
      mode
    ] ||
    mode ||
    "Office"
  );
};

/* =========================================================
   NORMALIZE MODE

   Compatibility with earlier attendance code.
========================================================= */

export const normalizedMode = (
  record
) => {
  const value =
    String(
      record?.workMode ||
      "OFFICE"
    ).toUpperCase();

  if (
    [
      "REMOTE",
      "WORK_FROM_HOME",
    ].includes(
      value
    )
  ) {
    return "WFH";
  }

  if (
    value ===
    "VISIT"
  ) {
    return "FIELD_VISIT";
  }

  return value;
};

/* =========================================================
   INITIALS
========================================================= */

export const initials = (
  value
) => {
  return String(
    value ||
    "E"
  )
    .trim()
    .split(
      /\s+/
    )
    .slice(
      0,
      2
    )
    .map(
      (
        part
      ) =>
        part[0]
    )
    .join(
      ""
    )
    .toUpperCase();
};

/* =========================================================
   SOURCE
========================================================= */

export const attendanceSource = (
  record
) => {
  const source =
    String(
      record?.primarySource ||
      record?.source ||
      ""
    ).toUpperCase();

  const mode =
    normalizedMode(
      record
    );

  if (
    source.includes(
      "BIOMETRIC"
    ) ||
    source.includes(
      "ESSL"
    ) ||
    source.includes(
      "REALTIME"
    )
  ) {
    return "BIOMETRIC";
  }

  if (
    mode ===
      "FIELD_VISIT" ||
    mode ===
      "ON_DUTY"
  ) {
    return "FIELD";
  }

  if (
    mode ===
    "WFH"
  ) {
    return "WFH";
  }

  if (
    source.includes(
      "WEB"
    ) ||
    source.includes(
      "PWA"
    ) ||
    source.includes(
      "MOBILE"
    )
  ) {
    return "WEB";
  }

  return (
    source ||
    "OTHER"
  );
};

/* =========================================================
   RANGE LABEL
========================================================= */

export const rangeLabel = (
  from,
  to
) => {
  return `${formatDate(
    from
  )} — ${formatDate(
    to
  )}`;
};
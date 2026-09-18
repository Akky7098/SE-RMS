/* =========================================================
   DATE HELPERS
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

export const todayKey =
  () =>
    toDateKey(
      new Date()
    );

/* =========================================================
   DATE KEY TO DATE
========================================================= */

export const dateFromKey = (
  value
) => {
  const key =
    toDateKey(
      value
    );

  return new Date(
    `${key}T12:00:00`
  );
};

/* =========================================================
   ADD DAYS
========================================================= */

export const addDays = (
  value,
  days
) => {
  const date =
    dateFromKey(
      value
    );

  date.setDate(
    date.getDate() +
      Number(
        days
      )
  );

  return toDateKey(
    date
  );
};

/* =========================================================
   MONDAY
========================================================= */

export const startOfWeek = (
  value
) => {
  const date =
    dateFromKey(
      value
    );

  const current =
    date.getDay();

  const diff =
    current ===
      0
      ? -6
      : 1 -
        current;

  date.setDate(
    date.getDate() +
      diff
  );

  return toDateKey(
    date
  );
};

/* =========================================================
   WEEK DAYS
========================================================= */

export const weekDays = (
  weekStart
) => {
  const names = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return names.map(
    (
      name,
      index
    ) => {
      const date =
        addDays(
          weekStart,
          index
        );

      return {
        name,

        short:
          name.slice(
            0,
            3
          ),

        date,
      };
    }
  );
};

/* =========================================================
   DISPLAY DATE
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

  const date =
    dateFromKey(
      value
    );

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

export const weekLabel = (
  weekStart
) => {
  const weekEnd =
    addDays(
      weekStart,
      6
    );

  return `${formatDate(
    weekStart,
    {
      year:
        undefined,
    }
  )} — ${formatDate(
    weekEnd
  )}`;
};

/* =========================================================
   TIME
========================================================= */

export const formatShiftTime = (
  value
) => {
  if (
    !value
  ) {
    return "—";
  }

  const [
    hour,
    minute,
  ] =
    String(
      value
    )
      .split(":")
      .map(
        Number
      );

  if (
    !Number.isFinite(
      hour
    )
  ) {
    return value;
  }

  const date =
    new Date();

  date.setHours(
    hour,
    minute ||
      0,
    0,
    0
  );

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
   SHIFT LABEL
========================================================= */

export const shiftLabel = (
  shift
) => {
  if (
    !shift
  ) {
    return "Not Assigned";
  }

  return (
    shift.name ||
    shift.code ||
    "Shift"
  );
};

export const shiftTiming = (
  shift
) => {
  if (
    !shift
  ) {
    return "";
  }

  return `${formatShiftTime(
    shift.startTime
  )} – ${formatShiftTime(
    shift.endTime
  )}`;
};

/* =========================================================
   ROSTER STATUS
========================================================= */

export const rosterStatusLabel = (
  value
) => {
  const status =
    String(
      value ||
      "DRAFT"
    ).toUpperCase();

  const map = {
    DRAFT:
      "Draft",

    SUBMITTED:
      "Submitted",

    PUBLISHED:
      "Published",

    REOPENED:
      "Reopened",
  };

  return (
    map[
      status
    ] ||
    status
  );
};

/* =========================================================
   DAY TYPE
========================================================= */

export const dayTypeLabel = (
  value
) => {
  const type =
    String(
      value ||
      "SHIFT"
    ).toUpperCase();

  const map = {
    SHIFT:
      "Shift",

    WEEK_OFF:
      "Week Off",

    HOLIDAY:
      "Holiday",

    LEAVE:
      "Leave",

    NOT_APPLICABLE:
      "N/A",
  };

  return (
    map[
      type
    ] ||
    type
  );
};

/* =========================================================
   EMPLOYEE
========================================================= */

export const initials = (
  value
) =>
  String(
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
        item
      ) =>
        item[0]
    )
    .join(
      ""
    )
    .toUpperCase();

/* =========================================================
   ASSIGNMENT KEY
========================================================= */

export const assignmentKey = (
  employeeId,
  date
) =>
  `${String(
    employeeId
  )}::${date}`;

/* =========================================================
   NORMALIZE ROSTER
========================================================= */

export const normalizeRoster = (
  response
) => {
  const roster =
    response?.roster ||
    response ||
    {};

  return {
    roster:
      roster?.roster ||
      (
        roster?._id
          ? roster
          : null
      ),

    employees:
      response?.employees ||
      roster?.employees ||
      [],

    assignments:
      response?.assignments ||
      roster?.assignments ||
      [],

    scope:
      response?.scope ||
      roster?.scope ||
      {},
  };
};
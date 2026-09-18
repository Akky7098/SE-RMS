/* =========================================================
   SHIFT CALENDAR UTILITIES

   STANDARD WEEK:

   Monday
   →
   Sunday

   IMPORTANT:

   Calendar week is completely independent from month.

   Example:

   Monday     2026-08-31
   Tuesday    2026-09-01
   ...
   Sunday     2026-09-06

   This is ONE roster week.
========================================================= */

const DATE_KEY_REGEX =
  /^\d{4}-\d{2}-\d{2}$/;

/* =========================================================
   PAD
========================================================= */

const pad =
  (
    value
  ) =>
    String(
      value
    ).padStart(
      2,
      "0"
    );

/* =========================================================
   VALIDATE DATE KEY
========================================================= */

const isValidDateKey =
  (
    value
  ) => {
    if (
      !DATE_KEY_REGEX.test(
        String(
          value ||
          ""
        )
      )
    ) {
      return false;
    }

    const [
      year,
      month,
      day,
    ] =
      value
        .split("-")
        .map(Number);

    const date =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      );

    return (
      date.getUTCFullYear() ===
        year &&
      date.getUTCMonth() ===
        month - 1 &&
      date.getUTCDate() ===
        day
    );
  };

/* =========================================================
   ASSERT DATE KEY
========================================================= */

const assertDateKey =
  (
    value,
    fieldName =
      "date"
  ) => {
    if (
      !isValidDateKey(
        value
      )
    ) {
      const error =
        new Error(
          `${fieldName} must be a valid YYYY-MM-DD date.`
        );

      error.statusCode =
        400;

      throw error;
    }

    return value;
  };

/* =========================================================
   DATE KEY → UTC DATE

   Used ONLY for date arithmetic.
========================================================= */

const dateKeyToUtcDate =
  (
    dateKey
  ) => {
    assertDateKey(
      dateKey
    );

    const [
      year,
      month,
      day,
    ] =
      dateKey
        .split("-")
        .map(Number);

    return new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );
  };

/* =========================================================
   UTC DATE → DATE KEY
========================================================= */

const utcDateToDateKey =
  (
    date
  ) => {
    return [
      date.getUTCFullYear(),
      pad(
        date.getUTCMonth() +
        1
      ),
      pad(
        date.getUTCDate()
      ),
    ].join(
      "-"
    );
  };

/* =========================================================
   ADD DAYS
========================================================= */

const addDays =
  (
    dateKey,
    days
  ) => {
    const date =
      dateKeyToUtcDate(
        dateKey
      );

    date.setUTCDate(
      date.getUTCDate() +
        Number(
          days
        )
    );

    return utcDateToDateKey(
      date
    );
  };

/* =========================================================
   MONDAY OF WEEK

   JS:
   Sunday = 0
   Monday = 1
   Tuesday = 2
   ...
   Saturday = 6

   We convert to Monday-based week.
========================================================= */

const getWeekStart =
  (
    dateKey
  ) => {
    const date =
      dateKeyToUtcDate(
        dateKey
      );

    const day =
      date.getUTCDay();

    const daysSinceMonday =
      day ===
        0
        ? 6
        : day - 1;

    date.setUTCDate(
      date.getUTCDate() -
        daysSinceMonday
    );

    return utcDateToDateKey(
      date
    );
  };

/* =========================================================
   SUNDAY OF WEEK
========================================================= */

const getWeekEnd =
  (
    dateKey
  ) => {
    const weekStart =
      getWeekStart(
        dateKey
      );

    return addDays(
      weekStart,
      6
    );
  };

/* =========================================================
   WEEK RANGE
========================================================= */

const getWeekRange =
  (
    dateKey
  ) => {
    const weekStartDate =
      getWeekStart(
        dateKey
      );

    const weekEndDate =
      addDays(
        weekStartDate,
        6
      );

    return {
      weekStartDate,

      weekEndDate,
    };
  };

/* =========================================================
   WEEK DATES

   Always exactly 7 days.
========================================================= */

const getWeekDates =
  (
    dateKey
  ) => {
    const {
      weekStartDate,
      weekEndDate,
    } =
      getWeekRange(
        dateKey
      );

    const dates =
      [];

    for (
      let index = 0;
      index < 7;
      index += 1
    ) {
      dates.push(
        addDays(
          weekStartDate,
          index
        )
      );
    }

    return {
      weekStartDate,

      weekEndDate,

      dates,
    };
  };

/* =========================================================
   DAY NAME
========================================================= */

const getDayName =
  (
    dateKey
  ) => {
    const day =
      dateKeyToUtcDate(
        dateKey
      ).getUTCDay();

    const names = [
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ];

    return names[
      day
    ];
  };

/* =========================================================
   DATE WITHIN RANGE
========================================================= */

const isDateWithinRange =
  (
    dateKey,
    startDate,
    endDate
  ) => {
    assertDateKey(
      dateKey
    );

    assertDateKey(
      startDate
    );

    assertDateKey(
      endDate
    );

    /*
     * YYYY-MM-DD strings sort chronologically.
     */
    return (
      dateKey >=
        startDate &&
      dateKey <=
        endDate
    );
  };

/* =========================================================
   ISO WEEK

   Used only for display/search.

   Source of truth remains:
   weekStartDate + weekEndDate.
========================================================= */

const getIsoWeekInfo =
  (
    dateKey
  ) => {
    const date =
      dateKeyToUtcDate(
        dateKey
      );

    /*
     * ISO week uses Thursday to determine week-year.
     */
    const day =
      date.getUTCDay() ||
      7;

    date.setUTCDate(
      date.getUTCDate() +
        4 -
        day
    );

    const weekYear =
      date.getUTCFullYear();

    const yearStart =
      new Date(
        Date.UTC(
          weekYear,
          0,
          1
        )
      );

    const weekNumber =
      Math.ceil(
        (
          (
            date -
            yearStart
          ) /
            86400000 +
          1
        ) /
          7
      );

    return {
      weekYear,

      weekNumber,

      weekKey:
        `${weekYear}-W${pad(
          weekNumber
        )}`,
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  DATE_KEY_REGEX,

  isValidDateKey,

  assertDateKey,

  addDays,

  getWeekStart,

  getWeekEnd,

  getWeekRange,

  getWeekDates,

  getDayName,

  isDateWithinRange,

  getIsoWeekInfo,
};
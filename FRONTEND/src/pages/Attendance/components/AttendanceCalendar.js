import React, {
  useMemo,
} from "react";

import {
  pad2,
} from "../utils/attendanceHelpers";

/* =========================================================
   MONTH NAMES
========================================================= */

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/* =========================================================
   WEEK LABELS
========================================================= */

const WEEK_DAYS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

/* =========================================================
   ATTENDANCE CALENDAR
========================================================= */

const AttendanceCalendar = ({
  year,
  month,
  selectedDate,
  todayDate,
  daySummary = {},
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
}) => {
  /* =====================================================
     CALENDAR CELLS
  ===================================================== */

  const cells =
    useMemo(() => {
      const firstDay =
        new Date(
          year,
          month,
          1
        ).getDay();

      const totalDays =
        new Date(
          year,
          month + 1,
          0
        ).getDate();

      const result = [];

      /*
       * Leading empty cells.
       */
      for (
        let index = 0;
        index < firstDay;
        index += 1
      ) {
        result.push({
          type:
            "empty",

          key:
            `empty-${index}`,
        });
      }

      /*
       * Real month days.
       */
      for (
        let day = 1;
        day <= totalDays;
        day += 1
      ) {
        const dateKey =
          `${year}-${pad2(
            month + 1
          )}-${pad2(day)}`;

        result.push({
          type:
            "day",

          day,

          dateKey,

          weekday:
            new Date(
              year,
              month,
              day
            ).getDay(),
        });
      }

      return result;
    }, [
      year,
      month,
    ]);

  /* =====================================================
     MONTH LEVEL SUMMARY
  ===================================================== */

  const monthStats =
    useMemo(() => {
      let totalWorking =
        0;

      let totalAbsent =
        0;

      let totalExceptions =
        0;

      let daysWithData =
        0;

      Object.values(
        daySummary
      ).forEach(
        (
          summary
        ) => {
          if (
            !summary ||
            !summary.total
          ) {
            return;
          }

          daysWithData +=
            1;

          totalWorking +=
            (
              summary.present ||
              0
            ) +
            (
              summary.remote ||
              0
            ) +
            (
              summary.visit ||
              0
            ) +
            (
              summary.onDuty ||
              0
            ) +
            (
              summary.late ||
              0
            ) +
            (
              summary.short ||
              0
            );

          totalAbsent +=
            summary.absent ||
            0;

          totalExceptions +=
            (
              summary.absent ||
              0
            ) +
            (
              summary.late ||
              0
            ) +
            (
              summary.short ||
              0
            ) +
            (
              summary.missing ||
              0
            );
        }
      );

      return {
        daysWithData,
        totalWorking,
        totalAbsent,
        totalExceptions,
      };
    }, [
      daySummary,
    ]);

  /* =====================================================
     SAFE HANDLERS
  ===================================================== */

  const handlePrevious =
    () => {
      if (
        typeof onPreviousMonth ===
        "function"
      ) {
        onPreviousMonth();
      }
    };

  const handleNext =
    () => {
      if (
        typeof onNextMonth ===
        "function"
      ) {
        onNextMonth();
      }
    };

  const handleSelect =
    (
      dateKey,
      future
    ) => {
      if (
        future
      ) {
        return;
      }

      if (
        typeof onSelectDate ===
        "function"
      ) {
        onSelectDate(
          dateKey
        );
      }
    };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <section className="se-att-calendar">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="se-att-calendar-heading">
        <div className="se-att-calendar-title">
          <span>
            ATTENDANCE CALENDAR
          </span>

          <h3>
            {MONTH_NAMES[
              month
            ]}{" "}
            {year}
          </h3>

          <p>
            Select any date to
            inspect attendance.
          </p>
        </div>

        <div className="se-att-calendar-navigation">
          <button
            type="button"
            onClick={
              handlePrevious
            }
            aria-label="Previous month"
            title="Previous month"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={
              handleNext
            }
            aria-label="Next month"
            title="Next month"
          >
            ›
          </button>
        </div>
      </div>

      {/* =================================================
          MONTH SNAPSHOT
      ================================================= */}

      <div className="se-att-calendar-month-summary">
        <div>
          <span>
            DAYS
          </span>

          <strong>
            {
              monthStats.daysWithData
            }
          </strong>
        </div>

        <div>
          <span>
            ACTIVE
          </span>

          <strong>
            {
              monthStats.totalWorking
            }
          </strong>
        </div>

        <div>
          <span>
            ABSENT
          </span>

          <strong>
            {
              monthStats.totalAbsent
            }
          </strong>
        </div>

        <div>
          <span>
            EXCEPTIONS
          </span>

          <strong>
            {
              monthStats.totalExceptions
            }
          </strong>
        </div>
      </div>

      {/* =================================================
          WEEK HEADER
      ================================================= */}

      <div className="se-att-calendar-weekdays">
        {WEEK_DAYS.map(
          (
            label
          ) => (
            <span
              key={
                label
              }
            >
              {label}
            </span>
          )
        )}
      </div>

      {/* =================================================
          CALENDAR GRID
      ================================================= */}

      <div className="se-att-calendar-grid">
        {cells.map(
          (
            cell
          ) => {
            if (
              cell.type ===
              "empty"
            ) {
              return (
                <span
                  key={
                    cell.key
                  }
                  className="se-att-calendar-empty"
                />
              );
            }

            const {
              day,
              dateKey,
              weekday,
            } = cell;

            const summary =
              daySummary[
                dateKey
              ] ||
              {};

            const selected =
              dateKey ===
              selectedDate;

            const today =
              dateKey ===
              todayDate;

            const future =
              dateKey >
              todayDate;

            const sunday =
              weekday ===
              0;

            const total =
              Number(
                summary.total ||
                0
              );

            const present =
              Number(
                summary.present ||
                0
              );

            const remote =
              Number(
                summary.remote ||
                0
              );

            const visit =
              Number(
                summary.visit ||
                0
              );

            const onDuty =
              Number(
                summary.onDuty ||
                0
              );

            const late =
              Number(
                summary.late ||
                0
              );

            const short =
              Number(
                summary.short ||
                0
              );

            const absent =
              Number(
                summary.absent ||
                0
              );

            const missing =
              Number(
                summary.missing ||
                0
              );

            const active =
              present +
              remote +
              visit +
              onDuty +
              late +
              short;

            const exceptions =
              absent +
              late +
              short +
              missing;

            const attendanceRate =
              total > 0
                ? Math.round(
                    (
                      active /
                      total
                    ) *
                      100
                  )
                : 0;

            const hasData =
              total > 0;

            const className =
              [
                "se-att-calendar-day",

                selected
                  ? "selected"
                  : "",

                today
                  ? "today"
                  : "",

                future
                  ? "future"
                  : "",

                sunday
                  ? "week-off"
                  : "",

                hasData &&
                exceptions >
                  0
                  ? "has-exception"
                  : "",

                hasData &&
                exceptions ===
                  0
                  ? "healthy"
                  : "",
              ]
                .filter(
                  Boolean
                )
                .join(" ");

            return (
              <button
                type="button"
                key={
                  dateKey
                }
                disabled={
                  future
                }
                className={
                  className
                }
                onClick={() =>
                  handleSelect(
                    dateKey,
                    future
                  )
                }
              >
                {/* =========================================
                    DATE
                ========================================= */}

                <div className="se-att-calendar-day-top">
                  <span className="se-att-calendar-date-number">
                    {day}
                  </span>

                  {today ? (
                    <i className="se-att-calendar-today-label">
                      TODAY
                    </i>
                  ) : null}
                </div>

                {/* =========================================
                    CONTENT
                ========================================= */}

                {!future &&
                hasData ? (
                  <div className="se-att-calendar-day-data">
                    <div className="se-att-calendar-rate-row">
                      <strong>
                        {
                          attendanceRate
                        }
                        %
                      </strong>

                      <small>
                        {
                          active
                        }
                        /
                        {
                          total
                        }
                      </small>
                    </div>

                    <div className="se-att-calendar-progress">
                      <span
                        style={{
                          width:
                            `${attendanceRate}%`,
                        }}
                      />
                    </div>

                    <div className="se-att-calendar-day-foot">
                      {exceptions >
                      0 ? (
                        <span className="exception">
                          {
                            exceptions
                          }{" "}
                          exception
                          {exceptions >
                          1
                            ? "s"
                            : ""}
                        </span>
                      ) : (
                        <span className="healthy">
                          Clear
                        </span>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* =========================================
                    WEEK OFF
                ========================================= */}

                {!future &&
                !hasData &&
                sunday ? (
                  <div className="se-att-calendar-weekoff">
                    Week Off
                  </div>
                ) : null}

                {/* =========================================
                    NO DATA
                ========================================= */}

                {!future &&
                !hasData &&
                !sunday ? (
                  <div className="se-att-calendar-no-data">
                    No data
                  </div>
                ) : null}
              </button>
            );
          }
        )}
      </div>

      {/* =================================================
          LEGEND
      ================================================= */}

      <div className="se-att-calendar-legend">
        <span>
          <i className="healthy" />
          Healthy
        </span>

        <span>
          <i className="exception" />
          Exception
        </span>

        <span>
          <i className="today" />
          Today
        </span>
      </div>
    </section>
  );
};

export default AttendanceCalendar;
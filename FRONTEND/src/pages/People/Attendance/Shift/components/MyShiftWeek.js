import React, {
  useMemo,
} from "react";

import {
  weekDays,
} from "../utils/shiftHelpers";

/* =========================================================
   HELPERS
========================================================= */

const normalize = (
  value
) =>
  String(
    value ||
    ""
  )
    .trim()
    .toUpperCase();

/* =========================================================
   SHIFT ID
========================================================= */

const getShiftId = (
  assignment
) =>
  String(
    assignment
      ?.shiftId
      ?._id ||
    assignment
      ?.shiftId ||
    ""
  );

/* =========================================================
   FORMAT TIME
========================================================= */

const formatTime = (
  value
) => {
  if (
    !value
  ) {
    return "";
  }

  const [
    rawHour,
    rawMinute,
  ] =
    String(
      value
    ).split(
      ":"
    );

  const hour =
    Number(
      rawHour
    );

  const minute =
    rawMinute ||
    "00";

  if (
    Number.isNaN(
      hour
    )
  ) {
    return value;
  }

  const suffix =
    hour >=
      12
      ? "PM"
      : "AM";

  const displayHour =
    hour % 12 ||
    12;

  return `${String(
    displayHour
  ).padStart(
    2,
    "0"
  )}:${minute} ${suffix}`;
};

/* =========================================================
   COMPONENT
========================================================= */

function MyShiftWeek({
  weekStart,

  assignments = [],

  shifts = [],

  loading = false,
}) {
  /* =======================================================
     SAFE ARRAYS
  ======================================================= */

  const safeAssignments =
    Array.isArray(
      assignments
    )
      ? assignments
      : [];

  const safeShifts =
    Array.isArray(
      shifts
    )
      ? shifts
      : [];

  /* =======================================================
     DAYS
  ======================================================= */

  const days =
    useMemo(
      () => {
        const result =
          weekDays(
            weekStart
          );

        return Array.isArray(
          result
        )
          ? result
          : [];
      },
      [
        weekStart,
      ]
    );

  /* =======================================================
     ASSIGNMENT MAP

     My Shift API returns only authenticated employee's
     published exceptions.

     Therefore one assignment per date is enough here.
  ======================================================= */

  const assignmentMap =
    useMemo(
      () => {
        const map =
          new Map();

        safeAssignments.forEach(
          (
            assignment
          ) => {
            const date =
              String(
                assignment
                  ?.assignmentDate ||
                ""
              );

            if (
              date
            ) {
              map.set(
                date,
                assignment
              );
            }
          }
        );

        return map;
      },
      [
        safeAssignments,
      ]
    );

  /* =======================================================
     SHIFT MAP
  ======================================================= */

  const shiftMap =
    useMemo(
      () => {
        const map =
          new Map();

        safeShifts.forEach(
          (
            shift
          ) => {
            const id =
              String(
                shift?._id ||
                ""
              );

            if (
              id
            ) {
              map.set(
                id,
                shift
              );
            }
          }
        );

        return map;
      },
      [
        safeShifts,
      ]
    );

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading
  ) {
    return (
      <section className="se-shift-my-week">

        <div className="se-shift-section-head">

          <div>

            <span>
              MY SHIFT
            </span>

            <h2>
              Weekly schedule
            </h2>

            <p>
              Loading your published schedule...
            </p>

          </div>

        </div>

        <div className="se-shift-my-loading">

          <span />

          <span />

          <span />

          <span />

          <span />

          <span />

          <span />

        </div>

      </section>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <section className="se-shift-my-week">

      <div className="se-shift-section-head">

        <div>

          <span>
            MY SHIFT
          </span>

          <h2>
            Weekly schedule
          </h2>

          <p>
            Your published working schedule for this week.
          </p>

        </div>

      </div>

      <div className="se-shift-my-grid">

        {days.map(
          (
            day
          ) => {
            const assignment =
              assignmentMap.get(
                day.date
              );

            /* =================================================
               NO EXCEPTION

               IMPORTANT:
               Blank roster does NOT mean unassigned.

               It means employee continues normal Day Shift.
            ================================================= */

            if (
              !assignment
            ) {
              return (
                <article
                  key={
                    day.date
                  }
                  className="se-shift-my-day se-shift-my-day--normal"
                >

                  <header>

                    <span>
                      {
                        day.short
                      }
                    </span>

                    <strong>
                      {
                        String(
                          day.date
                        )
                          .split(
                            "-"
                          )[2]
                      }
                    </strong>

                  </header>

                  <div className="se-shift-my-code se-shift-my-code--day">
                    DAY
                  </div>

                  <strong className="se-shift-my-name">
                    Normal Day Shift
                  </strong>

                  <small>
                    Regular working schedule
                  </small>

                </article>
              );
            }

            const dayType =
              normalize(
                assignment
                  ?.dayType
              );

            /* =================================================
               WEEK OFF
            ================================================= */

            if (
              dayType ===
              "WEEK_OFF"
            ) {
              return (
                <article
                  key={
                    day.date
                  }
                  className="se-shift-my-day se-shift-my-day--off"
                >

                  <header>

                    <span>
                      {
                        day.short
                      }
                    </span>

                    <strong>
                      {
                        String(
                          day.date
                        )
                          .split(
                            "-"
                          )[2]
                      }
                    </strong>

                  </header>

                  <div className="se-shift-my-code muted">
                    WO
                  </div>

                  <strong className="se-shift-my-name">
                    Week Off
                  </strong>

                  <small>
                    Scheduled weekly off
                  </small>

                </article>
              );
            }

            /* =================================================
               HOLIDAY
            ================================================= */

            if (
              dayType ===
              "HOLIDAY"
            ) {
              return (
                <article
                  key={
                    day.date
                  }
                  className="se-shift-my-day se-shift-my-day--holiday"
                >

                  <header>

                    <span>
                      {
                        day.short
                      }
                    </span>

                    <strong>
                      {
                        String(
                          day.date
                        )
                          .split(
                            "-"
                          )[2]
                      }
                    </strong>

                  </header>

                  <div className="se-shift-my-code se-shift-my-code--holiday">
                    H
                  </div>

                  <strong className="se-shift-my-name">
                    Holiday
                  </strong>

                  <small>
                    Scheduled holiday
                  </small>

                </article>
              );
            }

            /* =================================================
               LEAVE
            ================================================= */

            if (
              dayType ===
              "LEAVE"
            ) {
              return (
                <article
                  key={
                    day.date
                  }
                  className="se-shift-my-day"
                >

                  <header>

                    <span>
                      {
                        day.short
                      }
                    </span>

                    <strong>
                      {
                        String(
                          day.date
                        )
                          .split(
                            "-"
                          )[2]
                      }
                    </strong>

                  </header>

                  <div className="se-shift-my-code muted">
                    L
                  </div>

                  <strong className="se-shift-my-name">
                    Leave
                  </strong>

                  <small>
                    Approved leave
                  </small>

                </article>
              );
            }

            /* =================================================
               SHIFT
            ================================================= */

            const shiftId =
              getShiftId(
                assignment
              );

            const shift =
              shiftMap.get(
                shiftId
              ) ||
              (
                typeof assignment
                  ?.shiftId ===
                  "object"
                  ? assignment
                      .shiftId
                  : null
              );

            const shiftCode =
              shift?.code ||
              assignment
                ?.shiftCode ||
              "SHIFT";

            const shiftName =
              shift?.name ||
              assignment
                ?.shiftName ||
              "Assigned Shift";

            const shiftType =
              normalize(
                shift?.type ||
                ""
              );

            const isNight =
              shiftType ===
                "NIGHT" ||
              Boolean(
                shift
                  ?.crossesMidnight
              ) ||
              normalize(
                shiftCode
              ).includes(
                "NIGHT"
              );

            const startTime =
              shift?.startTime ||
              assignment
                ?.shiftStartTime;

            const endTime =
              shift?.endTime ||
              assignment
                ?.shiftEndTime;

            return (
              <article
                key={
                  day.date
                }
                className={
                  `se-shift-my-day ${
                    isNight
                      ? "se-shift-my-day--night"
                      : "se-shift-my-day--shift"
                  }`
                }
              >

                <header>

                  <span>
                    {
                      day.short
                    }
                  </span>

                  <strong>
                    {
                      String(
                        day.date
                      )
                        .split(
                          "-"
                        )[2]
                    }
                  </strong>

                </header>

                <div
                  className={
                    `se-shift-my-code ${
                      isNight
                        ? "se-shift-my-code--night"
                        : ""
                    }`
                  }
                >
                  {
                    shiftCode
                  }
                </div>

                <strong className="se-shift-my-name">
                  {
                    shiftName
                  }
                </strong>

                <small>

                  {startTime &&
                  endTime
                    ? `${formatTime(
                        startTime
                      )} → ${formatTime(
                        endTime
                      )}`
                    : "Assigned schedule"}

                </small>

              </article>
            );
          }
        )}

      </div>

    </section>
  );
}

export default MyShiftWeek;
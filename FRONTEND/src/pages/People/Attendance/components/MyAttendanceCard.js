import React from "react";

import AttendanceStatusBadge from "./AttendanceStatusBadge";

import {
  formatMinutes,
  formatTime,
  workModeLabel,
} from "../utils/attendanceHelpers";

function MyAttendanceCard({
  attendance,

  liveWorkedTime = null,

  loading,

  onRegularize,

  canRegularize,
}) {
  if (
    loading
  ) {
    return (
      <section className="se-people-att-my-card">
        <div className="se-people-att-loading">
          <span />

          Loading your attendance…
        </div>
      </section>
    );
  }

  return (
    <section className="se-people-att-my-card">

      <div className="se-people-att-my-copy">

        <span>
          MY ATTENDANCE
        </span>

        <h2>
          Today's working day
        </h2>

        <p>
          Your biometric and approved web attendance are combined into one daily record.
        </p>

      </div>

      <div className="se-people-att-my-grid">

        <article>
          <small>
            STATUS
          </small>

          <AttendanceStatusBadge
            status={
              attendance
                ?.presenceStatus ||
              "NOT_MARKED"
            }
          />
        </article>

        <article>
          <small>
            CHECK IN
          </small>

          <strong>
            {formatTime(
              attendance?.firstInAt ||
              attendance?.firstIn
                ?.time
            )}
          </strong>
        </article>

        <article>
          <small>
            CHECK OUT
          </small>

          <strong>
            {formatTime(
              attendance?.lastOutAt ||
              attendance?.lastOut
                ?.time
            )}
          </strong>
        </article>

        <article
          className={
            liveWorkedTime
              ? "se-att-my-stat--working"
              : ""
          }
        >
          <small>
            WORKING
          </small>

          <strong
            className={
              liveWorkedTime
                ? "se-att-my-live-working"
                : ""
            }
          >
            {liveWorkedTime ||
              formatMinutes(
                attendance
                  ?.totalWorkingMinutes
              )}
          </strong>

          {liveWorkedTime ? (
            <span className="se-att-my-live-working-label">
              LIVE · HH:MM:SS
            </span>
          ) : null}
        </article>

        <article>
          <small>
            MODE
          </small>

          <strong>
            {workModeLabel(
              attendance?.workMode
            )}
          </strong>
        </article>

        <article>
          <small>
            SHIFT
          </small>

          <strong>
            {
              attendance
                ?.shiftName ||
              attendance
                ?.shiftCode ||
              "—"
            }
          </strong>
        </article>

      </div>

      {canRegularize &&
      attendance?._id ? (
        <div className="se-people-att-my-actions">
          <button
            type="button"
            className="se-people-att-secondary-btn"
            onClick={() =>
              onRegularize(
                attendance
              )
            }
          >
            Request Regularization
          </button>
        </div>
      ) : null}

    </section>
  );
}

export default MyAttendanceCard;
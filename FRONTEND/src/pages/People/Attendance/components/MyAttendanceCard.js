import React from "react";

import AttendanceStatusBadge from "./AttendanceStatusBadge";

import {
  attendanceSource,
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
      <section className="se-people-att-my-card se-att-my-card-v3">

        <div className="se-people-att-loading">

          <span />

          Loading your attendance…

        </div>

      </section>
    );
  }

  const firstIn =
    attendance?.firstInAt ||
    attendance?.firstIn?.time ||
    null;

  const lastOut =
    attendance?.lastOutAt ||
    attendance?.lastOut?.time ||
    null;

  const started =
    Boolean(
      firstIn
    );

  const completed =
    Boolean(
      lastOut
    );

  return (
    <section className="se-people-att-my-card se-att-my-card-v3">

      <div className="se-att-my-card-top">

        <div className="se-people-att-my-copy">

          <span>
            TODAY
          </span>

          <h2>
            My attendance
          </h2>

          <p>
            Your approved web attendance and mapped biometric attendance appear in one daily record.
          </p>

        </div>

        <div
          className={`se-att-my-state ${
            completed
              ? "completed"
              : started
                ? "working"
                : "idle"
          }`}
        >

          <i />

          <div>

            <small>
              WORKDAY
            </small>

            <strong>
              {completed
                ? "Completed"
                : started
                  ? "In progress"
                  : "Not started"}
            </strong>

          </div>

        </div>

      </div>

      <div className="se-people-att-my-grid se-att-my-grid-v3">

        <article className="se-att-my-stat se-att-my-stat--status">

          <small>
            STATUS
          </small>

          <AttendanceStatusBadge
            status={
              attendance?.presenceStatus ||
              "NOT_MARKED"
            }
          />

        </article>

        <article className="se-att-my-stat se-att-my-stat--in">

          <small>
            CHECK IN
          </small>

          <strong>
            {formatTime(
              firstIn
            )}
          </strong>

          <span>
            First valid punch
          </span>

        </article>

        <article className="se-att-my-stat se-att-my-stat--out">

          <small>
            CHECK OUT
          </small>

          <strong>
            {formatTime(
              lastOut
            )}
          </strong>

          <span>
            {started &&
            !completed
              ? "Awaiting checkout"
              : "Final valid punch"}
          </span>

        </article>

        <article
          className={`se-att-my-stat ${
            liveWorkedTime
              ? "se-att-my-stat--working"
              : ""
          }`}
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
              attendance?.totalWorkingMinutes
            )}
          </strong>

          <span>
            {liveWorkedTime
              ? "Live duration"
              : "Recorded duration"}
          </span>

        </article>

        <article className="se-att-my-stat">

          <small>
            MODE
          </small>

          <strong>
            {workModeLabel(
              attendance?.workMode
            )}
          </strong>

          <span>
            {attendanceSource(
              attendance
            )}
          </span>

        </article>

        <article className="se-att-my-stat">

          <small>
            SHIFT
          </small>

          <strong>
            {attendance?.shiftName ||
            attendance?.shiftCode ||
            "—"}
          </strong>

          <span>
            {attendance?.officeName ||
            attendance?.workLocation ||
            "Assigned workplace"}
          </span>

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

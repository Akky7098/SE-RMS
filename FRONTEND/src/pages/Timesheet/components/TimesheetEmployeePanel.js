import React, {
  useEffect,
  useState,
} from "react";

import {
  reviewTimesheet,
} from "../../../services/timesheetService";

import TimesheetStatusBadge from "./TimesheetStatusBadge";

import {
  formatDateLong,
  formatTime,
  initials,
} from "../utils/timesheetHelpers";

const TimesheetEmployeePanel = ({
  row,
  onClose,
  onReviewed,
  canReview,
}) => {
  const [
    reviewNote,
    setReviewNote,
  ] =
    useState("");

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  /* =====================================================
     ESCAPE

     Hook MUST be before early return.
  ===================================================== */

  useEffect(() => {
    const handler =
      (
        event
      ) => {
        if (
          event.key ===
          "Escape"
        ) {
          onClose?.();
        }
      };

    window.addEventListener(
      "keydown",
      handler
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handler
      );
    };
  }, [
    onClose,
  ]);

  if (!row) {
    return null;
  }

  const report =
    row.report;

  const handleReview =
    async (
      reviewStatus
    ) => {
      if (
        !report?._id ||
        actionLoading
      ) {
        return;
      }

      try {
        setActionLoading(
          reviewStatus
        );

        setError("");

        await reviewTimesheet(
          report._id,
          {
            status:
              reviewStatus,

            remark:
              reviewNote.trim(),
          }
        );

        await onReviewed?.();

        onClose?.();
      } catch (
        error
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            error?.message ||
            "Unable to review this report."
        );
      } finally {
        setActionLoading(
          ""
        );
      }
    };

  return (
    <div
      className="se-ts-panel-overlay"
      onMouseDown={
        onClose
      }
    >
      <aside
        className="se-ts-panel"
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        <div className="se-ts-panel-top">
          <div className="se-ts-panel-person">
            <span>
              {initials(
                row.name
              )}
            </span>

            <div>
              <strong>
                {row.name}
              </strong>

              <p>
                {row.designation ||
                  "Employee"}
              </p>

              <small>
                {row.department}
              </small>
            </div>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
          >
            ×
          </button>
        </div>

        <div className="se-ts-panel-date">
          <div>
            <span>
              REPORT DATE
            </span>

            <strong>
              {formatDateLong(
                report?.reportDate
              )}
            </strong>
          </div>

          <TimesheetStatusBadge
            status={
              row.status
            }
          />
        </div>

        {!report ? (
          <div className="se-ts-panel-missing">
            <span>
              ◷
            </span>

            <strong>
              Report not submitted
            </strong>

            <p>
              This employee has not
              submitted the work report
              for the selected date.
            </p>
          </div>
        ) : (
          <>
            <div className="se-ts-panel-meta">
              <div>
                <span>
                  SUBMITTED
                </span>

                <strong>
                  {formatTime(
                    report.createdAt
                  )}
                </strong>
              </div>

              <div>
                <span>
                  STATUS
                </span>

                <strong>
                  Submitted
                </strong>
              </div>
            </div>

            <section className="se-ts-panel-section work">
              <span>
                WORK SUMMARY
              </span>

              <h3>
                Work completed
              </h3>

              <p>
                {report.workSummary ||
                  "No work summary provided."}
              </p>
            </section>

            <section className="se-ts-panel-section challenge">
              <span>
                CHALLENGES
              </span>

              <h3>
                Blockers &
                Concerns
              </h3>

              <p>
                {report.challenges ||
                  "No challenges reported."}
              </p>
            </section>

            <section className="se-ts-panel-section plan">
              <span>
                NEXT DAY
              </span>

              <h3>
                Planned work
              </h3>

              <p>
                {report.nextDayPlan ||
                  "No next-day plan provided."}
              </p>
            </section>

            {canReview ? (
              <section className="se-ts-panel-review">
                <span>
                  MANAGER REVIEW
                </span>

                <h3>
                  Review this report
                </h3>

                <textarea
                  value={
                    reviewNote
                  }
                  placeholder="Optional manager remarks..."
                  onChange={(
                    event
                  ) =>
                    setReviewNote(
                      event.target
                        .value
                    )
                  }
                />

                {error ? (
                  <div className="se-ts-panel-review-error">
                    {error}
                  </div>
                ) : null}

                <div className="se-ts-panel-review-actions">
                  <button
                    type="button"
                    className="attention"
                    disabled={
                      Boolean(
                        actionLoading
                      )
                    }
                    onClick={() =>
                      handleReview(
                        "NEEDS_ATTENTION"
                      )
                    }
                  >
                    {actionLoading ===
                    "NEEDS_ATTENTION"
                      ? "Updating..."
                      : "Needs Attention"}
                  </button>

                  <button
                    type="button"
                    className="reviewed"
                    disabled={
                      Boolean(
                        actionLoading
                      )
                    }
                    onClick={() =>
                      handleReview(
                        "REVIEWED"
                      )
                    }
                  >
                    {actionLoading ===
                    "REVIEWED"
                      ? "Updating..."
                      : "Mark Reviewed"}
                  </button>
                </div>
              </section>
            ) : null}
          </>
        )}
      </aside>
    </div>
  );
};

export default TimesheetEmployeePanel;
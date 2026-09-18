import React from "react";

import LeaveEmptyState from "./LeaveEmptyState";

import {
  formatDays,
  formatLeaveDate,
  formatLeaveStatus,
  getLeaveTypeCode,
  getLeaveTypeName,
} from "../utils/leaveHelpers";

function MyLeaveOverview({
  requests = [],
  onApply,
  onOpenRequest,
}) {
  const upcoming =
    requests
      .filter(
        (request) =>
          [
            "PENDING_APPROVAL",
            "APPROVED",
          ].includes(
            request?.status
          )
      )
      .sort(
        (a, b) =>
          String(
            a?.fromDate ||
              ""
          ).localeCompare(
            String(
              b?.fromDate ||
                ""
            )
          )
      )
      .slice(0, 5);

  return (
    <section className="se-leave-panel">
      <div className="se-leave-panel-head">
        <div>
          <span className="se-leave-section-label">
            UPCOMING
          </span>

          <h2>
            My upcoming leave
          </h2>
        </div>

        <button
          type="button"
          className="se-leave-text-btn"
          onClick={onApply}
        >
          Apply leave
        </button>
      </div>

      {!upcoming.length ? (
        <LeaveEmptyState
          title="No upcoming leave"
          description="You have no pending or approved upcoming leave requests."
          actionLabel="Apply Leave"
          onAction={onApply}
        />
      ) : (
        <div className="se-leave-upcoming-list">
          {upcoming.map(
            (request) => (
              <button
                type="button"
                key={request._id}
                className="se-leave-upcoming-item"
                onClick={() =>
                  onOpenRequest(
                    request
                  )
                }
              >
                <span className="se-leave-type-badge">
                  {getLeaveTypeCode(
                    request
                  )}
                </span>

                <span className="se-leave-upcoming-main">
                  <strong>
                    {getLeaveTypeName(
                      request
                    )}
                  </strong>

                  <small>
                    {formatLeaveDate(
                      request.fromDate
                    )}
                    {" → "}
                    {formatLeaveDate(
                      request.toDate
                    )}
                  </small>
                </span>

                <span className="se-leave-upcoming-days">
                  <strong>
                    {formatDays(
                      request.totalDays
                    )}
                  </strong>

                  <small>
                    days
                  </small>
                </span>

                <span
                  className={`se-leave-status se-leave-status--${String(
                    request.status ||
                      ""
                  ).toLowerCase()}`}
                >
                  {formatLeaveStatus(
                    request.status
                  )}
                </span>
              </button>
            )
          )}
        </div>
      )}
    </section>
  );
}

export default MyLeaveOverview;
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
  const upcoming = requests
    .filter((request) =>
      ["PENDING_APPROVAL", "APPROVED"].includes(
        request?.status
      )
    )
    .sort((a, b) =>
      String(a?.fromDate || "").localeCompare(
        String(b?.fromDate || "")
      )
    )
    .slice(0, 6);

  return (
    <section className="se-leave-panel se-leave-panel--table">
      <div className="se-leave-table-section-head">
        <div>
          <span className="se-leave-section-label">
            UPCOMING
          </span>

          <h2>My upcoming leave</h2>
        </div>

        <button
          type="button"
          className="se-leave-pro-head-action"
          onClick={onApply}
        >
          <span>＋</span>
          Apply Leave
        </button>
      </div>

      {!upcoming.length ? (
        <div className="se-leave-compact-empty">
          <div className="se-leave-compact-empty-icon">
            LV
          </div>

          <div className="se-leave-compact-empty-copy">
            <strong>No upcoming leave</strong>

            <span>
              No pending or approved upcoming leave.
            </span>
          </div>

          <button
            type="button"
            onClick={onApply}
          >
            Apply Leave
          </button>
        </div>
      ) : (
        <>
          <div className="se-leave-pro-table-wrap">
            <table className="se-leave-pro-table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th className="se-leave-pro-action-head">
                    Details
                  </th>
                </tr>
              </thead>

              <tbody>
                {upcoming.map((request) => (
                  <tr
                    key={request._id}
                    className="se-leave-pro-clickable-row"
                    onClick={() =>
                      onOpenRequest(request)
                    }
                  >
                    <td>
                      <div className="se-leave-pro-leave-type">
                        <span className="se-leave-pro-type-code">
                          {getLeaveTypeCode(
                            request
                          )}
                        </span>

                        <strong>
                          {getLeaveTypeName(
                            request
                          )}
                        </strong>
                      </div>
                    </td>

                    <td>
                      <strong className="se-leave-pro-date">
                        {formatLeaveDate(
                          request.fromDate
                        )}
                      </strong>
                    </td>

                    <td>
                      <strong className="se-leave-pro-date">
                        {formatLeaveDate(
                          request.toDate
                        )}
                      </strong>
                    </td>

                    <td>
                      <div className="se-leave-pro-duration">
                        <strong>
                          {formatDays(
                            request.totalDays
                          )}
                        </strong>

                        <span>
                          {Number(
                            request.totalDays
                          ) === 1
                            ? "day"
                            : "days"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`se-leave-pro-status se-leave-pro-status--${String(
                          request.status || ""
                        ).toLowerCase()}`}
                      >
                        <i />

                        {formatLeaveStatus(
                          request.status
                        )}
                      </span>
                    </td>

                    <td className="se-leave-pro-action-cell">
                      <button
                        type="button"
                        className="se-leave-pro-view-btn"
                        onClick={(event) => {
                          event.stopPropagation();

                          onOpenRequest(
                            request
                          );
                        }}
                      >
                        View
                        <span>→</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="se-leave-table-footer">
            <span>
              {upcoming.length} upcoming{" "}
              {upcoming.length === 1
                ? "request"
                : "requests"}
            </span>

            <span>
              Select a row for full details
            </span>
          </div>
        </>
      )}
    </section>
  );
}

export default MyLeaveOverview;
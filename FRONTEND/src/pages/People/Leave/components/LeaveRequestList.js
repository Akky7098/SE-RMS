import React from "react";

import LeaveEmptyState from "./LeaveEmptyState";

import {
  canCancelLeave,
  formatDays,
  formatLeaveDate,
  formatLeaveStatus,
  getLeaveTypeCode,
  getLeaveTypeName,
} from "../utils/leaveHelpers";

function LeaveRequestList({
  requests = [],
  onOpen,
  onCancel,
  onApply,
}) {
  if (!requests.length) {
    return (
      <section className="se-leave-panel se-leave-panel--table">
        <LeaveEmptyState
          title="No leave requests"
          description="Your leave requests will appear here after you submit them."
          actionLabel="Apply Leave"
          onAction={onApply}
        />
      </section>
    );
  }

  return (
    <section className="se-leave-panel se-leave-panel--table">
      <div className="se-leave-table-section-head">
        <div>
          <span className="se-leave-section-label">
            REQUEST HISTORY
          </span>

          <h2>My leave requests</h2>
        </div>

        <div className="se-leave-table-head-actions">
          <div className="se-leave-table-head-count">
            <strong>{requests.length}</strong>
            <span>Records</span>
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
      </div>

      <div className="se-leave-pro-table-wrap">
        <table className="se-leave-pro-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Leave Type</th>
              <th>From</th>
              <th>To</th>
              <th>Duration</th>
              <th>Status</th>
              <th className="se-leave-pro-action-head">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {requests.map((request) => (
              <tr
                key={request._id}
                className="se-leave-pro-clickable-row"
                onClick={() => onOpen(request)}
              >
                <td>
                  <button
                    type="button"
                    className="se-leave-pro-request-number"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(request);
                    }}
                  >
                    {request.requestNumber ||
                      "Leave Request"}
                  </button>
                </td>

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
                  <div className="se-leave-pro-row-actions">
                    <button
                      type="button"
                      className="se-leave-pro-view-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(request);
                      }}
                    >
                      View
                      <span>→</span>
                    </button>

                    {canCancelLeave(
                      request
                    ) ? (
                      <button
                        type="button"
                        className="se-leave-pro-cancel-btn"
                        onClick={(event) => {
                          event.stopPropagation();

                          onCancel(
                            request
                          );
                        }}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="se-leave-table-footer">
        <span>
          Showing {requests.length}{" "}
          {requests.length === 1
            ? "request"
            : "requests"}
        </span>

        <span>
          Select any row to drill down
        </span>
      </div>
    </section>
  );
}

export default LeaveRequestList;
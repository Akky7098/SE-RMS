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
      <section className="se-leave-panel">
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
    <section className="se-leave-panel">
      <div className="se-leave-panel-head">
        <div>
          <span className="se-leave-section-label">
            REQUESTS
          </span>

          <h2>
            My leave requests
          </h2>
        </div>

        <span className="se-leave-record-count">
          {requests.length} records
        </span>
      </div>

      <div className="se-leave-table-wrap">
        <table className="se-leave-table">
          <thead>
            <tr>
              <th>
                Request
              </th>

              <th>
                Leave
              </th>

              <th>
                Dates
              </th>

              <th>
                Days
              </th>

              <th>
                Status
              </th>

              <th className="se-leave-table-action">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {requests.map(
              (request) => (
                <tr
                  key={
                    request._id
                  }
                >
                  <td>
                    <button
                      type="button"
                      className="se-leave-request-link"
                      onClick={() =>
                        onOpen(
                          request
                        )
                      }
                    >
                      {request.requestNumber ||
                        "Leave Request"}
                    </button>
                  </td>

                  <td>
                    <div className="se-leave-table-leave">
                      <span className="se-leave-type-badge se-leave-type-badge--small">
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
                    <span className="se-leave-date-range">
                      {formatLeaveDate(
                        request.fromDate
                      )}

                      <small>
                        to
                      </small>

                      {formatLeaveDate(
                        request.toDate
                      )}
                    </span>
                  </td>

                  <td>
                    {formatDays(
                      request.totalDays
                    )}
                  </td>

                  <td>
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
                  </td>

                  <td className="se-leave-table-action">
                    <div className="se-leave-row-actions">
                      <button
                        type="button"
                        onClick={() =>
                          onOpen(
                            request
                          )
                        }
                      >
                        View
                      </button>

                      {canCancelLeave(
                        request
                      ) ? (
                        <button
                          type="button"
                          className="is-danger"
                          onClick={() =>
                            onCancel(
                              request
                            )
                          }
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default LeaveRequestList;
import React from "react";

import LeaveEmptyState from "./LeaveEmptyState";

import {
  formatDays,
  formatLeaveDate,
  getEmployeeInitials,
  getEmployeeName,
  getLeaveTypeCode,
  getLeaveTypeName,
} from "../utils/leaveHelpers";

function LeaveApprovalList({
  requests = [],
  onReview,
}) {
  if (!requests.length) {
    return (
      <section className="se-leave-panel se-leave-panel--table">
        <LeaveEmptyState
          title="Approval inbox is clear"
          description="There are no leave requests waiting for your approval."
        />
      </section>
    );
  }

  return (
    <section className="se-leave-panel se-leave-panel--table">
      <div className="se-leave-table-section-head">
        <div>
          <span className="se-leave-section-label">
            APPROVAL INBOX
          </span>

          <h2>Pending approvals</h2>
        </div>

        <div className="se-leave-table-head-count">
          <strong>{requests.length}</strong>
          <span>Pending</span>
        </div>
      </div>

      <div className="se-leave-pro-table-wrap">
        <table className="se-leave-pro-table se-leave-approval-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Employee ID</th>
              <th>Leave Type</th>
              <th>Leave Period</th>
              <th>Duration</th>
              <th>Status</th>
              <th className="se-leave-pro-action-head">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {requests.map((request) => {
              const name = getEmployeeName(request);

              const employee =
                request?.employeeId || {};

              return (
                <tr
                  key={request._id}
                  className="se-leave-pro-clickable-row"
                  onClick={() => onReview(request)}
                >
                  <td>
                    <div className="se-leave-pro-person">
                      <span className="se-leave-pro-avatar">
                        {getEmployeeInitials(name)}
                      </span>

                      <span className="se-leave-pro-person-copy">
                        <strong>{name}</strong>

                        <small>
                          {employee?.designation ||
                            "Employee"}
                        </small>
                      </span>
                    </div>
                  </td>

                  <td>
                    <div className="se-leave-pro-id">
                      <strong>
                        {employee?.employeeCode || "—"}
                      </strong>

                      {employee?.orgUnitCode ? (
                        <small>
                          {employee.orgUnitCode}
                        </small>
                      ) : null}
                    </div>
                  </td>

                  <td>
                    <div className="se-leave-pro-leave-type">
                      <span className="se-leave-pro-type-code">
                        {getLeaveTypeCode(request)}
                      </span>

                      <strong>
                        {getLeaveTypeName(request)}
                      </strong>
                    </div>
                  </td>

                  <td>
                    <div className="se-leave-pro-period">
                      <strong>
                        {formatLeaveDate(
                          request.fromDate
                        )}
                      </strong>

                      <span>→</span>

                      <strong>
                        {formatLeaveDate(
                          request.toDate
                        )}
                      </strong>
                    </div>
                  </td>

                  <td>
                    <div className="se-leave-pro-duration">
                      <strong>
                        {formatDays(
                          request.totalDays
                        )}
                      </strong>

                      <span>
                        {Number(request.totalDays) === 1
                          ? "day"
                          : "days"}
                      </span>
                    </div>
                  </td>

                  <td>
                    <span className="se-leave-pro-status se-leave-pro-status--pending">
                      <i />
                      Pending
                    </span>
                  </td>

                  <td className="se-leave-pro-action-cell">
                    <button
                      type="button"
                      className="se-leave-pro-review-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        onReview(request);
                      }}
                    >
                      <span>Review</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="se-leave-table-footer">
        <span>
          Showing {requests.length} pending{" "}
          {requests.length === 1
            ? "request"
            : "requests"}
        </span>

        <span>
          Select any row to review details
        </span>
      </div>
    </section>
  );
}

export default LeaveApprovalList;
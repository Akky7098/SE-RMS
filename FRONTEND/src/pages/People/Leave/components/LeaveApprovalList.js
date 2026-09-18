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
  return (
    <section className="se-leave-panel">
      <div className="se-leave-panel-head">
        <div>
          <span className="se-leave-section-label">
            APPROVAL INBOX
          </span>

          <h2>
            Pending approvals
          </h2>
        </div>

        <span className="se-leave-record-count">
          {requests.length} pending
        </span>
      </div>

      {!requests.length ? (
        <LeaveEmptyState
          title="Approval inbox is clear"
          description="There are no leave requests waiting for your approval."
        />
      ) : (
        <div className="se-leave-approval-list">
          {requests.map(
            (request) => {
              const name =
                getEmployeeName(
                  request
                );

              const employee =
                request
                  ?.employeeId ||
                {};

              return (
                <article
                  key={
                    request._id
                  }
                  className="se-leave-approval-card"
                >
                  <div className="se-leave-avatar">
                    {getEmployeeInitials(
                      name
                    )}
                  </div>

                  <div className="se-leave-approval-person">
                    <strong>
                      {name}
                    </strong>

                    <span>
                      {employee?.designation ||
                        "Employee"}
                    </span>

                    <small>
                      {employee?.employeeCode ||
                        ""}
                    </small>
                  </div>

                  <div className="se-leave-approval-type">
                    <span className="se-leave-type-badge">
                      {getLeaveTypeCode(
                        request
                      )}
                    </span>

                    <div>
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
                    </div>
                  </div>

                  <div className="se-leave-approval-days">
                    <strong>
                      {formatDays(
                        request.totalDays
                      )}
                    </strong>

                    <span>
                      days
                    </span>
                  </div>

                  <button
                    type="button"
                    className="se-leave-btn se-leave-btn--secondary"
                    onClick={() =>
                      onReview(
                        request
                      )
                    }
                  >
                    Review
                  </button>
                </article>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}

export default LeaveApprovalList;
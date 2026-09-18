import React, {
  useEffect,
  useState,
} from "react";

import {
  formatDateTime,
  formatDays,
  formatLeaveDate,
  formatLeaveStatus,
  getEmployeeInitials,
  getEmployeeName,
  getLeaveTypeCode,
  getLeaveTypeName,
} from "../utils/leaveHelpers";

function LeaveApprovalDrawer({
  request,
  loading = false,
  processing = false,
  onClose,
  onApprove,
  onReject,
}) {
  const [comment, setComment] =
    useState("");

  const [
    rejectionMode,
    setRejectionMode,
  ] = useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    setComment("");
    setRejectionMode(
      false
    );
    setError("");
  }, [request?._id]);

  if (!request) {
    return null;
  }

  const employee =
    request?.employeeId ||
    {};

  const name =
    getEmployeeName(
      request
    );

  const handleReject = () => {
    if (
      !rejectionMode
    ) {
      setRejectionMode(
        true
      );
      return;
    }

    if (!comment.trim()) {
      setError(
        "Enter a rejection reason."
      );
      return;
    }

    onReject(
      request,
      comment.trim()
    );
  };

  return (
    <div className="se-leave-drawer-layer">
      <button
        type="button"
        className="se-leave-modal-backdrop"
        onClick={onClose}
        aria-label="Close leave request"
      />

      <aside className="se-leave-drawer">
        <header className="se-leave-drawer-head">
          <div>
            <span className="se-leave-section-label">
              LEAVE REQUEST
            </span>

            <h2>
              {request.requestNumber ||
                "Request"}
            </h2>
          </div>

          <button
            type="button"
            className="se-leave-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {loading ? (
          <div className="se-leave-drawer-loading">
            Loading request...
          </div>
        ) : (
          <>
            <section className="se-leave-person-card">
              <div className="se-leave-avatar se-leave-avatar--large">
                {getEmployeeInitials(
                  name
                )}
              </div>

              <div>
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
                  {employee?.orgUnitCode
                    ? ` · ${employee.orgUnitCode}`
                    : ""}
                </small>
              </div>
            </section>

            <section className="se-leave-drawer-summary">
              <div>
                <span>
                  LEAVE TYPE
                </span>

                <strong>
                  <span className="se-leave-type-badge se-leave-type-badge--small">
                    {getLeaveTypeCode(
                      request
                    )}
                  </span>

                  {getLeaveTypeName(
                    request
                  )}
                </strong>
              </div>

              <div>
                <span>
                  DURATION
                </span>

                <strong>
                  {formatDays(
                    request.totalDays
                  )}{" "}
                  days
                </strong>
              </div>

              <div>
                <span>
                  STATUS
                </span>

                <strong>
                  {formatLeaveStatus(
                    request.status
                  )}
                </strong>
              </div>
            </section>

            <section className="se-leave-drawer-block">
              <span className="se-leave-section-label">
                LEAVE PERIOD
              </span>

              <div className="se-leave-period">
                <div>
                  <small>
                    FROM
                  </small>

                  <strong>
                    {formatLeaveDate(
                      request.fromDate
                    )}
                  </strong>
                </div>

                <span>
                  →
                </span>

                <div>
                  <small>
                    TO
                  </small>

                  <strong>
                    {formatLeaveDate(
                      request.toDate
                    )}
                  </strong>
                </div>
              </div>
            </section>

            {request?.appliedBalance ? (
              <section className="se-leave-drawer-block">
                <span className="se-leave-section-label">
                  BALANCE IMPACT
                </span>

                <div className="se-leave-balance-impact">
                  <div>
                    <span>
                      BEFORE
                    </span>

                    <strong>
                      {formatDays(
                        request
                          .appliedBalance
                          .balanceBefore
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      REQUESTED
                    </span>

                    <strong>
                      {formatDays(
                        request
                          .appliedBalance
                          .requested
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      AFTER
                    </span>

                    <strong>
                      {formatDays(
                        request
                          .appliedBalance
                          .balanceAfter
                      )}
                    </strong>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="se-leave-drawer-block">
              <span className="se-leave-section-label">
                REASON
              </span>

              <p className="se-leave-reason">
                {request.reason ||
                  "No reason provided."}
              </p>
            </section>

            {request.emergency ? (
              <section className="se-leave-emergency">
                <strong>
                  Emergency request
                </strong>

                <p>
                  {request.emergencyReason ||
                    "Marked as emergency leave."}
                </p>
              </section>
            ) : null}

            {Array.isArray(
              request.approvals
            ) &&
            request.approvals
              .length ? (
              <section className="se-leave-drawer-block">
                <span className="se-leave-section-label">
                  APPROVAL HISTORY
                </span>

                <div className="se-leave-timeline">
                  {request.approvals.map(
                    (
                      approval,
                      index
                    ) => (
                      <div
                        key={
                          approval._id ||
                          index
                        }
                        className="se-leave-timeline-item"
                      >
                        <span />

                        <div>
                          <strong>
                            {formatLeaveStatus(
                              approval.action
                            )}
                          </strong>

                          <small>
                            {formatDateTime(
                              approval.actedAt
                            )}
                          </small>

                          {approval.comment ? (
                            <p>
                              {approval.comment}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </section>
            ) : null}

            {request.status ===
            "PENDING_APPROVAL" ? (
              <section className="se-leave-review-box">
                <label htmlFor="leave-review-comment">
                  Manager comment
                  {rejectionMode ? (
                    <span>
                      Required for rejection
                    </span>
                  ) : null}
                </label>

                <textarea
                  id="leave-review-comment"
                  rows="3"
                  value={
                    comment
                  }
                  placeholder={
                    rejectionMode
                      ? "Enter the reason for rejection"
                      : "Add an optional approval comment"
                  }
                  onChange={(
                    event
                  ) => {
                    setComment(
                      event
                        .target
                        .value
                    );
                    setError(
                      ""
                    );
                  }}
                />

                {error ? (
                  <div className="se-leave-form-error">
                    {error}
                  </div>
                ) : null}

                <div className="se-leave-review-actions">
                  <button
                    type="button"
                    className="se-leave-btn se-leave-btn--danger"
                    disabled={
                      processing
                    }
                    onClick={
                      handleReject
                    }
                  >
                    {rejectionMode
                      ? "Confirm Reject"
                      : "Reject"}
                  </button>

                  {rejectionMode ? (
                    <button
                      type="button"
                      className="se-leave-btn se-leave-btn--secondary"
                      onClick={() => {
                        setRejectionMode(
                          false
                        );
                        setError(
                          ""
                        );
                      }}
                    >
                      Back
                    </button>
                  ) : null}

                  {!rejectionMode ? (
                    <button
                      type="button"
                      className="se-leave-btn se-leave-btn--approve"
                      disabled={
                        processing
                      }
                      onClick={() =>
                        onApprove(
                          request,
                          comment.trim()
                        )
                      }
                    >
                      {processing
                        ? "Processing..."
                        : "Approve Leave"}
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}
          </>
        )}
      </aside>
    </div>
  );
}

export default LeaveApprovalDrawer;
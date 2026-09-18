import React from "react";

function LeaveHeader({
  employee,
  year,
  onApply,
  refreshing = false,
  onRefresh,
}) {
  return (
    <header className="se-leave-header">
      <div className="se-leave-header-copy">
        <span className="se-leave-eyebrow">
          PEOPLE · LEAVE
        </span>

        <h1>
          Leave Management
        </h1>

        <p>
          Manage leave,
          balances, requests and
          approvals for {year}.
        </p>

        {employee?.fullName ? (
          <div className="se-leave-header-user">
            <strong>
              {employee.fullName}
            </strong>

            {employee?.designation ? (
              <span>
                {employee.designation}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="se-leave-header-actions">
        <button
          type="button"
          className="se-leave-btn se-leave-btn--secondary"
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>

        <button
          type="button"
          className="se-leave-btn se-leave-btn--primary"
          onClick={onApply}
        >
          <span
            aria-hidden="true"
            className="se-leave-btn-plus"
          >
            +
          </span>

          Apply Leave
        </button>
      </div>
    </header>
  );
}

export default LeaveHeader;
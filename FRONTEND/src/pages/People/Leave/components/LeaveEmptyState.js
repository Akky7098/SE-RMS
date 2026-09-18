import React from "react";

function LeaveEmptyState({
  title = "Nothing here yet",
  description = "",
  actionLabel = "",
  onAction,
}) {
  return (
    <div className="se-leave-empty">
      <div
        className="se-leave-empty-mark"
        aria-hidden="true"
      >
        LV
      </div>

      <h3>
        {title}
      </h3>

      {description ? (
        <p>
          {description}
        </p>
      ) : null}

      {actionLabel &&
      onAction ? (
        <button
          type="button"
          className="se-leave-btn se-leave-btn--primary"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export default LeaveEmptyState;
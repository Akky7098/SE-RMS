import React from "react";

const RecruitmentStatusBadge = ({
  label,
  tone =
    "neutral",
  dot = true,
  className = "",
}) => {
  return (
    <span
      className={[
        "se-rec-status-badge",
        `tone-${tone}`,
        className,
      ]
        .filter(
          Boolean
        )
        .join(
          " "
        )}
    >
      {dot ? (
        <span className="se-rec-status-dot" />
      ) : null}

      <span>
        {label ||
          "Unknown"}
      </span>
    </span>
  );
};

export default RecruitmentStatusBadge;
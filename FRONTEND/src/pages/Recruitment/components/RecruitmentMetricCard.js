import React from "react";

const RecruitmentMetricCard = ({
  label,
  value = 0,
  description = "",
  icon = "•",
  tone =
    "neutral",
  onClick,
  loading = false,
  badge = "",
}) => {
  const clickable =
    typeof onClick ===
    "function";

  return (
    <button
      type="button"
      className={[
        "se-rec-metric-card",
        `tone-${tone}`,
        clickable
          ? "clickable"
          : "",
      ]
        .filter(
          Boolean
        )
        .join(
          " "
        )}
      onClick={
        clickable
          ? onClick
          : undefined
      }
    >
      <div className="se-rec-metric-top">
        <span className="se-rec-metric-icon">
          {icon}
        </span>

        {badge ? (
          <span className="se-rec-metric-badge">
            {
              badge
            }
          </span>
        ) : (
          <span className="se-rec-metric-open">
            Open
            <span>
              →
            </span>
          </span>
        )}
      </div>

      <strong className="se-rec-metric-value">
        {loading
          ? "—"
          : value}
      </strong>

      <h3>
        {label}
      </h3>

      <p>
        {description}
      </p>
    </button>
  );
};

export default RecruitmentMetricCard;
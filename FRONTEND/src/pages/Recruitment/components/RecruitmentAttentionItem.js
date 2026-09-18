import React from "react";

import RecruitmentStatusBadge from "./RecruitmentStatusBadge";

const RecruitmentAttentionItem = ({
  title,
  subtitle = "",
  meta = "",
  icon = "•",
  tone =
    "neutral",
  badgeLabel = "",
  badgeTone =
    "neutral",
  onClick,
}) => {
  return (
    <button
      type="button"
      className="se-rec-attention-item"
      onClick={
        onClick
      }
    >
      <span
        className={`se-rec-attention-icon tone-${tone}`}
      >
        {icon}
      </span>

      <span className="se-rec-attention-copy">
        <strong>
          {title}
        </strong>

        <small>
          {subtitle}
        </small>
      </span>

      {badgeLabel ? (
        <RecruitmentStatusBadge
          label={
            badgeLabel
          }
          tone={
            badgeTone
          }
        />
      ) : null}

      <span className="se-rec-attention-meta">
        {meta}
      </span>

      <span className="se-rec-attention-arrow">
        →
      </span>
    </button>
  );
};

export default RecruitmentAttentionItem;
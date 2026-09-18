import React from "react";

const RecruitmentEmptyState = ({
  icon = "✓",
  title =
    "Nothing needs attention",
  description =
    "You're all caught up.",
}) => {
  return (
    <div className="se-rec-empty">
      <div className="se-rec-empty-icon">
        {
          icon
        }
      </div>

      <div>
        <strong>
          {
            title
          }
        </strong>

        <p>
          {
            description
          }
        </p>
      </div>
    </div>
  );
};

export default RecruitmentEmptyState;
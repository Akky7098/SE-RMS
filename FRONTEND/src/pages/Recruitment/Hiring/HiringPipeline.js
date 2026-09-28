import React from "react";

const HiringPipeline = ({
  stats = {},
  onStageClick,
}) => {
  const stages = [
    {
      key: "CONTACT_PENDING",
      label: "Contact",
      value: Number(
        stats?.contactPending || 0
      ),
      tone: "orange",
      icon: "☎",
    },
    {
      key: "SCREENING_PENDING",
      label: "Screening",
      value: Number(
        stats?.screeningPending || 0
      ),
      tone: "purple",
      icon: "S",
    },
    {
      key: "SHORTLISTED",
      label: "Shortlisted",
      value: Number(
        stats?.shortlisted || 0
      ),
      tone: "green",
      icon: "✓",
    },
    {
      key: "INTERVIEW_SCHEDULED",
      label: "Interview",
      value: Number(
        stats?.interview || 0
      ),
      tone: "blue",
      icon: "I",
    },
    {
      key: "SELECTED",
      label: "Selected",
      value: Number(
        stats?.selected || 0
      ),
      tone: "emerald",
      icon: "★",
    },
  ];

  return (
    <section className="se-hw-pipeline-panel">
      <div className="se-hw-section-head">
        <div>
          <span className="se-hw-section-eyebrow">
            RECRUITMENT PIPELINE
          </span>

          <h3>Candidate Progress</h3>
        </div>

        <div className="se-hw-pipeline-total">
          <strong>
            {stages.reduce(
              (total, stage) =>
                total + stage.value,
              0
            )}
          </strong>

          <span>In Pipeline</span>
        </div>
      </div>

      <div className="se-hw-pipeline">
        {stages.map((stage) => (
          <button
            key={stage.key}
            type="button"
            className={`se-hw-pipeline-stage tone-${stage.tone}`}
            onClick={() =>
              onStageClick?.(stage)
            }
          >
            <span className="se-hw-stage-icon">
              {stage.icon}
            </span>

            <span className="se-hw-stage-content">
              <strong>{stage.value}</strong>
              <span>{stage.label}</span>
            </span>

            <span className="se-hw-stage-open">
              →
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default HiringPipeline;
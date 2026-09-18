import React from "react";

const HiringPipeline = ({
  stats = {},

  onStageClick,
}) => {
  const stages = [
    {
      key:
        "CONTACT_PENDING",

      label:
        "Contact",

      description:
        "Initial calls",

      value:
        Number(
          stats
            ?.contactPending ||
            0
        ),

      tone:
        "orange",

      icon:
        "☎",
    },

    {
      key:
        "SCREENING_PENDING",

      label:
        "Screening",

      description:
        "Profile review",

      value:
        Number(
          stats
            ?.screeningPending ||
            0
        ),

      tone:
        "purple",

      icon:
        "S",
    },

    {
      key:
        "SHORTLISTED",

      label:
        "Shortlisted",

      description:
        "Interview ready",

      value:
        Number(
          stats
            ?.shortlisted ||
            0
        ),

      tone:
        "green",

      icon:
        "✓",
    },

    {
      key:
        "INTERVIEW_SCHEDULED",

      label:
        "Interview",

      description:
        "Interview stage",

      value:
        Number(
          stats
            ?.interview ||
            0
        ),

      tone:
        "blue",

      icon:
        "I",
    },

    {
      key:
        "SELECTED",

      label:
        "Selected",

      description:
        "Final selection",

      value:
        Number(
          stats
            ?.selected ||
            0
        ),

      tone:
        "emerald",

      icon:
        "★",
    },
  ];

  return (
    <section className="se-hw-pipeline-panel">
      <div className="se-hw-section-head">
        <div>
          <span>
            RECRUITMENT PIPELINE
          </span>

          <h3>
            Candidate Progress
          </h3>

          <p>
            Click a stage to open only
            candidates currently in that
            stage.
          </p>
        </div>
      </div>

      <div className="se-hw-pipeline">
        {stages.map(
          (
            stage,
            index
          ) => (
            <React.Fragment
              key={
                stage.key
              }
            >
              <button
                type="button"
                className={`se-hw-pipeline-stage tone-${stage.tone}`}
                onClick={() =>
                  onStageClick?.(
                    stage
                  )
                }
              >
                <span className="se-hw-stage-icon">
                  {
                    stage.icon
                  }
                </span>

                <div>
                  <strong>
                    {
                      stage.value
                    }
                  </strong>

                  <span>
                    {
                      stage.label
                    }
                  </span>

                  <small>
                    {
                      stage.description
                    }
                  </small>
                </div>

                <span className="se-hw-stage-open">
                  →
                </span>
              </button>

              {index <
              stages.length -
                1 ? (
                <span className="se-hw-pipeline-arrow">
                  →
                </span>
              ) : null}
            </React.Fragment>
          )
        )}
      </div>
    </section>
  );
};

export default HiringPipeline;
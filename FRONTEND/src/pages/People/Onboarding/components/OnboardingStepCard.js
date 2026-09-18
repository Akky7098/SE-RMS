import React from "react";

import OnboardingStatusBadge from "./OnboardingStatusBadge";

function OnboardingStepCard({
  number,
  title,
  description,
  status = "PENDING",
  icon,
  children,
  action,
  locked = false,
  highlighted = false,
}) {
  return (
    <section
      className={[
        "onboarding-step-card",
        locked
          ? "is-locked"
          : "",
        highlighted
          ? "is-highlighted"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >

      <div className="onboarding-step-card-header">

        <div className="onboarding-step-identity">

          <div className="onboarding-step-icon">

            {icon || number}

          </div>

          <div>

            <span>
              STEP {number}
            </span>

            <h2>
              {title}
            </h2>

            <p>
              {description}
            </p>

          </div>

        </div>

        <div className="onboarding-step-header-actions">

          <OnboardingStatusBadge
            status={
              locked
                ? "LOCKED"
                : status
            }
          />

          {action}

        </div>

      </div>

      <div className="onboarding-step-content">

        {locked ? (
          <div className="onboarding-locked-message">

            <strong>
              This step is not available yet
            </strong>

            <span>
              Complete the required previous
              formalities to continue.
            </span>

          </div>
        ) : (
          children
        )}

      </div>

    </section>
  );
}

export default OnboardingStepCard;
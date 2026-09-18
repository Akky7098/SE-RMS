import React from "react";

const DEFAULT_STEPS = [
  {
    key: "EMPLOYEE",
    number: "01",
    label: "Employee",
  },
  {
    key: "ACCESS",
    number: "02",
    label: "RMS Access",
  },
  {
    key: "DOCUMENTS",
    number: "03",
    label: "Documents",
  },
  {
    key: "ASSETS",
    number: "04",
    label: "Assets",
  },
  {
    key: "APPOINTMENT",
    number: "05",
    label: "Appointment",
  },
  {
    key: "WELCOME",
    number: "06",
    label: "Welcome",
  },
  {
    key: "ACTIVATION",
    number: "07",
    label: "Activation",
  },
];

function OnboardingProgress({
  statuses = {},
  activeStep,
  onStepClick,
  steps = DEFAULT_STEPS,
}) {
  const normalize = (value) =>
    String(value || "PENDING")
      .toUpperCase();

  return (
    <section className="onboarding-flow">

      {steps.map(
        (
          step,
          index
        ) => {
          const status =
            normalize(
              statuses[step.key]
            );

          const completed =
            [
              "COMPLETED",
              "COMPLETE",
              "DONE",
            ].includes(status);

          const active =
            activeStep ===
              step.key ||
            [
              "IN_PROGRESS",
              "AVAILABLE",
              "READY",
            ].includes(status);

          return (
            <React.Fragment
              key={step.key}
            >
              <button
                type="button"
                className={[
                  "onboarding-flow-step",
                  completed
                    ? "is-complete"
                    : "",
                  active
                    ? "is-active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() =>
                  onStepClick?.(
                    step.key
                  )
                }
              >
                <span className="onboarding-flow-number">
                  {completed
                    ? "✓"
                    : step.number}
                </span>

                <span className="onboarding-flow-label">
                  {step.label}
                </span>
              </button>

              {index <
              steps.length - 1 ? (
                <div
                  className={[
                    "onboarding-flow-line",
                    completed
                      ? "is-complete"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              ) : null}
            </React.Fragment>
          );
        }
      )}

    </section>
  );
}

export {
  DEFAULT_STEPS,
};

export default OnboardingProgress;
import React from "react";

import OnboardingStepCard from "./OnboardingStepCard";

function ActivationStep({
  employee,
  checklist = {},
  loading = false,
  onActivate,
}) {
  const checks = [
    {
      key: "employee",
      label:
        "Employee master created",
      complete:
        checklist.employee !==
        false,
    },
    {
      key: "access",
      label:
        "SE-RMS access created",
      complete:
        Boolean(
          checklist.access
        ),
    },
    {
      key: "documents",
      label:
        "Joining documents reviewed",
      complete:
        Boolean(
          checklist.documents
        ),
    },
    {
      key: "assets",
      label:
        "Asset formalities completed",
      complete:
        Boolean(
          checklist.assets
        ),
    },
    {
      key: "appointment",
      label:
        "Appointment letter generated",
      complete:
        Boolean(
          checklist.appointment
        ),
    },
    {
      key: "welcome",
      label:
        "Official email / welcome completed",
      complete:
        Boolean(
          checklist.welcome
        ),
    },
  ];

  const completedCount =
    checks.filter(
      (
        check
      ) =>
        check.complete
    ).length;

  const ready =
    completedCount ===
    checks.length;

  const active =
    String(
      employee?.status ||
      ""
    ).toUpperCase() ===
    "ACTIVE";

  return (
    <OnboardingStepCard
      number="07"
      title="Final Review & Activation"
      description="Review the onboarding record before closing Recruitment and activating the employee."
      status={
        active
          ? "COMPLETED"
          : ready
            ? "READY"
            : "IN_PROGRESS"
      }
      highlighted={
        ready &&
        !active
      }
    >

      <div className="onboarding-final-review">

        <div className="onboarding-review-list">

          {checks.map(
            (
              check
            ) => (
              <div
                key={
                  check.key
                }
                className={
                  check.complete
                    ? "is-complete"
                    : ""
                }
              >

                <span>
                  {check.complete
                    ? "✓"
                    : "!"}
                </span>

                <strong>
                  {check.label}
                </strong>

                <small>
                  {check.complete
                    ? "Completed"
                    : "Pending"}
                </small>

              </div>
            )
          )}

        </div>

        <aside className="onboarding-activation-panel">

          <span>
            FINAL STATUS
          </span>

          <strong>
            {active
              ? "Employee Active"
              : ready
                ? "Ready for Activation"
                : `${completedCount}/${checks.length} Complete`}
          </strong>

          <p>
            {active
              ? "Onboarding is complete and the employee is part of the active workforce."
              : ready
                ? "All required onboarding formalities are complete."
                : "Complete the remaining required items before activation."}
          </p>

          {!active ? (
            <button
              type="button"
              disabled={
                loading ||
                !ready
              }
              onClick={
                onActivate
              }
            >
              {loading
                ? "Activating..."
                : "Activate Employee"}

              <span>
                →
              </span>
            </button>
          ) : (
            <div className="onboarding-active-success">

              <b>
                ✓
              </b>

              <span>
                ONBOARDING COMPLETE
              </span>

            </div>
          )}

        </aside>

      </div>

    </OnboardingStepCard>
  );
}

export default ActivationStep;
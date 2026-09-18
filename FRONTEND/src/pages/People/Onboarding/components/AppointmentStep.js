import React from "react";

import OnboardingStepCard from "./OnboardingStepCard";

function AppointmentStep({
  appointment,
  eligibility,
  loading = false,
  onGenerate,
  onDownload,
}) {
  const generated =
    Boolean(
      appointment?.generatedAt ||
      appointment?.documentUrl ||
      appointment?.pdfUrl
    );

  const eligible =
    Boolean(
      eligibility?.eligible
    );

  const daysRemaining =
    Number(
      eligibility?.daysRemaining ||
      0
    );

  return (
    <OnboardingStepCard
      number="05"
      title="Appointment Letter"
      description="Appointment letter becomes available after the required seven-day joining period."
      status={
        generated
          ? "COMPLETED"
          : eligible
            ? "READY"
            : "WAITING"
      }
    >

      {!eligible &&
      !generated ? (
        <div className="onboarding-waiting-panel">

          <div className="onboarding-wait-number">
            {daysRemaining}
          </div>

          <div>

            <span>
              DAYS REMAINING
            </span>

            <strong>
              Appointment letter is
              automatically locked
            </strong>

            <p>
              The employee must complete
              seven days from the confirmed
              joining date before generation.
            </p>

          </div>

        </div>
      ) : null}

      {eligible &&
      !generated ? (
        <div className="onboarding-appointment-ready">

          <div>

            <span>
              7-DAY PERIOD COMPLETED
            </span>

            <strong>
              Appointment Letter Ready
            </strong>

            <p>
              HR can now generate the
              appointment letter from the
              employee record.
            </p>

          </div>

          <button
            type="button"
            disabled={
              loading
            }
            onClick={
              onGenerate
            }
          >
            {loading
              ? "Generating..."
              : "Generate Appointment Letter"}

            <span>
              →
            </span>
          </button>

        </div>
      ) : null}

      {generated ? (
        <div className="onboarding-generated-document">

          <div className="onboarding-generated-icon">
            PDF
          </div>

          <div>

            <span>
              GENERATED
            </span>

            <strong>
              Appointment Letter
            </strong>

            <small>
              Generated{" "}
              {appointment?.generatedAt
                ? new Intl.DateTimeFormat(
                    "en-IN",
                    {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }
                  ).format(
                    new Date(
                      appointment.generatedAt
                    )
                  )
                : ""}
            </small>

          </div>

          <button
            type="button"
            onClick={
              onDownload
            }
          >
            Open Letter
          </button>

        </div>
      ) : null}

    </OnboardingStepCard>
  );
}

export default AppointmentStep;
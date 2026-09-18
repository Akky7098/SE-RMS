import React from "react";

import OnboardingStepCard from "./OnboardingStepCard";

function WelcomeStep({
  employee,
  mailStatus,
  loading = false,
  onSaveOfficialEmail,
  onSendWelcomeMail,
}) {
  const [
    officialEmail,
    setOfficialEmail,
  ] =
    React.useState(
      employee?.officialEmail ||
      ""
    );

  React.useEffect(
    () => {
      setOfficialEmail(
        employee?.officialEmail ||
        ""
      );
    },
    [
      employee?.officialEmail,
    ]
  );

  const sent =
    Boolean(
      mailStatus?.welcomeSentAt
    );

  return (
    <OnboardingStepCard
      number="06"
      title="Official Email & Welcome"
      description="Confirm official email and send the final employee welcome communication."
      status={
        sent
          ? "COMPLETED"
          : employee?.officialEmail
            ? "READY"
            : "IN_PROGRESS"
      }
    >

      <div className="onboarding-welcome-layout">

        <div className="onboarding-official-email">

          <span>
            OFFICIAL COMPANY EMAIL
          </span>

          <h3>
            Employee Email
          </h3>

          <p>
            This becomes the employee's
            official communication address.
          </p>

          <div className="onboarding-email-field">

            <input
              type="email"
              value={
                officialEmail
              }
              onChange={(
                event
              ) =>
                setOfficialEmail(
                  event.target.value
                )
              }
              placeholder="employee@company.com"
            />

            <button
              type="button"
              disabled={
                loading ||
                !officialEmail.trim()
              }
              onClick={() =>
                onSaveOfficialEmail?.(
                  officialEmail.trim()
                )
              }
            >
              Save Email
            </button>

          </div>

        </div>

        <div className="onboarding-welcome-mail">

          <span>
            WELCOME COMMUNICATION
          </span>

          <h3>
            Welcome to the Team
          </h3>

          <p>
            Welcome mail includes employee
            details and reporting manager
            information, with the required
            management and HR recipients in
            CC.
          </p>

          <div className="onboarding-mail-info">

            <div>
              <span>
                TO
              </span>

              <strong>
                {officialEmail ||
                  employee?.personalEmail ||
                  "Email required"}
              </strong>
            </div>

            <div>
              <span>
                REPORTING MANAGER
              </span>

              <strong>
                {employee?.reportingManagerName ||
                  "—"}
              </strong>
            </div>

          </div>

          <button
            type="button"
            className="onboarding-primary-button"
            disabled={
              loading ||
              !officialEmail
            }
            onClick={
              onSendWelcomeMail
            }
          >
            {loading
              ? "Sending..."
              : sent
                ? "Resend Welcome Mail"
                : "Send Welcome Mail"}

            <span>
              →
            </span>
          </button>

          {sent ? (
            <small className="onboarding-mail-sent">
              ✓ Welcome mail sent successfully
            </small>
          ) : null}

        </div>

      </div>

    </OnboardingStepCard>
  );
}

export default WelcomeStep;
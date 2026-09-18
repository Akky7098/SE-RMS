import React from "react";

import OnboardingStepCard from "./OnboardingStepCard";

function AccessStep({
  access,
  employee,
  loading = false,
  onCreateAccess,
  onResendCredentials,
}) {
  const created =
    Boolean(
      access?.user ||
      access?.userId ||
      access?.createdAt
    );

  return (
    <OnboardingStepCard
      number="02"
      title="SE-RMS Access"
      description="Create the employee login and share initial credentials."
      status={
        created
          ? "COMPLETED"
          : "READY"
      }
      highlighted={!created}
    >

      <div className="onboarding-access-layout">

        <div className="onboarding-info-grid">

          <div>

            <span>
              LOGIN EMAIL
            </span>

            <strong>
              {access?.email ||
                employee?.officialEmail ||
                employee?.personalEmail ||
                "Email required"}
            </strong>

          </div>

          <div>

            <span>
              ACCOUNT STATUS
            </span>

            <strong>
              {created
                ? "Account Created"
                : "Not Created"}
            </strong>

          </div>

          <div>

            <span>
              CREDENTIAL MAIL
            </span>

            <strong>
              {access?.credentialsSentAt
                ? "Sent"
                : "Pending"}
            </strong>

          </div>

          <div>

            <span>
              LAST SENT
            </span>

            <strong>
              {access?.credentialsSentAt
                ? new Intl.DateTimeFormat(
                    "en-IN",
                    {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  ).format(
                    new Date(
                      access.credentialsSentAt
                    )
                  )
                : "—"}
            </strong>

          </div>

        </div>

        <div className="onboarding-primary-action">

          {!created ? (
            <>
              <span>
                READY FOR ACCESS
              </span>

              <strong>
                Create SE-RMS Account
              </strong>

              <p>
                A login account will be linked
                with this employee record.
              </p>

              <button
                type="button"
                disabled={loading}
                onClick={
                  onCreateAccess
                }
              >
                {loading
                  ? "Creating..."
                  : "Create & Send Credentials"}

                <span>
                  →
                </span>
              </button>
            </>
          ) : (
            <>
              <span>
                ACCOUNT ACTIVE
              </span>

              <strong>
                SE-RMS access created
              </strong>

              <p>
                Credentials can be resent if
                required.
              </p>

              <button
                type="button"
                disabled={loading}
                onClick={
                  onResendCredentials
                }
              >
                {loading
                  ? "Sending..."
                  : "Resend Credentials"}
              </button>
            </>
          )}

        </div>

      </div>

    </OnboardingStepCard>
  );
}

export default AccessStep;
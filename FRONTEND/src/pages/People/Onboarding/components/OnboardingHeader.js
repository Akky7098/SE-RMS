import React from "react";

import {
  useNavigate,
} from "react-router-dom";

import OnboardingStatusBadge from "./OnboardingStatusBadge";

function OnboardingHeader({
  employee,
  onboarding,
  progress = 0,
}) {
  const navigate =
    useNavigate();

  const employeeId =
    employee?._id ||
    employee?.id;

  const safeProgress =
    Math.max(
      0,
      Math.min(
        100,
        Number(progress) || 0
      )
    );

  const status =
    onboarding?.status ||
    employee?.onboardingStatus ||
    "IN_PROGRESS";

  return (
    <section className="onboarding-header">

      <div className="onboarding-header-top">

        <button
          type="button"
          className="onboarding-back"
          onClick={() =>
            navigate(
              employeeId
                ? `/people/employees/${employeeId}`
                : "/people/employees"
            )
          }
        >
          ← Employee Profile
        </button>

        <OnboardingStatusBadge
          status={status}
        />

      </div>

      <div className="onboarding-header-main">

        <div className="onboarding-header-copy">

          <span className="onboarding-eyebrow">
            EMPLOYEE ONBOARDING
          </span>

          <h1>
            {employee?.fullName ||
              "Employee Onboarding"}
          </h1>

          <p>
            Complete employee access,
            documents, assets, appointment
            formalities and final activation.
          </p>

          <div className="onboarding-header-meta">

            <span>
              <small>
                EMPLOYEE ID
              </small>

              <strong>
                {employee?.employeeCode ||
                  "Pending"}
              </strong>
            </span>

            <span>
              <small>
                DESIGNATION
              </small>

              <strong>
                {employee?.designation ||
                  "—"}
              </strong>
            </span>

            <span>
              <small>
                DEPARTMENT
              </small>

              <strong>
                {employee?.departmentName ||
                  employee?.orgUnitCode ||
                  "—"}
              </strong>
            </span>

            <span>
              <small>
                JOINING DATE
              </small>

              <strong>
                {employee?.joiningDate
                  ? new Intl.DateTimeFormat(
                      "en-IN",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }
                    ).format(
                      new Date(
                        employee.joiningDate
                      )
                    )
                  : "—"}
              </strong>
            </span>

          </div>

        </div>

        <div className="onboarding-progress-hero">

          <div
            className="onboarding-progress-ring"
            style={{
              "--onboarding-progress":
                `${safeProgress * 3.6}deg`,
            }}
          >
            <div>
              <strong>
                {safeProgress}%
              </strong>

              <span>
                COMPLETE
              </span>
            </div>
          </div>

          <div className="onboarding-progress-copy">

            <span>
              ONBOARDING PROGRESS
            </span>

            <strong>
              {safeProgress === 100
                ? "Ready to activate"
                : "Formalities in progress"}
            </strong>

            <small>
              Complete all required steps
              before final employee activation.
            </small>

          </div>

        </div>

      </div>

    </section>
  );
}

export default OnboardingHeader;
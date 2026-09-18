import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getEmployeeById,
} from "../../../services/employeeService";

import "./Employees.css";

/* =========================================================
   HELPERS
========================================================= */

const formatDate =
  (
    value
  ) => {
    if (!value) {
      return "—";
    }

    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "—";
    }

    return new Intl
      .DateTimeFormat(
        "en-IN",
        {
          day:
            "2-digit",

          month:
            "long",

          year:
            "numeric",
        }
      )
      .format(
        date
      );
  };

const pretty =
  (
    value
  ) =>
    String(
      value ||
      ""
    )
      .replaceAll(
        "_",
        " "
      )
      .toLowerCase()
      .replace(
        /\b\w/g,
        (
          character
        ) =>
          character
            .toUpperCase()
      );

/* =========================================================
   COMPONENT
========================================================= */

function EmployeeDetailPage() {
  const {
    employeeId,
  } =
    useParams();

  const navigate =
    useNavigate();

  const [
    employee,
    setEmployee,
  ] =
    useState(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  /* =====================================================
     LOAD
  ===================================================== */

  const load =
    useCallback(
      async () => {
        try {
          setLoading(
            true
          );

          setError(
            ""
          );

          const result =
            await getEmployeeById(
              employeeId
            );

          setEmployee(
            result
          );
        } catch (
          requestError
        ) {
          setError(
            requestError
              ?.response
              ?.data
              ?.message ||
            requestError
              ?.message ||
            "Employee could not be loaded."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        employeeId,
      ]
    );

  useEffect(
    () => {
      load();
    },
    [
      load,
    ]
  );

  /* =====================================================
     LOADING
  ===================================================== */

  if (
    loading
  ) {
    return (
      <div className="employee-detail-page">

        <div className="employee-detail-loading">
          Loading employee profile...
        </div>

      </div>
    );
  }

  /* =====================================================
     ERROR
  ===================================================== */

  if (
    error ||
    !employee
  ) {
    return (
      <div className="employee-detail-page">

        <div className="employee-detail-error">

          <strong>
            Employee profile unavailable
          </strong>

          <span>
            {error ||
              "Employee not found."}
          </span>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/people/employees"
              )
            }
          >
            Return to Employees
          </button>

        </div>

      </div>
    );
  }

  const onboarding =
    String(
      employee?.status ||
      ""
    ).toUpperCase() ===
      "ONBOARDING" ||
    Boolean(
      employee
        ?.onboardingId
    );

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="employee-detail-page">

      {/* =================================================
          BACK
      ================================================== */}

      <button
        type="button"
        className="employees-back"
        onClick={() =>
          navigate(
            "/people/employees"
          )
        }
      >
        ← Employee Directory
      </button>

      {/* =================================================
          PROFILE HERO
      ================================================== */}

      <section className="employee-profile-hero">

        <div className="employee-profile-main">

          <div className="employee-profile-avatar">

            {employee
              ?.profilePhotoUrl ? (
              <img
                src={
                  employee
                    .profilePhotoUrl
                }
                alt=""
              />
            ) : (
              String(
                employee
                  ?.fullName ||
                  "E"
              )
                .slice(
                  0,
                  1
                )
                .toUpperCase()
            )}

          </div>

          <div>

            <span>
              EMPLOYEE PROFILE
            </span>

            <h1>
              {employee
                .fullName}
            </h1>

            <p>
              {employee
                .designation}
              {" · "}
              {employee
                .departmentName}
            </p>

            <div className="employee-profile-tags">

              <strong>
                {employee
                  .employeeCode ||
                  "No Employee ID"}
              </strong>

              <span>
                {pretty(
                  employee
                    .status
                )}
              </span>

              {employee
                .workLocation ? (
                <span>
                  {
                    employee
                      .workLocation
                  }
                </span>
              ) : null}

            </div>

          </div>

        </div>

        <div className="employee-profile-actions">

          {onboarding ? (
            <button
              type="button"
              className="employee-profile-onboarding"
              onClick={() =>
                navigate(
                  `/people/employees/${employeeId}/onboarding`
                )
              }
            >
              Continue Onboarding
              <span>
                →
              </span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() =>
              navigate(
                `/people/employees/${employeeId}/edit`
              )
            }
          >
            Edit Employee
          </button>

        </div>

      </section>

      {/* =================================================
          QUICK INFORMATION
      ================================================== */}

      <section className="employee-detail-stat-grid">

        <article>

          <span>
            OFFICIAL EMAIL
          </span>

          <strong>
            {employee
              .officialEmail ||
              "Not assigned"}
          </strong>

        </article>

        <article>

          <span>
            MOBILE
          </span>

          <strong>
            {employee
              .mobileNumber ||
              "—"}
          </strong>

        </article>

        <article>

          <span>
            JOINING DATE
          </span>

          <strong>
            {formatDate(
              employee
                .joiningDate
            )}
          </strong>

        </article>

        <article>

          <span>
            EMPLOYMENT
          </span>

          <strong>
            {pretty(
              employee
                .employmentType
            )}
          </strong>

        </article>

      </section>

      {/* =================================================
          RECORD
      ================================================== */}

      <section className="employee-record-layout">

        <div className="employee-record-card">

          <div className="employee-record-heading">

            <div>

              <span>
                EMPLOYEE MASTER
              </span>

              <h2>
                Employment Details
              </h2>

            </div>

          </div>

          <div className="employee-record-grid">

            <div>

              <span>
                Employee ID
              </span>

              <strong>
                {employee
                  .employeeCode ||
                  "—"}
              </strong>

            </div>

            <div>

              <span>
                Company
              </span>

              <strong>
                {employee
                  .companyCode ||
                  "—"}
              </strong>

            </div>

            <div>

              <span>
                Department
              </span>

              <strong>
                {employee
                  .departmentName ||
                  "—"}
              </strong>

            </div>

            <div>

              <span>
                Designation
              </span>

              <strong>
                {employee
                  .designation ||
                  "—"}
              </strong>

            </div>

            <div>

              <span>
                Work Location
              </span>

              <strong>
                {employee
                  .workLocation ||
                  "—"}
              </strong>

            </div>

            <div>

              <span>
                Reporting Manager
              </span>

              <strong>
                {employee
                  .reportingManagerName ||
                  "—"}
              </strong>

            </div>

          </div>

        </div>

        {/* =================================================
            CONTACT
        ================================================== */}

        <div className="employee-record-card">

          <div className="employee-record-heading">

            <div>

              <span>
                COMMUNICATION
              </span>

              <h2>
                Contact Details
              </h2>

            </div>

          </div>

          <div className="employee-record-stack">

            <div>

              <span>
                Official Email
              </span>

              <strong>
                {employee
                  .officialEmail ||
                  "Not assigned"}
              </strong>

            </div>

            <div>

              <span>
                Personal Email
              </span>

              <strong>
                {employee
                  .personalEmail ||
                  "—"}
              </strong>

            </div>

            <div>

              <span>
                Mobile Number
              </span>

              <strong>
                {employee
                  .mobileNumber ||
                  "—"}
              </strong>

            </div>

            <div>

              <span>
                Biometric ID
              </span>

              <strong>
                {employee
                  .biometricCode ||
                  "Not linked"}
              </strong>

            </div>

          </div>

        </div>

      </section>

      {/* =================================================
          ACTION CARDS
      ================================================== */}

      <section className="employee-profile-modules">

        <button
          type="button"
          onClick={() =>
            navigate(
              `/people/employees/${employeeId}/onboarding`
            )
          }
        >

          <span>
            O
          </span>

          <div>

            <strong>
              Onboarding
            </strong>

            <small>
              Access, documents, assets and activation
            </small>

          </div>

          <b>
            →
          </b>

        </button>

        <button
  type="button"
  onClick={() =>
    navigate(
      `/people/employees/${employeeId}/documents`
    )
  }
>

  <span>
    D
  </span>

  <div>

    <strong>
      Documents
    </strong>

    <small>
      Permanent employee document vault
    </small>

  </div>

  <b>
    →
  </b>

</button>

        <button
  type="button"
  onClick={() =>
    navigate(
      `/people/employees/${employeeId}/hierarchy`
    )
  }
>
  <span>
    H
  </span>

  <div>
    <strong>
      Reporting Hierarchy
    </strong>

    <small>
      Head, managers, seniors and team structure
    </small>
  </div>

  <b>
    →
  </b>
</button>

      </section>

    </div>
  );
}

export default EmployeeDetailPage;
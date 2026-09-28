import React, {
  useCallback,
  useEffect,
  useMemo,
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

const formatDate = (value) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(date);
};


const pretty = (value) => {
  if (!value) {
    return "Not assigned";
  }

  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
};


const initials = (name) => {
  const parts = String(
    name || "Employee"
  )
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "E";
  }

  if (parts.length === 1) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
};


const displayValue = (
  value,
  fallback = "Not assigned"
) => {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return fallback;
  }

  return value;
};


const companyName = (employee) => {
  return (
    employee?.companyName ||
    pretty(employee?.companyCode) ||
    "Not assigned"
  );
};


const departmentName = (employee) => {
  return (
    employee?.departmentName ||
    employee?.department?.name ||
    "Not assigned"
  );
};


const reportingManagerName = (
  employee
) => {
  return (
    employee?.reportingManagerName ||
    employee?.reportsTo?.fullName ||
    employee?.reportingManager?.fullName ||
    "Not assigned"
  );
};


const DetailItem = ({
  label,
  value,
  wide = false,
  mono = false,
}) => {
  return (
    <div
      className={[
        "employee-detail-item",
        wide
          ? "employee-detail-item-wide"
          : "",
        mono
          ? "is-mono"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span>{label}</span>

      <strong>
        {displayValue(value)}
      </strong>
    </div>
  );
};


const SectionCard = ({
  eyebrow,
  title,
  children,
  className = "",
}) => {
  return (
    <section
      className={[
        "employee-detail-section-card",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="employee-detail-section-heading">
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="employee-detail-section-grid">
        {children}
      </div>
    </section>
  );
};


/* =========================================================
   COMPONENT
========================================================= */

function EmployeeDetailPage() {
  const { employeeId } =
    useParams();

  const navigate =
    useNavigate();

  const [
    employee,
    setEmployee,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");


  /* =======================================================
     LOAD EMPLOYEE
  ======================================================= */

  const load = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const result =
          await getEmployeeById(
            employeeId
          );

        setEmployee(
          result?.employee ||
          result?.data ||
          result ||
          null
        );
      } catch (requestError) {
        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError?.message ||
          "Employee could not be loaded."
        );
      } finally {
        setLoading(false);
      }
    },
    [employeeId]
  );


  useEffect(() => {
    load();
  }, [load]);


  /* =======================================================
     DERIVED DATA
  ======================================================= */

  const status =
    String(
      employee?.status ||
      "ACTIVE"
    ).toUpperCase();


  const onboarding =
    status === "ONBOARDING" ||
    Boolean(
      employee?.onboardingId ||
      employee?.onboarding?._id
    );


  const employeeDepartment =
    useMemo(
      () =>
        employee
          ? departmentName(employee)
          : "Not assigned",
      [employee]
    );


  const employeeManager =
    useMemo(
      () =>
        employee
          ? reportingManagerName(
              employee
            )
          : "Not assigned",
      [employee]
    );


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="employee-detail-page">
        <div className="employee-detail-loading">
          <span className="employee-detail-loader" />

          <div>
            <strong>
              Loading employee
            </strong>

            <small>
              Preparing employee profile...
            </small>
          </div>
        </div>
      </div>
    );
  }


  /* =======================================================
     ERROR
  ======================================================= */

  if (
    error ||
    !employee
  ) {
    return (
      <div className="employee-detail-page">
        <div className="employee-detail-error">
          <div className="employee-detail-error-icon">
            !
          </div>

          <strong>
            Employee profile unavailable
          </strong>

          <span>
            {error ||
              "Employee record was not found."}
          </span>

          <div className="employee-detail-error-actions">
            <button
              type="button"
              onClick={load}
            >
              Try Again
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/people/employees"
                )
              }
            >
              Employee Directory
            </button>
          </div>
        </div>
      </div>
    );
  }


  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="employee-detail-page">

      {/* =================================================
          TOP NAVIGATION
      ================================================= */}

      <div className="employee-detail-topbar">
        <button
          type="button"
          className="employees-back"
          onClick={() =>
            navigate(
              "/people/employees"
            )
          }
        >
          <span>←</span>
          Employee Directory
        </button>
      </div>


      {/* =================================================
          PROFILE HERO
      ================================================= */}

      <section className="employee-profile-hero employee-profile-hero-clean">

        <div className="employee-profile-main">

          <div className="employee-profile-avatar">

            {employee?.profilePhotoUrl ? (
              <img
                src={
                  employee.profilePhotoUrl
                }
                alt={
                  employee.fullName ||
                  "Employee"
                }
              />
            ) : (
              <span>
                {initials(
                  employee.fullName
                )}
              </span>
            )}

          </div>


          <div className="employee-profile-copy">

            <span className="employee-profile-eyebrow">
              EMPLOYEE PROFILE
            </span>

            <h1>
              {employee.fullName ||
                "Employee"}
            </h1>

            <p>
              {displayValue(
                employee.designation
              )}

              <span>•</span>

              {employeeDepartment}
            </p>


            <div className="employee-profile-tags">

              <strong>
                {employee.employeeCode ||
                  "No Employee ID"}
              </strong>

              <span
                className={`is-${status.toLowerCase()}`}
              >
                {pretty(status)}
              </span>

              {employee.workLocation ? (
                <span>
                  {employee.workLocation}
                </span>
              ) : null}

            </div>

          </div>

        </div>


        <div className="employee-profile-actions">

          <button
            type="button"
            className="employee-profile-edit-button"
            onClick={() =>
              navigate(
                `/people/employees/${employeeId}/edit`
              )
            }
          >
            <span>✎</span>
            Edit Employee
          </button>

        </div>

      </section>


      {/* =================================================
          PRIMARY RECORD
      ================================================= */}

      <div className="employee-detail-content-layout">


        {/* ===============================================
            ORGANISATION
        =============================================== */}

        <SectionCard
          eyebrow="WORK PROFILE"
          title="Organisation"
          className="employee-detail-section-primary"
        >

          <DetailItem
            label="Employee ID"
            value={
              employee.employeeCode
            }
            mono
          />

          <DetailItem
            label="Company"
            value={
              companyName(employee)
            }
          />

          <DetailItem
            label="Department"
            value={
              employeeDepartment
            }
          />

          <DetailItem
            label="Designation"
            value={
              employee.designation
            }
          />

          <DetailItem
            label="Organisation Unit"
            value={
              employee.orgUnit?.name ||
              employee.orgUnitName ||
              employee.orgUnitCode
            }
          />

          <DetailItem
            label="Reporting Manager"
            value={
              employeeManager
            }
          />

          <DetailItem
            label="Work Location"
            value={
              employee.workLocation
            }
          />

          <DetailItem
            label="Status"
            value={
              pretty(status)
            }
          />

        </SectionCard>


        {/* ===============================================
            CONTACT
        =============================================== */}

        <SectionCard
          eyebrow="CONTACT"
          title="Communication"
        >

          <DetailItem
            label="Mobile Number"
            value={
              employee.mobileNumber
                ? `+91 ${employee.mobileNumber}`
                : "Not assigned"
            }
          />

          <DetailItem
            label="Official Email"
            value={
              employee.officialEmail
            }
          />

          <DetailItem
            label="Personal Email"
            value={
              employee.personalEmail
            }
          />

          <DetailItem
            label="Biometric ID"
            value={
              employee.biometricCode
            }
            mono
          />

        </SectionCard>


        {/* ===============================================
            EMPLOYMENT
        =============================================== */}

        <SectionCard
          eyebrow="EMPLOYMENT"
          title="Employment Information"
        >

          <DetailItem
            label="Joining Date"
            value={formatDate(
              employee.joiningDate
            )}
          />

          <DetailItem
            label="Employment Type"
            value={pretty(
              employee.employmentType
            )}
          />

          <DetailItem
            label="Employee Status"
            value={pretty(status)}
          />

          {employee.exitDate ? (
            <DetailItem
              label="Exit Date"
              value={formatDate(
                employee.exitDate
              )}
            />
          ) : null}

        </SectionCard>

      </div>


      {/* =================================================
          EMPLOYEE WORKSPACE
      ================================================= */}

      <section className="employee-profile-workspace">

        <div className="employee-profile-workspace-heading">

          <div>
            <span>
              EMPLOYEE WORKSPACE
            </span>

            <h2>
              Manage Employee
            </h2>

            <p>
              Continue with the employee's operational records.
            </p>
          </div>

        </div>


        <div className="employee-profile-modules employee-profile-modules-clean">


          {/* ONBOARDING */}

          <button
            type="button"
            className={
              onboarding
                ? "is-priority"
                : ""
            }
            onClick={() =>
              navigate(
                `/people/employees/${employeeId}/onboarding`
              )
            }
          >

            <span className="employee-module-icon">
              O
            </span>

            <div>
              <strong>
                {onboarding
                  ? "Continue Onboarding"
                  : "Onboarding"}
              </strong>

              <small>
                Access, assets and employee activation
              </small>
            </div>

            <b>→</b>

          </button>


          {/* DOCUMENTS */}

          <button
            type="button"
            onClick={() =>
              navigate(
                `/people/employees/${employeeId}/documents`
              )
            }
          >

            <span className="employee-module-icon">
              D
            </span>

            <div>
              <strong>
                Documents
              </strong>

              <small>
                Employee document records and files
              </small>
            </div>

            <b>→</b>

          </button>


          {/* HIERARCHY */}

          <button
            type="button"
            onClick={() =>
              navigate(
                `/people/employees/${employeeId}/hierarchy`
              )
            }
          >

            <span className="employee-module-icon">
              H
            </span>

            <div>
              <strong>
                Reporting Hierarchy
              </strong>

              <small>
                Manager, reporting line and team structure
              </small>
            </div>

            <b>→</b>

          </button>

        </div>

      </section>

    </div>
  );
}


export default EmployeeDetailPage;
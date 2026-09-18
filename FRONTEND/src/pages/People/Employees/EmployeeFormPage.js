import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  createEmployee,
  getEmployeeById,
  getEmployeeMeta,
  getEmployees,
  updateEmployee,
} from "../../../services/employeeService";

import "./Employees.css";

/* =========================================================
   INITIAL
========================================================= */

const INITIAL_FORM = {
  employeeCode:
    "",

  companyCode:
    "SDP",

  fullName:
    "",

  personalEmail:
    "",

  officialEmail:
    "",

  mobileNumber:
    "",

  department:
    "",

  orgUnitCode:
    "",

  designation:
    "",

  reportsTo:
    "",

  employmentType:
    "PERMANENT",

  joiningDate:
    "",

  workLocation:
    "",

  biometricCode:
    "",

  status:
    "ACTIVE",
};

/* =========================================================
   HELPERS
========================================================= */

const dateInput =
  (
    value
  ) => {
    if (!value) {
      return "";
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
      return "";
    }

    return date
      .toISOString()
      .slice(
        0,
        10
      );
  };

const digits =
  (
    value,
    max =
      10
  ) =>
    String(
      value ||
      ""
    )
      .replace(
        /\D/g,
        ""
      )
      .slice(
        0,
        max
      );

/* =========================================================
   COMPONENT
========================================================= */

function EmployeeFormPage() {
  const {
    employeeId,
  } =
    useParams();

  const navigate =
    useNavigate();

  const editing =
    Boolean(
      employeeId
    );

  const [
    form,
    setForm,
  ] =
    useState(
      INITIAL_FORM
    );

  const [
    meta,
    setMeta,
  ] =
    useState(
      null
    );

  const [
    managers,
    setManagers,
  ] =
    useState(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    saving,
    setSaving,
  ] =
    useState(
      false
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

  useEffect(
    () => {
      let mounted =
        true;

      const load =
        async () => {
          try {
            setLoading(
              true
            );

            const [
              metaResult,
              employeeResult,
              employeesResult,
            ] =
              await Promise.all([
                getEmployeeMeta(),

                editing
                  ? getEmployeeById(
                      employeeId
                    )
                  : Promise.resolve(
                      null
                    ),

                getEmployees({
                  page: 1,
                  limit: 500,
                  status:
                    "ACTIVE",
                }),
              ]);

            if (
              !mounted
            ) {
              return;
            }

            setMeta(
              metaResult
            );

            setManagers(
              employeesResult
                ?.records ||
                []
            );

            if (
              employeeResult
            ) {
              setForm({
                employeeCode:
                  employeeResult
                    ?.employeeCode ||
                  "",

                companyCode:
                  employeeResult
                    ?.companyCode ||
                  "SDP",

                fullName:
                  employeeResult
                    ?.fullName ||
                  "",

                personalEmail:
                  employeeResult
                    ?.personalEmail ||
                  "",

                officialEmail:
                  employeeResult
                    ?.officialEmail ||
                  "",

                mobileNumber:
                  employeeResult
                    ?.mobileNumber ||
                  "",

                department:
                  employeeResult
                    ?.departmentId ||
                  "",

                orgUnitCode:
                  employeeResult
                    ?.orgUnitCode ||
                  "",

                designation:
                  employeeResult
                    ?.designation ||
                  "",

                reportsTo:
                  employeeResult
                    ?.reportingManagerId ||
                  "",

                employmentType:
                  employeeResult
                    ?.employmentType ||
                  "PERMANENT",

                joiningDate:
                  dateInput(
                    employeeResult
                      ?.joiningDate
                  ),

                workLocation:
                  employeeResult
                    ?.workLocation ||
                  "",

                biometricCode:
                  employeeResult
                    ?.biometricCode ||
                  "",

                status:
                  employeeResult
                    ?.status ||
                  "ACTIVE",
              });
            }
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
              "Employee form could not be loaded."
            );
          } finally {
            if (
              mounted
            ) {
              setLoading(
                false
              );
            }
          }
        };

      load();

      return () => {
        mounted =
          false;
      };
    },
    [
      editing,
      employeeId,
    ]
  );

  /* =====================================================
     UPDATE
  ===================================================== */

  const update =
    (
      key,
      value
    ) => {
      setForm(
        (
          previous
        ) => ({
          ...previous,

          [key]:
            value,
        })
      );
    };

  /* =====================================================
     DEPARTMENT OPTIONS
  ===================================================== */

  const departments =
    useMemo(
      () =>
        meta
          ?.departments ||
        [],
      [
        meta,
      ]
    );

  /* =====================================================
     VALIDATE
  ===================================================== */

  const validate =
    () => {
      if (
        !form
          .fullName
          .trim()
      ) {
        return "Employee name is required.";
      }

      if (
        form
          .mobileNumber &&
        digits(
          form.mobileNumber,
          10
        ).length !==
          10
      ) {
        return "Mobile number must contain exactly 10 digits.";
      }

      if (
        form
          .officialEmail &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          form
            .officialEmail
            .trim()
        )
      ) {
        return "Official email is not valid.";
      }

      if (
        !form
          .designation
          .trim()
      ) {
        return "Designation is required.";
      }

      if (
        !form
          .orgUnitCode &&
        !form
          .department
      ) {
        return "Department is required.";
      }

      return "";
    };

  /* =====================================================
     SAVE
  ===================================================== */

  const submit =
    async (
      event
    ) => {
      event
        .preventDefault();

      const validation =
        validate();

      if (
        validation
      ) {
        setError(
          validation
        );

        return;
      }

      try {
        setSaving(
          true
        );

        setError(
          ""
        );

        const payload = {
          ...form,

          mobileNumber:
            digits(
              form
                .mobileNumber,
              10
            ),
        };

        let result;

        if (
          editing
        ) {
          result =
            await updateEmployee(
              employeeId,
              payload
            );
        } else {
          const response =
            await createEmployee(
              payload
            );

          result =
            response
              ?.employee ||
            response;
        }

        const id =
          result?._id ||
          result?.id ||
          employeeId;

        navigate(
          id
            ? `/people/employees/${id}`
            : "/people/employees"
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
          "Employee could not be saved."
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  /* =====================================================
     LOADING
  ===================================================== */

  if (
    loading
  ) {
    return (
      <div className="employee-form-page">

        <div className="employee-detail-loading">
          Loading employee form...
        </div>

      </div>
    );
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="employee-form-page">

      <button
        type="button"
        className="employees-back"
        onClick={() =>
          navigate(
            editing
              ? `/people/employees/${employeeId}`
              : "/people/employees"
          )
        }
      >
        ← Back
      </button>

      <section className="employee-form-header">

        <div>

          <span>
            PEOPLE / EMPLOYEE MASTER
          </span>

          <h1>
            {editing
              ? "Edit Employee"
              : "Add Existing Employee"}
          </h1>

          <p>
            {editing
              ? "Update the permanent employee master record."
              : "Create an employee directly for existing or historical staff without repeating the Recruitment workflow."}
          </p>

        </div>

        <div className="employee-form-header-status">

          <span>
            RECORD TYPE
          </span>

          <strong>
            {editing
              ? "Employee Master"
              : "Direct Employee Entry"}
          </strong>

        </div>

      </section>

      <form
        onSubmit={
          submit
        }
        className="employee-form-shell"
      >

        {error ? (
          <div className="employee-form-error">
            {error}
          </div>
        ) : null}

        {/* =================================================
            IDENTITY
        ================================================== */}

        <section className="employee-form-section">

          <div className="employee-form-section-head">

            <span>
              01
            </span>

            <div>

              <h2>
                Employee Identity
              </h2>

              <p>
                Permanent employee master identification.
              </p>

            </div>

          </div>

          <div className="employee-form-grid">

            <label>

              <span>
                Full Name *
              </span>

              <input
                value={
                  form
                    .fullName
                }
                onChange={(
                  event
                ) =>
                  update(
                    "fullName",
                    event
                      .target
                      .value
                  )
                }
                placeholder="Employee full name"
              />

            </label>

            <label>

              <span>
                Company *
              </span>

              <select
                value={
                  form
                    .companyCode
                }
                onChange={(
                  event
                ) =>
                  update(
                    "companyCode",
                    event
                      .target
                      .value
                  )
                }
              >

                <option value="SDP">
                  Sandeep Edge Tech
                </option>

                <option value="VNJ">
                  Vanija
                </option>

              </select>

            </label>

            <label>

              <span>
                Employee ID
              </span>

              <input
                value={
                  form
                    .employeeCode
                }
                onChange={(
                  event
                ) =>
                  update(
                    "employeeCode",
                    event
                      .target
                      .value
                      .toUpperCase()
                  )
                }
                placeholder="Auto-generated if backend supports it"
              />

              <small>
                Example: SDP-001 / VNJ-001
              </small>

            </label>

            <label>

              <span>
                Biometric ID
              </span>

              <input
                value={
                  form
                    .biometricCode
                }
                onChange={(
                  event
                ) =>
                  update(
                    "biometricCode",
                    event
                      .target
                      .value
                  )
                }
                placeholder="eSSL / biometric employee code"
              />

            </label>

          </div>

        </section>

        {/* =================================================
            CONTACT
        ================================================== */}

        <section className="employee-form-section">

          <div className="employee-form-section-head">

            <span>
              02
            </span>

            <div>

              <h2>
                Contact Information
              </h2>

              <p>
                Personal and official employee communication.
              </p>

            </div>

          </div>

          <div className="employee-form-grid">

            <label>

              <span>
                Personal Email
              </span>

              <input
                type="email"
                value={
                  form
                    .personalEmail
                }
                onChange={(
                  event
                ) =>
                  update(
                    "personalEmail",
                    event
                      .target
                      .value
                  )
                }
              />

            </label>

            <label>

              <span>
                Official Email
              </span>

              <input
                type="email"
                value={
                  form
                    .officialEmail
                }
                onChange={(
                  event
                ) =>
                  update(
                    "officialEmail",
                    event
                      .target
                      .value
                  )
                }
              />

            </label>

            <label>

              <span>
                Mobile Number
              </span>

              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={
                  form
                    .mobileNumber
                }
                onChange={(
                  event
                ) =>
                  update(
                    "mobileNumber",
                    digits(
                      event
                        .target
                        .value,
                      10
                    )
                  )
                }
              />

              <small>
                Exactly 10 digits
              </small>

            </label>

          </div>

        </section>

        {/* =================================================
            ORGANISATION
        ================================================== */}

        <section className="employee-form-section">

          <div className="employee-form-section-head">

            <span>
              03
            </span>

            <div>

              <h2>
                Organisation & Reporting
              </h2>

              <p>
                Department, designation and reporting hierarchy.
              </p>

            </div>

          </div>

          <div className="employee-form-grid">

            <label>

              <span>
                Department *
              </span>

              <select
                value={
                  form
                    .department
                }
                onChange={(
                  event
                ) => {
                  const value =
                    event
                      .target
                      .value;

                  update(
                    "department",
                    value
                  );

                  const selected =
                    departments.find(
                      (
                        item
                      ) =>
                        String(
                          item
                            ?._id ||
                          item?.id
                        ) ===
                        String(
                          value
                        )
                    );

                  if (
                    selected?.code
                  ) {
                    update(
                      "orgUnitCode",
                      selected
                        .code
                    );
                  }
                }}
              >

                <option value="">
                  Select Department
                </option>

                {departments.map(
                  (
                    item
                  ) => (
                    <option
                      key={
                        item?._id ||
                        item?.id ||
                        item?.code
                      }
                      value={
                        item?._id ||
                        item?.id ||
                        item?.code
                      }
                    >
                      {item
                        .name}
                    </option>
                  )
                )}

              </select>

            </label>

            <label>

              <span>
                Designation *
              </span>

              <input
                value={
                  form
                    .designation
                }
                onChange={(
                  event
                ) =>
                  update(
                    "designation",
                    event
                      .target
                      .value
                  )
                }
                placeholder="Sales Executive"
              />

            </label>

            <label>

              <span>
                Reporting Manager
              </span>

              <select
                value={
                  form
                    .reportsTo
                }
                onChange={(
                  event
                ) =>
                  update(
                    "reportsTo",
                    event
                      .target
                      .value
                  )
                }
              >

                <option value="">
                  No Reporting Manager
                </option>

                {managers
                  .filter(
                    (
                      item
                    ) =>
                      String(
                        item?._id
                      ) !==
                      String(
                        employeeId
                      )
                  )
                  .map(
                    (
                      manager
                    ) => (
                      <option
                        key={
                          manager
                            ._id
                        }
                        value={
                          manager
                            ._id
                        }
                      >
                        {manager
                          .fullName}
                        {" — "}
                        {manager
                          .designation}
                      </option>
                    )
                  )}

              </select>

            </label>

            <label>

              <span>
                Work Location
              </span>

              <input
                value={
                  form
                    .workLocation
                }
                onChange={(
                  event
                ) =>
                  update(
                    "workLocation",
                    event
                      .target
                      .value
                  )
                }
                placeholder="Delhi / Sonipat"
              />

            </label>

          </div>

        </section>

        {/* =================================================
            EMPLOYMENT
        ================================================== */}

        <section className="employee-form-section">

          <div className="employee-form-section-head">

            <span>
              04
            </span>

            <div>

              <h2>
                Employment Record
              </h2>

              <p>
                Joining and employment classification.
              </p>

            </div>

          </div>

          <div className="employee-form-grid">

            <label>

              <span>
                Joining Date
              </span>

              <input
                type="date"
                value={
                  form
                    .joiningDate
                }
                onChange={(
                  event
                ) =>
                  update(
                    "joiningDate",
                    event
                      .target
                      .value
                  )
                }
              />

            </label>

            <label>

              <span>
                Employment Type
              </span>

              <select
                value={
                  form
                    .employmentType
                }
                onChange={(
                  event
                ) =>
                  update(
                    "employmentType",
                    event
                      .target
                      .value
                  )
                }
              >

                {(meta
                  ?.employmentTypes ||
                  [
                    "PERMANENT",
                    "PROBATION",
                    "CONTRACT",
                    "TRAINEE",
                    "INTERN",
                    "CONSULTANT",
                  ]).map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item
                        }
                        value={
                          item
                        }
                      >
                        {item
                          .replaceAll(
                            "_",
                            " "
                          )}
                      </option>
                    )
                  )}

              </select>

            </label>

            <label>

              <span>
                Employee Status
              </span>

              <select
                value={
                  form
                    .status
                }
                onChange={(
                  event
                ) =>
                  update(
                    "status",
                    event
                      .target
                      .value
                  )
                }
              >

                {(meta
                  ?.statuses ||
                  [
                    "ACTIVE",
                    "INACTIVE",
                    "NOTICE_PERIOD",
                    "EXITED",
                  ]).map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item
                        }
                        value={
                          item
                        }
                      >
                        {item
                          .replaceAll(
                            "_",
                            " "
                          )}
                      </option>
                    )
                  )}

              </select>

            </label>

          </div>

        </section>

        {/* =================================================
            FOOTER
        ================================================== */}

        <div className="employee-form-footer">

          <div>

            <strong>
              Employee Master Record
            </strong>

            <span>
              Save only verified employee information.
            </span>

          </div>

          <div>

            <button
              type="button"
              className="employee-form-cancel"
              onClick={() =>
                navigate(
                  editing
                    ? `/people/employees/${employeeId}`
                    : "/people/employees"
                )
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="employee-form-save"
              disabled={
                saving
              }
            >
              {saving
                ? "Saving..."
                : editing
                  ? "Save Changes"
                  : "Create Employee"}

              <span>
                →
              </span>

            </button>

          </div>

        </div>

      </form>

    </div>
  );
}

export default EmployeeFormPage;
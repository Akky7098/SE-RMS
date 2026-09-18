import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createEmployeeFromOnboarding,
  getOnboardingById,
  getOnboardingManagers,
  getOnboardingMeta,
  updateOnboarding,
} from "../../../../services/employeeOnboardingService";

/* =========================================================
   INITIAL
========================================================= */

const INITIAL_FORM = {
  companyCode:
    "SDP",

  fullName:
    "",

  personalEmail:
    "",

  mobileNumber:
    "",

  joiningDate:
    "",

  department:
    "",

  orgUnitCode:
    "",

  designation:
    "",

  employmentType:
    "PERMANENT",

  workLocation:
    "",

  reportsTo:
    "",

  officialEmail:
    "",
};

/* =========================================================
   HELPERS
========================================================= */

const dateInput =
  (
    value
  ) => {
    if (
      !value
    ) {
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

const formatDate =
  (
    value
  ) => {
    if (
      !value
    ) {
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
            "short",

          year:
            "numeric",
        }
      )
      .format(
        date
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

const objectId =
  (
    value
  ) => {
    if (
      !value
    ) {
      return "";
    }

    if (
      typeof value ===
        "object"
    ) {
      return (
        value._id ||
        value.id ||
        ""
      );
    }

    return value;
  };

const getDepartmentName =
  (
    onboarding
  ) =>
    onboarding
      ?.department
      ?.name ||
    onboarding
      ?.departmentName ||
    "Not assigned";

const getHiringHrName =
  (
    onboarding
  ) =>
    onboarding
      ?.hiringHr
      ?.displayName ||
    onboarding
      ?.hiringHrName ||
    "Not assigned";

const getManagerName =
  (
    manager
  ) =>
    manager?.fullName ||
    manager?.displayName ||
    "Employee";

/* =========================================================
   COMPONENT
========================================================= */

function EmployeeCreationModal({
  onboardingId,
  onClose,
  onCreated,
}) {
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

  const [
    onboarding,
    setOnboarding,
  ] =
    useState(
      null
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
    form,
    setForm,
  ] =
    useState(
      INITIAL_FORM
    );

  const [
    createdEmployee,
    setCreatedEmployee,
  ] =
    useState(
      null
    );

  /* =====================================================
     LOAD
  ===================================================== */

  const load =
    useCallback(
      async () => {
        if (
          !onboardingId
        ) {
          return;
        }

        try {
          setLoading(
            true
          );

          setError(
            ""
          );

          const [
            onboardingResult,
            metaResult,
          ] =
            await Promise.all([
              getOnboardingById(
                onboardingId
              ),

              getOnboardingMeta(),
            ]);

          setOnboarding(
            onboardingResult
          );

          setMeta(
            metaResult
          );

          const departmentId =
            objectId(
              onboardingResult
                ?.department
            );

          const companyCode =
            onboardingResult
              ?.companyCode ||
            metaResult
              ?.companies
              ?.[0]
              ?.code ||
            "SDP";

          const initialForm = {
            companyCode,

            fullName:
              onboardingResult
                ?.fullName ||
              "",

            personalEmail:
              onboardingResult
                ?.personalEmail ||
              "",

            mobileNumber:
              onboardingResult
                ?.mobileNumber ||
              "",

            joiningDate:
              dateInput(
                onboardingResult
                  ?.joiningDate
              ),

            department:
              departmentId,

            orgUnitCode:
              onboardingResult
                ?.orgUnitCode ||
              "",

            designation:
              onboardingResult
                ?.designation ||
              "",

            employmentType:
              onboardingResult
                ?.employmentType ||
              "PERMANENT",

            workLocation:
              onboardingResult
                ?.workLocation ||
              "",

            reportsTo:
              objectId(
                onboardingResult
                  ?.reportsTo
              ),

            officialEmail:
              onboardingResult
                ?.officialEmail ||
              "",
          };

          setForm(
            initialForm
          );

          const managerResult =
  await getOnboardingManagers({
    orgUnitCode:
      initialForm
        .orgUnitCode ||
      undefined,

    departmentId:
      initialForm
        .department ||
      undefined,

    limit:
      100,
  });

          setManagers(
            Array.isArray(
              managerResult
            )
              ? managerResult
              : []
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
            "Employee onboarding details could not be loaded."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        onboardingId,
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
     ESC KEY
  ===================================================== */

  useEffect(
    () => {
      const handleKeyDown =
        (
          event
        ) => {
          if (
            event.key ===
              "Escape" &&
            !saving
          ) {
            onClose?.();
          }
        };

      window.addEventListener(
        "keydown",
        handleKeyDown
      );

      return () =>
        window.removeEventListener(
          "keydown",
          handleKeyDown
        );
    },
    [
      onClose,
      saving,
    ]
  );

  /* =====================================================
     BODY LOCK
  ===================================================== */

  useEffect(
    () => {
      const previousOverflow =
        document
          .body
          .style
          .overflow;

      document
        .body
        .style
        .overflow =
        "hidden";

      return () => {
        document
          .body
          .style
          .overflow =
          previousOverflow;
      };
    },
    []
  );

  /* =====================================================
     META
  ===================================================== */

  const companies =
    useMemo(
      () =>
        meta?.companies ||
        [
          {
            code:
              "SDP",

            name:
              "Sandeep Edge Tech",

            nextEmployeeCodePreview:
              "SDP-001",
          },

          {
            code:
              "VNJ",

            name:
              "Vanija",

            nextEmployeeCodePreview:
              "VNJ-001",
          },
        ],
      [
        meta,
      ]
    );

  const departments =
    useMemo(
      () =>
        meta?.departments ||
        [],
      [
        meta,
      ]
    );

  const employmentTypes =
    useMemo(
      () =>
        meta
          ?.employmentTypes ||
        [
          "PERMANENT",
          "PROBATION",
          "CONTRACT",
          "TRAINEE",
          "INTERN",
          "CONSULTANT",
        ],
      [
        meta,
      ]
    );

  const selectedCompany =
    useMemo(
      () =>
        companies.find(
          (
            company
          ) =>
            company.code ===
            form.companyCode
        ) ||
        null,
      [
        companies,
        form.companyCode,
      ]
    );

  const employeeCodePreview =
    selectedCompany
      ?.nextEmployeeCodePreview ||
    "Auto generated";

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
     DEPARTMENT
  ===================================================== */

  const handleDepartment =
    async (
      departmentId
    ) => {
      const selected =
        departments.find(
          (
            department
          ) =>
            String(
              department
                ?._id ||
              department?.id
            ) ===
            String(
              departmentId
            )
        );

      const orgUnitCode =
        selected?.code ||
        "";

      setForm(
        (
          previous
        ) => ({
          ...previous,

          department:
            departmentId,

          orgUnitCode,

          /*
           * Reset manager because department changed.
           */
          reportsTo:
            "",
        })
      );

      try {
        const result =
  await getOnboardingManagers({
    orgUnitCode:
      orgUnitCode ||
      undefined,

    departmentId:
      departmentId ||
      undefined,

    limit:
      100,
  });

        setManagers(
          Array.isArray(
            result
          )
            ? result
            : []
        );
      } catch {
        /*
         * Manager loading should not destroy the popup.
         */
        setManagers(
          []
        );
      }
    };

  /* =====================================================
     VALIDATE
  ===================================================== */

  const validate =
    () => {
      if (
        !form.companyCode
      ) {
        return "Company is required.";
      }

      if (
        !form
          .fullName
          .trim()
      ) {
        return "Employee name is missing from recruitment data.";
      }

      if (
        !form.department &&
        !form.orgUnitCode
      ) {
        return "Department is required.";
      }

      if (
        !form
          .designation
          .trim()
      ) {
        return "Designation is required.";
      }

      if (
        !form.joiningDate
      ) {
        return "Joining date is required.";
      }

      if (
        !form.reportsTo
      ) {
        return "Please select a Reporting Manager.";
      }

      if (
        form.mobileNumber &&
        digits(
          form.mobileNumber,
          10
        ).length !==
          10
      ) {
        return "Mobile number must contain exactly 10 digits.";
      }

      if (
        form.officialEmail &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          form
            .officialEmail
            .trim()
        )
      ) {
        return "Official email is not valid.";
      }

      return "";
    };

  /* =====================================================
     CREATE
  ===================================================== */

  const createEmployee =
    async () => {
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

        /*
         * Step 1:
         * Save only the employee-master fields HR confirmed.
         *
         * Recruitment-derived values remain visible, but
         * we also save them back in case HR corrected one.
         */
        const updated =
          await updateOnboarding(
            onboardingId,
            {
              companyCode:
                form.companyCode,

              fullName:
                form
                  .fullName
                  .trim(),

              personalEmail:
                form
                  .personalEmail
                  .trim(),

              mobileNumber:
                digits(
                  form.mobileNumber,
                  10
                ),

              joiningDate:
                form.joiningDate,

              department:
                form.department ||
                null,

              orgUnitCode:
                form.orgUnitCode,

              designation:
                form
                  .designation
                  .trim(),

              reportsTo:
                form.reportsTo,

              employmentType:
                form.employmentType,

              workLocation:
                form
                  .workLocation
                  .trim(),

              officialEmail:
                form
                  .officialEmail
                  .trim()
                  .toLowerCase(),
            }
          );

        /*
         * Step 2:
         * Create permanent Employee.
         */
        const created =
          await createEmployeeFromOnboarding(
            onboardingId
          );

        const employee =
          created
            ?.employee ||
          updated
            ?.employee ||
          created ||
          null;

        setOnboarding(
          created ||
          updated
        );

        setCreatedEmployee({
          id:
            employee?._id ||
            employee?.id ||
            created
              ?.employee
              ?._id ||
            null,

          employeeCode:
            employee
              ?.employeeCode ||
            created
              ?.employeeCode ||
            employeeCodePreview,

          fullName:
            employee
              ?.fullName ||
            form.fullName,

          designation:
            employee
              ?.designation ||
            form.designation,
        });

        onCreated?.(
          created ||
          updated
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
          "Employee could not be created."
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  /* =====================================================
     OVERLAY CLOSE
  ===================================================== */

  const handleOverlay =
    (
      event
    ) => {
      if (
        event.target ===
          event.currentTarget &&
        !saving
      ) {
        onClose?.();
      }
    };

  /* =====================================================
     SUCCESS
  ===================================================== */

  if (
    createdEmployee
  ) {
    return (
      <div
        className="employee-create-modal-overlay"
        onMouseDown={
          handleOverlay
        }
      >

        <div className="employee-create-modal employee-create-modal--success">

          <div className="employee-create-success-icon">
            ✓
          </div>

          <span className="employee-create-eyebrow">
            EMPLOYEE CREATED
          </span>

          <h2>
            {createdEmployee.fullName}
          </h2>

          <div className="employee-create-code">
            {createdEmployee.employeeCode}
          </div>

          <p>
            The permanent employee record has been created.
            Onboarding can now continue with documents,
            assets, access and appointment formalities.
          </p>

          <div className="employee-create-success-summary">

            <div>
              <span>
                DESIGNATION
              </span>

              <strong>
                {createdEmployee.designation ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                NEXT STAGE
              </span>

              <strong>
                Documents
              </strong>
            </div>

          </div>

          <button
            type="button"
            className="employee-create-primary"
            onClick={
              onClose
            }
          >
            Continue Onboarding
            <span>
              →
            </span>
          </button>

        </div>

      </div>
    );
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div
      className="employee-create-modal-overlay"
      onMouseDown={
        handleOverlay
      }
    >

      <div
        className="employee-create-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Create employee"
      >

        {/* =================================================
            HEADER
        ================================================== */}

        <div className="employee-create-modal-header">

          <div>

            <span className="employee-create-eyebrow">
              PEOPLE / DAY 1 HANDOVER
            </span>

            <h2>
              Create Employee
            </h2>

            <p>
              Recruitment information is already filled.
              HR only needs to confirm organisation and
              reporting details.
            </p>

          </div>

          <button
            type="button"
            className="employee-create-close"
            onClick={
              onClose
            }
            disabled={
              saving
            }
            aria-label="Close"
          >
            ×
          </button>

        </div>

        {/* =================================================
            LOADING
        ================================================== */}

        {loading ? (
          <div className="employee-create-loading">

            <div className="onboarding-spinner" />

            <strong>
              Preparing employee record
            </strong>

            <span>
              Loading recruitment and Day 1 information...
            </span>

          </div>
        ) : null}

        {/* =================================================
            ERROR
        ================================================== */}

        {!loading &&
        error ? (
          <div className="employee-create-inline-error">

            <span>
              !
            </span>

            <div>

              <strong>
                Employee could not be created
              </strong>

              <p>
                {error}
              </p>

            </div>

          </div>
        ) : null}

        {!loading ? (
          <>

            {/* =============================================
                AUTOFILLED SNAPSHOT
            ============================================== */}

            <section className="employee-create-prefill">

              <div className="employee-create-section-title">

                <div className="employee-create-step-number is-complete">
                  ✓
                </div>

                <div>

                  <span>
                    AUTO-FILLED
                  </span>

                  <h3>
                    Recruitment Information
                  </h3>

                  <p>
                    Verified information carried forward
                    automatically from Recruitment and Day 1.
                  </p>

                </div>

              </div>

              <div className="employee-create-prefill-grid">

                <div className="is-wide">

                  <span>
                    EMPLOYEE
                  </span>

                  <strong>
                    {form.fullName ||
                      "—"}
                  </strong>

                  <small>
                    {form.personalEmail ||
                      "No personal email"}
                  </small>

                </div>

                <div>

                  <span>
                    MOBILE
                  </span>

                  <strong>
                    {form.mobileNumber ||
                      "—"}
                  </strong>

                </div>

                <div>

                  <span>
                    JOINING DATE
                  </span>

                  <strong>
                    {formatDate(
                      form.joiningDate
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    DESIGNATION
                  </span>

                  <strong>
                    {form.designation ||
                      "—"}
                  </strong>

                </div>

                <div>

                  <span>
                    DEPARTMENT
                  </span>

                  <strong>
                    {getDepartmentName(
                      onboarding
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    LOCATION
                  </span>

                  <strong>
                    {form.workLocation ||
                      "—"}
                  </strong>

                </div>

                <div>

                  <span>
                    HIRING HR
                  </span>

                  <strong>
                    {getHiringHrName(
                      onboarding
                    )}
                  </strong>

                </div>

              </div>

            </section>

            {/* =============================================
                HR ASSIGNMENT
            ============================================== */}

            <section className="employee-create-assignment">

              <div className="employee-create-section-title">

                <div className="employee-create-step-number">
                  02
                </div>

                <div>

                  <span>
                    HR ACTION
                  </span>

                  <h3>
                    Employee Assignment
                  </h3>

                  <p>
                    Confirm only the fields required to create
                    the permanent employee record.
                  </p>

                </div>

              </div>

              <div className="employee-create-form-grid">

                {/* =========================================
                    COMPANY
                ========================================== */}

                <label>

                  <span>
                    Company *
                  </span>

                  <select
                    value={
                      form.companyCode
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

                    {companies.map(
                      (
                        company
                      ) => (
                        <option
                          key={
                            company.code
                          }
                          value={
                            company.code
                          }
                        >
                          {company.name ||
                            company.label ||
                            company.code}
                        </option>
                      )
                    )}

                  </select>

                </label>

                {/* =========================================
                    EMPLOYEE ID
                ========================================== */}

                <label>

                  <span>
                    Employee ID
                  </span>

                  <div className="employee-create-id-preview">

                    <strong>
                      {employeeCodePreview}
                    </strong>

                    <small>
                      AUTO
                    </small>

                  </div>

                  <small className="employee-create-field-help">
                    Generated automatically when employee is created.
                  </small>

                </label>

                {/* =========================================
                    DEPARTMENT
                ========================================== */}

                <label>

                  <span>
                    Department *
                  </span>

                  <select
                    value={
                      form.department
                    }
                    onChange={(
                      event
                    ) =>
                      handleDepartment(
                        event
                          .target
                          .value
                      )
                    }
                  >

                    <option value="">
                      Select Department
                    </option>

                    {departments.map(
                      (
                        department
                      ) => (
                        <option
                          key={
                            department
                              ?._id ||
                            department
                              ?.id ||
                            department
                              ?.code
                          }
                          value={
                            department
                              ?._id ||
                            department
                              ?.id ||
                            ""
                          }
                        >
                          {department.name}
                        </option>
                      )
                    )}

                  </select>

                </label>

                {/* =========================================
                    DESIGNATION
                ========================================== */}

                <label>

                  <span>
                    Designation *
                  </span>

                  <input
                    value={
                      form.designation
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
                    placeholder="Employee designation"
                  />

                </label>

                {/* =========================================
                    EMPLOYMENT TYPE
                ========================================== */}

                <label>

                  <span>
                    Employment Type *
                  </span>

                  <select
                    value={
                      form.employmentType
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

                    {employmentTypes.map(
                      (
                        type
                      ) => (
                        <option
                          key={
                            type
                          }
                          value={
                            type
                          }
                        >
                          {String(
                            type
                          ).replaceAll(
                            "_",
                            " "
                          )}
                        </option>
                      )
                    )}

                  </select>

                </label>

                {/* =========================================
                    REPORTING MANAGER
                ========================================== */}

                <label>

                  <span>
                    Reporting Manager *
                  </span>

                  <select
                    value={
                      form.reportsTo
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
                      Select Reporting Manager
                    </option>

                    {managers.map(
                      (
                        manager
                      ) => (
                        <option
                          key={
                            manager._id
                          }
                          value={
                            manager._id
                          }
                        >
                          {getManagerName(
                            manager
                          )}

                          {manager.designation
                            ? ` — ${manager.designation}`
                            : ""}
                        </option>
                      )
                    )}

                  </select>

                  <small className="employee-create-field-help">
                    Active employees available for reporting hierarchy.
                  </small>

                </label>

                {/* =========================================
                    OFFICIAL EMAIL
                ========================================== */}

                <label className="employee-create-field-wide">

                  <span>
                    Official Email
                  </span>

                  <input
                    type="email"
                    value={
                      form.officialEmail
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
                    placeholder="name@sandeepedgetech.com"
                  />

                  <small className="employee-create-field-help">
                    Optional now. It can also be assigned later during
                    Official Email / Access stage.
                  </small>

                </label>

              </div>

            </section>

            {/* =============================================
                CONTROL NOTE
            ============================================== */}

            <div className="employee-create-control-note">

              <span>
                ✓
              </span>

              <div>

                <strong>
                  No duplicate data entry
                </strong>

                <p>
                  Name, personal email, mobile, joining date,
                  designation and recruitment ownership were
                  carried forward automatically.
                </p>

              </div>

            </div>

            {/* =============================================
                FOOTER
            ============================================== */}

            <div className="employee-create-modal-footer">

              <div>

                <span>
                  EMPLOYEE CREATION
                </span>

                <strong>
                  {employeeCodePreview}
                </strong>

              </div>

              <div>

                <button
                  type="button"
                  className="employee-create-cancel"
                  onClick={
                    onClose
                  }
                  disabled={
                    saving
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="employee-create-primary"
                  onClick={
                    createEmployee
                  }
                  disabled={
                    saving
                  }
                >
                  {saving
                    ? "Creating Employee..."
                    : "Create Employee"}

                  <span>
                    →
                  </span>
                </button>

              </div>

            </div>

          </>
        ) : null}

      </div>

    </div>
  );
}

export default EmployeeCreationModal;
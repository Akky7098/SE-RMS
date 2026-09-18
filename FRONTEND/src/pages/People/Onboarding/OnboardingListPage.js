import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  getOnboardingList,
  startEmployeeOnboarding,
} from "../../../services/employeeOnboardingService";

import EmployeeCreationModal from "./components/EmployeeCreationModal";

import "./Onboarding.css";

/* =========================================================
   CONSTANTS
========================================================= */

const PAGE_SIZE =
  20;

const PAGINATION_KEY =
  "op";

/* =========================================================
   BASIC HELPERS
========================================================= */

const normalize =
  (
    value
  ) =>
    String(
      value ||
        ""
    )
      .trim()
      .toUpperCase();

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
            "short",

          year:
            "numeric",
        }
      )
      .format(
        date
      );
  };

const initials =
  (
    name
  ) =>
    String(
      name ||
        "C"
    )
      .split(
        " "
      )
      .filter(
        Boolean
      )
      .slice(
        0,
        2
      )
      .map(
        (
          item
        ) =>
          item[0]
            ?.toUpperCase()
      )
      .join(
        ""
      );

/* =========================================================
   RESPONSE NORMALIZER
========================================================= */

const normalizeListResponse =
  (
    result,
    fallbackPage
  ) => {
    const records =
      Array.isArray(
        result?.records
      )
        ? result.records
        : Array.isArray(
            result?.onboarding
          )
          ? result.onboarding
          : Array.isArray(
              result?.items
            )
            ? result.items
            : [];

    const pagination =
      result?.pagination ||
      {};

    return {
      records,

      pagination: {
        page:
          Number(
            pagination.page
          ) ||
          fallbackPage ||
          1,

        pages:
          Math.max(
            1,
            Number(
              pagination.pages
            ) ||
              1
          ),

        total:
          Number(
            pagination.total
          ) ||
          records.length,

        limit:
          Number(
            pagination.limit
          ) ||
          PAGE_SIZE,
      },
    };
  };

/* =========================================================
   RECORD IDS
========================================================= */

const getOnboardingId =
  (
    record
  ) =>
    record?.onboardingId ||
    record?.onboarding?._id ||
    (
      record?.recordType ===
        "ONBOARDING"
        ? record?._id
        : null
    ) ||
    null;

const getSelectionId =
  (
    record
  ) =>
    record?.selectionId ||
    record?.selection?._id ||
    (
      typeof record?.selection ===
        "string"
        ? record.selection
        : null
    ) ||
    null;

/* =========================================================
   DISPLAY HELPERS
========================================================= */

const getFullName =
  (
    record
  ) =>
    record?.fullName ||
    record?.candidateName ||
    record?.candidate?.fullName ||
    "Unnamed Candidate";

const getEmail =
  (
    record
  ) =>
    record?.personalEmail ||
    record?.email ||
    record?.candidate?.email ||
    record?.candidate?.personalEmail ||
    "";

const getPhoto =
  (
    record
  ) =>
    record?.profilePhotoUrl ||
    record?.candidate?.profilePhotoUrl ||
    "";

const getDesignation =
  (
    record
  ) =>
    record?.designation ||
    record?.positionTitle ||
    record?.selection?.positionTitle ||
    "Designation pending";

const getDepartmentName =
  (
    record
  ) =>
    record?.departmentName ||
    record?.department?.name ||
    record?.selection?.department?.name ||
    record?.orgUnitCode ||
    "Department pending";

const getHiringHrName =
  (
    record
  ) =>
    record?.hiringHrName ||
    record?.hiringHr?.displayName ||
    record?.selection
      ?.hiringHr
      ?.displayName ||
    "Not assigned";

const getJoiningDate =
  (
    record
  ) =>
    record?.joiningDate ||
    record?.actualJoiningDate ||
    record?.joining
      ?.actualJoiningDate ||
    record?.selection
      ?.finalJoiningDate ||
    null;

/* =========================================================
   STATUS
========================================================= */

const getStatus =
  (
    record
  ) =>
    normalize(
      record?.onboardingStatus ||
      record?.status ||
      record?.onboarding?.status ||
      (
        !getOnboardingId(
          record
        )
          ? "DAY1_CONFIRMED"
          : "STARTED"
      )
    );

/* =========================================================
   PROGRESS
========================================================= */

const getProgress =
  (
    record
  ) => {
    const explicit =
      [
        record?.progress,
        record?.onboardingProgress,
        record?.completionPercentage,
        record?.onboarding?.progress,
      ].find(
        (
          value
        ) =>
          value !==
            undefined &&
          value !==
            null &&
          Number.isFinite(
            Number(
              value
            )
          )
      );

    if (
      explicit !==
      undefined
    ) {
      return Math.max(
        0,
        Math.min(
          100,
          Number(
            explicit
          )
        )
      );
    }

    const status =
      getStatus(
        record
      );

    if (
      status ===
      "DAY1_CONFIRMED"
    ) {
      return 0;
    }

    if (
      status ===
      "STARTED"
    ) {
      return 10;
    }

    if (
      status ===
      "PROFILE_READY"
    ) {
      return 20;
    }

    if (
      status ===
      "EMPLOYEE_CREATED"
    ) {
      return 30;
    }

    if (
      status ===
      "DOCUMENTS_IN_PROGRESS"
    ) {
      return 40;
    }

    if (
      status ===
      "DOCUMENTS_COMPLETED"
    ) {
      return 50;
    }

    if (
      status ===
      "ASSETS_COMPLETED"
    ) {
      return 65;
    }

    if (
      status ===
        "APPOINTMENT_READY" ||
      status ===
        "APPOINTMENT_ISSUED"
    ) {
      return 78;
    }

    if (
      status ===
        "ACCESS_READY" ||
      status ===
        "WELCOME_SENT"
    ) {
      return 90;
    }

    if (
      status ===
      "COMPLETED"
    ) {
      return 100;
    }

    const checklist =
      record?.checklist ||
      record?.onboarding?.checklist ||
      {};

    const values = [
      checklist?.employeeProfile,
      checklist?.reportingHierarchy,
      checklist?.documents,
      checklist?.assets,
      checklist?.appointmentLetter,
      checklist?.officialEmail,
      checklist?.rmsAccess,
      checklist?.welcomeMail,
      checklist?.finalReview,
    ];

    const applicable =
      values.filter(
        (
          value
        ) =>
          value !==
          undefined
      );

    if (
      applicable.length ===
      0
    ) {
      return getOnboardingId(
        record
      )
        ? 10
        : 0;
    }

    const done =
      applicable.filter(
        Boolean
      ).length;

    return Math.round(
      (
        done /
        applicable.length
      ) *
      100
    );
  };

/* =========================================================
   CURRENT STAGE
========================================================= */

const getCurrentStage =
  (
    record
  ) => {
    const direct =
      record?.currentStage ||
      record?.currentOnboardingStep ||
      record?.onboardingCurrentStep ||
      record?.onboarding?.currentStep;

    if (
      direct
    ) {
      return pretty(
        direct
      );
    }

    const status =
      getStatus(
        record
      );

    if (
      status ===
      "DAY1_CONFIRMED"
    ) {
      return "Ready to Onboard";
    }

    if (
      [
        "STARTED",
        "PROFILE_READY",
      ].includes(
        status
      )
    ) {
      return "Employee Profile";
    }

    if (
      status ===
      "EMPLOYEE_CREATED"
    ) {
      return "Documents";
    }

    if (
      status.includes(
        "DOCUMENT"
      )
    ) {
      return "Documents";
    }

    if (
      status.includes(
        "ASSET"
      )
    ) {
      return "Assets";
    }

    if (
      status.includes(
        "APPOINTMENT"
      )
    ) {
      return "Appointment Letter";
    }

    if (
      status.includes(
        "ACCESS"
      ) ||
      status.includes(
        "WELCOME"
      )
    ) {
      return "Welcome & Activation";
    }

    if (
      status.includes(
        "FINAL"
      )
    ) {
      return "Final Review";
    }

    const progress =
      getProgress(
        record
      );

    if (
      progress >=
      90
    ) {
      return "Final Review";
    }

    if (
      progress >=
      75
    ) {
      return "Welcome & Activation";
    }

    if (
      progress >=
      55
    ) {
      return "Appointment Letter";
    }

    if (
      progress >=
      35
    ) {
      return "Assets";
    }

    if (
      progress >=
      20
    ) {
      return "Documents";
    }

    return "Employee Profile";
  };

/* =========================================================
   PAGE
========================================================= */

function OnboardingListPage() {
  const navigate =
    useNavigate();

  const [
    searchParams,
    setSearchParams,
  ] =
    useSearchParams();

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    records,
    setRecords,
  ] =
    useState(
      []
    );

  const [
    pagination,
    setPagination,
  ] =
    useState({
      page: 1,
      pages: 1,
      total: 0,
      limit:
        PAGE_SIZE,
    });

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  const [
    busyId,
    setBusyId,
  ] =
    useState(
      ""
    );

  /*
   * Employee Creation popup.
   */
  const [
    employeeModal,
    setEmployeeModal,
  ] =
    useState(
      null
    );

  /* =====================================================
     QUERY
  ===================================================== */

  const search =
    searchParams.get(
      "search"
    ) ||
    "";

  const stage =
    searchParams.get(
      "stage"
    ) ||
    "";

  const rawPage =
    Number(
      searchParams.get(
        PAGINATION_KEY
      ) ||
        1
    );

  const page =
    Number.isFinite(
      rawPage
    ) &&
    rawPage >
      0
      ? rawPage
      : 1;

  const [
    searchInput,
    setSearchInput,
  ] =
    useState(
      search
    );

  useEffect(
    () => {
      setSearchInput(
        search
      );
    },
    [
      search,
    ]
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
            await getOnboardingList({
              page,

              limit:
                PAGE_SIZE,

              search:
                search ||
                undefined,
            });

          const normalizedResult =
            normalizeListResponse(
              result,
              page
            );

          setRecords(
            normalizedResult.records
          );

          setPagination(
            normalizedResult.pagination
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
            "Employee onboarding queue could not be loaded."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        page,
        search,
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
     FILTER STAGE
  ===================================================== */

  const filteredRecords =
    useMemo(
      () => {
        if (
          !stage
        ) {
          return records;
        }

        return records.filter(
          (
            record
          ) =>
            normalize(
              getCurrentStage(
                record
              )
            ) ===
            normalize(
              stage
            )
        );
      },
      [
        records,
        stage,
      ]
    );

  /* =====================================================
     METRICS
  ===================================================== */

  const metrics =
    useMemo(
      () => {
        let earlyStage =
          0;

        let waitingAppointment =
          0;

        let readyActivation =
          0;

        records.forEach(
          (
            record
          ) => {
            const progress =
              getProgress(
                record
              );

            const currentStage =
              normalize(
                getCurrentStage(
                  record
                )
              );

            if (
              [
                "READY TO ONBOARD",
                "EMPLOYEE PROFILE",
                "DOCUMENTS",
                "ASSETS",
              ].includes(
                currentStage
              ) &&
              progress <
                55
            ) {
              earlyStage +=
                1;
            }

            if (
              currentStage ===
                "APPOINTMENT LETTER" ||
              (
                progress >=
                  55 &&
                progress <
                  85
              )
            ) {
              waitingAppointment +=
                1;
            }

            if (
              progress >=
              85
            ) {
              readyActivation +=
                1;
            }
          }
        );

        return {
          total:
            pagination.total ||
            records.length,

          earlyStage,

          waitingAppointment,

          readyActivation,
        };
      },
      [
        records,
        pagination.total,
      ]
    );

  /* =====================================================
     QUERY
  ===================================================== */

  const updateQuery =
    (
      key,
      value
    ) => {
      const next =
        new URLSearchParams(
          searchParams
        );

      if (
        value
      ) {
        next.set(
          key,
          value
        );
      } else {
        next.delete(
          key
        );
      }

      if (
        key !==
        PAGINATION_KEY
      ) {
        next.set(
          PAGINATION_KEY,
          "1"
        );
      }

      setSearchParams(
        next
      );
    };

  const submitSearch =
    (
      event
    ) => {
      event.preventDefault();

      updateQuery(
        "search",
        searchInput.trim()
      );
    };

  const changePage =
    (
      nextPage
    ) => {
      if (
        nextPage <
          1 ||
        nextPage >
          pagination.pages
      ) {
        return;
      }

      updateQuery(
        PAGINATION_KEY,
        String(
          nextPage
        )
      );
    };

  /* =====================================================
     NAVIGATION
  ===================================================== */

  const openPeople =
    () => {
      navigate(
        "/dashboard?app=people&page=overview"
      );
    };

  const openEmployees =
    () => {
      navigate(
        "/dashboard?app=people&page=employees"
      );
    };

  /* =====================================================
     ADD / CONTINUE EMPLOYEE

     IMPORTANT:

     We no longer navigate to EmployeeFormPage.

     1. Ensure onboarding exists.
     2. Open Employee Creation popup.
  ===================================================== */

  const addEmployee =
    async (
      record
    ) => {
      const selectionId =
        getSelectionId(
          record
        );

      let onboardingId =
        getOnboardingId(
          record
        );

      if (
        !selectionId &&
        !onboardingId
      ) {
        setError(
          "This onboarding candidate is missing its Selection reference."
        );

        return;
      }

      try {
        setBusyId(
          String(
            onboardingId ||
            selectionId
          )
        );

        setError(
          ""
        );

        /*
         * First click after Day 1:
         * create working onboarding record.
         */
        if (
          !onboardingId
        ) {
          const started =
            await startEmployeeOnboarding(
              selectionId
            );

          onboardingId =
            started?._id ||
            started?.onboardingId ||
            started?.onboarding?._id ||
            null;
        }

        if (
          !onboardingId
        ) {
          throw new Error(
            "Onboarding record could not be prepared."
          );
        }

        /*
         * Open popup instead of navigating away.
         */
        setEmployeeModal({
          onboardingId,

          selectionId,

          record,
        });
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
          "Employee onboarding could not be started."
        );
      } finally {
        setBusyId(
          ""
        );
      }
    };

  /* =====================================================
     EMPLOYEE CREATED
  ===================================================== */

  const handleEmployeeCreated =
    async () => {
      /*
       * Refresh queue immediately.
       *
       * The same candidate should now show:
       * EMPLOYEE_CREATED -> Documents.
       */
      await load();
    };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="onboarding-list-page">

      <section className="onboarding-list-hero">

        <div className="onboarding-list-hero-copy">

          <button
            type="button"
            className="onboarding-list-back"
            onClick={
              openPeople
            }
          >
            ← People
          </button>

          <span>
            EMPLOYEE ONBOARDING
          </span>

          <h1>
            Onboarding Control Centre
          </h1>

          <p>
            Day-1 confirmed candidates enter this queue
            before their permanent Employee record is
            created.
          </p>

        </div>

        <div className="onboarding-list-hero-actions">

          <button
            type="button"
            className="onboarding-list-directory-button"
            onClick={
              openEmployees
            }
          >
            Employee Directory
          </button>

          <button
            type="button"
            className="onboarding-list-refresh-button"
            onClick={
              load
            }
            disabled={
              loading
            }
          >
            {loading
              ? "Refreshing..."
              : "↻ Refresh"}
          </button>

        </div>

      </section>

      {/* =================================================
          METRICS
      ================================================== */}

      <section className="onboarding-list-metrics">

        <article className="is-primary">

          <span>
            IN ONBOARDING
          </span>

          <strong>
            {metrics.total}
          </strong>

          <small>
            Day-1 confirmed candidates
          </small>

        </article>

        <article>

          <span>
            EARLY FORMALITIES
          </span>

          <strong>
            {metrics.earlyStage}
          </strong>

          <small>
            Profile / documents / assets
          </small>

        </article>

        <article className="is-waiting">

          <span>
            APPOINTMENT STAGE
          </span>

          <strong>
            {metrics.waitingAppointment}
          </strong>

          <small>
            Appointment processing
          </small>

        </article>

        <article className="is-ready">

          <span>
            NEAR ACTIVATION
          </span>

          <strong>
            {metrics.readyActivation}
          </strong>

          <small>
            Final onboarding steps
          </small>

        </article>

      </section>

      {/* =================================================
          QUEUE
      ================================================== */}

      <section className="onboarding-list-shell">

        <div className="onboarding-list-toolbar">

          <div>

            <span>
              DAY 1 HANDOVER
            </span>

            <h2>
              Employee Onboarding Queue
            </h2>

            <p>
              Recruitment has confirmed the candidate
              reported. HR can now complete employee
              onboarding.
            </p>

          </div>

          <div className="onboarding-list-toolbar-actions">

            <form
              className="onboarding-list-search"
              onSubmit={
                submitSearch
              }
            >

              <span>
                ⌕
              </span>

              <input
                value={
                  searchInput
                }
                onChange={(
                  event
                ) =>
                  setSearchInput(
                    event
                      .target
                      .value
                  )
                }
                placeholder="Search candidate, email or designation..."
              />

              {searchInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput(
                      ""
                    );

                    updateQuery(
                      "search",
                      ""
                    );
                  }}
                >
                  ×
                </button>
              ) : null}

            </form>

            <select
              value={
                stage
              }
              onChange={(
                event
              ) =>
                updateQuery(
                  "stage",
                  event
                    .target
                    .value
                )
              }
            >

              <option value="">
                All Stages
              </option>

              <option value="Ready to Onboard">
                Ready to Onboard
              </option>

              <option value="Employee Profile">
                Employee Profile
              </option>

              <option value="Documents">
                Documents
              </option>

              <option value="Assets">
                Assets
              </option>

              <option value="Appointment Letter">
                Appointment Letter
              </option>

              <option value="Welcome & Activation">
                Welcome & Activation
              </option>

              <option value="Final Review">
                Final Review
              </option>

            </select>

          </div>

        </div>

        {/* =================================================
            ERROR
        ================================================== */}

        {error ? (
          <div className="onboarding-list-error">

            <div>
              !
            </div>

            <strong>
              Onboarding queue unavailable
            </strong>

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={
                load
              }
            >
              Retry
            </button>

          </div>
        ) : null}

        {/* =================================================
            LOADING
        ================================================== */}

        {!error &&
        loading ? (
          <div className="onboarding-list-loading">

            {Array.from({
              length: 4,
            }).map(
              (
                _,
                index
              ) => (
                <div
                  key={
                    index
                  }
                >
                  <span />
                  <strong />
                  <small />
                </div>
              )
            )}

          </div>
        ) : null}

        {/* =================================================
            RECORDS
        ================================================== */}

        {!error &&
        !loading &&
        filteredRecords.length >
          0 ? (
          <div className="onboarding-list-records">

            {filteredRecords.map(
              (
                record
              ) => {
                const onboardingId =
                  getOnboardingId(
                    record
                  );

                const selectionId =
                  getSelectionId(
                    record
                  );

                const rowId =
                  onboardingId ||
                  selectionId ||
                  record?._id;

                const fullName =
                  getFullName(
                    record
                  );

                const email =
                  getEmail(
                    record
                  );

                const photo =
                  getPhoto(
                    record
                  );

                const progress =
                  getProgress(
                    record
                  );

                const currentStage =
                  getCurrentStage(
                    record
                  );

                const loadingAction =
                  busyId ===
                  String(
                    onboardingId ||
                    selectionId
                  );

                const employeeCreated =
                  Boolean(
                    record?.employeeId ||
                    record?.employee ||
                    getStatus(
                      record
                    ) ===
                      "EMPLOYEE_CREATED"
                  );

                return (
                  <article
                    key={
                      rowId
                    }
                    className="onboarding-list-card"
                  >

                    <div className="onboarding-list-person">

                      <div className="onboarding-list-avatar">

                        {photo ? (
                          <img
                            src={
                              photo
                            }
                            alt=""
                          />
                        ) : (
                          initials(
                            fullName
                          )
                        )}

                      </div>

                      <div>

                        <span>
                          {record
                            ?.employeeCode ||
                            (
                              onboardingId
                                ? "ONBOARDING"
                                : "DAY 1 CONFIRMED"
                            )}
                        </span>

                        <h3>
                          {fullName}
                        </h3>

                        <p>
                          {email ||
                            "No email"}

                          {" · "}

                          {getDesignation(
                            record
                          )}
                        </p>

                      </div>

                    </div>

                    <div className="onboarding-list-meta">

                      <div>

                        <span>
                          JOINED
                        </span>

                        <strong>
                          {formatDate(
                            getJoiningDate(
                              record
                            )
                          )}
                        </strong>

                      </div>

                      <div>

                        <span>
                          DEPARTMENT
                        </span>

                        <strong>
                          {getDepartmentName(
                            record
                          )}
                        </strong>

                      </div>

                      <div>

                        <span>
                          HIRING HR
                        </span>

                        <strong>
                          {getHiringHrName(
                            record
                          )}
                        </strong>

                      </div>

                    </div>

                    <div className="onboarding-list-progress">

                      <div className="onboarding-list-progress-head">

                        <div>

                          <span>
                            CURRENT STAGE
                          </span>

                          <strong>
                            {currentStage}
                          </strong>

                        </div>

                        <b>
                          {Math.round(
                            progress
                          )}
                          %
                        </b>

                      </div>

                      <div className="onboarding-list-progress-track">

                        <span
                          style={{
                            width:
                              `${progress}%`,
                          }}
                        />

                      </div>

                      <small>
                        {employeeCreated
                          ? "Employee created — continue onboarding formalities."
                          : onboardingId
                            ? "Employee profile preparation is in progress."
                            : "Candidate reported on Day 1 and is ready for HR onboarding."}
                      </small>

                    </div>

                    <div className="onboarding-list-action">

                      <span className="onboarding-list-state">
                        {employeeCreated
                          ? "EMPLOYEE CREATED"
                          : onboardingId
                            ? "IN PROGRESS"
                            : "READY"}
                      </span>

                      <button
                        type="button"
                        disabled={
                          loadingAction
                        }
                        onClick={() => {
                          if (
                            employeeCreated &&
                            onboardingId
                          ) {
                            navigate(
                              `/people/employees/${record.employeeId || record.employee?._id}/onboarding`
                            );

                            return;
                          }

                          addEmployee(
                            record
                          );
                        }}
                      >
                        {loadingAction
                          ? "Preparing..."
                          : employeeCreated
                            ? "Continue Onboarding"
                            : onboardingId
                              ? "Complete Employee"
                              : "Add Employee"}

                        <span>
                          →
                        </span>

                      </button>

                    </div>

                  </article>
                );
              }
            )}

          </div>
        ) : null}

        {/* =================================================
            EMPTY
        ================================================== */}

        {!error &&
        !loading &&
        filteredRecords.length ===
          0 ? (
          <div className="onboarding-list-empty">

            <div>
              ✓
            </div>

            <span>
              DAY 1 ONBOARDING
            </span>

            <h3>
              No candidates waiting
            </h3>

            <p>
              Candidates appear here only after HR confirms
              that they physically reported on Day 1.
            </p>

          </div>
        ) : null}

        {/* =================================================
            PAGINATION
        ================================================== */}

        {!loading &&
        !error &&
        pagination.pages >
          1 ? (
          <div className="onboarding-list-pagination">

            <div>

              Page{" "}

              <strong>
                {pagination.page}
              </strong>

              {" of "}

              <strong>
                {pagination.pages}
              </strong>

              {" · "}

              {pagination.total}
              {" candidates"}

            </div>

            <div>

              <button
                type="button"
                disabled={
                  pagination.page <=
                  1
                }
                onClick={() =>
                  changePage(
                    pagination.page -
                      1
                  )
                }
              >
                ← Previous
              </button>

              <span>
                {pagination.page}
              </span>

              <button
                type="button"
                disabled={
                  pagination.page >=
                  pagination.pages
                }
                onClick={() =>
                  changePage(
                    pagination.page +
                      1
                  )
                }
              >
                Next →
              </button>

            </div>

          </div>
        ) : null}

      </section>

      {/* =================================================
          EMPLOYEE CREATION POPUP

          This is now the only Employee Creation interface
          for recruitment-originated candidates.
      ================================================== */}

      {employeeModal?.onboardingId ? (
        <EmployeeCreationModal
          onboardingId={
            employeeModal
              .onboardingId
          }
          onCreated={
            handleEmployeeCreated
          }
          onClose={() => {
            setEmployeeModal(
              null
            );

            load();
          }}
        />
      ) : null}

    </div>
  );
}

export default OnboardingListPage;
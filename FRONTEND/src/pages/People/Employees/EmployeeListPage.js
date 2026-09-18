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
  getEmployees,
} from "../../../services/employeeService";

import "./Employees.css";

/* =========================================================
   CONSTANTS
========================================================= */

const PAGE_SIZE =
  20;

/*
 * IMPORTANT:
 *
 * Dashboard already uses:
 *
 * ?app=people&page=employees
 *
 * Therefore Employee Directory pagination MUST NOT use
 * the "page" query key.
 *
 * We use "p" only for directory pagination.
 *
 * Example:
 *
 * /dashboard?app=people&page=employees&p=2
 */
const PAGINATION_QUERY_KEY =
  "p";

/* =========================================================
   HELPERS
========================================================= */

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
        "E"
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
   COMPONENT
========================================================= */

function EmployeeListPage() {
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

  /* =====================================================
     QUERY STATE
  ===================================================== */

  const search =
    searchParams.get(
      "search"
    ) ||
    "";

  const status =
    searchParams.get(
      "status"
    ) ||
    "";

  const department =
    searchParams.get(
      "department"
    ) ||
    "";

  /*
   * Keep existing view behaviour unchanged.
   *
   * Later, when OnboardingListPage is finished,
   * the dedicated onboarding sidebar will use that page.
   */
  const view =
    searchParams.get(
      "view"
    ) ||
    "all";

  /*
   * DO NOT read dashboard's "page" query.
   *
   * page=employees belongs to DashboardWeb.
   * p=1, p=2, etc belongs to this directory.
   */
  const rawPage =
    Number(
      searchParams.get(
        PAGINATION_QUERY_KEY
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

  /* =====================================================
     SEARCH INPUT
  ===================================================== */

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

          const params = {
            page,
            limit:
              PAGE_SIZE,
          };

          if (
            search
          ) {
            params.search =
              search;
          }

          if (
            status
          ) {
            params.status =
              status;
          }

          if (
            department
          ) {
            params.department =
              department;
          }

          /*
           * Keep existing onboarding filter functionality.
           */
          if (
            view ===
            "onboarding"
          ) {
            params.onboarding =
              true;
          }

          const result =
            await getEmployees(
              params
            );

          setRecords(
            Array.isArray(
              result?.records
            )
              ? result.records
              : []
          );

          setPagination(
            result?.pagination ||
              {
                page,
                pages: 1,
                total: 0,
                limit:
                  PAGE_SIZE,
              }
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
              "Employee directory could not be loaded."
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
        status,
        department,
        view,
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
     LOCAL METRICS

     Functionality kept exactly as before.
  ===================================================== */

  const metrics =
    useMemo(
      () => {
        const active =
          records.filter(
            (
              employee
            ) =>
              String(
                employee?.status ||
                  ""
              ).toUpperCase() ===
              "ACTIVE"
          ).length;

        const onboarding =
          records.filter(
            (
              employee
            ) =>
              String(
                employee
                  ?.status ||
                  ""
              ).toUpperCase() ===
                "ONBOARDING" ||
              Boolean(
                employee
                  ?.onboardingId
              )
          ).length;

        const managers =
          records.filter(
            (
              employee
            ) =>
              [
                "HEAD",
                "MANAGER",
              ].includes(
                String(
                  employee?.role ||
                    ""
                ).toUpperCase()
              )
          ).length;

        return {
          total:
            pagination?.total ||
            records.length,

          active,

          onboarding,

          managers,
        };
      },
      [
        records,
        pagination,
      ]
    );

  /* =====================================================
     QUERY UPDATE

     IMPORTANT:
     Preserve:
       app=people
       page=employees

     Filters only manipulate their own query keys.
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

      /*
       * Whenever a filter/search/view changes,
       * return directory pagination to page 1.
       *
       * Do NOT overwrite dashboard's `page=employees`.
       */
      if (
        key !==
        PAGINATION_QUERY_KEY
      ) {
        next.set(
          PAGINATION_QUERY_KEY,
          "1"
        );
      }

      setSearchParams(
        next
      );
    };

  /* =====================================================
     SEARCH SUBMIT
  ===================================================== */

  const submitSearch =
    (
      event
    ) => {
      event
        .preventDefault();

      updateQuery(
        "search",
        searchInput.trim()
      );
    };

  /* =====================================================
     PAGINATION
  ===================================================== */

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
        PAGINATION_QUERY_KEY,
        String(
          nextPage
        )
      );
    };

  /* =====================================================
     NAVIGATION
  ===================================================== */

  const openPeopleOverview =
    () => {
      navigate(
        "/dashboard?app=people&page=overview"
      );
    };

  const openCreateEmployee =
    () => {
      /*
       * Keep existing Create Employee page functionality
       * unchanged for this round.
       */
      navigate(
        "/people/employees/new"
      );
    };

  const openEmployee =
    (
      employeeId
    ) => {
      if (
        !employeeId
      ) {
        return;
      }

      /*
       * Keep existing employee detail route unchanged.
       */
      navigate(
        `/people/employees/${employeeId}`
      );
    };

  const openEmployeeOnboarding =
    (
      employeeId
    ) => {
      if (
        !employeeId
      ) {
        return;
      }

      /*
       * Keep existing individual onboarding route unchanged.
       */
      navigate(
        `/people/employees/${employeeId}/onboarding`
      );
    };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="employees-page">

      {/* =================================================
          HEADER
      ================================================== */}

      <section className="employees-header">

        <div>

          <button
            type="button"
            className="employees-back"
            onClick={
              openPeopleOverview
            }
          >
            ← People
          </button>

          <span className="employees-eyebrow">
            EMPLOYEE DIRECTORY
          </span>

          <h1>
            People Directory
          </h1>

          <p>
            Search employees, review hierarchy,
            track onboarding and maintain the
            permanent employee record.
          </p>

        </div>

        <button
          type="button"
          className="employees-create-button"
          onClick={
            openCreateEmployee
          }
        >
          <span>
            +
          </span>

          Add Employee
        </button>

      </section>

      {/* =================================================
          SUMMARY
      ================================================== */}

      <section className="employees-summary">

        <div>

          <span>
            TOTAL PEOPLE
          </span>

          <strong>
            {metrics.total}
          </strong>

          <small>
            Employee records
          </small>

        </div>

        <div>

          <span>
            ACTIVE
          </span>

          <strong>
            {metrics.active}
          </strong>

          <small>
            Current workforce
          </small>

        </div>

        <div className="employees-summary--onboarding">

          <span>
            ONBOARDING
          </span>

          <strong>
            {metrics.onboarding}
          </strong>

          <small>
            Formalities pending
          </small>

        </div>

        <div>

          <span>
            LEADERS
          </span>

          <strong>
            {metrics.managers}
          </strong>

          <small>
            Heads & managers
          </small>

        </div>

      </section>

      {/* =================================================
          DIRECTORY CARD
      ================================================== */}

      <section className="employees-directory">

        {/* ===============================================
            TOOLBAR
        ================================================ */}

        <div className="employees-toolbar">

          <div className="employees-tabs">

            <button
              type="button"
              className={
                view ===
                "all"
                  ? "is-active"
                  : ""
              }
              onClick={() =>
                updateQuery(
                  "view",
                  "all"
                )
              }
            >
              All Employees
            </button>

            <button
              type="button"
              className={
                view ===
                "onboarding"
                  ? "is-active"
                  : ""
              }
              onClick={() =>
                updateQuery(
                  "view",
                  "onboarding"
                )
              }
            >
              Onboarding

              {metrics.onboarding >
              0 ? (
                <span>
                  {
                    metrics.onboarding
                  }
                </span>
              ) : null}
            </button>

          </div>

          <div className="employees-toolbar-actions">

            <form
              className="employees-search"
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
                placeholder="Search name, ID, email, designation..."
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
                status
              }
              onChange={(
                event
              ) =>
                updateQuery(
                  "status",
                  event
                    .target
                    .value
                )
              }
            >

              <option value="">
                All Status
              </option>

              <option value="ACTIVE">
                Active
              </option>

              <option value="ONBOARDING">
                Onboarding
              </option>

              <option value="NOTICE_PERIOD">
                Notice Period
              </option>

              <option value="INACTIVE">
                Inactive
              </option>

              <option value="EXITED">
                Exited
              </option>

            </select>

          </div>

        </div>

        {/* ===============================================
            ERROR
        ================================================ */}

        {error ? (
          <div className="employees-error">

            <strong>
              Employee directory unavailable
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

        {/* ===============================================
            TABLE
        ================================================ */}

        {!error ? (
          <div className="employees-table-wrap">

            <table className="employees-table">

              <thead>

                <tr>

                  <th>
                    Employee
                  </th>

                  <th>
                    Employee ID
                  </th>

                  <th>
                    Department / Role
                  </th>

                  <th>
                    Reporting To
                  </th>

                  <th>
                    Joining Date
                  </th>

                  <th>
                    Status
                  </th>

                  <th aria-label="Actions" />

                </tr>

              </thead>

              <tbody>

                {loading ? (
                  Array.from({
                    length: 7,
                  }).map(
                    (
                      _,
                      index
                    ) => (
                      <tr
                        key={
                          `loading-${index}`
                        }
                        className="employees-loading-row"
                      >

                        <td
                          colSpan={7}
                        >
                          <div />
                        </td>

                      </tr>
                    )
                  )
                ) : records.length ? (
                  records.map(
                    (
                      employee
                    ) => {
                      const employeeId =
                        employee
                          ?._id ||
                        employee
                          ?.id;

                      const onboarding =
                        String(
                          employee
                            ?.status ||
                            ""
                        ).toUpperCase() ===
                          "ONBOARDING" ||
                        Boolean(
                          employee
                            ?.onboardingId
                        );

                      return (
                        <tr
                          key={
                            employeeId
                          }
                          onClick={() =>
                            openEmployee(
                              employeeId
                            )
                          }
                        >

                          <td>

                            <div className="employees-person">

                              <div className="employees-avatar">

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
                                  initials(
                                    employee
                                      ?.fullName
                                  )
                                )}

                              </div>

                              <div>

                                <strong>
                                  {employee
                                    ?.fullName ||
                                    "Unnamed Employee"}
                                </strong>

                                <small>
                                  {employee
                                    ?.officialEmail ||
                                    employee
                                      ?.personalEmail ||
                                    "No email"}
                                </small>

                              </div>

                            </div>

                          </td>

                          <td>

                            <strong className="employees-code">
                              {employee
                                ?.employeeCode ||
                                "—"}
                            </strong>

                            <small className="employees-company">
                              {employee
                                ?.companyCode ||
                                ""}
                            </small>

                          </td>

                          <td>

                            <strong>
                              {employee
                                ?.designation ||
                                "—"}
                            </strong>

                            <small>
                              {employee
                                ?.departmentName ||
                                employee
                                  ?.orgUnitCode ||
                                "—"}
                            </small>

                          </td>

                          <td>

                            <strong>
                              {employee
                                ?.reportingManagerName ||
                                "—"}
                            </strong>

                            <small>
                              Reporting Manager
                            </small>

                          </td>

                          <td>

                            <strong>
                              {formatDate(
                                employee
                                  ?.joiningDate
                              )}
                            </strong>

                            <small>
                              Joined
                            </small>

                          </td>

                          <td>

                            <span
                              className={
                                `employees-status employees-status--${String(
                                  onboarding
                                    ? "ONBOARDING"
                                    : employee
                                        ?.status ||
                                      "ACTIVE"
                                ).toLowerCase()}`
                              }
                            >
                              {pretty(
                                onboarding
                                  ? "ONBOARDING"
                                  : employee
                                      ?.status ||
                                    "ACTIVE"
                              )}
                            </span>

                          </td>

                          <td>

                            <button
                              type="button"
                              className="employees-row-action"
                              onClick={(
                                event
                              ) => {
                                event
                                  .stopPropagation();

                                if (
                                  onboarding
                                ) {
                                  openEmployeeOnboarding(
                                    employeeId
                                  );

                                  return;
                                }

                                openEmployee(
                                  employeeId
                                );
                              }}
                            >
                              {onboarding
                                ? "Continue"
                                : "Open"}

                              <span>
                                →
                              </span>

                            </button>

                          </td>

                        </tr>
                      );
                    }
                  )
                ) : (
                  <tr>

                    <td
                      colSpan={7}
                    >

                      <div className="employees-empty">

                        <div>
                          E
                        </div>

                        <strong>
                          No employees found
                        </strong>

                        <span>
                          Change your filters or create a new employee record.
                        </span>

                      </div>

                    </td>

                  </tr>
                )}

              </tbody>

            </table>

          </div>
        ) : null}

        {/* ===============================================
            PAGINATION
        ================================================ */}

        {!loading &&
        !error &&
        pagination.total >
          0 ? (
          <div className="employees-pagination">

            <div>

              Showing page{" "}
              <strong>
                {
                  pagination.page
                }
              </strong>
              {" of "}
              <strong>
                {
                  pagination.pages
                }
              </strong>

              <span>
                {pagination.total}
                {" total employees"}
              </span>

            </div>

            <div>

              <button
                type="button"
                onClick={() =>
                  changePage(
                    pagination.page -
                      1
                  )
                }
                disabled={
                  pagination.page <=
                  1
                }
              >
                ← Previous
              </button>

              <span>
                {
                  pagination.page
                }
              </span>

              <button
                type="button"
                onClick={() =>
                  changePage(
                    pagination.page +
                      1
                  )
                }
                disabled={
                  pagination.page >=
                  pagination.pages
                }
              >
                Next →
              </button>

            </div>

          </div>
        ) : null}

      </section>

    </div>
  );
}

export default EmployeeListPage;
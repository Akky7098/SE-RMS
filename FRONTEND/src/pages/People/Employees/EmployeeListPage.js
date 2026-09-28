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
   CONFIG
========================================================= */

const PAGE_SIZE = 50;

const PAGINATION_QUERY_KEY = "p";

/* =========================================================
   HELPERS
========================================================= */

const pretty = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
};

const initials = (name) =>
  String(name || "E")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase()
    )
    .join("");

const getEmployeeId = (
  employee
) =>
  employee?._id ||
  employee?.id ||
  "";

const getDepartment = (
  employee
) =>
  employee?.departmentName ||
  employee?.department?.name ||
  employee?.orgUnitCode ||
  "—";

const getReportingManager = (
  employee
) =>
  employee?.reportingManagerName ||
  employee?.reportsTo?.fullName ||
  employee?.reportsToName ||
  "—";

const getMobile = (
  employee
) =>
  employee?.mobileNumber ||
  employee?.phone ||
  "—";

const getCompany = (
  employee
) =>
  pretty(
    employee?.companyCode ||
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
  ] = useSearchParams();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    records,
    setRecords,
  ] = useState([]);

  const [
    pagination,
    setPagination,
  ] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: PAGE_SIZE,
  });

  const [
    error,
    setError,
  ] = useState("");

  /* =====================================================
     QUERY STATE
  ===================================================== */

  const search =
    searchParams.get(
      "search"
    ) || "";

  const status =
    searchParams.get(
      "status"
    ) || "";

  const rawPage =
    Number(
      searchParams.get(
        PAGINATION_QUERY_KEY
      ) || 1
    );

  const page =
    Number.isFinite(
      rawPage
    ) &&
    rawPage > 0
      ? rawPage
      : 1;

  /* =====================================================
     SEARCH INPUT
  ===================================================== */

  const [
    searchInput,
    setSearchInput,
  ] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  /* =====================================================
     LOAD EMPLOYEES
  ===================================================== */

  const load =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          const params = {
            page,
            limit: PAGE_SIZE,
          };

          if (search) {
            params.search =
              search;
          }

          if (status) {
            params.status =
              status;
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
            result?.pagination || {
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
          setRecords([]);

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
          setLoading(false);
        }
      },
      [
        page,
        search,
        status,
      ]
    );

  useEffect(() => {
    load();
  }, [load]);

  /* =====================================================
     GLOBAL VALUE WE CAN TRUST

     pagination.total is returned by backend for the
     complete filtered query.

     DO NOT calculate Active/Leaders/etc from records,
     because records contains only current 20 rows.
  ===================================================== */

  const totalEmployees =
    Number(
      pagination?.total || 0
    );

  /* =====================================================
     CURRENT PAGE INFORMATION
  ===================================================== */

  const range =
    useMemo(() => {
      if (
        !totalEmployees
      ) {
        return {
          from: 0,
          to: 0,
        };
      }

      const from =
        (pagination.page - 1) *
          pagination.limit +
        1;

      const to =
        Math.min(
          pagination.page *
            pagination.limit,
          totalEmployees
        );

      return {
        from,
        to,
      };
    }, [
      pagination,
      totalEmployees,
    ]);

  /* =====================================================
     QUERY UPDATE

     IMPORTANT:
     page=employees belongs to Dashboard.
     p= is directory pagination.
  ===================================================== */

  const updateQuery = (
    key,
    value
  ) => {
    const next =
      new URLSearchParams(
        searchParams
      );

    if (value) {
      next.set(
        key,
        value
      );
    } else {
      next.delete(key);
    }

    if (
      key !==
      PAGINATION_QUERY_KEY
    ) {
      next.set(
        PAGINATION_QUERY_KEY,
        "1"
      );
    }

    setSearchParams(next);
  };

  /* =====================================================
     SEARCH
  ===================================================== */

  const submitSearch = (
    event
  ) => {
    event.preventDefault();

    updateQuery(
      "search",
      searchInput.trim()
    );
  };

  const clearSearch = () => {
    setSearchInput("");

    updateQuery(
      "search",
      ""
    );
  };

  /* =====================================================
     PAGINATION
  ===================================================== */

  const changePage = (
    nextPage
  ) => {
    if (
      nextPage < 1 ||
      nextPage >
        pagination.pages
    ) {
      return;
    }

    updateQuery(
      PAGINATION_QUERY_KEY,
      String(nextPage)
    );
  };

  /* =====================================================
     NAVIGATION
  ===================================================== */

  const openCreateEmployee =
    () => {
      navigate(
        "/people/employees/new"
      );
    };

  const openEmployee = (
    employeeId
  ) => {
    if (!employeeId) {
      return;
    }

    navigate(
      `/people/employees/${employeeId}`
    );
  };

  /* =====================================================
     KEYBOARD ROW OPEN
  ===================================================== */

  const handleRowKeyDown = (
    event,
    employeeId
  ) => {
    if (
      event.key ===
        "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();

      openEmployee(
        employeeId
      );
    }
  };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="employees-page">

      {/* =================================================
          HERO HEADER
      ================================================= */}

      <section className="employees-hero">

        <div className="employees-hero-glow employees-hero-glow--one" />

        <div className="employees-hero-glow employees-hero-glow--two" />

        <div className="employees-hero-grid" />

        <div className="employees-hero-content">

          <div className="employees-hero-main">

            <div className="employees-hero-icon">
              <span>
                E
              </span>
            </div>

            <div>

              <div className="employees-hero-eyebrow">
                PEOPLE
                <span />
                EMPLOYEE MASTER
              </div>

              <h1>
                Employees
              </h1>

            </div>

          </div>

          <div className="employees-hero-actions">

            <div className="employees-total-pill">

              <span className="employees-total-dot" />

              <div>
                <small>
                  TOTAL EMPLOYEES
                </small>

                <strong>
                  {loading
                    ? "—"
                    : totalEmployees}
                </strong>
              </div>

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

          </div>

        </div>

      </section>

      {/* =================================================
          DIRECTORY
      ================================================= */}

      <section className="employees-directory">

        {/* ===============================================
            DIRECTORY HEADER
        ================================================ */}

        <div className="employees-directory-header">

          <div className="employees-directory-title">

            <div>
              <h2>
                Employee Directory
              </h2>

              {!loading &&
              !error ? (
                <span>
                  {totalEmployees}
                  {" "}
                  {totalEmployees ===
                  1
                    ? "employee"
                    : "employees"}
                </span>
              ) : null}
            </div>

          </div>

          <div className="employees-toolbar-actions">

            {/* SEARCH */}

            <form
              className="employees-search"
              onSubmit={
                submitSearch
              }
            >

              <span className="employees-search-icon">
                ⌕
              </span>

              <input
                type="search"
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
                placeholder="Search employee..."
                aria-label="Search employees"
              />

              {searchInput ? (
                <button
                  type="button"
                  className="employees-search-clear"
                  onClick={
                    clearSearch
                  }
                  aria-label="Clear search"
                >
                  ×
                </button>
              ) : null}

            </form>

            {/* STATUS FILTER */}

            <div className="employees-filter-wrap">

              <select
                className="employees-status-filter"
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
                aria-label="Filter by employee status"
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

        </div>

        {/* ===============================================
            ACTIVE FILTER BAR
        ================================================ */}

        {(search ||
          status) && (
          <div className="employees-active-filters">

            <span>
              Filtered results
            </span>

            {search ? (
              <button
                type="button"
                onClick={
                  clearSearch
                }
              >
                Search:
                {" "}
                <strong>
                  {search}
                </strong>

                <span>
                  ×
                </span>
              </button>
            ) : null}

            {status ? (
              <button
                type="button"
                onClick={() =>
                  updateQuery(
                    "status",
                    ""
                  )
                }
              >
                Status:
                {" "}
                <strong>
                  {pretty(
                    status
                  )}
                </strong>

                <span>
                  ×
                </span>
              </button>
            ) : null}

          </div>
        )}

        {/* ===============================================
            ERROR
        ================================================ */}

        {error ? (
          <div className="employees-error">

            <div>
              <strong>
                Unable to load employees
              </strong>

              <span>
                {error}
              </span>
            </div>

            <button
              type="button"
              onClick={
                load
              }
            >
              Try Again
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
                    ID / Company
                  </th>

                  <th>
                    Department / Designation
                  </th>

                  <th>
                    Reporting To
                  </th>

                  <th>
                    Mobile
                  </th>

                  <th>
                    Joining Date
                  </th>

                  <th>
                    Status
                  </th>

                  <th
                    aria-label="Open employee"
                  />

                </tr>
              </thead>

              <tbody>

                {/* =======================================
                    LOADING
                ======================================== */}

                {loading ? (
                  Array.from({
                    length: 8,
                  }).map(
                    (
                      _,
                      index
                    ) => (
                      <tr
                        key={`employee-loading-${index}`}
                        className="employees-loading-row"
                      >
                        <td colSpan={8}>
                          <div className="employees-row-skeleton" />
                        </td>
                      </tr>
                    )
                  )
                ) : records.length ? (

                  /* =====================================
                     RECORDS
                  ====================================== */

                  records.map(
                    (
                      employee
                    ) => {
                      const employeeId =
                        getEmployeeId(
                          employee
                        );

                      const reportingManager =
                        getReportingManager(
                          employee
                        );

                      return (
                        <tr
                          key={
                            employeeId
                          }
                          className="employees-data-row"
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            openEmployee(
                              employeeId
                            )
                          }
                          onKeyDown={(
                            event
                          ) =>
                            handleRowKeyDown(
                              event,
                              employeeId
                            )
                          }
                        >

                          {/* EMPLOYEE */}

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
                                  <span>
                                    {initials(
                                      employee
                                        ?.fullName
                                    )}
                                  </span>
                                )}

                              </div>

                              <div className="employees-person-copy">

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

                          {/* ID + COMPANY */}

                          <td>

                            <div className="employees-id-cell">

                              <strong className="employees-code">
                                {employee
                                  ?.employeeCode ||
                                  "—"}
                              </strong>

                              <small>
                                {getCompany(
                                  employee
                                ) || "—"}
                              </small>

                            </div>

                          </td>

                          {/* DEPARTMENT + DESIGNATION */}

                          <td>

                            <div className="employees-role-cell">

                              <strong>
                                {getDepartment(
                                  employee
                                )}
                              </strong>

                              <small>
                                {employee
                                  ?.designation ||
                                  "—"}
                              </small>

                            </div>

                          </td>

                          {/* REPORTING */}

                          <td>

                            {reportingManager !==
                            "—" ? (
                              <div className="employees-manager">

                                <div className="employees-manager-avatar">
                                  {initials(
                                    reportingManager
                                  )}
                                </div>

                                <div>
                                  <strong>
                                    {
                                      reportingManager
                                    }
                                  </strong>

                                  <small>
                                    Reporting Manager
                                  </small>
                                </div>

                              </div>
                            ) : (
                              <span className="employees-empty-value">
                                —
                              </span>
                            )}

                          </td>

                          {/* MOBILE */}

                          <td>

                            <div className="employees-contact-cell">

                              <strong>
                                {getMobile(
                                  employee
                                )}
                              </strong>

                            </div>

                          </td>

                          {/* JOINING */}

                          <td>

                            <div className="employees-date-cell">

                              <strong>
                                {formatDate(
                                  employee
                                    ?.joiningDate
                                )}
                              </strong>

                            </div>

                          </td>

                          {/* STATUS */}

                          <td>

                            <span
                              className={`employees-status employees-status--${String(
                                employee
                                  ?.status ||
                                  "ACTIVE"
                              ).toLowerCase()}`}
                            >
                              <i />

                              {pretty(
                                employee
                                  ?.status ||
                                  "ACTIVE"
                              )}
                            </span>

                          </td>

                          {/* DRILL DOWN */}

                          <td>

                            <button
                              type="button"
                              className="employees-row-action"
                              aria-label={`Open ${
                                employee
                                  ?.fullName ||
                                "employee"
                              }`}
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                openEmployee(
                                  employeeId
                                );
                              }}
                            >
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

                  /* =====================================
                     EMPTY
                  ====================================== */

                  <tr>
                    <td colSpan={8}>

                      <div className="employees-empty">

                        <div className="employees-empty-icon">
                          E
                        </div>

                        <strong>
                          No employees found
                        </strong>

                        <span>
                          {search ||
                          status
                            ? "No employee matches the selected filters."
                            : "No employee records are available."}
                        </span>

                        {(search ||
                          status) ? (
                          <button
                            type="button"
                            onClick={() => {
                              const next =
                                new URLSearchParams(
                                  searchParams
                                );

                              next.delete(
                                "search"
                              );

                              next.delete(
                                "status"
                              );

                              next.set(
                                PAGINATION_QUERY_KEY,
                                "1"
                              );

                              setSearchInput(
                                ""
                              );

                              setSearchParams(
                                next
                              );
                            }}
                          >
                            Clear Filters
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={
                              openCreateEmployee
                            }
                          >
                            Add Employee
                          </button>
                        )}

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
        totalEmployees > 0 ? (
          <div className="employees-pagination">

            <div className="employees-pagination-info">

              <span>
                Showing
              </span>

              <strong>
                {range.from}
                {"–"}
                {range.to}
              </strong>

              <span>
                of
              </span>

              <strong>
                {totalEmployees}
              </strong>

              <span>
                employees
              </span>

            </div>

            {pagination.pages >
            1 ? (
              <div className="employees-pagination-controls">

                <button
                  type="button"
                  className="employees-pagination-arrow"
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
                  aria-label="Previous page"
                >
                  ←
                </button>

                <div className="employees-page-number">
                  <strong>
                    {
                      pagination.page
                    }
                  </strong>

                  <span>
                    /
                  </span>

                  <span>
                    {
                      pagination.pages
                    }
                  </span>
                </div>

                <button
                  type="button"
                  className="employees-pagination-arrow"
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
                  aria-label="Next page"
                >
                  →
                </button>

              </div>
            ) : null}

          </div>
        ) : null}

      </section>

    </div>
  );
}

export default EmployeeListPage;
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../../auth/AuthContext";

import {
  getEmployees,
} from "../../services/employeeService";

import {
  getTimesheets,
} from "../../services/timesheetService";

import TimesheetStatusBadge from "./components/TimesheetStatusBadge";

import TimesheetEmployeePanel from "./components/TimesheetEmployeePanel";

import {
  buildDailyTimesheetRows,
  formatDateLong,
  formatTime,
  initials,
  percentage,
  summarizeTimesheetRows,
  textPreview,
  toDateKey,
} from "./utils/timesheetHelpers";

import "./TimesheetWeb.css";

/* =========================================================
   EMPLOYEE RESPONSE
========================================================= */

const normalizeEmployees = (
  response
) => {
  const payload =
    response?.data?.data ||
    response?.data ||
    response ||
    {};

  return {
    records:
      payload.records ||
      payload.employees ||
      payload.items ||
      [],

    pagination:
      payload.pagination ||
      {},
  };
};

/* =========================================================
   TIMESHEET WEB
========================================================= */

const TimesheetWeb =
  () => {
    const navigate =
      useNavigate();

    const {
      user,
    } = useAuth();

    const role =
      String(
        user?.role ||
        ""
      ).toUpperCase();

    const canReview =
      [
        "SUPER_ADMIN",
        "ADMIN",
        "HEAD",
        "DEPARTMENT_HEAD",
        "MANAGER",
        "TEAM_LEAD",
      ].includes(
        role
      );

    const now =
      useMemo(
        () => new Date(),
        []
      );

    const today =
      useMemo(
        () =>
          toDateKey(
            now
          ),
        [
          now,
        ]
      );

    const [
      selectedDate,
      setSelectedDate,
    ] =
      useState(
        today
      );

    const [
      employees,
      setEmployees,
    ] =
      useState([]);

    const [
      reports,
      setReports,
    ] =
      useState([]);

    const [
      loading,
      setLoading,
    ] =
      useState(true);

    const [
      refreshing,
      setRefreshing,
    ] =
      useState(false);

    const [
      error,
      setError,
    ] =
      useState("");

    const [
      search,
      setSearch,
    ] =
      useState("");

    const [
      statusFilter,
      setStatusFilter,
    ] =
      useState("");

    const [
      departmentFilter,
      setDepartmentFilter,
    ] =
      useState("");

    const [
      selectedRow,
      setSelectedRow,
    ] =
      useState(null);

    /* =====================================================
       EMPLOYEES
    ===================================================== */

    const loadEmployees =
      useCallback(
        async () => {
          const output =
            [];

          let page = 1;

          let pages = 1;

          do {
            const response =
              await getEmployees({
                page,

                limit: 100,

                status:
                  "ACTIVE",
              });

            const normalized =
              normalizeEmployees(
                response
              );

            output.push(
              ...normalized.records
            );

            pages =
              Number(
                normalized
                  ?.pagination
                  ?.pages ||
                1
              );

            page += 1;
          } while (
            page <= pages &&
            page <= 25
          );

          return output;
        },
        []
      );

    /* =====================================================
       REPORTS

       Loads selected month because backend list already
       supports month/year.
    ===================================================== */

    const loadData =
      useCallback(
        async (
          silent = false
        ) => {
          try {
            if (
              silent
            ) {
              setRefreshing(
                true
              );
            } else {
              setLoading(
                true
              );
            }

            setError("");

            const [
              employeeRecords,
              reportResponse,
            ] =
              await Promise.all([
                loadEmployees(),

                getTimesheets({
                  month:
                    Number(
                      selectedDate.slice(
                        5,
                        7
                      )
                    ) -
                    1,

                  year:
                    Number(
                      selectedDate.slice(
                        0,
                        4
                      )
                    ),
                }),
              ]);

            setEmployees(
              employeeRecords
            );

            setReports(
              reportResponse.records
            );
          } catch (
            error
          ) {
            setError(
              error?.response
                ?.data
                ?.message ||
                error?.message ||
                "Unable to load timesheets."
            );
          } finally {
            setLoading(
              false
            );

            setRefreshing(
              false
            );
          }
        },
        [
          selectedDate,
          loadEmployees,
        ]
      );

    useEffect(() => {
      loadData();
    }, [
      loadData,
    ]);

    /* =====================================================
       ROWS
    ===================================================== */

    const rows =
      useMemo(
        () =>
          buildDailyTimesheetRows(
            employees,
            reports,
            selectedDate
          ),
        [
          employees,
          reports,
          selectedDate,
        ]
      );

    const summary =
      useMemo(
        () =>
          summarizeTimesheetRows(
            rows
          ),
        [
          rows,
        ]
      );

    const completed =
      summary.submitted +
      summary.reviewed +
      summary.needsAttention;

    const compliance =
      percentage(
        completed,
        summary.total
      );

    /* =====================================================
       DEPARTMENTS
    ===================================================== */

    const departments =
      useMemo(
        () =>
          [
            ...new Set(
              rows
                .map(
                  (
                    item
                  ) =>
                    item.department
                )
                .filter(
                  Boolean
                )
            ),
          ].sort(),
        [
          rows,
        ]
      );

    /* =====================================================
       DEPARTMENT COMPLIANCE
    ===================================================== */

    const departmentStats =
      useMemo(
        () => {
          const map =
            new Map();

          rows.forEach(
            (
              row
            ) => {
              if (
                !map.has(
                  row.department
                )
              ) {
                map.set(
                  row.department,
                  {
                    department:
                      row.department,

                    total:
                      0,

                    completed:
                      0,

                    pending:
                      0,
                  }
                );
              }

              const entry =
                map.get(
                  row.department
                );

              entry.total +=
                1;

              if (
                row.status ===
                "PENDING"
              ) {
                entry.pending +=
                  1;
              } else {
                entry.completed +=
                  1;
              }
            }
          );

          return [
            ...map.values(),
          ]
            .map(
              (
                item
              ) => ({
                ...item,

                rate:
                  percentage(
                    item.completed,
                    item.total
                  ),
              })
            )
            .sort(
              (
                a,
                b
              ) =>
                b.rate -
                a.rate
            );
        },
        [
          rows,
        ]
      );

    /* =====================================================
       FILTER
    ===================================================== */

    const filteredRows =
      useMemo(
        () => {
          const needle =
            search
              .trim()
              .toLowerCase();

          return rows.filter(
            (
              row
            ) => {
              if (
                needle
              ) {
                const value =
                  [
                    row.name,
                    row.email,
                    row.department,
                    row.designation,
                  ]
                    .join(
                      " "
                    )
                    .toLowerCase();

                if (
                  !value.includes(
                    needle
                  )
                ) {
                  return false;
                }
              }

              if (
                statusFilter &&
                row.status !==
                  statusFilter
              ) {
                return false;
              }

              if (
                departmentFilter &&
                row.department !==
                  departmentFilter
              ) {
                return false;
              }

              return true;
            }
          );
        },
        [
          rows,
          search,
          statusFilter,
          departmentFilter,
        ]
      );

    /* =====================================================
       RENDER
    ===================================================== */

    return (
      <main className="se-ts-web-page">
        {/* TOPBAR */}

        <header className="se-ts-web-top">
          <div className="se-ts-web-brand">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/dashboard?app=people"
                )
              }
            >
              ←
            </button>

            <img
              src="/se-logo.png"
              alt="Sandeep Edgetech"
            />

            <div>
              <span>
                PEOPLE
              </span>

              <strong>
                Timesheet
                Control Center
              </strong>
            </div>
          </div>

          <div className="se-ts-web-top-actions">
            <input
              type="date"
              max={
                today
              }
              value={
                selectedDate
              }
              onChange={(
                event
              ) =>
                setSelectedDate(
                  event.target
                    .value
                )
              }
            />

            <button
              type="button"
              onClick={() =>
                setSelectedDate(
                  today
                )
              }
            >
              Today
            </button>

            <button
              type="button"
              className="refresh"
              onClick={() =>
                loadData(
                  true
                )
              }
              disabled={
                refreshing
              }
            >
              ↻{" "}
              {refreshing
                ? "Refreshing"
                : "Refresh"}
            </button>
          </div>
        </header>

        <section className="se-ts-web-content">
          {error ? (
            <div className="se-ts-web-error">
              !
              <span>
                {error}
              </span>
            </div>
          ) : null}

          {/* HERO */}

          <section className="se-ts-web-hero">
            <div>
              <div className="se-ts-web-hero-label">
                <span>
                  WORK REPORT
                  INTELLIGENCE
                </span>

                <i>
                  MANAGEMENT
                </i>
              </div>

              <h1>
                Daily work visibility
                without chasing
                employees.
              </h1>

              <p>
                Track report compliance,
                understand team
                priorities and surface
                blockers across your
                organisation.
              </p>

              <div className="se-ts-web-hero-meta">
                <div>
                  <span>
                    DATE
                  </span>

                  <strong>
                    {formatDateLong(
                      selectedDate
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    WORKFORCE
                  </span>

                  <strong>
                    {summary.total}
                  </strong>
                </div>

                <div>
                  <span>
                    REPORTS
                  </span>

                  <strong>
                    {completed}
                  </strong>
                </div>
              </div>
            </div>

            <div className="se-ts-web-compliance">
              <div
                className="se-ts-web-compliance-ring"
                style={{
                  "--ts-rate":
                    `${compliance}%`,
                }}
              >
                <div>
                  <strong>
                    {compliance}
                    %
                  </strong>

                  <span>
                    Compliance
                  </span>
                </div>
              </div>

              <div>
                <span>
                  DAILY HEALTH
                </span>

                <strong>
                  {compliance >=
                  95
                    ? "Excellent"
                    : compliance >=
                        80
                      ? "Healthy"
                      : "Needs Follow-up"}
                </strong>

                <small>
                  {completed} of{" "}
                  {summary.total}
                  {" "}
                  submitted
                </small>
              </div>
            </div>
          </section>

          {/* KPI */}

          <section className="se-ts-web-kpis">
            <article>
              <span className="icon workforce">
                👥
              </span>

              <div>
                <small>
                  EMPLOYEES
                </small>

                <strong>
                  {summary.total}
                </strong>

                <p>
                  In management scope
                </p>
              </div>
            </article>

            <article>
              <span className="icon submitted">
                ✓
              </span>

              <div>
                <small>
                  SUBMITTED
                </small>

                <strong>
                  {summary.submitted}
                </strong>

                <p>
                  Awaiting review
                </p>
              </div>
            </article>

            <article>
              <span className="icon pending">
                ◷
              </span>

              <div>
                <small>
                  PENDING
                </small>

                <strong>
                  {summary.pending}
                </strong>

                <p>
                  Reports missing
                </p>
              </div>
            </article>

            <article>
              <span className="icon reviewed">
                ✓
              </span>

              <div>
                <small>
                  REVIEWED
                </small>

                <strong>
                  {summary.reviewed}
                </strong>

                <p>
                  Manager reviewed
                </p>
              </div>
            </article>

            <article>
              <span className="icon attention">
                !
              </span>

              <div>
                <small>
                  ATTENTION
                </small>

                <strong>
                  {
                    summary.needsAttention
                  }
                </strong>

                <p>
                  Needs follow-up
                </p>
              </div>
            </article>
          </section>

          {/* INSIGHTS */}

          <section className="se-ts-web-insights">
            <article className="se-ts-web-department-card">
              <header>
                <div>
                  <span>
                    DEPARTMENT PULSE
                  </span>

                  <h3>
                    Report Compliance
                  </h3>

                  <p>
                    Compare submission
                    discipline across
                    teams.
                  </p>
                </div>

                <i>
                  ≋
                </i>
              </header>

              <div className="se-ts-web-department-list">
                {departmentStats
                  .slice(
                    0,
                    8
                  )
                  .map(
                    (
                      item
                    ) => (
                      <button
                        type="button"
                        key={
                          item.department
                        }
                        onClick={() =>
                          setDepartmentFilter(
                            item.department
                          )
                        }
                      >
                        <div>
                          <span>
                            {
                              item.department
                            }
                          </span>

                          <strong>
                            {item.rate}
                            %
                          </strong>
                        </div>

                        <section>
                          <span
                            style={{
                              width:
                                `${item.rate}%`,
                            }}
                          />
                        </section>

                        <small>
                          {
                            item.completed
                          }{" "}
                          submitted ·{" "}
                          {
                            item.pending
                          }{" "}
                          pending
                        </small>
                      </button>
                    )
                  )}
              </div>
            </article>

            <article className="se-ts-web-pending-card">
              <header>
                <div>
                  <span>
                    ACTION REQUIRED
                  </span>

                  <h3>
                    Missing Reports
                  </h3>

                  <p>
                    Employees requiring
                    follow-up today.
                  </p>
                </div>

                <strong>
                  {summary.pending}
                </strong>
              </header>

              <div>
                {rows
                  .filter(
                    (
                      row
                    ) =>
                      row.status ===
                      "PENDING"
                  )
                  .slice(
                    0,
                    7
                  )
                  .map(
                    (
                      row
                    ) => (
                      <button
                        key={
                          row.employeeId
                        }
                        type="button"
                        onClick={() =>
                          setSelectedRow(
                            row
                          )
                        }
                      >
                        <span>
                          {initials(
                            row.name
                          )}
                        </span>

                        <div>
                          <strong>
                            {row.name}
                          </strong>

                          <small>
                            {row.department}
                          </small>
                        </div>

                        <i>
                          ›
                        </i>
                      </button>
                    )
                  )}

                {!summary.pending ? (
                  <div className="se-ts-web-all-clear">
                    ✓
                    <strong>
                      All reports
                      received
                    </strong>

                    <span>
                      No follow-up
                      required.
                    </span>
                  </div>
                ) : null}
              </div>
            </article>
          </section>

          {/* REGISTER */}

          <section className="se-ts-web-register">
            <div className="se-ts-web-register-head">
              <div>
                <span>
                  DAILY REGISTER
                </span>

                <h2>
                  Team Work Reports
                </h2>

                <p>
                  {filteredRows.length}
                  {" "}
                  employees shown
                </p>
              </div>
            </div>

            <div className="se-ts-web-toolbar">
              <div className="se-ts-web-search">
                <span>
                  ⌕
                </span>

                <input
                  type="search"
                  value={
                    search
                  }
                  placeholder="Search employee, department or designation..."
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target
                        .value
                    )
                  }
                />

                <kbd>
                  {
                    filteredRows.length
                  }{" "}
                  results
                </kbd>
              </div>

              <select
                value={
                  departmentFilter
                }
                onChange={(
                  event
                ) =>
                  setDepartmentFilter(
                    event.target
                      .value
                  )
                }
              >
                <option value="">
                  All Departments
                </option>

                {departments.map(
                  (
                    department
                  ) => (
                    <option
                      key={
                        department
                      }
                    >
                      {department}
                    </option>
                  )
                )}
              </select>

              <select
                value={
                  statusFilter
                }
                onChange={(
                  event
                ) =>
                  setStatusFilter(
                    event.target
                      .value
                  )
                }
              >
                <option value="">
                  All Status
                </option>

                <option value="SUBMITTED">
                  Submitted
                </option>

                <option value="PENDING">
                  Pending
                </option>

                <option value="REVIEWED">
                  Reviewed
                </option>

                <option value="NEEDS_ATTENTION">
                  Needs Attention
                </option>
              </select>
            </div>

            <div className="se-ts-web-table-wrap">
              <table className="se-ts-web-table">
                <thead>
                  <tr>
                    <th>
                      Employee
                    </th>

                    <th>
                      Department
                    </th>

                    <th>
                      Work Summary
                    </th>

                    <th>
                      Next Plan
                    </th>

                    <th>
                      Submitted
                    </th>

                    <th>
                      Status
                    </th>

                    <th />
                  </tr>
                </thead>

                <tbody>
                  {!loading &&
                  filteredRows.map(
                    (
                      row
                    ) => (
                      <tr
                        key={
                          row.employeeId
                        }
                        onClick={() =>
                          setSelectedRow(
                            row
                          )
                        }
                      >
                        <td>
                          <div className="se-ts-web-person">
                            <span>
                              {initials(
                                row.name
                              )}
                            </span>

                            <div>
                              <strong>
                                {row.name}
                              </strong>

                              <small>
                                {row.designation ||
                                  row.email}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          {row.department}
                        </td>

                        <td>
                          <span className="se-ts-web-preview">
                            {row.report
                              ? textPreview(
                                  row.report
                                    .workSummary
                                )
                              : "Report not submitted"}
                          </span>
                        </td>

                        <td>
                          <span className="se-ts-web-preview">
                            {row.report
                              ? textPreview(
                                  row.report
                                    .nextDayPlan,
                                  65
                                )
                              : "—"}
                          </span>
                        </td>

                        <td>
                          {formatTime(
                            row.report
                              ?.createdAt
                          )}
                        </td>

                        <td>
                          <TimesheetStatusBadge
                            status={
                              row.status
                            }
                          />
                        </td>

                        <td>
                          <button
                            type="button"
                            className="se-ts-web-open"
                          >
                            ›
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>

              {loading ? (
                <div className="se-ts-web-loading">
                  <span />

                  Loading work
                  reports...
                </div>
              ) : null}
            </div>
          </section>
        </section>

        <TimesheetEmployeePanel
          row={
            selectedRow
          }
          canReview={
            canReview
          }
          onClose={() =>
            setSelectedRow(
              null
            )
          }
          onReviewed={() =>
            loadData(
              true
            )
          }
        />
      </main>
    );
  };

export default TimesheetWeb;
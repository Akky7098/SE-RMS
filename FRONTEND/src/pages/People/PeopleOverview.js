import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  getEmployees,
} from "../../services/employeeService";

import "./People.css";

/* =========================================================
   HELPERS
========================================================= */

const safeNumber =
  (
    value
  ) => {
    const number =
      Number(
        value
      );

    return Number.isFinite(
      number
    )
      ? number
      : 0;
  };

/* =========================================================
   COMPONENT
========================================================= */

function PeopleOverview() {
  const navigate =
    useNavigate();

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    employees,
    setEmployees,
  ] =
    useState(
      []
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  /* =====================================================
     NAVIGATION

     Keep overview / employees / onboarding inside the
     DashboardWeb shell.
  ===================================================== */

  const openEmployees =
    () => {
      navigate(
        "/dashboard?app=people&page=employees"
      );
    };

  const openOnboarding =
    () => {
      navigate(
        "/dashboard?app=people&page=onboarding"
      );
    };

  const openEmployee =
    (
      employee
    ) => {
      if (
        !employee?._id
      ) {
        return;
      }

      /*
       * Keep the existing employee detail route for now.
       *
       * We are only fixing the Overview / Employees /
       * Onboarding shell navigation in this round.
       */
      navigate(
        `/people/employees/${employee._id}`
      );
    };

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

            setError(
              ""
            );

            const result =
              await getEmployees({
                page: 1,
                limit: 200,
              });

            if (
              !mounted
            ) {
              return;
            }

            setEmployees(
              Array.isArray(
                result?.records
              )
                ? result.records
                : []
            );
          } catch (
            requestError
          ) {
            if (
              !mounted
            ) {
              return;
            }

            setError(
              requestError
                ?.response
                ?.data
                ?.message ||
              requestError
                ?.message ||
              "People data could not be loaded."
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
    []
  );

  /* =====================================================
     METRICS
  ===================================================== */

  const metrics =
    useMemo(
      () => {
        const active =
          employees.filter(
            (
              item
            ) =>
              String(
                item?.status ||
                ""
              ).toUpperCase() ===
              "ACTIVE"
          ).length;

        const onboarding =
          employees.filter(
            (
              item
            ) => {
              const status =
                String(
                  item?.status ||
                    ""
                ).toUpperCase();

              return (
                status ===
                  "ONBOARDING" ||
                Boolean(
                  item
                    ?.onboardingId
                )
              );
            }
          ).length;

        const managers =
          employees.filter(
            (
              item
            ) =>
              [
                "HEAD",
                "MANAGER",
              ].includes(
                String(
                  item?.role ||
                  ""
                ).toUpperCase()
              )
          ).length;

        const locations =
          new Set(
            employees
              .map(
                (
                  item
                ) =>
                  item
                    ?.workLocation
              )
              .filter(
                Boolean
              )
          ).size;

        return {
          total:
            employees.length,

          active,

          onboarding,

          managers,

          locations,
        };
      },
      [
        employees,
      ]
    );

  /* =====================================================
     RECENT
  ===================================================== */

  const recentEmployees =
    useMemo(
      () => {
        return [
          ...employees,
        ]
          .sort(
            (
              a,
              b
            ) =>
              new Date(
                b?.createdAt ||
                  0
              ) -
              new Date(
                a?.createdAt ||
                  0
              )
          )
          .slice(
            0,
            5
          );
      },
      [
        employees,
      ]
    );

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="people-page">

      {/* =================================================
          HEADER
      ================================================== */}

      <section className="people-hero">

        <div className="people-hero-copy">

          <span className="people-eyebrow">
            PEOPLE WORKSPACE
          </span>

          <h1>
            Your workforce,
            connected in one place.
          </h1>

          <p>
            Manage employees, onboarding,
            reporting hierarchy, records and
            workforce operations from one
            structured workspace.
          </p>

          <div className="people-hero-actions">

            <button
              type="button"
              className="people-button people-button--primary"
              onClick={
                openEmployees
              }
            >
              View Employees

              <span>
                →
              </span>
            </button>

            <button
              type="button"
              className="people-button people-button--secondary"
              onClick={
                openOnboarding
              }
            >
              View Onboarding
            </button>

          </div>

        </div>

        <div className="people-hero-status">

          <span>
            PEOPLE STATUS
          </span>

          <strong>
            Workforce system operational
          </strong>

          <div className="people-status-line">

            <span className="people-status-dot" />

            <span>
              Employee records connected
            </span>

          </div>

        </div>

      </section>

      {/* =================================================
          METRICS
      ================================================== */}

      <section className="people-metrics">

        <article className="people-metric-card people-metric-card--strong">

          <div className="people-metric-top">

            <span className="people-metric-icon">
              P
            </span>

            <span>
              WORKFORCE
            </span>

          </div>

          <strong>
            {safeNumber(
              metrics.total
            )}
          </strong>

          <h3>
            Total Employees
          </h3>

          <p>
            All employee records in SE-RMS.
          </p>

        </article>

        <article className="people-metric-card">

          <div className="people-metric-top">

            <span className="people-metric-icon">
              ✓
            </span>

            <span>
              ACTIVE
            </span>

          </div>

          <strong>
            {safeNumber(
              metrics.active
            )}
          </strong>

          <h3>
            Active Employees
          </h3>

          <p>
            Currently active workforce.
          </p>

        </article>

        <article className="people-metric-card people-metric-card--accent">

          <div className="people-metric-top">

            <span className="people-metric-icon">
              O
            </span>

            <span>
              ONBOARDING
            </span>

          </div>

          <strong>
            {safeNumber(
              metrics.onboarding
            )}
          </strong>

          <h3>
            In Onboarding
          </h3>

          <p>
            Employees completing Day 1 formalities.
          </p>

        </article>

        <article className="people-metric-card">

          <div className="people-metric-top">

            <span className="people-metric-icon">
              H
            </span>

            <span>
              HIERARCHY
            </span>

          </div>

          <strong>
            {safeNumber(
              metrics.managers
            )}
          </strong>

          <h3>
            Reporting Leaders
          </h3>

          <p>
            Heads and managers in the workforce.
          </p>

        </article>

      </section>

      {/* =================================================
          WORKSPACE
      ================================================== */}

      <section className="people-workspace-grid">

        <div className="people-workspace-main">

          <div className="people-section-heading">

            <div>

              <span>
                PEOPLE
              </span>

              <h2>
                Employee Management
              </h2>

              <p>
                Employee master records,
                onboarding and hierarchy.
              </p>

            </div>

            <button
              type="button"
              onClick={
                openEmployees
              }
            >
              Open Directory →
            </button>

          </div>

          <div className="people-action-grid">

            <button
              type="button"
              className="people-action-card"
              onClick={
                openEmployees
              }
            >

              <span className="people-action-icon">
                E
              </span>

              <div>

                <strong>
                  Employee Directory
                </strong>

                <p>
                  Search, filter and open
                  complete employee profiles.
                </p>

              </div>

              <span className="people-action-arrow">
                →
              </span>

            </button>

            <button
              type="button"
              className="people-action-card"
              onClick={
                openOnboarding
              }
            >

              <span className="people-action-icon people-action-icon--red">
                O
              </span>

              <div>

                <strong>
                  Onboarding
                </strong>

                <p>
                  Complete access, documents,
                  assets and activation.
                </p>

              </div>

              <span className="people-action-arrow">
                →
              </span>

            </button>

          </div>

        </div>

        {/* =================================================
            RECENT PEOPLE
        ================================================== */}

        <aside className="people-recent">

          <div className="people-recent-heading">

            <div>

              <span>
                RECENT
              </span>

              <h2>
                Latest People
              </h2>

            </div>

          </div>

          {loading ? (
            <div className="people-empty">
              Loading employees...
            </div>
          ) : error ? (
            <div className="people-empty people-empty--error">
              {error}
            </div>
          ) : recentEmployees.length ? (
            <div className="people-recent-list">

              {recentEmployees.map(
                (
                  employee
                ) => (
                  <button
                    type="button"
                    key={
                      employee._id
                    }
                    className="people-person-row"
                    onClick={() =>
                      openEmployee(
                        employee
                      )
                    }
                  >

                    <span className="people-person-avatar">

                      {String(
                        employee
                          ?.fullName ||
                          "E"
                      )
                        .slice(
                          0,
                          1
                        )
                        .toUpperCase()}

                    </span>

                    <span className="people-person-copy">

                      <strong>
                        {employee
                          .fullName}
                      </strong>

                      <small>
                        {employee
                          .designation}
                        {" · "}
                        {employee
                          .employeeCode ||
                          "No ID"}
                      </small>

                    </span>

                    <span className="people-person-status">

                      {employee
                        .status}

                    </span>

                  </button>
                )
              )}

            </div>
          ) : (
            <div className="people-empty">
              No employees available yet.
            </div>
          )}

        </aside>

      </section>

    </div>
  );
}

export default PeopleOverview;
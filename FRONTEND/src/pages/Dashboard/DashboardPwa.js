import React, {
  useEffect,
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

import "./DashboardPwa.css";

const DashboardPwa = () => {
  const navigate =
    useNavigate();

  const {
    user,
    hasModule,
    hasPermission,
  } = useAuth();

  const [
    employeeCount,
    setEmployeeCount,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  useEffect(() => {
    const loadDashboard =
      async () => {
        try {
          if (
            !hasModule(
              "EMPLOYEE"
            )
          ) {
            return;
          }

          const response =
            await getEmployees({
              page: 1,
              limit: 1,
              status: "ACTIVE",
            });

          setEmployeeCount(
            response?.data?.data
              ?.pagination
              ?.total || 0
          );
        } catch (error) {
          console.error(
            "PWA dashboard failed:",
            error
          );
        } finally {
          setLoading(false);
        }
      };

    loadDashboard();
  }, [hasModule]);

  const initial =
    (
      user?.displayName ||
      "U"
    )
      .charAt(0)
      .toUpperCase();

  const hour =
    new Date().getHours();

  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 17
        ? "Good afternoon"
        : "Good evening";

  return (
    <main className="se-pwa-dashboard">
      {/* HEADER */}

      <header className="se-pwa-dashboard-header">
        <img
          src="/se-logo.png"
          alt="Sandeep Edgetech"
        />

        <div className="se-pwa-dashboard-header-actions">
          <button
            type="button"
            className="se-pwa-dashboard-bell"
          >
            🔔
          </button>

          <button
            type="button"
            className="se-pwa-dashboard-avatar"
          >
            {initial}
          </button>
        </div>
      </header>

      <section className="se-pwa-dashboard-body">
        {/* HERO */}

        <section className="se-pwa-dashboard-hero">
          <span>
            SE-RMS WORKSPACE
          </span>

          <h1>
            {greeting},{" "}
            {user?.displayName ||
              "User"}
          </h1>

          <p>
            Your organisation at a
            glance.
          </p>
        </section>

        {/* QUICK ACTIONS */}

        <section className="se-pwa-dashboard-quick">
          <div className="se-pwa-dashboard-section-head">
            <h2>
              Quick actions
            </h2>
          </div>

          <div className="se-pwa-dashboard-quick-grid">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/employees"
                )
              }
            >
              <span>
                E
              </span>

              <strong>
                Employees
              </strong>
            </button>

            {hasPermission(
              "EMPLOYEE",
              "CREATE"
            ) ? (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/employees?create=true"
                  )
                }
              >
                <span>
                  +
                </span>

                <strong>
                  Add Employee
                </strong>
              </button>
            ) : null}

            <button
              type="button"
              disabled
            >
              <span>
                A
              </span>

              <strong>
                Attendance
              </strong>
            </button>

            <button
              type="button"
              disabled
            >
              <span>
                T
              </span>

              <strong>
                Timesheet
              </strong>
            </button>
          </div>
        </section>

        {/* OVERVIEW */}

        <section className="se-pwa-dashboard-overview">
          <div className="se-pwa-dashboard-section-head">
            <h2>
              Overview
            </h2>

            <span>
              Today
            </span>
          </div>

          <div className="se-pwa-dashboard-stat-grid">
            <article>
              <span>
                ACTIVE PEOPLE
              </span>

              <strong>
                {loading
                  ? "..."
                  : employeeCount}
              </strong>

              <p>
                Employees
              </p>
            </article>

            <article>
              <span>
                ATTENDANCE
              </span>

              <strong>
                —
              </strong>

              <p>
                Coming next
              </p>
            </article>
          </div>
        </section>

        {/* MODULES */}

        <section className="se-pwa-dashboard-modules">
          <div className="se-pwa-dashboard-section-head">
            <h2>
              Workspace
            </h2>
          </div>

          <button
            type="button"
            className="se-pwa-dashboard-module-row"
            onClick={() =>
              navigate(
                "/employees"
              )
            }
          >
            <span className="se-pwa-dashboard-module-icon">
              P
            </span>

            <div>
              <strong>
                People
              </strong>

              <p>
                Employees,
                organisation,
                permissions
              </p>
            </div>

            <span>
              →
            </span>
          </button>

          <button
            type="button"
            className="se-pwa-dashboard-module-row muted"
            disabled
          >
            <span className="se-pwa-dashboard-module-icon">
              A
            </span>

            <div>
              <strong>
                Attendance
              </strong>

              <p>
                Check-in, team
                attendance and
                approvals
              </p>
            </div>

            <span className="se-pwa-dashboard-badge">
              NEXT
            </span>
          </button>

          <button
            type="button"
            className="se-pwa-dashboard-module-row muted"
            disabled
          >
            <span className="se-pwa-dashboard-module-icon">
              T
            </span>

            <div>
              <strong>
                Timesheet
              </strong>

              <p>
                Work activity and time
                reporting
              </p>
            </div>

            <span className="se-pwa-dashboard-badge">
              SOON
            </span>
          </button>
        </section>
      </section>

      {/* BOTTOM NAV */}

      <nav className="se-pwa-dashboard-bottom-nav">
        <button
          type="button"
          className="active"
        >
          <span>
            ⌂
          </span>

          Home
        </button>

        <button
          type="button"
          onClick={() =>
            navigate(
              "/employees"
            )
          }
        >
          <span>
            P
          </span>

          People
        </button>

        <button
          type="button"
          disabled
        >
          <span>
            A
          </span>

          Attendance
        </button>

        <button
          type="button"
          disabled
        >
          <span>
            T
          </span>

          Time
        </button>
      </nav>
    </main>
  );
};

export default DashboardPwa;
import { publicAsset } from "../../config/urls";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { getDashboardItemLabel } from "../../utils/dashboardNavigation";
import { getAppNavigation, matchAppItem } from "./appNavigation";
import { mobileAttendanceAccess } from "../People/Attendance/app/attendanceAppData";
import { mobileShiftAccess } from "../People/Attendance/Shift/app/shiftAppData";
import AppNavigationIcon from "./AppNavigationIcon";
import DashboardAppWorkspace from "./DashboardAppWorkspace";
import "./DashboardApp.css";

const appDescriptions = {
  PEOPLE: "Your people, connected",
  RECRUITMENT: "From request to joining",
  SALES: "Customers and opportunities",
  OPERATIONS: "Daily business operations",
  OPS: "Daily business operations",
  FINANCE: "Payments and reporting",
};

function Chevron({ back = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={back ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

function ToolButton({ item, role, appCode, onOpen }) {
  return (
    <button
      type="button"
      className="se-app-dashboard__tool"
      data-app={appCode}
      onClick={() => onOpen(item)}
      disabled={Boolean(item.comingSoon)}
    >
      <span className="se-app-dashboard__icon">
        <AppNavigationIcon code={item.code} />
      </span>
      <span className="se-app-dashboard__tool-label">
        {getDashboardItemLabel(item, role)}
      </span>
      {item.comingSoon ? <small>Coming soon</small> : <Chevron />}
    </button>
  );
}

export default function DashboardApp() {
  const { user, access, hasModule, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef(null);
  const role = String(user?.role || "EMPLOYEE").trim().toUpperCase();
  const isEmployee = role === "EMPLOYEE";
  const name = user?.displayName || user?.fullName || "Your workspace";
  const firstName = name.split(" ")[0];
  const params = new URLSearchParams(location.search);
  const requestedApp = (params.get("app") || "").toUpperCase();
  const page = params.get("page") || "";
  const view = params.get("view") || "home";
  const apps = useMemo(
    () => getAppNavigation({ user, access, hasModule }).filter((app) => app.code !== "HOME"),
    [user, access, hasModule]
  );
  const currentApp = apps.find((app) => app.code === requestedApp);
  const activeItem = matchAppItem(currentApp, page);
  const profile = view === "profile";
  const unavailable = Boolean(requestedApp && (!currentApp || (page && !activeItem)));
  const workspace = Boolean(currentApp && page && activeItem);
  const people = apps.find((app) => app.code === "PEOPLE");
  const personalItems = people?.items || [];
  const quickCodes = isEmployee
    ? ["ATTENDANCE", "LEAVE_MANAGEMENT", "SHIFT_MANAGEMENT"]
    : ["EMPLOYEES", "ATTENDANCE", "MANPOWER_REQUESTS"];
  const quickItems = quickCodes.flatMap((code) => {
    const app = apps.find((entry) => entry.items.some((item) => item.code === code && !item.comingSoon));
    return app ? [{ app, item: app.items.find((item) => item.code === code) }] : [];
  });
  const manpowerOverlay = currentApp?.code === "RECRUITMENT" && page === "manpower" && (params.has("id") || params.get("create") === "true");
  const title = manpowerOverlay
    ? params.get("create") === "true" ? "New request" : "Request details"
    : profile
    ? "My profile"
    : unavailable
      ? "Page unavailable"
      : workspace
        ? getDashboardItemLabel(activeItem, role)
        : currentApp?.label || (view === "apps" ? "Your apps" : "Home");
  const needle = search.trim().toLowerCase();
  const matchingTools = apps.flatMap((app) => app.items
    .filter((item) => `${app.label} ${getDashboardItemLabel(item, role)}`.toLowerCase().includes(needle))
    .map((item) => ({ app, item })));

  useEffect(() => {
    setSearch("");
    setSearchOpen(false);
    setError("");
    titleRef.current?.focus({ preventScroll: true });
  }, [location.search]);

  const openItem = (item) => {
    if (item.comingSoon) return;
    navigate(item.code === "MY_PROFILE" ? "/dashboard?view=profile" : item.path);
  };

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setError("");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setError("Unable to sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };

  const renderApps = (entries) => (
    <div className="se-app-dashboard__apps">
      {entries.map((app) => {
        const liveCount = app.items.filter((item) => !item.comingSoon).length;
        return (
          <button
            key={app.code}
            type="button"
            className="se-app-dashboard__app-card"
            data-app={app.code}
            onClick={() => navigate(`/dashboard?app=${app.code.toLowerCase()}`)}
          >
            <span className="se-app-dashboard__icon">
              <AppNavigationIcon code={app.code} />
            </span>
            <strong>{app.label}</strong>
            <span className="se-app-dashboard__app-description">{appDescriptions[app.code] || "Business workspace"}</span>
            <span className="se-app-dashboard__app-meta">
              {liveCount ? `${liveCount} tools` : "Coming soon"}
              <Chevron />
            </span>
          </button>
        );
      })}
    </div>
  );

  const renderTools = (items, appCode) => {
    const sections = [...new Set(items.map((item) => item.section || "Tools"))];
    return sections.map((section) => (
      <section className="se-app-dashboard__section" key={section}>
        <h2>{section.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())}</h2>
        <div className="se-app-dashboard__tool-list">
          {items.filter((item) => (item.section || "Tools") === section).map((item) => (
            <ToolButton key={item.code} item={item} role={role} appCode={appCode} onOpen={openItem} />
          ))}
        </div>
      </section>
    ));
  };

  return (
    <main className={`se-app-dashboard${workspace ? " se-app-dashboard--workspace" : ""}`}>
      <header className="se-app-dashboard__topbar">
        {currentApp || profile || unavailable ? (
          <button
            type="button"
            className="se-app-dashboard__back"
            aria-label={manpowerOverlay ? "Back to manpower requests" : workspace ? `Back to ${currentApp.label}` : "Back to home"}
            onClick={() => navigate(manpowerOverlay ? "/dashboard?app=recruitment&page=manpower" : workspace ? `/dashboard?app=${currentApp.code.toLowerCase()}` : "/dashboard")}
          >
            <Chevron back />
          </button>
        ) : (
          <img className="se-app-dashboard__logo" src={publicAsset("se-logo.png")} alt="Sandeep Edgetech" />
        )}
        <h1 ref={titleRef} tabIndex={-1}>{title}</h1>
        {!profile && !unavailable && (!workspace || ((page !== "attendance" || mobileAttendanceAccess(user, access).canViewRegister) && (page !== "shifts" || mobileShiftAccess(user, access).canViewTeam) && ["manpower", "hiring", "my-hiring", "candidates", "interviews", "evaluations", "selections", "employees", "attendance", "leave", "shifts", "payroll"].includes(page) && !manpowerOverlay)) && (
          <button
            type="button"
            className="se-app-dashboard__back se-app-dashboard__search-toggle"
            aria-label={searchOpen ? "Close search" : "Open search"}
            aria-expanded={searchOpen}
            onClick={() => { setSearchOpen(!searchOpen); setSearch(""); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="10" cy="10" r="6" /><path d="M15 15l5 5" />
            </svg>
          </button>
        )}
        <button
          type="button"
          className="se-app-dashboard__avatar"
          onClick={() => navigate("/dashboard?view=profile")}
          aria-label="Open my profile"
        >
          {name.charAt(0).toUpperCase()}
        </button>
      </header>

      {searchOpen && !profile && !unavailable && (
        <label className="se-app-dashboard__search se-app-dashboard__header-search">
          <input
            type="search"
            aria-label={workspace ? page === "hiring" ? "Search hiring queue" : page === "my-hiring" ? "Search my hiring roles" : page === "payroll" ? "Search payroll" : page === "shifts" ? "Search shifts and employees" : page === "leave" ? "Search leave requests" : page === "attendance" ? "Search team attendance" : page === "employees" ? "Search employees" : page === "selections" ? "Search selected candidates" : page === "evaluations" ? "Search evaluations" : page === "interviews" ? "Search interviews" : page === "candidates" ? "Search candidates" : "Search manpower requests" : "Search your tools"}
            placeholder={workspace ? page === "my-hiring" ? "Search role, department or skill" : page === "payroll" ? "Search employee name or ID" : page === "shifts" ? "Search name, employee ID or shift" : page === "leave" ? "Search name, leave type or request number" : page === "attendance" ? "Search team member or employee ID" : page === "employees" ? "Search employee name, ID or email" : page === "selections" ? "Search candidate, stage or hiring HR" : page === "evaluations" ? "Search candidate, role or evaluator" : page === "interviews" ? "Search candidate, role or interviewer" : page === "candidates" ? "Search name, phone, email or role" : "Search position, department or owner" : "Search your tools"}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoFocus
          />
        </label>
      )}
      <div className="se-app-dashboard__body" key={location.search}>
        {error && <p className="se-app-dashboard__error" role="alert">{error}</p>}
        {profile ? (
          <section className="se-app-dashboard__profile">
            <span className="se-app-dashboard__profile-avatar">{name.charAt(0).toUpperCase()}</span>
            <h2>{name}</h2>
            <p>{role.replaceAll("_", " ").toLowerCase()}</p>
            {user?.email && <p>{user.email}</p>}
            <button type="button" onClick={signOut} disabled={signingOut}>
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </section>
        ) : unavailable ? (
          <div className="se-app-dashboard__empty">
            <h2>This page isn’t available.</h2>
            <p>Choose a tool from your workspace.</p>
          </div>
        ) : workspace ? (
          <DashboardAppWorkspace app={currentApp.code} page={page} search={search} />
        ) : (
          <>
            {!currentApp && view !== "apps" && (
              <>
                <section className="se-app-dashboard__welcome">
                  <span>{isEmployee ? "MY WORKSPACE" : "SE-ERP WORKSPACE"}</span>
                  <h2>Hello, {firstName}</h2>
                  <p>{isEmployee ? "Your workday, in one place." : "Your teams. Your business. One workspace."}</p>
                  <div className="se-app-dashboard__welcome-date">
                    {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                  </div>
                </section>
                {quickItems.length > 0 && (
                  <section className="se-app-dashboard__section">
                    <h2>Quick access</h2>
                    <div className="se-app-dashboard__quick">
                      {quickItems.map(({ app, item }) => (
                        <button key={item.code} type="button" data-app={app.code} onClick={() => openItem(item)}>
                          <span className="se-app-dashboard__icon"><AppNavigationIcon code={item.code} /></span>
                          <span>{getDashboardItemLabel(item, role)}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
            {needle ? (
              <section className="se-app-dashboard__section">
                <h2>Search results</h2>
                <div className="se-app-dashboard__tool-list">
                  {matchingTools.map(({ app, item }) => (
                    <ToolButton key={`${app.code}:${item.code}`} item={item} role={role} appCode={app.code} onOpen={openItem} />
                  ))}
                  {!matchingTools.length && <p className="se-app-dashboard__empty">No tools found.</p>}
                </div>
              </section>
            ) : currentApp ? renderTools(currentApp.items, currentApp.code) : (
              <>
                {isEmployee && view !== "apps" && renderTools(personalItems.filter((item) => !quickCodes.includes(item.code)), "PEOPLE")}
                {(!isEmployee || view === "apps" || apps.some((app) => app.code !== "PEOPLE")) && <section className="se-app-dashboard__section">
                  <h2>{isEmployee && view !== "apps" ? "Other apps" : "Your apps"}</h2>
                  {renderApps(apps.filter((app) => !isEmployee || view === "apps" || app.code !== "PEOPLE"))}
                  {apps.length === 0 && <p className="se-app-dashboard__empty">No apps are assigned to your account.</p>}
                </section>}
              </>
            )}
          </>
        )}
      </div>

      <nav className="se-app-dashboard__bottom" aria-label="App navigation">
        {[
          { label: "Home", code: "HOME", path: "/dashboard", active: !requestedApp && view === "home" },
          { label: "Apps", code: "APPS", path: "/dashboard?view=apps", active: Boolean(requestedApp) || view === "apps" },
          { label: "Profile", code: "MY_PROFILE", path: "/dashboard?view=profile", active: profile },
        ].map((item) => (
          <button key={item.code} type="button" onClick={() => navigate(item.path)} aria-current={item.active ? "page" : undefined}>
            <AppNavigationIcon code={item.code} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}

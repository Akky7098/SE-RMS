import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../../auth/AuthContext";
import { downloadMonthlyAttendance, startWebAttendance, stopWebAttendance } from "../../../../services/attendanceService";
import { getEmployeeMeta } from "../../../../services/employeeService";
import Sheet from "../../../Recruitment/Interviews/app/InterviewSheet";
import AttendanceCalendar from "./AttendanceCalendar";
import AttendanceDaySheet, { AttendanceFacts } from "./AttendanceDaySheet";
import AttendanceCorrection from "./AttendanceCorrection";
import AttendanceRequests from "./AttendanceRequests";
import { attendanceSource, formatDate, formatTime, normalizedMode, todayKey } from "../utils/attendanceHelpers";
import { checkInOf, checkOutOf, dateOf, dayStatus, getBrowserLocation, isWebSession, loadAttendanceRange, messageOf, monthBounds, personKey, mobileAttendanceAccess, toneOf } from "./attendanceAppData";
import "../../../Recruitment/Interviews/app/InterviewsApp.css";
import "./AttendanceApp.css";

function useAttendance(query, personal, enabled, version) {
  const [state, setState] = useState({ records: [], loading: true, error: "", truncated: false });
  const serialized = JSON.stringify(query);
  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    setState(previous => ({ ...previous, loading: true, error: "" }));
    loadAttendanceRange(JSON.parse(serialized), personal)
      .then(result => active && setState({ ...result, loading: false, error: "" }))
      .catch(failure => active && setState({ records: [], loading: false, error: messageOf(failure), truncated: false }));
    return () => { active = false; };
  }, [serialized, personal, enabled, version]);
  return state;
}

function TeamFilters({ filters, departments, offices, onClose, onApply }) {
  const [draft, setDraft] = useState(filters);
  const field = (key, label, options) => (
    <label>{label}<select value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })}>
      <option value="">All</option>
      {options.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
    </select></label>
  );
  return (
    <Sheet title="Filter team attendance" onClose={onClose}>
      <form className="se-ata-form" onSubmit={event => { event.preventDefault(); onApply(draft); }}>
        <div className="se-iva-sheet-body">
          {field("status", "Attendance status", [["PRESENT", "Present"], ["ABSENT", "Absent / not marked"], ["LATE", "Late"], ["ON_LEAVE", "On leave"], ["HALF_DAY", "Half day"], ["MISSING", "Missing checkout"]])}
          {field("department", "Department", departments)}
          {field("office", "Office / work location", offices)}
          {field("mode", "Work mode", [["OFFICE", "Office"], ["WFH", "Work from home"], ["FIELD_VISIT", "Field visit"], ["ON_DUTY", "On duty"]])}
          {field("source", "Recorded by", [["BIOMETRIC", "Biometric device"], ["WEB", "Web / mobile"], ["WFH", "Work from home"], ["FIELD", "Field visit"]])}
        </div>
        <footer><button type="button" className="se-iva-secondary" onClick={() => setDraft(EMPTY_FILTERS)}>Clear all</button><button type="submit" className="se-iva-primary">Show attendance</button></footer>
      </form>
    </Sheet>
  );
}
const EMPTY_FILTERS = { status: "", department: "", office: "", mode: "", source: "" };

export default function AttendanceApp({ search = "" }) {
  const { user, access: authAccess } = useAuth();
  const access = useMemo(() => mobileAttendanceAccess(user, authAccess), [user, authAccess]);
  const [today, setToday] = useState(todayKey);
  const [tab, setTab] = useState("mine");
  const [month, setMonth] = useState(() => todayKey().slice(0, 7));
  const [teamDate, setTeamDate] = useState(today);
  const [version, setVersion] = useState(0);
  const [person, setPerson] = useState(null);
  const [personMonth, setPersonMonth] = useState(month);
  const [day, setDay] = useState(null);
  const [correction, setCorrection] = useState(null);
  const [mode, setMode] = useState("WFH");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmCheckout, setConfirmCheckout] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({});
  const personal = useAttendance(monthBounds(month), true, true, version);
  const todayData = useAttendance({ from: today, to: today }, true, true, version);
  const team = useAttendance({ from: teamDate, to: teamDate }, false, access.canViewRegister && ["team", "locations"].includes(tab), version);
  const employeeMonth = useAttendance({ ...monthBounds(personMonth), ...(person?.employeeId ? { employeeId: person.employeeId } : {}) }, false, Boolean(person) && access.canViewRegister, version);
  const todayRecord = todayData.records.find(record => dateOf(record) === today);
  const started = Boolean(checkInOf(todayRecord));
  const completed = Boolean(checkOutOf(todayRecord));
  const web = isWebSession(todayRecord);
  const status = dayStatus(todayRecord, today, today);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      setToday(todayKey());
      setVersion(value => value + 1);
    };
    const interval = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, []);
  useEffect(() => {
    if (!access.canViewRegister) return undefined;
    let active = true;
    getEmployeeMeta().then(result => active && setMeta(result || {})).catch(() => {});
    return () => { active = false; };
  }, [access.canViewRegister]);
  useEffect(() => { setPage(1); }, [search, filters, teamDate]);
  const departments = useMemo(() => {
    const values = new Map((meta.departments || []).map(item => [String(item._id), item.name]));
    team.records.forEach(record => {
      if (record.departmentId && record.departmentName) values.set(String(record.departmentId), record.departmentName);
    });
    return [...values].sort((a, b) => a[1].localeCompare(b[1]));
  }, [meta, team.records]);
  const offices = useMemo(() => [...new Map(team.records.filter(record => record.officeName || record.workLocation)
    .map(record => [String(record.officeId || record.workLocation), record.officeName || record.workLocation])).entries()], [team.records]);
  const teamRows = useMemo(() => team.records.filter(record => {
    const haystack = [record.employeeName, record.employeeCode, record.biometricCode, record.departmentName, record.orgUnitCode].join(" ").toLowerCase();
    if (tab === "locations" && !["WFH", "FIELD_VISIT", "ON_DUTY"].includes(normalizedMode(record))) return false;
    if (search.trim() && !haystack.includes(search.trim().toLowerCase())) return false;
    if (filters.department && String(record.departmentId) !== filters.department) return false;
    if (filters.office && String(record.officeId || record.workLocation) !== filters.office) return false;
    if (filters.mode && normalizedMode(record) !== filters.mode) return false;
    if (filters.source && attendanceSource(record) !== filters.source) return false;
    if (filters.status === "LATE") return Boolean(record.isLate || record.lateMinutes > 0);
    if (filters.status === "MISSING") return Boolean(checkInOf(record) && !checkOutOf(record));
    if (filters.status === "PRESENT") return Boolean(checkInOf(record));
    return !filters.status || record.presenceStatus === filters.status;
  }), [team.records, search, filters, tab]);
  useEffect(() => {
    if (search.trim() && access.canViewRegister) { setTab("team"); setPerson(null); }
  }, [search, access.canViewRegister]);
  const pageCount = Math.max(1, Math.ceil(teamRows.length / 50));
  const visiblePage = Math.min(page, pageCount);
  const ownError = todayData.error || personal.error;
  const act = async checkout => {
    setBusy(true);
    setActionError("");
    setNotice("Getting your current location…");
    try {
      const location = await getBrowserLocation();
      if (checkout) await stopWebAttendance(location);
      else await startWebAttendance({ ...location, workMode: mode });
      setNotice(checkout ? "Checked out successfully" : "Checked in successfully");
      setConfirmCheckout(false);
      setVersion(value => value + 1);
    } catch (failure) { setNotice(""); setActionError(messageOf(failure)); }
    finally { setBusy(false); }
  };
  const refreshButton = <button type="button" onClick={() => setVersion(value => value + 1)} disabled={busy}>↻ Refresh</button>;
  const openPerson = record => { setPerson(record); setPersonMonth(teamDate.slice(0, 7)); };
  return (
    <div className="se-iva se-ata">
      {!person && <nav className="se-ata-tabs" aria-label="Attendance views">
        <button type="button" aria-pressed={tab === "mine"} onClick={() => setTab("mine")}>My attendance</button>
        {access.canViewRegister && <button type="button" aria-pressed={tab === "team"} onClick={() => setTab("team")}>Team attendance</button>}
        <button type="button" aria-pressed={tab === "requests"} onClick={() => setTab("requests")}>Corrections</button>
        {access.canViewLocations && access.canViewRegister && <button type="button" aria-pressed={tab === "locations"} onClick={() => setTab("locations")}>Locations</button>}
        {access.canExport && <button type="button" aria-pressed={tab === "reports"} onClick={() => setTab("reports")}>Reports</button>}
      </nav>}
      {!person && tab === "mine" && <>
        <div className="se-ata-toolbar"><h2>Today · {formatDate(today, { year: undefined })}</h2>{refreshButton}</div>
        {ownError && <p role="alert" className="se-ata-error">{ownError}</p>}
        <section className="se-ata-today" aria-label="Today's attendance">
          <header className="se-ata-heading"><h2>{started ? completed ? "Workday complete" : "You're checked in" : "Your workday"}</h2><span className={`se-ata-status ${toneOf(status)}`}>{todayData.loading ? "Updating…" : status}</span></header>
          <AttendanceFacts record={todayRecord} />
          {todayData.loading ? <p role="status">Checking today’s attendance…</p> : todayData.error ? <p>Refresh to check your attendance before marking it.</p> : started ? (
            <>
              <p className="se-ata-source">{attendanceSource(todayRecord) === "BIOMETRIC" ? "Biometric device · punches sync automatically" : "Web / mobile attendance"}</p>
              {web && !completed && <button className="se-ata-primary" type="button" disabled={busy} onClick={() => { setActionError(""); setConfirmCheckout(true); }}>Check out →</button>}
            </>
          ) : (
            <form className="se-ata-form" onSubmit={event => { event.preventDefault(); act(false); }}>
              <p className="se-ata-source">At the office? Use your biometric device.</p>
              <fieldset disabled={busy}><legend>Working elsewhere?</legend>
                <div className="se-ata-mode">{[["WFH", "Home"], ["FIELD_VISIT", "Field visit"], ["ON_DUTY", "On duty"]].map(([value, label]) => <label key={value}><input type="radio" name="work-mode" value={value} checked={mode === value} onChange={() => setMode(value)} /><span>{label}</span></label>)}</div>
                <button className="se-ata-primary" type="submit">{busy ? "Checking in…" : "Check in →"}</button>
              </fieldset>
              <small>Your current location is required.</small>
            </form>
          )}
        </section>
        {notice && <p role="status" className="se-ata-note">{notice}</p>}
        {actionError && !confirmCheckout && <p role="alert" className="se-ata-error">{actionError}</p>}
        <AttendanceCalendar personal month={month} records={personal.records} today={today} loading={personal.loading || Boolean(personal.error)} onMonth={setMonth} onDay={setDay} />
      </>}
      {!person && ["team", "locations"].includes(tab) && access.canViewRegister && <>
        <div className="se-ata-toolbar"><label className="se-ata-date">Team date<input type="date" required value={teamDate} onChange={event => event.target.value && setTeamDate(event.target.value)} /></label>{refreshButton}</div>
        <div className="se-ata-toolbar"><h2>{teamRows.length} {tab === "locations" ? "remote / field" : "people"}</h2><button className="se-ata-primary" type="button" onClick={() => setFilterOpen(true)}>☷ Filters{Object.values(filters).filter(Boolean).length ? ` · ${Object.values(filters).filter(Boolean).length}` : ""}</button></div>
        {Object.values(filters).some(Boolean) && <button type="button" className="se-ata-clear" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters ×</button>}
        {team.error && <p role="alert" className="se-ata-error">{team.error}</p>}
        {team.truncated && <p role="alert" className="se-ata-error">Some biometric records were not returned. Narrow the date or office before reviewing totals.</p>}
        {team.loading ? <p role="status">Loading team attendance…</p> : <>
          {!teamRows.length && !team.error && <div className="se-ata-empty">No attendance matches these filters.</div>}
          {teamRows.slice((visiblePage - 1) * 50, visiblePage * 50).map(record => {
            const label = dayStatus(record, teamDate, today);
            const departmentName = record.departmentName || departments.find(([id]) => id === String(record.departmentId))?.[1];
            return <button type="button" key={personKey(record)} className="se-ata-person" onClick={() => openPerson(record)} aria-label={`Open monthly attendance for ${record.employeeName}`}>
              <div className="se-ata-person-top"><strong>{record.employeeName || record.employeeCode || "Biometric worker"}</strong><span aria-hidden="true">›</span></div>
              <p>{[record.employeeCode || record.biometricCode, departmentName, record.orgUnitCode].filter(Boolean).join(" · ")}</p>
              <div className="se-ata-person-times"><span>In <b>{formatTime(checkInOf(record))}</b></span><span>Out <b>{formatTime(checkOutOf(record))}</b></span></div>
              <footer><span className={`se-ata-status ${toneOf(label)}`}>{label}</span><span>{attendanceSource(record) === "BIOMETRIC" ? "Biometric" : record.isLate ? "Late" : normalizedMode(record) === "WFH" ? "Work from home" : "View month →"}</span></footer>
            </button>;
          })}
          {teamRows.length > 0 && <div className="se-ata-pagination"><button type="button" disabled={visiblePage === 1} onClick={() => setPage(visiblePage - 1)}>‹ Previous</button><span>{visiblePage} / {pageCount}</span><button type="button" disabled={visiblePage === pageCount} onClick={() => setPage(visiblePage + 1)}>Next ›</button></div>}
        </>}
      </>}
      {person && access.canViewRegister && <>
        <div className="se-ata-toolbar"><button type="button" className="se-ata-outline" onClick={() => setPerson(null)}>← Back to team</button>{refreshButton}</div>
        <section className="se-ata-person-heading"><h2>{person.employeeName}</h2><p>{person.employeeCode || person.biometricCode} · Monthly attendance</p></section>
        {employeeMonth.error && <p role="alert" className="se-ata-error">{employeeMonth.error}</p>}
        {employeeMonth.truncated && <p role="alert" className="se-ata-error">Some biometric records are unavailable for this month.</p>}
        <AttendanceCalendar month={personMonth} records={employeeMonth.records.filter(record => personKey(record) === personKey(person))} today={today} loading={employeeMonth.loading || Boolean(employeeMonth.error)} onMonth={setPersonMonth} onDay={setDay} />
      </>}
      {!person && tab === "requests" && <AttendanceRequests canApprove={access.canApproveRegularization} />}
      {!person && tab === "reports" && access.canExport && <section className="se-ata-panel se-ata-form">
        <h2>Monthly attendance report</h2><p>Download the full month for your permitted workforce.</p>
        <label>Report month<input type="month" required value={month} onChange={event => event.target.value && setMonth(event.target.value)} /></label>
        <div className="se-ata-actions">{["csv", "pdf"].map(format => <button key={format} type="button" className="se-ata-primary" disabled={busy} onClick={async () => {
          setBusy(true); setActionError("");
          try { const [year, number] = month.split("-").map(Number); await downloadMonthlyAttendance({ year, month: number, format }); }
          catch (failure) { setActionError(messageOf(failure)); }
          finally { setBusy(false); }
        }}>↓ Download {format.toUpperCase()}</button>)}</div>
        {actionError && <p role="alert" className="se-ata-error">{actionError}</p>}
      </section>}
      {day && !correction && <AttendanceDaySheet day={day} today={today} onClose={() => setDay(null)} canViewLocation={!person || access.canViewLocationHistory} onCorrect={!person && access.canRegularizeSelf ? record => { setDay(null); setCorrection(record); } : null} />}
      {correction && <AttendanceCorrection record={correction} onClose={() => setCorrection(null)} onSaved={() => { setCorrection(null); setVersion(value => value + 1); setNotice("Correction sent for review"); }} />}
      {filterOpen && <TeamFilters filters={filters} departments={departments} offices={offices} onClose={() => setFilterOpen(false)} onApply={draft => { setFilters(draft); setFilterOpen(false); }} />}
      {confirmCheckout && <Sheet title="Finish your workday?" busy={busy} onClose={() => setConfirmCheckout(false)}><div className="se-iva-sheet-body"><p>Your check-out time and current location will be recorded.</p>{notice && busy && <p role="status">{notice}</p>}{actionError && <p role="alert" className="se-ata-error">{actionError}</p>}</div><footer><button type="button" className="se-iva-secondary" disabled={busy} onClick={() => setConfirmCheckout(false)}>Keep working</button><button type="button" className="se-iva-primary" disabled={busy} onClick={() => act(true)}>{busy ? "Checking out…" : "Confirm check out"}</button></footer></Sheet>}
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../../../auth/AuthContext";
import { getAttendanceShifts, getMyShiftWeek, publishShiftRoster, saveShiftAssignment } from "../../../../../services/shiftService";
import Dialog from "../../../Leave/app/LeaveDialog";
import { employeeShiftDepartment, shiftDepartmentOptions } from "../utils/shiftDepartments";
import { addDays, formatDate, rosterStatusLabel, shiftTiming, startOfWeek, todayKey, weekDays, weekLabel } from "../utils/shiftHelpers";
import { departmentName, errorOf, idOf, loadMobileRoster, loadShiftEmployees, mobileShiftAccess, scheduleOf } from "./shiftAppData";
import ShiftAssignApp from "./ShiftAssignApp";
import ShiftMasterApp from "./ShiftMasterApp";
import "../../../Leave/app/LeaveApp.css";
import "./ShiftApp.css";

function Schedule({ weekStart, assignments, shifts, onEdit, rosters = [] }) {
  return <div className="se-sha-week">{weekDays(weekStart).map(day => {
    const record = assignments.find(item => item.assignmentDate === day.date);
    const schedule = scheduleOf(record, shifts);
    const roster = rosters.find(item => idOf(item) === idOf(record?.rosterId));
    return <article key={day.date} className={`se-sha-day ${schedule.tone} ${day.date === todayKey() ? "is-today" : ""}`}>
      <div className="se-sha-day-date"><strong>{day.date.slice(-2)}</strong><span>{day.short}</span></div>
      <div><strong>{schedule.title}</strong><p>{schedule.timing}{schedule.overnight ? " · next day" : ""}</p>{roster && <small>{rosterStatusLabel(roster.status)}</small>}</div>
      {record && onEdit && roster && !["PUBLISHED", "CANCELLED"].includes(roster.status) && <button type="button" className="se-lva-secondary" aria-label={`Edit ${day.date}`} onClick={() => onEdit(record, roster)}>Edit</button>}
    </article>;
  })}</div>;
}

function EditAssignment({ record, roster, shifts, onClose, onSaved, onPartial }) {
  const [type, setType] = useState(record.dayType);
  const [shiftId, setShiftId] = useState(idOf(record.shiftId));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <Dialog title="Change this day" backLabel="Back to schedule" busy={busy} onClose={onClose}>
    <form className="se-lva-form" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError("");
      try { await saveShiftAssignment(roster._id, { employeeId: idOf(record.employeeId), assignmentDate: record.assignmentDate, dayType: type, shiftId: type === "SHIFT" ? shiftId : null, overrideReason: reason.trim() }); onSaved("Schedule updated."); }
      catch (failure) { setError(errorOf(failure)); onPartial(); }
      finally { setBusy(false); }
    }}><div className="se-lva-dialog-body">
      <h3>{formatDate(record.assignmentDate)}</h3>
      {error && <p role="alert" className="se-lva-error">{error}</p>}
      <label>Schedule<select value={type} onChange={event => setType(event.target.value)}>{[["SHIFT", "Working shift"], ["WEEK_OFF", "Week off"], ["HOLIDAY", "Holiday"], ["LEAVE", "Leave"], ["NOT_SCHEDULED", "Not scheduled"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {type === "SHIFT" && <label>Shift<select value={shiftId} required onChange={event => setShiftId(event.target.value)}><option value="">Choose shift</option>{shifts.filter(shift => shift.active !== false).map(shift => <option key={shift._id} value={shift._id}>{shift.name} · {shiftTiming(shift)}</option>)}</select></label>}
      <label>Reason for change<textarea required rows={3} value={reason} onChange={event => setReason(event.target.value)} /></label>
      <p className="se-lva-note">This changes a draft schedule. Publish the week when it is ready.</p>
    </div><footer><button type="button" className="se-lva-secondary" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="se-lva-primary" disabled={busy || !reason.trim()}>{busy ? "Saving…" : "Save change"}</button></footer></form>
  </Dialog>;
}

export default function ShiftApp({ search = "" }) {
  const { user, access: authAccess } = useAuth();
  const access = useMemo(() => mobileShiftAccess(user, authAccess), [user, authAccess]);
  const [tab, setTab] = useState("mine");
  const [week, setWeek] = useState(() => startOfWeek(todayKey()));
  const [shifts, setShifts] = useState([]);
  const [mine, setMine] = useState([]);
  const [team, setTeam] = useState({ employees: [], units: [], assignments: [], rosters: [] });
  const [loading, setLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(false);
  const [error, setError] = useState("");
  const [shiftError, setShiftError] = useState("");
  const [teamError, setTeamError] = useState("");
  const [version, setVersion] = useState(0);
  const [department, setDepartment] = useState("");
  const [office, setOffice] = useState("");
  const [filter, setFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [person, setPerson] = useState(null);
  const [assign, setAssign] = useState(false);
  const [master, setMaster] = useState(null);
  const [editing, setEditing] = useState(null);
  const [publish, setPublish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true; setLoading(true); setError("");
    setShiftError("");
    Promise.allSettled([getAttendanceShifts(access.canManageShiftMaster ? {} : { active: true }), getMyShiftWeek({ weekStart: week })])
      .then(([list, own]) => {
        if (!active) return;
        if (list.status === "fulfilled") setShifts(list.value.records || []);
        else setShiftError(errorOf(list.reason));
        if (own.status === "fulfilled") setMine(own.value.assignments || []);
        else setError(errorOf(own.reason));
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [week, version, access.canManageShiftMaster]);
  useEffect(() => {
    if (!access.canViewTeam || tab !== "team") return undefined;
    let active = true; setTeamLoading(true); setTeamError("");
    Promise.all([loadShiftEmployees(), loadMobileRoster(week)])
      .then(([people, roster]) => {
        if (active) setTeam({ ...roster, employees: [...new Map([...people.employees, ...roster.employees].map(employee => [idOf(employee), employee])).values()], units: people.units });
      })
      .catch(failure => active && setTeamError(errorOf(failure)))
      .finally(() => active && setTeamLoading(false));
    return () => { active = false; };
  }, [access.canViewTeam, tab, week, version]);
  useEffect(() => { setPage(1); }, [search, department, office, week]);
  useEffect(() => {
    if (search.trim() && access.canViewTeam) { setTab(current => current === "mine" ? "team" : current); setPerson(null); }
  }, [search, access.canViewTeam]);
  const people = team.employees.filter(employee => (!department || employeeShiftDepartment(employee).value === department) && (!office || employee.workLocation === office) && [employee.fullName, employee.employeeCode, departmentName(employee, team.units), employee.orgUnitCode].join(" ").toLowerCase().includes(search.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(people.length / 50));
  const visiblePage = Math.min(page, pages);
  const ready = !loading && !teamLoading && !teamError && !shiftError;
  const saved = text => { setNotice(text); setAssign(false); setMaster(null); setEditing(null); setPublish(false); setVersion(value => value + 1); };
  const refresh = () => setVersion(value => value + 1);
  const targets = team.rosters.filter(roster => ["DRAFT", "SUBMITTED"].includes(roster.status) && team.assignments.some(item => idOf(item.rosterId) === idOf(roster)));
  return <main className="se-lva se-sha">
    <nav className="se-lva-tabs" aria-label="Shift sections"><button type="button" aria-pressed={tab === "mine"} onClick={() => { setPerson(null); setTab("mine"); }}>My schedule</button>{access.canViewTeam && <button type="button" aria-pressed={tab === "team"} onClick={() => setTab("team")}>Team schedule</button>}{access.canManageShiftMaster && <button type="button" aria-pressed={tab === "masters"} onClick={() => setTab("masters")}>Shift settings</button>}</nav>
    <div className="se-sha-navigator"><button type="button" className="se-lva-secondary" aria-label="Previous week" onClick={() => { setPerson(null); setWeek(addDays(week, -7)); }}>‹</button><label>Week of<input type="date" value={week} required onChange={event => { if (event.target.value) { setPerson(null); setWeek(startOfWeek(event.target.value)); } }} /></label><button type="button" className="se-lva-secondary" aria-label="Next week" onClick={() => { setPerson(null); setWeek(addDays(week, 7)); }}>›</button></div>
    <div className="se-lva-toolbar"><button type="button" className="se-lva-secondary" onClick={() => setWeek(startOfWeek(todayKey()))}>This week</button><button type="button" className="se-lva-secondary" disabled={loading || teamLoading} onClick={refresh}>↻ Refresh</button></div>
    {notice && <p role="status" className="se-lva-success">{notice}<button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")}>×</button></p>}
    {shiftError && <p role="alert" className="se-lva-error">{shiftError}</p>}
    {error && tab === "mine" && <p role="alert" className="se-lva-error">{error}</p>}
    {tab === "mine" ? <><div className="se-sha-banner"><span>MY WORK WEEK</span><h2>{weekLabel(week)}</h2><p>Normal day shifts are automatic. Published changes appear below.</p></div>{loading ? <p role="status">Loading your schedule…</p> : !error && !shiftError && <Schedule weekStart={week} assignments={mine} shifts={shifts} />}</> : <>
      {teamError && <p role="alert" className="se-lva-error">{teamError}</p>}
      {tab === "masters" ? <><div className="se-lva-toolbar"><h2>Shift settings</h2><button type="button" className="se-lva-primary" disabled={loading || Boolean(shiftError)} onClick={() => setMaster({})}>＋ Create shift</button></div>{shifts.filter(shift => [shift.name, shift.code].join(" ").toLowerCase().includes(search.trim().toLowerCase())).map(shift => <article key={shift._id} className="se-lva-card"><div className="se-lva-toolbar"><h3>{shift.name}</h3><span className="se-lva-status">{shift.active === false ? "Inactive" : "Active"}</span></div><p>{shiftTiming(shift)}{shift.crossesMidnight ? " · ends next day" : ""}</p><p>{shift.code}{shift.isDefault ? " · Default" : ""}</p><button type="button" className="se-lva-secondary" disabled={loading || Boolean(shiftError)} onClick={() => setMaster(shift)}>Edit shift</button></article>)}</> : person ? <>
        <button type="button" className="se-lva-secondary" onClick={() => setPerson(null)}>← Back to team</button><section className="se-sha-banner"><h2>{person.fullName}</h2><p>{person.employeeCode} · {departmentName(person, team.units)}</p></section>
        {teamLoading ? <p role="status">Loading schedule…</p> : !teamError && <Schedule weekStart={week} assignments={team.assignments.filter(item => idOf(item.employeeId) === idOf(person))} shifts={shifts} rosters={team.rosters} onEdit={access.canManageRoster && !shiftError ? (record, roster) => setEditing({ record, roster }) : null} />}
      </> : <>
        <div className="se-lva-toolbar"><h2>{people.length} employees</h2><button type="button" className="se-lva-secondary" onClick={() => setFilter(true)}>☷ Filters{department || office ? " •" : ""}</button></div>
        <div className="se-sha-actions">{access.canManageRoster && <button type="button" className="se-lva-primary" disabled={!ready} onClick={() => setAssign(true)}>＋ Assign shift</button>}{access.canPublishRoster && <button type="button" className="se-lva-secondary" disabled={!ready || !targets.length} onClick={() => { setTeamError(""); setPublish(true); }}>Publish week</button>}</div>
        {teamLoading ? <p role="status">Loading team schedules…</p> : !teamError && <>
          {!people.length && <p className="se-lva-empty">No employees match these filters.</p>}
          {people.slice((visiblePage - 1) * 50, visiblePage * 50).map(employee => <button type="button" key={idOf(employee)} className="se-lva-request" aria-label={`View schedule for ${employee.fullName}`} onClick={() => setPerson(employee)}><header><strong>{employee.fullName}</strong><span aria-hidden="true">›</span></header><p>{employee.employeeCode} · {departmentName(employee, team.units)}</p><div className="se-sha-mini">{weekDays(week).map(day => {
            const record = team.assignments.find(item => idOf(item.employeeId) === idOf(employee) && item.assignmentDate === day.date);
            const schedule = scheduleOf(record, shifts);
            return <span key={day.date} className={schedule.tone} title={`${day.short}: ${schedule.title}`}>{day.short.slice(0, 1)}<b>{record ? record.dayType === "SHIFT" ? schedule.tone === "night" ? "N" : "S" : record.dayType === "WEEK_OFF" ? "Off" : record.dayType === "HOLIDAY" ? "H" : "L" : "D"}</b></span>;
          })}</div><footer><span>{team.assignments.filter(item => idOf(item.employeeId) === idOf(employee)).length} schedule changes</span><span>View week →</span></footer></button>)}
          <p className="se-sha-legend">D Day · N Night · S Shift · Off Week off · H Holiday · L Leave</p>
          {people.length > 0 && <div className="se-lva-pagination"><button type="button" className="se-lva-secondary" disabled={visiblePage === 1} onClick={() => setPage(visiblePage - 1)}>‹ Previous</button><span>{visiblePage} / {pages}</span><button type="button" className="se-lva-secondary" disabled={visiblePage === pages} onClick={() => setPage(visiblePage + 1)}>Next ›</button></div>}
          <details className="se-lva-history"><summary>Department rosters · {team.rosters.length}</summary>{team.rosters.map(roster => <article key={roster._id}><strong>{roster.orgUnitCode || roster.departmentName}</strong><p>{rosterStatusLabel(roster.status)} · {roster.assignmentCount || 0} entries</p></article>)}</details>
        </>}
      </>}
    </>}
    {assign && <ShiftAssignApp employees={team.employees} units={team.units} assignments={team.assignments} rosters={team.rosters} weekStart={week} shifts={shifts} onClose={() => setAssign(false)} onSaved={saved} onPartial={refresh} />}
    {master && <ShiftMasterApp shift={master._id ? master : null} onClose={() => setMaster(null)} onSaved={saved} />}
    {editing && <EditAssignment {...editing} shifts={shifts} onClose={() => setEditing(null)} onSaved={saved} onPartial={refresh} />}
    {filter && <Dialog title="Filter team" backLabel="Back to shifts" onClose={() => setFilter(false)}><form className="se-lva-form" onSubmit={event => { event.preventDefault(); setFilter(false); }}><div className="se-lva-dialog-body"><label>Department<select value={department} onChange={event => setDepartment(event.target.value)}><option value="">All departments</option>{shiftDepartmentOptions(team.employees, team.units).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label>Office<select value={office} onChange={event => setOffice(event.target.value)}><option value="">All offices</option>{[...new Set(team.employees.map(employee => employee.workLocation).filter(Boolean))].sort().map(value => <option key={value}>{value}</option>)}</select></label></div><footer><button type="button" className="se-lva-secondary" onClick={() => { setDepartment(""); setOffice(""); }}>Clear all</button><button type="submit" className="se-lva-primary">Show team</button></footer></form></Dialog>}
    {publish && <Dialog title="Publish this week?" backLabel="Back to shifts" busy={busy} onClose={() => setPublish(false)}><div className="se-lva-form"><div className="se-lva-dialog-body"><h3>{weekLabel(week)}</h3><p>Publish all eligible department rosters for this week. Employees will see their schedules, and published assignments will be locked.</p>{teamError && <p role="alert" className="se-lva-error">{teamError}</p>}</div><footer><button type="button" className="se-lva-secondary" disabled={busy} onClick={() => setPublish(false)}>Keep drafts</button><button type="button" className="se-lva-primary" disabled={busy} onClick={async () => {
      setBusy(true);
      try {
        const result = await publishShiftRoster(targets[0]._id, { directPublish: true });
        if (!result.published) throw new Error("No eligible rosters were published. Refresh and check their status.");
        saved(`${result.publishedRosterCount || 1} ${(result.publishedRosterCount || 1) === 1 ? "roster" : "rosters"} published.${result.invalidRosters?.length ? " Some rosters were not eligible; check department statuses." : ""}`);
      } catch (failure) { setTeamError(errorOf(failure)); }
      finally { setBusy(false); }
    }}>{busy ? "Publishing…" : "Confirm publish week"}</button></footer></div></Dialog>}
  </main>;
}

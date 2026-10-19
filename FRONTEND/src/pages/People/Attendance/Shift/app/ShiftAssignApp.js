import React, { useEffect, useMemo, useRef, useState } from "react";
import Dialog from "../../../Leave/app/LeaveDialog";
import { employeeShiftDepartment, shiftDepartmentOptions } from "../utils/shiftDepartments";
import { formatDate, shiftTiming, weekDays, weekLabel } from "../utils/shiftHelpers";
import { applyAssignmentPlan, departmentName, errorOf, idOf, planAssignments } from "./shiftAppData";

export default function ShiftAssignApp({ employees, units, assignments, rosters, weekStart, shifts, onClose, onSaved, onPartial }) {
  const [kind, setKind] = useState("SHIFT");
  const nights = shifts.filter(shift => shift.active !== false && (shift.type === "NIGHT" || shift.crossesMidnight));
  const [shiftId, setShiftId] = useState(idOf(nights[0]));
  const [departments, setDepartments] = useState([]);
  const [office, setOffice] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [dates, setDates] = useState([]);
  const [page, setPage] = useState(1);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState("");
  const errorRef = useRef(null);
  useEffect(() => {
    if (error) { errorRef.current?.focus(); errorRef.current?.scrollIntoView?.({ block: "nearest" }); }
  }, [error]);
  const options = shiftDepartmentOptions(employees, units);
  const matches = useMemo(() => employees.filter(employee => departments.includes(employeeShiftDepartment(employee).value) && (!office || employee.workLocation === office) && [employee.fullName, employee.employeeCode, departmentName(employee, units), employee.orgUnitCode].join(" ").toLowerCase().includes(search.trim().toLowerCase())), [employees, departments, office, search, units]);
  const toggle = (value, values, setter) => setter(values.includes(value) ? values.filter(item => item !== value) : [...values, value]);
  const chosen = employees.filter(employee => selected.includes(idOf(employee)));
  const submit = async event => {
    event.preventDefault(); setError("");
    if (!chosen.length || !dates.length || (kind === "SHIFT" && !shiftId)) { setError("Choose employees, dates and a configured shift."); return; }
    let plan;
    try { plan = planAssignments(chosen, assignments, rosters, [...dates].sort(), kind, shiftId); }
    catch (failure) { setError(errorOf(failure)); return; }
    if (!review) { setReview(true); return; }
    setBusy(true);
    try { const count = await applyAssignmentPlan(weekStart, plan, kind, shiftId); onSaved(`${count} new schedule entries saved. ${plan.skipped ? `${plan.skipped} matching entries were already assigned.` : "Publish the week when it is ready."}`); }
    catch (failure) { setError(errorOf(failure)); setFailed(true); onPartial(); }
    finally { setBusy(false); }
  };
  return (
    <Dialog title={review ? "Review assignment" : "Assign shift"} backLabel="Back to shifts" full busy={busy} onClose={onClose}>
      <form className="se-lva-form" onSubmit={submit}>
        <div className="se-lva-dialog-body">
          {error && <p ref={errorRef} tabIndex={-1} role="alert" className="se-lva-error">{error}</p>}
          <p className="se-lva-muted">{weekLabel(weekStart)}</p>
          {review ? <>
            <div className="se-lva-review"><h3>{kind === "SHIFT" ? shifts.find(shift => idOf(shift) === shiftId)?.name : kind === "WEEK_OFF" ? "Week off" : "Holiday"}</h3><strong>{chosen.length} employees · {dates.length} days</strong></div>
            <h3>Dates</h3><p>{[...dates].sort().map(date => formatDate(date, { year: undefined })).join(" · ")}</p>
            <details><summary>Selected employees ({chosen.length})</summary>{chosen.map(employee => <p key={idOf(employee)}>{employee.fullName} · {employee.employeeCode}</p>)}</details>
            <p className="se-lva-note">Saved assignments remain drafts until the week is published.</p>
          </> : <>
            <h3>1. What are you assigning?</h3>
            <div className="se-lva-options">{[["SHIFT", "Night shift"], ["WEEK_OFF", "Week off"], ["HOLIDAY", "Holiday"]].map(([value, label]) => <label key={value}><input type="radio" name="assignment-kind" checked={kind === value} onChange={() => setKind(value)} /><span>{label}</span></label>)}</div>
            {kind === "SHIFT" && <label>Night shift<select value={shiftId} required onChange={event => setShiftId(event.target.value)}><option value="">Choose night shift</option>{nights.map(shift => <option key={idOf(shift)} value={idOf(shift)}>{shift.name} · {shiftTiming(shift)}</option>)}</select></label>}
            {kind === "SHIFT" && !nights.length && <p className="se-lva-note">No active night shift is configured. Ask your shift administrator to add one.</p>}
            <h3>2. Choose employees</h3>
            <details className="se-lva-history" open><summary>Departments · {departments.length} selected</summary><div className="se-sha-options">{options.map(option => <label className="se-lva-check" key={option.value}><input type="checkbox" checked={departments.includes(option.value)} onChange={() => { toggle(option.value, departments, setDepartments); setSelected([]); setPage(1); }} /><span>{option.label}</span></label>)}</div></details>
            <label>Office<select value={office} onChange={event => { setOffice(event.target.value); setSelected([]); setPage(1); }}><option value="">All offices</option>{[...new Set(employees.map(employee => employee.workLocation).filter(Boolean))].sort().map(name => <option key={name}>{name}</option>)}</select></label>
            <label>Find employee<input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Name or employee ID" /></label>
            <div className="se-lva-toolbar"><strong>{selected.length} selected</strong><button type="button" className="se-lva-secondary" disabled={!matches.length} onClick={() => setSelected([...new Set([...selected, ...matches.map(idOf)])])}>Select all {matches.length}</button><button type="button" className="se-lva-secondary" disabled={!selected.length} onClick={() => setSelected([])}>Clear</button></div>
            {!departments.length && <p>Choose a department to see its employees.</p>}
            {matches.slice((page - 1) * 50, page * 50).map(employee => <label className="se-lva-check se-sha-choice" key={idOf(employee)}><input type="checkbox" checked={selected.includes(idOf(employee))} onChange={() => toggle(idOf(employee), selected, setSelected)} /><span><strong>{employee.fullName}</strong><small>{employee.employeeCode} · {departmentName(employee, units)}</small></span></label>)}
            {matches.length > 50 && <div className="se-lva-pagination"><button type="button" className="se-lva-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>{page} / {Math.ceil(matches.length / 50)}</span><button type="button" className="se-lva-secondary" disabled={page * 50 >= matches.length} onClick={() => setPage(page + 1)}>Next</button></div>}
            <h3>3. Choose the dates</h3><div className="se-sha-dates">{weekDays(weekStart).map(day => <label key={day.date}><input type="checkbox" checked={dates.includes(day.date)} onChange={() => toggle(day.date, dates, setDates)} /><span>{day.short}<strong>{day.date.slice(-2)}</strong></span></label>)}</div>
          </>}
        </div>
        <footer><button type="button" className="se-lva-secondary" disabled={busy} onClick={() => review && !failed ? setReview(false) : onClose()}>{review && !failed ? "Edit selection" : "Cancel"}</button><button type="submit" className="se-lva-primary" disabled={busy || failed}>{busy ? "Saving…" : review ? "Save assignment" : "Review assignment →"}</button></footer>
      </form>
    </Dialog>
  );
}

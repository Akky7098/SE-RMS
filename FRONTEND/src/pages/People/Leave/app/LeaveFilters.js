import React, { useState } from "react";
import LeaveDialog from "./LeaveDialog";
import { idOf, statuses } from "./leaveAppData";
export const emptyFilters = { status: "", type: "", from: "", to: "", employee: "" };

export default function LeaveFilters({ filters, types, employees, onClose, onApply }) {
  const [draft, setDraft] = useState(filters);
  const [error, setError] = useState("");
  const update = (key, value) => setDraft({ ...draft, [key]: value });
  return (
    <LeaveDialog title="Filter leaves" onClose={onClose}>
      <form className="se-lva-form" onSubmit={event => {
        event.preventDefault();
        if (draft.from && draft.to && draft.to < draft.from) { setError("End date must be on or after start date."); return; }
        onApply(draft);
      }}>
        <div className="se-lva-dialog-body">
          {error && <p role="alert" className="se-lva-error">{error}</p>}
          <label>Status<select value={draft.status} onChange={event => update("status", event.target.value)}><option value="">All statuses</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Leave type<select value={draft.type} onChange={event => update("type", event.target.value)}><option value="">All leave types</option>{types.map(type => <option key={idOf(type)} value={idOf(type)}>{type.name}</option>)}</select></label>
          {employees.length > 0 && <label>Employee<select value={draft.employee} onChange={event => update("employee", event.target.value)}><option value="">All employees</option>{employees.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>}
          <div className="se-lva-two"><label>From date<input type="date" value={draft.from} onChange={event => update("from", event.target.value)} /></label><label>To date<input type="date" value={draft.to} min={draft.from || undefined} onChange={event => update("to", event.target.value)} /></label></div>
        </div>
        <footer><button type="button" className="se-lva-secondary" onClick={() => setDraft(emptyFilters)}>Clear all</button><button type="submit" className="se-lva-primary">Show leaves</button></footer>
      </form>
    </LeaveDialog>
  );
}

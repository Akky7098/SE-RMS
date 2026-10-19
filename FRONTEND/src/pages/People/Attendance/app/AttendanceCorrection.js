import React, { useState } from "react";
import Sheet from "../../../Recruitment/Interviews/app/InterviewSheet";
import { requestAttendanceRegularization } from "../../../../services/attendanceService";
import { formatDate } from "../utils/attendanceHelpers";
import { messageOf } from "./attendanceAppData";

export default function AttendanceCorrection({ record, onClose, onSaved }) {
  const [type, setType] = useState(record.missingCheckOut ? "MISSING_CHECK_OUT" : "INCORRECT_PUNCH");
  const [reason, setReason] = useState("");
  const [firstInAt, setFirstInAt] = useState("");
  const [lastOutAt, setLastOutAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async event => {
    event.preventDefault();
    if (!reason.trim()) { setError("Enter a reason for the correction."); return; }
    if (firstInAt && lastOutAt && new Date(lastOutAt) <= new Date(firstInAt)) {
      setError("Check out must be after check in."); return;
    }
    setBusy(true);
    setError("");
    try {
      const requested = {};
      if (firstInAt) requested.firstInAt = new Date(firstInAt).toISOString();
      if (lastOutAt) requested.lastOutAt = new Date(lastOutAt).toISOString();
      await requestAttendanceRegularization({ attendanceId: record._id, type, requested, reason: reason.trim() });
      onSaved();
    } catch (failure) { setError(messageOf(failure)); }
    finally { setBusy(false); }
  };
  return (
    <Sheet title="Request correction" onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="se-ata-form">
        <div className="se-iva-sheet-body">
          <p>{formatDate(record.businessDate)}</p>
          {error && <p role="alert" className="se-ata-error">{error}</p>}
          <label>What needs correcting?<select value={type} onChange={event => setType(event.target.value)}>
            {Object.entries({ MISSING_CHECK_IN: "Missing check in", MISSING_CHECK_OUT: "Missing check out", INCORRECT_PUNCH: "Incorrect time", DEVICE_FAILURE: "Device problem", OFFICIAL_WORK: "Official work", WFH: "Work from home", FIELD_VISIT: "Field visit", SHIFT_CORRECTION: "Shift", OTHER: "Other" }).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label>Correct check in · optional<input type="datetime-local" value={firstInAt} onChange={event => setFirstInAt(event.target.value)} /></label>
          <label>Correct check out · optional<input type="datetime-local" value={lastOutAt} onChange={event => setLastOutAt(event.target.value)} /></label>
          <label>Reason<textarea required maxLength={2000} rows={3} value={reason} onChange={event => setReason(event.target.value)} /></label>
        </div>
        <footer><button type="button" className="se-iva-secondary" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="se-iva-primary" disabled={busy}>{busy ? "Sending…" : "Send request"}</button></footer>
      </form>
    </Sheet>
  );
}

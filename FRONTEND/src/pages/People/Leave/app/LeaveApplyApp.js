import React, { useMemo, useState } from "react";
import { applyLeave, getLeaveErrorMessage } from "../../../../services/leaveService";
import { formatLeaveDate, getAvailableBalance, getBalanceType, toDateInputValue } from "../utils/leaveHelpers";
import { idOf, leaveDays } from "./leaveAppData";
import LeaveDialog from "./LeaveDialog";

export default function LeaveApplyApp({ types, balances, balanceYear, onClose, onSaved }) {
  const today = toDateInputValue(new Date());
  const [form, setForm] = useState({ leaveTypeId: "", fromDate: today, toDate: today, durationType: "FULL_DAY", reason: "", emergency: false, emergencyReason: "", contactDuringLeave: "" });
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = types.find(type => idOf(type) === form.leaveTypeId);
  const balance = Number(form.fromDate.slice(0, 4)) === Number(balanceYear) ? balances.find(item => idOf(getBalanceType(item)) === form.leaveTypeId) : null;
  const quantity = useMemo(() => leaveDays(form.fromDate, form.toDate, form.durationType), [form.fromDate, form.toDate, form.durationType]);
  const update = (key, value) => {
    setError("");
    setForm(previous => {
      const next = { ...previous, [key]: value };
      if (key === "leaveTypeId") next.durationType = "FULL_DAY";
      if (key === "durationType" && value !== "FULL_DAY") next.toDate = next.fromDate;
      if (key === "fromDate" && (next.durationType !== "FULL_DAY" || next.toDate < value)) next.toDate = value;
      return next;
    });
  };
  const submit = async event => {
    event.preventDefault();
    setError("");
    if (!selected) { setError("Choose a leave type."); return; }
    if (!quantity) { setError("Choose valid dates. Half-day leave must be on one date."); return; }
    if (!form.reason.trim()) { setError("Tell us why you need leave."); return; }
    if (form.emergency && !form.emergencyReason.trim()) { setError("Enter the emergency reason."); return; }
    if (!review) { setReview(true); return; }
    setBusy(true);
    try {
      await applyLeave({ ...form, reason: form.reason.trim(), emergencyReason: form.emergency ? form.emergencyReason.trim() : "", contactDuringLeave: form.contactDuringLeave.trim(), source: "WEB" });
      onSaved();
    } catch (failure) { setError(getLeaveErrorMessage(failure, "Could not send your leave request.")); }
    finally { setBusy(false); }
  };
  return (
    <LeaveDialog title={review ? "Check your leave" : "Apply for leave"} full busy={busy} onClose={() => review ? setReview(false) : onClose()}>
      <form className="se-lva-form" onSubmit={submit}>
        <div className="se-lva-dialog-body">
          {error && <p role="alert" className="se-lva-error">{error}</p>}
          {review ? (
            <>
              <div className="se-lva-review"><span>LEAVE REQUEST</span><h3>{selected?.name}</h3><strong>{quantity} {quantity === 1 ? "day" : "days"}</strong></div>
              <dl className="se-lva-facts">
                <div><dt>From</dt><dd>{formatLeaveDate(form.fromDate)}</dd></div>
                <div><dt>To</dt><dd>{formatLeaveDate(form.toDate)}</dd></div>
                <div><dt>Duration</dt><dd>{form.durationType === "FULL_DAY" ? "Full day" : form.durationType === "FIRST_HALF" ? "First half" : "Second half"}</dd></div>
              </dl>
              <h3>Reason</h3><p>{form.reason}</p>
              {form.emergency && <p><strong>Emergency:</strong> {form.emergencyReason}</p>}
              {form.contactDuringLeave && <p>Contact: {form.contactDuringLeave}</p>}
              <p className="se-lva-note">Your request will be sent for approval.</p>
            </>
          ) : (
            <>
              <h3>1. Choose your leave</h3>
              <label>Leave type<select required value={form.leaveTypeId} onChange={event => update("leaveTypeId", event.target.value)}>
                <option value="">Choose leave type</option>
                {types.map(type => <option key={idOf(type)} value={idOf(type)}>{type.name} · {type.isPaid ? "Paid" : "Unpaid"}</option>)}
              </select></label>
              {selected && <p className="se-lva-note">{balance ? `${getAvailableBalance(balance)} days available · ${balanceYear}` : selected.requiresBalance ? "Balance will be checked when you send the request." : "This leave does not use a leave balance."}</p>}
              <fieldset><legend>How much of the day?</legend><div className="se-lva-options">
                {[["FULL_DAY", "Full day"], ...(selected?.allowHalfDay ? [["FIRST_HALF", "First half"], ["SECOND_HALF", "Second half"]] : [])].map(([value, label]) => (
                  <label key={value}><input type="radio" name="leave-duration" value={value} checked={form.durationType === value} onChange={() => update("durationType", value)} /><span>{label}</span></label>
                ))}
              </div></fieldset>
              <h3>2. Choose the dates</h3>
              <div className="se-lva-two">
                <label>From date<input type="date" required value={form.fromDate} onChange={event => update("fromDate", event.target.value)} /></label>
                <label>To date<input type="date" required min={form.fromDate} value={form.toDate} disabled={form.durationType !== "FULL_DAY"} onChange={event => update("toDate", event.target.value)} /></label>
              </div>
              <p className="se-lva-day-count">{quantity} {quantity === 1 ? "day" : "days"} requested</p>
              <h3>3. Add a reason</h3>
              <label>Why do you need leave?<textarea required maxLength={2000} rows={3} placeholder="For example, a family function" value={form.reason} onChange={event => update("reason", event.target.value)} /></label>
              <label className="se-lva-check"><input type="checkbox" checked={form.emergency} onChange={event => update("emergency", event.target.checked)} /><span>This is an emergency</span></label>
              {form.emergency && <label>Emergency reason<textarea required rows={2} maxLength={2000} value={form.emergencyReason} onChange={event => update("emergencyReason", event.target.value)} /></label>}
              <label>Contact while on leave · optional<input type="tel" maxLength={50} autoComplete="tel" value={form.contactDuringLeave} onChange={event => update("contactDuringLeave", event.target.value)} /></label>
            </>
          )}
        </div>
        <footer><button type="button" className="se-lva-secondary" disabled={busy} onClick={() => review ? setReview(false) : onClose()}>{review ? "Edit details" : "Cancel"}</button><button type="submit" className="se-lva-primary" disabled={busy || !types.length}>{busy ? "Sending…" : review ? "Send leave request" : "Review leave →"}</button></footer>
      </form>
    </LeaveDialog>
  );
}

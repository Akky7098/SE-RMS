import React, { useState } from "react";
import Dialog from "../../../Leave/app/LeaveDialog";
import { createAttendanceShift, updateAttendanceShift } from "../../../../../services/shiftService";
import { errorOf } from "./shiftAppData";

export default function ShiftMasterApp({ shift, onClose, onSaved }) {
  const [form, setForm] = useState({ name: shift?.name || "", code: shift?.code || "", type: shift?.type || "GENERAL", startTime: shift?.startTime || "09:00", endTime: shift?.endTime || "18:00", requiredMinutes: shift?.requiredMinutes ?? "", timezone: shift?.timezone || "Asia/Kolkata", applicableGenders: shift?.applicableGenders || [], isDefault: Boolean(shift?.isDefault), active: shift?.active !== false, description: shift?.description || "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState(false);
  const update = (key, value) => setForm({ ...form, [key]: value });
  const submit = async event => {
    event.preventDefault();
    if (!form.name.trim() || !form.code.trim()) { setError("Enter a shift name and code."); return; }
    if (!review) { setReview(true); return; }
    setBusy(true); setError("");
    try {
      const payload = { ...form, name: form.name.trim(), code: form.code.trim().toUpperCase(), requiredMinutes: form.requiredMinutes === "" ? undefined : Number(form.requiredMinutes) };
      if (shift?._id) await updateAttendanceShift(shift._id, payload); else await createAttendanceShift(payload);
      onSaved("Shift settings saved.");
    } catch (failure) { setError(errorOf(failure)); }
    finally { setBusy(false); }
  };
  return <Dialog title={shift ? "Edit shift" : "Create shift"} backLabel="Back to shifts" full busy={busy} onClose={onClose}>
    <form className="se-lva-form" onSubmit={submit}><div className="se-lva-dialog-body">
      {error && <p role="alert" className="se-lva-error">{error}</p>}
      {review ? <><h3>{form.name} · {form.code}</h3><p>{form.startTime} → {form.endTime} · {form.timezone}</p><p>{form.active ? "Active" : "Inactive"}{form.isDefault ? " · Default shift" : ""}</p><p className="se-lva-note">These settings are used to calculate attendance. Check the hours before saving.</p></> : <>
        <label>Shift name<input required value={form.name} onChange={event => update("name", event.target.value)} /></label>
        <label>Shift code<input required value={form.code} onChange={event => update("code", event.target.value)} /></label>
        <label>Shift type<select value={form.type} onChange={event => update("type", event.target.value)}>{["GENERAL", "NIGHT", "FLEXIBLE", "ROTATIONAL", "CUSTOM"].map(type => <option key={type}>{type}</option>)}</select></label>
        <div className="se-lva-two"><label>Start time<input type="time" required value={form.startTime} onChange={event => update("startTime", event.target.value)} /></label><label>End time<input type="time" required value={form.endTime} onChange={event => update("endTime", event.target.value)} /></label></div>
        <label>Required work minutes<input type="number" min={0} max={1440} value={form.requiredMinutes} onChange={event => update("requiredMinutes", event.target.value)} /></label>
        <label>Timezone<input required value={form.timezone} onChange={event => update("timezone", event.target.value)} /></label>
        <label className="se-lva-check"><input type="checkbox" checked={form.active} onChange={event => update("active", event.target.checked)} /><span>Active shift</span></label>
        <label className="se-lva-check"><input type="checkbox" checked={form.isDefault} onChange={event => update("isDefault", event.target.checked)} /><span>Default shift</span></label>
        <fieldset><legend>Applicable genders · leave empty for all</legend>{["MALE", "FEMALE", "OTHER"].map(gender => <label className="se-lva-check" key={gender}><input type="checkbox" checked={form.applicableGenders.includes(gender)} onChange={() => update("applicableGenders", form.applicableGenders.includes(gender) ? form.applicableGenders.filter(item => item !== gender) : [...form.applicableGenders, gender])} /><span>{gender}</span></label>)}</fieldset>
        <label>Description · optional<textarea rows={2} value={form.description} onChange={event => update("description", event.target.value)} /></label>
      </>}
    </div><footer><button type="button" className="se-lva-secondary" disabled={busy} onClick={() => review ? setReview(false) : onClose()}>{review ? "Edit details" : "Cancel"}</button><button type="submit" className="se-lva-primary" disabled={busy}>{busy ? "Saving…" : review ? "Confirm shift settings" : "Review settings"}</button></footer></form>
  </Dialog>;
}

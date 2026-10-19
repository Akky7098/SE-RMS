import React, { useState } from "react";
import PayrollError from "./PayrollError";
import Dialog from "../../Leave/app/LeaveDialog";
import { createPayrollPolicy, updatePayrollPolicy } from "../../../../services/payrollService";
import { buildPolicyPayload, getPolicyForm } from "./policyAppData";
import { companyOptions, errorOf, pretty } from "./payrollAppData";
export default function PayrollPolicyApp({
  policy,
  employees,
  departments,
  offices,
  onClose,
  onSaved
}) {
  const [form, setForm] = useState(() => getPolicyForm(policy, ""));
  const [choiceSearch, setChoiceSearch] = useState("");
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (key, value) => setForm({
    ...form,
    [key]: value
  });
  const input = (key, label, type = "number", required = false) => <label key={key}>
  {label}
  <input type={type} required={required} min={type === "number" ? 0 : undefined} step={type === "number" ? "any" : undefined} value={form[key]} onChange={event => update(key, event.target.value)} />
</label>;
  const check = (key, label) => <label className="se-lva-check" key={key}>
  <input type="checkbox" checked={form[key]} onChange={event => update(key, event.target.checked)} />
  <span>
    {label}
  </span>
</label>;
  const choices = form.applicabilityScope === "EMPLOYEES" ? employees.filter(employee => !form.companyCode || employee.companyCode === form.companyCode).map(employee => [employee._id, `${employee.fullName} · ${employee.employeeCode}`]) : form.applicabilityScope === "DEPARTMENT" ? departments.map(department => [department._id, department.name]) : offices.map(office => [office.code || office.officeCode || office.name, office.name]);
  const choiceField = {
    EMPLOYEES: "employeeIds",
    DEPARTMENT: "departmentIds",
    OFFICE: "officeCodes"
  }[form.applicabilityScope];
  const submit = async event => {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || !form.companyCode || !form.effectiveFromMonth) {
      setError("Enter a name, company and starting month.");
      return;
    }
    if (form.effectiveToMonth && form.effectiveToMonth < form.effectiveFromMonth) {
      setError("End month must be on or after start month.");
      return;
    }
    if (choiceField && !choices.length) {
      setError("Policy scope choices are unavailable. Close this form, refresh and try again.");
      return;
    }
    if (choiceField && !form[choiceField].length) {
      setError("Select who this policy applies to.");
      return;
    }
    if (!review) {
      setReview(true);
      return;
    }
    setBusy(true);
    try {
      const payload = buildPolicyPayload(form);
      // The server calculation reads fixedPayrollDays; keep the existing form
      // field while also supplying the field used by the API model.
      payload.fixedPayrollDays = payload.fixedDays;
      if (policy?._id) await updatePayrollPolicy(policy._id, payload);else await createPayrollPolicy(payload);
      onSaved("Payroll policy saved.");
    } catch (failure) {
      setError(errorOf(failure));
    } finally {
      setBusy(false);
    }
  };
  return <Dialog title={policy ? "Edit payroll policy" : "New payroll policy"} full backLabel="Back to payroll" busy={busy} onClose={onClose}>
  <form className="se-lva-form" onSubmit={submit}>
    <div className="se-lva-dialog-body">
      {error && <PayrollError message={error} />}
      {review ? <>
        <h3>
          {form.name}
        </h3>
        <p>{pretty(form.companyCode)} · {pretty(form.policyType)}</p>
        <p>{form.effectiveFromMonth} → {form.effectiveToMonth || "No end month"}</p>
        <p>{pretty(form.applicabilityScope)} · {pretty(form.calculationBasis)}</p>
        <p className="se-lva-note">This changes the rules used for payroll calculation. Check the settings before saving.</p>
      </> : <>
        {input("name", "Policy name", "text", true)}
        <label>Company<select required value={form.companyCode} onChange={event => update("companyCode", event.target.value)}>
            <option value="">Choose company</option>
            {companyOptions.map(([value, label]) => <option key={value} value={value}>
              {label}
            </option>)}
          </select></label>
        <label>Policy type<select value={form.policyType} onChange={event => update("policyType", event.target.value)}>
            <option value="BASE">Base policy</option>
            <option value="ADDITIONAL">Additional policy</option>
          </select></label>
        <div className="se-lva-two">
          {input("effectiveFromMonth", "From month", "month", true)}
          {input("effectiveToMonth", "To month · optional", "month")}
        </div>
        <label>Applies to<select value={form.applicabilityScope} onChange={event => update("applicabilityScope", event.target.value)}>
            {["ALL_EMPLOYEES", "OFFICE", "DEPARTMENT", "EMPLOYEES"].map(value => <option key={value} value={value}>
              {pretty(value)}
            </option>)}
          </select></label>
        {choiceField && <>
          <label>Find policy scope<input type="search" value={choiceSearch} onChange={event => setChoiceSearch(event.target.value)} /></label>
          <p>{form[choiceField].length} selected</p>
          <div className="se-pya-choice-list">
            {choices.filter(([, label]) => String(label).toLowerCase().includes(choiceSearch.toLowerCase())).map(([value, label]) => <label key={value} className="se-lva-check">
              <input type="checkbox" checked={form[choiceField].includes(String(value))} onChange={() => update(choiceField, form[choiceField].includes(String(value)) ? form[choiceField].filter(item => item !== String(value)) : [...form[choiceField], String(value)])} />
              <span>
                {label}
              </span>
            </label>)}
          </div>
        </>}
        <label>Calculation basis<select value={form.calculationBasis} onChange={event => update("calculationBasis", event.target.value)}>
            {["CALENDAR_DAYS", "FIXED_30_DAYS", "WORKING_DAYS"].map(value => <option key={value} value={value}>
              {pretty(value)}
            </option>)}
          </select></label>
        {form.calculationBasis === "FIXED_30_DAYS" && input("fixedDays", "Fixed payroll days")}
        {check("prorateFixedEarnings", "Prorate fixed earnings")}
        <details className="se-lva-history">
          <summary>Attendance rules</summary>
          {[["paidLeavePayable", "Paid leave is payable"], ["weekOffPayable", "Week-offs are payable"], ["holidayPayable", "Holidays are payable"]].map(([key, label]) => check(key, label))}
          {[["halfDayValue", "Half-day value"], ["absentValue", "Absent-day value"], ["notMarkedValue", "Unmarked-day value"]].map(([key, label]) => input(key, label))}
        </details>
        <details className="se-lva-history">
          <summary>Overtime rules</summary>
          {check("overtimeEnabled", "Enable overtime")}
          <label>Calculation<select value={form.overtimeCalculationType} onChange={event => update("overtimeCalculationType", event.target.value)}>
              <option value="SALARY_BASED">Salary based</option>
              <option value="HOURLY_FIXED">Fixed hourly rate</option>
            </select></label>
          {[["overtimeFixedHourlyRate", "Fixed hourly rate (₹)"], ["overtimeMultiplier", "Multiplier"], ["overtimeMinimumMinutes", "Minimum minutes"], ["overtimeRoundingMinutes", "Rounding minutes"]].map(([key, label]) => input(key, label))}
        </details>
        <details className="se-lva-history">
          <summary>Statutory deductions</summary>
          {[["pf", "PF"], ["esi", "ESI"], ["professionalTax", "Professional tax"], ["tds", "TDS"]].map(([key, label]) => <section key={key}>
            {check(`${key}Enabled`, `Enable ${label}`)}
            {input(`${key}Amount`, `${label} amount (₹)`)}
          </section>)}
        </details>
        {check("active", "Active policy")}
        {form.policyType === "BASE" && check("isDefault", "Default company policy")}
      </>}
    </div>
    <footer>
      <button type="button" className="se-lva-secondary" disabled={busy} onClick={() => review ? setReview(false) : onClose()}>
        {review ? "Edit settings" : "Cancel"}
      </button>
      <button type="submit" className="se-lva-primary" disabled={busy}>
        {busy ? "Saving…" : review ? "Confirm policy settings" : "Review policy →"}
      </button>
    </footer>
  </form>
</Dialog>;
}

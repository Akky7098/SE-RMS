import React, { useState } from "react";
import PayrollError from "./PayrollError";
import Dialog from "../../Leave/app/LeaveDialog";
import { createPayrollAdjustment, createPayrollRun, createSalaryStructure } from "../../../../services/payrollService";
import { companyOptions, errorOf, idOf, money, pretty } from "./payrollAppData";
export default function PayrollForms({
  kind,
  month,
  employee,
  policies,
  onClose,
  onSaved
}) {
  const [form, setForm] = useState({
    payrollMonth: month,
    companyCode: employee?.companyCode || "",
    policyId: "",
    notes: "",
    type: "BONUS",
    amount: "",
    reason: "",
    effectiveFrom: "",
    basic: "",
    hra: "",
    conveyance: "",
    other: "",
    paymentMode: "BANK",
    overtimeEligible: false,
    overtimeRate: "",
    remarks: ""
  });
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = {
    create: "New payroll",
    adjustment: "Payroll adjustment",
    salary: "New salary revision"
  }[kind];
  const update = (key, value) => {
    setError("");
    setForm({
      ...form,
      [key]: value
    });
  };
  const eligible = policies.filter(policy => policy.active !== false && policy.companyCode === form.companyCode);
  const gross = ["basic", "hra", "conveyance", "other"].reduce((sum, key) => sum + Number(form[key] || 0), 0);
  const field = (key, label, type = "text", required = false) => <label>
  {label}
  <input type={type} required={required} min={type === "number" ? 0 : undefined} step={type === "number" ? "0.01" : undefined} value={form[key]} onChange={event => update(key, event.target.value)} />
</label>;
  const submit = async event => {
    event.preventDefault();
    setError("");
    if (kind === "adjustment" && (!(Number(form.amount) > 0) || !form.reason.trim())) {
      setError("Enter an amount greater than zero and a reason.");
      return;
    }
    if (kind === "salary" && !(gross > 0)) {
      setError("Enter salary earnings greater than zero.");
      return;
    }
    if (!review) {
      setReview(true);
      return;
    }
    setBusy(true);
    try {
      let result;
      if (kind === "create") result = await createPayrollRun({
        payrollMonth: form.payrollMonth,
        companyCode: form.companyCode,
        policyId: form.policyId,
        notes: form.notes.trim()
      });
      if (kind === "adjustment") result = await createPayrollAdjustment({
        employeeId: idOf(employee),
        payrollMonth: month,
        type: form.type,
        amount: Number(form.amount),
        reason: form.reason.trim()
      });
      if (kind === "salary") result = await createSalaryStructure(idOf(employee), {
        policyId: form.policyId,
        effectiveFrom: form.effectiveFrom,
        monthlyGross: gross,
        annualCTC: gross * 12,
        paymentMode: form.paymentMode,
        remarks: form.remarks,
        earnings: [["BASIC", "Basic Salary", "basic"], ["HRA", "House Rent Allowance", "hra"], ["CONVEYANCE", "Conveyance Allowance", "conveyance"], ["OTHER", "Other Allowance", "other"]].map(([code, name, key]) => ({
          code,
          name,
          amount: Number(form[key] || 0),
          taxable: true,
          proratable: true
        })),
        overtime: {
          eligible: form.overtimeEligible,
          calculationType: "HOURLY_FIXED",
          hourlyRate: Number(form.overtimeRate || 0),
          multiplier: 1
        }
      });
      onSaved(kind === "adjustment" ? "Adjustment saved as a draft. It must be approved before payroll generation includes it." : kind === "salary" ? "Salary revision saved as a draft. Review and activate it before generating payroll." : "Payroll run created.", {
        result,
        kind
      });
    } catch (failure) {
      setError(errorOf(failure));
    } finally {
      setBusy(false);
    }
  };
  return <Dialog title={title} full backLabel="Back to payroll" busy={busy} onClose={onClose}>
  <form className="se-lva-form" onSubmit={submit}>
    <div className="se-lva-dialog-body">
      {error && <PayrollError message={error} />}
      {employee && <h3>{employee.fullName || employee.employeeName} · {employee.employeeCode}</h3>}
      {review ? <>
        <div className="se-lva-review">
          <h3>
            {kind === "create" ? form.payrollMonth : kind === "salary" ? "Monthly gross" : form.type.replaceAll("_", " ")}
          </h3>
          <strong>
            {kind === "create" ? companyOptions.find(([code]) => code === form.companyCode)?.[1] : money(kind === "salary" ? gross : form.amount)}
          </strong>
        </div>
        <p>
          {kind === "salary" ? `Effective from ${form.effectiveFrom}` : form.reason || form.notes}
        </p>
        <p className="se-lva-note">
          {kind === "create" ? "This creates a draft. Generate payroll when the setup is ready." : kind === "salary" ? "This creates a draft salary revision, not an active salary." : "This adjustment will remain a draft until approved."}
        </p>
      </> : <>
        {kind === "create" && <>
          {field("payrollMonth", "Payroll month", "month", true)}
          <label>Company<select required value={form.companyCode} onChange={event => {
                setForm({
                  ...form,
                  companyCode: event.target.value,
                  policyId: ""
                });
              }}>
              <option value="">Choose company</option>
              {companyOptions.map(([code, name]) => <option key={code} value={code}>
                {name}
              </option>)}
            </select></label>
        </>}
        {kind !== "adjustment" && <label>Payroll policy<select required value={form.policyId} onChange={event => update("policyId", event.target.value)}>
            <option value="">Choose policy</option>
            {eligible.map(policy => <option key={policy._id} value={policy._id}>
              {policy.name}
            </option>)}
          </select></label>}
        {kind === "create" && <label>Notes · optional<textarea rows={3} value={form.notes} onChange={event => update("notes", event.target.value)} /></label>}
        {kind === "adjustment" && <>
          <label>Adjustment type<select value={form.type} onChange={event => update("type", event.target.value)}>
              {["BONUS", "INCENTIVE", "ARREAR", "REIMBURSEMENT", "OTHER_EARNING", "OTHER_DEDUCTION", "ADVANCE_RECOVERY", "LOAN_RECOVERY"].map(value => <option key={value} value={value}>
                {pretty(value)}
              </option>)}
            </select></label>
          {field("amount", "Amount (₹)", "number", true)}
          <label>Reason<textarea required rows={3} value={form.reason} onChange={event => update("reason", event.target.value)} /></label>
        </>}
        {kind === "salary" && <>
          {field("effectiveFrom", "Effective from", "date", true)}
          <h3>Monthly earnings</h3>
          {[["basic", "Basic salary"], ["hra", "HRA"], ["conveyance", "Conveyance"], ["other", "Other allowance"]].map(([key, label]) => <React.Fragment key={key}>
            {field(key, `${label} (₹)`, "number", key === "basic")}
          </React.Fragment>)}
          <p className="se-lva-note">Monthly gross: {money(gross)}</p>
          <label>Payment mode<select value={form.paymentMode} onChange={event => update("paymentMode", event.target.value)}>
              {["BANK", "CASH", "CHEQUE"].map(value => <option key={value} value={value}>
                {pretty(value)}
              </option>)}
            </select></label>
          <label className="se-lva-check">
            <input type="checkbox" checked={form.overtimeEligible} onChange={event => update("overtimeEligible", event.target.checked)} />
            <span>Eligible for overtime</span>
          </label>
          {form.overtimeEligible && field("overtimeRate", "Overtime hourly rate (₹)", "number")}
          <label>Remarks · optional<textarea rows={2} value={form.remarks} onChange={event => update("remarks", event.target.value)} /></label>
        </>}
      </>}
    </div>
    <footer>
      <button type="button" className="se-lva-secondary" disabled={busy} onClick={() => review ? setReview(false) : onClose()}>
        {review ? "Edit details" : "Cancel"}
      </button>
      <button type="submit" className="se-lva-primary" disabled={busy}>
        {busy ? "Saving…" : review ? "Confirm & save draft" : "Review details →"}
      </button>
    </footer>
  </form>
</Dialog>;
}

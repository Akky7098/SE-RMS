import React, { useEffect, useState } from "react";
import PayrollError from "./PayrollError";
import Dialog from "../../Leave/app/LeaveDialog";
import { getEmployeePayroll, reviewEmployeePayroll } from "../../../../services/payrollService";
import { componentRows, employeeName, idOf, errorOf, locked, money, pretty } from "./payrollAppData";
export default function PayrollRecordApp({
  recordId,
  personalRecord,
  run,
  onClose,
  onSaved,
  onAdjustment
}) {
  const [record, setRecord] = useState(personalRecord || null);
  const [loading, setLoading] = useState(!personalRecord);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (personalRecord) return undefined;
    let active = true;
    setLoading(true);
    setError("");
    setRecord(null);
    getEmployeePayroll(recordId).then(result => {
      if (active) {
        setRecord(result);
        setMinutes(result.attendanceSnapshot?.approvedOvertimeMinutes || 0);
      }
    }).catch(failure => active && setError(errorOf(failure))).finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [recordId, personalRecord, version]);
  const attendance = record?.attendanceSnapshot || {};
  const payroll = record?.money || {};
  const editable = !personalRecord && !locked(run) && !record?.locked && ["GENERATED", "UNDER_REVIEW"].includes(run?.status);
  const detected = Number(attendance.detectedOvertimeMinutes ?? attendance.overtimeMinutes ?? 0);
  return <Dialog title="Pay details" full backLabel="Back to payroll" busy={busy} onClose={onClose}>
  <div className="se-lva-form">
    <div className="se-lva-dialog-body">
      {error && <PayrollError message={error} />}
      {loading ? <p role="status">Loading pay details…</p> : !record ? <button type="button" className="se-lva-secondary" onClick={() => setVersion(value => value + 1)}>Retry</button> : <>
        <h3>
          {employeeName(record)}
        </h3>
        <p className="se-lva-muted">{record.employeeSnapshot?.employeeCode} · {record.payrollMonth} · {pretty(record.status)}</p>
        <div className="se-pya-pay">
          <span>Net pay</span>
          <strong>
            {money(payroll.netPay)}
          </strong>
          <small>
            {record.locked || personalRecord ? "Finalized payroll" : "Draft calculation"}
          </small>
        </div>
        {record.exceptions?.length > 0 && <section className="se-lva-error">
          <h3>Needs attention</h3>
          {record.exceptions.map((item, index) => <p key={index}>
            {item.message || item.code || "Payroll exception"}
            {item.severity ? ` · ${pretty(item.severity)}` : ""}
          </p>)}
        </section>}
        <details open className="se-lva-history">
          <summary>Earnings · {money(payroll.grossEarnings)}</summary>
          <dl className="se-lva-facts">
            {componentRows(payroll.earnings).map(item => <div key={item.key}>
              <dt>
                {item.label}
              </dt>
              <dd>
                {money(item.amount)}
              </dd>
            </div>)}
          </dl>
        </details>
        <details open className="se-lva-history">
          <summary>Deductions · {money(payroll.totalDeductions)}</summary>
          <dl className="se-lva-facts">
            {componentRows(payroll.deductions).map(item => <div key={item.key}>
              <dt>
                {item.label}
              </dt>
              <dd>
                {money(item.amount)}
              </dd>
            </div>)}
          </dl>
        </details>
        <details className="se-lva-history">
          <summary>Attendance & payable days</summary>
          <dl className="se-lva-facts">
            {[["presentDays", "Present"], ["absentDays", "Absent"], ["paidLeaveDays", "Paid leave"], ["lopDays", "Loss of pay"], ["payableDays", "Payable days"], ["weekOffDays", "Week-offs"], ["holidayDays", "Holidays"], ["missingCheckoutCount", "Missing checkout"]].map(([key, label]) => <div key={key}>
              <dt>
                {label}
              </dt>
              <dd>
                {attendance[key] ?? "—"}
              </dd>
            </div>)}
          </dl>
        </details>
        {editable && <section className="se-pya-review">
          <h3>Overtime review</h3>
          <p>Detected: {detected} minutes · approved: {attendance.approvedOvertimeMinutes || 0} minutes</p>
          <label>Approved overtime minutes<input type="number" min={0} max={detected} step={1} value={minutes} disabled={busy || review} onChange={event => setMinutes(event.target.value)} /></label>
          {review ? <>
            <p className="se-lva-note">Recalculate this employee’s pay using {minutes} approved overtime minutes?</p>
            <div className="se-pya-actions">
              <button type="button" className="se-lva-secondary" disabled={busy} onClick={() => setReview(false)}>Edit minutes</button>
              <button type="button" className="se-lva-primary" disabled={busy} onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await reviewEmployeePayroll(record._id, {
                      approvedOvertimeMinutes: Number(minutes)
                    });
                    onSaved("Employee overtime reviewed and pay recalculated.");
                  } catch (failure) {
                    setError(errorOf(failure));
                  } finally {
                    setBusy(false);
                  }
                }}>
                {busy ? "Saving…" : "Confirm overtime review"}
              </button>
            </div>
          </> : <button type="button" className="se-lva-primary" disabled={!Number.isInteger(Number(minutes)) || Number(minutes) < 0 || Number(minutes) > detected} onClick={() => setReview(true)}>Review overtime</button>}
        </section>}
      </>}
    </div>
    <footer>
      <button type="button" className="se-lva-secondary" disabled={busy} onClick={onClose}>Close</button>
      {record && !loading && !personalRecord && !locked(run) && run?.status === "GENERATED" && <button type="button" className="se-lva-primary" onClick={() => onAdjustment({
          _id: idOf(record.employeeId),
          companyCode: record.employeeSnapshot?.companyCode,
          fullName: employeeName(record),
          employeeCode: record.employeeSnapshot?.employeeCode
        })}>＋ Adjustment</button>}
    </footer>
  </div>
</Dialog>;
}

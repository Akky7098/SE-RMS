import React, { useEffect, useState } from "react";
import { activateSalaryStructure, getEmployeeSalaryHistory } from "../../../../services/payrollService";
import Dialog from "../../Leave/app/LeaveDialog";
import { arrayOf, dateLabel, errorOf, idOf, money, pretty } from "./payrollAppData";
export default function PayrollSalariesApp({
  employees,
  policies,
  loading,
  error,
  search,
  onCreate,
  onRefresh
}) {
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [failure, setFailure] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [search]);
  useEffect(() => {
    if (!selected) return undefined;
    let active = true;
    setHistoryLoading(true);
    setFailure("");
    setHistory([]);
    getEmployeeSalaryHistory(idOf(selected)).then(result => active && setHistory(arrayOf(result))).catch(error => active && setFailure(errorOf(error))).finally(() => active && setHistoryLoading(false));
    return () => {
      active = false;
    };
  }, [selected]);
  const rows = employees.filter(employee => [employee.fullName, employee.employeeCode, employee.companyCode].join(" ").toLowerCase().includes(search.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(rows.length / 50));
  const current = Math.min(page, pages);
  return <>
  <div className="se-lva-toolbar">
    <h2>Salary structures</h2>
    <button type="button" className="se-lva-secondary" onClick={onRefresh}>↻ Refresh</button>
  </div>
  {error && <p role="alert" className="se-lva-error">
    {error}
  </p>}
  {loading ? <p role="status">Loading employees…</p> : rows.slice((current - 1) * 50, current * 50).map(employee => <button key={employee._id} type="button" className="se-lva-request" aria-label={`Salary for ${employee.fullName}`} onClick={() => setSelected(employee)}>
    <header>
      <strong>
        {employee.fullName}
      </strong>
      <span>›</span>
    </header>
    <p>{employee.employeeCode} · {pretty(employee.companyCode)}</p>
  </button>)}
  {!loading && !error && !rows.length && <p className="se-lva-empty">No employees match this search.</p>}
  {rows.length > 50 && <div className="se-lva-pagination">
    <button type="button" className="se-lva-secondary" disabled={current === 1} onClick={() => setPage(current - 1)}>Previous</button>
    <span>{current} / {pages}</span>
    <button type="button" className="se-lva-secondary" disabled={current === pages} onClick={() => setPage(current + 1)}>Next</button>
  </div>}
  {selected && <Dialog title={confirm ? "Activate salary revision?" : selected.fullName} full backLabel="Back to salaries" busy={busy} onClose={() => {
      setSelected(null);
      setConfirm(null);
    }}>
    <div className="se-lva-form">
      <div className="se-lva-dialog-body">
        {failure && <p role="alert" className="se-lva-error">
          {failure}
        </p>}
        {historyLoading ? <p role="status">Loading salary history…</p> : confirm ? <>
          <h3>
            {selected.fullName}
          </h3>
          <p>{money(confirm.monthlyGross)} per month · from {dateLabel(confirm.effectiveFrom)}</p>
          <p className="se-lva-note">This activates and locks the selected revision and supersedes existing active salary structures.</p>
        </> : <>
          <p>{selected.employeeCode} · {pretty(selected.companyCode)}</p>
          {!policies.some(policy => policy.active !== false && policy.companyCode === selected.companyCode) && <p className="se-lva-note">No active policy for this company. Add one in Policies before creating a salary revision.</p>}
          {!history.length && !failure && <p>No salary revisions yet.</p>}
          {history.map(item => <article key={item._id} className="se-lva-card">
            <div className="se-lva-toolbar">
              <h3>
                {money(item.monthlyGross)}
              </h3>
              <span className="se-lva-status">
                {pretty(item.status)}
              </span>
            </div>
            <p>Revision {item.revisionNumber} · {dateLabel(item.effectiveFrom)}</p>
            <details>
              <summary>Earnings</summary>
              {item.earnings?.map((earning, index) => <p key={index}>{earning.name}: {money(earning.amount)}</p>)}
            </details>
            {item.status === "DRAFT" && <button type="button" className="se-lva-primary" onClick={() => setConfirm(item)}>Review activation</button>}
          </article>)}
        </>}
      </div>
      <footer>
        <button type="button" className="se-lva-secondary" disabled={busy} onClick={() => confirm ? setConfirm(null) : setSelected(null)}>
          {confirm ? "Keep draft" : "Close"}
        </button>
        {confirm ? <button type="button" className="se-lva-primary" disabled={busy} onClick={async () => {
            setBusy(true);
            setFailure("");
            try {
              await activateSalaryStructure(confirm._id);
              setConfirm(null);
              setSelected(null);
              onRefresh();
            } catch (error) {
              setFailure(errorOf(error));
            } finally {
              setBusy(false);
            }
          }}>
          {busy ? "Activating…" : "Confirm activation"}
        </button> : <button type="button" className="se-lva-primary" disabled={historyLoading || !policies.some(policy => policy.active !== false && policy.companyCode === selected.companyCode)} onClick={() => {
            onCreate(selected);
            setSelected(null);
          }}>＋ New revision</button>}
      </footer>
    </div>
  </Dialog>}
</>;
}

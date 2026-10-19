import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../../auth/AuthContext";
import { approvePayrollAdjustment, approvePayrollRun, finalizePayrollRun, generatePayrollRun, getMyPayroll, getPayrollPolicies, getPayrollRegister, getPayrollRun, getPayrollRuns, submitPayrollRun } from "../../../../services/payrollService";
import { getActiveDepartments } from "../../../../services/departmentService";
import { getActiveOffices } from "../../../../services/manpowerService";
import { loadEmployeeChoices } from "../../Employees/app/employeeAppData";
import Dialog from "../../Leave/app/LeaveDialog";
import PayrollForms from "./PayrollForms";
import PayrollPolicyApp from "./PayrollPolicyApp";
import PayrollRecordApp from "./PayrollRecordApp";
import PayrollSalariesApp from "./PayrollSalariesApp";
import { actionLabels, arrayOf, employeeName, errorOf, locked, money, monthNow, payrollAccess, pretty, runActions } from "./payrollAppData";
import "../../Leave/app/LeaveApp.css";
import "./PayrollApp.css";
export default function PayrollApp({
  search = ""
}) {
  const {
    user,
    access: authAccess
  } = useAuth();
  const access = useMemo(() => payrollAccess(user, authAccess), [user, authAccess]);
  const [tab, setTab] = useState(access.management ? "runs" : "mine");
  const [month, setMonth] = useState(monthNow);
  const [runs, setRuns] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [runId, setRunId] = useState("");
  const [run, setRun] = useState(null);
  const [register, setRegister] = useState({
    items: [],
    total: 0,
    pages: 1
  });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState(search);
  const [loading, setLoading] = useState(true);
  const [runLoading, setRunLoading] = useState(false);
  const [error, setError] = useState("");
  const [policyError, setPolicyError] = useState("");
  const [runError, setRunError] = useState("");
  const [version, setVersion] = useState(0);
  const [form, setForm] = useState(null);
  const [policyEditor, setPolicyEditor] = useState(null);
  const [record, setRecord] = useState(null);
  const [confirm, setConfirm] = useState("");
  const [filter, setFilter] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [adjustment, setAdjustment] = useState(null);
  const [personal, setPersonal] = useState(null);
  const [master, setMaster] = useState({
    employees: [],
    departments: [],
    offices: [],
    loading: false,
    error: ""
  });
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    setPage(1);
  }, [runId, status]);
  useEffect(() => {
    if (!access.management || tab === "mine") return undefined;
    let active = true;
    setLoading(true);
    setError("");
    setPolicyError("");
    Promise.allSettled([getPayrollRuns({
      payrollMonth: month
    }), getPayrollPolicies()]).then(([list, settings]) => {
      if (!active) return;
      if (list.status === "fulfilled") {
        const items = arrayOf(list.value);
        setRuns(items);
        setRunId(current => items.some(item => item._id === current) ? current : items[0]?._id || "");
      } else {
        setError(errorOf(list.reason));
        setRuns([]);
        setRunId("");
      }
      if (settings.status === "fulfilled") setPolicies(arrayOf(settings.value));else setPolicyError(errorOf(settings.reason));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [access.management, tab, month, version]);
  useEffect(() => {
    if (!access.management || !runId || tab !== "runs") {
      setRun(null);
      return undefined;
    }
    let active = true;
    setRunLoading(true);
    setRunError("");
    setRun(null);
    Promise.all([getPayrollRun(runId), getPayrollRegister(runId, {
      page,
      limit: 50,
      search: query || undefined,
      status: status || undefined
    })]).then(([detail, list]) => {
      if (active) {
        setRun(detail);
        setRegister({
          items: arrayOf(list),
          total: Number(list?.total || 0),
          pages: Math.max(1, Number(list?.pages || 1))
        });
      }
    }).catch(failure => active && setRunError(errorOf(failure))).finally(() => active && setRunLoading(false));
    return () => {
      active = false;
    };
  }, [access.management, runId, tab, page, query, status, version]);
  useEffect(() => {
    if (tab !== "mine") return undefined;
    let active = true;
    setLoading(true);
    setError("");
    setPersonal(null);
    getMyPayroll().then(result => active && setPersonal(result)).catch(failure => active && setError(errorOf(failure))).finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [tab, version]);
  const needsMaster = access.management && (tab === "salaries" || Boolean(policyEditor));
  useEffect(() => {
    if (!needsMaster) return undefined;
    let active = true;
    setMaster(previous => ({
      ...previous,
      loading: true,
      error: ""
    }));
    Promise.allSettled([loadEmployeeChoices(), getActiveDepartments(), getActiveOffices()]).then(([people, departments, offices]) => {
      if (active) setMaster({
        employees: people.status === "fulfilled" ? people.value : [],
        departments: departments.status === "fulfilled" ? arrayOf(departments.value) : [],
        offices: offices.status === "fulfilled" ? arrayOf(offices.value) : [],
        loading: false,
        error: people.status === "rejected" ? errorOf(people.reason) : ""
      });
    });
    return () => {
      active = false;
    };
  }, [needsMaster, version]);
  const refresh = () => setVersion(value => value + 1);
  const saved = (message, extra) => {
    setForm(null);
    setPolicyEditor(null);
    setRecord(null);
    setNotice(message);
    setConfirm("");
    setActionError("");
    if (extra?.kind === "create" && extra.result?._id) {
      setMonth(extra.result.payrollMonth);
      setRunId(extra.result._id);
      setTab("runs");
    }
    if (extra?.kind === "adjustment" && extra.result?._id) setAdjustment(extra.result);
    refresh();
  };
  const execute = async () => {
    setBusy(true);
    setActionError("");
    try {
      const latest = await getPayrollRun(runId);
      if (!runActions(latest).includes(confirm)) throw new Error("Payroll status changed. Close this confirmation and refresh the run.");
      const action = {
        generate: generatePayrollRun,
        submit: submitPayrollRun,
        approve: approvePayrollRun,
        finalize: finalizePayrollRun
      }[confirm];
      await action(runId, confirm === "finalize" ? {
        lockReason: "Payroll finalized"
      } : {});
      saved(`${actionLabels[confirm]} completed.`);
    } catch (failure) {
      setActionError(errorOf(failure));
    } finally {
      setBusy(false);
    }
  };
  const ownRows = (personal?.payslips || []).filter(item => !month || item.payrollMonth === month);
  const visibleRun = run && run._id === runId ? run : null;
  const changeMonth = value => {
    if (value) {
      setMonth(value);
      setRunId("");
      setRun(null);
      setPage(1);
    }
  };
  return <main className="se-lva se-pya">
  {access.management && <nav className="se-lva-tabs" aria-label="Payroll sections">
    {[["runs", "Payroll runs"], ["salaries", "Salary structures"], ["policies", "Policies"], ["mine", "My pay"]].map(([value, label]) => <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)}>
      {label}
    </button>)}
  </nav>}
  <div className="se-lva-toolbar se-pya-top-controls">
    <label className="se-pya-month">Payroll month<input type="month" required value={month} onChange={event => changeMonth(event.target.value)} /></label>
    <button type="button" className="se-lva-secondary" aria-label="Refresh payroll" disabled={loading || runLoading} onClick={refresh}>↻</button>
    {tab === "runs" && access.management && <button type="button" className="se-lva-primary" disabled={loading || Boolean(error || policyError)} onClick={() => setForm({
        kind: "create"
      })}>＋ New payroll</button>}
  </div>
  {notice && <p role="status" className="se-lva-success">
    {notice}
    <button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")}>×</button>
  </p>}
  {error && <p role="alert" className="se-lva-error">
    {error}
  </p>}
  {tab === "mine" ? <>
    <div className="se-pya-banner">
      <span>MY PAY</span>
      <h2>
        {personal?.employee?.fullName || "Salary & payslips"}
      </h2>
      <p>Only finalized payroll appears here.</p>
    </div>
    {loading ? <p role="status">Loading your pay…</p> : !error && <>
      {ownRows.length ? ownRows.map(item => <button key={item._id} type="button" className="se-lva-request" aria-label={`Open my pay ${item.payrollMonth}`} onClick={() => setRecord({
          personal: item
        })}>
        <header>
          <strong>
            {item.payrollMonth}
          </strong>
          <span>›</span>
        </header>
        <div className="se-pya-net">
          {money(item.money?.netPay)}
        </div>
        <footer>
          <span>Finalized</span>
          <span>View pay details →</span>
        </footer>
      </button>) : <p className="se-lva-empty">No finalized payslip for {month}.</p>}
      <details className="se-lva-history">
        <summary>Current salary structure</summary>
        <p>Monthly gross: {money(personal?.currentSalary?.monthlyGross)}</p>
        {personal?.currentSalary?.earnings?.map((item, index) => <p key={index}>{item.name}: {money(item.amount)}</p>)}
      </details>
    </>}
  </> : access.management && <>
    {policyError && <p role="alert" className="se-lva-error">
      {policyError}
    </p>}
    {tab === "salaries" ? <PayrollSalariesApp {...master} policies={policies} search={search} onCreate={employee => setForm({
        kind: "salary",
        employee
      })} onRefresh={refresh} /> : tab === "policies" ? <>
      <div className="se-lva-toolbar">
        <h2>Payroll policies</h2>
        <button type="button" className="se-lva-primary" disabled={loading || Boolean(policyError)} onClick={() => setPolicyEditor({})}>＋ New policy</button>
      </div>
      {policies.filter(policy => [policy.name, policy.companyCode].join(" ").toLowerCase().includes(search.toLowerCase())).map(policy => <button key={policy._id} type="button" className="se-lva-request" onClick={() => setPolicyEditor(policy)}>
        <header>
          <strong>
            {policy.name}
          </strong>
          <span>›</span>
        </header>
        <p>{pretty(policy.companyCode)} · {pretty(policy.policyType || "BASE")}</p>
        <footer>
          <span>
            {policy.active === false ? "Inactive" : "Active"}
            {policy.isDefault ? " · Default" : ""}
          </span>
          <span>Edit settings →</span>
        </footer>
      </button>)}
    </> : <>
      {loading ? <p role="status">Loading payroll runs…</p> : !error && <>
        {!runs.length ? <div className="se-lva-empty">
          <strong>No payroll for {month}</strong>
          <p>Create a payroll run to begin.</p>
        </div> : <label className="se-pya-run-choice">
          <span className="se-pya-sr">Payroll run</span>
          <select value={runId} onChange={event => {
              setRunId(event.target.value);
              setPage(1);
              setStatus("");
            }}>
            {runs.map(item => <option key={item._id} value={item._id}>{pretty(item.companyCode)} · {pretty(item.status)}</option>)}
          </select>
        </label>}
        {runError && <p role="alert" className="se-lva-error">
          {runError}
        </p>}
        {runLoading ? <p role="status">Loading payroll register…</p> : visibleRun && !runError && <>
          <section className="se-pya-banner se-pya-run-summary">
            <div className="se-lva-toolbar">
              <span>NET PAYROLL</span>
              <span className="se-lva-status">
                {pretty(visibleRun.status)}
                {locked(visibleRun) ? " · Locked" : ""}
              </span>
            </div>
            <strong>
              {money(visibleRun.totals?.netPay)}
            </strong>
            <p>{visibleRun.employeeCount || 0} employees · {visibleRun.exceptionCount || 0} exceptions</p>
          </section>
          <div className="se-pya-totals">
            <div>
              <span>Gross earnings</span>
              <strong>
                {money(visibleRun.totals?.grossEarnings)}
              </strong>
            </div>
            <div>
              <span>Deductions</span>
              <strong>
                {money(visibleRun.totals?.totalDeductions)}
              </strong>
            </div>
          </div>
          <div className="se-pya-actions">
            {runActions(visibleRun).map(action => <button type="button" className={action === "generate" && visibleRun.status === "GENERATED" ? "se-lva-secondary" : "se-lva-primary"} key={action} onClick={() => {
                setActionError("");
                setConfirm(action);
              }}>
              {action === "generate" && visibleRun.status === "GENERATED" ? "Regenerate payroll" : actionLabels[action]}
            </button>)}
          </div>
          <div className="se-lva-toolbar">
            <h2>Employees · {register.total}</h2>
            <button type="button" className="se-lva-secondary" onClick={() => setFilter(true)}>☷ Filter{status ? " •" : ""}</button>
          </div>
          {status && <button type="button" className="se-lva-clear" onClick={() => setStatus("")}>Clear {pretty(status)} ×</button>}
          {!register.items.length && <p className="se-lva-empty">
            {visibleRun.status === "DRAFT" ? "Generate payroll to calculate employee pay." : "No employees match this search or filter."}
          </p>}
          {register.items.map(item => <button key={item._id} type="button" className="se-lva-request" aria-label={`Pay details for ${employeeName(item)}`} onClick={() => setRecord({
              id: item._id
            })}>
            <header>
              <strong>
                {employeeName(item)}
              </strong>
              <span>›</span>
            </header>
            <p>{item.employeeSnapshot?.employeeCode} · {item.employeeSnapshot?.departmentName || item.employeeSnapshot?.designation}</p>
            <div className="se-pya-card-pay">
              <span>Net pay</span>
              <strong>
                {money(item.money?.netPay)}
              </strong>
            </div>
            <footer>
              <span className={`se-lva-status ${item.exceptions?.length ? "waiting" : ""}`}>
                {item.exceptions?.length ? `${item.exceptions.length} exceptions` : pretty(item.status)}
              </span>
              <span>View details →</span>
            </footer>
          </button>)}
          {register.total > 0 && <div className="se-lva-pagination">
            <button type="button" className="se-lva-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>‹ Previous</button>
            <span>{page} / {register.pages}</span>
            <button type="button" className="se-lva-secondary" disabled={page >= register.pages} onClick={() => setPage(page + 1)}>Next ›</button>
          </div>}
        </>}
      </>}
    </>}
  </>}
  {form && access.management && <PayrollForms {...form} month={month} policies={policies} onClose={() => setForm(null)} onSaved={saved} />}
  {record && <PayrollRecordApp recordId={record.id} personalRecord={record.personal} run={visibleRun} onClose={() => setRecord(null)} onSaved={saved} onAdjustment={employee => {
      setRecord(null);
      setForm({
        kind: "adjustment",
        employee
      });
    }} />}
  {policyEditor && access.management && <>
    {master.loading ? <Dialog title="Payroll policy" backLabel="Back to payroll" onClose={() => setPolicyEditor(null)}>
      <div className="se-lva-dialog-body" role="status">Loading policy choices…</div>
    </Dialog> : <PayrollPolicyApp policy={policyEditor._id ? policyEditor : null} {...master} onClose={() => setPolicyEditor(null)} onSaved={saved} />}
  </>}
  {filter && <Dialog title="Filter payroll" backLabel="Back to payroll" onClose={() => setFilter(false)}>
    <form className="se-lva-form" onSubmit={event => {
        event.preventDefault();
        setFilter(false);
      }}>
      <div className="se-lva-dialog-body">
        <label>Status<select value={status} onChange={event => setStatus(event.target.value)}>
            <option value="">All employees</option>
            {["CALCULATED", "EXCEPTION", "REVIEWED", "APPROVED", "FINALIZED"].map(value => <option key={value} value={value}>
              {pretty(value)}
            </option>)}
          </select></label>
      </div>
      <footer>
        <button type="button" className="se-lva-secondary" onClick={() => setStatus("")}>Clear</button>
        <button type="submit" className="se-lva-primary">Show employees</button>
      </footer>
    </form>
  </Dialog>}
  {confirm && visibleRun && <Dialog title={actionLabels[confirm]} backLabel="Back to payroll" busy={busy} onClose={() => setConfirm("")}>
    <div className="se-lva-form">
      <div className="se-lva-dialog-body">
        <h3>{visibleRun.payrollMonth} · {pretty(visibleRun.companyCode)}</h3>
        <p>
          {confirm === "finalize" ? "Finalize this payroll and lock employee pay records against further editing?" : confirm === "generate" ? "Calculate payroll for all eligible employees. Regeneration replaces the current employee calculations." : confirm === "approve" ? "Approve the reviewed payroll? Blocking exceptions must be resolved first." : "Send this generated payroll for review?"}
        </p>
        <p>Net payroll: {money(visibleRun.totals?.netPay)}</p>
        {actionError && <p role="alert" className="se-lva-error">
          {actionError}
        </p>}
      </div>
      <footer>
        <button type="button" className="se-lva-secondary" disabled={busy} onClick={() => setConfirm("")}>Cancel</button>
        <button type="button" className="se-lva-primary" disabled={busy} onClick={execute}>
          {busy ? "Processing…" : `Confirm ${confirm === "finalize" ? "finalize & lock" : confirm}`}
        </button>
      </footer>
    </div>
  </Dialog>}
  {adjustment && <Dialog title="Approve saved adjustment?" backLabel="Back to payroll" busy={busy} onClose={() => setAdjustment(null)}>
    <div className="se-lva-form">
      <div className="se-lva-dialog-body">
        <h3>{pretty(adjustment.type)} · {money(adjustment.amount)}</h3>
        <p>
          {adjustment.reason}
        </p>
        <p>This adjustment is a draft. Approval makes it available for the next payroll generation.</p>
        {actionError && <p role="alert" className="se-lva-error">
          {actionError}
        </p>}
      </div>
      <footer>
        <button type="button" className="se-lva-secondary" disabled={busy} onClick={() => setAdjustment(null)}>Keep draft</button>
        <button type="button" className="se-lva-primary" disabled={busy} onClick={async () => {
            setBusy(true);
            setActionError("");
            try {
              await approvePayrollAdjustment(adjustment._id);
              setAdjustment(null);
              setNotice("Adjustment approved. Regenerate payroll to include it.");
              refresh();
            } catch (failure) {
              setActionError(errorOf(failure));
            } finally {
              setBusy(false);
            }
          }}>Confirm adjustment approval</button>
      </footer>
    </div>
  </Dialog>}
</main>;
}

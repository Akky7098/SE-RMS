import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../../auth/AuthContext";
import { getLeaveErrorMessage, getLeaveRegister, getMyLeaveDashboard, getPendingLeaveApprovals } from "../../../../services/leaveService";
import { formatDays, formatLeaveDateShort, getAvailableBalance, getBalanceType, getEmployeeName, getLeaveTypeName } from "../utils/leaveHelpers";
import { filterRequests, idOf, leaveAccess, statuses, tone } from "./leaveAppData";
import LeaveApplyApp from "./LeaveApplyApp";
import LeaveRequestApp from "./LeaveRequestApp";
import LeaveFilters, { emptyFilters } from "./LeaveFilters";
import "./LeaveApp.css";

export default function LeaveApp({ search = "" }) {
  const { user, access: authAccess } = useAuth();
  const access = useMemo(() => leaveAccess(user, authAccess), [user, authAccess]);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [tab, setTab] = useState("mine");
  const [self, setSelf] = useState({ employee: null, types: [], balances: [], requests: [] });
  const [team, setTeam] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [selfError, setSelfError] = useState("");
  const [listError, setListError] = useState("");
  const [version, setVersion] = useState(0);
  const [applyOpen, setApplyOpen] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setSelfError("");
    getMyLeaveDashboard(year).then(result => active && setSelf({ employee: result?.employee || null, types: result?.types || [], balances: result?.balances || [], requests: result?.requests || [] }))
      .catch(failure => active && setSelfError(getLeaveErrorMessage(failure, "Could not load your leave details.")))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [year, version]);
  useEffect(() => {
    if (!((tab === "team" && access.team) || (tab === "approvals" && access.approve))) return undefined;
    let active = true;
    setListLoading(true);
    setListError("");
    const request = tab === "team" ? getLeaveRegister({ from: `${year}-01-01`, to: `${year}-12-31` }) : getPendingLeaveApprovals();
    request.then(result => { if (active) { if (tab === "team") setTeam(result || []); else setPending(result || []); } })
      .catch(failure => active && setListError(getLeaveErrorMessage(failure, "Could not load these leave requests.")))
      .finally(() => active && setListLoading(false));
    return () => { active = false; };
  }, [tab, access.team, access.approve, year, version]);
  useEffect(() => { setPage(1); }, [search, filters, tab, year]);
  const rows = tab === "team" ? team : tab === "approvals" ? pending : self.requests;
  const filtered = useMemo(() => filterRequests(rows, filters, search), [rows, filters, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / 50));
  const visiblePage = Math.min(page, pages);
  const filterTypes = useMemo(() => [...new Map([...self.types, ...rows.map(row => row.leaveTypeId)]
    .filter(type => type && typeof type === "object" && idOf(type))
    .map(type => [idOf(type), type])).values()], [self.types, rows]);
  const employees = useMemo(() => [...new Map(rows.map(row => [idOf(row.employeeId), getEmployeeName(row)])).entries()].filter(([id]) => id).sort((a, b) => a[1].localeCompare(b[1])), [rows]);
  const listBusy = tab === "mine" ? loading : listLoading;
  const error = tab === "mine" ? selfError : listError;
  const changeTab = value => { setTab(value); setFilters(emptyFilters); };
  const saved = text => { setApplyOpen(false); setRequestId(""); setNotice(text); setVersion(value => value + 1); };
  const balanceType = balance => {
    const embedded = getBalanceType(balance);
    return self.types.find(type => idOf(type) === idOf(embedded)) || embedded;
  };
  return (
    <main className="se-lva">
      <nav className="se-lva-tabs" aria-label="Leave sections">
        <button type="button" aria-pressed={tab === "mine"} onClick={() => changeTab("mine")}>My leave</button>
        {access.team && <button type="button" aria-pressed={tab === "team"} onClick={() => changeTab("team")}>Team leaves</button>}
        {access.approve && <button type="button" aria-pressed={tab === "approvals"} onClick={() => changeTab("approvals")}>To approve</button>}
        <button type="button" aria-pressed={tab === "rules"} onClick={() => changeTab("rules")}>Leave types</button>
      </nav>
      {notice && <div role="status" className="se-lva-success">✓ {notice}<button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")}>×</button></div>}
      <div className="se-lva-toolbar">
        {tab !== "approvals" ? <label className="se-lva-year">Year<select value={year} onChange={event => setYear(Number(event.target.value))}>{Array.from({ length: 8 }, (_, index) => currentYear + 1 - index).map(value => <option key={value} value={value}>{value}</option>)}</select></label> : <h2>Waiting for your review</h2>}
        <button type="button" className="se-lva-secondary" disabled={loading || listLoading} onClick={() => setVersion(value => value + 1)}>↻ Refresh</button>
      </div>
      {tab === "mine" && <>
        <section className="se-lva-hero"><div><span>YOUR TIME OFF</span><h2>Plan your leave</h2></div><button type="button" className="se-lva-primary" disabled={loading || Boolean(selfError) || !self.employee || !self.types.length} onClick={() => setApplyOpen(true)}>＋ Apply leave</button></section>
        {loading ? <p role="status">Loading your leave…</p> : !selfError && <>
          <div className="se-lva-heading"><h2>Available leave</h2><span>{year}</span></div>
          <div className="se-lva-balances">{self.balances.map(balance => {
            const type = balanceType(balance);
            return <article key={balance._id || idOf(getBalanceType(balance))} className="se-lva-balance"><span>{type.code || "Leave"}</span><strong>{formatDays(getAvailableBalance(balance))}<small> days left</small></strong><h3>{type.name || "Leave balance"}</h3><p>{formatDays(balance.used)} used · {formatDays(balance.pending)} waiting</p></article>;
          })}</div>
          {!self.balances.length && <p className="se-lva-note">No leave balance has been assigned for {year}. Available leave types can still be checked when applying.</p>}
        </>}
      </>}
      {tab === "rules" ? <>
        {selfError && <p role="alert" className="se-lva-error">{selfError}</p>}
        <h2>Leave types</h2>
        {loading ? <p role="status">Loading leave types…</p> : self.types.map(type => <article key={idOf(type)} className="se-lva-card"><h3>{type.name}</h3><p>{type.description}</p><div className="se-lva-tags"><span>{type.isPaid ? "Paid" : "Unpaid"}</span>{type.allowHalfDay && <span>Half day available</span>}{type.requiresBalance && <span>Uses leave balance</span>}</div></article>)}
      </> : <>
        <div className="se-lva-toolbar"><h2>{tab === "mine" ? "My requests" : "Leave requests"}{!listBusy && ` · ${filtered.length}`}</h2><button type="button" className="se-lva-secondary" onClick={() => setFilterOpen(true)}>☷ Filters{Object.values(filters).some(Boolean) ? " •" : ""}</button></div>
        {Object.values(filters).some(Boolean) && <button type="button" className="se-lva-clear" onClick={() => setFilters(emptyFilters)}>Clear filters ×</button>}
        {error && <p role="alert" className="se-lva-error">{error}</p>}
        {listBusy ? tab !== "mine" && <p role="status">Loading leave requests…</p> : !error && <>
          {!filtered.length && <div className="se-lva-empty"><strong>{tab === "approvals" ? "No requests waiting" : "No leave requests found"}</strong><p>{tab === "mine" ? "Use Apply leave to send your first request, or change your filters." : "Try a different year or clear your filters."}</p></div>}
          {filtered.slice((visiblePage - 1) * 50, visiblePage * 50).map(request => <button key={request._id} type="button" className="se-lva-request" onClick={() => setRequestId(request._id)} aria-label={`View leave ${request.requestNumber || request._id}`}>
            <header><strong>{tab === "mine" ? getLeaveTypeName(request) : getEmployeeName(request)}</strong><span aria-hidden="true">›</span></header>
            {tab !== "mine" && <p>{request.employeeId?.employeeCode} · {getLeaveTypeName(request)}</p>}
            <div className="se-lva-period"><span>{formatLeaveDateShort(request.fromDate)} → {formatLeaveDateShort(request.toDate)}</span><strong>{formatDays(request.totalDays)} {Number(request.totalDays) === 1 ? "day" : "days"}</strong></div>
            <footer><span className={`se-lva-status ${tone(request.status)}`}>{statuses[request.status] || request.status}</span><small>{request.emergency ? "Emergency" : "View details"}</small></footer>
          </button>)}
          {filtered.length > 0 && <div className="se-lva-pagination"><button type="button" className="se-lva-secondary" disabled={visiblePage === 1} onClick={() => setPage(visiblePage - 1)}>‹ Previous</button><span>{visiblePage} / {pages}</span><button type="button" className="se-lva-secondary" disabled={visiblePage === pages} onClick={() => setPage(visiblePage + 1)}>Next ›</button></div>}
        </>}
      </>}
      {applyOpen && <LeaveApplyApp types={self.types} balances={self.balances} balanceYear={year} onClose={() => setApplyOpen(false)} onSaved={() => saved("Leave request sent for approval.")} />}
      {requestId && <LeaveRequestApp requestId={requestId} employeeId={self.employee?._id} access={access} ownIds={self.requests.map(idOf)} onClose={() => setRequestId("")} onSaved={saved} />}
      {filterOpen && <LeaveFilters filters={filters} types={filterTypes} employees={tab === "mine" ? [] : employees} onClose={() => setFilterOpen(false)} onApply={draft => { setFilters(draft); setFilterOpen(false); }} />}
    </main>
  );
}

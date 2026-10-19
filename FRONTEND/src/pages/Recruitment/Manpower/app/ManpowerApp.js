import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../../auth/AuthContext";
import { getManpowerRequirements, getManpowerApprovalInbox } from "../../../../services/manpowerService";
import { formatRecruitmentDate, getApiErrorMessage, getManpowerStatusMeta, getPriorityMeta } from "../../utils/recruitmentHelpers";
import { listRecords, recordId } from "./manpowerAppHelpers";
import ManpowerAppForm from "./ManpowerAppForm";
import ManpowerAppDetail from "./ManpowerAppDetail";
import "./ManpowerApp.css";
const tabs = [["ALL", "All"], ["PENDING_APPROVAL", "Pending"], ["APPROVED", "Approved"], ["HIRING_IN_PROGRESS", "Hiring"], ["FILLED", "Filled"], ["REJECTED", "Rejected"], ["DRAFT", "Draft"], ["CANCELLED", "Cancelled"]];
const PAGE_SIZE = 50;
const baseUrl = "/dashboard?app=recruitment&page=manpower";
export default function ManpowerApp({
  search = ""
}) {
  const {
    user
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const selectedId = params.get("id");
  const creating = params.get("create") === "true";
  const [records, setRecords] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inboxError, setInboxError] = useState("");
  const [status, setStatus] = useState("ALL");
  const [scope, setScope] = useState("ALL");
  const [page, setPage] = useState(1);
  const listHeadingRef = useRef(null);
  const requestVersion = useRef(0);
  const userId = recordId(user);
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError("");
    setInboxError("");
    const [list, approvals] = await Promise.allSettled([getManpowerRequirements(), getManpowerApprovalInbox()]);
    if (version !== requestVersion.current) return;
    if (list.status === "fulfilled") setRecords(listRecords(list.value));else setError(getApiErrorMessage(list.reason, "Requests could not load."));
    if (approvals.status === "fulfilled") setInbox(listRecords(approvals.value));else {
      setInbox([]);
      setInboxError("Approval inbox unavailable. Refresh to try again.");
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
    return () => {
      requestVersion.current += 1;
    };
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [search, status, scope]);
  const approvalIds = useMemo(() => new Set(inbox.filter(item => recordId(item.requestedBy) !== userId).map(recordId)), [inbox, userId]);
  const filtered = records.filter(item => {
    if (scope === "MINE" && recordId(item.requestedBy) !== userId) return false;
    if (scope === "APPROVALS" && !approvalIds.has(recordId(item))) return false;
    if (status !== "ALL" && item.status !== status) return false;
    const haystack = [item.positionTitle, item.requestNumber, item.department?.name, item.location].join(" ").toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRecords = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  useEffect(() => {
    setPage((value) => Math.min(value, totalPages));
  }, [totalPages]);

  const changePage = (nextPage) => {
    setPage(Math.max(1, Math.min(nextPage, totalPages)));
    listHeadingRef.current?.scrollIntoView?.({ block: "start" });
    listHeadingRef.current?.focus({ preventScroll: true });
  };

  return <div className="se-mpa">
    {creating ? <ManpowerAppForm
      onCancel={() => navigate(baseUrl)}
      onCreated={created => {
      setStatus("ALL");
      setScope("ALL");
      load();
      navigate(recordId(created) ? `${baseUrl}&id=${encodeURIComponent(recordId(created))}` : baseUrl, {
      replace: true
      });
      }}
    /> : selectedId ? <ManpowerAppDetail
      key={selectedId}
      id={selectedId}
      approvalIds={approvalIds}
      userId={userId}
      onChanged={load}
      onBack={() => navigate(baseUrl)}
    /> : <>
      <section className="se-mpa-overview">
        <div>
          <span>
            RECRUITMENT
          </span>
          <h2>
            Build your team.
          </h2>
          <p>
            Every opening, one clear view.
          </p>
        </div>
        <button
          type="button"
          className="se-mpa-primary"
          onClick={() => navigate(`${baseUrl}&create=true`)}
        >
          + Raise request
        </button>
      </section>
      <div
        className="se-mpa-scopes"
        aria-label="Request view"
      >
        {[["ALL", "All requests"], ["MINE", "My requests"], ["APPROVALS", "Approvals"]].map(([key, label]) => <button
          type="button"
          key={key}
          aria-pressed={scope === key}
          onClick={() => setScope(key)}
        >
          {label}
          {key === "APPROVALS" && !inboxError && <span>
            {approvalIds.size}
          </span>}
        </button>)}
      </div>
      <div
        className="se-mpa-tabs"
        aria-label="Filter request status"
      >
        {tabs.map(([key, label]) => <button
          type="button"
          key={key}
          aria-pressed={status === key}
          onClick={() => setStatus(key)}
        >
          {label}
        </button>)}
      </div>
      <div className="se-mpa-list-heading" ref={listHeadingRef} tabIndex={-1}>
        <h2>
          {loading ? "Loading requests…" : `${filtered.length} request${filtered.length === 1 ? "" : "s"}`}
        </h2>
        <button
          type="button"
          onClick={load}
          disabled={loading}
        >
          Refresh
        </button>
      </div>
      {inboxError && <p
        className="se-mpa-error"
        role="status"
      >
        {inboxError}
      </p>}
      {error ? <div
        className="se-mpa-error"
        role="alert"
      >
        {error}
        <button
          type="button"
          onClick={load}
        >
          Retry
        </button>
      </div> : loading ? <p
        className="se-mpa-state"
        role="status"
      >
        Loading your requests…
      </p> : <>
        <div className="se-mpa-register">
          {pageRecords.map(item => {
          const state = getManpowerStatusMeta(item.status);
          const priority = getPriorityMeta(item.priority);
            return <button
            type="button"
            className="se-mpa-card"
            key={recordId(item)}
            onClick={() => navigate(`${baseUrl}&id=${encodeURIComponent(recordId(item))}`)}
          >
            <div className="se-mpa-card-top">
              <span>
                {item.requestNumber || "Request"}
              </span>
              <span data-tone={priority.tone}>
                {priority.label}
              </span>
            </div>
            <h3>
              {item.positionTitle}
            </h3>
            <p>
              {item.department?.name || "Department not specified"}
              {item.location ? ` · ${item.location}` : ""}
            </p>
            <div className="se-mpa-card-facts">
              <span>
                <strong>
                  {item.numberOfOpenings ?? 0}
                </strong>
                openings
              </span>
              <span>
                Due 
                <strong>
                  {formatRecruitmentDate(item.requiredByDate)}
                </strong>
              </span>
            </div>
            <div className="se-mpa-card-bottom">
              <span
                className="se-mpa-status"
                data-tone={state.tone}
              >
                {state.label}
              </span>
              <span>
                {approvalIds.has(recordId(item)) ? "Review request" : "View details"}
                →
              </span>
            </div>
          </button>;
          })}
        </div>
        {!filtered.length && <div className="se-mpa-state">
          <h3>
            No requests found
          </h3>
          <p>
            {search || scope !== "ALL" || status !== "ALL" ? "Try another search or filter." : "Raise a request when your team needs someone new."}
          </p>
        </div>}
        {filtered.length > 0 && (
          <nav className="se-mpa-pagination" aria-label="Request pagination">
            <div className="se-mpa-pagination-summary" aria-live="polite">
              <strong>{startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filtered.length)} of {filtered.length}</strong>
              <span>50 per page</span>
            </div>
            <div className="se-mpa-pagination-controls">
              <button
                type="button"
                aria-label="Previous page"
                disabled={currentPage === 1}
                onClick={() => changePage(currentPage - 1)}
              >
                ← Previous
              </button>
              <label>
                <span className="se-mpa-sr-only">Go to request page</span>
                <select value={currentPage} onChange={(event) => changePage(Number(event.target.value))}>
                  {Array.from({ length: totalPages }, (_, index) => (
                    <option key={index + 1} value={index + 1}>Page {index + 1} of {totalPages}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                aria-label="Next page"
                disabled={currentPage === totalPages}
                onClick={() => changePage(currentPage + 1)}
              >
                Next →
              </button>
            </div>
          </nav>
        )}
      </>}
    </>}
  </div>;
}

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getHrHiringQueue, startManpowerHiring } from "../../../../services/manpowerService";
import { formatRecruitmentDate, getApiErrorMessage, getPriorityMeta } from "../../utils/recruitmentHelpers";
import { recordId } from "../../Manpower/app/manpowerAppHelpers";
import HiringOwnerApp from "./HiringOwnerApp";
import "./HiringQueueApp.css";
const PAGE_SIZE = 50;
const hasOwner = item => Boolean(recordId(item.assignedHr));
const normalized = value => String(value || "").trim().toUpperCase();
const matches = (item, filter) => {
  if (filter === "UNASSIGNED") return !hasOwner(item);
  if (filter === "APPROVED") return normalized(item.status) === "APPROVED";
  if (filter === "HIRING") return normalized(item.status) === "HIRING_IN_PROGRESS";
  if (filter === "URGENT") return normalized(item.priority) === "URGENT";
  return true;
};
export default function HiringQueueApp({
  search = ""
}) {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [assignTarget, setAssignTarget] = useState(null);
  const [startTarget, setStartTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const version = useRef(0);
  const pending = useRef(false);
  const listHeading = useRef(null);
  const confirmationHeading = useRef(null);
  const load = useCallback(async () => {
    const request = ++version.current;
    setLoading(true);
    setError("");
    try {
      const result = await getHrHiringQueue();
      if (request === version.current) setRecords(Array.isArray(result) ? result : []);
    } catch (failure) {
      if (request === version.current) setError(getApiErrorMessage(failure, "Hiring queue could not load."));
    } finally {
      if (request === version.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    return () => {
      version.current += 1;
    };
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [search, filter]);
  useEffect(() => {
    if (startTarget) confirmationHeading.current?.focus();
  }, [startTarget]);
  const filters = [["ALL", "All roles"], ["UNASSIGNED", "Needs owner"], ["APPROVED", "Approved"], ["HIRING", "Hiring"], ["URGENT", "Urgent"]];
  const keyword = search.trim().toLowerCase();
  const visible = records.filter(item => matches(item, filter) && [item.requestNumber, item.positionTitle, item.department?.name, item.departmentName, item.assignedHr?.displayName, item.assignedHr?.name, item.assignedHr?.email, item.priority, item.status].filter(Boolean).join(" ").toLowerCase().includes(keyword));
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  useEffect(() => {
    setPage(value => Math.min(value, totalPages));
  }, [totalPages]);
  const changePage = value => {
    setPage(Math.max(1, Math.min(value, totalPages)));
    listHeading.current?.scrollIntoView?.({
      block: "start"
    });
    listHeading.current?.focus({
      preventScroll: true
    });
  };
  const openWorkspace = item => navigate(`/dashboard?app=recruitment&page=hiring-workspace&id=${encodeURIComponent(recordId(item))}&from=hiring`);
  const startHiring = async () => {
    if (pending.current || !startTarget || !hasOwner(startTarget) || normalized(startTarget.status) !== "APPROVED") return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await startManpowerHiring(recordId(startTarget));
      setStartTarget(null);
      setNotice("Hiring started successfully.");
      await load();
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Hiring could not be started."));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return <div className="se-hqa">
    {assignTarget ? <HiringOwnerApp
      key={recordId(assignTarget)}
      requirement={assignTarget}
      onCancel={() => setAssignTarget(null)}
      onAssigned={() => {
      setAssignTarget(null);
      setNotice("HR owner assigned successfully.");
      load();
      }}
    /> : startTarget ? <section className="se-hqa-panel">
      <span className="se-hqa-eyebrow">
        READY TO RECRUIT
      </span>
      <h2
        ref={confirmationHeading}
        tabIndex={-1}
      >
        Start hiring?
      </h2>
      <p>
        {startTarget.positionTitle}
      </p>
      <dl>
        <div>
          <dt>
            Request
          </dt>
          <dd>
            {startTarget.requestNumber}
          </dd>
        </div>
        <div>
          <dt>
            Department
          </dt>
          <dd>
            {startTarget.department?.name || startTarget.departmentName || "—"}
          </dd>
        </div>
        <div>
          <dt>
            HR owner
          </dt>
          <dd>
            {startTarget.assignedHr?.displayName || startTarget.assignedHr?.name || "Assigned"}
          </dd>
        </div>
      </dl>
      {error && <p
        className="se-hqa-error"
        role="alert"
      >
        {error}
      </p>}
      <div className="se-hqa-actions">
        <button
          type="button"
          className="se-hqa-secondary"
          disabled={busy}
          onClick={() => {
          setStartTarget(null);
          setError("");
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="se-hqa-primary"
          disabled={busy}
          onClick={startHiring}
        >
          {busy ? "Starting…" : "Confirm start hiring"}
        </button>
      </div>
    </section> : <>
      <section className="se-hqa-hero">
        <span className="se-hqa-eyebrow">
          RECRUITMENT · HIRING
        </span>
        <h2>
          The next great hire.
        </h2>
        <p>
          Assign ownership. Keep hiring moving.
        </p>
        <div className="se-hqa-metrics">
          {[["UNASSIGNED", "Need owner"], ["HIRING", "Hiring now"], ["URGENT", "Urgent"]].map(([key, label]) => <button
            type="button"
            key={key}
            aria-pressed={filter === key}
            onClick={() => setFilter(filter === key ? "ALL" : key)}
          >
            <strong>
              {loading ? "—" : records.filter(item => matches(item, key)).length}
            </strong>
            <span>
              {label}
            </span>
          </button>)}
        </div>
      </section>
      {notice && <p
        className="se-hqa-notice"
        role="status"
      >
        {notice}
      </p>}
      <div
        className="se-hqa-tabs"
        aria-label="Filter hiring queue"
      >
        {filters.map(([key, label]) => <button
          type="button"
          key={key}
          aria-pressed={filter === key}
          onClick={() => setFilter(key)}
        >
          {label}
        </button>)}
      </div>
      <div
        className="se-hqa-list-heading"
        ref={listHeading}
        tabIndex={-1}
      >
        <h2>
          {loading ? "Loading queue…" : `${visible.length} requirement${visible.length === 1 ? "" : "s"}`}
        </h2>
        <button
          type="button"
          onClick={load}
          disabled={loading}
        >
          Refresh
        </button>
      </div>
      {error ? <div
        className="se-hqa-error"
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
        className="se-hqa-empty"
        role="status"
      >
        Loading hiring queue…
      </p> : <>
        <div className="se-hqa-cards">
          {visible.slice(start, start + PAGE_SIZE).map(item => {
          const owner = hasOwner(item);
          const status = normalized(item.status);
          const state = status === "HIRING_IN_PROGRESS" ? "hiring" : status === "APPROVED" ? owner ? "ready" : "unassigned" : "other";
          const statusLabel = {
          hiring: "Hiring in progress",
          ready: "Ready to start",
          unassigned: "Needs HR owner",
          other: status.replaceAll("_", " ")
          }[state];
          const priority = getPriorityMeta(item.priority);
            return <article
            className="se-hqa-card"
            data-state={state}
            key={recordId(item)}
          >
            <div className="se-hqa-card-top">
              <span>
                {item.requestNumber || "Request"}
              </span>
              <span
                className="se-hqa-priority"
                data-tone={priority.tone}
              >
                {priority.label}
              </span>
            </div>
            <h3>
              {item.positionTitle || "Open position"}
            </h3>
            <p>
              {item.department?.name || item.departmentName || "Department not specified"}
            </p>
            <div className="se-hqa-facts">
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
            <div className="se-hqa-owner">
              <span className="se-hqa-avatar">
                {owner ? (item.assignedHr?.displayName || item.assignedHr?.name || "H").charAt(0) : "+"}
              </span>
              <div>
                <small>
                  HIRING OWNER
                </small>
                <strong>
                  {owner ? item.assignedHr?.displayName || item.assignedHr?.name || "Assigned HR" : "Not assigned"}
                </strong>
              </div>
              {owner && ["APPROVED", "HIRING_IN_PROGRESS"].includes(status) && <button
                type="button"
                aria-label={`Change owner for ${item.positionTitle}`}
                onClick={() => setAssignTarget(item)}
              >
                Change HR
              </button>}
            </div>
            <div className="se-hqa-card-footer">
              <span className="se-hqa-status">
                {statusLabel}
              </span>
              {state === "unassigned" ? <button
                type="button"
                className="se-hqa-primary"
                onClick={() => setAssignTarget(item)}
              >
                Assign HR
              </button> : state === "ready" ? <button
                type="button"
                className="se-hqa-primary"
                onClick={() => {
                setStartTarget(item);
                setError("");
                }}
              >
                Start hiring
              </button> : <button
                type="button"
                className="se-hqa-secondary"
                onClick={() => openWorkspace(item)}
              >
                Open workspace →
              </button>}
            </div>
          </article>;
          })}
        </div>
        {!visible.length && <div className="se-hqa-empty">
          <h3>
            No matching requirements
          </h3>
          <p>
            {search || filter !== "ALL" ? "Try another filter or search." : "Approved requests released to HR will appear here."}
          </p>
        </div>}
        {visible.length > 0 && <nav
          className="se-hqa-pagination"
          aria-label="Hiring queue pagination"
        >
          <div>
            <strong>
              {`${start + 1}–${Math.min(start + PAGE_SIZE, visible.length)} of ${visible.length}`}
            </strong>
            <span>
              50 per page
            </span>
          </div>
          <div className="se-hqa-page-controls">
            <button
              type="button"
              aria-label="Previous page"
              disabled={currentPage === 1}
              onClick={() => changePage(currentPage - 1)}
            >
              ← Previous
            </button>
            <select
              aria-label="Go to hiring page"
              value={currentPage}
              onChange={event => changePage(Number(event.target.value))}
            >
              {Array.from({
              length: totalPages
              }, (_, index) => <option
                key={index + 1}
                value={index + 1}
              >
                {`Page ${index + 1} of ${totalPages}`}
              </option>)}
            </select>
            <button
              type="button"
              aria-label="Next page"
              disabled={currentPage === totalPages}
              onClick={() => changePage(currentPage + 1)}
            >
              Next →
            </button>
          </div>
        </nav>}
      </>}
    </>}
  </div>;
}

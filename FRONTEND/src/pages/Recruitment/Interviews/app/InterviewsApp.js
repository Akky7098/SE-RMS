import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getInterviews } from "../../../../services/interviewService";
import { buildRecruitmentUrl, formatRecruitmentDate, formatRecruitmentTime, getApiErrorMessage, getRecordId } from "../../utils/recruitmentHelpers";
import { ACTIVE_STATUSES, CLOSED_STATUSES, groupInterviewsByCandidate, statusLabel, isToday, normalizeStatus, toTime } from "./interviewAppData";
import InterviewSheet from "./InterviewSheet";
import "./InterviewsApp.css";

const PAGE_SIZE = 50;
const VIEWS = [["ALL", "All"], ["TODAY", "Today"], ["UPCOMING", "Upcoming"], ["ACTION_DUE", "Needs attention"], ["COMPLETED", "Completed"]];
const STATUSES = ["SCHEDULED", "RESCHEDULED", "CHECKED_IN", "INTERVIEWED", "COMPLETED", "CANCELLED", "NO_SHOW"];


const matchesView = (group, view) => group.records.some(item => {
  if (view === "TODAY") return isToday(item.scheduledAt);
  if (view === "UPCOMING") return toTime(item.scheduledAt) > Date.now() && !CLOSED_STATUSES.includes(normalizeStatus(item.status));
  if (view === "ACTION_DUE") return ACTIVE_STATUSES.includes(normalizeStatus(item.status)) && toTime(item.scheduledAt) <= Date.now();
  if (view === "COMPLETED") return normalizeStatus(item.status) === "COMPLETED";
  return true;
});

function Filters({ status, mode, onApply, onClose }) {
  const [nextStatus, setNextStatus] = useState(status);
  const [nextMode, setNextMode] = useState(mode);
  return (
    <InterviewSheet title="Filter interviews" onClose={onClose}>
      <div className="se-iva-sheet-body">
        <fieldset><legend>Interview status</legend>
          <div className="se-iva-options">
            {[["", "All statuses"], ...STATUSES.map(value => [value, statusLabel(value)])].map(([value, label]) => (
              <label key={value} className={nextStatus === value ? "selected" : ""}>
                <input type="radio" name="interview-status" checked={nextStatus === value}
                  onChange={() => setNextStatus(value)} />{label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset><legend>Interview mode</legend>
          <div className="se-iva-options">
            {[["", "All modes"], ["ONLINE", "Online"], ["IN_PERSON", "In person"], ["PHONE", "Phone"]].map(([value, label]) => (
              <label key={value} className={nextMode === value ? "selected" : ""}>
                <input type="radio" name="interview-mode" checked={nextMode === value}
                  onChange={() => setNextMode(value)} />{label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <footer>
        <button type="button" className="se-iva-secondary" onClick={() => { setNextStatus(""); setNextMode(""); }}>Reset</button>
        <button type="button" className="se-iva-primary" onClick={() => onApply(nextStatus, nextMode)}>Show interviews</button>
      </footer>
    </InterviewSheet>
  );
}

export default function InterviewsApp({ search = "" }) {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("ALL");
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const version = useRef(0);
  const heading = useRef(null);

  const load = useCallback(async () => {
    const request = ++version.current;
    setLoading(true);
    setError("");
    try {
      const result = await getInterviews();
      if (request === version.current) setRecords(Array.isArray(result) ? result : []);
    } catch (failure) {
      if (request === version.current) setError(getApiErrorMessage(failure, "Interviews could not load."));
    } finally {
      if (request === version.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => { version.current += 1; };
  }, [load]);
  useEffect(() => { setPage(1); }, [search, view, status, mode]);

  const groups = useMemo(() => groupInterviewsByCandidate(records), [records]);
  const visible = groups.filter(group => {
    if (!matchesView(group, view)) return false;
    if ((status || mode) && !group.records.some(item =>
      (!status || normalizeStatus(item.status) === status) && (!mode || normalizeStatus(item.mode) === mode))) return false;
    const text = [group.candidateName, group.candidate?.mobile, group.candidate?.email, group.positionTitle,
      group.department?.name, ...group.records.flatMap(item => [item.interviewNumber, item.roundName, item.interviewer?.displayName, item.mode, item.status])];
    return text.filter(Boolean).join(" ").toLowerCase().includes(search.trim().toLowerCase());
  }).sort((a, b) => toTime(b.current?.scheduledAt) - toTime(a.current?.scheduledAt));
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const goToPage = value => {
    setPage(value);
    heading.current?.scrollIntoView?.({ block: "start" });
    heading.current?.focus({ preventScroll: true });
  };
  const open = group => {
    const id = getRecordId(group.current || group.latest);
    if (id) navigate(buildRecruitmentUrl("interview", { id, candidateId: group.candidateId || undefined }));
  };

  return (
    <section className="se-iva" aria-label="Mobile interviews">
      <div className="se-iva-toolbar">
        <span className="se-iva-section-label">Interview schedule</span>
        <button type="button" className="se-iva-secondary" onClick={() => setFiltersOpen(true)}>
          Filters{status || mode ? ` (${Number(Boolean(status)) + Number(Boolean(mode))})` : ""}
        </button>
        <button type="button" className="se-iva-refresh" aria-label="Refresh interviews" disabled={loading} onClick={load}>↻</button>
      </div>
      <nav className="se-iva-tabs" aria-label="Interview views">
        {VIEWS.map(([value, label]) => (
          <button type="button" key={value} aria-pressed={view === value} onClick={() => setView(value)}>
            {label}<span>{groups.filter(group => matchesView(group, value)).length}</span>
          </button>
        ))}
      </nav>
      <div className="se-iva-list-heading" ref={heading} tabIndex={-1}>
        <h2>{loading ? "Loading interviews…" : `${visible.length} candidate${visible.length === 1 ? "" : "s"}`}</h2>
        {(status || mode || view !== "ALL") && <button type="button" onClick={() => {
          setStatus(""); setMode(""); setView("ALL");
        }}>Clear filters</button>}
      </div>
      {error ? <div className="se-iva-message" role="alert"><p>{error}</p>
        <button type="button" className="se-iva-primary" onClick={load}>Retry</button>
      </div> : loading ? <p className="se-iva-message" role="status">Loading interview records…</p> : (
        <>
          <div className="se-iva-cards">
            {visible.slice(start, start + PAGE_SIZE).map(group => {
              const item = group.current || group.latest;
              const phone = String(group.candidate?.mobile || "").replace(/[^\d+]/g, "");
              return (
                <article className="se-iva-card" key={group.key}>
                  <button type="button" className="se-iva-card-main" onClick={() => open(group)} aria-label={`View interview for ${group.candidateName}`}>
                    <span className="se-iva-person">
                      <span className="se-iva-avatar">{group.candidateName.charAt(0).toUpperCase()}</span>
                      <span><strong>{group.candidateName}</strong><small>{group.positionTitle}</small></span>
                      <span className="se-iva-chevron" aria-hidden="true">›</span>
                    </span>
                    <span className="se-iva-appointment">
                      <span><strong>{formatRecruitmentDate(item?.scheduledAt)}</strong><small>{formatRecruitmentTime(item?.scheduledAt)}</small></span>
                      <span className="se-iva-round">{item?.roundName || `Round ${item?.roundNumber || 1}`}</span>
                    </span>
                    <span className="se-iva-card-meta">
                      <span className="se-iva-badge" data-status={group.overallStatus}>{statusLabel(group.overallStatus)}</span>
                      <span>{group.totalRounds} {group.totalRounds === 1 ? "round" : "rounds"}</span>
                    </span>
                  </button>
                  <footer className="se-iva-card-footer">
                    <span>{item?.interviewer?.displayName || "Interviewer not assigned"}<small>{String(item?.mode || "").replaceAll("_", " ")}</small></span>
                    {phone && <a href={`tel:${phone}`} className="se-iva-call" aria-label={`Call ${group.candidateName}`}>☎ Call</a>}
                    <button type="button" className="se-iva-primary" onClick={() => open(group)}>Open ›</button>
                  </footer>
                </article>
              );
            })}
          </div>
          {!visible.length && <div className="se-iva-message"><h3>No interviews found</h3><p>Try another search or filter.</p></div>}
          {visible.length > 0 && <nav className="se-iva-pagination" aria-label="Interview pagination">
            <span>{`${start + 1}–${Math.min(start + PAGE_SIZE, visible.length)} of ${visible.length}`}<small>50 candidates per page</small></span>
            <div>
              <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>←</button>
              <select aria-label="Go to interview page" value={currentPage} onChange={event => goToPage(Number(event.target.value))}>
                {Array.from({ length: totalPages }, (_, index) => <option value={index + 1} key={index}>{`Page ${index + 1} of ${totalPages}`}</option>)}
              </select>
              <button type="button" aria-label="Next page" disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)}>→</button>
            </div>
          </nav>}
        </>
      )}
      {filtersOpen && <Filters status={status} mode={mode} onClose={() => setFiltersOpen(false)} onApply={(nextStatus, nextMode) => {
        setStatus(nextStatus); setMode(nextMode); setFiltersOpen(false);
      }} />}
    </section>
  );
}

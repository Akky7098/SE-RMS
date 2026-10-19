import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildRecruitmentUrl, getApiErrorMessage } from "../../utils/recruitmentHelpers";
import MobileSheet from "../../Interviews/app/InterviewSheet";
import { STAGE_FILTERS, candidateName, formatDate, loadSelectionRecords, niceValue, normalize, stageClass } from "./selectionAppData";
import "../../Interviews/app/InterviewsApp.css";
import "./SelectionsApp.css";

const STAGES = [["ALL", "All"], ["LOI", "Intent letter"], ["DOCUMENTS", "Documents"], ["OFFER", "Offer"], ["JOINING", "Joining"]];
const PAGE_SIZE = 50;

export default function SelectionsApp({ search = "" }) {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stage, setStage] = useState("ALL");
  const [attention, setAttention] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftAttention, setDraftAttention] = useState(false);
  const [page, setPage] = useState(1);
  const version = useRef(0);
  const heading = useRef(null);
  const load = useCallback(async () => {
    const request = ++version.current;
    setLoading(true);
    setError("");
    try {
      const result = await loadSelectionRecords(() => request === version.current);
      if (request === version.current) setRecords(result);
    } catch (failure) {
      if (request === version.current) setError(getApiErrorMessage(failure, "Selected candidates could not load."));
    } finally {
      if (request === version.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    return () => { version.current += 1; };
  }, [load]);
  useEffect(() => { setPage(1); }, [search, stage, attention]);
  const needsAttention = item => item.workflow?.actionDue === true || item.actionDue === true;
  const matchesStage = (item, value) => value === "ALL" || STAGE_FILTERS[value].includes(normalize(item.status));
  const visible = records.filter(item => {
    if (!matchesStage(item, stage) || (attention && !needsAttention(item))) return false;
    return [candidateName(item), item.candidate?.candidateNumber, item.candidate?.mobile, item.candidate?.email,
      item.selectionNumber, item.positionTitle, item.department?.name, item.hiringHr?.displayName,
      item.workflow?.stageLabel, item.workflow?.nextActionLabel, niceValue(item.status)]
      .filter(Boolean).join(" ").toLowerCase().includes(search.trim().toLowerCase());
  });
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const changePage = value => {
    setPage(value);
    heading.current?.scrollIntoView?.({ block: "start" });
    heading.current?.focus({ preventScroll: true });
  };
  const open = item => navigate(buildRecruitmentUrl("selection", { id: item._id || item.id }));

  return (
    <section className="se-iva se-sla" aria-label="Mobile selected candidates">
      <div className="se-iva-toolbar">
        <span className="se-iva-section-label">Joining progress</span>
        <button type="button" className="se-iva-secondary" onClick={() => {
          setDraftAttention(attention); setFiltersOpen(true);
        }}>Filters{attention ? " (1)" : ""}</button>
        <button type="button" className="se-iva-refresh" aria-label="Refresh selected candidates" disabled={loading} onClick={load}>↻</button>
      </div>
      <nav className="se-iva-tabs" aria-label="Selection stages">
        {STAGES.map(([value, label]) => <button type="button" key={value} aria-pressed={stage === value} onClick={() => setStage(value)}>
          {label}<span>{records.filter(item => matchesStage(item, value)).length}</span>
        </button>)}
      </nav>
      <div className="se-iva-list-heading" ref={heading} tabIndex={-1}>
        <h2>{loading ? "Loading candidates…" : `${visible.length} candidate${visible.length === 1 ? "" : "s"}`}</h2>
        {(attention || stage !== "ALL") && <button type="button" onClick={() => { setAttention(false); setStage("ALL"); }}>Clear filters</button>}
      </div>
      {error ? <div className="se-iva-message" role="alert"><p>{error}</p><button type="button" className="se-iva-primary" onClick={load}>Retry</button></div>
        : loading ? <p className="se-iva-message" role="status">Loading selection records…</p> : <>
          <div className="se-iva-cards">
            {visible.slice(start, start + PAGE_SIZE).map(item => {
              const phone = String(item.candidate?.mobile || "").replace(/[^\d+]/g, "");
              const progress = Math.min(100, Math.max(0, Number(item.workflow?.progressPercent) || 0));
              return <article className="se-iva-card se-sla-card" key={item._id || item.id}>
                <button type="button" className="se-iva-card-main" aria-label={`View selection for ${candidateName(item)}`} onClick={() => open(item)}>
                  <span className="se-iva-person">
                    <span className="se-iva-avatar">{candidateName(item).charAt(0).toUpperCase()}</span>
                    <span><strong>{candidateName(item)}</strong><small>{item.positionTitle || "Position"}</small></span>
                    <span className="se-iva-chevron" aria-hidden="true">›</span>
                  </span>
                  <span className="se-sla-stage-line">
                    <span className="se-sla-stage" data-stage={stageClass(item.status)}>{item.workflow?.stageLabel || niceValue(item.status)}</span>
                    {needsAttention(item) && <span className="se-sla-attention">! Action due</span>}
                  </span>
                  <span className="se-sla-progress" aria-label={`${progress}% complete`}><i style={{ width: `${progress}%` }} /></span>
                  <span className="se-sla-next"><small>Next step</small><strong>{item.workflow?.nextActionLabel || "Open selection"}</strong></span>
                </button>
                <footer className="se-iva-card-footer">
                  <span>{item.hiringHr?.displayName || "HR not assigned"}<small>{item.proposedJoiningDate ? `Joining ${formatDate(item.proposedJoiningDate)}` : item.selectionNumber || "Selected candidate"}</small></span>
                  {phone && <a className="se-iva-call" href={`tel:${phone}`} aria-label={`Call ${candidateName(item)}`}>☎ Call</a>}
                  <button type="button" className="se-iva-primary" onClick={() => open(item)}>Open ›</button>
                </footer>
              </article>;
            })}
          </div>
          {!visible.length && <div className="se-iva-message"><h3>No selected candidates found</h3><p>Try another search or filter.</p></div>}
          {visible.length > 0 && <nav className="se-iva-pagination" aria-label="Selection pagination">
            <span>{`${start + 1}–${Math.min(start + PAGE_SIZE, visible.length)} of ${visible.length}`}<small>50 candidates per page</small></span>
            <div>
              <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>←</button>
              <select aria-label="Go to selection page" value={currentPage} onChange={event => changePage(Number(event.target.value))}>
                {Array.from({ length: pages }, (_, index) => <option value={index + 1} key={index}>{`Page ${index + 1} of ${pages}`}</option>)}
              </select>
              <button type="button" aria-label="Next page" disabled={currentPage === pages} onClick={() => changePage(currentPage + 1)}>→</button>
            </div>
          </nav>}
        </>}
      {filtersOpen && <MobileSheet title="Filter selected candidates" onClose={() => setFiltersOpen(false)}>
        <div className="se-iva-sheet-body"><fieldset><legend>Work to review</legend><div className="se-iva-options">
          {[[false, "All candidates"], [true, "Action due only"]].map(([value, label]) => <label key={label} className={draftAttention === value ? "selected" : ""}>
            <input type="radio" name="selection-attention" checked={draftAttention === value} onChange={() => setDraftAttention(value)} />{label}
          </label>)}
        </div></fieldset></div>
        <footer>
          <button type="button" className="se-iva-secondary" onClick={() => setDraftAttention(false)}>Reset</button>
          <button type="button" className="se-iva-primary" onClick={() => { setAttention(draftAttention); setFiltersOpen(false); }}>Show candidates</button>
        </footer>
      </MobileSheet>}
    </section>
  );
}

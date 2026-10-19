import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildRecruitmentUrl, getApiErrorMessage } from "../../utils/recruitmentHelpers";
import MobileSheet from "../../Interviews/app/InterviewSheet";
import { decisionLabel, formatDate, getCandidateName, getCandidateNumber, getEvaluatorName, getPosition, getRoundName, groupEvaluationsByCandidate, loadEvaluationRecords, normalizeId, ratingLabel, recommendationLabel } from "./evaluationAppData";
import "../../Interviews/app/InterviewsApp.css";
import "./EvaluationsApp.css";

const PAGE_SIZE = 50;
const DECISIONS = [["ALL", "All"], ["SELECTED", "Selected"], ["HOLD", "On hold"], ["REJECTED", "Rejected"]];

function EvaluationFilters({ recommendation, onClose, onApply }) {
  const [draft, setDraft] = useState(recommendation);
  return (
    <MobileSheet title="Filter evaluations" onClose={onClose}>
      <div className="se-iva-sheet-body"><fieldset><legend>Interviewer recommendation</legend>
        <div className="se-iva-options">
          {[["", "All recommendations"], ["STRONG_HIRE", "Strong hire"], ["HIRE", "Hire"], ["HOLD", "Hold"], ["REJECT", "Reject"]].map(([value, label]) => (
            <label key={value} className={draft === value ? "selected" : ""}>
              <input type="radio" name="evaluation-recommendation" checked={draft === value} onChange={() => setDraft(value)} />{label}
            </label>
          ))}
        </div>
      </fieldset></div>
      <footer>
        <button type="button" className="se-iva-secondary" onClick={() => setDraft("")}>Reset</button>
        <button type="button" className="se-iva-primary" onClick={() => onApply(draft)}>Show evaluations</button>
      </footer>
    </MobileSheet>
  );
}

export default function EvaluationsApp({ search = "" }) {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [decision, setDecision] = useState("ALL");
  const [recommendation, setRecommendation] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const version = useRef(0);
  const heading = useRef(null);
  const load = useCallback(async () => {
    const request = ++version.current;
    setLoading(true);
    setError("");
    try {
      const result = await loadEvaluationRecords("", () => request === version.current);
      if (request === version.current) setRecords(result);
    } catch (failure) {
      if (request === version.current) setError(getApiErrorMessage(failure, "Evaluations could not load."));
    } finally {
      if (request === version.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    return () => { version.current += 1; };
  }, [load]);
  useEffect(() => { setPage(1); }, [search, decision, recommendation]);
  const groups = useMemo(() => groupEvaluationsByCandidate(records), [records]);
  const visible = groups.filter(group => {
    if (decision !== "ALL" && group.decision !== decision) return false;
    if (recommendation && group.latest.recommendation !== recommendation) return false;
    const text = [getCandidateName(group.latest), getCandidateNumber(group.latest), getPosition(group.latest),
      group.candidate?.mobile, group.candidate?.email, group.decision, decisionLabel(group.decision),
      ...group.evaluations.flatMap(item => [getRoundName(item), getEvaluatorName(item), recommendationLabel(item.recommendation)])];
    return text.filter(Boolean).join(" ").toLowerCase().includes(search.trim().toLowerCase());
  });
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const changePage = value => {
    setPage(value);
    heading.current?.scrollIntoView?.({ block: "start" });
    heading.current?.focus({ preventScroll: true });
  };
  const open = group => navigate(buildRecruitmentUrl("evaluation", {
    id: normalizeId(group.latest), candidateId: group.candidateId || undefined,
  }));

  return (
    <section className="se-iva se-eva" aria-label="Mobile evaluations">
      <div className="se-iva-toolbar">
        <span className="se-iva-section-label">Candidate reviews</span>
        <button type="button" className="se-iva-secondary" onClick={() => setFiltersOpen(true)}>Filters{recommendation ? " (1)" : ""}</button>
        <button type="button" className="se-iva-refresh" aria-label="Refresh evaluations" onClick={load} disabled={loading}>↻</button>
      </div>
      <nav className="se-iva-tabs" aria-label="Evaluation decisions">
        {DECISIONS.map(([value, label]) => <button type="button" key={value} aria-pressed={decision === value} onClick={() => setDecision(value)}>
          {label}<span>{groups.filter(group => value === "ALL" || group.decision === value).length}</span>
        </button>)}
      </nav>
      <div className="se-iva-list-heading" tabIndex={-1} ref={heading}>
        <h2>{loading ? "Loading evaluations…" : `${visible.length} candidate${visible.length === 1 ? "" : "s"}`}</h2>
        {(decision !== "ALL" || recommendation) && <button type="button" onClick={() => { setDecision("ALL"); setRecommendation(""); }}>Clear filters</button>}
      </div>
      {error ? <div className="se-iva-message" role="alert"><p>{error}</p><button type="button" className="se-iva-primary" onClick={load}>Retry</button></div>
        : loading ? <p className="se-iva-message" role="status">Loading candidate reviews…</p> : <>
          <div className="se-iva-cards">
            {visible.slice(start, start + PAGE_SIZE).map(group => (
              <article className="se-iva-card se-eva-card" key={group.key}>
                <button type="button" className="se-iva-card-main" aria-label={`View evaluation for ${getCandidateName(group.latest)}`} onClick={() => open(group)}>
                  <span className="se-iva-person">
                    <span className="se-iva-avatar">{getCandidateName(group.latest).charAt(0).toUpperCase()}</span>
                    <span><strong>{getCandidateName(group.latest)}</strong><small>{getPosition(group.latest)}</small></span>
                    <span className="se-iva-chevron" aria-hidden="true">›</span>
                  </span>
                  <span className="se-eva-result">
                    <span className="se-eva-score"><strong>{ratingLabel(group.latest.overallRating)}<small>/5</small></strong><span>Latest score</span></span>
                    <span className="se-eva-decision" data-decision={group.decision}>{decisionLabel(group.decision)}</span>
                    <span className="se-eva-round-count">{group.evaluationCount} {group.evaluationCount === 1 ? "round" : "rounds"}<small>Avg. {ratingLabel(group.averageRating)}/5</small></span>
                  </span>
                </button>
                <footer className="se-iva-card-footer">
                  <span>{getRoundName(group.latest)}<small>{getEvaluatorName(group.latest)} · {formatDate(group.latest.evaluatedAt || group.latest.updatedAt || group.latest.createdAt)}</small></span>
                  <button type="button" className="se-iva-primary" onClick={() => open(group)}>Review ›</button>
                </footer>
              </article>
            ))}
          </div>
          {!visible.length && <div className="se-iva-message"><h3>No evaluations found</h3><p>Try another search or filter.</p></div>}
          {visible.length > 0 && <nav className="se-iva-pagination" aria-label="Evaluation pagination">
            <span>{`${start + 1}–${Math.min(start + PAGE_SIZE, visible.length)} of ${visible.length}`}<small>50 candidates per page</small></span>
            <div>
              <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>←</button>
              <select aria-label="Go to evaluation page" value={currentPage} onChange={event => changePage(Number(event.target.value))}>
                {Array.from({ length: pages }, (_, index) => <option key={index} value={index + 1}>{`Page ${index + 1} of ${pages}`}</option>)}
              </select>
              <button type="button" aria-label="Next page" disabled={currentPage === pages} onClick={() => changePage(currentPage + 1)}>→</button>
            </div>
          </nav>}
        </>}
      {filtersOpen && <EvaluationFilters recommendation={recommendation} onClose={() => setFiltersOpen(false)} onApply={value => {
        setRecommendation(value); setFiltersOpen(false);
      }} />}
    </section>
  );
}

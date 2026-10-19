import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getEvaluation, openEvaluationAttachment, resendEvaluationDecisionEmail } from "../../../../services/evaluationService";
import { getSelectionByCandidate } from "../../../../services/selectionService";
import { buildCandidateDetailUrl, buildRecruitmentUrl, formatRecruitmentDateTime, getApiErrorMessage } from "../../utils/recruitmentHelpers";
import MobileSheet from "../../Interviews/app/InterviewSheet";
import { decisionLabel, formatDate, getCandidateId, getEvaluatorName, getPosition, getRoundName, loadEvaluationRecords, normalizeId, ratingLabel, recommendationLabel } from "./evaluationAppData";
import "../../Interviews/app/InterviewsApp.css";
import "./EvaluationsApp.css";

const RATINGS = [
  ["technicalSkills", "Technical skills"], ["relevantExperience", "Relevant experience"],
  ["communication", "Communication"], ["problemSolving", "Problem solving"],
  ["roleFit", "Role fit"], ["professionalism", "Professionalism"],
];

export default function EvaluationDetailApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const id = new URLSearchParams(location.search).get("id") || "";
  const [evaluation, setEvaluation] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [selection, setSelection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [notice, setNotice] = useState("");
  const [roundsOpen, setRoundsOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [mailBusy, setMailBusy] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const version = useRef(0);

  const load = useCallback(async () => {
    const request = ++version.current;
    const current = () => request === version.current;
    setLoading(true);
    setError("");
    setWarning("");
    setNotice("");
    setRounds([]);
    setSelection(null);
    if (!id) {
      setEvaluation(null);
      setError("Evaluation ID is missing.");
      setLoading(false);
      return;
    }
    try {
      const result = await getEvaluation(id);
      if (!current()) return;
      if (!result) throw new Error("Evaluation not found.");
      setEvaluation(result);
      const candidateId = getCandidateId(result);
      let candidateRounds = [];
      if (candidateId) {
        try {
          const records = await loadEvaluationRecords(result.candidate?.candidateNumber || result.candidate?.fullName || "", current);
          candidateRounds = records.filter(item => getCandidateId(item) === candidateId);
        } catch (failure) {
          if (current()) setWarning("Other rounds could not load. Refresh to retry.");
        }
      }
      if (!current()) return;
      const unique = new Map(candidateRounds.map(item => [normalizeId(item), item]));
      unique.set(normalizeId(result), result);
      setRounds([...unique.values()].sort((a, b) => new Date(a.evaluatedAt || a.createdAt || 0) - new Date(b.evaluatedAt || b.createdAt || 0)));
      if (result.finalDecision === "SELECTED" && candidateId) {
        try {
          const selected = await getSelectionByCandidate(candidateId);
          if (current()) setSelection(selected);
        } catch (failure) {
          if (current()) setWarning(previous => [previous, "Selection details could not load."].filter(Boolean).join(" "));
        }
      }
    } catch (failure) {
      if (current()) {
        setEvaluation(null);
        setError(getApiErrorMessage(failure, "Evaluation could not load."));
      }
    } finally {
      if (current()) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    return () => { version.current += 1; };
  }, [load]);

  const openFile = async () => {
    setFileBusy(true);
    setError("");
    try {
      await openEvaluationAttachment(id);
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Evaluation document could not open."));
    } finally { setFileBusy(false); }
  };
  const resend = async () => {
    const request = version.current;
    setMailBusy(true);
    setError("");
    try {
      await resendEvaluationDecisionEmail(id);
      const updated = await getEvaluation(id);
      if (request === version.current) {
        setEvaluation(updated);
        setEmailOpen(false);
        setNotice("Decision email request sent.");
      }
    } catch (failure) {
      if (request === version.current) setError(getApiErrorMessage(failure, "Decision email could not be sent."));
    } finally { setMailBusy(false); }
  };

  if (loading) return <p className="se-iva se-eva se-iva-message" role="status">Loading evaluation…</p>;
  if (!evaluation) return <section className="se-iva se-eva se-iva-message" role="alert">
    <h2>Evaluation unavailable</h2><p>{error}</p>
    <button type="button" className="se-iva-primary" onClick={load}>Retry</button>
    <button type="button" className="se-iva-secondary" onClick={() => navigate(buildRecruitmentUrl("evaluations"))}>← Evaluations</button>
  </section>;

  const candidate = evaluation.candidate || {};
  const candidateId = getCandidateId(evaluation);
  const email = evaluation.decisionEmail || {};
  const attachment = evaluation.attachment;
  const average = rounds.length ? rounds.reduce((sum, item) => sum + Number(item.overallRating || 0), 0) / rounds.length : null;
  return (
    <section className="se-iva se-eva se-eva-detail" aria-label="Evaluation details">
      <nav className="se-iva-toolbar">
        <button type="button" className="se-iva-secondary" onClick={() => navigate(buildRecruitmentUrl("evaluations"))}>← Evaluations</button>
        <button type="button" className="se-iva-refresh" aria-label="Refresh evaluation" onClick={load} disabled={fileBusy || mailBusy}>↻</button>
      </nav>
      {error && <p className="se-eva-alert" role="alert">{error}</p>}
      {(warning || notice) && <p className="se-eva-alert" role="status">{warning || notice}</p>}
      <section className="se-iva-profile">
        <div className="se-iva-person">
          <span className="se-iva-avatar">{candidate.fullName?.charAt(0).toUpperCase() || "C"}</span>
          <div><h1>{candidate.fullName || "Candidate"}</h1><p>{getPosition(evaluation)}</p></div>
        </div>
        <div className="se-eva-result">
          <span className="se-eva-score"><strong>{ratingLabel(evaluation.overallRating)}<small>/5</small></strong><span>Round score</span></span>
          <span className="se-eva-decision" data-decision={evaluation.finalDecision}>{decisionLabel(evaluation.finalDecision)}</span>
          <span className="se-eva-round-count">{rounds.length} {rounds.length === 1 ? "round" : "rounds"}<small>Avg. {ratingLabel(average)}/5</small></span>
        </div>
        {candidateId && <button type="button" className="se-iva-secondary" onClick={() => navigate(buildCandidateDetailUrl(candidateId))}>Candidate profile ›</button>}
      </section>
      <section className="se-eva-round-info">
        <div><span>Viewing round</span><h2>{getRoundName(evaluation)}</h2></div>
        <button type="button" className="se-iva-primary" disabled={rounds.length < 2} onClick={() => setRoundsOpen(true)}>Change round</button>
        <dl>
          <div><dt>Evaluated by</dt><dd>{getEvaluatorName(evaluation)}</dd></div>
          <div><dt>Recommendation</dt><dd>{recommendationLabel(evaluation.recommendation)}</dd></div>
          <div className="se-eva-wide"><dt>Evaluated on</dt><dd>{formatRecruitmentDateTime(evaluation.evaluatedAt || evaluation.createdAt)}</dd></div>
        </dl>
      </section>
      <section className="se-eva-ratings"><h2>Skills & ratings</h2>
        {RATINGS.map(([key, label]) => <div className="se-eva-rating" key={key}>
          <span>{label}</span><strong>{ratingLabel(evaluation[key])}/5</strong>
          <span className="se-eva-rating-track" aria-hidden="true"><i style={{ width: `${Math.min(100, Math.max(0, Number(evaluation[key]) || 0) * 20)}%` }} /></span>
        </div>)}
      </section>
      <section className="se-eva-feedback"><h2>Feedback</h2>
        <dl>
          <div><dt>Strengths</dt><dd>{evaluation.strengths || "—"}</dd></div>
          <div><dt>Concerns</dt><dd>{evaluation.concerns || "—"}</dd></div>
          {evaluation.remarks && <div><dt>Remarks</dt><dd>{evaluation.remarks}</dd></div>}
        </dl>
      </section>
      {attachment?.storedName && <section className="se-eva-document">
        <div><strong>Evaluation document</strong><small>{attachment.originalName || "Attachment"}</small></div>
        <button type="button" className="se-iva-primary" disabled={fileBusy} onClick={openFile}>{fileBusy ? "Opening…" : "Open file ↗"}</button>
      </section>}
      {(email.status || email.email || candidate.email) && <details className="se-iva-disclosure">
        <summary>Decision email · {String(email.status || "NOT_SENT").replaceAll("_", " ").toLowerCase()}</summary>
        <div className="se-eva-email">
          <p>{email.email || candidate.email}</p>
          {email.sentAt && <p>Sent {formatRecruitmentDateTime(email.sentAt)}</p>}
          {email.error && <p role="alert">{email.error}</p>}
          {email.status !== "SENT" && <button type="button" className="se-iva-primary" onClick={() => setEmailOpen(true)} disabled={mailBusy}>Send decision email</button>}
        </div>
      </details>}
      {evaluation.finalDecision === "SELECTED" && <section className="se-eva-selection">
        <div><strong>{selection?.selectionNumber || "Selected candidate"}</strong><p>{selection?.workflow?.stageLabel || "Continue the joining process."}</p></div>
        {selection?._id && <button type="button" className="se-iva-primary" onClick={() => navigate(buildRecruitmentUrl("selection", { id: selection._id }))}>Open selection ›</button>}
      </section>}
      {roundsOpen && <MobileSheet title="Choose evaluation round" onClose={() => setRoundsOpen(false)}>
        <div className="se-iva-sheet-body se-eva-round-list">
          {rounds.map((item, index) => <button type="button" key={normalizeId(item)} aria-pressed={normalizeId(item) === id}
            onClick={() => {
              setRoundsOpen(false);
              if (normalizeId(item) !== id) navigate(buildRecruitmentUrl("evaluation", { id: normalizeId(item), candidateId }), { replace: true });
            }}>
            <span><strong>{getRoundName(item) || `Round ${index + 1}`}</strong><small>{formatDate(item.evaluatedAt)} · {decisionLabel(item.finalDecision)}</small></span>
            <b>{ratingLabel(item.overallRating)}/5 {normalizeId(item) === id ? "✓" : "›"}</b>
          </button>)}
        </div>
      </MobileSheet>}
      {emailOpen && <MobileSheet title="Send decision email?" busy={mailBusy} onClose={() => setEmailOpen(false)}>
        <div className="se-iva-sheet-body"><p>Send this round’s decision to <strong>{email.email || candidate.email || "the candidate"}</strong>.</p>
          {error && <p role="alert">{error}</p>}
        </div>
        <footer>
          <button type="button" className="se-iva-secondary" disabled={mailBusy} onClick={() => setEmailOpen(false)}>Go back</button>
          <button type="button" className="se-iva-primary" disabled={mailBusy} onClick={resend}>{mailBusy ? "Sending…" : "Send email"}</button>
        </footer>
      </MobileSheet>}
    </section>
  );
}

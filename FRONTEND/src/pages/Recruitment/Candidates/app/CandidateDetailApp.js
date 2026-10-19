import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../../../services/api";
import { getCandidate, getCandidateTimeline } from "../../../../services/recruitmentService";
import { getInterviews } from "../../../../services/interviewService";
import CandidateActionPanel from "../CandidateActionPanel";
import { buildRecruitmentUrl, formatRecruitmentDate, getApiErrorMessage, getCandidateStatusMeta, getRecordId } from "../../utils/recruitmentHelpers";
import "../Candidates.css";
import "../../Interviews/Interviews.css";
import "./CandidateDetailApp.css";

const money = value => value ? new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
}).format(value) : "—";

export default function CandidateDetailApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const id = new URLSearchParams(location.search).get("id");
  const [candidate, setCandidate] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const version = useRef(0);

  const load = useCallback(async () => {
    const current = ++version.current;
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      getCandidate(id), getCandidateTimeline(id), getInterviews({ candidate: id }),
    ]);
    if (current !== version.current) return;
    if (results[0].status === "fulfilled") setCandidate(results[0].value);
    else setError(getApiErrorMessage(results[0].reason, "Candidate could not load."));
    setTimeline(results[1].status === "fulfilled" && Array.isArray(results[1].value) ? results[1].value : []);
    setInterviews(results[2].status === "fulfilled" && Array.isArray(results[2].value) ? results[2].value : []);
    setWarning(results.slice(1).some(result => result.status === "rejected")
      ? "Some interview or activity details could not load. Please refresh." : "");
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (id) load();
    else navigate(buildRecruitmentUrl("candidates"), { replace: true });
    return () => { version.current += 1; };
  }, [id, load, navigate]);

  const openResume = async () => {
    setOpening(true);
    try {
      const response = await api.get(`/resume-parser/candidate-resume/${id}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([response.data], {
        type: response.headers?.["content-type"] || "application/pdf",
      }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (failure) {
      setWarning(getApiErrorMessage(failure, "Resume could not open."));
    } finally { setOpening(false); }
  };

  if (loading) return <p className="se-cda" role="status">Loading candidate…</p>;
  if (error || !candidate) return <div className="se-cda" role="alert">
    <p>{error || "Candidate not found."}</p><button onClick={load}>Retry</button>
  </div>;

  const requirement = candidate.manpowerRequirement || {};
  const phone = String(candidate.mobile || candidate.phone || "").replace(/[^\d+]/g, "");
  const status = getCandidateStatusMeta(candidate.status);
  const facts = [
    ["Experience", `${candidate.totalExperienceYears ?? "—"} yrs`],
    ["Notice", candidate.noticePeriodDays == null ? "—" : `${candidate.noticePeriodDays} days`],
    ["Current CTC", money(candidate.currentSalary)],
    ["Expected CTC", money(candidate.expectedSalary)],
  ];

  return (
    <section className="se-cda" aria-label="Candidate details">
      <nav className="se-cda-toolbar">
        <button onClick={() => navigate(buildRecruitmentUrl("candidates"))}>← Candidates</button>
        <button onClick={load}>↻ Refresh</button>
      </nav>
      {warning && <p role="status" className="se-cda-warning">{warning}</p>}
      <section className="se-cda-profile">
        <div className="se-cda-person">
          <span className="se-cda-avatar">{candidate.fullName?.charAt(0) || "C"}</span>
          <div><h1>{candidate.fullName || "Candidate"}</h1><small>{candidate.candidateNumber}</small></div>
        </div>
        <span className="se-cda-status">{status.label}</span>
        <h2>{candidate.positionTitle || requirement.positionTitle || "Position"}</h2>
        <p>{[requirement.requestNumber, requirement.department?.name].filter(Boolean).join(" · ")}</p>
        <div className="se-cda-contact">
          {phone && <a href={`tel:${phone}`}>☎ Call</a>}
          {candidate.email && <a href={`mailto:${candidate.email}`}>✉ Email</a>}
          {(candidate.resume?.fileName || candidate.resume?.fileUrl) &&
            <button onClick={openResume} disabled={opening}>{opening ? "Opening…" : "↗ Resume"}</button>}
        </div>
      </section>
      <dl className="se-cda-facts">{facts.map(([label, value]) => (
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
      ))}</dl>
      <section className="se-cda-actions"><h2>Candidate actions</h2>
        {candidate.nextAction && <p className="se-cda-next">Next: {String(candidate.nextAction).replaceAll("_", " ").toLowerCase()}</p>}
        <CandidateActionPanel candidate={candidate} interviews={interviews} onChanged={load}
          onOpenInterview={item => navigate(buildRecruitmentUrl("interview", { id: getRecordId(item) }))} />
      </section>
      <details className="se-cda-section"><summary>Profile & contact</summary>
        <dl>{[
          ["Phone", candidate.mobile || candidate.phone], ["Email", candidate.email],
          ["Location", [candidate.city, candidate.state].filter(Boolean).join(", ")],
          ["Company", candidate.currentCompany], ["Designation", candidate.currentDesignation],
          ["Joining", formatRecruitmentDate(candidate.earliestJoiningDate)],
          ["Relevant experience", `${candidate.relevantExperienceYears ?? "—"} yrs`],
          ["Source", candidate.source], ["Skills", Array.isArray(candidate.skills) ? candidate.skills.join(", ") : candidate.skills],
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl>
      </details>
      {(candidate.education?.length > 0 || candidate.experienceHistory?.length > 0) &&
        <details className="se-cda-section"><summary>Education & employment</summary>
          {(candidate.education || []).map((item, index) => <div className="se-cda-record" key={`education-${index}`}>
            <strong>{item.qualification}</strong>
            <span>{[item.specialization, item.institute || item.university, item.year].filter(Boolean).join(" · ")}</span>
          </div>)}
          {(candidate.experienceHistory || []).map((item, index) => <div className="se-cda-record" key={`job-${index}`}>
            <strong>{item.designation}</strong><span>{item.company}</span>
            <small>{formatRecruitmentDate(item.from)} — {item.current ? "Present" : formatRecruitmentDate(item.to)}</small>
            {item.description && <span>{item.description}</span>}
          </div>)}
        </details>}
      <details className="se-cda-section"><summary>Interviews · {interviews.length}</summary>
        {interviews.length ? interviews.map(item => <button className="se-cda-record" key={getRecordId(item)}
          onClick={() => navigate(buildRecruitmentUrl("interview", { id: getRecordId(item) }))}>
          <strong>{String(item.status || "Interview").replaceAll("_", " ")}</strong>
          <span>{formatRecruitmentDate(item.scheduledAt || item.interviewDate || item.createdAt)} · Open ›</span>
        </button>) : <p>No interviews yet.</p>}
      </details>
      <details className="se-cda-section"><summary>Activity · {timeline.length}</summary>
        {timeline.length ? timeline.map((item, index) => <div className="se-cda-record" key={getRecordId(item) || index}>
          <strong>{String(item.title || item.action || item.type || item.eventType || "Update").replaceAll("_", " ")}</strong>
          <span>{item.description || item.remarks || item.note || item.notes || item.message}</span>
          <small>{formatRecruitmentDate(item.createdAt || item.activityAt)}</small>
        </div>) : <p>No activity yet.</p>}
      </details>
      {getRecordId(requirement) && <button className="se-cda-workspace"
        onClick={() => navigate(buildRecruitmentUrl("hiring-workspace", { id: getRecordId(requirement) }))}>
        Hiring workspace ↗
      </button>}
    </section>
  );
}

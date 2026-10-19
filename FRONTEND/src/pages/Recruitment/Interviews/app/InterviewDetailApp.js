// Mobile interview presentation; scheduling and attendance rules mirror the web flow.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cancelInterview, checkInInterview, getInterview, getInterviews, rescheduleInterview } from "../../../../services/interviewService";

import InterviewEvaluationPanel from "../InterviewEvaluationPanel";
import { buildCandidateDetailUrl, buildRecruitmentUrl, formatRecruitmentDate, formatRecruitmentDateTime, formatRecruitmentTime, getApiErrorMessage, getRecordId, safeText } from "../../utils/recruitmentHelpers";
import "../Interviews.css";
import "./InterviewsApp.css";
import InterviewSheet from "./InterviewSheet";
import { statusLabel } from "./interviewAppData";
const DEFAULT_TIMEZONE = "Asia/Kolkata";
const normalizeStatus = value => String(value || "").trim().toUpperCase();
const normalizeEmailStatus = value => String(value || "NOT_SENT").trim().toUpperCase();
const getEmailStatusMeta = value => {
  const status = normalizeEmailStatus(value);
  if (status === "SENT") {
    return {
      label: "Sent",
      symbol: "✓",
      tone: "success"
    };
  }
  if (status === "FAILED") {
    return {
      label: "Failed",
      symbol: "!",
      tone: "danger"
    };
  }
  if (status === "PENDING") {
    return {
      label: "Pending",
      symbol: "…",
      tone: "pending"
    };
  }
  return {
    label: "Not Sent",
    symbol: "—",
    tone: "neutral"
  };
};
const getDateKeyInTimeZone = (value, timezone = DEFAULT_TIMEZONE) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const values = {};
    parts.forEach(part => {
      if (part.type !== "literal") {
        values[part.type] = part.value;
      }
    });
    if (!values.year || !values.month || !values.day) {
      return "";
    }
    return `${values.year}-${values.month}-${values.day}`;
  } catch (error) {
    console.error("Date timezone conversion failed:", error);
    return "";
  }
};
const getMinimumDateTime = () => {
  const value = new Date(Date.now() + 60 * 1000);
  value.setSeconds(0, 0);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 16);
};
const getTimeValue = value => {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
};
const getCandidateIdFromInterview = item => getRecordId(item?.candidate) || item?.candidateId || "";
const getInterviewerName = item => safeText(item?.interviewer?.displayName || item?.interviewerName, "Not assigned");
const getInterviewerEmail = item => safeText(item?.interviewer?.email || item?.interviewerEmailAddress, "");
const getEvaluation = item => item?.evaluation || item?.interviewEvaluation || item?.evaluationData || null;
const getEvaluationDecision = item => {
  const evaluation = getEvaluation(item);
  const value = evaluation?.decision || evaluation?.recommendation || evaluation?.result || item?.decision || item?.recommendation || item?.result || "";
  return String(value).trim().replaceAll("_", " ");
};
const getEvaluationRating = item => {
  const evaluation = getEvaluation(item);
  const value = evaluation?.overallRating ?? evaluation?.rating ?? item?.overallRating ?? item?.rating ?? null;
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return value;
};
const getInterviewRemarks = item => {
  const evaluation = getEvaluation(item);
  return safeText(evaluation?.overallRemarks || evaluation?.remarks || evaluation?.comments || evaluation?.feedback || item?.evaluationRemarks || item?.remarks, "");
};
const getStrengths = item => {
  const evaluation = getEvaluation(item);
  return safeText(evaluation?.strengths, "");
};
const getConcerns = item => {
  const evaluation = getEvaluation(item);
  return safeText(evaluation?.concerns, "");
};
const getRoundResult = item => {
  const decision = getEvaluationDecision(item);
  if (decision) {
    return decision;
  }
  const status = normalizeStatus(item?.status);
  if (status === "COMPLETED") {
    return "Completed";
  }
  if (status === "CHECKED_IN") {
    return "Evaluation Pending";
  }
  if (status === "CANCELLED") {
    return "Cancelled";
  }
  if (status === "NO_SHOW") {
    return "No Show";
  }
  if (status === "RESCHEDULED") {
    return "Rescheduled";
  }
  return "Scheduled";
};
const sortInterviewHistory = (items = []) => [...items].sort((a, b) => {
  const roundA = Number(a?.roundNumber || 0);
  const roundB = Number(b?.roundNumber || 0);
  if (roundA !== roundB) {
    return roundA - roundB;
  }
  return getTimeValue(a?.scheduledAt) - getTimeValue(b?.scheduledAt);
});
const dedupeInterviewHistory = (items = []) => {
  const seen = new Set();
  return items.filter(item => {
    const recordId = getRecordId(item);
    const interviewNumber = String(item?.interviewNumber || "").trim();
    const key = recordId ? `id:${String(recordId)}` : interviewNumber ? `number:${interviewNumber}` : [String(getCandidateIdFromInterview(item) || ""), String(item?.roundNumber || ""), String(item?.roundName || ""), String(item?.scheduledAt || "")].join("|");
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};
const InterviewDetailApp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const interviewId = params.get("id") || "";
  const [interview, setInterview] = useState(null);
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState("");
  const [actionPhase, setActionPhase] = useState("FORM");
  const [actionMessage, setActionMessage] = useState("");
  const [newDate, setNewDate] = useState("");
  const [actionReason, setActionReason] = useState("");
  const load = useCallback(async () => {
    if (!interviewId) {
      setError("Interview ID is missing.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const result = await getInterview(interviewId);
      setInterview(result);
    } catch (loadError) {
      setInterview(null);
      setError(getApiErrorMessage(loadError, "Interview could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [interviewId]);
  const refreshInterview = useCallback(async () => {
    if (!interviewId) {
      return null;
    }
    const result = await getInterview(interviewId);
    setInterview(result);
    return result;
  }, [interviewId]);
  useEffect(() => {
    load();
  }, [load]);
  const status = normalizeStatus(interview?.status);
  const candidateId = getCandidateIdFromInterview(interview);
  const candidateName = safeText(interview?.candidate?.fullName || interview?.candidateName, "Candidate");
  const loadInterviewHistory = useCallback(async () => {
    if (!candidateId) {
      setInterviewHistory(interview ? [interview] : []);
      return;
    }
    try {
      setHistoryLoading(true);
      setHistoryError("");
      const result = await getInterviews({
        candidate: candidateId
      });
      const records = Array.isArray(result) ? result : [];
      const candidateRecords = records.filter(item => {
        const itemCandidateId = getCandidateIdFromInterview(item);
        return !itemCandidateId || String(itemCandidateId) === String(candidateId);
      });
      const uniqueCandidateRecords = dedupeInterviewHistory(candidateRecords);
      const detailedRecords = await Promise.all(uniqueCandidateRecords.map(async item => {
        const id = getRecordId(item);
        if (!id) {
          return item;
        }
        if (String(id) === String(interviewId)) {
          return {
            ...item,
            ...interview
          };
        }
        try {
          const detail = await getInterview(id);
          return {
            ...item,
            ...detail
          };
        } catch (detailError) {
          console.warn(`Interview history detail ${id} could not be loaded:`, detailError);
          return item;
        }
      }));
      const currentExists = detailedRecords.some(item => String(getRecordId(item)) === String(interviewId));
      const completeRecords = currentExists ? detailedRecords : [...detailedRecords, interview].filter(Boolean);
      const finalUniqueRecords = dedupeInterviewHistory(completeRecords);
      setInterviewHistory(sortInterviewHistory(finalUniqueRecords));
    } catch (historyLoadError) {
      console.error("Interview history load failed:", historyLoadError);
      setHistoryError(getApiErrorMessage(historyLoadError, "Interview history could not be loaded."));
      setInterviewHistory(interview ? [interview] : []);
    } finally {
      setHistoryLoading(false);
    }
  }, [candidateId, interview, interviewId]);
  useEffect(() => {
    if (interview && candidateId) {
      loadInterviewHistory();
    }
  }, [interview, candidateId, loadInterviewHistory]);
  const interviewJourney = useMemo(() => sortInterviewHistory(dedupeInterviewHistory(interviewHistory)), [interviewHistory]);
  const journeyStats = useMemo(() => {
    const total = interviewJourney.length;
    const completed = interviewJourney.filter(item => normalizeStatus(item?.status) === "COMPLETED").length;
    const active = interviewJourney.filter(item => !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(normalizeStatus(item?.status))).length;
    return {
      total,
      completed,
      active
    };
  }, [interviewJourney]);
  const checkInEligibility = useMemo(() => {
    if (!interview) {
      return {
        allowed: false,
        state: "INVALID",
        title: "Check-in Unavailable",
        message: "Interview information is unavailable."
      };
    }
    if (!["SCHEDULED", "RESCHEDULED"].includes(status)) {
      return {
        allowed: false,
        state: "STATUS_BLOCKED",
        title: "Check-in Unavailable",
        message: "Candidate cannot be checked in at the current interview stage."
      };
    }
    const timezone = String(interview?.timezone || DEFAULT_TIMEZONE).trim();
    const interviewDate = getDateKeyInTimeZone(interview?.scheduledAt, timezone);
    const today = getDateKeyInTimeZone(new Date(), timezone);
    if (!interviewDate || !today) {
      return {
        allowed: false,
        state: "INVALID",
        title: "Schedule Unavailable",
        message: "Interview schedule could not be validated."
      };
    }
    if (today < interviewDate) {
      return {
        allowed: false,
        state: "EARLY",
        title: "Check-in Not Open",
        message: `Available on ${formatRecruitmentDate(interview?.scheduledAt)}.`
      };
    }
    if (today > interviewDate) {
      return {
        allowed: false,
        state: "EXPIRED",
        title: "Reschedule Required",
        message: "Interview date has passed."
      };
    }
    return {
      allowed: true,
      state: "TODAY",
      title: "Candidate Check-in",
      message: "Candidate can be checked in."
    };
  }, [interview, status]);
  const evaluationEligibility = useMemo(() => {
    if (status === "CHECKED_IN") {
      return {
        allowed: true,
        title: "Complete Evaluation",
        message: "Evaluation is ready."
      };
    }
    if (status === "COMPLETED") {
      return {
        allowed: false,
        title: "Evaluation Completed",
        message: "This round is completed."
      };
    }
    return {
      allowed: false,
      title: "Evaluation Locked",
      message: "Check in the candidate first."
    };
  }, [status]);
  const candidateEmailMeta = useMemo(() => getEmailStatusMeta(interview?.candidateEmail?.status), [interview]);
  const interviewerEmailMeta = useMemo(() => getEmailStatusMeta(interview?.interviewerEmail?.status), [interview]);
  const checkInWelcomeEmailMeta = useMemo(() => getEmailStatusMeta(interview?.checkInWelcomeEmail?.status), [interview]);
  const resetActionState = () => {
    setActionPhase("FORM");
    setActionMessage("");
    setNewDate("");
    setActionReason("");
  };
  const openCheckIn = () => {
    if (!checkInEligibility.allowed) {
      setError(checkInEligibility.message);
      return;
    }
    setError("");
    resetActionState();
    setAction("CHECK_IN");
  };
  const openReschedule = () => {
    setError("");
    resetActionState();
    setAction("RESCHEDULE");
  };
  const openCancel = () => {
    setError("");
    resetActionState();
    setAction("CANCEL");
  };
  const closeAction = () => {
    if (submitting || actionPhase === "PROCESSING") {
      return;
    }
    setAction("");
    resetActionState();
  };
  const submitCheckIn = async () => {
    if (!checkInEligibility.allowed) {
      setActionPhase("ERROR");
      setActionMessage(checkInEligibility.message);
      return;
    }
    try {
      setSubmitting(true);
      setActionPhase("PROCESSING");
      setActionMessage("Recording candidate check-in...");
      await checkInInterview(interviewId, {
        checkInToken: interview?.checkInToken || undefined
      });
      await refreshInterview();
      setActionPhase("SUCCESS");
      setActionMessage(`${candidateName} has been checked in successfully.`);
    } catch (submitError) {
      setActionPhase("ERROR");
      setActionMessage(getApiErrorMessage(submitError, "Candidate could not be checked in."));
    } finally {
      setSubmitting(false);
    }
  };
  const submitReschedule = async () => {
    if (!newDate) {
      setActionPhase("ERROR");
      setActionMessage("Select the new interview date and time.");
      return;
    }
    const selectedDate = new Date(newDate);
    if (Number.isNaN(selectedDate.getTime()) || selectedDate.getTime() <= Date.now()) {
      setActionPhase("ERROR");
      setActionMessage("Select a valid future date and time.");
      return;
    }
    try {
      setSubmitting(true);
      setActionPhase("PROCESSING");
      setActionMessage("Updating interview schedule...");
      await rescheduleInterview(interviewId, {
        scheduledAt: selectedDate.toISOString(),
        reason: actionReason.trim(),
        remarks: actionReason.trim()
      });
      await refreshInterview();
      setActionPhase("SUCCESS");
      setActionMessage(`Interview rescheduled to ${formatRecruitmentDate(selectedDate)} at ${formatRecruitmentTime(selectedDate)}.`);
    } catch (submitError) {
      setActionPhase("ERROR");
      setActionMessage(getApiErrorMessage(submitError, "Interview could not be rescheduled."));
    } finally {
      setSubmitting(false);
    }
  };
  const submitCancel = async () => {
    if (!actionReason.trim()) {
      setActionPhase("ERROR");
      setActionMessage("Enter a cancellation reason.");
      return;
    }
    try {
      setSubmitting(true);
      setActionPhase("PROCESSING");
      setActionMessage("Cancelling interview...");
      await cancelInterview(interviewId, {
        reason: actionReason.trim(),
        cancellationReason: actionReason.trim()
      });
      await refreshInterview();
      setActionPhase("SUCCESS");
      setActionMessage("Interview cancelled successfully.");
    } catch (submitError) {
      setActionPhase("ERROR");
      setActionMessage(getApiErrorMessage(submitError, "Interview could not be cancelled."));
    } finally {
      setSubmitting(false);
    }
  };
  const finishAction = () => {
    setAction("");
    resetActionState();
    setError("");
  };
  const retryAction = () => {
    setActionPhase("FORM");
    setActionMessage("");
  };
  if (loading) return <p className="se-iva se-iva-message" role="status">Loading interview…</p>;
  if (!interview) return (
    <section className="se-iva se-iva-message" role="alert">
      <h2>Interview unavailable</h2><p>{error}</p>
      <button type="button" className="se-iva-primary" onClick={load}>Retry</button>
      <button type="button" className="se-iva-secondary" onClick={() => navigate(buildRecruitmentUrl("interviews"))}>← Interviews</button>
    </section>
  );
  const closed = ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(status);
  const phone = String(interview.candidate?.mobile || "").replace(/[^\d+]/g, "");
  const meetingLink = /^https?:\/\//i.test(interview.meetingLink || "") ? interview.meetingLink : "";

  return (
    <section className="se-iva se-iva-detail" aria-label="Interview details">
      <nav className="se-iva-toolbar">
        <button type="button" className="se-iva-secondary" onClick={() => navigate(buildRecruitmentUrl("interviews"))}>← Interviews</button>
        <button type="button" className="se-iva-refresh" aria-label="Refresh interview" disabled={submitting} onClick={load}>↻</button>
      </nav>
      {error && <p className="se-iva-message" role="alert">{error}</p>}
      <section className="se-iva-profile">
        <div className="se-iva-person">
          <span className="se-iva-avatar">{candidateName.charAt(0).toUpperCase()}</span>
          <div><h1>{candidateName}</h1><p>{interview.positionTitle || "Position"}</p></div>
        </div>
        <span className="se-iva-badge" data-status={status}>{statusLabel(status)}</span>
        <div className="se-iva-contact">
          {phone && <a href={`tel:${phone}`} className="se-iva-call">☎ Call</a>}
          {candidateId && <button type="button" className="se-iva-secondary" onClick={() => navigate(buildCandidateDetailUrl(candidateId))}>Candidate profile ›</button>}
        </div>
      </section>
      <section className="se-iva-schedule">
        <div className="se-iva-schedule-date"><span>Interview date & time</span>
          <strong>{formatRecruitmentDate(interview.scheduledAt)}</strong>
          <b>{formatRecruitmentTime(interview.scheduledAt)}</b>
          <small>{interview.timezone || DEFAULT_TIMEZONE}</small>
        </div>
        <dl>
          <div><dt>Round</dt><dd>{interview.roundName || `Round ${interview.roundNumber || 1}`}</dd></div>
          <div><dt>Interviewer</dt><dd>{getInterviewerName(interview)}</dd></div>
          <div><dt>Mode</dt><dd>{String(interview.mode || "—").replaceAll("_", " ").toLowerCase()}</dd></div>
          <div><dt>Duration</dt><dd>{Number(interview.durationMinutes || 45)} minutes</dd></div>
        </dl>
        {(interview.officeLocationLabel || interview.officeLocation) && <p className="se-iva-location">⌖ {String(interview.officeLocationLabel || interview.officeLocation).replaceAll("_", " ")}</p>}
        {meetingLink && <a className="se-iva-primary" href={meetingLink} target="_blank" rel="noopener noreferrer">↗ Join meeting</a>}
      </section>
      {!closed && <section className="se-iva-action-card">
        <h2>Next step</h2>
        {status === "CHECKED_IN" ? (
          <><p>✓ Candidate has checked in.</p><InterviewEvaluationPanel interview={interview} onCompleted={load} /></>
        ) : (
          <>
            <button type="button" className="se-iva-primary" onClick={openCheckIn} disabled={submitting || !checkInEligibility.allowed}>✓ Mark candidate arrived</button>
            <p>{checkInEligibility.message}</p>
            {!evaluationEligibility.allowed && <small>Evaluation opens after check-in.</small>}
          </>
        )}
        <div className="se-iva-management-actions">
          <button type="button" className="se-iva-secondary" onClick={openReschedule} disabled={submitting}>↻ Reschedule</button>
          <button type="button" className="se-iva-danger" onClick={openCancel} disabled={submitting}>Cancel interview</button>
        </div>
      </section>}
      <details className="se-iva-disclosure">
        <summary>{`All rounds · ${journeyStats.total}`}</summary>
        {historyError && <p role="alert">{historyError}</p>}
        {historyLoading ? <p role="status">Loading rounds…</p> : interviewJourney.map((item, index) => (
          <details className="se-iva-round-record" key={getRecordId(item) || index}>
            <summary><strong>{item.roundName || `Round ${item.roundNumber || index + 1}`}</strong>
              <span>{getRoundResult(item)} · {formatRecruitmentDate(item.scheduledAt)}</span>
            </summary>
            <dl>
              <div><dt>Interviewer</dt><dd>{getInterviewerName(item)}</dd></div>
              <div><dt>Time</dt><dd>{formatRecruitmentTime(item.scheduledAt)}</dd></div>
              <div><dt>Rating</dt><dd>{getEvaluationRating(item) == null ? "—" : `${getEvaluationRating(item)} / 5`}</dd></div>
              <div><dt>Attendance</dt><dd>{item.checkedInAt ? formatRecruitmentDateTime(item.checkedInAt) : "Not recorded"}</dd></div>
            </dl>
            {getStrengths(item) && <p><b>Strengths: </b>{getStrengths(item)}</p>}
            {getConcerns(item) && <p><b>Concerns: </b>{getConcerns(item)}</p>}
            {getInterviewRemarks(item) && <p><b>Feedback: </b>{getInterviewRemarks(item)}</p>}
            {String(getRecordId(item)) !== String(interviewId) && <button type="button" className="se-iva-secondary"
              onClick={() => navigate(buildRecruitmentUrl("interview", { id: getRecordId(item), candidateId }))}>Open round ›</button>}
          </details>
        ))}
      </details>
      <details className="se-iva-disclosure"><summary>Invitations & delivery</summary>
        <dl>
          <div><dt>Candidate invitation</dt><dd>{candidateEmailMeta.label}</dd></div>
          <div><dt>Interviewer invitation</dt><dd>{interviewerEmailMeta.label}</dd></div>
          <div><dt>Welcome email</dt><dd>{checkInWelcomeEmailMeta.label}</dd></div>
          <div><dt>Interviewer email</dt><dd>{getInterviewerEmail(interview) || "—"}</dd></div>
        </dl>
        <p className="se-iva-reference">{interview.interviewNumber}</p>
      </details>
      {action && <InterviewSheet title={action === "CHECK_IN" ? "Confirm arrival" : action === "CANCEL" ? "Cancel interview?" : "Reschedule interview"}
        busy={submitting || actionPhase === "PROCESSING"} onClose={closeAction}>
        <div className="se-iva-sheet-body">
          <p className="se-iva-sheet-candidate"><strong>{candidateName}</strong><span>{interview.roundName || `Round ${interview.roundNumber || 1}`}</span></p>
          {actionPhase === "FORM" && <>
            {action === "CHECK_IN" && <p>Confirm the candidate has arrived for this interview.</p>}
            {action === "CANCEL" && <p>This cancels the round and notifies the participants.</p>}
            {action === "RESCHEDULE" && <label className="se-iva-field">New date & time
              <input type="datetime-local" value={newDate} min={getMinimumDateTime()} onChange={event => setNewDate(event.target.value)} />
            </label>}
            {action !== "CHECK_IN" && <label className="se-iva-field">{action === "CANCEL" ? "Cancellation reason *" : "Reason (optional)"}
              <textarea value={actionReason} onChange={event => setActionReason(event.target.value)} rows={3} />
            </label>}
          </>}
          {actionPhase !== "FORM" && <p role={actionPhase === "ERROR" ? "alert" : "status"}>{actionMessage}</p>}
        </div>
        <footer>
          {actionPhase === "FORM" && <>
            <button type="button" className="se-iva-secondary" onClick={closeAction}>Go back</button>
            <button type="button" className={action === "CANCEL" ? "se-iva-danger" : "se-iva-primary"}
              disabled={submitting || (action === "CHECK_IN" && !checkInEligibility.allowed)}
              onClick={action === "CHECK_IN" ? submitCheckIn : action === "CANCEL" ? submitCancel : submitReschedule}>
              {action === "CHECK_IN" ? "Confirm arrival" : action === "CANCEL" ? "Cancel interview" : "Save new time"}
            </button>
          </>}
          {actionPhase === "SUCCESS" && <button type="button" className="se-iva-primary" onClick={finishAction}>Done</button>}
          {actionPhase === "ERROR" && <>
            <button type="button" className="se-iva-secondary" onClick={closeAction}>Close</button>
            <button type="button" className="se-iva-primary" onClick={retryAction}>Try again</button>
          </>}
          {actionPhase === "PROCESSING" && <button type="button" className="se-iva-primary" disabled>Saving…</button>}
        </footer>
      </InterviewSheet>}
    </section>
  );
};

export default InterviewDetailApp;

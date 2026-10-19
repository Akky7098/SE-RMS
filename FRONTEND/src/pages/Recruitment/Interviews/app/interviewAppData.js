import { getRecordId, safeText } from "../../utils/recruitmentHelpers";

const CLOSED_STATUSES = ["COMPLETED", "CANCELLED", "NO_SHOW"];
const ACTIVE_STATUSES = ["SCHEDULED", "RESCHEDULED", "CHECKED_IN", "INTERVIEWED"];
const normalizeStatus = value => String(value || "").trim().toUpperCase();
const toTime = value => {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
};
const isToday = value => {
  if (!value) {
    return false;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
};
const getCandidateKey = interview => {
  const candidateId = getRecordId(interview?.candidate);
  if (candidateId) {
    return `candidate:${candidateId}`;
  }
  const rawCandidateId = interview?.candidateId;
  if (rawCandidateId) {
    return `candidate:${String(rawCandidateId)}`;
  }
  const email = String(interview?.candidate?.email || interview?.candidateEmail || "").trim().toLowerCase();
  if (email) {
    return `email:${email}`;
  }
  const name = String(interview?.candidate?.fullName || interview?.candidateName || "").trim().toLowerCase();
  const position = String(interview?.positionTitle || "").trim().toLowerCase();
  return `legacy:${name}:${position}`;
};
const sortCandidateInterviews = records => {
  return [...records].sort((a, b) => {
    const roundA = Number(a?.roundNumber || 0);
    const roundB = Number(b?.roundNumber || 0);
    if (roundA !== roundB) {
      return roundA - roundB;
    }
    return toTime(a?.scheduledAt) - toTime(b?.scheduledAt);
  });
};
const getCurrentInterview = records => {
  if (!records?.length) {
    return null;
  }
  const now = Date.now();
  const active = records.filter(interview => !CLOSED_STATUSES.includes(normalizeStatus(interview?.status))).sort((a, b) => {
    const aTime = toTime(a?.scheduledAt);
    const bTime = toTime(b?.scheduledAt);
    const aFuture = aTime >= now;
    const bFuture = bTime >= now;
    if (aFuture && !bFuture) {
      return -1;
    }
    if (!aFuture && bFuture) {
      return 1;
    }
    if (aFuture && bFuture) {
      return aTime - bTime;
    }
    return bTime - aTime;
  });
  if (active.length) {
    return active[0];
  }
  return [...records].sort((a, b) => toTime(b?.scheduledAt) - toTime(a?.scheduledAt))[0];
};
const getCandidateStatus = (records, currentInterview) => {
  if (!records?.length) {
    return "SCHEDULED";
  }
  const statuses = records.map(interview => normalizeStatus(interview?.status));
  if (statuses.some(status => status === "CHECKED_IN")) {
    return "CHECKED_IN";
  }
  if (statuses.some(status => status === "INTERVIEWED")) {
    return "INTERVIEWED";
  }
  if (statuses.some(status => status === "SCHEDULED" || status === "RESCHEDULED")) {
    return normalizeStatus(currentInterview?.status) || "SCHEDULED";
  }
  const completed = statuses.filter(status => status === "COMPLETED").length;
  if (completed > 0) {
    return "COMPLETED";
  }
  if (statuses.every(status => status === "CANCELLED" || status === "NO_SHOW")) {
    return statuses.includes("NO_SHOW") ? "NO_SHOW" : "CANCELLED";
  }
  return normalizeStatus(currentInterview?.status) || "SCHEDULED";
};
const groupInterviewsByCandidate = interviews => {
  const map = new Map();
  interviews.forEach(interview => {
    const key = getCandidateKey(interview);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(interview);
  });
  return Array.from(map.entries()).map(([key, rawRecords]) => {
    const records = sortCandidateInterviews(rawRecords);
    const first = records[0];
    const latest = [...records].sort((a, b) => toTime(b?.scheduledAt) - toTime(a?.scheduledAt))[0];
    const current = getCurrentInterview(records);
    const completedCount = records.filter(interview => normalizeStatus(interview?.status) === "COMPLETED").length;
    const cancelledCount = records.filter(interview => ["CANCELLED", "NO_SHOW"].includes(normalizeStatus(interview?.status))).length;
    const activeCount = records.filter(interview => ACTIVE_STATUSES.includes(normalizeStatus(interview?.status))).length;
    const candidate = current?.candidate || latest?.candidate || first?.candidate || null;
    const candidateId = getRecordId(candidate) || current?.candidateId || latest?.candidateId || "";
    const candidateName = safeText(candidate?.fullName || current?.candidateName || latest?.candidateName || first?.candidateName, "Candidate");
    const positionTitle = safeText(current?.positionTitle || latest?.positionTitle || first?.positionTitle, "Position");
    const department = current?.department || latest?.department || first?.department || null;
    const overallStatus = getCandidateStatus(records, current);
    return {
      key,
      candidate,
      candidateId,
      candidateName,
      positionTitle,
      department,
      records,
      totalRounds: records.length,
      completedCount,
      cancelledCount,
      activeCount,
      current,
      latest,
      overallStatus
    };
  });
};

export { groupInterviewsByCandidate, CLOSED_STATUSES, ACTIVE_STATUSES, normalizeStatus, toTime, isToday };

export const statusLabel = value => ({
  CHECKED_IN: "Checked in", NO_SHOW: "Did not attend", INTERVIEWED: "Awaiting evaluation",
}[value] || String(value || "Scheduled").toLowerCase().replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase()));

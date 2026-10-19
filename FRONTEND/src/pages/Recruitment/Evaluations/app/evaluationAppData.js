import { getEvaluations } from "../../../../services/evaluationService";

const normalizeId = value => {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  return String(value?._id || value?.id || value || "");
};
const getCandidateId = record => normalizeId(record?.candidate?._id || record?.candidate);
const getCandidateName = record => record?.candidate?.fullName || "Candidate";
const getCandidateNumber = record => record?.candidate?.candidateNumber || "—";
const getCandidateInitial = record => getCandidateName(record).trim().charAt(0).toUpperCase() || "C";
const getPosition = record => record?.candidate?.positionTitle || record?.interview?.positionTitle || record?.manpowerRequirement?.positionTitle || "—";
const getEvaluatorName = record => record?.evaluatedBy?.displayName || record?.interviewer?.displayName || "—";
const getRoundName = record => record?.interview?.roundName || record?.roundName || "Interview";
const formatDate = value => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
};
const recommendationLabel = value => {
  const map = {
    STRONG_HIRE: "Strong Hire",
    HIRE: "Hire",
    HOLD: "Hold",
    REJECT: "Reject"
  };
  return map[value] || value || "—";
};
const decisionLabel = value => {
  const map = {
    SELECTED: "Selected",
    HOLD: "Hold",
    REJECTED: "Rejected"
  };
  return map[value] || value || "—";
};
const getEvaluationTime = record => {
  const value = record?.evaluatedAt || record?.updatedAt || record?.createdAt;
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return 0;
  }
  return date.getTime();
};
const groupEvaluationsByCandidate = records => {
  const map = new Map();
  for (const record of records) {
    const candidateId = getCandidateId(record);
    const key = candidateId || `evaluation:${normalizeId(record?._id)}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(record);
  }
  return Array.from(map.entries()).map(([key, evaluations]) => {
    const sorted = [...evaluations].sort((first, second) => getEvaluationTime(second) - getEvaluationTime(first));
    const latest = sorted[0];
    const decision = latest?.finalDecision || "";
    const averageRating = sorted.length ? sorted.reduce((total, item) => total + Number(item?.overallRating || 0), 0) / sorted.length : 0;
    return {
      key,
      candidateId: getCandidateId(latest),
      candidate: latest?.candidate || {},
      latest,
      evaluations: sorted,
      evaluationCount: sorted.length,
      decision,
      averageRating
    };
  });
};

export { normalizeId, getCandidateId, getCandidateName, getCandidateNumber, getCandidateInitial, getPosition, getEvaluatorName, getRoundName, formatDate, recommendationLabel, decisionLabel, groupEvaluationsByCandidate };

// The API caps each response at 100. Complete all pages before grouping rounds.
export async function loadEvaluationRecords(search = "", isCurrent = () => true) {
  const params = { decision: "ALL", search, page: 1, limit: 100 };
  const first = await getEvaluations(params);
  const records = Array.isArray(first?.records) ? [...first.records] : [];
  const pages = Math.max(1, Number(first?.pagination?.pages) || 1);
  let nextPage = 2;
  await Promise.all(Array.from({ length: Math.min(4, pages - 1) }, async () => {
    while (nextPage <= pages && isCurrent()) {
      const page = nextPage++;
      const result = await getEvaluations({ ...params, page });
      if (Array.isArray(result?.records)) records.push(...result.records);
    }
  }));
  const unique = new Map();
  records.forEach((record, index) => unique.set(normalizeId(record) || `legacy-${index}`, record));
  return [...unique.values()].sort((first, second) => getEvaluationTime(second) - getEvaluationTime(first));
}

export const ratingLabel = value => {
  const score = Number(value);
  return value == null || value === "" || !Number.isFinite(score) ? "—" : score.toFixed(1);
};

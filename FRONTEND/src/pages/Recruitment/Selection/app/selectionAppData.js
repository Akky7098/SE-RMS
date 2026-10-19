import { getSelections } from "../../../../services/selectionService";

const STAGE_FILTERS = {
  ALL: [],
  LOI: ["LOI_PENDING", "LOI_DRAFT", "LOI_SENT", "LOI_ACCEPTED", "LOI_DECLINED"],
  DOCUMENTS: ["PRE_JOINING_DOCUMENTS", "DOCUMENTS_SUBMITTED", "DOCUMENT_VERIFICATION", "DOCUMENT_QUERY", "DOCUMENTS_VERIFIED"],
  OFFER: ["READY_FOR_OFFER", "OFFER_DRAFT", "OFFER_SENT", "OFFER_ACCEPTED", "OFFER_DECLINED"],
  JOINING: ["JOINING_PENDING", "JOINING_RESCHEDULED", "NO_SHOW", "JOINING_CONFIRMED", "JOINING_DECLINED", "COMPLETED"]
};
const normalize = value => String(value || "").trim().toUpperCase();
const candidateName = item => item?.candidate?.fullName || item?.candidateName || "Candidate";
const candidateInitial = item => candidateName(item).trim().charAt(0).toUpperCase() || "C";
const niceValue = value => String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, character => character.toUpperCase());
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
const toTime = value => {
  if (!value) {
    return 0;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};
const getCandidateKey = item => {
  const candidateId = item?.candidate?._id || item?.candidate?.id || item?.candidateId;
  if (candidateId) {
    return `candidate:${String(candidateId)}`;
  }
  const candidateNumber = item?.candidate?.candidateNumber || item?.candidateNumber;
  if (candidateNumber) {
    return `number:${String(candidateNumber).trim().toLowerCase()}`;
  }
  const email = item?.candidate?.email || item?.candidateEmail;
  if (email) {
    return `email:${String(email).trim().toLowerCase()}`;
  }
  return `legacy:${candidateName(item).trim().toLowerCase()}:${String(item?.positionTitle || "").trim().toLowerCase()}`;
};
const getRecordTime = item => Math.max(toTime(item?.updatedAt), toTime(item?.selectedAt), toTime(item?.createdAt));
const chooseCurrentSelection = (current, candidate) => {
  if (!current) {
    return candidate;
  }
  if (!candidate) {
    return current;
  }
  const currentTime = getRecordTime(current);
  const candidateTime = getRecordTime(candidate);
  if (candidateTime > currentTime) {
    return candidate;
  }
  if (candidateTime < currentTime) {
    return current;
  }
  return String(candidate?._id || "") > String(current?._id || "") ? candidate : current;
};
const deduplicateSelections = records => {
  const map = new Map();
  (Array.isArray(records) ? records : []).forEach(item => {
    const key = getCandidateKey(item);
    const existing = map.get(key);
    map.set(key, chooseCurrentSelection(existing, item));
  });
  return Array.from(map.values()).sort((a, b) => getRecordTime(b) - getRecordTime(a));
};
const stageClass = status => {
  const value = normalize(status);
  if (["LOI_PENDING", "LOI_DRAFT", "LOI_SENT", "LOI_ACCEPTED", "LOI_DECLINED"].includes(value)) {
    return "loi";
  }
  if (["PRE_JOINING_DOCUMENTS", "DOCUMENTS_SUBMITTED", "DOCUMENT_VERIFICATION", "DOCUMENT_QUERY", "DOCUMENTS_VERIFIED"].includes(value)) {
    return "documents";
  }
  if (["READY_FOR_OFFER", "OFFER_DRAFT", "OFFER_SENT", "OFFER_ACCEPTED", "OFFER_DECLINED"].includes(value)) {
    return "offer";
  }
  if (["JOINING_PENDING", "JOINING_RESCHEDULED", "NO_SHOW", "JOINING_CONFIRMED", "JOINING_DECLINED", "COMPLETED"].includes(value)) {
    return "joining";
  }
  return "default";
};
const buildUniqueSummary = records => {
  const result = {
    total: records.length,
    loi: 0,
    documents: 0,
    offer: 0,
    joining: 0,
    actionDue: 0
  };
  records.forEach(item => {
    const status = normalize(item?.status);
    if (STAGE_FILTERS.LOI.includes(status)) {
      result.loi += 1;
    }
    if (STAGE_FILTERS.DOCUMENTS.includes(status)) {
      result.documents += 1;
    }
    if (STAGE_FILTERS.OFFER.includes(status)) {
      result.offer += 1;
    }
    if (STAGE_FILTERS.JOINING.includes(status)) {
      result.joining += 1;
    }
    const workflow = item?.workflow || {};
    if (workflow?.actionDue === true || item?.actionDue === true) {
      result.actionDue += 1;
    }
  });
  return result;
};

export { STAGE_FILTERS, normalize, candidateName, candidateInitial, niceValue, formatDate, deduplicateSelections, stageClass, buildUniqueSummary };

export async function loadSelectionRecords(isCurrent = () => true) {
  const params = { search: "", page: 1, limit: 100 };
  const first = await getSelections(params);
  const records = Array.isArray(first?.records) ? [...first.records] : [];
  const pages = Math.max(1, Number(first?.pagination?.pages) || 1);
  let nextPage = 2;
  await Promise.all(Array.from({ length: Math.min(4, pages - 1) }, async () => {
    while (nextPage <= pages && isCurrent()) {
      const result = await getSelections({ ...params, page: nextPage++ });
      if (Array.isArray(result?.records)) records.push(...result.records);
    }
  }));
  return deduplicateSelections(records);
}

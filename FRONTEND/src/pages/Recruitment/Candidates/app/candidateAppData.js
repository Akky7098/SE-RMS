import { getHrHiringQueue, getMyHiring } from "../../../../services/manpowerService";
import { getRequirementCandidates } from "../../../../services/recruitmentService";
import { recordId } from "../../Manpower/app/manpowerAppHelpers";

export const candidateGroup = (status) => {
  const value = String(status || "")
    .trim()
    .toUpperCase();

  if (
    [
      "SELECTED",
      "LOI_PENDING",
      "LOI_SENT",
      "LOI_ACCEPTED",
      "OFFER_PENDING",
      "OFFER_SENT",
      "OFFER_ACCEPTED",
      "JOINING_CONFIRMED",
      "DOCUMENT_PENDING",
      "DOCUMENT_VERIFICATION",
      "READY_FOR_ONBOARDING",
      "JOINED",
    ].includes(value)
  ) {
    return "SELECTED";
  }

  if (
    [
      "NOT_INTERESTED",
      "REJECTED",
      "REJECTED_SCREENING",
      "REJECTED_INTERVIEW",
      "LOI_DECLINED",
      "OFFER_DECLINED",
      "CLOSED",
    ].includes(value)
  ) {
    return "REJECTED";
  }

  if (
    [
      "HOLD",
      "ON_HOLD",
      "ON HOLD",
      "PAUSED",
    ].includes(value)
  ) {
    return "HOLD";
  }

  if (
    [
      "INTERVIEW_PENDING",
      "INTERVIEW_SCHEDULED",
      "INTERVIEWED",
    ].includes(value)
  ) {
    return "INTERVIEW";
  }

  return "ACTIVE";
};


export const canAddForRequirement = (item) => (
  ["APPROVED", "HIRING_IN_PROGRESS"].includes(String(item.status || "").toUpperCase()) &&
  Boolean(recordId(item.assignedHr))
);

// One source may return 403 for a non-manager; the other still provides their own roles.
// Bound per-role requests so large accounts do not issue hundreds at once.
export async function loadCandidateAppData() {
  const sources = await Promise.allSettled([getHrHiringQueue(), getMyHiring()]);
  if (sources.every((result) => result.status === "rejected")) {
    throw new Error("Recruitment data could not load. Please retry or check your access.");
  }
  const requirementMap = new Map();
  sources.forEach((result) => {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      result.value.forEach((item) => {
        if (recordId(item)) requirementMap.set(recordId(item), item);
      });
    }
  });
  const requirements = [...requirementMap.values()];
  const results = new Array(requirements.length);
  let cursor = 0;
  let failed = 0;
  const worker = async () => {
    while (cursor < requirements.length) {
      const index = cursor++;
      const requirement = requirements[index];
      try {
        const candidates = await getRequirementCandidates(recordId(requirement));
        results[index] = (Array.isArray(candidates) ? candidates : []).map((candidate) => ({
          ...candidate, _requirement: requirement,
        }));
      } catch {
        failed += 1;
        results[index] = [];
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, requirements.length) }, worker));
  if (requirements.length && failed === requirements.length) {
    throw new Error("Candidates could not load for your hiring roles. Please retry.");
  }
  const map = new Map();
  results.flat().forEach((candidate) => {
    if (recordId(candidate)) map.set(recordId(candidate), candidate);
  });
  const candidates = [...map.values()].sort((a, b) => (
    new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
  ));
  return { requirements, candidates, partial: failed > 0 };
}

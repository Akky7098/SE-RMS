import React from "react";

const LABELS = {
  COMPLETED: "Completed",
  COMPLETE: "Completed",
  DONE: "Completed",

  IN_PROGRESS: "In Progress",
  PROCESSING: "In Progress",

  AVAILABLE: "Ready",
  READY: "Ready",

  WAITING: "Waiting",
  LOCKED: "Locked",

  PENDING: "Pending",
  NOT_STARTED: "Not Started",

  FAILED: "Action Required",
  ERROR: "Action Required",
};

const normalizeStatus = (status) =>
  String(status || "PENDING")
    .trim()
    .toUpperCase();

function OnboardingStatusBadge({
  status,
  label,
}) {
  const normalized =
    normalizeStatus(status);

  return (
    <span
      className={`onboarding-status onboarding-status--${normalized.toLowerCase()}`}
    >
      <span className="onboarding-status-dot" />

      {label ||
        LABELS[normalized] ||
        normalized.replaceAll("_", " ")}
    </span>
  );
}

export default OnboardingStatusBadge;
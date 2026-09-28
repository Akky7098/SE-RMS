import React from "react";

import RecruitmentStatusBadge from "../components/RecruitmentStatusBadge";

import {
  formatRecruitmentDate,
  getPriorityMeta,
  safeText,
} from "../utils/recruitmentHelpers";

/* =========================================================
   HIRING WORKSPACE HEADER
========================================================= */

const HiringWorkspaceHeader = ({
  requirement,

  candidateCount = 0,
  followUpCount = 0,
  interviewCount = 0,

  onBack,
  onAddCandidate,

  canAddCandidate = false,
  addCandidateReason = "",
}) => {
  /* =====================================================
     PRIORITY
  ===================================================== */

  const priority =
    getPriorityMeta(
      requirement?.priority
    );

  /* =====================================================
     OWNER
  ===================================================== */

  const ownerName =
    safeText(
      requirement
        ?.assignedHr
        ?.displayName,
      "Not assigned"
    );

  const ownerEmail =
    safeText(
      requirement
        ?.assignedHr
        ?.email,
      "HR team"
    );

  /* =====================================================
     STATUS
  ===================================================== */

  const status =
    String(
      requirement?.status ||
        ""
    )
      .trim()
      .toUpperCase();

  const hiringActive =
    status ===
    "HIRING_IN_PROGRESS";

  /* =====================================================
     OPENINGS
  ===================================================== */

  const openings =
    Number(
      requirement
        ?.numberOfOpenings ||
        0
    );

  /* =====================================================
     ADD CANDIDATE STATE
  ===================================================== */

  const candidateActionTitle =
    canAddCandidate
      ? "Add candidate"
      : addCandidateReason ||
        (
          hiringActive
            ? "You do not have permission to add candidates."
            : "Hiring must be started before candidates can be added."
        );

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <section className="se-hw-header se-hw-header-v2">
      <div className="se-hw-hero se-hw-hero-v2">
        {/* =================================================
            LEFT SIDE
        ================================================== */}

        <div className="se-hw-hero-main">
          {/* ===============================================
              TOP META ROW
          ================================================ */}

          <div className="se-hw-hero-topline">
            <button
              type="button"
              className="se-hw-back-btn se-hw-back-btn-v2"
              onClick={onBack}
            >
              <span aria-hidden="true">
                ←
              </span>

              <span>
                Back
              </span>
            </button>

            <span className="se-hw-hero-divider" />

            <span className="se-hw-request-number">
              {safeText(
                requirement
                  ?.requestNumber,
                "MPR"
              )}
            </span>

            <RecruitmentStatusBadge
              status={
                requirement
                  ?.status
              }
            />

            <span
              className={[
                "se-hw-priority",
                priority
                  ?.className ||
                  "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {priority?.label ||
                safeText(
                  requirement
                    ?.priority,
                  "Normal"
                )}
            </span>
          </div>

          {/* ===============================================
              ROLE
          ================================================ */}

          <div className="se-hw-role-block">
            <h1>
              {safeText(
                requirement
                  ?.positionTitle,
                "Hiring Requirement"
              )}
            </h1>

            <div className="se-hw-role-meta">
              <span>
                {safeText(
                  requirement
                    ?.department
                    ?.name,
                  "Department"
                )}
              </span>

              <i>•</i>

              <span>
                {openings}{" "}
                opening
                {openings === 1
                  ? ""
                  : "s"}
              </span>

              <i>•</i>

              <span>
                Required{" "}
                {formatRecruitmentDate(
                  requirement
                    ?.requiredByDate
                )}
              </span>
            </div>
          </div>

          {/* ===============================================
              OWNER
          ================================================ */}

          <div className="se-hw-owner se-hw-owner-v2">
            <span className="se-hw-owner-avatar">
              {ownerName ===
              "Not assigned"
                ? "?"
                : ownerName
                    .charAt(0)
                    .toUpperCase()}
            </span>

            <div className="se-hw-owner-info">
              <span>
                HIRING OWNER
              </span>

              <div className="se-hw-owner-line">
                <strong>
                  {ownerName}
                </strong>

                <small>
                  {ownerEmail}
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            RIGHT SIDE
        ================================================== */}

        <div className="se-hw-hero-side">
          {/* ===============================================
              ADD CANDIDATE
          ================================================ */}

          <div className="se-hw-primary-action-wrap">
            <button
              type="button"
              className={[
                "se-hw-add-candidate",
                "se-hw-add-candidate-v2",

                !canAddCandidate
                  ? "is-disabled"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                if (
                  canAddCandidate
                ) {
                  onAddCandidate?.();
                }
              }}
              disabled={
                !canAddCandidate
              }
              title={
                candidateActionTitle
              }
            >
              <span
                className="se-hw-add-icon"
                aria-hidden="true"
              >
                +
              </span>

              <span>
                Add Candidate
              </span>
            </button>

            {!canAddCandidate ? (
              <small className="se-hw-add-disabled-reason">
                {
                  candidateActionTitle
                }
              </small>
            ) : null}
          </div>

          {/* ===============================================
              QUICK STATS
          ================================================ */}

          <div className="se-hw-hero-stats se-hw-hero-stats-v2">
            <div className="se-hw-quick-stat">
              <span className="candidate">
                C
              </span>

              <div>
                <strong>
                  {candidateCount}
                </strong>

                <small>
                  Candidates
                </small>
              </div>
            </div>

            <div className="se-hw-quick-stat">
              <span className="followup">
                ↻
              </span>

              <div>
                <strong>
                  {followUpCount}
                </strong>

                <small>
                  Follow-ups
                </small>
              </div>
            </div>

            <div className="se-hw-quick-stat">
              <span className="interview">
                I
              </span>

              <div>
                <strong>
                  {interviewCount}
                </strong>

                <small>
                  Interviews
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HiringWorkspaceHeader;
import React from "react";

import RecruitmentStatusBadge from "../components/RecruitmentStatusBadge";

import {
  formatRecruitmentDate,
  getPriorityMeta,
  safeText,
} from "../utils/recruitmentHelpers";

/* =========================================================
   COMPONENT
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
     ADD CANDIDATE TOOLTIP
  ===================================================== */

  const candidateActionTitle =
    canAddCandidate
      ? "Add a candidate to this hiring requirement"
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
    <section className="se-hw-header">
      {/* =================================================
          TOP ACTION BAR
      ================================================== */}

      <div className="se-hw-header-top">
        <button
          type="button"
          className="se-hw-back-btn"
          onClick={
            onBack
          }
        >
          <span
            aria-hidden="true"
          >
            ←
          </span>

          <span>
            Back
          </span>
        </button>

        <div className="se-hw-header-actions">
          {!canAddCandidate ? (
            <div className="se-hw-candidate-action-hint">
              <span>
                i
              </span>

              <div>
                <strong>
                  Candidate intake locked
                </strong>

                <small>
                  {
                    candidateActionTitle
                  }
                </small>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            className={[
              "se-hw-add-candidate",

              !canAddCandidate
                ? "is-disabled"
                : "",
            ]
              .filter(
                Boolean
              )
              .join(
                " "
              )}
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
              aria-hidden="true"
            >
              +
            </span>

            Add Candidate
          </button>
        </div>
      </div>

      {/* =================================================
          HERO
      ================================================== */}

      <div className="se-hw-hero">
        {/* =================================================
            ROLE
        ================================================== */}

        <div className="se-hw-hero-main">
          <div className="se-hw-hero-label">
            <span>
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
              className={`se-hw-priority ${
                priority
                  ?.className ||
                ""
              }`}
            >
              {priority?.label ||
                safeText(
                  requirement
                    ?.priority,
                  "Normal"
                )}
            </span>
          </div>

          <h1>
            {safeText(
              requirement
                ?.positionTitle,
              "Hiring Requirement"
            )}
          </h1>

          <p className="se-hw-role-meta">
            <span>
              {safeText(
                requirement
                  ?.department
                  ?.name,
                "Department"
              )}
            </span>

            <i>
              •
            </i>

            <span>
              {
                openings
              }{" "}
              opening
              {openings ===
              1
                ? ""
                : "s"}
            </span>

            <i>
              •
            </i>

            <span>
              Required{" "}
              {formatRecruitmentDate(
                requirement
                  ?.requiredByDate
              )}
            </span>
          </p>

          {/* ===============================================
              HIRING OWNER
          ================================================ */}

          <div className="se-hw-owner">
            <span className="se-hw-owner-avatar">
              {ownerName ===
              "Not assigned"
                ? "?"
                : ownerName
                    .charAt(
                      0
                    )
                    .toUpperCase()}
            </span>

            <div>
              <span>
                HIRING OWNER
              </span>

              <strong>
                {
                  ownerName
                }
              </strong>

              <small>
                {
                  ownerEmail
                }
              </small>
            </div>
          </div>

          {/* ===============================================
              WORKFLOW STATE
          ================================================ */}

          <div
            className={[
              "se-hw-workflow-state",

              hiringActive
                ? "is-active"
                : "is-waiting",
            ].join(
              " "
            )}
          >
            <span>
              {hiringActive
                ? "✓"
                : "!"}
            </span>

            <div>
              <strong>
                {hiringActive
                  ? "Recruitment is active"
                  : "Recruitment has not started"}
              </strong>

              <small>
                {hiringActive
                  ? "Candidate sourcing, screening and interview workflow is available."
                  : "The HR manager must start hiring before candidate intake begins."}
              </small>
            </div>
          </div>
        </div>

        {/* =================================================
            STATS
        ================================================== */}

        <div className="se-hw-hero-stats">
          <div>
            <span className="candidate">
              C
            </span>

            <strong>
              {
                candidateCount
              }
            </strong>

            <small>
              Candidates
            </small>
          </div>

          <div>
            <span className="followup">
              ↻
            </span>

            <strong>
              {
                followUpCount
              }
            </strong>

            <small>
              Follow-ups
            </small>
          </div>

          <div>
            <span className="interview">
              I
            </span>

            <strong>
              {
                interviewCount
              }
            </strong>

            <small>
              Interviews
            </small>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HiringWorkspaceHeader;
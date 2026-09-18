import React from "react";

import {
  useNavigate,
} from "react-router-dom";

import RecruitmentStatusBadge from "../components/RecruitmentStatusBadge";

import {
  buildRecruitmentUrl,
  formatRecruitmentDate,
  getPriorityMeta,
  getRecordId,
  safeText,
} from "../utils/recruitmentHelpers";

/* =========================================================
   HELPERS
========================================================= */

const getDepartmentName = (
  requirement
) =>
  safeText(
    requirement
      ?.department
      ?.name ||
      requirement
        ?.departmentName,
    "Department"
  );

const getOwnerName = (
  requirement
) =>
  safeText(
    requirement
      ?.assignedHr
      ?.displayName ||
      requirement
        ?.assignedHr
        ?.name,
    "Not assigned"
  );

const getOwnerInitial = (
  requirement
) => {
  const name =
    getOwnerName(
      requirement
    );

  if (
    name ===
    "Not assigned"
  ) {
    return "?";
  }

  return name
    .charAt(0)
    .toUpperCase();
};

/* =========================================================
   COMPONENT
========================================================= */

const HiringCard = ({
  requirement,

  onAssign,

  onStartHiring,

  starting = false,

  allowManage = true,

  sourcePage =
    "my-hiring",
}) => {
  const navigate =
    useNavigate();

  const requirementId =
    getRecordId(
      requirement
    );

  const priority =
    getPriorityMeta(
      requirement?.priority
    );

  const status =
    String(
      requirement?.status ||
        ""
    ).toUpperCase();

  const hasOwner =
    Boolean(
      requirement
        ?.assignedHr
        ?._id ||
        requirement
          ?.assignedHr
    );

  const isApproved =
    status ===
    "APPROVED";

  const isHiring =
    status ===
    "HIRING_IN_PROGRESS";

  const ownerName =
    getOwnerName(
      requirement
    );

  const openWorkspace =
    () => {
      if (
        !requirementId
      ) {
        return;
      }

      navigate(
        buildRecruitmentUrl(
          "hiring-workspace",
          {
            id:
              requirementId,

            from:
              sourcePage,
          }
        )
      );
    };

  return (
    <article
      className={[
        "se-hiring-card",

        isHiring
          ? "is-active"
          : "",

        !hasOwner
          ? "needs-owner"
          : "",
      ]
        .filter(
          Boolean
        )
        .join(
          " "
        )}
    >
      {/* =================================================
          HEADER
      ================================================== */}

      <div className="se-hiring-card-top">
        <div className="se-hiring-card-id">
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
        </div>

        <span
          className={`se-hiring-priority ${
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

      {/* =================================================
          POSITION
      ================================================== */}

      <button
        type="button"
        className="se-hiring-card-title"
        onClick={
          openWorkspace
        }
      >
        {safeText(
          requirement
            ?.positionTitle,
          "Untitled position"
        )}
      </button>

      <div className="se-hiring-card-meta">
        <span>
          <strong>
            {getDepartmentName(
              requirement
            )}
          </strong>
        </span>

        <span>
          {Number(
            requirement
              ?.numberOfOpenings ||
              0
          )}{" "}
          opening
          {Number(
            requirement
              ?.numberOfOpenings ||
              0
          ) === 1
            ? ""
            : "s"}
        </span>

        <span>
          Required{" "}
          {formatRecruitmentDate(
            requirement
              ?.requiredByDate
          )}
        </span>
      </div>

      {/* =================================================
          WORKFLOW STATE
      ================================================== */}

      <div
        className={[
          "se-hiring-workflow-strip",

          !hasOwner
            ? "warning"
            : isHiring
              ? "active"
              : "ready",
        ].join(
          " "
        )}
      >
        <span className="se-hiring-workflow-icon">
          {!hasOwner
            ? "1"
            : isHiring
              ? "✓"
              : "2"}
        </span>

        <div>
          <strong>
            {!hasOwner
              ? "Assign hiring owner"
              : isHiring
                ? "Hiring is active"
                : "Ready to start hiring"}
          </strong>

          <small>
            {!hasOwner
              ? "Select an HR employee who will own recruitment for this requirement."
              : isHiring
                ? `${ownerName} is managing this recruitment workflow.`
                : `${ownerName} is assigned. Start recruitment when ready.`}
          </small>
        </div>
      </div>

      {/* =================================================
          OWNER
      ================================================== */}

      <div className="se-hiring-owner-box">
        <div className="se-hiring-owner-copy">
          <span className="se-hiring-label">
            HIRING OWNER
          </span>

          {hasOwner ? (
            <div className="se-hiring-owner-person">
              <span className="se-hiring-avatar">
                {getOwnerInitial(
                  requirement
                )}
              </span>

              <div>
                <strong>
                  {
                    ownerName
                  }
                </strong>

                <small>
                  {safeText(
                    requirement
                      ?.assignedHr
                      ?.email,
                    "HR team"
                  )}
                </small>
              </div>
            </div>
          ) : (
            <div className="se-hiring-owner-empty">
              <span>
                !
              </span>

              <div>
                <strong>
                  Not assigned
                </strong>

                <small>
                  Owner required before
                  hiring can start.
                </small>
              </div>
            </div>
          )}
        </div>

        {allowManage ? (
          <button
            type="button"
            className="se-hiring-owner-action"
            onClick={() =>
              onAssign?.(
                requirement
              )
            }
            disabled={
              starting
            }
          >
            {hasOwner
              ? "Reassign Owner"
              : "Assign HR Owner"}
          </button>
        ) : null}
      </div>

      {/* =================================================
          SKILLS
      ================================================== */}

      {Array.isArray(
        requirement
          ?.requiredSkills
      ) &&
      requirement
        .requiredSkills
        .length >
        0 ? (
        <div className="se-hiring-skills">
          {requirement
            .requiredSkills
            .slice(
              0,
              4
            )
            .map(
              (
                skill,
                index
              ) => (
                <span
                  key={`${skill}-${index}`}
                >
                  {
                    skill
                  }
                </span>
              )
            )}

          {requirement
            .requiredSkills
            .length >
          4 ? (
            <span className="more">
              +
              {requirement
                .requiredSkills
                .length -
                4}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* =================================================
          FOOTER
      ================================================== */}

      <footer className="se-hiring-card-footer">
        <button
          type="button"
          className="se-hiring-open-btn"
          onClick={
            openWorkspace
          }
        >
          View Requirement

          <span>
            →
          </span>
        </button>

        {allowManage &&
        isApproved ? (
          <button
            type="button"
            className="se-hiring-start-btn"
            disabled={
              !hasOwner ||
              starting
            }
            onClick={() =>
              onStartHiring?.(
                requirement
              )
            }
          >
            {starting
              ? "Starting Hiring..."
              : "Start Hiring"}
          </button>
        ) : null}

        {isHiring ? (
          <button
            type="button"
            className="se-hiring-active-btn"
            onClick={
              openWorkspace
            }
          >
            Open Workspace

            <span>
              →
            </span>
          </button>
        ) : null}
      </footer>
    </article>
  );
};

export default HiringCard;
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getHrHiringQueue,
  startManpowerHiring,
} from "../../../services/manpowerService";

import HiringCard from "./HiringCard";

import AssignHrModal from "./AssignHrModal";

import RecruitmentEmptyState from "../components/RecruitmentEmptyState";

import {
  getApiErrorMessage,
  getRecordId,
  safeText,
} from "../utils/recruitmentHelpers";

import "./Hiring.css";

/* =========================================================
   COMPONENT
========================================================= */

const HiringPage = () => {
  const [
    requirements,
    setRequirements,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    feedback,
    setFeedback,
  ] = useState(null);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState(
    "ALL"
  );

  const [
    assignTarget,
    setAssignTarget,
  ] = useState(null);

  const [
    startTarget,
    setStartTarget,
  ] = useState(null);

  const [
    startingId,
    setStartingId,
  ] = useState("");

  /* =========================================================
     LOAD QUEUE
  ========================================================= */

  const loadQueue =
    useCallback(
      async (
        silent = false
      ) => {
        try {
          if (
            silent
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setError(
            ""
          );

          const result =
            await getHrHiringQueue();

          setRequirements(
            Array.isArray(
              result
            )
              ? result
              : []
          );
        } catch (
          loadError
        ) {
          setError(
            getApiErrorMessage(
              loadError,
              "Hiring queue could not be loaded."
            )
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    loadQueue();
  }, [
    loadQueue,
  ]);

  /* =========================================================
     AUTO DISMISS FEEDBACK
  ========================================================= */

  useEffect(() => {
    if (
      !feedback
    ) {
      return undefined;
    }

    const timer =
      window.setTimeout(
        () => {
          setFeedback(
            null
          );
        },
        5000
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [
    feedback,
  ]);

  /* =========================================================
     METRICS
  ========================================================= */

  const metrics =
    useMemo(() => {
      let unassigned =
        0;

      let approved =
        0;

      let hiring =
        0;

      let urgent =
        0;

      requirements.forEach(
        (
          item
        ) => {
          const status =
            String(
              item?.status ||
                ""
            ).toUpperCase();

          const hasOwner =
            Boolean(
              item
                ?.assignedHr
                ?._id ||
              item
                ?.assignedHr
            );

          if (
            !hasOwner
          ) {
            unassigned +=
              1;
          }

          if (
            status ===
            "APPROVED"
          ) {
            approved +=
              1;
          }

          if (
            status ===
            "HIRING_IN_PROGRESS"
          ) {
            hiring +=
              1;
          }

          if (
            String(
              item?.priority ||
                ""
            ).toUpperCase() ===
            "URGENT"
          ) {
            urgent +=
              1;
          }
        }
      );

      return {
        total:
          requirements.length,

        unassigned,

        approved,

        hiring,

        urgent,
      };
    }, [
      requirements,
    ]);

  /* =========================================================
     FILTER
  ========================================================= */

  const visibleRequirements =
    useMemo(() => {
      const keyword =
        String(
          search || ""
        )
          .trim()
          .toLowerCase();

      return requirements.filter(
        (
          item
        ) => {
          const status =
            String(
              item?.status ||
                ""
            ).toUpperCase();

          const hasOwner =
            Boolean(
              item
                ?.assignedHr
                ?._id ||
              item
                ?.assignedHr
            );

          if (
            filter ===
              "UNASSIGNED" &&
            hasOwner
          ) {
            return false;
          }

          if (
            filter ===
              "APPROVED" &&
            status !==
              "APPROVED"
          ) {
            return false;
          }

          if (
            filter ===
              "HIRING" &&
            status !==
              "HIRING_IN_PROGRESS"
          ) {
            return false;
          }

          if (
            filter ===
              "URGENT" &&
            String(
              item?.priority ||
                ""
            ).toUpperCase() !==
              "URGENT"
          ) {
            return false;
          }

          if (
            !keyword
          ) {
            return true;
          }

          const searchable =
            [
              item
                ?.requestNumber,

              item
                ?.positionTitle,

              item
                ?.department
                ?.name,

              item
                ?.assignedHr
                ?.displayName,

              item
                ?.assignedHr
                ?.email,
            ]
              .filter(
                Boolean
              )
              .join(
                " "
              )
              .toLowerCase();

          return searchable.includes(
            keyword
          );
        }
      );
    }, [
      requirements,
      search,
      filter,
    ]);

  /* =========================================================
     ASSIGN COMPLETE
  ========================================================= */

  const handleAssigned =
    async (
      updated
    ) => {
      setAssignTarget(
        null
      );

      if (
        updated
      ) {
        const updatedId =
          getRecordId(
            updated
          );

        setRequirements(
          (
            current
          ) =>
            current.map(
              (
                item
              ) =>
                getRecordId(
                  item
                ) ===
                updatedId
                  ? updated
                  : item
            )
        );

        setFeedback({
          type:
            "success",

          title:
            "Hiring owner assigned",

          message:
            `${safeText(
              updated
                ?.assignedHr
                ?.displayName,
              "HR employee"
            )} is now responsible for ${safeText(
              updated
                ?.positionTitle,
              "this requirement"
            )}.`,
        });
      }

      await loadQueue(
        true
      );
    };

  /* =========================================================
     OPEN START CONFIRMATION
  ========================================================= */

  const handleStartHiring =
    (
      requirement
    ) => {
      if (
        !requirement
      ) {
        return;
      }

      setError(
        ""
      );

      setFeedback(
        null
      );

      setStartTarget(
        requirement
      );
    };

  /* =========================================================
     CONFIRM START
  ========================================================= */

  const confirmStartHiring =
    async () => {
      const id =
        getRecordId(
          startTarget
        );

      if (
        !id ||
        startingId
      ) {
        return;
      }

      try {
        setStartingId(
          id
        );

        setError(
          ""
        );

        const updated =
          await startManpowerHiring(
            id
          );

        setStartTarget(
          null
        );

        setFeedback({
          type:
            "success",

          title:
            "Hiring started",

          message:
            `${safeText(
              updated
                ?.positionTitle ||
                startTarget
                  ?.positionTitle,
              "The requirement"
            )} is now in active recruitment.`,
        });

        await loadQueue(
          true
        );
      } catch (
        startError
      ) {
        setStartTarget(
          null
        );

        setFeedback({
          type:
            "error",

          title:
            "Unable to start hiring",

          message:
            getApiErrorMessage(
              startError,
              "Hiring could not be started."
            ),
        });
      } finally {
        setStartingId(
          ""
        );
      }
    };

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <section className="se-hiring-page">
      {/* =================================================
          HEADER
      ================================================== */}

      <header className="se-hiring-page-head">
        <div>
          <span className="se-hiring-eyebrow">
            HR CONTROL CENTER
          </span>

          <h1>
            Hiring Queue
          </h1>

          <p>
            Approved manpower requests
            arrive here automatically.
            Assign the right HR owner,
            start recruitment and monitor
            every active role from one
            workspace.
          </p>
        </div>

        <button
          type="button"
          className="se-hiring-refresh"
          disabled={
            refreshing
          }
          onClick={() =>
            loadQueue(
              true
            )
          }
        >
          <span>
            ↻
          </span>

          {refreshing
            ? "Refreshing..."
            : "Refresh Queue"}
        </button>
      </header>

      {/* =================================================
          WORKFLOW GUIDE
      ================================================== */}

      <div className="se-hiring-flow-guide">
        <div className="done">
          <span>
            ✓
          </span>

          <div>
            <strong>
              Approved
            </strong>

            <small>
              Management approval
            </small>
          </div>
        </div>

        <i>
          →
        </i>

        <div>
          <span>
            2
          </span>

          <div>
            <strong>
              Assign Owner
            </strong>

            <small>
              Select HR recruiter
            </small>
          </div>
        </div>

        <i>
          →
        </i>

        <div>
          <span>
            3
          </span>

          <div>
            <strong>
              Start Hiring
            </strong>

            <small>
              Activate recruitment
            </small>
          </div>
        </div>

        <i>
          →
        </i>

        <div>
          <span>
            4
          </span>

          <div>
            <strong>
              Execute
            </strong>

            <small>
              CVs, calls & interviews
            </small>
          </div>
        </div>
      </div>

      {/* =================================================
          FEEDBACK
      ================================================== */}

      {feedback ? (
        <div
          className={`se-hiring-feedback ${feedback.type}`}
          role={
            feedback.type ===
            "error"
              ? "alert"
              : "status"
          }
        >
          <span>
            {feedback.type ===
            "success"
              ? "✓"
              : "!"}
          </span>

          <div>
            <strong>
              {
                feedback.title
              }
            </strong>

            <p>
              {
                feedback.message
              }
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setFeedback(
                null
              )
            }
          >
            ×
          </button>
        </div>
      ) : null}

      {/* =================================================
          METRICS
      ================================================== */}

      <div className="se-hiring-metrics">
        {[
          {
            key:
              "ALL",

            icon:
              "H",

            label:
              "Total Queue",

            value:
              metrics.total,

            tone:
              "total",
          },

          {
            key:
              "UNASSIGNED",

            icon:
              "!",

            label:
              "Needs Owner",

            value:
              metrics.unassigned,

            tone:
              "unassigned",
          },

          {
            key:
              "APPROVED",

            icon:
              "✓",

            label:
              "Ready to Start",

            value:
              metrics.approved,

            tone:
              "approved",
          },

          {
            key:
              "HIRING",

            icon:
              "↗",

            label:
              "Hiring Active",

            value:
              metrics.hiring,

            tone:
              "active",
          },

          {
            key:
              "URGENT",

            icon:
              "!",

            label:
              "Urgent",

            value:
              metrics.urgent,

            tone:
              "urgent",
          },
        ].map(
          (
            metric
          ) => (
            <button
              key={
                metric.key
              }
              type="button"
              className={
                filter ===
                metric.key
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter(
                  metric.key
                )
              }
            >
              <span
                className={`metric-icon ${metric.tone}`}
              >
                {
                  metric.icon
                }
              </span>

              <span>
                <small>
                  {
                    metric.label
                  }
                </small>

                <strong>
                  {
                    metric.value
                  }
                </strong>
              </span>
            </button>
          )
        )}
      </div>

      {/* =================================================
          TOOLBAR
      ================================================== */}

      <div className="se-hiring-toolbar">
        <div className="se-hiring-search">
          <span>
            ⌕
          </span>

          <input
            type="text"
            value={
              search
            }
            onChange={(
              event
            ) =>
              setSearch(
                event
                  .target
                  .value
              )
            }
            placeholder="Search MPR, position, department or HR owner..."
          />

          {search ? (
            <button
              type="button"
              onClick={() =>
                setSearch(
                  ""
                )
              }
            >
              ×
            </button>
          ) : null}
        </div>

        <div className="se-hiring-result-count">
          <strong>
            {
              visibleRequirements.length
            }
          </strong>

          <span>
            requirement
            {visibleRequirements.length ===
            1
              ? ""
              : "s"}
          </span>
        </div>
      </div>

      {/* =================================================
          ERROR
      ================================================== */}

      {error ? (
        <div className="se-hiring-page-error">
          <span>
            !
          </span>

          <div>
            <strong>
              Hiring queue unavailable
            </strong>

            <p>
              {
                error
              }
            </p>
          </div>
        </div>
      ) : null}

      {/* =================================================
          LOADING
      ================================================== */}

      {loading ? (
        <div className="se-hiring-loading-grid">
          {[
            1,
            2,
            3,
          ].map(
            (
              item
            ) => (
              <div
                key={
                  item
                }
                className="se-hiring-card-skeleton"
              />
            )
          )}
        </div>
      ) : null}

      {/* =================================================
          CARDS
      ================================================== */}

      {!loading &&
      visibleRequirements.length >
        0 ? (
        <div className="se-hiring-grid">
          {visibleRequirements.map(
            (
              requirement
            ) => (
              <HiringCard
                key={
                  getRecordId(
                    requirement
                  )
                }
                requirement={
                  requirement
                }
                sourcePage="hiring"
                onAssign={
                  setAssignTarget
                }
                onStartHiring={
                  handleStartHiring
                }
                starting={
                  startingId ===
                  getRecordId(
                    requirement
                  )
                }
              />
            )
          )}
        </div>
      ) : null}

      {!loading &&
      visibleRequirements.length ===
        0 ? (
        <div className="se-hiring-empty-wrap">
          <RecruitmentEmptyState
            icon="H"
            title="Hiring queue is clear"
            description={
              filter ===
              "ALL"
                ? "New approved manpower requirements will automatically appear here."
                : "No requirements match the selected filter."
            }
          />
        </div>
      ) : null}

      {/* =================================================
          ASSIGN OWNER
      ================================================== */}

      <AssignHrModal
        open={
          Boolean(
            assignTarget
          )
        }
        requirement={
          assignTarget
        }
        onClose={() =>
          setAssignTarget(
            null
          )
        }
        onAssigned={
          handleAssigned
        }
      />

      {/* =================================================
          START HIRING CONFIRMATION
      ================================================== */}

      {startTarget ? (
        <div
          className="se-hiring-confirm-overlay"
          onMouseDown={() => {
            if (
              !startingId
            ) {
              setStartTarget(
                null
              );
            }
          }}
        >
          <section
            className="se-hiring-confirm-modal"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="se-hiring-confirm-icon">
              ↗
            </div>

            <span className="se-hiring-confirm-eyebrow">
              START RECRUITMENT
            </span>

            <h2>
              Start hiring for this role?
            </h2>

            <p>
              This will activate the
              recruitment workflow and
              make the role operational
              for its assigned HR owner.
            </p>

            <div className="se-hiring-confirm-role">
              <div>
                <span>
                  POSITION
                </span>

                <strong>
                  {safeText(
                    startTarget
                      ?.positionTitle,
                    "Position"
                  )}
                </strong>
              </div>

              <div>
                <span>
                  HIRING OWNER
                </span>

                <strong>
                  {safeText(
                    startTarget
                      ?.assignedHr
                      ?.displayName,
                    "Not assigned"
                  )}
                </strong>
              </div>

              <div>
                <span>
                  DEPARTMENT
                </span>

                <strong>
                  {safeText(
                    startTarget
                      ?.department
                      ?.name,
                    "Department"
                  )}
                </strong>
              </div>
            </div>

            <div className="se-hiring-confirm-info">
              <span>
                i
              </span>

              <p>
                After starting, the HR
                owner can manage CVs,
                candidate calls,
                screening, follow-ups
                and interviews.
              </p>
            </div>

            <footer>
              <button
                type="button"
                className="secondary"
                disabled={
                  Boolean(
                    startingId
                  )
                }
                onClick={() =>
                  setStartTarget(
                    null
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary"
                disabled={
                  Boolean(
                    startingId
                  )
                }
                onClick={
                  confirmStartHiring
                }
              >
                {startingId ? (
                  <>
                    <span className="se-hiring-mini-spinner" />

                    Starting...
                  </>
                ) : (
                  <>
                    Start Hiring

                    <span>
                      →
                    </span>
                  </>
                )}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
};

export default HiringPage;
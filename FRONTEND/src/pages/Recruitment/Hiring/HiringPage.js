import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  getHrHiringQueue,
  startManpowerHiring,
} from "../../../services/manpowerService";

import AssignHrModal from "./AssignHrModal";

import RecruitmentEmptyState from "../components/RecruitmentEmptyState";

import recruitmentArtwork from "../hr-screening-realistic.webp";

import {
  buildRecruitmentUrl,
  formatRecruitmentDate,
  getApiErrorMessage,
  getRecordId,
  safeText,
} from "../utils/recruitmentHelpers";

import "./Hiring.css";

/* =========================================================
   CONSTANTS
========================================================= */

const PAGE_SIZE =
  50;

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
    "-"
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

const getOwnerEmail = (
  requirement
) =>
  safeText(
    requirement
      ?.assignedHr
      ?.email,
    ""
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
    return "!";
  }

  return name
    .charAt(0)
    .toUpperCase();
};

const hasHiringOwner = (
  requirement
) =>
  Boolean(
    requirement
      ?.assignedHr
      ?._id ||
    requirement
      ?.assignedHr
  );

const normalizeStatus = (
  status
) =>
  String(
    status ||
      ""
  )
    .trim()
    .toUpperCase();

const normalizePriority = (
  priority
) =>
  String(
    priority ||
      "NORMAL"
  )
    .trim()
    .toUpperCase();

const getStatusMeta = (
  requirement
) => {
  const status =
    normalizeStatus(
      requirement
        ?.status
    );

  const hasOwner =
    hasHiringOwner(
      requirement
    );

  if (
    status ===
    "HIRING_IN_PROGRESS"
  ) {
    return {
      label:
        "Hiring",
      subLabel:
        "In Progress",
      className:
        "hiring",
    };
  }

  if (
    status ===
    "APPROVED" &&
    !hasOwner
  ) {
    return {
      label:
        "Owner",
      subLabel:
        "Required",
      className:
        "owner-required",
    };
  }

  if (
    status ===
    "APPROVED"
  ) {
    return {
      label:
        "Ready",
      subLabel:
        "To Start",
      className:
        "ready",
    };
  }

  if (
    status ===
    "FILLED"
  ) {
    return {
      label:
        "Filled",
      subLabel:
        "",
      className:
        "filled",
    };
  }

  if (
    status ===
    "REJECTED"
  ) {
    return {
      label:
        "Rejected",
      subLabel:
        "",
      className:
        "rejected",
    };
  }

  return {
    label:
      safeText(
        status
          .replace(
            /_/g,
            " "
          ),
        "Unknown"
      ),
    subLabel:
      "",
    className:
      "default",
  };
};

const getPriorityMeta = (
  priority
) => {
  const normalized =
    normalizePriority(
      priority
    );

  if (
    normalized ===
    "URGENT"
  ) {
    return {
      label:
        "Urgent",
      className:
        "urgent",
    };
  }

  if (
    normalized ===
    "HIGH"
  ) {
    return {
      label:
        "High",
      className:
        "high",
    };
  }

  if (
    normalized ===
    "LOW"
  ) {
    return {
      label:
        "Low",
      className:
        "low",
    };
  }

  return {
    label:
      "Normal",
    className:
      "normal",
  };
};

const getRowClassName = (
  requirement
) => {
  const status =
    normalizeStatus(
      requirement
        ?.status
    );

  const hasOwner =
    hasHiringOwner(
      requirement
    );

  if (
    status ===
    "HIRING_IN_PROGRESS"
  ) {
    return "row-hiring";
  }

  if (
    status ===
    "APPROVED" &&
    hasOwner
  ) {
    return "row-ready";
  }

  if (
    status ===
    "APPROVED" &&
    !hasOwner
  ) {
    return "row-owner-required";
  }

  if (
    status ===
    "FILLED"
  ) {
    return "row-filled";
  }

  if (
    status ===
    "REJECTED"
  ) {
    return "row-rejected";
  }

  return "";
};

const getPositionInitial = (
  requirement
) =>
  safeText(
    requirement
      ?.positionTitle,
    "M"
  )
    .charAt(0)
    .toUpperCase();

/* =========================================================
   COMPONENT
========================================================= */

/* =========================================================
   RECRUITMENT QUEUE HEADER ANIMATION
========================================================= */

const RecruitmentQueueAnimation = () => {
  const candidates = [
    { type: "woman", hair: "long" },
    { type: "man", hair: "short" },
    { type: "woman", hair: "bun" },
    { type: "man", hair: "short" },
    { type: "woman", hair: "long" },
    { type: "man", hair: "short" },
    { type: "woman", hair: "bun" },
    { type: "man", hair: "short" },
    { type: "woman", hair: "long" },
    { type: "man", hair: "short" },
  ];

  return (
    <div className="se-recruit-queue-scene" aria-hidden="true">
      {/* FLOOR */}
      <div className="se-recruit-floor" />

      {/* CANDIDATE QUEUE */}
      <div className="se-recruit-candidate-line">
        {candidates.map((candidate, index) => (
          <div
            key={index}
            className={`se-recruit-candidate se-recruit-candidate--${
              index + 1
            } ${candidate.type}`}
          >
            <div className="se-recruit-candidate-shadow" />

            <div className="se-recruit-person">
              <div
                className={`se-recruit-person-hair ${candidate.hair}`}
              />

              <div className="se-recruit-person-head">
                <span className="se-recruit-person-face" />
              </div>

              <div className="se-recruit-person-neck" />

              <div className="se-recruit-person-body">
                <span className="se-recruit-person-arm" />

                {/* CV */}
                <span className="se-recruit-cv">
                  <i />
                  <i />
                  <i />
                </span>
              </div>

              <div className="se-recruit-person-legs">
                <span />
                <span />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* HR DESK */}
      <div className="se-recruit-desk">
        <div className="se-recruit-desk-top" />

        <div className="se-recruit-desk-front">
          <span className="se-recruit-desk-line" />
        </div>

        <div className="se-recruit-desk-leg left" />
        <div className="se-recruit-desk-leg right" />

        <div className="se-recruit-paper">
          <span />
          <span />
          <span />
        </div>
      </div>

      {/* HR WOMAN */}
      <div className="se-recruit-hr">
        <div className="se-recruit-chair">
          <div className="se-recruit-chair-back" />
          <div className="se-recruit-chair-seat" />
          <div className="se-recruit-chair-base" />
        </div>

        <div className="se-recruit-hr-person">
          <div className="se-recruit-hr-hair" />

          <div className="se-recruit-hr-head">
            <span className="se-recruit-hr-face" />
            <span className="se-recruit-hr-nose" />
          </div>

          <div className="se-recruit-hr-neck" />

          <div className="se-recruit-hr-body" />

          <div className="se-recruit-hr-arm">
            <span className="se-recruit-hr-hand" />

            <span className="se-recruit-pen" />
          </div>
        </div>
      </div>

      {/* SMALL DECOR */}
      <div className="se-recruit-scene-dots">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
};

const HiringPage = () => {
  const navigate =
    useNavigate();

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

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

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
     FEEDBACK AUTO DISMISS
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
            normalizeStatus(
              item?.status
            );

          const hasOwner =
            hasHiringOwner(
              item
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
            normalizePriority(
              item?.priority
            ) ===
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
     FILTERED REQUIREMENTS
  ========================================================= */

  const visibleRequirements =
    useMemo(() => {
      const keyword =
        String(
          search ||
            ""
        )
          .trim()
          .toLowerCase();

      return requirements.filter(
        (
          item
        ) => {
          const status =
            normalizeStatus(
              item?.status
            );

          const hasOwner =
            hasHiringOwner(
              item
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
            normalizePriority(
              item?.priority
            ) !==
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
                ?.departmentName,

              item
                ?.assignedHr
                ?.displayName,

              item
                ?.assignedHr
                ?.name,

              item
                ?.assignedHr
                ?.email,

              item
                ?.priority,

              item
                ?.status,
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
     PAGINATION
  ========================================================= */

  const totalItems =
    visibleRequirements.length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalItems /
          PAGE_SIZE
      )
    );

  useEffect(() => {
    setCurrentPage(
      1
    );
  }, [
    search,
    filter,
  ]);

  useEffect(() => {
    if (
      currentPage >
      totalPages
    ) {
      setCurrentPage(
        totalPages
      );
    }
  }, [
    currentPage,
    totalPages,
  ]);

  const paginatedRequirements =
    useMemo(() => {
      const start =
        (
          currentPage -
          1
        ) *
        PAGE_SIZE;

      return visibleRequirements.slice(
        start,
        start +
          PAGE_SIZE
      );
    }, [
      visibleRequirements,
      currentPage,
    ]);

  const firstVisible =
    totalItems ===
    0
      ? 0
      : (
          currentPage -
          1
        ) *
          PAGE_SIZE +
        1;

  const lastVisible =
    totalItems ===
    0
      ? 0
      : Math.min(
          currentPage *
            PAGE_SIZE,
          totalItems
        );

  const paginationItems =
    useMemo(() => {
      if (
        totalPages <=
        5
      ) {
        return Array.from(
          {
            length:
              totalPages,
          },
          (
            _,
            index
          ) =>
            index +
            1
        );
      }

      if (
        currentPage <=
        3
      ) {
        return [
          1,
          2,
          3,
          "...",
          totalPages,
        ];
      }

      if (
        currentPage >=
        totalPages -
          2
      ) {
        return [
          1,
          "...",
          totalPages -
            2,
          totalPages -
            1,
          totalPages,
        ];
      }

      return [
        1,
        "...",
        currentPage,
        "...",
        totalPages,
      ];
    }, [
      currentPage,
      totalPages,
    ]);

  /* =========================================================
     FILTER CHANGE
  ========================================================= */

  const changeFilter =
    (
      value
    ) => {
      setFilter(
        value
      );

      setCurrentPage(
        1
      );
    };

  /* =========================================================
     SEARCH CHANGE
  ========================================================= */

  const handleSearch =
    (
      event
    ) => {
      setSearch(
        event
          .target
          .value
      );

      setCurrentPage(
        1
      );
    };

  /* =========================================================
     OPEN WORKSPACE
  ========================================================= */

  const openWorkspace =
    (
      requirement
    ) => {
      const id =
        getRecordId(
          requirement
        );

      if (
        !id
      ) {
        return;
      }

      navigate(
        buildRecruitmentUrl(
          "hiring-workspace",
          {
            id,

            from:
              "hiring",
          }
        )
      );
    };

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
            "HR owner assigned",

          message:
            `${safeText(
              updated
                ?.assignedHr
                ?.displayName,
              "HR employee"
            )} assigned to ${safeText(
              updated
                ?.positionTitle,
              "requirement"
            )}.`,
        });
      }

      await loadQueue(
        true
      );
    };

  /* =========================================================
     START HIRING
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
              "Requirement"
            )} moved to active hiring.`,
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
     TABLE ACTION
  ========================================================= */

  const renderAction =
    (
      requirement
    ) => {
      const id =
        getRecordId(
          requirement
        );

      const status =
        normalizeStatus(
          requirement
            ?.status
        );

      const hasOwner =
        hasHiringOwner(
          requirement
        );

      const starting =
        startingId ===
        id;

      if (
        status ===
          "APPROVED" &&
        !hasOwner
      ) {
        return (
          <button
            type="button"
            className="se-hiring-table-action assign"
            onClick={(
              event
            ) => {
              event.stopPropagation();

              setAssignTarget(
                requirement
              );
            }}
          >
            <span className="action-icon">
              +
            </span>

            <span>
              Assign HR
            </span>
          </button>
        );
      }

      if (
        status ===
          "APPROVED" &&
        hasOwner
      ) {
        return (
          <button
            type="button"
            className="se-hiring-table-action start"
            disabled={
              starting
            }
            onClick={(
              event
            ) => {
              event.stopPropagation();

              handleStartHiring(
                requirement
              );
            }}
          >
            {starting ? (
              <>
                <span className="se-hiring-mini-spinner" />

                <span>
                  Starting
                </span>
              </>
            ) : (
              <>
                <span className="action-icon">
                  ▶
                </span>

                <span>
                  Start Hiring
                </span>
              </>
            )}
          </button>
        );
      }

      if (
        status ===
        "HIRING_IN_PROGRESS"
      ) {
        return (
          <button
            type="button"
            className="se-hiring-table-action open"
            onClick={(
              event
            ) => {
              event.stopPropagation();

              openWorkspace(
                requirement
              );
            }}
          >
            <span>
              Open
            </span>

            <span className="action-arrow">
              →
            </span>
          </button>
        );
      }

      return (
        <button
          type="button"
          className="se-hiring-table-action view"
          onClick={(
            event
          ) => {
            event.stopPropagation();

            openWorkspace(
              requirement
            );
          }}
        >
          <span>
            View
          </span>

          <span className="action-arrow">
            →
          </span>
        </button>
      );
    };

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <section className="se-hiring-page se-hiring-page-table">
      {/* =====================================================
          HEADER
      ====================================================== */}

     <header className="se-hiring-page-head se-hiring-page-head-compact se-recruit-animated-header">
  <div className="se-recruit-header-glow se-recruit-header-glow--one" />
  <div className="se-recruit-header-glow se-recruit-header-glow--two" />

  <div className="se-recruit-header-grid" />

  <div className="se-recruit-header-copy">
    <span className="se-hiring-eyebrow">
      <i className="se-recruit-live-dot" />
      RECRUITMENT
    </span>

    <h1>
      Hiring Queue
    </h1>

    <span className="se-recruit-header-subtitle">
      Talent pipeline
    </span>
  </div>

 <div className="se-recruit-header-animation">
  <div
    className="se-real-recruitment-stage"
    aria-hidden="true"
  >
    <img
      src={recruitmentArtwork}
      alt=""
      className="se-real-recruitment-art"
      draggable="false"
    />

    <div className="se-real-recruitment-status">
      <span className="se-real-recruitment-status-dot" />
      HIRING IN PROGRESS
    </div>
  </div>
</div>

  <button
    type="button"
    className="se-hiring-refresh se-recruit-header-refresh"
    disabled={refreshing}
    onClick={() => loadQueue(true)}
  >
    <span
      className={
        refreshing
          ? "is-spinning"
          : ""
      }
    >
      ↻
    </span>

    {refreshing
      ? "Refreshing"
      : "Refresh"}
  </button>
</header>

      {/* =====================================================
          FEEDBACK
      ====================================================== */}

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

      {/* =====================================================
          METRICS
      ====================================================== */}

      <div className="se-hiring-metrics se-hiring-metrics-compact">
        {[
          {
            key:
              "ALL",

            icon:
              "H",

            label:
              "Total",

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
              "Ready",

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
              "Hiring",

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
              className={[
                filter ===
                metric.key
                  ? "active"
                  : "",

                `metric-${metric.tone}`,
              ]
                .filter(
                  Boolean
                )
                .join(
                  " "
                )}
              onClick={() =>
                changeFilter(
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

              <span className="metric-copy">
                <strong>
                  {
                    metric.value
                  }
                </strong>

                <small>
                  {
                    metric.label
                  }
                </small>
              </span>
            </button>
          )
        )}
      </div>

      {/* =====================================================
          TOOLBAR
      ====================================================== */}

      <div className="se-hiring-toolbar se-hiring-table-toolbar">
        <div className="se-hiring-search">
          <span>
            ⌕
          </span>

          <input
            type="text"
            value={
              search
            }
            onChange={
              handleSearch
            }
            placeholder="Search request, position, department or HR..."
          />

          {search ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setSearch(
                  ""
                );

                setCurrentPage(
                  1
                );
              }}
            >
              ×
            </button>
          ) : null}
        </div>

        <div className="se-hiring-filter-tabs">
          <button
            type="button"
            className={
              filter ===
              "ALL"
                ? "active"
                : ""
            }
            onClick={() =>
              changeFilter(
                "ALL"
              )
            }
          >
            All
          </button>

          <button
            type="button"
            className={
              filter ===
              "UNASSIGNED"
                ? "active"
                : ""
            }
            onClick={() =>
              changeFilter(
                "UNASSIGNED"
              )
            }
          >
            Needs Owner
          </button>

          <button
            type="button"
            className={
              filter ===
              "APPROVED"
                ? "active"
                : ""
            }
            onClick={() =>
              changeFilter(
                "APPROVED"
              )
            }
          >
            Ready
          </button>

          <button
            type="button"
            className={
              filter ===
              "HIRING"
                ? "active"
                : ""
            }
            onClick={() =>
              changeFilter(
                "HIRING"
              )
            }
          >
            Hiring
          </button>

          <button
            type="button"
            className={
              filter ===
              "URGENT"
                ? "active"
                : ""
            }
            onClick={() =>
              changeFilter(
                "URGENT"
              )
            }
          >
            Urgent
          </button>
        </div>

        <div className="se-hiring-result-count">
          <strong>
            {
              totalItems
            }
          </strong>

          <span>
            result
            {totalItems ===
            1
              ? ""
              : "s"}
          </span>
        </div>
      </div>

      {/* =====================================================
          ERROR
      ====================================================== */}

      {error ? (
        <div className="se-hiring-page-error">
          <span>
            !
          </span>

          <div>
            <strong>
              Unable to load hiring queue
            </strong>

            <p>
              {
                error
              }
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadQueue()
            }
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* =====================================================
          TABLE
      ====================================================== */}

      <div className="se-hiring-table-shell">
        <div className="se-hiring-table-scroll">
          <table className="se-hiring-table">
            <colgroup>
              <col className="col-request" />

              <col className="col-department" />

              <col className="col-openings" />

              <col className="col-priority" />

              <col className="col-required" />

              <col className="col-status" />

              <col className="col-owner" />

              <col className="col-action" />
            </colgroup>

            <thead>
              <tr>
                <th>
                  Request
                </th>

                <th>
                  Department
                </th>

                <th className="center">
                  Openings
                </th>

                <th>
                  Priority
                </th>

                <th>
                  Required By
                </th>

                <th>
                  Status
                </th>

                <th>
                  Hiring Owner
                </th>

                <th className="action-heading">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({
                  length:
                    6,
                }).map(
                  (
                    _,
                    index
                  ) => (
                    <tr
                      key={`loading-${index}`}
                      className="se-hiring-table-loading-row"
                    >
                      <td>
                        <div className="table-skeleton request" />
                      </td>

                      <td>
                        <div className="table-skeleton medium" />
                      </td>

                      <td>
                        <div className="table-skeleton small" />
                      </td>

                      <td>
                        <div className="table-skeleton medium" />
                      </td>

                      <td>
                        <div className="table-skeleton medium" />
                      </td>

                      <td>
                        <div className="table-skeleton status" />
                      </td>

                      <td>
                        <div className="table-skeleton owner" />
                      </td>

                      <td>
                        <div className="table-skeleton action" />
                      </td>
                    </tr>
                  )
                )
              ) : null}

              {!loading &&
              paginatedRequirements.map(
                (
                  requirement
                ) => {
                  const id =
                    getRecordId(
                      requirement
                    );

                  const status =
                    getStatusMeta(
                      requirement
                    );

                  const priority =
                    getPriorityMeta(
                      requirement
                        ?.priority
                    );

                  const hasOwner =
                    hasHiringOwner(
                      requirement
                    );

                  const ownerName =
                    getOwnerName(
                      requirement
                    );

                  const ownerEmail =
                    getOwnerEmail(
                      requirement
                    );

                  return (
                    <tr
                      key={
                        id
                      }
                      className={[
                        "se-hiring-table-row",

                        getRowClassName(
                          requirement
                        ),
                      ]
                        .filter(
                          Boolean
                        )
                        .join(
                          " "
                        )}
                      onDoubleClick={() =>
                        openWorkspace(
                          requirement
                        )
                      }
                    >
                      {/* ===================================
                          REQUEST
                      ==================================== */}

                      <td>
                        <div className="se-hiring-request-cell">
                          <span className="se-hiring-request-avatar">
                            {getPositionInitial(
                              requirement
                            )}
                          </span>

                          <div className="se-hiring-request-copy">
                            <strong>
                              {safeText(
                                requirement
                                  ?.positionTitle,
                                "Untitled position"
                              )}
                            </strong>

                            <span>
                              {safeText(
                                requirement
                                  ?.requestNumber,
                                "MPR"
                              )}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* ===================================
                          DEPARTMENT
                      ==================================== */}

                      <td>
                        <span className="se-hiring-department">
                          {getDepartmentName(
                            requirement
                          )}
                        </span>
                      </td>

                      {/* ===================================
                          OPENINGS
                      ==================================== */}

                      <td className="center">
                        <span className="se-hiring-opening-count">
                          {Number(
                            requirement
                              ?.numberOfOpenings ||
                              0
                          )}
                        </span>
                      </td>

                      {/* ===================================
                          PRIORITY
                      ==================================== */}

                      <td>
                        <span
                          className={`se-hiring-priority-badge ${priority.className}`}
                        >
                          <i />

                          {
                            priority.label
                          }
                        </span>
                      </td>

                      {/* ===================================
                          REQUIRED BY
                      ==================================== */}

                      <td>
                        <span className="se-hiring-required-date">
                          {formatRecruitmentDate(
                            requirement
                              ?.requiredByDate
                          )}
                        </span>
                      </td>

                      {/* ===================================
                          STATUS
                      ==================================== */}

                      <td>
                        <span
                          className={`se-hiring-status-badge ${status.className}`}
                        >
                          <i />

                          <span>
                            <strong>
                              {
                                status.label
                              }
                            </strong>

                            {status.subLabel ? (
                              <small>
                                {
                                  status.subLabel
                                }
                              </small>
                            ) : null}
                          </span>
                        </span>
                      </td>

                      {/* ===================================
                          OWNER
                      ==================================== */}

                      <td>
                        {hasOwner ? (
                          <div className="se-hiring-owner-table-cell">
                            <span className="se-hiring-owner-avatar">
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

                              {ownerEmail ? (
                                <small>
                                  {
                                    ownerEmail
                                  }
                                </small>
                              ) : (
                                <small>
                                  HR Owner
                                </small>
                              )}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="se-hiring-owner-missing"
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation();

                              setAssignTarget(
                                requirement
                              );
                            }}
                          >
                            <span>
                              !
                            </span>

                            <div>
                              <strong>
                                Not assigned
                              </strong>

                              <small>
                                Assign HR
                              </small>
                            </div>
                          </button>
                        )}
                      </td>

                      {/* ===================================
                          ACTION
                      ==================================== */}

                      <td className="se-hiring-action-cell">
                        {renderAction(
                          requirement
                        )}
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>

          {!loading &&
          totalItems ===
            0 ? (
            <div className="se-hiring-table-empty">
              <RecruitmentEmptyState
                icon="H"
                title={
                  filter ===
                  "ALL"
                    ? "No hiring requirements"
                    : "No matching requirements"
                }
                description={
                  filter ===
                  "ALL"
                    ? "Approved manpower requests will appear here."
                    : "Try another filter or search."
                }
              />
            </div>
          ) : null}
        </div>

        {/* =================================================
            PAGINATION
        ================================================== */}

        {!loading &&
        totalItems >
          0 ? (
          <footer className="se-hiring-pagination">
            <div className="se-hiring-pagination-summary">
              <strong>
                {firstVisible}
                –
                {lastVisible}
              </strong>

              <span>
                of
              </span>

              <strong>
                {
                  totalItems
                }
              </strong>
            </div>

            <div className="se-hiring-pagination-size">
              <strong>
                50
              </strong>

              <span>
                per page
              </span>
            </div>

            <nav
              className="se-hiring-pagination-controls"
              aria-label="Hiring queue pagination"
            >
              <button
                type="button"
                className="pagination-prev"
                disabled={
                  currentPage <=
                  1
                }
                onClick={() =>
                  setCurrentPage(
                    (
                      current
                    ) =>
                      Math.max(
                        1,
                        current -
                          1
                      )
                  )
                }
              >
                <span>
                  ‹
                </span>

                Prev
              </button>

              {paginationItems.map(
                (
                  page,
                  index
                ) =>
                  page ===
                  "..." ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="pagination-ellipsis"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={
                        page
                      }
                      type="button"
                      className={
                        currentPage ===
                        page
                          ? "pagination-number active"
                          : "pagination-number"
                      }
                      onClick={() =>
                        setCurrentPage(
                          page
                        )
                      }
                    >
                      {
                        page
                      }
                    </button>
                  )
              )}

              <button
                type="button"
                className="pagination-next"
                disabled={
                  currentPage >=
                  totalPages
                }
                onClick={() =>
                  setCurrentPage(
                    (
                      current
                    ) =>
                      Math.min(
                        totalPages,
                        current +
                          1
                      )
                  )
                }
              >
                Next

                <span>
                  ›
                </span>
              </button>

              <span className="pagination-total">
                Total:{" "}
                <strong>
                  {
                    totalItems
                  }
                </strong>
              </span>
            </nav>
          </footer>
        ) : null}
      </div>

      {/* =====================================================
          ASSIGN HR MODAL
      ====================================================== */}

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

      {/* =====================================================
          START HIRING CONFIRMATION
      ====================================================== */}

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
            <button
              type="button"
              className="se-hiring-confirm-close"
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
              aria-label="Close"
            >
              ×
            </button>

            <div className="se-hiring-confirm-icon">
              ▶
            </div>

            <span className="se-hiring-confirm-eyebrow">
              START HIRING
            </span>

            <h2>
              Start recruitment?
            </h2>

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
                  HR OWNER
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
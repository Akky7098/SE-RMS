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
  getMyHiring,
} from "../../../services/manpowerService";

import RecruitmentEmptyState from "../components/RecruitmentEmptyState";
import hrScreeningRealistic from "../hr-screening-realistic.webp";
import {
  buildRecruitmentUrl,
  formatRecruitmentDate,
  getApiErrorMessage,
  getPriorityMeta,
  getRecordId,
  safeText,
} from "../utils/recruitmentHelpers";

import "./Hiring.css";

/* =========================================================
   HELPERS
========================================================= */

const PAGE_SIZE = 50;

const getDepartmentName = (item) =>
  safeText(
    item?.department?.name ||
      item?.departmentName,
    "—"
  );

const getStatus = (item) =>
  String(
    item?.status || ""
  ).toUpperCase();

const getStatusMeta = (item) => {
  const status =
    getStatus(item);

  if (
    status ===
    "HIRING_IN_PROGRESS"
  ) {
    return {
      label: "Hiring",
      subLabel: "In Progress",
      className: "hiring",
    };
  }

  if (
    status ===
    "APPROVED"
  ) {
    return {
      label: "Ready",
      subLabel: "To Start",
      className: "ready",
    };
  }

  if (
    status ===
    "FILLED"
  ) {
    return {
      label: "Filled",
      subLabel: "",
      className: "filled",
    };
  }

  return {
    label: safeText(
      item?.status,
      "Active"
    )
      .replaceAll("_", " "),
    subLabel: "",
    className: "default",
  };
};

/* =========================================================
   COMPONENT
========================================================= */

/* =========================================================
   RECRUITMENT QUEUE HEADER ANIMATION
========================================================= */

const RecruitmentQueueAnimation = () => {
  return (
    <div
      className="se-real-recruitment-scene"
      aria-hidden="true"
    >
      <div className="se-real-recruitment-stage">
       <img
  src={hrScreeningRealistic}
  alt=""
  className="se-real-recruitment-art"
  draggable="false"
/>

        <div className="se-real-recruitment-status">
          <span className="se-real-recruitment-status-dot" />

          <span>
            SCREENING IN PROGRESS
          </span>
        </div>
      </div>
    </div>
  );
};


/* =========================================================
   COMPONENT
========================================================= */

const MyHiringPage = () => {

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
    search,
    setSearch,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState("ALL");

  const [
    page,
    setPage,
  ] = useState(1);

  /* =========================================================
     LOAD
  ========================================================= */

  const loadMyHiring =
    useCallback(
      async (
        silent = false
      ) => {
        try {
          if (silent) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          const result =
            await getMyHiring();

          setRequirements(
            Array.isArray(result)
              ? result
              : []
          );
        } catch (
          loadError
        ) {
          setError(
            getApiErrorMessage(
              loadError,
              "Assigned roles could not be loaded."
            )
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    loadMyHiring();
  }, [
    loadMyHiring,
  ]);

  /* =========================================================
     METRICS
  ========================================================= */

  const metrics =
    useMemo(() => {
      let ready = 0;
      let active = 0;
      let urgent = 0;

      requirements.forEach(
        (item) => {
          const status =
            getStatus(item);

          if (
            status ===
            "APPROVED"
          ) {
            ready += 1;
          }

          if (
            status ===
            "HIRING_IN_PROGRESS"
          ) {
            active += 1;
          }

          if (
            String(
              item?.priority ||
                ""
            ).toUpperCase() ===
            "URGENT"
          ) {
            urgent += 1;
          }
        }
      );

      return {
        total:
          requirements.length,
        ready,
        active,
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
        (item) => {
          const status =
            getStatus(item);

          const priority =
            String(
              item?.priority ||
                ""
            ).toUpperCase();

          if (
            filter ===
              "READY" &&
            status !==
              "APPROVED"
          ) {
            return false;
          }

          if (
            filter ===
              "ACTIVE" &&
            status !==
              "HIRING_IN_PROGRESS"
          ) {
            return false;
          }

          if (
            filter ===
              "URGENT" &&
            priority !==
              "URGENT"
          ) {
            return false;
          }

          if (!keyword) {
            return true;
          }

          return [
            item?.requestNumber,
            item?.positionTitle,
            item?.department?.name,
            item?.departmentName,

            ...(Array.isArray(
              item?.requiredSkills
            )
              ? item.requiredSkills
              : []),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(keyword);
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

  useEffect(() => {
    setPage(1);
  }, [
    search,
    filter,
  ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        visibleRequirements.length /
          PAGE_SIZE
      )
    );

  useEffect(() => {
    if (
      page >
      totalPages
    ) {
      setPage(
        totalPages
      );
    }
  }, [
    page,
    totalPages,
  ]);

  const pageStart =
    (page - 1) *
    PAGE_SIZE;

  const paginatedRequirements =
    visibleRequirements.slice(
      pageStart,
      pageStart +
        PAGE_SIZE
    );

  const firstVisible =
    visibleRequirements.length
      ? pageStart + 1
      : 0;

  const lastVisible =
    Math.min(
      pageStart +
        PAGE_SIZE,
      visibleRequirements.length
    );

  /* =========================================================
     NAVIGATION
  ========================================================= */

  const openWorkspace = (
    requirement
  ) => {
    const requirementId =
      getRecordId(
        requirement
      );

    if (!requirementId) {
      return;
    }

    navigate(
      buildRecruitmentUrl(
        "hiring-workspace",
        {
          id:
            requirementId,
          from:
            "my-hiring",
        }
      )
    );
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <section className="se-hiring-page se-my-hiring-page">

      {/* ================= HEADER ================= */}

            {/* ================= ANIMATED HEADER ================= */}

      <header className="se-my-hiring-hero se-recruit-animated-header">
        <div className="se-recruit-header-glow se-recruit-header-glow--one" />
        <div className="se-recruit-header-glow se-recruit-header-glow--two" />
        <div className="se-recruit-header-grid" />

        <div className="se-recruit-header-copy">
          <span className="se-my-hiring-eyebrow">
            <i className="se-recruit-live-dot" />
            MY HIRING
          </span>

          <h1>
            Assigned Roles
          </h1>

          <span className="se-recruit-header-subtitle">
            Your active recruitment workspace
          </span>
        </div>

        <div className="se-recruit-header-animation">
          <RecruitmentQueueAnimation />
        </div>

        <div className="se-my-hiring-hero-actions se-recruit-header-actions">
          <button
            type="button"
            className="se-my-hiring-candidates-btn"
            onClick={() =>
              navigate(
                buildRecruitmentUrl(
                  "candidates"
                )
              )
            }
          >
            Candidates
            <span>→</span>
          </button>

          <button
            type="button"
            className="se-my-hiring-refresh"
            disabled={refreshing}
            onClick={() =>
              loadMyHiring(true)
            }
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
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>
      </header>

      {/* ================= SUMMARY ================= */}

      <div className="se-my-hiring-summary">
        {[
          {
            key: "ALL",
            icon: "M",
            label:
              "Assigned Roles",
            value:
              metrics.total,
            tone: "total",
          },
          {
            key: "READY",
            icon: "✓",
            label:
              "Ready to Start",
            value:
              metrics.ready,
            tone: "ready",
          },
          {
            key: "ACTIVE",
            icon: "↗",
            label:
              "Hiring Active",
            value:
              metrics.active,
            tone: "active",
          },
          {
            key: "URGENT",
            icon: "!",
            label: "Urgent",
            value:
              metrics.urgent,
            tone: "urgent",
          },
        ].map(
          (metric) => (
            <button
              type="button"
              key={
                metric.key
              }
              className={[
                "se-my-hiring-summary-card",
                metric.tone,
                filter ===
                metric.key
                  ? "active"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() =>
                setFilter(
                  metric.key
                )
              }
            >
              <span
                className={`summary-icon ${metric.tone}`}
              >
                {metric.icon}
              </span>

              <div>
                <strong>
                  {metric.value}
                </strong>

                <span>
                  {metric.label}
                </span>
              </div>
            </button>
          )
        )}
      </div>

      {/* ================= TOOLBAR ================= */}

      <div className="se-my-hiring-toolbar">
        <div className="se-my-hiring-search">
          <span>
            ⌕
          </span>

          <input
            type="text"
            value={search}
            onChange={(
              event
            ) =>
              setSearch(
                event
                  .target
                  .value
              )
            }
            placeholder="Search role, MPR, department or skill..."
          />

          {search ? (
            <button
              type="button"
              onClick={() =>
                setSearch("")
              }
              aria-label="Clear search"
            >
              ×
            </button>
          ) : null}
        </div>

        <div className="se-my-hiring-filter-tabs">
          {[
            {
              key: "ALL",
              label: "All",
            },
            {
              key: "READY",
              label: "Ready",
            },
            {
              key: "ACTIVE",
              label: "Hiring",
            },
            {
              key: "URGENT",
              label: "Urgent",
            },
          ].map(
            (item) => (
              <button
                key={item.key}
                type="button"
                className={
                  filter ===
                  item.key
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFilter(
                    item.key
                  )
                }
              >
                {item.label}
              </button>
            )
          )}
        </div>

        <div className="se-my-hiring-result-count">
          <strong>
            {
              visibleRequirements.length
            }
          </strong>

          <span>
            roles
          </span>
        </div>
      </div>

      {/* ================= ERROR ================= */}

      {error ? (
        <div className="se-hiring-page-error">
          <span>!</span>

          <div>
            <strong>
              Unable to load roles
            </strong>

            <p>
              {error}
            </p>
          </div>
        </div>
      ) : null}

      {/* ================= TABLE ================= */}

      {!loading &&
      visibleRequirements.length >
        0 ? (
        <div className="se-my-hiring-table-shell">

          <div className="se-my-hiring-table-scroll">
            <table className="se-my-hiring-table">

              <colgroup>
                <col className="col-role" />
                <col className="col-department" />
                <col className="col-openings" />
                <col className="col-priority" />
                <col className="col-date" />
                <col className="col-status" />
                <col className="col-skills" />
                <col className="col-action" />
              </colgroup>

              <thead>
                <tr>
                  <th>ROLE</th>
                  <th>DEPARTMENT</th>
                  <th>OPENINGS</th>
                  <th>PRIORITY</th>
                  <th>REQUIRED BY</th>
                  <th>STATUS</th>
                  <th>SKILLS</th>
                  <th>ACTION</th>
                </tr>
              </thead>

              <tbody>
                {paginatedRequirements.map(
                  (
                    requirement
                  ) => {
                    const requirementId =
                      getRecordId(
                        requirement
                      );

                    const priority =
                      getPriorityMeta(
                        requirement
                          ?.priority
                      );

                    const status =
                      getStatusMeta(
                        requirement
                      );

                    const skills =
                      Array.isArray(
                        requirement
                          ?.requiredSkills
                      )
                        ? requirement
                            .requiredSkills
                        : [];

                    return (
                      <tr
  key={requirementId}
  className={`status-${status.className} se-my-hiring-clickable-row`}
  role="button"
  tabIndex={0}
  aria-label={`Open ${safeText(
    requirement?.positionTitle,
    "hiring role"
  )}`}
  onClick={() =>
    openWorkspace(requirement)
  }
  onKeyDown={(event) => {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      openWorkspace(requirement);
    }
  }}
>
                        <td>
                         <div className="se-my-hiring-role">

                         </div>
                            <span className="se-my-hiring-role-avatar">
                              {safeText(
                                requirement
                                  ?.positionTitle,
                                "R"
                              )
                                .charAt(
                                  0
                                )
                                .toUpperCase()}
                            </span>

                            <span className="se-my-hiring-role-copy">
                              <strong>
                                {safeText(
                                  requirement
                                    ?.positionTitle,
                                  "Untitled role"
                                )}
                              </strong>

                              <small>
                                {safeText(
                                  requirement
                                    ?.requestNumber,
                                  "MPR"
                                )}
                              </small>
                            </span>
                          
                        </td>

                        <td>
                          <span className="se-my-hiring-department">
                            {getDepartmentName(
                              requirement
                            )}
                          </span>
                        </td>

                        <td>
                          <span className="se-my-hiring-opening">
                            {Number(
                              requirement
                                ?.numberOfOpenings ||
                                0
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={[
                              "se-my-hiring-priority",
                              priority
                                ?.className ||
                                "",
                            ]
                              .filter(
                                Boolean
                              )
                              .join(" ")}
                          >
                            <i />

                            {priority
                              ?.label ||
                              safeText(
                                requirement
                                  ?.priority,
                                "Normal"
                              )}
                          </span>
                        </td>

                        <td>
                          <span className="se-my-hiring-date">
                            {formatRecruitmentDate(
                              requirement
                                ?.requiredByDate
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`se-my-hiring-status ${status.className}`}
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

                        <td>
                          {skills.length >
                          0 ? (
                            <div className="se-my-hiring-skills">
                              {skills
                                .slice(
                                  0,
                                  2
                                )
                                .map(
                                  (
                                    skill,
                                    index
                                  ) => (
                                    <span
                                      key={`${skill}-${index}`}
                                    >
                                      {skill}
                                    </span>
                                  )
                                )}

                              {skills.length >
                              2 ? (
                                <span className="more">
                                  +
                                  {skills.length -
                                    2}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="se-my-hiring-no-skills">
                              —
                            </span>
                          )}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="se-my-hiring-open"
                            onClick={() =>
                              openWorkspace(
                                requirement
                              )
                            }
                          >
                            Open
                            <span>
                              →
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>

          {/* =============== PAGINATION =============== */}

          <footer className="se-my-hiring-pagination">
            <div className="se-my-hiring-page-summary">
              <strong>
                {firstVisible}–{lastVisible}
              </strong>

              <span>
                of
              </span>

              <strong>
                {
                  visibleRequirements.length
                }
              </strong>

              <span className="divider" />

              <strong>
                {PAGE_SIZE}
              </strong>

              <span>
                per page
              </span>
            </div>

            <div className="se-my-hiring-page-controls">
              <button
                type="button"
                disabled={
                  page === 1
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.max(
                        1,
                        current -
                          1
                      )
                  )
                }
              >
                ‹ Prev
              </button>

              <span className="current-page">
                {page}
              </span>

              <button
                type="button"
                disabled={
                  page ===
                  totalPages
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.min(
                        totalPages,
                        current +
                          1
                      )
                  )
                }
              >
                Next ›
              </button>

              <span className="page-total">
                Total:
                <strong>
                  {
                    visibleRequirements.length
                  }
                </strong>
              </span>
            </div>
          </footer>
        </div>
      ) : null}

      {/* ================= LOADING ================= */}

      {loading ? (
        <div className="se-my-hiring-table-loading">
          <span className="se-hiring-spinner" />

          <strong>
            Loading assigned roles...
          </strong>
        </div>
      ) : null}

      {/* ================= EMPTY ================= */}

      {!loading &&
      visibleRequirements.length ===
        0 ? (
        <div className="se-hiring-empty-wrap">
          <RecruitmentEmptyState
            icon="M"
            title={
              requirements.length ===
              0
                ? "No roles assigned"
                : "No matching roles"
            }
            description={
              requirements.length ===
              0
                ? "Assigned hiring roles will appear here."
                : "Change the search or filter."
            }
          />
        </div>
      ) : null}
    </section>
  );
};

export default MyHiringPage;
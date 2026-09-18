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
  getInterviews,
} from "../../../services/interviewService";

import RecruitmentEmptyState from "../components/RecruitmentEmptyState";

import RecruitmentStatusBadge from "../components/RecruitmentStatusBadge";

import {
  buildRecruitmentUrl,
  formatRecruitmentDate,
  formatRecruitmentTime,
  getRecordId,
  safeText,
} from "../utils/recruitmentHelpers";

import "./Interviews.css";

/* =========================================================
   FILTERS
========================================================= */

// const FILTERS = [
//   "ALL",
//   "UPCOMING",
//   "TODAY",
//   "COMPLETED",
//   "CANCELLED",
// ];

/* =========================================================
   HELPERS
========================================================= */

const isToday = (
  value
) => {
  if (
    !value
  ) {
    return false;
  }

  const date =
    new Date(
      value
    );

  const now =
    new Date();

  return (
    date.getFullYear() ===
      now.getFullYear() &&
    date.getMonth() ===
      now.getMonth() &&
    date.getDate() ===
      now.getDate()
  );
};

const getInterviewTone = (
  status
) => {
  const value =
    String(
      status ||
        ""
    ).toUpperCase();

  if (
    value ===
    "COMPLETED"
  ) {
    return "success";
  }

  if (
    value ===
      "CANCELLED" ||
    value ===
      "NO_SHOW"
  ) {
    return "danger";
  }

  if (
    value ===
    "RESCHEDULED"
  ) {
    return "warning";
  }

  if (
    value ===
    "CHECKED_IN"
  ) {
    return "purple";
  }

  return "blue";
};

/* =========================================================
   COMPONENT
========================================================= */

const InterviewsPage =
  ({
    evaluationMode =
      false,
  }) => {
    const navigate =
      useNavigate();

    const [
      interviews,
      setInterviews,
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
      filter,
      setFilter,
    ] = useState(
      evaluationMode
        ? "COMPLETED"
        : "ALL"
    );

    const [
      search,
      setSearch,
    ] = useState("");

    /* =====================================================
       LOAD
    ===================================================== */

    const load =
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
              await getInterviews();

            setInterviews(
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
              loadError
                ?.response
                ?.data
                ?.message ||
                loadError
                  ?.message ||
                "Interviews could not be loaded."
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
      load();
    }, [
      load,
    ]);

    /* =====================================================
       METRICS
    ===================================================== */

    const metrics =
      useMemo(() => {
        let today =
          0;

        let upcoming =
          0;

        let completed =
          0;

        let evaluationPending =
          0;

        let cancelled =
          0;

        const now =
          Date.now();

        interviews.forEach(
          (
            interview
          ) => {
            const status =
              String(
                interview?.status ||
                  ""
              ).toUpperCase();

            const scheduled =
              new Date(
                interview?.scheduledAt ||
                  0
              ).getTime();

            if (
              isToday(
                interview?.scheduledAt
              )
            ) {
              today +=
                1;
            }

            if (
              scheduled >
                now &&
              ![
                "COMPLETED",
                "CANCELLED",
                "NO_SHOW",
              ].includes(
                status
              )
            ) {
              upcoming +=
                1;
            }

            if (
              status ===
              "COMPLETED"
            ) {
              completed +=
                1;
            }

            if (
              [
                "CHECKED_IN",
                "INTERVIEWED",
                "SCHEDULED",
                "RESCHEDULED",
              ].includes(
                status
              ) &&
              scheduled <=
                now
            ) {
              evaluationPending +=
                1;
            }

            if (
              [
                "CANCELLED",
                "NO_SHOW",
              ].includes(
                status
              )
            ) {
              cancelled +=
                1;
            }
          }
        );

        return {
          total:
            interviews.length,

          today,

          upcoming,

          completed,

          evaluationPending,

          cancelled,
        };
      }, [
        interviews,
      ]);

    /* =====================================================
       FILTER
    ===================================================== */

    const visible =
      useMemo(() => {
        const keyword =
          search
            .trim()
            .toLowerCase();

        const now =
          Date.now();

        return interviews
          .filter(
            (
              interview
            ) => {
              const status =
                String(
                  interview
                    ?.status ||
                    ""
                ).toUpperCase();

              const scheduled =
                new Date(
                  interview
                    ?.scheduledAt ||
                    0
                ).getTime();

              if (
                evaluationMode &&
                ![
                  "COMPLETED",
                  "CHECKED_IN",
                  "SCHEDULED",
                  "RESCHEDULED",
                ].includes(
                  status
                )
              ) {
                return false;
              }

              if (
                filter ===
                "TODAY"
              ) {
                if (
                  !isToday(
                    interview
                      ?.scheduledAt
                  )
                ) {
                  return false;
                }
              }

              if (
                filter ===
                "UPCOMING"
              ) {
                if (
                  scheduled <=
                    now ||
                  [
                    "COMPLETED",
                    "CANCELLED",
                    "NO_SHOW",
                  ].includes(
                    status
                  )
                ) {
                  return false;
                }
              }

              if (
                filter ===
                  "COMPLETED" &&
                status !==
                  "COMPLETED"
              ) {
                return false;
              }

              if (
                filter ===
                  "CANCELLED" &&
                ![
                  "CANCELLED",
                  "NO_SHOW",
                ].includes(
                  status
                )
              ) {
                return false;
              }

              if (
                !keyword
              ) {
                return true;
              }

              return [
                interview
                  ?.interviewNumber,

                interview
                  ?.candidate
                  ?.fullName,

                interview
                  ?.candidateName,

                interview
                  ?.positionTitle,

                interview
                  ?.roundName,

                interview
                  ?.interviewer
                  ?.displayName,

                interview
                  ?.department
                  ?.name,
              ]
                .filter(
                  Boolean
                )
                .join(
                  " "
                )
                .toLowerCase()
                .includes(
                  keyword
                );
            }
          )
          .sort(
            (
              a,
              b
            ) =>
              new Date(
                a?.scheduledAt ||
                  0
              ).getTime() -
              new Date(
                b?.scheduledAt ||
                  0
              ).getTime()
          );
      }, [
        interviews,
        filter,
        search,
        evaluationMode,
      ]);

    return (
      <section className="se-interviews-page">
        {/* =================================================
            HEADER
        ================================================== */}

        <header className="se-interviews-head">
          <div>
            <span>
              {evaluationMode
                ? "INTERVIEWS · EVALUATIONS"
                : "RECRUITMENT · INTERVIEWS"}
            </span>

            <h1>
              {evaluationMode
                ? "Evaluations"
                : "Interviews"}
            </h1>

            <p>
              {evaluationMode
                ? "Review completed and pending interview evaluations from one drill-down workspace."
                : "Schedule tracking, interviewer coordination and candidate interview progress."}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              load(
                true
              )
            }
            disabled={
              refreshing
            }
          >
            ↻{" "}
            {refreshing
              ? "Refreshing"
              : "Refresh"}
          </button>
        </header>

        {/* =================================================
            METRICS
        ================================================== */}

        <div className="se-interview-metrics">
          <button
            type="button"
            onClick={() =>
              setFilter(
                "ALL"
              )
            }
            className={
              filter ===
              "ALL"
                ? "active"
                : ""
            }
          >
            <span className="all">
              I
            </span>

            <div>
              <strong>
                {
                  metrics.total
                }
              </strong>

              <small>
                Total
              </small>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setFilter(
                "TODAY"
              )
            }
            className={
              filter ===
              "TODAY"
                ? "active"
                : ""
            }
          >
            <span className="today">
              T
            </span>

            <div>
              <strong>
                {
                  metrics.today
                }
              </strong>

              <small>
                Today
              </small>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setFilter(
                "UPCOMING"
              )
            }
            className={
              filter ===
              "UPCOMING"
                ? "active"
                : ""
            }
          >
            <span className="upcoming">
              →
            </span>

            <div>
              <strong>
                {
                  metrics.upcoming
                }
              </strong>

              <small>
                Upcoming
              </small>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setFilter(
                "COMPLETED"
              )
            }
            className={
              filter ===
              "COMPLETED"
                ? "active"
                : ""
            }
          >
            <span className="completed">
              ✓
            </span>

            <div>
              <strong>
                {
                  metrics.completed
                }
              </strong>

              <small>
                Completed
              </small>
            </div>
          </button>

          <button
            type="button"
            className="pending"
          >
            <span>
              E
            </span>

            <div>
              <strong>
                {
                  metrics.evaluationPending
                }
              </strong>

              <small>
                Action Due
              </small>
            </div>
          </button>
        </div>

        {/* =================================================
            TOOLBAR
        ================================================== */}

        <div className="se-interview-toolbar">
          <div>
            <span>
              ⌕
            </span>

            <input
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
              placeholder="Search candidate, interview, position or interviewer..."
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

          <span>
            <strong>
              {
                visible.length
              }
            </strong>{" "}
            visible
          </span>
        </div>

        {error ? (
          <div className="se-interview-error">
            <span>
              !
            </span>

            <p>
              {
                error
              }
            </p>
          </div>
        ) : null}

        {/* =================================================
            LIST
        ================================================== */}

        <article className="se-interview-list-panel">
          <header>
            <div>
              <span>
                INTERVIEW SCHEDULE
              </span>

              <strong>
                {evaluationMode
                  ? "Evaluation Queue"
                  : "Interview Pipeline"}
              </strong>
            </div>

            <p>
              Click any row for complete
              interview drill-down.
            </p>
          </header>

          {loading ? (
            <div className="se-interview-loading-list">
              <span />
              <span />
              <span />
              <span />
            </div>
          ) : visible.length >
            0 ? (
            <div className="se-interview-table-wrap">
              <table className="se-interview-table">
                <thead>
                  <tr>
                    <th>
                      Candidate
                    </th>

                    <th>
                      Position
                    </th>

                    <th>
                      Round
                    </th>

                    <th>
                      Schedule
                    </th>

                    <th>
                      Interviewer
                    </th>

                    <th>
                      Mode
                    </th>

                    <th>
                      Status
                    </th>

                    <th />
                  </tr>
                </thead>

                <tbody>
                  {visible.map(
                    (
                      interview
                    ) => {
                      const id =
                        getRecordId(
                          interview
                        );

                      return (
                        <tr
                          key={
                            id
                          }
                          onClick={() =>
                            navigate(
                              buildRecruitmentUrl(
                                "interview",
                                {
                                  id,
                                }
                              )
                            )
                          }
                        >
                          <td>
                            <div className="se-interview-person">
                              <span>
                                {safeText(
                                  interview
                                    ?.candidate
                                    ?.fullName ||
                                    interview
                                      ?.candidateName,
                                  "C"
                                )
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase()}
                              </span>

                              <div>
                                <strong>
                                  {safeText(
                                    interview
                                      ?.candidate
                                      ?.fullName ||
                                      interview
                                        ?.candidateName,
                                    "Candidate"
                                  )}
                                </strong>

                                <small>
                                  {safeText(
                                    interview
                                      ?.interviewNumber,
                                    "Interview"
                                  )}
                                </small>
                              </div>
                            </div>
                          </td>

                          <td>
                            <strong>
                              {safeText(
                                interview
                                  ?.positionTitle,
                                "Position"
                              )}
                            </strong>

                            <small>
                              {safeText(
                                interview
                                  ?.department
                                  ?.name,
                                ""
                              )}
                            </small>
                          </td>

                          <td>
                            <strong>
                              {safeText(
                                interview
                                  ?.roundName,
                                `Round ${
                                  interview
                                    ?.roundNumber ||
                                  1
                                }`
                              )}
                            </strong>
                          </td>

                          <td>
                            <strong>
                              {formatRecruitmentDate(
                                interview
                                  ?.scheduledAt
                              )}
                            </strong>

                            <small>
                              {formatRecruitmentTime(
                                interview
                                  ?.scheduledAt
                              )}
                            </small>
                          </td>

                          <td>
                            <strong>
                              {safeText(
                                interview
                                  ?.interviewer
                                  ?.displayName,
                                "Interviewer"
                              )}
                            </strong>
                          </td>

                          <td>
                            <span className="se-interview-mode-pill">
                              {safeText(
                                interview
                                  ?.mode,
                                "—"
                              ).replaceAll(
                                "_",
                                " "
                              )}
                            </span>
                          </td>

                          <td>
                            <RecruitmentStatusBadge
                              label={
                                safeText(
                                  interview
                                    ?.status,
                                  "Scheduled"
                                ).replaceAll(
                                  "_",
                                  " "
                                )
                              }
                              tone={
                                getInterviewTone(
                                  interview
                                    ?.status
                                )
                              }
                            />
                          </td>

                          <td>
                            <span className="se-interview-arrow">
                              →
                            </span>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <RecruitmentEmptyState
              icon="I"
              title="No interviews found"
              description="Scheduled interviews will appear here."
            />
          )}
        </article>
      </section>
    );
  };

export default InterviewsPage;
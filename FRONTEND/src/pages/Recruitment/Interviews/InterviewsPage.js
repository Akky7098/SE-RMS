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
import interviewHeroVideo from "../interview-hero.mp4";
import interviewHeroPoster from "../interview-hero-poster.webp";

/* =========================================================
   CONSTANTS
========================================================= */

const CLOSED_STATUSES = [
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

const ACTIVE_STATUSES = [
  "SCHEDULED",
  "RESCHEDULED",
  "CHECKED_IN",
  "INTERVIEWED",
];

const STATUS_PRIORITY = {
  CHECKED_IN: 1,
  INTERVIEWED: 2,
  SCHEDULED: 3,
  RESCHEDULED: 4,
  COMPLETED: 5,
  CANCELLED: 6,
  NO_SHOW: 7,
};

/* =========================================================
   BASIC HELPERS
========================================================= */

const normalizeStatus = (
  value
) =>
  String(
    value || ""
  )
    .trim()
    .toUpperCase();

const toTime = (
  value
) => {
  const time =
    new Date(
      value || 0
    ).getTime();

  return Number.isNaN(
    time
  )
    ? 0
    : time;
};

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

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return false;
  }

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
    normalizeStatus(
      status
    );

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
   CANDIDATE IDENTITY

   One candidate can have multiple interview records.

   We group by candidate ID first.

   Fallbacks are only used for old records where candidate
   population may be incomplete.
========================================================= */

const getCandidateKey = (
  interview
) => {
  const candidateId =
    getRecordId(
      interview?.candidate
    );

  if (
    candidateId
  ) {
    return `candidate:${candidateId}`;
  }

  const rawCandidateId =
    interview?.candidateId;

  if (
    rawCandidateId
  ) {
    return `candidate:${String(
      rawCandidateId
    )}`;
  }

  const email =
    String(
      interview?.candidate
        ?.email ||
      interview?.candidateEmail ||
      ""
    )
      .trim()
      .toLowerCase();

  if (
    email
  ) {
    return `email:${email}`;
  }

  const name =
    String(
      interview?.candidate
        ?.fullName ||
      interview?.candidateName ||
      ""
    )
      .trim()
      .toLowerCase();

  const position =
    String(
      interview?.positionTitle ||
      ""
    )
      .trim()
      .toLowerCase();

  return `legacy:${name}:${position}`;
};

/* =========================================================
   SORT INTERVIEWS FOR A CANDIDATE
========================================================= */

const sortCandidateInterviews = (
  records
) => {
  return [
    ...records,
  ].sort(
    (
      a,
      b
    ) => {
      const roundA =
        Number(
          a?.roundNumber ||
          0
        );

      const roundB =
        Number(
          b?.roundNumber ||
          0
        );

      if (
        roundA !==
        roundB
      ) {
        return (
          roundA -
          roundB
        );
      }

      return (
        toTime(
          a?.scheduledAt
        ) -
        toTime(
          b?.scheduledAt
        )
      );
    }
  );
};

/* =========================================================
   CURRENT / NEXT INTERVIEW

   Priority:
   1. Active upcoming/current interview
   2. Latest interview record
========================================================= */

const getCurrentInterview = (
  records
) => {
  if (
    !records?.length
  ) {
    return null;
  }

  const now =
    Date.now();

  const active =
    records
      .filter(
        (
          interview
        ) =>
          !CLOSED_STATUSES.includes(
            normalizeStatus(
              interview?.status
            )
          )
      )
      .sort(
        (
          a,
          b
        ) => {
          const aTime =
            toTime(
              a?.scheduledAt
            );

          const bTime =
            toTime(
              b?.scheduledAt
            );

          const aFuture =
            aTime >=
            now;

          const bFuture =
            bTime >=
            now;

          if (
            aFuture &&
            !bFuture
          ) {
            return -1;
          }

          if (
            !aFuture &&
            bFuture
          ) {
            return 1;
          }

          if (
            aFuture &&
            bFuture
          ) {
            return (
              aTime -
              bTime
            );
          }

          return (
            bTime -
            aTime
          );
        }
      );

  if (
    active.length
  ) {
    return active[0];
  }

  return [
    ...records,
  ].sort(
    (
      a,
      b
    ) =>
      toTime(
        b?.scheduledAt
      ) -
      toTime(
        a?.scheduledAt
      )
  )[0];
};

/* =========================================================
   CANDIDATE OVERALL STATUS
========================================================= */

const getCandidateStatus = (
  records,
  currentInterview
) => {
  if (
    !records?.length
  ) {
    return "SCHEDULED";
  }

  const statuses =
    records.map(
      (
        interview
      ) =>
        normalizeStatus(
          interview?.status
        )
    );

  if (
    statuses.some(
      (
        status
      ) =>
        status ===
        "CHECKED_IN"
    )
  ) {
    return "CHECKED_IN";
  }

  if (
    statuses.some(
      (
        status
      ) =>
        status ===
        "INTERVIEWED"
    )
  ) {
    return "INTERVIEWED";
  }

  if (
    statuses.some(
      (
        status
      ) =>
        status ===
          "SCHEDULED" ||
        status ===
          "RESCHEDULED"
    )
  ) {
    return normalizeStatus(
      currentInterview?.status
    ) || "SCHEDULED";
  }

  const completed =
    statuses.filter(
      (
        status
      ) =>
        status ===
        "COMPLETED"
    ).length;

  if (
    completed > 0
  ) {
    return "COMPLETED";
  }

  if (
    statuses.every(
      (
        status
      ) =>
        status ===
          "CANCELLED" ||
        status ===
          "NO_SHOW"
    )
  ) {
    return statuses.includes(
      "NO_SHOW"
    )
      ? "NO_SHOW"
      : "CANCELLED";
  }

  return (
    normalizeStatus(
      currentInterview?.status
    ) ||
    "SCHEDULED"
  );
};

/* =========================================================
   GROUP INTERVIEWS BY CANDIDATE
========================================================= */

const groupInterviewsByCandidate = (
  interviews
) => {
  const map =
    new Map();

  interviews.forEach(
    (
      interview
    ) => {
      const key =
        getCandidateKey(
          interview
        );

      if (
        !map.has(
          key
        )
      ) {
        map.set(
          key,
          []
        );
      }

      map
        .get(
          key
        )
        .push(
          interview
        );
    }
  );

  return Array.from(
    map.entries()
  ).map(
    (
      [
        key,
        rawRecords,
      ]
    ) => {
      const records =
        sortCandidateInterviews(
          rawRecords
        );

      const first =
        records[0];

      const latest =
        [
          ...records,
        ].sort(
          (
            a,
            b
          ) =>
            toTime(
              b?.scheduledAt
            ) -
            toTime(
              a?.scheduledAt
            )
        )[0];

      const current =
        getCurrentInterview(
          records
        );

      const completedCount =
        records.filter(
          (
            interview
          ) =>
            normalizeStatus(
              interview?.status
            ) ===
            "COMPLETED"
        ).length;

      const cancelledCount =
        records.filter(
          (
            interview
          ) =>
            [
              "CANCELLED",
              "NO_SHOW",
            ].includes(
              normalizeStatus(
                interview?.status
              )
            )
        ).length;

      const activeCount =
        records.filter(
          (
            interview
          ) =>
            ACTIVE_STATUSES.includes(
              normalizeStatus(
                interview?.status
              )
            )
        ).length;

      const candidate =
        current?.candidate ||
        latest?.candidate ||
        first?.candidate ||
        null;

      const candidateId =
        getRecordId(
          candidate
        ) ||
        current?.candidateId ||
        latest?.candidateId ||
        "";

      const candidateName =
        safeText(
          candidate?.fullName ||
          current?.candidateName ||
          latest?.candidateName ||
          first?.candidateName,
          "Candidate"
        );

      const positionTitle =
        safeText(
          current?.positionTitle ||
          latest?.positionTitle ||
          first?.positionTitle,
          "Position"
        );

      const department =
        current?.department ||
        latest?.department ||
        first?.department ||
        null;

      const overallStatus =
        getCandidateStatus(
          records,
          current
        );

      return {
        key,

        candidate,

        candidateId,

        candidateName,

        positionTitle,

        department,

        records,

        totalRounds:
          records.length,

        completedCount,

        cancelledCount,

        activeCount,

        current,

        latest,

        overallStatus,
      };
    }
  );
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

    const [heroVideoEnabled, setHeroVideoEnabled] = useState(false);
    const [heroVideoReady, setHeroVideoReady] = useState(false);

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


    useEffect(() => {
  if (evaluationMode) {
    return undefined;
  }

  let timerId = null;
  let idleId = null;

  const enableVideo = () => {
    setHeroVideoEnabled(true);
  };

  if ("requestIdleCallback" in window) {
    idleId = window.requestIdleCallback(enableVideo, {
      timeout: 1800,
    });
  } else {
    timerId = window.setTimeout(enableVideo, 700);
  }

  return () => {
    if (
      idleId !== null &&
      "cancelIdleCallback" in window
    ) {
      window.cancelIdleCallback(idleId);
    }

    if (timerId !== null) {
      window.clearTimeout(timerId);
    }
  };
}, [evaluationMode]);

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

    useEffect(
      () => {
        load();
      },
      [
        load,
      ]
    );

    /* =====================================================
       RAW INTERVIEW METRICS

       These remain interview-level metrics.
    ===================================================== */

    const metrics =
      useMemo(
        () => {
          let today =
            0;

          let upcoming =
            0;

          let completed =
            0;

          let actionDue =
            0;

          const now =
            Date.now();

          interviews.forEach(
            (
              interview
            ) => {
              const status =
                normalizeStatus(
                  interview?.status
                );

              const scheduled =
                toTime(
                  interview?.scheduledAt
                );

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
                !CLOSED_STATUSES.includes(
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
                ACTIVE_STATUSES.includes(
                  status
                ) &&
                scheduled <=
                  now
              ) {
                actionDue +=
                  1;
              }
            }
          );

          return {
            interviews:
              interviews.length,

            today,

            upcoming,

            completed,

            actionDue,
          };
        },
        [
          interviews,
        ]
      );

    /* =====================================================
       GROUP INTO CANDIDATES
    ===================================================== */

    const candidateGroups =
      useMemo(
        () =>
          groupInterviewsByCandidate(
            interviews
          ),
        [
          interviews,
        ]
      );

    /* =====================================================
       CANDIDATE METRICS
    ===================================================== */

    const candidateMetrics =
      useMemo(
        () => {
          const now =
            Date.now();

          return {
            total:
              candidateGroups.length,

            today:
              candidateGroups.filter(
                (
                  group
                ) =>
                  group.records.some(
                    (
                      interview
                    ) =>
                      isToday(
                        interview
                          ?.scheduledAt
                      )
                  )
              ).length,

            upcoming:
              candidateGroups.filter(
                (
                  group
                ) =>
                  group.records.some(
                    (
                      interview
                    ) => {
                      const status =
                        normalizeStatus(
                          interview
                            ?.status
                        );

                      return (
                        toTime(
                          interview
                            ?.scheduledAt
                        ) >
                          now &&
                        !CLOSED_STATUSES.includes(
                          status
                        )
                      );
                    }
                  )
              ).length,

            completed:
              candidateGroups.filter(
                (
                  group
                ) =>
                  group.overallStatus ===
                  "COMPLETED"
              ).length,

            actionDue:
              candidateGroups.filter(
                (
                  group
                ) =>
                  group.records.some(
                    (
                      interview
                    ) => {
                      const status =
                        normalizeStatus(
                          interview
                            ?.status
                        );

                      return (
                        ACTIVE_STATUSES.includes(
                          status
                        ) &&
                        toTime(
                          interview
                            ?.scheduledAt
                        ) <=
                          now
                      );
                    }
                  )
              ).length,
          };
        },
        [
          candidateGroups,
        ]
      );

    /* =====================================================
       FILTER CANDIDATES
    ===================================================== */

    const visibleCandidates =
      useMemo(
        () => {
          const keyword =
            search
              .trim()
              .toLowerCase();

          const now =
            Date.now();

          return candidateGroups
            .filter(
              (
                group
              ) => {
                const {
                  records,
                } =
                  group;

                if (
                  evaluationMode
                ) {
                  const evaluationRelevant =
                    records.some(
                      (
                        interview
                      ) =>
                        [
                          "COMPLETED",
                          "CHECKED_IN",
                          "INTERVIEWED",
                          "SCHEDULED",
                          "RESCHEDULED",
                        ].includes(
                          normalizeStatus(
                            interview
                              ?.status
                          )
                        )
                    );

                  if (
                    !evaluationRelevant
                  ) {
                    return false;
                  }
                }

                if (
                  filter ===
                  "TODAY"
                ) {
                  const hasToday =
                    records.some(
                      (
                        interview
                      ) =>
                        isToday(
                          interview
                            ?.scheduledAt
                        )
                    );

                  if (
                    !hasToday
                  ) {
                    return false;
                  }
                }

                if (
                  filter ===
                  "UPCOMING"
                ) {
                  const hasUpcoming =
                    records.some(
                      (
                        interview
                      ) => {
                        const status =
                          normalizeStatus(
                            interview
                              ?.status
                          );

                        return (
                          toTime(
                            interview
                              ?.scheduledAt
                          ) >
                            now &&
                          !CLOSED_STATUSES.includes(
                            status
                          )
                        );
                      }
                    );

                  if (
                    !hasUpcoming
                  ) {
                    return false;
                  }
                }

                if (
                  filter ===
                  "COMPLETED"
                ) {
                  const hasCompleted =
                    records.some(
                      (
                        interview
                      ) =>
                        normalizeStatus(
                          interview
                            ?.status
                        ) ===
                        "COMPLETED"
                    );

                  if (
                    !hasCompleted
                  ) {
                    return false;
                  }
                }

                if (
                  filter ===
                  "ACTION_DUE"
                ) {
                  const hasActionDue =
                    records.some(
                      (
                        interview
                      ) => {
                        const status =
                          normalizeStatus(
                            interview
                              ?.status
                          );

                        return (
                          ACTIVE_STATUSES.includes(
                            status
                          ) &&
                          toTime(
                            interview
                              ?.scheduledAt
                          ) <=
                            now
                        );
                      }
                    );

                  if (
                    !hasActionDue
                  ) {
                    return false;
                  }
                }

                if (
                  !keyword
                ) {
                  return true;
                }

                const interviewText =
                  records
                    .map(
                      (
                        interview
                      ) =>
                        [
                          interview
                            ?.interviewNumber,

                          interview
                            ?.roundName,

                          interview
                            ?.interviewer
                            ?.displayName,

                          interview
                            ?.mode,

                          interview
                            ?.status,
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            " "
                          )
                    )
                    .join(
                      " "
                    );

                return [
                  group.candidateName,

                  group.positionTitle,

                  group.department
                    ?.name,

                  interviewText,
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
              ) => {
                const aCurrent =
                  toTime(
                    a.current
                      ?.scheduledAt
                  );

                const bCurrent =
                  toTime(
                    b.current
                      ?.scheduledAt
                  );

                return (
                  bCurrent -
                  aCurrent
                );
              }
            );
        },
        [
          candidateGroups,
          filter,
          search,
          evaluationMode,
        ]
      );

    /* =====================================================
       OPEN CANDIDATE INTERVIEW WORKSPACE

       We keep using the existing interview detail route.

       The current interview is preferred.
       Latest interview is fallback.
    ===================================================== */

    const openCandidate =
      (
        group
      ) => {
        const target =
          group?.current ||
          group?.latest;

        const interviewId =
          getRecordId(
            target
          );

        if (
          !interviewId
        ) {
          return;
        }

        navigate(
          buildRecruitmentUrl(
            "interview",
            {
              id:
                interviewId,

              candidateId:
                group?.candidateId ||
                undefined,
            }
          )
        );
      };

    /* =====================================================
       RENDER
    ===================================================== */

    return (
      <section className="se-interviews-page">
        {/* =================================================
            HEADER
        ================================================== */}

       <header
  className={`se-interviews-head ${
    !evaluationMode
      ? "se-interviews-video-hero"
      : ""
  }`}
>
  {!evaluationMode && (
    <>
      <img
        className="se-interviews-hero-poster"
        src={interviewHeroPoster}
        alt=""
        aria-hidden="true"
        decoding="async"
        fetchPriority="high"
      />

      {heroVideoEnabled ? (
        <video
          className={`se-interviews-hero-video ${
            heroVideoReady ? "is-ready" : ""
          }`}
          src={interviewHeroVideo}
          poster={interviewHeroPoster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          onCanPlay={() => setHeroVideoReady(true)}
        />
      ) : null}

      <div
        className="se-interviews-hero-blend"
        aria-hidden="true"
      />
    </>
  )}

  <div className="se-interviews-head-copy">
    <span>
      {evaluationMode
        ? "EVALUATIONS"
        : "INTERVIEWS"}
    </span>

    <h1>
      {evaluationMode
        ? "Evaluations"
        : "Interviews"}
    </h1>

    {!evaluationMode && (
      <p>
        Manage interviews, rounds and candidate evaluations.
      </p>
    )}
  </div>

  <button
    type="button"
    onClick={() => load(true)}
    disabled={refreshing}
  >
    <span aria-hidden="true">
      ↻
    </span>

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
              C
            </span>

            <div>
              <strong>
                {
                  candidateMetrics.total
                }
              </strong>

              <small>
                Candidates
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
                  candidateMetrics.today
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
                  candidateMetrics.upcoming
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
                  candidateMetrics.completed
                }
              </strong>

              <small>
                Completed
              </small>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setFilter(
                "ACTION_DUE"
              )
            }
            className={
              filter ===
              "ACTION_DUE"
                ? "active pending"
                : "pending"
            }
          >
            <span>
              !
            </span>

            <div>
              <strong>
                {
                  candidateMetrics.actionDue
                }
              </strong>

              <small>
                Action Due
              </small>
            </div>
          </button>
        </div>

        {/* =================================================
            SEARCH
        ================================================== */}

        <div className="se-interview-toolbar">
          <div>
            <span aria-hidden="true">
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
              placeholder="Search candidate, position or interview..."
            />

            {search ? (
              <button
                type="button"
                onClick={() =>
                  setSearch(
                    ""
                  )
                }
                aria-label="Clear search"
              >
                ×
              </button>
            ) : null}
          </div>

          <span>
            <strong>
              {
                visibleCandidates.length
              }
            </strong>{" "}
            candidate
            {visibleCandidates.length ===
            1
              ? ""
              : "s"}
          </span>
        </div>

        {/* =================================================
            ERROR
        ================================================== */}

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
            CANDIDATE INTERVIEW PIPELINE
        ================================================== */}

        <article className="se-interview-list-panel">
          <header>
            <div>
              <span>
                INTERVIEW PIPELINE
              </span>

              <strong>
                Candidates
              </strong>
            </div>
          </header>

          {loading ? (
            <div className="se-interview-loading-list">
              <span />
              <span />
              <span />
              <span />
            </div>
          ) : visibleCandidates.length >
            0 ? (
            <div className="se-interview-table-wrap">
              <table className="se-interview-table se-interview-candidate-table">
                <thead>
                  <tr>
                    <th>
                      Candidate
                    </th>

                    <th>
                      Position
                    </th>

                    <th>
                      Interviews
                    </th>

                    <th>
                      Current Round
                    </th>

                    <th>
                      Schedule
                    </th>

                    <th>
                      Interviewer
                    </th>

                    <th>
                      Status
                    </th>

                    <th />
                  </tr>
                </thead>

                <tbody>
                  {visibleCandidates.map(
                    (
                      group
                    ) => {
                      const current =
                        group.current ||
                        group.latest;

                      const currentId =
                        getRecordId(
                          current
                        );

                      const roundName =
                        safeText(
                          current
                            ?.roundName,
                          `Round ${
                            current
                              ?.roundNumber ||
                            group.totalRounds ||
                            1
                          }`
                        );

                      return (
                        <tr
                          key={
                            group.key
                          }
                          onClick={() =>
                            openCandidate(
                              group
                            )
                          }
                          role="button"
                          tabIndex={
                            0
                          }
                          onKeyDown={(
                            event
                          ) => {
                            if (
                              event.key ===
                                "Enter" ||
                              event.key ===
                                " "
                            ) {
                              event.preventDefault();

                              openCandidate(
                                group
                              );
                            }
                          }}
                        >
                          {/* =====================================
                              CANDIDATE
                          ====================================== */}

                          <td>
                            <div className="se-interview-person">
                              <span>
                                {group
                                  .candidateName
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase()}
                              </span>

                              <div>
                                <strong>
                                  {
                                    group.candidateName
                                  }
                                </strong>

                                <small>
                                  {group.candidateId
                                    ? `Candidate · ${String(
                                        group.candidateId
                                      ).slice(
                                        -6
                                      )}`
                                    : "Candidate"}
                                </small>
                              </div>
                            </div>
                          </td>

                          {/* =====================================
                              POSITION
                          ====================================== */}

                          <td>
                            <strong>
                              {
                                group.positionTitle
                              }
                            </strong>

                            <small>
                              {safeText(
                                group
                                  ?.department
                                  ?.name,
                                ""
                              )}
                            </small>
                          </td>

                          {/* =====================================
                              INTERVIEW HISTORY SUMMARY
                          ====================================== */}

                          <td>
                            <div className="se-interview-round-summary">
                              <strong>
                                {
                                  group.totalRounds
                                }{" "}
                                {group.totalRounds ===
                                1
                                  ? "round"
                                  : "rounds"}
                              </strong>

                              <small>
                                {
                                  group.completedCount
                                }{" "}
                                completed
                              </small>
                            </div>
                          </td>

                          {/* =====================================
                              CURRENT / NEXT ROUND
                          ====================================== */}

                          <td>
                            <strong>
                              {
                                roundName
                              }
                            </strong>

                            <small>
                              {current
                                ?.interviewNumber ||
                                `Interview ${
                                  currentId
                                    ? String(
                                        currentId
                                      ).slice(
                                        -6
                                      )
                                    : ""
                                }`}
                            </small>
                          </td>

                          {/* =====================================
                              SCHEDULE
                          ====================================== */}

                          <td>
                            <strong>
                              {formatRecruitmentDate(
                                current
                                  ?.scheduledAt
                              )}
                            </strong>

                            <small>
                              {formatRecruitmentTime(
                                current
                                  ?.scheduledAt
                              )}
                            </small>
                          </td>

                          {/* =====================================
                              INTERVIEWER
                          ====================================== */}

                          <td>
                            <strong>
                              {safeText(
                                current
                                  ?.interviewer
                                  ?.displayName,
                                "—"
                              )}
                            </strong>

                            <small>
                              {safeText(
                                current
                                  ?.mode,
                                ""
                              ).replaceAll(
                                "_",
                                " "
                              )}
                            </small>
                          </td>

                          {/* =====================================
                              STATUS
                          ====================================== */}

                          <td>
                            <RecruitmentStatusBadge
                              label={
                                safeText(
                                  group
                                    .overallStatus,
                                  "Scheduled"
                                ).replaceAll(
                                  "_",
                                  " "
                                )
                              }
                              tone={
                                getInterviewTone(
                                  group
                                    .overallStatus
                                )
                              }
                            />
                          </td>

                          {/* =====================================
                              OPEN
                          ====================================== */}

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
              title="No candidates found"
              description="No interview records match the current view."
            />
          )}
        </article>
      </section>
    );
  };

export default InterviewsPage;
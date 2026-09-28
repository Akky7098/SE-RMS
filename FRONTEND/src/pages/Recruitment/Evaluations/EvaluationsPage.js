import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getEvaluations,
} from "../../../services/evaluationService";

import "./Evaluations.css";

import evaluationHeroVideo from "../evaluation-hero.mp4";
import evaluationHeroPoster from "../evaluation-hero-poster.webp";


/* =========================================================
   CONSTANTS
========================================================= */

const PAGE_SIZE = 50;


/* =========================================================
   HELPERS
========================================================= */

const normalizeId = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return String(
    value?._id ||
      value?.id ||
      value ||
      ""
  );
};


const getCandidateId = (record) =>
  normalizeId(
    record?.candidate?._id ||
      record?.candidate
  );


const getCandidateName = (record) =>
  record?.candidate?.fullName ||
  "Candidate";


const getCandidateNumber = (record) =>
  record?.candidate?.candidateNumber ||
  "—";


const getCandidateInitial = (record) =>
  getCandidateName(record)
    .trim()
    .charAt(0)
    .toUpperCase() || "C";


const getPosition = (record) =>
  record?.candidate?.positionTitle ||
  record?.interview?.positionTitle ||
  record?.manpowerRequirement?.positionTitle ||
  "—";


const getEvaluatorName = (record) =>
  record?.evaluatedBy?.displayName ||
  record?.interviewer?.displayName ||
  "—";


const getRoundName = (record) =>
  record?.interview?.roundName ||
  record?.roundName ||
  "Interview";


const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
};


const recommendationLabel = (value) => {
  const map = {
    STRONG_HIRE: "Strong Hire",
    HIRE: "Hire",
    HOLD: "Hold",
    REJECT: "Reject",
  };

  return (
    map[value] ||
    value ||
    "—"
  );
};


const decisionLabel = (value) => {
  const map = {
    SELECTED: "Selected",
    HOLD: "Hold",
    REJECTED: "Rejected",
  };

  return (
    map[value] ||
    value ||
    "—"
  );
};


const getEvaluationTime = (record) => {
  const value =
    record?.evaluatedAt ||
    record?.updatedAt ||
    record?.createdAt;

  const date =
    value
      ? new Date(value)
      : null;

  if (
    !date ||
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 0;
  }

  return date.getTime();
};


/* =========================================================
   GROUP EVALUATIONS BY CANDIDATE

   One candidate = one row.

   All interview rounds remain inside evaluations[] and are
   available when the candidate is opened.
========================================================= */

const groupEvaluationsByCandidate = (
  records
) => {
  const map = new Map();

  for (const record of records) {
    const candidateId =
      getCandidateId(record);

    /*
     * Defensive fallback:
     * never accidentally merge unrelated orphan evaluations.
     */
    const key =
      candidateId ||
      `evaluation:${normalizeId(
        record?._id
      )}`;

    if (!map.has(key)) {
      map.set(
        key,
        []
      );
    }

    map
      .get(key)
      .push(record);
  }

  return Array.from(
    map.entries()
  ).map(
    ([
      key,
      evaluations,
    ]) => {
      const sorted =
        [...evaluations].sort(
          (
            first,
            second
          ) =>
            getEvaluationTime(
              second
            ) -
            getEvaluationTime(
              first
            )
        );

      const latest =
        sorted[0];

      const decision =
        latest?.finalDecision ||
        "";

      const averageRating =
        sorted.length
          ? sorted.reduce(
              (
                total,
                item
              ) =>
                total +
                Number(
                  item?.overallRating ||
                    0
                ),
              0
            ) /
            sorted.length
          : 0;

      return {
        key,

        candidateId:
          getCandidateId(
            latest
          ),

        candidate:
          latest?.candidate ||
          {},

        latest,

        evaluations:
          sorted,

        evaluationCount:
          sorted.length,

        decision,

        averageRating,
      };
    }
  );
};


/* =========================================================
   PAGE NUMBER GENERATOR

   Example:
   1 2 3 4 ... 10
   1 ... 4 5 6 ... 10
========================================================= */

const getPaginationItems = (
  currentPage,
  totalPages
) => {
  if (totalPages <= 7) {
    return Array.from(
      {
        length: totalPages,
      },
      (
        _,
        index
      ) => index + 1
    );
  }

  if (currentPage <= 4) {
    return [
      1,
      2,
      3,
      4,
      5,
      "...",
      totalPages,
    ];
  }

  if (
    currentPage >=
    totalPages - 3
  ) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
};


/* =========================================================
   PAGE
========================================================= */

function EvaluationsPage() {
  const [heroVideoEnabled, setHeroVideoEnabled] = useState(false);
  const [heroVideoReady, setHeroVideoReady] = useState(false);

  const [
    records,
    setRecords,
  ] = useState([]);

  const [
    filter,
    setFilter,
  ] = useState("ALL");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  useEffect(() => {
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
}, []);


  /* =======================================================
     LOAD

     Summary API intentionally removed.

     Candidate summary is calculated from the same grouped
     records displayed by this screen, preventing evaluation
     rounds from being counted as separate candidates.
  ======================================================= */

  const loadData =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          const evaluationData =
            await getEvaluations({
              decision: "ALL",
              search: "",
              page: 1,

              /*
               * We need all evaluation rounds before grouping
               * by candidate.
               *
               * Pagination shown below is candidate-level.
               */
              limit: 500,
            });

          setRecords(
            Array.isArray(
              evaluationData?.records
            )
              ? evaluationData.records
              : []
          );
        } catch (err) {
          setError(
            err?.response?.data
              ?.message ||
              err?.message ||
              "Evaluations could not be loaded"
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );


  useEffect(
    () => {
      loadData();
    },
    [loadData]
  );


  /* =======================================================
     GROUPED CANDIDATES
  ======================================================= */

  const candidates =
    useMemo(
      () =>
        groupEvaluationsByCandidate(
          records
        ),
      [records]
    );


  /* =======================================================
     CANDIDATE-LEVEL SUMMARY
  ======================================================= */

  const candidateSummary =
    useMemo(
      () => {
        const result = {
          total:
            candidates.length,

          selected: 0,

          hold: 0,

          rejected: 0,
        };

        for (
          const item of candidates
        ) {
          if (
            item.decision ===
            "SELECTED"
          ) {
            result.selected += 1;
          }

          if (
            item.decision ===
            "HOLD"
          ) {
            result.hold += 1;
          }

          if (
            item.decision ===
            "REJECTED"
          ) {
            result.rejected += 1;
          }
        }

        return result;
      },
      [candidates]
    );


  /* =======================================================
     FILTERED CANDIDATES
  ======================================================= */

  const visibleCandidates =
    useMemo(
      () => {
        const term =
          search
            .trim()
            .toLowerCase();

        return candidates.filter(
          (item) => {
            if (
              filter !==
                "ALL" &&
              item.decision !==
                filter
            ) {
              return false;
            }

            if (!term) {
              return true;
            }

            const latest =
              item.latest;

            const searchable =
              [
                getCandidateName(
                  latest
                ),

                getCandidateNumber(
                  latest
                ),

                getPosition(
                  latest
                ),

                item.decision,

                decisionLabel(
                  item.decision
                ),

                ...item.evaluations.map(
                  (
                    evaluation
                  ) =>
                    [
                      getRoundName(
                        evaluation
                      ),

                      getEvaluatorName(
                        evaluation
                      ),

                      recommendationLabel(
                        evaluation
                          ?.recommendation
                      ),
                    ].join(" ")
                ),
              ]
                .join(" ")
                .toLowerCase();

            return searchable.includes(
              term
            );
          }
        );
      },
      [
        candidates,
        filter,
        search,
      ]
    );


  /* =======================================================
     RESET PAGINATION WHEN FILTER/SEARCH CHANGES
  ======================================================= */

  useEffect(
    () => {
      setCurrentPage(1);
    },
    [
      filter,
      search,
    ]
  );


  /* =======================================================
     PAGINATION
  ======================================================= */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        visibleCandidates.length /
          PAGE_SIZE
      )
    );


  useEffect(
    () => {
      if (
        currentPage >
        totalPages
      ) {
        setCurrentPage(
          totalPages
        );
      }
    },
    [
      currentPage,
      totalPages,
    ]
  );


  const paginatedCandidates =
    useMemo(
      () => {
        const start =
          (currentPage - 1) *
          PAGE_SIZE;

        return visibleCandidates.slice(
          start,
          start + PAGE_SIZE
        );
      },
      [
        visibleCandidates,
        currentPage,
      ]
    );


  const paginationItems =
    useMemo(
      () =>
        getPaginationItems(
          currentPage,
          totalPages
        ),
      [
        currentPage,
        totalPages,
      ]
    );


  const showingFrom =
    visibleCandidates.length === 0
      ? 0
      : (currentPage - 1) *
          PAGE_SIZE +
        1;


  const showingTo =
    Math.min(
      currentPage *
        PAGE_SIZE,
      visibleCandidates.length
    );


  const changePage = (
    page
  ) => {
    if (
      page < 1 ||
      page > totalPages ||
      page === currentPage
    ) {
      return;
    }

    setCurrentPage(page);

    window.requestAnimationFrame(
      () => {
        const table =
          document.querySelector(
            ".eval-table-card"
          );

        if (table) {
          table.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }
    );
  };


  /* =======================================================
     FILTER CONFIG
  ======================================================= */

  const filters =
    useMemo(
      () => [
        {
          key: "ALL",
          label: "All",
          count:
            candidateSummary.total,
        },

        {
          key: "SELECTED",
          label: "Selected",
          count:
            candidateSummary.selected,
        },

        {
          key: "HOLD",
          label: "Hold",
          count:
            candidateSummary.hold,
        },

        {
          key: "REJECTED",
          label: "Rejected",
          count:
            candidateSummary.rejected,
        },
      ],
      [candidateSummary]
    );


  /* =======================================================
     NAVIGATION
  ======================================================= */

  const openCandidate = (
    candidateGroup
  ) => {
    const evaluationId =
      candidateGroup
        ?.latest
        ?._id;

    if (!evaluationId) {
      return;
    }

    const url =
      new URL(
        window.location.href
      );

    url.searchParams.set(
      "app",
      "recruitment"
    );

    url.searchParams.set(
      "page",
      "evaluation"
    );

    url.searchParams.set(
      "id",
      evaluationId
    );

    if (
      candidateGroup
        ?.candidateId
    ) {
      url.searchParams.set(
        "candidateId",
        candidateGroup
          .candidateId
      );
    } else {
      url.searchParams.delete(
        "candidateId"
      );
    }

    window.history.pushState(
      {},
      "",
      url
    );

    window.dispatchEvent(
      new PopStateEvent(
        "popstate"
      )
    );
  };


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="eval-page eval-page--workspace">

      {/* ===================================================
          PAGE BANNER
      ==================================================== */}

     <section className="eval-workspace-banner eval-workspace-video-hero">
  <img
    className="eval-workspace-hero-poster"
    src={evaluationHeroPoster}
    alt=""
    aria-hidden="true"
    decoding="async"
    fetchPriority="high"
  />

  {heroVideoEnabled ? (
    <video
      className={`eval-workspace-hero-video ${
        heroVideoReady ? "is-ready" : ""
      }`}
      src={evaluationHeroVideo}
      poster={evaluationHeroPoster}
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
    className="eval-workspace-hero-overlay"
    aria-hidden="true"
  />

  <div className="eval-workspace-banner-copy">
    <span className="eval-workspace-eyebrow">
      Recruitment
    </span>

    <h1>
      Evaluation Sheet
    </h1>

    <p>
      Candidate evaluation, interview rounds
      and final hiring decisions
    </p>
  </div>

  <div className="eval-workspace-banner-stat">
    <strong>
      {candidateSummary.total}
    </strong>

    <span>
      Total Candidates
    </span>
  </div>
</section>


      {/* ===================================================
          SUMMARY
      ==================================================== */}

      <section className="eval-summary-grid">
        <article className="eval-summary-card eval-summary-card--total">
          <div className="eval-summary-icon">
            E
          </div>

          <div>
            <span>
              Evaluated
            </span>

            <strong>
              {
                candidateSummary.total
              }
            </strong>
          </div>
        </article>


        <article className="eval-summary-card eval-summary-card--selected">
          <div className="eval-summary-icon">
            S
          </div>

          <div>
            <span>
              Selected
            </span>

            <strong>
              {
                candidateSummary.selected
              }
            </strong>
          </div>
        </article>


        <article className="eval-summary-card eval-summary-card--hold">
          <div className="eval-summary-icon">
            H
          </div>

          <div>
            <span>
              Hold
            </span>

            <strong>
              {
                candidateSummary.hold
              }
            </strong>
          </div>
        </article>


        <article className="eval-summary-card eval-summary-card--rejected">
          <div className="eval-summary-icon">
            R
          </div>

          <div>
            <span>
              Rejected
            </span>

            <strong>
              {
                candidateSummary.rejected
              }
            </strong>
          </div>
        </article>
      </section>


      {/* ===================================================
          FILTER + SEARCH
      ==================================================== */}

      <section className="eval-filter-shell">
        <div className="eval-filter-tabs">
          {filters.map(
            (item) => (
              <button
                key={
                  item.key
                }
                type="button"
                className={
                  filter ===
                  item.key
                    ? "eval-filter-tab is-active"
                    : "eval-filter-tab"
                }
                onClick={() =>
                  setFilter(
                    item.key
                  )
                }
              >
                <span>
                  {item.label}
                </span>

                <strong>
                  {item.count}
                </strong>
              </button>
            )
          )}
        </div>


        <div className="eval-search">
          <span
            className="eval-search-icon"
            aria-hidden="true"
          >
            ⌕
          </span>

          <input
            value={search}
            onChange={(
              event
            ) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search candidate or position"
            aria-label="Search evaluations"
          />

          {search ? (
            <button
              type="button"
              className="eval-search-clear"
              onClick={() =>
                setSearch("")
              }
              aria-label="Clear search"
            >
              ×
            </button>
          ) : null}
        </div>
      </section>


      {/* ===================================================
          ERROR
      ==================================================== */}

      {error ? (
        <div className="eval-error-box">
          <strong>
            Unable to load evaluations
          </strong>

          <span>
            {error}
          </span>
        </div>
      ) : null}


      {/* ===================================================
          CANDIDATE TABLE
      ==================================================== */}

      <section className="eval-table-card">
        {loading ? (
          <div className="eval-loading">
            Loading evaluations...
          </div>
        ) : visibleCandidates.length ===
          0 ? (
          <div className="eval-empty">
            <div className="eval-empty-icon">
              E
            </div>

            <strong>
              No evaluations found
            </strong>

            <span>
              Try changing your
              search or decision filter.
            </span>
          </div>
        ) : (
          <>
            <div className="eval-table-wrap">
              <table className="eval-table">
                <thead>
                  <tr>
                    <th>
                      Candidate
                    </th>

                    <th>
                      Position
                    </th>

                    <th>
                      Rounds
                    </th>

                    <th>
                      Rating
                    </th>

                    <th>
                      Recommendation
                    </th>

                    <th>
                      Decision
                    </th>

                    <th>
                      Last Evaluated
                    </th>

                    <th
                      aria-label="Open"
                    />
                  </tr>
                </thead>

                <tbody>
                  {paginatedCandidates.map(
                    (
                      candidateGroup
                    ) => {
                      const {
                        latest,
                        decision,
                        evaluationCount,
                        averageRating,
                      } =
                        candidateGroup;

                      const rowClass =
                        [
                          "eval-table-row",

                          decision
                            ? `eval-table-row--${decision.toLowerCase()}`
                            : "",
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            " "
                          );

                      return (
                        <tr
                          key={
                            candidateGroup.key
                          }
                          className={
                            rowClass
                          }
                          onClick={() =>
                            openCandidate(
                              candidateGroup
                            )
                          }
                        >
                          <td>
                            <div className="eval-candidate-cell">
                              <div className="eval-avatar">
                                {getCandidateInitial(
                                  latest
                                )}
                              </div>

                              <div className="eval-candidate-copy">
                                <strong className="eval-candidate-name">
                                  {getCandidateName(
                                    latest
                                  )}
                                </strong>

                                <span>
                                  {getCandidateNumber(
                                    latest
                                  )}
                                </span>
                              </div>
                            </div>
                          </td>


                          <td>
                            <strong className="eval-position-name">
                              {getPosition(
                                latest
                              )}
                            </strong>
                          </td>


                          <td>
                            <div className="eval-round-count">
                              <strong>
                                {
                                  evaluationCount
                                }
                              </strong>

                              <span>
                                {evaluationCount ===
                                1
                                  ? "Round"
                                  : "Rounds"}
                              </span>
                            </div>
                          </td>


                          <td>
                            <div className="eval-rating">
                              <strong>
                                {Number(
                                  averageRating ||
                                    0
                                ).toFixed(
                                  1
                                )}
                              </strong>

                              <span>
                                /5
                              </span>
                            </div>
                          </td>


                          <td>
                            <span className="eval-recommendation">
                              {recommendationLabel(
                                latest
                                  ?.recommendation
                              )}
                            </span>
                          </td>


                          <td>
                            <span
                              className={
                                [
                                  "eval-decision",

                                  decision
                                    ? `eval-decision--${decision.toLowerCase()}`
                                    : "",
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(
                                    " "
                                  )
                              }
                            >
                              {decisionLabel(
                                decision
                              )}
                            </span>
                          </td>


                          <td>
                            <div className="eval-date-cell">
                              <strong>
                                {formatDate(
                                  latest
                                    ?.evaluatedAt
                                )}
                              </strong>

                              <span>
                                {getEvaluatorName(
                                  latest
                                )}
                              </span>
                            </div>
                          </td>


                          <td className="eval-open-cell">
                            <button
                              type="button"
                              className="eval-row-open"
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                openCandidate(
                                  candidateGroup
                                );
                              }}
                              aria-label={`Open ${getCandidateName(
                                latest
                              )} evaluations`}
                            >
                              →
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>


            {/* =============================================
                PAGINATION
            ============================================== */}

            <div className="eval-pagination">
              <div className="eval-pagination-info">
                <span>
                  Showing
                </span>

                <strong>
                  {showingFrom}
                  –
                  {showingTo}
                </strong>

                <span>
                  of
                </span>

                <strong>
                  {
                    visibleCandidates.length
                  }
                </strong>

                <span>
                  candidates
                </span>

                <span className="eval-pagination-size">
                  50 per page
                </span>
              </div>


              <div className="eval-pagination-controls">
                <button
                  type="button"
                  className="eval-pagination-nav"
                  disabled={
                    currentPage === 1
                  }
                  onClick={() =>
                    changePage(
                      currentPage -
                        1
                    )
                  }
                >
                  <span aria-hidden="true">
                    ←
                  </span>

                  Previous
                </button>


                <div className="eval-pagination-pages">
                  {paginationItems.map(
                    (
                      item,
                      index
                    ) =>
                      item ===
                      "..." ? (
                        <span
                          key={`ellipsis-${index}`}
                          className="eval-pagination-ellipsis"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={
                            item
                          }
                          type="button"
                          className={
                            currentPage ===
                            item
                              ? "eval-pagination-page is-active"
                              : "eval-pagination-page"
                          }
                          onClick={() =>
                            changePage(
                              item
                            )
                          }
                          aria-label={`Go to page ${item}`}
                          aria-current={
                            currentPage ===
                            item
                              ? "page"
                              : undefined
                          }
                        >
                          {item}
                        </button>
                      )
                  )}
                </div>


                <button
                  type="button"
                  className="eval-pagination-nav"
                  disabled={
                    currentPage ===
                    totalPages
                  }
                  onClick={() =>
                    changePage(
                      currentPage +
                        1
                    )
                  }
                >
                  Next

                  <span aria-hidden="true">
                    →
                  </span>
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}


export default EvaluationsPage;
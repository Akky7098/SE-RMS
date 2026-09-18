import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getEvaluationSummary,
  getEvaluations,
} from "../../../services/evaluationService";

import "./Evaluations.css";

/* =========================================================
   HELPERS
========================================================= */

const getCandidateName = (
  record
) =>
  record?.candidate?.fullName ||
  "Candidate";

const getCandidateInitial = (
  record
) =>
  getCandidateName(record)
    .trim()
    .charAt(0)
    .toUpperCase() ||
  "C";

const getPosition = (
  record
) =>
  record?.candidate
    ?.positionTitle ||
  record?.interview
    ?.positionTitle ||
  record?.manpowerRequirement
    ?.positionTitle ||
  "—";

const getEvaluatorName = (
  record
) =>
  record?.evaluatedBy
    ?.displayName ||
  record?.interviewer
    ?.displayName ||
  "—";

const formatDate = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

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

const recommendationLabel = (
  value
) => {
  const map = {
    STRONG_HIRE:
      "Strong Hire",

    HIRE:
      "Hire",

    HOLD:
      "Hold",

    REJECT:
      "Reject",
  };

  return (
    map[value] ||
    value ||
    "—"
  );
};

const decisionLabel = (
  value
) => {
  const map = {
    SELECTED:
      "Selected",

    HOLD:
      "Hold",

    REJECTED:
      "Rejected",
  };

  return (
    map[value] ||
    value ||
    "—"
  );
};

/* =========================================================
   PAGE
========================================================= */

function EvaluationsPage() {
  const [
    summary,
    setSummary,
  ] =
    useState({
      total: 0,
      selected: 0,
      hold: 0,
      rejected: 0,
    });

  const [
    records,
    setRecords,
  ] =
    useState([]);

  const [
    filter,
    setFilter,
  ] =
    useState(
      "ALL"
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  /* =====================================================
     LOAD
  ===================================================== */

  const loadData =
    useCallback(
      async (
        silent = false
      ) => {
        try {
          if (!silent) {
            setLoading(
              true
            );
          } else {
            setRefreshing(
              true
            );
          }

          setError("");

          const [
            summaryData,
            evaluationData,
          ] =
            await Promise.all([
              getEvaluationSummary(),

              getEvaluations({
                decision:
                  filter,

                search:
                  search.trim(),

                page: 1,

                limit: 100,
              }),
            ]);

          setSummary({
            total:
              summaryData
                ?.total ||
              0,

            selected:
              summaryData
                ?.selected ||
              0,

            hold:
              summaryData
                ?.hold ||
              0,

            rejected:
              summaryData
                ?.rejected ||
              0,
          });

          setRecords(
            Array.isArray(
              evaluationData
                ?.records
            )
              ? evaluationData
                  .records
              : []
          );
        } catch (
          err
        ) {
          setError(
            err?.response
              ?.data
              ?.message ||
            err?.message ||
            "Evaluations could not be loaded"
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
      [
        filter,
        search,
      ]
    );

  useEffect(
    () => {
      const timer =
        window.setTimeout(
          () => {
            loadData();
          },
          search
            ? 250
            : 0
        );

      return () =>
        window.clearTimeout(
          timer
        );
    },
    [
      loadData,
      search,
      filter,
    ]
  );

  /* =====================================================
     FILTER CONFIG
  ===================================================== */

  const filters =
    useMemo(
      () => [
        {
          key: "ALL",
          label: "All",
          count:
            summary.total,
        },

        {
          key:
            "SELECTED",
          label:
            "Selected",
          count:
            summary.selected,
        },

        {
          key: "HOLD",
          label: "Hold",
          count:
            summary.hold,
        },

        {
          key:
            "REJECTED",
          label:
            "Rejected",
          count:
            summary.rejected,
        },
      ],
      [summary]
    );

  /* =====================================================
     NAVIGATION
  ===================================================== */

  const openEvaluation =
    (
      evaluationId
    ) => {
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

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="eval-page">
      <section className="eval-heading-row">
        <div>
          <div className="eval-eyebrow">
            Interviews · Evaluations
          </div>

          <h1>
            Evaluations
          </h1>

          <p>
            Review interview outcomes,
            hiring decisions and
            candidate progression.
          </p>
        </div>

        <button
          type="button"
          className="eval-refresh-button"
          onClick={() =>
            loadData(true)
          }
          disabled={
            refreshing
          }
        >
          {refreshing
            ? "Refreshing..."
            : "↻ Refresh"}
        </button>
      </section>

      {/* =================================================
          SUMMARY
      ================================================== */}

      <section className="eval-summary-grid">
        <article className="eval-summary-card eval-summary-card--total">
          <div className="eval-summary-icon">
            E
          </div>

          <div>
            <strong>
              {summary.total}
            </strong>

            <span>
              Evaluated
            </span>
          </div>
        </article>

        <article className="eval-summary-card eval-summary-card--selected">
          <div className="eval-summary-icon">
            S
          </div>

          <div>
            <strong>
              {summary.selected}
            </strong>

            <span>
              Selected
            </span>
          </div>
        </article>

        <article className="eval-summary-card eval-summary-card--hold">
          <div className="eval-summary-icon">
            H
          </div>

          <div>
            <strong>
              {summary.hold}
            </strong>

            <span>
              Hold
            </span>
          </div>
        </article>

        <article className="eval-summary-card eval-summary-card--rejected">
          <div className="eval-summary-icon">
            R
          </div>

          <div>
            <strong>
              {summary.rejected}
            </strong>

            <span>
              Rejected
            </span>
          </div>
        </article>
      </section>

      {/* =================================================
          FILTER BAR
      ================================================== */}

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
            placeholder="Search candidate, position or evaluation..."
          />
        </div>
      </section>

      {/* =================================================
          ERROR
      ================================================== */}

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

      {/* =================================================
          TABLE
      ================================================== */}

      <section className="eval-register-card">
        <div className="eval-register-header">
          <div>
            <span>
              EVALUATION REGISTER
            </span>

            <h2>
              Candidate Decisions
            </h2>
          </div>

          <div className="eval-register-count">
            {records.length}
            {" "}
            visible
          </div>
        </div>

        {loading ? (
          <div className="eval-loading">
            Loading evaluations...
          </div>
        ) : records.length ===
          0 ? (
          <div className="eval-empty">
            <div className="eval-empty-icon">
              E
            </div>

            <strong>
              No evaluations found
            </strong>

            <span>
              Try another decision
              filter or search term.
            </span>
          </div>
        ) : (
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
                    Rating
                  </th>

                  <th>
                    Recommendation
                  </th>

                  <th>
                    Decision
                  </th>

                  <th>
                    Evaluated By
                  </th>

                  <th>
                    Date
                  </th>

                  <th />
                </tr>
              </thead>

              <tbody>
                {records.map(
                  (
                    record
                  ) => {
                    const decision =
                      record
                        ?.finalDecision ||
                      "";

                    const rowClass =
                      `eval-table-row eval-table-row--${decision.toLowerCase()}`;

                    return (
                      <tr
                        key={
                          record._id
                        }
                        className={
                          rowClass
                        }
                        onClick={() =>
                          openEvaluation(
                            record._id
                          )
                        }
                      >
                        <td>
                          <div className="eval-candidate-cell">
                            <div className="eval-avatar">
                              {getCandidateInitial(
                                record
                              )}
                            </div>

                            <div>
                              <strong className="eval-candidate-name">
                                {getCandidateName(
                                  record
                                )}
                              </strong>

                              <span>
                                {record
                                  ?.candidate
                                  ?.candidateNumber ||
                                  record
                                    ?.interview
                                    ?.interviewNumber ||
                                  "—"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <strong className="eval-position-name">
                            {getPosition(
                              record
                            )}
                          </strong>
                        </td>

                        <td>
                          <div className="eval-rating">
                            <strong>
                              {Number(
                                record
                                  ?.overallRating ||
                                  0
                              ).toFixed(
                                1
                              )}
                            </strong>

                            <span>
                              / 5
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className="eval-recommendation">
                            {recommendationLabel(
                              record
                                ?.recommendation
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              `eval-decision eval-decision--${decision.toLowerCase()}`
                            }
                          >
                            {decisionLabel(
                              decision
                            )}
                          </span>
                        </td>

                        <td>
                          {getEvaluatorName(
                            record
                          )}
                        </td>

                        <td>
                          {formatDate(
                            record
                              ?.evaluatedAt
                          )}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="eval-row-open"
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation();

                              openEvaluation(
                                record._id
                              );
                            }}
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
        )}
      </section>
    </div>
  );
}

export default EvaluationsPage;
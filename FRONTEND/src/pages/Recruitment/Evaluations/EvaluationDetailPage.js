import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getEvaluation,
  getEvaluations,
  openEvaluationAttachment,
  resendEvaluationDecisionEmail,
} from "../../../services/evaluationService";

import {
  getSelectionByCandidate,
} from "../../../services/selectionService";

import "./Evaluations.css";

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

const formatDateTime = (
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
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  ).format(date);
};

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

const niceValue = (
  value
) => {
  if (!value) {
    return "—";
  }

  return String(
    value
  )
    .replaceAll(
      "_",
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase()
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
    niceValue(value)
  );
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
    niceValue(value)
  );
};

const getCandidateId = (
  evaluation
) =>
  normalizeId(
    evaluation
      ?.candidate
      ?._id ||
      evaluation
        ?.candidate
  );




const getPosition = (
  evaluation
) =>
  evaluation
    ?.candidate
    ?.positionTitle ||
  evaluation
    ?.interview
    ?.positionTitle ||
  evaluation
    ?.manpowerRequirement
    ?.positionTitle ||
  "—";

const getRoundName = (
  evaluation,
  index = 0
) =>
  evaluation
    ?.interview
    ?.roundName ||
  evaluation
    ?.roundName ||
  `Round ${index + 1}`;

const getEvaluatorName = (
  evaluation
) =>
  evaluation
    ?.evaluatedBy
    ?.displayName ||
  evaluation
    ?.interviewer
    ?.displayName ||
  "—";

const getEvaluationTime = (
  evaluation
) => {
  const value =
    evaluation
      ?.evaluatedAt ||
    evaluation
      ?.updatedAt ||
    evaluation
      ?.createdAt;

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

const ratingItems = [
  {
    key:
      "technicalSkills",

    label:
      "Technical Skills",
  },

  {
    key:
      "relevantExperience",

    label:
      "Relevant Experience",
  },

  {
    key:
      "communication",

    label:
      "Communication",
  },

  {
    key:
      "problemSolving",

    label:
      "Problem Solving",
  },

  {
    key:
      "roleFit",

    label:
      "Role Fit",
  },

  {
    key:
      "professionalism",

    label:
      "Professionalism",
  },
];

/* =========================================================
   PAGE
========================================================= */

function EvaluationDetailPage() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const initialEvaluationId =
    params.get(
      "id"
    );

  const candidateIdFromUrl =
    params.get(
      "candidateId"
    );

  const [
    evaluation,
    setEvaluation,
  ] =
    useState(null);

  const [
    evaluations,
    setEvaluations,
  ] =
    useState([]);

  const [
    activeEvaluationId,
    setActiveEvaluationId,
  ] =
    useState(
      initialEvaluationId ||
        ""
    );

  const [
    selection,
    setSelection,
  ] =
    useState(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    roundLoading,
    setRoundLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    mailBusy,
    setMailBusy,
  ] =
    useState(false);

  const [
    fileBusy,
    setFileBusy,
  ] =
    useState(false);

  /* =====================================================
     LOAD CANDIDATE + ALL ROUND EVALUATIONS

     We first load the representative evaluation because it
     gives us the authoritative candidate identity.

     Then we retrieve candidate-related evaluation rows and
     filter again by exact candidate ID before displaying
     them. This prevents another candidate with a similar
     name from being mixed into the drill-down.
  ===================================================== */

  const loadCandidateEvaluations =
    useCallback(
      async () => {
        if (
          !initialEvaluationId
        ) {
          setError(
            "Evaluation ID is missing."
          );

          setLoading(
            false
          );

          return;
        }

        try {
          setLoading(
            true
          );

          setError("");

          const initial =
            await getEvaluation(
              initialEvaluationId
            );

          const authoritativeCandidateId =
            candidateIdFromUrl ||
            getCandidateId(
              initial
            );

          const candidateNumber =
            initial
              ?.candidate
              ?.candidateNumber ||
            "";

          const candidateName =
            initial
              ?.candidate
              ?.fullName ||
            "";

          let allRecords = [];

          try {
            const result =
              await getEvaluations({
                decision:
                  "ALL",

                /*
                 * Candidate number is preferred because it is
                 * substantially safer than a broad name search.
                 */
                search:
                  candidateNumber ||
                  candidateName,

                page: 1,

                limit: 100,
              });

            allRecords =
              Array.isArray(
                result
                  ?.records
              )
                ? result
                    .records
                : [];
          } catch {
            allRecords =
              [];
          }

          const exactMatches =
            allRecords.filter(
              (item) =>
                getCandidateId(
                  item
                ) ===
                authoritativeCandidateId
            );

          /*
           * Always retain the initially loaded evaluation.
           * This makes the page resilient even if the list
           * endpoint/search does not return that record.
           */
          const mergedMap =
            new Map();

          [
            initial,
            ...exactMatches,
          ].forEach(
            (item) => {
              const id =
                normalizeId(
                  item?._id
                );

              if (id) {
                mergedMap.set(
                  id,
                  item
                );
              }
            }
          );

          const candidateEvaluations =
            Array.from(
              mergedMap.values()
            ).sort(
              (
                first,
                second
              ) =>
                getEvaluationTime(
                  first
                ) -
                getEvaluationTime(
                  second
                )
            );

          setEvaluations(
            candidateEvaluations
          );

          setEvaluation(
            initial
          );

          setActiveEvaluationId(
            normalizeId(
              initial._id
            )
          );

          if (
            initial
              ?.finalDecision ===
              "SELECTED" &&
            initial
              ?.candidate
              ?._id
          ) {
            try {
              const selectionData =
                await getSelectionByCandidate(
                  initial
                    .candidate
                    ._id
                );

              setSelection(
                selectionData
              );
            } catch {
              setSelection(
                null
              );
            }
          } else {
            setSelection(
              null
            );
          }
        } catch (
          err
        ) {
          setError(
            err?.response
              ?.data
              ?.message ||
            err?.message ||
            "Evaluation could not be loaded"
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        initialEvaluationId,
        candidateIdFromUrl,
      ]
    );

  useEffect(
    () => {
      loadCandidateEvaluations();
    },
    [
      loadCandidateEvaluations,
    ]
  );

  /* =====================================================
     OPEN ROUND
  ===================================================== */

  const openRound =
    async (
      item
    ) => {
      const id =
        normalizeId(
          item?._id
        );

      if (
        !id ||
        id ===
          activeEvaluationId
      ) {
        return;
      }

      try {
        setRoundLoading(
          true
        );

        setError("");

        const data =
          await getEvaluation(
            id
          );

        setEvaluation(
          data
        );

        setActiveEvaluationId(
          id
        );

        /*
         * Keep the URL representative of the selected round
         * without creating another page/navigation layer.
         */
        const url =
          new URL(
            window.location.href
          );

        url.searchParams.set(
          "id",
          id
        );

        window.history.replaceState(
          {},
          "",
          url
        );

        if (
          data
            ?.finalDecision ===
            "SELECTED" &&
          data
            ?.candidate
            ?._id
        ) {
          try {
            const selectionData =
              await getSelectionByCandidate(
                data
                  .candidate
                  ._id
              );

            setSelection(
              selectionData
            );
          } catch {
            setSelection(
              null
            );
          }
        } else {
          setSelection(
            null
          );
        }
      } catch (
        err
      ) {
        setError(
          err?.response
            ?.data
            ?.message ||
          err?.message ||
          "Evaluation round could not be loaded"
        );
      } finally {
        setRoundLoading(
          false
        );
      }
    };

  /* =====================================================
     DATA
  ===================================================== */

  const candidate =
    evaluation
      ?.candidate ||
    {};

  const interview =
    evaluation
      ?.interview ||
    {};

  

  const decision =
    evaluation
      ?.finalDecision ||
    "";

  const attachment =
    evaluation
      ?.attachment;

  const email =
    evaluation
      ?.decisionEmail ||
    {};

  const overallRating =
    Number(
      evaluation
        ?.overallRating ||
      0
    );

  const candidateAverage =
    useMemo(
      () => {
        if (
          !evaluations.length
        ) {
          return 0;
        }

        return (
          evaluations.reduce(
            (
              total,
              item
            ) =>
              total +
              Number(
                item
                  ?.overallRating ||
                  0
              ),
            0
          ) /
          evaluations.length
        );
      },
      [evaluations]
    );

  /* =====================================================
     ATTACHMENT
  ===================================================== */

  const handleOpenAttachment =
    async () => {
      if (
        !activeEvaluationId
      ) {
        return;
      }

      try {
        setFileBusy(
          true
        );

        setError("");

        await openEvaluationAttachment(
          activeEvaluationId
        );
      } catch (
        err
      ) {
        setError(
          err?.response
            ?.data
            ?.message ||
          err?.message ||
          "Evaluation document could not be opened"
        );
      } finally {
        setFileBusy(
          false
        );
      }
    };

  /* =====================================================
     EMAIL
  ===================================================== */

  const handleResendEmail =
    async () => {
      if (
        !activeEvaluationId
      ) {
        return;
      }

      try {
        setMailBusy(
          true
        );

        setError("");

        await resendEvaluationDecisionEmail(
          activeEvaluationId
        );

        const updated =
          await getEvaluation(
            activeEvaluationId
          );

        setEvaluation(
          updated
        );

        setEvaluations(
          (
            current
          ) =>
            current.map(
              (item) =>
                normalizeId(
                  item?._id
                ) ===
                activeEvaluationId
                  ? {
                      ...item,
                      ...updated,
                    }
                  : item
            )
        );
      } catch (
        err
      ) {
        setError(
          err?.response
            ?.data
            ?.message ||
          err?.message ||
          "Decision email could not be sent"
        );
      } finally {
        setMailBusy(
          false
        );
      }
    };

  /* =====================================================
     OPEN SELECTION
  ===================================================== */

  const openSelection =
    () => {
      if (
        !selection?._id
      ) {
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
        "selection"
      );

      url.searchParams.set(
        "id",
        selection._id
      );

      url.searchParams.delete(
        "candidateId"
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
     STATES
  ===================================================== */

  if (loading) {
    return (
      <div className="eval-detail-loading">
        Loading evaluations...
      </div>
    );
  }

  if (
    error &&
    !evaluation
  ) {
    return (
      <div className="eval-detail-error">
        <strong>
          Evaluation unavailable
        </strong>

        <span>
          {error}
        </span>
      </div>
    );
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="eval-detail-page">
      {/* =================================================
          CANDIDATE HEADER

          No local Back button.
          Global application navigation already handles it.
      ================================================== */}

      <section
        className={
          [
            "eval-detail-hero",

            decision
              ? `eval-detail-hero--${decision.toLowerCase()}`
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
        <div className="eval-detail-hero-main">
          <div className="eval-detail-avatar">
            {candidate
              ?.fullName
              ?.charAt(0)
              ?.toUpperCase() ||
              "C"}
          </div>

          <div className="eval-detail-candidate">
            <div className="eval-detail-title-line">
              <h1>
                {candidate
                  ?.fullName ||
                  "Candidate"}
              </h1>

              <span className="eval-candidate-number">
                {candidate
                  ?.candidateNumber ||
                  ""}
              </span>
            </div>

            <div className="eval-detail-meta">
              <span>
                {getPosition(
                  evaluation
                )}
              </span>

              <span>
                {
                  evaluations.length
                }{" "}
                {evaluations.length ===
                1
                  ? "evaluated round"
                  : "evaluated rounds"}
              </span>

              <span>
                Avg.{" "}
                {candidateAverage.toFixed(
                  1
                )}
                /5
              </span>
            </div>
          </div>
        </div>

        <div className="eval-detail-decision-block">
          <span>
            Decision
          </span>

          <strong>
            {decisionLabel(
              decision
            )}
          </strong>
        </div>
      </section>

      {error ? (
        <div className="eval-error-box eval-error-box--detail">
          {error}
        </div>
      ) : null}

      {/* =================================================
          ALL INTERVIEW ROUNDS

          This is now the main candidate drill-down.
      ================================================== */}

      <section className="eval-rounds-section">
        <div className="eval-section-heading">
          <div>
            <h2>
              Interview Evaluations
            </h2>

            <span>
              {
                evaluations.length
              }{" "}
              {evaluations.length ===
              1
                ? "round"
                : "rounds"}
            </span>
          </div>
        </div>

        <div className="eval-rounds-list">
          {evaluations.map(
            (
              item,
              index
            ) => {
              const itemId =
                normalizeId(
                  item?._id
                );

              const itemDecision =
                item
                  ?.finalDecision ||
                "";

              const active =
                itemId ===
                activeEvaluationId;

              return (
                <button
                  key={
                    itemId
                  }
                  type="button"
                  className={
                    [
                      "eval-round-card",

                      active
                        ? "is-active"
                        : "",

                      itemDecision
                        ? `eval-round-card--${itemDecision.toLowerCase()}`
                        : "",
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        " "
                      )
                  }
                  onClick={() =>
                    openRound(
                      item
                    )
                  }
                >
                  <div className="eval-round-index">
                    {index +
                      1}
                  </div>

                  <div className="eval-round-main">
                    <strong>
                      {getRoundName(
                        item,
                        index
                      )}
                    </strong>

                    <span>
                      {getEvaluatorName(
                        item
                      )}
                    </span>
                  </div>

                  <div className="eval-round-rating">
                    <strong>
                      {Number(
                        item
                          ?.overallRating ||
                          0
                      ).toFixed(
                        1
                      )}
                    </strong>

                    <span>
                      /5
                    </span>
                  </div>

                  <div className="eval-round-recommendation">
                    {recommendationLabel(
                      item
                        ?.recommendation
                    )}
                  </div>

                  <span
                    className={
                      [
                        "eval-decision",

                        itemDecision
                          ? `eval-decision--${itemDecision.toLowerCase()}`
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
                      itemDecision
                    )}
                  </span>

                  <div className="eval-round-date">
                    {formatDate(
                      item
                        ?.evaluatedAt
                    )}
                  </div>

                  <div className="eval-round-arrow">
                    →
                  </div>
                </button>
              );
            }
          )}
        </div>
      </section>

      {/* =================================================
          SELECTED ROUND DETAILS
      ================================================== */}

      <section className="eval-active-round">
        <div className="eval-active-round-header">
          <div>
            <span>
              Selected Round
            </span>

            <h2>
              {interview
                ?.roundName ||
                "Interview Evaluation"}
            </h2>
          </div>

          <div className="eval-active-round-meta">
            <span>
              {getEvaluatorName(
                evaluation
              )}
            </span>

            <strong>
              {formatDateTime(
                evaluation
                  ?.evaluatedAt
              )}
            </strong>
          </div>
        </div>

        {roundLoading ? (
          <div className="eval-round-loading">
            Loading round...
          </div>
        ) : (
          <>
            {/* =============================================
                SCORE SUMMARY
            ============================================== */}

            <div className="eval-detail-top-grid">
              <article className="eval-overall-card">
                <span>
                  Rating
                </span>

                <div className="eval-overall-score">
                  <strong>
                    {overallRating.toFixed(
                      1
                    )}
                  </strong>

                  <small>
                    /5
                  </small>
                </div>
              </article>

              <article className="eval-info-card">
                <span>
                  Recommendation
                </span>

                <strong className="eval-info-highlight">
                  {recommendationLabel(
                    evaluation
                      ?.recommendation
                  )}
                </strong>
              </article>

              <article className="eval-info-card">
                <span>
                  Evaluated By
                </span>

                <strong className="eval-info-highlight">
                  {getEvaluatorName(
                    evaluation
                  )}
                </strong>

                {(evaluation
                  ?.evaluatedBy
                  ?.email ||
                  evaluation
                    ?.interviewer
                    ?.email) ? (
                  <small>
                    {evaluation
                      ?.evaluatedBy
                      ?.email ||
                      evaluation
                        ?.interviewer
                        ?.email}
                  </small>
                ) : null}
              </article>

              <article
                className={
                  [
                    "eval-info-card",
                    "eval-info-card--decision",

                    decision
                      ? `eval-info-card--${decision.toLowerCase()}`
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
                <span>
                  Decision
                </span>

                <strong className="eval-info-highlight">
                  {decisionLabel(
                    decision
                  )}
                </strong>
              </article>
            </div>

            {/* =============================================
                RATINGS
            ============================================== */}

            <section className="eval-detail-card">
              <div className="eval-detail-card-header">
                <h2>
                  Scorecard
                </h2>

                <strong className="eval-score-total">
                  {overallRating.toFixed(
                    1
                  )}
                  /5
                </strong>
              </div>

              <div className="eval-ratings-grid">
                {ratingItems.map(
                  (
                    item
                  ) => {
                    const value =
                      Number(
                        evaluation?.[
                          item.key
                        ] ||
                          0
                      );

                    return (
                      <div
                        className="eval-rating-item"
                        key={
                          item.key
                        }
                      >
                        <div className="eval-rating-item-top">
                          <span>
                            {
                              item.label
                            }
                          </span>

                          <strong>
                            {value}
                            /5
                          </strong>
                        </div>

                        <div className="eval-rating-track">
                          <div
                            className="eval-rating-fill"
                            style={{
                              width:
                                `${Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    value *
                                      20
                                  )
                                )}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </section>

            {/* =============================================
                FEEDBACK
            ============================================== */}

            <section className="eval-feedback-grid">
              <article className="eval-detail-card">
                <div className="eval-detail-card-header">
                  <h2>
                    Strengths
                  </h2>
                </div>

                <p className="eval-long-text">
                  {evaluation
                    ?.strengths ||
                    "—"}
                </p>
              </article>

              <article className="eval-detail-card">
                <div className="eval-detail-card-header">
                  <h2>
                    Concerns
                  </h2>
                </div>

                <p className="eval-long-text">
                  {evaluation
                    ?.concerns ||
                    "—"}
                </p>
              </article>
            </section>

            {evaluation
              ?.remarks ? (
              <section className="eval-detail-card">
                <div className="eval-detail-card-header">
                  <h2>
                    Remarks
                  </h2>
                </div>

                <p className="eval-long-text">
                  {
                    evaluation.remarks
                  }
                </p>
              </section>
            ) : null}

            {/* =============================================
                ATTACHMENT

                Only shown when there actually is a document.
            ============================================== */}

            {attachment
              ?.storedName ? (
              <section className="eval-detail-card">
                <div className="eval-detail-card-header">
                  <h2>
                    Evaluation Document
                  </h2>

                  <button
                    type="button"
                    className="eval-secondary-button"
                    onClick={
                      handleOpenAttachment
                    }
                    disabled={
                      fileBusy
                    }
                  >
                    {fileBusy
                      ? "Opening..."
                      : "Open"}
                  </button>
                </div>

                <div className="eval-file-row">
                  <div className="eval-file-icon">
                    PDF
                  </div>

                  <div>
                    <strong>
                      {attachment
                        ?.originalName ||
                        "Evaluation Document"}
                    </strong>
                  </div>
                </div>
              </section>
            ) : null}

            {/* =============================================
                DECISION EMAIL

                Keep functionality, remove unnecessary prose.
            ============================================== */}

            {(email
              ?.status ||
              email
                ?.email ||
              candidate
                ?.email) ? (
              <section className="eval-detail-card">
                <div className="eval-detail-card-header">
                  <h2>
                    Decision Email
                  </h2>

                  {email
                    ?.status !==
                    "SENT" ? (
                    <button
                      type="button"
                      className="eval-secondary-button"
                      onClick={
                        handleResendEmail
                      }
                      disabled={
                        mailBusy
                      }
                    >
                      {mailBusy
                        ? "Sending..."
                        : "Send Again"}
                    </button>
                  ) : null}
                </div>

                <div className="eval-email-grid">
                  <div>
                    <span>
                      Status
                    </span>

                    <strong
                      className={
                        `eval-email-status eval-email-status--${String(
                          email
                            ?.status ||
                            "NOT_SENT"
                        ).toLowerCase()}`
                      }
                    >
                      {niceValue(
                        email
                          ?.status ||
                          "NOT_SENT"
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Candidate
                    </span>

                    <strong>
                      {email
                        ?.email ||
                        candidate
                          ?.email ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Sent
                    </span>

                    <strong>
                      {formatDateTime(
                        email
                          ?.sentAt
                      )}
                    </strong>
                  </div>
                </div>

                {email
                  ?.error ? (
                  <div className="eval-email-error">
                    {
                      email.error
                    }
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* =============================================
                SELECTION

                Keep actual workflow action only.
            ============================================== */}

            {decision ===
            "SELECTED" ? (
              <section className="eval-selection-card">
                <div>
                  <span>
                    Selection
                  </span>

                  <strong>
                    {selection
                      ?.selectionNumber ||
                      "Selected Candidate"}
                  </strong>

                  {selection
                    ?.workflow
                    ?.stageLabel ? (
                    <small>
                      {
                        selection
                          .workflow
                          .stageLabel
                      }
                    </small>
                  ) : null}
                </div>

                {selection ? (
                  <button
                    type="button"
                    className="eval-primary-button"
                    onClick={
                      openSelection
                    }
                  >
                    Open Selection
                  </button>
                ) : null}
              </section>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

export default EvaluationDetailPage;
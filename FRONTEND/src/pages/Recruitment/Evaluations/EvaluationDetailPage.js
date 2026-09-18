import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getEvaluation,
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

  const evaluationId =
    params.get(
      "id"
    );

  const [
    evaluation,
    setEvaluation,
  ] =
    useState(null);

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
     LOAD
  ===================================================== */

  const load =
    useCallback(
      async () => {
        if (
          !evaluationId
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

          const data =
            await getEvaluation(
              evaluationId
            );

          setEvaluation(
            data
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
      [evaluationId]
    );

  useEffect(
    () => {
      load();
    },
    [load]
  );

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

  const requirement =
    evaluation
      ?.manpowerRequirement ||
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

  const averageLabel =
    useMemo(
      () => {
        if (
          overallRating >=
          4.5
        ) {
          return "Excellent";
        }

        if (
          overallRating >=
          4
        ) {
          return "Strong";
        }

        if (
          overallRating >=
          3
        ) {
          return "Good";
        }

        if (
          overallRating >=
          2
        ) {
          return "Needs Review";
        }

        return "Low";
      },
      [
        overallRating,
      ]
    );

  /* =====================================================
     NAV
  ===================================================== */

  const goBack =
    () => {
      const url =
        new URL(
          window.location.href
        );

      url.searchParams.set(
        "page",
        "evaluations"
      );

      url.searchParams.delete(
        "id"
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
     ATTACHMENT
  ===================================================== */

  const handleOpenAttachment =
    async () => {
      if (
        !evaluationId
      ) {
        return;
      }

      try {
        setFileBusy(
          true
        );

        await openEvaluationAttachment(
          evaluationId
        );
      } catch (
        err
      ) {
        setError(
          err?.response
            ?.data
            ?.message ||
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
      try {
        setMailBusy(
          true
        );

        setError("");

        await resendEvaluationDecisionEmail(
          evaluationId
        );

        await load();
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
     STATES
  ===================================================== */

  if (loading) {
    return (
      <div className="eval-detail-loading">
        Loading evaluation...
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

        <button
          type="button"
          onClick={
            goBack
          }
        >
          Back to Evaluations
        </button>
      </div>
    );
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="eval-detail-page">
      <button
        type="button"
        className="eval-back-button"
        onClick={
          goBack
        }
      >
        ← Evaluations
      </button>

      {/* =================================================
          HERO
      ================================================== */}

      <section
        className={
          `eval-detail-hero eval-detail-hero--${decision.toLowerCase()}`
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

          <div>
            <div className="eval-detail-eyebrow">
              INTERVIEW EVALUATION
            </div>

            <h1>
              {candidate
                ?.fullName ||
                "Candidate"}
            </h1>

            <p>
              {candidate
                ?.positionTitle ||
                interview
                  ?.positionTitle ||
                requirement
                  ?.positionTitle ||
                "Position"}

              {" · "}

              {interview
                ?.roundName ||
                "Interview"}
            </p>
          </div>
        </div>

        <div className="eval-detail-decision-block">
          <span>
            Final Decision
          </span>

          <strong>
            {niceValue(
              decision
            )}
          </strong>

          <small>
            {formatDateTime(
              evaluation
                ?.evaluatedAt
            )}
          </small>
        </div>
      </section>

      {error ? (
        <div className="eval-error-box eval-error-box--detail">
          {error}
        </div>
      ) : null}

      {/* =================================================
          TOP GRID
      ================================================== */}

      <section className="eval-detail-top-grid">
        <article className="eval-overall-card">
          <span className="eval-card-kicker">
            OVERALL RATING
          </span>

          <div className="eval-overall-score">
            <strong>
              {overallRating.toFixed(
                1
              )}
            </strong>

            <span>
              / 5
            </span>
          </div>

          <div className="eval-overall-label">
            {averageLabel}
          </div>
        </article>

        <article className="eval-info-card">
          <span className="eval-card-kicker">
            RECOMMENDATION
          </span>

          <strong className="eval-info-highlight">
            {niceValue(
              evaluation
                ?.recommendation
            )}
          </strong>

          <p>
            Final interview
            recommendation recorded
            by evaluator.
          </p>
        </article>

        <article className="eval-info-card">
          <span className="eval-card-kicker">
            EVALUATED BY
          </span>

          <strong className="eval-info-highlight">
            {evaluation
              ?.evaluatedBy
              ?.displayName ||
              evaluation
                ?.interviewer
                ?.displayName ||
              "—"}
          </strong>

          <p>
            {evaluation
              ?.evaluatedBy
              ?.email ||
              evaluation
                ?.interviewer
                ?.email ||
              ""}
          </p>
        </article>
      </section>

      {/* =================================================
          RATINGS
      ================================================== */}

      <section className="eval-detail-card">
        <div className="eval-detail-card-header">
          <div>
            <span>
              INTERVIEW SCORECARD
            </span>

            <h2>
              Evaluation Ratings
            </h2>
          </div>
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
                      {item.label}
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
                          `${
                            value *
                            20
                          }%`,
                      }}
                    />
                  </div>
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* =================================================
          WRITTEN FEEDBACK
      ================================================== */}

      <section className="eval-feedback-grid">
        <article className="eval-detail-card">
          <div className="eval-detail-card-header">
            <div>
              <span>
                POSITIVE SIGNALS
              </span>

              <h2>
                Strengths
              </h2>
            </div>
          </div>

          <p className="eval-long-text">
            {evaluation
              ?.strengths ||
              "No strengths were added."}
          </p>
        </article>

        <article className="eval-detail-card">
          <div className="eval-detail-card-header">
            <div>
              <span>
                REVIEW POINTS
              </span>

              <h2>
                Concerns
              </h2>
            </div>
          </div>

          <p className="eval-long-text">
            {evaluation
              ?.concerns ||
              "No concerns were added."}
          </p>
        </article>
      </section>

      <section className="eval-detail-card">
        <div className="eval-detail-card-header">
          <div>
            <span>
              EVALUATOR NOTES
            </span>

            <h2>
              Remarks
            </h2>
          </div>
        </div>

        <p className="eval-long-text">
          {evaluation
            ?.remarks ||
            "No additional remarks were added."}
        </p>
      </section>

      {/* =================================================
          DOCUMENT
      ================================================== */}

      {attachment
        ?.storedName ? (
        <section className="eval-detail-card">
          <div className="eval-detail-card-header">
            <div>
              <span>
                INTERVIEW RECORD
              </span>

              <h2>
                Evaluation Document
              </h2>
            </div>

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
                : "Open Document"}
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

              <span>
                Uploaded with
                interview evaluation
              </span>
            </div>
          </div>
        </section>
      ) : null}

      {/* =================================================
          EMAIL
      ================================================== */}

      <section className="eval-detail-card">
        <div className="eval-detail-card-header">
          <div>
            <span>
              CANDIDATE COMMUNICATION
            </span>

            <h2>
              Decision Email
            </h2>
          </div>

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
              Sent At
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
            {email.error}
          </div>
        ) : null}
      </section>

      {/* =================================================
          SELECTION
      ================================================== */}

      {decision ===
      "SELECTED" ? (
        <section className="eval-selection-card">
          <div>
            <span className="eval-selection-kicker">
              POST-SELECTION WORKFLOW
            </span>

            <h2>
              {selection
                ? "Selection workflow started"
                : "Selection workflow is being prepared"}
            </h2>

            {selection ? (
              <>
                <p>
                  {selection
                    .selectionNumber}

                  {" · "}

                  {selection
                    ?.workflow
                    ?.stageLabel ||
                    niceValue(
                      selection
                        ?.status
                    )}
                </p>

                <div className="eval-selection-progress">
                  <div className="eval-selection-progress-track">
                    <div
                      className="eval-selection-progress-fill"
                      style={{
                        width:
                          `${
                            selection
                              ?.workflow
                              ?.progressPercent ||
                            10
                          }%`,
                      }}
                    />
                  </div>

                  <span>
                    {selection
                      ?.workflow
                      ?.progressPercent ||
                      10}
                    %
                  </span>
                </div>
              </>
            ) : (
              <p>
                The selected candidate
                record is not available
                yet. The backend can
                recreate it safely from
                the evaluation if needed.
              </p>
            )}
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
    </div>
  );
}

export default EvaluationDetailPage;
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  cancelInterview,
  checkInInterview,
  getInterview,
  rescheduleInterview,
} from "../../../services/interviewService";

import RecruitmentStatusBadge from "../components/RecruitmentStatusBadge";

import InterviewEvaluationPanel from "./InterviewEvaluationPanel";

import {
  buildCandidateDetailUrl,
  buildRecruitmentUrl,
  formatRecruitmentDate,
  formatRecruitmentDateTime,
  formatRecruitmentTime,
  getApiErrorMessage,
  getRecordId,
  safeText,
} from "../utils/recruitmentHelpers";

import "./Interviews.css";

/* =========================================================
   CONFIG
========================================================= */

const DEFAULT_TIMEZONE =
  "Asia/Kolkata";

/* =========================================================
   STATUS TONE
========================================================= */

const statusTone = (
  status
) => {
  const value =
    String(
      status ||
        ""
    )
      .trim()
      .toUpperCase();

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
   DATE KEY
========================================================= */

const getDateKeyInTimeZone =
  (
    value,
    timezone =
      DEFAULT_TIMEZONE
  ) => {
    if (
      !value
    ) {
      return "";
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
      return "";
    }

    try {
      const parts =
        new Intl.DateTimeFormat(
          "en-CA",
          {
            timeZone:
              timezone,

            year:
              "numeric",

            month:
              "2-digit",

            day:
              "2-digit",
          }
        ).formatToParts(
          date
        );

      const values =
        {};

      parts.forEach(
        (
          part
        ) => {
          if (
            part.type !==
            "literal"
          ) {
            values[
              part.type
            ] =
              part.value;
          }
        }
      );

      if (
        !values.year ||
        !values.month ||
        !values.day
      ) {
        return "";
      }

      return `${values.year}-${values.month}-${values.day}`;
    } catch (
      error
    ) {
      console.error(
        "Date timezone conversion failed:",
        error
      );

      return "";
    }
  };

/* =========================================================
   MINIMUM DATETIME
========================================================= */

const getMinimumDateTime =
  () => {
    const value =
      new Date(
        Date.now() +
          60 *
            1000
      );

    value.setSeconds(
      0,
      0
    );

    value.setMinutes(
      value.getMinutes() -
        value.getTimezoneOffset()
    );

    return value
      .toISOString()
      .slice(
        0,
        16
      );
  };

/* =========================================================
   EMAIL STATUS
========================================================= */

const normalizeEmailStatus = (
  value
) =>
  String(
    value ||
      "NOT_SENT"
  )
    .trim()
    .toUpperCase();

const getEmailStatusMeta = (
  value
) => {
  const status =
    normalizeEmailStatus(
      value
    );

  if (
    status ===
    "SENT"
  ) {
    return {
      label:
        "Sent",

      symbol:
        "✓",

      tone:
        "success",
    };
  }

  if (
    status ===
    "FAILED"
  ) {
    return {
      label:
        "Failed",

      symbol:
        "!",

      tone:
        "danger",
    };
  }

  if (
    status ===
    "PENDING"
  ) {
    return {
      label:
        "Pending",

      symbol:
        "…",

      tone:
        "pending",
    };
  }

  return {
    label:
      "Not Sent",

    symbol:
      "—",

    tone:
      "neutral",
  };
};

/* =========================================================
   COMPONENT
========================================================= */

const InterviewDetailPage =
  () => {
    const location =
      useLocation();

    const navigate =
      useNavigate();

    /* =====================================================
       PARAMS
    ===================================================== */

    const params =
      useMemo(
        () =>
          new URLSearchParams(
            location.search
          ),
        [
          location.search,
        ]
      );

    const interviewId =
      params.get(
        "id"
      ) || "";

    /* =====================================================
       PAGE STATE
    ===================================================== */

    const [
      interview,
      setInterview,
    ] = useState(
      null
    );

    const [
      loading,
      setLoading,
    ] = useState(
      true
    );

    const [
      error,
      setError,
    ] = useState(
      ""
    );

    const [
      submitting,
      setSubmitting,
    ] = useState(
      false
    );

    /* =====================================================
       ACTION MODAL STATE

       action:
       CHECK_IN
       RESCHEDULE
       CANCEL

       phase:
       FORM
       PROCESSING
       SUCCESS
       ERROR
    ===================================================== */

    const [
      action,
      setAction,
    ] = useState(
      ""
    );

    const [
      actionPhase,
      setActionPhase,
    ] = useState(
      "FORM"
    );

    const [
      actionMessage,
      setActionMessage,
    ] = useState(
      ""
    );

    const [
      newDate,
      setNewDate,
    ] = useState(
      ""
    );

    const [
      actionReason,
      setActionReason,
    ] = useState(
      ""
    );

    /* =====================================================
       LOAD
    ===================================================== */

    const load =
      useCallback(
        async () => {
          if (
            !interviewId
          ) {
            setError(
              "Interview ID is missing."
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

            setError(
              ""
            );

            const result =
              await getInterview(
                interviewId
              );

            setInterview(
              result
            );
          } catch (
            loadError
          ) {
            setInterview(
              null
            );

            setError(
              getApiErrorMessage(
                loadError,
                "Interview could not be loaded."
              )
            );
          } finally {
            setLoading(
              false
            );
          }
        },
        [
          interviewId,
        ]
      );

    /* =====================================================
       SILENT REFRESH

       Used after modal actions.
       Does not replace page with loading skeleton.
    ===================================================== */

    const refreshInterview =
      useCallback(
        async () => {
          if (
            !interviewId
          ) {
            return null;
          }

          const result =
            await getInterview(
              interviewId
            );

          setInterview(
            result
          );

          return result;
        },
        [
          interviewId,
        ]
      );

    useEffect(() => {
      load();
    }, [
      load,
    ]);

    /* =====================================================
       STATUS
    ===================================================== */

    const status =
      String(
        interview?.status ||
          ""
      )
        .trim()
        .toUpperCase();

    const candidateId =
      getRecordId(
        interview
          ?.candidate
      );

    const candidateName =
      safeText(
        interview
          ?.candidate
          ?.fullName ||
          interview
            ?.candidateName,
        "Candidate"
      );

    /* =====================================================
       CHECK-IN ELIGIBILITY
    ===================================================== */

    const checkInEligibility =
      useMemo(
        () => {
          if (
            !interview
          ) {
            return {
              allowed:
                false,

              state:
                "INVALID",

              title:
                "Check-in Unavailable",

              message:
                "Interview information is unavailable.",
            };
          }

          if (
            ![
              "SCHEDULED",
              "RESCHEDULED",
            ].includes(
              String(
                interview
                  ?.status ||
                  ""
              )
                .trim()
                .toUpperCase()
            )
          ) {
            return {
              allowed:
                false,

              state:
                "STATUS_BLOCKED",

              title:
                "Check-in Unavailable",

              message:
                "Candidate cannot be checked in at the current interview stage.",
            };
          }

          const timezone =
            String(
              interview
                ?.timezone ||
                DEFAULT_TIMEZONE
            ).trim();

          const interviewDate =
            getDateKeyInTimeZone(
              interview
                ?.scheduledAt,
              timezone
            );

          const today =
            getDateKeyInTimeZone(
              new Date(),
              timezone
            );

          if (
            !interviewDate ||
            !today
          ) {
            return {
              allowed:
                false,

              state:
                "INVALID",

              title:
                "Schedule Unavailable",

              message:
                "Interview schedule could not be validated. Please refresh or reschedule the interview.",
            };
          }

          if (
            today <
            interviewDate
          ) {
            return {
              allowed:
                false,

              state:
                "EARLY",

              title:
                "Check-in Not Open Yet",

              message:
                `Check-in will be available on ${formatRecruitmentDate(
                  interview
                    ?.scheduledAt
                )}.`,
            };
          }

          if (
            today >
            interviewDate
          ) {
            return {
              allowed:
                false,

              state:
                "EXPIRED",

              title:
                "Reschedule Required",

              message:
                "Interview date has passed. Please reschedule the interview before checking in the candidate.",
            };
          }

          return {
            allowed:
              true,

            state:
              "TODAY",

            title:
              "Candidate Check-in",

            message:
              "Candidate can be checked in today.",
          };
        },
        [
          interview,
        ]
      );

    /* =====================================================
       EVALUATION ELIGIBILITY

       IMPORTANT:
       Evaluation only opens after check-in.
    ===================================================== */

    const evaluationEligibility =
      useMemo(
        () => {
          if (
            status ===
            "CHECKED_IN"
          ) {
            return {
              allowed:
                true,

              title:
                "Complete Evaluation",

              message:
                "Candidate is checked in. Interview evaluation is ready.",
            };
          }

          if (
            status ===
            "COMPLETED"
          ) {
            return {
              allowed:
                false,

              title:
                "Evaluation Completed",

              message:
                "This interview has already been completed.",
            };
          }

          return {
            allowed:
              false,

            title:
              "Evaluation Locked",

            message:
              "Check in the candidate first. Evaluation will unlock automatically after check-in.",
          };
        },
        [
          status,
        ]
      );

    /* =====================================================
       EMAIL STATUS
    ===================================================== */

    const candidateEmailMeta =
      useMemo(
        () =>
          getEmailStatusMeta(
            interview
              ?.candidateEmail
              ?.status
          ),
        [
          interview,
        ]
      );

    const interviewerEmailMeta =
      useMemo(
        () =>
          getEmailStatusMeta(
            interview
              ?.interviewerEmail
              ?.status
          ),
        [
          interview,
        ]
      );

    const checkInWelcomeEmailMeta =
      useMemo(
        () =>
          getEmailStatusMeta(
            interview
              ?.checkInWelcomeEmail
              ?.status
          ),
        [
          interview,
        ]
      );

    /* =====================================================
       RESET / OPEN ACTION
    ===================================================== */

    const resetActionState =
      () => {
        setActionPhase(
          "FORM"
        );

        setActionMessage(
          ""
        );

        setNewDate(
          ""
        );

        setActionReason(
          ""
        );
      };

    const openCheckIn =
      () => {
        if (
          !checkInEligibility
            .allowed
        ) {
          setError(
            checkInEligibility
              .message
          );

          return;
        }

        setError(
          ""
        );

        resetActionState();

        setAction(
          "CHECK_IN"
        );
      };

    const openReschedule =
      () => {
        setError(
          ""
        );

        resetActionState();

        setAction(
          "RESCHEDULE"
        );
      };

    const openCancel =
      () => {
        setError(
          ""
        );

        resetActionState();

        setAction(
          "CANCEL"
        );
      };

    /* =====================================================
       CLOSE ACTION

       Processing cannot be interrupted.
    ===================================================== */

    const closeAction =
      () => {
        if (
          submitting ||
          actionPhase ===
            "PROCESSING"
        ) {
          return;
        }

        setAction(
          ""
        );

        resetActionState();
      };

    /* =====================================================
       CHECK-IN
    ===================================================== */

    const submitCheckIn =
      async () => {
        if (
          !checkInEligibility
            .allowed
        ) {
          setActionPhase(
            "ERROR"
          );

          setActionMessage(
            checkInEligibility
              .message
          );

          return;
        }

        try {
          setSubmitting(
            true
          );

          setError(
            ""
          );

          setActionPhase(
            "PROCESSING"
          );

          setActionMessage(
            "Recording candidate arrival and preparing the welcome communication..."
          );

          await checkInInterview(
            interviewId,
            {
              checkInToken:
                interview
                  ?.checkInToken ||
                undefined,
            }
          );

          const refreshed =
            await refreshInterview();

          const welcomeStatus =
            normalizeEmailStatus(
              refreshed
                ?.checkInWelcomeEmail
                ?.status
            );

          setActionPhase(
            "SUCCESS"
          );

          if (
            welcomeStatus ===
            "SENT"
          ) {
            setActionMessage(
              `${candidateName} has been successfully checked in. The welcome email and company brochure have also been sent.`
            );
          } else if (
            welcomeStatus ===
            "FAILED"
          ) {
            setActionMessage(
              `${candidateName} has been successfully checked in. The welcome email could not be delivered, but the check-in itself is safely recorded.`
            );
          } else {
            setActionMessage(
              `${candidateName} has been successfully checked in. The candidate arrival is now recorded against this interview.`
            );
          }
        } catch (
          submitError
        ) {
          setActionPhase(
            "ERROR"
          );

          setActionMessage(
            getApiErrorMessage(
              submitError,
              "Candidate could not be checked in."
            )
          );
        } finally {
          setSubmitting(
            false
          );
        }
      };

    /* =====================================================
       RESCHEDULE
    ===================================================== */

    const submitReschedule =
      async () => {
        if (
          !newDate
        ) {
          setActionPhase(
            "ERROR"
          );

          setActionMessage(
            "Please select the new interview date and time."
          );

          return;
        }

        const selectedDate =
          new Date(
            newDate
          );

        if (
          Number.isNaN(
            selectedDate.getTime()
          )
        ) {
          setActionPhase(
            "ERROR"
          );

          setActionMessage(
            "Please select a valid interview date and time."
          );

          return;
        }

        if (
          selectedDate.getTime() <=
          Date.now()
        ) {
          setActionPhase(
            "ERROR"
          );

          setActionMessage(
            "The new interview date and time must be in the future."
          );

          return;
        }

        try {
          setSubmitting(
            true
          );

          setActionPhase(
            "PROCESSING"
          );

          setActionMessage(
            "Updating the interview schedule..."
          );

          await rescheduleInterview(
            interviewId,
            {
              scheduledAt:
                selectedDate
                  .toISOString(),

              reason:
                actionReason
                  .trim(),

              remarks:
                actionReason
                  .trim(),
            }
          );

          await refreshInterview();

          setActionPhase(
            "SUCCESS"
          );

          setActionMessage(
            `Interview has been rescheduled successfully to ${formatRecruitmentDate(
              selectedDate
            )} at ${formatRecruitmentTime(
              selectedDate
            )}.`
          );
        } catch (
          submitError
        ) {
          setActionPhase(
            "ERROR"
          );

          setActionMessage(
            getApiErrorMessage(
              submitError,
              "Interview could not be rescheduled."
            )
          );
        } finally {
          setSubmitting(
            false
          );
        }
      };

    /* =====================================================
       CANCEL
    ===================================================== */

    const submitCancel =
      async () => {
        if (
          !actionReason
            .trim()
        ) {
          setActionPhase(
            "ERROR"
          );

          setActionMessage(
            "Please enter a cancellation reason before continuing."
          );

          return;
        }

        try {
          setSubmitting(
            true
          );

          setActionPhase(
            "PROCESSING"
          );

          setActionMessage(
            "Cancelling the interview and updating the candidate workflow..."
          );

          await cancelInterview(
            interviewId,
            {
              reason:
                actionReason
                  .trim(),

              cancellationReason:
                actionReason
                  .trim(),
            }
          );

          await refreshInterview();

          setActionPhase(
            "SUCCESS"
          );

          setActionMessage(
            "Interview has been cancelled successfully and the recruitment workflow has been updated."
          );
        } catch (
          submitError
        ) {
          setActionPhase(
            "ERROR"
          );

          setActionMessage(
            getApiErrorMessage(
              submitError,
              "Interview could not be cancelled."
            )
          );
        } finally {
          setSubmitting(
            false
          );
        }
      };

    /* =====================================================
       SUCCESS DONE
    ===================================================== */

    const finishAction =
      () => {
        setAction(
          ""
        );

        resetActionState();

        setError(
          ""
        );
      };

    /* =====================================================
       ERROR ACTION
    ===================================================== */

    const retryAction =
      () => {
        setActionPhase(
          "FORM"
        );

        setActionMessage(
          ""
        );
      };

    /* =====================================================
       LOADING
    ===================================================== */

    if (
      loading
    ) {
      return (
        <section className="se-interview-detail-page">
          <div className="se-interview-detail-loading">
            <span />
            <span />
            <span />
          </div>
        </section>
      );
    }

    /* =====================================================
       FATAL
    ===================================================== */

    if (
      !interview
    ) {
      return (
        <section className="se-interview-detail-page">
          <div className="se-interview-detail-fatal">
            <span>
              !
            </span>

            <h2>
              Interview unavailable
            </h2>

            <p>
              {
                error
              }
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  buildRecruitmentUrl(
                    "interviews"
                  )
                )
              }
            >
              Back to Interviews
            </button>
          </div>
        </section>
      );
    }

    /* =====================================================
       RENDER
    ===================================================== */

    return (
      <section className="se-interview-detail-page">
        {/* =================================================
            TOP BAR
        ================================================== */}

        <div className="se-interview-detail-topbar">
          <button
            type="button"
            onClick={() =>
              navigate(
                buildRecruitmentUrl(
                  "interviews"
                )
              )
            }
          >
            ← Interviews
          </button>

          <button
            type="button"
            onClick={
              load
            }
            disabled={
              submitting
            }
          >
            ↻ Refresh
          </button>
        </div>

        {/* =================================================
            HERO
        ================================================== */}

        <section className="se-interview-detail-hero">
          <div className="se-interview-detail-main">
            <div className="se-interview-detail-label">
              <span>
                {safeText(
                  interview
                    ?.interviewNumber,
                  "INTERVIEW"
                )}
              </span>

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
                  statusTone(
                    interview
                      ?.status
                  )
                }
              />
            </div>

            <h1>
              {
                candidateName
              }
            </h1>

            <p>
              {safeText(
                interview
                  ?.positionTitle,
                "Position"
              )}

              {" · "}

              {safeText(
                interview
                  ?.roundName,
                `Round ${
                  interview
                    ?.roundNumber ||
                  1
                }`
              )}
            </p>

            <div className="se-interview-detail-buttons">
              {candidateId ? (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      buildCandidateDetailUrl(
                        candidateId
                      )
                    )
                  }
                >
                  Candidate Profile
                </button>
              ) : null}

              {![
                "COMPLETED",
                "CANCELLED",
                "NO_SHOW",
              ].includes(
                status
              ) ? (
                <>
                  <button
                    type="button"
                    onClick={
                      openReschedule
                    }
                    disabled={
                      submitting
                    }
                  >
                    Reschedule
                  </button>

                  <button
                    type="button"
                    className="danger"
                    onClick={
                      openCancel
                    }
                    disabled={
                      submitting
                    }
                  >
                    Cancel
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <div className="se-interview-date-card">
            <span>
              INTERVIEW DATE
            </span>

            <strong>
              {formatRecruitmentDate(
                interview
                  ?.scheduledAt
              )}
            </strong>

            <b>
              {formatRecruitmentTime(
                interview
                  ?.scheduledAt
              )}
            </b>

            <small>
              {Number(
                interview
                  ?.durationMinutes ||
                  45
              )}{" "}
              minutes
            </small>
          </div>
        </section>

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
            WORKFLOW ACTIONS
        ================================================== */}

        <div className="se-interview-control-grid">
          {/* ===============================================
              CHECK-IN
          ================================================ */}

          {![
            "CHECKED_IN",
            "COMPLETED",
            "CANCELLED",
            "NO_SHOW",
          ].includes(
            status
          ) ? (
            <button
              type="button"
              className={`checkin ${
                checkInEligibility
                  .state ===
                "TODAY"
                  ? "available"
                  : checkInEligibility
                        .state ===
                      "EXPIRED"
                    ? "expired"
                    : "waiting"
              }`}
              onClick={
                openCheckIn
              }
              disabled={
                submitting ||
                !checkInEligibility
                  .allowed
              }
            >
              <span>
                {checkInEligibility
                  .state ===
                "TODAY"
                  ? "✓"
                  : checkInEligibility
                        .state ===
                      "EXPIRED"
                    ? "!"
                    : "◷"}
              </span>

              <div>
                <strong>
                  {
                    checkInEligibility
                      .title
                  }
                </strong>

                <small>
                  {
                    checkInEligibility
                      .message
                  }
                </small>
              </div>
            </button>
          ) : null}

          {/* ===============================================
              CHECKED-IN CONFIRMATION
          ================================================ */}

          {status ===
          "CHECKED_IN" ? (
            <div className="se-interview-checkin-confirmed">
              <span>
                ✓
              </span>

              <div>
                <strong>
                  Candidate Checked In
                </strong>

                <small>
                  {interview
                    ?.checkedInAt
                    ? `Arrival confirmed ${formatRecruitmentDateTime(
                        interview
                          .checkedInAt
                      )}`
                    : "Candidate arrival has been confirmed."}
                </small>
              </div>
            </div>
          ) : null}

          {/* ===============================================
              EVALUATION

              LOCKED UNTIL CHECK-IN
          ================================================ */}

          {![
            "COMPLETED",
            "CANCELLED",
            "NO_SHOW",
          ].includes(
            status
          ) ? (
            evaluationEligibility
              .allowed ? (
              <InterviewEvaluationPanel
                interview={
                  interview
                }
                onCompleted={
                  load
                }
              />
            ) : (
              <button
                type="button"
                className="se-interview-evaluation-locked"
                disabled
                title={
                  evaluationEligibility
                    .message
                }
              >
                <span>
                  🔒
                </span>

                <div>
                  <strong>
                    {
                      evaluationEligibility
                        .title
                    }
                  </strong>

                  <small>
                    {
                      evaluationEligibility
                        .message
                    }
                  </small>
                </div>
              </button>
            )
          ) : null}
        </div>

        {/* =================================================
            DETAILS
        ================================================== */}

        <div className="se-interview-detail-grid">
          <article className="se-interview-detail-card">
            <header>
              <span>
                INTERVIEW DETAILS
              </span>

              <h3>
                Schedule & Mode
              </h3>
            </header>

            <div className="se-interview-info-grid">
              <div>
                <span>
                  Date
                </span>

                <strong>
                  {formatRecruitmentDate(
                    interview
                      ?.scheduledAt
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Time
                </span>

                <strong>
                  {formatRecruitmentTime(
                    interview
                      ?.scheduledAt
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Duration
                </span>

                <strong>
                  {Number(
                    interview
                      ?.durationMinutes ||
                      45
                  )}{" "}
                  mins
                </strong>
              </div>

              <div>
                <span>
                  Mode
                </span>

                <strong>
                  {safeText(
                    interview
                      ?.mode,
                    "—"
                  ).replaceAll(
                    "_",
                    " "
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Office
                </span>

                <strong>
                  {safeText(
                    interview
                      ?.officeLocationLabel ||
                      interview
                        ?.officeLocation,
                    "—"
                  ).replaceAll(
                    "_",
                    " "
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Checked In
                </span>

                <strong>
                  {interview
                    ?.checkedInAt
                    ? formatRecruitmentDateTime(
                        interview
                          .checkedInAt
                      )
                    : "Not yet"}
                </strong>
              </div>
            </div>

            {interview
              ?.meetingLink ? (
              <a
                className="se-interview-meeting-link"
                href={
                  interview
                    .meetingLink
                }
                target="_blank"
                rel="noreferrer"
              >
                Open Meeting Link

                <span>
                  ↗
                </span>
              </a>
            ) : null}
          </article>

          {/* ===============================================
              INTERVIEWER / EMAIL
          ================================================ */}

          <article className="se-interview-detail-card">
            <header>
              <span>
                INTERVIEWER
              </span>

              <h3>
                Interview Ownership
              </h3>
            </header>

            <div className="se-interviewer-profile">
              <span>
                {safeText(
                  interview
                    ?.interviewer
                    ?.displayName,
                  "I"
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
                      ?.interviewer
                      ?.displayName,
                    "Interviewer"
                  )}
                </strong>

                <small>
                  {safeText(
                    interview
                      ?.interviewer
                      ?.email,
                    "Employee"
                  )}
                </small>
              </div>
            </div>

            <div className="se-interview-email-heading">
              <span>
                COMMUNICATION
              </span>

              <strong>
                Email Delivery
              </strong>
            </div>

            <div className="se-interview-email-status">
              <div
                className={`email-state ${candidateEmailMeta.tone}`}
              >
                <span>
                  Candidate Invitation
                </span>

                <strong>
                  <b>
                    {
                      candidateEmailMeta
                        .symbol
                    }
                  </b>

                  {
                    candidateEmailMeta
                      .label
                  }
                </strong>

                {interview
                  ?.candidateEmail
                  ?.sentAt ? (
                  <small>
                    {formatRecruitmentDateTime(
                      interview
                        .candidateEmail
                        .sentAt
                    )}
                  </small>
                ) : null}
              </div>

              <div
                className={`email-state ${interviewerEmailMeta.tone}`}
              >
                <span>
                  Interviewer Notification
                </span>

                <strong>
                  <b>
                    {
                      interviewerEmailMeta
                        .symbol
                    }
                  </b>

                  {
                    interviewerEmailMeta
                      .label
                  }
                </strong>

                {interview
                  ?.interviewerEmail
                  ?.sentAt ? (
                  <small>
                    {formatRecruitmentDateTime(
                      interview
                        .interviewerEmail
                        .sentAt
                    )}
                  </small>
                ) : null}
              </div>

              {interview
                ?.checkedInAt ||
              status ===
                "CHECKED_IN" ||
              normalizeEmailStatus(
                interview
                  ?.checkInWelcomeEmail
                  ?.status
              ) !==
                "NOT_SENT" ? (
                <div
                  className={`email-state checkin-mail ${checkInWelcomeEmailMeta.tone}`}
                >
                  <span>
                    Welcome Email
                  </span>

                  <strong>
                    <b>
                      {
                        checkInWelcomeEmailMeta
                          .symbol
                      }
                    </b>

                    {
                      checkInWelcomeEmailMeta
                        .label
                    }
                  </strong>

                  {interview
                    ?.checkInWelcomeEmail
                    ?.sentAt ? (
                    <small>
                      {formatRecruitmentDateTime(
                        interview
                          .checkInWelcomeEmail
                          .sentAt
                      )}
                    </small>
                  ) : null}

                  {normalizeEmailStatus(
                    interview
                      ?.checkInWelcomeEmail
                      ?.status
                  ) ===
                    "FAILED" &&
                  interview
                    ?.checkInWelcomeEmail
                    ?.error ? (
                    <small className="error">
                      {safeText(
                        interview
                          .checkInWelcomeEmail
                          .error,
                        "Email delivery failed"
                      )}
                    </small>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="se-interview-email-summary">
              {status ===
              "CHECKED_IN" ? (
                <>
                  <span className="success">
                    ✓
                  </span>

                  <p>
                    Candidate check-in is
                    confirmed. Welcome
                    communication and the
                    company brochure are
                    tracked here.
                  </p>
                </>
              ) : (
                <>
                  <span>
                    ✉
                  </span>

                  <p>
                    Candidate invitation and
                    interviewer communication
                    are tracked automatically.
                  </p>
                </>
              )}
            </div>
          </article>
        </div>

        {/* =================================================
            REMARKS
        ================================================== */}

        {interview
          ?.remarks ? (
          <article className="se-interview-detail-card">
            <header>
              <span>
                NOTES
              </span>

              <h3>
                Interview Remarks
              </h3>
            </header>

            <p className="se-interview-remarks">
              {
                interview
                  .remarks
              }
            </p>
          </article>
        ) : null}

        {/* =================================================
            PREMIUM ACTION MODAL
        ================================================== */}

        {action ? (
          <div
            className="se-interview-modal-overlay"
            onMouseDown={(
              event
            ) => {
              if (
                event.target ===
                  event.currentTarget &&
                actionPhase !==
                  "PROCESSING"
              ) {
                closeAction();
              }
            }}
          >
            <section
              className={`se-interview-confirm-modal ${String(
                action
              ).toLowerCase()} ${String(
                actionPhase
              ).toLowerCase()}`}
              role="dialog"
              aria-modal="true"
              onMouseDown={(
                event
              ) =>
                event.stopPropagation()
              }
            >
              {/* ===========================================
                  FORM / CONFIRMATION
              ============================================ */}

              {actionPhase ===
              "FORM" ? (
                <>
                  <header className="se-interview-confirm-head">
                    <div
                      className={`se-interview-confirm-hero-icon ${
                        action ===
                        "CHECK_IN"
                          ? "green"
                          : action ===
                              "CANCEL"
                            ? "red"
                            : "amber"
                      }`}
                    >
                      {action ===
                      "CHECK_IN"
                        ? "✓"
                        : action ===
                            "CANCEL"
                          ? "!"
                          : "↻"}
                    </div>

                    <div>
                      <span>
                        {action ===
                        "CHECK_IN"
                          ? "CANDIDATE ARRIVAL"
                          : action ===
                              "CANCEL"
                            ? "INTERVIEW CANCELLATION"
                            : "INTERVIEW UPDATE"}
                      </span>

                      <h2>
                        {action ===
                        "CHECK_IN"
                          ? "Confirm Candidate Check-in"
                          : action ===
                              "CANCEL"
                            ? "Cancel Interview?"
                            : "Reschedule Interview"}
                      </h2>

                      <p>
                        {action ===
                        "CHECK_IN"
                          ? "Please verify the candidate and interview details before confirming arrival."
                          : action ===
                              "CANCEL"
                            ? "This will cancel the current interview and update the candidate workflow."
                            : "Choose the new interview date and confirm the schedule update."}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="se-interview-confirm-close"
                      onClick={
                        closeAction
                      }
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </header>

                  {/* =======================================
                      CHECK-IN SUMMARY
                  ======================================== */}

                  {action ===
                  "CHECK_IN" ? (
                    <>
                      <div className="se-interview-confirm-candidate">
                        <span>
                          {candidateName
                            .charAt(
                              0
                            )
                            .toUpperCase()}
                        </span>

                        <div>
                          <small>
                            CANDIDATE
                          </small>

                          <strong>
                            {
                              candidateName
                            }
                          </strong>

                          <p>
                            {safeText(
                              interview
                                ?.positionTitle,
                              "Position"
                            )}
                          </p>
                        </div>

                        <b>
                          TODAY
                        </b>
                      </div>

                      <div className="se-interview-confirm-details">
                        <div>
                          <span>
                            Interview
                          </span>

                          <strong>
                            {safeText(
                              interview
                                ?.roundName,
                              "Interview Round"
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Date
                          </span>

                          <strong>
                            {formatRecruitmentDate(
                              interview
                                ?.scheduledAt
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Time
                          </span>

                          <strong>
                            {formatRecruitmentTime(
                              interview
                                ?.scheduledAt
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Mode
                          </span>

                          <strong>
                            {safeText(
                              interview
                                ?.mode,
                              "—"
                            ).replaceAll(
                              "_",
                              " "
                            )}
                          </strong>
                        </div>
                      </div>

                      <div className="se-interview-confirm-notice green">
                        <span>
                          ✓
                        </span>

                        <div>
                          <strong>
                            What happens after confirmation?
                          </strong>

                          <p>
                            Candidate arrival will be recorded,
                            evaluation will unlock automatically,
                            and the welcome communication process
                            will start.
                          </p>
                        </div>
                      </div>
                    </>
                  ) : null}

                  {/* =======================================
                      RESCHEDULE
                  ======================================== */}

                  {action ===
                  "RESCHEDULE" ? (
                    <div className="se-interview-confirm-form">
                      <div className="se-interview-current-schedule">
                        <span>
                          CURRENT INTERVIEW
                        </span>

                        <strong>
                          {formatRecruitmentDate(
                            interview
                              ?.scheduledAt
                          )}
                          {" · "}
                          {formatRecruitmentTime(
                            interview
                              ?.scheduledAt
                          )}
                        </strong>
                      </div>

                      <label>
                        <span>
                          New Date & Time *
                        </span>

                        <input
                          type="datetime-local"
                          min={
                            getMinimumDateTime()
                          }
                          value={
                            newDate
                          }
                          onChange={(
                            event
                          ) => {
                            setActionMessage(
                              ""
                            );

                            setNewDate(
                              event
                                .target
                                .value
                            );
                          }}
                        />
                      </label>

                      <label>
                        <span>
                          Reason / Remarks
                        </span>

                        <textarea
                          value={
                            actionReason
                          }
                          maxLength={
                            1000
                          }
                          onChange={(
                            event
                          ) => {
                            setActionMessage(
                              ""
                            );

                            setActionReason(
                              event
                                .target
                                .value
                            );
                          }}
                          placeholder="Optional reason for changing the interview schedule..."
                        />
                      </label>
                    </div>
                  ) : null}

                  {/* =======================================
                      CANCEL
                  ======================================== */}

                  {action ===
                  "CANCEL" ? (
                    <div className="se-interview-confirm-form">
                      <div className="se-interview-cancel-warning">
                        <span>
                          !
                        </span>

                        <div>
                          <strong>
                            Cancellation requires confirmation
                          </strong>

                          <p>
                            The interview will no longer be active.
                            The candidate can be scheduled again
                            later if required.
                          </p>
                        </div>
                      </div>

                      <label>
                        <span>
                          Cancellation Reason *
                        </span>

                        <textarea
                          value={
                            actionReason
                          }
                          maxLength={
                            1000
                          }
                          onChange={(
                            event
                          ) => {
                            setActionMessage(
                              ""
                            );

                            setActionReason(
                              event
                                .target
                                .value
                            );
                          }}
                          placeholder="Please clearly explain why the interview is being cancelled..."
                        />
                      </label>
                    </div>
                  ) : null}

                  {actionMessage ? (
                    <div className="se-interview-confirm-inline-error">
                      <span>
                        !
                      </span>

                      <p>
                        {
                          actionMessage
                        }
                      </p>
                    </div>
                  ) : null}

                  <footer className="se-interview-confirm-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={
                        closeAction
                      }
                    >
                      {action ===
                      "CHECK_IN"
                        ? "Not Now"
                        : "Back"}
                    </button>

                    <button
                      type="button"
                      className={
                        action ===
                        "CHECK_IN"
                          ? "confirm-green"
                          : action ===
                              "CANCEL"
                            ? "confirm-red"
                            : "confirm-dark"
                      }
                      onClick={
                        action ===
                        "CHECK_IN"
                          ? submitCheckIn
                          : action ===
                              "CANCEL"
                            ? submitCancel
                            : submitReschedule
                      }
                    >
                      {action ===
                      "CHECK_IN"
                        ? "Confirm Check-in"
                        : action ===
                            "CANCEL"
                          ? "Confirm Cancellation"
                          : "Confirm Reschedule"}
                    </button>
                  </footer>
                </>
              ) : null}

              {/* ===========================================
                  PROCESSING
              ============================================ */}

              {actionPhase ===
              "PROCESSING" ? (
                <div className="se-interview-action-result processing">
                  <div className="se-interview-action-spinner" />

                  <span>
                    PLEASE WAIT
                  </span>

                  <h2>
                    {action ===
                    "CHECK_IN"
                      ? "Checking Candidate In"
                      : action ===
                          "CANCEL"
                        ? "Cancelling Interview"
                        : "Updating Interview"}
                  </h2>

                  <p>
                    {
                      actionMessage
                    }
                  </p>

                  <small>
                    Please do not close this window.
                  </small>
                </div>
              ) : null}

              {/* ===========================================
                  SUCCESS
              ============================================ */}

              {actionPhase ===
              "SUCCESS" ? (
                <div className="se-interview-action-result success">
                  <div className="se-interview-action-success-icon">
                    ✓
                  </div>

                  <span>
                    SUCCESS
                  </span>

                  <h2>
                    {action ===
                    "CHECK_IN"
                      ? "Check-in Confirmed"
                      : action ===
                          "CANCEL"
                        ? "Interview Cancelled"
                        : "Interview Rescheduled"}
                  </h2>

                  <p>
                    {
                      actionMessage
                    }
                  </p>

                  {action ===
                  "CHECK_IN" ? (
                    <div className="se-interview-success-next-step">
                      <span>
                        NEXT STEP
                      </span>

                      <strong>
                        Interview Evaluation is now unlocked
                      </strong>

                      <p>
                        The interviewer can now complete the
                        candidate assessment after the interview.
                      </p>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    className="done"
                    onClick={
                      finishAction
                    }
                  >
                    Done
                  </button>
                </div>
              ) : null}

              {/* ===========================================
                  ERROR
              ============================================ */}

              {actionPhase ===
              "ERROR" ? (
                <div className="se-interview-action-result error">
                  <div className="se-interview-action-error-icon">
                    !
                  </div>

                  <span>
                    ACTION NOT COMPLETED
                  </span>

                  <h2>
                    {action ===
                    "CHECK_IN"
                      ? "Check-in Could Not Be Completed"
                      : action ===
                          "CANCEL"
                        ? "Cancellation Failed"
                        : "Reschedule Failed"}
                  </h2>

                  <p>
                    {
                      actionMessage
                    }
                  </p>

                  <div className="se-interview-result-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={
                        closeAction
                      }
                    >
                      Close
                    </button>

                    {action ===
                      "CHECK_IN" &&
                    checkInEligibility
                      .state ===
                      "EXPIRED" ? (
                      <button
                        type="button"
                        className="primary"
                        onClick={() => {
                          resetActionState();

                          setAction(
                            "RESCHEDULE"
                          );
                        }}
                      >
                        Reschedule Interview
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="primary"
                        onClick={
                          retryAction
                        }
                      >
                        Try Again
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </section>
    );
  };

export default InterviewDetailPage;
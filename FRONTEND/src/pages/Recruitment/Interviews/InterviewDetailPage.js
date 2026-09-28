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
  getInterviews,
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

const DEFAULT_TIMEZONE = "Asia/Kolkata";

/* =========================================================
   NORMALIZERS
========================================================= */

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const normalizeEmailStatus = (value) =>
  String(value || "NOT_SENT")
    .trim()
    .toUpperCase();

/* =========================================================
   STATUS TONE
========================================================= */

const statusTone = (status) => {
  const value = normalizeStatus(status);

  if (value === "COMPLETED") {
    return "success";
  }

  if (
    value === "CANCELLED" ||
    value === "NO_SHOW"
  ) {
    return "danger";
  }

  if (value === "RESCHEDULED") {
    return "warning";
  }

  if (value === "CHECKED_IN") {
    return "purple";
  }

  return "blue";
};

/* =========================================================
   EMAIL STATUS
========================================================= */

const getEmailStatusMeta = (value) => {
  const status = normalizeEmailStatus(value);

  if (status === "SENT") {
    return {
      label: "Sent",
      symbol: "✓",
      tone: "success",
    };
  }

  if (status === "FAILED") {
    return {
      label: "Failed",
      symbol: "!",
      tone: "danger",
    };
  }

  if (status === "PENDING") {
    return {
      label: "Pending",
      symbol: "…",
      tone: "pending",
    };
  }

  return {
    label: "Not Sent",
    symbol: "—",
    tone: "neutral",
  };
};

/* =========================================================
   DATE HELPERS
========================================================= */

const getDateKeyInTimeZone = (
  value,
  timezone = DEFAULT_TIMEZONE
) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  try {
    const parts = new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(date);

    const values = {};

    parts.forEach((part) => {
      if (part.type !== "literal") {
        values[part.type] = part.value;
      }
    });

    if (
      !values.year ||
      !values.month ||
      !values.day
    ) {
      return "";
    }

    return `${values.year}-${values.month}-${values.day}`;
  } catch (error) {
    console.error(
      "Date timezone conversion failed:",
      error
    );

    return "";
  }
};

const getMinimumDateTime = () => {
  const value = new Date(
    Date.now() + 60 * 1000
  );

  value.setSeconds(0, 0);

  value.setMinutes(
    value.getMinutes() -
      value.getTimezoneOffset()
  );

  return value
    .toISOString()
    .slice(0, 16);
};

const getTimeValue = (value) => {
  const time = new Date(
    value || 0
  ).getTime();

  return Number.isNaN(time)
    ? 0
    : time;
};

/* =========================================================
   HISTORY HELPERS
========================================================= */

const getCandidateIdFromInterview = (item) =>
  getRecordId(item?.candidate) ||
  item?.candidateId ||
  "";

const getInterviewerName = (item) =>
  safeText(
    item?.interviewer?.displayName ||
      item?.interviewerName,
    "Not assigned"
  );

const getInterviewerEmail = (item) =>
  safeText(
    item?.interviewer?.email ||
      item?.interviewerEmailAddress,
    ""
  );

const getEvaluation = (item) =>
  item?.evaluation ||
  item?.interviewEvaluation ||
  item?.evaluationData ||
  null;

const getEvaluationDecision = (item) => {
  const evaluation = getEvaluation(item);

  const value =
    evaluation?.decision ||
    evaluation?.recommendation ||
    evaluation?.result ||
    item?.decision ||
    item?.recommendation ||
    item?.result ||
    "";

  return String(value)
    .trim()
    .replaceAll("_", " ");
};

const getEvaluationRating = (item) => {
  const evaluation = getEvaluation(item);

  const value =
    evaluation?.overallRating ??
    evaluation?.rating ??
    item?.overallRating ??
    item?.rating ??
    null;

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return value;
};

const getInterviewRemarks = (item) => {
  const evaluation = getEvaluation(item);

  return safeText(
    evaluation?.overallRemarks ||
      evaluation?.remarks ||
      evaluation?.comments ||
      evaluation?.feedback ||
      item?.evaluationRemarks ||
      item?.remarks,
    ""
  );
};

const getStrengths = (item) => {
  const evaluation = getEvaluation(item);

  return safeText(
    evaluation?.strengths,
    ""
  );
};

const getConcerns = (item) => {
  const evaluation = getEvaluation(item);

  return safeText(
    evaluation?.concerns,
    ""
  );
};

const getRoundResult = (item) => {
  const decision =
    getEvaluationDecision(item);

  if (decision) {
    return decision;
  }

  const status =
    normalizeStatus(item?.status);

  if (status === "COMPLETED") {
    return "Completed";
  }

  if (status === "CHECKED_IN") {
    return "Evaluation Pending";
  }

  if (status === "CANCELLED") {
    return "Cancelled";
  }

  if (status === "NO_SHOW") {
    return "No Show";
  }

  if (status === "RESCHEDULED") {
    return "Rescheduled";
  }

  return "Scheduled";
};

/* =========================================================
   SORT INTERVIEW HISTORY
========================================================= */

const sortInterviewHistory = (
  items = []
) =>
  [...items].sort((a, b) => {
    const roundA = Number(
      a?.roundNumber || 0
    );

    const roundB = Number(
      b?.roundNumber || 0
    );

    if (roundA !== roundB) {
      return roundA - roundB;
    }

    return (
      getTimeValue(a?.scheduledAt) -
      getTimeValue(b?.scheduledAt)
    );
  });

/* =========================================================
   DEDUPLICATE INTERVIEW HISTORY

   IMPORTANT:
   The API/list response can contain the same interview more
   than once. We must NEVER show the same interview card twice.

   Priority:
   1. Mongo record ID
   2. interviewNumber
   3. candidate + round + schedule fallback
========================================================= */

const dedupeInterviewHistory = (
  items = []
) => {
  const seen = new Set();

  return items.filter((item) => {
    const recordId =
      getRecordId(item);

    const interviewNumber =
      String(
        item?.interviewNumber || ""
      ).trim();

    const key = recordId
      ? `id:${String(recordId)}`
      : interviewNumber
        ? `number:${interviewNumber}`
        : [
            String(
              getCandidateIdFromInterview(
                item
              ) || ""
            ),
            String(
              item?.roundNumber || ""
            ),
            String(
              item?.roundName || ""
            ),
            String(
              item?.scheduledAt || ""
            ),
          ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
};

/* =========================================================
   COMPONENT
========================================================= */

const InterviewDetailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  /* =====================================================
     PARAMS
  ===================================================== */

  const params = useMemo(
    () =>
      new URLSearchParams(
        location.search
      ),
    [location.search]
  );

  const interviewId =
    params.get("id") || "";

  /* =====================================================
     STATE
  ===================================================== */

  const [
    interview,
    setInterview,
  ] = useState(null);

  const [
    interviewHistory,
    setInterviewHistory,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    historyError,
    setHistoryError,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  /* =====================================================
     ACTION MODAL
  ===================================================== */

  const [
    action,
    setAction,
  ] = useState("");

  const [
    actionPhase,
    setActionPhase,
  ] = useState("FORM");

  const [
    actionMessage,
    setActionMessage,
  ] = useState("");

  const [
    newDate,
    setNewDate,
  ] = useState("");

  const [
    actionReason,
    setActionReason,
  ] = useState("");

  /* =====================================================
     LOAD CURRENT INTERVIEW
  ===================================================== */

  const load = useCallback(
    async () => {
      if (!interviewId) {
        setError(
          "Interview ID is missing."
        );

        setLoading(false);

        return;
      }

      try {
        setLoading(true);
        setError("");

        const result =
          await getInterview(
            interviewId
          );

        setInterview(result);
      } catch (loadError) {
        setInterview(null);

        setError(
          getApiErrorMessage(
            loadError,
            "Interview could not be loaded."
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [interviewId]
  );

  const refreshInterview =
    useCallback(
      async () => {
        if (!interviewId) {
          return null;
        }

        const result =
          await getInterview(
            interviewId
          );

        setInterview(result);

        return result;
      },
      [interviewId]
    );

  useEffect(() => {
    load();
  }, [load]);

  /* =====================================================
     CURRENT INTERVIEW META
  ===================================================== */

  const status =
    normalizeStatus(
      interview?.status
    );

  const candidateId =
    getCandidateIdFromInterview(
      interview
    );

  const candidateName =
    safeText(
      interview?.candidate?.fullName ||
        interview?.candidateName,
      "Candidate"
    );

  /* =====================================================
     LOAD COMPLETE CANDIDATE INTERVIEW HISTORY
  ===================================================== */

  const loadInterviewHistory =
    useCallback(
      async () => {
        if (!candidateId) {
          setInterviewHistory(
            interview
              ? [interview]
              : []
          );

          return;
        }

        try {
          setHistoryLoading(true);
          setHistoryError("");

          const result =
            await getInterviews({
              candidate: candidateId,
            });

          const records =
            Array.isArray(result)
              ? result
              : [];

          /* =============================================
             ONLY THIS CANDIDATE
          ============================================== */

          const candidateRecords =
            records.filter((item) => {
              const itemCandidateId =
                getCandidateIdFromInterview(
                  item
                );

              return (
                !itemCandidateId ||
                String(itemCandidateId) ===
                  String(candidateId)
              );
            });

          /* =============================================
             IMPORTANT:
             DEDUPE LIST RESPONSE BEFORE DETAIL REQUESTS
          ============================================== */

          const uniqueCandidateRecords =
            dedupeInterviewHistory(
              candidateRecords
            );

          /* =============================================
             GET FULL DETAIL FOR EACH UNIQUE INTERVIEW
          ============================================== */

          const detailedRecords =
            await Promise.all(
              uniqueCandidateRecords.map(
                async (item) => {
                  const id =
                    getRecordId(item);

                  if (!id) {
                    return item;
                  }

                  if (
                    String(id) ===
                    String(interviewId)
                  ) {
                    return {
                      ...item,
                      ...interview,
                    };
                  }

                  try {
                    const detail =
                      await getInterview(
                        id
                      );

                    return {
                      ...item,
                      ...detail,
                    };
                  } catch (
                    detailError
                  ) {
                    console.warn(
                      `Interview history detail ${id} could not be loaded:`,
                      detailError
                    );

                    return item;
                  }
                }
              )
            );

          /* =============================================
             MAKE SURE OPENED INTERVIEW EXISTS
          ============================================== */

          const currentExists =
            detailedRecords.some(
              (item) =>
                String(
                  getRecordId(item)
                ) ===
                String(interviewId)
            );

          const completeRecords =
            currentExists
              ? detailedRecords
              : [
                  ...detailedRecords,
                  interview,
                ].filter(Boolean);

          /* =============================================
             FINAL DEDUPE

             This is intentionally done AGAIN because detail
             calls may resolve multiple list entries into the
             same actual interview record.
          ============================================== */

          const finalUniqueRecords =
            dedupeInterviewHistory(
              completeRecords
            );

          setInterviewHistory(
            sortInterviewHistory(
              finalUniqueRecords
            )
          );
        } catch (
          historyLoadError
        ) {
          console.error(
            "Interview history load failed:",
            historyLoadError
          );

          setHistoryError(
            getApiErrorMessage(
              historyLoadError,
              "Interview history could not be loaded."
            )
          );

          setInterviewHistory(
            interview
              ? [interview]
              : []
          );
        } finally {
          setHistoryLoading(false);
        }
      },
      [
        candidateId,
        interview,
        interviewId,
      ]
    );

  useEffect(() => {
    if (
      interview &&
      candidateId
    ) {
      loadInterviewHistory();
    }
  }, [
    interview,
    candidateId,
    loadInterviewHistory,
  ]);

  /* =====================================================
     HISTORY SUMMARY
  ===================================================== */

  const interviewJourney =
    useMemo(
      () =>
        sortInterviewHistory(
          dedupeInterviewHistory(
            interviewHistory
          )
        ),
      [interviewHistory]
    );

  const journeyStats =
    useMemo(() => {
      const total =
        interviewJourney.length;

      const completed =
        interviewJourney.filter(
          (item) =>
            normalizeStatus(
              item?.status
            ) === "COMPLETED"
        ).length;

      const active =
        interviewJourney.filter(
          (item) =>
            ![
              "COMPLETED",
              "CANCELLED",
              "NO_SHOW",
            ].includes(
              normalizeStatus(
                item?.status
              )
            )
        ).length;

      return {
        total,
        completed,
        active,
      };
    }, [interviewJourney]);

  /* =====================================================
     CHECK-IN ELIGIBILITY
  ===================================================== */

  const checkInEligibility =
    useMemo(() => {
      if (!interview) {
        return {
          allowed: false,
          state: "INVALID",
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
        ].includes(status)
      ) {
        return {
          allowed: false,
          state: "STATUS_BLOCKED",
          title:
            "Check-in Unavailable",
          message:
            "Candidate cannot be checked in at the current interview stage.",
        };
      }

      const timezone = String(
        interview?.timezone ||
          DEFAULT_TIMEZONE
      ).trim();

      const interviewDate =
        getDateKeyInTimeZone(
          interview?.scheduledAt,
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
          allowed: false,
          state: "INVALID",
          title:
            "Schedule Unavailable",
          message:
            "Interview schedule could not be validated.",
        };
      }

      if (today < interviewDate) {
        return {
          allowed: false,
          state: "EARLY",
          title:
            "Check-in Not Open",
          message: `Available on ${formatRecruitmentDate(
            interview?.scheduledAt
          )}.`,
        };
      }

      if (today > interviewDate) {
        return {
          allowed: false,
          state: "EXPIRED",
          title:
            "Reschedule Required",
          message:
            "Interview date has passed.",
        };
      }

      return {
        allowed: true,
        state: "TODAY",
        title:
          "Candidate Check-in",
        message:
          "Candidate can be checked in.",
      };
    }, [
      interview,
      status,
    ]);

  /* =====================================================
     EVALUATION ELIGIBILITY
  ===================================================== */

  const evaluationEligibility =
    useMemo(() => {
      if (
        status === "CHECKED_IN"
      ) {
        return {
          allowed: true,
          title:
            "Complete Evaluation",
          message:
            "Evaluation is ready.",
        };
      }

      if (
        status === "COMPLETED"
      ) {
        return {
          allowed: false,
          title:
            "Evaluation Completed",
          message:
            "This round is completed.",
        };
      }

      return {
        allowed: false,
        title:
          "Evaluation Locked",
        message:
          "Check in the candidate first.",
      };
    }, [status]);

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
      [interview]
    );

  const interviewerEmailMeta =
    useMemo(
      () =>
        getEmailStatusMeta(
          interview
            ?.interviewerEmail
            ?.status
        ),
      [interview]
    );

  const checkInWelcomeEmailMeta =
    useMemo(
      () =>
        getEmailStatusMeta(
          interview
            ?.checkInWelcomeEmail
            ?.status
        ),
      [interview]
    );

  /* =====================================================
     ACTION STATE
  ===================================================== */

  const resetActionState = () => {
    setActionPhase("FORM");
    setActionMessage("");
    setNewDate("");
    setActionReason("");
  };

  const openCheckIn = () => {
    if (
      !checkInEligibility.allowed
    ) {
      setError(
        checkInEligibility.message
      );

      return;
    }

    setError("");
    resetActionState();
    setAction("CHECK_IN");
  };

  const openReschedule = () => {
    setError("");
    resetActionState();
    setAction("RESCHEDULE");
  };

  const openCancel = () => {
    setError("");
    resetActionState();
    setAction("CANCEL");
  };

  const closeAction = () => {
    if (
      submitting ||
      actionPhase === "PROCESSING"
    ) {
      return;
    }

    setAction("");
    resetActionState();
  };

  /* =====================================================
     CHECK-IN
  ===================================================== */

  const submitCheckIn =
    async () => {
      if (
        !checkInEligibility.allowed
      ) {
        setActionPhase("ERROR");

        setActionMessage(
          checkInEligibility.message
        );

        return;
      }

      try {
        setSubmitting(true);
        setActionPhase(
          "PROCESSING"
        );

        setActionMessage(
          "Recording candidate check-in..."
        );

        await checkInInterview(
          interviewId,
          {
            checkInToken:
              interview?.checkInToken ||
              undefined,
          }
        );

        await refreshInterview();

        setActionPhase("SUCCESS");

        setActionMessage(
          `${candidateName} has been checked in successfully.`
        );
      } catch (submitError) {
        setActionPhase("ERROR");

        setActionMessage(
          getApiErrorMessage(
            submitError,
            "Candidate could not be checked in."
          )
        );
      } finally {
        setSubmitting(false);
      }
    };

  /* =====================================================
     RESCHEDULE
  ===================================================== */

  const submitReschedule =
    async () => {
      if (!newDate) {
        setActionPhase("ERROR");

        setActionMessage(
          "Select the new interview date and time."
        );

        return;
      }

      const selectedDate =
        new Date(newDate);

      if (
        Number.isNaN(
          selectedDate.getTime()
        ) ||
        selectedDate.getTime() <=
          Date.now()
      ) {
        setActionPhase("ERROR");

        setActionMessage(
          "Select a valid future date and time."
        );

        return;
      }

      try {
        setSubmitting(true);
        setActionPhase(
          "PROCESSING"
        );

        setActionMessage(
          "Updating interview schedule..."
        );

        await rescheduleInterview(
          interviewId,
          {
            scheduledAt:
              selectedDate.toISOString(),

            reason:
              actionReason.trim(),

            remarks:
              actionReason.trim(),
          }
        );

        await refreshInterview();

        setActionPhase("SUCCESS");

        setActionMessage(
          `Interview rescheduled to ${formatRecruitmentDate(
            selectedDate
          )} at ${formatRecruitmentTime(
            selectedDate
          )}.`
        );
      } catch (submitError) {
        setActionPhase("ERROR");

        setActionMessage(
          getApiErrorMessage(
            submitError,
            "Interview could not be rescheduled."
          )
        );
      } finally {
        setSubmitting(false);
      }
    };

  /* =====================================================
     CANCEL
  ===================================================== */

  const submitCancel =
    async () => {
      if (
        !actionReason.trim()
      ) {
        setActionPhase("ERROR");

        setActionMessage(
          "Enter a cancellation reason."
        );

        return;
      }

      try {
        setSubmitting(true);
        setActionPhase(
          "PROCESSING"
        );

        setActionMessage(
          "Cancelling interview..."
        );

        await cancelInterview(
          interviewId,
          {
            reason:
              actionReason.trim(),

            cancellationReason:
              actionReason.trim(),
          }
        );

        await refreshInterview();

        setActionPhase("SUCCESS");

        setActionMessage(
          "Interview cancelled successfully."
        );
      } catch (submitError) {
        setActionPhase("ERROR");

        setActionMessage(
          getApiErrorMessage(
            submitError,
            "Interview could not be cancelled."
          )
        );
      } finally {
        setSubmitting(false);
      }
    };

  const finishAction = () => {
    setAction("");
    resetActionState();
    setError("");
  };

  const retryAction = () => {
    setActionPhase("FORM");
    setActionMessage("");
  };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
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

  if (!interview) {
    return (
      <section className="se-interview-detail-page">
        <div className="se-interview-detail-fatal">
          <span>!</span>

          <h2>
            Interview unavailable
          </h2>

          <p>{error}</p>

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
          onClick={load}
          disabled={submitting}
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
              label={safeText(
                interview?.status,
                "Scheduled"
              ).replaceAll(
                "_",
                " "
              )}
              tone={statusTone(
                interview?.status
              )}
            />
          </div>

          <h1>
            {candidateName}
          </h1>

          <p>
            {safeText(
              interview?.positionTitle,
              "Position"
            )}

            {" · "}

            {safeText(
              interview?.roundName,
              `Round ${
                interview?.roundNumber ||
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
            ].includes(status) ? (
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
              interview?.scheduledAt
            )}
          </strong>

          <b>
            {formatRecruitmentTime(
              interview?.scheduledAt
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
          <span>!</span>

          <p>
            {error}
          </p>
        </div>
      ) : null}

      {/* =================================================
          INTERVIEW JOURNEY
      ================================================== */}

      <section className="se-interview-journey">

        {/* ===============================================
            JOURNEY HEADER
        ================================================ */}

        <header className="se-interview-journey-head">
          <div>
            <span>
              INTERVIEW HISTORY
            </span>

            <h2>
              Interview Journey
            </h2>
          </div>

          <div className="se-interview-journey-summary">
            <div>
              <strong>
                {journeyStats.total}
              </strong>

              <span>
                Rounds
              </span>
            </div>

            <div className="completed">
              <strong>
                {journeyStats.completed}
              </strong>

              <span>
                Completed
              </span>
            </div>

            {journeyStats.active > 0 ? (
              <div className="active">
                <strong>
                  {journeyStats.active}
                </strong>

                <span>
                  Active
                </span>
              </div>
            ) : null}
          </div>
        </header>

        {/* ===============================================
            HISTORY ERROR
        ================================================ */}

        {historyError ? (
          <div className="se-interview-history-error">
            <span>!</span>

            <p>
              {historyError}
            </p>
          </div>
        ) : null}

        {/* ===============================================
            HISTORY LOADING
        ================================================ */}

        {historyLoading ? (
          <div className="se-interview-history-loading">
            <span />
            <span />
            <span />
          </div>
        ) : interviewJourney.length > 0 ? (

          /* =============================================
             TIMELINE
          ============================================== */

          <div className="se-interview-timeline">

            {interviewJourney.map(
              (item, index) => {
                const itemId =
                  getRecordId(item);

                const itemStatus =
                  normalizeStatus(
                    item?.status
                  );

                const isViewing =
                  String(itemId) ===
                  String(interviewId);

                const isLatestRound =
                  index ===
                  interviewJourney.length -
                    1;

                const completed =
                  itemStatus ===
                  "COMPLETED";

                const cancelled =
                  [
                    "CANCELLED",
                    "NO_SHOW",
                  ].includes(
                    itemStatus
                  );

                const isActiveRound =
                  isLatestRound &&
                  !completed &&
                  !cancelled;

                const remarks =
                  getInterviewRemarks(
                    item
                  );

                const rating =
                  getEvaluationRating(
                    item
                  );

                const result =
                  getRoundResult(
                    item
                  );

                const strengths =
                  getStrengths(
                    item
                  );

                const concerns =
                  getConcerns(
                    item
                  );

                const itemInterviewerEmail =
                  getInterviewerEmail(
                    item
                  );

                const itemMode =
                  safeText(
                    item?.mode,
                    "—"
                  ).replaceAll(
                    "_",
                    " "
                  );

                const attendanceText =
                  item?.checkedInAt
                    ? "Candidate attended"
                    : completed
                      ? "Check-in not recorded"
                      : itemStatus ===
                          "NO_SHOW"
                        ? "Candidate did not attend"
                        : "Awaiting check-in";

                const roundStateText =
                  completed
                    ? "Interview completed"
                    : itemStatus ===
                        "CHECKED_IN"
                      ? "Candidate checked in"
                      : itemStatus ===
                          "CANCELLED"
                        ? "Interview cancelled"
                        : itemStatus ===
                            "NO_SHOW"
                          ? "Candidate did not attend"
                          : itemStatus ===
                              "RESCHEDULED"
                            ? "Interview rescheduled"
                            : "Interview scheduled";

                const evaluationText =
                  rating !== null
                    ? `${rating} / 5 rating`
                    : completed
                      ? result
                      : itemStatus ===
                          "CHECKED_IN"
                        ? "Evaluation pending"
                        : "Not completed";

                return (
                  <article
                    key={
                      itemId ||
                      item?.interviewNumber ||
                      `${index}`
                    }
                    className={[
                      "se-interview-timeline-item",

                      isViewing
                        ? "viewing"
                        : "",

                      isActiveRound
                        ? "active-round"
                        : "",

                      completed
                        ? "completed"
                        : "",

                      cancelled
                        ? "cancelled"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >

                    {/* =================================
                        TIMELINE RAIL
                    ================================== */}

                    <div className="se-interview-timeline-rail">
                      <span className="se-interview-timeline-number">
                        {completed
                          ? "✓"
                          : Number(
                              item?.roundNumber ||
                                index + 1
                            )}
                      </span>

                      {index <
                      interviewJourney.length -
                        1 ? (
                        <i />
                      ) : null}
                    </div>

                    {/* =================================
                        CARD CONTENT
                    ================================== */}

                    <div className="se-interview-timeline-content">

                      {/* ===============================
                          HEADER
                      ================================ */}

                      <div className="se-interview-timeline-top">
                        <div>
                          <span className="se-interview-round-label">
                            ROUND{" "}
                            {Number(
                              item?.roundNumber ||
                                index + 1
                            )}
                          </span>

                          <h3>
                            {safeText(
                              item?.roundName,
                              `Interview Round ${
                                item?.roundNumber ||
                                index + 1
                              }`
                            )}
                          </h3>
                        </div>

                        <div className="se-interview-round-status">

                          {isActiveRound ? (
                            <span className="se-round-active-badge">
                              <span className="se-round-active-dot" />

                              Current Round
                            </span>
                          ) : null}

                          {completed ? (
                            <span className="se-round-completed-badge">
                              <span className="se-round-completed-icon">
                                ✓
                              </span>

                              Completed
                            </span>
                          ) : (
                            <RecruitmentStatusBadge
                              label={safeText(
                                item?.status,
                                "Scheduled"
                              ).replaceAll(
                                "_",
                                " "
                              )}
                              tone={statusTone(
                                item?.status
                              )}
                            />
                          )}
                        </div>
                      </div>

                      {/* ===============================
                          BASIC INFORMATION
                      ================================ */}

                      <div className="se-interview-round-meta">

                        <div>
                          <span>
                            DATE
                          </span>

                          <strong>
                            {formatRecruitmentDate(
                              item?.scheduledAt
                            )}
                          </strong>

                          <small>
                            {formatRecruitmentTime(
                              item?.scheduledAt
                            )}
                          </small>
                        </div>

                        <div>
                          <span>
                            INTERVIEWER
                          </span>

                          <strong>
                            {getInterviewerName(
                              item
                            )}
                          </strong>

                          {itemInterviewerEmail ? (
                            <small>
                              {itemInterviewerEmail}
                            </small>
                          ) : null}
                        </div>

                        <div>
                          <span>
                            MODE
                          </span>

                          <strong>
                            {itemMode}
                          </strong>

                          <small>
                            {Number(
                              item
                                ?.durationMinutes ||
                                45
                            )}{" "}
                            minutes
                          </small>
                        </div>

                        <div>
                          <span>
                            RESULT
                          </span>

                          <strong>
                            {result}
                          </strong>

                          {rating !== null ? (
                            <small>
                              Rating:{" "}
                              {rating} / 5
                            </small>
                          ) : null}
                        </div>
                      </div>

                      {/* ===============================
                          STATUS INSIGHTS
                      ================================ */}

                      <div className="se-interview-round-insight">

                        <div className="se-round-insight-item">
                          <span className="se-round-insight-icon">
                            {completed
                              ? "✓"
                              : "○"}
                          </span>

                          <div>
                            <small>
                              ROUND STATUS
                            </small>

                            <strong>
                              {roundStateText}
                            </strong>
                          </div>
                        </div>

                        <div className="se-round-insight-item">
                          <span className="se-round-insight-icon">
                            {item?.checkedInAt
                              ? "✓"
                              : "○"}
                          </span>

                          <div>
                            <small>
                              ATTENDANCE
                            </small>

                            <strong>
                              {attendanceText}
                            </strong>

                            {item?.checkedInAt ? (
                              <p>
                                {formatRecruitmentDateTime(
                                  item.checkedInAt
                                )}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="se-round-insight-item">
                          <span className="se-round-insight-icon">
                            {rating !== null
                              ? "★"
                              : completed
                                ? "✓"
                                : "○"}
                          </span>

                          <div>
                            <small>
                              EVALUATION
                            </small>

                            <strong>
                              {evaluationText}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* =================================================
    LOCATION / MEETING
================================================= */}

{(
  item?.officeLocationLabel ||
  item?.officeLocation ||
  item?.meetingLink
) ? (
  <div className="se-interview-round-location-row">

    {(item?.officeLocationLabel || item?.officeLocation) ? (
      <div className="se-interview-round-location-item">
        <span className="se-interview-round-location-icon">
          ⌖
        </span>

        <div className="se-interview-round-location-content">
          <small>LOCATION</small>

          <strong>
            {safeText(
              item?.officeLocationLabel ||
                item?.officeLocation,
              "—"
            )
              .replaceAll("_", " ")
              .toUpperCase()}
          </strong>
        </div>
      </div>
    ) : null}

    {item?.meetingLink ? (
      <a
        className="se-interview-round-meeting-link"
        href={item.meetingLink}
        target="_blank"
        rel="noreferrer"
      >
        <span className="se-interview-round-location-icon">
          ↗
        </span>

        <div>
          <small>MEETING</small>
          <strong>Open Meeting Link</strong>
        </div>
      </a>
    ) : null}

  </div>
) : null}

                      {/* ===============================
                          ASSESSMENT
                          DISPLAY DIRECTLY IN CARD
                      ================================ */}

                      {strengths ||
                      concerns ? (
                        <div className="se-interview-round-assessment">

                          {strengths ? (
                            <div className="strength">
                              <span>
                                STRENGTHS
                              </span>

                              <p>
                                {strengths}
                              </p>
                            </div>
                          ) : null}

                          {concerns ? (
                            <div className="concern">
                              <span>
                                CONCERNS
                              </span>

                              <p>
                                {concerns}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {/* ===============================
                          REMARKS
                          DISPLAY DIRECTLY IN CARD
                      ================================ */}

                      {remarks ? (
                        <div className="se-interview-round-remarks">
                          <span>
                            INTERVIEW REMARKS
                          </span>

                          <p>
                            {remarks}
                          </p>
                        </div>
                      ) : null}

                      {/* ===============================
                          NOTIFICATIONS

                          These belong to the currently
                          loaded interview because these
                          status fields are from the detail
                          response.
                      ================================ */}

                      {isViewing ? (
                        <div className="se-round-communication">

                          <span className="se-round-communication-title">
                            Notifications
                          </span>

                          <span
                            className={`se-mini-delivery ${candidateEmailMeta.tone}`}
                          >
                            {
                              candidateEmailMeta.symbol
                            }

                            Candidate:{" "}
                            {
                              candidateEmailMeta.label
                            }
                          </span>

                          <span
                            className={`se-mini-delivery ${interviewerEmailMeta.tone}`}
                          >
                            {
                              interviewerEmailMeta.symbol
                            }

                            Interviewer:{" "}
                            {
                              interviewerEmailMeta.label
                            }
                          </span>

                          {interview?.checkedInAt ||
                          normalizeEmailStatus(
                            interview
                              ?.checkInWelcomeEmail
                              ?.status
                          ) !==
                            "NOT_SENT" ? (
                            <span
                              className={`se-mini-delivery ${checkInWelcomeEmailMeta.tone}`}
                            >
                              {
                                checkInWelcomeEmailMeta.symbol
                              }

                              Welcome:{" "}
                              {
                                checkInWelcomeEmailMeta.label
                              }
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      {/* ===============================
                          WORKFLOW ACTION

                          ONLY for currently loaded active
                          interview. Completed history does
                          not need buttons.
                      ================================ */}

                      {isViewing &&
                      ![
                        "COMPLETED",
                        "CANCELLED",
                        "NO_SHOW",
                      ].includes(
                        itemStatus
                      ) ? (
                        <div className="se-round-workflow-action">

                          <div className="se-round-workflow-action-head">
                            <div>
                              <span>
                                NEXT ACTION
                              </span>

                              <strong>
                                Complete this interview round
                              </strong>
                            </div>
                          </div>

                          <div className="se-interview-control-grid">

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
                                      checkInEligibility.title
                                    }
                                  </strong>

                                  <small>
                                    {
                                      checkInEligibility.message
                                    }
                                  </small>
                                </div>
                              </button>
                            ) : null}

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
                                      ? formatRecruitmentDateTime(
                                          interview
                                            .checkedInAt
                                        )
                                      : "Arrival confirmed"}
                                  </small>
                                </div>
                              </div>
                            ) : null}

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
                                >
                                  <span>
                                    🔒
                                  </span>

                                  <div>
                                    <strong>
                                      {
                                        evaluationEligibility.title
                                      }
                                    </strong>

                                    <small>
                                      {
                                        evaluationEligibility.message
                                      }
                                    </small>
                                  </div>
                                </button>
                              )
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {/* ===============================
                          FOOTER

                          NO VIEW DETAILS.
                          NO NAVIGATION.
                          EVERYTHING IS ALREADY ABOVE.
                      ================================ */}

                      <footer className="se-interview-round-footer">

                        <div className="se-interview-round-reference">
                          <span>
                            Interview ID
                          </span>

                          <strong>
                            {safeText(
                              item
                                ?.interviewNumber,
                              `Interview ${
                                index + 1
                              }`
                            )}
                          </strong>
                        </div>

                        <span
                          className={`se-interview-viewing-pill ${
                            completed
                              ? "completed"
                              : isActiveRound
                                ? "active"
                                : ""
                          }`}
                        >
                          <span>
                            {completed
                              ? "✓"
                              : isActiveRound
                                ? "●"
                                : "•"}
                          </span>

                          {completed
                            ? "Round Complete"
                            : isActiveRound
                              ? "Current Round"
                              : "Round Record"}
                        </span>
                      </footer>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        ) : (
          <div className="se-interview-history-empty">
            No interview history available.
          </div>
        )}
      </section>

      {/* =================================================
          ACTION MODAL
      ================================================== */}

      {action ? (
        <div
          className="se-interview-modal-overlay"
          onMouseDown={(event) => {
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
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            {/* ===========================================
                FORM
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
                        ? "CHECK-IN"
                        : action ===
                            "CANCEL"
                          ? "CANCEL INTERVIEW"
                          : "RESCHEDULE"}
                    </span>

                    <h2>
                      {action ===
                      "CHECK_IN"
                        ? "Confirm Candidate Arrival"
                        : action ===
                            "CANCEL"
                          ? "Cancel This Interview?"
                          : "Change Interview Schedule"}
                    </h2>

                    <p>
                      {action ===
                      "CHECK_IN"
                        ? "Confirm that the candidate has arrived and is ready for the interview."
                        : action ===
                            "CANCEL"
                          ? "This will cancel the interview round and notify the relevant participants."
                          : "Select a new date and time for this interview round."}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="se-interview-confirm-close"
                    onClick={
                      closeAction
                    }
                  >
                    ×
                  </button>
                </header>

                {/* =======================================
                    CANDIDATE
                ======================================== */}

                <div className="se-interview-confirm-candidate">

                  <div className="se-interview-confirm-avatar">
                    {candidateName
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>
                    <span>
                      CANDIDATE
                    </span>

                    <strong>
                      {candidateName}
                    </strong>

                    <small>
                      {safeText(
                        interview
                          ?.positionTitle,
                        "Position"
                      )}
                    </small>
                  </div>

                  <div className="se-interview-confirm-round">
                    <span>
                      INTERVIEW ROUND
                    </span>

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
                  </div>
                </div>

                {/* =======================================
                    CHECK IN
                ======================================== */}

                {action ===
                "CHECK_IN" ? (
                  <div className="se-interview-confirm-body">

                    <div className="se-interview-confirm-info-grid">

                      <div>
                        <span>
                          DATE
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
                          TIME
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
                          MODE
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
                          INTERVIEWER
                        </span>

                        <strong>
                          {getInterviewerName(
                            interview
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
                          Ready to check in
                        </strong>

                        <p>
                          {
                            checkInEligibility.message
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* =======================================
                    RESCHEDULE
                ======================================== */}

                {action ===
                "RESCHEDULE" ? (
                  <div className="se-interview-confirm-body">

                    <div className="se-interview-current-schedule">
                      <span>
                        CURRENT SCHEDULE
                      </span>

                      <div>
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
                      </div>
                    </div>

                    <label className="se-interview-confirm-field">
                      <span>
                        New Date & Time
                      </span>

                      <input
                        type="datetime-local"
                        value={newDate}
                        min={
                          getMinimumDateTime()
                        }
                        onChange={(event) =>
                          setNewDate(
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label className="se-interview-confirm-field">
                      <span>
                        Reason / Note
                      </span>

                      <textarea
                        rows="3"
                        value={
                          actionReason
                        }
                        onChange={(event) =>
                          setActionReason(
                            event.target.value
                          )
                        }
                        placeholder="Optional reason for rescheduling..."
                      />
                    </label>
                  </div>
                ) : null}

                {/* =======================================
                    CANCEL
                ======================================== */}

                {action ===
                "CANCEL" ? (
                  <div className="se-interview-confirm-body">

                    <div className="se-interview-confirm-notice red">
                      <span>
                        !
                      </span>

                      <div>
                        <strong>
                          This interview will be cancelled
                        </strong>

                        <p>
                          The candidate and interviewer may be notified according to the configured workflow.
                        </p>
                      </div>
                    </div>

                    <label className="se-interview-confirm-field">
                      <span>
                        Cancellation Reason *
                      </span>

                      <textarea
                        rows="4"
                        value={
                          actionReason
                        }
                        onChange={(event) =>
                          setActionReason(
                            event.target.value
                          )
                        }
                        placeholder="Enter the reason for cancelling this interview..."
                      />
                    </label>
                  </div>
                ) : null}

                {/* =======================================
                    FOOTER
                ======================================== */}

                <footer className="se-interview-confirm-footer">

                  <button
                    type="button"
                    className="secondary"
                    onClick={
                      closeAction
                    }
                    disabled={
                      submitting
                    }
                  >
                    Keep Interview
                  </button>

                  {action ===
                  "CHECK_IN" ? (
                    <button
                      type="button"
                      className="primary green"
                      onClick={
                        submitCheckIn
                      }
                      disabled={
                        submitting ||
                        !checkInEligibility
                          .allowed
                      }
                    >
                      ✓ Confirm Check-in
                    </button>
                  ) : null}

                  {action ===
                  "RESCHEDULE" ? (
                    <button
                      type="button"
                      className="primary amber"
                      onClick={
                        submitReschedule
                      }
                      disabled={
                        submitting
                      }
                    >
                      ↻ Confirm Reschedule
                    </button>
                  ) : null}

                  {action ===
                  "CANCEL" ? (
                    <button
                      type="button"
                      className="primary red"
                      onClick={
                        submitCancel
                      }
                      disabled={
                        submitting
                      }
                    >
                      Cancel Interview
                    </button>
                  ) : null}
                </footer>
              </>
            ) : null}

            {/* ===========================================
                PROCESSING
            ============================================ */}

            {actionPhase ===
            "PROCESSING" ? (
              <div className="se-interview-action-result processing">

                <div className="se-interview-action-spinner">
                  <span />
                </div>

                <span>
                  PLEASE WAIT
                </span>

                <h2>
                  Processing
                </h2>

                <p>
                  {actionMessage}
                </p>
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
                  COMPLETED
                </span>

                <h2>
                  {action ===
                  "CHECK_IN"
                    ? "Candidate Checked In"
                    : action ===
                        "RESCHEDULE"
                      ? "Interview Rescheduled"
                      : "Interview Cancelled"}
                </h2>

                <p>
                  {actionMessage}
                </p>

                <button
                  type="button"
                  className="primary"
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
                  NOT COMPLETED
                </span>

                <h2>
                  Action Failed
                </h2>

                <p>
                  {actionMessage}
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

                  <button
                    type="button"
                    className="primary"
                    onClick={
                      retryAction
                    }
                  >
                    Try Again
                  </button>
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
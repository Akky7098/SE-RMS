import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  addCandidateCallAttempt,
  rejectCandidate,
  screenCandidate,
  shortlistCandidate,
} from "../../../services/recruitmentService";

import {
  getApiErrorMessage,
  getCandidateWorkflowState,
  getRecordId,
} from "../utils/recruitmentHelpers";

import ScheduleInterviewModal from "../Interviews/ScheduleInterviewModal";

/* =========================================================
   ACTIVE INTERVIEW
========================================================= */

const getActiveInterview = (
  interviews = []
) => {
  if (
    !Array.isArray(
      interviews
    ) ||
    interviews.length ===
      0
  ) {
    return null;
  }

  const inactiveStatuses =
    new Set([
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ]);

  const active =
    interviews
      .filter(
        (
          interview
        ) =>
          !inactiveStatuses.has(
            String(
              interview?.status ||
                ""
            )
              .trim()
              .toUpperCase()
          )
      )
      .sort(
        (
          a,
          b
        ) =>
          new Date(
            b?.scheduledAt ||
              b?.createdAt ||
              0
          ).getTime() -
          new Date(
            a?.scheduledAt ||
              a?.createdAt ||
              0
          ).getTime()
      );

  return (
    active[0] ||
    null
  );
};

/* =========================================================
   COMPONENT
========================================================= */

const CandidateActionPanel = ({
  candidate,

  interviews = [],

  onChanged,

  onOpenInterview,
}) => {
  const [
    action,
    setAction,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    scheduleOpen,
    setScheduleOpen,
  ] = useState(false);

  /* =========================================================
     WORKFLOW
  ========================================================= */

  const workflow =
    useMemo(
      () =>
        getCandidateWorkflowState(
          candidate?.status
        ),
      [
        candidate?.status,
      ]
    );

  /* =========================================================
     CURRENT ACTIVE INTERVIEW
  ========================================================= */

  const activeInterview =
    useMemo(
      () =>
        getActiveInterview(
          interviews
        ),
      [
        interviews,
      ]
    );

  const activeInterviewId =
    getRecordId(
      activeInterview
    );

  const hasActiveInterview =
    Boolean(
      activeInterviewId
    );

  /* =========================================================
     CALL
  ========================================================= */

  const [
    call,
    setCall,
  ] = useState({
    outcome:
      "CONNECTED",

    remarks:
      "",

    followUpAt:
      "",
  });

  /* =========================================================
     SCREENING
  ========================================================= */

  const [
    screening,
    setScreening,
  ] = useState({
    interested:
      "YES",

    reasonNotInterested:
      "",

    reasonForChange:
      "",

    currentCompany:
      candidate?.currentCompany ||
      "",

    currentDesignation:
      candidate?.currentDesignation ||
      "",

    totalExperienceYears:
      candidate?.totalExperienceYears ??
      "",

    relevantExperienceYears:
      candidate?.relevantExperienceYears ??
      "",

    currentSalary:
      candidate?.currentSalary ??
      "",

    expectedSalary:
      candidate?.expectedSalary ??
      "",

    noticePeriodDays:
      candidate?.noticePeriodDays ??
      "",

    earliestJoiningDate:
      candidate?.earliestJoiningDate
        ? String(
            candidate
              .earliestJoiningDate
          ).slice(
            0,
            10
          )
        : "",

    currentLocation:
      [
        candidate?.city,
        candidate?.state,
      ]
        .filter(
          Boolean
        )
        .join(
          ", "
        ),

    preferredLocation:
      "",

    availableForInterview:
      false,

    preferredInterviewDate:
      "",

    communicationRating:
      "3",

    skillMatchRating:
      "3",

    experienceMatchRating:
      "3",

    result:
      "PENDING",

    remarks:
      "",

    followUpAt:
      "",
  });

  const [
    simpleRemarks,
    setSimpleRemarks,
  ] = useState("");

  /* =========================================================
     KEEP SCREENING DATA CURRENT
  ========================================================= */

  useEffect(() => {
    setScreening(
      (
        current
      ) => ({
        ...current,

        currentCompany:
          candidate?.currentCompany ||
          "",

        currentDesignation:
          candidate?.currentDesignation ||
          "",

        totalExperienceYears:
          candidate?.totalExperienceYears ??
          "",

        relevantExperienceYears:
          candidate?.relevantExperienceYears ??
          "",

        currentSalary:
          candidate?.currentSalary ??
          "",

        expectedSalary:
          candidate?.expectedSalary ??
          "",

        noticePeriodDays:
          candidate?.noticePeriodDays ??
          "",

        earliestJoiningDate:
          candidate?.earliestJoiningDate
            ? String(
                candidate
                  .earliestJoiningDate
              ).slice(
                0,
                10
              )
            : "",

        currentLocation:
          [
            candidate?.city,
            candidate?.state,
          ]
            .filter(
              Boolean
            )
            .join(
              ", "
            ),
      })
    );
  }, [
    candidate,
  ]);

  /* =========================================================
     ID
  ========================================================= */

  const candidateId =
    getRecordId(
      candidate
    );

  /* =========================================================
     CLOSE
  ========================================================= */

  const closeAction =
    () => {
      setAction("");

      setError("");

      setSimpleRemarks("");
    };

  /* =========================================================
     OPEN SAFE ACTION
  ========================================================= */

  const openAction = (
    type,
    state
  ) => {
    if (
      !state?.enabled
    ) {
      return;
    }

    setError("");

    setAction(
      type
    );
  };

  /* =========================================================
     CALL SAVE
  ========================================================= */

  const saveCall =
    async () => {
      if (
        !candidateId
      ) {
        return;
      }

      if (
        call.outcome ===
          "CALL_BACK" &&
        !call.followUpAt
      ) {
        setError(
          "Call-back date and time are required."
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

        await addCandidateCallAttempt(
          candidateId,
          {
            outcome:
              call.outcome,

            remarks:
              call
                .remarks
                .trim(),

            followUpAt:
              call.outcome ===
              "CALL_BACK"
                ? call.followUpAt
                : null,
          }
        );

        closeAction();

        await onChanged?.();
      } catch (
        submitError
      ) {
        setError(
          getApiErrorMessage(
            submitError,
            "Call outcome could not be saved."
          )
        );
      } finally {
        setSubmitting(
          false
        );
      }
    };

  /* =========================================================
     SCREEN
  ========================================================= */

  const saveScreening =
    async () => {
      if (
        screening.interested ===
          "FOLLOW_UP" &&
        !screening.followUpAt
      ) {
        setError(
          "Follow-up date and time are required."
        );

        return;
      }

      if (
        screening.result ===
          "HOLD" &&
        !screening.followUpAt
      ) {
        setError(
          "Follow-up date and time are required when screening is put on hold."
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

        const payload = {
          interested:
            screening.interested,

          reasonNotInterested:
            screening
              .reasonNotInterested
              .trim(),

          reasonForChange:
            screening
              .reasonForChange
              .trim(),

          currentCompany:
            screening
              .currentCompany
              .trim(),

          currentDesignation:
            screening
              .currentDesignation
              .trim(),

          totalExperienceYears:
            screening
              .totalExperienceYears ===
            ""
              ? null
              : Number(
                  screening
                    .totalExperienceYears
                ),

          relevantExperienceYears:
            screening
              .relevantExperienceYears ===
            ""
              ? null
              : Number(
                  screening
                    .relevantExperienceYears
                ),

          currentSalary:
            screening
              .currentSalary ===
            ""
              ? null
              : Number(
                  screening
                    .currentSalary
                ),

          expectedSalary:
            screening
              .expectedSalary ===
            ""
              ? null
              : Number(
                  screening
                    .expectedSalary
                ),

          noticePeriodDays:
            screening
              .noticePeriodDays ===
            ""
              ? null
              : Number(
                  screening
                    .noticePeriodDays
                ),

          earliestJoiningDate:
            screening
              .earliestJoiningDate ||
            null,

          currentLocation:
            screening
              .currentLocation
              .trim(),

          preferredLocation:
            screening
              .preferredLocation
              .trim(),

          availableForInterview:
            Boolean(
              screening
                .availableForInterview
            ),

          preferredInterviewDate:
            screening
              .preferredInterviewDate ||
            null,

          communicationRating:
            Number(
              screening
                .communicationRating
            ),

          skillMatchRating:
            Number(
              screening
                .skillMatchRating
            ),

          experienceMatchRating:
            Number(
              screening
                .experienceMatchRating
            ),

          result:
            screening.result,

          remarks:
            screening
              .remarks
              .trim(),

          followUpAt:
            screening.interested ===
              "FOLLOW_UP" ||
            screening.result ===
              "HOLD"
              ? screening
                  .followUpAt
              : null,
        };

        await screenCandidate(
          candidateId,
          payload
        );

        closeAction();

        await onChanged?.();
      } catch (
        submitError
      ) {
        setError(
          getApiErrorMessage(
            submitError,
            "Candidate screening could not be saved."
          )
        );
      } finally {
        setSubmitting(
          false
        );
      }
    };

  /* =========================================================
     SHORTLIST
  ========================================================= */

  const saveShortlist =
    async () => {
      try {
        setSubmitting(
          true
        );

        setError(
          ""
        );

        await shortlistCandidate(
          candidateId,
          {
            remarks:
              simpleRemarks
                .trim(),
          }
        );

        closeAction();

        await onChanged?.();
      } catch (
        submitError
      ) {
        setError(
          getApiErrorMessage(
            submitError,
            "Candidate could not be shortlisted."
          )
        );
      } finally {
        setSubmitting(
          false
        );
      }
    };

  /* =========================================================
     REJECT
  ========================================================= */

  const saveReject =
    async () => {
      if (
        !simpleRemarks
          .trim()
      ) {
        setError(
          "Rejection reason is required."
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

        await rejectCandidate(
          candidateId,
          {
            reason:
              simpleRemarks
                .trim(),

            remarks:
              simpleRemarks
                .trim(),
          }
        );

        closeAction();

        await onChanged?.();
      } catch (
        submitError
      ) {
        setError(
          getApiErrorMessage(
            submitError,
            "Candidate could not be rejected."
          )
        );
      } finally {
        setSubmitting(
          false
        );
      }
    };

  /* =========================================================
     INTERVIEW SCHEDULED
  ========================================================= */

  const handleInterviewScheduled =
    async (
      interview
    ) => {
      setScheduleOpen(
        false
      );

      setError(
        ""
      );

      await onChanged?.(
        interview
      );

      /*
       * Do not force redirect.
       *
       * Candidate page refreshes first so HR can see the
       * workflow change from "Schedule Interview" to
       * "Manage Interview".
       */
    };

  /* =========================================================
     OPEN EXISTING INTERVIEW
  ========================================================= */

  const handleManageInterview =
    () => {
      if (
        !activeInterviewId
      ) {
        return;
      }

      if (
        typeof onOpenInterview ===
        "function"
      ) {
        onOpenInterview(
          activeInterview
        );
      }
    };

  /* =========================================================
     ACTION BUTTON
  ========================================================= */

  const WorkflowButton = ({
    actionKey,

    className,

    icon,

    label,

    state,

    onClick,

    subtitle = "",
  }) => {
    const recommended =
      workflow
        .recommendedAction ===
      actionKey;

    return (
      <button
        type="button"
        className={[
          className,

          state?.completed
            ? "workflow-completed"
            : "",

          !state?.enabled
            ? "workflow-disabled"
            : "",

          recommended
            ? "workflow-recommended"
            : "",
        ]
          .filter(
            Boolean
          )
          .join(
            " "
          )}
        disabled={
          !state?.enabled
        }
        onClick={
          onClick
        }
        title={
          state?.enabled
            ? recommended
              ? "Recommended next action"
              : label
            : state?.reason ||
              "This action is unavailable."
        }
      >
        <span>
          {state?.completed
            ? "✓"
            : icon}
        </span>

        <div className="se-candidate-action-label">
          <strong>
            {state?.completed
              ? `${label} Complete`
              : label}
          </strong>

          {subtitle ? (
            <small>
              {
                subtitle
              }
            </small>
          ) : recommended &&
            state?.enabled ? (
            <small>
              Next recommended step
            </small>
          ) : !state?.enabled &&
            state?.reason ? (
            <small>
              {
                state.reason
              }
            </small>
          ) : null}
        </div>
      </button>
    );
  };

  /* =========================================================
     INTERVIEW BUTTON STATE
  ========================================================= */

  const interviewActionState =
    hasActiveInterview
      ? {
          enabled:
            true,

          completed:
            false,

          reason:
            "",
        }
      : workflow
          .scheduleInterview;

  /* =========================================================
     UI
  ========================================================= */

  return (
    <section className="se-candidate-action-panel">
      <div className="se-candidate-action-buttons se-candidate-workflow-actions">
        {/* =================================================
            CALL
        ================================================== */}

        <WorkflowButton
          actionKey="CALL"
          className="call"
          icon="☎"
          label="Record Call"
          state={
            workflow.call
          }
          onClick={() =>
            openAction(
              "CALL",
              workflow.call
            )
          }
        />

        {/* =================================================
            SCREENING
        ================================================== */}

        <WorkflowButton
          actionKey="SCREEN"
          className="screen"
          icon="S"
          label="Screening"
          state={
            workflow
              .screening
          }
          onClick={() =>
            openAction(
              "SCREEN",
              workflow
                .screening
            )
          }
        />

        {/* =================================================
            SHORTLIST
        ================================================== */}

        <WorkflowButton
          actionKey="SHORTLIST"
          className="shortlist"
          icon="✓"
          label="Shortlist"
          state={
            workflow
              .shortlist
          }
          onClick={() =>
            openAction(
              "SHORTLIST",
              workflow
                .shortlist
            )
          }
        />

        {/* =================================================
            INTERVIEW
        ================================================== */}

        <WorkflowButton
          actionKey={
            hasActiveInterview
              ? "MANAGE_INTERVIEW"
              : "SCHEDULE_INTERVIEW"
          }
          className={
            hasActiveInterview
              ? "interview interview-active"
              : "interview"
          }
          icon={
            hasActiveInterview
              ? "↗"
              : "I"
          }
          label={
            hasActiveInterview
              ? "Manage Interview"
              : "Schedule Interview"
          }
          subtitle={
            hasActiveInterview
              ? `${String(
                  activeInterview
                    ?.status ||
                    "Scheduled"
                )
                  .replaceAll(
                    "_",
                    " "
                  )} · ${
                  activeInterview
                    ?.roundName ||
                  `Round ${
                    activeInterview
                      ?.roundNumber ||
                    1
                  }`
                }`
              : ""
          }
          state={
            interviewActionState
          }
          onClick={() => {
            if (
              hasActiveInterview
            ) {
              handleManageInterview();

              return;
            }

            if (
              !workflow
                ?.scheduleInterview
                ?.enabled
            ) {
              return;
            }

            setError(
              ""
            );

            setScheduleOpen(
              true
            );
          }}
        />

        {/* =================================================
            REJECT
        ================================================== */}

        <WorkflowButton
          actionKey="REJECT"
          className="reject"
          icon="×"
          label="Reject"
          state={
            workflow.reject
          }
          onClick={() =>
            openAction(
              "REJECT",
              workflow.reject
            )
          }
        />
      </div>

      {/* =================================================
          ACTION DRAWER
      ================================================== */}

      {action ? (
        <div
          className="se-candidate-action-overlay"
          onMouseDown={() => {
            if (
              !submitting
            ) {
              closeAction();
            }
          }}
        >
          <aside
            className="se-candidate-action-drawer"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <header>
              <div>
                <span>
                  CANDIDATE ACTION
                </span>

                <h2>
                  {action ===
                  "CALL"
                    ? "Record Call Outcome"
                    : action ===
                        "SCREEN"
                      ? "Candidate Screening"
                      : action ===
                          "SHORTLIST"
                        ? "Shortlist Candidate"
                        : "Reject Candidate"}
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  closeAction
                }
                disabled={
                  submitting
                }
              >
                ×
              </button>
            </header>

            <div className="se-candidate-action-body">
              {error ? (
                <div className="se-candidate-global-error">
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

              {/* ===========================================
                  CALL
              ============================================ */}

              {action ===
              "CALL" ? (
                <section className="se-candidate-action-form">
                  <label>
                    <span>
                      Call Outcome
                    </span>

                    <select
                      value={
                        call.outcome
                      }
                      onChange={(
                        event
                      ) =>
                        setCall(
                          (
                            current
                          ) => ({
                            ...current,

                            outcome:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                    >
                      <option value="CONNECTED">
                        Connected
                      </option>

                      <option value="NO_ANSWER">
                        No Answer
                      </option>

                      <option value="BUSY">
                        Busy
                      </option>

                      <option value="SWITCHED_OFF">
                        Switched Off
                      </option>

                      <option value="CALL_BACK">
                        Call Back
                      </option>

                      <option value="INVALID_NUMBER">
                        Invalid Number
                      </option>

                      <option value="NOT_INTERESTED">
                        Not Interested
                      </option>
                    </select>
                  </label>

                  {call.outcome ===
                  "CALL_BACK" ? (
                    <label>
                      <span>
                        Call-back Date & Time *
                      </span>

                      <input
                        type="datetime-local"
                        value={
                          call
                            .followUpAt
                        }
                        onChange={(
                          event
                        ) =>
                          setCall(
                            (
                              current
                            ) => ({
                              ...current,

                              followUpAt:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </label>
                  ) : null}

                  <label>
                    <span>
                      Call Remarks
                    </span>

                    <textarea
                      value={
                        call.remarks
                      }
                      onChange={(
                        event
                      ) =>
                        setCall(
                          (
                            current
                          ) => ({
                            ...current,

                            remarks:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      placeholder="What was discussed with the candidate?"
                    />
                  </label>

                  <button
                    type="button"
                    className="primary"
                    disabled={
                      submitting
                    }
                    onClick={
                      saveCall
                    }
                  >
                    {submitting
                      ? "Saving..."
                      : "Save Call Outcome"}
                  </button>
                </section>
              ) : null}

              {/* ===========================================
                  SCREENING
              ============================================ */}

              {action ===
              "SCREEN" ? (
                <section className="se-candidate-action-form">
                  <div className="grid">
                    <label>
                      <span>
                        Interested
                      </span>

                      <select
                        value={
                          screening
                            .interested
                        }
                        onChange={(
                          event
                        ) =>
                          setScreening(
                            (
                              current
                            ) => ({
                              ...current,

                              interested:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      >
                        <option value="YES">
                          Yes
                        </option>

                        <option value="NO">
                          No
                        </option>

                        <option value="FOLLOW_UP">
                          Follow-up
                        </option>

                        <option value="UNKNOWN">
                          Unknown
                        </option>
                      </select>
                    </label>

                    <label>
                      <span>
                        Screening Result
                      </span>

                      <select
                        value={
                          screening
                            .result
                        }
                        onChange={(
                          event
                        ) =>
                          setScreening(
                            (
                              current
                            ) => ({
                              ...current,

                              result:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      >
                        <option value="PENDING">
                          Complete Screening
                        </option>

                        <option value="SHORTLIST">
                          Shortlist
                        </option>

                        <option value="HOLD">
                          Hold / Follow-up
                        </option>

                        <option value="REJECT">
                          Reject
                        </option>
                      </select>
                    </label>
                  </div>

                  {(
                    screening.interested ===
                      "FOLLOW_UP" ||
                    screening.result ===
                      "HOLD"
                  ) ? (
                    <label>
                      <span>
                        Follow-up Date & Time *
                      </span>

                      <input
                        type="datetime-local"
                        value={
                          screening
                            .followUpAt
                        }
                        onChange={(
                          event
                        ) =>
                          setScreening(
                            (
                              current
                            ) => ({
                              ...current,

                              followUpAt:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </label>
                  ) : null}

                  {screening.interested ===
                  "NO" ? (
                    <label>
                      <span>
                        Reason Not Interested
                      </span>

                      <textarea
                        value={
                          screening
                            .reasonNotInterested
                        }
                        onChange={(
                          event
                        ) =>
                          setScreening(
                            (
                              current
                            ) => ({
                              ...current,

                              reasonNotInterested:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </label>
                  ) : null}

                  <div className="grid">
                    <label>
                      <span>
                        Current Company
                      </span>

                      <input
                        value={
                          screening
                            .currentCompany
                        }
                        onChange={(
                          event
                        ) =>
                          setScreening(
                            (
                              current
                            ) => ({
                              ...current,

                              currentCompany:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        Designation
                      </span>

                      <input
                        value={
                          screening
                            .currentDesignation
                        }
                        onChange={(
                          event
                        ) =>
                          setScreening(
                            (
                              current
                            ) => ({
                              ...current,

                              currentDesignation:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        Total Experience
                      </span>

                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={
                          screening
                            .totalExperienceYears
                        }
                        onChange={(
                          event
                        ) =>
                          setScreening(
                            (
                              current
                            ) => ({
                              ...current,

                              totalExperienceYears:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        Relevant Experience
                      </span>

                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={
                          screening
                            .relevantExperienceYears
                        }
                        onChange={(
                          event
                        ) =>
                          setScreening(
                            (
                              current
                            ) => ({
                              ...current,

                              relevantExperienceYears:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        Current CTC
                      </span>

                      <input
                        type="number"
                        min="0"
                        value={
                          screening
                            .currentSalary
                        }
                        onChange={(
                          event
                        ) =>
                          setScreening(
                            (
                              current
                            ) => ({
                              ...current,

                              currentSalary:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        Expected CTC
                      </span>

                      <input
                        type="number"
                        min="0"
                        value={
                          screening
                            .expectedSalary
                        }
                        onChange={(
                          event
                        ) =>
                          setScreening(
                            (
                              current
                            ) => ({
                              ...current,

                              expectedSalary:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        Notice Period
                      </span>

                      <input
                        type="number"
                        min="0"
                        value={
                          screening
                            .noticePeriodDays
                        }
                        onChange={(
                          event
                        ) =>
                          setScreening(
                            (
                              current
                            ) => ({
                              ...current,

                              noticePeriodDays:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        Earliest Joining
                      </span>

                      <input
                        type="date"
                        value={
                          screening
                            .earliestJoiningDate
                        }
                        onChange={(
                          event
                        ) =>
                          setScreening(
                            (
                              current
                            ) => ({
                              ...current,

                              earliestJoiningDate:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        Current Location
                      </span>

                      <input
                        value={
                          screening
                            .currentLocation
                        }
                        onChange={(
                          event
                        ) =>
                          setScreening(
                            (
                              current
                            ) => ({
                              ...current,

                              currentLocation:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        Preferred Location
                      </span>

                      <input
                        value={
                          screening
                            .preferredLocation
                        }
                        onChange={(
                          event
                        ) =>
                          setScreening(
                            (
                              current
                            ) => ({
                              ...current,

                              preferredLocation:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </label>
                  </div>

                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={
                        screening
                          .availableForInterview
                      }
                      onChange={(
                        event
                      ) =>
                        setScreening(
                          (
                            current
                          ) => ({
                            ...current,

                            availableForInterview:
                              event
                                .target
                                .checked,
                          })
                        )
                      }
                    />

                    Candidate is available for interview
                  </label>

                  {screening
                    .availableForInterview ? (
                    <label>
                      <span>
                        Preferred Interview Date
                      </span>

                      <input
                        type="date"
                        value={
                          screening
                            .preferredInterviewDate
                        }
                        onChange={(
                          event
                        ) =>
                          setScreening(
                            (
                              current
                            ) => ({
                              ...current,

                              preferredInterviewDate:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </label>
                  ) : null}

                  <div className="grid three">
                    <label>
                      <span>
                        Communication
                      </span>

                      <select
                        value={
                          screening
                            .communicationRating
                        }
                        onChange={(
                          event
                        ) =>
                          setScreening(
                            (
                              current
                            ) => ({
                              ...current,

                              communicationRating:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      >
                        {[
                          1,
                          2,
                          3,
                          4,
                          5,
                        ].map(
                          (
                            value
                          ) => (
                            <option
                              key={
                                value
                              }
                              value={
                                value
                              }
                            >
                              {value}/5
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label>
                      <span>
                        Skill Match
                      </span>

                      <select
                        value={
                          screening
                            .skillMatchRating
                        }
                        onChange={(
                          event
                        ) =>
                          setScreening(
                            (
                              current
                            ) => ({
                              ...current,

                              skillMatchRating:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      >
                        {[
                          1,
                          2,
                          3,
                          4,
                          5,
                        ].map(
                          (
                            value
                          ) => (
                            <option
                              key={
                                value
                              }
                              value={
                                value
                              }
                            >
                              {value}/5
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label>
                      <span>
                        Experience Match
                      </span>

                      <select
                        value={
                          screening
                            .experienceMatchRating
                        }
                        onChange={(
                          event
                        ) =>
                          setScreening(
                            (
                              current
                            ) => ({
                              ...current,

                              experienceMatchRating:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      >
                        {[
                          1,
                          2,
                          3,
                          4,
                          5,
                        ].map(
                          (
                            value
                          ) => (
                            <option
                              key={
                                value
                              }
                              value={
                                value
                              }
                            >
                              {value}/5
                            </option>
                          )
                        )}
                      </select>
                    </label>
                  </div>

                  <label>
                    <span>
                      Screening Remarks
                    </span>

                    <textarea
                      value={
                        screening
                          .remarks
                      }
                      onChange={(
                        event
                      ) =>
                        setScreening(
                          (
                            current
                          ) => ({
                            ...current,

                            remarks:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      placeholder="Screening notes..."
                    />
                  </label>

                  <button
                    type="button"
                    className="primary"
                    disabled={
                      submitting
                    }
                    onClick={
                      saveScreening
                    }
                  >
                    {submitting
                      ? "Saving..."
                      : "Save Screening"}
                  </button>
                </section>
              ) : null}

              {/* ===========================================
                  SHORTLIST / REJECT
              ============================================ */}

              {[
                "SHORTLIST",
                "REJECT",
              ].includes(
                action
              ) ? (
                <section className="se-candidate-action-form">
                  <div
                    className={
                      action ===
                      "SHORTLIST"
                        ? "se-candidate-decision-note shortlist"
                        : "se-candidate-decision-note reject"
                    }
                  >
                    <span>
                      {action ===
                      "SHORTLIST"
                        ? "✓"
                        : "!"}
                    </span>

                    <div>
                      <strong>
                        {action ===
                        "SHORTLIST"
                          ? "Move candidate to interview stage"
                          : "Reject this candidate"}
                      </strong>

                      <p>
                        {action ===
                        "SHORTLIST"
                          ? "After shortlisting, Schedule Interview becomes the recommended next action."
                          : "The rejection reason will be permanently recorded in the recruitment timeline."}
                      </p>
                    </div>
                  </div>

                  <label>
                    <span>
                      {action ===
                      "REJECT"
                        ? "Rejection Reason *"
                        : "Remarks"}
                    </span>

                    <textarea
                      value={
                        simpleRemarks
                      }
                      onChange={(
                        event
                      ) =>
                        setSimpleRemarks(
                          event
                            .target
                            .value
                        )
                      }
                    />
                  </label>

                  <button
                    type="button"
                    className={
                      action ===
                      "REJECT"
                        ? "danger"
                        : "success"
                    }
                    disabled={
                      submitting
                    }
                    onClick={
                      action ===
                      "REJECT"
                        ? saveReject
                        : saveShortlist
                    }
                  >
                    {submitting
                      ? "Processing..."
                      : action ===
                          "REJECT"
                        ? "Confirm Rejection"
                        : "Confirm Shortlist"}
                  </button>
                </section>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      {/* =================================================
          SCHEDULE INTERVIEW

          Owned here by ActionPanel so clicking the workflow
          button always opens the modal directly.
      ================================================== */}

      <ScheduleInterviewModal
        open={
          scheduleOpen
        }
        candidate={
          candidate
        }
        onClose={() =>
          setScheduleOpen(
            false
          )
        }
        onScheduled={
          handleInterviewScheduled
        }
      />
    </section>
  );
};

export default CandidateActionPanel;
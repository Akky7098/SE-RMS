import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getInterviewMeta,
  getInterviews,
  scheduleInterview,
} from "../../../services/interviewService";

import {
  getApiErrorMessage,
  getRecordId,
  safeText,
} from "../utils/recruitmentHelpers";

/* =========================================================
   DEFAULT FORM
========================================================= */

const EMPTY_FORM = {
  roundNumber: "1",

  roundName:
    "Technical Round",

  mode:
    "IN_PERSON",

  officeLocation:
    "DELHI",

  meetingLink:
    "",

  scheduledAt:
    "",

  durationMinutes:
    "45",

  interviewer:
    "",

  remarks:
    "",
};

/* =========================================================
   ACTIVE INTERVIEW STATUSES

   These statuses block another active interview.

   COMPLETED / CANCELLED / NO_SHOW do not block
   another interview round.
========================================================= */

const ACTIVE_INTERVIEW_STATUSES =
  new Set([
    "PENDING",
    "SCHEDULED",
    "RESCHEDULED",
    "CHECKED_IN",
    "IN_PROGRESS",
  ]);

/* =========================================================
   DATE / TIME HELPERS
========================================================= */

const toLocalDateTimeValue = (
  date
) => {
  const value =
    new Date(date);

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

const getMinimumDateTime =
  () => {
    /*
     * One-minute future buffer.
     * Avoid browser/server clock race.
     */

    const date =
      new Date(
        Date.now() +
          60 * 1000
      );

    return toLocalDateTimeValue(
      date
    );
  };

const formatPreviewDate = (
  value
) => {
  if (
    !value
  ) {
    return {
      date:
        "Not selected",

      time:
        "Not selected",
    };
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return {
      date:
        "Not selected",

      time:
        "Not selected",
    };
  }

  return {
    date:
      date.toLocaleDateString(
        "en-IN",
        {
          weekday:
            "short",

          day:
            "2-digit",

          month:
            "short",

          year:
            "numeric",
        }
      ),

    time:
      date.toLocaleTimeString(
        "en-IN",
        {
          hour:
            "2-digit",

          minute:
            "2-digit",

          hour12:
            true,
        }
      ),
  };
};

/* =========================================================
   COMPONENT
========================================================= */

const ScheduleInterviewModal = ({
  open,

  candidate,

  onClose,

  onScheduled,
}) => {
  /* =======================================================
     FORM
  ======================================================= */

  const [
    form,
    setForm,
  ] = useState({
    ...EMPTY_FORM,
  });

  /* =======================================================
     META / INTERVIEWERS
  ======================================================= */

  const [
    meta,
    setMeta,
  ] = useState({});

  const [
    loadingMeta,
    setLoadingMeta,
  ] = useState(false);

  const [
    metaError,
    setMetaError,
  ] = useState("");

  /* =======================================================
     DUPLICATE CHECK
  ======================================================= */

  const [
    checkingDuplicate,
    setCheckingDuplicate,
  ] = useState(false);

  const [
    existingActiveInterview,
    setExistingActiveInterview,
  ] = useState(null);

  /* =======================================================
     SUBMISSION
  ======================================================= */

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    fieldErrors,
    setFieldErrors,
  ] = useState({});

  /* =======================================================
     CANDIDATE ID
  ======================================================= */

  const candidateId =
    getRecordId(
      candidate
    );

  /* =========================================================
     LOAD INTERVIEW META

     IMPORTANT:
     candidateId is sent to backend.

     Backend then returns:
     - active users of candidate department
     - global SUPER_ADMIN users
  ========================================================= */

  const loadMeta =
    useCallback(
      async () => {
        if (
          !candidateId
        ) {
          setMeta({});

          setMetaError(
            "Candidate ID is missing. Interviewers cannot be loaded."
          );

          return;
        }

        try {
          setLoadingMeta(
            true
          );

          setMetaError(
            ""
          );

          const result =
            await getInterviewMeta(
              candidateId
            );

          setMeta(
            result || {}
          );

          const returnedInterviewers =
            result?.interviewers ||
            result?.users ||
            result?.employees ||
            [];

          if (
            !Array.isArray(
              returnedInterviewers
            ) ||
            returnedInterviewers.length ===
              0
          ) {
            setMetaError(
              "No eligible interviewer was found for this department."
            );
          }
        } catch (
          loadError
        ) {
          console.error(
            "Interview meta load error:",
            loadError
          );

          setMeta({});

          setMetaError(
            getApiErrorMessage(
              loadError,
              "Interviewer directory could not be loaded."
            )
          );
        } finally {
          setLoadingMeta(
            false
          );
        }
      },
      [
        candidateId,
      ]
    );

  /* =========================================================
     CHECK EXISTING ACTIVE INTERVIEW
  ========================================================= */

  const checkExistingInterview =
    useCallback(
      async () => {
        if (
          !candidateId
        ) {
          return;
        }

        try {
          setCheckingDuplicate(
            true
          );

          const result =
            await getInterviews({
              candidate:
                candidateId,
            });

          const records =
            Array.isArray(
              result
            )
              ? result
              : [];

          const active =
            records
              .filter(
                (
                  interview
                ) => {
                  const status =
                    String(
                      interview
                        ?.status ||
                        ""
                    )
                      .trim()
                      .toUpperCase();

                  return ACTIVE_INTERVIEW_STATUSES.has(
                    status
                  );
                }
              )
              .sort(
                (
                  a,
                  b
                ) => {
                  const timeA =
                    new Date(
                      a?.scheduledAt ||
                        a?.createdAt ||
                        0
                    ).getTime();

                  const timeB =
                    new Date(
                      b?.scheduledAt ||
                        b?.createdAt ||
                        0
                    ).getTime();

                  return (
                    timeB -
                    timeA
                  );
                }
              )[0] ||
            null;

          setExistingActiveInterview(
            active
          );
        } catch (
          duplicateError
        ) {
          /*
           * Do not permanently block the modal if
           * duplicate lookup temporarily fails.
           *
           * Backend still performs authoritative
           * duplicate protection.
           */

          console.error(
            "Existing interview check failed:",
            duplicateError
          );

          setExistingActiveInterview(
            null
          );
        } finally {
          setCheckingDuplicate(
            false
          );
        }
      },
      [
        candidateId,
      ]
    );

  /* =========================================================
     MODAL OPEN RESET
  ========================================================= */

  useEffect(() => {
    if (
      !open
    ) {
      return;
    }

    setForm({
      ...EMPTY_FORM,
    });

    setError("");

    setFieldErrors({});

    setMetaError("");

    setMeta({});

    setExistingActiveInterview(
      null
    );

    loadMeta();

    checkExistingInterview();
  }, [
    open,
    loadMeta,
    checkExistingInterview,
  ]);

  /* =========================================================
     LOCK BODY SCROLL + ESCAPE KEY
  ========================================================= */

  useEffect(() => {
    if (
      !open
    ) {
      return undefined;
    }

    const previousOverflow =
      document.body
        .style
        .overflow;

    document.body.style.overflow =
      "hidden";

    const handleEscape =
      (
        event
      ) => {
        if (
          event.key ===
            "Escape" &&
          !submitting
        ) {
          onClose?.();
        }
      };

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [
    open,
    submitting,
    onClose,
  ]);

  /* =========================================================
     INTERVIEWERS

     Backend may return:
     {
       interviewers: [...]
     }

     Compatibility fallbacks are kept.
  ========================================================= */

  const interviewers =
    useMemo(() => {
      const records =
        meta?.interviewers ||
        meta?.users ||
        meta?.employees ||
        [];

      if (
        !Array.isArray(
          records
        )
      ) {
        return [];
      }

      /*
       * Dedupe defensive layer.
       */

      const unique =
        new Map();

      records.forEach(
        (
          item
        ) => {
          const user =
            item?.user ||
            item;

          const id =
            getRecordId(
              user
            );

          if (
            !id
          ) {
            return;
          }

          unique.set(
            String(id),
            item
          );
        }
      );

      return Array.from(
        unique.values()
      ).sort(
        (
          first,
          second
        ) => {
          const firstUser =
            first?.user ||
            first;

          const secondUser =
            second?.user ||
            second;

          return String(
            firstUser
              ?.displayName ||
              ""
          ).localeCompare(
            String(
              secondUser
                ?.displayName ||
                ""
            ),
            "en",
            {
              sensitivity:
                "base",
            }
          );
        }
      );
    }, [
      meta,
    ]);

  /* =========================================================
     SELECTED INTERVIEWER
  ========================================================= */

  const selectedInterviewer =
    useMemo(() => {
      if (
        !form.interviewer
      ) {
        return null;
      }

      return (
        interviewers.find(
          (
            item
          ) => {
            const user =
              item?.user ||
              item;

            return (
              String(
                getRecordId(
                  user
                )
              ) ===
              String(
                form.interviewer
              )
            );
          }
        ) ||
        null
      );
    }, [
      interviewers,
      form.interviewer,
    ]);

  const selectedInterviewerUser =
    selectedInterviewer?.user ||
    selectedInterviewer ||
    null;

  /* =========================================================
     DATE PREVIEW
  ========================================================= */

  const schedulePreview =
    useMemo(
      () =>
        formatPreviewDate(
          form.scheduledAt
        ),
      [
        form.scheduledAt,
      ]
    );

  /* =========================================================
     EXISTING INTERVIEW PREVIEW
  ========================================================= */

  const existingInterviewPreview =
    useMemo(
      () =>
        existingActiveInterview
          ? formatPreviewDate(
              existingActiveInterview
                ?.scheduledAt
            )
          : null,
      [
        existingActiveInterview,
      ]
    );

  /* =========================================================
     CLEAR ONE FIELD ERROR
  ========================================================= */

  const clearFieldError = (
    name
  ) => {
    setFieldErrors(
      (
        current
      ) => {
        if (
          !current?.[
            name
          ]
        ) {
          return current;
        }

        const next = {
          ...current,
        };

        delete next[
          name
        ];

        return next;
      }
    );
  };

  /* =========================================================
     FORM UPDATE
  ========================================================= */

  const update = (
    name,
    value
  ) => {
    setError("");

    clearFieldError(
      name
    );

    setForm(
      (
        current
      ) => ({
        ...current,

        [name]:
          value,
      })
    );
  };

  /* =========================================================
     MODE CHANGE
  ========================================================= */

  const changeMode = (
    mode
  ) => {
    setError("");

    setFieldErrors(
      (
        current
      ) => {
        const next = {
          ...current,
        };

        delete next
          .officeLocation;

        delete next
          .meetingLink;

        return next;
      }
    );

    setForm(
      (
        current
      ) => ({
        ...current,

        mode,

        meetingLink:
          mode ===
          "ONLINE"
            ? current
                .meetingLink
            : "",

        officeLocation:
          mode ===
          "IN_PERSON"
            ? current
                .officeLocation ||
              "DELHI"
            : "",
      })
    );
  };

  /* =========================================================
     FIELD VALIDATION
  ========================================================= */

  const validate =
    () => {
      const errors = {};

      /* -----------------------------------------------------
         CANDIDATE
      ----------------------------------------------------- */

      if (
        !candidateId
      ) {
        errors.candidate =
          "Candidate information is missing. Close this form and refresh the candidate page.";
      }

      /* -----------------------------------------------------
         ROUND NUMBER
      ----------------------------------------------------- */

      const roundNumber =
        Number(
          form.roundNumber
        );

      if (
        !Number.isFinite(
          roundNumber
        ) ||
        roundNumber <
          1 ||
        roundNumber >
          20
      ) {
        errors.roundNumber =
          "Please select a valid interview round.";
      }

      /* -----------------------------------------------------
         ROUND NAME
      ----------------------------------------------------- */

      const roundName =
        String(
          form.roundName ||
            ""
        ).trim();

      if (
        !roundName
      ) {
        errors.roundName =
          "Interview round name is required.";
      } else if (
        roundName.length <
          2
      ) {
        errors.roundName =
          "Round name must contain at least 2 characters.";
      } else if (
        roundName.length >
          80
      ) {
        errors.roundName =
          "Round name cannot exceed 80 characters.";
      }

      /* -----------------------------------------------------
         INTERVIEWER
      ----------------------------------------------------- */

      const interviewerId =
        String(
          form.interviewer ||
            ""
        ).trim();

      if (
        !interviewerId
      ) {
        errors.interviewer =
          "Please select an interviewer.";
      } else {
        const stillExists =
          interviewers.some(
            (
              item
            ) => {
              const user =
                item?.user ||
                item;

              return (
                String(
                  getRecordId(
                    user
                  )
                ) ===
                interviewerId
              );
            }
          );

        if (
          !stillExists
        ) {
          errors.interviewer =
            "The selected interviewer is no longer available. Refresh the interviewer list.";
        }
      }

      /* -----------------------------------------------------
         DATE / TIME
      ----------------------------------------------------- */

      if (
        !form.scheduledAt
      ) {
        errors.scheduledAt =
          "Interview date and time are required.";
      } else {
        const selectedDate =
          new Date(
            form.scheduledAt
          );

        if (
          Number.isNaN(
            selectedDate.getTime()
          )
        ) {
          errors.scheduledAt =
            "Please select a valid interview date and time.";
        } else if (
          selectedDate.getTime() <=
          Date.now()
        ) {
          errors.scheduledAt =
            "Past date or time cannot be selected.";
        }
      }

      /* -----------------------------------------------------
         DURATION
      ----------------------------------------------------- */

      const duration =
        Number(
          form.durationMinutes
        );

      if (
        !Number.isFinite(
          duration
        ) ||
        duration <
          15 ||
        duration >
          240
      ) {
        errors.durationMinutes =
          "Interview duration must be between 15 and 240 minutes.";
      }

      /* -----------------------------------------------------
         MODE
      ----------------------------------------------------- */

      if (
        ![
          "IN_PERSON",
          "ONLINE",
          "PHONE",
        ].includes(
          form.mode
        )
      ) {
        errors.mode =
          "Please select a valid interview mode.";
      }

      /* -----------------------------------------------------
         OFFICE
      ----------------------------------------------------- */

      if (
        form.mode ===
          "IN_PERSON" &&
        !String(
          form.officeLocation ||
            ""
        ).trim()
      ) {
        errors.officeLocation =
          "Please select the interview office.";
      }

      /* -----------------------------------------------------
         ONLINE LINK
      ----------------------------------------------------- */

      if (
        form.mode ===
        "ONLINE"
      ) {
        const link =
          String(
            form.meetingLink ||
              ""
          ).trim();

        if (
          !link
        ) {
          errors.meetingLink =
            "Meeting link is required for an online interview.";
        } else {
          try {
            const parsedUrl =
              new URL(
                link
              );

            if (
              ![
                "http:",
                "https:",
              ].includes(
                parsedUrl.protocol
              )
            ) {
              errors.meetingLink =
                "Enter a valid HTTP or HTTPS meeting link.";
            }
          } catch {
            errors.meetingLink =
              "Enter a valid meeting link such as https://meet.google.com/...";
          }
        }
      }

      /* -----------------------------------------------------
         REMARKS
      ----------------------------------------------------- */

      if (
        String(
          form.remarks ||
            ""
        ).length >
        1000
      ) {
        errors.remarks =
          "Interview notes cannot exceed 1000 characters.";
      }

      /* -----------------------------------------------------
         DUPLICATE ACTIVE INTERVIEW
      ----------------------------------------------------- */

      if (
        existingActiveInterview
      ) {
        errors.duplicate =
          "An active interview already exists for this candidate. Open the existing interview to reschedule or manage it.";
      }

      setFieldErrors(
        errors
      );

      if (
        Object.keys(
          errors
        ).length >
        0
      ) {
        setError(
          "Please correct the highlighted fields before scheduling the interview."
        );

        return false;
      }

      setError("");

      return true;
    };

  /* =========================================================
     SUCCESS CLEANUP
  ========================================================= */

  const clearSuccessState =
    () => {
      setError("");

      setFieldErrors({});
    };

  /* =========================================================
     SUBMIT

     Duplicate is checked AGAIN immediately before POST.
  ========================================================= */

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      if (
        submitting ||
        checkingDuplicate
      ) {
        return;
      }

      if (
        !validate()
      ) {
        return;
      }

      try {
        setSubmitting(
          true
        );

        setError("");

        /* ---------------------------------------------------
           SERVER-SYNC DUPLICATE CHECK
        --------------------------------------------------- */

        const latestInterviews =
          await getInterviews({
            candidate:
              candidateId,
          });

        const duplicate =
          (
            Array.isArray(
              latestInterviews
            )
              ? latestInterviews
              : []
          ).find(
            (
              interview
            ) => {
              const status =
                String(
                  interview
                    ?.status ||
                    ""
                )
                  .trim()
                  .toUpperCase();

              return ACTIVE_INTERVIEW_STATUSES.has(
                status
              );
            }
          );

        if (
          duplicate
        ) {
          setExistingActiveInterview(
            duplicate
          );

          setFieldErrors(
            (
              current
            ) => ({
              ...current,

              duplicate:
                "An active interview already exists for this candidate.",
            })
          );

          setError(
            "This candidate already has an active interview. Please manage or reschedule the existing interview."
          );

          return;
        }

        /* ---------------------------------------------------
           FINAL DATE CHECK

           A form may remain open for several minutes.
        --------------------------------------------------- */

        const finalScheduledAt =
          new Date(
            form.scheduledAt
          );

        if (
          Number.isNaN(
            finalScheduledAt
              .getTime()
          ) ||
          finalScheduledAt
            .getTime() <=
          Date.now()
        ) {
          setFieldErrors(
            (
              current
            ) => ({
              ...current,

              scheduledAt:
                "Selected interview time has already passed. Please choose a new future time.",
            })
          );

          setError(
            "Please select a future interview date and time."
          );

          return;
        }

        /* ---------------------------------------------------
           PAYLOAD
        --------------------------------------------------- */

        const payload = {
          roundNumber:
            Number(
              form.roundNumber ||
                1
            ),

          roundName:
            form.roundName
              .trim(),

          interviewer:
            form.interviewer,

          scheduledAt:
            finalScheduledAt
              .toISOString(),

          durationMinutes:
            Number(
              form.durationMinutes
            ),

          timezone:
            "Asia/Kolkata",

          mode:
            form.mode,

          officeLocation:
            form.mode ===
            "IN_PERSON"
              ? form
                  .officeLocation
              : null,

          meetingLink:
            form.mode ===
            "ONLINE"
              ? form
                  .meetingLink
                  .trim()
              : "",

          remarks:
            form.remarks
              .trim(),
        };

        /* ---------------------------------------------------
           CREATE
        --------------------------------------------------- */

        const interview =
          await scheduleInterview(
            candidateId,
            payload
          );

        clearSuccessState();

        await onScheduled?.(
          interview
        );
      } catch (
        submitError
      ) {
        const message =
          getApiErrorMessage(
            submitError,
            "Interview could not be scheduled."
          );

        setError(
          message
        );

        /*
         * Backend authoritative duplicate protection.
         */

        if (
          submitError
            ?.response
            ?.status ===
          409
        ) {
          setFieldErrors(
            (
              current
            ) => ({
              ...current,

              duplicate:
                message,
            })
          );
        }
      } finally {
        setSubmitting(
          false
        );
      }
    };

  /* =========================================================
     CLOSE
  ========================================================= */

  const handleClose =
    () => {
      if (
        submitting
      ) {
        return;
      }

      onClose?.();
    };

  /* =========================================================
     BUTTON DISABLED STATE
  ========================================================= */

  const scheduleDisabled =
    submitting ||
    checkingDuplicate ||
    loadingMeta ||
    Boolean(
      existingActiveInterview
    ) ||
    interviewers.length ===
      0;

  /* =========================================================
     RENDER
  ========================================================= */

  if (
    !open
  ) {
    return null;
  }

  return (
    <div
      className="se-interview-modal-overlay"
      role="presentation"
      onMouseDown={(
        event
      ) => {
        /*
         * Close ONLY if the actual backdrop was clicked.
         * Clicking inside modal never closes it accidentally.
         */

        if (
          event.target ===
            event.currentTarget
        ) {
          handleClose();
        }
      }}
    >
      <section
        className="se-interview-schedule-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-interview-title"
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        {/* =================================================
            HEADER
        ================================================== */}

        <header className="se-interview-modal-head se-interview-schedule-head">
          <div>
            <span className="se-interview-eyebrow">
              INTERVIEW SCHEDULING
            </span>

            <h2 id="schedule-interview-title">
              Schedule Interview
            </h2>

            <p>
              Select the interview round,
              interviewer, date and mode.
              The interview will be saved
              directly against this
              candidate's recruitment
              workflow.
            </p>
          </div>

          <button
            type="button"
            className="se-interview-modal-close"
            onClick={
              handleClose
            }
            disabled={
              submitting
            }
            aria-label="Close schedule interview"
          >
            ×
          </button>
        </header>

        {/* =================================================
            CANDIDATE CONTEXT
        ================================================== */}

        <div className="se-interview-schedule-context">
          <div className="candidate">
            <span className="avatar">
              {safeText(
                candidate
                  ?.fullName,
                "C"
              )
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
                {safeText(
                  candidate
                    ?.fullName,
                  "Candidate"
                )}
              </strong>

              <p>
                {safeText(
                  candidate
                    ?.positionTitle,
                  "Position"
                )}

                {" · "}

                {safeText(
                  candidate
                    ?.candidateNumber,
                  "Candidate ID"
                )}
              </p>
            </div>
          </div>

          <div className="contact">
            <small>
              INVITATION EMAIL
            </small>

            <strong>
              {safeText(
                candidate
                  ?.email,
                "Email not available"
              )}
            </strong>

            <p>
              {candidate?.email
                ? "Candidate interview notification recipient"
                : "Candidate does not currently have an email address"}
            </p>
          </div>
        </div>

        {/* =================================================
            DUPLICATE CHECK LOADING
        ================================================== */}

        {checkingDuplicate ? (
          <div className="se-interview-checking-banner">
            <span className="spinner" />

            <div>
              <strong>
                Checking interview schedule
              </strong>

              <p>
                Verifying that this
                candidate does not already
                have an active interview.
              </p>
            </div>
          </div>
        ) : null}

        {/* =================================================
            EXISTING INTERVIEW
        ================================================== */}

        {existingActiveInterview ? (
          <div className="se-interview-duplicate-banner">
            <span>
              !
            </span>

            <div>
              <strong>
                Active interview already exists
              </strong>

              <p>
                {safeText(
                  existingActiveInterview
                    ?.roundName,
                  `Round ${
                    existingActiveInterview
                      ?.roundNumber ||
                    1
                  }`
                )}

                {" · "}

                {existingInterviewPreview
                  ?.date}

                {" · "}

                {existingInterviewPreview
                  ?.time}
              </p>

              <small>
                Open the existing interview
                to reschedule, cancel or
                manage it instead of
                creating a duplicate.
              </small>
            </div>
          </div>
        ) : null}

        {/* =================================================
            GLOBAL ERROR
        ================================================== */}

        {error ? (
          <div className="se-interview-error se-interview-schedule-error">
            <span>
              !
            </span>

            <div>
              <strong>
                Please check the form
              </strong>

              <p>
                {
                  error
                }
              </p>
            </div>
          </div>
        ) : null}

        {/* =================================================
            FORM
        ================================================== */}

        <form
          className="se-interview-form se-interview-premium-form"
          onSubmit={
            handleSubmit
          }
          noValidate
        >
          {/* ===============================================
              01 INTERVIEW ROUND
          ================================================ */}

          <section className="se-interview-form-card">
            <header>
              <span>
                01
              </span>

              <div>
                <strong>
                  Interview Round
                </strong>

                <small>
                  Select the interview
                  stage and the employee
                  who will conduct the
                  interview.
                </small>
              </div>
            </header>

            <div className="grid">
              {/* ===========================================
                  ROUND NUMBER
              ============================================ */}

              <label
                className={
                  fieldErrors
                    .roundNumber
                    ? "has-error"
                    : ""
                }
              >
                <span>
                  Round Number
                </span>

                <select
                  value={
                    form.roundNumber
                  }
                  disabled={
                    submitting
                  }
                  onChange={(
                    event
                  ) =>
                    update(
                      "roundNumber",
                      event
                        .target
                        .value
                    )
                  }
                >
                  <option value="1">
                    Round 1
                  </option>

                  <option value="2">
                    Round 2
                  </option>

                  <option value="3">
                    Round 3
                  </option>

                  <option value="4">
                    Round 4
                  </option>
                </select>

                {fieldErrors
                  .roundNumber ? (
                  <small className="se-interview-field-error">
                    {
                      fieldErrors
                        .roundNumber
                    }
                  </small>
                ) : null}
              </label>

              {/* ===========================================
                  ROUND NAME
              ============================================ */}

              <label
                className={
                  fieldErrors
                    .roundName
                    ? "has-error"
                    : ""
                }
              >
                <span>
                  Round Name *
                </span>

                <input
                  value={
                    form.roundName
                  }
                  maxLength={
                    80
                  }
                  disabled={
                    submitting
                  }
                  onChange={(
                    event
                  ) =>
                    update(
                      "roundName",
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="e.g. Technical Round"
                />

                {fieldErrors
                  .roundName ? (
                  <small className="se-interview-field-error">
                    {
                      fieldErrors
                        .roundName
                    }
                  </small>
                ) : null}
              </label>

              {/* ===========================================
                  INTERVIEWER
              ============================================ */}

              <label
                className={`wide ${
                  fieldErrors
                    .interviewer
                    ? "has-error"
                    : ""
                }`}
              >
                <span>
                  Interviewer *
                </span>

                {loadingMeta ? (
                  <div className="se-interview-directory-loading">
                    <span className="spinner" />

                    <span>
                      Loading eligible
                      interviewers...
                    </span>
                  </div>
                ) : interviewers.length >
                  0 ? (
                  <>
                    <select
                      value={
                        form.interviewer
                      }
                      disabled={
                        submitting
                      }
                      onChange={(
                        event
                      ) =>
                        update(
                          "interviewer",
                          event
                            .target
                            .value
                        )
                      }
                    >
                      <option value="">
                        Select interviewer
                      </option>

                      {interviewers.map(
                        (
                          item
                        ) => {
                          const user =
                            item?.user ||
                            item;

                          const id =
                            getRecordId(
                              user
                            );

                          if (
                            !id
                          ) {
                            return null;
                          }

                          /*
                           * IMPORTANT:
                           * Dropdown shows NAME ONLY.
                           */

                          return (
                            <option
                              key={
                                id
                              }
                              value={
                                id
                              }
                            >
                              {safeText(
                                user
                                  ?.displayName,
                                "Employee"
                              )}
                            </option>
                          );
                        }
                      )}
                    </select>

                    <small className="se-interview-field-help">
                      Eligible interviewers
                      include active members
                      of the candidate's
                      department and Global
                      Super Admins.
                    </small>
                  </>
                ) : (
                  <div className="se-interview-directory-unavailable">
                    <div>
                      <strong>
                        No interviewer available
                      </strong>

                      <p>
                        Eligible employees
                        could not be loaded
                        for this candidate's
                        department.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        loadMeta
                      }
                      disabled={
                        loadingMeta ||
                        submitting
                      }
                    >
                      Retry
                    </button>
                  </div>
                )}

                {metaError ? (
                  <small className="se-interview-field-warning">
                    {
                      metaError
                    }
                  </small>
                ) : null}

                {fieldErrors
                  .interviewer ? (
                  <small className="se-interview-field-error">
                    {
                      fieldErrors
                        .interviewer
                    }
                  </small>
                ) : null}
              </label>
            </div>

            {/* =============================================
                SELECTED INTERVIEWER CONFIRMATION
            ============================================== */}

            {selectedInterviewerUser ? (
              <div className="se-interview-selected-person">
                <span>
                  {safeText(
                    selectedInterviewerUser
                      ?.displayName,
                    "I"
                  )
                    .charAt(
                      0
                    )
                    .toUpperCase()}
                </span>

                <div>
                  <small>
                    SELECTED INTERVIEWER
                  </small>

                  <strong>
                    {safeText(
                      selectedInterviewerUser
                        ?.displayName,
                      "Interviewer"
                    )}
                  </strong>

                  <p>
                    {safeText(
                      selectedInterviewerUser
                        ?.email,
                      "Email not available"
                    )}
                  </p>
                </div>

                <b>
                  ✓
                </b>
              </div>
            ) : null}
          </section>

          {/* ===============================================
              02 DATE & TIME
          ================================================ */}

          <section className="se-interview-form-card">
            <header>
              <span>
                02
              </span>

              <div>
                <strong>
                  Date & Time
                </strong>

                <small>
                  Select the future date,
                  start time and expected
                  interview duration.
                </small>
              </div>
            </header>

            <div className="grid">
              {/* ===========================================
                  DATE TIME
              ============================================ */}

              <label
                className={`wide ${
                  fieldErrors
                    .scheduledAt
                    ? "has-error"
                    : ""
                }`}
              >
                <span>
                  Interview Date & Time *
                </span>

                <input
                  type="datetime-local"
                  min={
                    getMinimumDateTime()
                  }
                  value={
                    form.scheduledAt
                  }
                  disabled={
                    submitting
                  }
                  onChange={(
                    event
                  ) =>
                    update(
                      "scheduledAt",
                      event
                        .target
                        .value
                    )
                  }
                />

                {fieldErrors
                  .scheduledAt ? (
                  <small className="se-interview-field-error">
                    {
                      fieldErrors
                        .scheduledAt
                    }
                  </small>
                ) : (
                  <small className="se-interview-field-help">
                    Past dates and times
                    cannot be selected.
                  </small>
                )}
              </label>

              {/* ===========================================
                  DURATION
              ============================================ */}

              <label
                className={
                  fieldErrors
                    .durationMinutes
                    ? "has-error"
                    : ""
                }
              >
                <span>
                  Duration
                </span>

                <select
                  value={
                    form.durationMinutes
                  }
                  disabled={
                    submitting
                  }
                  onChange={(
                    event
                  ) =>
                    update(
                      "durationMinutes",
                      event
                        .target
                        .value
                    )
                  }
                >
                  <option value="30">
                    30 Minutes
                  </option>

                  <option value="45">
                    45 Minutes
                  </option>

                  <option value="60">
                    60 Minutes
                  </option>

                  <option value="90">
                    90 Minutes
                  </option>
                </select>

                {fieldErrors
                  .durationMinutes ? (
                  <small className="se-interview-field-error">
                    {
                      fieldErrors
                        .durationMinutes
                    }
                  </small>
                ) : null}
              </label>

              {/* ===========================================
                  TIMEZONE
              ============================================ */}

              <label>
                <span>
                  Timezone
                </span>

                <input
                  value="India · Asia/Kolkata"
                  disabled
                  readOnly
                />
              </label>
            </div>

            {/* =============================================
                PREVIEW
            ============================================== */}

            <div className="se-interview-date-preview">
              <span>
                DATE
              </span>

              <div>
                <small>
                  INTERVIEW DATE
                </small>

                <strong>
                  {
                    schedulePreview.date
                  }
                </strong>
              </div>

              <div>
                <small>
                  START TIME
                </small>

                <strong>
                  {
                    schedulePreview.time
                  }
                </strong>
              </div>

              <div>
                <small>
                  DURATION
                </small>

                <strong>
                  {
                    form.durationMinutes
                  }{" "}
                  minutes
                </strong>
              </div>
            </div>
          </section>

          {/* ===============================================
              03 MODE
          ================================================ */}

          <section className="se-interview-form-card">
            <header>
              <span>
                03
              </span>

              <div>
                <strong>
                  Interview Mode
                </strong>

                <small>
                  Choose how the candidate
                  and interviewer will
                  connect.
                </small>
              </div>
            </header>

            <div className="se-interview-mode-grid se-interview-premium-mode-grid">
              {[
                [
                  "IN_PERSON",
                  "O",
                  "In Person",
                  "At company office",
                ],

                [
                  "ONLINE",
                  "V",
                  "Online",
                  "Video meeting",
                ],

                [
                  "PHONE",
                  "☎",
                  "Phone",
                  "Voice interview",
                ],
              ].map(
                ([
                  value,
                  icon,
                  title,
                  description,
                ]) => (
                  <button
                    type="button"
                    key={
                      value
                    }
                    className={
                      form.mode ===
                      value
                        ? "active"
                        : ""
                    }
                    disabled={
                      submitting
                    }
                    onClick={() =>
                      changeMode(
                        value
                      )
                    }
                  >
                    <span>
                      {
                        icon
                      }
                    </span>

                    <div>
                      <strong>
                        {
                          title
                        }
                      </strong>

                      <small>
                        {
                          description
                        }
                      </small>
                    </div>

                    <b>
                      {form.mode ===
                      value
                        ? "✓"
                        : ""}
                    </b>
                  </button>
                )
              )}
            </div>

            {/* =============================================
                IN PERSON
            ============================================== */}

            {form.mode ===
            "IN_PERSON" ? (
              <label
                className={`standalone ${
                  fieldErrors
                    .officeLocation
                    ? "has-error"
                    : ""
                }`}
              >
                <span>
                  Office Location *
                </span>

                <select
                  value={
                    form.officeLocation
                  }
                  disabled={
                    submitting
                  }
                  onChange={(
                    event
                  ) =>
                    update(
                      "officeLocation",
                      event
                        .target
                        .value
                    )
                  }
                >
                  <option value="DELHI">
                    Delhi Office
                  </option>

                  <option value="SONIPAT">
                    Sonipat Office
                  </option>
                </select>

                {fieldErrors
                  .officeLocation ? (
                  <small className="se-interview-field-error">
                    {
                      fieldErrors
                        .officeLocation
                    }
                  </small>
                ) : null}
              </label>
            ) : null}

            {/* =============================================
                ONLINE
            ============================================== */}

            {form.mode ===
            "ONLINE" ? (
              <label
                className={`standalone ${
                  fieldErrors
                    .meetingLink
                    ? "has-error"
                    : ""
                }`}
              >
                <span>
                  Meeting Link *
                </span>

                <input
                  type="url"
                  value={
                    form.meetingLink
                  }
                  disabled={
                    submitting
                  }
                  onChange={(
                    event
                  ) =>
                    update(
                      "meetingLink",
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="https://meet.google.com/..."
                />

                {fieldErrors
                  .meetingLink ? (
                  <small className="se-interview-field-error">
                    {
                      fieldErrors
                        .meetingLink
                    }
                  </small>
                ) : (
                  <small className="se-interview-field-help">
                    This link will be sent
                    to both the candidate
                    and interviewer in the
                    interview notification.
                  </small>
                )}
              </label>
            ) : null}

            {/* =============================================
                PHONE
            ============================================== */}

            {form.mode ===
            "PHONE" ? (
              <div className="se-interview-mode-info phone">
                <span>
                  ☎
                </span>

                <div>
                  <strong>
                    Phone Interview
                  </strong>

                  <p>
                    Candidate contact:{" "}

                    {safeText(
                      candidate
                        ?.mobile,
                      "Mobile number not available"
                    )}
                  </p>
                </div>
              </div>
            ) : null}
          </section>

          {/* ===============================================
              04 NOTES
          ================================================ */}

          <section className="se-interview-form-card">
            <header>
              <span>
                04
              </span>

              <div>
                <strong>
                  Interview Notes
                </strong>

                <small>
                  Optional internal notes
                  for the interviewer.
                  These are not shown to
                  the candidate.
                </small>
              </div>
            </header>

            <label
              className={`standalone ${
                fieldErrors
                  .remarks
                  ? "has-error"
                  : ""
              }`}
            >
              <span>
                Internal Remarks
              </span>

              <textarea
                value={
                  form.remarks
                }
                maxLength={
                  1000
                }
                disabled={
                  submitting
                }
                onChange={(
                  event
                ) =>
                  update(
                    "remarks",
                    event
                      .target
                      .value
                  )
                }
                placeholder="Example: Focus on B2B sales experience, customer handling and negotiation skills..."
              />

              {fieldErrors
                .remarks ? (
                <small className="se-interview-field-error">
                  {
                    fieldErrors
                      .remarks
                  }
                </small>
              ) : (
                <small className="se-interview-field-help">
                  {
                    form.remarks
                      .length
                  }
                  /1000 characters
                </small>
              )}
            </label>
          </section>

          {/* ===============================================
              EMAIL / NOTIFICATION PREVIEW
          ================================================ */}

          <section className="se-interview-notification-preview">
            <div className="se-interview-notification-icon">
              ✉
            </div>

            <div className="se-interview-notification-main">
              <span>
                INTERVIEW NOTIFICATIONS
              </span>

              <strong>
                Notification recipients
              </strong>

              <p>
                After the backend mail
                service is enabled,
                scheduling this interview
                will automatically notify
                the candidate and selected
                interviewer.
              </p>

              <div className="se-interview-notification-recipients">
                {/* =========================================
                    CANDIDATE
                ========================================== */}

                <div>
                  <span className="person candidate">
                    C
                  </span>

                  <div>
                    <small>
                      CANDIDATE
                    </small>

                    <strong>
                      {safeText(
                        candidate
                          ?.fullName,
                        "Candidate"
                      )}
                    </strong>

                    <p>
                      {safeText(
                        candidate
                          ?.email,
                        "Email unavailable"
                      )}
                    </p>
                  </div>
                </div>

                {/* =========================================
                    INTERVIEWER
                ========================================== */}

                <div>
                  <span className="person interviewer">
                    I
                  </span>

                  <div>
                    <small>
                      INTERVIEWER
                    </small>

                    <strong>
                      {safeText(
                        selectedInterviewerUser
                          ?.displayName,
                        "Select interviewer"
                      )}
                    </strong>

                    <p>
                      {safeText(
                        selectedInterviewerUser
                          ?.email,
                        "Email unavailable"
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <span className="se-interview-notification-state">
              PREPARED
            </span>
          </section>

          {/* ===============================================
              DUPLICATE ERROR
          ================================================ */}

          {fieldErrors
            .duplicate ? (
            <div className="se-interview-inline-block-error">
              <span>
                !
              </span>

              <div>
                <strong>
                  Duplicate interview blocked
                </strong>

                <p>
                  {
                    fieldErrors
                      .duplicate
                  }
                </p>
              </div>
            </div>
          ) : null}

          {/* ===============================================
              CANDIDATE ERROR
          ================================================ */}

          {fieldErrors
            .candidate ? (
            <div className="se-interview-inline-block-error">
              <span>
                !
              </span>

              <div>
                <strong>
                  Candidate information unavailable
                </strong>

                <p>
                  {
                    fieldErrors
                      .candidate
                  }
                </p>
              </div>
            </div>
          ) : null}

          {/* ===============================================
              FOOTER
          ================================================ */}

          <footer className="se-interview-schedule-footer">
            <div className="se-interview-schedule-footer-info">
              <span>
                {existingActiveInterview
                  ? "!"
                  : loadingMeta
                    ? "…"
                    : "✓"}
              </span>

              <div>
                <strong>
                  {existingActiveInterview
                    ? "Existing interview found"
                    : loadingMeta
                      ? "Loading interviewer directory"
                      : interviewers.length ===
                          0
                        ? "Interviewer required"
                        : "Ready to schedule"}
                </strong>

                <small>
                  {existingActiveInterview
                    ? "Manage the active interview instead of creating a duplicate."
                    : loadingMeta
                      ? "Please wait while eligible interviewers are loaded."
                      : interviewers.length ===
                          0
                        ? "An eligible interviewer must be available before scheduling."
                        : "Interview will be saved to the candidate recruitment workflow."}
                </small>
              </div>
            </div>

            <div className="se-interview-schedule-footer-actions">
              <button
                type="button"
                className="secondary"
                onClick={
                  handleClose
                }
                disabled={
                  submitting
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary"
                disabled={
                  scheduleDisabled
                }
              >
                {submitting ? (
                  <>
                    <span className="se-interview-submit-spinner" />

                    Scheduling...
                  </>
                ) : checkingDuplicate ? (
                  "Checking..."
                ) : loadingMeta ? (
                  "Loading..."
                ) : existingActiveInterview ? (
                  "Interview Already Scheduled"
                ) : interviewers.length ===
                    0 ? (
                  "Interviewer Required"
                ) : (
                  <>
                    Schedule Interview

                    <span>
                      →
                    </span>
                  </>
                )}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
};

export default ScheduleInterviewModal;
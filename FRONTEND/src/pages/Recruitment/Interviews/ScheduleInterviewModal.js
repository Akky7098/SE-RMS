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
   DEFAULTS
========================================================= */

const EMPTY_FORM = {
  roundNumber: "1",
  roundName: "Technical Round",
  mode: "IN_PERSON",
  officeLocation: "DELHI",
  meetingLink: "",
  scheduledAt: "",
  durationMinutes: "45",
  interviewer: "",
  remarks: "",
};

const ACTIVE_INTERVIEW_STATUSES = new Set([
  "PENDING",
  "SCHEDULED",
  "RESCHEDULED",
  "CHECKED_IN",
  "IN_PROGRESS",
]);

/* =========================================================
   HELPERS
========================================================= */

const toLocalDateTimeValue = (date) => {
  const value = new Date(date);

  value.setSeconds(0, 0);

  value.setMinutes(
    value.getMinutes() - value.getTimezoneOffset()
  );

  return value.toISOString().slice(0, 16);
};

const getMinimumDateTime = () => {
  return toLocalDateTimeValue(
    new Date(Date.now() + 60 * 1000)
  );
};

const formatPreviewDate = (value) => {
  if (!value) {
    return {
      date: "Not selected",
      time: "Not selected",
    };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      date: "Not selected",
      time: "Not selected",
    };
  }

  return {
    date: date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),

    time: date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
};

const getStatus = (interview) =>
  String(interview?.status || "")
    .trim()
    .toUpperCase();

/* =========================================================
   COMPONENT
========================================================= */

const ScheduleInterviewModal = ({
  open,
  candidate,
  onClose,
  onScheduled,
}) => {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
  });

  const [meta, setMeta] = useState({});
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [metaError, setMetaError] = useState("");

  const [
    checkingDuplicate,
    setCheckingDuplicate,
  ] = useState(false);

  const [
    existingActiveInterview,
    setExistingActiveInterview,
  ] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const candidateId = getRecordId(candidate);

  /* =========================================================
     LOAD INTERVIEWERS
  ========================================================= */

  const loadMeta = useCallback(async () => {
    if (!candidateId) {
      setMeta({});

      setMetaError(
        "Candidate information is unavailable."
      );

      return;
    }

    try {
      setLoadingMeta(true);
      setMetaError("");

      const result = await getInterviewMeta(
        candidateId
      );

      setMeta(result || {});

      const records =
        result?.interviewers ||
        result?.users ||
        result?.employees ||
        [];

      if (!Array.isArray(records) || !records.length) {
        setMetaError(
          "No eligible interviewer is available."
        );
      }
    } catch (loadError) {
      console.error(
        "Interview meta load error:",
        loadError
      );

      setMeta({});

      setMetaError(
        getApiErrorMessage(
          loadError,
          "Interviewer list could not be loaded."
        )
      );
    } finally {
      setLoadingMeta(false);
    }
  }, [candidateId]);

  /* =========================================================
     EXISTING ACTIVE INTERVIEW
  ========================================================= */

  const checkExistingInterview =
    useCallback(async () => {
      if (!candidateId) {
        return;
      }

      try {
        setCheckingDuplicate(true);

        const result = await getInterviews({
          candidate: candidateId,
        });

        const records = Array.isArray(result)
          ? result
          : [];

        const active =
          records
            .filter((interview) =>
              ACTIVE_INTERVIEW_STATUSES.has(
                getStatus(interview)
              )
            )
            .sort((a, b) => {
              const first = new Date(
                a?.scheduledAt ||
                  a?.createdAt ||
                  0
              ).getTime();

              const second = new Date(
                b?.scheduledAt ||
                  b?.createdAt ||
                  0
              ).getTime();

              return second - first;
            })[0] || null;

        setExistingActiveInterview(active);
      } catch (duplicateError) {
        console.error(
          "Existing interview check failed:",
          duplicateError
        );

        setExistingActiveInterview(null);
      } finally {
        setCheckingDuplicate(false);
      }
    }, [candidateId]);

  /* =========================================================
     OPEN RESET
  ========================================================= */

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm({
      ...EMPTY_FORM,
    });

    setError("");
    setFieldErrors({});
    setMetaError("");
    setMeta({});
    setExistingActiveInterview(null);

    loadMeta();
    checkExistingInterview();
  }, [
    open,
    loadMeta,
    checkExistingInterview,
  ]);

  /* =========================================================
     BODY LOCK / ESCAPE
  ========================================================= */

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (
        event.key === "Escape" &&
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
  ========================================================= */

  const interviewers = useMemo(() => {
    const records =
      meta?.interviewers ||
      meta?.users ||
      meta?.employees ||
      [];

    if (!Array.isArray(records)) {
      return [];
    }

    const unique = new Map();

    records.forEach((item) => {
      const user = item?.user || item;
      const id = getRecordId(user);

      if (!id) {
        return;
      }

      unique.set(String(id), item);
    });

    return Array.from(unique.values()).sort(
      (first, second) => {
        const firstUser =
          first?.user || first;

        const secondUser =
          second?.user || second;

        return String(
          firstUser?.displayName || ""
        ).localeCompare(
          String(
            secondUser?.displayName || ""
          ),
          "en",
          {
            sensitivity: "base",
          }
        );
      }
    );
  }, [meta]);

  /* =========================================================
     SELECTED INTERVIEWER
  ========================================================= */

  const selectedInterviewer = useMemo(() => {
    if (!form.interviewer) {
      return null;
    }

    return (
      interviewers.find((item) => {
        const user = item?.user || item;

        return (
          String(getRecordId(user)) ===
          String(form.interviewer)
        );
      }) || null
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
     PREVIEW
  ========================================================= */

  const schedulePreview = useMemo(
    () =>
      formatPreviewDate(
        form.scheduledAt
      ),
    [form.scheduledAt]
  );

  const existingInterviewPreview =
    useMemo(
      () =>
        existingActiveInterview
          ? formatPreviewDate(
              existingActiveInterview
                ?.scheduledAt
            )
          : null,
      [existingActiveInterview]
    );

  /* =========================================================
     UPDATE
  ========================================================= */

  const clearFieldError = (name) => {
    setFieldErrors((current) => {
      if (!current?.[name]) {
        return current;
      }

      const next = {
        ...current,
      };

      delete next[name];

      return next;
    });
  };

  const update = (name, value) => {
    setError("");

    clearFieldError(name);

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const changeMode = (mode) => {
    setError("");

    setFieldErrors((current) => {
      const next = {
        ...current,
      };

      delete next.officeLocation;
      delete next.meetingLink;

      return next;
    });

    setForm((current) => ({
      ...current,

      mode,

      meetingLink:
        mode === "ONLINE"
          ? current.meetingLink
          : "",

      officeLocation:
        mode === "IN_PERSON"
          ? current.officeLocation ||
            "DELHI"
          : "",
    }));
  };

  /* =========================================================
     VALIDATION
  ========================================================= */

  const validate = () => {
    const errors = {};

    if (!candidateId) {
      errors.candidate =
        "Candidate information is unavailable.";
    }

    const roundNumber = Number(
      form.roundNumber
    );

    if (
      !Number.isFinite(roundNumber) ||
      roundNumber < 1 ||
      roundNumber > 20
    ) {
      errors.roundNumber =
        "Select a valid round.";
    }

    const roundName = String(
      form.roundName || ""
    ).trim();

    if (!roundName) {
      errors.roundName =
        "Round name is required.";
    } else if (roundName.length < 2) {
      errors.roundName =
        "Round name is too short.";
    } else if (roundName.length > 80) {
      errors.roundName =
        "Maximum 80 characters.";
    }

    const interviewerId = String(
      form.interviewer || ""
    ).trim();

    if (!interviewerId) {
      errors.interviewer =
        "Select an interviewer.";
    } else {
      const validInterviewer =
        interviewers.some((item) => {
          const user =
            item?.user || item;

          return (
            String(getRecordId(user)) ===
            interviewerId
          );
        });

      if (!validInterviewer) {
        errors.interviewer =
          "Selected interviewer is unavailable.";
      }
    }

    if (!form.scheduledAt) {
      errors.scheduledAt =
        "Date and time are required.";
    } else {
      const selectedDate = new Date(
        form.scheduledAt
      );

      if (
        Number.isNaN(
          selectedDate.getTime()
        )
      ) {
        errors.scheduledAt =
          "Select a valid date and time.";
      } else if (
        selectedDate.getTime() <=
        Date.now()
      ) {
        errors.scheduledAt =
          "Select a future date and time.";
      }
    }

    const duration = Number(
      form.durationMinutes
    );

    if (
      !Number.isFinite(duration) ||
      duration < 15 ||
      duration > 240
    ) {
      errors.durationMinutes =
        "Invalid duration.";
    }

    if (
      ![
        "IN_PERSON",
        "ONLINE",
        "PHONE",
      ].includes(form.mode)
    ) {
      errors.mode =
        "Select an interview mode.";
    }

    if (
      form.mode === "IN_PERSON" &&
      !String(
        form.officeLocation || ""
      ).trim()
    ) {
      errors.officeLocation =
        "Select office location.";
    }

    if (form.mode === "ONLINE") {
      const link = String(
        form.meetingLink || ""
      ).trim();

      if (!link) {
        errors.meetingLink =
          "Meeting link is required.";
      } else {
        try {
          const parsedUrl =
            new URL(link);

          if (
            ![
              "http:",
              "https:",
            ].includes(
              parsedUrl.protocol
            )
          ) {
            errors.meetingLink =
              "Enter a valid meeting link.";
          }
        } catch {
          errors.meetingLink =
            "Enter a valid meeting link.";
        }
      }
    }

    if (
      String(
        form.remarks || ""
      ).length > 1000
    ) {
      errors.remarks =
        "Maximum 1000 characters.";
    }

    if (existingActiveInterview) {
      errors.duplicate =
        "An active interview already exists.";
    }

    setFieldErrors(errors);

    if (
      Object.keys(errors).length
    ) {
      setError(
        "Please correct the highlighted fields."
      );

      return false;
    }

    setError("");

    return true;
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      submitting ||
      checkingDuplicate
    ) {
      return;
    }

    if (!validate()) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      /*
       * Re-check immediately before scheduling.
       */

      const latestInterviews =
        await getInterviews({
          candidate: candidateId,
        });

      const duplicate = (
        Array.isArray(latestInterviews)
          ? latestInterviews
          : []
      ).find((interview) =>
        ACTIVE_INTERVIEW_STATUSES.has(
          getStatus(interview)
        )
      );

      if (duplicate) {
        setExistingActiveInterview(
          duplicate
        );

        setFieldErrors((current) => ({
          ...current,
          duplicate:
            "An active interview already exists.",
        }));

        setError(
          "Manage the active interview before creating another round."
        );

        return;
      }

      const finalScheduledAt =
        new Date(
          form.scheduledAt
        );

      if (
        Number.isNaN(
          finalScheduledAt.getTime()
        ) ||
        finalScheduledAt.getTime() <=
          Date.now()
      ) {
        setFieldErrors((current) => ({
          ...current,

          scheduledAt:
            "Select a future date and time.",
        }));

        setError(
          "Interview time has already passed."
        );

        return;
      }

      const payload = {
        roundNumber: Number(
          form.roundNumber || 1
        ),

        roundName:
          form.roundName.trim(),

        interviewer:
          form.interviewer,

        scheduledAt:
          finalScheduledAt.toISOString(),

        durationMinutes: Number(
          form.durationMinutes
        ),

        timezone:
          "Asia/Kolkata",

        mode:
          form.mode,

        officeLocation:
          form.mode === "IN_PERSON"
            ? form.officeLocation
            : null,

        meetingLink:
          form.mode === "ONLINE"
            ? form.meetingLink.trim()
            : "",

        remarks:
          form.remarks.trim(),
      };

      const interview =
        await scheduleInterview(
          candidateId,
          payload
        );

      setError("");
      setFieldErrors({});

      await onScheduled?.(
        interview
      );
    } catch (submitError) {
      const message =
        getApiErrorMessage(
          submitError,
          "Interview could not be scheduled."
        );

      setError(message);

      if (
        submitError?.response
          ?.status === 409
      ) {
        setFieldErrors(
          (current) => ({
            ...current,
            duplicate: message,
          })
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================================================
     CLOSE
  ========================================================= */

  const handleClose = () => {
    if (submitting) {
      return;
    }

    onClose?.();
  };

  const scheduleDisabled =
    submitting ||
    checkingDuplicate ||
    loadingMeta ||
    Boolean(
      existingActiveInterview
    ) ||
    interviewers.length === 0;

  if (!open) {
    return null;
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div
      className="se-interview-modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          handleClose();
        }
      }}
    >
      <section
        className="se-interview-schedule-modal se-interview-schedule-modal--compact"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-interview-title"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        {/* HEADER */}

        <header className="se-interview-modal-head se-interview-schedule-head se-interview-schedule-head--compact">
          <div>
            <span className="se-interview-eyebrow">
              INTERVIEW
            </span>

            <h2 id="schedule-interview-title">
              Schedule Interview
            </h2>
          </div>

          <button
            type="button"
            className="se-interview-modal-close"
            onClick={handleClose}
            disabled={submitting}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {/* CANDIDATE */}

        <div className="se-interview-schedule-context se-interview-schedule-context--compact">
          <div className="candidate">
            <span className="avatar">
              {safeText(
                candidate?.fullName,
                "C"
              )
                .charAt(0)
                .toUpperCase()}
            </span>

            <div>
              <small>
                CANDIDATE
              </small>

              <strong>
                {safeText(
                  candidate?.fullName,
                  "Candidate"
                )}
              </strong>

              <p>
                {safeText(
                  candidate?.positionTitle,
                  "Position"
                )}

                {" · "}

                {safeText(
                  candidate?.candidateNumber,
                  "Candidate ID"
                )}
              </p>
            </div>
          </div>

          <div className="contact">
            <small>
              EMAIL
            </small>

            <strong>
              {safeText(
                candidate?.email,
                "Not available"
              )}
            </strong>
          </div>
        </div>

        {/* LOADING */}

        {checkingDuplicate ? (
          <div className="se-interview-checking-banner compact">
            <span className="spinner" />

            <strong>
              Checking existing interview...
            </strong>
          </div>
        ) : null}

        {/* EXISTING */}

        {existingActiveInterview ? (
          <div className="se-interview-duplicate-banner compact">
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
                      ?.roundNumber || 1
                  }`
                )}

                {" · "}

                {
                  existingInterviewPreview
                    ?.date
                }

                {" · "}

                {
                  existingInterviewPreview
                    ?.time
                }
              </p>
            </div>
          </div>
        ) : null}

        {/* ERROR */}

        {error ? (
          <div className="se-interview-error se-interview-schedule-error compact">
            <span>
              !
            </span>

            <p>
              {error}
            </p>
          </div>
        ) : null}

        {/* FORM */}

        <form
          className="se-interview-form se-interview-premium-form se-interview-compact-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="se-interview-compact-scroll">

            {/* 01 ROUND */}

            <section className="se-interview-form-card se-interview-form-card--compact">
              <header>
                <span>
                  01
                </span>

                <div>
                  <strong>
                    Round & Interviewer
                  </strong>
                </div>
              </header>

              <div className="grid compact-grid three-col">
                <label
                  className={
                    fieldErrors.roundNumber
                      ? "has-error"
                      : ""
                  }
                >
                  <span>
                    Round
                  </span>

                  <select
                    value={
                      form.roundNumber
                    }
                    disabled={
                      submitting
                    }
                    onChange={(event) =>
                      update(
                        "roundNumber",
                        event.target.value
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

                  {fieldErrors.roundNumber ? (
                    <small className="se-interview-field-error">
                      {
                        fieldErrors
                          .roundNumber
                      }
                    </small>
                  ) : null}
                </label>

                <label
                  className={
                    fieldErrors.roundName
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
                    maxLength={80}
                    disabled={
                      submitting
                    }
                    onChange={(event) =>
                      update(
                        "roundName",
                        event.target.value
                      )
                    }
                    placeholder="Technical Round"
                  />

                  {fieldErrors.roundName ? (
                    <small className="se-interview-field-error">
                      {
                        fieldErrors
                          .roundName
                      }
                    </small>
                  ) : null}
                </label>

                <label
                  className={
                    fieldErrors.interviewer
                      ? "has-error"
                      : ""
                  }
                >
                  <span>
                    Interviewer *
                  </span>

                  {loadingMeta ? (
                    <div className="se-interview-directory-loading compact">
                      <span className="spinner" />

                      <span>
                        Loading...
                      </span>
                    </div>
                  ) : interviewers.length ? (
                    <select
                      value={
                        form.interviewer
                      }
                      disabled={
                        submitting
                      }
                      onChange={(event) =>
                        update(
                          "interviewer",
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Select interviewer
                      </option>

                      {interviewers.map(
                        (item) => {
                          const user =
                            item?.user ||
                            item;

                          const id =
                            getRecordId(
                              user
                            );

                          if (!id) {
                            return null;
                          }

                          return (
                            <option
                              key={id}
                              value={id}
                            >
                              {safeText(
                                user?.displayName,
                                "Employee"
                              )}
                            </option>
                          );
                        }
                      )}
                    </select>
                  ) : (
                    <button
                      type="button"
                      className="se-interview-retry-btn"
                      onClick={
                        loadMeta
                      }
                      disabled={
                        loadingMeta ||
                        submitting
                      }
                    >
                      Retry interviewer list
                    </button>
                  )}

                  {metaError ? (
                    <small className="se-interview-field-warning">
                      {metaError}
                    </small>
                  ) : null}

                  {fieldErrors.interviewer ? (
                    <small className="se-interview-field-error">
                      {
                        fieldErrors
                          .interviewer
                      }
                    </small>
                  ) : null}
                </label>
              </div>

              {selectedInterviewerUser ? (
                <div className="se-interview-selected-person se-interview-selected-person--compact">
                  <span>
                    {safeText(
                      selectedInterviewerUser
                        ?.displayName,
                      "I"
                    )
                      .charAt(0)
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
                  </div>

                  <b>
                    ✓
                  </b>
                </div>
              ) : null}
            </section>

            {/* 02 SCHEDULE */}

            <section className="se-interview-form-card se-interview-form-card--compact">
              <header>
                <span>
                  02
                </span>

                <div>
                  <strong>
                    Schedule
                  </strong>
                </div>
              </header>

              <div className="grid compact-grid schedule-grid">
                <label
                  className={
                    fieldErrors.scheduledAt
                      ? "has-error"
                      : ""
                  }
                >
                  <span>
                    Date & Time *
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
                    onChange={(event) =>
                      update(
                        "scheduledAt",
                        event.target.value
                      )
                    }
                  />

                  {fieldErrors.scheduledAt ? (
                    <small className="se-interview-field-error">
                      {
                        fieldErrors
                          .scheduledAt
                      }
                    </small>
                  ) : null}
                </label>

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
                    onChange={(event) =>
                      update(
                        "durationMinutes",
                        event.target.value
                      )
                    }
                  >
                    <option value="30">
                      30 min
                    </option>

                    <option value="45">
                      45 min
                    </option>

                    <option value="60">
                      60 min
                    </option>

                    <option value="90">
                      90 min
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

                <div className="se-interview-mini-preview">
                  <small>
                    SELECTED
                  </small>

                  <strong>
                    {
                      schedulePreview.date
                    }
                  </strong>

                  <span>
                    {
                      schedulePreview.time
                    }
                    {" · "}
                    {
                      form.durationMinutes
                    }
                    {" min"}
                  </span>
                </div>
              </div>
            </section>

            {/* 03 MODE */}

            <section className="se-interview-form-card se-interview-form-card--compact">
              <header>
                <span>
                  03
                </span>

                <div>
                  <strong>
                    Mode
                  </strong>
                </div>
              </header>

              <div className="se-interview-mode-grid se-interview-premium-mode-grid se-interview-mode-grid--compact">
                {[
                  [
                    "IN_PERSON",
                    "O",
                    "In Person",
                  ],
                  [
                    "ONLINE",
                    "V",
                    "Online",
                  ],
                  [
                    "PHONE",
                    "☎",
                    "Phone",
                  ],
                ].map(
                  ([
                    value,
                    icon,
                    title,
                  ]) => (
                    <button
                      type="button"
                      key={value}
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
                        {icon}
                      </span>

                      <strong>
                        {title}
                      </strong>

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

              {form.mode ===
              "IN_PERSON" ? (
                <label
                  className={`standalone compact-standalone ${
                    fieldErrors
                      .officeLocation
                      ? "has-error"
                      : ""
                  }`}
                >
                  <span>
                    Office *
                  </span>

                  <select
                    value={
                      form.officeLocation
                    }
                    disabled={
                      submitting
                    }
                    onChange={(event) =>
                      update(
                        "officeLocation",
                        event.target.value
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

              {form.mode ===
              "ONLINE" ? (
                <label
                  className={`standalone compact-standalone ${
                    fieldErrors.meetingLink
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
                    onChange={(event) =>
                      update(
                        "meetingLink",
                        event.target.value
                      )
                    }
                    placeholder="https://meet.google.com/..."
                  />

                  {fieldErrors.meetingLink ? (
                    <small className="se-interview-field-error">
                      {
                        fieldErrors
                          .meetingLink
                      }
                    </small>
                  ) : null}
                </label>
              ) : null}

              {form.mode === "PHONE" ? (
                <div className="se-interview-phone-compact">
                  <span>
                    ☎
                  </span>

                  <strong>
                    {safeText(
                      candidate?.mobile,
                      "Mobile not available"
                    )}
                  </strong>
                </div>
              ) : null}
            </section>

            {/* 04 NOTES */}

            <section className="se-interview-form-card se-interview-form-card--compact notes-card">
              <header>
                <span>
                  04
                </span>

                <div>
                  <strong>
                    Notes
                  </strong>
                </div>
              </header>

              <label
                className={`standalone ${
                  fieldErrors.remarks
                    ? "has-error"
                    : ""
                }`}
              >
                <textarea
                  value={
                    form.remarks
                  }
                  maxLength={1000}
                  disabled={
                    submitting
                  }
                  onChange={(event) =>
                    update(
                      "remarks",
                      event.target.value
                    )
                  }
                  placeholder="Optional interview notes..."
                />

                <small className="se-interview-field-help">
                  {
                    form.remarks.length
                  }
                  /1000
                </small>

                {fieldErrors.remarks ? (
                  <small className="se-interview-field-error">
                    {
                      fieldErrors
                        .remarks
                    }
                  </small>
                ) : null}
              </label>
            </section>

            {/* NOTIFICATION SUMMARY */}

            <section className="se-interview-notification-preview se-interview-notification-preview--compact">
              <div className="se-interview-notification-icon">
                ✉
              </div>

              <div className="se-interview-notification-main">
                <strong>
                  Notifications
                </strong>

                <div className="se-interview-notification-recipients compact-recipients">
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
                          candidate?.fullName,
                          "Candidate"
                        )}
                      </strong>

                      <p>
                        {safeText(
                          candidate?.email,
                          "Email unavailable"
                        )}
                      </p>
                    </div>
                  </div>

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
            </section>

            {fieldErrors.duplicate ? (
              <div className="se-interview-inline-block-error compact">
                <span>
                  !
                </span>

                <p>
                  {
                    fieldErrors
                      .duplicate
                  }
                </p>
              </div>
            ) : null}

            {fieldErrors.candidate ? (
              <div className="se-interview-inline-block-error compact">
                <span>
                  !
                </span>

                <p>
                  {
                    fieldErrors
                      .candidate
                  }
                </p>
              </div>
            ) : null}
          </div>

          {/* FOOTER */}

          <footer className="se-interview-schedule-footer se-interview-schedule-footer--compact">
            <div className="se-interview-schedule-footer-info">
              <span>
                {existingActiveInterview
                  ? "!"
                  : loadingMeta
                    ? "…"
                    : "✓"}
              </span>

              <strong>
                {existingActiveInterview
                  ? "Existing interview found"
                  : loadingMeta
                    ? "Loading..."
                    : interviewers.length
                      ? "Ready to schedule"
                      : "Interviewer required"}
              </strong>
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
                {submitting
                  ? "Scheduling..."
                  : checkingDuplicate
                    ? "Checking..."
                    : loadingMeta
                      ? "Loading..."
                      : existingActiveInterview
                        ? "Already Scheduled"
                        : interviewers.length ===
                            0
                          ? "Interviewer Required"
                          : (
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
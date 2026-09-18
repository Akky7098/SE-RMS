import {
  CANDIDATE_STATUS_META,
  INTERVIEW_STATUS_META,
  MANPOWER_STATUS_META,
  NEXT_ACTION_META,
  PRIORITY_META,
} from "./recruitmentConstants";

/* =========================================================
   TEXT
========================================================= */

export const safeText = (
  value,
  fallback = "—"
) => {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return fallback;
  }

  return String(value).trim();
};

/* =========================================================
   OBJECT ID
========================================================= */

export const getRecordId = (
  value
) => {
  if (!value) {
    return "";
  }

  if (
    typeof value === "string"
  ) {
    return value;
  }

  return (
    value._id ||
    value.id ||
    ""
  );
};

/* =========================================================
   NORMALIZE
========================================================= */

export const normalizeRecruitmentValue = (
  value
) => {
  return String(
    value || ""
  )
    .trim()
    .toUpperCase();
};

/* =========================================================
   DATE
========================================================= */

export const formatRecruitmentDate = (
  value,
  fallback = "—"
) => {
  if (!value) {
    return fallback;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return fallback;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    }
  );
};

export const formatRecruitmentTime = (
  value,
  fallback = "—"
) => {
  if (!value) {
    return fallback;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return fallback;
  }

  return date.toLocaleTimeString(
    "en-IN",
    {
      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );
};

export const formatRecruitmentDateTime = (
  value,
  fallback = "—"
) => {
  if (!value) {
    return fallback;
  }

  return `${formatRecruitmentDate(
    value,
    fallback
  )} • ${formatRecruitmentTime(
    value,
    fallback
  )}`;
};

/* =========================================================
   TODAY
========================================================= */

const dateKey = (
  value
) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return [
    date.getFullYear(),

    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    ),

    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    ),
  ].join("-");
};

export const isToday = (
  value
) => {
  if (!value) {
    return false;
  }

  return (
    dateKey(value) ===
    dateKey(new Date())
  );
};

/* =========================================================
   OVERDUE
========================================================= */

export const isOverdue = (
  value
) => {
  if (!value) {
    return false;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return false;
  }

  return (
    date.getTime() <
    Date.now()
  );
};

/* =========================================================
   STATUS META
========================================================= */

export const getCandidateStatusMeta = (
  status
) => {
  const key =
    normalizeRecruitmentValue(
      status
    );

  return (
    CANDIDATE_STATUS_META[
      key
    ] || {
      label:
        key
          .replaceAll(
            "_",
            " "
          ) ||
        "Unknown",

      tone:
        "neutral",
    }
  );
};

export const getManpowerStatusMeta = (
  status
) => {
  const key =
    normalizeRecruitmentValue(
      status
    );

  return (
    MANPOWER_STATUS_META[
      key
    ] || {
      label:
        key
          .replaceAll(
            "_",
            " "
          ) ||
        "Unknown",

      tone:
        "neutral",
    }
  );
};

export const getInterviewStatusMeta = (
  status
) => {
  const key =
    normalizeRecruitmentValue(
      status
    );

  return (
    INTERVIEW_STATUS_META[
      key
    ] || {
      label:
        key
          .replaceAll(
            "_",
            " "
          ) ||
        "Unknown",

      tone:
        "neutral",
    }
  );
};

export const getNextActionMeta = (
  action
) => {
  const key =
    normalizeRecruitmentValue(
      action
    );

  return (
    NEXT_ACTION_META[
      key
    ] || {
      label:
        key
          .replaceAll(
            "_",
            " "
          ) ||
        "Action",

      tone:
        "neutral",
    }
  );
};

export const getPriorityMeta = (
  priority
) => {
  const key =
    normalizeRecruitmentValue(
      priority ||
      "NORMAL"
    );

  return (
    PRIORITY_META[
      key
    ] ||
    PRIORITY_META.NORMAL
  );
};

/* =========================================================
   CANDIDATE WORKFLOW

   This is the frontend source of truth for UX.

   Backend will independently enforce the same important
   transitions for security.
========================================================= */

const TERMINAL_CANDIDATE_STATUSES =
  new Set([
    "NOT_INTERESTED",
    "REJECTED_SCREENING",
    "REJECTED_INTERVIEW",
    "LOI_DECLINED",
    "OFFER_DECLINED",
    "JOINED",
    "CLOSED",
  ]);

const SCREENING_COMPLETED_STATUSES =
  new Set([
    "SCREENED",
    "SHORTLISTED",
    "INTERVIEW_PENDING",
    "INTERVIEW_SCHEDULED",
    "INTERVIEWED",
    "SELECTED",
    "LOI_PENDING",
    "LOI_SENT",
    "LOI_ACCEPTED",
    "OFFER_PENDING",
    "OFFER_SENT",
    "OFFER_ACCEPTED",
    "JOINING_CONFIRMED",
    "DOCUMENT_PENDING",
    "DOCUMENT_VERIFICATION",
    "READY_FOR_ONBOARDING",
    "JOINED",
  ]);

const SHORTLIST_COMPLETED_STATUSES =
  new Set([
    "SHORTLISTED",
    "INTERVIEW_PENDING",
    "INTERVIEW_SCHEDULED",
    "INTERVIEWED",
    "SELECTED",
    "LOI_PENDING",
    "LOI_SENT",
    "LOI_ACCEPTED",
    "OFFER_PENDING",
    "OFFER_SENT",
    "OFFER_ACCEPTED",
    "JOINING_CONFIRMED",
    "DOCUMENT_PENDING",
    "DOCUMENT_VERIFICATION",
    "READY_FOR_ONBOARDING",
    "JOINED",
  ]);

const INTERVIEW_STARTED_STATUSES =
  new Set([
    "INTERVIEW_PENDING",
    "INTERVIEW_SCHEDULED",
    "INTERVIEWED",
    "SELECTED",
    "REJECTED_INTERVIEW",
    "LOI_PENDING",
    "LOI_SENT",
    "LOI_ACCEPTED",
    "LOI_DECLINED",
    "OFFER_PENDING",
    "OFFER_SENT",
    "OFFER_ACCEPTED",
    "OFFER_DECLINED",
    "JOINING_CONFIRMED",
    "DOCUMENT_PENDING",
    "DOCUMENT_VERIFICATION",
    "READY_FOR_ONBOARDING",
    "JOINED",
  ]);

/* =========================================================
   WORKFLOW ACTION STATE
========================================================= */

export const getCandidateWorkflowState = (
  status
) => {
  const current =
    normalizeRecruitmentValue(
      status
    );

  const terminal =
    TERMINAL_CANDIDATE_STATUSES.has(
      current
    );

  const screeningCompleted =
    SCREENING_COMPLETED_STATUSES.has(
      current
    );

  const shortlistCompleted =
    SHORTLIST_COMPLETED_STATUSES.has(
      current
    );

  const interviewStarted =
    INTERVIEW_STARTED_STATUSES.has(
      current
    );

  /* =====================================================
     RECORD CALL

     Calls remain useful during an active recruitment case,
     including after shortlist/interview.
  ===================================================== */

  const callEnabled =
    !terminal;

  /* =====================================================
     SCREENING

     Only after contact is connected.
  ===================================================== */

  const screeningEnabled =
    [
      "SCREENING_PENDING",
      "SCREENED",
    ].includes(
      current
    ) &&
    !screeningCompleted;

  /* =====================================================
     SHORTLIST

     Separate shortlist button is available only after the
     candidate was screened.

     Screening itself may also directly return SHORTLIST.
  ===================================================== */

  const shortlistEnabled =
    current ===
    "SCREENED";

  /* =====================================================
     SCHEDULE INTERVIEW

     Initial scheduling:
       SHORTLISTED
       INTERVIEW_PENDING

     Additional round:
       INTERVIEWED

     Disabled while an interview is already scheduled.
  ===================================================== */

  const scheduleInterviewEnabled =
    [
      "SHORTLISTED",
      "INTERVIEW_PENDING",
      "INTERVIEWED",
    ].includes(
      current
    );

  /* =====================================================
     REJECT

     Allowed while recruitment is active.
  ===================================================== */

  const rejectEnabled =
    !terminal &&
    ![
      "SELECTED",
      "LOI_PENDING",
      "LOI_SENT",
      "LOI_ACCEPTED",
      "OFFER_PENDING",
      "OFFER_SENT",
      "OFFER_ACCEPTED",
      "JOINING_CONFIRMED",
      "DOCUMENT_PENDING",
      "DOCUMENT_VERIFICATION",
      "READY_FOR_ONBOARDING",
      "JOINED",
    ].includes(
      current
    );

  /* =====================================================
     RECOMMENDED NEXT ACTION
  ===================================================== */

  let recommendedAction =
    "";

  if (
    [
      "NEW",
      "CONTACT_PENDING",
      "CONTACTED",
      "FOLLOW_UP",
    ].includes(
      current
    )
  ) {
    recommendedAction =
      "CALL";
  } else if (
    current ===
    "SCREENING_PENDING"
  ) {
    recommendedAction =
      "SCREEN";
  } else if (
    current ===
    "SCREENED"
  ) {
    recommendedAction =
      "SHORTLIST";
  } else if (
    [
      "SHORTLISTED",
      "INTERVIEW_PENDING",
      "INTERVIEWED",
    ].includes(
      current
    )
  ) {
    recommendedAction =
      "SCHEDULE_INTERVIEW";
  }

  return {
    status:
      current,

    terminal,

    recommendedAction,

    call: {
      enabled:
        callEnabled,

      completed:
        false,

      reason:
        callEnabled
          ? ""
          : "Recruitment is already closed for this candidate.",
    },

    screening: {
      enabled:
        screeningEnabled,

      completed:
        screeningCompleted,

      reason:
        screeningCompleted
          ? "Screening has already been completed."
          : current ===
              "SCREENING_PENDING"
            ? ""
            : "Connect with the candidate before screening.",
    },

    shortlist: {
      enabled:
        shortlistEnabled,

      completed:
        shortlistCompleted,

      reason:
        shortlistCompleted
          ? "Candidate has already been shortlisted."
          : current ===
              "SCREENED"
            ? ""
            : "Complete screening before shortlisting.",
    },

    scheduleInterview: {
      enabled:
        scheduleInterviewEnabled,

      completed:
        interviewStarted &&
        current !==
          "INTERVIEWED",

      reason:
        current ===
          "INTERVIEW_SCHEDULED"
          ? "An interview is already scheduled."
          : shortlistCompleted
            ? scheduleInterviewEnabled
              ? ""
              : "Interview scheduling is not available at the current stage."
            : "Shortlist the candidate before scheduling an interview.",
    },

    reject: {
      enabled:
        rejectEnabled,

      completed:
        TERMINAL_CANDIDATE_STATUSES.has(
          current
        ),

      reason:
        rejectEnabled
          ? ""
          : "This candidate cannot be rejected at the current stage.",
    },
  };
};

/* =========================================================
   URL BUILDERS
========================================================= */

export const buildRecruitmentUrl = (
  page,
  params = {}
) => {
  const query =
    new URLSearchParams();

  query.set(
    "app",
    "recruitment"
  );

  query.set(
    "page",
    page
  );

  Object.entries(
    params
  ).forEach(
    ([
      key,
      value,
    ]) => {
      if (
        value ===
          undefined ||
        value ===
          null ||
        value ===
          ""
      ) {
        return;
      }

      query.set(
        key,
        String(value)
      );
    }
  );

  return `/dashboard?${query.toString()}`;
};

export const buildCandidateDetailUrl = (
  candidateId
) => {
  return buildRecruitmentUrl(
    "candidate",
    {
      id:
        candidateId,
    }
  );
};

export const buildHiringWorkspaceUrl = (
  requirementId
) => {
  return buildRecruitmentUrl(
    "hiring-workspace",
    {
      id:
        requirementId,
    }
  );
};

export const buildInterviewDetailUrl = (
  interviewId
) => {
  return buildRecruitmentUrl(
    "interview",
    {
      id:
        interviewId,
    }
  );
};

/* =========================================================
   ERROR MESSAGE
========================================================= */

export const getApiErrorMessage = (
  error,
  fallback =
    "Something went wrong. Please try again."
) => {
  return (
    error?.response?.data
      ?.message ||
    error?.response?.data
      ?.error ||
    error?.message ||
    fallback
  );
};

/* =========================================================
   DEDUPLICATE RECORDS
========================================================= */

export const uniqueRecords = (
  records = []
) => {
  const seen =
    new Set();

  return records.filter(
    (
      record
    ) => {
      const id =
        getRecordId(
          record
        );

      if (!id) {
        return true;
      }

      if (
        seen.has(id)
      ) {
        return false;
      }

      seen.add(id);

      return true;
    }
  );
};
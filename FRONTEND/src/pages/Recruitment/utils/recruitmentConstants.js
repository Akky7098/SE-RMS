/* =========================================================
   RECRUITMENT ROUTES
========================================================= */

export const RECRUITMENT_ROUTES = {
  overview:
    "/dashboard?app=recruitment&page=overview",

  manpower:
    "/dashboard?app=recruitment&page=manpower",

  hiring:
    "/dashboard?app=recruitment&page=hiring",

  myHiring:
    "/dashboard?app=recruitment&page=my-hiring",

  candidates:
    "/dashboard?app=recruitment&page=candidates",

  followUps:
    "/dashboard?app=recruitment&page=follow-ups",

  interviews:
    "/dashboard?app=recruitment&page=interviews",

  evaluations:
    "/dashboard?app=recruitment&page=evaluations",
};

/* =========================================================
   MANPOWER STATUS
========================================================= */

export const MANPOWER_STATUS_META = {
  DRAFT: {
    label:
      "Draft",

    tone:
      "neutral",
  },

  PENDING_APPROVAL: {
    label:
      "Pending Approval",

    tone:
      "warning",
  },

  APPROVED: {
    label:
      "Approved",

    tone:
      "info",
  },

  REJECTED: {
    label:
      "Rejected",

    tone:
      "danger",
  },

  HIRING_IN_PROGRESS: {
    label:
      "Hiring In Progress",

    tone:
      "purple",
  },

  FILLED: {
    label:
      "Filled",

    tone:
      "success",
  },

  CANCELLED: {
    label:
      "Cancelled",

    tone:
      "neutral",
  },
};

/* =========================================================
   CANDIDATE STATUS
========================================================= */

export const CANDIDATE_STATUS_META = {
  NEW: {
    label:
      "New",

    tone:
      "info",
  },

  CONTACT_PENDING: {
    label:
      "Contact Pending",

    tone:
      "orange",
  },

  CONTACTED: {
    label:
      "Contacted",

    tone:
      "info",
  },

  NOT_INTERESTED: {
    label:
      "Not Interested",

    tone:
      "neutral",
  },

  FOLLOW_UP: {
    label:
      "Follow-up",

    tone:
      "warning",
  },

  SCREENING_PENDING: {
    label:
      "Screening Pending",

    tone:
      "purple",
  },

  SCREENED: {
    label:
      "Screened",

    tone:
      "info",
  },

  SHORTLISTED: {
    label:
      "Shortlisted",

    tone:
      "success",
  },

  REJECTED_SCREENING: {
    label:
      "Rejected Screening",

    tone:
      "danger",
  },

  INTERVIEW_PENDING: {
    label:
      "Interview Pending",

    tone:
      "blue",
  },

  INTERVIEW_SCHEDULED: {
    label:
      "Interview Scheduled",

    tone:
      "blue",
  },

  INTERVIEWED: {
    label:
      "Interviewed",

    tone:
      "purple",
  },

  SELECTED: {
    label:
      "Selected",

    tone:
      "success",
  },

  REJECTED_INTERVIEW: {
    label:
      "Rejected Interview",

    tone:
      "danger",
  },

  LOI_PENDING: {
    label:
      "LOI Pending",

    tone:
      "warning",
  },

  LOI_SENT: {
    label:
      "LOI Sent",

    tone:
      "info",
  },

  LOI_ACCEPTED: {
    label:
      "LOI Accepted",

    tone:
      "success",
  },

  LOI_DECLINED: {
    label:
      "LOI Declined",

    tone:
      "danger",
  },

  OFFER_PENDING: {
    label:
      "Offer Pending",

    tone:
      "warning",
  },

  OFFER_SENT: {
    label:
      "Offer Sent",

    tone:
      "info",
  },

  OFFER_ACCEPTED: {
    label:
      "Offer Accepted",

    tone:
      "success",
  },

  OFFER_DECLINED: {
    label:
      "Offer Declined",

    tone:
      "danger",
  },

  JOINING_CONFIRMED: {
    label:
      "Joining Confirmed",

    tone:
      "success",
  },

  DOCUMENT_PENDING: {
    label:
      "Documents Pending",

    tone:
      "warning",
  },

  DOCUMENT_VERIFICATION: {
    label:
      "Document Verification",

    tone:
      "purple",
  },

  READY_FOR_ONBOARDING: {
    label:
      "Ready For Onboarding",

    tone:
      "success",
  },

  JOINED: {
    label:
      "Joined",

    tone:
      "success",
  },

  CLOSED: {
    label:
      "Closed",

    tone:
      "neutral",
  },
};

/* =========================================================
   NEXT ACTION
========================================================= */

export const NEXT_ACTION_META = {
  NONE: {
    label:
      "No Action",

    tone:
      "neutral",
  },

  CALL_CANDIDATE: {
    label:
      "Call Candidate",

    tone:
      "orange",
  },

  FOLLOW_UP_CALL: {
    label:
      "Follow-up Call",

    tone:
      "warning",
  },

  COMPLETE_SCREENING: {
    label:
      "Complete Screening",

    tone:
      "purple",
  },

  SCHEDULE_INTERVIEW: {
    label:
      "Schedule Interview",

    tone:
      "blue",
  },

  WAIT_FOR_INTERVIEW: {
    label:
      "Wait For Interview",

    tone:
      "blue",
  },

  PREPARE_LOI: {
    label:
      "Prepare LOI",

    tone:
      "success",
  },

  WAIT_FOR_LOI_RESPONSE: {
    label:
      "LOI Response",

    tone:
      "warning",
  },

  PREPARE_OFFER: {
    label:
      "Prepare Offer",

    tone:
      "success",
  },

  WAIT_FOR_OFFER_RESPONSE: {
    label:
      "Offer Response",

    tone:
      "warning",
  },

  CONFIRM_JOINING: {
    label:
      "Confirm Joining",

    tone:
      "success",
  },

  COLLECT_DOCUMENTS: {
    label:
      "Collect Documents",

    tone:
      "warning",
  },

  VERIFY_DOCUMENTS: {
    label:
      "Verify Documents",

    tone:
      "purple",
  },

  CREATE_EMPLOYEE: {
    label:
      "Create Employee",

    tone:
      "success",
  },
};

/* =========================================================
   INTERVIEW STATUS
========================================================= */

export const INTERVIEW_STATUS_META = {
  SCHEDULED: {
    label:
      "Scheduled",

    tone:
      "blue",
  },

  RESCHEDULED: {
    label:
      "Rescheduled",

    tone:
      "warning",
  },

  CHECKED_IN: {
    label:
      "Checked In",

    tone:
      "purple",
  },

  COMPLETED: {
    label:
      "Completed",

    tone:
      "success",
  },

  CANCELLED: {
    label:
      "Cancelled",

    tone:
      "danger",
  },

  NO_SHOW: {
    label:
      "No Show",

    tone:
      "neutral",
  },
};

/* =========================================================
   PRIORITY
========================================================= */

export const PRIORITY_META = {
  LOW: {
    label:
      "Low",

    tone:
      "neutral",
  },

  NORMAL: {
    label:
      "Normal",

    tone:
      "info",
  },

  MEDIUM: {
    label:
      "Medium",

    tone:
      "info",
  },

  HIGH: {
    label:
      "High",

    tone:
      "orange",
  },

  URGENT: {
    label:
      "Urgent",

    tone:
      "danger",
  },
};
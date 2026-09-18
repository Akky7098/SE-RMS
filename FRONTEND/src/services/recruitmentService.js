import api from "./api";

/* =========================================================
   RESPONSE HELPERS
========================================================= */

const responseData = (
  response
) => {
  return (
    response?.data?.data ||
    response?.data ||
    null
  );
};

/* =========================================================
   NORMALIZE LIST RESPONSE

   Supports:
   []

   or:

   {
     candidates: []
   }

   {
     records: []
   }

   {
     items: []
   }

   {
     tasks: []
   }

   {
     activities: []
   }
========================================================= */

const responseList = (
  response
) => {
  const data =
    responseData(
      response
    );

  if (
    Array.isArray(
      data
    )
  ) {
    return data;
  }

  return (
    data?.records ||
    data?.candidates ||
    data?.items ||
    data?.tasks ||
    data?.activities ||
    data?.results ||
    []
  );
};

/* =========================================================
   NORMALIZE CANDIDATE RESPONSE
========================================================= */

const candidateData = (
  response
) => {
  const data =
    responseData(
      response
    );

  return (
    data?.candidate ||
    data ||
    null
  );
};

/* =========================================================
   MY RECRUITMENT TASKS

   Calls
   Follow-ups
   Screening
   Interview scheduling
   etc.

   GET
   /api/v1/recruitment/tasks/me
========================================================= */

export const getMyRecruitmentTasks =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        "/recruitment/tasks/me",
        {
          params,
        }
      );

    return responseList(
      response
    );
  };

/* =========================================================
   DUPLICATE CHECK

   GET
   /api/v1/recruitment/candidates/check-duplicate
========================================================= */

export const checkCandidateDuplicate =
  async ({
    mobile = "",
    email = "",
  } = {}) => {
    const normalizedMobile =
      String(
        mobile ||
          ""
      ).trim();

    const normalizedEmail =
      String(
        email ||
          ""
      )
        .trim()
        .toLowerCase();

    /*
     * At least one value should normally exist.
     *
     * Do not throw here because the backend validation
     * remains the final authority.
     */

    const response =
      await api.get(
        "/recruitment/candidates/check-duplicate",
        {
          params: {
            mobile:
              normalizedMobile,

            email:
              normalizedEmail,
          },
        }
      );

    const data =
      responseData(
        response
      );

    return (
      data || {
        duplicate:
          false,

        isDuplicate:
          false,

        candidate:
          null,
      }
    );
  };

/* =========================================================
   CREATE CANDIDATE

   POST
   /api/v1/recruitment/requirements/:requirementId/candidates

   IMPORTANT

   Backend is responsible for:
   - department inheritance
   - position inheritance
   - HR owner inheritance
   - candidate number
   - default workflow status
   - CV permanent attachment
========================================================= */

export const createCandidate =
  async (
    requirementId,
    payload = {}
  ) => {
    if (
      !requirementId
    ) {
      throw new Error(
        "Manpower requirement ID is required"
      );
    }

    const response =
      await api.post(
        `/recruitment/requirements/${requirementId}/candidates`,
        payload
      );

    return candidateData(
      response
    );
  };

/* =========================================================
   REQUIREMENT CANDIDATES

   GET
   /api/v1/recruitment/requirements/:requirementId/candidates
========================================================= */

export const getRequirementCandidates =
  async (
    requirementId,
    params = {}
  ) => {
    if (
      !requirementId
    ) {
      throw new Error(
        "Manpower requirement ID is required"
      );
    }

    const response =
      await api.get(
        `/recruitment/requirements/${requirementId}/candidates`,
        {
          params,
        }
      );

    return responseList(
      response
    );
  };

/* =========================================================
   CANDIDATE DETAIL

   GET
   /api/v1/recruitment/candidates/:candidateId
========================================================= */

export const getCandidate =
  async (
    candidateId
  ) => {
    if (
      !candidateId
    ) {
      throw new Error(
        "Candidate ID is required"
      );
    }

    const response =
      await api.get(
        `/recruitment/candidates/${candidateId}`
      );

    return candidateData(
      response
    );
  };

/* =========================================================
   CALL ATTEMPT

   POST
   /api/v1/recruitment/candidates/:candidateId/call
========================================================= */

export const addCandidateCallAttempt =
  async (
    candidateId,
    payload = {}
  ) => {
    if (
      !candidateId
    ) {
      throw new Error(
        "Candidate ID is required"
      );
    }

    const response =
      await api.post(
        `/recruitment/candidates/${candidateId}/call`,
        payload
      );

    return candidateData(
      response
    );
  };

/* =========================================================
   SCREEN CANDIDATE

   POST
   /api/v1/recruitment/candidates/:candidateId/screen
========================================================= */

export const screenCandidate =
  async (
    candidateId,
    payload = {}
  ) => {
    if (
      !candidateId
    ) {
      throw new Error(
        "Candidate ID is required"
      );
    }

    const response =
      await api.post(
        `/recruitment/candidates/${candidateId}/screen`,
        payload
      );

    return candidateData(
      response
    );
  };

/* =========================================================
   SHORTLIST

   POST
   /api/v1/recruitment/candidates/:candidateId/shortlist
========================================================= */

export const shortlistCandidate =
  async (
    candidateId,
    payload = {}
  ) => {
    if (
      !candidateId
    ) {
      throw new Error(
        "Candidate ID is required"
      );
    }

    const response =
      await api.post(
        `/recruitment/candidates/${candidateId}/shortlist`,
        payload
      );

    return candidateData(
      response
    );
  };

/* =========================================================
   REJECT

   POST
   /api/v1/recruitment/candidates/:candidateId/reject
========================================================= */

export const rejectCandidate =
  async (
    candidateId,
    payload = {}
  ) => {
    if (
      !candidateId
    ) {
      throw new Error(
        "Candidate ID is required"
      );
    }

    const response =
      await api.post(
        `/recruitment/candidates/${candidateId}/reject`,
        payload
      );

    return candidateData(
      response
    );
  };

/* =========================================================
   CANDIDATE TIMELINE

   GET
   /api/v1/recruitment/candidates/:candidateId/timeline
========================================================= */

export const getCandidateTimeline =
  async (
    candidateId
  ) => {
    if (
      !candidateId
    ) {
      throw new Error(
        "Candidate ID is required"
      );
    }

    const response =
      await api.get(
        `/recruitment/candidates/${candidateId}/timeline`
      );

    return responseList(
      response
    );
  };

/* =========================================================
   COMPATIBILITY ALIASES

   Useful for later Candidate pages so we do not have to
   rename older imports.
========================================================= */

export const recordCandidateCall =
  addCandidateCallAttempt;

export const getCandidateActivities =
  getCandidateTimeline;

/* =========================================================
   DEFAULT EXPORT
========================================================= */

const recruitmentService = {
  getMyRecruitmentTasks,

  checkCandidateDuplicate,

  createCandidate,

  getRequirementCandidates,

  getCandidate,

  addCandidateCallAttempt,

  recordCandidateCall,

  screenCandidate,

  shortlistCandidate,

  rejectCandidate,

  getCandidateTimeline,

  getCandidateActivities,
};

export default recruitmentService;
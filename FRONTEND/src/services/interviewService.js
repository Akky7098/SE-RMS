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
    data?.interviews ||
    data?.records ||
    data?.items ||
    data?.results ||
    []
  );
};

const interviewData = (
  response
) => {
  const data =
    responseData(
      response
    );

  return (
    data?.interview ||
    data ||
    null
  );
};

/* =========================================================
   META

   GET
   /api/v1/interviews/meta?candidateId=:candidateId

   Backend returns:
   1. Active users from candidate's department
   2. Global SUPER_ADMIN users
========================================================= */

export const getInterviewMeta =
  async (
    candidateId
  ) => {
    if (
      !candidateId
    ) {
      throw new Error(
        "Candidate ID is required to load interview details"
      );
    }

    const response =
      await api.get(
        "/interviews/meta",
        {
          params: {
            candidateId,
          },
        }
      );

    const data =
      responseData(
        response
      );

    return (
      data || {
        interviewers:
          [],

        modes:
          [],

        officeLocations:
          [],

        durations:
          [],
      }
    );
  };

/* =========================================================
   INTERVIEW LIST

   GET
   /api/v1/interviews
========================================================= */

export const getInterviews =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        "/interviews",
        {
          params,
        }
      );

    return responseList(
      response
    );
  };

/* =========================================================
   INTERVIEW DETAIL

   GET
   /api/v1/interviews/:interviewId
========================================================= */

export const getInterview =
  async (
    interviewId
  ) => {
    if (
      !interviewId
    ) {
      throw new Error(
        "Interview ID is required"
      );
    }

    const response =
      await api.get(
        `/interviews/${interviewId}`
      );

    return interviewData(
      response
    );
  };

/* =========================================================
   SCHEDULE INTERVIEW

   POST
   /api/v1/interviews/candidate/:candidateId
========================================================= */

export const scheduleInterview =
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

    if (
      !payload ||
      typeof payload !==
        "object"
    ) {
      throw new Error(
        "Interview details are required"
      );
    }

    const response =
      await api.post(
        `/interviews/candidate/${candidateId}`,
        payload
      );

    return interviewData(
      response
    );
  };

/* =========================================================
   RESCHEDULE INTERVIEW

   PATCH
   /api/v1/interviews/:interviewId/reschedule
========================================================= */

export const rescheduleInterview =
  async (
    interviewId,
    payload = {}
  ) => {
    if (
      !interviewId
    ) {
      throw new Error(
        "Interview ID is required"
      );
    }

    const response =
      await api.patch(
        `/interviews/${interviewId}/reschedule`,
        payload
      );

    return interviewData(
      response
    );
  };

/* =========================================================
   CANCEL INTERVIEW

   PATCH
   /api/v1/interviews/:interviewId/cancel
========================================================= */

export const cancelInterview =
  async (
    interviewId,
    payload = {}
  ) => {
    if (
      !interviewId
    ) {
      throw new Error(
        "Interview ID is required"
      );
    }

    const response =
      await api.patch(
        `/interviews/${interviewId}/cancel`,
        payload
      );

    return interviewData(
      response
    );
  };

/* =========================================================
   CHECK IN

   POST
   /api/v1/interviews/:interviewId/check-in
========================================================= */

export const checkInInterview =
  async (
    interviewId,
    payload = {}
  ) => {
    if (
      !interviewId
    ) {
      throw new Error(
        "Interview ID is required"
      );
    }

    const response =
      await api.post(
        `/interviews/${interviewId}/check-in`,
        payload
      );

    return interviewData(
      response
    );
  };

/* =========================================================
   UPLOAD EVALUATION ATTACHMENT

   POST
   /api/v1/interviews/:interviewId/evaluation/attachment

   This uploads the file to TEMP storage first.

   File is moved to permanent storage only after
   Complete Interview is successfully submitted.
========================================================= */

export const uploadInterviewEvaluationAttachment =
  async (
    interviewId,
    file,
    onUploadProgress
  ) => {
    if (
      !interviewId
    ) {
      throw new Error(
        "Interview ID is required"
      );
    }

    if (
      !file
    ) {
      throw new Error(
        "Evaluation document is required"
      );
    }

    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    const response =
      await api.post(
        `/interviews/${interviewId}/evaluation/attachment`,
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },

          onUploadProgress: (
            progressEvent
          ) => {
            if (
              typeof
                onUploadProgress !==
              "function"
            ) {
              return;
            }

            const loaded =
              Number(
                progressEvent
                  ?.loaded ||
                  0
              );

            const total =
              Number(
                progressEvent
                  ?.total ||
                  0
              );

            if (
              total <=
              0
            ) {
              return;
            }

            const percent =
              Math.min(
                100,
                Math.max(
                  0,
                  Math.round(
                    (
                      loaded /
                      total
                    ) *
                      100
                  )
                )
              );

            onUploadProgress(
              percent,
              progressEvent
            );
          },
        }
      );

    return responseData(
      response
    );
  };

/* =========================================================
   REMOVE TEMP EVALUATION ATTACHMENT

   DELETE
   /api/v1/interviews/:interviewId/evaluation/attachment

   Used when:
   - user removes file
   - user replaces file
   - evaluation modal is cancelled
========================================================= */

export const removeInterviewEvaluationAttachment =
  async (
    interviewId,
    storedName
  ) => {
    if (
      !interviewId
    ) {
      throw new Error(
        "Interview ID is required"
      );
    }

    if (
      !storedName
    ) {
      throw new Error(
        "Evaluation document reference is required"
      );
    }

    const response =
      await api.delete(
        `/interviews/${interviewId}/evaluation/attachment`,
        {
          data: {
            storedName,
          },
        }
      );

    return responseData(
      response
    );
  };

/* =========================================================
   OPEN TEMP EVALUATION ATTACHMENT

   GET
   /api/v1/interviews/:interviewId/evaluation/attachment/temp/:storedName

   Authenticated blob request.
========================================================= */

export const getTemporaryInterviewEvaluationAttachment =
  async (
    interviewId,
    storedName
  ) => {
    if (
      !interviewId
    ) {
      throw new Error(
        "Interview ID is required"
      );
    }

    if (
      !storedName
    ) {
      throw new Error(
        "Evaluation document reference is required"
      );
    }

    const response =
      await api.get(
        `/interviews/${interviewId}/evaluation/attachment/temp/${encodeURIComponent(
          storedName
        )}`,
        {
          responseType:
            "blob",
        }
      );

    return response;
  };

export const openTemporaryInterviewEvaluationAttachment =
  async (
    interviewId,
    storedName
  ) => {
    const response =
      await getTemporaryInterviewEvaluationAttachment(
        interviewId,
        storedName
      );

    const contentType =
      response
        ?.headers
        ?.[
          "content-type"
        ] ||
      response
        ?.data
        ?.type ||
      "application/octet-stream";

    const blob =
      response.data instanceof
      Blob
        ? response.data
        : new Blob(
            [
              response.data,
            ],
            {
              type:
                contentType,
            }
          );

    const objectUrl =
      URL.createObjectURL(
        blob
      );

    const openedWindow =
      window.open(
        objectUrl,
        "_blank",
        "noopener,noreferrer"
      );

    /*
     * Keep the URL alive long enough for the
     * browser tab to load the PDF/image.
     */

    window.setTimeout(
      () => {
        URL.revokeObjectURL(
          objectUrl
        );
      },
      60 *
        1000
    );

    return Boolean(
      openedWindow
    );
  };

/* =========================================================
   INTERVIEW EVALUATION

   POST
   /api/v1/interviews/:interviewId/evaluation

   Payload can now optionally contain:

   attachment: {
     storedName,
     originalName,
     mimeType,
     size
   }

   Backend moves temp attachment to permanent storage.
========================================================= */

export const submitInterviewEvaluation =
  async (
    interviewId,
    payload = {}
  ) => {
    if (
      !interviewId
    ) {
      throw new Error(
        "Interview ID is required"
      );
    }

    if (
      !payload ||
      typeof payload !==
        "object"
    ) {
      throw new Error(
        "Interview evaluation details are required"
      );
    }

    const response =
      await api.post(
        `/interviews/${interviewId}/evaluation`,
        payload
      );

    return responseData(
      response
    );
  };

/* =========================================================
   GET SAVED EVALUATION

   GET
   /api/v1/interviews/:interviewId/evaluation
========================================================= */

export const getInterviewEvaluation =
  async (
    interviewId
  ) => {
    if (
      !interviewId
    ) {
      throw new Error(
        "Interview ID is required"
      );
    }

    const response =
      await api.get(
        `/interviews/${interviewId}/evaluation`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   GET PERMANENT EVALUATION ATTACHMENT

   GET
   /api/v1/interviews/:interviewId/evaluation/attachment
========================================================= */

export const getInterviewEvaluationAttachment =
  async (
    interviewId
  ) => {
    if (
      !interviewId
    ) {
      throw new Error(
        "Interview ID is required"
      );
    }

    const response =
      await api.get(
        `/interviews/${interviewId}/evaluation/attachment`,
        {
          responseType:
            "blob",
        }
      );

    return response;
  };

/* =========================================================
   OPEN PERMANENT EVALUATION ATTACHMENT

   Used after evaluation has been completed.
========================================================= */

export const openInterviewEvaluationAttachment =
  async (
    interviewId
  ) => {
    const response =
      await getInterviewEvaluationAttachment(
        interviewId
      );

    const contentType =
      response
        ?.headers
        ?.[
          "content-type"
        ] ||
      response
        ?.data
        ?.type ||
      "application/octet-stream";

    const blob =
      response.data instanceof
      Blob
        ? response.data
        : new Blob(
            [
              response.data,
            ],
            {
              type:
                contentType,
            }
          );

    const objectUrl =
      URL.createObjectURL(
        blob
      );

    const openedWindow =
      window.open(
        objectUrl,
        "_blank",
        "noopener,noreferrer"
      );

    window.setTimeout(
      () => {
        URL.revokeObjectURL(
          objectUrl
        );
      },
      60 *
        1000
    );

    return Boolean(
      openedWindow
    );
  };

/* =========================================================
   COMPATIBILITY ALIASES

   Keep these because existing recruitment components
   may already import these names.
========================================================= */

export const createInterview =
  scheduleInterview;

export const getInterviewById =
  getInterview;

export const evaluateInterview =
  submitInterviewEvaluation;

/* =========================================================
   DEFAULT EXPORT
========================================================= */

const interviewService = {
  /* Meta */
  getInterviewMeta,

  /* Interview */
  getInterviews,

  getInterview,

  getInterviewById,

  scheduleInterview,

  createInterview,

  rescheduleInterview,

  cancelInterview,

  checkInInterview,

  /* Evaluation */
  submitInterviewEvaluation,

  evaluateInterview,

  getInterviewEvaluation,

  /* Evaluation attachment */
  uploadInterviewEvaluationAttachment,

  removeInterviewEvaluationAttachment,

  getTemporaryInterviewEvaluationAttachment,

  openTemporaryInterviewEvaluationAttachment,

  getInterviewEvaluationAttachment,

  openInterviewEvaluationAttachment,
};

export default interviewService;
import api from "./api";

/* =========================================================
   RESPONSE HELPERS
========================================================= */

const responseData = (response) => {
  return (
    response?.data?.data ||
    response?.data ||
    null
  );
};

/* =========================================================
   SUMMARY

   GET
   /api/v1/evaluations/summary
========================================================= */

export const getEvaluationSummary =
  async () => {
    const response =
      await api.get(
        "/evaluations/summary"
      );

    return (
      responseData(response) || {
        total: 0,
        selected: 0,
        hold: 0,
        rejected: 0,
      }
    );
  };

/* =========================================================
   LIST

   GET
   /api/v1/evaluations

   params:
   {
     decision: "ALL" | "SELECTED" | "HOLD" | "REJECTED",
     search: "",
     page: 1,
     limit: 25
   }
========================================================= */

export const getEvaluations =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        "/evaluations",
        {
          params,
        }
      );

    const data =
      responseData(
        response
      );

    return (
      data || {
        records: [],
        pagination: {
          page: 1,
          limit: 25,
          total: 0,
          pages: 1,
        },
      }
    );
  };

/* =========================================================
   DETAIL

   GET
   /api/v1/evaluations/:evaluationId
========================================================= */

export const getEvaluation =
  async (
    evaluationId
  ) => {
    if (!evaluationId) {
      throw new Error(
        "Evaluation ID is required"
      );
    }

    const response =
      await api.get(
        `/evaluations/${evaluationId}`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   BY INTERVIEW

   GET
   /api/v1/evaluations/interview/:interviewId
========================================================= */

export const getEvaluationByInterview =
  async (
    interviewId
  ) => {
    if (!interviewId) {
      throw new Error(
        "Interview ID is required"
      );
    }

    const response =
      await api.get(
        `/evaluations/interview/${interviewId}`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   RESEND DECISION EMAIL

   POST
   /api/v1/evaluations/:evaluationId/resend-email
========================================================= */

export const resendEvaluationDecisionEmail =
  async (
    evaluationId
  ) => {
    if (!evaluationId) {
      throw new Error(
        "Evaluation ID is required"
      );
    }

    const response =
      await api.post(
        `/evaluations/${evaluationId}/resend-email`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   OPEN EVALUATION ATTACHMENT

   GET
   /api/v1/evaluations/:evaluationId/attachment
========================================================= */

export const getEvaluationAttachment =
  async (
    evaluationId
  ) => {
    if (!evaluationId) {
      throw new Error(
        "Evaluation ID is required"
      );
    }

    return api.get(
      `/evaluations/${evaluationId}/attachment`,
      {
        responseType: "blob",
      }
    );
  };

export const openEvaluationAttachment =
  async (
    evaluationId
  ) => {
    const response =
      await getEvaluationAttachment(
        evaluationId
      );

    const contentType =
      response?.headers?.[
        "content-type"
      ] ||
      response?.data?.type ||
      "application/octet-stream";

    const blob =
      response.data instanceof Blob
        ? response.data
        : new Blob(
            [response.data],
            {
              type: contentType,
            }
          );

    const objectUrl =
      URL.createObjectURL(
        blob
      );

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
      60 * 1000
    );

    return true;
  };

/* =========================================================
   DEFAULT EXPORT
========================================================= */

const evaluationService = {
  getEvaluationSummary,
  getEvaluations,
  getEvaluation,
  getEvaluationByInterview,
  resendEvaluationDecisionEmail,
  getEvaluationAttachment,
  openEvaluationAttachment,
};

export default evaluationService;
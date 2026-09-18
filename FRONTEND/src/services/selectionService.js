import api from "./api";

/* =========================================================
   RESPONSE
========================================================= */

const responseData = (
  response
) => {
  const body =
    response?.data;

  if (
    body &&
    typeof body ===
      "object" &&
    Object.prototype
      .hasOwnProperty
      .call(
        body,
        "data"
      )
  ) {
    return body.data;
  }

  return (
    body ??
    null
  );
};

/* =========================================================
   ERROR
========================================================= */

const normalErrorMessage = (
  error,
  fallback =
    "Request failed"
) => {
  return (
    error?.response
      ?.data
      ?.message ||
    error?.message ||
    fallback
  );
};

/* =========================================================
   BLOB ERROR
========================================================= */

const getBlobErrorMessage =
  async (
    error,
    fallback =
      "Request failed"
  ) => {
    const data =
      error?.response
        ?.data;

    if (
      data instanceof
      Blob
    ) {
      try {
        const text =
          await data.text();

        if (!text) {
          return fallback;
        }

        try {
          const json =
            JSON.parse(
              text
            );

          return (
            json?.message ||
            fallback
          );
        } catch {
          return (
            text ||
            fallback
          );
        }
      } catch {
        return fallback;
      }
    }

    return normalErrorMessage(
      error,
      fallback
    );
  };

/* =========================================================
   OPEN AUTHENTICATED BLOB
========================================================= */

const openAuthenticatedBlob =
  async (
    request,
    fallbackName =
      "document.pdf"
  ) => {
    const previewWindow =
      window.open(
        "",
        "_blank"
      );

    try {
      const response =
        await request();

      const contentType =
        response
          ?.headers
          ?.[
            "content-type"
          ] ||
        "application/pdf";

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        const text =
          await response
            .data
            .text();

        let parsed =
          null;

        try {
          parsed =
            JSON.parse(
              text
            );
        } catch {
          parsed =
            null;
        }

        throw new Error(
          parsed?.message ||
          text ||
          "Document could not be opened"
        );
      }

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

      if (
        !blob ||
        blob.size ===
          0
      ) {
        throw new Error(
          "Generated document is empty."
        );
      }

      const objectUrl =
        window.URL
          .createObjectURL(
            blob
          );

      if (
        previewWindow
      ) {
        previewWindow.location.href =
          objectUrl;
      } else {
        const anchor =
          document
            .createElement(
              "a"
            );

        anchor.href =
          objectUrl;

        anchor.target =
          "_blank";

        anchor.rel =
          "noopener noreferrer";

        anchor.download =
          fallbackName;

        document.body
          .appendChild(
            anchor
          );

        anchor.click();

        anchor.remove();
      }

      window.setTimeout(
        () => {
          try {
            window.URL
              .revokeObjectURL(
                objectUrl
              );
          } catch {
            // Ignore.
          }
        },
        60000
      );

      return {
        success:
          true,
      };
    } catch (
      error
    ) {
      if (
        previewWindow &&
        !previewWindow
          .closed
      ) {
        previewWindow.close();
      }

      throw error;
    }
  };

/* =========================================================
   SELECTION SUMMARY
========================================================= */

export const getSelectionSummary =
  async () => {
    const response =
      await api.get(
        "/selections/summary"
      );

    return responseData(
      response
    );
  };

/* =========================================================
   SELECTION LIST
========================================================= */

export const getSelections =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        "/selections",
        {
          params,
        }
      );

    return responseData(
      response
    );
  };

/* =========================================================
   SELECTION DETAIL
========================================================= */

export const getSelection =
  async (
    selectionId
  ) => {
    if (!selectionId) {
      throw new Error(
        "Selection ID is required"
      );
    }

    const response =
      await api.get(
        `/selections/${selectionId}`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   SELECTION BY CANDIDATE
========================================================= */

export const getSelectionByCandidate =
  async (
    candidateId
  ) => {
    if (!candidateId) {
      throw new Error(
        "Candidate ID is required"
      );
    }

    const response =
      await api.get(
        `/selections/candidate/${candidateId}`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   LOI READINESS
========================================================= */

export const getLoiReadiness =
  async (
    selectionId
  ) => {
    if (!selectionId) {
      throw new Error(
        "Selection ID is required"
      );
    }

    const response =
      await api.get(
        `/selections/${selectionId}/loi/readiness`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   GENERATE LOI
========================================================= */

export const generateSelectionLoi =
  async (
    selectionId,
    payload = {}
  ) => {
    if (!selectionId) {
      throw new Error(
        "Selection ID is required"
      );
    }

    const response =
      await api.post(
        `/selections/${selectionId}/loi/generate`,
        payload
      );

    return responseData(
      response
    );
  };

/* =========================================================
   OPEN LOI
========================================================= */

export const openSelectionLoiPdf =
  async (
    selectionId
  ) => {
    if (!selectionId) {
      throw new Error(
        "Selection ID is required"
      );
    }

    try {
      return await openAuthenticatedBlob(
        () =>
          api.get(
            `/selections/${selectionId}/loi`,
            {
              responseType:
                "blob",
            }
          ),
        "Letter-of-Intent.pdf"
      );
    } catch (
      error
    ) {
      const message =
        await getBlobErrorMessage(
          error,
          "LOI PDF could not be opened"
        );

      throw new Error(
        message
      );
    }
  };

/* =========================================================
   SEND LOI
========================================================= */

export const sendSelectionLoi =
  async (
    selectionId
  ) => {
    if (!selectionId) {
      throw new Error(
        "Selection ID is required"
      );
    }

    const response =
      await api.post(
        `/selections/${selectionId}/loi/send`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   HR DOCUMENT RECORD
========================================================= */

export const getSelectionDocuments =
  async (
    selectionId
  ) => {
    if (!selectionId) {
      throw new Error(
        "Selection ID is required"
      );
    }

    const response =
      await api.get(
        `/selection-documents/selection/${selectionId}`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   OPEN HR DOCUMENT
========================================================= */

export const openSelectionDocument =
  async (
    selectionId,
    documentId
  ) => {
    if (
      !selectionId ||
      !documentId
    ) {
      throw new Error(
        "Selection and Document IDs are required"
      );
    }

    try {
      return await openAuthenticatedBlob(
        () =>
          api.get(
            `/selection-documents/selection/${selectionId}/file/${documentId}`,
            {
              responseType:
                "blob",
            }
          ),
        "candidate-document"
      );
    } catch (
      error
    ) {
      const message =
        await getBlobErrorMessage(
          error,
          "Candidate document could not be opened"
        );

      throw new Error(
        message
      );
    }
  };

/* =========================================================
   REQUEST DOCUMENT CORRECTION
========================================================= */

export const requestDocumentResubmission =
  async (
    selectionId,
    payload = {}
  ) => {
    if (!selectionId) {
      throw new Error(
        "Selection ID is required"
      );
    }

    const response =
      await api.post(
        `/selection-documents/selection/${selectionId}/query`,
        payload
      );

    return responseData(
      response
    );
  };

/* =========================================================
   VERIFY DOCUMENTS
========================================================= */

export const verifySelectionDocuments =
  async (
    selectionId
  ) => {
    if (!selectionId) {
      throw new Error(
        "Selection ID is required"
      );
    }

    const response =
      await api.post(
        `/selection-documents/selection/${selectionId}/verify`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   OFFER READINESS
========================================================= */

export const getOfferReadiness =
  async (
    selectionId
  ) => {
    if (!selectionId) {
      throw new Error(
        "Selection ID is required"
      );
    }

    const response =
      await api.get(
        `/offers/selection/${selectionId}/readiness`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   CURRENT OFFER
========================================================= */

export const getSelectionOffer =
  async (
    selectionId
  ) => {
    if (!selectionId) {
      throw new Error(
        "Selection ID is required"
      );
    }

    const response =
      await api.get(
        `/offers/selection/${selectionId}`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   OFFER HISTORY
========================================================= */

export const getSelectionOfferHistory =
  async (
    selectionId
  ) => {
    if (!selectionId) {
      throw new Error(
        "Selection ID is required"
      );
    }

    const response =
      await api.get(
        `/offers/selection/${selectionId}/history`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   GENERATE / REGENERATE OFFER
========================================================= */

export const generateSelectionOffer =
  async (
    selectionId,
    payload = {}
  ) => {
    if (!selectionId) {
      throw new Error(
        "Selection ID is required"
      );
    }

    const response =
      await api.post(
        `/offers/selection/${selectionId}/generate`,
        payload
      );

    return responseData(
      response
    );
  };

/* =========================================================
   OPEN OFFER PDF
========================================================= */

export const openSelectionOfferPdf =
  async (
    selectionId
  ) => {
    if (!selectionId) {
      throw new Error(
        "Selection ID is required"
      );
    }

    try {
      return await openAuthenticatedBlob(
        () =>
          api.get(
            `/offers/selection/${selectionId}/pdf`,
            {
              responseType:
                "blob",
            }
          ),
        "Offer-Letter.pdf"
      );
    } catch (
      error
    ) {
      const message =
        await getBlobErrorMessage(
          error,
          "Offer Letter PDF could not be opened"
        );

      throw new Error(
        message
      );
    }
  };

/* =========================================================
   MARK OFFER REVIEWED
========================================================= */

export const reviewSelectionOffer =
  async (
    selectionId
  ) => {
    if (!selectionId) {
      throw new Error(
        "Selection ID is required"
      );
    }

    const response =
      await api.post(
        `/offers/selection/${selectionId}/review`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   SEND OFFER
========================================================= */

export const sendSelectionOffer =
  async (
    selectionId
  ) => {
    if (!selectionId) {
      throw new Error(
        "Selection ID is required"
      );
    }

    const response =
      await api.post(
        `/offers/selection/${selectionId}/send`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   JOINING READINESS
========================================================= */

export const getJoiningReadiness =
  async (
    selectionId
  ) => {
    if (!selectionId) {
      throw new Error(
        "Selection ID is required"
      );
    }

    const response =
      await api.get(
        `/joinings/selection/${selectionId}/readiness`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   START / ENSURE JOINING
========================================================= */

export const startJoining =
  async (
    selectionId
  ) => {
    if (!selectionId) {
      throw new Error(
        "Selection ID is required"
      );
    }

    const response =
      await api.post(
        `/joinings/selection/${selectionId}/start`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   GET JOINING RECORD
========================================================= */

export const getJoining =
  async (
    selectionId
  ) => {
    if (!selectionId) {
      throw new Error(
        "Selection ID is required"
      );
    }

    const response =
      await api.get(
        `/joinings/selection/${selectionId}`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   UPDATE JOINING
========================================================= */

export const updateJoining =
  async (
    selectionId,
    payload = {}
  ) => {
    if (!selectionId) {
      throw new Error(
        "Selection ID is required"
      );
    }

    const response =
      await api.patch(
        `/joinings/selection/${selectionId}`,
        payload
      );

    return responseData(
      response
    );
  };

/* =========================================================
   CONFIRM DAY 1
========================================================= */

export const confirmJoiningDay1 =
  async (
    selectionId,
    payload = {}
  ) => {
    if (!selectionId) {
      throw new Error(
        "Selection ID is required"
      );
    }

    const response =
      await api.post(
        `/joinings/selection/${selectionId}/day1`,
        payload
      );

    return responseData(
      response
    );
  };

/* =========================================================
   LINK EMPLOYEE

   Keep available for later integration with People.
   Do not call automatically for now.
========================================================= */

export const linkJoiningEmployee =
  async (
    selectionId,
    employeeId
  ) => {
    if (!selectionId) {
      throw new Error(
        "Selection ID is required"
      );
    }

    if (!employeeId) {
      throw new Error(
        "Employee ID is required"
      );
    }

    const response =
      await api.patch(
        `/joinings/selection/${selectionId}/employee`,
        {
          employeeId,
        }
      );

    return responseData(
      response
    );
  };

/* =========================================================
   JOINING SUMMARY
========================================================= */

export const getJoiningSummary =
  async () => {
    const response =
      await api.get(
        "/joinings/summary"
      );

    return responseData(
      response
    );
  };

/* =========================================================
   DEFAULT
========================================================= */

const selectionService = {
  /* Selection */
  getSelectionSummary,
  getSelections,
  getSelection,
  getSelectionByCandidate,

  /* LOI */
  getLoiReadiness,
  generateSelectionLoi,
  openSelectionLoiPdf,
  sendSelectionLoi,

  /* Documents */
  getSelectionDocuments,
  openSelectionDocument,
  requestDocumentResubmission,
  verifySelectionDocuments,

  /* Offer */
  getOfferReadiness,
  getSelectionOffer,
  getSelectionOfferHistory,
  generateSelectionOffer,
  openSelectionOfferPdf,
  reviewSelectionOffer,
  sendSelectionOffer,

  /* Joining */
  getJoiningReadiness,
  startJoining,
  getJoining,
  updateJoining,
  confirmJoiningDay1,
  linkJoiningEmployee,
  getJoiningSummary,
};

export default selectionService;
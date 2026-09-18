import axios from "axios";

/* =========================================================
   PUBLIC API BASE
========================================================= */

const API_BASE =
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000/api/v1";

const PUBLIC_BASE =
  API_BASE.replace(
    /\/api\/v1\/?$/,
    ""
  );

/* =========================================================
   PUBLIC AXIOS

   No ERP auth interceptor.
   No employee login redirect.
========================================================= */

const publicApi =
  axios.create({
    baseURL:
      `${PUBLIC_BASE}/api/public`,

    timeout:
      60000,
  });

/* =========================================================
   RESPONSE
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
   LOAD PORTAL
========================================================= */

export const getCandidatePortal =
  async (
    token
  ) => {
    if (!token) {
      throw new Error(
        "Secure candidate link is missing"
      );
    }

    const response =
      await publicApi.get(
        `/candidate/${encodeURIComponent(
          token
        )}`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   LOI PDF
========================================================= */

export const getCandidateLoi =
  async (
    token
  ) => {
    if (!token) {
      throw new Error(
        "Secure candidate link is missing"
      );
    }

    return publicApi.get(
      `/candidate/${encodeURIComponent(
        token
      )}/loi`,
      {
        responseType: "blob",
      }
    );
  };

export const openCandidateLoi =
  async (
    token
  ) => {
    const response =
      await getCandidateLoi(
        token
      );

    const contentType =
      response?.headers?.[
        "content-type"
      ] ||
      "application/pdf";

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
  };

/* =========================================================
   ACCEPT LOI
========================================================= */

export const acceptCandidateLoi =
  async (
    token
  ) => {
    const response =
      await publicApi.post(
        `/candidate/${encodeURIComponent(
          token
        )}/loi/accept`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   DECLINE LOI
========================================================= */

export const declineCandidateLoi =
  async (
    token,
    reason = ""
  ) => {
    const response =
      await publicApi.post(
        `/candidate/${encodeURIComponent(
          token
        )}/loi/decline`,
        {
          reason,
        }
      );

    return responseData(
      response
    );
  };

/* =========================================================
   DOCUMENTS
========================================================= */

export const getCandidateDocuments =
  async (
    token
  ) => {
    const response =
      await publicApi.get(
        `/candidate/${encodeURIComponent(
          token
        )}/documents`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   SAVE FORM
========================================================= */

export const saveCandidateDocumentProfile =
  async (
    token,
    payload
  ) => {
    const response =
      await publicApi.patch(
        `/candidate/${encodeURIComponent(
          token
        )}/documents`,
        payload
      );

    return responseData(
      response
    );
  };

/* =========================================================
   UPLOAD
========================================================= */

export const uploadCandidateDocument =
  async (
    token,
    documentType,
    file,
    onUploadProgress
  ) => {
    if (!file) {
      throw new Error(
        "Please select a document"
      );
    }

    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    const response =
      await publicApi.post(
        `/candidate/${encodeURIComponent(
          token
        )}/documents/upload/${encodeURIComponent(
          documentType
        )}`,
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },

          onUploadProgress: (
            event
          ) => {
            if (
              typeof onUploadProgress !==
              "function"
            ) {
              return;
            }

            const total =
              Number(
                event?.total ||
                  0
              );

            const loaded =
              Number(
                event?.loaded ||
                  0
              );

            if (total <= 0) {
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
              percent
            );
          },
        }
      );

    return responseData(
      response
    );
  };

/* =========================================================
   OPEN DOCUMENT
========================================================= */

export const openCandidateDocument =
  async (
    token,
    documentId
  ) => {
    const response =
      await publicApi.get(
        `/candidate/${encodeURIComponent(
          token
        )}/documents/file/${documentId}`,
        {
          responseType: "blob",
        }
      );

    const contentType =
      response?.headers?.[
        "content-type"
      ] ||
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
  };

/* =========================================================
   REMOVE
========================================================= */

export const removeCandidateDocument =
  async (
    token,
    documentId
  ) => {
    const response =
      await publicApi.delete(
        `/candidate/${encodeURIComponent(
          token
        )}/documents/${documentId}`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   SUBMIT
========================================================= */

export const submitCandidateDocuments =
  async (
    token
  ) => {
    const response =
      await publicApi.post(
        `/candidate/${encodeURIComponent(
          token
        )}/documents/submit`,
        {
          declarationAccepted:
            true,
        }
      );

    return responseData(
      response
    );
  };

/* =========================================================
   DEFAULT
========================================================= */

const candidatePortalService = {
  getCandidatePortal,
  getCandidateLoi,
  openCandidateLoi,
  acceptCandidateLoi,
  declineCandidateLoi,

  getCandidateDocuments,
  saveCandidateDocumentProfile,
  uploadCandidateDocument,
  openCandidateDocument,
  removeCandidateDocument,
  submitCandidateDocuments,
};

export default candidatePortalService;
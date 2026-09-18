import api from "./api";

/* =========================================================
   RESPONSE
========================================================= */

const responseData =
  (
    response
  ) =>
    response?.data?.data ||
    response?.data ||
    null;

/* =========================================================
   BLOB ERROR
========================================================= */

const blobError =
  async (
    error,
    fallback =
      "Document request failed"
  ) => {
    const data =
      error?.response?.data;

    if (
      data instanceof Blob
    ) {
      try {
        const text =
          await data.text();

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

    return (
      error?.response?.data?.message ||
      error?.message ||
      fallback
    );
  };

/* =========================================================
   NORMAL ERROR
========================================================= */

const apiErrorMessage =
  (
    error,
    fallback =
      "Request failed"
  ) =>
    error?.response?.data?.message ||
    error?.message ||
    fallback;

/* =========================================================
   FILE DETECTION

   Do not depend only on instanceof File.

   This works reliably with browser File objects and avoids
   problems caused by wrapped payloads.
========================================================= */

const isBrowserFile =
  (
    value
  ) =>
    Boolean(
      value &&
      typeof value ===
        "object" &&
      typeof value.name ===
        "string" &&
      typeof value.size ===
        "number" &&
      typeof value.type ===
        "string" &&
      typeof value.slice ===
        "function"
    );

/* =========================================================
   RESOLVE FILE + METADATA

   Supports all these safely:

   File

   {
     file: File,
     ...
   }

   {
     file: {
       file: File,
       ...
     }
   }
========================================================= */

const resolveUploadPayload =
  (
    input
  ) => {
    if (
      isBrowserFile(
        input
      )
    ) {
      return {
        file:
          input,

        category:
          "JOINING",

        documentType:
          "JOINING_DOCUMENT",

        label:
          input.name,

        description:
          "",
      };
    }

    if (
      isBrowserFile(
        input?.file
      )
    ) {
      return {
        file:
          input.file,

        category:
          input.category ||
          "JOINING",

        documentType:
          input.documentType ||
          "JOINING_DOCUMENT",

        label:
          input.label ||
          input.file.name,

        description:
          input.description ||
          "",
      };
    }

    /*
     * Compatibility for an accidentally nested payload:
     *
     * {
     *   file: {
     *     file: File,
     *     label: ...
     *   }
     * }
     */
    if (
      isBrowserFile(
        input?.file?.file
      )
    ) {
      return {
        file:
          input.file.file,

        category:
          input.file.category ||
          input.category ||
          "JOINING",

        documentType:
          input.file.documentType ||
          input.documentType ||
          "JOINING_DOCUMENT",

        label:
          input.file.label ||
          input.label ||
          input.file.file.name,

        description:
          input.file.description ||
          input.description ||
          "",
      };
    }

    return {
      file:
        null,

      category:
        "JOINING",

      documentType:
        "JOINING_DOCUMENT",

      label:
        "",

      description:
        "",
    };
  };

/* =========================================================
   OPEN BLOB
========================================================= */

const openBlobResponse =
  (
    response,
    fallbackType =
      "application/pdf"
  ) => {
    const contentType =
      response?.headers?.[
        "content-type"
      ] ||
      fallbackType;

    const blob =
      response.data instanceof Blob
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
      !blob.size
    ) {
      throw new Error(
        "Document is empty"
      );
    }

    const url =
      window.URL
        .createObjectURL(
          blob
        );

    /*
     * window.open is simpler and more reliable here than
     * creating a temporary hidden anchor.
     */
    const popup =
      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );

    if (
      !popup
    ) {
      /*
       * Browser may block window.open.
       * Fall back to anchor click.
       */
      const anchor =
        document.createElement(
          "a"
        );

      anchor.href =
        url;

      anchor.target =
        "_blank";

      anchor.rel =
        "noopener noreferrer";

      anchor.style.display =
        "none";

      document.body.appendChild(
        anchor
      );

      anchor.click();

      anchor.remove();
    }

    window.setTimeout(
      () => {
        window.URL
          .revokeObjectURL(
            url
          );
      },
      60000
    );

    return true;
  };

/* =========================================================
   LIST / VAULT
========================================================= */

export const getEmployeeDocuments =
  async (
    employeeId,
    params = {}
  ) => {
    if (
      !employeeId
    ) {
      throw new Error(
        "Employee ID is required"
      );
    }

    try {
      const response =
        await api.get(
          `/employee-documents/${employeeId}`,
          {
            params,
          }
        );

      return responseData(
        response
      );
    } catch (
      error
    ) {
      throw new Error(
        apiErrorMessage(
          error,
          "Employee documents could not be loaded"
        )
      );
    }
  };

/* =========================================================
   SYNC RECRUITMENT DOCUMENTS
========================================================= */

export const syncRecruitmentDocuments =
  async (
    employeeId
  ) => {
    if (
      !employeeId
    ) {
      throw new Error(
        "Employee ID is required"
      );
    }

    try {
      const response =
        await api.post(
          `/employee-documents/${employeeId}/sync-recruitment`
        );

      return responseData(
        response
      );
    } catch (
      error
    ) {
      throw new Error(
        apiErrorMessage(
          error,
          "Recruitment documents could not be synchronized"
        )
      );
    }
  };



  /* =========================================================
   MULTIPART REQUEST

   Important:
   api.js may have application/json as a default header.

   For FormData we explicitly remove that so Axios/browser
   can generate the multipart boundary correctly.
========================================================= */

const postMultipart =
  async (
    url,
    formData
  ) => {
    return api.request({
      method:
        "POST",

      url,

      data:
        formData,

      headers: {
        /*
         * Axios browser adapter will attach the correct
         * multipart boundary.
         */
        "Content-Type":
          undefined,
      },

      transformRequest: [
        (
          data,
          headers
        ) => {
          /*
           * Remove any JSON Content-Type inherited from
           * the shared Axios instance/interceptors.
           */
          if (
            headers
          ) {
            if (
              typeof headers.delete ===
              "function"
            ) {
              headers.delete(
                "Content-Type"
              );
            } else {
              delete headers[
                "Content-Type"
              ];

              delete headers[
                "content-type"
              ];
            }
          }

          return data;
        },
      ],
    });
  };


/* =========================================================
   UPLOAD EMPLOYEE DOCUMENT
========================================================= */

export const uploadEmployeeDocument =
  async (
    employeeId,
    input = {}
  ) => {
    if (
      !employeeId
    ) {
      throw new Error(
        "Employee ID is required"
      );
    }

    const {
      file,
      category,
      documentType,
      label,
      description,
    } =
      resolveUploadPayload(
        input
      );

    /* =====================================================
       FILE
    ===================================================== */

    if (
      !file
    ) {
      console.error(
        "[Employee Documents] Upload payload could not resolve a File:",
        input
      );

      throw new Error(
        "Please select a valid document"
      );
    }

    if (
      file.size <=
      0
    ) {
      throw new Error(
        "Selected document is empty"
      );
    }

    /* =====================================================
       MIME
    ===================================================== */

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      throw new Error(
        "Only PDF, JPG and PNG documents are allowed"
      );
    }

    /* =====================================================
       SIZE
    ===================================================== */

    if (
      file.size >
      15 *
        1024 *
        1024
    ) {
      throw new Error(
        "Document cannot exceed 15 MB"
      );
    }

    /* =====================================================
       LABEL
    ===================================================== */

    const finalLabel =
      String(
        label ||
        file.name ||
        ""
      ).trim();

    if (
      !finalLabel
    ) {
      throw new Error(
        "Document title is required"
      );
    }

    /* =====================================================
       FORM DATA

       IMPORTANT:
       backend uses:

       upload.single("file")

       therefore the key MUST be "file".
    ===================================================== */

    const formData =
      new FormData();

    formData.append(
      "file",
      file,
      file.name
    );

    formData.append(
      "category",
      String(
        category ||
        "JOINING"
      )
        .trim()
        .toUpperCase()
    );

    formData.append(
      "documentType",
      String(
        documentType ||
        "JOINING_DOCUMENT"
      )
        .trim()
        .toUpperCase()
    );

    formData.append(
      "label",
      finalLabel
    );

    if (
      String(
        description ||
        ""
      ).trim()
    ) {
      formData.append(
        "description",
        String(
          description
        ).trim()
      );
    }

    /* =====================================================
       TEST OUTPUT

       You should see this immediately before POST.
    ===================================================== */

    console.log(
      "[Employee Documents] POST upload",
      {
        employeeId,

        file:
          file.name,

        mimeType:
          file.type,

        size:
          file.size,

        category:
          category ||
          "JOINING",

        documentType:
          documentType ||
          "JOINING_DOCUMENT",

        label:
          finalLabel,
      }
    );

    /* =====================================================
       REQUEST

       DO NOT manually set Content-Type.

       Axios/browser must generate:
       multipart/form-data; boundary=...
    ===================================================== */

    try {
      const response =
  await postMultipart(
    `/employee-documents/${employeeId}`,
    formData
  );

      return responseData(
        response
      );
    } catch (
      error
    ) {
      throw new Error(
        apiErrorMessage(
          error,
          "Employee document could not be uploaded"
        )
      );
    }
  };

/* =========================================================
   OPEN
========================================================= */

export const openEmployeeDocument =
  async (
    employeeId,
    documentId
  ) => {
    if (
      !employeeId ||
      !documentId
    ) {
      throw new Error(
        "Employee and document IDs are required"
      );
    }

    try {
      const response =
        await api.get(
          `/employee-documents/${employeeId}/file/${documentId}`,
          {
            responseType:
              "blob",
          }
        );

      return openBlobResponse(
        response
      );
    } catch (
      error
    ) {
      throw new Error(
        await blobError(
          error,
          "Document could not be opened"
        )
      );
    }
  };

/* =========================================================
   DELETE
========================================================= */

export const deleteEmployeeDocument =
  async (
    employeeId,
    documentId
  ) => {
    if (
      !employeeId ||
      !documentId
    ) {
      throw new Error(
        "Employee and document IDs are required"
      );
    }

    try {
      const response =
        await api.delete(
          `/employee-documents/${employeeId}/${documentId}`
        );

      return responseData(
        response
      );
    } catch (
      error
    ) {
      throw new Error(
        apiErrorMessage(
          error,
          "Document could not be removed"
        )
      );
    }
  };

/* =========================================================
   UPDATE METADATA
========================================================= */

export const updateEmployeeDocument =
  async (
    employeeId,
    documentId,
    payload = {}
  ) => {
    if (
      !employeeId ||
      !documentId
    ) {
      throw new Error(
        "Employee and document IDs are required"
      );
    }

    try {
      const response =
        await api.patch(
          `/employee-documents/${employeeId}/${documentId}`,
          payload
        );

      return responseData(
        response
      );
    } catch (
      error
    ) {
      throw new Error(
        apiErrorMessage(
          error,
          "Document information could not be updated"
        )
      );
    }
  };

/* =========================================================
   REPLACE
========================================================= */

export const replaceEmployeeDocument =
  async (
    employeeId,
    documentId,
    input = {}
  ) => {
    if (
      !employeeId ||
      !documentId
    ) {
      throw new Error(
        "Employee and document IDs are required"
      );
    }

    const {
      file,
      category,
      documentType,
      label,
      description,
    } =
      resolveUploadPayload(
        input
      );

    if (
      !file
    ) {
      throw new Error(
        "Replacement file is required"
      );
    }

    const formData =
      new FormData();

    formData.append(
      "file",
      file,
      file.name
    );

    if (
      category
    ) {
      formData.append(
        "category",
        category
      );
    }

    if (
      documentType
    ) {
      formData.append(
        "documentType",
        documentType
      );
    }

    if (
      label
    ) {
      formData.append(
        "label",
        label
      );
    }

    if (
      description
    ) {
      formData.append(
        "description",
        description
      );
    }

    try {
      const response =
        await api.post(
          `/employee-documents/${employeeId}/${documentId}/replace`,
          formData
        );

      return responseData(
        response
      );
    } catch (
      error
    ) {
      throw new Error(
        apiErrorMessage(
          error,
          "Document could not be replaced"
        )
      );
    }
  };

/* =========================================================
   MASTER DOSSIER
========================================================= */

export const generateEmployeeDocumentBundle =
  async (
    employeeId,
    payload = {}
  ) => {
    if (
      !employeeId
    ) {
      throw new Error(
        "Employee ID is required"
      );
    }

    try {
      const response =
        await api.post(
          `/employee-documents/${employeeId}/merge`,
          payload
        );

      return responseData(
        response
      );
    } catch (
      error
    ) {
      throw new Error(
        apiErrorMessage(
          error,
          "Employee Master File could not be generated"
        )
      );
    }
  };

/* =========================================================
   OPEN GENERATED MASTER FILE

   Generated master file is itself an EmployeeDocument.
========================================================= */

export const openEmployeeDocumentBundle =
  async (
    employeeId,
    bundleId
  ) =>
    openEmployeeDocument(
      employeeId,
      bundleId
    );

/* =========================================================
   DEFAULT
========================================================= */

const employeeDocumentService = {
  getEmployeeDocuments,

  syncRecruitmentDocuments,

  uploadEmployeeDocument,

  openEmployeeDocument,

  deleteEmployeeDocument,

  updateEmployeeDocument,

  replaceEmployeeDocument,

  generateEmployeeDocumentBundle,

  openEmployeeDocumentBundle,
};

export default employeeDocumentService;
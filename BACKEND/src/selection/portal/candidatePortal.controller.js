const candidatePortalService =
  require(
    "./candidatePortal.service"
  );

const documentService =
  require(
    "../documents/document.service"
  );

/* =========================================================
   ERROR
========================================================= */

const getStatus =
  (
    error,
    fallback =
      400
  ) =>
    error?.statusCode ||
    error?.status ||
    fallback;

const sendError =
  (
    res,
    error,
    fallback
  ) =>
    res
      .status(
        getStatus(
          error
        )
      )
      .json({
        success:
          false,

        message:
          error?.message ||
          fallback,
      });

/* =========================================================
   CONTEXT
========================================================= */

const requestContext =
  (
    req
  ) => ({
    rawToken:
      req.params
        .token,

    ip:
      req.ip ||
      "",

    userAgent:
      req.get(
        "user-agent"
      ) ||
      "",
  });

/* =========================================================
   PORTAL
========================================================= */

const getPortal =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await candidatePortalService
          .getCandidatePortal(
            requestContext(
              req
            )
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Candidate portal could not be loaded"
      );
    }
  };

/* =========================================================
   VIEW LOI
========================================================= */

const viewLoi =
  async (
    req,
    res
  ) => {
    try {
      const file =
        await candidatePortalService
          .getPortalLoiFile(
            requestContext(
              req
            )
          );

      res.type(
        file.mimeType
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${String(
          file.fileName ||
            "Letter-of-Intent.pdf"
        ).replaceAll(
          '"',
          ""
        )}"`
      );

      return res.sendFile(
        file.path
      );
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Letter of Intent could not be opened"
      );
    }
  };

/* =========================================================
   ACCEPT LOI
========================================================= */

const acceptLoi =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await candidatePortalService
          .acceptLoi(
            requestContext(
              req
            )
          );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Letter of Intent accepted successfully",

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Letter of Intent could not be accepted"
      );
    }
  };

/* =========================================================
   DECLINE LOI
========================================================= */

const declineLoi =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await candidatePortalService
          .declineLoi({
            ...requestContext(
              req
            ),

            reason:
              req.body
                ?.reason ||
              "",
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Your response has been recorded",

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Letter of Intent could not be declined"
      );
    }
  };

/* =========================================================
   DOCUMENT FORM
========================================================= */

const getDocuments =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await documentService
          .getCandidateDocuments(
            requestContext(
              req
            )
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Pre-joining documents could not be loaded"
      );
    }
  };

/* =========================================================
   SAVE FORM
========================================================= */

const saveDocumentProfile =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await documentService
          .saveCandidateDocumentProfile({
            ...requestContext(
              req
            ),

            body:
              req.body ||
              {},
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Information saved successfully",

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Information could not be saved"
      );
    }
  };

/* =========================================================
   UPLOAD DOCUMENT
========================================================= */

const uploadDocument =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await documentService
          .uploadCandidateFile({
            ...requestContext(
              req
            ),

            documentType:
              req.params
                .documentType,

            file:
              req.file,
          });

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "Document uploaded successfully",

          data,
        });
    } catch (
      error
    ) {
      /*
       * Multer may already have created a temp file.
       */
      if (
        req.file?.path
      ) {
        try {
          const fs =
            require(
              "fs"
            );

          await fs.promises
            .unlink(
              req.file.path
            );
        } catch {
          // Ignore cleanup failure.
        }
      }

      return sendError(
        res,
        error,
        "Document could not be uploaded"
      );
    }
  };

/* =========================================================
   REMOVE
========================================================= */

const removeDocument =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await documentService
          .removeCandidateFile({
            ...requestContext(
              req
            ),

            documentId:
              req.params
                .documentId,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Document removed",

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Document could not be removed"
      );
    }
  };

/* =========================================================
   OPEN
========================================================= */

const openDocument =
  async (
    req,
    res
  ) => {
    try {
      const file =
        await documentService
          .getCandidateFile({
            ...requestContext(
              req
            ),

            documentId:
              req.params
                .documentId,
          });

      res.type(
        file.mimeType
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${String(
          file.fileName ||
            "document"
        ).replaceAll(
          '"',
          ""
        )}"`
      );

      return res.sendFile(
        file.path
      );
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Document could not be opened"
      );
    }
  };

/* =========================================================
   SUBMIT
========================================================= */

const submitDocuments =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await documentService
          .submitCandidateDocuments({
            ...requestContext(
              req
            ),

            declarationAccepted:
              req.body
                ?.declarationAccepted ===
              true,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Your documents have been submitted successfully and are now under HR verification.",

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Documents could not be submitted"
      );
    }
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getPortal,

  viewLoi,

  acceptLoi,

  declineLoi,

  getDocuments,

  saveDocumentProfile,

  uploadDocument,

  removeDocument,

  openDocument,

  submitDocuments,
};
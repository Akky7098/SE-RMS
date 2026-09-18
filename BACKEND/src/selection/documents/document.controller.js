const documentService =
  require(
    "./document.service"
  );

/* =========================================================
   ERROR
========================================================= */

const status =
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
        status(
          error
        )
      )
      .json({
        success:
          false,

        message:
          error?.message ||
          fallback,

        code:
          error?.code ||
          undefined,
      });

/* =========================================================
   INTERNAL RECORD
========================================================= */

const getRecord =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await documentService
          .getInternalDocumentRecord(
            req.params
              .selectionId
          );

      return res
        .status(
          200
        )
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
        "Document record could not be loaded"
      );
    }
  };

/* =========================================================
   INTERNAL FILE
========================================================= */

const openFile =
  async (
    req,
    res
  ) => {
    try {
      const file =
        await documentService
          .getInternalDocumentFile({
            selectionId:
              req.params
                .selectionId,

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
   HR REQUEST RESUBMISSION
========================================================= */

const requestResubmission =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await documentService
          .requestDocumentResubmission({
            selectionId:
              req.params
                .selectionId,

            body:
              req.body ||
              {},

            user:
              req.user,
          });

      return res
        .status(
          200
        )
        .json({
          success:
            true,

          message:
            "Document correction request sent to candidate",

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Document correction request could not be sent"
      );
    }
  };

/* =========================================================
   HR VERIFY
========================================================= */

const verifyDocuments =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await documentService
          .verifyCandidateDocuments({
            selectionId:
              req.params
                .selectionId,

            user:
              req.user,
          });

      return res
        .status(
          200
        )
        .json({
          success:
            true,

          message:
            "Candidate documents verified successfully",

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Documents could not be verified"
      );
    }
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getRecord,

  openFile,

  requestResubmission,

  verifyDocuments,
};
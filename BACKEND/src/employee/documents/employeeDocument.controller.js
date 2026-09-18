const fs =
  require(
    "fs"
  );

const asyncHandler =
  require(
    "../../utils/asyncHandler"
  );

const documentService =
  require(
    "./employeeDocument.service"
  );

/* =========================================================
   VAULT
========================================================= */

const getVault =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await documentService
          .getEmployeeDocumentVault(
            req.params
              .employeeId,
            {
              actorUserId:
                req.user
                  ?._id ||
                null,

              autoSync:
                true,
            }
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    }
  );

/* =========================================================
   RESOLVE UPLOADED FILE

   Supports:

   upload.single("file")
   -> req.file

   upload.any()
   -> req.files[]

   This makes the endpoint tolerant while keeping "file"
   as the preferred field name.
========================================================= */

const resolveUploadedFile =
  (
    req
  ) => {
    if (
      req.file
    ) {
      return req.file;
    }

    if (
      !Array.isArray(
        req.files
      ) ||
      req.files.length ===
        0
    ) {
      return null;
    }

    /*
     * Prefer the expected field name.
     */
    const expected =
      req.files.find(
        (
          item
        ) =>
          item?.fieldname ===
          "file"
      );

    if (
      expected
    ) {
      return expected;
    }

    /*
     * Compatibility fallback.
     * Since route allows only one file, first item is safe.
     */
    return req.files[0] ||
      null;
  };

/* =========================================================
   UPLOAD
========================================================= */

const upload =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const uploadedFile =
        resolveUploadedFile(
          req
        );

      /* ===================================================
         DEBUG

         Keep while testing.
         Once upload is stable you can remove this log.
      =================================================== */

      console.log(
        "[Employee Documents] Upload request",
        {
          employeeId:
            req.params
              .employeeId,

          contentType:
            req.headers[
              "content-type"
            ] ||
            "",

          body:
            req.body ||
            {},

          hasReqFile:
            Boolean(
              req.file
            ),

          filesCount:
            Array.isArray(
              req.files
            )
              ? req.files.length
              : 0,

          files:
            Array.isArray(
              req.files
            )
              ? req.files.map(
                  (
                    item
                  ) => ({
                    fieldname:
                      item.fieldname,

                    originalname:
                      item.originalname,

                    mimetype:
                      item.mimetype,

                    size:
                      item.size,
                  })
                )
              : [],

          resolvedFile:
            uploadedFile
              ? {
                  fieldname:
                    uploadedFile
                      .fieldname,

                  originalname:
                    uploadedFile
                      .originalname,

                  mimetype:
                    uploadedFile
                      .mimetype,

                  size:
                    uploadedFile
                      .size,
                }
              : null,
        }
      );

      if (
        !uploadedFile
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "No uploaded document was received by the server.",

            details: {
              contentType:
                req.headers[
                  "content-type"
                ] ||
                null,

              fields:
                Object.keys(
                  req.body ||
                  {}
                ),

              uploadedFields:
                Array.isArray(
                  req.files
                )
                  ? req.files.map(
                      (
                        item
                      ) =>
                        item.fieldname
                    )
                  : [],
            },
          });
      }

      const document =
        await documentService
          .uploadDocument({
            employeeId:
              req.params
                .employeeId,

            file:
              uploadedFile,

            body:
              req.body ||
              {},

            actorUserId:
              req.user
                ?._id ||
              null,
          });

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "Employee document uploaded successfully.",

          data: {
            document,
          },
        });
    }
  );

/* =========================================================
   REPLACE
========================================================= */

const replace =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const uploadedFile =
        resolveUploadedFile(
          req
        );

      if (
        !uploadedFile
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Replacement document was not received by the server.",
          });
      }

      const document =
        await documentService
          .replaceDocument({
            employeeId:
              req.params
                .employeeId,

            documentId:
              req.params
                .documentId,

            file:
              uploadedFile,

            body:
              req.body ||
              {},

            actorUserId:
              req.user
                ?._id ||
              null,
          });

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "Employee document replaced successfully.",

          data: {
            document,
          },
        });
    }
  );

/* =========================================================
   UPDATE
========================================================= */

const update =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const document =
        await documentService
          .updateDocument({
            employeeId:
              req.params
                .employeeId,

            documentId:
              req.params
                .documentId,

            payload:
              req.body ||
              {},

            actorUserId:
              req.user
                ?._id ||
              null,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Employee document updated successfully.",

          data: {
            document,
          },
        });
    }
  );

/* =========================================================
   DELETE
========================================================= */

const remove =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await documentService
          .deleteDocument({
            employeeId:
              req.params
                .employeeId,

            documentId:
              req.params
                .documentId,

            actorUserId:
              req.user
                ?._id ||
              null,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Employee document removed from the active record.",

          data,
        });
    }
  );

/* =========================================================
   OPEN DOCUMENT

   Files may live under .se-rms-data.

   Stream directly instead of res.sendFile() so Express
   dot-directory handling does not return an artificial 404.
========================================================= */

const openFile =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const file =
        await documentService
          .getDocumentFile({
            employeeId:
              req.params
                .employeeId,

            documentId:
              req.params
                .documentId,
          });

      if (
        !file?.path ||
        !fs.existsSync(
          file.path
        )
      ) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              "Employee document file is unavailable.",
          });
      }

      const safeFileName =
        String(
          file.fileName ||
          "employee-document"
        )
          .replace(
            /[\r\n"]/g,
            ""
          );

      res.setHeader(
        "Content-Type",
        file.mimeType ||
        "application/octet-stream"
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${safeFileName}"`
      );

      res.setHeader(
        "Cache-Control",
        "private, max-age=0, must-revalidate"
      );

      const stream =
        fs.createReadStream(
          file.path
        );

      stream.on(
        "error",
        (
          error
        ) => {
          console.error(
            "[Employee Documents] File stream failed:",
            {
              employeeId:
                req.params
                  .employeeId,

              documentId:
                req.params
                  .documentId,

              filePath:
                file.path,

              message:
                error?.message,
            }
          );

          if (
            !res.headersSent
          ) {
            res
              .status(404)
              .json({
                success:
                  false,

                message:
                  "Employee document file could not be opened.",
              });
          } else {
            res.destroy(
              error
            );
          }
        }
      );

      return stream.pipe(
        res
      );
    }
  );

/* =========================================================
   SYNC RECRUITMENT
========================================================= */

const syncRecruitment =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await documentService
          .syncRecruitmentDocuments({
            employeeId:
              req.params
                .employeeId,

            actorUserId:
              req.user
                ?._id ||
              null,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Recruitment documents synchronized with the Employee Document Vault.",

          data,
        });
    }
  );

/* =========================================================
   MASTER FILE
========================================================= */

const generateMasterFile =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const document =
        await documentService
          .generateMasterEmployeeFile({
            employeeId:
              req.params
                .employeeId,

            documentIds:
              req.body
                ?.documentIds ||
              [],

            includeCover:
              req.body
                ?.includeCover !==
              false,

            actorUserId:
              req.user
                ?._id ||
              null,
          });

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "Employee Master File generated successfully.",

          data: {
            document,
          },
        });
    }
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getVault,

  upload,

  replace,

  update,

  remove,

  openFile,

  syncRecruitment,

  generateMasterFile,
};
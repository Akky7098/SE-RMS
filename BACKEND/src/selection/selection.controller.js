const fs =
  require("fs");

const path =
  require("path");

const selectionService =
  require(
    "./selection.service"
  );

/* =========================================================
   PATHS
========================================================= */

const UPLOADS_ROOT =
  path.resolve(
    __dirname,
    "../../uploads"
  );

/* =========================================================
   ERROR
========================================================= */

const statusCode =
  (
    error,
    fallback =
      400
  ) =>
    error
      ?.statusCode ||
    error
      ?.status ||
    fallback;

const sendError =
  (
    res,
    error,
    fallback,
    fallbackStatus =
      400
  ) =>
    res
      .status(
        statusCode(
          error,
          fallbackStatus
        )
      )
      .json({
        success:
          false,

        message:
          error
            ?.message ||
          fallback,

        details:
          error
            ?.details ||
          undefined,
      });

/* =========================================================
   SAFE LOI FILE PATH
========================================================= */

const resolveLoiFilePath =
  (
    relativePath
  ) => {
    const value =
      String(
        relativePath ||
          ""
      ).trim();

    if (
      !value
    ) {
      return null;
    }

    const absolutePath =
      path.resolve(
        UPLOADS_ROOT,
        value
      );

    const relative =
      path.relative(
        UPLOADS_ROOT,
        absolutePath
      );

    if (
      relative.startsWith(
        ".."
      ) ||
      path.isAbsolute(
        relative
      )
    ) {
      return null;
    }

    return absolutePath;
  };

/* =========================================================
   LIST
========================================================= */

const list =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await selectionService
          .getSelections(
            req.query ||
              {}
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
        "Selections could not be loaded"
      );
    }
  };

/* =========================================================
   SUMMARY
========================================================= */

const summary =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await selectionService
          .getSelectionSummary();

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
        "Selection summary could not be loaded"
      );
    }
  };

/* =========================================================
   DETAIL
========================================================= */

const detail =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await selectionService
          .getSelectionById(
            req.params
              .selectionId
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
        "Selection record could not be loaded",
        404
      );
    }
  };

/* =========================================================
   BY CANDIDATE
========================================================= */

const byCandidate =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await selectionService
          .getSelectionByCandidate(
            req.params
              .candidateId
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
        "Selection record could not be loaded",
        404
      );
    }
  };

/* =========================================================
   CREATE FROM EVALUATION

   Mainly repair/admin endpoint.

   Normal flow creates automatically.
========================================================= */

const createFromEvaluation =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await selectionService
          .ensureSelectionFromEvaluation({
            evaluationId:
              req.params
                .evaluationId,

            userId:
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
            "Selection record is ready",

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Selection record could not be created"
      );
    }
  };

/* =========================================================
   LOI READINESS
========================================================= */

const loiReadiness =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await selectionService
          .getSelectionLoiReadiness(
            req.params
              .selectionId
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
        "LOI readiness could not be checked"
      );
    }
  };

/* =========================================================
   GENERATE / REGENERATE LOI

   The same endpoint is deliberately reused for edits.

   Current draft:
   version 1
      ↓ edit details
   POST /loi/generate again
      ↓
   version 2

   Previous version is preserved/superseded by LOI service.
========================================================= */

const generateLoi =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await selectionService
          .generateSelectionLoi({
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
        .status(201)
        .json({
          success:
            true,

          message:
            "Letter of Intent generated successfully",

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Letter of Intent could not be generated"
      );
    }
  };

/* =========================================================
   OPEN CURRENT LOI PDF

   Authenticated HR route.

   GET
   /api/v1/selections/:selectionId/loi

   Browser will display PDF inline.

   No direct /uploads URL is exposed.
========================================================= */

const openCurrentLoi =
  async (
    req,
    res
  ) => {
    try {
      const loi =
        await selectionService
          .getCurrentLoi(
            req.params
              .selectionId
          );

      if (
        !loi
      ) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              "Generated Letter of Intent was not found",
          });
      }

      const relativePath =
        loi
          ?.file
          ?.relativePath;

      const absolutePath =
        resolveLoiFilePath(
          relativePath
        );

      if (
        !absolutePath ||
        !fs.existsSync(
          absolutePath
        )
      ) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              "Generated LOI PDF is not available",
          });
      }

      const stat =
        await fs
          .promises
          .stat(
            absolutePath
          );

      if (
        !stat
          .isFile()
      ) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              "Generated LOI PDF is not available",
          });
      }

      const fileName =
        loi
          ?.file
          ?.fileName ||
        `${loi.documentNumber || "LOI"}.pdf`;

      res.setHeader(
        "Content-Type",
        loi
          ?.file
          ?.mimeType ||
          "application/pdf"
      );

      res.setHeader(
        "Content-Length",
        stat.size
      );

      /*
       * inline:
       * browser opens PDF instead of forcing download.
       */

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${String(
          fileName
        ).replace(
          /"/g,
          ""
        )}"`
      );

      res.setHeader(
        "Cache-Control",
        "private, no-store, max-age=0"
      );

      const stream =
        fs.createReadStream(
          absolutePath
        );

      stream.on(
        "error",
        (
          error
        ) => {
          console.error(
            "[Selection] LOI PDF stream failed:",
            error
              ?.message
          );

          if (
            !res.headersSent
          ) {
            res
              .status(500)
              .json({
                success:
                  false,

                message:
                  "LOI PDF could not be opened",
              });
          } else {
            res.end();
          }
        }
      );

      return stream.pipe(
        res
      );
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "LOI PDF could not be opened",
        404
      );
    }
  };

/* =========================================================
   SEND LOI

   Generate/review first.
   Sending is a separate deliberate HR action.
========================================================= */

const sendLoi =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await selectionService
          .sendSelectionLoi({
            selectionId:
              req.params
                .selectionId,

            user:
              req.user,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            data
              ?.message ||
            "Letter of Intent sent successfully",

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Letter of Intent could not be sent"
      );
    }
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  list,

  summary,

  detail,

  byCandidate,

  createFromEvaluation,

  loiReadiness,

  generateLoi,

  openCurrentLoi,

  sendLoi,
};
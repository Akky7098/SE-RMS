const fs =
  require("fs");

const path =
  require("path");

const {
  sanitizeFileName,
} =
  require(
    "./documentHelpers"
  );

/* =========================================================
   ROOT
========================================================= */

const GENERATED_ROOT =
  path.resolve(
    __dirname,
    "../../../uploads/generated-documents"
  );

/* =========================================================
   ENSURE DIRECTORY
========================================================= */

const ensureDocumentDirectory =
  async (
    documentType
  ) => {
    const type =
      String(
        documentType ||
          "document"
      )
        .trim()
        .toLowerCase();

    const directory =
      path.join(
        GENERATED_ROOT,
        type
      );

    await fs.promises
      .mkdir(
        directory,
        {
          recursive:
            true,
        }
      );

    return directory;
  };

/* =========================================================
   CREATE PATH
========================================================= */

const createGeneratedDocumentPath =
  async ({
    documentType,
    documentNumber,
    candidateName,
  }) => {
    const directory =
      await ensureDocumentDirectory(
        documentType
      );

    const safeNumber =
      sanitizeFileName(
        documentNumber
      );

    const safeCandidate =
      sanitizeFileName(
        candidateName
      );

    const fileName =
      `${safeNumber}_${safeCandidate}.pdf`;

    const absolutePath =
      path.join(
        directory,
        fileName
      );

    const relativePath =
      path
        .relative(
          path.resolve(
            __dirname,
            "../../../uploads"
          ),
          absolutePath
        )
        .replaceAll(
          "\\",
          "/"
        );

    return {
      fileName,

      absolutePath,

      relativePath,
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  GENERATED_ROOT,

  ensureDocumentDirectory,

  createGeneratedDocumentPath,
};
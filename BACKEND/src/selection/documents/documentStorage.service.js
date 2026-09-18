const fs =
  require("fs");

const path =
  require("path");

const crypto =
  require("crypto");

const multer =
  require("multer");

const ApiError =
  require(
    "../../utils/ApiError"
  );

/* =========================================================
   ROOT
========================================================= */

const ROOT =
  path.resolve(
    __dirname,
    "../../../uploads/selection-documents"
  );

const TEMP =
  path.join(
    ROOT,
    "temp"
  );

fs.mkdirSync(
  TEMP,
  {
    recursive: true,
  }
);

/* =========================================================
   MULTER
========================================================= */

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      callback
    ) => {
      callback(
        null,
        TEMP
      );
    },

    filename: (
      req,
      file,
      callback
    ) => {
      const extension =
        path
          .extname(
            file.originalname ||
              ""
          )
          .toLowerCase();

      const safeExtension =
        [
          ".pdf",
          ".jpg",
          ".jpeg",
          ".png",
        ].includes(
          extension
        )
          ? extension
          : "";

      callback(
        null,
        `${Date.now()}-${crypto
          .randomBytes(
            16
          )
          .toString(
            "hex"
          )}${safeExtension}`
      );
    },
  });

const uploadCandidateDocument =
  multer({
    storage,

    limits: {
      fileSize:
        10 *
        1024 *
        1024,
    },

    fileFilter: (
      req,
      file,
      callback
    ) => {
      if (
        ![
          "application/pdf",
          "image/jpeg",
          "image/png",
        ].includes(
          file.mimetype
        )
      ) {
        const error =
          new Error(
            "Only PDF, JPG, JPEG and PNG files are allowed."
          );

        error.statusCode =
          400;

        return callback(
          error
        );
      }

      return callback(
        null,
        true
      );
    },
  }).single(
    "file"
  );

/* =========================================================
   MOVE TO CANDIDATE FOLDER
========================================================= */

const makeDocumentPermanent =
  async ({
    tempPath,
    storedName,
    selectionId,
  }) => {
    const directory =
      path.join(
        ROOT,
        String(
          selectionId
        )
      );

    await fs.promises
      .mkdir(
        directory,
        {
          recursive: true,
        }
      );

    const targetPath =
      path.join(
        directory,
        path.basename(
          storedName
        )
      );

    await fs.promises
      .rename(
        tempPath,
        targetPath
      );

    return {
      absolutePath:
        targetPath,

      relativePath:
        path
          .relative(
            path.resolve(
              __dirname,
              "../../../uploads"
            ),
            targetPath
          )
          .replaceAll(
            "\\",
            "/"
          ),
    };
  };

/* =========================================================
   DELETE
========================================================= */

const deleteStoredDocument =
  async (
    relativePath
  ) => {
    if (
      !relativePath
    ) {
      return;
    }

    const uploadsRoot =
      path.resolve(
        __dirname,
        "../../../uploads"
      );

    const filePath =
      path.resolve(
        uploadsRoot,
        relativePath
      );

    if (
      !filePath.startsWith(
        uploadsRoot
      )
    ) {
      throw new ApiError(
        400,
        "Invalid document path"
      );
    }

    try {
      await fs.promises
        .unlink(
          filePath
        );
    } catch (
      error
    ) {
      if (
        error.code !==
        "ENOENT"
      ) {
        throw error;
      }
    }
  };

/* =========================================================
   GET PATH
========================================================= */

const getStoredDocumentPath =
  (
    relativePath
  ) => {
    const uploadsRoot =
      path.resolve(
        __dirname,
        "../../../uploads"
      );

    const filePath =
      path.resolve(
        uploadsRoot,
        relativePath
      );

    if (
      !filePath.startsWith(
        uploadsRoot
      )
    ) {
      throw new ApiError(
        400,
        "Invalid document path"
      );
    }

    return filePath;
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  uploadCandidateDocument,

  makeDocumentPermanent,

  deleteStoredDocument,

  getStoredDocumentPath,
};
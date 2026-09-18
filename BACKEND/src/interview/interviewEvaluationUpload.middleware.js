const fs =
  require("fs");

const path =
  require("path");

const crypto =
  require("crypto");

const multer =
  require("multer");

/* =========================================================
   DIRECTORIES
========================================================= */

const TEMP_DIRECTORY =
  path.resolve(
    __dirname,
    "../../uploads/interviews/evaluations/temp"
  );

fs.mkdirSync(
  TEMP_DIRECTORY,
  {
    recursive: true,
  }
);

/* =========================================================
   ALLOWED TYPES
========================================================= */

const ALLOWED_MIME_TYPES =
  new Set([
    "application/pdf",

    "image/jpeg",

    "image/png",
  ]);

/* =========================================================
   STORAGE
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
        TEMP_DIRECTORY
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

      const random =
        crypto
          .randomBytes(
            16
          )
          .toString(
            "hex"
          );

      callback(
        null,
        `${Date.now()}-${random}${safeExtension}`
      );
    },
  });

/* =========================================================
   FILE FILTER
========================================================= */

const fileFilter =
  (
    req,
    file,
    callback
  ) => {
    if (
      !ALLOWED_MIME_TYPES.has(
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
  };

/* =========================================================
   MULTER
========================================================= */

const uploadInterviewEvaluationAttachment =
  multer({
    storage,

    fileFilter,

    limits: {
      fileSize:
        10 *
        1024 *
        1024,
    },
  }).single(
    "file"
  );

module.exports = {
  uploadInterviewEvaluationAttachment,

  TEMP_DIRECTORY,
};
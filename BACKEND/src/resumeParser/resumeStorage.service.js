const fs =
  require("fs");

const path =
  require("path");

const crypto =
  require("crypto");

const multer =
  require("multer");

/* =========================================================
   CONSTANTS
========================================================= */

const MAX_RESUME_SIZE =
  10 * 1024 * 1024;

const TEMP_FILE_PATTERN =
  /^resume-\d+-[a-f0-9]+\.pdf$/i;

/* =========================================================
   PATHS
========================================================= */

const TEMP_DIR =
  path.join(
    process.cwd(),
    "uploads",
    "resumes",
    "temp"
  );

const CANDIDATE_DIR =
  path.join(
    process.cwd(),
    "uploads",
    "resumes",
    "candidates"
  );

/* =========================================================
   CREATE DIRECTORIES
========================================================= */

for (
  const directory
  of [
    TEMP_DIR,
    CANDIDATE_DIR,
  ]
) {
  if (
    !fs.existsSync(
      directory
    )
  ) {
    fs.mkdirSync(
      directory,
      {
        recursive:
          true,
      }
    );
  }
}

/* =========================================================
   SAFE ERROR
========================================================= */

const createFileError =
  (
    message,
    statusCode = 400
  ) => {
    const error =
      new Error(
        message
      );

    error.statusCode =
      statusCode;

    return error;
  };

/* =========================================================
   FILE NAME CLEANER
========================================================= */

const sanitizeOriginalName =
  (
    fileName = ""
  ) => {
    const baseName =
      path.basename(
        String(
          fileName ||
            "Candidate Resume.pdf"
        )
      );

    return baseName
      .replace(
        /[\r\n"]/g,
        ""
      )
      .slice(
        0,
        180
      );
  };

/* =========================================================
   MULTER STORAGE
========================================================= */

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      cb
    ) => {
      cb(
        null,
        TEMP_DIR
      );
    },

    filename: (
      req,
      file,
      cb
    ) => {
      const randomId =
        crypto
          .randomBytes(
            16
          )
          .toString(
            "hex"
          );

      const fileName =
        `resume-${Date.now()}-${randomId}.pdf`;

      cb(
        null,
        fileName
      );
    },
  });

/* =========================================================
   PDF VALIDATION
========================================================= */

const fileFilter =
  (
    req,
    file,
    cb
  ) => {
    const extension =
      path
        .extname(
          file.originalname ||
            ""
        )
        .toLowerCase();

    const mimeType =
      String(
        file.mimetype ||
          ""
      )
        .trim()
        .toLowerCase();

    const validExtension =
      extension ===
      ".pdf";

    /*
     * Some browsers/proxies may send application/octet-stream.
     * Extension is still checked separately.
     */

    const validMime =
      [
        "application/pdf",
        "application/x-pdf",
        "application/octet-stream",
      ].includes(
        mimeType
      );

    if (
      !validExtension ||
      !validMime
    ) {
      return cb(
        createFileError(
          "Only PDF resume files are allowed",
          400
        )
      );
    }

    return cb(
      null,
      true
    );
  };

/* =========================================================
   MULTER
========================================================= */

const uploadResume =
  multer({
    storage,

    fileFilter,

    limits: {
      fileSize:
        MAX_RESUME_SIZE,

      files:
        1,
    },
  }).single(
    "resume"
  );

/* =========================================================
   SAFE TEMP FILE PATH
========================================================= */

const getSafeTempPath =
  (
    tempFileName
  ) => {
    if (
      !tempFileName
    ) {
      throw createFileError(
        "Temporary resume file name is required",
        400
      );
    }

    const original =
      String(
        tempFileName
      ).trim();

    const safeFileName =
      path.basename(
        original
      );

    if (
      safeFileName !==
      original
    ) {
      throw createFileError(
        "Invalid temporary resume file name",
        400
      );
    }

    if (
      !TEMP_FILE_PATTERN.test(
        safeFileName
      )
    ) {
      throw createFileError(
        "Invalid temporary resume file",
        400
      );
    }

    return path.join(
      TEMP_DIR,
      safeFileName
    );
  };

/* =========================================================
   SAFE PERMANENT FILE PATH
========================================================= */

const getSafeCandidatePath =
  (
    fileName
  ) => {
    if (
      !fileName
    ) {
      return null;
    }

    const original =
      String(
        fileName
      ).trim();

    const safeFileName =
      path.basename(
        original
      );

    if (
      original !==
      safeFileName ||
      !safeFileName
        .toLowerCase()
        .endsWith(
          ".pdf"
        )
    ) {
      return null;
    }

    return path.join(
      CANDIDATE_DIR,
      safeFileName
    );
  };

/* =========================================================
   TEMP RESUME DETAILS
========================================================= */

const getTemporaryResumeData =
  (
    file
  ) => {
    if (
      !file
    ) {
      return null;
    }

    return {
      tempFileName:
        file.filename,

      originalName:
        sanitizeOriginalName(
          file.originalname
        ),

      mimeType:
        "application/pdf",

      size:
        Number(
          file.size
        ) || 0,
    };
  };

/* =========================================================
   MOVE FILE

   rename() is fastest.

   EXDEV fallback handles environments where temporary and
   permanent directories are mounted on different devices.
========================================================= */

const moveFile =
  async (
    sourcePath,
    destinationPath
  ) => {
    try {
      await fs.promises.rename(
        sourcePath,
        destinationPath
      );
    } catch (
      error
    ) {
      if (
        error?.code !==
        "EXDEV"
      ) {
        throw error;
      }

      await fs.promises.copyFile(
        sourcePath,
        destinationPath
      );

      await fs.promises.unlink(
        sourcePath
      );
    }
  };

/* =========================================================
   MAKE RESUME PERMANENT
========================================================= */

const makeResumePermanent =
  async ({
    tempFileName,
    candidateId,
    originalName,
    size,
    parserConfidence = null,
    rawParsedData = null,
  }) => {
    if (
      !candidateId
    ) {
      throw createFileError(
        "Candidate ID is required",
        400
      );
    }

    const sourcePath =
      getSafeTempPath(
        tempFileName
      );

    try {
      await fs.promises.access(
        sourcePath,
        fs.constants.R_OK
      );
    } catch (
      error
    ) {
      throw createFileError(
        "Temporary resume not found. Please upload the resume again.",
        404
      );
    }

    const permanentFileName =
      `${String(
        candidateId
      )}-${Date.now()}-${crypto
        .randomBytes(
          6
        )
        .toString(
          "hex"
        )}.pdf`;

    const destinationPath =
      path.join(
        CANDIDATE_DIR,
        permanentFileName
      );

    await moveFile(
      sourcePath,
      destinationPath
    );

    const stats =
      await fs.promises.stat(
        destinationPath
      );

    return {
      originalName:
        sanitizeOriginalName(
          originalName
        ),

      fileName:
        permanentFileName,

      fileUrl:
        `/api/v1/resume-parser/candidate-resume/${candidateId}`,

      mimeType:
        "application/pdf",

      size:
        Number(
          size
        ) ||
        Number(
          stats.size
        ) ||
        0,

      parsed:
        true,

      parsedAt:
        new Date(),

      parserProvider:
        "LOCAL_PDF_PARSER",

      parserConfidence:
        Number.isFinite(
          Number(
            parserConfidence
          )
        )
          ? Number(
              parserConfidence
            )
          : null,

      rawParsedData:
        rawParsedData &&
        typeof rawParsedData ===
          "object"
          ? rawParsedData
          : undefined,
    };
  };

/* =========================================================
   GET PERMANENT RESUME PATH
========================================================= */

const findCandidateResume =
  async (
    candidateId,
    fileName
  ) => {
    const filePath =
      getSafeCandidatePath(
        fileName
      );

    if (
      !filePath
    ) {
      return null;
    }

    /*
     * Permanent file names begin with candidate ID.
     * Prevent fetching another candidate's PDF.
     */

    if (
      !path
        .basename(
          filePath
        )
        .startsWith(
          `${String(
            candidateId
          )}-`
        )
    ) {
      return null;
    }

    try {
      await fs.promises.access(
        filePath,
        fs.constants.R_OK
      );

      return filePath;
    } catch (
      error
    ) {
      return null;
    }
  };

/* =========================================================
   DELETE TEMP FILE
========================================================= */

const deleteTemporaryResume =
  async (
    tempFileName
  ) => {
    try {
      const filePath =
        getSafeTempPath(
          tempFileName
        );

      await fs.promises.unlink(
        filePath
      );
    } catch (
      error
    ) {
      if (
        error?.code !==
        "ENOENT"
      ) {
        console.error(
          "Temporary resume deletion error:",
          error.message
        );
      }
    }
  };

/* =========================================================
   DELETE PERMANENT FILE

   Useful for rollback if candidate save later fails.
========================================================= */

const deleteCandidateResume =
  async (
    fileName
  ) => {
    try {
      const filePath =
        getSafeCandidatePath(
          fileName
        );

      if (
        !filePath
      ) {
        return;
      }

      await fs.promises.unlink(
        filePath
      );
    } catch (
      error
    ) {
      if (
        error?.code !==
        "ENOENT"
      ) {
        console.error(
          "Candidate resume deletion error:",
          error.message
        );
      }
    }
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  uploadResume,

  getTemporaryResumeData,

  makeResumePermanent,

  findCandidateResume,

  deleteTemporaryResume,

  deleteCandidateResume,

  TEMP_DIR,

  CANDIDATE_DIR,

  MAX_RESUME_SIZE,
};
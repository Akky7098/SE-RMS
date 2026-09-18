const fs =
  require("fs");

const path =
  require("path");

const crypto =
  require("crypto");

const ApiError =
  require(
    "../utils/ApiError"
  );

/* =========================================================
   ROOT
========================================================= */

const ROOT_DIRECTORY =
  path.resolve(
    __dirname,
    "../../uploads/interviews/evaluations"
  );

const TEMP_DIRECTORY =
  path.join(
    ROOT_DIRECTORY,
    "temp"
  );

const PERMANENT_DIRECTORY =
  path.join(
    ROOT_DIRECTORY,
    "permanent"
  );

fs.mkdirSync(
  TEMP_DIRECTORY,
  {
    recursive: true,
  }
);

fs.mkdirSync(
  PERMANENT_DIRECTORY,
  {
    recursive: true,
  }
);

/* =========================================================
   SAFE NAME
========================================================= */

const getSafeStoredName =
  (
    value
  ) => {
    const name =
      path.basename(
        String(
          value ||
            ""
        )
      );

    if (
      !name ||
      name.includes(
        ".."
      )
    ) {
      throw new ApiError(
        400,
        "Invalid evaluation attachment"
      );
    }

    return name;
  };

/* =========================================================
   FILE SIZE LABEL
========================================================= */

const getFileSizeLabel =
  (
    size
  ) => {
    const bytes =
      Number(
        size ||
          0
      );

    if (
      bytes <
      1024
    ) {
      return `${bytes} B`;
    }

    if (
      bytes <
      1024 *
        1024
    ) {
      return `${(
        bytes /
        1024
      ).toFixed(
        1
      )} KB`;
    }

    return `${(
      bytes /
      (
        1024 *
        1024
      )
    ).toFixed(
      1
    )} MB`;
  };

/* =========================================================
   TEMP METADATA
========================================================= */

const buildTemporaryAttachment =
  ({
    file,
    interviewId,
  }) => {
    if (
      !file
    ) {
      throw new ApiError(
        400,
        "Evaluation document is required"
      );
    }

    return {
      attachmentToken:
        crypto
          .randomBytes(
            24
          )
          .toString(
            "hex"
          ),

      interviewId:
        String(
          interviewId
        ),

      originalName:
        file.originalname,

      storedName:
        file.filename,

      mimeType:
        file.mimetype,

      size:
        file.size,

      sizeLabel:
        getFileSizeLabel(
          file.size
        ),
    };
  };

/* =========================================================
   GET TEMP PATH
========================================================= */

const getTemporaryFilePath =
  (
    storedName
  ) => {
    const safeName =
      getSafeStoredName(
        storedName
      );

    return path.join(
      TEMP_DIRECTORY,
      safeName
    );
  };

/* =========================================================
   DELETE TEMP
========================================================= */

const removeTemporaryAttachment =
  async (
    storedName
  ) => {
    const filePath =
      getTemporaryFilePath(
        storedName
      );

    try {
      await fs.promises
        .unlink(
          filePath
        );

      return true;
    } catch (
      error
    ) {
      if (
        error.code ===
        "ENOENT"
      ) {
        return false;
      }

      throw error;
    }
  };

/* =========================================================
   MOVE TO PERMANENT
========================================================= */

const makeAttachmentPermanent =
  async ({
    storedName,
    originalName,
    mimeType,
    size,
    interviewId,
    userId,
  }) => {
    const safeName =
      getSafeStoredName(
        storedName
      );

    const sourcePath =
      path.join(
        TEMP_DIRECTORY,
        safeName
      );

    try {
      await fs.promises
        .access(
          sourcePath
        );
    } catch {
      throw new ApiError(
        400,
        "Uploaded evaluation document is no longer available. Please upload it again."
      );
    }

    const interviewDirectory =
      path.join(
        PERMANENT_DIRECTORY,
        String(
          interviewId
        )
      );

    await fs.promises
      .mkdir(
        interviewDirectory,
        {
          recursive: true,
        }
      );

    const targetPath =
      path.join(
        interviewDirectory,
        safeName
      );

    await fs.promises
      .rename(
        sourcePath,
        targetPath
      );

    return {
      originalName:
        String(
          originalName ||
            safeName
        ),

      storedName:
        safeName,

      mimeType:
        String(
          mimeType ||
            "application/octet-stream"
        ),

      size:
        Number(
          size ||
            0
        ),

      relativePath:
        path
          .join(
            "interviews",
            "evaluations",
            "permanent",
            String(
              interviewId
            ),
            safeName
          )
          .replaceAll(
            "\\",
            "/"
          ),

      uploadedAt:
        new Date(),

      uploadedBy:
        userId,
    };
  };

/* =========================================================
   PERMANENT PATH
========================================================= */

const getPermanentAttachmentPath =
  (
    interviewId,
    storedName
  ) => {
    const safeName =
      getSafeStoredName(
        storedName
      );

    return path.join(
      PERMANENT_DIRECTORY,
      String(
        interviewId
      ),
      safeName
    );
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  TEMP_DIRECTORY,

  PERMANENT_DIRECTORY,

  buildTemporaryAttachment,

  getTemporaryFilePath,

  removeTemporaryAttachment,

  makeAttachmentPermanent,

  getPermanentAttachmentPath,
};
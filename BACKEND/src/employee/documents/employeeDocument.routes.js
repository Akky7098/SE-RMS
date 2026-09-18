const express =
  require(
    "express"
  );

const multer =
  require(
    "multer"
  );

const {
  authenticate,
} =
  require(
    "../../middleware/auth.middleware"
  );

const {
  requirePermission,
} =
  require(
    "../../middleware/permission.middleware"
  );

const controller =
  require(
    "./employeeDocument.controller"
  );

const router =
  express.Router();

/* =========================================================
   MULTER
========================================================= */

const upload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        15 *
        1024 *
        1024,

      /*
       * We expect one file.
       *
       * upload.any() is used only so we can inspect the
       * actual field arriving from the frontend.
       */
      files:
        1,

      fields:
        20,

      parts:
        25,
    },

    fileFilter:
      (
        req,
        file,
        callback
      ) => {
        const allowed = [
          "application/pdf",
          "image/jpeg",
          "image/png",
        ];

        if (
          !allowed.includes(
            file.mimetype
          )
        ) {
          return callback(
            new Error(
              "Only PDF, JPG and PNG documents are allowed."
            )
          );
        }

        return callback(
          null,
          true
        );
      },
  });

/* =========================================================
   MULTIPART MIDDLEWARE

   Using any() temporarily makes the endpoint tolerant of
   frontend multipart field-name differences.

   Controller still prefers fieldname === "file".
========================================================= */

const employeeDocumentUpload =
  upload.any();

/* =========================================================
   AUTH
========================================================= */

router.use(
  authenticate
);

/* =========================================================
   SYNC RECRUITMENT

   Must stay before /:employeeId broad routes.
========================================================= */

router.post(
  "/:employeeId/sync-recruitment",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  controller
    .syncRecruitment
);

/* =========================================================
   MASTER FILE
========================================================= */

router.post(
  "/:employeeId/merge",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  controller
    .generateMasterFile
);

/* =========================================================
   OPEN FILE — PRIMARY
========================================================= */

router.get(
  "/:employeeId/file/:documentId",

  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),

  controller
    .openFile
);

/* =========================================================
   OPEN FILE — COMPATIBILITY
========================================================= */

router.get(
  "/:employeeId/:documentId/file",

  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),

  controller
    .openFile
);

/* =========================================================
   UPLOAD — PRIMARY

   Frontend:

   POST
   /api/v1/employee-documents/:employeeId

   Multipart should contain:

   file
   category
   documentType
   label
   description
========================================================= */

router.post(
  "/:employeeId",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  employeeDocumentUpload,

  controller
    .upload
);

/* =========================================================
   UPLOAD — COMPATIBILITY
========================================================= */

router.post(
  "/:employeeId/upload",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  employeeDocumentUpload,

  controller
    .upload
);

/* =========================================================
   REPLACE

   Use the same tolerant multipart parser.

   This prevents the same req.file / req.files issue when
   document replacement is introduced in the UI.
========================================================= */

router.post(
  "/:employeeId/:documentId/replace",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  employeeDocumentUpload,

  controller
    .replace
);

/* =========================================================
   UPDATE METADATA
========================================================= */

router.patch(
  "/:employeeId/:documentId",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  controller
    .update
);

/* =========================================================
   DELETE
========================================================= */

router.delete(
  "/:employeeId/:documentId",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  controller
    .remove
);

/* =========================================================
   VAULT

   Keep broad GET route after all specific routes.
========================================================= */

router.get(
  "/:employeeId",

  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),

  controller
    .getVault
);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;
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
    "./employeeAsset.controller"
  );

const router =
  express.Router();

/* =========================================================
   SIGNED FILE UPLOAD

   PDF/JPG/PNG same as Employee Document Vault.
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

      files:
        1,
    },

    fileFilter: (
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
            "Only PDF, JPG and PNG files are allowed."
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
   AUTH
========================================================= */

router.use(
  authenticate
);

/* =========================================================
   META

   IMPORTANT:
   Must remain before /:employeeId
========================================================= */

router.get(
  "/meta",

  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),

  controller
    .meta
);

/* =========================================================
   LIST
========================================================= */

router.get(
  "/:employeeId",

  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),

  controller
    .list
);

/* =========================================================
   CREATE
========================================================= */

router.post(
  "/:employeeId",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  controller
    .create
);

/* =========================================================
   NO ASSET REQUIRED

   Must stay before /:employeeId/:assetId
========================================================= */

router.post(
  "/:employeeId/no-asset-required",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  controller
    .noAssetRequired
);

/* =========================================================
   DETAIL
========================================================= */

router.get(
  "/:employeeId/:assetId",

  requirePermission(
    "EMPLOYEE",
    "VIEW"
  ),

  controller
    .detail
);

/* =========================================================
   UPDATE
========================================================= */

router.patch(
  "/:employeeId/:assetId",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  controller
    .update
);

/* =========================================================
   GENERATE HANDOVER FORM
========================================================= */

router.post(
  "/:employeeId/:assetId/generate-handover",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  controller
    .generateHandover
);

/* =========================================================
   UPLOAD SIGNED ACKNOWLEDGEMENT
========================================================= */

router.post(
  "/:employeeId/:assetId/signed-acknowledgement",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  upload.single(
    "file"
  ),

  controller
    .uploadSignedAcknowledgement
);

/* =========================================================
   CANCEL
========================================================= */

router.patch(
  "/:employeeId/:assetId/cancel",

  requirePermission(
    "EMPLOYEE",
    "UPDATE"
  ),

  controller
    .cancel
);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;
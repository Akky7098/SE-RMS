const express =
  require(
    "express"
  );

const router =
  express.Router();

const documentController =
  require(
    "./document.controller"
  );

const {
  authenticate,
} =
  require(
    "../../middleware/auth.middleware"
  );

router.use(
  authenticate
);

/* =========================================================
   HR RECORD
========================================================= */

router.get(
  "/selection/:selectionId",
  documentController
    .getRecord
);

/* =========================================================
   HR OPEN FILE
========================================================= */

router.get(
  "/selection/:selectionId/file/:documentId",
  documentController
    .openFile
);

/* =========================================================
   HR REQUEST CORRECTION
========================================================= */

router.post(
  "/selection/:selectionId/query",
  documentController
    .requestResubmission
);

/* =========================================================
   HR VERIFY DOCUMENTS
========================================================= */

router.post(
  "/selection/:selectionId/verify",
  documentController
    .verifyDocuments
);

module.exports =
  router;
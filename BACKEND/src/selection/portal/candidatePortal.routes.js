const express =
  require("express");

const router =
  express.Router();

const candidatePortalController =
  require(
    "./candidatePortal.controller"
  );

const {
  uploadCandidateDocument,
} =
  require(
    "../documents/documentStorage.service"
  );

/* =========================================================
   PUBLIC CANDIDATE PORTAL

   NO employee authenticate middleware.

   Authentication = secure random candidate token.
========================================================= */

/* =========================================================
   PORTAL
========================================================= */

router.get(
  "/:token",

  candidatePortalController
    .getPortal
);

/* =========================================================
   LOI
========================================================= */

router.get(
  "/:token/loi",

  candidatePortalController
    .viewLoi
);

router.post(
  "/:token/loi/accept",

  candidatePortalController
    .acceptLoi
);

router.post(
  "/:token/loi/decline",

  candidatePortalController
    .declineLoi
);

/* =========================================================
   PRE-JOINING DOCUMENT FORM
========================================================= */

router.get(
  "/:token/documents",

  candidatePortalController
    .getDocuments
);

/* =========================================================
   SAVE PERSONAL / EMPLOYMENT / BANK DETAILS
========================================================= */

router.patch(
  "/:token/documents",

  candidatePortalController
    .saveDocumentProfile
);

/* =========================================================
   UPLOAD

   documentType examples:

   AADHAAR
   PAN
   BANK_PROOF
   EXPERIENCE_LETTER
   RELIEVING_LETTER
   PHOTO
   SIGNATURE
   HIGHEST_QUALIFICATION
========================================================= */

router.post(
  "/:token/documents/upload/:documentType",

  uploadCandidateDocument,

  candidatePortalController
    .uploadDocument
);

/* =========================================================
   OPEN
========================================================= */

router.get(
  "/:token/documents/file/:documentId",

  candidatePortalController
    .openDocument
);

/* =========================================================
   REMOVE
========================================================= */

router.delete(
  "/:token/documents/:documentId",

  candidatePortalController
    .removeDocument
);

/* =========================================================
   FINAL SUBMISSION

   {
     declarationAccepted: true
   }
========================================================= */

router.post(
  "/:token/documents/submit",

  candidatePortalController
    .submitDocuments
);

module.exports =
  router;
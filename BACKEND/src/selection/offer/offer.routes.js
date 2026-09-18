const express =
  require("express");

const router =
  express.Router();

const offerController =
  require(
    "./offer.controller"
  );

const {
  authenticate,
} = require(
  "../../middleware/auth.middleware"
);

/* =========================================================
   ALL OFFER MANAGEMENT ROUTES ARE INTERNAL

   Candidate never gets access to these routes.

   Candidate Offer access will later go only through:
   /api/public/candidate/:token/...
========================================================= */

router.use(
  authenticate
);

/* =========================================================
   READINESS

   GET
   /api/v1/offers/selection/:selectionId/readiness
========================================================= */

router.get(
  "/selection/:selectionId/readiness",
  offerController.getReadiness
);

/* =========================================================
   HISTORY

   Keep BEFORE /:selectionId style generic routes.
========================================================= */

router.get(
  "/selection/:selectionId/history",
  offerController.getHistory
);

/* =========================================================
   GENERATE / REGENERATE
========================================================= */

router.post(
  "/selection/:selectionId/generate",
  offerController.generate
);

/* =========================================================
   OPEN CURRENT PDF
========================================================= */

router.get(
  "/selection/:selectionId/pdf",
  offerController.openPdf
);

/* =========================================================
   HR REVIEW
========================================================= */

router.post(
  "/selection/:selectionId/review",
  offerController.markReviewed
);

/* =========================================================
   SEND
========================================================= */

router.post(
  "/selection/:selectionId/send",
  offerController.send
);

/* =========================================================
   CURRENT OFFER
========================================================= */

router.get(
  "/selection/:selectionId",
  offerController.getOffer
);

module.exports =
  router;
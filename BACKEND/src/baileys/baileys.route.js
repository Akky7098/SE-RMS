const express =
  require(
    "express"
  );

const {
  getStatus,
  showQrPage,
  logout,
} =
  require(
    "./baileys.controller"
  );

const {
  authenticate,
} =
  require(
    "../middleware/auth.middleware"
  );

const router =
  express.Router();

/* =========================================================
   TEMPORARY WHATSAPP QR SETUP

   QR is temporarily public only for the initial production
   WhatsApp connection.

   IMPORTANT:
   After WhatsApp is connected successfully, protect this
   endpoint with authenticate again.
========================================================= */

router.get(
  "/qr",
  showQrPage
);

/* =========================================================
   AUTHENTICATED WHATSAPP MANAGEMENT
========================================================= */

router.use(
  authenticate
);

router.get(
  "/status",
  getStatus
);

router.post(
  "/logout",
  logout
);

module.exports =
  router;
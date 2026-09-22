const express =
  require("express");

const {
  getStatus,
  showQrPage,
  logout,
} =
  require("./baileys.controller");

const {
  authenticate,
} =
  require("../middleware/auth.middleware");

const router =
  express.Router();

/*
 * All WhatsApp management endpoints
 * require an authenticated SE-RMS user.
 *
 * We can add your exact SUPER_ADMIN permission
 * middleware once we use the existing access
 * middleware from this project.
 */

router.use(
  authenticate
);

router.get(
  "/status",
  getStatus
);

router.get(
  "/qr",
  showQrPage
);

router.post(
  "/logout",
  logout
);

module.exports =
  router;
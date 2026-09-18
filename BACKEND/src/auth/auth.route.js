const express = require("express");

const {
  signup,
  login,
  googleLogin,
  refreshToken,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
} = require("./auth.controller");

const {
  authenticate,
} = require("../middleware/auth.middleware");

const {
  authLimiter,
  loginLimiter,
  forgotPasswordLimiter,
} = require("../middleware/rateLimit.middleware");

const router = express.Router();

router.use(authLimiter);

/*
 * Local authentication
 */
router.post(
  "/signup",
  signup
);

router.post(
  "/login",
  loginLimiter,
  login
);

/*
 * Google Workspace login
 */
router.post(
  "/google",
  loginLimiter,
  googleLogin
);

/*
 * JWT refresh
 */
router.post(
  "/refresh",
  refreshToken
);

/*
 * Logout
 */
router.post(
  "/logout",
  logout
);

router.post(
  "/logout-all",
  authenticate,
  logoutAll
);

/*
 * Password recovery
 */
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  forgotPassword
);

router.post(
  "/reset-password",
  resetPassword
);

module.exports = router;
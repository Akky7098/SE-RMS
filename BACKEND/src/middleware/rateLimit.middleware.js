const rateLimit =
  require("express-rate-limit");

const authLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 100,

    standardHeaders: "draft-8",

    legacyHeaders: false,

    message: {
      success: false,

      message:
        "Too many requests. Please try again later.",
    },
  });

const loginLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 10,

    standardHeaders: "draft-8",

    legacyHeaders: false,

    message: {
      success: false,

      message:
        "Too many login attempts. Please try again later.",
    },
  });

const forgotPasswordLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 5,

    standardHeaders: "draft-8",

    legacyHeaders: false,

    message: {
      success: false,

      message:
        "Too many password reset attempts. Please try again later.",
    },
  });

module.exports = {
  authLimiter,
  loginLimiter,
  forgotPasswordLimiter,
};
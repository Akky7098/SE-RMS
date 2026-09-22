const asyncHandler =
  require(
    "../utils/asyncHandler"
  );

const env =
  require(
    "../config/env"
  );

const {
  setRefreshCookie,
  clearRefreshCookie,
} =
  require(
    "../utils/cookies"
  );

const authService =
  require(
    "./auth.service"
  );

/* =========================================================
   SIGNUP
========================================================= */

const signup =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const result =
        await authService.signup({
          displayName:
            req.body
              ?.displayName,

          email:
            req.body
              ?.email,

          password:
            req.body
              ?.password,

          req,
        });

      setRefreshCookie(
        res,
        result.refreshToken
      );

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "Account created successfully",

          data: {
            user:
              result.user,

            accessToken:
              result.accessToken,
          },
        });
    }
  );

/* =========================================================
   LOCAL LOGIN
========================================================= */

const login =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const result =
        await authService.login({
          email:
            req.body
              ?.email,

          password:
            req.body
              ?.password,

          req,
        });

      setRefreshCookie(
        res,
        result.refreshToken
      );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Login successful",

          data: {
            user:
              result.user,

            accessToken:
              result.accessToken,
          },
        });
    }
  );

/* =========================================================
   GOOGLE LOGIN
========================================================= */

const googleLogin =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const result =
        await authService
          .googleLogin({
            credential:
              req.body
                ?.credential,

            req,
          });

      setRefreshCookie(
        res,
        result.refreshToken
      );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Google login successful",

          data: {
            user:
              result.user,

            accessToken:
              result.accessToken,
          },
        });
    }
  );

/* =========================================================
   REFRESH TOKEN
========================================================= */

const refreshToken =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const token =
        req.cookies
          ?.[
            env.cookieName
          ];

      const result =
        await authService
          .refreshAccessToken({
            refreshToken:
              token,

            req,
          });

      setRefreshCookie(
        res,
        result.refreshToken
      );

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            user:
              result.user,

            accessToken:
              result.accessToken,
          },
        });
    }
  );

/* =========================================================
   LOGOUT CURRENT SESSION
========================================================= */

const logout =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const token =
        req.cookies
          ?.[
            env.cookieName
          ];

      await authService
        .logout(
          token
        );

      clearRefreshCookie(
        res
      );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Logged out successfully",
        });
    }
  );

/* =========================================================
   LOGOUT ALL SESSIONS
========================================================= */

const logoutAll =
  asyncHandler(
    async (
      req,
      res
    ) => {
      await authService
        .logoutAll(
          req.user._id
        );

      clearRefreshCookie(
        res
      );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Logged out from all devices",
        });
    }
  );

/* =========================================================
   FORGOT PASSWORD
   STEP 1

   Registered email
          ↓
   Service resolves user/mobile
          ↓
   Generates 6-digit OTP
          ↓
   Sends OTP through WhatsApp
========================================================= */

const forgotPassword =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const email =
        req.body
          ?.email;

      await authService
        .forgotPassword({
          email,

          req,
        });

      /*
       * SECURITY:
       *
       * Do not expose whether:
       * - email exists
       * - employee exists
       * - WhatsApp number exists
       *
       * This prevents account enumeration.
       */

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "If this account is registered and has a WhatsApp number, a verification code has been sent.",
        });
    }
  );

/* =========================================================
   VERIFY RESET OTP
   STEP 2

   Expected body:

   {
     "email": "user@example.com",
     "otp": "123456"
   }
========================================================= */

const verifyResetOtp =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const email =
        req.body
          ?.email;

      const otp =
        req.body
          ?.otp;

      const result =
        await authService
          .verifyPasswordResetOtp({
            email,
            otp,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            result
              ?.message ||
            "OTP verified successfully.",

          data: {
            verified:
              result
                ?.verified ===
              true,
          },
        });
    }
  );

/* =========================================================
   RESET PASSWORD
   STEP 3

   Expected body:

   {
     "email": "user@example.com",
     "otp": "123456",
     "newPassword": "..."
   }

   Service must:
   - verify OTP again / verified state
   - validate password
   - hash password
   - mark OTP used
   - revoke all sessions
========================================================= */

const resetPassword =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const email =
        req.body
          ?.email;

      const otp =
        req.body
          ?.otp;

      const newPassword =
        req.body
          ?.newPassword;

      await authService
        .resetPassword({
          email,
          otp,
          newPassword,
        });

      /*
       * Remove current browser refresh
       * token after password reset.
       */
      clearRefreshCookie(
        res
      );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Password updated successfully. Please sign in with your new password.",
        });
    }
  );

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  signup,

  login,

  googleLogin,

  refreshToken,

  logout,

  logoutAll,

  forgotPassword,

  verifyResetOtp,

  resetPassword,
};
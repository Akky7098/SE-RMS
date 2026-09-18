const asyncHandler = require("../utils/asyncHandler");
const env = require("../config/env");

const {
  setRefreshCookie,
  clearRefreshCookie,
} = require("../utils/cookies");

const authService = require("./auth.service");

const signup = asyncHandler(
  async (req, res) => {
    const result =
      await authService.signup({
        displayName:
          req.body.displayName,

        email:
          req.body.email,

        password:
          req.body.password,

        req,
      });

    setRefreshCookie(
      res,
      result.refreshToken
    );

    res.status(201).json({
      success: true,

      message:
        "Account created successfully",

      data: {
        user: result.user,
        accessToken:
          result.accessToken,
      },
    });
  }
);

const login = asyncHandler(
  async (req, res) => {
    const result =
      await authService.login({
        email:
          req.body.email,

        password:
          req.body.password,

        req,
      });

    setRefreshCookie(
      res,
      result.refreshToken
    );

    res.status(200).json({
      success: true,

      message:
        "Login successful",

      data: {
        user: result.user,
        accessToken:
          result.accessToken,
      },
    });
  }
);

const googleLogin = asyncHandler(
  async (req, res) => {
    const result =
      await authService.googleLogin({
        credential:
          req.body.credential,

        req,
      });

    setRefreshCookie(
      res,
      result.refreshToken
    );

    res.status(200).json({
      success: true,

      message:
        "Google login successful",

      data: {
        user: result.user,
        accessToken:
          result.accessToken,
      },
    });
  }
);

const refreshToken = asyncHandler(
  async (req, res) => {
    const token =
      req.cookies[
        env.cookieName
      ];

    const result =
      await authService.refreshAccessToken({
        refreshToken: token,
        req,
      });

    setRefreshCookie(
      res,
      result.refreshToken
    );

    res.status(200).json({
      success: true,

      data: {
        user: result.user,
        accessToken:
          result.accessToken,
      },
    });
  }
);

const logout = asyncHandler(
  async (req, res) => {
    const token =
      req.cookies[
        env.cookieName
      ];

    await authService.logout(
      token
    );

    clearRefreshCookie(res);

    res.status(200).json({
      success: true,
      message:
        "Logged out successfully",
    });
  }
);

const logoutAll = asyncHandler(
  async (req, res) => {
    await authService.logoutAll(
      req.user._id
    );

    clearRefreshCookie(res);

    res.status(200).json({
      success: true,
      message:
        "Logged out from all devices",
    });
  }
);

const forgotPassword = asyncHandler(
  async (req, res) => {
    await authService.forgotPassword({
      email: req.body.email,
    });

    /*
     * Same response whether
     * email exists or not.
     */
    res.status(200).json({
      success: true,

      message:
        "If this email is registered, a password reset link has been sent.",
    });
  }
);

const resetPassword = asyncHandler(
  async (req, res) => {
    await authService.resetPassword({
      email:
        req.body.email,

      token:
        req.body.token,

      newPassword:
        req.body.newPassword,
    });

    clearRefreshCookie(res);

    res.status(200).json({
      success: true,

      message:
        "Password reset successfully. Please login again.",
    });
  }
);

module.exports = {
  signup,
  login,
  googleLogin,
  refreshToken,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
};
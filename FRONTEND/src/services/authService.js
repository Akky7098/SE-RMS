import api from "./api";

/* =========================================================
   LOGIN
========================================================= */

export const loginUser =
  ({
    email,
    password,
  }) => {
    return api.post(
      "/auth/login",
      {
        email,
        password,
      }
    );
  };

/* =========================================================
   GOOGLE LOGIN
========================================================= */

export const loginWithGoogle =
  (
    credential
  ) => {
    return api.post(
      "/auth/google",
      {
        credential,
      }
    );
  };

/* =========================================================
   CURRENT USER
========================================================= */

export const getCurrentUser =
  () => {
    return api.get(
      "/users/me"
    );
  };

/* =========================================================
   LOGOUT
========================================================= */

export const logoutUser =
  () => {
    return api.post(
      "/auth/logout"
    );
  };

/* =========================================================
   FORGOT PASSWORD - REQUEST WHATSAPP OTP
========================================================= */

export const requestPasswordResetOtp =
  (
    email
  ) => {
    return api.post(
      "/auth/forgot-password",
      {
        email:
          String(
            email ||
              ""
          )
            .trim()
            .toLowerCase(),
      }
    );
  };

/* =========================================================
   VERIFY WHATSAPP OTP
========================================================= */

export const verifyPasswordResetOtp =
  ({
    email,
    otp,
  }) => {
    const normalizedEmail =
      String(
        email || ""
      )
        .trim()
        .toLowerCase();

    const normalizedOtp =
      String(
        otp || ""
      )
        .replace(
          /\D/g,
          ""
        )
        .slice(
          0,
          6
        );

    return api.post(
      "/auth/verify-reset-otp",
      {
        email:
          normalizedEmail,

        otp:
          normalizedOtp,
      }
    );
  };

/* =========================================================
   RESET PASSWORD
========================================================= */

export const resetPasswordWithOtp =
  ({
    email,
    otp,
    newPassword,
  }) => {
    return api.post(
      "/auth/reset-password",
      {
        email:
          String(
            email ||
              ""
          )
            .trim()
            .toLowerCase(),

        otp:
          String(
            otp ||
              ""
          ).trim(),

        newPassword,
      }
    );
  };

  
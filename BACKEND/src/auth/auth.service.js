const mongoose =
  require("mongoose");

const crypto =
  require("crypto");

const {
  OAuth2Client,
} =
  require(
    "google-auth-library"
  );

const {
  User,
} =
  require(
    "../user/user.model"
  );

const Session =
  require(
    "./session.model"
  );

const PasswordResetOtp =
  require(
    "./passwordResetOtp.model"
  );

const ApiError =
  require(
    "../utils/ApiError"
  );

const {
  hashPassword,
  comparePassword,
  validatePassword,
} =
  require(
    "../utils/password"
  );

const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} =
  require(
    "../utils/jwt"
  );

const {
  hashToken,
} =
  require(
    "../utils/token"
  );

const {
  sendTextToPhone,
} =
  require(
    "../baileys/baileysClient"
  );

const env =
  require(
    "../config/env"
  );

const googleClient =
  new OAuth2Client(
    env.googleClientId ||
    undefined
  );

/* =========================================================
   CONSTANTS
========================================================= */

const OTP_EXPIRY_MINUTES =
  15;

const OTP_MAX_ATTEMPTS =
  5;

const OTP_RESEND_SECONDS =
  60;

/* =========================================================
   HELPERS
========================================================= */

const normalizeEmail =
  (
    email
  ) => {
    return String(
      email ||
      ""
    )
      .trim()
      .toLowerCase();
  };

const isAllowedEmailDomain =
  (
    email
  ) => {
    const normalizedEmail =
      normalizeEmail(
        email
      );

    return normalizedEmail.endsWith(
      `@${env.allowedEmailDomain}`
    );
  };

const getSessionExpiry =
  () => {
    const expiresAt =
      new Date();

    expiresAt.setDate(
      expiresAt.getDate() +
      env.refreshTokenDays
    );

    return expiresAt;
  };

const createSession =
  async (
    user,
    req
  ) => {
    const sessionId =
      new mongoose.Types.ObjectId();

    const refreshToken =
      signRefreshToken(
        user._id,
        sessionId
      );

    await Session.create({
      _id:
        sessionId,

      user:
        user._id,

      tokenHash:
        hashToken(
          refreshToken
        ),

      userAgent:
        req.get(
          "user-agent"
        ) ||
        null,

      ipAddress:
        req.ip ||
        null,

      expiresAt:
        getSessionExpiry(),
    });

    const accessToken =
      signAccessToken(
        user
      );

    return {
      accessToken,
      refreshToken,
    };
  };

/* =========================================================
   WHATSAPP NUMBER
========================================================= */

const getUserWhatsAppNumber =
  (
    user
  ) => {
    const value =
      String(
        user?.whatsappNumber ||
        ""
      )
        .replace(
          /\D/g,
          ""
        )
        .trim();

    return value ||
      null;
  };

/* =========================================================
   OTP
========================================================= */

const generateSixDigitOtp =
  () => {
    return crypto
      .randomInt(
        100000,
        1000000
      )
      .toString();
  };

const hashOtp =
  (
    otp
  ) => {
    return crypto
      .createHash(
        "sha256"
      )
      .update(
        String(
          otp
        )
      )
      .digest(
        "hex"
      );
  };

/* =========================================================
   SIGNUP
========================================================= */

const signup =
  async ({
    displayName,
    email,
    password,
    req,
  }) => {
    const normalizedEmail =
      normalizeEmail(
        email
      );

    if (
      !normalizedEmail
    ) {
      throw new ApiError(
        400,
        "Email is required"
      );
    }

    /*
     * Keep your existing controlled signup
     * domain restriction.
     *
     * This restriction does NOT apply to
     * Google login.
     */
    if (
      !isAllowedEmailDomain(
        normalizedEmail
      )
    ) {
      throw new ApiError(
        403,
        `Only @${env.allowedEmailDomain} email addresses are allowed`
      );
    }

    validatePassword(
      password
    );

    const existingUser =
      await User.findOne({
        email:
          normalizedEmail,
      });

    if (
      existingUser
    ) {
      throw new ApiError(
        409,
        "An account with this email already exists"
      );
    }

    const totalUsers =
      await User.countDocuments();

    let role =
      "EMPLOYEE";

    if (
      totalUsers ===
      0
    ) {
      if (
        !env.initialSuperAdminEmail
      ) {
        throw new ApiError(
          500,
          "INITIAL_SUPERADMIN_EMAIL is not configured"
        );
      }

      if (
        normalizedEmail !==
        env.initialSuperAdminEmail
      ) {
        throw new ApiError(
          403,
          "Only the configured initial Super Admin can create the first account"
        );
      }

      role =
        "SUPER_ADMIN";
    } else if (
      !env.allowSelfSignup
    ) {
      throw new ApiError(
        403,
        "Self signup is disabled. Contact your administrator."
      );
    }

    const passwordHash =
      await hashPassword(
        password
      );

    const user =
      await User.create({
        displayName:
          displayName?.trim() ||
          "",

        email:
          normalizedEmail,

        passwordHash,

        role,

        status:
          "ACTIVE",

        authProviders: [
          "local",
        ],

        emailVerified:
          false,
      });

    const tokens =
      await createSession(
        user,
        req
      );

    user.lastLoginAt =
      new Date();

    await user.save();

    return {
      user,
      ...tokens,
    };
  };

/* =========================================================
   LOCAL LOGIN
========================================================= */

const login =
  async ({
    email,
    password,
    req,
  }) => {
    const normalizedEmail =
      normalizeEmail(
        email
      );

    const user =
      await User
        .findOne({
          email:
            normalizedEmail,
        })
        .select(
          "+passwordHash"
        );

    if (
      !user ||
      !user.passwordHash
    ) {
      throw new ApiError(
        401,
        "Invalid email or password"
      );
    }

    const passwordCorrect =
      await comparePassword(
        password,
        user.passwordHash
      );

    if (
      !passwordCorrect
    ) {
      throw new ApiError(
        401,
        "Invalid email or password"
      );
    }

    if (
      user.status !==
      "ACTIVE"
    ) {
      throw new ApiError(
        403,
        "Your account is not active"
      );
    }

    if (
      !user.authProviders.includes(
        "local"
      )
    ) {
      user.authProviders.push(
        "local"
      );
    }

    user.lastLoginAt =
      new Date();

    await user.save();

    const tokens =
      await createSession(
        user,
        req
      );

    user.passwordHash =
      undefined;

    return {
      user,
      ...tokens,
    };
  };

/* =========================================================
   GOOGLE LOGIN

   Google proves identity.

   MongoDB decides authorization.

   Gmail + Workspace are both accepted,
   but the exact verified email MUST already
   exist in SE-RMS.
========================================================= */

const googleLogin =
  async ({
    credential,
    req,
  }) => {
    if (
      !env.googleClientId
    ) {
      throw new ApiError(
        500,
        "Google authentication is not configured"
      );
    }

    if (
      !credential
    ) {
      throw new ApiError(
        400,
        "Google credential is required"
      );
    }

    let ticket;

    try {
      ticket =
        await googleClient
          .verifyIdToken({
            idToken:
              credential,

            audience:
              env.googleClientId,
          });
    } catch (
      error
    ) {
      throw new ApiError(
        401,
        "Invalid Google credential"
      );
    }

    const payload =
      ticket.getPayload();

    if (
      !payload
    ) {
      throw new ApiError(
        401,
        "Invalid Google account"
      );
    }

    if (
      !payload.email_verified
    ) {
      throw new ApiError(
        403,
        "Google email is not verified"
      );
    }

    const email =
      normalizeEmail(
        payload.email
      );

    if (
      !email
    ) {
      throw new ApiError(
        401,
        "Google account does not contain a valid email"
      );
    }

    /*
     * CRITICAL:
     *
     * Never auto-create an ERP account from
     * a Google login.
     *
     * Exact email must already exist.
     */
    const user =
      await User.findOne({
        email,
      });

    if (
      !user
    ) {
      throw new ApiError(
        403,
        "Your Google account is not registered in SE-RMS. Contact the administrator."
      );
    }

    if (
      user.status !==
      "ACTIVE"
    ) {
      throw new ApiError(
        403,
        "Your account is not active"
      );
    }

    /*
     * If this user was previously linked to
     * another Google subject, do not silently
     * replace that identity.
     */
    if (
      user.googleId &&
      String(
        user.googleId
      ) !==
      String(
        payload.sub
      )
    ) {
      throw new ApiError(
        403,
        "This SE-RMS account is already linked to another Google account."
      );
    }

    user.googleId =
      payload.sub;

    user.emailVerified =
      true;

    if (
      !user.authProviders.includes(
        "google"
      )
    ) {
      user.authProviders.push(
        "google"
      );
    }

    user.lastLoginAt =
      new Date();

    await user.save();

    const tokens =
      await createSession(
        user,
        req
      );

    return {
      user,
      ...tokens,
    };
  };

/* =========================================================
   REFRESH TOKEN
========================================================= */

const refreshAccessToken =
  async ({
    refreshToken,
    req,
  }) => {
    if (
      !refreshToken
    ) {
      throw new ApiError(
        401,
        "Refresh token is missing"
      );
    }

    let payload;

    try {
      payload =
        verifyRefreshToken(
          refreshToken
        );
    } catch (
      error
    ) {
      throw new ApiError(
        401,
        "Invalid or expired refresh token"
      );
    }

    if (
      payload.type !==
      "refresh"
    ) {
      throw new ApiError(
        401,
        "Invalid refresh token"
      );
    }

    const session =
      await Session.findById(
        payload.sessionId
      );

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <
        new Date()
    ) {
      throw new ApiError(
        401,
        "Session has expired"
      );
    }

    if (
      session.tokenHash !==
      hashToken(
        refreshToken
      )
    ) {
      session.revokedAt =
        new Date();

      await session.save();

      throw new ApiError(
        401,
        "Invalid session"
      );
    }

    const user =
      await User.findById(
        payload.sub
      );

    if (
      !user ||
      user.status !==
        "ACTIVE"
    ) {
      throw new ApiError(
        401,
        "User account is unavailable"
      );
    }

    const newRefreshToken =
      signRefreshToken(
        user._id,
        session._id
      );

    session.tokenHash =
      hashToken(
        newRefreshToken
      );

    session.lastUsedAt =
      new Date();

    session.userAgent =
      req.get(
        "user-agent"
      ) ||
      session.userAgent;

    session.ipAddress =
      req.ip ||
      session.ipAddress;

    session.expiresAt =
      getSessionExpiry();

    await session.save();

    const accessToken =
      signAccessToken(
        user
      );

    return {
      user,
      accessToken,

      refreshToken:
        newRefreshToken,
    };
  };

/* =========================================================
   LOGOUT
========================================================= */

const logout =
  async (
    refreshToken
  ) => {
    if (
      !refreshToken
    ) {
      return;
    }

    const tokenHash =
      hashToken(
        refreshToken
      );

    await Session.findOneAndUpdate(
      {
        tokenHash,

        revokedAt:
          null,
      },
      {
        revokedAt:
          new Date(),
      }
    );
  };

const logoutAll =
  async (
    userId
  ) => {
    await Session.updateMany(
      {
        user:
          userId,

        revokedAt:
          null,
      },
      {
        revokedAt:
          new Date(),
      }
    );
  };

/* =========================================================
   REQUEST PASSWORD RESET OTP
========================================================= */

const forgotPassword =
  async ({
    email,
    req,
  }) => {
    /* =====================================================
       1. NORMALIZE / VALIDATE EMAIL
    ===================================================== */

    const normalizedEmail =
      normalizeEmail(
        email
      );

    if (
      !normalizedEmail
    ) {
      throw new ApiError(
        400,
        "Email address is required"
      );
    }

    /* =====================================================
       2. FIND ACTIVE SE-RMS USER
    ===================================================== */

    const user =
      await User.findOne({
        email:
          normalizedEmail,

        status:
          "ACTIVE",
      });

    if (
      !user
    ) {
      throw new ApiError(
        404,
        "No active SE-RMS account was found with this email address."
      );
    }

    /* =====================================================
       3. GET REGISTERED WHATSAPP NUMBER

       IMPORTANT:
       Keep ONLY fields that actually exist in your User
       schema.

       If mobile is stored in Employee instead of User,
       replace this section with Employee lookup.
    ===================================================== */

    const whatsappNumber =
  getUserWhatsAppNumber(
    user
  );

    if (
      !whatsappNumber
    ) {
      throw new ApiError(
        400,
        "No WhatsApp number is registered with this SE-RMS account. Please contact HR or the system administrator."
      );
    }

    /* =====================================================
       4. NORMALIZE INDIAN MOBILE NUMBER

       9876543210
          ↓
       919876543210
    ===================================================== */

    let whatsappPhone =
      whatsappNumber;

    if (
      whatsappPhone.length ===
      10
    ) {
      whatsappPhone =
        `91${whatsappPhone}`;
    }

    if (
      whatsappPhone.length <
        11 ||
      whatsappPhone.length >
        15
    ) {
      throw new ApiError(
        400,
        "The WhatsApp number registered with this account is invalid. Please contact HR or the system administrator."
      );
    }

    /* =====================================================
       5. INVALIDATE PREVIOUS ACTIVE OTPs

       Only the latest OTP should remain usable.
    ===================================================== */

    const now =
      new Date();

    await PasswordResetOtp
      .updateMany(
        {
          user:
            user._id,

          email:
            normalizedEmail,

          usedAt:
            null,
        },
        {
          $set: {
            usedAt:
              now,
          },
        }
      );

    /* =====================================================
       6. GENERATE SECURE 6-DIGIT OTP
    ===================================================== */

    const otp =
      crypto
        .randomInt(
          100000,
          1000000
        )
        .toString();

    /* =====================================================
       7. HASH OTP

       Never store plain OTP in MongoDB.
    ===================================================== */

    const otpHash =
      hashOtp(
        otp
      );

    /* =====================================================
       8. OTP VALID FOR EXACTLY 15 SECONDS
    ===================================================== */

   const expiresAt =
  new Date(
    Date.now() +
      OTP_EXPIRY_MINUTES *
        60 *
        1000
  );

    /* =====================================================
       9. CREATE OTP RECORD
    ===================================================== */

    const resetOtp =
      await PasswordResetOtp
        .create({
          user:
            user._id,

          email:
            normalizedEmail,

          otpHash,

          expiresAt,

          attempts:
            0,

          maxAttempts:
            5,

          verifiedAt:
            null,

          usedAt:
            null,

          requestedIp:
            req?.ip ||
            null,

          userAgent:
            req
              ?.get?.(
                "user-agent"
              ) ||
            null,
        });

    /* =====================================================
       10. SEND OTP THROUGH WHATSAPP

       IMPORTANT:
       Replace `sendTextToPhone` below only if your actual
       Baileys client exports a differently named method.
    ===================================================== */

   const message =
  [
    "Nuvanata Password Reset",
    "",
    `Your verification code is: ${otp}`,
    "",
    `This code is valid for ${OTP_EXPIRY_MINUTES} minutes.`,
    "Do not share this code with anyone.",
    "",
    "If you did not request a password reset, you can ignore this message.",
    "",
    "Sandeep Edgetech Pvt. Ltd.",
  ].join(
    "\n"
  );

    try {
      await sendTextToPhone(
        whatsappPhone,
        message
      );
    } catch (
      error
    ) {
      /*
       * Do not leave a usable OTP in MongoDB when
       * WhatsApp delivery itself failed.
       */

      resetOtp.usedAt =
        new Date();

      await resetOtp.save();

      console.error(
        "[AUTH] Password reset WhatsApp delivery failed",
        {
          userId:
            String(
              user._id
            ),

          error:
            error?.message ||
            "Unknown Baileys error",
        }
      );

      throw new ApiError(
        503,
        "Unable to send the WhatsApp verification code right now. Please try again."
      );
    }

    /* =====================================================
       11. SUCCESS ONLY AFTER WHATSAPP SEND SUCCEEDS
    ===================================================== */

    return {
  sent:
    true,

  expiresInSeconds:
    OTP_EXPIRY_MINUTES *
      60,
};
  };

/* =========================================================
   VERIFY PASSWORD RESET OTP
========================================================= */

const verifyPasswordResetOtp =
  async ({
    email,
    otp,
  }) => {
    /* =====================================================
       1. NORMALIZE INPUT
    ===================================================== */

    const normalizedEmail =
      normalizeEmail(
        email
      );

    const normalizedOtp =
      String(
        otp || ""
      )
        .replace(
          /\D/g,
          ""
        )
        .trim();

    /* =====================================================
       2. VALIDATE EMAIL
    ===================================================== */

    if (
      !normalizedEmail
    ) {
      throw new ApiError(
        400,
        "Email is required"
      );
    }

    /* =====================================================
       3. VALIDATE OTP FORMAT
       OTP must always be exactly 6 digits
    ===================================================== */

    if (
      !/^\d{6}$/.test(
        normalizedOtp
      )
    ) {
      throw new ApiError(
        400,
        "Enter the complete 6-digit OTP"
      );
    }

    /* =====================================================
       4. FIND ACTIVE USER
    ===================================================== */

    const user =
      await User.findOne({
        email:
          normalizedEmail,

        status:
          "ACTIVE",
      });

    /*
     * Keep this response generic.
     *
     * We should not reveal whether an email address exists
     * in SE-RMS through the password recovery endpoint.
     */
    if (
      !user
    ) {
      throw new ApiError(
        400,
        "Invalid or expired verification code"
      );
    }

    /* =====================================================
       5. FIND LATEST UNUSED OTP
       
       IMPORTANT:
       Do NOT filter expiresAt here.
       
       We need to retrieve the OTP first so that we can
       distinguish:
       
       - wrong OTP
       - expired OTP
       - too many attempts
       
       Otherwise an expired OTP simply looks "not found".
    ===================================================== */

    const resetOtp =
      await PasswordResetOtp
        .findOne({
          user:
            user._id,

          email:
            normalizedEmail,

          usedAt:
            null,
        })
        .sort({
          createdAt:
            -1,
        })
        .select(
          "+otpHash"
        );

    /* =====================================================
       6. NO OTP REQUEST EXISTS
    ===================================================== */

    if (
      !resetOtp
    ) {
      throw new ApiError(
        400,
        "No active verification code found. Request a new OTP."
      );
    }

    /* =====================================================
       7. CHECK EXPIRY
    ===================================================== */

    const now =
      new Date();

    if (
      !resetOtp.expiresAt ||
      resetOtp.expiresAt <=
        now
    ) {
      resetOtp.usedAt =
        now;

      await resetOtp.save();

      throw new ApiError(
        400,
        "OTP has expired. Request a new code."
      );
    }

    /* =====================================================
       8. CHECK ATTEMPT LIMIT
    ===================================================== */

    const maxAttempts =
      Number(
        resetOtp.maxAttempts ||
          5
      );

    const currentAttempts =
      Number(
        resetOtp.attempts ||
          0
      );

    if (
      currentAttempts >=
      maxAttempts
    ) {
      resetOtp.usedAt =
        now;

      await resetOtp.save();

      throw new ApiError(
        429,
        "Too many incorrect verification attempts. Request a new OTP."
      );
    }

    /* =====================================================
       9. HASH PROVIDED OTP
    ===================================================== */

    const providedHash =
      hashOtp(
        normalizedOtp
      );

    if (
      !resetOtp.otpHash ||
      !providedHash
    ) {
      throw new ApiError(
        400,
        "Unable to verify OTP. Request a new code."
      );
    }

    /* =====================================================
       10. SAFE HASH COMPARISON
    ===================================================== */

    let correct =
      false;

    try {
      const expectedBuffer =
        Buffer.from(
          resetOtp.otpHash,
          "hex"
        );

      const providedBuffer =
        Buffer.from(
          providedHash,
          "hex"
        );

      correct =
        expectedBuffer.length >
          0 &&
        expectedBuffer.length ===
          providedBuffer.length &&
        crypto.timingSafeEqual(
          expectedBuffer,
          providedBuffer
        );
    } catch (
      error
    ) {
      correct =
        false;
    }

    /* =====================================================
       11. WRONG OTP
    ===================================================== */

    if (
      !correct
    ) {
      resetOtp.attempts =
        currentAttempts +
        1;

      const attemptsLeft =
        Math.max(
          0,
          maxAttempts -
            resetOtp.attempts
        );

      /*
       * If this was the final permitted attempt,
       * consume the OTP.
       */
      if (
        resetOtp.attempts >=
        maxAttempts
      ) {
        resetOtp.usedAt =
          new Date();

        await resetOtp.save();

        throw new ApiError(
          429,
          "OTP does not match. Too many incorrect attempts. Request a new OTP."
        );
      }

      await resetOtp.save();

      throw new ApiError(
        400,
        attemptsLeft === 1
          ? "OTP does not match. 1 attempt remaining."
          : `OTP does not match. ${attemptsLeft} attempts remaining.`
      );
    }

    /* =====================================================
       12. CORRECT OTP
    ===================================================== */

    resetOtp.verifiedAt =
      new Date();

    await resetOtp.save();

    /* =====================================================
       13. SUCCESS
    ===================================================== */

    return {
      verified:
        true,

      message:
        "OTP verified successfully",
    };
  };

/* =========================================================
   RESET PASSWORD WITH VERIFIED OTP
========================================================= */

const resetPassword =
  async ({
    email,
    otp,
    newPassword,
  }) => {
    validatePassword(
      newPassword
    );

    const normalizedEmail =
      normalizeEmail(
        email
      );

    if (
      !normalizedEmail ||
      !otp
    ) {
      throw new ApiError(
        400,
        "Email and verification code are required"
      );
    }

    const user =
      await User
        .findOne({
          email:
            normalizedEmail,

          status:
            "ACTIVE",
        })
        .select(
          "+passwordHash"
        );

    if (
      !user
    ) {
      throw new ApiError(
        400,
        "Invalid or expired verification code"
      );
    }

    const resetOtp =
      await PasswordResetOtp
        .findOne({
          user:
            user._id,

          email:
            normalizedEmail,

          verifiedAt: {
            $ne:
              null,
          },

          usedAt:
            null,

          expiresAt: {
            $gt:
              new Date(),
          },
        })
        .sort({
          createdAt:
            -1,
        })
        .select(
          "+otpHash"
        );

    if (
      !resetOtp
    ) {
      throw new ApiError(
        400,
        "Please verify your OTP before resetting the password"
      );
    }

    const providedHash =
      hashOtp(
        otp
      );

    const expectedBuffer =
      Buffer.from(
        resetOtp.otpHash,
        "hex"
      );

    const providedBuffer =
      Buffer.from(
        providedHash,
        "hex"
      );

    const correct =
      expectedBuffer.length ===
        providedBuffer.length &&
      crypto.timingSafeEqual(
        expectedBuffer,
        providedBuffer
      );

    if (
      !correct
    ) {
      throw new ApiError(
        400,
        "Invalid or expired verification code"
      );
    }

    user.passwordHash =
      await hashPassword(
        newPassword
      );

    user.passwordChangedAt =
      new Date();

    if (
      !user.authProviders.includes(
        "local"
      )
    ) {
      user.authProviders.push(
        "local"
      );
    }

    await user.save();

    resetOtp.usedAt =
      new Date();

    await resetOtp.save();

    /*
     * Invalidate any other reset OTPs.
     */
    await PasswordResetOtp.updateMany(
      {
        user:
          user._id,

        _id: {
          $ne:
            resetOtp._id,
        },

        usedAt:
          null,
      },
      {
        usedAt:
          new Date(),
      }
    );

    /*
     * Security:
     * password reset terminates every
     * existing SE-RMS session.
     */
    await logoutAll(
      user._id
    );
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  signup,

  login,

  googleLogin,

  refreshAccessToken,

  logout,

  logoutAll,

  forgotPassword,

  verifyPasswordResetOtp,

  resetPassword,
};
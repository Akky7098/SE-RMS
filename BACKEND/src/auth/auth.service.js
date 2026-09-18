const mongoose = require("mongoose");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const { User } = require("../user/user.model");
const Session = require("./session.model");

const ApiError = require("../utils/ApiError");

const {
  hashPassword,
  comparePassword,
  validatePassword,
} = require("../utils/password");

const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");

const {
  hashToken,
  generateRandomToken,
} = require("../utils/token");

const sendEmail = require("../utils/sendEmail");
const env = require("../config/env");

const googleClient = new OAuth2Client(
  env.googleClientId || undefined
);

const normalizeEmail = (email) => {
  return String(email || "")
    .trim()
    .toLowerCase();
};

const isAllowedEmailDomain = (email) => {
  const normalizedEmail =
    normalizeEmail(email);

  return normalizedEmail.endsWith(
    `@${env.allowedEmailDomain}`
  );
};

const getSessionExpiry = () => {
  const expiresAt = new Date();

  expiresAt.setDate(
    expiresAt.getDate() +
      env.refreshTokenDays
  );

  return expiresAt;
};

const createSession = async (
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
    _id: sessionId,

    user: user._id,

    tokenHash:
      hashToken(refreshToken),

    userAgent:
      req.get("user-agent") || null,

    ipAddress:
      req.ip || null,

    expiresAt:
      getSessionExpiry(),
  });

  const accessToken =
    signAccessToken(user);

  return {
    accessToken,
    refreshToken,
  };
};

const signup = async ({
  displayName,
  email,
  password,
  req,
}) => {
  const normalizedEmail =
    normalizeEmail(email);

  if (!normalizedEmail) {
    throw new ApiError(
      400,
      "Email is required"
    );
  }

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

  validatePassword(password);

  const existingUser =
    await User.findOne({
      email: normalizedEmail,
    });

  if (existingUser) {
    throw new ApiError(
      409,
      "An account with this email already exists"
    );
  }

  const totalUsers =
    await User.countDocuments();

  let role = "EMPLOYEE";

  /*
   * Bootstrap rule:
   *
   * First ever account can become
   * SUPER_ADMIN only when its email
   * matches INITIAL_SUPERADMIN_EMAIL.
   */
  if (totalUsers === 0) {
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

    role = "SUPER_ADMIN";
  } else {
    /*
     * Once the first account exists,
     * public signup remains disabled
     * unless explicitly enabled.
     */
    if (!env.allowSelfSignup) {
      throw new ApiError(
        403,
        "Self signup is disabled. Contact your administrator."
      );
    }
  }

  const passwordHash =
    await hashPassword(password);

  const user = await User.create({
    displayName:
      displayName?.trim() || "",

    email: normalizedEmail,

    passwordHash,

    role,

    status: "ACTIVE",

    authProviders: ["local"],

    emailVerified: false,
  });

  const tokens =
    await createSession(
      user,
      req
    );

  await User.findByIdAndUpdate(
    user._id,
    {
      lastLoginAt: new Date(),
    }
  );

  return {
    user,
    ...tokens,
  };
};

const login = async ({
  email,
  password,
  req,
}) => {
  const normalizedEmail =
    normalizeEmail(email);

  const user =
    await User.findOne({
      email: normalizedEmail,
    }).select("+passwordHash");

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

  if (!passwordCorrect) {
    throw new ApiError(
      401,
      "Invalid email or password"
    );
  }

  if (user.status !== "ACTIVE") {
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

    await user.save();
  }

  user.lastLoginAt =
    new Date();

  await user.save();

  const tokens =
    await createSession(
      user,
      req
    );

  user.passwordHash = undefined;

  return {
    user,
    ...tokens,
  };
};

const googleLogin = async ({
  credential,
  req,
}) => {
  if (!env.googleClientId) {
    throw new ApiError(
      500,
      "Google authentication is not configured"
    );
  }

  if (!credential) {
    throw new ApiError(
      400,
      "Google credential is required"
    );
  }

  let ticket;

  try {
    ticket =
      await googleClient.verifyIdToken({
        idToken: credential,
        audience:
          env.googleClientId,
      });
  } catch (error) {
    throw new ApiError(
      401,
      "Invalid Google credential"
    );
  }

  const payload =
    ticket.getPayload();

  if (!payload) {
    throw new ApiError(
      401,
      "Invalid Google account"
    );
  }

  const email =
    normalizeEmail(payload.email);

  /*
   * IMPORTANT:
   * Do not rely only on email suffix.
   *
   * Verify Google's hosted domain
   * claim as well.
   */
  if (
    payload.hd !==
    env.googleAllowedDomain
  ) {
    throw new ApiError(
      403,
      `Only ${env.googleAllowedDomain} Google Workspace accounts are allowed`
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

  if (
    !email.endsWith(
      `@${env.googleAllowedDomain}`
    )
  ) {
    throw new ApiError(
      403,
      "Google account domain is not allowed"
    );
  }

  let user =
    await User.findOne({
      email,
    });

  /*
   * Recommended default:
   * Domain alone does NOT automatically
   * grant ERP access.
   *
   * User should first be created by ERP
   * admin.
   */
  if (!user) {
    if (
      !env.googleAutoProvision
    ) {
      throw new ApiError(
        403,
        "Your SE-RMS account has not been activated. Contact the administrator."
      );
    }

    user = await User.create({
      displayName:
        payload.name || email,

      email,

      googleId: payload.sub,

      emailVerified: true,

      authProviders: [
        "google",
      ],

      role: "EMPLOYEE",

      status: "ACTIVE",
    });
  }

  if (user.status !== "ACTIVE") {
    throw new ApiError(
      403,
      "Your account is not active"
    );
  }

  user.googleId =
    payload.sub;

  user.emailVerified = true;

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

const refreshAccessToken = async ({
  refreshToken,
  req,
}) => {
  if (!refreshToken) {
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
  } catch (error) {
    throw new ApiError(
      401,
      "Invalid or expired refresh token"
    );
  }

  if (
    payload.type !== "refresh"
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
    hashToken(refreshToken)
  ) {
    /*
     * Token mismatch can indicate
     * refresh token reuse.
     */
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
    user.status !== "ACTIVE"
  ) {
    throw new ApiError(
      401,
      "User account is unavailable"
    );
  }

  /*
   * Rotate the refresh token.
   */
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
    req.get("user-agent") ||
    session.userAgent;

  session.ipAddress =
    req.ip ||
    session.ipAddress;

  session.expiresAt =
    getSessionExpiry();

  await session.save();

  const accessToken =
    signAccessToken(user);

  return {
    user,
    accessToken,
    refreshToken:
      newRefreshToken,
  };
};

const logout = async (
  refreshToken
) => {
  if (!refreshToken) {
    return;
  }

  const tokenHash =
    hashToken(refreshToken);

  await Session.findOneAndUpdate(
    {
      tokenHash,
      revokedAt: null,
    },
    {
      revokedAt: new Date(),
    }
  );
};

const logoutAll = async (
  userId
) => {
  await Session.updateMany(
    {
      user: userId,
      revokedAt: null,
    },
    {
      revokedAt: new Date(),
    }
  );
};

const forgotPassword = async ({
  email,
}) => {
  const normalizedEmail =
    normalizeEmail(email);

  /*
   * Never expose whether
   * an account exists.
   */
  const user =
    await User.findOne({
      email: normalizedEmail,
      status: "ACTIVE",
    });

  if (!user) {
    return;
  }

  /*
   * Google-only accounts without local
   * password do not need reset.
   */
  if (
    !user.authProviders.includes(
      "local"
    )
  ) {
    return;
  }

  const rawToken =
    generateRandomToken();

  const hashedToken =
    hashToken(rawToken);

  user.passwordResetToken =
    hashedToken;

  user.passwordResetExpires =
    new Date(
      Date.now() +
        15 * 60 * 1000
    );

  await user.save();

  const resetUrl =
    `${env.frontendUrls[0]}` +
    `/reset-password` +
    `?token=${rawToken}` +
    `&email=${encodeURIComponent(
      user.email
    )}`;

  await sendEmail({
    to: user.email,

    subject:
      "Reset your SE-RMS password",

    text:
      `A password reset was requested for your SE-RMS account.\n\n` +
      `Reset your password here:\n${resetUrl}\n\n` +
      `This link expires in 15 minutes.\n\n` +
      `If you did not request this, ignore this email.`,

    html: `
      <h2>SE-RMS Password Reset</h2>

      <p>
        A password reset was requested
        for your SE-RMS account.
      </p>

      <p>
        <a href="${resetUrl}">
          Reset Password
        </a>
      </p>

      <p>
        This link expires in 15 minutes.
      </p>

      <p>
        If you did not request this,
        you can ignore this email.
      </p>
    `,
  });
};

const resetPassword = async ({
  email,
  token,
  newPassword,
}) => {
  validatePassword(
    newPassword
  );

  const normalizedEmail =
    normalizeEmail(email);

  const hashedToken =
    hashToken(token);

  const user =
    await User.findOne({
      email: normalizedEmail,

      passwordResetToken:
        hashedToken,

      passwordResetExpires: {
        $gt: new Date(),
      },
    }).select(
      "+passwordResetToken +passwordResetExpires +passwordHash"
    );

  if (!user) {
    throw new ApiError(
      400,
      "Password reset link is invalid or expired"
    );
  }

  user.passwordHash =
    await hashPassword(
      newPassword
    );

  user.passwordChangedAt =
    new Date();

  user.passwordResetToken =
    null;

  user.passwordResetExpires =
    null;

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

  /*
   * Force logout from every device
   * after password reset.
   */
  await logoutAll(
    user._id
  );
};

module.exports = {
  signup,
  login,
  googleLogin,
  refreshAccessToken,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
};
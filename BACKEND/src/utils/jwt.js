const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const env = require("../config/env");

const signAccessToken = (user) => {
  return jwt.sign(
    {
      type: "access",
      role: user.role,
    },
    env.jwtAccessSecret,
    {
      subject: String(user._id),
      expiresIn:
        env.jwtAccessExpiresIn,
      jwtid: crypto.randomUUID(),
    }
  );
};

const signRefreshToken = (
  userId,
  sessionId
) => {
  return jwt.sign(
    {
      type: "refresh",
      sessionId: String(sessionId),
    },
    env.jwtRefreshSecret,
    {
      subject: String(userId),
      expiresIn: `${env.refreshTokenDays}d`,
      jwtid: crypto.randomUUID(),
    }
  );
};

const verifyAccessToken = (token) => {
  return jwt.verify(
    token,
    env.jwtAccessSecret
  );
};

const verifyRefreshToken = (token) => {
  return jwt.verify(
    token,
    env.jwtRefreshSecret
  );
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
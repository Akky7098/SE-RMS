const dotenv = require("dotenv");

dotenv.config();

const requiredEnv = [
  "MONGO_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,

  mongoUri: process.env.MONGO_URI,

  frontendUrls: (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((url) => url.trim()),

  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,

  jwtAccessExpiresIn:
    process.env.JWT_ACCESS_EXPIRES_IN || "15m",

  refreshTokenDays:
    Number(process.env.REFRESH_TOKEN_DAYS) || 7,

  cookieName:
    process.env.COOKIE_NAME || "se_rms_refresh",

  cookieSecure:
    process.env.COOKIE_SECURE === "true",

  cookieSameSite:
    process.env.COOKIE_SAME_SITE || "lax",

  allowedEmailDomain:
    process.env.ALLOWED_EMAIL_DOMAIN || "sandeepedgetech.com",

  initialSuperAdminEmail:
    process.env.INITIAL_SUPERADMIN_EMAIL
      ? process.env.INITIAL_SUPERADMIN_EMAIL.toLowerCase()
      : null,

  allowSelfSignup:
    process.env.ALLOW_SELF_SIGNUP === "true",

  googleClientId:
    process.env.GOOGLE_CLIENT_ID || "",

  googleAllowedDomain:
    process.env.GOOGLE_ALLOWED_DOMAIN ||
    "sandeepedgetech.com",

  googleAutoProvision:
    process.env.GOOGLE_AUTO_PROVISION === "true",

  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  emailFrom:
    process.env.EMAIL_FROM ||
    "SE-RMS <no-reply@sandeepedgetech.com>",
};

module.exports = env;

//mongodb+srv://namansinvns_db_user:HNvrXcQHVzQ3frdd@se-cluster.sy5khto.mongodb.net/
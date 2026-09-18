const env = require("../config/env");

const getRefreshCookieOptions = () => {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    maxAge:
      env.refreshTokenDays *
      24 *
      60 *
      60 *
      1000,
    path: "/",
  };
};

const setRefreshCookie = (
  res,
  refreshToken
) => {
  res.cookie(
    env.cookieName,
    refreshToken,
    getRefreshCookieOptions()
  );
};

const clearRefreshCookie = (res) => {
  res.clearCookie(
    env.cookieName,
    {
      ...getRefreshCookieOptions(),
      maxAge: undefined,
    }
  );
};

module.exports = {
  setRefreshCookie,
  clearRefreshCookie,
};
const ApiError = require('../utils/ApiError');

// Google proves identity; only an existing, active ERP account grants access.
// Email domains intentionally play no part in this decision.
async function findRegisteredGoogleAccount(payload, User) {
  if (!payload || !String(payload.sub || '').trim()) {
    throw new ApiError(401, 'Invalid Google account');
  }
  if (payload.email_verified !== true) {
    throw new ApiError(403, 'Google email is not verified');
  }
  const email = String(payload.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(401, 'Google account does not contain a valid email');
  }
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(403, 'Your Google account is not registered in SE-RMS. Contact the administrator.');
  }
  if (user.status !== 'ACTIVE') {
    throw new ApiError(403, 'Your account is not active');
  }
  if (user.googleId && String(user.googleId) !== String(payload.sub)) {
    throw new ApiError(403, 'This SE-RMS account is already linked to another Google account.');
  }
  return user;
}
module.exports = { findRegisteredGoogleAccount };

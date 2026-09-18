const crypto = require("crypto");

const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

const generateRandomToken = () => {
  return crypto
    .randomBytes(32)
    .toString("hex");
};

module.exports = {
  hashToken,
  generateRandomToken,
};
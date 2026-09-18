const bcrypt = require("bcryptjs");
const ApiError = require("./ApiError");

const validatePassword = (password) => {
  if (!password) {
    throw new ApiError(
      400,
      "Password is required"
    );
  }

  if (password.length < 8) {
    throw new ApiError(
      400,
      "Password must be at least 8 characters"
    );
  }

  if (!/[A-Z]/.test(password)) {
    throw new ApiError(
      400,
      "Password must contain at least one uppercase letter"
    );
  }

  if (!/[a-z]/.test(password)) {
    throw new ApiError(
      400,
      "Password must contain at least one lowercase letter"
    );
  }

  if (!/[0-9]/.test(password)) {
    throw new ApiError(
      400,
      "Password must contain at least one number"
    );
  }

  return true;
};

const hashPassword = async (password) => {
  validatePassword(password);

  return bcrypt.hash(password, 12);
};

const comparePassword = async (
  password,
  hash
) => {
  return bcrypt.compare(
    password,
    hash
  );
};

module.exports = {
  validatePassword,
  hashPassword,
  comparePassword,
};
const { User } = require("../user/user.model");

const {
  verifyAccessToken,
} = require("../utils/jwt");

const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const authenticate = asyncHandler(
  async (req, res, next) => {
    const authorization =
      req.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      throw new ApiError(
        401,
        "Authentication required"
      );
    }

    const token =
      authorization.split(" ")[1];

    let payload;

    try {
      payload =
        verifyAccessToken(token);
    } catch (error) {
      throw new ApiError(
        401,
        "Invalid or expired access token"
      );
    }

    if (
      payload.type !== "access"
    ) {
      throw new ApiError(
        401,
        "Invalid access token"
      );
    }

    const user =
      await User.findById(
        payload.sub
      );

    if (!user) {
      throw new ApiError(
        401,
        "User no longer exists"
      );
    }

    if (
      user.status !== "ACTIVE"
    ) {
      throw new ApiError(
        403,
        "User account is not active"
      );
    }

    /*
     * Invalidates old access tokens
     * after password change/reset.
     */
    if (
      user.passwordChangedAt &&
      payload.iat
    ) {
      const changedAt =
        Math.floor(
          user.passwordChangedAt.getTime() /
            1000
        );

      if (
        changedAt > payload.iat
      ) {
        throw new ApiError(
          401,
          "Password was changed. Please login again."
        );
      }
    }

    req.user = user;

    next();
  }
);

const authorizeRoles = (
  ...allowedRoles
) => {
  return (
    req,
    res,
    next
  ) => {
    if (
      !req.user ||
      !allowedRoles.includes(
        req.user.role
      )
    ) {
      return next(
        new ApiError(
          403,
          "You do not have permission to perform this action"
        )
      );
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorizeRoles,
};
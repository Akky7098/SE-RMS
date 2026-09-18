const ApiError =
  require("../utils/ApiError");

const asyncHandler =
  require("../utils/asyncHandler");

const {
  MODULES,
  ACTIONS,
} = require("../access/access.model");

const {
  getPermission,
} = require("../access/access.service");

/*
 * Usage:
 *
 * requirePermission(
 *   "EMPLOYEE",
 *   "VIEW"
 * )
 *
 * On success:
 *
 * req.permissionScope =
 *   SELF | TEAM | DEPARTMENT | ALL
 */

const requirePermission = (
  module,
  action
) => {
  if (!MODULES.includes(module)) {
    throw new Error(
      `Invalid permission module: ${module}`
    );
  }

  if (!ACTIONS.includes(action)) {
    throw new Error(
      `Invalid permission action: ${action}`
    );
  }

  return asyncHandler(
    async (req, res, next) => {
      if (!req.user) {
        throw new ApiError(
          401,
          "Authentication required"
        );
      }

      /*
       * SUPER_ADMIN always has ALL scope.
       */
      if (
        req.user.role ===
        "SUPER_ADMIN"
      ) {
        req.permissionScope =
          "ALL";

        return next();
      }

      const result =
        await getPermission({
          role: req.user.role,
          module,
          action,
        });

      if (!result.allowed) {
        throw new ApiError(
          403,
          "You do not have permission to perform this action"
        );
      }

      /*
       * Controller/service can now use
       * this scope to filter records.
       */
      req.permissionScope =
        result.scope;

      next();
    }
  );
};

module.exports = {
  requirePermission,
};
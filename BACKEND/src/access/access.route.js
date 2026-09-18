const express =
  require(
    "express"
  );

const {
  authenticate,
  authorizeRoles,
} =
  require(
    "../middleware/auth.middleware"
  );

const {
  getMyAccess,
  getAccessMeta,
  listRoleAccess,
  getRoleAccess,
  updateRoleAccess,
  checkMyPermission,
} =
  require(
    "./access.controller"
  );

const router =
  express.Router();

/* =========================================================
   ALL ACCESS ROUTES REQUIRE LOGIN
========================================================= */

router.use(
  authenticate
);

/* =========================================================
   CURRENT USER ACCESS

   Every logged-in user can access these.
========================================================= */

router.get(
  "/me",
  getMyAccess
);

/*
 * Development/debug helper.
 *
 * Example:
 *
 * /api/v1/access/check/MANPOWER/CREATE
 */
router.get(
  "/check/:module/:action",
  checkMyPermission
);

/* =========================================================
   GLOBAL ACCESS MANAGEMENT

   Only GLOBAL SUPER_ADMIN may alter baseline
   system access profiles.
========================================================= */

router.get(
  "/meta",
  authorizeRoles(
    "SUPER_ADMIN"
  ),
  getAccessMeta
);

router.get(
  "/roles",
  authorizeRoles(
    "SUPER_ADMIN"
  ),
  listRoleAccess
);

router.get(
  "/roles/:role",
  authorizeRoles(
    "SUPER_ADMIN"
  ),
  getRoleAccess
);

router.put(
  "/roles/:role",
  authorizeRoles(
    "SUPER_ADMIN"
  ),
  updateRoleAccess
);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;
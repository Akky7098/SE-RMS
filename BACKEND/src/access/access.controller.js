const asyncHandler =
  require(
    "../utils/asyncHandler"
  );

const accessService =
  require(
    "./access.service"
  );

const {
  MODULES,
  ACTIONS,
  DATA_SCOPES,
  DEPARTMENT_ROLES,
} =
  require(
    "./access.model"
  );

/* =========================================================
   GET MY ACCESS

   GET /api/v1/access/me

   Every authenticated frontend session should call this.

   This response should eventually drive:

   - Sidebar
   - Routes
   - Buttons
   - Approve actions
   - Create actions
   - Edit actions
========================================================= */

const getMyAccess =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const access =
        await accessService
          .getMyAccess(
            req.user
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data:
            access,
        });
    }
  );

/* =========================================================
   ACCESS META

   GET /api/v1/access/meta

   Used by Access Management UI.
========================================================= */

const getAccessMeta =
  asyncHandler(
    async (
      req,
      res
    ) => {
      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            modules:
              MODULES,

            actions:
              ACTIONS,

            dataScopes:
              DATA_SCOPES,

            departmentRoles:
              DEPARTMENT_ROLES,
          },
        });
    }
  );

/* =========================================================
   LIST ROLE ACCESS

   GET /api/v1/access/roles
========================================================= */

const listRoleAccess =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const profiles =
        await accessService
          .listAccessProfiles();

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            profiles,
          },
        });
    }
  );

/* =========================================================
   GET ROLE ACCESS

   GET /api/v1/access/roles/:role
========================================================= */

const getRoleAccess =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const profile =
        await accessService
          .getAccessProfileByRole(
            req.params.role
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            profile,
          },
        });
    }
  );

/* =========================================================
   UPDATE ROLE ACCESS

   PUT /api/v1/access/roles/:role
========================================================= */

const updateRoleAccess =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const profile =
        await accessService
          .updateRoleAccess({
            role:
              req.params.role,

            permissions:
              req.body.permissions,

            actorUserId:
              req.user._id,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Role permissions updated successfully",

          data: {
            profile,
          },
        });
    }
  );

/* =========================================================
   CHECK CURRENT USER PERMISSION

   GET
   /api/v1/access/check/:module/:action

   Mainly useful while developing/debugging.

   Example:

   GET /api/v1/access/check/MANPOWER/CREATE
========================================================= */

const checkMyPermission =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const permission =
        await accessService
          .canUser(
            req.user,
            req.params.module,
            req.params.action
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            module:
              String(
                req.params.module
              ).toUpperCase(),

            action:
              String(
                req.params.action
              ).toUpperCase(),

            ...permission,
          },
        });
    }
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getMyAccess,

  getAccessMeta,

  listRoleAccess,

  getRoleAccess,

  updateRoleAccess,

  checkMyPermission,
};
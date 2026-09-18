const asyncHandler =
  require(
    "../../utils/asyncHandler"
  );

const accessService =
  require(
    "./employeeAccess.service"
  );

/* =========================================================
   READINESS
========================================================= */

const readiness =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await accessService
          .getAccessReadiness(
            req.params
              .employeeId
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    }
  );

/* =========================================================
   DETAIL
========================================================= */

const detail =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await accessService
          .getEmployeeAccess(
            req.params
              .employeeId
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    }
  );

/* =========================================================
   PREPARE
========================================================= */

const prepare =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await accessService
          .prepareAccess({
            employeeId:
              req.params
                .employeeId,

            payload:
              req.body ||
              {},

            actorUserId:
              req.user
                ._id,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "SE-RMS access prepared successfully.",

          data,
        });
    }
  );

/* =========================================================
   CREATE ACCOUNT
========================================================= */

const createAccount =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await accessService
          .createRmsAccount({
            employeeId:
              req.params
                .employeeId,

            actorUserId:
              req.user
                ._id,
          });

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "SE-RMS account created successfully.",

          data,
        });
    }
  );

/* =========================================================
   UPDATE LOGIN EMAIL
========================================================= */

const updateEmail =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await accessService
          .updateAccessEmail({
            employeeId:
              req.params
                .employeeId,

            officialEmail:
              req.body
                ?.officialEmail,

            actorUserId:
              req.user
                ._id,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Official email updated successfully.",

          data,
        });
    }
  );

/* =========================================================
   DISABLE
========================================================= */

const disable =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await accessService
          .disableRmsAccess({
            employeeId:
              req.params
                .employeeId,

            remarks:
              req.body
                ?.remarks,

            actorUserId:
              req.user
                ._id,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "SE-RMS access disabled successfully.",

          data,
        });
    }
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  readiness,

  detail,

  prepare,

  createAccount,

  updateEmail,

  disable,
};
const asyncHandler =
  require(
    "../../utils/asyncHandler"
  );

const activationService =
  require(
    "./employeeActivation.service"
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
        await activationService
          .getActivationReadiness(
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
   ACTIVATE
========================================================= */

const activate =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await activationService
          .activateEmployee({
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
            "Employee onboarding completed and Employee activated successfully.",

          data,
        });
    }
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  readiness,

  activate,
};
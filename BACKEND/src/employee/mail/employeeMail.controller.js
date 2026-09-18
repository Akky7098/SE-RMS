const asyncHandler =
  require(
    "../../utils/asyncHandler"
  );

const mailService =
  require(
    "./employeeMail.service"
  );

/* =========================================================
   STATUS
========================================================= */

const status =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await mailService
          .getMailStatus(
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
   ACCESS READINESS
========================================================= */

const accessReadiness =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await mailService
          .getAccessMailReadiness(
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
   WELCOME READINESS
========================================================= */

const welcomeReadiness =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await mailService
          .getWelcomeMailReadiness(
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
   SEND ACCESS
========================================================= */

const sendAccess =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await mailService
          .sendAccessEmail({
            employeeId:
              req.params
                .employeeId,

            force:
              false,

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
            "SE-RMS access email sent successfully.",

          data,
        });
    }
  );

/* =========================================================
   RESEND ACCESS
========================================================= */

const resendAccess =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await mailService
          .sendAccessEmail({
            employeeId:
              req.params
                .employeeId,

            force:
              true,

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
            "SE-RMS access email resent successfully.",

          data,
        });
    }
  );

/* =========================================================
   SEND WELCOME
========================================================= */

const sendWelcome =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await mailService
          .sendWelcomeEmail({
            employeeId:
              req.params
                .employeeId,

            force:
              false,

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
            "Employee welcome email sent successfully. Final activation is now available.",

          data,
        });
    }
  );

/* =========================================================
   RESEND WELCOME
========================================================= */

const resendWelcome =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await mailService
          .sendWelcomeEmail({
            employeeId:
              req.params
                .employeeId,

            force:
              true,

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
            "Employee welcome email resent successfully.",

          data,
        });
    }
  );

/* =========================================================
   VERIFY
========================================================= */

const verify =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await mailService
          .verifyMailTransport();

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Employee mail service is ready.",

          data,
        });
    }
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  status,

  accessReadiness,

  welcomeReadiness,

  sendAccess,

  resendAccess,

  sendWelcome,

  resendWelcome,

  verify,
};
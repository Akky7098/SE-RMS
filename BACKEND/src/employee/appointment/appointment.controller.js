const asyncHandler =
  require(
    "../../utils/asyncHandler"
  );

const appointmentService =
  require(
    "./appointment.service"
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
        await appointmentService
          .getAppointmentReadiness(
            req.params
              .employeeId
          );

      return res
        .status(200)
        .json({
          success: true,

          data,
        });
    }
  );

/* =========================================================
   CURRENT
========================================================= */

const current =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await appointmentService
          .getCurrentAppointment(
            req.params
              .employeeId
          );

      return res
        .status(200)
        .json({
          success: true,

          data,
        });
    }
  );

/* =========================================================
   HISTORY
========================================================= */

const history =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await appointmentService
          .getAppointmentHistory(
            req.params
              .employeeId
          );

      return res
        .status(200)
        .json({
          success: true,

          data,
        });
    }
  );

/* =========================================================
   GENERATE
========================================================= */

const generate =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await appointmentService
          .generateAppointment({
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
        .status(201)
        .json({
          success: true,

          message:
            "Appointment Letter generated successfully.",

          data,
        });
    }
  );

/* =========================================================
   REVIEW
========================================================= */

const review =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await appointmentService
          .reviewAppointment({
            employeeId:
              req.params
                .employeeId,

            actorUserId:
              req.user
                ._id,
          });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Appointment Letter reviewed successfully.",

          data,
        });
    }
  );

/* =========================================================
   ISSUE
========================================================= */

const issue =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await appointmentService
          .issueAppointment({
            employeeId:
              req.params
                .employeeId,

            actorUserId:
              req.user
                ._id,
          });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Appointment Letter issued successfully.",

          data,
        });
    }
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  readiness,

  current,

  history,

  generate,

  review,

  issue,
};
const joiningService =
  require(
    "./joining.service"
  );

/* =========================================================
   ERROR
========================================================= */

const errorStatus =
  (
    error,
    fallback =
      400
  ) =>
    error?.statusCode ||
    error?.status ||
    fallback;

const sendError =
  (
    res,
    error,
    fallback,
    fallbackStatus =
      400
  ) =>
    res
      .status(
        errorStatus(
          error,
          fallbackStatus
        )
      )
      .json({
        success:
          false,

        message:
          error?.message ||
          fallback,

        details:
          error?.details ||
          undefined,
      });

/* =========================================================
   SUMMARY
========================================================= */

const summary =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await joiningService
          .getJoiningSummary();

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Joining summary could not be loaded."
      );
    }
  };

/* =========================================================
   READINESS
========================================================= */

const readiness =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await joiningService
          .getJoiningReadiness(
            req.params
              .selectionId
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Joining readiness could not be checked."
      );
    }
  };

/* =========================================================
   GET
========================================================= */

const getBySelection =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await joiningService
          .getJoiningBySelection(
            req.params
              .selectionId
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Joining record could not be loaded."
      );
    }
  };

/* =========================================================
   ENSURE
========================================================= */

const ensure =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await joiningService
          .ensureJoiningRecord({
            selectionId:
              req.params
                .selectionId,

            actor:
              req.user,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Joining workflow is ready.",

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Joining workflow could not be started."
      );
    }
  };

/* =========================================================
   UPDATE
========================================================= */

const update =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await joiningService
          .updateJoining({
            selectionId:
              req.params
                .selectionId,

            body:
              req.body ||
              {},

            actor:
              req.user,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Joining status updated successfully.",

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Joining status could not be updated."
      );
    }
  };

/* =========================================================
   DAY 1
========================================================= */

const confirmDay1 =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await joiningService
          .confirmDay1({
            selectionId:
              req.params
                .selectionId,

            body:
              req.body ||
              {},

            actor:
              req.user,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Day 1 joining confirmed successfully.",

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Day 1 joining could not be confirmed."
      );
    }
  };

/* =========================================================
   LINK EMPLOYEE
========================================================= */

const linkEmployee =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await joiningService
          .linkEmployee({
            selectionId:
              req.params
                .selectionId,

            employeeId:
              req.body
                ?.employeeId,

            actor:
              req.user,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Employee linked and recruitment completed.",

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error,
        "Employee could not be linked."
      );
    }
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  summary,

  readiness,

  getBySelection,

  ensure,

  update,

  confirmDay1,

  linkEmployee,
};
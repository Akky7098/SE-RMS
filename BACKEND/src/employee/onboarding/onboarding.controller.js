const asyncHandler =
  require(
    "../../utils/asyncHandler"
  );

const onboardingService =
  require(
    "./onboarding.service"
  );

/* =========================================================
   META
========================================================= */

const meta =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await onboardingService
          .getOnboardingMeta();

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
   LIST

   IMPORTANT:

   actor is passed to service because onboarding visibility
   is NOT the same for every logged-in user.

   Rules are enforced by onboarding.service:

   SUPER_ADMIN
   -> all

   HR HOD / HR ADMIN / HR DEPARTMENT_SUPER_ADMIN
   -> all

   assigned Hiring HR
   -> own candidates

   non-HR Department HOD/Admin
   -> candidates for their department

========================================================= */

const list =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await onboardingService
          .listOnboarding({
            query:
              req.query ||
              {},

            actor:
              req.user,
          });

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
   READINESS
========================================================= */

const readiness =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await onboardingService
          .getOnboardingReadiness(
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
    }
  );

/* =========================================================
   START

   Creates EmployeeOnboarding record.

   DOES NOT create Employee.
========================================================= */

const start =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await onboardingService
          .startOnboarding({
            selectionId:
              req.params
                .selectionId,

            actor:
              req.user,

            actorUserId:
              req.user._id,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Employee onboarding started successfully.",

          data,
        });
    }
  );

/* =========================================================
   GET BY SELECTION
========================================================= */

const bySelection =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await onboardingService
          .getOnboardingBySelection(
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
    }
  );

/* =========================================================
   GET DETAIL
========================================================= */

const detail =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await onboardingService
          .getOnboardingById(
            req.params
              .onboardingId
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
   UPDATE
========================================================= */

const update =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await onboardingService
          .updateOnboarding({
            onboardingId:
              req.params
                .onboardingId,

            payload:
              req.body ||
              {},

            actor:
              req.user,

            actorUserId:
              req.user._id,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Onboarding information updated successfully.",

          data,
        });
    }
  );

/* =========================================================
   MANAGER OPTIONS
========================================================= */

const managers =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
  await onboardingService
    .getManagerOptions({
      search:
        req.query
          .search,

      orgUnitCode:
        req.query
          .orgUnitCode,

      departmentId:
        req.query
          .departmentId,

      limit:
        req.query
          .limit,
    });

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            employees:
              data,
          },
        });
    }
  );

/* =========================================================
   CREATE EMPLOYEE

   This happens AFTER onboarding has begun.

   It does not happen when Day 1 is confirmed.
========================================================= */

const createEmployee =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const data =
        await onboardingService
          .createEmployeeFromOnboarding({
            onboardingId:
              req.params
                .onboardingId,

            actor:
              req.user,

            actorUserId:
              req.user._id,
          });

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "Employee created and onboarding continued successfully.",

          data,
        });
    }
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  meta,

  list,

  readiness,

  start,

  bySelection,

  detail,

  update,

  managers,

  createEmployee,
};
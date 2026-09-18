const asyncHandler =
  require(
    "../utils/asyncHandler"
  );

const manpowerService =
  require(
    "./manpower.service"
  );

const {
  validateCreateManpower,
  validateApproval,
  validateRejection,
  validateAssignHr,
} =
  require(
    "./manpower.validation"
  );

/* =========================================================
   CREATE
========================================================= */

const createRequirement =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const input =
        validateCreateManpower(
          req.body
        );

      const requirement =
        await manpowerService
          .createRequirement({
            user:
              req.user,

            input,
          });

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "Manpower requirement submitted successfully",

          data: {
            requirement,
          },
        });
    }
  );

/* =========================================================
   LIST
========================================================= */

const listRequirements =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const requirements =
        await manpowerService
          .listRequirements({
            user:
              req.user,

            status:
              req.query
                .status,

            departmentId:
              req.query
                .departmentId,

            search:
              req.query
                .search,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            requirements,

            total:
              requirements.length,
          },
        });
    }
  );

/* =========================================================
   DETAILS
========================================================= */

const getRequirement =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const requirement =
        await manpowerService
          .getRequirementById(
            req.params
              .requirementId,

            req.user
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            requirement,
          },
        });
    }
  );

/* =========================================================
   APPROVAL INBOX
========================================================= */

const getApprovalInbox =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const requirements =
        await manpowerService
          .getApprovalInbox(
            req.user
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            requirements,

            total:
              requirements.length,
          },
        });
    }
  );

/* =========================================================
   APPROVE
========================================================= */

const approveRequirement =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const input =
        validateApproval(
          req.body
        );

      const requirement =
        await manpowerService
          .approveRequirement({
            requirementId:
              req.params
                .requirementId,

            user:
              req.user,

            remarks:
              input.remarks,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Manpower requirement approved successfully",

          data: {
            requirement,
          },
        });
    }
  );

/* =========================================================
   REJECT
========================================================= */

const rejectRequirement =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const input =
        validateRejection(
          req.body
        );

      const requirement =
        await manpowerService
          .rejectRequirement({
            requirementId:
              req.params
                .requirementId,

            user:
              req.user,

            reason:
              input.reason,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Manpower requirement rejected",

          data: {
            requirement,
          },
        });
    }
  );

/* =========================================================
   HR QUEUE

   All approved / active hiring visible to HR.
========================================================= */

const getHrQueue =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const requirements =
        await manpowerService
          .getHrQueue(
            req.user
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            requirements,

            total:
              requirements.length,
          },
        });
    }
  );

/* =========================================================
   HR EMPLOYEES

   Used in Hiring Owner dropdown.

   Only HR management / Global Super Admin can access.
========================================================= */

const getHrEmployees =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const employees =
        await manpowerService
          .getAvailableHrEmployees(
            req.user
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            employees,

            total:
              employees.length,
          },
        });
    }
  );

/* =========================================================
   ASSIGN / REASSIGN HR OWNER
========================================================= */

const assignHr =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const input =
        validateAssignHr(
          req.body
        );

      const requirement =
        await manpowerService
          .assignHrToRequirement({
            requirementId:
              req.params
                .requirementId,

            hrUserId:
              input.hrUserId,

            user:
              req.user,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Hiring owner assigned successfully",

          data: {
            requirement,
          },
        });
    }
  );

/* =========================================================
   MY HIRING

   Logged-in HR employee's assigned hiring requirements.
========================================================= */

const getMyHiring =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const requirements =
        await manpowerService
          .getMyHiring({
            user:
              req.user,

            status:
              req.query
                .status,

            search:
              req.query
                .search,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            requirements,

            total:
              requirements.length,
          },
        });
    }
  );

/* =========================================================
   START HIRING
========================================================= */

const startHiring =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const requirement =
        await manpowerService
          .startHiring({
            requirementId:
              req.params
                .requirementId,

            user:
              req.user,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Hiring process started",

          data: {
            requirement,
          },
        });
    }
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  createRequirement,

  listRequirements,

  getRequirement,

  getApprovalInbox,

  approveRequirement,

  rejectRequirement,

  getHrQueue,

  getHrEmployees,

  assignHr,

  getMyHiring,

  startHiring,
};
const asyncHandler =
  require(
    "../utils/asyncHandler"
  );

const departmentService =
  require(
    "./department.service"
  );

const {
  validateCreateDepartment,
  validateUpdateDepartment,
  validateMembership,
} =
  require(
    "./department.validation"
  );

/* =========================================================
   CREATE
========================================================= */

const createDepartment =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const input =
        validateCreateDepartment(
          req.body
        );

      const department =
        await departmentService
          .createDepartment({
            input,

            actorUserId:
              req.user._id,
          });

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "Department created successfully",

          data: {
            department,
          },
        });
    }
  );

/* =========================================================
   LIST
========================================================= */

const listDepartments =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const departments =
        await departmentService
          .listDepartments({
            status:
              req.query.status,

            parentDepartment:
              req.query
                .parentDepartment,

            search:
              req.query.search,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            departments,

            total:
              departments.length,
          },
        });
    }
  );

/* =========================================================
   GET ONE
========================================================= */

const getDepartment =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const department =
        await departmentService
          .getDepartmentById(
            req.params
              .departmentId
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            department,
          },
        });
    }
  );

/* =========================================================
   UPDATE
========================================================= */

const updateDepartment =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const input =
        validateUpdateDepartment(
          req.body
        );

      const department =
        await departmentService
          .updateDepartment({
            departmentId:
              req.params
                .departmentId,

            input,

            actorUserId:
              req.user._id,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Department updated successfully",

          data: {
            department,
          },
        });
    }
  );

/* =========================================================
   ARCHIVE
========================================================= */

const archiveDepartment =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const result =
        await departmentService
          .archiveDepartment({
            departmentId:
              req.params
                .departmentId,

            actorUserId:
              req.user._id,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Department archived successfully",

          data:
            result,
        });
    }
  );

/* =========================================================
   ADD / UPDATE MEMBER
========================================================= */

const upsertDepartmentMember =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const input =
        validateMembership(
          req.body
        );

      const membership =
        await departmentService
          .upsertMembership({
            departmentId:
              req.params
                .departmentId,

            input,

            actorUserId:
              req.user._id,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Department member updated successfully",

          data: {
            membership,
          },
        });
    }
  );

/* =========================================================
   MEMBERS
========================================================= */

const listDepartmentMembers =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const members =
        await departmentService
          .listDepartmentMembers(
            req.params
              .departmentId
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            members,

            total:
              members.length,
          },
        });
    }
  );

/* =========================================================
   REMOVE MEMBER
========================================================= */

const removeDepartmentMember =
  asyncHandler(
    async (
      req,
      res
    ) => {
      await departmentService
        .removeMembership({
          departmentId:
            req.params
              .departmentId,

          userId:
            req.params
              .userId,

          actorUserId:
            req.user._id,
        });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "User removed from department",
        });
    }
  );

/* =========================================================
   MY DEPARTMENTS

   Very useful for frontend dropdowns.

   Example:
   Raise Manpower Requirement page.
========================================================= */

const getMyDepartments =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const departments =
        await departmentService
          .getUserDepartmentAccess(
            req.user._id
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            departments,
          },
        });
    }
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  createDepartment,

  listDepartments,

  getDepartment,

  updateDepartment,

  archiveDepartment,

  upsertDepartmentMember,

  listDepartmentMembers,

  removeDepartmentMember,

  getMyDepartments,
};
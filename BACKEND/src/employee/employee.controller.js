const asyncHandler =
  require(
    "../utils/asyncHandler"
  );

const employeeService =
  require(
    "./employee.service"
  );

const {
  ORG_UNITS,
} =
  require(
    "../organization/organization.config"
  );

const {
  EMPLOYMENT_TYPES,
  EMPLOYEE_STATUSES,
  EMPLOYEE_SOURCES,
  EMPLOYEE_COMPANY_CODES,
} =
  require(
    "./employee.model"
  );

/* =========================================================
   CREATE
========================================================= */

const createEmployee =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const employee =
        await employeeService
          .createEmployee({
            payload:
              req.body,

            actorUserId:
              req.user
                ._id,
          });

      res
        .status(201)
        .json({
          success:
            true,

          message:
            "Employee created successfully",

          data: {
            employee,
          },
        });
    }
  );

/* =========================================================
   LIST
========================================================= */

const listEmployees =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const result =
        await employeeService
          .listEmployees({
            ...req.query,

            accessContext: {
              scope:
                req.permissionScope,

              user:
                req.user,
            },
          });

      res
        .status(200)
        .json({
          success:
            true,

          data:
            result,
        });
    }
  );

/* =========================================================
   ORGANIZATION
========================================================= */

const getOrganization =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const tree =
        await employeeService
          .getOrganizationTree();

      res
        .status(200)
        .json({
          success:
            true,

          data: {
            tree,
          },
        });
    }
  );

/* =========================================================
   META
========================================================= */

const getEmployeeMeta =
  asyncHandler(
    async (
      req,
      res
    ) => {
      res
        .status(200)
        .json({
          success:
            true,

          data: {
            organizationUnits:
              ORG_UNITS,

            employmentTypes:
              EMPLOYMENT_TYPES,

            employeeStatuses:
              EMPLOYEE_STATUSES,

            employeeSources:
              EMPLOYEE_SOURCES,

            companyCodes:
              EMPLOYEE_COMPANY_CODES,
          },
        });
    }
  );

/* =========================================================
   DETAIL
========================================================= */

const getEmployee =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const employee =
        await employeeService
          .getEmployeeById(
            req.params
              .id
          );

      res
        .status(200)
        .json({
          success:
            true,

          data: {
            employee,
          },
        });
    }
  );

/* =========================================================
   UPDATE
========================================================= */

const updateEmployee =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const employee =
        await employeeService
          .updateEmployee({
            employeeId:
              req.params
                .id,

            payload:
              req.body,

            actorUserId:
              req.user
                ._id,
          });

      res
        .status(200)
        .json({
          success:
            true,

          message:
            "Employee updated successfully",

          data: {
            employee,
          },
        });
    }
  );

/* =========================================================
   EXIT
========================================================= */

const exitEmployee =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const employee =
        await employeeService
          .deactivateEmployee({
            employeeId:
              req.params
                .id,

            actorUserId:
              req.user
                ._id,

            exitDate:
              req.body
                .exitDate,
          });

      res
        .status(200)
        .json({
          success:
            true,

          message:
            "Employee exited successfully",

          data: {
            employee,
          },
        });
    }
  );

/* =========================================================
   DIRECT REPORTS
========================================================= */

const getDirectReports =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const employees =
        await employeeService
          .getDirectReports(
            req.params
              .id
          );

      res
        .status(200)
        .json({
          success:
            true,

          data: {
            employees,
          },
        });
    }
  );

/* =========================================================
   REPORTING TREE
========================================================= */

const getReportingTree =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const tree =
        await employeeService
          .getReportingTree(
            req.params
              .id
          );

      res
        .status(200)
        .json({
          success:
            true,

          data:
            tree,
        });
    }
  );

/* =========================================================
   LINK USER
========================================================= */

const linkUser =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const employee =
        await employeeService
          .linkUserAccount({
            employeeId:
              req.params
                .id,

            userId:
              req.body
                .userId,

            actorUserId:
              req.user
                ._id,
          });

      res
        .status(200)
        .json({
          success:
            true,

          message:
            "User account linked successfully",

          data: {
            employee,
          },
        });
    }
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  createEmployee,

  listEmployees,

  getOrganization,

  getEmployeeMeta,

  getEmployee,

  updateEmployee,

  exitEmployee,

  getDirectReports,

  getReportingTree,

  linkUser,
};
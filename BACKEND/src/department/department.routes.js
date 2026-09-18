const express =
  require(
    "express"
  );

const {
  authenticate,
  authorizeRoles,
} =
  require(
    "../middleware/auth.middleware"
  );

const {
  createDepartment,
  listDepartments,
  getDepartment,
  updateDepartment,
  archiveDepartment,
  upsertDepartmentMember,
  listDepartmentMembers,
  removeDepartmentMember,
  getMyDepartments,
} =
  require(
    "./department.controller"
  );

const router =
  express.Router();

/* =========================================================
   AUTHENTICATION
========================================================= */

router.use(
  authenticate
);

/* =========================================================
   CURRENT USER

   Any authenticated user may retrieve their own
   department assignments.
========================================================= */

router.get(
  "/me",
  getMyDepartments
);

/* =========================================================
   READ DEPARTMENTS

   Initially authenticated users may read department
   names so dropdowns work.

   Sensitive member-management remains protected.
========================================================= */

router.get(
  "/",
  listDepartments
);

router.get(
  "/:departmentId",
  getDepartment
);

/* =========================================================
   GLOBAL DEPARTMENT MANAGEMENT

   Initially SUPER_ADMIN only.

   After the base structure is proven, department-level
   administrators will be allowed through contextual
   permission middleware.
========================================================= */

router.post(
  "/",
  authorizeRoles(
    "SUPER_ADMIN"
  ),
  createDepartment
);

router.patch(
  "/:departmentId",
  authorizeRoles(
    "SUPER_ADMIN"
  ),
  updateDepartment
);

router.delete(
  "/:departmentId",
  authorizeRoles(
    "SUPER_ADMIN"
  ),
  archiveDepartment
);

/* =========================================================
   MEMBERSHIP MANAGEMENT
========================================================= */

router.get(
  "/:departmentId/members",
  authorizeRoles(
    "SUPER_ADMIN"
  ),
  listDepartmentMembers
);

router.put(
  "/:departmentId/members",
  authorizeRoles(
    "SUPER_ADMIN"
  ),
  upsertDepartmentMember
);

router.delete(
  "/:departmentId/members/:userId",
  authorizeRoles(
    "SUPER_ADMIN"
  ),
  removeDepartmentMember
);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;
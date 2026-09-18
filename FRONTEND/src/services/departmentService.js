import api from "./api";

/* =========================================================
   RESPONSE HELPER
========================================================= */

const responseData = (
  response
) => {
  return (
    response?.data?.data ||
    response?.data ||
    null
  );
};

/* =========================================================
   NORMALIZE DEPARTMENT LIST
========================================================= */

const normalizeDepartmentList = (
  data
) => {
  if (
    Array.isArray(
      data
    )
  ) {
    return data;
  }

  return (
    data?.records ||
    data?.departments ||
    data?.items ||
    []
  );
};

/* =========================================================
   GET DEPARTMENTS

   Used by Manpower Request form.

   Normal users normally do NOT need to select one because
   backend automatically resolves their primary department.

   SUPER_ADMIN can select from this list.
========================================================= */

export const getDepartments =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        "/departments",
        {
          params,
        }
      );

    return normalizeDepartmentList(
      responseData(
        response
      )
    );
  };

/* =========================================================
   GET ACTIVE DEPARTMENTS
========================================================= */

export const getActiveDepartments =
  async () => {
    try {
      return await getDepartments({
        status:
          "ACTIVE",
      });
    } catch (
      error
    ) {
      /*
       * Some department APIs may not accept a status filter.
       * Retry once without it.
       */

      const departments =
        await getDepartments();

      return departments.filter(
        (
          department
        ) =>
          !department?.status ||
          String(
            department.status
          ).toUpperCase() ===
            "ACTIVE"
      );
    }
  };

/* =========================================================
   DEFAULT EXPORT
========================================================= */

const departmentService = {
  getDepartments,

  getActiveDepartments,
};

export default departmentService;
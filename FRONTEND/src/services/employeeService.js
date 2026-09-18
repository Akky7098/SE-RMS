import api from "./api";

/* =========================================================
   RESPONSE
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
   EMPLOYEE NORMALIZER
========================================================= */

export const normalizeEmployee =
  (
    employee
  ) => {
    if (
      !employee
    ) {
      return null;
    }

    /* =====================================================
       LINKED USER
    ===================================================== */

    const linkedUser =
      employee?.user &&
      typeof employee.user ===
        "object"
        ? employee.user
        : null;

    /* =====================================================
       REPORTING MANAGER
    ===================================================== */

    const reportsTo =
      employee?.reportsTo &&
      typeof employee.reportsTo ===
        "object"
        ? employee.reportsTo
        : null;

    /* =====================================================
       DEPARTMENT
    ===================================================== */

    const departmentObject =
      employee?.department &&
      typeof employee.department ===
        "object"
        ? employee.department
        : null;

    /* =====================================================
       ONBOARDING
    ===================================================== */

    const onboardingObject =
      employee?.onboarding &&
      typeof employee.onboarding ===
        "object"
        ? employee.onboarding
        : null;

    /* =====================================================
       NAME
    ===================================================== */

    const fullName =
      employee?.fullName ||
      employee?.displayName ||
      employee?.name ||
      linkedUser?.displayName ||
      "Unnamed Employee";

    /* =====================================================
       OFFICIAL EMAIL
    ===================================================== */

    const officialEmail =
      employee?.officialEmail ||
      employee?.companyEmail ||
      linkedUser?.email ||
      "";

    /* =====================================================
       PERSONAL EMAIL
    ===================================================== */

    const personalEmail =
      employee?.personalEmail ||
      employee?.secondaryEmail ||
      "";

    /* =====================================================
       DESIGNATION
    ===================================================== */

    const designation =
      typeof employee?.designation ===
        "string"
        ? employee.designation
        : employee?.designation
            ?.name ||
          employee?.designationName ||
          "Not assigned";

    /* =====================================================
       ROLE
    ===================================================== */

    const role =
      linkedUser?.role ||
      employee?.role ||
      "EMPLOYEE";

    /* =====================================================
       ORG UNIT
    ===================================================== */

    const orgUnitCode =
      employee?.orgUnitCode ||
      "";

    /* =====================================================
       DEPARTMENT NAME
    ===================================================== */

    const departmentName =
      departmentObject?.name ||
      employee?.departmentName ||
      (
        typeof employee?.department ===
          "string"
          ? employee.department
          : ""
      ) ||
      orgUnitCode ||
      "Not assigned";

    /* =====================================================
       RETURN
    ===================================================== */

    return {
      ...employee,

      /* IDS */

      id:
        employee?._id ||
        employee?.id ||
        "",

      _id:
        employee?._id ||
        employee?.id ||
        "",

      /* EMPLOYEE */

      employeeCode:
        employee?.employeeCode ||
        "",

      companyCode:
        employee?.companyCode ||
        "",

      fullName,

      name:
        fullName,

      displayName:
        fullName,

      personalEmail,

      officialEmail,

      email:
        officialEmail ||
        personalEmail,

      companyEmail:
        officialEmail,

      mobileNumber:
        employee?.mobileNumber ||
        employee?.phone ||
        "",

      phone:
        employee?.mobileNumber ||
        employee?.phone ||
        "",

      /* ORGANISATION */

      orgUnitCode,

      organizationUnit:
        orgUnitCode,

      organisationUnit:
        orgUnitCode,

      department:
        departmentObject ||
        employee?.department ||
        null,

      departmentId:
        departmentObject?._id ||
        (
          typeof employee?.department ===
            "string"
            ? employee.department
            : ""
        ),

      departmentName,

      designation,

      /* HIERARCHY */

      reportsTo:
        reportsTo ||
        employee?.reportsTo ||
        null,

      reportingManager:
        reportsTo,

      reportingManagerId:
        reportsTo?._id ||
        (
          typeof employee?.reportsTo ===
            "string"
            ? employee.reportsTo
            : ""
        ),

      reportingManagerName:
        reportsTo?.fullName ||
        reportsTo?.displayName ||
        "",

      /* LOGIN */

      user:
        linkedUser ||
        employee?.user ||
        null,

      userId:
        linkedUser?._id ||
        (
          typeof employee?.user ===
            "string"
            ? employee.user
            : ""
        ),

      role,

      /* EMPLOYMENT */

      employmentType:
        employee?.employmentType ||
        "PERMANENT",

      joiningDate:
        employee?.joiningDate ||
        null,

      workLocation:
        employee?.workLocation ||
        "",

      profilePhotoUrl:
        employee?.profilePhotoUrl ||
        "",

      biometricCode:
        employee?.biometricCode ||
        employee?.biometricId ||
        employee?.esslEmployeeId ||
        "",

      biometricId:
        employee?.biometricCode ||
        employee?.biometricId ||
        employee?.esslEmployeeId ||
        "",

      status:
        employee?.status ||
        "ACTIVE",

      /* ONBOARDING */

      onboarding:
        onboardingObject ||
        employee?.onboarding ||
        null,

      onboardingId:
        onboardingObject?._id ||
        (
          typeof employee?.onboarding ===
            "string"
            ? employee.onboarding
            : ""
        ),

      onboardingStatus:
        onboardingObject?.status ||
        employee?.onboardingStatus ||
        "",
    };
  };

/* =========================================================
   ARRAY
========================================================= */

const normalizeEmployeeArray =
  (
    records
  ) => {
    if (
      !Array.isArray(
        records
      )
    ) {
      return [];
    }

    return records
      .map(
        normalizeEmployee
      )
      .filter(
        Boolean
      );
  };

/* =========================================================
   LIST RESPONSE
========================================================= */

export const normalizeEmployeeListResponse =
  (
    response
  ) => {
    const payload =
      response?.data?.data ||
      response?.data ||
      {};

    const rawRecords =
      payload?.records ||
      payload?.employees ||
      payload?.items ||
      (
        Array.isArray(
          payload
        )
          ? payload
          : []
      );

    const records =
      normalizeEmployeeArray(
        rawRecords
      );

    const pagination =
      payload?.pagination ||
      {};

    const total =
      Number(
        pagination?.total ??
        payload?.total ??
        records.length
      );

    const limit =
      Number(
        pagination?.limit ||
        payload?.limit ||
        20
      );

    return {
      records,

      pagination: {
        page:
          Number(
            pagination?.page ||
            payload?.page ||
            1
          ),

        limit,

        total,

        pages:
          Number(
            pagination?.pages ||
            payload?.pages ||
            Math.max(
              1,
              Math.ceil(
                total /
                Math.max(
                  1,
                  limit
                )
              )
            )
          ),
      },
    };
  };

/* =========================================================
   META
========================================================= */

export const normalizeEmployeeMeta =
  (
    response
  ) => {
    const payload =
      response?.data?.data ||
      response?.data ||
      response ||
      {};

    const rawOrganizationUnits =
      payload?.organizationUnits ||
      payload?.organisationUnits ||
      payload?.orgUnits ||
      [];

    const organizationUnits =
      Array.isArray(
        rawOrganizationUnits
      )
        ? rawOrganizationUnits.map(
            (
              item
            ) => {
              if (
                typeof item ===
                "string"
              ) {
                return {
                  code:
                    item,

                  name:
                    item.replaceAll(
                      "_",
                      " "
                    ),
                };
              }

              return {
                ...item,

                code:
                  item?.code ||
                  item?.orgUnitCode ||
                  item?.value ||
                  item?._id ||
                  "",

                name:
                  item?.name ||
                  item?.label ||
                  item?.title ||
                  item?.code ||
                  item?.orgUnitCode ||
                  "",
              };
            }
          )
        : [];

    const rawDepartments =
      payload?.departments;

    const departments =
      Array.isArray(
        rawDepartments
      ) &&
      rawDepartments.length
        ? rawDepartments.map(
            (
              item
            ) => {
              if (
                typeof item ===
                "string"
              ) {
                return {
                  code:
                    item,

                  name:
                    item.replaceAll(
                      "_",
                      " "
                    ),
                };
              }

              return {
                ...item,

                id:
                  item?._id ||
                  item?.id ||
                  "",

                _id:
                  item?._id ||
                  item?.id ||
                  "",

                code:
                  item?.code ||
                  item?.value ||
                  item?._id ||
                  "",

                name:
                  item?.name ||
                  item?.label ||
                  item?.title ||
                  item?.code ||
                  "",
              };
            }
          )
        : organizationUnits;

    const rawDesignations =
      payload?.designations ||
      [];

    const designations =
      Array.isArray(
        rawDesignations
      )
        ? rawDesignations.map(
            (
              item
            ) => {
              if (
                typeof item ===
                "string"
              ) {
                return {
                  value:
                    item,

                  label:
                    item,
                };
              }

              return {
                ...item,

                value:
                  item?.value ||
                  item?.code ||
                  item?.name ||
                  item?._id ||
                  "",

                label:
                  item?.label ||
                  item?.name ||
                  item?.title ||
                  item?.value ||
                  "",
              };
            }
          )
        : [];

    const roles =
      Array.isArray(
        payload?.roles
      )
        ? payload.roles
        : [
            "SUPER_ADMIN",
            "ADMIN",
            "HEAD",
            "MANAGER",
            "EMPLOYEE",
          ];

    const rawManagers =
      payload?.managers ||
      payload?.reportingManagers ||
      [];

    const managers =
      normalizeEmployeeArray(
        rawManagers
      );

    const employmentTypes =
      Array.isArray(
        payload?.employmentTypes
      )
        ? payload.employmentTypes
        : [
            "PERMANENT",
            "PROBATION",
            "CONTRACT",
            "TRAINEE",
            "INTERN",
            "CONSULTANT",
          ];

    const statuses =
      Array.isArray(
        payload?.employeeStatuses
      )
        ? payload.employeeStatuses
        : Array.isArray(
            payload?.statuses
          )
          ? payload.statuses
          : [
              "ACTIVE",
              "INACTIVE",
              "NOTICE_PERIOD",
              "EXITED",
            ];

    return {
      ...payload,

      organizationUnits,

      organisationUnits:
        organizationUnits,

      orgUnits:
        organizationUnits,

      departments,

      designations,

      roles,

      managers,

      employmentTypes,

      statuses,
    };
  };

/* =========================================================
   GET EMPLOYEES
========================================================= */

export const getEmployees =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        "/employees",
        {
          params,
        }
      );

    return normalizeEmployeeListResponse(
      response
    );
  };

/* =========================================================
   META
========================================================= */

export const getEmployeeMeta =
  async () => {
    const response =
      await api.get(
        "/employees/meta"
      );

    return normalizeEmployeeMeta(
      response
    );
  };

/* =========================================================
   ORGANISATION
========================================================= */

export const getEmployeeOrganization =
  async () => {
    const response =
      await api.get(
        "/employees/organization"
      );

    return responseData(
      response
    ) || {};
  };

/* =========================================================
   GET EMPLOYEE
========================================================= */

export const getEmployeeById =
  async (
    employeeId
  ) => {
    if (
      !employeeId
    ) {
      throw new Error(
        "Employee ID is required"
      );
    }

    const response =
      await api.get(
        `/employees/${employeeId}`
      );

    const payload =
      responseData(
        response
      );

    return normalizeEmployee(
      payload?.employee ||
      payload
    );
  };

/* =========================================================
   BUILD PAYLOAD
========================================================= */

export const buildEmployeePayload =
  (
    form = {}
  ) => {
    const payload = {
      employeeCode:
        String(
          form?.employeeCode ||
          ""
        )
          .trim()
          .toUpperCase(),

      companyCode:
        String(
          form?.companyCode ||
          ""
        )
          .trim()
          .toUpperCase(),

      fullName:
        String(
          form?.fullName ||
          form?.name ||
          form?.displayName ||
          ""
        ).trim(),

      personalEmail:
        String(
          form?.personalEmail ||
          form?.secondaryEmail ||
          ""
        )
          .trim()
          .toLowerCase() ||
        null,

      officialEmail:
        String(
          form?.officialEmail ||
          form?.companyEmail ||
          ""
        )
          .trim()
          .toLowerCase() ||
        null,

      mobileNumber:
        String(
          form?.mobileNumber ||
          form?.phone ||
          ""
        ).trim() ||
        null,

      orgUnitCode:
        String(
          form?.orgUnitCode ||
          form?.organizationUnit ||
          form?.organisationUnit ||
          ""
        ).trim(),

      designation:
        String(
          typeof form?.designation ===
            "object"
            ? form?.designation?.value ||
              form?.designation?.name ||
              ""
            : form?.designation ||
              ""
        ).trim(),

      department:
        (
          typeof form?.department ===
            "object"
            ? form?.department?._id ||
              form?.department?.id
            : form?.department
        ) ||
        null,

      reportsTo:
        (
          typeof form?.reportsTo ===
            "object"
            ? form?.reportsTo?._id ||
              form?.reportsTo?.id
            : form?.reportsTo
        ) ||
        (
          typeof form?.reportingManager ===
            "object"
            ? form?.reportingManager?._id ||
              form?.reportingManager?.id
            : form?.reportingManager
        ) ||
        null,

      employmentType:
        String(
          form?.employmentType ||
          "PERMANENT"
        ).toUpperCase(),

      joiningDate:
        form?.joiningDate ||
        null,

      workLocation:
        String(
          form?.workLocation ||
          ""
        ).trim() ||
        null,

      status:
        String(
          form?.status ||
          "ACTIVE"
        ).toUpperCase(),
    };

    if (
      !payload.companyCode
    ) {
      delete payload.companyCode;
    }

    if (
      !payload.department
    ) {
      delete payload.department;
    }

    if (
      form?.role
    ) {
      payload.role =
        String(
          form.role
        ).toUpperCase();
    }

    if (
      form?.biometricCode ||
      form?.biometricId
    ) {
      payload.biometricCode =
        String(
          form?.biometricCode ||
          form?.biometricId
        ).trim();
    }

    if (
      form?.profilePhotoUrl
    ) {
      payload.profilePhotoUrl =
        String(
          form.profilePhotoUrl
        ).trim();
    }

    return payload;
  };

/* =========================================================
   CREATE
========================================================= */

export const createEmployee =
  async (
    form
  ) => {
    const response =
      await api.post(
        "/employees",
        buildEmployeePayload(
          form
        )
      );

    const data =
      responseData(
        response
      );

    return {
      ...data,

      employee:
        normalizeEmployee(
          data?.employee ||
          data
        ),
    };
  };

/* =========================================================
   UPDATE
========================================================= */

export const updateEmployee =
  async (
    employeeId,
    form
  ) => {
    if (
      !employeeId
    ) {
      throw new Error(
        "Employee ID is required"
      );
    }

    const response =
      await api.patch(
        `/employees/${employeeId}`,
        buildEmployeePayload(
          form
        )
      );

    const data =
      responseData(
        response
      );

    return normalizeEmployee(
      data?.employee ||
      data
    );
  };

/* =========================================================
   STATUS
========================================================= */

export const updateEmployeeStatus =
  async (
    employeeId,
    status
  ) => {
    const response =
      await api.patch(
        `/employees/${employeeId}`,
        {
          status:
            String(
              status ||
              ""
            ).toUpperCase(),
        }
      );

    const data =
      responseData(
        response
      );

    return normalizeEmployee(
      data?.employee ||
      data
    );
  };

/* =========================================================
   EXIT
========================================================= */

export const exitEmployee =
  async (
    employeeId,
    payload = {}
  ) => {
    if (
      !employeeId
    ) {
      throw new Error(
        "Employee ID is required"
      );
    }

    const response =
      await api.patch(
        `/employees/${employeeId}/exit`,
        payload
      );

    return responseData(
      response
    );
  };

/* =========================================================
   LINK USER
========================================================= */

export const linkEmployeeUser =
  async (
    employeeId,
    userId
  ) => {
    const response =
      await api.patch(
        `/employees/${employeeId}/link-user`,
        {
          userId,
        }
      );

    return responseData(
      response
    );
  };

/* =========================================================
   DIRECT REPORTS
========================================================= */

export const getDirectReports =
  async (
    employeeId
  ) => {
    const response =
      await api.get(
        `/employees/${employeeId}/direct-reports`
      );

    const payload =
      responseData(
        response
      ) || [];

    return normalizeEmployeeArray(
      payload?.records ||
      payload?.employees ||
      payload
    );
  };

/* =========================================================
   REPORTING TREE
========================================================= */

export const getReportingTree =
  async (
    employeeId
  ) => {
    const response =
      await api.get(
        `/employees/${employeeId}/reporting-tree`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   DEFAULT
========================================================= */

const employeeService = {
  normalizeEmployee,

  getEmployees,

  getEmployeeMeta,

  getEmployeeOrganization,

  getEmployeeById,

  createEmployee,

  updateEmployee,

  updateEmployeeStatus,

  exitEmployee,

  linkEmployeeUser,

  getDirectReports,

  getReportingTree,
};

export default employeeService;
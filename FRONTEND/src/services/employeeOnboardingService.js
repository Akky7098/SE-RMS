import api from "./api";

/* =========================================================
   RESPONSE
========================================================= */

const responseData =
  (
    response
  ) =>
    response?.data?.data ||
    response?.data ||
    null;

/* =========================================================
   OBJECT ID
========================================================= */

const objectId =
  (
    value
  ) => {
    if (
      !value
    ) {
      return null;
    }

    if (
      typeof value ===
        "object"
    ) {
      return (
        value._id ||
        value.id ||
        null
      );
    }

    return value;
  };

/* =========================================================
   LIST
========================================================= */

export const getOnboardingList =
  async ({
    page = 1,
    limit = 20,
    search,
    stage,
  } = {}) => {
    const params = {
      page,
      limit,
    };

    if (
      search
    ) {
      params.search =
        search;
    }

    if (
      stage
    ) {
      params.stage =
        stage;
    }

    const response =
      await api.get(
        "/employee-onboarding",
        {
          params,
        }
      );

    return responseData(
      response
    );
  };

/* =========================================================
   META
========================================================= */

export const getOnboardingMeta =
  async () => {
    const response =
      await api.get(
        "/employee-onboarding/meta"
      );

    return responseData(
      response
    );
  };

/* =========================================================
   MANAGERS
========================================================= */

export const getOnboardingManagers =
  async ({
    search,
    orgUnitCode,
    departmentId,
    limit = 100,
  } = {}) => {
    const params = {
      limit,
    };

    if (
      search
    ) {
      params.search =
        search;
    }

    if (
      orgUnitCode
    ) {
      params.orgUnitCode =
        orgUnitCode;
    }

    if (
      departmentId
    ) {
      params.departmentId =
        departmentId;
    }

    const response =
      await api.get(
        "/employee-onboarding/managers",
        {
          params,
        }
      );

    const data =
      responseData(
        response
      );

    return (
      data?.employees ||
      data?.records ||
      []
    );
  };

/* =========================================================
   READINESS BY SELECTION
========================================================= */

export const getOnboardingReadiness =
  async (
    selectionId
  ) => {
    if (
      !selectionId
    ) {
      throw new Error(
        "Selection ID is required."
      );
    }

    const response =
      await api.get(
        `/employee-onboarding/selection/${selectionId}/readiness`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   START
========================================================= */

export const startEmployeeOnboarding =
  async (
    selectionId
  ) => {
    if (
      !selectionId
    ) {
      throw new Error(
        "Selection ID is required."
      );
    }

    const response =
      await api.post(
        `/employee-onboarding/selection/${selectionId}/start`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   GET BY SELECTION
========================================================= */

export const getOnboardingBySelection =
  async (
    selectionId
  ) => {
    if (
      !selectionId
    ) {
      throw new Error(
        "Selection ID is required."
      );
    }

    const response =
      await api.get(
        `/employee-onboarding/selection/${selectionId}`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   GET BY ONBOARDING ID

   IMPORTANT:
   This endpoint expects EmployeeOnboarding._id,
   NOT Employee._id.
========================================================= */

export const getOnboardingById =
  async (
    onboardingId
  ) => {
    if (
      !onboardingId
    ) {
      return null;
    }

    const response =
      await api.get(
        `/employee-onboarding/${onboardingId}`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   GET BY EMPLOYEE ID

   THIS FIXES YOUR CURRENT 404.

   EmployeeOnboardingPage URL:

   /people/employees/:employeeId/onboarding

   Therefore the page gives us Employee._id.

   We first load Employee, get employee.onboarding,
   and only then call the onboarding detail endpoint.
========================================================= */

export const getEmployeeOnboarding =
  async (
    employeeId
  ) => {
    if (
      !employeeId
    ) {
      throw new Error(
        "Employee ID is required."
      );
    }

    /* =====================================================
       STEP 1 — EMPLOYEE
    ===================================================== */

    const employeeResponse =
      await api.get(
        `/employees/${employeeId}`
      );

    const employeeData =
      responseData(
        employeeResponse
      );

    /*
     * Employee controller may return:
     *
     * data: { employee }
     *
     * OR directly:
     *
     * data: employee
     */
    const employee =
      employeeData?.employee ||
      employeeData;

    if (
      !employee
    ) {
      throw new Error(
        "Employee record could not be loaded."
      );
    }

    /* =====================================================
       STEP 2 — ONBOARDING REFERENCE
    ===================================================== */

    const onboardingId =
      objectId(
        employee.onboarding
      );

    /*
     * A manually-created / legacy employee may legitimately
     * have no onboarding record.
     *
     * Do NOT convert that into a page-breaking 404.
     */
    if (
      !onboardingId
    ) {
      return null;
    }

    /* =====================================================
       STEP 3 — ONBOARDING
    ===================================================== */

    try {
      return await getOnboardingById(
        onboardingId
      );
    } catch (
      error
    ) {
      /*
       * If the Employee exists but historical onboarding
       * record is unavailable, don't crash the entire
       * employee workspace.
       */
      if (
        error?.response
          ?.status ===
        404
      ) {
        return null;
      }

      throw error;
    }
  };

/* =========================================================
   UPDATE
========================================================= */

export const updateOnboarding =
  async (
    onboardingId,
    payload = {}
  ) => {
    if (
      !onboardingId
    ) {
      throw new Error(
        "Onboarding ID is required."
      );
    }

    const response =
      await api.patch(
        `/employee-onboarding/${onboardingId}`,
        payload
      );

    return responseData(
      response
    );
  };

/* =========================================================
   CREATE EMPLOYEE
========================================================= */

export const createEmployeeFromOnboarding =
  async (
    onboardingId
  ) => {
    if (
      !onboardingId
    ) {
      throw new Error(
        "Onboarding ID is required."
      );
    }

    const response =
      await api.post(
        `/employee-onboarding/${onboardingId}/create-employee`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   UPDATE BY EMPLOYEE

   Compatibility helper.

   Resolve Employee -> Onboarding ID first.
========================================================= */

export const updateEmployeeOnboarding =
  async (
    employeeId,
    payload = {}
  ) => {
    if (
      !employeeId
    ) {
      throw new Error(
        "Employee ID is required."
      );
    }

    const employeeResponse =
      await api.get(
        `/employees/${employeeId}`
      );

    const employeeData =
      responseData(
        employeeResponse
      );

    const employee =
      employeeData?.employee ||
      employeeData;

    const onboardingId =
      objectId(
        employee?.onboarding
      );

    if (
      !onboardingId
    ) {
      throw new Error(
        "Employee onboarding record is not linked."
      );
    }

    return updateOnboarding(
      onboardingId,
      payload
    );
  };

/* =========================================================
   CHECKLIST

   Existing backend currently updates checklist/status
   through normal onboarding PATCH.
========================================================= */

export const updateOnboardingChecklist =
  async (
    employeeId,
    payload = {}
  ) => {
    return updateEmployeeOnboarding(
      employeeId,
      payload
    );
  };

/* =========================================================
   HISTORY
========================================================= */

export const getOnboardingHistory =
  async (
    employeeId
  ) => {
    const onboarding =
      await getEmployeeOnboarding(
        employeeId
      );

    return (
      onboarding?.auditTrail ||
      onboarding?.history ||
      []
    );
  };

/* =========================================================
   DEFAULT
========================================================= */

const employeeOnboardingService = {
  getOnboardingList,

  getOnboardingMeta,

  getOnboardingManagers,

  getOnboardingReadiness,

  startEmployeeOnboarding,

  getOnboardingBySelection,

  getOnboardingById,

  getEmployeeOnboarding,

  updateOnboarding,

  updateEmployeeOnboarding,

  updateOnboardingChecklist,

  createEmployeeFromOnboarding,

  getOnboardingHistory,
};

export default employeeOnboardingService;
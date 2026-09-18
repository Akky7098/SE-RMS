import api from "./api";

/* =========================================================
   RESPONSE HELPERS
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
   ARRAY NORMALIZER

   Supports current and future backend response shapes.

   Accepted:
   []
   { requirements: [] }
   { records: [] }
   { items: [] }
   { data: [] }
========================================================= */

const normalizeArray = (
  data,
  keys = []
) => {
  if (
    Array.isArray(
      data
    )
  ) {
    return data;
  }

  for (
    const key of keys
  ) {
    if (
      Array.isArray(
        data?.[key]
      )
    ) {
      return data[
        key
      ];
    }
  }

  return [];
};

/* =========================================================
   REQUIREMENT RESPONSE NORMALIZER
========================================================= */

const normalizeRequirement =
  (
    data
  ) => {
    return (
      data?.requirement ||
      data?.manpowerRequirement ||
      data ||
      null
    );
  };

/* =========================================================
   MANPOWER REQUIREMENTS

   GET
   /api/v1/manpower

   IMPORTANT:
   Returns BOTH:
   records
   requirements

   This keeps existing frontend screens compatible and
   avoids response-shape bugs.
========================================================= */

export const getManpowerRequirements =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        "/manpower",
        {
          params,
        }
      );

    const data =
      responseData(
        response
      );

    const records =
      normalizeArray(
        data,
        [
          "requirements",
          "records",
          "items",
          "data",
        ]
      );

    return {
      /*
       * Preferred generic collection key.
       */
      records,

      /*
       * Backward-compatible manpower-specific key.
       */
      requirements:
        records,

      pagination:
        data?.pagination ||
        null,

      meta:
        data?.meta ||
        {},

      raw:
        data,
    };
  };

/* =========================================================
   SINGLE MANPOWER REQUIREMENT

   GET
   /api/v1/manpower/:requirementId
========================================================= */

export const getManpowerRequirement =
  async (
    requirementId
  ) => {
    if (
      !requirementId
    ) {
      throw new Error(
        "Requirement ID is required"
      );
    }

    const response =
      await api.get(
        `/manpower/${requirementId}`
      );

    return normalizeRequirement(
      responseData(
        response
      )
    );
  };

/* =========================================================
   CREATE MANPOWER REQUIREMENT

   POST
   /api/v1/manpower
========================================================= */

export const createManpowerRequirement =
  async (
    payload = {}
  ) => {
    const response =
      await api.post(
        "/manpower",
        payload
      );

    return normalizeRequirement(
      responseData(
        response
      )
    );
  };

/* =========================================================
   APPROVAL INBOX

   GET
   /api/v1/manpower/approvals/inbox

   Backend is responsible for deciding who is actually
   allowed to approve.

   Frontend must never manufacture approval authority.
========================================================= */

export const getManpowerApprovalInbox =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        "/manpower/approvals/inbox",
        {
          params,
        }
      );

    const data =
      responseData(
        response
      );

    return normalizeArray(
      data,
      [
        "requirements",
        "approvals",
        "records",
        "items",
        "data",
      ]
    );
  };

/* =========================================================
   APPROVE REQUIREMENT

   POST
   /api/v1/manpower/:requirementId/approve
========================================================= */

export const approveManpowerRequirement =
  async (
    requirementId,
    payload = {}
  ) => {
    if (
      !requirementId
    ) {
      throw new Error(
        "Requirement ID is required"
      );
    }

    const response =
      await api.post(
        `/manpower/${requirementId}/approve`,
        payload
      );

    return normalizeRequirement(
      responseData(
        response
      )
    );
  };

/* =========================================================
   REJECT REQUIREMENT

   POST
   /api/v1/manpower/:requirementId/reject
========================================================= */

export const rejectManpowerRequirement =
  async (
    requirementId,
    payload = {}
  ) => {
    if (
      !requirementId
    ) {
      throw new Error(
        "Requirement ID is required"
      );
    }

    const response =
      await api.post(
        `/manpower/${requirementId}/reject`,
        payload
      );

    return normalizeRequirement(
      responseData(
        response
      )
    );
  };

/* =========================================================
   HR HIRING QUEUE

   GET
   /api/v1/manpower/hr/queue
========================================================= */

export const getHrHiringQueue =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        "/manpower/hr/queue",
        {
          params,
        }
      );

    const data =
      responseData(
        response
      );

    return normalizeArray(
      data,
      [
        "requirements",
        "queue",
        "records",
        "items",
        "data",
      ]
    );
  };

/* =========================================================
   AVAILABLE HR EMPLOYEES

   GET
   /api/v1/manpower/hr/employees
========================================================= */

export const getAvailableHrEmployees =
  async () => {
    const response =
      await api.get(
        "/manpower/hr/employees"
      );

    const data =
      responseData(
        response
      );

    return normalizeArray(
      data,
      [
        "employees",
        "hrEmployees",
        "members",
        "records",
        "items",
        "data",
      ]
    );
  };

/* =========================================================
   ASSIGN / REASSIGN HR OWNER

   PATCH
   /api/v1/manpower/:requirementId/assign-hr
========================================================= */

export const assignHrToRequirement =
  async (
    requirementId,
    hrUserId
  ) => {
    if (
      !requirementId
    ) {
      throw new Error(
        "Requirement ID is required"
      );
    }

    if (
      !hrUserId
    ) {
      throw new Error(
        "HR employee is required"
      );
    }

    const response =
      await api.patch(
        `/manpower/${requirementId}/assign-hr`,
        {
          hrUserId,
        }
      );

    return normalizeRequirement(
      responseData(
        response
      )
    );
  };

/* =========================================================
   START HIRING

   POST
   /api/v1/manpower/:requirementId/start-hiring
========================================================= */

export const startManpowerHiring =
  async (
    requirementId
  ) => {
    if (
      !requirementId
    ) {
      throw new Error(
        "Requirement ID is required"
      );
    }

    const response =
      await api.post(
        `/manpower/${requirementId}/start-hiring`,
        {}
      );

    return normalizeRequirement(
      responseData(
        response
      )
    );
  };

/* =========================================================
   MY HIRING

   GET
   /api/v1/manpower/hr/my-hiring
========================================================= */

export const getMyHiring =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        "/manpower/hr/my-hiring",
        {
          params,
        }
      );

    const data =
      responseData(
        response
      );

    return normalizeArray(
      data,
      [
        "requirements",
        "hiring",
        "records",
        "items",
        "data",
      ]
    );
  };

/* =========================================================
   COMPATIBILITY ALIASES
========================================================= */

export const getHiringQueue =
  getHrHiringQueue;

export const getHrEmployees =
  getAvailableHrEmployees;

export const assignHiringOwner =
  assignHrToRequirement;

export const startHiring =
  startManpowerHiring;

/* =========================================================
   DEFAULT EXPORT
========================================================= */

const manpowerService = {
  getManpowerRequirements,

  getManpowerRequirement,

  createManpowerRequirement,

  getManpowerApprovalInbox,

  approveManpowerRequirement,

  rejectManpowerRequirement,

  getHrHiringQueue,

  getHiringQueue,

  getAvailableHrEmployees,

  getHrEmployees,

  assignHrToRequirement,

  assignHiringOwner,

  startManpowerHiring,

  startHiring,

  getMyHiring,
};

export default manpowerService;
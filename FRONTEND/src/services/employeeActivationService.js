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
   SAFE EMPLOYEE
========================================================= */

const getEmployee =
  async (
    employeeId
  ) => {
    const response =
      await api.get(
        `/employees/${employeeId}`
      );

    const data =
      responseData(
        response
      );

    return (
      data?.employee ||
      data ||
      null
    );
  };

/* =========================================================
   LOCAL READINESS FALLBACK

   IMPORTANT:

   The onboarding page must NEVER crash simply because
   activation readiness backend has not been mounted yet.

   We can safely calculate a display-readiness result from
   the Employee + EmployeeOnboarding checklist.

   Backend activation remains authoritative when actually
   activating the employee.
========================================================= */

const getLocalReadiness =
  async (
    employeeId
  ) => {
    const employee =
      await getEmployee(
        employeeId
      );

    if (
      !employee
    ) {
      return {
        ready:
          false,

        progress:
          0,

        blocking: [
          {
            key:
              "EMPLOYEE",

            label:
              "Employee record is unavailable",
          },
        ],
      };
    }

    const onboardingId =
      objectId(
        employee.onboarding
      );

    let onboarding =
      null;

    if (
      onboardingId
    ) {
      try {
        const response =
          await api.get(
            `/employee-onboarding/${onboardingId}`
          );

        onboarding =
          responseData(
            response
          );
      } catch (
        error
      ) {
        /*
         * Readiness remains usable even if the optional
         * onboarding record cannot be loaded.
         */
        if (
          error?.response
            ?.status !==
          404
        ) {
          throw error;
        }
      }
    }

    const checklist =
      onboarding?.checklist ||
      {};

    /* =====================================================
       NORMALIZED CHECKS
    ===================================================== */

    const employeeCreated =
      Boolean(
        employee?._id
      );

    const accessComplete =
      Boolean(
        employee?.user ||
        checklist?.rmsAccess ||
        checklist?.access
      );

    const documentsComplete =
      Boolean(
        checklist?.employeeDocuments ||
        checklist?.documents
      );

    const assetsComplete =
      Boolean(
        checklist?.assets
      );

    const appointmentComplete =
      Boolean(
        checklist?.appointmentLetter
      );

    const welcomeComplete =
      Boolean(
        checklist?.welcomeCommunication ||
        checklist?.welcomeMail
      );

    const checks = [
      {
        key:
          "EMPLOYEE",

        label:
          "Employee record",

        complete:
          employeeCreated,
      },

      {
        key:
          "ACCESS",

        label:
          "SE-RMS access",

        complete:
          accessComplete,
      },

      {
        key:
          "DOCUMENTS",

        label:
          "Employee documents",

        complete:
          documentsComplete,
      },

      {
        key:
          "ASSETS",

        label:
          "Asset formalities",

        complete:
          assetsComplete,
      },

      {
        key:
          "APPOINTMENT",

        label:
          "Appointment Letter",

        complete:
          appointmentComplete,
      },

      {
        key:
          "WELCOME",

        label:
          "Welcome communication",

        complete:
          welcomeComplete,
      },
    ];

    const completed =
      checks.filter(
        (
          item
        ) =>
          item.complete
      ).length;

    const progress =
      Math.round(
        (
          completed /
          checks.length
        ) *
          100
      );

    const blocking =
      checks
        .filter(
          (
            item
          ) =>
            !item.complete
        )
        .map(
          (
            item
          ) => ({
            key:
              item.key,

            label:
              item.label,
          })
        );

    return {
      ready:
        blocking.length ===
        0,

      progress,

      blocking,

      checks,

      source:
        "LOCAL_FALLBACK",
    };
  };

/* =========================================================
   READINESS

   PRIMARY:
   Backend activation readiness.

   FALLBACK:
   Employee/onboarding checklist.

   This means a missing readiness endpoint can no longer
   destroy the entire onboarding page.
========================================================= */

export const getEmployeeActivationReadiness =
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

    try {
      const response =
        await api.get(
          `/employee-activation/${employeeId}/readiness`
        );

      const data =
        responseData(
          response
        );

      if (
        data
      ) {
        return {
          ...data,

          ready:
            Boolean(
              data.ready
            ),

          progress:
            Number.isFinite(
              Number(
                data.progress
              )
            )
              ? Number(
                  data.progress
                )
              : 0,

          blocking:
            Array.isArray(
              data.blocking
            )
              ? data.blocking
              : [],
        };
      }
    } catch (
      error
    ) {
      /*
       * 404 means activation backend route is not available
       * yet or no activation record exists.
       *
       * Do NOT break onboarding page.
       */
      if (
        error?.response
          ?.status !==
        404
      ) {
        throw error;
      }
    }

    return getLocalReadiness(
      employeeId
    );
  };

/* =========================================================
   ALIAS

   Keeps compatibility with any older component that imports
   getActivationReadiness.
========================================================= */

export const getActivationReadiness =
  getEmployeeActivationReadiness;

/* =========================================================
   ACTIVATE EMPLOYEE

   This remains a controlled backend action.

   We DO NOT locally fake activation.
========================================================= */

export const activateEmployee =
  async (
    employeeId,
    remarks =
      ""
  ) => {
    if (
      !employeeId
    ) {
      throw new Error(
        "Employee ID is required."
      );
    }

    const response =
      await api.post(
        `/employee-activation/${employeeId}/activate`,
        {
          remarks,
        }
      );

    return responseData(
      response
    );
  };

/* =========================================================
   DEFAULT
========================================================= */

const employeeActivationService = {
  getEmployeeActivationReadiness,

  getActivationReadiness,

  activateEmployee,
};

export default employeeActivationService;
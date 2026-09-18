const mongoose =
  require(
    "mongoose"
  );

const {
  Employee,
} =
  require(
    "../employee.model"
  );

const {
  EmployeeOnboarding,
} =
  require(
    "../onboarding/onboarding.model"
  );

const {
  EmployeeAccess,
} =
  require(
    "../access/employeeAccess.model"
  );

const ApiError =
  require(
    "../../utils/ApiError"
  );

/* =========================================================
   OPTIONAL RECRUITMENT MODELS

   Activation must not crash if statuses differ between
   earlier and newer versions of Recruitment.
========================================================= */

let Selection =
  null;

let Joining =
  null;

try {
  ({
    Selection,
  } =
    require(
      "../../selection/selection.model"
    ));
} catch {
  Selection =
    null;
}

try {
  ({
    Joining,
  } =
    require(
      "../../selection/joining/joining.model"
    ));
} catch {
  Joining =
    null;
}

/* =========================================================
   HELPERS
========================================================= */

const validId =
  (
    value
  ) =>
    mongoose.Types
      .ObjectId
      .isValid(
        value
      );

/* =========================================================
   EMPLOYEE
========================================================= */

const getEmployee =
  async (
    employeeId
  ) => {
    if (
      !validId(
        employeeId
      )
    ) {
      throw new ApiError(
        400,
        "Invalid Employee ID."
      );
    }

    const employee =
      await Employee
        .findById(
          employeeId
        )
        .populate(
          "department",
          "name code"
        )
        .populate(
          "reportsTo",
          "employeeCode fullName designation officialEmail"
        )
        .populate(
          "user",
          "displayName email status role systemRole authProviders lastLoginAt"
        );

    if (
      !employee
    ) {
      throw new ApiError(
        404,
        "Employee not found."
      );
    }

    return employee;
  };

/* =========================================================
   READINESS
========================================================= */

const getActivationReadiness =
  async (
    employeeId
  ) => {
    const employee =
      await getEmployee(
        employeeId
      );

    if (
      !employee.onboarding
    ) {
      return {
        ready:
          false,

        reason:
          "ONBOARDING_NOT_FOUND",

        employee,

        checks:
          [],
      };
    }

    const onboarding =
      await EmployeeOnboarding
        .findById(
          employee.onboarding
        )
        .lean();

    if (
      !onboarding
    ) {
      throw new ApiError(
        404,
        "Employee onboarding record not found."
      );
    }

    const access =
      await EmployeeAccess
        .findOne({
          employee:
            employee._id,
        })
        .lean();

    /* =====================================================
       REQUIRED CHECKS

       welcomeCommunication intentionally remains required.

       It will become true after we build the Mail Service
       next.
    ===================================================== */

    const checks = [
      {
        key:
          "employeeProfile",

        label:
          "Employee Profile",

        complete:
          Boolean(
            onboarding
              .checklist
              ?.employeeProfile
          ),

        required:
          true,
      },

      {
        key:
          "reportingHierarchy",

        label:
          "Reporting Manager",

        complete:
          Boolean(
            employee.reportsTo &&
            onboarding
              .checklist
              ?.reportingHierarchy
          ),

        required:
          true,
      },

      {
        key:
          "employeeDocuments",

        label:
          "Employee Documents",

        complete:
          Boolean(
            onboarding
              .checklist
              ?.employeeDocuments
          ),

        required:
          true,
      },

      {
        key:
          "assets",

        label:
          "Asset Formalities",

        complete:
          Boolean(
            onboarding
              .checklist
              ?.assets
          ),

        required:
          true,
      },

      {
        key:
          "appointmentLetter",

        label:
          "Appointment Letter",

        complete:
          Boolean(
            onboarding
              .checklist
              ?.appointmentLetter
          ),

        required:
          true,
      },

      {
        key:
          "officialEmail",

        label:
          "Official Email",

        complete:
          Boolean(
            employee
              .officialEmail &&
            onboarding
              .checklist
              ?.officialEmail
          ),

        required:
          true,
      },

      {
        key:
          "rmsAccess",

        label:
          "SE-RMS Access",

        complete:
          Boolean(
            employee.user &&
            access?.user &&
            onboarding
              .checklist
              ?.rmsAccess
          ),

        required:
          true,
      },

      {
        key:
          "welcomeCommunication",

        label:
          "Welcome / Access Communication",

        complete:
          Boolean(
            onboarding
              .checklist
              ?.welcomeCommunication
          ),

        required:
          true,
      },

      /*
       * We display Company Documents but do not make them a
       * hard activation blocker yet because we have not
       * defined your final mandatory NDA/company-document
       * policy.

       * Later we can change required:true.
       */
      {
        key:
          "companyDocuments",

        label:
          "Company Signed Documents",

        complete:
          Boolean(
            onboarding
              .checklist
              ?.companyDocuments
          ),

        required:
          false,
      },
    ];

    const blocking =
      checks.filter(
        (
          check
        ) =>
          check.required &&
          !check.complete
      );

    const requiredChecks =
      checks.filter(
        (
          check
        ) =>
          check.required
      );

    const completedRequired =
      requiredChecks.filter(
        (
          check
        ) =>
          check.complete
      ).length;

    const progress =
      requiredChecks.length
        ? Math.round(
            (
              completedRequired /
              requiredChecks.length
            ) *
              100
          )
        : 0;

    return {
      ready:
        blocking.length ===
        0,

      employee: {
        _id:
          employee._id,

        employeeCode:
          employee
            .employeeCode,

        fullName:
          employee
            .fullName,

        designation:
          employee
            .designation,

        companyCode:
          employee
            .companyCode,

        status:
          employee
            .status,

        officialEmail:
          employee
            .officialEmail,

        department:
          employee
            .department,

        reportsTo:
          employee
            .reportsTo,

        joiningDate:
          employee
            .joiningDate,
      },

      onboarding: {
        _id:
          onboarding._id,

        status:
          onboarding.status,
      },

      access: {
        status:
          access?.status ||
          null,

        loginEmail:
          access
            ?.loginEmail ||
          "",

        accessMailSentAt:
          access
            ?.accessMailSentAt ||
          null,

        welcomeMailSentAt:
          access
            ?.welcomeMailSentAt ||
          null,
      },

      progress,

      checks,

      blocking:
        blocking.map(
          (
            check
          ) => ({
            key:
              check.key,

            label:
              check.label,
          })
        ),
    };
  };

/* =========================================================
   SAFE RECRUITMENT COMPLETION
========================================================= */

const safelyCompleteRecruitment =
  async (
    onboarding
  ) => {
    /* =====================================================
       SELECTION

       Only write COMPLETED if the currently installed
       Selection schema supports that enum value.
    ===================================================== */

    if (
      Selection &&
      onboarding.selection
    ) {
      try {
        const statusPath =
          Selection
            .schema
            .path(
              "status"
            );

        const allowed =
          statusPath
            ?.enumValues ||
          [];

        if (
          allowed.includes(
            "COMPLETED"
          )
        ) {
          await Selection
            .findByIdAndUpdate(
              onboarding
                .selection,
              {
                status:
                  "COMPLETED",
              }
            );
        }
      } catch {
        // Employee activation must not fail due to
        // historical recruitment schema differences.
      }
    }

    /* =====================================================
       JOINING
    ===================================================== */

    if (
      Joining &&
      onboarding.joining
    ) {
      try {
        const statusPath =
          Joining
            .schema
            .path(
              "status"
            );

        const allowed =
          statusPath
            ?.enumValues ||
          [];

        if (
          allowed.includes(
            "COMPLETED"
          )
        ) {
          await Joining
            .findByIdAndUpdate(
              onboarding
                .joining,
              {
                status:
                  "COMPLETED",
              }
            );
        }
      } catch {
        // Same compatibility rule.
      }
    }
  };

/* =========================================================
   ACTIVATE
========================================================= */

const activateEmployee =
  async ({
    employeeId,
    remarks =
      "",
    actorUserId,
  }) => {
    const readiness =
      await getActivationReadiness(
        employeeId
      );

    if (
      !readiness.ready
    ) {
      throw new ApiError(
        409,
        "Employee onboarding is not complete.",
        {
          progress:
            readiness
              .progress,

          blocking:
            readiness
              .blocking,
        }
      );
    }

    const employee =
      await Employee
        .findById(
          employeeId
        );

    const onboarding =
      await EmployeeOnboarding
        .findById(
          employee.onboarding
        );

    if (
      employee.status ===
      "ACTIVE" &&
      onboarding.status ===
      "COMPLETED"
    ) {
      return getActivationReadiness(
        employee._id
      );
    }

    /* =====================================================
       EMPLOYEE
    ===================================================== */

    employee.status =
      "ACTIVE";

    employee.updatedBy =
      actorUserId;

    await employee.save();

    /* =====================================================
       ONBOARDING
    ===================================================== */

    onboarding.status =
      "COMPLETED";

    onboarding.completedAt =
      onboarding.completedAt ||
      new Date();

    onboarding.updatedBy =
      actorUserId;

    onboarding.auditTrail.push({
      event:
        "ONBOARDING_COMPLETED",

      remarks:
        String(
          remarks ||
          "All onboarding formalities completed. Employee activated."
        ).trim(),

      performedBy:
        actorUserId,

      metadata: {
        employeeId:
          employee._id,

        employeeCode:
          employee.employeeCode,

        activatedAt:
          new Date(),
      },
    });

    await onboarding.save();

    /* =====================================================
       USER

       Access was already created earlier.

       Ensure account is ACTIVE.
    ===================================================== */

    if (
      employee.user
    ) {
      const {
        User,
      } =
        require(
          "../../user/user.model"
        );

      await User
        .findByIdAndUpdate(
          employee.user,
          {
            status:
              "ACTIVE",

            updatedBy:
              actorUserId,
          }
        );
    }

    /* =====================================================
       RECRUITMENT

       Compatibility-safe.
    ===================================================== */

    await safelyCompleteRecruitment(
      onboarding
    );

    return {
      activated:
        true,

      activatedAt:
        onboarding
          .completedAt,

      employee: {
        _id:
          employee._id,

        employeeCode:
          employee
            .employeeCode,

        fullName:
          employee
            .fullName,

        status:
          employee
            .status,
      },

      onboarding: {
        _id:
          onboarding._id,

        status:
          onboarding.status,

        completedAt:
          onboarding
            .completedAt,
      },
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getActivationReadiness,

  activateEmployee,
};
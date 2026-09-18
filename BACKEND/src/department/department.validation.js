const mongoose =
  require("mongoose");

const ApiError =
  require(
    "../utils/ApiError"
  );

const {
  DEPARTMENT_ROLES,
} =
  require(
    "../access/access.model"
  );

/* =========================================================
   OBJECT ID
========================================================= */

const validateObjectId =
  (
    value,
    fieldName
  ) => {
    if (
      value ===
        null ||
      value ===
        undefined ||
      value ===
        ""
    ) {
      return null;
    }

    if (
      !mongoose.Types.ObjectId
        .isValid(
          value
        )
    ) {
      throw new ApiError(
        400,
        `${fieldName} is invalid`
      );
    }

    return value;
  };

/* =========================================================
   CREATE DEPARTMENT
========================================================= */

const validateCreateDepartment =
  (
    body = {}
  ) => {
    const name =
      String(
        body.name ||
          ""
      ).trim();

    if (
      !name
    ) {
      throw new ApiError(
        400,
        "Department name is required"
      );
    }

    if (
      name.length <
        2
    ) {
      throw new ApiError(
        400,
        "Department name must contain at least 2 characters"
      );
    }

    const parentDepartment =
      validateObjectId(
        body.parentDepartment,
        "Parent department"
      );

    return {
      name,

      description:
        String(
          body.description ||
            ""
        ).trim(),

      parentDepartment,

      displayOrder:
        Number.isFinite(
          Number(
            body.displayOrder
          )
        )
          ? Number(
              body.displayOrder
            )
          : 0,
    };
  };

/* =========================================================
   UPDATE DEPARTMENT
========================================================= */

const validateUpdateDepartment =
  (
    body = {}
  ) => {
    const result =
      {};

    if (
      body.name !==
        undefined
    ) {
      const name =
        String(
          body.name ||
            ""
        ).trim();

      if (
        name.length <
          2
      ) {
        throw new ApiError(
          400,
          "Department name must contain at least 2 characters"
        );
      }

      result.name =
        name;
    }

    if (
      body.description !==
        undefined
    ) {
      result.description =
        String(
          body.description ||
            ""
        ).trim();
    }

    if (
      body.parentDepartment !==
        undefined
    ) {
      result.parentDepartment =
        validateObjectId(
          body.parentDepartment,
          "Parent department"
        );
    }

    if (
      body.displayOrder !==
        undefined
    ) {
      result.displayOrder =
        Number(
          body.displayOrder
        ) || 0;
    }

    if (
      body.status !==
        undefined
    ) {
      const status =
        String(
          body.status
        )
          .trim()
          .toUpperCase();

      if (
        ![
          "ACTIVE",
          "INACTIVE",
          "ARCHIVED",
        ].includes(
          status
        )
      ) {
        throw new ApiError(
          400,
          "Invalid department status"
        );
      }

      result.status =
        status;
    }

    return result;
  };

/* =========================================================
   MEMBERSHIP
========================================================= */

const validateMembership =
  (
    body = {}
  ) => {
    const user =
      validateObjectId(
        body.user,
        "User"
      );

    if (
      !user
    ) {
      throw new ApiError(
        400,
        "User is required"
      );
    }

    const role =
      String(
        body.role ||
          "MEMBER"
      )
        .trim()
        .toUpperCase();

    if (
      !DEPARTMENT_ROLES.includes(
        role
      )
    ) {
      throw new ApiError(
        400,
        "Invalid department role"
      );
    }

    return {
      user,

      role,

      isPrimary:
        Boolean(
          body.isPrimary
        ),
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  validateObjectId,

  validateCreateDepartment,

  validateUpdateDepartment,

  validateMembership,
};
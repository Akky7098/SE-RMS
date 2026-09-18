const mongoose =
  require(
    "mongoose"
  );

const ApiError =
  require(
    "../utils/ApiError"
  );

const {
  EMPLOYMENT_TYPES,
  MANPOWER_PRIORITIES,
} =
  require(
    "./manpowerRequirement.model"
  );

/* =========================================================
   HELPERS
========================================================= */

const optionalNumber =
  (
    value,
    fieldName
  ) => {
    if (
      value ===
        undefined ||
      value ===
        null ||
      value ===
        ""
    ) {
      return null;
    }

    const number =
      Number(
        value
      );

    if (
      !Number.isFinite(
        number
      )
    ) {
      throw new ApiError(
        400,
        `${fieldName} must be a valid number`
      );
    }

    return number;
  };

const optionalObjectId =
  (
    value,
    fieldName
  ) => {
    if (!value) {
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
   CREATE
========================================================= */

const validateCreateManpower =
  (
    body = {}
  ) => {
    const positionTitle =
      String(
        body.positionTitle ||
          ""
      ).trim();

    if (
      !positionTitle
    ) {
      throw new ApiError(
        400,
        "Position title is required"
      );
    }

    const numberOfOpenings =
      Number(
        body.numberOfOpenings ||
          1
      );

    if (
      !Number.isInteger(
        numberOfOpenings
      ) ||
      numberOfOpenings <
        1
    ) {
      throw new ApiError(
        400,
        "Number of openings must be at least 1"
      );
    }

    const reason =
      String(
        body.reason ||
          ""
      ).trim();

    if (!reason) {
      throw new ApiError(
        400,
        "Requirement reason is required"
      );
    }

    const minimumExperienceYears =
      optionalNumber(
        body.minimumExperienceYears,
        "Minimum experience"
      ) ??
      0;

    const maximumExperienceYears =
      optionalNumber(
        body.maximumExperienceYears,
        "Maximum experience"
      );

    if (
      maximumExperienceYears !==
        null &&
      maximumExperienceYears <
        minimumExperienceYears
    ) {
      throw new ApiError(
        400,
        "Maximum experience cannot be lower than minimum experience"
      );
    }

    const budgetMin =
      optionalNumber(
        body.budgetMin,
        "Minimum budget"
      );

    const budgetMax =
      optionalNumber(
        body.budgetMax,
        "Maximum budget"
      );

    if (
      budgetMin !==
        null &&
      budgetMax !==
        null &&
      budgetMax <
        budgetMin
    ) {
      throw new ApiError(
        400,
        "Maximum budget cannot be lower than minimum budget"
      );
    }

    const employmentType =
      String(
        body.employmentType ||
          "FULL_TIME"
      )
        .trim()
        .toUpperCase();

    if (
      !EMPLOYMENT_TYPES.includes(
        employmentType
      )
    ) {
      throw new ApiError(
        400,
        "Invalid employment type"
      );
    }

    const priority =
      String(
        body.priority ||
          "NORMAL"
      )
        .trim()
        .toUpperCase();

    if (
      !MANPOWER_PRIORITIES.includes(
        priority
      )
    ) {
      throw new ApiError(
        400,
        "Invalid manpower priority"
      );
    }

    const requiredSkills =
      Array.isArray(
        body.requiredSkills
      )
        ? [
            ...new Set(
              body.requiredSkills
                .map(
                  (
                    skill
                  ) =>
                    String(
                      skill
                    ).trim()
                )
                .filter(
                  Boolean
                )
            ),
          ]
        : [];

    let requiredByDate =
      null;

    if (
      body.requiredByDate
    ) {
      requiredByDate =
        new Date(
          body.requiredByDate
        );

      if (
        Number.isNaN(
          requiredByDate
            .getTime()
        )
      ) {
        throw new ApiError(
          400,
          "Required by date is invalid"
        );
      }
    }

    return {
      /*
       * Usually omitted.
       *
       * SUPER_ADMIN may select a department.
       * Normal user gets primary department automatically.
       */

      department:
        optionalObjectId(
          body.department,
          "Department"
        ),

      positionTitle,

      numberOfOpenings,

      requiredSkills,

      minimumExperienceYears,

      maximumExperienceYears,

      budgetMin,

      budgetMax,

      currency:
        String(
          body.currency ||
            "INR"
        )
          .trim()
          .toUpperCase(),

      employmentType,

      location:
        String(
          body.location ||
            ""
        ).trim(),

      requiredByDate,

      reason,

      priority,
    };
  };

/* =========================================================
   APPROVAL
========================================================= */

const validateApproval =
  (
    body = {}
  ) => ({
    remarks:
      String(
        body.remarks ||
          ""
      ).trim(),
  });

/* =========================================================
   REJECTION
========================================================= */

const validateRejection =
  (
    body = {}
  ) => {
    const reason =
      String(
        body.reason ||
          body.remarks ||
          ""
      ).trim();

    if (!reason) {
      throw new ApiError(
        400,
        "Rejection reason is required"
      );
    }

    return {
      reason,
    };
  };

/* =========================================================
   ASSIGN HR

   Expected:
   {
     "hrUserId": "ObjectId"
   }
========================================================= */

const validateAssignHr =
  (
    body = {}
  ) => {
    const hrUserId =
      String(
        body.hrUserId ||
          ""
      ).trim();

    if (!hrUserId) {
      throw new ApiError(
        400,
        "HR employee is required"
      );
    }

    if (
      !mongoose.Types.ObjectId
        .isValid(
          hrUserId
        )
    ) {
      throw new ApiError(
        400,
        "HR employee ID is invalid"
      );
    }

    return {
      hrUserId,
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  validateCreateManpower,

  validateApproval,

  validateRejection,

  validateAssignHr,
};
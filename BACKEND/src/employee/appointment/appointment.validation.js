const ApiError =
  require(
    "../../utils/ApiError"
  );

/* =========================================================
   DATE
========================================================= */

const parseDate =
  (
    value,
    fieldName
  ) => {
    if (!value) {
      return null;
    }

    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      throw new ApiError(
        400,
        `${fieldName} is invalid.`
      );
    }

    return date;
  };

/* =========================================================
   GENERATE
========================================================= */

const validateGenerateAppointment =
  (
    payload = {}
  ) => {
    return {
      issueDate:
        parseDate(
          payload.issueDate ||
          new Date(),
          "Issue date"
        ),
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  parseDate,

  validateGenerateAppointment,
};
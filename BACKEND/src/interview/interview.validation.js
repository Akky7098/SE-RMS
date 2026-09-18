const mongoose =
  require("mongoose");

const ApiError =
  require("../utils/ApiError");

const {
  INTERVIEW_MODES,
  OFFICE_LOCATIONS,
} = require(
  "./interview.model"
);

const {
  RECOMMENDATIONS,
  FINAL_DECISIONS,
} = require(
  "./interviewEvaluation.model"
);

/* =========================================================
   HELPERS
========================================================= */

const cleanString =
  (value) => {
    if (
      value === undefined ||
      value === null
    ) {
      return "";
    }

    return String(value).trim();
  };

const requireObjectId =
  (
    value,
    message
  ) => {
    if (
      !mongoose.Types.ObjectId
        .isValid(value)
    ) {
      throw new ApiError(
        400,
        message
      );
    }

    return value;
  };

/* =========================================================
   INDIA DATE/TIME

   Input:
   2026-09-02
   11:30

   Stored internally as real Date.
========================================================= */

const createIndiaDateTime =
  (
    date,
    time
  ) => {
    const cleanDate =
      cleanString(date);

    const cleanTime =
      cleanString(time);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        cleanDate
      )
    ) {
      throw new ApiError(
        400,
        "Interview date must be YYYY-MM-DD"
      );
    }

    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(
        cleanTime
      )
    ) {
      throw new ApiError(
        400,
        "Interview time must be HH:mm"
      );
    }

    /*
     * India currently uses UTC+05:30 and does not
     * observe daylight saving time.
     */

    const value =
      new Date(
        `${cleanDate}T${cleanTime}:00+05:30`
      );

    if (
      Number.isNaN(
        value.getTime()
      )
    ) {
      throw new ApiError(
        400,
        "Invalid interview date/time"
      );
    }

    return value;
  };

/* =========================================================
   SCHEDULE
========================================================= */

const validateScheduleInterview =
  (body = {}) => {
    const mode =
      cleanString(
        body.mode
      ).toUpperCase();

    const officeLocation =
      cleanString(
        body.officeLocation
      ).toUpperCase();

    const roundNumber =
      Number(
        body.roundNumber
      );

    const durationMinutes =
      body.durationMinutes ===
        undefined
        ? 30
        : Number(
            body.durationMinutes
          );

    if (
      !Number.isInteger(
        roundNumber
      ) ||
      roundNumber < 1 ||
      roundNumber > 10
    ) {
      throw new ApiError(
        400,
        "Valid interview round number is required"
      );
    }

    if (
      !INTERVIEW_MODES.includes(
        mode
      )
    ) {
      throw new ApiError(
        400,
        "Invalid interview mode"
      );
    }

    if (
      mode ===
        "IN_PERSON" &&
      !OFFICE_LOCATIONS.includes(
        officeLocation
      )
    ) {
      throw new ApiError(
        400,
        "Please select Delhi or Sonipat office"
      );
    }

    if (
      mode ===
        "ONLINE" &&
      !cleanString(
        body.meetingLink
      )
    ) {
      throw new ApiError(
        400,
        "Meeting link is required for online interview"
      );
    }

    if (
      !Number.isFinite(
        durationMinutes
      ) ||
      durationMinutes < 10 ||
      durationMinutes > 480
    ) {
      throw new ApiError(
        400,
        "Interview duration must be between 10 and 480 minutes"
      );
    }

    requireObjectId(
      body.interviewer,
      "Valid interviewer is required"
    );

    const scheduledAt =
      createIndiaDateTime(
        body.interviewDate,
        body.interviewTime
      );

    if (
      scheduledAt.getTime() <=
      Date.now()
    ) {
      throw new ApiError(
        400,
        "Interview date/time must be in the future"
      );
    }

    return {
      roundNumber,

      roundName:
        cleanString(
          body.roundName
        ),

      mode,

      officeLocation:
        mode ===
        "IN_PERSON"
          ? officeLocation
          : "",

      meetingLink:
        mode === "ONLINE"
          ? cleanString(
              body.meetingLink
            )
          : "",

      scheduledAt,

      durationMinutes,

      interviewer:
        body.interviewer,

      remarks:
        cleanString(
          body.remarks
        ),
    };
  };

/* =========================================================
   RESCHEDULE
========================================================= */

const validateRescheduleInterview =
  (body = {}) => {
    const scheduledAt =
      createIndiaDateTime(
        body.interviewDate,
        body.interviewTime
      );

    if (
      scheduledAt.getTime() <=
      Date.now()
    ) {
      throw new ApiError(
        400,
        "New interview date/time must be in the future"
      );
    }

    const interviewer =
      body.interviewer
        ? requireObjectId(
            body.interviewer,
            "Invalid interviewer"
          )
        : null;

    return {
      scheduledAt,

      interviewer,

      remarks:
        cleanString(
          body.remarks
        ),
    };
  };

/* =========================================================
   EVALUATION
========================================================= */

const validateEvaluation =
  (body = {}) => {
    const ratingFields = [
      "technicalSkills",
      "relevantExperience",
      "communication",
      "problemSolving",
      "roleFit",
      "professionalism",
      "overallRating",
    ];

    const data = {};

    for (
      const field of ratingFields
    ) {
      const value =
        Number(body[field]);

      if (
        !Number.isFinite(value) ||
        value < 1 ||
        value > 5
      ) {
        throw new ApiError(
          400,
          `${field} rating must be between 1 and 5`
        );
      }

      data[field] =
        value;
    }

    const recommendation =
      cleanString(
        body.recommendation
      ).toUpperCase();

    const finalDecision =
      cleanString(
        body.finalDecision
      ).toUpperCase();

    if (
      !RECOMMENDATIONS.includes(
        recommendation
      )
    ) {
      throw new ApiError(
        400,
        "Invalid interview recommendation"
      );
    }

    if (
      !FINAL_DECISIONS.includes(
        finalDecision
      )
    ) {
      throw new ApiError(
        400,
        "Invalid final interview decision"
      );
    }

    return {
      ...data,

      recommendation,

      finalDecision,

      strengths:
        cleanString(
          body.strengths
        ),

      concerns:
        cleanString(
          body.concerns
        ),

      remarks:
        cleanString(
          body.remarks
        ),
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  validateScheduleInterview,

  validateRescheduleInterview,

  validateEvaluation,

  createIndiaDateTime,
};
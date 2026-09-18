const ApiError =
  require("../utils/ApiError");

const {
  CANDIDATE_SOURCES,
} = require(
  "./candidate.model"
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

    return String(
      value
    ).trim();
  };

const normalizeEmail =
  (value) =>
    cleanString(
      value
    ).toLowerCase();

const normalizeMobile =
  (value) =>
    cleanString(
      value
    ).replace(
      /[^0-9+]/g,
      ""
    );

/* =========================================================
   CREATE CANDIDATE
========================================================= */

const validateCreateCandidate =
  (body = {}) => {
    const data = {
      fullName:
        cleanString(
          body.fullName
        ),

      mobile:
        normalizeMobile(
          body.mobile
        ),

      email:
        normalizeEmail(
          body.email
        ),

      city:
        cleanString(
          body.city
        ),

      state:
        cleanString(
          body.state
        ),

      currentCompany:
        cleanString(
          body.currentCompany
        ),

      currentDesignation:
        cleanString(
          body.currentDesignation
        ),

      totalExperienceYears:
        body.totalExperienceYears ??
        null,

      relevantExperienceYears:
        body.relevantExperienceYears ??
        null,

      currentSalary:
        body.currentSalary ??
        null,

      expectedSalary:
        body.expectedSalary ??
        null,

      noticePeriodDays:
        body.noticePeriodDays ??
        null,

      earliestJoiningDate:
        body.earliestJoiningDate ||
        null,

      skills:
        Array.isArray(
          body.skills
        )
          ? body.skills
              .map(
                cleanString
              )
              .filter(
                Boolean
              )
          : [],

      education:
        Array.isArray(
          body.education
        )
          ? body.education
          : [],

      experienceHistory:
        Array.isArray(
          body.experienceHistory
        )
          ? body.experienceHistory
          : [],

      source:
        cleanString(
          body.source
        ).toUpperCase() ||
        "OTHER",

      sourceDetail:
        cleanString(
          body.sourceDetail
        ),

      referredBy:
        cleanString(
          body.referredBy
        ),

      resume:
        body.resume || {},
    };

    if (
      !data.fullName
    ) {
      throw new ApiError(
        400,
        "Candidate name is required"
      );
    }

    /*
     * We require at least one contact method.
     */
    if (
      !data.mobile &&
      !data.email
    ) {
      throw new ApiError(
        400,
        "Candidate mobile or email is required"
      );
    }

    if (
      !CANDIDATE_SOURCES.includes(
        data.source
      )
    ) {
      throw new ApiError(
        400,
        "Invalid candidate source"
      );
    }

    return data;
  };

/* =========================================================
   SCREENING
========================================================= */

const validateScreening =
  (body = {}) => {
    const interested =
      cleanString(
        body.interested
      ).toUpperCase();

    const result =
      cleanString(
        body.result
      ).toUpperCase();

    const allowedInterest = [
      "YES",
      "NO",
      "FOLLOW_UP",
      "UNKNOWN",
    ];

    const allowedResults = [
      "PENDING",
      "SHORTLIST",
      "HOLD",
      "REJECT",
    ];

    if (
      !allowedInterest.includes(
        interested
      )
    ) {
      throw new ApiError(
        400,
        "Invalid interested value"
      );
    }

    if (
      !allowedResults.includes(
        result
      )
    ) {
      throw new ApiError(
        400,
        "Invalid screening result"
      );
    }

    if (
      interested ===
        "FOLLOW_UP" &&
      !body.followUpAt
    ) {
      throw new ApiError(
        400,
        "Follow-up date/time is required"
      );
    }

    return {
      ...body,
      interested,
      result,
    };
  };

module.exports = {
  validateCreateCandidate,
  validateScreening,
  normalizeEmail,
  normalizeMobile,
};
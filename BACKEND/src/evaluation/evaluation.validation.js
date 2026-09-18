const {
  RECOMMENDATIONS,
  FINAL_DECISIONS,
} =
  require(
    "../interview/interviewEvaluation.model"
  );

const ApiError =
  require(
    "../utils/ApiError"
  );

/* =========================================================
   TEXT
========================================================= */

const cleanText =
  (
    value,
    maxLength =
      3000
  ) =>
    String(
      value ||
        ""
    )
      .trim()
      .slice(
        0,
        maxLength
      );

/* =========================================================
   EVALUATION INPUT
========================================================= */

const validateEvaluationInput =
  (
    body = {}
  ) => {
    const ratingFields = [
      "technicalSkills",
      "relevantExperience",
      "communication",
      "problemSolving",
      "roleFit",
      "professionalism",
      "overallRating",
    ];

    const ratings =
      {};

    ratingFields.forEach(
      (
        field
      ) => {
        const value =
          Number(
            body[
              field
            ]
          );

        if (
          !Number.isFinite(
            value
          ) ||
          value <
            1 ||
          value >
            5
        ) {
          throw new ApiError(
            400,
            `${field} must be between 1 and 5`
          );
        }

        ratings[
          field
        ] =
          value;
      }
    );

    const recommendation =
      String(
        body.recommendation ||
          ""
      )
        .trim()
        .toUpperCase();

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

    const finalDecision =
      String(
        body.finalDecision ||
          ""
      )
        .trim()
        .toUpperCase();

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
      ...ratings,

      recommendation,

      finalDecision,

      strengths:
        cleanText(
          body.strengths
        ),

      concerns:
        cleanText(
          body.concerns
        ),

      remarks:
        cleanText(
          body.remarks
        ),

      attachment:
        body
          ?.attachment
          ?.storedName
          ? {
              storedName:
                cleanText(
                  body
                    .attachment
                    .storedName,
                  300
                ),

              originalName:
                cleanText(
                  body
                    .attachment
                    .originalName,
                  300
                ),

              mimeType:
                cleanText(
                  body
                    .attachment
                    .mimeType,
                  150
                ),

              size:
                Number(
                  body
                    .attachment
                    .size ||
                    0
                ),
            }
          : null,
    };
  };

/* =========================================================
   LIST FILTER
========================================================= */

const normalizeEvaluationFilter =
  (
    query = {}
  ) => {
    const decision =
      String(
        query.decision ||
          query.finalDecision ||
          ""
      )
        .trim()
        .toUpperCase();

    const allowedDecisions = [
      "",
      "ALL",
      "SELECTED",
      "HOLD",
      "REJECTED",
    ];

    if (
      !allowedDecisions.includes(
        decision
      )
    ) {
      throw new ApiError(
        400,
        "Invalid evaluation decision filter"
      );
    }

    const page =
      Math.max(
        1,
        Number(
          query.page ||
            1
        )
      );

    const limit =
      Math.min(
        100,
        Math.max(
          1,
          Number(
            query.limit ||
              25
          )
        )
      );

    return {
      decision,

      search:
        String(
          query.search ||
            ""
        )
          .trim()
          .slice(
            0,
            150
          ),

      page,

      limit,
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  validateEvaluationInput,

  normalizeEvaluationFilter,
};
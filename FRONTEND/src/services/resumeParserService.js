import api from "./api";

/* =========================================================
   HELPERS
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

const safeObject = (
  value
) => {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  ) {
    return value;
  }

  return {};
};

const safeArray = (
  value
) => {
  return Array.isArray(
    value
  )
    ? value
    : [];
};

/* =========================================================
   PARSE RESUME

   POST
   /api/v1/resume-parser/parse

   IMPORTANT:
   Field name MUST remain "resume"
   because backend Multer uses:
   .single("resume")
========================================================= */

export const parseCandidateResume =
  async (
    file,
    requirementId = "",
    {
      onUploadProgress,
    } = {}
  ) => {
    /* =====================================================
       VALIDATION
    ===================================================== */

    if (
      !file
    ) {
      throw new Error(
        "Resume PDF is required"
      );
    }

    const id =
      String(
        requirementId ||
          ""
      ).trim();

    if (
      !id
    ) {
      throw new Error(
        "Hiring requirement ID is required"
      );
    }

    /* =====================================================
       FORM DATA
    ===================================================== */

    const formData =
      new FormData();

    /*
     * MUST match:
     *
     * multer.single("resume")
     */
    formData.append(
      "resume",
      file,
      file.name
    );

    formData.append(
      "requirementId",
      id
    );

    /*
     * Compatibility alias.
     *
     * Current controller reads requirementId,
     * but this does not hurt older implementations.
     */
    formData.append(
      "manpowerRequirementId",
      id
    );

    /* =====================================================
       REQUEST
    ===================================================== */

    const response =
      await api.post(
        "/resume-parser/parse",
        formData,
        {
          /*
           * IMPORTANT FOR YOUR API INSTANCE:
           *
           * api.js likely defaults normal requests to
           * application/json.
           *
           * Resume upload MUST explicitly override that.
           *
           * Axios/browser will still generate the multipart
           * boundary for FormData.
           */
          headers: {
            "Content-Type":
              "multipart/form-data",
          },

          /* =================================================
             REAL NETWORK UPLOAD PROGRESS
          ================================================= */

          onUploadProgress: (
            progressEvent
          ) => {
            const loaded =
              Number(
                progressEvent
                  ?.loaded ||
                  0
              );

            const total =
              Number(
                progressEvent
                  ?.total ||
                  file?.size ||
                  0
              );

            if (
              total <=
              0
            ) {
              return;
            }

            const percent =
              Math.max(
                0,
                Math.min(
                  100,
                  Math.round(
                    (
                      loaded /
                      total
                    ) *
                      100
                  )
                )
              );

            onUploadProgress?.(
              percent,
              {
                loaded,
                total,
              }
            );
          },
        }
      );

    return responseData(
      response
    );
  };

/* =========================================================
   DELETE TEMPORARY RESUME

   DELETE
   /api/v1/resume-parser/temporary
========================================================= */

export const deleteTemporaryResume =
  async (
    tempFileName
  ) => {
    const name =
      String(
        tempFileName ||
          ""
      ).trim();

    if (
      !name
    ) {
      return null;
    }

    const response =
      await api.delete(
        "/resume-parser/temporary",
        {
          data: {
            tempFileName:
              name,
          },
        }
      );

    return responseData(
      response
    );
  };

/* =========================================================
   GET CANDIDATE RESUME URL
========================================================= */

export const getCandidateResumeUrl =
  (
    candidateId
  ) => {
    const id =
      String(
        candidateId ||
          ""
      ).trim();

    if (
      !id
    ) {
      return "";
    }

    const baseURL =
      String(
        api?.defaults
          ?.baseURL ||
          ""
      ).replace(
        /\/$/,
        ""
      );

    return `${baseURL}/resume-parser/candidate-resume/${id}`;
  };

/* =========================================================
   NORMALIZE CANDIDATE
========================================================= */

const normalizeCandidate = (
  value
) => {
    const source =
      safeObject(
        value
      );

    return {
      ...source,

      fullName:
        source?.fullName ||
        source?.name ||
        "",

      mobile:
        source?.mobile ||
        source?.phone ||
        source?.phoneNumber ||
        "",

      alternateMobile:
        source
          ?.alternateMobile ||
        "",

      email:
        source?.email ||
        "",

      city:
        source?.city ||
        source
          ?.location
          ?.city ||
        "",

      state:
        source?.state ||
        source
          ?.location
          ?.state ||
        "",

      currentCompany:
        source
          ?.currentCompany ||
        source?.company ||
        "",

      currentDesignation:
        source
          ?.currentDesignation ||
        source
          ?.designation ||
        source?.jobTitle ||
        "",

      totalExperienceYears:
        source
          ?.totalExperienceYears ??
        source
          ?.experienceYears ??
        source
          ?.totalExperience ??
        null,

      relevantExperienceYears:
        source
          ?.relevantExperienceYears ??
        null,

      currentSalary:
        source
          ?.currentSalary ??
        null,

      expectedSalary:
        source
          ?.expectedSalary ??
        null,

      noticePeriodDays:
        source
          ?.noticePeriodDays ??
        null,

      earliestJoiningDate:
        source
          ?.earliestJoiningDate ||
        null,

      skills:
        safeArray(
          source?.skills
        ),

      experienceHistory:
        safeArray(
          source
            ?.experienceHistory
        ),

      education:
        safeArray(
          source
            ?.education
        ),

      educationText:
        safeArray(
          source
            ?.educationText
        ),

      profileSummary:
        source
          ?.profileSummary ||
        "",

      linkedIn:
        source?.linkedIn ||
        "",
    };
  };

/* =========================================================
   NORMALIZE RESUME PARSER RESULT
========================================================= */

export const normalizeResumeParseResult =
  (
    raw = {}
  ) => {
    const root =
      safeObject(
        raw
      );

    /* =====================================================
       CANDIDATE
    ===================================================== */

    const parsed =
      normalizeCandidate(
        root?.candidate ||
        root
          ?.parsedCandidate ||
        root?.parsedData ||
        root?.fields ||
        root?.data
          ?.candidate ||
        {}
      );

    /* =====================================================
       RESUME
    ===================================================== */

    const resume =
      safeObject(
        root?.resume ||
        root
          ?.temporaryResume ||
        root?.file ||
        root?.data
          ?.resume ||
        {}
      );

    /* =====================================================
       REQUIREMENT
    ===================================================== */

    const requirement =
      safeObject(
        root
          ?.requirement ||
        root
          ?.manpowerRequirement ||
        root?.data
          ?.requirement ||
        {}
      );

    /* =====================================================
       DUPLICATE
    ===================================================== */

    const duplicateRaw =
      safeObject(
        root?.duplicate ||
        root
          ?.duplicateCheck ||
        root?.data
          ?.duplicate ||
        {}
      );

    const duplicateCandidate =
      duplicateRaw
        ?.candidate ||
      duplicateRaw
        ?.existingCandidate ||
      null;

    const duplicateFound =
      Boolean(
        duplicateRaw
          ?.found ===
          true ||
        duplicateRaw
          ?.duplicate ===
          true ||
        duplicateRaw
          ?.isDuplicate ===
          true ||
        duplicateCandidate
          ?._id
      );

    const duplicate = {
      ...duplicateRaw,

      found:
        duplicateFound,

      duplicate:
        duplicateFound,

      candidate:
        duplicateCandidate,
    };

    /* =====================================================
       MATCH
    ===================================================== */

    const matchRaw =
      safeObject(
        root?.match ||
        root?.matching ||
        root
          ?.requirementMatch ||
        root?.data
          ?.match ||
        {}
      );

    const rawOverallScore =
      Number(
        matchRaw
          ?.overallScore ??
        matchRaw
          ?.matchScore ??
        0
      );

    const rawSkillScore =
      Number(
        matchRaw
          ?.skillScore ??
        0
      );

    const matching = {
      ...matchRaw,

      overallScore:
        Number.isFinite(
          rawOverallScore
        )
          ? rawOverallScore
          : 0,

      /*
       * Compatibility alias.
       */
      matchScore:
        Number.isFinite(
          rawOverallScore
        )
          ? rawOverallScore
          : 0,

      skillScore:
        Number.isFinite(
          rawSkillScore
        )
          ? rawSkillScore
          : 0,

      matchedSkills:
        safeArray(
          matchRaw
            ?.matchedSkills
        ),

      missingSkills:
        safeArray(
          matchRaw
            ?.missingSkills
        ),

      experience:
        safeObject(
          matchRaw
            ?.experience
        ),

      location:
        safeObject(
          matchRaw
            ?.location
        ),
    };

    /* =====================================================
       REVIEW FIELDS
    ===================================================== */

    const reviewFields =
      safeArray(
        root
          ?.reviewFields ||
        root?.data
          ?.reviewFields
      );

    /* =====================================================
       PARSER META
    ===================================================== */

    const parserRaw =
      safeObject(
        root
          ?.parserMeta ||
        root?.data
          ?.parserMeta ||
        {}
      );

    const confidence =
      Number(
        parserRaw
          ?.confidence ||
        0
      );

    const reviewCount =
      Number(
        parserRaw
          ?.reviewCount ??
        reviewFields.length
      );

    const parserMeta = {
      ...parserRaw,

      confidence:
        Number.isFinite(
          confidence
        )
          ? Math.max(
              0,
              Math.min(
                100,
                confidence
              )
            )
          : 0,

      reviewCount:
        Number.isFinite(
          reviewCount
        )
          ? reviewCount
          : reviewFields.length,

      needsReview:
        Boolean(
          parserRaw
            ?.needsReview
        ),

      provider:
        parserRaw
          ?.provider ||
        "LOCAL_PDF_PARSER",

      version:
        parserRaw
          ?.version ||
        "",
    };

    /* =====================================================
       RETURN
    ===================================================== */

    return {
      raw:
        root,

      parsed,

      resume,

      requirement,

      duplicate,

      matching,

      reviewFields,

      parserMeta,
    };
  };

/* =========================================================
   EXPORT
========================================================= */

const resumeParserService = {
  parseCandidateResume,

  deleteTemporaryResume,

  getCandidateResumeUrl,

  normalizeResumeParseResult,
};

export default resumeParserService;
const ApiError =
  require(
    "../../utils/ApiError"
  );

const {
  cleanText,
} =
  require(
    "../common/documentHelpers"
  );

/* =========================================================
   OFFICE
========================================================= */

const getOfficeDetails =
  (
    value
  ) => {
    const code =
      String(
        value ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      code ===
        "DELHI"
    ) {
      return {
        code:
          "DELHI",

        label:
          "Delhi Office (H.Q.)",

        address:
          process.env
            .INTERVIEW_OFFICE_DELHI_ADDRESS ||
          "C-5, Ashok Vihar Phase 1 Rd, Pocket C, Ashok Vihar, New Delhi, Delhi 110052",
      };
    }

    if (
      code ===
        "SONIPAT"
    ) {
      return {
        code:
          "SONIPAT",

        label:
          "Sonipat Office",

        address:
          process.env
            .INTERVIEW_OFFICE_SONIPAT_ADDRESS ||
          "42-43 Milestone, Village Ashamabad, National Highway 1, Sector 29, Sonipat, Haryana 131021",
      };
    }

    return null;
  };

/* =========================================================
   RESOLVE LOI VARIABLES
========================================================= */

const resolveLoiVariables =
  ({
    candidate,
    selection,
    requirement,
    overrides = {},
  }) => {
    if (
      !candidate
    ) {
      throw new ApiError(
        400,
        "Candidate information is required"
      );
    }

    const candidateName =
      cleanText(
        candidate.fullName
      );

    const position =
      cleanText(
        selection
          ?.positionTitle ||
        candidate
          ?.positionTitle ||
        requirement
          ?.positionTitle
      );

    const email =
      cleanText(
        candidate.email
      );

    const mobile =
      cleanText(
        candidate.mobile
      );

    const officeCode =
      cleanText(
        overrides
          ?.officeLocation ||
        selection
          ?.officeLocation ||
        requirement
          ?.officeLocation ||
        requirement
          ?.location
      ).toUpperCase();

    const office =
      getOfficeDetails(
        officeCode
      );

    const proposedJoiningDate =
      overrides
        ?.proposedJoiningDate ||
      selection
        ?.proposedJoiningDate ||
      null;

    /* =====================================================
       ONLY CRITICAL MISSING DATA

       This list is what frontend can use to decide whether
       a small modal is required.
    ===================================================== */

    const missingFields =
      [];

    if (
      !candidateName
    ) {
      missingFields.push({
        field:
          "candidateName",

        label:
          "Candidate Name",
      });
    }

    if (
      !position
    ) {
      missingFields.push({
        field:
          "positionTitle",

        label:
          "Position",
      });
    }

    if (
      !office
    ) {
      missingFields.push({
        field:
          "officeLocation",

        label:
          "Office Location",

        options: [
          {
            value:
              "DELHI",

            label:
              "Delhi Office",
          },

          {
            value:
              "SONIPAT",

            label:
              "Sonipat Office",
          },
        ],
      });
    }

    if (
      !proposedJoiningDate
    ) {
      missingFields.push({
        field:
          "proposedJoiningDate",

        label:
          "Proposed Joining Date",

        type:
          "date",
      });
    }

    return {
      missingFields,

      data: {
        candidateName,

        salutation:
          cleanText(
            overrides
              ?.salutation ||
            candidate
              ?.salutation,
            "Mr./Ms."
          ),

        fatherName:
          cleanText(
            candidate
              ?.fatherName
          ),

        address:
          cleanText(
            candidate
              ?.currentAddress ||
            candidate
              ?.address
          ),

        email,

        mobile,

        position,

        department:
          cleanText(
            selection
              ?.department
              ?.name ||
            candidate
              ?.department
              ?.name
          ),

        office,

        proposedJoiningDate,

        compensationText:
          cleanText(
            overrides
              ?.compensationText,
            "As mutually agreed during the discussions."
          ),

        hrName:
          cleanText(
            selection
              ?.hiringHr
              ?.displayName ||
            requirement
              ?.assignedHr
              ?.displayName,
            "People & Culture Team"
          ),

        hrEmail:
          cleanText(
            selection
              ?.hiringHr
              ?.email ||
            requirement
              ?.assignedHr
              ?.email ||
            process.env
              .COMPANY_SUPPORT_EMAIL
          ),
      },
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  resolveLoiVariables,

  getOfficeDetails,
};
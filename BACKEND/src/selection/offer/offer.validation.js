const ApiError = require("../../utils/ApiError");

/* =========================================================
   HELPERS
========================================================= */

const clean = (value) =>
  String(value ?? "").trim();

const validEmail = (value) => {
  if (!value) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
};

const validMobile = (value) => {
  if (!value) {
    return true;
  }

  return /^\d{10}$/.test(
    String(value)
      .replace(/\D/g, "")
  );
};

const validDate = (value) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(
    date.getTime()
  );
};

/* =========================================================
   GENERATE OFFER
========================================================= */

const validateGenerateOffer = (
  payload = {}
) => {
  const errors = [];

  if (
    payload.email &&
    !validEmail(payload.email)
  ) {
    errors.push(
      "Candidate email is invalid."
    );
  }

  if (
    payload.mobile &&
    !validMobile(payload.mobile)
  ) {
    errors.push(
      "Candidate mobile number must contain exactly 10 digits."
    );
  }

  if (
    payload.reportingDate &&
    !validDate(
      payload.reportingDate
    )
  ) {
    errors.push(
      "Reporting date is invalid."
    );
  }

  if (
    payload.issueDate &&
    !validDate(
      payload.issueDate
    )
  ) {
    errors.push(
      "Offer issue date is invalid."
    );
  }

  if (
    payload.fatherName !==
      undefined &&
    !clean(payload.fatherName)
  ) {
    errors.push(
      "Father's name cannot be empty."
    );
  }

  if (
    payload.residentialAddress !==
      undefined &&
    !clean(
      payload.residentialAddress
    )
  ) {
    errors.push(
      "Residential address cannot be empty."
    );
  }

  if (errors.length) {
    throw new ApiError(
      400,
      errors.join(" ")
    );
  }

  return true;
};

/* =========================================================
   SEND
========================================================= */

const validateOfferForSend = (
  offer
) => {
  if (!offer) {
    throw new ApiError(
      404,
      "Offer Letter not found."
    );
  }

  const required = [
    [
      offer.candidateName,
      "Candidate name",
    ],

    [
      offer.fatherName,
      "Father's name",
    ],

    [
      offer.residentialAddress,
      "Residential address",
    ],

    [
      offer.email,
      "Candidate email",
    ],

    [
      offer.mobile,
      "Candidate mobile number",
    ],

    [
      offer.positionTitle,
      "Position",
    ],

    [
      offer.officeLocation,
      "Office location",
    ],

    [
      offer.reportingDate,
      "Reporting date",
    ],
  ];

  const missing =
    required
      .filter(
        ([value]) =>
          !value
      )
      .map(
        ([, label]) =>
          label
      );

  if (missing.length) {
    throw new ApiError(
      400,
      `Offer Letter is incomplete. Missing: ${missing.join(
        ", "
      )}.`
    );
  }

  if (
    !validEmail(
      offer.email
    )
  ) {
    throw new ApiError(
      400,
      "Candidate email is invalid."
    );
  }

  if (
    !validMobile(
      offer.mobile
    )
  ) {
    throw new ApiError(
      400,
      "Candidate mobile number must contain exactly 10 digits."
    );
  }

  if (
    !offer.pdf?.path
  ) {
    throw new ApiError(
      400,
      "Generate the Offer Letter PDF before sending it."
    );
  }

  if (
    !offer.reviewedAt
  ) {
    throw new ApiError(
      400,
      "HR must open and review the generated Offer Letter before sending it."
    );
  }

  return true;
};

module.exports = {
  validateGenerateOffer,
  validateOfferForSend,
};
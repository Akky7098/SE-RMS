const fs = require("fs");
const mongoose = require("mongoose");

const ApiError = require("../../utils/ApiError");

const {
  Offer,
} = require("./offer.model");

const {
  generateOfferPdf,
} = require("./offerPdf.service");

const {
  validateGenerateOffer,
  validateOfferForSend,
} = require("./offer.validation");

const {
  sendOfferLetterEmail,
} = require(
  "../emails/offerMail.service"
);

/* =========================================================
   MODELS
========================================================= */

const Selection =
  mongoose.models.Selection;

const Candidate =
  mongoose.models.Candidate;

const User =
  mongoose.models.User;

if (!Selection) {
  throw new Error(
    "Selection model is not registered."
  );
}

if (!Candidate) {
  throw new Error(
    "Candidate model is not registered."
  );
}

/* =========================================================
   HELPERS
========================================================= */

const clean = (
  value
) =>
  String(value ?? "").trim();

const userId = (
  user
) =>
  user?._id ||
  user?.id ||
  null;

const digitsOnly = (
  value
) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(-10);

/* =========================================================
   LOAD SELECTION
========================================================= */

const loadSelection =
  async (
    selectionId
  ) => {
    if (
      !mongoose.Types.ObjectId.isValid(
        selectionId
      )
    ) {
      throw new ApiError(
        400,
        "Invalid Selection ID."
      );
    }

    const selection =
      await Selection
        .findById(
          selectionId
        )
        .populate(
          "candidate"
        )
        .populate(
          "hiringHr",
          "name fullName email designation"
        )
        .populate(
          "department",
          "name"
        )
        .lean();

    if (!selection) {
      throw new ApiError(
        404,
        "Selection not found."
      );
    }

    if (
      !selection.candidate
    ) {
      throw new ApiError(
        400,
        "Candidate is not linked to this selection."
      );
    }

    return selection;
  };

/* =========================================================
   CURRENT OFFER
========================================================= */

const getCurrentOffer =
  async (
    selectionId
  ) => {
    return Offer
      .findOne({
        selection:
          selectionId,
      })
      .sort({
        version: -1,
        createdAt: -1,
      });
  };

/* =========================================================
   MONTH
========================================================= */

const monthCode = (
  date = new Date()
) =>
  new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      timeZone:
        "Asia/Kolkata",
    }
  ).format(date);

/* =========================================================
   UNIQUE REFERENCE NUMBER

   Example:
   2026/SEL/HR/OL/Sep/000001

   Mongo unique index remains the final concurrency guard.
========================================================= */

const generateReferenceNumber =
  async (
    issueDate =
      new Date()
  ) => {
    const date =
      new Date(
        issueDate
      );

    const year =
      new Intl.DateTimeFormat(
        "en-US",
        {
          year: "numeric",
          timeZone:
            "Asia/Kolkata",
        }
      ).format(date);

    const month =
      monthCode(date);

    const prefix =
      `${year}/SEL/HR/OL/${month}/`;

    const latest =
      await Offer
        .findOne({
          referenceNumber: {
            $regex:
              `^${year}\\/SEL\\/HR\\/OL\\/${month}\\/`,
          },
        })
        .sort({
          referenceNumber:
            -1,
        })
        .select(
          "referenceNumber"
        )
        .lean();

    let next = 1;

    if (
      latest
        ?.referenceNumber
    ) {
      const lastPart =
        latest.referenceNumber
          .split("/")
          .pop();

      const parsed =
        Number(
          lastPart
        );

      if (
        Number.isFinite(
          parsed
        )
      ) {
        next =
          parsed + 1;
      }
    }

    return (
      prefix +
      String(next).padStart(
        6,
        "0"
      )
    );
  };

/* =========================================================
   PRE-FILL
========================================================= */

const buildPrefill =
  (
    selection
  ) => {
    const candidate =
      selection.candidate ||
      {};

    const hr =
      selection.hiringHr ||
      {};

    const candidateName =
      clean(
        candidate.fullName ||
          candidate.name
      );

    const email =
      clean(
        candidate.email
      );

    const mobile =
      digitsOnly(
        candidate.mobile ||
          candidate.phone ||
          candidate.contactNumber
      );

    const positionTitle =
      clean(
        selection.positionTitle ||
          candidate.positionTitle ||
          candidate.appliedPosition
      );

    const officeLocation =
      clean(
        selection.officeLocation
      ) ===
      "SONIPAT"
        ? "Sonipat"
        : "Delhi";

    const hrName =
      clean(
        hr.fullName ||
          hr.name
      );

    const hrEmail =
      clean(
        hr.email
      ) ||
      "hrd@sandeepedgetech.com";

    const hrDesignation =
      clean(
        hr.designation
      ) ||
      "HR Executive";

    return {
      candidateTitle:
        clean(
          candidate.title
        ) ||
        "Mr.",

      candidateName,

      fatherName:
        clean(
          candidate.fatherName
        ),

      residentialAddress:
        clean(
          candidate.permanentAddress ||
            candidate.currentAddress ||
            candidate.address
        ),

      email,

      mobile,

      positionTitle,

      officeLocation,

      hrName,

      hrEmail,

      hrDesignation,

      signatoryName:
        "Renu",

      signatoryDesignation:
        "HR Manager",
    };
  };

/* =========================================================
   READINESS
========================================================= */

const getOfferReadiness =
  async (
    selectionId
  ) => {
    const selection =
      await loadSelection(
        selectionId
      );

    const currentOffer =
      await getCurrentOffer(
        selectionId
      );

    const prefill =
      buildPrefill(
        selection
      );

    return {
      selectionId:
        selection._id,

      selectionNumber:
        selection.selectionNumber,

      selectionStatus:
        selection.status,

      canPrepare:
        [
          "DOCUMENTS_VERIFIED",
          "READY_FOR_OFFER",
          "OFFER_DRAFT",
          "OFFER_SENT",
        ].includes(
          selection.status
        ),

      prefill,

      currentOffer,
    };
  };

/* =========================================================
   GENERATE / REGENERATE
========================================================= */

const generateOffer =
  async ({
    selectionId,
    payload = {},
    actor,
  }) => {
    validateGenerateOffer(
      payload
    );

    const selection =
      await loadSelection(
        selectionId
      );

    const allowedStatuses = [
      "DOCUMENTS_VERIFIED",
      "READY_FOR_OFFER",
      "OFFER_DRAFT",
    ];

    if (
      !allowedStatuses.includes(
        selection.status
      )
    ) {
      throw new ApiError(
        400,
        "Offer Letter can only be prepared after candidate documents are verified."
      );
    }

    const previousOffer =
      await getCurrentOffer(
        selectionId
      );

    /*
     * Once an Offer has been SENT, do not silently replace
     * that legal snapshot.
     */
    if (
      previousOffer &&
      [
        "SENT",
        "ACCEPTED",
        "DECLINED",
      ].includes(
        previousOffer.status
      )
    ) {
      throw new ApiError(
        400,
        "The current Offer Letter has already been sent. A sent legal document cannot be silently regenerated."
      );
    }

    const prefill =
      buildPrefill(
        selection
      );

    const issueDate =
      payload.issueDate
        ? new Date(
            payload.issueDate
          )
        : new Date();

    const reportingDate =
      payload.reportingDate
        ? new Date(
            payload.reportingDate
          )
        : selection.finalJoiningDate
        ? new Date(
            selection.finalJoiningDate
          )
        : selection.proposedJoiningDate
        ? new Date(
            selection.proposedJoiningDate
          )
        : null;

    if (!reportingDate) {
      throw new ApiError(
        400,
        "Reporting / joining date is required before generating the Offer Letter."
      );
    }

    const candidateName =
      clean(
        payload.candidateName ||
          prefill.candidateName
      );

    const fatherName =
      clean(
        payload.fatherName ||
          prefill.fatherName
      );

    const residentialAddress =
      clean(
        payload.residentialAddress ||
          prefill.residentialAddress
      );

    const email =
      clean(
        payload.email ||
          prefill.email
      );

    const mobile =
      digitsOnly(
        payload.mobile ||
          prefill.mobile
      );

    const positionTitle =
      clean(
        payload.positionTitle ||
          prefill.positionTitle
      );

    const officeLocation =
      clean(
        payload.officeLocation ||
          prefill.officeLocation
      );

    if (!candidateName) {
      throw new ApiError(
        400,
        "Candidate name is required."
      );
    }

    if (!fatherName) {
      throw new ApiError(
        400,
        "Father's name is required."
      );
    }

    if (
      !residentialAddress
    ) {
      throw new ApiError(
        400,
        "Residential address is required."
      );
    }

    if (!email) {
      throw new ApiError(
        400,
        "Candidate email is required."
      );
    }

    if (
      mobile.length !== 10
    ) {
      throw new ApiError(
        400,
        "Candidate mobile number must contain exactly 10 digits."
      );
    }

    if (!positionTitle) {
      throw new ApiError(
        400,
        "Position title is required."
      );
    }

    let referenceNumber =
      null;

    /*
     * Regeneration keeps the same controlled reference
     * and increases version.
     */
    if (previousOffer) {
      referenceNumber =
        previousOffer.referenceNumber;
    } else {
      referenceNumber =
        await generateReferenceNumber(
          issueDate
        );
    }

    const version =
      previousOffer
        ? previousOffer.version +
          1
        : 1;

    const offer =
      await Offer.create({
        selection:
          selection._id,

        candidate:
          selection.candidate
            ._id,

        referenceNumber,

        version,

        status:
          "DRAFT",

        issueDate,

        candidateTitle:
          clean(
            payload.candidateTitle ||
              prefill.candidateTitle
          ) ||
          "Mr.",

        candidateName,

        fatherName,

        residentialAddress,

        email,

        mobile,

        positionTitle,

        officeLocation,

        compensationText:
          clean(
            payload.compensationText
          ) ||
          "Your compensation will be as agreed during our discussions.",

        reportingDate,

        hrName:
          clean(
            payload.hrName ||
              prefill.hrName
          ),

        hrDesignation:
          clean(
            payload.hrDesignation ||
              prefill.hrDesignation
          ) ||
          "HR Executive",

        hrEmail:
          clean(
            payload.hrEmail ||
              prefill.hrEmail
          ) ||
          "hrd@sandeepedgetech.com",

        signatoryName:
          clean(
            payload.signatoryName
          ) ||
          prefill.signatoryName,

        signatoryDesignation:
          clean(
            payload.signatoryDesignation
          ) ||
          prefill.signatoryDesignation,

        createdBy:
          userId(actor),

        updatedBy:
          userId(actor),
      });

    try {
      const pdf =
        await generateOfferPdf(
          offer
        );

      offer.pdf = {
        fileName:
          pdf.fileName,

        path:
          pdf.path,

        mimeType:
          pdf.mimeType,

        generatedAt:
          new Date(),

        generatedBy:
          userId(actor),
      };

      offer.status =
        "GENERATED";

      /*
       * Every regenerated version requires review again.
       */
      offer.reviewedAt =
        null;

      offer.reviewedBy =
        null;

      await offer.save();
    } catch (error) {
      /*
       * Don't leave an unusable legal document record.
       */
      await Offer.deleteOne({
        _id: offer._id,
      });

      throw error;
    }

    /*
     * Old versions stay in Offer collection for audit.
     * Selection points only to the current version.
     */
    await Selection.findByIdAndUpdate(
      selection._id,
      {
        $set: {
          currentOffer:
            offer._id,

          status:
            "OFFER_DRAFT",

          updatedBy:
            userId(actor),
        },
      }
    );

    return Offer
      .findById(
        offer._id
      )
      .populate(
        "candidate"
      )
      .populate(
        "createdBy",
        "name fullName email"
      );
  };

/* =========================================================
   OPEN PDF
========================================================= */

const getOfferFile =
  async (
    selectionId
  ) => {
    const offer =
      await getCurrentOffer(
        selectionId
      );

    if (!offer) {
      throw new ApiError(
        404,
        "Offer Letter has not been generated."
      );
    }

    if (
      !offer.pdf?.path
    ) {
      throw new ApiError(
        404,
        "Offer Letter PDF is not available."
      );
    }

    if (
      !fs.existsSync(
        offer.pdf.path
      )
    ) {
      throw new ApiError(
        404,
        "Offer Letter PDF file could not be found on the server."
      );
    }

    return {
      offer,

      path:
        offer.pdf.path,

      fileName:
        offer.pdf.fileName ||
        "Offer-Letter.pdf",

      mimeType:
        offer.pdf.mimeType ||
        "application/pdf",
    };
  };

/* =========================================================
   MARK REVIEWED

   Frontend should call this after HR opens/reviews PDF.
========================================================= */

const markOfferReviewed =
  async ({
    selectionId,
    actor,
  }) => {
    const offer =
      await getCurrentOffer(
        selectionId
      );

    if (!offer) {
      throw new ApiError(
        404,
        "Offer Letter not found."
      );
    }

    if (
      offer.status !==
      "GENERATED"
    ) {
      throw new ApiError(
        400,
        "Only a generated Offer Letter can be marked as reviewed."
      );
    }

    if (
      !offer.pdf?.path
    ) {
      throw new ApiError(
        400,
        "Offer Letter PDF has not been generated."
      );
    }

    offer.reviewedAt =
      new Date();

    offer.reviewedBy =
      userId(actor);

    offer.updatedBy =
      userId(actor);

    await offer.save();

    return offer;
  };

/* =========================================================
   SEND

   Email wiring will use your centralized selection mail
   service in the next step. This method intentionally
   controls state and legal review first.
========================================================= */

/* =========================================================
   SEND OFFER LETTER

   IMPORTANT FLOW:

   1. Validate current Offer
   2. Make sure PDF exists
   3. Make sure HR reviewed it
   4. Send actual email
      TO = Candidate
      CC = Hiring HR
      Attachment = exact generated PDF
   5. ONLY after email success:
      Offer -> SENT
      Selection -> OFFER_SENT

   No candidate portal is involved.
========================================================= */

const markOfferSent =
  async ({
    selectionId,
    actor,
  }) => {
    /* =====================================================
       LOAD CURRENT OFFER
    ===================================================== */

    const offer =
      await getCurrentOffer(
        selectionId
      );

    if (!offer) {
      throw new ApiError(
        404,
        "Offer Letter has not been generated."
      );
    }

    /* =====================================================
       IDEMPOTENT
    ===================================================== */

    if (
      offer.status ===
      "SENT"
    ) {
      return offer;
    }

    /* =====================================================
       VALIDATE
    ===================================================== */

    validateOfferForSend(
      offer
    );

    if (
      offer.status !==
      "GENERATED"
    ) {
      throw new ApiError(
        400,
        "Only the current generated Offer Letter can be sent."
      );
    }

    if (
      !offer.reviewedAt
    ) {
      throw new ApiError(
        400,
        "HR must review the Offer Letter before sending it."
      );
    }

    if (
      !offer.pdf?.path
    ) {
      throw new ApiError(
        400,
        "Offer Letter PDF is not available."
      );
    }

    if (
      !fs.existsSync(
        offer.pdf.path
      )
    ) {
      throw new ApiError(
        404,
        "Generated Offer Letter PDF file could not be found."
      );
    }

    /* =====================================================
       LOAD SELECTION + CANDIDATE + HIRING HR
    ===================================================== */

    const selection =
      await Selection
        .findById(
          selectionId
        )
        .populate(
          "candidate"
        )
        .populate(
          "hiringHr",
          "name fullName displayName email designation"
        );

    if (!selection) {
      throw new ApiError(
        404,
        "Selection not found."
      );
    }

    if (
      !selection.candidate
    ) {
      throw new ApiError(
        400,
        "Candidate is not linked to this selection."
      );
    }

    /* =====================================================
       IMPORTANT:
       SEND EMAIL BEFORE CHANGING WORKFLOW STATUS
    ===================================================== */

    let mailResult;

    try {
      mailResult =
        await sendOfferLetterEmail({
          offer,

          candidate:
            selection.candidate,

          hiringHr:
            selection.hiringHr,
        });
    } catch (
      error
    ) {
      console.error(
        "[Offer] Offer Letter email failed:",
        error
      );

      /*
       * DO NOT mark Offer as sent.
       *
       * This ensures ERP never shows SENT when email
       * actually failed.
       */
      throw new ApiError(
        500,
        `Offer Letter email could not be sent. ${
          error?.message ||
          "Please try again."
        }`
      );
    }

    /* =====================================================
       EMAIL SUCCESS
    ===================================================== */

    const now =
      new Date();

    offer.status =
      "SENT";

    offer.sentAt =
      now;

    offer.sentBy =
      userId(
        actor
      );

    offer.sentToEmail =
      mailResult
        ?.candidateEmail ||
      offer.email;

    offer.updatedBy =
      userId(
        actor
      );

    /* =====================================================
       OPTIONAL MAIL AUDIT
    ===================================================== */

    if (
      offer.schema
        ?.path(
          "mail"
        )
    ) {
      offer.mail = {
        status:
          "SENT",

        messageId:
          mailResult
            ?.messageId ||
          "",

        sentAt:
          now,

        to:
          mailResult
            ?.candidateEmail ||
          offer.email,

        cc:
          mailResult
            ?.cc ||
          [],
      };
    }

    await offer.save();

    /* =====================================================
       SELECTION
    ===================================================== */

    await Selection.findByIdAndUpdate(
      selectionId,
      {
        $set: {
          currentOffer:
            offer._id,

          status:
            "OFFER_SENT",

          updatedBy:
            userId(
              actor
            ),
        },
      }
    );

    /* =====================================================
       RETURN CURRENT RECORD
    ===================================================== */

    return Offer
      .findById(
        offer._id
      )
      .populate(
        "candidate"
      )
      .populate(
        "sentBy",
        "name fullName displayName email"
      )
      .populate(
        "reviewedBy",
        "name fullName displayName email"
      );
  };

/* =========================================================
   DETAIL
========================================================= */

const getOffer =
  async (
    selectionId
  ) => {
    await loadSelection(
      selectionId
    );

    const offer =
      await getCurrentOffer(
        selectionId
      );

    return offer;
  };

/* =========================================================
   HISTORY
========================================================= */

const getOfferHistory =
  async (
    selectionId
  ) => {
    await loadSelection(
      selectionId
    );

    return Offer
      .find({
        selection:
          selectionId,
      })
      .sort({
        version: -1,
        createdAt: -1,
      })
      .populate(
        "createdBy",
        "name fullName email"
      )
      .populate(
        "reviewedBy",
        "name fullName email"
      );
  };

module.exports = {
  getOfferReadiness,

  generateOffer,

  getOffer,

  getOfferFile,

  markOfferReviewed,

  markOfferSent,

  getOfferHistory,
};
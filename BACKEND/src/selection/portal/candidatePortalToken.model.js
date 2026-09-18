const crypto =
  require("crypto");

const fs =
  require("fs");

const path =
  require("path");

const mongoose =
  require("mongoose");

const {
  CandidatePortalToken,
} =
  require(
    "./candidatePortalToken.model"
  );

const {
  Selection,
} =
  require(
    "../selection.model"
  );

const {
  Loi,
} =
  require(
    "../loi/loi.model"
  );

const {
  Candidate,
} =
  require(
    "../../recruitment/candidate.model"
  );

const ApiError =
  require(
    "../../utils/ApiError"
  );

/* =========================================================
   CONFIG
========================================================= */

const DEFAULT_TOKEN_DAYS =
  Number(
    process.env
      .CANDIDATE_PORTAL_TOKEN_DAYS ||
      30
  );

const UPLOADS_ROOT =
  path.resolve(
    __dirname,
    "../../../uploads"
  );

/* =========================================================
   TOKEN
========================================================= */

const hashToken =
  (
    token
  ) =>
    crypto
      .createHash(
        "sha256"
      )
      .update(
        String(
          token ||
            ""
        )
      )
      .digest(
        "hex"
      );

/* =========================================================
   CREATE / REFRESH TOKEN

   One active portal access is enough for:
   - LOI response
   - documents
   - document corrections later

   We revoke previous active tokens when a new link is issued.
========================================================= */

const createPortalToken =
  async ({
    selectionId,
    candidateId,
    createdBy =
      null,
  }) => {
    if (
      !mongoose.Types.ObjectId
        .isValid(
          selectionId
        )
    ) {
      throw new ApiError(
        400,
        "Invalid selection ID"
      );
    }

    if (
      !mongoose.Types.ObjectId
        .isValid(
          candidateId
        )
    ) {
      throw new ApiError(
        400,
        "Invalid candidate ID"
      );
    }

    const rawToken =
      crypto
        .randomBytes(
          32
        )
        .toString(
          "hex"
        );

    const tokenHash =
      hashToken(
        rawToken
      );

    const expiresAt =
      new Date(
        Date.now() +
          DEFAULT_TOKEN_DAYS *
            24 *
            60 *
            60 *
            1000
      );

    /* =====================================================
       REVOKE OLD ACTIVE LINKS
    ===================================================== */

    await CandidatePortalToken
      .updateMany(
        {
          selection:
            selectionId,

          purpose:
            "SELECTION_PORTAL",

          revokedAt:
            null,
        },

        {
          $set: {
            revokedAt:
              new Date(),
          },
        }
      );

    await CandidatePortalToken
      .create({
        selection:
          selectionId,

        candidate:
          candidateId,

        purpose:
          "SELECTION_PORTAL",

        tokenHash,

        expiresAt,

        createdBy,
      });

    return {
      rawToken,

      expiresAt,
    };
  };

/* =========================================================
   FIND VALID TOKEN
========================================================= */

const resolvePortalToken =
  async ({
    rawToken,
    ip =
      "",
    userAgent =
      "",
    updateUsage =
      true,
  }) => {
    const token =
      String(
        rawToken ||
          ""
      ).trim();

    if (
      !token ||
      token.length <
        32
    ) {
      throw new ApiError(
        401,
        "Invalid candidate portal link"
      );
    }

    const tokenHash =
      hashToken(
        token
      );

    const record =
      await CandidatePortalToken
        .findOne({
          tokenHash,

          purpose:
            "SELECTION_PORTAL",
        });

    if (
      !record
    ) {
      throw new ApiError(
        401,
        "Candidate portal link is invalid or no longer available"
      );
    }

    if (
      record.revokedAt
    ) {
      throw new ApiError(
        401,
        "Candidate portal link has been replaced or revoked"
      );
    }

    if (
      !record.expiresAt ||
      record.expiresAt.getTime() <=
        Date.now()
    ) {
      throw new ApiError(
        401,
        "Candidate portal link has expired. Please contact HR for a new link."
      );
    }

    if (
      updateUsage
    ) {
      record.lastUsedAt =
        new Date();

      record.lastUsedIp =
        String(
          ip ||
            ""
        ).slice(
          0,
          150
        );

      record.lastUsedUserAgent =
        String(
          userAgent ||
            ""
        ).slice(
          0,
          1000
        );

      await record.save();
    }

    return record;
  };

/* =========================================================
   LOAD PORTAL

   Public-safe response only.

   Do NOT send internal HR/audit information to candidate.
========================================================= */

const getCandidatePortal =
  async ({
    rawToken,
    ip,
    userAgent,
  }) => {
    const tokenRecord =
      await resolvePortalToken({
        rawToken,

        ip,

        userAgent,
      });

    const selection =
      await Selection
        .findById(
          tokenRecord
            .selection
        )
        .populate(
          "candidate",
          "candidateNumber fullName email mobile positionTitle"
        )
        .populate(
          "department",
          "name code"
        )
        .lean();

    if (
      !selection
    ) {
      throw new ApiError(
        404,
        "Selection record is no longer available"
      );
    }

    const loi =
      selection
        ?.currentLoi
        ? await Loi
            .findById(
              selection
                .currentLoi
            )
            .select(
              "documentNumber version status positionTitle officeLocation proposedJoiningDate issueDate sentAt acceptedAt declinedAt"
            )
            .lean()
        : null;

    return {
      company: {
        name:
          process.env
            .COMPANY_LEGAL_NAME ||
          "Sandeep Edgetech Limited",

        displayName:
          process.env
            .COMPANY_NAME ||
          "Sandeep Edge Tech",
      },

      candidate: {
        candidateNumber:
          selection
            ?.candidate
            ?.candidateNumber ||
          "",

        fullName:
          selection
            ?.candidate
            ?.fullName ||
          "",

        email:
          selection
            ?.candidate
            ?.email ||
          "",

        mobile:
          selection
            ?.candidate
            ?.mobile ||
          "",
      },

      selection: {
        selectionNumber:
          selection
            .selectionNumber,

        status:
          selection
            .status,

        positionTitle:
          selection
            .positionTitle,

        department:
          selection
            ?.department
            ?.name ||
          "",

        officeLocation:
          selection
            .officeLocation,

        proposedJoiningDate:
          selection
            .proposedJoiningDate,
      },

      loi:
        loi
          ? {
              documentNumber:
                loi.documentNumber,

              version:
                loi.version,

              status:
                loi.status,

              issueDate:
                loi.issueDate,

              sentAt:
                loi.sentAt,

              acceptedAt:
                loi.acceptedAt,

              declinedAt:
                loi.declinedAt,

              canRespond:
                loi.status ===
                  "SENT" &&
                selection.status ===
                  "LOI_SENT",

              canView:
                true,
            }
          : null,

      portal: {
        expiresAt:
          tokenRecord
            .expiresAt,
      },
    };
  };

/* =========================================================
   GET LOI FILE
========================================================= */

const getPortalLoiFile =
  async ({
    rawToken,
    ip,
    userAgent,
  }) => {
    const tokenRecord =
      await resolvePortalToken({
        rawToken,

        ip,

        userAgent,
      });

    const selection =
      await Selection
        .findById(
          tokenRecord
            .selection
        )
        .select(
          "currentLoi"
        )
        .lean();

    if (
      !selection
        ?.currentLoi
    ) {
      throw new ApiError(
        404,
        "Letter of Intent is not available"
      );
    }

    const loi =
      await Loi
        .findById(
          selection
            .currentLoi
        )
        .lean();

    if (
      !loi ||
      !loi
        ?.file
        ?.relativePath
    ) {
      throw new ApiError(
        404,
        "Letter of Intent file is not available"
      );
    }

    const absolutePath =
      path.resolve(
        UPLOADS_ROOT,
        loi
          .file
          .relativePath
      );

    /*
     * Prevent path traversal if DB data is ever corrupted.
     */

    if (
      !absolutePath.startsWith(
        UPLOADS_ROOT
      )
    ) {
      throw new ApiError(
        400,
        "Invalid LOI file reference"
      );
    }

    if (
      !fs.existsSync(
        absolutePath
      )
    ) {
      throw new ApiError(
        404,
        "Letter of Intent file was not found"
      );
    }

    return {
      path:
        absolutePath,

      fileName:
        loi
          .file
          .fileName ||
        `${loi.documentNumber}.pdf`,

      mimeType:
        loi
          .file
          .mimeType ||
        "application/pdf",
    };
  };

/* =========================================================
   ACCEPT LOI
========================================================= */

const acceptLoi =
  async ({
    rawToken,
    ip =
      "",
    userAgent =
      "",
  }) => {
    const tokenRecord =
      await resolvePortalToken({
        rawToken,

        ip,

        userAgent,
      });

    const selection =
      await Selection
        .findById(
          tokenRecord
            .selection
        );

    if (
      !selection
    ) {
      throw new ApiError(
        404,
        "Selection record not found"
      );
    }

    if (
      selection.status ===
      "PRE_JOINING_DOCUMENTS"
    ) {
      return getCandidatePortal({
        rawToken,

        ip,

        userAgent,
      });
    }

    if (
      selection.status !==
      "LOI_SENT"
    ) {
      throw new ApiError(
        409,
        "LOI cannot be accepted at the current stage"
      );
    }

    const loi =
      await Loi
        .findById(
          selection
            .currentLoi
        );

    if (
      !loi
    ) {
      throw new ApiError(
        404,
        "Letter of Intent not found"
      );
    }

    if (
      loi.status !==
      "SENT"
    ) {
      throw new ApiError(
        409,
        "This Letter of Intent is not awaiting acceptance"
      );
    }

    const now =
      new Date();

    loi.status =
      "ACCEPTED";

    loi.acceptedAt =
      now;

    loi.declinedAt =
      null;

    loi.declineReason =
      "";

    loi.responseIp =
      String(
        ip ||
          ""
      ).slice(
        0,
        150
      );

    loi.responseUserAgent =
      String(
        userAgent ||
          ""
      ).slice(
        0,
        1000
      );

    await loi.save();

    /* =====================================================
       SELECTION

       We record LOI acceptance and move immediately into
       pre-joining documents because that is the actual
       next action for the candidate.
    ===================================================== */

    const previousStatus =
      selection.status;

    selection.status =
      "PRE_JOINING_DOCUMENTS";

    selection.loiAcceptedAt =
      now;

    selection.loiDeclinedAt =
      null;

    selection.updatedBy =
      null;

    selection.auditTrail.push(
      {
        event:
          "LOI_ACCEPTED",

        fromStatus:
          previousStatus,

        toStatus:
          "LOI_ACCEPTED",

        remarks:
          "Candidate accepted the Letter of Intent through the secure candidate portal.",

        performedBy:
          null,

        at:
          now,

        metadata: {
          loiId:
            loi._id,

          documentNumber:
            loi
              .documentNumber,

          version:
            loi.version,
        },
      },

      {
        event:
          "PRE_JOINING_STARTED",

        fromStatus:
          "LOI_ACCEPTED",

        toStatus:
          "PRE_JOINING_DOCUMENTS",

        remarks:
          "Pre-joining documentation opened automatically after LOI acceptance.",

        performedBy:
          null,

        at:
          now,
      }
    );

    await selection.save();

    return {
      success:
        true,

      message:
        "Letter of Intent accepted successfully",

      nextStage:
        "PRE_JOINING_DOCUMENTS",

      acceptedAt:
        now,

      selectionNumber:
        selection
          .selectionNumber,
    };
  };

/* =========================================================
   DECLINE LOI
========================================================= */

const declineLoi =
  async ({
    rawToken,
    reason =
      "",
    ip =
      "",
    userAgent =
      "",
  }) => {
    const tokenRecord =
      await resolvePortalToken({
        rawToken,

        ip,

        userAgent,
      });

    const selection =
      await Selection
        .findById(
          tokenRecord
            .selection
        );

    if (
      !selection
    ) {
      throw new ApiError(
        404,
        "Selection record not found"
      );
    }

    if (
      selection.status !==
      "LOI_SENT"
    ) {
      throw new ApiError(
        409,
        "LOI cannot be declined at the current stage"
      );
    }

    const loi =
      await Loi
        .findById(
          selection
            .currentLoi
        );

    if (
      !loi
    ) {
      throw new ApiError(
        404,
        "Letter of Intent not found"
      );
    }

    if (
      loi.status !==
      "SENT"
    ) {
      throw new ApiError(
        409,
        "This Letter of Intent is not awaiting response"
      );
    }

    const now =
      new Date();

    const cleanReason =
      String(
        reason ||
          ""
      )
        .trim()
        .slice(
          0,
          1500
        );

    loi.status =
      "DECLINED";

    loi.declinedAt =
      now;

    loi.acceptedAt =
      null;

    loi.declineReason =
      cleanReason;

    loi.responseIp =
      String(
        ip ||
          ""
      ).slice(
        0,
        150
      );

    loi.responseUserAgent =
      String(
        userAgent ||
          ""
      ).slice(
        0,
        1000
      );

    await loi.save();

    const previousStatus =
      selection.status;

    selection.status =
      "LOI_DECLINED";

    selection.loiDeclinedAt =
      now;

    selection.auditTrail.push({
      event:
        "LOI_DECLINED",

      fromStatus:
        previousStatus,

      toStatus:
        "LOI_DECLINED",

      remarks:
        cleanReason ||
        "Candidate declined the Letter of Intent.",

      performedBy:
        null,

      at:
        now,

      metadata: {
        loiId:
          loi._id,

        documentNumber:
          loi
            .documentNumber,

        version:
          loi.version,
      },
    });

    await selection.save();

    return {
      success:
        true,

      message:
        "Your response has been recorded",

      status:
        "LOI_DECLINED",

      declinedAt:
        now,
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  createPortalToken,

  resolvePortalToken,

  getCandidatePortal,

  getPortalLoiFile,

  acceptLoi,

  declineLoi,
};
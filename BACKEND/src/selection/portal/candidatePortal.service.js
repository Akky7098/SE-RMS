const crypto =
  require("crypto");

const fs =
  require("fs");

const path =
  require("path");

const mongoose =
  require("mongoose");

/* =========================================================
   CANDIDATE PORTAL TOKEN MODEL

   IMPORTANT:

   We preserve the complete candidate portal workflow.

   This resolver supports legacy/current export styles and
   prevents the entire backend from crashing only because
   candidatePortalToken.model.js used a different export
   style.

   Supported:

   module.exports = CandidatePortalToken;

   module.exports = {
     CandidatePortalToken
   };

   module.exports = {
     CandidatePortalTokenModel
   };

   module.exports = candidatePortalTokenSchema;

   module.exports = {
     candidatePortalTokenSchema
   };

   If none of the above can be resolved, a compatible model
   is registered against the standard collection.
========================================================= */

const candidatePortalTokenModule =
  require(
    "./candidatePortalToken.model"
  );

/* =========================================================
   TEST WHETHER VALUE IS A MONGOOSE MODEL
========================================================= */

const isMongooseModel =
  (
    value
  ) => {
    return Boolean(
      value &&
      typeof value.findOne ===
        "function" &&
      typeof value.findById ===
        "function" &&
      typeof value.updateMany ===
        "function" &&
      typeof value.create ===
        "function"
    );
  };

/* =========================================================
   TEST WHETHER VALUE IS A MONGOOSE SCHEMA
========================================================= */

const isMongooseSchema =
  (
    value
  ) => {
    return Boolean(
      value &&
      value instanceof
        mongoose.Schema
    );
  };

/* =========================================================
   FALLBACK TOKEN SCHEMA

   This matches the fields actually used by this service.

   It is only used when the existing model file neither
   exports nor registers a usable Mongoose model.

   Collection name remains candidateportaltokens so existing
   records are reused.
========================================================= */

const buildFallbackPortalTokenSchema =
  () => {
    const schema =
      new mongoose.Schema(
        {
          selection: {
            type:
              mongoose.Schema
                .Types
                .ObjectId,

            ref:
              "Selection",

            required:
              true,

            index:
              true,
          },

          candidate: {
            type:
              mongoose.Schema
                .Types
                .ObjectId,

            ref:
              "Candidate",

            required:
              true,

            index:
              true,
          },

          purpose: {
            type:
              String,

            default:
              "SELECTION_PORTAL",

            index:
              true,

            trim:
              true,
          },

          tokenHash: {
            type:
              String,

            required:
              true,

            unique:
              true,

            index:
              true,

            trim:
              true,
          },

          expiresAt: {
            type:
              Date,

            required:
              true,

            index:
              true,
          },

          revokedAt: {
            type:
              Date,

            default:
              null,

            index:
              true,
          },

          revokedBy: {
            type:
              mongoose.Schema
                .Types
                .ObjectId,

            ref:
              "User",

            default:
              null,
          },

          revokeReason: {
            type:
              String,

            trim:
              true,

            default:
              "",
          },

          lastUsedAt: {
            type:
              Date,

            default:
              null,
          },

          lastUsedIp: {
            type:
              String,

            trim:
              true,

            default:
              "",
          },

          lastUsedUserAgent: {
            type:
              String,

            trim:
              true,

            default:
              "",
          },

          createdBy: {
            type:
              mongoose.Schema
                .Types
                .ObjectId,

            ref:
              "User",

            default:
              null,
          },
        },

        {
          timestamps:
            true,

          versionKey:
            false,

          collection:
            "candidateportaltokens",
        }
      );

    schema.index({
      selection:
        1,

      purpose:
        1,

      revokedAt:
        1,
    });

    schema.index({
      tokenHash:
        1,

      purpose:
        1,
    });

    return schema;
  };

/* =========================================================
   RESOLVE CANDIDATE PORTAL TOKEN MODEL
========================================================= */

const resolveCandidatePortalTokenModel =
  () => {
    /* =====================================================
       1. ALREADY REGISTERED MODEL
    ===================================================== */

    if (
      isMongooseModel(
        mongoose
          .models
          .CandidatePortalToken
      )
    ) {
      return mongoose
        .models
        .CandidatePortalToken;
    }

    /* =====================================================
       2. DIRECT MODEL EXPORT
    ===================================================== */

    if (
      isMongooseModel(
        candidatePortalTokenModule
      )
    ) {
      return candidatePortalTokenModule;
    }

    /* =====================================================
       3. NAMED MODEL EXPORT
    ===================================================== */

    if (
      isMongooseModel(
        candidatePortalTokenModule
          ?.CandidatePortalToken
      )
    ) {
      return candidatePortalTokenModule
        .CandidatePortalToken;
    }

    /* =====================================================
       4. ALTERNATE MODEL EXPORT
    ===================================================== */

    if (
      isMongooseModel(
        candidatePortalTokenModule
          ?.CandidatePortalTokenModel
      )
    ) {
      return candidatePortalTokenModule
        .CandidatePortalTokenModel;
    }

    /* =====================================================
       5. DEFAULT EXPORT
    ===================================================== */

    if (
      isMongooseModel(
        candidatePortalTokenModule
          ?.default
      )
    ) {
      return candidatePortalTokenModule
        .default;
    }

    /* =====================================================
       6. DIRECT SCHEMA EXPORT
    ===================================================== */

    if (
      isMongooseSchema(
        candidatePortalTokenModule
      )
    ) {
      return mongoose
        .models
        .CandidatePortalToken ||
        mongoose.model(
          "CandidatePortalToken",

          candidatePortalTokenModule,

          "candidateportaltokens"
        );
    }

    /* =====================================================
       7. NAMED SCHEMA EXPORT
    ===================================================== */

    const schemaCandidates = [
      candidatePortalTokenModule
        ?.candidatePortalTokenSchema,

      candidatePortalTokenModule
        ?.CandidatePortalTokenSchema,

      candidatePortalTokenModule
        ?.schema,

      candidatePortalTokenModule
        ?.defaultSchema,
    ];

    const exportedSchema =
      schemaCandidates.find(
        isMongooseSchema
      );

    if (
      exportedSchema
    ) {
      return mongoose
        .models
        .CandidatePortalToken ||
        mongoose.model(
          "CandidatePortalToken",

          exportedSchema,

          "candidateportaltokens"
        );
    }

    /* =====================================================
       8. MONGOOSE LOOKUP

       This succeeds when another file registered the model.
    ===================================================== */

    try {
      const registered =
        mongoose.model(
          "CandidatePortalToken"
        );

      if (
        isMongooseModel(
          registered
        )
      ) {
        return registered;
      }
    } catch (
      error
    ) {
      /*
       * MissingSchemaError is expected when it has
       * not been registered yet.
       */
    }

    /* =====================================================
       9. SAFE COMPATIBLE FALLBACK

       Do NOT crash the whole SE-RMS backend.

       Register the model using the same collection and all
       fields required by this candidate portal workflow.
    ===================================================== */

    console.warn(
      "[Candidate Portal] Existing CandidatePortalToken export could not be resolved. Registering compatible model."
    );

    const fallbackSchema =
      buildFallbackPortalTokenSchema();

    return mongoose
      .models
      .CandidatePortalToken ||
      mongoose.model(
        "CandidatePortalToken",

        fallbackSchema,

        "candidateportaltokens"
      );
  };

const CandidatePortalToken =
  resolveCandidatePortalTokenModel();

/* =========================================================
   FINAL MODEL CHECK
========================================================= */

if (
  !isMongooseModel(
    CandidatePortalToken
  )
) {
  throw new Error(
    "CandidatePortalToken Mongoose model initialization failed."
  );
}

/* =========================================================
   OTHER MODELS
========================================================= */

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
  CandidateDocumentRecord,
} =
  require(
    "../documents/candidateDocument.model"
  );

const ApiError =
  require(
    "../../utils/ApiError"
  );

/* =========================================================
   CONFIG
========================================================= */

const DEFAULT_TOKEN_DAYS =
  Math.max(
    1,

    Number(
      process.env
        .CANDIDATE_PORTAL_TOKEN_DAYS ||
        30
    ) ||
      30
  );

const UPLOADS_ROOT =
  path.resolve(
    __dirname,
    "../../../uploads"
  );

/* =========================================================
   TOKEN HASH
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
   CLIENT DETAILS
========================================================= */

const cleanIp =
  (
    value
  ) =>
    String(
      value ||
        ""
    )
      .trim()
      .slice(
        0,
        150
      );

const cleanUserAgent =
  (
    value
  ) =>
    String(
      value ||
        ""
    )
      .trim()
      .slice(
        0,
        1000
      );

/* =========================================================
   CREATE PORTAL TOKEN

   SECURITY:

   - 256-bit raw token
   - only SHA-256 hash stored
   - old active portal links are revoked
   - raw token exists only in candidate URL
========================================================= */

const createPortalToken =
  async ({
    selectionId,
    candidateId,
    createdBy =
      null,
  }) => {
    /* =====================================================
       VALIDATE IDS
    ===================================================== */

    if (
      !mongoose
        .Types
        .ObjectId
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
      !mongoose
        .Types
        .ObjectId
        .isValid(
          candidateId
        )
    ) {
      throw new ApiError(
        400,
        "Invalid candidate ID"
      );
    }

    /* =====================================================
       VALIDATE SELECTION
    ===================================================== */

    const selection =
      await Selection
        .findById(
          selectionId
        )
        .select(
          "_id candidate isActive status"
        )
        .lean();

    if (
      !selection
    ) {
      throw new ApiError(
        404,
        "Selection record not found"
      );
    }

    if (
      String(
        selection
          .candidate
      ) !==
      String(
        candidateId
      )
    ) {
      throw new ApiError(
        409,
        "Candidate does not belong to this selection"
      );
    }

    if (
      selection
        .isActive ===
        false ||
      selection
        .status ===
        "CLOSED"
    ) {
      throw new ApiError(
        409,
        "Candidate selection is closed"
      );
    }

    /* =====================================================
       GENERATE TOKEN
    ===================================================== */

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
       REVOKE PREVIOUS ACTIVE PORTAL LINKS

       One active portal URL per selection.
    ===================================================== */

    await CandidatePortalToken
      .updateMany(
        {
          selection:
            selection
              ._id,

          purpose:
            "SELECTION_PORTAL",

          revokedAt:
            null,
        },

        {
          $set: {
            revokedAt:
              new Date(),

            revokeReason:
              "Replaced by a newer secure candidate portal link",
          },
        }
      );

    /* =====================================================
       CREATE NEW TOKEN RECORD
    ===================================================== */

    await CandidatePortalToken
      .create({
        selection:
          selection
            ._id,

        candidate:
          candidateId,

        purpose:
          "SELECTION_PORTAL",

        tokenHash,

        expiresAt,

        createdBy:
          createdBy ||
          null,
      });

    console.log(
      "[Candidate Portal] Secure portal token created:",
      {
        selectionId:
          String(
            selection
              ._id
          ),

        candidateId:
          String(
            candidateId
          ),

        expiresAt,
      }
    );

    return {
      rawToken,

      expiresAt,
    };
  };

/* =========================================================
   RESOLVE TOKEN
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
      record
        .revokedAt
    ) {
      throw new ApiError(
        401,
        "This candidate portal link has been replaced. Please use the latest link shared by HR."
      );
    }

    if (
      !record
        .expiresAt ||
      record
        .expiresAt
        .getTime() <=
        Date.now()
    ) {
      throw new ApiError(
        401,
        "Candidate portal link has expired. Please contact HR for a new secure link."
      );
    }

    if (
      updateUsage
    ) {
      record.lastUsedAt =
        new Date();

      record.lastUsedIp =
        cleanIp(
          ip
        );

      record.lastUsedUserAgent =
        cleanUserAgent(
          userAgent
        );

      await record.save();
    }

    return record;
  };

/* =========================================================
   PORTAL WORKFLOW STEP

   Frontend receives one explicit step instead of trying
   to understand backend Selection statuses itself.
========================================================= */

const getPortalStep =
  (
    selectionStatus
  ) => {
    const status =
      String(
        selectionStatus ||
          ""
      )
        .trim()
        .toUpperCase();

    /* =====================================================
       LOI
    ===================================================== */

    if (
      status ===
      "LOI_SENT"
    ) {
      return {
        step:
          "LOI_RESPONSE",

        title:
          "Review Letter of Intent",

        progressPercent:
          25,
      };
    }

    if (
      status ===
      "LOI_DECLINED"
    ) {
      return {
        step:
          "LOI_DECLINED",

        title:
          "Response Recorded",

        progressPercent:
          25,
      };
    }

    /* =====================================================
       DOCUMENT ENTRY
    ===================================================== */

    if (
      [
        "PRE_JOINING_DOCUMENTS",
        "DOCUMENT_QUERY",
      ].includes(
        status
      )
    ) {
      return {
        step:
          "DOCUMENTS",

        title:
          status ===
            "DOCUMENT_QUERY"
            ? "Document Update Required"
            : "Pre-Joining Documents",

        progressPercent:
          55,
      };
    }

    /* =====================================================
       VERIFICATION
    ===================================================== */

    if (
      [
        "DOCUMENTS_SUBMITTED",
        "DOCUMENT_VERIFICATION",
      ].includes(
        status
      )
    ) {
      return {
        step:
          "DOCUMENTS_UNDER_VERIFICATION",

        title:
          "Documents Under Verification",

        progressPercent:
          70,
      };
    }

    /* =====================================================
       VERIFIED
    ===================================================== */

    if (
      [
        "DOCUMENTS_VERIFIED",
        "READY_FOR_OFFER",
      ].includes(
        status
      )
    ) {
      return {
        step:
          "DOCUMENTS_VERIFIED",

        title:
          "Documents Verified",

        progressPercent:
          80,
      };
    }

    /* =====================================================
       OFFER / JOINING
    ===================================================== */

    if (
      [
        "OFFER_DRAFT",
        "OFFER_SENT",
        "OFFER_ACCEPTED",
        "OFFER_DECLINED",
        "JOINING_PENDING",
        "JOINING_CONFIRMED",
      ].includes(
        status
      )
    ) {
      return {
        step:
          "POST_VERIFICATION",

        title:
          "Employment Process",

        progressPercent:
          status ===
            "JOINING_CONFIRMED"
            ? 100
            : 90,
      };
    }

    /* =====================================================
       FALLBACK
    ===================================================== */

    return {
      step:
        "STATUS",

      title:
        "Application Status",

      progressPercent:
        20,
    };
  };

/* =========================================================
   GET CANDIDATE PORTAL

   Public-safe response.

   Do NOT expose:
   - internal audit trail
   - employee IDs
   - internal HR notes
   - token hash
   - private selection metadata
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

    if (
      selection
        .isActive ===
        false ||
      selection
        .status ===
        "CLOSED"
    ) {
      throw new ApiError(
        410,
        "This selection process has been closed"
      );
    }

    /* =====================================================
       CURRENT LOI
    ===================================================== */

    let loi =
      null;

    if (
      selection
        .currentLoi
    ) {
      loi =
        await Loi
          .findById(
            selection
              .currentLoi
          )
          .select(
            "documentNumber version status positionTitle officeLocation proposedJoiningDate issueDate sentAt acceptedAt declinedAt declineReason"
          )
          .lean();
    }

    /* =====================================================
       DOCUMENT RECORD

       CandidateDocumentRecord is automatically created after
       LOI acceptance.

       For LOI stage it may legitimately not exist yet.
    ===================================================== */

    const documentRecord =
      await CandidateDocumentRecord
        .findOne({
          selection:
            selection
              ._id,
        })
        .select(
          "status employment.isFresher documents.type documents.originalName documents.size documents.status documents.queryMessage submittedAt declarationAcceptedAt"
        )
        .lean();

    const portalStep =
      getPortalStep(
        selection
          .status
      );

    /* =====================================================
       RESPONSE
    ===================================================== */

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

      workflow: {
        ...portalStep,

        selectionStatus:
          selection
            .status,
      },

      loi:
        loi
          ? {
              documentNumber:
                loi
                  .documentNumber,

              version:
                loi
                  .version,

              status:
                loi
                  .status,

              issueDate:
                loi
                  .issueDate,

              sentAt:
                loi
                  .sentAt,

              acceptedAt:
                loi
                  .acceptedAt,

              declinedAt:
                loi
                  .declinedAt,

              declineReason:
                loi
                  .declineReason ||
                "",

              canView:
                true,

              canAccept:
                loi
                  .status ===
                  "SENT" &&
                selection
                  .status ===
                  "LOI_SENT",

              canDecline:
                loi
                  .status ===
                  "SENT" &&
                selection
                  .status ===
                  "LOI_SENT",
            }
          : null,

      documents:
        documentRecord
          ? {
              status:
                documentRecord
                  .status,

              isFresher:
                documentRecord
                  ?.employment
                  ?.isFresher,

              count:
                documentRecord
                  ?.documents
                  ?.length ||
                0,

              submittedAt:
                documentRecord
                  .submittedAt,

              declarationAcceptedAt:
                documentRecord
                  .declarationAcceptedAt,

              items:
                (
                  documentRecord
                    .documents ||
                  []
                ).map(
                  (
                    document
                  ) => ({
                    _id:
                      document
                        ._id,

                    type:
                      document
                        .type,

                    originalName:
                      document
                        .originalName,

                    size:
                      document
                        .size,

                    status:
                      document
                        .status,

                    queryMessage:
                      document
                        .queryMessage ||
                      "",
                  })
                ),
            }
          : {
              status:
                "NOT_STARTED",

              isFresher:
                null,

              count:
                0,

              submittedAt:
                null,

              declarationAcceptedAt:
                null,

              items:
                [],
            },

      portal: {
        expiresAt:
          tokenRecord
            .expiresAt,
      },
    };
  };

/* =========================================================
   GET PORTAL LOI FILE
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
          "currentLoi isActive status"
        )
        .lean();

    if (
      !selection ||
      selection
        .isActive ===
        false
    ) {
      throw new ApiError(
        404,
        "Selection record is not available"
      );
    }

    if (
      !selection
        .currentLoi
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

    /* =====================================================
       SAFE ABSOLUTE PATH
    ===================================================== */

    const absolutePath =
      path.resolve(
        UPLOADS_ROOT,

        loi
          .file
          .relativePath
      );

    const uploadsPrefix =
      `${UPLOADS_ROOT}${path.sep}`;

    if (
      absolutePath !==
        UPLOADS_ROOT &&
      !absolutePath
        .startsWith(
          uploadsPrefix
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

    /* =====================================================
       VERIFY FILE
    ===================================================== */

    const stat =
      fs.statSync(
        absolutePath
      );

    if (
      !stat
        .isFile()
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

    /* =====================================================
       IDEMPOTENT ACCEPTANCE

       If candidate already accepted and progressed beyond
       LOI, repeat clicks return success rather than error.
    ===================================================== */

    if (
      [
        "PRE_JOINING_DOCUMENTS",
        "DOCUMENTS_SUBMITTED",
        "DOCUMENT_VERIFICATION",
        "DOCUMENT_QUERY",
        "DOCUMENTS_VERIFIED",
        "READY_FOR_OFFER",
        "OFFER_DRAFT",
        "OFFER_SENT",
        "OFFER_ACCEPTED",
        "JOINING_PENDING",
        "JOINING_CONFIRMED",
      ].includes(
        selection
          .status
      )
    ) {
      return {
        success:
          true,

        alreadyAccepted:
          true,

        message:
          "Letter of Intent has already been accepted",

        status:
          selection
            .status,

        nextStage:
          selection
            .status,

        acceptedAt:
          selection
            .loiAcceptedAt,
      };
    }

    if (
      selection
        .status !==
      "LOI_SENT"
    ) {
      throw new ApiError(
        409,
        "Letter of Intent cannot be accepted at the current stage"
      );
    }

    if (
      !selection
        .currentLoi
    ) {
      throw new ApiError(
        404,
        "Letter of Intent not found"
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
      loi
        .status !==
      "SENT"
    ) {
      throw new ApiError(
        409,
        "This Letter of Intent is not awaiting acceptance"
      );
    }

    const now =
      new Date();

    /* =====================================================
       UPDATE LOI
    ===================================================== */

    loi.status =
      "ACCEPTED";

    loi.acceptedAt =
      now;

    loi.declinedAt =
      null;

    loi.declineReason =
      "";

    loi.responseIp =
      cleanIp(
        ip
      );

    loi.responseUserAgent =
      cleanUserAgent(
        userAgent
      );

    await loi.save();

    /* =====================================================
       UPDATE SELECTION

       Candidate moves immediately into pre-joining docs.
    ===================================================== */

    const previousStatus =
      selection
        .status;

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
            loi
              ._id,

          documentNumber:
            loi
              .documentNumber,

          version:
            loi
              .version,

          ip:
            cleanIp(
              ip
            ),
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

    /* =====================================================
       CREATE DOCUMENT RECORD

       Idempotent:
       only created if it doesn't already exist.
    ===================================================== */

    await CandidateDocumentRecord
      .findOneAndUpdate(
        {
          selection:
            selection
              ._id,
        },

        {
          $setOnInsert: {
            selection:
              selection
                ._id,

            candidate:
              selection
                .candidate,

            status:
              "DRAFT",
          },
        },

        {
          upsert:
            true,

          new:
            true,

          setDefaultsOnInsert:
            true,
        }
      );

    return {
      success:
        true,

      alreadyAccepted:
        false,

      message:
        "Letter of Intent accepted successfully",

      status:
        "PRE_JOINING_DOCUMENTS",

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

    /* =====================================================
       IDEMPOTENT DECLINE
    ===================================================== */

    if (
      selection
        .status ===
      "LOI_DECLINED"
    ) {
      return {
        success:
          true,

        alreadyDeclined:
          true,

        message:
          "Your response has already been recorded",

        status:
          "LOI_DECLINED",

        declinedAt:
          selection
            .loiDeclinedAt,
      };
    }

    if (
      selection
        .status !==
      "LOI_SENT"
    ) {
      throw new ApiError(
        409,
        "Letter of Intent cannot be declined at the current stage"
      );
    }

    if (
      !selection
        .currentLoi
    ) {
      throw new ApiError(
        404,
        "Letter of Intent not found"
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
      loi
        .status !==
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

    /* =====================================================
       UPDATE LOI
    ===================================================== */

    loi.status =
      "DECLINED";

    loi.declinedAt =
      now;

    loi.acceptedAt =
      null;

    loi.declineReason =
      cleanReason;

    loi.responseIp =
      cleanIp(
        ip
      );

    loi.responseUserAgent =
      cleanUserAgent(
        userAgent
      );

    await loi.save();

    /* =====================================================
       UPDATE SELECTION
    ===================================================== */

    const previousStatus =
      selection
        .status;

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
          loi
            ._id,

        documentNumber:
          loi
            .documentNumber,

        version:
          loi
            .version,

        ip:
          cleanIp(
            ip
          ),
      },
    });

    await selection.save();

    return {
      success:
        true,

      alreadyDeclined:
        false,

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

  getPortalStep,
};
const crypto =
  require("crypto");

const fs =
  require("fs");

const path =
  require("path");

const mongoose =
  require("mongoose");

const {
  Loi,
} =
  require(
    "./loi.model"
  );

const {
  Selection,
} =
  require(
    "../selection.model"
  );

const ApiError =
  require(
    "../../utils/ApiError"
  );

const {
  generateLoi,
  getLoiReadiness,
} =
  require(
    "../../documentGeneration/loi/loi.generator.service"
  );

const {
  createPortalToken,
} =
  require(
    "../portal/candidatePortal.service"
  );

const transporter =
  require(
    "../../config/mailTransporter"
  );

/* =========================================================
   OPTIONAL LOI EMAIL TEMPLATE
========================================================= */

let buildLoiSentEmail =
  null;

try {
  ({
    buildLoiSentEmail,
  } =
    require(
      "../emails/loiSent.template"
    ));
} catch (
  error
) {
  console.log(
    "[LOI] Dedicated LOI email template not found. Using fallback template."
  );
}

/* =========================================================
   PATHS
========================================================= */

const UPLOADS_ROOT =
  path.resolve(
    __dirname,
    "../../../uploads"
  );

/* =========================================================
   SAFE STRING
========================================================= */

const safeString =
  (
    value
  ) =>
    String(
      value ??
      ""
    ).trim();

/* =========================================================
   SHA-256 FILE
========================================================= */

const sha256File =
  async (
    filePath
  ) => {
    const hash =
      crypto
        .createHash(
          "sha256"
        );

    await new Promise(
      (
        resolve,
        reject
      ) => {
        const stream =
          fs
            .createReadStream(
              filePath
            );

        stream.on(
          "data",
          (
            chunk
          ) => {
            hash.update(
              chunk
            );
          }
        );

        stream.on(
          "end",
          resolve
        );

        stream.on(
          "error",
          reject
        );
      }
    );

    return hash.digest(
      "hex"
    );
  };

/* =========================================================
   LOAD SELECTION
========================================================= */

const getSelectionForLoi =
  async (
    selectionId
  ) => {
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

    const selection =
      await Selection
        .findById(
          selectionId
        )
        .populate(
          "candidate"
        )
        .populate(
          "department",
          "name code"
        )
        .populate(
          "hiringHr",
          "displayName email phone mobile"
        )
        .populate(
          "manpowerRequirement"
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
      !selection
        .candidate
    ) {
      throw new ApiError(
        409,
        "Candidate record linked to this selection was not found"
      );
    }

    if (
      !selection
        .manpowerRequirement
    ) {
      throw new ApiError(
        409,
        "Manpower requirement linked to this selection was not found"
      );
    }

    return selection;
  };

/* =========================================================
   READINESS
========================================================= */

const getSelectionLoiReadiness =
  async (
    selectionId
  ) => {
    const selection =
      await getSelectionForLoi(
        selectionId
      );

    const readiness =
      getLoiReadiness({
        candidate:
          selection
            .candidate,

        selection,

        requirement:
          selection
            .manpowerRequirement,

        overrides:
          {},
      });

    return {
      ready:
        Boolean(
          readiness
            ?.ready
        ),

      missingFields:
        readiness
          ?.missingFields ||
        [],

      selection: {
        _id:
          selection
            ._id,

        selectionNumber:
          selection
            .selectionNumber,

        candidateName:
          selection
            ?.candidate
            ?.fullName ||
          "",

        candidateEmail:
          selection
            ?.candidate
            ?.email ||
          "",

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

        status:
          selection
            .status,
      },
    };
  };

/* =========================================================
   VALIDATE OFFICE
========================================================= */

const normalizeOfficeLocation =
  (
    value
  ) => {
    const office =
      safeString(
        value
      )
        .toUpperCase();

    if (
      !office
    ) {
      return "";
    }

    if (
      ![
        "DELHI",
        "SONIPAT",
      ].includes(
        office
      )
    ) {
      throw new ApiError(
        400,
        "Office location must be DELHI or SONIPAT"
      );
    }

    return office;
  };

/* =========================================================
   GENERATE VERSIONED LOI
========================================================= */

const generateSelectionLoi =
  async ({
    selectionId,
    body =
      {},
    user,
  }) => {
    const selection =
      await getSelectionForLoi(
        selectionId
      );

    /* =====================================================
       STAGE CHECK
    ===================================================== */

    if (
      ![
        "LOI_PENDING",
        "LOI_DRAFT",
        "LOI_DECLINED",
      ].includes(
        selection
          .status
      )
    ) {
      throw new ApiError(
        409,
        "LOI cannot be generated at the current selection stage"
      );
    }

    /* =====================================================
       SAVE ORIGINAL STATUS

       IMPORTANT:
       Must be captured BEFORE changing status to LOI_DRAFT.
    ===================================================== */

    const previousSelectionStatus =
      selection
        .status;

    /* =====================================================
       OFFICE LOCATION
    ===================================================== */

    const officeLocation =
      normalizeOfficeLocation(
        body
          ?.officeLocation ||
        selection
          .officeLocation
      );

    if (
      officeLocation
    ) {
      selection.officeLocation =
        officeLocation;
    }

    /* =====================================================
       PROPOSED JOINING DATE
    ===================================================== */

    if (
      body
        ?.proposedJoiningDate
    ) {
      const proposedDate =
        new Date(
          body
            .proposedJoiningDate
        );

      if (
        Number.isNaN(
          proposedDate
            .getTime()
        )
      ) {
        throw new ApiError(
          400,
          "Invalid proposed joining date"
        );
      }

      selection.proposedJoiningDate =
        proposedDate;
    }

    selection.updatedBy =
      user
        ?._id ||
      null;

    /*
     * Save only the variable information first.
     *
     * IMPORTANT:
     * Do NOT change status yet.
     *
     * If PDF generation fails, the Selection remains at its
     * previous valid workflow stage.
     */
    await selection.save();

    /* =====================================================
       READINESS CHECK BEFORE CHROME

       Do not start Chromium when required document data
       is still missing.
    ===================================================== */

    const readiness =
      getLoiReadiness({
        candidate:
          selection
            .candidate,

        selection,

        requirement:
          selection
            .manpowerRequirement,

        overrides: {
          officeLocation:
            selection
              .officeLocation,

          proposedJoiningDate:
            selection
              .proposedJoiningDate,

          compensationText:
            body
              ?.compensationText ||
            undefined,
        },
      });

    if (
      !readiness
        ?.ready
    ) {
      throw new ApiError(
        400,
        `LOI cannot be generated. Missing: ${
          (
            readiness
              ?.missingFields ||
            []
          ).join(
            ", "
          ) ||
          "required information"
        }`
      );
    }

    /* =====================================================
       GENERATE PDF

       Chromium/Puppeteer belongs INSIDE the common document
       generator, not in this workflow service.

       The generator should use:

       runWithChromiumLock()
             ↓
       ensureChromium()
             ↓
       puppeteer.launch({ executablePath })
             ↓
       page.pdf()
             ↓
       page.close()
             ↓
       browser.close()
    ===================================================== */

    let generated;

    try {
      generated =
        await generateLoi({
          candidate:
            selection
              .candidate,

          selection,

          requirement:
            selection
              .manpowerRequirement,

          overrides: {
            officeLocation:
              selection
                .officeLocation,

            proposedJoiningDate:
              selection
                .proposedJoiningDate,

            compensationText:
              body
                ?.compensationText ||
              undefined,
          },
        });
    } catch (
      error
    ) {
      console.error(
        "[LOI] PDF generation failed:",
        {
          selectionId:
            String(
              selection
                ._id
            ),

          selectionNumber:
            selection
              .selectionNumber,

          candidateId:
            String(
              selection
                ?.candidate
                ?._id ||
              ""
            ),

          error:
            error
              ?.message,
        }
      );

      /*
       * Do not expose Puppeteer paths, Chrome versions,
       * Hostinger paths etc. to HR/frontend.
       */

      throw new ApiError(
        500,
        "The Letter of Intent PDF could not be generated. Please try again or contact the system administrator."
      );
    }

    /* =====================================================
       VALIDATE GENERATOR RESULT
    ===================================================== */

    if (
      !generated
        ?.file
        ?.absolutePath
    ) {
      throw new ApiError(
        500,
        "The Letter of Intent PDF could not be generated."
      );
    }

    if (
      !fs.existsSync(
        generated
          .file
          .absolutePath
      )
    ) {
      throw new ApiError(
        500,
        "The generated Letter of Intent PDF file was not found."
      );
    }

    /* =====================================================
       FILE INFORMATION
    ===================================================== */

    let fileStat;
    let fileHash;

    try {
      fileStat =
        await fs
          .promises
          .stat(
            generated
              .file
              .absolutePath
          );

      if (
        !fileStat
          .isFile() ||
        fileStat
          .size <=
          0
      ) {
        throw new Error(
          "Generated LOI PDF is empty."
        );
      }

      fileHash =
        await sha256File(
          generated
            .file
            .absolutePath
        );
    } catch (
      error
    ) {
      console.error(
        "[LOI] Generated PDF validation failed:",
        error
          ?.message
      );

      throw new ApiError(
        500,
        "The generated Letter of Intent PDF could not be validated."
      );
    }

    /* =====================================================
       FIND LATEST VERSION
    ===================================================== */

    const latest =
      await Loi
        .findOne({
          selection:
            selection
              ._id,
        })
        .sort({
          version:
            -1,
        });

    const nextVersion =
      latest
        ? Number(
            latest
              .version ||
            0
          ) +
          1
        : 1;

    /* =====================================================
       CREATE NEW LOI FIRST

       Do not supersede the previous LOI until the new LOI
       document has been successfully created in MongoDB.
    ===================================================== */

    let loi;

    try {
      loi =
        await Loi
          .create({
            selection:
              selection
                ._id,

            candidate:
              selection
                .candidate
                ?._id ||
              selection
                .candidate,

            manpowerRequirement:
              selection
                .manpowerRequirement
                ?._id ||
              selection
                .manpowerRequirement,

            documentNumber:
              generated
                .documentNumber,

            version:
              nextVersion,

            source:
              "GENERATED",

            status:
              "DRAFT",

            variables: {
              candidateName:
                generated
                  .candidateName,

              position:
                generated
                  .position,

              office:
                generated
                  .office,

              proposedJoiningDate:
                generated
                  .proposedJoiningDate,
            },

            positionTitle:
              generated
                .position,

            officeLocation:
              generated
                ?.office
                ?.code ||
              selection
                .officeLocation,

            proposedJoiningDate:
              generated
                .proposedJoiningDate,

            issueDate:
              generated
                .issueDate,

            file: {
              fileName:
                generated
                  .file
                  .fileName,

              relativePath:
                generated
                  .file
                  .relativePath,

              mimeType:
                "application/pdf",

              size:
                fileStat
                  .size,

              sha256:
                fileHash,
            },

            supersedes:
              latest
                ?._id ||
              null,

            generatedBy:
              user
                ?._id ||
              null,

            generatedAt:
              new Date(),

            updatedBy:
              user
                ?._id ||
              null,
          });
    } catch (
      error
    ) {
      console.error(
        "[LOI] LOI database record creation failed:",
        error
          ?.message
      );

      /*
       * Best-effort cleanup of orphaned generated PDF.
       */

      try {
        await fs
          .promises
          .unlink(
            generated
              .file
              .absolutePath
          );
      } catch (
        cleanupError
      ) {
        // Ignore cleanup failure.
      }

      throw new ApiError(
        500,
        "The Letter of Intent was generated but could not be saved. Please try again."
      );
    }

    /* =====================================================
       SUPERSEDE PREVIOUS VERSION

       Never overwrite history.
    ===================================================== */

    if (
      latest &&
      String(
        latest
          ._id
      ) !==
        String(
          loi
            ._id
        ) &&
      ![
        "ACCEPTED",
        "SUPERSEDED",
      ].includes(
        latest
          .status
      )
    ) {
      latest.status =
        "SUPERSEDED";

      latest.supersededBy =
        loi
          ._id;

      latest.updatedBy =
        user
          ?._id ||
        null;

      await latest.save();
    }

    /* =====================================================
       UPDATE SELECTION ONLY AFTER SUCCESS

       This ensures:
       PDF failure ≠ LOI_DRAFT
    ===================================================== */

    selection.currentLoi =
      loi
        ._id;

    selection.status =
      "LOI_DRAFT";

    selection.updatedBy =
      user
        ?._id ||
      null;

    selection.auditTrail.push({
      event:
        "LOI_GENERATED",

      fromStatus:
        previousSelectionStatus,

      toStatus:
        "LOI_DRAFT",

      remarks:
        `${loi.documentNumber} version ${loi.version} generated.`,

      performedBy:
        user
          ?._id ||
        null,

      at:
        new Date(),

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

        sha256:
          fileHash,

        fileSize:
          fileStat
            .size,
      },
    });

    await selection.save();

    /* =====================================================
       RESPONSE
    ===================================================== */

    return {
      success:
        true,

      message:
        "Letter of Intent generated successfully",

      selectionId:
        selection
          ._id,

      selectionStatus:
        selection
          .status,

      loi: {
        _id:
          loi
            ._id,

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

        generatedAt:
          loi
            .generatedAt,

        fileName:
          loi
            .file
            .fileName,

        size:
          loi
            .file
            .size,
      },
    };
  };

/* =========================================================
   FALLBACK EMAIL
========================================================= */

const buildFallbackLoiEmail =
  ({
    candidate,
    selection,
    portalUrl,
  }) => {
    const companyName =
      process.env
        .COMPANY_NAME ||
      "Sandeep Edge Tech";

    const name =
      candidate
        ?.fullName ||
      "Candidate";

    const position =
      selection
        ?.positionTitle ||
      "the position";

    return {
      subject:
        `Your Letter of Intent | ${position} – ${companyName}`,

      text:
`Dear ${name},

Congratulations on your selection for the position of ${position} at ${companyName}.

Your Letter of Intent is ready for review.

Please use the secure link below to review, download and respond to your Letter of Intent:

${portalUrl}

Warm regards,
People & Culture
${companyName}`,

      html: `
        <div
          style="
            max-width:620px;
            margin:0 auto;
            padding:32px;
            font-family:Arial,Helvetica,sans-serif;
            color:#2d333b;
          "
        >
          <h2 style="margin:0 0 18px;">
            Congratulations, ${name}
          </h2>

          <p
            style="
              margin:0 0 16px;
              line-height:1.7;
            "
          >
            We are pleased to share your Letter of Intent
            for the position of
            <strong>${position}</strong>
            at ${companyName}.
          </p>

          <p
            style="
              margin:0 0 16px;
              line-height:1.7;
            "
          >
            Please use the secure candidate portal below
            to review, download and respond to your Letter
            of Intent.
          </p>

          <p style="margin:28px 0;">
            <a
              href="${portalUrl}"
              style="
                display:inline-block;
                padding:13px 20px;
                background:#e30613;
                color:#ffffff;
                border-radius:8px;
                font-weight:700;
                text-decoration:none;
              "
            >
              Review Letter of Intent
            </a>
          </p>

          <p
            style="
              margin:0;
              line-height:1.7;
            "
          >
            Warm regards,<br>
            <strong>People & Culture</strong><br>
            ${companyName}
          </p>
        </div>
      `,
    };
  };

/* =========================================================
   RESOLVE LOI ABSOLUTE PATH
========================================================= */

const resolveLoiFilePath =
  (
    relativePath
  ) => {
    const normalizedRelativePath =
      safeString(
        relativePath
      );

    if (
      !normalizedRelativePath
    ) {
      throw new ApiError(
        404,
        "Generated LOI PDF is not available"
      );
    }

    const absolutePath =
      path.resolve(
        UPLOADS_ROOT,
        normalizedRelativePath
      );

    const relativeToUploads =
      path.relative(
        UPLOADS_ROOT,
        absolutePath
      );

    if (
      relativeToUploads
        .startsWith(
          ".."
        ) ||
      path.isAbsolute(
        relativeToUploads
      )
    ) {
      throw new ApiError(
        400,
        "Invalid LOI file path"
      );
    }

    if (
      !fs.existsSync(
        absolutePath
      )
    ) {
      throw new ApiError(
        404,
        "Generated LOI PDF is not available"
      );
    }

    return absolutePath;
  };

/* =========================================================
   SEND LOI
========================================================= */

const sendSelectionLoi =
  async ({
    selectionId,
    user,
  }) => {
    const selection =
      await getSelectionForLoi(
        selectionId
      );

    if (
      selection
        .status !==
      "LOI_DRAFT"
    ) {
      throw new ApiError(
        409,
        "Generate the Letter of Intent before sending it"
      );
    }

    if (
      !selection
        .currentLoi
    ) {
      throw new ApiError(
        404,
        "Generated Letter of Intent was not found"
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
        "Letter of Intent was not found"
      );
    }

    if (
      loi
        .status !==
      "DRAFT"
    ) {
      throw new ApiError(
        409,
        "Only a draft Letter of Intent can be sent"
      );
    }

    const candidate =
      selection
        .candidate;

    const candidateEmail =
      safeString(
        candidate
          ?.email
      );

    if (
      !candidateEmail
    ) {
      throw new ApiError(
        400,
        "Candidate email is required before the LOI can be sent"
      );
    }

    /* =====================================================
       VERIFY PDF BEFORE CREATING PORTAL TOKEN
    ===================================================== */

    const absolutePath =
      resolveLoiFilePath(
        loi
          ?.file
          ?.relativePath
      );

    /* =====================================================
       SECURE PORTAL TOKEN
    ===================================================== */

    const portalToken =
      await createPortalToken({
        selectionId:
          selection
            ._id,

        candidateId:
          candidate
            ._id,

        createdBy:
          user
            ?._id ||
          null,
      });

    const frontendBase =
      safeString(
        process.env
          .CANDIDATE_PORTAL_BASE_URL ||
        process.env
          .APP_BASE_URL ||
        "http://localhost:3000"
      ).replace(
        /\/+$/,
        ""
      );

    const portalUrl =
      `${frontendBase}/candidate/selection/${portalToken.rawToken}`;

    /* =====================================================
       EMAIL TEMPLATE
    ===================================================== */

    const template =
      typeof
        buildLoiSentEmail ===
      "function"
        ? buildLoiSentEmail({
            candidate,

            selection,

            loi:
              loi.toObject(),

            portalUrl,
          })
        : buildFallbackLoiEmail({
            candidate,

            selection,

            portalUrl,
          });

    /* =====================================================
       HR CC
    ===================================================== */

    const hiringHrEmail =
      safeString(
        selection
          ?.hiringHr
          ?.email
      );

    const cc =
      hiringHrEmail &&
      hiringHrEmail
        .toLowerCase() !==
        candidateEmail
          .toLowerCase()
        ? [
            hiringHrEmail,
          ]
        : [];

    /* =====================================================
       SAVE ATTEMPT
    ===================================================== */

    loi.candidateEmail.status =
      "PENDING";

    loi.candidateEmail.email =
      candidateEmail;

    loi.candidateEmail.cc =
      cc;

    loi.candidateEmail.subject =
      template
        .subject;

    loi.candidateEmail.lastAttemptAt =
      new Date();

    loi.candidateEmail.error =
      "";

    await loi.save();

    /* =====================================================
       SEND EMAIL

       IMPORTANT:
       Email failure does NOT move the Selection to LOI_SENT.
       HR can retry.
    ===================================================== */

    try {
      const result =
        await transporter
          .sendMail({
            from: {
              name:
                process.env
                  .MAIL_FROM_NAME ||
                "Sandeep Edge Tech",

              address:
                process.env
                  .MAIL_USER,
            },

            replyTo:
              process.env
                .MAIL_REPLY_TO ||
              process.env
                .MAIL_USER,

            to:
              candidateEmail,

            cc:
              cc.length
                ? cc
                : undefined,

            subject:
              template
                .subject,

            text:
              template
                .text,

            html:
              template
                .html,

            attachments: [
              {
                filename:
                  loi
                    .file
                    .fileName,

                path:
                  absolutePath,

                contentType:
                  "application/pdf",
              },
            ],
          });

      const now =
        new Date();

      /* ===================================================
         LOI
      =================================================== */

      loi.status =
        "SENT";

      loi.sentAt =
        now;

      loi.candidateEmail.status =
        "SENT";

      loi.candidateEmail.sentAt =
        now;

      loi.candidateEmail.failedAt =
        null;

      loi.candidateEmail.messageId =
        result
          ?.messageId ||
        "";

      loi.candidateEmail.error =
        "";

      loi.updatedBy =
        user
          ?._id ||
        null;

      await loi.save();

      /* ===================================================
         SELECTION
      =================================================== */

      const previousStatus =
        selection
          .status;

      selection.status =
        "LOI_SENT";

      selection.loiSentAt =
        now;

      selection.updatedBy =
        user
          ?._id ||
        null;

      selection.auditTrail.push({
        event:
          "LOI_SENT",

        fromStatus:
          previousStatus,

        toStatus:
          "LOI_SENT",

        remarks:
          `${loi.documentNumber} sent to ${candidateEmail}.`,

        performedBy:
          user
            ?._id ||
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

          portalExpiresAt:
            portalToken
              .expiresAt,

          candidateEmail,

          hiringHrCc:
            cc,
        },
      });

      await selection.save();

      return {
        success:
          true,

        message:
          "Letter of Intent sent successfully",

        selectionStatus:
          selection
            .status,

        loi: {
          _id:
            loi
              ._id,

          documentNumber:
            loi
              .documentNumber,

          version:
            loi
              .version,

          status:
            loi
              .status,

          sentAt:
            loi
              .sentAt,
        },

        portal: {
          expiresAt:
            portalToken
              .expiresAt,
        },
      };
    } catch (
      error
    ) {
      console.error(
        "[LOI] Email send failed:",
        {
          selectionId:
            String(
              selection
                ._id
            ),

          loiId:
            String(
              loi
                ._id
            ),

          candidateEmail,

          error:
            error
              ?.message,
        }
      );

      loi.candidateEmail.status =
        "FAILED";

      loi.candidateEmail.failedAt =
        new Date();

      loi.candidateEmail.error =
        error
          ?.message ||
        "LOI email could not be sent";

      await loi.save();

      throw new ApiError(
        502,
        "The Letter of Intent was generated successfully, but the email could not be sent. Please try sending it again."
      );
    }
  };

/* =========================================================
   GET CURRENT LOI
========================================================= */

const getCurrentLoi =
  async (
    selectionId
  ) => {
    const selection =
      await getSelectionForLoi(
        selectionId
      );

    if (
      !selection
        .currentLoi
    ) {
      return null;
    }

    return Loi
      .findById(
        selection
          .currentLoi
      )
      .populate(
        "generatedBy",
        "displayName email"
      )
      .lean();
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getSelectionLoiReadiness,

  generateSelectionLoi,

  sendSelectionLoi,

  getCurrentLoi,
};
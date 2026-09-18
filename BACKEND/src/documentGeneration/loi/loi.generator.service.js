const fs =
  require("fs");

const {
  generateDocumentNumber,
} =
  require(
    "../common/documentNumber.service"
  );

const {
  getDocumentBranding,
} =
  require(
    "../common/documentBranding"
  );

const {
  createGeneratedDocumentPath,
} =
  require(
    "../common/documentStorage.service"
  );

const {
  generatePdfFromHtml,
} =
  require(
    "../common/documentPdf.service"
  );

const {
  resolveLoiVariables,
} =
  require(
    "./loi.variables"
  );

const {
  buildLoiHtml,
} =
  require(
    "./loi.template"
  );

const ApiError =
  require(
    "../../utils/ApiError"
  );

/* =========================================================
   SAFE CLEANUP

   Removes any partially generated PDF.

   PDF generation may fail because of:
   - Chromium launch failure
   - HTML rendering failure
   - page.pdf failure
   - filesystem problem

   We never want a broken PDF left in uploads.
========================================================= */

const cleanupGeneratedFile =
  async (
    filePath
  ) => {
    if (
      !filePath
    ) {
      return;
    }

    try {
      if (
        fs.existsSync(
          filePath
        )
      ) {
        await fs
          .promises
          .unlink(
            filePath
          );

        console.log(
          "[LOI] Partial PDF removed:",
          filePath
        );
      }
    } catch (
      error
    ) {
      console.log(
        "[LOI] Partial PDF cleanup warning:",
        error
          ?.message
      );
    }
  };

/* =========================================================
   CHECK READINESS
========================================================= */

const getLoiReadiness =
  ({
    candidate,
    selection,
    requirement,
    overrides =
      {},
  }) => {
    const resolved =
      resolveLoiVariables({
        candidate,

        selection,

        requirement,

        overrides,
      });

    const missingFields =
      Array.isArray(
        resolved
          ?.missingFields
      )
        ? resolved
            .missingFields
        : [];

    return {
      ready:
        missingFields
          .length ===
        0,

      missingFields,

      resolvedData:
        resolved
          ?.data ||
        {},
    };
  };

/* =========================================================
   GENERATE LOI
========================================================= */

const generateLoi =
  async ({
    candidate,
    selection,
    requirement,
    overrides =
      {},
  }) => {
    /* =====================================================
       READINESS

       Do this BEFORE:
       - document number
       - storage
       - Chromium launch

       No unnecessary resources should be consumed when
       mandatory information is missing.
    ===================================================== */

    const readiness =
      getLoiReadiness({
        candidate,

        selection,

        requirement,

        overrides,
      });

    if (
      !readiness
        .ready
    ) {
      throw new ApiError(
        422,
        "Additional information is required before the LOI can be generated.",
        {
          missingFields:
            readiness
              .missingFields,
        }
      );
    }

    /* =====================================================
       BASIC VALIDATION
    ===================================================== */

    const candidateName =
      String(
        readiness
          ?.resolvedData
          ?.candidateName ||
        ""
      ).trim();

    const position =
      String(
        readiness
          ?.resolvedData
          ?.position ||
        ""
      ).trim();

    if (
      !candidateName
    ) {
      throw new ApiError(
        422,
        "Candidate name is required before the LOI can be generated."
      );
    }

    if (
      !position
    ) {
      throw new ApiError(
        422,
        "Position is required before the LOI can be generated."
      );
    }

    /* =====================================================
       ISSUE DATE
    ===================================================== */

    const issueDate =
      new Date();

    /* =====================================================
       AUTO DOCUMENT NUMBER
    ===================================================== */

    let documentNumber;

    try {
      documentNumber =
        await generateDocumentNumber({
          documentType:
            "LOI",

          date:
            issueDate,
        });
    } catch (
      error
    ) {
      console.error(
        "[LOI] Document number generation failed:",
        error
          ?.message
      );

      throw new ApiError(
        500,
        "LOI reference number could not be generated."
      );
    }

    if (
      !documentNumber
        ?.number
    ) {
      throw new ApiError(
        500,
        "LOI reference number could not be generated."
      );
    }

    /* =====================================================
       BRANDING
    ===================================================== */

    let branding;

    try {
      branding =
        getDocumentBranding();
    } catch (
      error
    ) {
      console.error(
        "[LOI] Document branding could not be loaded:",
        error
          ?.message
      );

      throw new ApiError(
        500,
        "LOI branding configuration could not be loaded."
      );
    }

    /* =====================================================
       BUILD HTML
    ===================================================== */

    let html;

    try {
      html =
        buildLoiHtml({
          branding,

          documentNumber:
            documentNumber
              .number,

          issueDate,

          data:
            readiness
              .resolvedData,
        });
    } catch (
      error
    ) {
      console.error(
        "[LOI] HTML generation failed:",
        error
          ?.message
      );

      throw new ApiError(
        500,
        "LOI document template could not be prepared."
      );
    }

    if (
      !html ||
      !String(
        html
      ).trim()
    ) {
      throw new ApiError(
        500,
        "LOI document template returned empty content."
      );
    }

    /* =====================================================
       CREATE OUTPUT PATH
    ===================================================== */

    let storage;

    try {
      storage =
        await createGeneratedDocumentPath({
          documentType:
            "loi",

          documentNumber:
            documentNumber
              .number,

          candidateName,
        });
    } catch (
      error
    ) {
      console.error(
        "[LOI] Storage path creation failed:",
        error
          ?.message
      );

      throw new ApiError(
        500,
        "LOI storage location could not be prepared."
      );
    }

    if (
      !storage
        ?.absolutePath ||
      !storage
        ?.relativePath ||
      !storage
        ?.fileName
    ) {
      throw new ApiError(
        500,
        "LOI storage configuration is incomplete."
      );
    }

    /* =====================================================
       PDF

       IMPORTANT ARCHITECTURE:

       LOI generator does NOT launch Puppeteer itself.

       documentPdf.service.js must perform:

       runWithChromiumLock()
               ↓
       ensureChromium()
               ↓
       puppeteer.launch({
         executablePath
       })
               ↓
       page.setContent()
               ↓
       page.pdf()
               ↓
       page.close()
               ↓
       browser.close()

       This gives the SAME production approach you already
       use successfully in Bharat Sales Order PDF generation.
    ===================================================== */

    try {
      console.log(
        "[LOI] PDF generation started:",
        {
          documentNumber:
            documentNumber
              .number,

          candidate:
            candidateName,

          output:
            storage
              .absolutePath,
        }
      );

      await generatePdfFromHtml({
        html,

        outputPath:
          storage
            .absolutePath,

        documentType:
          "LOI",
      });

      /* ===================================================
         VERIFY PDF EXISTS
      =================================================== */

      if (
        !fs.existsSync(
          storage
            .absolutePath
        )
      ) {
        throw new Error(
          "PDF engine completed but the generated LOI file does not exist."
        );
      }

      const stat =
        await fs
          .promises
          .stat(
            storage
              .absolutePath
          );

      if (
        !stat
          .isFile() ||
        stat
          .size <=
          0
      ) {
        throw new Error(
          "Generated LOI PDF is empty."
        );
      }

      console.log(
        "[LOI] PDF generated successfully:",
        {
          documentNumber:
            documentNumber
              .number,

          fileName:
            storage
              .fileName,

          size:
            stat
              .size,
        }
      );
    } catch (
      error
    ) {
      console.error(
        "[LOI] PDF generation failed:",
        {
          documentNumber:
            documentNumber
              ?.number,

          candidate:
            candidateName,

          error:
            error
              ?.message,
        }
      );

      /* ===================================================
         REMOVE PARTIAL PDF
      =================================================== */

      await cleanupGeneratedFile(
        storage
          ?.absolutePath
      );

      /*
       * Preserve an ApiError already deliberately created
       * by the common PDF engine.
       */

      if (
        error instanceof
        ApiError
      ) {
        throw error;
      }

      /*
       * Do not send raw:
       * Chrome version
       * cache path
       * Hostinger path
       * Puppeteer stack
       * to the HR frontend.
       */

      throw new ApiError(
        500,
        "The Letter of Intent PDF could not be generated. Please try again or contact the system administrator."
      );
    }

    /* =====================================================
       RESULT

       The Selection LOI service saves this information
       in the Loi model and creates the version/audit entry.
    ===================================================== */

    return {
      documentType:
        "LOI",

      documentNumber:
        documentNumber
          .number,

      issueDate,

      candidateName,

      position,

      office:
        readiness
          .resolvedData
          .office,

      proposedJoiningDate:
        readiness
          .resolvedData
          .proposedJoiningDate,

      file: {
        fileName:
          storage
            .fileName,

        absolutePath:
          storage
            .absolutePath,

        relativePath:
          storage
            .relativePath,

        mimeType:
          "application/pdf",
      },
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getLoiReadiness,

  generateLoi,
};
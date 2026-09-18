const fs =
  require("fs");

const path =
  require("path");

const {
  PDFDocument,
  StandardFonts,
} =
  require("pdf-lib");

/* =========================================================
   PAGE
========================================================= */

const A4_WIDTH =
  595.28;

const A4_HEIGHT =
  841.89;

/* =========================================================
   HELPERS
========================================================= */

const safeText =
  (
    value
  ) =>
    String(
      value ??
        ""
    ).trim();

const fitImage =
  ({
    width,
    height,
    maxWidth,
    maxHeight,
  }) => {
    const ratio =
      Math.min(
        maxWidth /
          width,

        maxHeight /
          height
      );

    return {
      width:
        width *
        ratio,

      height:
        height *
        ratio,
    };
  };

/* =========================================================
   COVER PAGE
========================================================= */

const addCoverPage =
  async ({
    pdf,
    employee,
    generatedAt,
    documentCount,
  }) => {
    const page =
      pdf.addPage([
        A4_WIDTH,
        A4_HEIGHT,
      ]);

    const regularFont =
      await pdf.embedFont(
        StandardFonts
          .Helvetica
      );

    const boldFont =
      await pdf.embedFont(
        StandardFonts
          .HelveticaBold
      );

    page.drawText(
      "EMPLOYEE MASTER FILE",
      {
        x:
          54,

        y:
          740,

        size:
          22,

        font:
          boldFont,
      }
    );

    page.drawText(
      safeText(
        employee
          ?.fullName
      ) ||
        "Employee",
      {
        x:
          54,

        y:
          695,

        size:
          18,

        font:
          boldFont,
      }
    );

    page.drawText(
      `Employee ID: ${
        safeText(
          employee
            ?.employeeCode
        ) ||
        "—"
      }`,
      {
        x:
          54,

        y:
          660,

        size:
          11,

        font:
          regularFont,
      }
    );

    page.drawText(
      `Designation: ${
        safeText(
          employee
            ?.designation
        ) ||
        "—"
      }`,
      {
        x:
          54,

        y:
          638,

        size:
          11,

        font:
          regularFont,
      }
    );

    page.drawText(
      `Documents included: ${documentCount}`,
      {
        x:
          54,

        y:
          600,

        size:
          11,

        font:
          regularFont,
      }
    );

    page.drawText(
      `Generated: ${new Date(
        generatedAt
      ).toLocaleString(
        "en-IN"
      )}`,
      {
        x:
          54,

        y:
          578,

        size:
          11,

        font:
          regularFont,
      }
    );

    page.drawText(
      "This file was generated from the controlled employee document record maintained in SE-RMS.",
      {
        x:
          54,

        y:
          115,

        size:
          9,

        font:
          regularFont,

        maxWidth:
          480,
      }
    );
  };

/* =========================================================
   PDF FILE
========================================================= */

const appendPdfFile =
  async ({
    targetPdf,
    buffer,
  }) => {
    const sourcePdf =
      await PDFDocument
        .load(
          buffer,
          {
            ignoreEncryption:
              false,
          }
        );

    const pageIndexes =
      sourcePdf
        .getPageIndices();

    const pages =
      await targetPdf
        .copyPages(
          sourcePdf,
          pageIndexes
        );

    for (
      const page
      of pages
    ) {
      targetPdf
        .addPage(
          page
        );
    }
  };

/* =========================================================
   IMAGE
========================================================= */

const appendImage =
  async ({
    targetPdf,
    buffer,
    mimeType,
  }) => {
    let image;

    if (
      mimeType ===
      "image/png"
    ) {
      image =
        await targetPdf
          .embedPng(
            buffer
          );
    } else {
      image =
        await targetPdf
          .embedJpg(
            buffer
          );
    }

    const page =
      targetPdf
        .addPage([
          A4_WIDTH,
          A4_HEIGHT,
        ]);

    const fitted =
      fitImage({
        width:
          image.width,

        height:
          image.height,

        maxWidth:
          A4_WIDTH -
          72,

        maxHeight:
          A4_HEIGHT -
          72,
      });

    page.drawImage(
      image,
      {
        x:
          (
            A4_WIDTH -
            fitted.width
          ) /
          2,

        y:
          (
            A4_HEIGHT -
            fitted.height
          ) /
          2,

        width:
          fitted.width,

        height:
          fitted.height,
      }
    );
  };

/* =========================================================
   MERGE
========================================================= */

const mergeEmployeeDocuments =
  async ({
    employee,
    documents,
    includeCover =
      true,
  }) => {
    if (
      !Array.isArray(
        documents
      ) ||
      documents.length ===
        0
    ) {
      throw new Error(
        "No employee documents selected for merge."
      );
    }

    const targetPdf =
      await PDFDocument
        .create();

    const generatedAt =
      new Date();

    if (
      includeCover
    ) {
      await addCoverPage({
        pdf:
          targetPdf,

        employee,

        generatedAt,

        documentCount:
          documents.length,
      });
    }

    for (
      const document
      of documents
    ) {
      if (
        !document
          ?.absolutePath ||
        !fs.existsSync(
          document
            .absolutePath
        )
      ) {
        throw new Error(
          `Document file missing: ${
            document
              ?.label ||
            document
              ?.originalFileName ||
            "Unknown document"
          }`
        );
      }

      const buffer =
        await fs.promises
          .readFile(
            document
              .absolutePath
          );

      if (
        document.mimeType ===
        "application/pdf"
      ) {
        try {
          await appendPdfFile({
            targetPdf,

            buffer,
          });
        } catch (
          error
        ) {
          throw new Error(
            `Unable to merge "${
              document.label
            }". The PDF may be password protected or damaged. ${error.message}`
          );
        }

        continue;
      }

      if (
        [
          "image/jpeg",
          "image/png",
        ].includes(
          document.mimeType
        )
      ) {
        await appendImage({
          targetPdf,

          buffer,

          mimeType:
            document
              .mimeType,
        });

        continue;
      }

      throw new Error(
        `Unsupported merge file type for "${document.label}".`
      );
    }

    const bytes =
      await targetPdf.save();

    return Buffer.from(
      bytes
    );
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  mergeEmployeeDocuments,
};
const {
  PDFDocument,
  StandardFonts,
  rgb,
} =
  require(
    "pdf-lib"
  );

const {
  buildAssetHandoverData,
} =
  require(
    "./employeeAsset.template"
  );

/* =========================================================
   PAGE
========================================================= */

const PAGE_WIDTH =
  595.28;

const PAGE_HEIGHT =
  841.89;

const LEFT =
  46;

const RIGHT =
  PAGE_WIDTH -
  46;

/* =========================================================
   WRAP TEXT
========================================================= */

const wrapText =
  ({
    text,
    font,
    size,
    maxWidth,
  }) => {
    const words =
      String(
        text ||
          ""
      ).split(
        /\s+/
      );

    const lines =
      [];

    let current =
      "";

    for (
      const word
      of words
    ) {
      const attempt =
        current
          ? `${current} ${word}`
          : word;

      const width =
        font.widthOfTextAtSize(
          attempt,
          size
        );

      if (
        width <=
        maxWidth
      ) {
        current =
          attempt;
      } else {
        if (
          current
        ) {
          lines.push(
            current
          );
        }

        current =
          word;
      }
    }

    if (
      current
    ) {
      lines.push(
        current
      );
    }

    return lines;
  };

/* =========================================================
   LINE
========================================================= */

const drawLine =
  (
    page,
    y
  ) => {
    page.drawLine({
      start: {
        x:
          LEFT,

        y,
      },

      end: {
        x:
          RIGHT,

        y,
      },

      thickness:
        0.6,

      color:
        rgb(
          0.84,
          0.86,
          0.88
        ),
    });
  };

/* =========================================================
   LABEL VALUE
========================================================= */

const drawField =
  ({
    page,
    label,
    value,
    x,
    y,
    width,
    regular,
    bold,
  }) => {
    page.drawText(
      label.toUpperCase(),
      {
        x,

        y,

        size:
          7,

        font:
          bold,

        color:
          rgb(
            0.46,
            0.5,
            0.54
          ),
      }
    );

    const lines =
      wrapText({
        text:
          value,

        font:
          regular,

        size:
          10,

        maxWidth:
          width,
      });

    let currentY =
      y -
      15;

    for (
      const line
      of lines.slice(
        0,
        3
      )
    ) {
      page.drawText(
        line,
        {
          x,

          y:
            currentY,

          size:
            10,

          font:
            regular,

          color:
            rgb(
              0.12,
              0.14,
              0.17
            ),
        }
      );

      currentY -=
        13;
    }
  };

/* =========================================================
   GENERATE
========================================================= */

const generateAssetHandoverPdf =
  async ({
    employee,
    asset,
  }) => {
    const data =
      buildAssetHandoverData({
        employee,

        asset,
      });

    const pdf =
      await PDFDocument
        .create();

    const page =
      pdf.addPage([
        PAGE_WIDTH,
        PAGE_HEIGHT,
      ]);

    const regular =
      await pdf.embedFont(
        StandardFonts
          .Helvetica
      );

    const bold =
      await pdf.embedFont(
        StandardFonts
          .HelveticaBold
      );

    /* =====================================================
       HEADER
    ===================================================== */

    page.drawText(
      "SANDEEP EDGETECH",
      {
        x:
          LEFT,

        y:
          785,

        size:
          10,

        font:
          bold,

        color:
          rgb(
            0.88,
            0.04,
            0.08
          ),
      }
    );

    page.drawText(
      data.title,
      {
        x:
          LEFT,

        y:
          753,

        size:
          19,

        font:
          bold,

        color:
          rgb(
            0.12,
            0.14,
            0.17
          ),
      }
    );

    page.drawText(
      `Reference: ${data.assignmentNumber}`,
      {
        x:
          LEFT,

        y:
          730,

        size:
          9,

        font:
          regular,

        color:
          rgb(
            0.4,
            0.44,
            0.48
          ),
      }
    );

    drawLine(
      page,
      713
    );

    /* =====================================================
       EMPLOYEE
    ===================================================== */

    page.drawText(
      "EMPLOYEE INFORMATION",
      {
        x:
          LEFT,

        y:
          690,

        size:
          9,

        font:
          bold,

        color:
          rgb(
            0.88,
            0.04,
            0.08
          ),
      }
    );

    drawField({
      page,

      label:
        "Employee Name",

      value:
        data
          .employee
          .name,

      x:
        LEFT,

      y:
        666,

      width:
        220,

      regular,

      bold,
    });

    drawField({
      page,

      label:
        "Employee ID",

      value:
        data
          .employee
          .employeeCode,

      x:
        310,

      y:
        666,

      width:
        200,

      regular,

      bold,
    });

    drawField({
      page,

      label:
        "Designation",

      value:
        data
          .employee
          .designation,

      x:
        LEFT,

      y:
        618,

      width:
        220,

      regular,

      bold,
    });

    drawField({
      page,

      label:
        "Department / Unit",

      value:
        data
          .employee
          .department,

      x:
        310,

      y:
        618,

      width:
        200,

      regular,

      bold,
    });

    drawLine(
      page,
      575
    );

    /* =====================================================
       ASSET
    ===================================================== */

    page.drawText(
      "ASSET INFORMATION",
      {
        x:
          LEFT,

        y:
          553,

        size:
          9,

        font:
          bold,

        color:
          rgb(
            0.88,
            0.04,
            0.08
          ),
      }
    );

    drawField({
      page,

      label:
        "Asset Type",

      value:
        data
          .asset
          .type,

      x:
        LEFT,

      y:
        529,

      width:
        220,

      regular,

      bold,
    });

    drawField({
      page,

      label:
        "Asset Name",

      value:
        data
          .asset
          .name,

      x:
        310,

      y:
        529,

      width:
        200,

      regular,

      bold,
    });

    drawField({
      page,

      label:
        "Asset Code",

      value:
        data
          .asset
          .assetCode,

      x:
        LEFT,

      y:
        481,

      width:
        220,

      regular,

      bold,
    });

    drawField({
      page,

      label:
        "Serial Number",

      value:
        data
          .asset
          .serialNumber,

      x:
        310,

      y:
        481,

      width:
        200,

      regular,

      bold,
    });

    drawField({
      page,

      label:
        "Manufacturer / Model",

      value:
        `${
          data
            .asset
            .manufacturer
        } / ${
          data
            .asset
            .model
        }`,

      x:
        LEFT,

      y:
        433,

      width:
        220,

      regular,

      bold,
    });

    drawField({
      page,

      label:
        "Issue Date",

      value:
        data
          .asset
          .issueDate,

      x:
        310,

      y:
        433,

      width:
        200,

      regular,

      bold,
    });

    drawField({
      page,

      label:
        "Condition",

      value:
        data
          .asset
          .condition,

      x:
        LEFT,

      y:
        385,

      width:
        220,

      regular,

      bold,
    });

    drawField({
      page,

      label:
        "Estimated Value",

      value:
        data
          .asset
          .estimatedValue,

      x:
        310,

      y:
        385,

      width:
        200,

      regular,

      bold,
    });

    /* =====================================================
       ACCESSORIES
    ===================================================== */

    page.drawText(
      "ACCESSORIES",
      {
        x:
          LEFT,

        y:
          337,

        size:
          8,

        font:
          bold,

        color:
          rgb(
            0.42,
            0.46,
            0.5
          ),
      }
    );

    let accessoryY =
      319;

    if (
      data
        .asset
        .accessories
        .length ===
      0
    ) {
      page.drawText(
        "None recorded",
        {
          x:
            LEFT,

          y:
            accessoryY,

          size:
            9,

          font:
            regular,
        }
      );

      accessoryY -=
        16;
    } else {
      for (
        const accessory
        of data
          .asset
          .accessories
          .slice(
            0,
            6
          )
      ) {
        page.drawText(
          `• ${accessory.name}${
            accessory.remarks
              ? ` — ${accessory.remarks}`
              : ""
          }`,
          {
            x:
              LEFT,

            y:
              accessoryY,

            size:
              9,

            font:
              regular,
          }
        );

        accessoryY -=
          15;
      }
    }

    /* =====================================================
       DECLARATION
    ===================================================== */

    drawLine(
      page,
      255
    );

    page.drawText(
      "EMPLOYEE ACKNOWLEDGEMENT",
      {
        x:
          LEFT,

        y:
          235,

        size:
          9,

        font:
          bold,

        color:
          rgb(
            0.88,
            0.04,
            0.08
          ),
      }
    );

    const declarationLines =
      wrapText({
        text:
          data.declaration,

        font:
          regular,

        size:
          8.5,

        maxWidth:
          RIGHT -
          LEFT,
      });

    let declarationY =
      216;

    for (
      const line
      of declarationLines
    ) {
      page.drawText(
        line,
        {
          x:
            LEFT,

          y:
            declarationY,

          size:
            8.5,

          font:
            regular,

          color:
            rgb(
              0.26,
              0.29,
              0.32
            ),
        }
      );

      declarationY -=
        12;
    }

    /* =====================================================
       SIGNATURE
    ===================================================== */

    page.drawLine({
      start: {
        x:
          LEFT,

        y:
          88,
      },

      end: {
        x:
          220,

        y:
          88,
      },

      thickness:
        0.7,
    });

    page.drawText(
      "Employee Signature",
      {
        x:
          LEFT,

        y:
          72,

        size:
          8,

        font:
          regular,
      }
    );

    page.drawLine({
      start: {
        x:
          330,

        y:
          88,
      },

      end: {
        x:
          RIGHT,

        y:
          88,
      },

      thickness:
        0.7,
    });

    page.drawText(
      "HR / Authorized Signatory",
      {
        x:
          330,

        y:
          72,

        size:
          8,

        font:
          regular,
      }
    );

    const bytes =
      await pdf.save();

    return Buffer.from(
      bytes
    );
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  generateAssetHandoverPdf,
};
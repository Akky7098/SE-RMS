const puppeteer =
  require("puppeteer");

/* =========================================================
   HTML → PDF
========================================================= */

const generatePdfFromHtml =
  async ({
    html,
    outputPath,
  }) => {
    if (
      !html
    ) {
      throw new Error(
        "Document HTML is required"
      );
    }

    if (
      !outputPath
    ) {
      throw new Error(
        "PDF output path is required"
      );
    }

    let browser;

    try {
      browser =
        await puppeteer
          .launch({
            headless:
              true,

            args: [
              "--no-sandbox",
              "--disable-setuid-sandbox",
            ],
          });

      const page =
        await browser
          .newPage();

      await page
        .setContent(
          html,
          {
            waitUntil:
              "networkidle0",
          }
        );

      await page
        .emulateMediaType(
          "print"
        );

      await page
        .pdf({
          path:
            outputPath,

          format:
            "A4",

          printBackground:
            true,

          preferCSSPageSize:
            true,

          margin: {
            top:
              "0mm",

            right:
              "0mm",

            bottom:
              "0mm",

            left:
              "0mm",
          },
        });

      return {
        success:
          true,

        path:
          outputPath,
      };
    } finally {
      if (
        browser
      ) {
        await browser
          .close();
      }
    }
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  generatePdfFromHtml,
};
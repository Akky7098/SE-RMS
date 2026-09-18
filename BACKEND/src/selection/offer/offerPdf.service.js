const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const {
  buildOfferHtml,
} = require("./offer.template");



/* =========================================================
   DIRECTORY
========================================================= */

const OFFER_ROOT =
  path.resolve(
    process.cwd(),
    "uploads",
    "selection-offers"
  );

const ensureDirectory = (
  directory
) => {
  if (
    !fs.existsSync(
      directory
    )
  ) {
    fs.mkdirSync(
      directory,
      {
        recursive: true,
      }
    );
  }
};

/* =========================================================
   SAFE FILE NAME
========================================================= */

const safeFilePart = (
  value
) =>
  String(value || "")
    .trim()
    .replace(
      /[^a-zA-Z0-9_-]+/g,
      "_"
    )
    .replace(
      /^_+|_+$/g,
      ""
    );

/* =========================================================
   BROWSER
========================================================= */

const launchBrowser =
  async () => {
    const options = {
      headless: true,

      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
      ],
    };

    /*
     * Optional production Chrome path.
     *
     * Example:
     * PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
     */
    if (
      process.env
        .PUPPETEER_EXECUTABLE_PATH
    ) {
      options.executablePath =
        process.env
          .PUPPETEER_EXECUTABLE_PATH;
    }

    return puppeteer.launch(
      options
    );
  };

/* =========================================================
   GENERATE
========================================================= */

const generateOfferPdf =
  async (
    offer
  ) => {
    if (!offer?._id) {
      throw new Error(
        "Offer record is required for PDF generation."
      );
    }

    const selectionId =
      String(
        offer.selection?._id ||
          offer.selection
      );

    const directory =
      path.join(
        OFFER_ROOT,
        selectionId
      );

    ensureDirectory(
      directory
    );

    const reference =
      safeFilePart(
        offer.referenceNumber
      );

    const fileName =
      `Offer_Letter_${reference}_V${offer.version}.pdf`;

    const outputPath =
      path.join(
        directory,
        fileName
      );

    const html =
      buildOfferHtml(
        offer
      );

    let browser = null;
    let page = null;

    try {
      browser =
        await launchBrowser();

      page =
        await browser.newPage();

      await page.setContent(
        html,
        {
          waitUntil: [
            "load",
            "networkidle0",
          ],
          timeout: 60000,
        }
      );

      await page.pdf({
        path: outputPath,

        format: "A4",

        printBackground: true,

        preferCSSPageSize: true,

        margin: {
          top: "0mm",
          right: "0mm",
          bottom: "0mm",
          left: "0mm",
        },
      });

      if (
        !fs.existsSync(
          outputPath
        )
      ) {
        throw new Error(
          "Offer Letter PDF was not created."
        );
      }

      const stat =
        fs.statSync(
          outputPath
        );

      if (
        stat.size <= 0
      ) {
        throw new Error(
          "Generated Offer Letter PDF is empty."
        );
      }

      return {
        fileName,

        path:
          outputPath,

        mimeType:
          "application/pdf",

        size:
          stat.size,
      };
    } finally {
      if (page) {
        try {
          await page.close();
        } catch {
          // Ignore.
        }
      }

      if (browser) {
        try {
          await browser.close();
        } catch {
          // Ignore.
        }
      }
    }
  };

module.exports = {
  generateOfferPdf,
};
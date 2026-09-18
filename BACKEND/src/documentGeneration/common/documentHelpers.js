const fs =
  require("fs");

const path =
  require("path");

/* =========================================================
   HTML ESCAPE
========================================================= */

const escapeHtml =
  (
    value
  ) =>
    String(
      value ??
        ""
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );

/* =========================================================
   DATE
========================================================= */

const formatDocumentDate =
  (
    value =
      new Date(),
    timezone =
      "Asia/Kolkata"
  ) => {
    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          timezone,

        day:
          "2-digit",

        month:
          "long",

        year:
          "numeric",
      }
    ).format(
      date
    );
  };

/* =========================================================
   SHORT MONTH
========================================================= */

const getShortMonth =
  (
    value =
      new Date(),
    timezone =
      "Asia/Kolkata"
  ) => {
    return new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          timezone,

        month:
          "short",
      }
    )
      .format(
        new Date(
          value
        )
      )
      .toUpperCase();
  };

/* =========================================================
   BASE64 FILE
========================================================= */

const fileToDataUri =
  (
    filePath,
    fallbackMimeType =
      "application/octet-stream"
  ) => {
    if (
      !filePath ||
      !fs.existsSync(
        filePath
      )
    ) {
      return "";
    }

    const extension =
      path
        .extname(
          filePath
        )
        .toLowerCase();

    let mimeType =
      fallbackMimeType;

    if (
      extension ===
        ".png"
    ) {
      mimeType =
        "image/png";
    } else if (
      extension ===
        ".jpg" ||
      extension ===
        ".jpeg"
    ) {
      mimeType =
        "image/jpeg";
    } else if (
      extension ===
        ".svg"
    ) {
      mimeType =
        "image/svg+xml";
    }

    const encoded =
      fs
        .readFileSync(
          filePath
        )
        .toString(
          "base64"
        );

    return `data:${mimeType};base64,${encoded}`;
  };

/* =========================================================
   CLEAN TEXT
========================================================= */

const cleanText =
  (
    value,
    fallback =
      ""
  ) => {
    const text =
      String(
        value ??
          ""
      ).trim();

    return (
      text ||
      fallback
    );
  };

/* =========================================================
   FILE NAME
========================================================= */

const sanitizeFileName =
  (
    value
  ) =>
    String(
      value ||
        "document"
    )
      .trim()
      .replace(
        /[^a-zA-Z0-9._-]+/g,
        "_"
      )
      .replace(
        /_+/g,
        "_"
      )
      .replace(
        /^_+|_+$/g,
        ""
      );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  escapeHtml,

  formatDocumentDate,

  getShortMonth,

  fileToDataUri,

  cleanText,

  sanitizeFileName,
};
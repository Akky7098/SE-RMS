const path =
  require("path");

const {
  fileToDataUri,
} =
  require(
    "./documentHelpers"
  );

/* =========================================================
   ASSETS
========================================================= */

const DEFAULT_LOGO_PATH =
  path.resolve(
    __dirname,
    "../../../assets/documents/branding/sandeep-edge-tech-logo.jpg"
  );

const DEFAULT_DIRECTOR_SIGNATURE_PATH =
  path.resolve(
    __dirname,
    "../../../assets/documents/signatures/director-signature.png"
  );

/* =========================================================
   BRANDING
========================================================= */

const getDocumentBranding =
  () => {
    const logoPath =
      process.env
        .DOCUMENT_LOGO_PATH
        ? path.resolve(
            process.env
              .DOCUMENT_LOGO_PATH
          )
        : DEFAULT_LOGO_PATH;

    const directorSignaturePath =
      process.env
        .DIRECTOR_SIGNATURE_PATH
        ? path.resolve(
            process.env
              .DIRECTOR_SIGNATURE_PATH
          )
        : DEFAULT_DIRECTOR_SIGNATURE_PATH;

    return {
      companyName:
        process.env
          .COMPANY_LEGAL_NAME ||
        "Sandeep Edgetech Limited",

      displayName:
        process.env
          .COMPANY_NAME ||
        "Sandeep Edge Tech",

      tagline:
        process.env
          .COMPANY_TAGLINE ||
        "Steel Solutions",

      logoPath,

      logoDataUri:
        fileToDataUri(
          logoPath
        ),

      director: {
        name:
          process.env
            .DOCUMENT_DIRECTOR_NAME ||
          "Syed Arshad",

        designation:
          process.env
            .DOCUMENT_DIRECTOR_DESIGNATION ||
          "Director",

        signaturePath:
          directorSignaturePath,

        signatureDataUri:
          fileToDataUri(
            directorSignaturePath
          ),
      },

      colors: {
        red:
          "#E30613",

        charcoal:
          "#191B1F",

        text:
          "#2C3138",

        muted:
          "#747D88",

        line:
          "#E1E5E9",

        light:
          "#F6F7F8",
      },
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getDocumentBranding,
};
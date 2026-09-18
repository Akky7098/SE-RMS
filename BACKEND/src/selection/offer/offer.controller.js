const offerService =
  require(
    "./offer.service"
  );

/* =========================================================
   ERROR
========================================================= */

const status = (
  error,
  fallback = 400
) =>
  error?.statusCode ||
  error?.status ||
  fallback;

const sendError = (
  res,
  error,
  fallback
) =>
  res
    .status(
      status(
        error
      )
    )
    .json({
      success: false,

      message:
        error?.message ||
        fallback,
    });

/* =========================================================
   READINESS
========================================================= */

const getReadiness =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await offerService
          .getOfferReadiness(
            req.params
              .selectionId
          );

      return res
        .status(200)
        .json({
          success: true,
          data,
        });
    } catch (error) {
      return sendError(
        res,
        error,
        "Offer readiness could not be loaded."
      );
    }
  };

/* =========================================================
   DETAIL
========================================================= */

const getOffer =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await offerService
          .getOffer(
            req.params
              .selectionId
          );

      return res
        .status(200)
        .json({
          success: true,
          data,
        });
    } catch (error) {
      return sendError(
        res,
        error,
        "Offer Letter could not be loaded."
      );
    }
  };

/* =========================================================
   HISTORY
========================================================= */

const getHistory =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await offerService
          .getOfferHistory(
            req.params
              .selectionId
          );

      return res
        .status(200)
        .json({
          success: true,
          data,
        });
    } catch (error) {
      return sendError(
        res,
        error,
        "Offer Letter history could not be loaded."
      );
    }
  };

/* =========================================================
   GENERATE
========================================================= */

const generate =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await offerService
          .generateOffer({
            selectionId:
              req.params
                .selectionId,

            payload:
              req.body || {},

            actor:
              req.user,
          });

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Offer Letter generated successfully. HR review is required before sending.",

          data,
        });
    } catch (error) {
      return sendError(
        res,
        error,
        "Offer Letter could not be generated."
      );
    }
  };

/* =========================================================
   OPEN PDF
========================================================= */

const openPdf =
  async (
    req,
    res
  ) => {
    try {
      const file =
        await offerService
          .getOfferFile(
            req.params
              .selectionId
          );

      res.type(
        file.mimeType
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${String(
          file.fileName ||
            "Offer-Letter.pdf"
        ).replaceAll(
          '"',
          ""
        )}"`
      );

      return res.sendFile(
        file.path
      );
    } catch (error) {
      return sendError(
        res,
        error,
        "Offer Letter PDF could not be opened."
      );
    }
  };

/* =========================================================
   REVIEW
========================================================= */

const markReviewed =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await offerService
          .markOfferReviewed({
            selectionId:
              req.params
                .selectionId,

            actor:
              req.user,
          });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Offer Letter marked as reviewed.",

          data,
        });
    } catch (error) {
      return sendError(
        res,
        error,
        "Offer Letter review could not be confirmed."
      );
    }
  };

/* =========================================================
   SEND
========================================================= */

const send =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await offerService
          .markOfferSent({
            selectionId:
              req.params
                .selectionId,

            actor:
              req.user,
          });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Offer Letter marked as sent successfully.",

          data,
        });
    } catch (error) {
      return sendError(
        res,
        error,
        "Offer Letter could not be sent."
      );
    }
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getReadiness,

  getOffer,

  getHistory,

  generate,

  openPdf,

  markReviewed,

  send,
};
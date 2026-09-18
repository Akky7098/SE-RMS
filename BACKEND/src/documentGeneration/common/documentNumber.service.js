const {
  DocumentCounter,
} =
  require(
    "./documentCounter.model"
  );

const {
  getShortMonth,
} =
  require(
    "./documentHelpers"
  );

/* =========================================================
   NEXT NUMBER
========================================================= */

const generateDocumentNumber =
  async ({
    documentType,
    date =
      new Date(),
    timezone =
      "Asia/Kolkata",
  }) => {
    const type =
      String(
        documentType ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      !type
    ) {
      throw new Error(
        "Document type is required"
      );
    }

    const dateValue =
      new Date(
        date
      );

    const year =
      Number(
        new Intl.DateTimeFormat(
          "en-US",
          {
            timeZone:
              timezone,

            year:
              "numeric",
          }
        ).format(
          dateValue
        )
      );

    const month =
      getShortMonth(
        dateValue,
        timezone
      );

    const key =
      `${type}:${year}:${month}`;

    /* =====================================================
       ATOMIC COUNTER

       Safe when two users generate documents together.
    ===================================================== */

    const counter =
      await DocumentCounter
        .findOneAndUpdate(
          {
            key,
          },

          {
            $setOnInsert: {
              key,

              documentType:
                type,

              year,

              period:
                month,
            },

            $inc: {
              sequence:
                1,
            },
          },

          {
            new:
              true,

            upsert:
              true,

            setDefaultsOnInsert:
              true,
          }
        )
        .lean();

    const sequence =
      String(
        counter.sequence
      ).padStart(
        4,
        "0"
      );

    /* =====================================================
       FORMAT

       2026/SEL/HR/LOI/SEP/0001
    ===================================================== */

    return {
      number:
        `${year}/SEL/HR/${type}/${month}/${sequence}`,

      sequence:
        counter.sequence,

      year,

      month,

      type,
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  generateDocumentNumber,
};
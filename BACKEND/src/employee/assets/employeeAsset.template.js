/* =========================================================
   HELPERS
========================================================= */

const safe =
  (
    value,
    fallback =
      "—"
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

const formatDate =
  (
    value
  ) => {
    if (!value) {
      return "—";
    }

    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "—";
    }

    return new Intl
      .DateTimeFormat(
        "en-IN",
        {
          day:
            "2-digit",

          month:
            "long",

          year:
            "numeric",
        }
      )
      .format(
        date
      );
};

const formatMoney =
  (
    value,
    currency =
      "INR"
  ) => {
    if (
      value ===
        null ||
      value ===
        undefined ||
      value ===
        ""
    ) {
      return "—";
    }

    const number =
      Number(
        value
      );

    if (
      Number.isNaN(
        number
      )
    ) {
      return safe(
        value
      );
    }

    try {
      return new Intl
        .NumberFormat(
          "en-IN",
          {
            style:
              "currency",

            currency:
              currency ||
              "INR",

            maximumFractionDigits:
              2,
          }
        )
        .format(
          number
        );
    } catch {
      return `${currency} ${number}`;
    }
  };

/* =========================================================
   TEMPLATE DATA
========================================================= */

const buildAssetHandoverData =
  ({
    employee,
    asset,
  }) => {
    const accessories =
      Array.isArray(
        asset
          ?.accessories
      )
        ? asset
            .accessories
            .filter(
              (
                item
              ) =>
                item
                  ?.included !==
                false
            )
        : [];

    return {
      title:
        "Employee Asset Handover & Acknowledgement",

      assignmentNumber:
        safe(
          asset
            ?.assignmentNumber
        ),

      employee: {
        name:
          safe(
            employee
              ?.fullName
          ),

        employeeCode:
          safe(
            employee
              ?.employeeCode
          ),

        designation:
          safe(
            employee
              ?.designation
          ),

        department:
          safe(
            employee
              ?.department
              ?.name ||
            employee
              ?.orgUnitCode
          ),

        location:
          safe(
            employee
              ?.workLocation
          ),
      },

      asset: {
        type:
          safe(
            asset
              ?.assetType
          )
            .replaceAll(
              "_",
              " "
            ),

        name:
          safe(
            asset
              ?.assetName
          ),

        assetCode:
          safe(
            asset
              ?.assetCode
          ),

        serialNumber:
          safe(
            asset
              ?.serialNumber
          ),

        manufacturer:
          safe(
            asset
              ?.manufacturer
          ),

        model:
          safe(
            asset
              ?.model
          ),

        issueDate:
          formatDate(
            asset
              ?.issueDate
          ),

        condition:
          safe(
            asset
              ?.conditionAtIssue
          )
            .replaceAll(
              "_",
              " "
            ),

        estimatedValue:
          formatMoney(
            asset
              ?.estimatedValue,

            asset
              ?.currency
          ),

        accessories,

        remarks:
          safe(
            asset
              ?.remarks,
            ""
          ),
      },

      declaration:
        "I acknowledge receipt of the above company asset(s) in the stated condition. I understand that these assets remain the property of the company and are provided for official use. I agree to exercise reasonable care, follow applicable company policies, promptly report loss or damage, and return the assets when requested or upon separation from the organisation.",
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  buildAssetHandoverData,
};
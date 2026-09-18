const {
  escapeHtml,
  formatDocumentDate,
} =
  require(
    "../common/documentHelpers"
  );

/* =========================================================
   TEMPLATE
========================================================= */

const buildLoiHtml =
  ({
    branding,
    documentNumber,
    issueDate,
    data,
  }) => {
    const colors =
      branding.colors;

    const joiningDate =
      formatDocumentDate(
        data
          .proposedJoiningDate
      );

    const signatureHtml =
      branding
        ?.director
        ?.signatureDataUri
        ? `
          <img
            src="${branding.director.signatureDataUri}"
            alt="Authorized Signature"
            style="
              display:block;
              width:auto;
              max-width:145px;
              max-height:52px;
              object-fit:contain;
              margin:0 0 4px 0;
            "
          />
        `
        : `
          <div
            style="
              height:46px;
            "
          ></div>
        `;

    return `
<!doctype html>

<html>
<head>
  <meta charset="utf-8">

  <style>
    @page {
      size: A4;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;

      width: 210mm;
      min-height: 297mm;

      font-family:
        Arial,
        Helvetica,
        sans-serif;

      color:
        ${colors.text};

      background:
        #ffffff;
    }

    body {
      -webkit-print-color-adjust:
        exact;

      print-color-adjust:
        exact;
    }
  </style>
</head>

<body>

<div
  style="
    width:210mm;
    height:297mm;
    position:relative;
    background:#ffffff;
    overflow:hidden;
  "
>

  <!-- =====================================================
       TOP ACCENT
  ====================================================== -->

  <div
    style="
      height:7mm;
      background:${colors.red};
    "
  ></div>

  <!-- =====================================================
       MAIN PAGE
  ====================================================== -->

  <div
    style="
      padding:
        11mm
        18mm
        20mm
        18mm;
    "
  >

    <!-- ===================================================
         HEADER
    ==================================================== -->

    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
    >
      <tr>
        <td
          width="48%"
          valign="top"
        >
          ${
            branding
              .logoDataUri
              ? `
                <img
                  src="${branding.logoDataUri}"
                  alt="${escapeHtml(
                    branding.displayName
                  )}"
                  style="
                    display:block;
                    width:55mm;
                    max-height:22mm;
                    object-fit:contain;
                    object-position:left center;
                  "
                />
              `
              : ""
          }
        </td>

        <td
          width="52%"
          valign="top"
          align="right"
        >
          <div
            style="
              color:${colors.muted};
              font-size:7.5pt;
              font-weight:700;
              letter-spacing:1.2pt;
            "
          >
            PEOPLE & CULTURE
          </div>

          <div
            style="
              margin-top:3mm;
              color:${colors.charcoal};
              font-size:18pt;
              font-weight:700;
              letter-spacing:-0.3pt;
            "
          >
            LETTER OF INTENT
          </div>

          <div
            style="
              display:inline-block;
              width:47mm;
              height:0.8mm;
              margin-top:2.2mm;
              background:${colors.red};
            "
          ></div>
        </td>
      </tr>
    </table>

    <!-- ===================================================
         META
    ==================================================== -->

    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        margin-top:8mm;
        background:${colors.light};
        border-radius:3mm;
      "
    >
      <tr>
        <td
          width="58%"
          style="
            padding:4mm 5mm;
          "
        >
          <div
            style="
              color:${colors.muted};
              font-size:7pt;
              font-weight:700;
              letter-spacing:0.8pt;
            "
          >
            REFERENCE
          </div>

          <div
            style="
              margin-top:1.5mm;
              color:${colors.text};
              font-size:9pt;
              font-weight:700;
            "
          >
            ${escapeHtml(
              documentNumber
            )}
          </div>
        </td>

        <td
          width="42%"
          style="
            padding:4mm 5mm;
          "
        >
          <div
            style="
              color:${colors.muted};
              font-size:7pt;
              font-weight:700;
              letter-spacing:0.8pt;
            "
          >
            ISSUE DATE
          </div>

          <div
            style="
              margin-top:1.5mm;
              color:${colors.text};
              font-size:9pt;
              font-weight:700;
            "
          >
            ${escapeHtml(
              formatDocumentDate(
                issueDate
              )
            )}
          </div>
        </td>
      </tr>
    </table>

    <!-- ===================================================
         RECIPIENT
    ==================================================== -->

    <div
      style="
        margin-top:7mm;
      "
    >
      <div
        style="
          color:${colors.muted};
          font-size:7pt;
          font-weight:700;
          letter-spacing:0.8pt;
        "
      >
        ISSUED TO
      </div>

      <div
        style="
          margin-top:2mm;
          color:${colors.charcoal};
          font-size:13pt;
          font-weight:700;
        "
      >
        ${escapeHtml(
          data.candidateName
        )}
      </div>

      ${
        data
          .fatherName
          ? `
            <div
              style="
                margin-top:1.5mm;
                color:${colors.muted};
                font-size:8.4pt;
              "
            >
              D/o / S/o ${escapeHtml(
                data.fatherName
              )}
            </div>
          `
          : ""
      }

      ${
        data
          .address
          ? `
            <div
              style="
                margin-top:1.2mm;
                max-width:125mm;
                color:${colors.muted};
                font-size:8.4pt;
                line-height:1.5;
              "
            >
              ${escapeHtml(
                data.address
              )}
            </div>
          `
          : ""
      }

      <div
        style="
          margin-top:2mm;
          color:${colors.muted};
          font-size:8.2pt;
          line-height:1.6;
        "
      >
        ${
          data.email
            ? `Email: ${escapeHtml(
                data.email
              )}`
            : ""
        }

        ${
          data.email &&
          data.mobile
            ? "&nbsp;&nbsp;&nbsp;&nbsp;"
            : ""
        }

        ${
          data.mobile
            ? `Mobile: ${escapeHtml(
                data.mobile
              )}`
            : ""
        }
      </div>
    </div>

    <!-- ===================================================
         LETTER
    ==================================================== -->

    <div
      style="
        margin-top:7mm;
        color:${colors.text};
        font-size:9pt;
        line-height:1.72;
      "
    >

      <p
        style="
          margin:0 0 3.5mm 0;
        "
      >
        Dear
        ${escapeHtml(
          data.candidateName
            .split(" ")[0]
        )},
      </p>

      <p
        style="
          margin:0;
          text-align:justify;
        "
      >
        This is with reference to your application
        and subsequent interview with
        ${escapeHtml(
          branding.companyName
        )}.
        We are pleased to offer you the position of
        <strong>
          ${escapeHtml(
            data.position
          )}
        </strong>
        for our
        <strong>
          ${escapeHtml(
            data.office.label
          )}
        </strong>.
        Your compensation will be
        ${escapeHtml(
          data.compensationText
        )}
        You are requested to report on or before
        <strong>
          ${escapeHtml(
            joiningDate
          )}
        </strong>.
      </p>

    </div>

    <!-- ===================================================
         OFFER SUMMARY
    ==================================================== -->

    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        margin-top:6mm;
        background:#FFF7F8;
        border-left:1.2mm solid ${colors.red};
        border-radius:2.5mm;
      "
    >
      <tr>
        <td
          width="37%"
          style="
            padding:4mm 4mm 4mm 5mm;
          "
        >
          <div
            style="
              color:${colors.muted};
              font-size:6.7pt;
              font-weight:700;
              letter-spacing:0.5pt;
            "
          >
            POSITION
          </div>

          <div
            style="
              margin-top:1.5mm;
              color:${colors.charcoal};
              font-size:8.8pt;
              font-weight:700;
            "
          >
            ${escapeHtml(
              data.position
            )}
          </div>
        </td>

        <td
          width="34%"
          style="
            padding:4mm;
          "
        >
          <div
            style="
              color:${colors.muted};
              font-size:6.7pt;
              font-weight:700;
              letter-spacing:0.5pt;
            "
          >
            WORK LOCATION
          </div>

          <div
            style="
              margin-top:1.5mm;
              color:${colors.charcoal};
              font-size:8.8pt;
              font-weight:700;
            "
          >
            ${escapeHtml(
              data.office.label
            )}
          </div>
        </td>

        <td
          width="29%"
          style="
            padding:4mm;
          "
        >
          <div
            style="
              color:${colors.muted};
              font-size:6.7pt;
              font-weight:700;
              letter-spacing:0.5pt;
            "
          >
            REPORT BY
          </div>

          <div
            style="
              margin-top:1.5mm;
              color:${colors.charcoal};
              font-size:8.8pt;
              font-weight:700;
            "
          >
            ${escapeHtml(
              joiningDate
            )}
          </div>
        </td>
      </tr>
    </table>

    <!-- ===================================================
         DOCUMENTS
    ==================================================== -->

    <div
      style="
        margin-top:6mm;
      "
    >
      <div
        style="
          color:${colors.charcoal};
          font-size:10.5pt;
          font-weight:700;
        "
      >
        Documents to carry at joining
      </div>

      <div
        style="
          margin-top:1.5mm;
          color:${colors.muted};
          font-size:7.7pt;
          line-height:1.5;
        "
      >
        Please bring the following original documents
        and photocopies, wherever applicable, for
        verification and onboarding.
      </div>

      <ol
        style="
          margin:
            3.5mm
            0
            0
            5mm;

          padding-left:5mm;

          color:${colors.text};

          font-size:8.4pt;

          line-height:1.62;
        "
      >
        <li>
          Four recent passport-size photographs.
        </li>

        <li>
          Qualification certificates in original,
          together with one photocopy set. Originals
          will be returned after verification.
        </li>

        <li>
          Proof of residence and Aadhaar Card.
        </li>

        <li>
          Resignation Letter and Relieving Letter from
          the current / previous employer, where
          applicable.
        </li>

        <li>
          Last drawn salary slip, where applicable.
        </li>

        <li>
          Form 16 / TDS certificate and PAN Card for
          statutory and income-tax documentation.
        </li>
      </ol>
    </div>

    <!-- ===================================================
         APPOINTMENT NOTE
    ==================================================== -->

    <div
      style="
        margin-top:5mm;
        color:${colors.text};
        font-size:8.6pt;
        line-height:1.65;
        text-align:justify;
      "
    >
      A detailed Appointment Letter containing the
      terms and conditions applicable to your
      employment will be issued upon your joining the
      Company.

      <br><br>

      We welcome you to
      ${escapeHtml(
        branding.companyName
      )}
      and wish you a rewarding and successful career
      ahead.
    </div>

    <!-- ===================================================
         HR CONTACT
    ==================================================== -->

    ${
      data.hrName ||
      data.hrEmail
        ? `
          <div
            style="
              margin-top:5mm;
              padding:3.5mm 4mm;
              background:${colors.light};
              border-radius:2.5mm;
            "
          >
            <div
              style="
                color:${colors.muted};
                font-size:6.6pt;
                font-weight:700;
                letter-spacing:0.5pt;
              "
            >
              FOR ANY ASSISTANCE
            </div>

            <div
              style="
                margin-top:1.2mm;
                color:${colors.text};
                font-size:8.3pt;
                font-weight:700;
              "
            >
              ${escapeHtml(
                data.hrName
              )}
            </div>

            ${
              data.hrEmail
                ? `
                  <div
                    style="
                      margin-top:0.8mm;
                      color:${colors.muted};
                      font-size:7.8pt;
                    "
                  >
                    ${escapeHtml(
                      data.hrEmail
                    )}
                  </div>
                `
                : ""
            }
          </div>
        `
        : ""
    }

    <!-- ===================================================
         SIGNATURE
    ==================================================== -->

    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        margin-top:6mm;
      "
    >
      <tr>
        <td
          width="55%"
          valign="bottom"
        >
          <div
            style="
              color:${colors.text};
              font-size:8.5pt;
              line-height:1.6;
            "
          >
            Regards,
            <br>

            <strong>
              ${escapeHtml(
                branding.companyName
              )}
            </strong>
          </div>
        </td>

        <td
          width="45%"
          valign="bottom"
          align="left"
          style="
            padding-left:12mm;
          "
        >
          ${signatureHtml}

          <div
            style="
              color:${colors.charcoal};
              font-size:8.7pt;
              font-weight:700;
            "
          >
            ${escapeHtml(
              branding
                .director
                .name
            )}
          </div>

          <div
            style="
              margin-top:0.8mm;
              color:${colors.muted};
              font-size:7.5pt;
            "
          >
            ${escapeHtml(
              branding
                .director
                .designation
            )}
          </div>
        </td>
      </tr>
    </table>

  </div>

  <!-- =====================================================
       FOOTER
  ====================================================== -->

  <div
    style="
      position:absolute;
      left:0;
      right:0;
      bottom:0;

      height:15mm;

      padding:
        5mm
        18mm
        0
        18mm;

      background:${colors.charcoal};

      border-top:
        1mm
        solid
        ${colors.red};
    "
  >

    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
    >
      <tr>
        <td
          style="
            color:#ffffff;
            font-size:6.8pt;
            font-weight:700;
          "
        >
          ${escapeHtml(
            branding.companyName.toUpperCase()
          )}
        </td>

        <td
          align="right"
          style="
            color:#AAB1BB;
            font-size:6.4pt;
          "
        >
          SE-RMS · System Generated Letter of Intent
        </td>
      </tr>
    </table>

  </div>

</div>

</body>
</html>
`;
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  buildLoiHtml,
};
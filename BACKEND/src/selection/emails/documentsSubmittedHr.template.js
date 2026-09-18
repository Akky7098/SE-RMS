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
   DOCUMENT LABELS
========================================================= */

const DOCUMENT_LABELS = {
  AADHAAR:
    "Aadhaar Card",

  PAN:
    "PAN Card",

  BANK_PROOF:
    "Bank Proof / Cancelled Cheque",

  EXPERIENCE_LETTER:
    "Experience Letter",

  RELIEVING_LETTER:
    "Relieving Letter",

  PHOTO:
    "Passport-size Photograph",

  SIGNATURE:
    "Signature",

  HIGHEST_QUALIFICATION:
    "Highest Qualification Certificate",

  SALARY_SLIP:
    "Salary Slip",

  PREVIOUS_APPOINTMENT_LETTER:
    "Previous Appointment Letter",

  FORM16:
    "Form 16 / TDS Certificate",

  OTHER:
    "Other Document",
};

/* =========================================================
   FILE SIZE
========================================================= */

const formatFileSize =
  (
    bytes
  ) => {
    const value =
      Number(
        bytes ||
          0
      );

    if (
      value <=
      0
    ) {
      return "";
    }

    if (
      value <
      1024 *
        1024
    ) {
      return `${Math.max(
        1,
        Math.round(
          value /
            1024
        )
      )} KB`;
    }

    return `${(
      value /
      (
        1024 *
        1024
      )
    ).toFixed(
      1
    )} MB`;
  };

/* =========================================================
   DOCUMENT ROWS
========================================================= */

const buildDocumentRows =
  (
    documents = []
  ) => {
    if (
      !Array.isArray(
        documents
      ) ||
      !documents.length
    ) {
      return `
        <tr>
          <td
            colspan="3"
            style="
              padding:15px 16px;
              color:#7b8590;
              font-size:12px;
              line-height:1.5;
            "
          >
            No uploaded documents found.
          </td>
        </tr>
      `;
    }

    return documents
      .map(
        (
          document,
          index
        ) => {
          const label =
            DOCUMENT_LABELS[
              document
                ?.type
            ] ||
            document
              ?.type ||
            "Document";

          const fileName =
            document
              ?.originalName ||
            "Uploaded file";

          const size =
            formatFileSize(
              document
                ?.size
            );

          return `
            <tr>
              <td
                valign="top"
                style="
                  width:34px;
                  padding:
                    13px
                    8px
                    13px
                    16px;
                  border-top:
                    ${
                      index
                        ? "1px solid #edf0f3"
                        : "0"
                    };
                  color:#929ba5;
                  font-size:11px;
                  font-weight:700;
                "
              >
                ${index + 1}
              </td>

              <td
                valign="top"
                style="
                  padding:
                    13px
                    8px;
                  border-top:
                    ${
                      index
                        ? "1px solid #edf0f3"
                        : "0"
                    };
                "
              >
                <div
                  style="
                    color:#303842;
                    font-size:12.5px;
                    line-height:1.45;
                    font-weight:700;
                  "
                >
                  ${escapeHtml(
                    label
                  )}
                </div>

                <div
                  style="
                    margin-top:3px;
                    color:#7b8590;
                    font-size:11.5px;
                    line-height:1.45;
                  "
                >
                  ${escapeHtml(
                    fileName
                  )}
                </div>
              </td>

              <td
                valign="top"
                align="right"
                style="
                  padding:
                    13px
                    16px
                    13px
                    8px;
                  border-top:
                    ${
                      index
                        ? "1px solid #edf0f3"
                        : "0"
                    };
                  color:#79838e;
                  font-size:11px;
                  white-space:nowrap;
                "
              >
                ${escapeHtml(
                  size
                )}
              </td>
            </tr>
          `;
        }
      )
      .join(
        ""
      );
  };

/* =========================================================
   TEXT DOCUMENT LIST
========================================================= */

const buildTextDocumentList =
  (
    documents = []
  ) => {
    if (
      !Array.isArray(
        documents
      ) ||
      !documents.length
    ) {
      return "No document information available.";
    }

    return documents
      .map(
        (
          document,
          index
        ) => {
          const label =
            DOCUMENT_LABELS[
              document
                ?.type
            ] ||
            document
              ?.type ||
            "Document";

          const fileName =
            document
              ?.originalName ||
            "Uploaded file";

          return `${index + 1}. ${label} - ${fileName}`;
        }
      )
      .join(
        "\n"
      );
  };

/* =========================================================
   TEMPLATE
========================================================= */

const buildDocumentsSubmittedHrEmail =
  ({
    candidate,
    selection,
    record,
    internalUrl,
  }) => {
    const company =
      process.env
        .COMPANY_NAME ||
      "Sandeep Edge Tech";

    const name =
      candidate
        ?.fullName ||
      "Candidate";

    const position =
      selection
        ?.positionTitle ||
      "Position";

    const selectionNumber =
      selection
        ?.selectionNumber ||
      "";

    const documents =
      Array.isArray(
        record
          ?.documents
      )
        ? record.documents
        : [];

    const documentCount =
      documents.length;

    const subject =
      `Action required: ${name} submitted pre-joining documents`;

    const documentText =
      buildTextDocumentList(
        documents
      );

    const text =
`${name} has submitted pre-joining documents.

Position: ${position}
Selection: ${selectionNumber}
Documents submitted: ${documentCount}

Documents:
${documentText}

All uploaded documents are attached with this email for quick review.

The candidate record is now under HR verification.

Review in SE-RMS:
${internalUrl || ""}`;

    const html = `
<!doctype html>

<html>
<head>
<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>

<meta
  name="x-apple-disable-message-reformatting"
>

<style>
@media only screen and (max-width:620px) {
  .shell {
    padding:0 !important;
  }

  .card {
    width:100% !important;
    max-width:100% !important;
    border-radius:0 !important;
  }

  .hero,
  .body,
  .footer {
    padding-left:20px !important;
    padding-right:20px !important;
  }

  .hero-title {
    font-size:25px !important;
  }

  .action-button {
    display:block !important;
    width:100% !important;
    box-sizing:border-box !important;
    text-align:center !important;
  }
}
</style>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f2f4f6;
    font-family:Arial,Helvetica,sans-serif;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  role="presentation"
  style="
    width:100%;
    background:#f2f4f6;
  "
>
<tr>
<td
  class="shell"
  align="center"
  style="
    padding:34px 14px;
  "
>

<table
  class="card"
  width="640"
  cellpadding="0"
  cellspacing="0"
  border="0"
  role="presentation"
  style="
    width:100%;
    max-width:640px;
    background:#ffffff;
    border:1px solid #e2e6eb;
    border-radius:20px;
    overflow:hidden;
  "
>

<!-- =====================================================
     HERO
====================================================== -->

<tr>
<td
  class="hero"
  style="
    padding:31px 34px;
    background:#191c21;
  "
>

<div
  style="
    color:#ffabb4;
    font-size:11px;
    font-weight:700;
    letter-spacing:1.6px;
  "
>
  HR ACTION REQUIRED
</div>

<h1
  class="hero-title"
  style="
    margin:10px 0 8px;
    color:#ffffff;
    font-size:28px;
    line-height:1.18;
    font-weight:700;
  "
>
  Candidate documents submitted
</h1>

<p
  style="
    margin:0;
    color:#d6dce3;
    font-size:14px;
    line-height:1.7;
  "
>
  A selected candidate has completed the
  pre-joining submission and is ready for verification.
</p>

</td>
</tr>

<!-- =====================================================
     CANDIDATE
====================================================== -->

<tr>
<td
  class="body"
  style="
    padding:30px 34px 24px;
  "
>

<div
  style="
    color:#313942;
    font-size:20px;
    line-height:1.3;
    font-weight:700;
  "
>
  ${escapeHtml(
    name
  )}
</div>

<div
  style="
    margin-top:5px;
    color:#78828e;
    font-size:13px;
    line-height:1.5;
  "
>
  ${escapeHtml(
    position
  )}

  ${
    selectionNumber
      ? `
        &nbsp;·&nbsp;
        ${escapeHtml(
          selectionNumber
        )}
      `
      : ""
  }
</div>

<!-- ===================================================
     STATUS
==================================================== -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  role="presentation"
  style="
    margin-top:22px;
    background:#f1faf5;
    border:1px solid #cfe6d7;
    border-radius:13px;
  "
>
<tr>
<td
  style="
    padding:18px 19px;
  "
>

<div
  style="
    color:#397a55;
    font-size:10.5px;
    line-height:1.4;
    font-weight:700;
    letter-spacing:1px;
  "
>
  CURRENT STATUS
</div>

<div
  style="
    margin-top:6px;
    color:#266f48;
    font-size:16px;
    line-height:1.4;
    font-weight:700;
  "
>
  Under HR Verification
</div>

<div
  style="
    margin-top:5px;
    color:#6e8276;
    font-size:12px;
    line-height:1.55;
  "
>
  ${documentCount} uploaded document${
    documentCount ===
    1
      ? ""
      : "s"
  } received.
</div>

</td>
</tr>
</table>

<!-- ===================================================
     DOCUMENT LIST
==================================================== -->

<div
  style="
    margin-top:24px;
    color:#303842;
    font-size:13px;
    line-height:1.5;
    font-weight:700;
  "
>
  Submitted documents
</div>

<div
  style="
    margin-top:5px;
    color:#7a8490;
    font-size:11.5px;
    line-height:1.55;
  "
>
  The same uploaded files are attached to this email
  for quick review.
</div>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  role="presentation"
  style="
    margin-top:12px;
    width:100%;
    background:#f8f9fa;
    border:1px solid #e3e7eb;
    border-radius:13px;
  "
>
  ${buildDocumentRows(
    documents
  )}
</table>

<!-- ===================================================
     BANK / EMPLOYMENT SUMMARY
==================================================== -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  role="presentation"
  style="
    margin-top:22px;
    width:100%;
    border:1px solid #e3e7eb;
    border-radius:13px;
  "
>
<tr>
<td
  style="
    padding:17px 18px;
  "
>

<div
  style="
    color:#7c8691;
    font-size:10.5px;
    font-weight:700;
    letter-spacing:0.9px;
  "
>
  CANDIDATE INFORMATION
</div>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  role="presentation"
  style="
    margin-top:11px;
  "
>
<tr>
<td
  width="50%"
  valign="top"
  style="
    padding-right:10px;
  "
>
  <div
    style="
      color:#8b949e;
      font-size:10px;
      font-weight:700;
    "
  >
    EMPLOYMENT
  </div>

  <div
    style="
      margin-top:4px;
      color:#343c45;
      font-size:12px;
      font-weight:700;
    "
  >
    ${
      record
        ?.employment
        ?.isFresher ===
      true
        ? "Fresher"
        : record
            ?.employment
            ?.isFresher ===
          false
          ? "Experienced"
          : "Not specified"
    }
  </div>
</td>

<td
  width="50%"
  valign="top"
>
  <div
    style="
      color:#8b949e;
      font-size:10px;
      font-weight:700;
    "
  >
    BANK
  </div>

  <div
    style="
      margin-top:4px;
      color:#343c45;
      font-size:12px;
      font-weight:700;
    "
  >
    ${escapeHtml(
      record
        ?.bank
        ?.bankName ||
      "Not provided"
    )}
  </div>
</td>
</tr>
</table>

</td>
</tr>
</table>

<!-- ===================================================
     ACTION
==================================================== -->

${
  internalUrl
    ? `
      <div
        style="
          margin-top:24px;
        "
      >
        <a
          class="action-button"
          href="${escapeHtml(
            internalUrl
          )}"
          style="
            display:inline-block;
            padding:13px 20px;
            background:#e30613;
            color:#ffffff;
            border-radius:9px;
            font-size:13px;
            line-height:1.3;
            font-weight:700;
            text-decoration:none;
          "
        >
          Review Candidate Documents
        </a>
      </div>
    `
    : ""
}

</td>
</tr>

<!-- =====================================================
     FOOTER
====================================================== -->

<tr>
<td
  class="footer"
  style="
    padding:23px 34px;
    background:#f8fafb;
    border-top:1px solid #edf0f3;
    color:#65707c;
    font-size:12px;
    line-height:1.7;
  "
>
  This notification was generated automatically by
  SE-RMS Recruitment.

  <br>

  <strong
    style="
      color:#404852;
    "
  >
    ${escapeHtml(
      company
    )}
  </strong>
</td>
</tr>

</table>
</td>
</tr>
</table>

</body>
</html>
`;

    return {
      subject,

      text,

      html,
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  buildDocumentsSubmittedHrEmail,
};
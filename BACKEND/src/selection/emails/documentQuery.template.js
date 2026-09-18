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
   TEMPLATE
========================================================= */

const buildDocumentQueryEmail =
  ({
    candidate,
    selection,
    documentLabel,
    queryMessage,
    portalUrl,
  }) => {
    const company =
      process.env
        .COMPANY_NAME ||
      "Sandeep Edge Tech";

    const name =
      candidate
        ?.fullName ||
      "Candidate";

    const subject =
      `Action required: document clarification | ${company}`;

    const text =
`Dear ${name},

During verification of your pre-joining documents, our HR team requires an updated document.

Document: ${documentLabel}

HR Comment:
${queryMessage}

Please use your secure candidate portal to upload the corrected document:

${portalUrl}

Warm regards,
People & Culture
${company}`;

    const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>
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
  role="presentation"
>
<tr>
<td
  align="center"
  style="padding:30px 14px;"
>

<table
  width="620"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
  style="
    width:100%;
    max-width:620px;
    background:#ffffff;
    border:1px solid #e3e7eb;
    border-radius:18px;
    overflow:hidden;
  "
>

<tr>
<td
  style="
    padding:30px 32px;
    background:#191c21;
  "
>
  <div
    style="
      color:#ffd57c;
      font-size:11px;
      font-weight:700;
      letter-spacing:1.5px;
    "
  >
    ACTION REQUIRED
  </div>

  <h1
    style="
      margin:10px 0 0;
      color:#ffffff;
      font-size:27px;
    "
  >
    Document clarification required
  </h1>
</td>
</tr>

<tr>
<td
  style="padding:29px 32px;"
>

<p
  style="
    margin:0;
    color:#596470;
    font-size:14px;
    line-height:1.75;
  "
>
  Dear
  <strong>${escapeHtml(
    name
  )}</strong>,
  during verification of your pre-joining documents,
  our team requires an updated copy of the following:
</p>

<div
  style="
    margin-top:21px;
    padding:18px 19px;
    background:#fffaf0;
    border:1px solid #eddcae;
    border-radius:13px;
  "
>
  <div
    style="
      color:#8d6818;
      font-size:13px;
      font-weight:700;
    "
  >
    ${escapeHtml(
      documentLabel
    )}
  </div>

  <div
    style="
      margin-top:8px;
      color:#7c725f;
      font-size:13px;
      line-height:1.65;
    "
  >
    ${escapeHtml(
      queryMessage
    )}
  </div>
</div>

${
  portalUrl
    ? `
      <div
        style="margin-top:23px;"
      >
        <a
          href="${escapeHtml(
            portalUrl
          )}"
          style="
            display:inline-block;
            padding:13px 20px;
            background:#e30613;
            color:#ffffff;
            border-radius:9px;
            text-decoration:none;
            font-size:13px;
            font-weight:700;
          "
        >
          Open Candidate Portal
        </a>
      </div>
    `
    : ""
}

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

module.exports = {
  buildDocumentQueryEmail,
};
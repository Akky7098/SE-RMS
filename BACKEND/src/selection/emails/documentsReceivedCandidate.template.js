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

const buildDocumentsReceivedCandidateEmail =
  ({
    candidate,
    selection,
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

    const subject =
      `Documents received successfully | ${position} – ${company}`;

    const text =
`Dear ${name},

Thank you.

We have successfully received your pre-joining information and documents for the position of ${position}.

Your documents are now under verification by our People & Culture team.

No further action is required from you at this stage. If any clarification or replacement document is required, our team will contact you through the same secure candidate portal.

Once verification is completed, HR will communicate the next stage of the employment process.

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
  role="presentation"
>
<tr>
<td
  class="shell"
  align="center"
  style="padding:34px 14px;"
>

<table
  class="card"
  width="640"
  cellpadding="0"
  cellspacing="0"
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

<tr>
<td
  class="hero"
  style="
    padding:32px 34px;
    background:#191c21;
  "
>
  <div
    style="
      color:#8ed9ae;
      font-size:11px;
      font-weight:700;
      letter-spacing:1.6px;
    "
  >
    PRE-JOINING DOCUMENTS
  </div>

  <h1
    style="
      margin:10px 0 8px;
      color:#ffffff;
      font-size:29px;
      line-height:1.18;
    "
  >
    Documents received.
  </h1>

  <p
    style="
      margin:0;
      color:#d6dce3;
      font-size:14px;
      line-height:1.7;
    "
  >
    Your submission has been recorded successfully.
  </p>
</td>
</tr>

<tr>
<td
  class="body"
  style="padding:30px 34px;"
>

<p
  style="
    margin:0 0 15px;
    color:#343c46;
    font-size:15px;
    line-height:1.7;
  "
>
  Dear
  <strong>${escapeHtml(
    name
  )}</strong>,
</p>

<p
  style="
    margin:0;
    color:#68727e;
    font-size:14px;
    line-height:1.8;
  "
>
  We have successfully received your pre-joining
  information and documents for the position of
  <strong style="color:#303842;">
    ${escapeHtml(
      position
    )}
  </strong>.
</p>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
  style="
    margin-top:23px;
    background:#f1faf5;
    border:1px solid #cee6d7;
    border-radius:14px;
  "
>
<tr>
<td
  style="padding:19px 20px;"
>
  <div
    style="
      color:#397b55;
      font-size:11px;
      font-weight:700;
      letter-spacing:1px;
    "
  >
    CURRENT STATUS
  </div>

  <div
    style="
      margin-top:7px;
      color:#267048;
      font-size:19px;
      font-weight:700;
    "
  >
    Under HR Verification
  </div>

  <p
    style="
      margin:7px 0 0;
      color:#6c8275;
      font-size:13px;
      line-height:1.65;
    "
  >
    No further action is required from you right now.
  </p>
</td>
</tr>
</table>

<p
  style="
    margin:22px 0 0;
    color:#68727e;
    font-size:13px;
    line-height:1.75;
  "
>
  If any document requires clarification or replacement,
  our People & Culture team will contact you. Once the
  verification is completed, HR will communicate the next
  stage of your employment process.
</p>

</td>
</tr>

<tr>
<td
  class="footer"
  style="
    padding:24px 34px;
    background:#f8fafb;
    border-top:1px solid #edf0f3;
    color:#4d5763;
    font-size:13px;
    line-height:1.7;
  "
>
  Warm regards,
  <br>

  <strong>People & Culture</strong>
  <br>

  ${escapeHtml(
    company
  )}
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
  buildDocumentsReceivedCandidateEmail,
};
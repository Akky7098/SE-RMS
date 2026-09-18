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
   HOLD TEMPLATE
========================================================= */

const buildCandidateHoldEmail =
  ({
    candidate,
    interview,
  }) => {
    const companyName =
      process.env
        .COMPANY_NAME ||
      "Sandeep Edge Tech";

    const candidateName =
      candidate
        ?.fullName ||
      "Candidate";

    const position =
      interview
        ?.positionTitle ||
      candidate
        ?.positionTitle ||
      "the position";

    const subject =
      `Update on your application | ${position} – ${companyName}`;

    const text =
`Dear ${candidateName},

Thank you for taking the time to interview with ${companyName}.

Following your interview, your profile remains under active consideration for the position of ${position}.

Our team is currently reviewing the next steps. No action is required from you at this stage. Our People & Culture team will contact you when there is a further update.

We appreciate your continued interest in ${companyName} and thank you for your patience.

Warm regards,
People & Culture
${companyName}`;

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
  .mail-shell {
    padding:0 !important;
  }

  .mail-card {
    width:100% !important;
    max-width:100% !important;
    border-radius:0 !important;
  }

  .hero {
    padding:30px 20px !important;
  }

  .content {
    padding:26px 20px !important;
  }

  .status-wrap {
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
  style="
    width:100%;
    background:#f2f4f6;
  "
>
<tr>
<td
  class="mail-shell"
  align="center"
  style="
    padding:34px 14px;
  "
>

<table
  class="mail-card"
  width="640"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
  style="
    width:100%;
    max-width:640px;
    background:#ffffff;
    border:1px solid #e3e7ec;
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

<img
  src="cid:sandeep-edge-tech-logo"
  alt="${escapeHtml(
    companyName
  )}"
  width="140"
  style="
    display:block;
    width:140px;
    height:auto;
    margin-bottom:34px;
  "
>

<div
  style="
    color:#ffd77c;
    font-size:11px;
    font-weight:700;
    letter-spacing:1.7px;
  "
>
  APPLICATION UPDATE
</div>

<h1
  style="
    margin:10px 0 9px;
    color:#ffffff;
    font-size:29px;
    line-height:1.18;
  "
>
  Thank you for meeting with us.
</h1>

<p
  style="
    margin:0;
    color:#d8dde3;
    font-size:14px;
    line-height:1.7;
  "
>
  We wanted to keep you informed about your
  application.
</p>

</td>
</tr>

<tr>
<td
  class="content"
  style="
    padding:30px 34px 21px;
  "
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
  <strong>
    ${escapeHtml(
      candidateName
    )}
  </strong>,
</p>

<p
  style="
    margin:0;
    color:#626d79;
    font-size:14px;
    line-height:1.78;
  "
>
  Thank you for the time and thought you brought
  to your interview with us. Following our
  discussion, your profile remains under active
  consideration for the
  <strong style="color:#313942;">
    ${escapeHtml(
      position
    )}
  </strong>
  opportunity.
</p>

</td>
</tr>

<tr>
<td
  class="status-wrap"
  style="
    padding:0 34px 25px;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
  style="
    border:1px solid #eddcae;
    border-radius:14px;
    background:#fffaf0;
  "
>
<tr>
<td
  style="
    padding:20px 21px;
  "
>

<div
  style="
    color:#97701c;
    font-size:11px;
    font-weight:700;
    letter-spacing:1px;
  "
>
  APPLICATION STATUS
</div>

<div
  style="
    margin-top:7px;
    color:#8b6514;
    font-size:20px;
    font-weight:700;
  "
>
  — Under Consideration
</div>

<p
  style="
    margin:7px 0 0;
    color:#877757;
    font-size:13px;
    line-height:1.6;
  "
>
  No action is required from you at this stage.
</p>

</td>
</tr>
</table>

</td>
</tr>

<tr>
<td
  style="
    padding:0 34px 29px;
    color:#6e7985;
    font-size:13px;
    line-height:1.75;
  "
>
  Our team is reviewing the next steps and will
  contact you when there is a further update.

  <br><br>

  We appreciate your continued interest in
  ${escapeHtml(
    companyName
  )} and thank you for your patience.
</td>
</tr>

<tr>
<td
  style="
    padding:25px 34px;
    background:#f8fafb;
    border-top:1px solid #edf0f3;
    color:#4d5763;
    font-size:13px;
    line-height:1.7;
  "
>
  Warm regards,
  <br>

  <strong>
    People & Culture
  </strong>

  <br>

  ${escapeHtml(
    companyName
  )}
</td>
</tr>

<tr>
<td
  align="center"
  style="
    padding:17px 24px;
    background:#202329;
    color:#9ca5b0;
    font-size:11px;
  "
>
  Recruitment communication from
  ${escapeHtml(
    companyName
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
  buildCandidateHoldEmail,
};
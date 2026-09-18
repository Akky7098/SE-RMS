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
   REJECTION TEMPLATE
========================================================= */

const buildCandidateRejectedEmail =
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

Thank you for taking the time to interview with ${companyName} for the position of ${position}.

After careful consideration, we have decided not to progress your application further for this opportunity.

We sincerely appreciate the time, preparation and interest you have shown throughout the process.

This decision is specific to the current requirement. We would be pleased to have you explore suitable opportunities with ${companyName} again in the future, including after approximately three months where appropriate.

We wish you every success in your professional journey.

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

  .hero,
  .content,
  .footer-content {
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
    color:#f1a7ae;
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
  Thank you for your time,
  ${escapeHtml(
    candidateName
  )}.
</h1>

<p
  style="
    margin:0;
    color:#d8dde3;
    font-size:14px;
    line-height:1.7;
  "
>
  We appreciate the opportunity to learn more
  about you.
</p>

</td>
</tr>

<tr>
<td
  class="content"
  style="
    padding:30px 34px 22px;
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
    line-height:1.8;
  "
>
  Thank you for taking the time to interview
  with us for the
  <strong style="color:#313942;">
    ${escapeHtml(
      position
    )}
  </strong>
  position.
</p>

<p
  style="
    margin:15px 0 0;
    color:#626d79;
    font-size:14px;
    line-height:1.8;
  "
>
  After careful consideration, we have decided
  not to progress your application further for
  this particular opportunity.
</p>

</td>
</tr>

<tr>
<td
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
    border:1px solid #eddadd;
    border-radius:14px;
    background:#fff7f8;
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
    color:#a65059;
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
    color:#97414b;
    font-size:20px;
    font-weight:700;
  "
>
  Application Closed
</div>

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
  This decision is specific to the current
  requirement and does not prevent you from
  considering suitable opportunities with us
  again in the future.

  <br><br>

  We would be pleased to have you explore
  relevant opportunities again after
  approximately three months, where appropriate.

  <br><br>

  We wish you every success in your professional
  journey.
</td>
</tr>

<tr>
<td
  class="footer-content"
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
  buildCandidateRejectedEmail,
};
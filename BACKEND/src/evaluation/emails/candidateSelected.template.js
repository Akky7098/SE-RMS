/* =========================================================
   ESCAPE
========================================================= */

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

const buildCandidateSelectedEmail =
  ({
    candidate,
    evaluation,
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
      `Congratulations ${candidateName} | ${position} – ${companyName}`;

    const text =
`Dear ${candidateName},

Congratulations!

We are pleased to inform you that you have successfully completed our interview process and have been selected for the position of ${position} at ${companyName}.

Our People & Culture team will shortly share the next step of the process, including your Letter of Intent.

Thank you for the time, preparation and interest you have shown throughout the process.

We look forward to taking the next step with you.

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
<meta
  name="x-apple-disable-message-reformatting"
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
    border-left:0 !important;
    border-right:0 !important;
  }

  .hero {
    padding:30px 20px !important;
  }

  .content {
    padding:26px 20px !important;
  }

  .result-card {
    margin-left:20px !important;
    margin-right:20px !important;
  }

  .footer-content {
    padding:22px 20px !important;
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
  border="0"
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

<!-- HERO -->

<tr>
<td
  class="hero"
  style="
    padding:32px 34px;
    background:#171a20;
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
    max-width:140px;
    height:auto;
    margin-bottom:34px;
  "
>

<div
  style="
    color:#90e5b2;
    font-size:11px;
    font-weight:700;
    letter-spacing:1.7px;
  "
>
  INTERVIEW OUTCOME
</div>

<h1
  style="
    margin:10px 0 9px 0;
    color:#ffffff;
    font-size:31px;
    line-height:1.16;
    font-weight:700;
  "
>
  Congratulations,
  ${escapeHtml(
    candidateName
  )}.
</h1>

<p
  style="
    margin:0;
    color:#d5dbe2;
    font-size:14px;
    line-height:1.7;
  "
>
  We're delighted to share some good news with you.
</p>

</td>
</tr>

<!-- BODY -->

<tr>
<td
  class="content"
  style="
    padding:30px 34px 22px 34px;
  "
>

<p
  style="
    margin:0 0 15px 0;
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
  Thank you for the time and effort you invested in
  our interview process. Following our discussions
  and evaluation, we are pleased to inform you that
  you have been selected for the position of
  <strong style="color:#313942;">
    ${escapeHtml(
      position
    )}
  </strong>
  at ${escapeHtml(
    companyName
  )}.
</p>

</td>
</tr>

<!-- RESULT -->

<tr>
<td
  class="result-card"
  style="
    padding:0 34px 25px 34px;
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
    border:1px solid #cce6d6;
    background:#f1faf5;
    border-radius:14px;
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
    color:#41835b;
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
    color:#237144;
    font-size:20px;
    font-weight:700;
  "
>
  ✓ Selected
</div>

<div
  style="
    margin-top:7px;
    color:#688073;
    font-size:13px;
    line-height:1.6;
  "
>
  ${escapeHtml(
    position
  )}
</div>

</td>
</tr>
</table>

</td>
</tr>

<!-- NEXT STEP -->

<tr>
<td
  style="
    padding:0 34px 29px 34px;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  role="presentation"
  style="
    border:1px solid #e2e7ec;
    border-radius:14px;
  "
>
<tr>
<td
  style="
    padding:19px 20px;
  "
>

<div
  style="
    color:#343c46;
    font-size:13px;
    font-weight:700;
  "
>
  What happens next?
</div>

<p
  style="
    margin:6px 0 0 0;
    color:#707b87;
    font-size:13px;
    line-height:1.7;
  "
>
  Our People & Culture team will shortly share your
  Letter of Intent and guide you through the next
  stage of the process.
</p>

</td>
</tr>
</table>

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
  We look forward to taking the next step with you.

  <br><br>

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
    line-height:1.6;
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
  buildCandidateSelectedEmail,
};
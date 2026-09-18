/* =========================================================
   HTML ESCAPE
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

const buildAccessCreatedEmail =
  ({
    employee,
    access,
    loginUrl,
  }) => {
    const company =
      process.env
        .COMPANY_NAME ||
      "Sandeep Edge Tech";

    const name =
      employee
        ?.fullName ||
      "Team Member";

    const employeeCode =
      employee
        ?.employeeCode ||
      "—";

    const designation =
      employee
        ?.designation ||
      "—";

    const loginEmail =
      access
        ?.loginEmail ||
      employee
        ?.officialEmail ||
      "";

    const subject =
      `Your SE-RMS access is ready | ${company}`;

    const text =
`Dear ${name},

Welcome to ${company}.

Your SE-RMS employee account has been created successfully.

Employee ID: ${employeeCode}
Designation: ${designation}
Login Email: ${loginEmail}

Please sign in using your assigned company Google account.

${loginUrl ? `SE-RMS Login: ${loginUrl}` : ""}

For security, your password is never sent by email.

If you face any difficulty accessing SE-RMS, please contact the HR team.

Warm regards,
People & Culture
${company}`;

    const button =
      loginUrl
        ? `
          <div
            style="
              margin-top:26px;
            "
          >
            <a
              href="${escapeHtml(
                loginUrl
              )}"
              style="
                display:inline-block;
                background:#e30613;
                color:#ffffff;
                text-decoration:none;
                padding:14px 24px;
                border-radius:9px;
                font-size:14px;
                font-weight:700;
              "
            >
              Open SE-RMS
            </a>
          </div>
        `
        : "";

    const html =
`<!doctype html>
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
    background:#f3f5f7;
    font-family:Arial,Helvetica,sans-serif;
    color:#20242a;
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
  style="
    padding:34px 14px;
  "
>

<table
  width="640"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
  style="
    width:100%;
    max-width:640px;
    background:#ffffff;
    border:1px solid #e1e5e9;
    border-radius:18px;
    overflow:hidden;
  "
>

<!-- HEADER -->

<tr>
<td
  style="
    padding:32px 34px;
    background:#171a1f;
  "
>

<div
  style="
    color:#ffcf70;
    font-size:11px;
    font-weight:700;
    letter-spacing:1.6px;
  "
>
  EMPLOYEE ACCESS
</div>

<h1
  style="
    margin:10px 0 0;
    color:#ffffff;
    font-size:28px;
    line-height:1.25;
  "
>
  Your SE-RMS account is ready
</h1>

<p
  style="
    margin:10px 0 0;
    color:#bec5cd;
    font-size:14px;
    line-height:1.6;
  "
>
  Your employee workspace has been created successfully.
</p>

</td>
</tr>

<!-- BODY -->

<tr>
<td
  style="
    padding:32px 34px 34px;
  "
>

<p
  style="
    margin:0;
    font-size:15px;
    color:#59636e;
    line-height:1.75;
  "
>
  Dear
  <strong
    style="
      color:#20242a;
    "
  >
    ${escapeHtml(
      name
    )}
  </strong>,
</p>

<p
  style="
    margin:14px 0 0;
    font-size:15px;
    color:#59636e;
    line-height:1.75;
  "
>
  Welcome to
  <strong>
    ${escapeHtml(
      company
    )}
  </strong>.
  Your SE-RMS employee account has been created and is
  ready for use.
</p>

<!-- EMPLOYEE CARD -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
  style="
    margin-top:24px;
    border:1px solid #e3e7eb;
    border-radius:12px;
    background:#fafbfc;
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
    color:#8b949e;
    font-size:11px;
    font-weight:700;
    letter-spacing:1px;
  "
>
  EMPLOYEE ID
</div>

<div
  style="
    margin-top:5px;
    color:#20242a;
    font-size:16px;
    font-weight:700;
  "
>
  ${escapeHtml(
    employeeCode
  )}
</div>

</td>

<td
  style="
    padding:19px 20px;
    border-left:1px solid #e3e7eb;
  "
>

<div
  style="
    color:#8b949e;
    font-size:11px;
    font-weight:700;
    letter-spacing:1px;
  "
>
  DESIGNATION
</div>

<div
  style="
    margin-top:5px;
    color:#20242a;
    font-size:16px;
    font-weight:700;
  "
>
  ${escapeHtml(
    designation
  )}
</div>

</td>
</tr>

</table>

<!-- LOGIN -->

<div
  style="
    margin-top:20px;
    padding:19px 20px;
    border-radius:12px;
    background:#fff7f7;
    border:1px solid #f2d7d9;
  "
>

<div
  style="
    color:#9d252d;
    font-size:11px;
    font-weight:700;
    letter-spacing:1px;
  "
>
  SE-RMS LOGIN
</div>

<div
  style="
    margin-top:7px;
    color:#20242a;
    font-size:16px;
    font-weight:700;
  "
>
  ${escapeHtml(
    loginEmail
  )}
</div>

<div
  style="
    margin-top:7px;
    color:#737c85;
    font-size:13px;
    line-height:1.6;
  "
>
  Sign in using your assigned company Google account.
  For security, passwords are never shared by email.
</div>

</div>

${button}

<p
  style="
    margin:28px 0 0;
    color:#737c85;
    font-size:13px;
    line-height:1.7;
  "
>
  If you have difficulty accessing your account,
  please contact the People & Culture team.
</p>

</td>
</tr>

<!-- FOOTER -->

<tr>
<td
  style="
    padding:20px 34px;
    background:#fafbfc;
    border-top:1px solid #e7eaed;
  "
>

<div
  style="
    color:#9aa1a9;
    font-size:11px;
    line-height:1.6;
  "
>
  This is an official employee communication from
  ${escapeHtml(
    company
  )}.
</div>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>`;

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
  buildAccessCreatedEmail,
};
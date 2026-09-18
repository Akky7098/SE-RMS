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
   DATE
========================================================= */

const formatDate =
  (
    value
  ) => {
    if (
      !value
    ) {
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

/* =========================================================
   TEMPLATE
========================================================= */

const buildWelcomeOnboardingEmail =
  ({
    employee,
    manager,
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

    const department =
      employee
        ?.department
        ?.name ||
      employee
        ?.orgUnitCode ||
      "—";

    const reportingManager =
      manager
        ?.fullName ||
      "—";

    const joiningDate =
      formatDate(
        employee
          ?.joiningDate
      );

    const workLocation =
      employee
        ?.workLocation ||
      "—";

    const subject =
      `Welcome to ${company}, ${name}`;

    const text =
`Dear ${name},

Welcome to ${company}.

We are delighted to have you as part of our team and wish you a successful journey with us.

Employee ID: ${employeeCode}
Designation: ${designation}
Department: ${department}
Reporting Manager: ${reportingManager}
Joining Date: ${joiningDate}
Work Location: ${workLocation}

Your onboarding formalities have been completed and your employee profile has been established in SE-RMS.

${loginUrl ? `SE-RMS: ${loginUrl}` : ""}

We look forward to your contribution, growth and success with the organisation.

Warm regards,
People & Culture
${company}`;

    const button =
      loginUrl
        ? `
          <div
            style="
              margin-top:27px;
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
              Open Employee Workspace
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
  width="650"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
  style="
    width:100%;
    max-width:650px;
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
    padding:36px 36px 34px;
    background:#171a1f;
  "
>

<div
  style="
    color:#ffcf70;
    font-size:11px;
    font-weight:700;
    letter-spacing:1.7px;
  "
>
  WELCOME TO THE TEAM
</div>

<h1
  style="
    margin:11px 0 0;
    color:#ffffff;
    font-size:30px;
    line-height:1.25;
  "
>
  Welcome,
  ${escapeHtml(
    name
  )}
</h1>

<p
  style="
    margin:11px 0 0;
    color:#bec5cd;
    font-size:14px;
    line-height:1.65;
  "
>
  We are pleased to welcome you to
  ${escapeHtml(
    company
  )}.
</p>

</td>
</tr>

<!-- BODY -->

<tr>
<td
  style="
    padding:32px 36px;
  "
>

<p
  style="
    margin:0;
    color:#59636e;
    font-size:15px;
    line-height:1.8;
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
    color:#59636e;
    font-size:15px;
    line-height:1.8;
  "
>
  We are delighted to have you as part of our team.
  Your onboarding formalities have been completed,
  and your employee profile has now been established
  in our organisation.
</p>

<p
  style="
    margin:14px 0 0;
    color:#59636e;
    font-size:15px;
    line-height:1.8;
  "
>
  We look forward to your contribution, professional
  growth and a successful journey with us.
</p>

<!-- PROFILE -->

<div
  style="
    margin-top:26px;
    border:1px solid #e2e6ea;
    border-radius:14px;
    overflow:hidden;
  "
>

<div
  style="
    padding:16px 20px;
    background:#f7f8fa;
    border-bottom:1px solid #e2e6ea;
    color:#7c858e;
    font-size:11px;
    font-weight:700;
    letter-spacing:1.2px;
  "
>
  YOUR EMPLOYEE PROFILE
</div>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
>

<tr>

<td
  width="50%"
  style="
    padding:17px 20px;
    border-bottom:1px solid #edf0f2;
  "
>
  <div
    style="
      color:#969da5;
      font-size:11px;
      font-weight:700;
    "
  >
    EMPLOYEE ID
  </div>

  <div
    style="
      margin-top:5px;
      color:#22262b;
      font-size:15px;
      font-weight:700;
    "
  >
    ${escapeHtml(
      employeeCode
    )}
  </div>
</td>

<td
  width="50%"
  style="
    padding:17px 20px;
    border-left:1px solid #edf0f2;
    border-bottom:1px solid #edf0f2;
  "
>
  <div
    style="
      color:#969da5;
      font-size:11px;
      font-weight:700;
    "
  >
    DESIGNATION
  </div>

  <div
    style="
      margin-top:5px;
      color:#22262b;
      font-size:15px;
      font-weight:700;
    "
  >
    ${escapeHtml(
      designation
    )}
  </div>
</td>

</tr>

<tr>

<td
  style="
    padding:17px 20px;
    border-bottom:1px solid #edf0f2;
  "
>
  <div
    style="
      color:#969da5;
      font-size:11px;
      font-weight:700;
    "
  >
    DEPARTMENT
  </div>

  <div
    style="
      margin-top:5px;
      color:#22262b;
      font-size:15px;
      font-weight:700;
    "
  >
    ${escapeHtml(
      department
    )}
  </div>
</td>

<td
  style="
    padding:17px 20px;
    border-left:1px solid #edf0f2;
    border-bottom:1px solid #edf0f2;
  "
>
  <div
    style="
      color:#969da5;
      font-size:11px;
      font-weight:700;
    "
  >
    REPORTING MANAGER
  </div>

  <div
    style="
      margin-top:5px;
      color:#22262b;
      font-size:15px;
      font-weight:700;
    "
  >
    ${escapeHtml(
      reportingManager
    )}
  </div>
</td>

</tr>

<tr>

<td
  style="
    padding:17px 20px;
  "
>
  <div
    style="
      color:#969da5;
      font-size:11px;
      font-weight:700;
    "
  >
    JOINING DATE
  </div>

  <div
    style="
      margin-top:5px;
      color:#22262b;
      font-size:15px;
      font-weight:700;
    "
  >
    ${escapeHtml(
      joiningDate
    )}
  </div>
</td>

<td
  style="
    padding:17px 20px;
    border-left:1px solid #edf0f2;
  "
>
  <div
    style="
      color:#969da5;
      font-size:11px;
      font-weight:700;
    "
  >
    WORK LOCATION
  </div>

  <div
    style="
      margin-top:5px;
      color:#22262b;
      font-size:15px;
      font-weight:700;
    "
  >
    ${escapeHtml(
      workLocation
    )}
  </div>
</td>

</tr>

</table>

</div>

${button}

<!-- WELCOME MESSAGE -->

<div
  style="
    margin-top:28px;
    padding:20px 21px;
    border-left:4px solid #e30613;
    background:#fff8f8;
  "
>

<strong
  style="
    color:#262a2f;
    font-size:14px;
  "
>
  A new journey begins.
</strong>

<p
  style="
    margin:7px 0 0;
    color:#6d757e;
    font-size:13px;
    line-height:1.7;
  "
>
  We encourage you to collaborate, learn, take ownership
  and contribute your best as part of the team.
</p>

</div>

<p
  style="
    margin:28px 0 0;
    color:#59636e;
    font-size:14px;
    line-height:1.7;
  "
>
  Warm regards,<br>
  <strong
    style="
      color:#22262b;
    "
  >
    People & Culture
  </strong><br>
  ${escapeHtml(
    company
  )}
</p>

</td>
</tr>

<!-- FOOTER -->

<tr>
<td
  style="
    padding:20px 36px;
    background:#fafbfc;
    border-top:1px solid #e6e9ec;
  "
>

<div
  style="
    color:#9aa1a9;
    font-size:11px;
    line-height:1.6;
  "
>
  This communication forms part of the employee onboarding
  record maintained by ${escapeHtml(
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
  buildWelcomeOnboardingEmail,
};
/* =========================================================
   HTML ESCAPE
========================================================= */

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

/* =========================================================
   DATE
========================================================= */

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }
  ).format(date);
};

/* =========================================================
   FIRST NAME
========================================================= */

const getFirstName = (value) => {
  const name =
    String(value || "")
      .trim();

  return (
    name.split(/\s+/)[0] ||
    "Candidate"
  );
};

/* =========================================================
   OFFER SENT EMAIL
========================================================= */

const buildOfferSentEmail = ({
  offer,
  candidate,
  hiringHr,
}) => {
  const companyName =
    process.env.COMPANY_NAME ||
    "Sandeep Edgetech Limited";

  const candidateName =
    offer?.candidateName ||
    candidate?.fullName ||
    "Candidate";

  const firstName =
    getFirstName(
      candidateName
    );

  const position =
    offer?.positionTitle ||
    "your selected position";

  const officeLocation =
    offer?.officeLocation ||
    "—";

  const joiningDate =
    formatDate(
      offer?.reportingDate
    );

  const reference =
    offer?.referenceNumber ||
    "—";

  const hrName =
    offer?.hrName ||
    hiringHr?.displayName ||
    hiringHr?.fullName ||
    hiringHr?.name ||
    "People & Culture Team";

  const hrEmail =
    offer?.hrEmail ||
    hiringHr?.email ||
    "hrd@sandeepedgetech.com";

  const subject =
    `Welcome to Sandeep Edgetech | Your Offer Letter – ${position}`;

  /* =======================================================
     TEXT
  ======================================================= */

  const text = `
Hi ${firstName},

Congratulations once again, and welcome to ${companyName}.

We are delighted to offer you the position of ${position} with ${companyName}.

Following the successful completion of your selection process and document verification, we are pleased to share your formal Offer Letter.

Employment Details

Position: ${position}
Office Location: ${officeLocation}
Joining Date: ${joiningDate}
Offer Reference: ${reference}

Your formal Offer Letter is attached to this email. Please review the document carefully and retain a copy for your records.

We are excited to welcome you to the Sandeep Edgetech team and look forward to having you join us on ${joiningDate}.

If you require any clarification regarding your joining or Offer Letter, please feel free to contact our People & Culture team.

Warm regards,

${hrName}
People & Culture
${companyName}
${hrEmail}
`;

  /* =======================================================
     HTML
  ======================================================= */

  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f3f5f7;
    font-family:Arial,Helvetica,sans-serif;
    color:#20262d;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
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
  border="0"
  role="presentation"
  style="
    width:100%;
    max-width:640px;
    background:#ffffff;
    border:1px solid #e2e6ea;
    border-radius:20px;
    overflow:hidden;
    box-shadow:0 12px 38px rgba(22,31,40,.08);
  "
>

<!-- =====================================================
     HEADER
====================================================== -->

<tr>
<td
  style="
    padding:25px 30px;
    background:#ffffff;
    border-bottom:1px solid #edf0f2;
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
  valign="middle"
>
  <img
    src="cid:seCompanyLogo"
    alt="Sandeep Edgetech"
    style="
      display:block;
      width:160px;
      max-height:60px;
      object-fit:contain;
    "
  >
</td>

<td
  align="right"
  valign="middle"
>
  <div
    style="
      color:#e30613;
      font-size:10px;
      font-weight:800;
      letter-spacing:1.5px;
    "
  >
    PEOPLE &amp; CULTURE
  </div>
</td>

</tr>
</table>

</td>
</tr>

<!-- =====================================================
     HERO
====================================================== -->

<tr>
<td
  style="
    padding:33px 31px 28px;
    background:
      linear-gradient(
        135deg,
        #191e24,
        #252b32
      );
  "
>

<div
  style="
    color:#e30613;
    font-size:10px;
    font-weight:800;
    letter-spacing:1.6px;
  "
>
  YOUR OFFER LETTER
</div>

<h1
  style="
    margin:10px 0 9px;
    color:#ffffff;
    font-size:27px;
    line-height:1.2;
    font-weight:700;
  "
>
  Welcome to Sandeep Edgetech,
  ${escapeHtml(firstName)}.
</h1>

<p
  style="
    margin:0;
    max-width:520px;
    color:#c5cbd1;
    font-size:13px;
    line-height:1.7;
  "
>
  We are delighted to formally welcome you to the team
  and share your Offer Letter for the next chapter of
  your professional journey with us.
</p>

</td>
</tr>

<!-- =====================================================
     BODY
====================================================== -->

<tr>
<td
  style="
    padding:30px 31px 10px;
  "
>

<p
  style="
    margin:0;
    color:#53606c;
    font-size:13px;
    line-height:1.75;
  "
>
  Hi
  <strong
    style="
      color:#28313a;
    "
  >
    ${escapeHtml(firstName)}
  </strong>,
</p>

<p
  style="
    margin:15px 0 0;
    color:#53606c;
    font-size:13px;
    line-height:1.75;
  "
>
  Congratulations once again. Following the successful
  completion of your selection process and document
  verification, we are pleased to offer you the position of
  <strong
    style="
      color:#29323b;
    "
  >
    ${escapeHtml(position)}
  </strong>
  with
  <strong
    style="
      color:#29323b;
    "
  >
    ${escapeHtml(companyName)}
  </strong>.
</p>

</td>
</tr>

<!-- =====================================================
     OFFER DETAILS
====================================================== -->

<tr>
<td
  style="
    padding:17px 31px 10px;
  "
>

<div
  style="
    margin-bottom:10px;
    color:#8b959f;
    font-size:9px;
    font-weight:800;
    letter-spacing:1.4px;
  "
>
  EMPLOYMENT DETAILS
</div>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  role="presentation"
  style="
    border:1px solid #e1e6ea;
    border-radius:14px;
    overflow:hidden;
    background:#fafbfc;
  "
>

<tr>

<td
  width="50%"
  style="
    padding:15px 17px;
    border-right:1px solid #e6eaed;
    border-bottom:1px solid #e6eaed;
  "
>
  <div
    style="
      color:#8d97a1;
      font-size:9px;
      font-weight:700;
      letter-spacing:.7px;
      text-transform:uppercase;
    "
  >
    Position
  </div>

  <div
    style="
      margin-top:5px;
      color:#303944;
      font-size:13px;
      font-weight:700;
    "
  >
    ${escapeHtml(position)}
  </div>
</td>

<td
  width="50%"
  style="
    padding:15px 17px;
    border-bottom:1px solid #e6eaed;
  "
>
  <div
    style="
      color:#8d97a1;
      font-size:9px;
      font-weight:700;
      letter-spacing:.7px;
      text-transform:uppercase;
    "
  >
    Office Location
  </div>

  <div
    style="
      margin-top:5px;
      color:#303944;
      font-size:13px;
      font-weight:700;
    "
  >
    ${escapeHtml(officeLocation)}
  </div>
</td>

</tr>

<tr>

<td
  width="50%"
  style="
    padding:15px 17px;
    border-right:1px solid #e6eaed;
  "
>
  <div
    style="
      color:#8d97a1;
      font-size:9px;
      font-weight:700;
      letter-spacing:.7px;
      text-transform:uppercase;
    "
  >
    Joining Date
  </div>

  <div
    style="
      margin-top:5px;
      color:#303944;
      font-size:13px;
      font-weight:700;
    "
  >
    ${escapeHtml(joiningDate)}
  </div>
</td>

<td
  width="50%"
  style="
    padding:15px 17px;
  "
>
  <div
    style="
      color:#8d97a1;
      font-size:9px;
      font-weight:700;
      letter-spacing:.7px;
      text-transform:uppercase;
    "
  >
    Offer Reference
  </div>

  <div
    style="
      margin-top:5px;
      color:#303944;
      font-size:12px;
      font-weight:700;
    "
  >
    ${escapeHtml(reference)}
  </div>
</td>

</tr>

</table>

</td>
</tr>

<!-- =====================================================
     ATTACHMENT MESSAGE
====================================================== -->

<tr>
<td
  style="
    padding:18px 31px 10px;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  role="presentation"
  style="
    background:#fff6f7;
    border:1px solid #f0d1d4;
    border-radius:13px;
  "
>
<tr>

<td
  width="48"
  valign="top"
  style="
    padding:15px 0 15px 15px;
  "
>
  <div
    style="
      width:34px;
      height:34px;
      line-height:34px;
      text-align:center;
      background:#e30613;
      border-radius:10px;
      color:#ffffff;
      font-size:10px;
      font-weight:800;
    "
  >
    PDF
  </div>
</td>

<td
  style="
    padding:15px 15px 15px 10px;
  "
>

  <div
    style="
      color:#4b3b3e;
      font-size:12px;
      font-weight:700;
    "
  >
    Your formal Offer Letter is attached
  </div>

  <div
    style="
      margin-top:4px;
      color:#8c7075;
      font-size:11px;
      line-height:1.55;
    "
  >
    Please review the attached legal document carefully
    and retain a copy for your records.
  </div>

</td>

</tr>
</table>

</td>
</tr>

<!-- =====================================================
     WELCOME MESSAGE
====================================================== -->

<tr>
<td
  style="
    padding:18px 31px 29px;
  "
>

<p
  style="
    margin:0;
    color:#53606c;
    font-size:13px;
    line-height:1.75;
  "
>
  We are excited about having you join our team and look
  forward to welcoming you on
  <strong
    style="
      color:#303944;
    "
  >
    ${escapeHtml(joiningDate)}
  </strong>.
</p>

<p
  style="
    margin:15px 0 0;
    color:#53606c;
    font-size:13px;
    line-height:1.75;
  "
>
  If you require any clarification regarding your joining
  or Offer Letter, please feel free to contact our People
  &amp; Culture team.
</p>

<p
  style="
    margin:21px 0 0;
    color:#3d4750;
    font-size:13px;
    line-height:1.65;
  "
>
  Warm regards,<br>

  <strong>
    ${escapeHtml(hrName)}
  </strong><br>

  People &amp; Culture<br>

  ${escapeHtml(companyName)}<br>

  <span
    style="
      color:#777f88;
      font-size:11px;
    "
  >
    ${escapeHtml(hrEmail)}
  </span>
</p>

</td>
</tr>

<!-- =====================================================
     FOOTER
====================================================== -->

<tr>
<td
  style="
    padding:17px 31px;
    border-top:1px solid #edf0f2;
    background:#f8fafb;
    text-align:center;
  "
>

<div
  style="
    color:#969fa7;
    font-size:9px;
    line-height:1.6;
  "
>
  This email and the attached Offer Letter are intended
  solely for the named recipient and may contain
  confidential employment information.
</div>

<div
  style="
    margin-top:6px;
    color:#b1b7bd;
    font-size:8px;
  "
>
  Recruitment Communication · SE-RMS
</div>

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
  buildOfferSentEmail,
};
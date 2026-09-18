const fs = require("fs");
const path = require("path");

/* =========================================================
   HTML ESCAPE
========================================================= */

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll(
      "'",
      "&#039;"
    );

/* =========================================================
   DATE
========================================================= */

const formatDate = (value) => {
  if (!value) {
    return "";
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
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone:
        "Asia/Kolkata",
    }
  ).format(date);
};

/* =========================================================
   LOGO
========================================================= */

const getLogoDataUri = () => {
  try {
    const logoPath =
      path.resolve(
        process.cwd(),
        "assets",
        "email",
        "sandeep-edge-tech-logo.jpg"
      );

    if (
      !fs.existsSync(
        logoPath
      )
    ) {
      return "";
    }

    const data =
      fs.readFileSync(
        logoPath
      );

    return `data:image/jpeg;base64,${data.toString(
      "base64"
    )}`;
  } catch (error) {
    console.error(
      "[Offer Template] Logo could not be loaded:",
      error.message
    );

    return "";
  }
};

/* =========================================================
   FIRST NAME
========================================================= */

const firstName = (
  fullName
) => {
  const value =
    String(
      fullName || ""
    ).trim();

  if (!value) {
    return "";
  }

  return value.split(
    /\s+/
  )[0];
};

/* =========================================================
   OFFER TEMPLATE
========================================================= */

const buildOfferHtml = (
  offer
) => {
  const logo =
    getLogoDataUri();

  const title =
    escapeHtml(
      offer.candidateTitle ||
        "Mr."
    );

  const candidateName =
    escapeHtml(
      offer.candidateName
    );

  const fatherName =
    escapeHtml(
      offer.fatherName
    );

  const address =
    escapeHtml(
      offer.residentialAddress
    ).replaceAll(
      "\n",
      "<br>"
    );

  const email =
    escapeHtml(
      offer.email
    );

  const mobile =
    escapeHtml(
      offer.mobile
    );

  const position =
    escapeHtml(
      offer.positionTitle
    );

  const office =
    escapeHtml(
      offer.officeLocation
    );

  const candidateFirstName =
    escapeHtml(
      firstName(
        offer.candidateName
      )
    );

  const compensation =
    escapeHtml(
      offer.compensationText ||
        "Your compensation will be as agreed during our discussions."
    );

  const hrName =
    escapeHtml(
      offer.hrName
    );

  const hrDesignation =
    escapeHtml(
      offer.hrDesignation ||
        "HR Executive"
    );

  const hrEmail =
    escapeHtml(
      offer.hrEmail ||
        "hrd@sandeepedgetech.com"
    );

  const signatoryName =
    escapeHtml(
      offer.signatoryName ||
        "Renu"
    );

  const signatoryDesignation =
    escapeHtml(
      offer.signatoryDesignation ||
        "HR Manager"
    );

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />

<style>

@page {
  size: A4;
  margin: 13mm 16mm 14mm 16mm;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
}

body {
  font-family: Arial, Helvetica, sans-serif;
  color: #111111;
  background: #ffffff;
  font-size: 11.2pt;
  line-height: 1.38;
}

.offer-page {
  width: 100%;
}

/* =======================================================
   LOGO
======================================================= */

.logo-row {
  width: 100%;
  text-align: left;
  margin-bottom: 4px;
}

.logo {
  width: 170px;
  max-height: 64px;
  object-fit: contain;
  object-position: left center;
}

/* =======================================================
   TITLE
======================================================= */

.offer-title {
  text-align: center;
  font-size: 15pt;
  font-weight: 700;
  text-decoration: underline;
  margin: 2px 0 13px;
}

/* =======================================================
   REFERENCE
======================================================= */

.reference-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 11px;
}

.reference-table td {
  padding: 0;
  font-size: 10.8pt;
}

.reference-left {
  text-align: left;
}

.reference-right {
  text-align: right;
}

/* =======================================================
   ADDRESS
======================================================= */

.to-block {
  margin-bottom: 10px;
  line-height: 1.38;
}

.to-label {
  margin-bottom: 2px;
}

.contact-line {
  margin-top: 1px;
}

/* =======================================================
   BODY
======================================================= */

.salutation {
  margin: 9px 0 8px;
}

.paragraph {
  margin: 0 0 9px;
  text-align: justify;
}

.document-list {
  margin: 2px 0 10px 19px;
  padding-left: 12px;
}

.document-list li {
  margin-bottom: 4px;
  padding-left: 3px;
  text-align: justify;
}

/* =======================================================
   SIGNATURE
======================================================= */

.signature {
  margin-top: 11px;
}

.signature-company {
  margin-top: 2px;
  font-weight: 600;
}

.signature-name {
  margin-top: 17px;
}

.signature-designation {
  margin-top: 1px;
}

</style>
</head>

<body>

<div class="offer-page">

  ${
    logo
      ? `
        <div class="logo-row">
          <img
            src="${logo}"
            class="logo"
            alt="Sandeep Edgetech"
          />
        </div>
      `
      : ""
  }

  <div class="offer-title">
    OFFER LETTER
  </div>

  <table class="reference-table">
    <tr>
      <td class="reference-left">
        <strong>Ref No.:</strong>
        ${escapeHtml(
          offer.referenceNumber
        )}
      </td>

      <td class="reference-right">
        <strong>Date:</strong>
        ${escapeHtml(
          formatDate(
            offer.issueDate
          )
        )}
      </td>
    </tr>
  </table>

  <div class="to-block">
    <div class="to-label">
      To,
    </div>

    <div>
      ${title}
      ${candidateName}
    </div>

    <div>
      D/o Sh.
      ${fatherName}
    </div>

    <div>
      R/o
      ${address}
    </div>

    <div class="contact-line">
      Email:
      ${email}
    </div>

    <div class="contact-line">
      Mobile No.:
      ${mobile}
    </div>
  </div>

  <div class="salutation">
    Dear ${title}
    ${candidateFirstName}
  </div>

  <p class="paragraph">
    This is with reference to your application and subsequent interview held with you at our office. We are pleased to offer you the position of “${position}” for our ${office} office (H.Q) ${compensation} You are requested to report on or before ${escapeHtml(
      formatDate(
        offer.reportingDate
      )
    )}.
  </p>

  <p class="paragraph">
    You are requested to bring a copy of the following documents at the time of your joining;
  </p>

  <ol class="document-list">
    <li>
      Qualification Certificates (in original along with one photocopy set; the originals will be returned to you after verification).
    </li>

    <li>
      Proof of residence &amp; Aadhaar Card.
    </li>

    <li>
      Photocopies of your Resignation Letter as well as the Relieving Letter from your current employer.
    </li>

    <li>
      Photocopy of your last drawn salary slip.
    </li>

    <li>
      Form No 16 / Certificate of Tax deducted as well as a copy of your PAN Card for Income Tax documentation.
    </li>
  </ol>

  <p class="paragraph">
    A detailed Appointment letter along with the terms and conditions of appointment applicable to you will be issued to you upon your joining the Company.
  </p>

  <p class="paragraph">
    We welcome you to Sandeep Edgetech Limited, and wish you a rewarding career ahead. Please feel free to get in touch with ${hrName} ${hrDesignation} (${hrEmail}) at any time for any further information.
  </p>

  <div class="signature">
    <div>
      Regards,
    </div>

    <div class="signature-company">
      Sandeep Edgetech Limited
    </div>

    <div class="signature-name">
      ${signatoryName}
    </div>

    <div class="signature-designation">
      ${signatoryDesignation}
    </div>
  </div>

</div>

</body>
</html>
`;
};

module.exports = {
  buildOfferHtml,
  formatDate,
};
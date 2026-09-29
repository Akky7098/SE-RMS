const fs =
  require("fs");

const path =
  require("path");

const puppeteer =
  require("puppeteer");

/* =========================================================
   PATHS
========================================================= */

const ASSET_DIR =
  path.resolve(
    __dirname,
    "../../assets/email"
  );

const LOGO_PATH =
  path.join(
    ASSET_DIR,
    "sandeep-edge-tech-logo.jpg"
  );

const HR_SIGN_STAMP_PATH =
  path.join(
    ASSET_DIR,
    "hr-sign-stamp.png"
  );

/* =========================================================
   HELPERS
========================================================= */

const escapeHtml =
  (value = "") =>
    String(value)
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );

const fileToDataUri =
  (
    filePath,
    mimeType
  ) => {
    if (
      !fs.existsSync(
        filePath
      )
    ) {
      return "";
    }

    const base64 =
      fs
        .readFileSync(
          filePath
        )
        .toString(
          "base64"
        );

    return (
      `data:${mimeType};base64,` +
      base64
    );
  };

const money =
  (value) => {
    const amount =
      Number(
        value || 0
      );

    return new Intl.NumberFormat(
      "en-IN",
      {
        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2,
      }
    ).format(
      amount
    );
  };

const formatDate =
  (value) => {
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
      return escapeHtml(
        value
      );
    }

    return new Intl.DateTimeFormat(
      "en-GB",
      {
        day:
          "2-digit",

        month:
          "long",

        year:
          "numeric",
      }
    ).format(
      date
    );
  };

const monthLabel =
  (value) => {
    if (
      !value
    ) {
      return "";
    }

    const match =
      String(
        value
      ).match(
        /^(\d{4})-(\d{2})$/
      );

    if (
      !match
    ) {
      return String(
        value
      );
    }

    const date =
      new Date(
        Date.UTC(
          Number(
            match[1]
          ),
          Number(
            match[2]
          ) - 1,
          1
        )
      );

    return new Intl.DateTimeFormat(
      "en-IN",
      {
        month:
          "long",

        year:
          "numeric",
      }
    ).format(
      date
    );
  };

const normalizeCode =
  (value) =>
    String(
      value || ""
    )
      .trim()
      .toUpperCase()
      .replace(
        /[^A-Z0-9]/g,
        ""
      );

const findComponent =
  (
    components,
    aliases
  ) => {
    const wanted =
      new Set(
        aliases.map(
          normalizeCode
        )
      );

    const component =
      (
        Array.isArray(
          components
        )
          ? components
          : []
      ).find(
        (item) =>
          wanted.has(
            normalizeCode(
              item?.code ||
              item?.name
            )
          )
      );

    return Number(
      component?.amount ||
      0
    );
  };

/* =========================================================
   SALARY BREAKUP

   Exactly:
   Basic
   HRA
   Conveyance
   Other Allowance
========================================================= */

const getSalaryBreakup =
  (
    salaryStructure
  ) => {
    const earnings =
      salaryStructure
        ?.earnings ||
      [];

    const basic =
      findComponent(
        earnings,
        [
          "BASIC",
          "BASIC SALARY",
          "BASIC PAY",
        ]
      );

    const hra =
      findComponent(
        earnings,
        [
          "HRA",
          "HOUSE RENT ALLOWANCE",
        ]
      );

    const conveyance =
      findComponent(
        earnings,
        [
          "CONVEYANCE",
          "CONVEYANCE ALLOWANCE",
          "CONV",
        ]
      );

    let otherAllowance =
      findComponent(
        earnings,
        [
          "OTHER",
          "OTHER ALLOWANCE",
          "OTHER ALLOWANCES",
        ]
      );

    const gross =
      Number(
        salaryStructure
          ?.monthlyGross ||
        0
      );

    /*
     * If Excel/database gross is authoritative and
     * Other Allowance is absent, balance it automatically.
     *
     * Basic + HRA + Conveyance + Other = Gross.
     */
    if (
      !otherAllowance &&
      gross >
        basic +
          hra +
          conveyance
    ) {
      otherAllowance =
        Math.max(
          0,
          gross -
            basic -
            hra -
            conveyance
        );
    }

    const calculatedGross =
      basic +
      hra +
      conveyance +
      otherAllowance;

    return {
      basic,
      hra,
      conveyance,
      otherAllowance,

      gross:
        gross ||
        calculatedGross,

      calculatedGross,
    };
  };

/* =========================================================
   HTML TEMPLATE
========================================================= */

const buildSalaryStructureHtml =
  ({
    employee,
    salaryStructure,
    payrollMonth,
    documentDate =
      new Date(),
  }) => {
    const logo =
      fileToDataUri(
        LOGO_PATH,
        "image/jpeg"
      );

    const signatureStamp =
      fileToDataUri(
        HR_SIGN_STAMP_PATH,
        "image/png"
      );

    const salary =
      getSalaryBreakup(
        salaryStructure
      );

    const annualGross =
      Number(
        salaryStructure
          ?.annualCTC ||
        salary.gross *
          12
      );

    const effectiveFrom =
      salaryStructure
        ?.effectiveFrom;

    const employeeName =
      employee
        ?.fullName ||
      employee
        ?.employeeName ||
      "—";

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
        ?.departmentName ||
      employee
        ?.orgUnitCode ||
      "—";

    const workLocation =
      employee
        ?.workLocation ||
      "—";

    const salaryPeriod =
      payrollMonth
        ? monthLabel(
            payrollMonth
          )
        : effectiveFrom
        ? `Effective from ${formatDate(
            effectiveFrom
          )}`
        : "Current Salary Structure";

    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />

<style>

  @page {
    size: A4;
    margin: 0;
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    font-family:
      Arial,
      Helvetica,
      sans-serif;
    color: #202020;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    position: relative;
    width: 210mm;
    min-height: 297mm;
    background: #ffffff;
    overflow: hidden;
  }

  /* ======================================================
     COMPANY HEADER
  ====================================================== */

  .letterhead {
    position: absolute;
    left: 12mm;
    right: 12mm;
    top: 8mm;
    height: 36mm;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .letterhead img {
    display: block;
    width: 100%;
    max-height: 35mm;
    object-fit: contain;
    object-position: center;
  }

  .header-rule {
    position: absolute;
    left: 13mm;
    right: 13mm;
    top: 45mm;
    border-top: 0.55mm solid #292929;
  }

  /* ======================================================
     BODY
  ====================================================== */

  .content {
    position: absolute;
    top: 54mm;
    left: 18mm;
    right: 18mm;
    bottom: 39mm;
  }

  .document-title {
    text-align: center;
    margin: 0;
    color: #111111;
    font-size: 15pt;
    font-weight: 700;
    letter-spacing: 0.4px;
    text-transform: uppercase;
  }

  .title-line {
    width: 54mm;
    height: 0.35mm;
    background: #111111;
    margin: 2.4mm auto 0;
  }

  .document-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 6mm;
    font-size: 8.8pt;
    color: #444444;
  }

  .document-meta strong {
    color: #111111;
    font-weight: 700;
  }

  /* ======================================================
     EMPLOYEE DETAILS
  ====================================================== */

  .employee-box {
    margin-top: 6mm;
    border: 0.35mm solid #b8b8b8;
  }

  .section-head {
    padding: 2.5mm 3.5mm;
    background: #f1f1f1;
    border-bottom: 0.35mm solid #b8b8b8;
    color: #111111;
    font-size: 9.3pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .employee-grid {
    display: grid;
    grid-template-columns:
      1fr
      1fr;
  }

  .employee-field {
    min-height: 14mm;
    padding: 2.6mm 3.5mm;
    border-bottom: 0.25mm solid #dddddd;
  }

  .employee-field:nth-child(odd) {
    border-right: 0.25mm solid #dddddd;
  }

  .employee-field:nth-last-child(-n + 2) {
    border-bottom: none;
  }

  .employee-label {
    display: block;
    margin-bottom: 1mm;
    color: #666666;
    font-size: 7.5pt;
    text-transform: uppercase;
  }

  .employee-value {
    color: #111111;
    font-size: 9.6pt;
    font-weight: 600;
  }

  /* ======================================================
     SALARY TABLE
  ====================================================== */

  .salary-section {
    margin-top: 7mm;
  }

  .salary-table {
    width: 100%;
    border-collapse: collapse;
    border: 0.35mm solid #9d9d9d;
  }

  .salary-table th {
    padding: 3mm 3.5mm;
    background: #ededed;
    border: 0.25mm solid #b5b5b5;
    color: #111111;
    font-size: 8.8pt;
    font-weight: 700;
    text-align: left;
  }

  .salary-table th.amount,
  .salary-table td.amount {
    width: 45mm;
    text-align: right;
  }

  .salary-table td {
    padding: 3.2mm 3.5mm;
    border: 0.25mm solid #d0d0d0;
    color: #222222;
    font-size: 9.2pt;
  }

  .salary-table .gross-row td {
    background: #f6f6f6;
    border-top: 0.5mm solid #777777;
    font-weight: 700;
    color: #111111;
  }

  .salary-table .annual-row td {
    background: #ffffff;
    font-weight: 700;
  }

  .rupee {
    display: inline-block;
    margin-right: 1.2mm;
    color: #333333;
  }

  /* ======================================================
     NOTE
  ====================================================== */

  .salary-note {
    margin-top: 5mm;
    color: #555555;
    font-size: 7.8pt;
    line-height: 1.55;
  }

  .salary-note strong {
    color: #222222;
  }

  /* ======================================================
     SIGNATURE
  ====================================================== */

  .signature-row {
    display: flex;
    justify-content: flex-end;
    margin-top: 10mm;
  }

  .signature-block {
    width: 53mm;
    text-align: center;
  }

  .signature-image-space {
    height: 25mm;
    display: flex;
    justify-content: center;
    align-items: flex-end;
  }

  .signature-image-space img {
    max-width: 45mm;
    max-height: 23mm;
    object-fit: contain;
  }

  .signature-line {
    border-top: 0.35mm solid #444444;
    padding-top: 2mm;
    font-size: 8.6pt;
    font-weight: 700;
    color: #111111;
  }

  .signature-company {
    margin-top: 1mm;
    font-size: 7.8pt;
    color: #555555;
  }

  /* ======================================================
     LETTERHEAD FOOTER

     Mirrors the official letterhead information.
  ====================================================== */

  .footer {
    position: absolute;
    left: 13mm;
    right: 13mm;
    bottom: 7mm;
    padding-top: 2.2mm;
    border-top: 0.5mm solid #333333;
  }

  .product-line {
    margin-bottom: 1.4mm;
    color: #d71920;
    font-size: 6.4pt;
    font-weight: 700;
  }

  .footer-text {
    color: #222222;
    font-size: 5.9pt;
    line-height: 1.35;
    font-weight: 600;
  }

</style>
</head>

<body>

<div class="page">

  ${
    logo
      ? `
        <div class="letterhead">
          <img
            src="${logo}"
            alt="Sandeep Edge Tech Limited"
          />
        </div>
      `
      : ""
  }

  <div class="header-rule"></div>

  <main class="content">

    <h1 class="document-title">
      Salary Structure
    </h1>

    <div class="title-line"></div>

    <div class="document-meta">

      <div>
        <strong>Period:</strong>
        ${escapeHtml(
          salaryPeriod
        )}
      </div>

      <div>
        <strong>Date:</strong>
        ${escapeHtml(
          formatDate(
            documentDate
          )
        )}
      </div>

    </div>

    <section class="employee-box">

      <div class="section-head">
        Employee Details
      </div>

      <div class="employee-grid">

        <div class="employee-field">
          <span class="employee-label">
            Employee Name
          </span>

          <span class="employee-value">
            ${escapeHtml(
              employeeName
            )}
          </span>
        </div>

        <div class="employee-field">
          <span class="employee-label">
            Employee Code
          </span>

          <span class="employee-value">
            ${escapeHtml(
              employeeCode
            )}
          </span>
        </div>

        <div class="employee-field">
          <span class="employee-label">
            Designation
          </span>

          <span class="employee-value">
            ${escapeHtml(
              designation
            )}
          </span>
        </div>

        <div class="employee-field">
          <span class="employee-label">
            Department
          </span>

          <span class="employee-value">
            ${escapeHtml(
              department
            )}
          </span>
        </div>

        <div class="employee-field">
          <span class="employee-label">
            Work Location
          </span>

          <span class="employee-value">
            ${escapeHtml(
              workLocation
            )}
          </span>
        </div>

        <div class="employee-field">
          <span class="employee-label">
            Effective From
          </span>

          <span class="employee-value">
            ${escapeHtml(
              formatDate(
                effectiveFrom
              )
            )}
          </span>
        </div>

      </div>

    </section>

    <section class="salary-section">

      <table class="salary-table">

        <thead>
          <tr>
            <th>
              Salary Component
            </th>

            <th class="amount">
              Monthly Amount (₹)
            </th>
          </tr>
        </thead>

        <tbody>

          <tr>
            <td>
              Basic Salary
            </td>

            <td class="amount">
              ${money(
                salary.basic
              )}
            </td>
          </tr>

          <tr>
            <td>
              House Rent Allowance (HRA)
            </td>

            <td class="amount">
              ${money(
                salary.hra
              )}
            </td>
          </tr>

          <tr>
            <td>
              Conveyance Allowance
            </td>

            <td class="amount">
              ${money(
                salary.conveyance
              )}
            </td>
          </tr>

          <tr>
            <td>
              Other Allowance
            </td>

            <td class="amount">
              ${money(
                salary.otherAllowance
              )}
            </td>
          </tr>

          <tr class="gross-row">
            <td>
              Gross Monthly Salary
            </td>

            <td class="amount">
              ${money(
                salary.gross
              )}
            </td>
          </tr>

          <tr class="annual-row">
            <td>
              Annual Gross Salary
            </td>

            <td class="amount">
              ${money(
                annualGross
              )}
            </td>
          </tr>

        </tbody>

      </table>

    </section>

    <div class="salary-note">

      <strong>Note:</strong>

      This salary structure represents the employee's
      applicable monthly salary components for the period
      stated above. Statutory deductions and other applicable
      deductions, if any, shall be made in accordance with
      applicable rules and company policy.

    </div>

    <div class="signature-row">

      <div class="signature-block">

        <div class="signature-image-space">

          ${
            signatureStamp
              ? `
                <img
                  src="${signatureStamp}"
                  alt="Authorised Signatory"
                />
              `
              : ""
          }

        </div>

        <div class="signature-line">
          Authorised Signatory
        </div>

        <div class="signature-company">
          For Sandeep Edge Tech Limited
        </div>

      </div>

    </div>

  </main>

  <footer class="footer">

    <div class="product-line">
      Tool and Die Steel, Plastic Mould Steel,
      Powder Metallurgy, High Speed Steel,
      High Strength Steel and Wear Resistant Steel
    </div>

    <div class="footer-text">
      Head Off.: C-5, Phase-1, Ashok Vihar, Delhi - 52
      &nbsp; Tel.: +91-11-43360000
      &nbsp; E-mail: info@sandeepedgetech.com
      <br />

      Works: 42-43 Mile Stone, NH-1, Village Asambad,
      District - Sonipat-131021 (Haryana)
      <br />

      Regd. Off.: GD-195, GF, Sector 3, Didham Nagar 1B Market,
      North 24 Pargannas, Salt Lake, W.B India - 700106.
    </div>

  </footer>

</div>

</body>
</html>
`;
  };

/* =========================================================
   GENERATE PDF BUFFER
========================================================= */

const generateSalaryStructurePdf =
  async ({
    employee,
    salaryStructure,
    payrollMonth,
    documentDate,
  }) => {
    const html =
      buildSalaryStructureHtml({
        employee,
        salaryStructure,
        payrollMonth,
        documentDate,
      });

    let browser;

    try {
      browser =
        await puppeteer.launch({
          headless:
            true,

          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
          ],
        });

      const page =
        await browser.newPage();

      await page.setContent(
        html,
        {
          waitUntil:
            "networkidle0",
        }
      );

      const pdf =
        await page.pdf({
          format:
            "A4",

          printBackground:
            true,

          preferCSSPageSize:
            true,

          margin: {
            top:
              "0mm",

            right:
              "0mm",

            bottom:
              "0mm",

            left:
              "0mm",
          },
        });

      return pdf;
    } finally {
      if (
        browser
      ) {
        await browser.close();
      }
    }
  };

module.exports = {
  buildSalaryStructureHtml,
  generateSalaryStructurePdf,
  getSalaryBreakup,
};
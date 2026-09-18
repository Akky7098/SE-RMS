/* =========================================================
   INTERVIEW CHECK-IN / WELCOME EMAIL TEMPLATE

   DESIGN GOALS
   ---------------------------------------------------------
   - Mobile first
   - Gmail compatible
   - Outlook friendly
   - No fixed-width information columns on mobile
   - Premium desktop card
   - Clean phone layout
   - Inline CSS + responsive media query
========================================================= */

/* =========================================================
   ESCAPE HTML
========================================================= */

const escapeHtml = (
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
   FORMAT DATE
========================================================= */

const formatDate =
  (
    value,
    timezone =
      "Asia/Kolkata"
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

    return new Intl.DateTimeFormat(
      "en-IN",
      {
        timeZone:
          timezone,

        weekday:
          "long",

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

/* =========================================================
   FORMAT TIME
========================================================= */

const formatTime =
  (
    value,
    timezone =
      "Asia/Kolkata"
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

    return new Intl.DateTimeFormat(
      "en-IN",
      {
        timeZone:
          timezone,

        hour:
          "2-digit",

        minute:
          "2-digit",

        hour12:
          true,
      }
    ).format(
      date
    );
  };

/* =========================================================
   OFFICE
========================================================= */

const getOffice =
  (
    code
  ) => {
    const value =
      String(
        code ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      value ===
      "SONIPAT"
    ) {
      return {
        name:
          process.env
            .INTERVIEW_OFFICE_SONIPAT_NAME ||
          "Sonipat Office",

        address:
          process.env
            .INTERVIEW_OFFICE_SONIPAT_ADDRESS ||
          "42-43 Milestone, Village Ashamabad, National Highway 1, Sector 29, Sonipat, Haryana 131021",
      };
    }

    return {
      name:
        process.env
          .INTERVIEW_OFFICE_DELHI_NAME ||
        "Delhi Office",

      address:
        process.env
          .INTERVIEW_OFFICE_DELHI_ADDRESS ||
        "C-5, Ashok Vihar Phase 1 Rd, Pocket C, Ashok Vihar, New Delhi, Delhi 110052",
    };
  };

/* =========================================================
   MODE
========================================================= */

const getModeLabel =
  (
    mode
  ) => {
    const value =
      String(
        mode ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      value ===
      "ONLINE"
    ) {
      return "Online Interview";
    }

    if (
      value ===
      "PHONE"
    ) {
      return "Phone Interview";
    }

    return "In-Person Interview";
  };

/* =========================================================
   WELCOME COPY
========================================================= */

const getWelcomeCopy =
  (
    mode
  ) => {
    const value =
      String(
        mode ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      value ===
      "ONLINE"
    ) {
      return {
        eyebrow:
          "YOU'RE CHECKED IN",

        title:
          "Thank you for joining us.",

        text:
          "Your interview check-in has been confirmed. We are glad to have you with us today and look forward to a thoughtful conversation about your experience, aspirations and the opportunity at Sandeep Edge Tech.",
      };
    }

    if (
      value ===
      "PHONE"
    ) {
      return {
        eyebrow:
          "YOU'RE CHECKED IN",

        title:
          "Thank you for connecting with us.",

        text:
          "Your interview check-in has been confirmed. We appreciate your time and look forward to learning more about your experience, aspirations and the value you can bring to our team.",
      };
    }

    return {
      eyebrow:
        "WELCOME TO SANDEEP EDGE TECH",

      title:
        "It's great to have you with us.",

      text:
        "Your arrival for today's interview has been confirmed. Thank you for taking the time to visit us. We hope your interaction with our team gives you a meaningful understanding of the role, our people and the culture at Sandeep Edge Tech.",
    };
  };

/* =========================================================
   DETAIL ROW

   Desktop:
   Label | Value

   Mobile:
   Label
   Value

   This fixes the narrow-value-column issue visible
   in Gmail mobile.
========================================================= */

const buildDetailRow =
  (
    label,
    value,
    options = {}
  ) => {
    const {
      htmlValue =
        false,
      last =
        false,
    } =
      options;

    const renderedValue =
      htmlValue
        ? value
        : escapeHtml(
            value
          );

    return `
      <tr>
        <td
          class="detail-row"
          style="
            padding:
              0
              0
              ${
                last
                  ? "0"
                  : "16px"
              }
              0;
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
              border-collapse:collapse;
            "
          >
            <tr>
              <td
                class="detail-label"
                width="35%"
                valign="top"
                style="
                  width:35%;
                  padding:1px 18px 0 0;
                  color:#8b94a1;
                  font-family:Arial,Helvetica,sans-serif;
                  font-size:13px;
                  line-height:1.5;
                  font-weight:600;
                "
              >
                ${escapeHtml(
                  label
                )}
              </td>

              <td
                class="detail-value"
                width="65%"
                valign="top"
                style="
                  width:65%;
                  color:#252c35;
                  font-family:Arial,Helvetica,sans-serif;
                  font-size:14px;
                  line-height:1.55;
                  font-weight:700;
                  word-break:normal;
                  overflow-wrap:break-word;
                "
              >
                ${renderedValue}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  };

/* =========================================================
   TEMPLATE
========================================================= */

const buildInterviewCheckInEmail =
  ({
    candidate,
    interview,
  }) => {
    const rawCandidateName =
      candidate
        ?.fullName ||
      "Candidate";

    const rawPosition =
      interview
        ?.positionTitle ||
      candidate
        ?.positionTitle ||
      "Position";

    const rawRoundName =
      interview
        ?.roundName ||
      `Round ${
        interview
          ?.roundNumber ||
        1
      }`;

    const candidateName =
      escapeHtml(
        rawCandidateName
      );

    const position =
      escapeHtml(
        rawPosition
      );

    const roundName =
      escapeHtml(
        rawRoundName
      );

    const timezone =
      interview
        ?.timezone ||
      process.env
        .DEFAULT_INTERVIEW_TIMEZONE ||
      "Asia/Kolkata";

    const interviewDate =
      formatDate(
        interview
          ?.scheduledAt,
        timezone
      );

    const interviewTime =
      formatTime(
        interview
          ?.scheduledAt,
        timezone
      );

    const duration =
      Number(
        interview
          ?.durationMinutes ||
        45
      );

    const mode =
      getModeLabel(
        interview
          ?.mode
      );

    const welcome =
      getWelcomeCopy(
        interview
          ?.mode
      );

    const office =
      getOffice(
        interview
          ?.officeLocation
      );

    const companyNameRaw =
      process.env
        .COMPANY_NAME ||
      "Sandeep Edge Tech";

    const companyName =
      escapeHtml(
        companyNameRaw
      );

    const normalizedMode =
      String(
        interview
          ?.mode ||
          ""
      )
        .trim()
        .toUpperCase();

    /* =====================================================
       LOCATION
    ===================================================== */

    let locationValue =
      "";

    if (
      normalizedMode ===
      "IN_PERSON"
    ) {
      locationValue = `
        <div
          style="
            color:#252c35;
            font-size:14px;
            line-height:1.45;
            font-weight:700;
          "
        >
          ${escapeHtml(
            office.name
          )}
        </div>

        <div
          style="
            margin-top:4px;
            color:#687382;
            font-size:13px;
            line-height:1.6;
            font-weight:500;
          "
        >
          ${escapeHtml(
            office.address
          )}
        </div>
      `;
    }

    /* =====================================================
       MEETING
    ===================================================== */

    let meetingValue =
      "";

    if (
      normalizedMode ===
        "ONLINE" &&
      interview
        ?.meetingLink
    ) {
      meetingValue = `
        <a
          href="${escapeHtml(
            interview
              .meetingLink
          )}"
          target="_blank"
          style="
            display:inline-block;
            color:#c91e31;
            font-size:13px;
            line-height:1.5;
            font-weight:700;
            text-decoration:none;
          "
        >
          Open interview meeting →
        </a>
      `;
    }

    /* =====================================================
       SUBJECT
    ===================================================== */

    const subject =
      `Welcome to ${companyNameRaw} | ${rawPosition} Interview`;

    /* =====================================================
       TEXT VERSION
    ===================================================== */

    const text =
`Dear ${rawCandidateName},

Welcome to ${companyNameRaw}.

Your interview check-in has been confirmed.

Position: ${rawPosition}
Interview Round: ${rawRoundName}
Date: ${interviewDate}
Time: ${interviewTime}
Duration: ${duration} minutes
Mode: ${mode}${
  normalizedMode ===
  "IN_PERSON"
    ? `\nLocation: ${office.name}, ${office.address}`
    : ""
}

Thank you for taking the time to meet with our team. We hope today's conversation gives you a meaningful understanding of the role, our people and Sandeep Edge Tech.

Our company brochure is attached for your reference.

Warm regards,
People & Culture
${companyNameRaw}`;

    /* =====================================================
       HTML
    ===================================================== */

    const html = `
<!doctype html>

<html>
<head>
  <meta charset="utf-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <meta
    name="x-apple-disable-message-reformatting"
  >

  <title>
    ${companyName}
  </title>

  <style>
    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
    }

    table,
    td {
      border-collapse: collapse;
    }

    img {
      border: 0;
      outline: none;
      text-decoration: none;
    }

    a {
      text-decoration: none;
    }

    @media only screen and (max-width: 620px) {
      .email-shell {
        padding:
          0 !important;
      }

      .email-container {
        width:
          100% !important;

        max-width:
          100% !important;

        border-radius:
          0 !important;

        border-left:
          0 !important;

        border-right:
          0 !important;
      }

      .hero-cell {
        padding:
          28px
          20px
          26px
          20px !important;
      }

      .hero-logo {
        width:
          120px !important;

        max-width:
          120px !important;

        margin-bottom:
          26px !important;
      }

      .hero-title {
        font-size:
          27px !important;

        line-height:
          1.15 !important;
      }

      .hero-copy {
        font-size:
          14px !important;

        line-height:
          1.65 !important;
      }

      .body-cell {
        padding:
          26px
          20px
          6px
          20px !important;
      }

      .section-cell {
        padding:
          18px
          20px
          22px
          20px !important;
      }

      .detail-card {
        border-radius:
          14px !important;
      }

      .detail-card-inner {
        padding:
          19px
          17px !important;
      }

      .detail-label,
      .detail-value {
        display:
          block !important;

        width:
          100% !important;

        box-sizing:
          border-box !important;
      }

      .detail-label {
        padding:
          0
          0
          4px
          0 !important;

        color:
          #8c96a3 !important;

        font-size:
          11px !important;

        line-height:
          1.4 !important;

        font-weight:
          700 !important;

        text-transform:
          uppercase !important;

        letter-spacing:
          0.6px !important;
      }

      .detail-value {
        padding:
          0 !important;

        color:
          #232a33 !important;

        font-size:
          14px !important;

        line-height:
          1.55 !important;

        word-break:
          normal !important;

        overflow-wrap:
          break-word !important;
      }

      .detail-row {
        padding-bottom:
          17px !important;
      }

      .message-card-cell {
        padding:
          0
          20px
          22px
          20px !important;
      }

      .brochure-cell {
        padding:
          0
          20px
          24px
          20px !important;
      }

      .closing-cell {
        padding:
          23px
          20px !important;
      }

      .footer-cell {
        padding:
          17px
          20px !important;
      }
    }
  </style>
</head>

<body
  style="
    margin:0;
    padding:0;
    width:100%;
    background:#f2f4f6;
    font-family:Arial,Helvetica,sans-serif;
    -webkit-font-smoothing:antialiased;
  "
>

  <!-- PREHEADER -->

  <div
    style="
      display:none;
      max-height:0;
      overflow:hidden;
      opacity:0;
      color:transparent;
    "
  >
    Your interview check-in with ${companyName}
    has been confirmed.
  </div>

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
        class="email-shell"
        align="center"
        style="
          padding:
            34px
            14px;
        "
      >

        <!-- =================================================
             MAIN EMAIL
        ================================================== -->

        <table
          class="email-container"
          width="640"
          cellpadding="0"
          cellspacing="0"
          border="0"
          role="presentation"
          style="
            width:100%;
            max-width:640px;
            background:#ffffff;
            border:1px solid #e2e6eb;
            border-radius:20px;
            overflow:hidden;
            box-shadow:
              0
              18px
              55px
              rgba(25,31,40,0.09);
          "
        >

          <!-- ===============================================
               HERO
          ================================================ -->

          <tr>
            <td
              class="hero-cell"
              style="
                padding:
                  31px
                  34px
                  30px
                  34px;

                background-color:#191c21;

                background-image:
                  linear-gradient(
                    135deg,
                    #191c21 0%,
                    #242830 67%,
                    #8f0e1e 100%
                  );
              "
            >

              <img
                class="hero-logo"
                src="cid:sandeep-edge-tech-logo"
                alt="${companyName}"
                width="142"
                style="
                  display:block;
                  width:142px;
                  max-width:142px;
                  height:auto;
                  margin:
                    0
                    0
                    32px
                    0;
                "
              >

              <div
                style="
                  margin:0 0 9px 0;
                  color:#ffadb6;
                  font-size:11px;
                  line-height:1.4;
                  font-weight:700;
                  letter-spacing:1.6px;
                "
              >
                ${escapeHtml(
                  welcome.eyebrow
                )}
              </div>

              <h1
                class="hero-title"
                style="
                  margin:
                    0
                    0
                    10px
                    0;

                  color:#ffffff;
                  font-family:Arial,Helvetica,sans-serif;
                  font-size:31px;
                  line-height:1.15;
                  font-weight:700;
                  letter-spacing:-0.6px;
                "
              >
                Welcome,
                ${candidateName}
              </h1>

              <p
                class="hero-copy"
                style="
                  max-width:500px;
                  margin:0;
                  color:#d8dde4;
                  font-size:14px;
                  line-height:1.7;
                  font-weight:400;
                "
              >
                ${escapeHtml(
                  welcome.title
                )}
              </p>

            </td>
          </tr>

          <!-- ===============================================
               INTRODUCTION
          ================================================ -->

          <tr>
            <td
              class="body-cell"
              style="
                padding:
                  30px
                  34px
                  8px
                  34px;
              "
            >

              <p
                style="
                  margin:
                    0
                    0
                    14px
                    0;

                  color:#313944;
                  font-size:15px;
                  line-height:1.7;
                "
              >
                Dear
                <strong>
                  ${candidateName}
                </strong>,
              </p>

              <p
                style="
                  margin:0;
                  color:#66717e;
                  font-size:14px;
                  line-height:1.75;
                "
              >
                ${escapeHtml(
                  welcome.text
                )}
              </p>

            </td>
          </tr>

          <!-- ===============================================
               DETAILS
          ================================================ -->

          <tr>
            <td
              class="section-cell"
              style="
                padding:
                  22px
                  34px
                  26px
                  34px;
              "
            >

              <table
                class="detail-card"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                role="presentation"
                style="
                  width:100%;
                  background:#f8fafb;
                  border:1px solid #e0e5eb;
                  border-radius:15px;
                "
              >
                <tr>
                  <td
                    class="detail-card-inner"
                    style="
                      padding:
                        22px
                        23px;
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
                          style="
                            padding:
                              0
                              0
                              19px
                              0;

                            color:#717c8b;
                            font-size:11px;
                            line-height:1.4;
                            font-weight:700;
                            letter-spacing:1.1px;
                          "
                        >
                          YOUR INTERVIEW
                        </td>
                      </tr>

                      ${buildDetailRow(
                        "Position",
                        rawPosition
                      )}

                      ${buildDetailRow(
                        "Interview Round",
                        rawRoundName
                      )}

                      ${buildDetailRow(
                        "Date",
                        interviewDate
                      )}

                      ${buildDetailRow(
                        "Time",
                        interviewTime
                      )}

                      ${buildDetailRow(
                        "Duration",
                        `${duration} minutes`
                      )}

                      ${buildDetailRow(
                        "Mode",
                        mode,
                        {
                          last:
                            normalizedMode !==
                              "IN_PERSON" &&
                            !meetingValue,
                        }
                      )}

                      ${
                        locationValue
                          ? buildDetailRow(
                              "Location",
                              locationValue,
                              {
                                htmlValue:
                                  true,

                                last:
                                  true,
                              }
                            )
                          : ""
                      }

                      ${
                        meetingValue
                          ? buildDetailRow(
                              "Meeting",
                              meetingValue,
                              {
                                htmlValue:
                                  true,

                                last:
                                  true,
                              }
                            )
                          : ""
                      }

                    </table>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ===============================================
               HUMAN MESSAGE
          ================================================ -->

          <tr>
            <td
              class="message-card-cell"
              style="
                padding:
                  0
                  34px
                  25px
                  34px;
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
                  background:#fff6f7;
                  border:1px solid #efd7da;
                  border-radius:14px;
                "
              >
                <tr>
                  <td
                    style="
                      padding:
                        19px
                        20px;
                    "
                  >

                    <div
                      style="
                        margin:
                          0
                          0
                          7px
                          0;

                        color:#b51e2e;
                        font-size:11px;
                        line-height:1.4;
                        font-weight:700;
                        letter-spacing:0.8px;
                      "
                    >
                      BEFORE YOUR CONVERSATION
                    </div>

                    <p
                      style="
                        margin:0;
                        color:#646f7b;
                        font-size:13px;
                        line-height:1.7;
                      "
                    >
                      Be yourself, ask questions and use the
                      conversation to understand the opportunity
                      as clearly as possible. We value thoughtful
                      discussions and believe an interview should
                      help both sides make an informed decision.
                    </p>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ===============================================
               COMPANY BROCHURE
          ================================================ -->

          <tr>
            <td
              class="brochure-cell"
              style="
                padding:
                  0
                  34px
                  27px
                  34px;
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
                  border:1px solid #e2e7ec;
                  border-radius:13px;
                  background:#ffffff;
                "
              >
                <tr>
                  <td
                    style="
                      padding:
                        17px
                        18px;
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
                          valign="middle"
                        >
                          <div
                            style="
                              color:#323a44;
                              font-size:13px;
                              line-height:1.45;
                              font-weight:700;
                            "
                          >
                            Discover more about us
                          </div>

                          <div
                            style="
                              margin-top:4px;
                              color:#808b98;
                              font-size:12px;
                              line-height:1.55;
                            "
                          >
                            The Sandeep Edge Tech company
                            brochure is attached to this email.
                          </div>
                        </td>

                        <td
                          width="48"
                          valign="middle"
                          align="right"
                          style="
                            width:48px;
                          "
                        >
                          <table
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                            role="presentation"
                          >
                            <tr>
                              <td
                                align="center"
                                style="
                                  width:42px;
                                  height:42px;
                                  border-radius:10px;
                                  background:#fff0f2;
                                  color:#c71d31;
                                  font-size:10px;
                                  font-weight:700;
                                "
                              >
                                PDF
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ===============================================
               CLOSING
          ================================================ -->

          <tr>
            <td
              class="closing-cell"
              style="
                padding:
                  25px
                  34px;

                background:#f8fafb;
                border-top:1px solid #edf0f3;
              "
            >

              <p
                style="
                  margin:0;
                  color:#49535f;
                  font-size:14px;
                  line-height:1.7;
                "
              >
                We wish you a comfortable and successful
                interview experience.
              </p>

              <p
                style="
                  margin:
                    17px
                    0
                    0
                    0;

                  color:#303842;
                  font-size:13px;
                  line-height:1.6;
                "
              >
                Warm regards,
                <br>

                <strong>
                  People & Culture
                </strong>

                <br>

                ${companyName}
              </p>

            </td>
          </tr>

          <!-- ===============================================
               FOOTER
          ================================================ -->

          <tr>
            <td
              class="footer-cell"
              align="center"
              style="
                padding:
                  18px
                  24px;

                background:#202329;
                color:#9ca5b0;
                font-size:11px;
                line-height:1.6;
              "
            >
              Recruitment communication from
              ${companyName}
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

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  buildInterviewCheckInEmail,
};
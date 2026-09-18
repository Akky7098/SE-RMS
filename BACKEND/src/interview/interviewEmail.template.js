/* =========================================================
   HTML ESCAPE
========================================================= */

const escapeHtml = (
  value
) => {
  return String(
    value ?? ""
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
};

/* =========================================================
   DATE
========================================================= */

const formatDate = (
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

  return date.toLocaleDateString(
    "en-IN",
    {
      timeZone:
        "Asia/Kolkata",

      weekday:
        "long",

      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",
    }
  );
};

const formatTime = (
  value
) => {
  if (
    !value
  ) {
    return "—";
  }

  return new Date(
    value
  ).toLocaleTimeString(
    "en-IN",
    {
      timeZone:
        "Asia/Kolkata",

      hour:
        "2-digit",

      minute:
        "2-digit",

      hour12:
        true,
    }
  );
};

/* =========================================================
   MODE
========================================================= */

const formatMode = (
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
    "IN_PERSON"
  ) {
    return "In-Person Interview";
  }

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

  return value.replaceAll(
    "_",
    " "
  );
};

/* =========================================================
   DETAILS ROW
========================================================= */

const detailRow = (
  label,
  value
) => `
<tr>
  <td
    style="
      padding: 13px 0;
      border-bottom: 1px solid #eef0f3;
      width: 37%;
      color: #7b8490;
      font-size: 13px;
      font-weight: 600;
      vertical-align: top;
    "
  >
    ${escapeHtml(label)}
  </td>

  <td
    style="
      padding: 13px 0;
      border-bottom: 1px solid #eef0f3;
      color: #232a33;
      font-size: 13px;
      font-weight: 700;
      vertical-align: top;
    "
  >
    ${escapeHtml(value)}
  </td>
</tr>
`;

/* =========================================================
   SHELL
========================================================= */

const shell = ({
  preheader,
  heading,
  intro,
  badge,
  body,
  footerNote,
}) => {
  return `
<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>${escapeHtml(
    heading
  )}</title>
</head>

<body
  style="
    margin: 0;
    padding: 0;
    background: #f3f5f8;
    font-family:
      Inter,
      Arial,
      Helvetica,
      sans-serif;
    color: #252b33;
  "
>
  <div
    style="
      display: none;
      max-height: 0;
      overflow: hidden;
      opacity: 0;
    "
  >
    ${escapeHtml(
      preheader
    )}
  </div>

  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="
      width: 100%;
      background: #f3f5f8;
    "
  >
    <tr>
      <td
        align="center"
        style="
          padding: 34px 14px;
        "
      >
        <table
          role="presentation"
          width="650"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="
            width: 100%;
            max-width: 650px;
            overflow: hidden;
            background: #ffffff;
            border: 1px solid #e5e8ed;
            border-radius: 22px;
            box-shadow:
              0 18px 55px
              rgba(22, 27, 35, 0.08);
          "
        >
          <!-- HEADER -->

          <tr>
            <td
              style="
                padding: 25px 30px;
                background:
                  linear-gradient(
                    120deg,
                    #191c22 0%,
                    #23262d 58%,
                    #a10917 100%
                  );
              "
            >
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
              >
                <tr>
                  <td
                    style="
                      vertical-align: middle;
                    "
                  >
                    <img
                      src="cid:sandeep-edge-tech-logo"
                      alt="Sandeep Edge Tech"
                      width="168"
                      style="
                        display: block;
                        width: 168px;
                        max-width: 168px;
                        height: auto;
                        background: #ffffff;
                        border-radius: 9px;
                        padding: 7px 9px;
                      "
                    />
                  </td>

                  <td
                    align="right"
                    style="
                      vertical-align: middle;
                    "
                  >
                    <span
                      style="
                        display: inline-block;
                        padding: 7px 11px;
                        border: 1px solid
                          rgba(255,255,255,0.22);
                        border-radius: 999px;
                        background:
                          rgba(255,255,255,0.1);
                        color: #ffffff;
                        font-size: 11px;
                        font-weight: 700;
                        letter-spacing: 0.5px;
                      "
                    >
                      ${escapeHtml(
                        badge
                      )}
                    </span>
                  </td>
                </tr>
              </table>

              <div
                style="
                  margin-top: 27px;
                  color: #ffb4bb;
                  font-size: 11px;
                  font-weight: 800;
                  letter-spacing: 1.5px;
                "
              >
                RECRUITMENT
              </div>

              <h1
                style="
                  margin: 8px 0 0;
                  color: #ffffff;
                  font-size: 30px;
                  line-height: 1.15;
                  font-weight: 800;
                  letter-spacing: -0.6px;
                "
              >
                ${escapeHtml(
                  heading
                )}
              </h1>

              <p
                style="
                  max-width: 510px;
                  margin: 10px 0 0;
                  color:
                    rgba(255,255,255,0.72);
                  font-size: 13px;
                  line-height: 1.6;
                "
              >
                ${escapeHtml(
                  intro
                )}
              </p>
            </td>
          </tr>

          <!-- BODY -->

          <tr>
            <td
              style="
                padding: 28px 30px 30px;
              "
            >
              ${body}
            </td>
          </tr>

          <!-- FOOTER -->

          <tr>
            <td
              style="
                padding: 20px 30px;
                border-top: 1px solid #e8ebef;
                background: #fafbfc;
                color: #7c8591;
                font-size: 11px;
                line-height: 1.6;
              "
            >
              ${escapeHtml(
                footerNote
              )}

              <div
                style="
                  margin-top: 12px;
                  color: #444b55;
                  font-weight: 700;
                "
              >
                Sandeep Edge Tech
              </div>

              <div>
                Steel Solutions
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
};

/* =========================================================
   CANDIDATE TEMPLATE
========================================================= */

const buildCandidateInterviewEmail =
  ({
    candidate,
    interview,
    interviewer,
  }) => {
    const firstName =
      String(
        candidate?.fullName ||
          "Candidate"
      )
        .trim()
        .split(/\s+/)[0];

    const mode =
      formatMode(
        interview.mode
      );

    const location =
      interview.mode ===
      "ONLINE"
        ? "Online meeting"
        : interview.mode ===
          "PHONE"
        ? "Phone"
        : interview.officeLocation ||
          "Company Office";

    const meetingSection =
      interview.mode ===
        "ONLINE" &&
      interview.meetingLink
        ? `
          <div
            style="
              margin-top: 20px;
              padding: 17px 18px;
              border: 1px solid #cfe0f6;
              border-radius: 14px;
              background: #f4f8fe;
            "
          >
            <div
              style="
                color: #59789e;
                font-size: 11px;
                font-weight: 800;
                letter-spacing: 0.7px;
              "
            >
              VIDEO INTERVIEW
            </div>

            <div
              style="
                margin-top: 7px;
                color: #334a66;
                font-size: 13px;
                font-weight: 700;
              "
            >
              Use the meeting link below at the scheduled time.
            </div>

            <a
              href="${escapeHtml(
                interview.meetingLink
              )}"
              style="
                display: inline-block;
                margin-top: 13px;
                padding: 11px 17px;
                border-radius: 10px;
                background: #20242b;
                color: #ffffff;
                font-size: 12px;
                font-weight: 800;
                text-decoration: none;
              "
            >
              Join Interview →
            </a>
          </div>
        `
        : "";

    const body = `
      <p
        style="
          margin: 0;
          color: #343b45;
          font-size: 14px;
          line-height: 1.7;
        "
      >
        Dear ${escapeHtml(
          firstName
        )},
      </p>

      <p
        style="
          margin: 12px 0 0;
          color: #5d6672;
          font-size: 13px;
          line-height: 1.7;
        "
      >
        Thank you for your interest in joining
        <strong>Sandeep Edge Tech</strong>.
        We are pleased to confirm that your interview has been scheduled for the position of
        <strong>${escapeHtml(
          interview.positionTitle
        )}</strong>.
      </p>

      <div
        style="
          margin-top: 22px;
          padding: 18px 20px;
          border: 1px solid #e3e7ec;
          border-radius: 16px;
          background: #ffffff;
        "
      >
        <div
          style="
            color: #e00718;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1px;
          "
        >
          INTERVIEW DETAILS
        </div>

        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="
            width: 100%;
            margin-top: 7px;
          "
        >
          ${detailRow(
            "Position",
            interview.positionTitle
          )}

          ${detailRow(
            "Interview Round",
            `${interview.roundName} · Round ${interview.roundNumber}`
          )}

          ${detailRow(
            "Date",
            formatDate(
              interview.scheduledAt
            )
          )}

          ${detailRow(
            "Time",
            `${formatTime(
              interview.scheduledAt
            )} IST`
          )}

          ${detailRow(
            "Duration",
            `${interview.durationMinutes} minutes`
          )}

          ${detailRow(
            "Mode",
            mode
          )}

          ${detailRow(
            "Location",
            location
          )}

          ${detailRow(
            "Interviewer",
            interviewer?.displayName ||
              "Sandeep Edge Tech Interview Panel"
          )}
        </table>
      </div>

      ${meetingSection}

      <div
        style="
          margin-top: 20px;
          padding: 17px 18px;
          border-left: 4px solid #e20818;
          border-radius: 0 13px 13px 0;
          background: #fff6f7;
        "
      >
        <div
          style="
            color: #8e2430;
            font-size: 12px;
            font-weight: 800;
          "
        >
          Before your interview
        </div>

        <ul
          style="
            margin: 9px 0 0;
            padding-left: 19px;
            color: #685b5e;
            font-size: 12px;
            line-height: 1.75;
          "
        >
          <li>
            Please be available 10 minutes before the scheduled time.
          </li>

          <li>
            Keep a copy of your latest resume and relevant documents ready.
          </li>

          <li>
            For an online interview, please check your camera, microphone and internet connection in advance.
          </li>

          <li>
            If you need to request a change, reply to this email as early as possible.
          </li>
        </ul>
      </div>

      <p
        style="
          margin: 22px 0 0;
          color: #5d6672;
          font-size: 13px;
          line-height: 1.7;
        "
      >
        We look forward to speaking with you and learning more about your experience.
      </p>

      <p
        style="
          margin: 18px 0 0;
          color: #303740;
          font-size: 13px;
          line-height: 1.6;
        "
      >
        Regards,<br />
        <strong>Recruitment Team</strong><br />
        Sandeep Edge Tech
      </p>
    `;

    return shell({
      preheader:
        `Your interview for ${interview.positionTitle} has been scheduled.`,

      heading:
        "Your Interview Is Scheduled",

      intro:
        "We are pleased to confirm the next step in your application with Sandeep Edge Tech.",

      badge:
        "INTERVIEW CONFIRMED",

      body,

      footerNote:
        "This is an automated recruitment notification. You may reply to this email if you need assistance regarding your interview.",
    });
  };

/* =========================================================
   INTERVIEWER TEMPLATE
========================================================= */

const buildInterviewerInterviewEmail =
  ({
    candidate,
    interview,
    interviewer,
    requirement,
  }) => {
    const firstName =
      String(
        interviewer?.displayName ||
          "Interviewer"
      )
        .trim()
        .split(/\s+/)[0];

    const body = `
      <p
        style="
          margin: 0;
          color: #343b45;
          font-size: 14px;
          line-height: 1.7;
        "
      >
        Hello ${escapeHtml(
          firstName
        )},
      </p>

      <p
        style="
          margin: 12px 0 0;
          color: #5d6672;
          font-size: 13px;
          line-height: 1.7;
        "
      >
        You have been assigned to conduct an interview for
        <strong>${escapeHtml(
          candidate?.fullName
        )}</strong>
        for the position of
        <strong>${escapeHtml(
          interview.positionTitle
        )}</strong>.
      </p>

      <div
        style="
          margin-top: 22px;
          padding: 18px 20px;
          border: 1px solid #e3e7ec;
          border-radius: 16px;
          background: #ffffff;
        "
      >
        <div
          style="
            color: #e00718;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1px;
          "
        >
          INTERVIEW ASSIGNMENT
        </div>

        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="
            width: 100%;
            margin-top: 7px;
          "
        >
          ${detailRow(
            "Candidate",
            candidate?.fullName ||
              "Candidate"
          )}

          ${detailRow(
            "Candidate ID",
            candidate?.candidateNumber ||
              "—"
          )}

          ${detailRow(
            "Position",
            interview.positionTitle
          )}

          ${detailRow(
            "Requirement",
            requirement?.requestNumber ||
              "—"
          )}

          ${detailRow(
            "Round",
            `${interview.roundName} · Round ${interview.roundNumber}`
          )}

          ${detailRow(
            "Date",
            formatDate(
              interview.scheduledAt
            )
          )}

          ${detailRow(
            "Time",
            `${formatTime(
              interview.scheduledAt
            )} IST`
          )}

          ${detailRow(
            "Duration",
            `${interview.durationMinutes} minutes`
          )}

          ${detailRow(
            "Mode",
            formatMode(
              interview.mode
            )
          )}

          ${detailRow(
            "Candidate Email",
            candidate?.email ||
              "—"
          )}

          ${detailRow(
            "Candidate Mobile",
            candidate?.mobile ||
              "—"
          )}
        </table>
      </div>

      <div
        style="
          margin-top: 20px;
          padding: 17px 18px;
          border: 1px solid #d6e4f5;
          border-radius: 14px;
          background: #f4f8fd;
        "
      >
        <div
          style="
            color: #426b9e;
            font-size: 12px;
            font-weight: 800;
          "
        >
          Candidate CV attached
        </div>

        <p
          style="
            margin: 6px 0 0;
            color: #68798e;
            font-size: 12px;
            line-height: 1.6;
          "
        >
          The latest CV available in SE-RMS is attached to this email for interview preparation.
        </p>
      </div>

      ${
        interview.remarks
          ? `
            <div
              style="
                margin-top: 18px;
                padding: 16px 18px;
                border-left: 4px solid #df9b23;
                border-radius: 0 12px 12px 0;
                background: #fff9ee;
              "
            >
              <div
                style="
                  color: #805719;
                  font-size: 12px;
                  font-weight: 800;
                "
              >
                Internal interview note
              </div>

              <p
                style="
                  margin: 6px 0 0;
                  color: #77684e;
                  font-size: 12px;
                  line-height: 1.6;
                "
              >
                ${escapeHtml(
                  interview.remarks
                )}
              </p>
            </div>
          `
          : ""
      }

      <p
        style="
          margin: 22px 0 0;
          color: #5d6672;
          font-size: 13px;
          line-height: 1.7;
        "
      >
        Please review the candidate profile and CV before the scheduled time and record the evaluation in SE-RMS after the interview.
      </p>

      <p
        style="
          margin: 18px 0 0;
          color: #303740;
          font-size: 13px;
          line-height: 1.6;
        "
      >
        Regards,<br />
        <strong>SE-RMS Recruitment</strong><br />
        Sandeep Edge Tech
      </p>
    `;

    return shell({
      preheader:
        `Interview assigned: ${candidate?.fullName} — ${interview.positionTitle}`,

      heading:
        "Interview Assigned To You",

      intro:
        "A candidate interview has been scheduled and assigned to you through SE-RMS.",

      badge:
        "INTERVIEW ASSIGNMENT",

      body,

      footerNote:
        "Internal recruitment communication. Candidate information and attached documents should be handled in accordance with company data-handling requirements.",
    });
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  buildCandidateInterviewEmail,

  buildInterviewerInterviewEmail,

  formatDate,

  formatTime,
};
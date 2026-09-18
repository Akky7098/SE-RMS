const escapeHtml =
  (
    value
  ) =>
    String(
      value ||
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

const buildDocumentsVerifiedEmail =
  ({
    candidate,
    selection,
  }) => {
    const name =
      candidate
        ?.fullName ||
      "Candidate";

    const position =
      selection
        ?.positionTitle ||
      "your selected position";

    const subject =
      "Your pre-joining documents have been verified";

    const text =
      [
        `Dear ${name},`,
        "",
        "Your submitted pre-joining information and documents have been successfully verified by our People & Culture team.",
        "",
        `Position: ${position}`,
        "",
        "No further action is required from you at this stage.",
        "",
        "Our team will prepare your Offer Letter and share it with you through your secure candidate portal shortly.",
        "",
        "Regards,",
        "People & Culture",
        "Sandeep Edge Tech",
      ].join(
        "\n"
      );

    const html =
      `
      <!doctype html>
      <html>
      <body style="
        margin:0;
        padding:0;
        background:#f4f6f8;
        font-family:Arial,Helvetica,sans-serif;
      ">

        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          style="
            width:100%;
            padding:35px 16px;
            background:#f4f6f8;
          "
        >
          <tr>
            <td align="center">

              <table
                role="presentation"
                width="620"
                cellspacing="0"
                cellpadding="0"
                style="
                  width:100%;
                  max-width:620px;
                  background:#ffffff;
                  border-radius:18px;
                  overflow:hidden;
                  box-shadow:0 15px 45px rgba(20,30,45,.08);
                "
              >

                <tr>
                  <td style="
                    padding:29px 30px;
                    background:linear-gradient(135deg,#0e6642,#119061);
                    color:#ffffff;
                  ">

                    <div style="
                      font-size:11px;
                      font-weight:700;
                      letter-spacing:1.4px;
                      color:#bdeed6;
                    ">
                      DOCUMENT VERIFICATION
                    </div>

                    <div style="
                      margin-top:8px;
                      font-size:25px;
                      font-weight:700;
                    ">
                      Documents verified successfully
                    </div>

                  </td>
                </tr>

                <tr>
                  <td style="
                    padding:31px;
                    color:#515c68;
                  ">

                    <p style="
                      margin:0;
                      font-size:14px;
                      line-height:1.7;
                    ">
                      Dear
                      <strong>${escapeHtml(
                        name
                      )}</strong>,
                    </p>

                    <p style="
                      margin:17px 0 0;
                      font-size:14px;
                      line-height:1.75;
                    ">
                      Your submitted pre-joining information
                      and documents have been successfully
                      verified by our People & Culture team.
                    </p>

                    <div style="
                      margin:24px 0;
                      padding:18px;
                      border:1px solid #c8ead8;
                      border-radius:13px;
                      background:#f2fbf6;
                    ">

                      <div style="
                        color:#76857d;
                        font-size:11px;
                        font-weight:700;
                      ">
                        POSITION
                      </div>

                      <div style="
                        margin-top:6px;
                        color:#276144;
                        font-size:15px;
                        font-weight:700;
                      ">
                        ${escapeHtml(
                          position
                        )}
                      </div>

                    </div>

                    <p style="
                      margin:0;
                      font-size:14px;
                      line-height:1.75;
                    ">
                      No further action is required from you
                      at this stage.
                    </p>

                    <p style="
                      margin:15px 0 0;
                      font-size:14px;
                      line-height:1.75;
                    ">
                      Our team will now prepare your
                      <strong>Offer Letter</strong>.
                      You will receive it shortly through
                      your secure candidate portal.
                    </p>

                    <div style="
                      margin-top:25px;
                      padding-top:20px;
                      border-top:1px solid #edf0f2;
                      color:#8a949f;
                      font-size:12px;
                      line-height:1.6;
                    ">
                      Regards,<br />
                      <strong style="color:#4b5661;">
                        People & Culture
                      </strong><br />
                      Sandeep Edge Tech
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
  buildDocumentsVerifiedEmail,
};
const asyncHandler =
  require(
    "../utils/asyncHandler"
  );

const manpowerService =
  require(
    "./manpower.service"
  );

const {
  validateCreateManpower,
  validateApproval,
  validateRejection,
  validateAssignHr,
} =
  require(
    "./manpower.validation"
  );

/* =========================================================
   HTML HELPERS
========================================================= */

const escapeHtml =
  (
    value
  ) =>
    String(
      value ?? ""
    )
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

const getDisplayName =
  (
    value
  ) =>
    String(
      value?.displayName ||
      value?.fullName ||
      value?.name ||
      value?.email ||
      "-"
    );

const formatDate =
  (
    value
  ) => {
    if (
      !value
    ) {
      return "-";
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
      return "-";
    }

    return [
      String(
        date.getDate()
      ).padStart(
        2,
        "0"
      ),

      String(
        date.getMonth() +
        1
      ).padStart(
        2,
        "0"
      ),

      date.getFullYear(),
    ].join(
      "/"
    );
  };

const getErrorStatus =
  (
    error
  ) => {
    const status =
      Number(
        error?.statusCode ||
        error?.status ||
        500
      );

    if (
      !Number.isFinite(
        status
      ) ||
      status < 400 ||
      status > 599
    ) {
      return 500;
    }

    return status;
  };

const getSafeErrorMessage =
  (
    error
  ) => {
    const status =
      getErrorStatus(
        error
      );

    if (
      status >= 500
    ) {
      return "Something went wrong while processing this manpower request.";
    }

    return (
      error?.message ||
      "Unable to process this manpower request."
    );
  };

/* =========================================================
   COMMON HTML PAGE
========================================================= */

const renderHtmlPage =
  ({
    title,
    subtitle = "",
    content = "",
    accent = "#0f172a",
  }) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <meta
    name="robots"
    content="noindex,nofollow"
  />

  <title>${escapeHtml(title)} | SE-RMS</title>

  <style>
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      min-height: 100%;
    }

    body {
      min-height: 100vh;
      font-family:
        Inter,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Helvetica,
        Arial,
        sans-serif;

      background:
        linear-gradient(
          145deg,
          #f8fafc 0%,
          #eef2f7 100%
        );

      color: #0f172a;

      display: flex;
      align-items: center;
      justify-content: center;

      padding: 24px;
    }

    .page {
      width: 100%;
      max-width: 720px;
    }

    .brand {
      text-align: center;
      margin-bottom: 20px;
    }

    .brand-name {
      font-size: 15px;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #475569;
    }

    .brand-subtitle {
      margin-top: 8px;
      font-size: 13px;
      color: #94a3b8;
    }

    .card {
      width: 100%;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 22px;

      box-shadow:
        0 20px 55px
        rgba(15, 23, 42, 0.08);

      overflow: hidden;
    }

    .accent {
      height: 6px;
      background: ${accent};
    }

    .card-body {
      padding: 34px;
    }

    h1 {
      margin: 0;
      font-size: 27px;
      line-height: 1.25;
      letter-spacing: -0.025em;
      color: #0f172a;
    }

    .subtitle {
      margin-top: 10px;
      color: #64748b;
      font-size: 15px;
      line-height: 1.6;
    }

    .footer {
      margin-top: 20px;
      text-align: center;
      color: #94a3b8;
      font-size: 12px;
      line-height: 1.6;
    }

    @media (
      max-width: 640px
    ) {
      body {
        padding: 14px;
        align-items: flex-start;
      }

      .page {
        margin-top: 18px;
      }

      .card {
        border-radius: 18px;
      }

      .card-body {
        padding: 24px 20px;
      }

      h1 {
        font-size: 23px;
      }
    }
  </style>
</head>

<body>
  <main class="page">
    <div class="brand">
      <div class="brand-name">
        SE-RMS
      </div>

      <div class="brand-subtitle">
        Manpower Approval System
      </div>
    </div>

    <section class="card">
      <div class="accent"></div>

      <div class="card-body">
        <h1>
          ${escapeHtml(title)}
        </h1>

        ${
          subtitle
            ? `
              <div class="subtitle">
                ${escapeHtml(subtitle)}
              </div>
            `
            : ""
        }

        ${content}
      </div>
    </section>

    <div class="footer">
      This is a secure SE-RMS manpower approval page.
    </div>
  </main>
</body>
</html>
`;
  };

/* =========================================================
   MESSAGE PAGE
========================================================= */

const renderMessagePage =
  ({
    title,
    message,
    type = "info",
    requirement = null,
  }) => {
    let accent =
      "#2563eb";

    let icon =
      "ℹ";

    if (
      type ===
      "success"
    ) {
      accent =
        "#16a34a";

      icon =
        "✓";
    }

    if (
      type ===
      "error"
    ) {
      accent =
        "#dc2626";

      icon =
        "!";
    }

    if (
      type ===
      "warning"
    ) {
      accent =
        "#d97706";

      icon =
        "!";
    }

    const requirementInfo =
      requirement
        ? `
          <div
            style="
              margin-top: 24px;
              border: 1px solid #e2e8f0;
              border-radius: 14px;
              background: #f8fafc;
              overflow: hidden;
            "
          >
            <div
              style="
                padding: 14px 16px;
                border-bottom: 1px solid #e2e8f0;
                font-size: 13px;
                color: #64748b;
              "
            >
              Manpower Request
            </div>

            <div
              style="
                padding: 16px;
                font-weight: 700;
                font-size: 17px;
                color: #0f172a;
              "
            >
              ${escapeHtml(
                requirement.requestNumber ||
                ""
              )}
            </div>
          </div>
        `
        : "";

    const content = `
      <div
        style="
          margin-top: 26px;
          display: flex;
          gap: 16px;
          align-items: flex-start;
        "
      >
        <div
          style="
            flex: 0 0 46px;
            width: 46px;
            height: 46px;
            border-radius: 50%;
            background: ${accent};
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 23px;
            font-weight: 800;
          "
        >
          ${icon}
        </div>

        <div
          style="
            flex: 1;
            padding-top: 2px;
            color: #475569;
            font-size: 15px;
            line-height: 1.7;
          "
        >
          ${escapeHtml(message)}
        </div>
      </div>

      ${requirementInfo}
    `;

    return renderHtmlPage({
      title,
      subtitle:
        "",
      content,
      accent,
    });
  };

/* =========================================================
   APPROVAL CONFIRMATION PAGE
========================================================= */

const renderApprovalConfirmationPage =
  ({
    requirement,
    token,
    action,
    baseUrl,
    errorMessage = "",
  }) => {
    const isApprove =
      action ===
      "approve";

    const accent =
      isApprove
        ? "#16a34a"
        : "#dc2626";

    const buttonText =
      isApprove
        ? "Confirm Approval"
        : "Confirm Rejection";

    const heading =
      isApprove
        ? "Approve Manpower Request"
        : "Reject Manpower Request";

    const question =
      isApprove
        ? "Are you sure you want to approve this manpower request?"
        : "Are you sure you want to reject this manpower request?";

    const departmentName =
      requirement
        ?.department
        ?.name ||
      requirement
        ?.department
        ?.code ||
      "-";

    const requesterName =
      getDisplayName(
        requirement
          ?.requestedBy
      );

    const actionUrl =
      `${baseUrl}/public/approval/${encodeURIComponent(
        token
      )}/${action}`;

    const content = `
      <style>
        .question-box {
          margin-top: 26px;
          padding: 18px;
          border-radius: 14px;
          border: 1px solid ${
            isApprove
              ? "#bbf7d0"
              : "#fecaca"
          };
          background: ${
            isApprove
              ? "#f0fdf4"
              : "#fef2f2"
          };
          color: ${
            isApprove
              ? "#166534"
              : "#991b1b"
          };
          font-size: 15px;
          line-height: 1.6;
          font-weight: 650;
        }

        .details {
          margin-top: 22px;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
        }

        .detail-row {
          display: grid;
          grid-template-columns: 145px 1fr;
          gap: 14px;
          padding: 13px 16px;
          border-bottom: 1px solid #e2e8f0;
        }

        .detail-row:last-child {
          border-bottom: 0;
        }

        .detail-label {
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
        }

        .detail-value {
          color: #0f172a;
          font-size: 14px;
          font-weight: 650;
          overflow-wrap: anywhere;
        }

        .form {
          margin-top: 24px;
        }

        .label {
          display: block;
          margin-bottom: 9px;
          color: #334155;
          font-size: 14px;
          font-weight: 700;
        }

        .optional {
          color: #94a3b8;
          font-weight: 500;
        }

        textarea {
          width: 100%;
          min-height: 120px;
          resize: vertical;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 13px 14px;
          font: inherit;
          font-size: 14px;
          line-height: 1.5;
          color: #0f172a;
          background: #ffffff;
          outline: none;
        }

        textarea:focus {
          border-color: ${accent};
          box-shadow:
            0 0 0 3px
            ${
              isApprove
                ? "rgba(22, 163, 74, 0.12)"
                : "rgba(220, 38, 38, 0.12)"
            };
        }

        .error {
          margin-bottom: 16px;
          padding: 12px 14px;
          border: 1px solid #fecaca;
          border-radius: 10px;
          background: #fef2f2;
          color: #b91c1c;
          font-size: 13px;
          line-height: 1.5;
        }

        .submit {
          width: 100%;
          margin-top: 18px;
          border: 0;
          border-radius: 12px;
          padding: 14px 18px;
          background: ${accent};
          color: #ffffff;
          font-size: 15px;
          font-weight: 750;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            opacity 0.15s ease;
        }

        .submit:hover {
          opacity: 0.94;
        }

        .submit:active {
          transform: scale(0.99);
        }

        .security-note {
          margin-top: 16px;
          color: #94a3b8;
          font-size: 12px;
          line-height: 1.6;
          text-align: center;
        }

        @media (
          max-width: 540px
        ) {
          .detail-row {
            grid-template-columns: 1fr;
            gap: 5px;
          }
        }
      </style>

      <div class="question-box">
        ${escapeHtml(question)}
      </div>

      <div class="details">
        <div class="detail-row">
          <div class="detail-label">
            Request
          </div>

          <div class="detail-value">
            ${escapeHtml(
              requirement
                ?.requestNumber ||
              "-"
            )}
          </div>
        </div>

        <div class="detail-row">
          <div class="detail-label">
            Department
          </div>

          <div class="detail-value">
            ${escapeHtml(
              departmentName
            )}
          </div>
        </div>

        <div class="detail-row">
          <div class="detail-label">
            Position
          </div>

          <div class="detail-value">
            ${escapeHtml(
              requirement
                ?.positionTitle ||
              "-"
            )}
          </div>
        </div>

        <div class="detail-row">
          <div class="detail-label">
            Openings
          </div>

          <div class="detail-value">
            ${escapeHtml(
              requirement
                ?.numberOfOpenings ??
              "-"
            )}
          </div>
        </div>

        <div class="detail-row">
          <div class="detail-label">
            Requested By
          </div>

          <div class="detail-value">
            ${escapeHtml(
              requesterName
            )}
          </div>
        </div>

        <div class="detail-row">
          <div class="detail-label">
            Priority
          </div>

          <div class="detail-value">
            ${escapeHtml(
              String(
                requirement
                  ?.priority ||
                "NORMAL"
              ).toUpperCase()
            )}
          </div>
        </div>

        <div class="detail-row">
          <div class="detail-label">
            Required By
          </div>

          <div class="detail-value">
            ${escapeHtml(
              formatDate(
                requirement
                  ?.requiredByDate
              )
            )}
          </div>
        </div>
      </div>

      <form
        class="form"
        method="POST"
        action="${escapeHtml(
          actionUrl
        )}"
      >
        ${
          errorMessage
            ? `
              <div class="error">
                ${escapeHtml(
                  errorMessage
                )}
              </div>
            `
            : ""
        }

        ${
          isApprove
            ? `
              <label
                class="label"
                for="remarks"
              >
                Remarks
                <span class="optional">
                  (optional)
                </span>
              </label>

              <textarea
                id="remarks"
                name="remarks"
                maxlength="1000"
                placeholder="Add approval remarks if required..."
              ></textarea>
            `
            : `
              <label
                class="label"
                for="reason"
              >
                Rejection Reason
              </label>

              <textarea
                id="reason"
                name="reason"
                maxlength="1000"
                required
                placeholder="Please enter the reason for rejection..."
              ></textarea>
            `
        }

        <button
          class="submit"
          type="submit"
        >
          ${escapeHtml(
            buttonText
          )}
        </button>

        <div class="security-note">
          This approval link is secure, one-time and expires automatically.
        </div>
      </form>
    `;

    return renderHtmlPage({
      title:
        heading,

      subtitle:
        requirement?.requestNumber
          ? `Request ${requirement.requestNumber}`
          : "",

      content,

      accent,
    });
  };

/* =========================================================
   PUBLIC APPROVAL LINK
========================================================= */

const manpowerApprovalPage =
  async (
    req,
    res
  ) => {
    try {
      const token =
        String(
          req.params
            .token ||
          ""
        ).trim();

      const action =
        String(
          req.query
            .action ||
          ""
        )
          .trim()
          .toLowerCase();

      if (
        ![
          "approve",
          "reject",
        ].includes(
          action
        )
      ) {
        return res
          .status(400)
          .type(
            "html"
          )
          .send(
            renderMessagePage({
              title:
                "Invalid Approval Action",

              message:
                "This manpower approval link does not contain a valid action.",

              type:
                "error",
            })
          );
      }

      if (
        !token
      ) {
        return res
          .status(400)
          .type(
            "html"
          )
          .send(
            renderMessagePage({
              title:
                "Invalid Approval Link",

              message:
                "The approval token is missing.",

              type:
                "error",
            })
          );
      }

      const requirement =
        await manpowerService
          .getRequirementByApprovalToken(
            token
          );

      if (
        !requirement
      ) {
        return res
          .status(404)
          .type(
            "html"
          )
          .send(
            renderMessagePage({
              title:
                "Invalid Approval Link",

              message:
                "This manpower approval link is invalid or no longer exists.",

              type:
                "error",
            })
          );
      }

      if (
        requirement
          ?.whatsappApproval
          ?.usedAt
      ) {
        return res
          .status(200)
          .type(
            "html"
          )
          .send(
            renderMessagePage({
              title:
                "Approval Link Already Used",

              message:
                `This link has already been used. Current request status: ${requirement.status}.`,

              type:
                "warning",

              requirement,
            })
          );
      }

      const expiresAt =
        requirement
          ?.whatsappApproval
          ?.expiresAt;

      if (
        !expiresAt ||
        new Date(
          expiresAt
        ).getTime() <=
          Date.now()
      ) {
        return res
          .status(410)
          .type(
            "html"
          )
          .send(
            renderMessagePage({
              title:
                "Approval Link Expired",

              message:
                "This manpower approval link has expired. Please review the request directly in SE-RMS.",

              type:
                "warning",

              requirement,
            })
          );
      }

      if (
        requirement.status !==
        "PENDING_APPROVAL"
      ) {
        return res
          .status(200)
          .type(
            "html"
          )
          .send(
            renderMessagePage({
              title:
                "Request Already Processed",

              message:
                `This manpower request is already ${String(
                  requirement.status
                )
                  .replace(
                    /_/g,
                    " "
                  )
                  .toLowerCase()}.`,

              type:
                "warning",

              requirement,
            })
          );
      }

      const tokenApprover =
        String(
          requirement
            ?.whatsappApproval
            ?.approver
            ?._id ||
          requirement
            ?.whatsappApproval
            ?.approver ||
          ""
        );

      const currentApprover =
        String(
          requirement
            ?.currentApprover
            ?._id ||
          requirement
            ?.currentApprover ||
          ""
        );

      if (
        !tokenApprover ||
        !currentApprover ||
        tokenApprover !==
          currentApprover
      ) {
        return res
          .status(403)
          .type(
            "html"
          )
          .send(
            renderMessagePage({
              title:
                "Approval Link No Longer Valid",

              message:
                "This approval link is no longer assigned to the current approver.",

              type:
                "error",

              requirement,
            })
          );
      }

      return res
        .status(200)
        .type(
          "html"
        )
        .send(
          renderApprovalConfirmationPage({
            requirement,

            token,

            action,

            baseUrl:
              req.baseUrl,
          })
        );
    } catch (
      error
    ) {
      console.error(
        "[MPR][PUBLIC_APPROVAL_PAGE]",
        error
      );

      return res
        .status(
          getErrorStatus(
            error
          )
        )
        .type(
          "html"
        )
        .send(
          renderMessagePage({
            title:
              "Unable to Open Approval",

            message:
              getSafeErrorMessage(
                error
              ),

            type:
              "error",
          })
        );
    }
  };

/* =========================================================
   PROCESS PUBLIC APPROVAL
========================================================= */

const processManpowerApproval =
  async (
    req,
    res
  ) => {
    const token =
      String(
        req.params
          .token ||
        ""
      ).trim();

    const action =
      String(
        req.params
          .action ||
        ""
      )
        .trim()
        .toLowerCase();

    try {
      if (
        ![
          "approve",
          "reject",
        ].includes(
          action
        )
      ) {
        return res
          .status(400)
          .type(
            "html"
          )
          .send(
            renderMessagePage({
              title:
                "Invalid Approval Action",

              message:
                "The requested approval action is invalid.",

              type:
                "error",
            })
          );
      }

      if (
        !token
      ) {
        return res
          .status(400)
          .type(
            "html"
          )
          .send(
            renderMessagePage({
              title:
                "Invalid Approval Link",

              message:
                "The approval token is missing.",

              type:
                "error",
            })
          );
      }

      const remarks =
        String(
          req.body
            ?.remarks ||
          ""
        ).trim();

      const reason =
        String(
          req.body
            ?.reason ||
          ""
        ).trim();

      if (
        action ===
          "reject" &&
        !reason
      ) {
        const requirement =
          await manpowerService
            .getRequirementByApprovalToken(
              token
            );

        if (
          !requirement
        ) {
          return res
            .status(404)
            .type(
              "html"
            )
            .send(
              renderMessagePage({
                title:
                  "Invalid Approval Link",

                message:
                  "This manpower approval link is invalid or no longer exists.",

                type:
                  "error",
              })
            );
        }

        return res
          .status(400)
          .type(
            "html"
          )
          .send(
            renderApprovalConfirmationPage({
              requirement,

              token,

              action,

              baseUrl:
                req.baseUrl,

              errorMessage:
                "Rejection reason is required.",
            })
          );
      }

      const result =
        await manpowerService
          .processWhatsAppApproval({
            token,

            action,

            remarks,

            reason,
          });

      const approved =
        result.action ===
        "APPROVED";

      return res
        .status(200)
        .type(
          "html"
        )
        .send(
          renderMessagePage({
            title:
              approved
                ? "Manpower Request Approved"
                : "Manpower Request Rejected",

            message:
              approved
                ? "The manpower request has been approved successfully. The requester has been notified."
                : "The manpower request has been rejected successfully. The requester has been notified.",

            type:
              "success",

            requirement:
              result.requirement,
          })
        );
    } catch (
      error
    ) {
      console.error(
        "[MPR][PUBLIC_APPROVAL_PROCESS]",
        error
      );

      const status =
        getErrorStatus(
          error
        );

      let title =
        "Unable to Process Request";

      let type =
        "error";

      if (
        status ===
        409
      ) {
        title =
          "Request Already Processed";

        type =
          "warning";
      }

      if (
        status ===
        410
      ) {
        title =
          "Approval Link Expired";

        type =
          "warning";
      }

      return res
        .status(
          status
        )
        .type(
          "html"
        )
        .send(
          renderMessagePage({
            title,

            message:
              getSafeErrorMessage(
                error
              ),

            type,
          })
        );
    }
  };

/* =========================================================
   CREATE
========================================================= */

const createRequirement =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const input =
        validateCreateManpower(
          req.body
        );

      const requirement =
        await manpowerService
          .createRequirement({
            user:
              req.user,

            input,
          });

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "Manpower requirement submitted successfully",

          data: {
            requirement,
          },
        });
    }
  );

/* =========================================================
   LIST
========================================================= */

const listRequirements =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const requirements =
        await manpowerService
          .listRequirements({
            user:
              req.user,

            status:
              req.query
                .status,

            departmentId:
              req.query
                .departmentId,

            search:
              req.query
                .search,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            requirements,

            total:
              requirements.length,
          },
        });
    }
  );

/* =========================================================
   DETAILS
========================================================= */

const getRequirement =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const requirement =
        await manpowerService
          .getRequirementById(
            req.params
              .requirementId,

            req.user
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            requirement,
          },
        });
    }
  );

/* =========================================================
   APPROVAL INBOX
========================================================= */

const getApprovalInbox =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const requirements =
        await manpowerService
          .getApprovalInbox(
            req.user
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            requirements,

            total:
              requirements.length,
          },
        });
    }
  );

/* =========================================================
   APPROVE
========================================================= */

const approveRequirement =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const input =
        validateApproval(
          req.body
        );

      const requirement =
        await manpowerService
          .approveRequirement({
            requirementId:
              req.params
                .requirementId,

            user:
              req.user,

            remarks:
              input.remarks,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Manpower requirement approved successfully",

          data: {
            requirement,
          },
        });
    }
  );

/* =========================================================
   REJECT
========================================================= */

const rejectRequirement =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const input =
        validateRejection(
          req.body
        );

      const requirement =
        await manpowerService
          .rejectRequirement({
            requirementId:
              req.params
                .requirementId,

            user:
              req.user,

            reason:
              input.reason,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Manpower requirement rejected",

          data: {
            requirement,
          },
        });
    }
  );

/* =========================================================
   HR QUEUE
========================================================= */

const getHrQueue =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const requirements =
        await manpowerService
          .getHrQueue(
            req.user
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            requirements,

            total:
              requirements.length,
          },
        });
    }
  );

/* =========================================================
   HR EMPLOYEES
========================================================= */

const getHrEmployees =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const employees =
        await manpowerService
          .getAvailableHrEmployees(
            req.user
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            employees,

            total:
              employees.length,
          },
        });
    }
  );

/* =========================================================
   ASSIGN / REASSIGN HR OWNER
========================================================= */

const assignHr =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const input =
        validateAssignHr(
          req.body
        );

      const requirement =
        await manpowerService
          .assignHrToRequirement({
            requirementId:
              req.params
                .requirementId,

            hrUserId:
              input.hrUserId,

            user:
              req.user,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Hiring owner assigned successfully",

          data: {
            requirement,
          },
        });
    }
  );

/* =========================================================
   MY HIRING
========================================================= */

const getMyHiring =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const requirements =
        await manpowerService
          .getMyHiring({
            user:
              req.user,

            status:
              req.query
                .status,

            search:
              req.query
                .search,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            requirements,

            total:
              requirements.length,
          },
        });
    }
  );

/* =========================================================
   START HIRING
========================================================= */

const startHiring =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const requirement =
        await manpowerService
          .startHiring({
            requirementId:
              req.params
                .requirementId,

            user:
              req.user,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Hiring process started",

          data: {
            requirement,
          },
        });
    }
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  /* PUBLIC WHATSAPP APPROVAL */

  manpowerApprovalPage,

  processManpowerApproval,

  /* AUTHENTICATED API */

  createRequirement,

  listRequirements,

  getRequirement,

  getApprovalInbox,

  approveRequirement,

  rejectRequirement,

  getHrQueue,

  getHrEmployees,

  assignHr,

  getMyHiring,

  startHiring,
};
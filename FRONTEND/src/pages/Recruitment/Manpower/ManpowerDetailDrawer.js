import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  approveManpowerRequirement,
  getManpowerRequirement,
  rejectManpowerRequirement,
} from "../../../services/manpowerService";

import RecruitmentStatusBadge from "../components/RecruitmentStatusBadge";

import {
  formatRecruitmentDate,
  formatRecruitmentDateTime,
  getApiErrorMessage,
  getManpowerStatusMeta,
  getPriorityMeta,
  safeText,
} from "../utils/recruitmentHelpers";

/* =========================================================
   MONEY
========================================================= */

const formatBudget = (
  requirement
) => {
  const min =
    requirement?.budgetMin;

  const max =
    requirement?.budgetMax;

  const currency =
    requirement?.currency ||
    "INR";

  if (
    min === undefined &&
    max === undefined
  ) {
    return "Not specified";
  }

  try {
    const formatter =
      new Intl.NumberFormat(
        currency === "INR"
          ? "en-IN"
          : "en-US",
        {
          style:
            "currency",

          currency,

          maximumFractionDigits:
            0,
        }
      );

    if (
      min !== null &&
      min !== undefined &&
      max !== null &&
      max !== undefined
    ) {
      return `${formatter.format(
        Number(
          min
        )
      )} – ${formatter.format(
        Number(
          max
        )
      )} / year`;
    }

    const value =
      min ??
      max;

    return `${formatter.format(
      Number(
        value ||
        0
      )
    )} / year`;
  } catch (
    error
  ) {
    return `${currency} ${
      min ??
      max ??
      0
    }`;
  }
};

/* =========================================================
   MONTHLY SALARY
========================================================= */

const formatMonthlySalary = (
  requirement
) => {
  const explicitMin =
    requirement
      ?.monthlySalaryMin;

  const explicitMax =
    requirement
      ?.monthlySalaryMax;

  const min =
    explicitMin !==
      undefined &&
    explicitMin !==
      null
      ? explicitMin
      : requirement
          ?.budgetMin !==
          undefined &&
        requirement
          ?.budgetMin !==
          null
        ? Number(
            requirement
              .budgetMin
          ) /
          12
        : null;

  const max =
    explicitMax !==
      undefined &&
    explicitMax !==
      null
      ? explicitMax
      : requirement
          ?.budgetMax !==
          undefined &&
        requirement
          ?.budgetMax !==
          null
        ? Number(
            requirement
              .budgetMax
          ) /
          12
        : null;

  if (
    min === null &&
    max === null
  ) {
    return "Not specified";
  }

  const formatter =
    new Intl.NumberFormat(
      "en-IN",
      {
        style:
          "currency",

        currency:
          requirement
            ?.currency ||
          "INR",

        maximumFractionDigits:
          0,
      }
    );

  if (
    min !== null &&
    max !== null
  ) {
    return `${formatter.format(
      Number(
        min
      )
    )} – ${formatter.format(
      Number(
        max
      )
    )} / month`;
  }

  return `${formatter.format(
    Number(
      min ??
      max ??
      0
    )
  )} / month`;
};

/* =========================================================
   EXPERIENCE
========================================================= */

const formatExperience = (
  requirement
) => {
  const min =
    requirement
      ?.minimumExperienceYears;

  const max =
    requirement
      ?.maximumExperienceYears;

  if (
    min === undefined &&
    max === undefined
  ) {
    return "Not specified";
  }

  if (
    min !== undefined &&
    min !== null &&
    max !== undefined &&
    max !== null
  ) {
    if (
      Number(
        min
      ) ===
      Number(
        max
      )
    ) {
      return `${Number(
        min
      )} Years`;
    }

    return `${Number(
      min
    )} – ${Number(
      max
    )} Years`;
  }

  return `${
    Number(
      min ??
      max ??
      0
    )
  } Years`;
};

/* =========================================================
   TEXT FORMATTER
========================================================= */

const formatEnumText = (
  value,
  fallback = "—"
) => {
  const text =
    String(
      value ||
      ""
    )
      .trim()
      .replaceAll(
        "_",
        " "
      );

  if (
    !text
  ) {
    return fallback;
  }

  return text
    .toLowerCase()
    .replace(
      /\b\w/g,
      (
        character
      ) =>
        character
          .toUpperCase()
    );
};

/* =========================================================
   API ACTION ERROR
========================================================= */

const getFriendlyActionError = (
  error,
  action
) => {
  const status =
    Number(
      error?.response
        ?.status ||
      0
    );

  const backendMessage =
    String(
      error?.response
        ?.data
        ?.message ||
      ""
    ).trim();

  if (
    backendMessage &&
    !backendMessage
      .toLowerCase()
      .includes(
        "unexpected token"
      ) &&
    !backendMessage
      .toLowerCase()
      .includes(
        "valid json"
      )
  ) {
    return backendMessage;
  }

  if (
    status ===
    403
  ) {
    return action ===
      "approve"
      ? "You are not authorized to approve this manpower request."
      : "You are not authorized to reject this manpower request.";
  }

  if (
    status ===
    404
  ) {
    return "This manpower request could not be found.";
  }

  if (
    status ===
    409
  ) {
    return "This manpower request has already been processed.";
  }

  if (
    status ===
    400
  ) {
    return action ===
      "approve"
      ? "This manpower request could not be approved."
      : "This manpower request could not be rejected.";
  }

  if (
    status >=
    500
  ) {
    return "SE-RMS could not complete this action right now. Please try again.";
  }

  return getApiErrorMessage(
    error,
    action ===
      "approve"
      ? "The manpower request could not be approved."
      : "The manpower request could not be rejected."
  );
};

/* =========================================================
   COMPONENT
========================================================= */

const ManpowerDetailDrawer = ({
  requirementId,

  open,

  canApprove = false,

  onClose,

  onChanged,
}) => {
  /* =====================================================
     DATA
  ===================================================== */

  const [
    requirement,
    setRequirement,
  ] = useState(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(
    false
  );

  const [
    actionLoading,
    setActionLoading,
  ] = useState(
    ""
  );

  const [
    error,
    setError,
  ] = useState(
    ""
  );

  const [
    actionMessage,
    setActionMessage,
  ] = useState(
    null
  );

  const [
    confirmAction,
    setConfirmAction,
  ] = useState(
    ""
  );

  const [
    approvalRemarks,
    setApprovalRemarks,
  ] = useState(
    ""
  );

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState(
    ""
  );

  const [
    rejectionError,
    setRejectionError,
  ] = useState(
    ""
  );

  /* =====================================================
     RESET
  ===================================================== */

  useEffect(() => {
    if (
      !open
    ) {
      return;
    }

    setRequirement(
      null
    );

    setError(
      ""
    );

    setActionMessage(
      null
    );

    setConfirmAction(
      ""
    );

    setApprovalRemarks(
      ""
    );

    setRejectionReason(
      ""
    );

    setRejectionError(
      ""
    );

    setActionLoading(
      ""
    );
  }, [
    open,
    requirementId,
  ]);

  /* =====================================================
     BODY SCROLL LOCK
  ===================================================== */

  useEffect(() => {
    if (
      !open
    ) {
      return undefined;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style
      .overflow =
      "hidden";

    return () => {
      document.body.style
        .overflow =
        previousOverflow;
    };
  }, [
    open,
  ]);

  /* =====================================================
     LOAD REQUIREMENT
  ===================================================== */

  useEffect(() => {
    if (
      !open ||
      !requirementId
    ) {
      return;
    }

    let active =
      true;

    const load =
      async () => {
        try {
          setLoading(
            true
          );

          setError(
            ""
          );

          const data =
            await getManpowerRequirement(
              requirementId
            );

          if (
            active
          ) {
            setRequirement(
              data
            );
          }
        } catch (
          loadError
        ) {
          if (
            active
          ) {
            setError(
              getApiErrorMessage(
                loadError,
                "Requirement could not be loaded."
              )
            );
          }
        } finally {
          if (
            active
          ) {
            setLoading(
              false
            );
          }
        }
      };

    load();

    return () => {
      active =
        false;
    };
  }, [
    open,
    requirementId,
  ]);

  /* =====================================================
     ESCAPE
  ===================================================== */

  useEffect(() => {
    if (
      !open
    ) {
      return undefined;
    }

    const handleKeyDown =
      (
        event
      ) => {
        if (
          event.key !==
          "Escape"
        ) {
          return;
        }

        if (
          actionLoading
        ) {
          return;
        }

        if (
          confirmAction
        ) {
          setConfirmAction(
            ""
          );

          setRejectionError(
            ""
          );

          return;
        }

        onClose?.();
      };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    open,
    actionLoading,
    confirmAction,
    onClose,
  ]);

  /* =====================================================
     META
  ===================================================== */

  const status =
    getManpowerStatusMeta(
      requirement
        ?.status
    );

  const priority =
    getPriorityMeta(
      requirement
        ?.priority
    );

  const skills =
    Array.isArray(
      requirement
        ?.requiredSkills
    )
      ? requirement
          .requiredSkills
          .filter(
            Boolean
          )
      : [];

  const history =
    useMemo(
      () =>
        Array.isArray(
          requirement
            ?.approvalHistory
        )
          ? [
              ...requirement
                .approvalHistory,
            ].sort(
              (
                a,
                b
              ) =>
                new Date(
                  b?.actionAt ||
                  0
                ).getTime() -
                new Date(
                  a?.actionAt ||
                  0
                ).getTime()
            )
          : [],
      [
        requirement,
      ]
    );

  const showApprovalActions =
    Boolean(
      canApprove &&
      requirement
        ?.status ===
        "PENDING_APPROVAL"
    );

  /* =====================================================
     PEOPLE
  ===================================================== */

  const requester =
    requirement
      ?.requestedBy ||
    null;

  const approvalPerson =
    requirement
      ?.status ===
      "APPROVED"
      ? requirement
          ?.approvedBy ||
        requirement
          ?.currentApprover
      : requirement
          ?.status ===
          "REJECTED"
        ? requirement
            ?.rejectedBy ||
          requirement
            ?.currentApprover
        : requirement
            ?.currentApprover ||
          null;

  const approvalPersonLabel =
    requirement
      ?.status ===
      "APPROVED"
      ? "Approved By"
      : requirement
          ?.status ===
          "REJECTED"
        ? "Rejected By"
        : "Current Approver";

  /* =====================================================
     CLOSE
  ===================================================== */

  const handleClose =
    () => {
      if (
        actionLoading ||
        confirmAction
      ) {
        return;
      }

      onClose?.();
    };

  /* =====================================================
     CONFIRMATIONS
  ===================================================== */

  const openApproveConfirmation =
    () => {
      if (
        actionLoading
      ) {
        return;
      }

      setActionMessage(
        null
      );

      setRejectionError(
        ""
      );

      setConfirmAction(
        "APPROVE"
      );
    };

  const openRejectConfirmation =
    () => {
      if (
        actionLoading
      ) {
        return;
      }

      setActionMessage(
        null
      );

      setRejectionError(
        ""
      );

      setConfirmAction(
        "REJECT"
      );
    };

  const closeConfirmation =
    () => {
      if (
        actionLoading
      ) {
        return;
      }

      setConfirmAction(
        ""
      );

      setRejectionError(
        ""
      );
    };

  /* =====================================================
     APPROVE
  ===================================================== */

  const handleApprove =
    async () => {
      if (
        !requirementId ||
        actionLoading
      ) {
        return;
      }

      try {
        setActionLoading(
          "APPROVE"
        );

        setError(
          ""
        );

        setActionMessage(
          null
        );

        const updated =
          await approveManpowerRequirement(
            requirementId,
            {
              remarks:
                String(
                  approvalRemarks ||
                  ""
                ).trim(),
            }
          );

        setRequirement(
          updated
        );

        setConfirmAction(
          ""
        );

        setApprovalRemarks(
          ""
        );

        setActionMessage({
          type:
            "success",

          title:
            "Request approved",

          message:
            `${
              updated
                ?.requestNumber ||
              requirement
                ?.requestNumber ||
              "Request"
            } approved successfully.`,
        });

        if (
          typeof onChanged ===
          "function"
        ) {
          await onChanged(
            updated
          );
        }
      } catch (
        actionError
      ) {
        setConfirmAction(
          ""
        );

        setActionMessage({
          type:
            "error",

          title:
            "Approval failed",

          message:
            getFriendlyActionError(
              actionError,
              "approve"
            ),
        });
      } finally {
        setActionLoading(
          ""
        );
      }
    };

  /* =====================================================
     REJECT
  ===================================================== */

  const handleReject =
    async () => {
      if (
        !requirementId ||
        actionLoading
      ) {
        return;
      }

      const reason =
        String(
          rejectionReason ||
          ""
        ).trim();

      if (
        !reason
      ) {
        setRejectionError(
          "Rejection reason is required."
        );

        return;
      }

      try {
        setActionLoading(
          "REJECT"
        );

        setError(
          ""
        );

        setActionMessage(
          null
        );

        setRejectionError(
          ""
        );

        const updated =
          await rejectManpowerRequirement(
            requirementId,
            {
              reason,
            }
          );

        setRequirement(
          updated
        );

        setConfirmAction(
          ""
        );

        setRejectionReason(
          ""
        );

        setActionMessage({
          type:
            "success",

          title:
            "Request rejected",

          message:
            `${
              updated
                ?.requestNumber ||
              requirement
                ?.requestNumber ||
              "Request"
            } rejected.`,
        });

        if (
          typeof onChanged ===
          "function"
        ) {
          await onChanged(
            updated
          );
        }
      } catch (
        actionError
      ) {
        setConfirmAction(
          ""
        );

        setActionMessage({
          type:
            "error",

          title:
            "Rejection failed",

          message:
            getFriendlyActionError(
              actionError,
              "reject"
            ),
        });
      } finally {
        setActionLoading(
          ""
        );
      }
    };

  /* =====================================================
     CLOSED
  ===================================================== */

  if (
    !open
  ) {
    return null;
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <>
      {/* =================================================
          MAIN DETAIL POPUP
      ================================================== */}

      <div
        className="se-mpr-detail-modal-overlay"
        onMouseDown={
          handleClose
        }
      >
        <section
          className="se-mpr-detail-modal"
          onMouseDown={(
            event
          ) =>
            event.stopPropagation()
          }
          role="dialog"
          aria-modal="true"
          aria-labelledby="se-mpr-detail-modal-title"
          aria-busy={
            Boolean(
              actionLoading
            )
          }
        >
          {/* =================================================
              LOADING
          ================================================== */}

          {loading ? (
            <div className="se-mpr-detail-modal-loading">
              <div className="se-mpr-detail-loading">
                <span />

                <span />

                <span />

                <span />
              </div>
            </div>
          ) : requirement ? (
            <>
              {/* =================================================
                  HEADER
              ================================================== */}

              <header className="se-mpr-detail-modal-header">
                <div className="se-mpr-detail-modal-heading">
                  <div className="se-mpr-detail-modal-eyebrow">
                    {safeText(
                      requirement
                        ?.requestNumber,
                      "MANPOWER REQUEST"
                    )}
                  </div>

                  <div className="se-mpr-detail-modal-title-row">
                    <h2 id="se-mpr-detail-modal-title">
                      {safeText(
                        requirement
                          ?.positionTitle,
                        "Manpower Requirement"
                      )}
                    </h2>

                    <div className="se-mpr-detail-badges">
                      <RecruitmentStatusBadge
                        label={
                          status.label
                        }
                        tone={
                          status.tone
                        }
                      />

                      <RecruitmentStatusBadge
                        label={
                          priority.label
                        }
                        tone={
                          priority.tone
                        }
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="se-mpr-detail-modal-close"
                  onClick={
                    handleClose
                  }
                  disabled={
                    Boolean(
                      actionLoading
                    )
                  }
                  aria-label="Close manpower request"
                >
                  ×
                </button>
              </header>

              {/* =================================================
                  ACTION MESSAGE
              ================================================== */}

              {actionMessage ? (
                <div
                  className={`se-mpr-action-message ${actionMessage.type}`}
                  role={
                    actionMessage
                      .type ===
                    "error"
                      ? "alert"
                      : "status"
                  }
                >
                  <span className="se-mpr-action-message-icon">
                    {actionMessage
                      .type ===
                    "success"
                      ? "✓"
                      : "!"}
                  </span>

                  <div>
                    <strong>
                      {
                        actionMessage
                          .title
                      }
                    </strong>

                    <p>
                      {
                        actionMessage
                          .message
                      }
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setActionMessage(
                        null
                      )
                    }
                    aria-label="Dismiss message"
                  >
                    ×
                  </button>
                </div>
              ) : null}

              {/* =================================================
                  ERROR
              ================================================== */}

              {error ? (
                <div className="se-mpr-form-error">
                  <span>
                    !
                  </span>

                  <div>
                    <strong>
                      Unable to load request
                    </strong>

                    <p>
                      {
                        error
                      }
                    </p>
                  </div>
                </div>
              ) : null}

              {/* =================================================
                  BODY
              ================================================== */}

              <div className="se-mpr-detail-modal-body">
                {/* ===============================================
                    LEFT CONTENT
                ================================================ */}

                <main className="se-mpr-detail-modal-main">
                  {/* =============================================
                      PRIMARY SUMMARY
                  ============================================== */}

                  <section className="se-mpr-popup-summary-grid">
                    <div className="se-mpr-popup-summary-card">
                      <span>
                        OPENINGS
                      </span>

                      <strong>
                        {Number(
                          requirement
                            ?.numberOfOpenings ||
                          0
                        )}
                      </strong>
                    </div>

                    <div className="se-mpr-popup-summary-card">
                      <span>
                        DEPARTMENT
                      </span>

                      <strong>
                        {safeText(
                          requirement
                            ?.department
                            ?.name,
                          "—"
                        )}
                      </strong>
                    </div>

                    <div className="se-mpr-popup-summary-card">
                      <span>
                        REQUIRED BY
                      </span>

                      <strong>
                        {formatRecruitmentDate(
                          requirement
                            ?.requiredByDate
                        )}
                      </strong>
                    </div>

                    <div className="se-mpr-popup-summary-card">
                      <span>
                        LOCATION
                      </span>

                      <strong>
                        {safeText(
                          requirement
                            ?.office
                            ?.name ||
                          requirement
                            ?.location,
                          "—"
                        )}
                      </strong>
                    </div>
                  </section>

                  {/* =============================================
                      HIRING DETAILS
                  ============================================== */}

                  <section className="se-mpr-popup-section">
                    <div className="se-mpr-popup-section-title">
                      <span>
                        REQUIREMENT
                      </span>

                      <h3>
                        Hiring Details
                      </h3>
                    </div>

                    <div className="se-mpr-popup-info-grid">
                      <div>
                        <span>
                          Employment Type
                        </span>

                        <strong>
                          {formatEnumText(
                            requirement
                              ?.employmentType
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Experience
                        </span>

                        <strong>
                          {formatExperience(
                            requirement
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Shift
                        </span>

                        <strong>
                          {formatEnumText(
                            requirement
                              ?.shiftAvailability,
                            "Not specified"
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Requested On
                        </span>

                        <strong>
                          {formatRecruitmentDate(
                            requirement
                              ?.createdAt
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Monthly Salary
                        </span>

                        <strong>
                          {formatMonthlySalary(
                            requirement
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Annual Package
                        </span>

                        <strong>
                          {formatBudget(
                            requirement
                          )}
                        </strong>
                      </div>
                    </div>
                  </section>

                  {/* =============================================
                      SKILLS + BUSINESS REASON
                  ============================================== */}

                  <div className="se-mpr-popup-two-column">
                    <section className="se-mpr-popup-section">
                      <div className="se-mpr-popup-section-title">
                        <span>
                          ROLE PROFILE
                        </span>

                        <h3>
                          Required Skills
                        </h3>
                      </div>

                      {skills.length >
                      0 ? (
                        <div className="se-mpr-detail-skills">
                          {skills.map(
                            (
                              skill,
                              index
                            ) => (
                              <span
                                key={`${skill}-${index}`}
                              >
                                {
                                  skill
                                }
                              </span>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="se-mpr-detail-empty-text">
                          No skills specified.
                        </p>
                      )}
                    </section>

                    <section className="se-mpr-popup-section">
                      <div className="se-mpr-popup-section-title">
                        <span>
                          BUSINESS NEED
                        </span>

                        <h3>
                          Reason for Hiring
                        </h3>
                      </div>

                      <div className="se-mpr-reason-card">
                        <p>
                          {safeText(
                            requirement
                              ?.reason,
                            "No reason provided."
                          )}
                        </p>
                      </div>
                    </section>
                  </div>

                  {/* =============================================
                      OWNERSHIP
                  ============================================== */}

                  <section className="se-mpr-popup-section">
                    <div className="se-mpr-popup-section-title">
                      <span>
                        OWNERSHIP
                      </span>

                      <h3>
                        Request & Approval
                      </h3>
                    </div>

                    <div className="se-mpr-owner-grid">
                      <div>
                        <span className="se-mpr-owner-avatar requester">
                          {safeText(
                            requester
                              ?.displayName,
                            "R"
                          )
                            .charAt(
                              0
                            )
                            .toUpperCase()}
                        </span>

                        <span>
                          <small>
                            REQUESTED BY
                          </small>

                          <strong>
                            {safeText(
                              requester
                                ?.displayName,
                              "Unknown"
                            )}
                          </strong>

                          {requester
                            ?.email ? (
                            <p>
                              {
                                requester
                                  .email
                              }
                            </p>
                          ) : null}
                        </span>
                      </div>

                      <div>
                        <span className="se-mpr-owner-avatar approver">
                          {safeText(
                            approvalPerson
                              ?.displayName,
                            "A"
                          )
                            .charAt(
                              0
                            )
                            .toUpperCase()}
                        </span>

                        <span>
                          <small>
                            {
                              approvalPersonLabel
                            }
                          </small>

                          <strong>
                            {safeText(
                              approvalPerson
                                ?.displayName,
                              "Not assigned"
                            )}
                          </strong>

                          <p>
                            {safeText(
                              requirement
                                ?.approvalDepartment
                                ?.name,
                              ""
                            )}
                          </p>
                        </span>
                      </div>
                    </div>
                  </section>

                  {/* =============================================
                      REJECTION REASON
                  ============================================== */}

                  {requirement
                    ?.status ===
                    "REJECTED" &&
                  requirement
                    ?.rejectionReason ? (
                    <section className="se-mpr-rejected-box">
                      <span>
                        REJECTION REASON
                      </span>

                      <p>
                        {
                          requirement
                            .rejectionReason
                        }
                      </p>
                    </section>
                  ) : null}
                </main>

                {/* ===============================================
                    RIGHT COLUMN
                ================================================ */}

                <aside className="se-mpr-detail-modal-side">
                  {/* =============================================
                      APPROVAL ACTIONS
                  ============================================== */}

                  {showApprovalActions ? (
                    <section className="se-mpr-popup-action-card">
                      <div className="se-mpr-popup-action-head">
                        <span>
                          ACTION REQUIRED
                        </span>

                        <h3>
                          Review Request
                        </h3>
                      </div>

                      <div className="se-mpr-popup-action-request">
                        <strong>
                          {safeText(
                            requirement
                              ?.positionTitle,
                            "Manpower Request"
                          )}
                        </strong>

                        <span>
                          {Number(
                            requirement
                              ?.numberOfOpenings ||
                            0
                          )}{" "}
                          Opening
                          {Number(
                            requirement
                              ?.numberOfOpenings ||
                            0
                          ) ===
                          1
                            ? ""
                            : "s"}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="se-mpr-popup-approve-btn"
                        onClick={
                          openApproveConfirmation
                        }
                        disabled={
                          Boolean(
                            actionLoading
                          )
                        }
                      >
                        <span>
                          ✓
                        </span>

                        Approve Request
                      </button>

                      <button
                        type="button"
                        className="se-mpr-popup-reject-btn"
                        onClick={
                          openRejectConfirmation
                        }
                        disabled={
                          Boolean(
                            actionLoading
                          )
                        }
                      >
                        <span>
                          ×
                        </span>

                        Reject Request
                      </button>
                    </section>
                  ) : (
                    <section className="se-mpr-popup-status-card">
                      <span>
                        STATUS
                      </span>

                      <div>
                        <RecruitmentStatusBadge
                          label={
                            status.label
                          }
                          tone={
                            status.tone
                          }
                        />
                      </div>
                    </section>
                  )}

                  {/* =============================================
                      AUDIT HISTORY
                  ============================================== */}

                  <section className="se-mpr-popup-history-card">
                    <div className="se-mpr-popup-section-title">
                      <span>
                        AUDIT TRAIL
                      </span>

                      <h3>
                        Approval History
                      </h3>
                    </div>

                    {history.length >
                    0 ? (
                      <div className="se-mpr-history">
                        {history.map(
                          (
                            item,
                            index
                          ) => (
                            <div
                              key={
                                item
                                  ?._id ||
                                `${item?.action}-${index}`
                              }
                              className="se-mpr-history-item"
                            >
                              <div className="se-mpr-history-track">
                                <span
                                  className={[
                                    "se-mpr-history-dot",

                                    String(
                                      item
                                        ?.action ||
                                      ""
                                    ).toLowerCase(),
                                  ].join(
                                    " "
                                  )}
                                />

                                {index <
                                history.length -
                                  1 ? (
                                  <i />
                                ) : null}
                              </div>

                              <div className="se-mpr-history-content">
                                <div>
                                  <strong>
                                    {formatEnumText(
                                      item
                                        ?.action,
                                      "Update"
                                    )}
                                  </strong>

                                  <span>
                                    {formatRecruitmentDateTime(
                                      item
                                        ?.actionAt
                                    )}
                                  </span>
                                </div>

                                <p>
                                  {safeText(
                                    item
                                      ?.actor
                                      ?.displayName,
                                    "System"
                                  )}
                                </p>

                                {item
                                  ?.remarks ? (
                                  <blockquote>
                                    {
                                      item
                                        .remarks
                                    }
                                  </blockquote>
                                ) : null}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="se-mpr-detail-empty-text">
                        No approval history.
                      </p>
                    )}
                  </section>
                </aside>
              </div>
            </>
          ) : (
            <div className="se-mpr-detail-error">
              <span>
                !
              </span>

              <strong>
                Requirement unavailable
              </strong>

              <p>
                {error ||
                  "The requirement could not be loaded."}
              </p>

              <button
                type="button"
                onClick={
                  onClose
                }
              >
                Close
              </button>
            </div>
          )}
        </section>
      </div>

      {/* =================================================
          APPROVE CONFIRMATION
      ================================================== */}

      {confirmAction ===
      "APPROVE" ? (
        <div
          className="se-mpr-confirm-overlay"
          onMouseDown={
            closeConfirmation
          }
        >
          <section
            className="se-mpr-confirm-modal approve"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="se-mpr-confirm-approve-title"
          >
            <div className="se-mpr-confirm-icon approve">
              ✓
            </div>

            <div className="se-mpr-confirm-heading">
              <span>
                APPROVAL
              </span>

              <h3 id="se-mpr-confirm-approve-title">
                Approve Request?
              </h3>

              <p>
                <strong>
                  {safeText(
                    requirement
                      ?.requestNumber,
                    "Request"
                  )}
                </strong>

                {" · "}

                {safeText(
                  requirement
                    ?.positionTitle,
                  "Manpower Requirement"
                )}
              </p>
            </div>

            <div className="se-mpr-confirm-summary">
              <div>
                <span>
                  Department
                </span>

                <strong>
                  {safeText(
                    requirement
                      ?.department
                      ?.name,
                    "—"
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Openings
                </span>

                <strong>
                  {Number(
                    requirement
                      ?.numberOfOpenings ||
                    0
                  )}
                </strong>
              </div>
            </div>

            <label className="se-mpr-confirm-field">
              <span>
                Remarks

                <small>
                  Optional
                </small>
              </span>

              <textarea
                value={
                  approvalRemarks
                }
                disabled={
                  Boolean(
                    actionLoading
                  )
                }
                onChange={(
                  event
                ) =>
                  setApprovalRemarks(
                    event
                      .target
                      .value
                  )
                }
                placeholder="Approval remarks..."
              />
            </label>

            <footer className="se-mpr-confirm-actions">
              <button
                type="button"
                className="cancel"
                onClick={
                  closeConfirmation
                }
                disabled={
                  Boolean(
                    actionLoading
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="confirm-approve"
                onClick={
                  handleApprove
                }
                disabled={
                  Boolean(
                    actionLoading
                  )
                }
              >
                {actionLoading ===
                "APPROVE" ? (
                  <>
                    <span className="se-mpr-confirm-spinner" />

                    Approving...
                  </>
                ) : (
                  <>
                    Approve Request

                    <span>
                      ✓
                    </span>
                  </>
                )}
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {/* =================================================
          REJECT CONFIRMATION
      ================================================== */}

      {confirmAction ===
      "REJECT" ? (
        <div
          className="se-mpr-confirm-overlay"
          onMouseDown={
            closeConfirmation
          }
        >
          <section
            className="se-mpr-confirm-modal reject"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="se-mpr-confirm-reject-title"
          >
            <div className="se-mpr-confirm-icon reject">
              !
            </div>

            <div className="se-mpr-confirm-heading">
              <span>
                REJECTION
              </span>

              <h3 id="se-mpr-confirm-reject-title">
                Reject Request?
              </h3>

              <p>
                <strong>
                  {safeText(
                    requirement
                      ?.requestNumber,
                    "Request"
                  )}
                </strong>

                {" · "}

                {safeText(
                  requirement
                    ?.positionTitle,
                  "Manpower Requirement"
                )}
              </p>
            </div>

            <div className="se-mpr-confirm-summary">
              <div>
                <span>
                  Department
                </span>

                <strong>
                  {safeText(
                    requirement
                      ?.department
                      ?.name,
                    "—"
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Openings
                </span>

                <strong>
                  {Number(
                    requirement
                      ?.numberOfOpenings ||
                    0
                  )}
                </strong>
              </div>
            </div>

            <label className="se-mpr-confirm-field">
              <span>
                Rejection Reason *
              </span>

              <textarea
                autoFocus
                value={
                  rejectionReason
                }
                disabled={
                  Boolean(
                    actionLoading
                  )
                }
                className={
                  rejectionError
                    ? "invalid"
                    : ""
                }
                onChange={(
                  event
                ) => {
                  setRejectionReason(
                    event
                      .target
                      .value
                  );

                  if (
                    rejectionError
                  ) {
                    setRejectionError(
                      ""
                    );
                  }
                }}
                placeholder="Enter rejection reason..."
              />

              {rejectionError ? (
                <small className="se-mpr-confirm-field-error">
                  {
                    rejectionError
                  }
                </small>
              ) : null}
            </label>

            <footer className="se-mpr-confirm-actions">
              <button
                type="button"
                className="cancel"
                onClick={
                  closeConfirmation
                }
                disabled={
                  Boolean(
                    actionLoading
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="confirm-reject"
                onClick={
                  handleReject
                }
                disabled={
                  Boolean(
                    actionLoading
                  )
                }
              >
                {actionLoading ===
                "REJECT" ? (
                  <>
                    <span className="se-mpr-confirm-spinner" />

                    Rejecting...
                  </>
                ) : (
                  <>
                    Reject Request

                    <span>
                      ×
                    </span>
                  </>
                )}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
};

export default ManpowerDetailDrawer;
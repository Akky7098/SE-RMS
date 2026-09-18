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
          style: "currency",
          currency,
          maximumFractionDigits: 0,
        }
      );

    if (
      min !== null &&
      min !== undefined &&
      max !== null &&
      max !== undefined
    ) {
      return `${formatter.format(
        Number(min)
      )} – ${formatter.format(
        Number(max)
      )} / year`;
    }

    const value =
      min ?? max;

    return `${formatter.format(
      Number(value || 0)
    )} / year`;
  } catch (
    error
  ) {
    return `${currency} ${
      min ?? max ?? 0
    }`;
  }
};

/* =========================================================
   API ACTION ERROR

   Converts technical HTTP errors into messages suitable
   for normal ERP users.
========================================================= */

const getFriendlyActionError = (
  error,
  action
) => {
  const status =
    Number(
      error?.response?.status ||
      0
    );

  const backendMessage =
    String(
      error?.response?.data
        ?.message ||
      ""
    ).trim();

  /*
   * Keep useful business messages from backend.
   *
   * Examples:
   * You cannot approve your own manpower requirement
   * You are not the assigned approver
   */
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
    status === 403
  ) {
    return (
      action === "approve"
        ? "You are not authorized to approve this manpower request."
        : "You are not authorized to reject this manpower request."
    );
  }

  if (
    status === 404
  ) {
    return "This manpower request could not be found. It may have been changed or removed.";
  }

  if (
    status === 409
  ) {
    return "This manpower request has already been processed. Refresh the page to see its latest status.";
  }

  if (
    status === 400
  ) {
    return (
      action === "approve"
        ? "This manpower request could not be approved. Please review the request and try again."
        : "This manpower request could not be rejected. Please review the request and try again."
    );
  }

  if (
    status >= 500
  ) {
    return "SE-RMS could not complete this action right now. Please try again.";
  }

  return getApiErrorMessage(
    error,
    action === "approve"
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

  /* =====================================================
     ACTION STATE

     Values:
     ""
     "APPROVE"
     "REJECT"

     Using explicit action name prevents duplicate clicks
     and allows proper button loading state.
  ===================================================== */

  const [
    actionLoading,
    setActionLoading,
  ] = useState(
    ""
  );

  /* =====================================================
     LOAD ERROR

     Reserved for actual requirement loading errors.
  ===================================================== */

  const [
    error,
    setError,
  ] = useState(
    ""
  );

  /* =====================================================
     USER-FACING ACTION MESSAGE

     success / error
  ===================================================== */

  const [
    actionMessage,
    setActionMessage,
  ] = useState(
    null
  );

  /* =====================================================
     CONFIRMATION MODAL

     type:
     APPROVE
     REJECT
  ===================================================== */

  const [
    confirmAction,
    setConfirmAction,
  ] = useState(
    ""
  );

  /* =====================================================
     ACTION INPUTS
  ===================================================== */

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
     RESET WHEN RECORD CHANGES
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
     ESC KEY

     Confirmation closes first.
     Drawer closes only when no action is running.
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
      requirement?.status
    );

  const priority =
    getPriorityMeta(
      requirement?.priority
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

  /* =====================================================
     APPROVAL HISTORY
  ===================================================== */

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

  /* =====================================================
     ACTION VISIBILITY

     Backend remains final permission authority.
  ===================================================== */

  const showApprovalActions =
    Boolean(
      canApprove &&
      requirement?.status ===
        "PENDING_APPROVAL"
    );

  /* =====================================================
     SAFE CLOSE
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
     OPEN APPROVE CONFIRMATION
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

  /* =====================================================
     OPEN REJECT CONFIRMATION
  ===================================================== */

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

  /* =====================================================
     CLOSE CONFIRMATION
  ===================================================== */

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

     IMPORTANT:
     Send JSON object:
     {
       remarks: "..."
     }

     Do NOT send a plain string.
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
            "Manpower request approved",

          message:
            `${
              updated?.requestNumber ||
              requirement?.requestNumber ||
              "The request"
            } has been approved successfully. It is now available to HR for the hiring workflow.`,
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

     IMPORTANT:
     Send JSON object:
     {
       reason: "..."
     }
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
          "Please enter a reason before rejecting this manpower request."
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
            "Manpower request rejected",

          message:
            `${
              updated?.requestNumber ||
              requirement?.requestNumber ||
              "The request"
            } has been rejected and the reason has been recorded in the approval history.`,
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
     NOT OPEN
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
      {/* ===================================================
          DETAIL DRAWER
      ==================================================== */}

      <div
        className="se-mpr-overlay"
        onMouseDown={
          handleClose
        }
      >
        <aside
          className="se-mpr-detail-drawer se-mpr-detail-premium"
          onMouseDown={(
            event
          ) =>
            event.stopPropagation()
          }
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
            <div className="se-mpr-detail-loading">
              <span />

              <span />

              <span />

              <span />
            </div>
          ) : requirement ? (
            <>
              {/* ===============================================
                  HEADER
              ================================================ */}

              <header className="se-mpr-drawer-head detail">
                <div className="se-mpr-detail-title">
                  <span>
                    {safeText(
                      requirement
                        ?.requestNumber,
                      "MANPOWER REQUEST"
                    )}
                  </span>

                  <h2>
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

                <button
                  type="button"
                  onClick={
                    handleClose
                  }
                  className="se-mpr-close"
                  disabled={
                    Boolean(
                      actionLoading
                    )
                  }
                  aria-label="Close manpower detail"
                >
                  ×
                </button>
              </header>

              {/* ===============================================
                  BODY
              ================================================ */}

              <div className="se-mpr-detail-body">
                {/* =============================================
                    USER FRIENDLY ACTION FEEDBACK
                ============================================== */}

                {actionMessage ? (
                  <div
                    className={`se-mpr-action-message ${actionMessage.type}`}
                    role={
                      actionMessage.type ===
                      "error"
                        ? "alert"
                        : "status"
                    }
                  >
                    <span className="se-mpr-action-message-icon">
                      {actionMessage.type ===
                      "success"
                        ? "✓"
                        : "!"}
                    </span>

                    <div>
                      <strong>
                        {
                          actionMessage.title
                        }
                      </strong>

                      <p>
                        {
                          actionMessage.message
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

                {/* =============================================
                    LOAD ERROR
                ============================================== */}

                {error ? (
                  <div className="se-mpr-form-error">
                    <span>
                      !
                    </span>

                    <div>
                      <strong>
                        Something needs attention
                      </strong>

                      <p>
                        {
                          error
                        }
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* =============================================
                    SUMMARY
                ============================================== */}

                <section className="se-mpr-detail-summary">
                  <div>
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

                  <div>
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

                  <div>
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

                  <div>
                    <span>
                      LOCATION
                    </span>

                    <strong>
                      {safeText(
                        requirement
                          ?.location,
                        "Not specified"
                      )}
                    </strong>
                  </div>
                </section>

                {/* =============================================
                    INFORMATION
                ============================================== */}

                <section className="se-mpr-detail-section">
                  <div className="se-mpr-detail-section-head">
                    <span>
                      REQUIREMENT
                    </span>

                    <h3>
                      Hiring details
                    </h3>
                  </div>

                  <div className="se-mpr-info-grid">
                    <div>
                      <span>
                        Employment Type
                      </span>

                      <strong>
                        {safeText(
                          requirement
                            ?.employmentType,
                          "—"
                        ).replaceAll(
                          "_",
                          " "
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Experience
                      </span>

                      <strong>
                        {Number(
                          requirement
                            ?.minimumExperienceYears ||
                            0
                        )}

                        {" – "}

                        {Number(
                          requirement
                            ?.maximumExperienceYears ||
                            0
                        )}

                        {" years"}
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
                  </div>
                </section>

                {/* =============================================
                    SKILLS
                ============================================== */}

                <section className="se-mpr-detail-section">
                  <div className="se-mpr-detail-section-head">
                    <span>
                      ROLE PROFILE
                    </span>

                    <h3>
                      Required skills
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
                      No specific skills
                      were entered.
                    </p>
                  )}
                </section>

                {/* =============================================
                    BUSINESS REASON
                ============================================== */}

                <section className="se-mpr-detail-section">
                  <div className="se-mpr-detail-section-head">
                    <span>
                      BUSINESS NEED
                    </span>

                    <h3>
                      Reason for hiring
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

                {/* =============================================
                    REQUEST / APPROVAL
                ============================================== */}

                <section className="se-mpr-detail-section">
                  <div className="se-mpr-detail-section-head">
                    <span>
                      OWNERSHIP
                    </span>

                    <h3>
                      Request & approval
                    </h3>
                  </div>

                  <div className="se-mpr-owner-grid">
                    <div>
                      <span className="se-mpr-owner-avatar requester">
                        {safeText(
                          requirement
                            ?.requestedBy
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
                            requirement
                              ?.requestedBy
                              ?.displayName,
                            "Unknown"
                          )}
                        </strong>

                        <p>
                          {safeText(
                            requirement
                              ?.requestedBy
                              ?.email,
                            ""
                          )}
                        </p>
                      </span>
                    </div>

                    <div>
                      <span className="se-mpr-owner-avatar approver">
                        {safeText(
                          requirement
                            ?.currentApprover
                            ?.displayName ||
                          requirement
                            ?.approvedBy
                            ?.displayName ||
                          requirement
                            ?.rejectedBy
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
                          {requirement
                            ?.status ===
                          "PENDING_APPROVAL"
                            ? "CURRENT APPROVER"
                            : requirement
                                  ?.status ===
                                "APPROVED"
                              ? "APPROVED BY"
                              : requirement
                                    ?.status ===
                                  "REJECTED"
                                ? "REJECTED BY"
                                : "APPROVAL"}
                        </small>

                        <strong>
                          {safeText(
                            requirement
                              ?.currentApprover
                              ?.displayName ||
                            requirement
                              ?.approvedBy
                              ?.displayName ||
                            requirement
                              ?.rejectedBy
                              ?.displayName,
                            "—"
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
                    REJECTION
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

                {/* =============================================
                    APPROVAL HISTORY
                ============================================== */}

                <section className="se-mpr-detail-section">
                  <div className="se-mpr-detail-section-head">
                    <span>
                      AUDIT TRAIL
                    </span>

                    <h3>
                      Approval history
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
                              item._id ||
                              `${item.action}-${index}`
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
                                  {safeText(
                                    item
                                      ?.action,
                                    "Update"
                                  ).replaceAll(
                                    "_",
                                    " "
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
                      No approval history
                      available.
                    </p>
                  )}
                </section>

                {/* =============================================
                    APPROVAL ACTION
                ============================================== */}

                {showApprovalActions ? (
                  <section className="se-mpr-approval-zone se-mpr-approval-zone-premium">
                    <div className="se-mpr-approval-zone-head">
                      <span>
                        ACTION REQUIRED
                      </span>

                      <h3>
                        Review this manpower request
                      </h3>

                      <p>
                        Choose an action below.
                        SE-RMS will ask for final
                        confirmation before anything
                        is changed.
                      </p>
                    </div>

                    <div className="se-mpr-approval-guidance">
                      <span>
                        i
                      </span>

                      <p>
                        Approving sends this
                        requirement to the HR hiring
                        workflow. Rejecting closes
                        this request with a recorded
                        reason.
                      </p>
                    </div>

                    <div className="se-mpr-approval-actions">
                      <button
                        type="button"
                        className="reject"
                        onClick={
                          openRejectConfirmation
                        }
                        disabled={
                          Boolean(
                            actionLoading
                          )
                        }
                      >
                        <span className="se-mpr-action-button-icon">
                          ×
                        </span>

                        <span>
                          Reject Request
                        </span>
                      </button>

                      <button
                        type="button"
                        className="approve"
                        onClick={
                          openApproveConfirmation
                        }
                        disabled={
                          Boolean(
                            actionLoading
                          )
                        }
                      >
                        <span className="se-mpr-action-button-icon">
                          ✓
                        </span>

                        <span>
                          Approve Request
                        </span>
                      </button>
                    </div>
                  </section>
                ) : null}
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
        </aside>
      </div>

      {/* ===================================================
          APPROVE CONFIRMATION MODAL
      ==================================================== */}

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
                APPROVAL CONFIRMATION
              </span>

              <h3 id="se-mpr-confirm-approve-title">
                Approve manpower request?
              </h3>

              <p>
                You are about to approve{" "}
                <strong>
                  {safeText(
                    requirement
                      ?.requestNumber,
                    "this request"
                  )}
                </strong>{" "}
                for{" "}
                <strong>
                  {safeText(
                    requirement
                      ?.positionTitle,
                    "this position"
                  )}
                </strong>
                .
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
                Approval Remarks

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
                placeholder="Add approval remarks if required..."
              />
            </label>

            <div className="se-mpr-confirm-warning positive">
              <span>
                →
              </span>

              <p>
                After approval, this manpower
                requirement becomes available
                to HR for hiring-owner
                assignment and recruitment.
              </p>
            </div>

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
                    Yes, Approve Request

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

      {/* ===================================================
          REJECT CONFIRMATION MODAL
      ==================================================== */}

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
                REJECTION CONFIRMATION
              </span>

              <h3 id="se-mpr-confirm-reject-title">
                Reject manpower request?
              </h3>

              <p>
                You are about to reject{" "}
                <strong>
                  {safeText(
                    requirement
                      ?.requestNumber,
                    "this request"
                  )}
                </strong>{" "}
                for{" "}
                <strong>
                  {safeText(
                    requirement
                      ?.positionTitle,
                    "this position"
                  )}
                </strong>
                .
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
                placeholder="Clearly explain why this manpower request is being rejected..."
              />

              {rejectionError ? (
                <small className="se-mpr-confirm-field-error">
                  {
                    rejectionError
                  }
                </small>
              ) : (
                <small>
                  This reason becomes part of
                  the permanent approval
                  history.
                </small>
              )}
            </label>

            <div className="se-mpr-confirm-warning danger">
              <span>
                !
              </span>

              <p>
                Rejection closes this request
                and it will not be released to
                HR for recruitment.
              </p>
            </div>

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
                    Yes, Reject Request

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
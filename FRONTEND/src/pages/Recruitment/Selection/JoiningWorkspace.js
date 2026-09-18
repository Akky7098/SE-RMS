import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getJoining,
  getJoiningReadiness,
  startJoining,
  updateJoining,
  confirmJoiningDay1,
} from "../../../services/selectionService";

/* =========================================================
   VISIBLE STATUSES
========================================================= */

const JOINING_VISIBLE_STATUSES = [
  "OFFER_SENT",
  "JOINING_PENDING",
  "JOINING_RESCHEDULED",
  "NO_SHOW",
  "JOINING_CONFIRMED",
  "JOINING_DECLINED",
  "COMPLETED",
];

/* =========================================================
   HELPERS
========================================================= */

const formatDate = (
  value
) => {
  if (!value) {
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
          "short",

        year:
          "numeric",
      }
    )
    .format(
      date
    );
};

const dateInput = (
  value
) => {
  if (!value) {
    return "";
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
    return "";
  }

  return date
    .toISOString()
    .slice(
      0,
      10
    );
};

const pretty = (
  value
) =>
  String(
    value ||
      ""
  )
    .replaceAll(
      "_",
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (
        character
      ) =>
        character
          .toUpperCase()
    );

const errorMessage = (
  error,
  fallback
) =>
  error?.response
    ?.data
    ?.message ||
  error?.message ||
  fallback;

const actorName = (
  value
) =>
  value?.displayName ||
  value?.fullName ||
  value?.name ||
  value?.email ||
  "HR";

/* =========================================================
   COMPONENT
========================================================= */

function JoiningWorkspace({
  selectionId,
  selection,
  onWorkflowChanged,
}) {
  const [
    joining,
    setJoining,
  ] =
    useState(
      null
    );

  const [
    readiness,
    setReadiness,
  ] =
    useState(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    );

  const [
    busy,
    setBusy,
  ] =
    useState(
      ""
    );

  const [
    modal,
    setModal,
  ] =
    useState(
      null
    );

  const [
    actionForm,
    setActionForm,
  ] =
    useState({
      action:
        "CONFIRM_DATE",

      joiningDate:
        "",

      nextFollowUpAt:
        "",

      reason:
        "",

      remarks:
        "",
    });

  const [
    day1Form,
    setDay1Form,
  ] =
    useState({
      actualJoiningDate:
        "",

      remarks:
        "",
    });

  /* =====================================================
     VISIBLE
  ===================================================== */

  const visible =
    useMemo(
      () =>
        JOINING_VISIBLE_STATUSES.includes(
          selection
            ?.status
        ),
      [
        selection
          ?.status,
      ]
    );

  /* =====================================================
     LOAD
  ===================================================== */

  const load =
    useCallback(
      async () => {
        if (
          !selectionId ||
          !visible
        ) {
          return;
        }

        try {
          setLoading(
            true
          );

          const [
            readinessResult,
            joiningResult,
          ] =
            await Promise.all([
              getJoiningReadiness(
                selectionId
              ),

              getJoining(
                selectionId
              ).catch(
                () =>
                  null
              ),
            ]);

          setReadiness(
            readinessResult ||
            null
          );

          setJoining(
            joiningResult ||
            null
          );
        } catch (
          error
        ) {
          setModal({
            type:
              "ERROR",

            title:
              "Joining workspace unavailable",

            message:
              errorMessage(
                error,
                "Joining information could not be loaded."
              ),
          });
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        selectionId,
        visible,
      ]
    );

  useEffect(
    () => {
      load();
    },
    [
      load,
    ]
  );

  /* =====================================================
     START
  ===================================================== */

  const start =
    async () => {
      try {
        setBusy(
          "START"
        );

        const result =
          await startJoining(
            selectionId
          );

        setJoining(
          result ||
          null
        );

        if (
          onWorkflowChanged
        ) {
          await onWorkflowChanged();
        }

        await load();
      } catch (
        error
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "Joining workflow could not be started",

          message:
            errorMessage(
              error,
              "Please try again."
            ),
        });
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =====================================================
     OPEN UPDATE
  ===================================================== */

  const openUpdate =
    () => {
      setActionForm({
        action:
          "CONFIRM_DATE",

        joiningDate:
          dateInput(
            joining
              ?.expectedJoiningDate
          ),

        nextFollowUpAt:
          "",

        reason:
          "",

        remarks:
          "",
      });

      setModal({
        type:
          "UPDATE_JOINING",
      });
    };

  /* =====================================================
     UPDATE ACTION FORM
  ===================================================== */

  const updateActionField =
    (
      key,
      value
    ) => {
      setActionForm(
        (
          previous
        ) => ({
          ...previous,

          [key]:
            value,
        })
      );
    };

  /* =====================================================
     SAVE UPDATE
  ===================================================== */

  const saveJoiningUpdate =
    async () => {
      const action =
        actionForm
          .action;

      if (
        action ===
          "RESCHEDULE" &&
        !actionForm
          .joiningDate
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "New joining date required",

          message:
            "Please select the revised joining date.",
        });

        return;
      }

      if (
        (
          action ===
            "RESCHEDULE" ||
          action ===
            "DECLINED"
        ) &&
        !actionForm
          .reason
          .trim()
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "Reason required",

          message:
            "Please enter the reason for this joining update.",
        });

        return;
      }

      try {
        setBusy(
          "UPDATE"
        );

        const payload = {
          action,

          remarks:
            actionForm
              .remarks
              .trim(),
        };

        if (
          action ===
          "RESCHEDULE"
        ) {
          payload.joiningDate =
            actionForm
              .joiningDate;

          payload.reason =
            actionForm
              .reason
              .trim();
        }

        if (
          action ===
          "FOLLOW_UP"
        ) {
          payload.nextFollowUpAt =
            actionForm
              .nextFollowUpAt ||
            null;

          payload.reason =
            actionForm
              .reason
              .trim();
        }

        if (
          action ===
          "NO_SHOW"
        ) {
          payload.reason =
            actionForm
              .reason
              .trim();
        }

        if (
          action ===
          "DECLINED"
        ) {
          payload.reason =
            actionForm
              .reason
              .trim();
        }

        const result =
          await updateJoining(
            selectionId,
            payload
          );

        setJoining(
          result ||
          null
        );

        setModal({
          type:
            "UPDATED",
        });

        if (
          onWorkflowChanged
        ) {
          await onWorkflowChanged();
        }

        await load();
      } catch (
        error
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "Joining update failed",

          message:
            errorMessage(
              error,
              "Joining status could not be updated."
            ),
        });
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =====================================================
     OPEN DAY 1
  ===================================================== */

  const openDay1 =
    () => {
      setDay1Form({
        actualJoiningDate:
          dateInput(
            joining
              ?.expectedJoiningDate ||
            new Date()
          ),

        remarks:
          "",
      });

      setModal({
        type:
          "DAY1",
      });
    };

  /* =====================================================
     CONFIRM DAY 1
  ===================================================== */

  const confirmDay1 =
    async () => {
      if (
        !day1Form
          .actualJoiningDate
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "Actual joining date required",

          message:
            "Please select the candidate's actual joining date.",
        });

        return;
      }

      try {
        setBusy(
          "DAY1"
        );

        const result =
          await confirmJoiningDay1(
            selectionId,
            {
              actualJoiningDate:
                day1Form
                  .actualJoiningDate,

              remarks:
                day1Form
                  .remarks
                  .trim(),
            }
          );

        setJoining(
          result ||
          null
        );

        setModal({
          type:
            "DAY1_DONE",
        });

        if (
          onWorkflowChanged
        ) {
          await onWorkflowChanged();
        }

        await load();
      } catch (
        error
      ) {
        setModal({
          type:
            "ERROR",

          title:
            "Day 1 confirmation failed",

          message:
            errorMessage(
              error,
              "Candidate joining could not be confirmed."
            ),
        });
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =====================================================
     DON'T SHOW
  ===================================================== */

  if (
    !visible
  ) {
    return null;
  }

  /* =====================================================
     LOADING
  ===================================================== */

  if (
    loading &&
    !joining
  ) {
    return (
      <section className="selection-joining-shell">

        <div className="selection-joining-loading">

          <div className="selection-spinner" />

          <span>
            Loading Joining workspace...
          </span>

        </div>

      </section>
    );
  }

  /* =====================================================
     OFFER SENT BUT JOINING NOT STARTED
  ===================================================== */

  if (
    !joining
  ) {
    return (
      <section className="selection-joining-shell selection-joining-shell--start">

        <div className="selection-joining-start-main">

          <div className="selection-joining-icon">
            J
          </div>

          <div>

            <span className="selection-joining-eyebrow">
              JOINING & DAY 1
            </span>

            <h2>
              Offer released — start Joining tracking
            </h2>

            <p>
              Track joining confirmation, revised dates, follow-ups, no-show status and Day 1 attendance from one controlled workspace.
            </p>

          </div>

        </div>

        <div className="selection-joining-start-side">

          <div>

            <span>
              EXPECTED JOINING
            </span>

            <strong>
              {formatDate(
                readiness
                  ?.joiningDate
              )}
            </strong>

          </div>

          <button
            type="button"
            className="selection-joining-primary"
            onClick={
              start
            }
            disabled={
              Boolean(
                busy
              )
            }
          >
            {busy ===
            "START"
              ? "Starting..."
              : "Start Joining Tracking"}
          </button>

        </div>

      </section>
    );
  }

  /* =====================================================
     FLAGS
  ===================================================== */

  const joined =
    joining.status ===
      "DAY1_CONFIRMED" ||
    selection?.status ===
      "JOINING_CONFIRMED";

  const declined =
    joining.status ===
      "DECLINED" ||
    selection?.status ===
      "JOINING_DECLINED";

  const noShow =
    joining.status ===
      "NO_SHOW" ||
    selection?.status ===
      "NO_SHOW";

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <>

      <section className="selection-joining-shell selection-joining-shell--active">

        {/* =================================================
            HEADER
        ================================================== */}

        <div className="selection-joining-header">

          <div className="selection-joining-header-main">

            <div className="selection-joining-icon">
              J
            </div>

            <div>

              <span className="selection-joining-eyebrow">
                JOINING & DAY 1
              </span>

              <h2>
                Joining Management
              </h2>

              <p>
                Candidate joining status, follow-up and Day 1 record.
              </p>

            </div>

          </div>

          <span
            className={
              `selection-joining-status ${
                joined
                  ? "is-success"
                  : declined
                    ? "is-danger"
                    : noShow
                      ? "is-warning"
                      : "is-active"
              }`
            }
          >
            {joined
              ? "Joined"
              : declined
                ? "Declined"
                : noShow
                  ? "No Show"
                  : pretty(
                      joining
                        .status
                    )}
          </span>

        </div>

        {/* =================================================
            METRICS
        ================================================== */}

        <div className="selection-joining-metrics">

          <div>

            <span>
              EXPECTED JOINING
            </span>

            <strong>
              {formatDate(
                joining
                  .expectedJoiningDate
              )}
            </strong>

          </div>

          <div>

            <span>
              ORIGINAL DATE
            </span>

            <strong>
              {formatDate(
                joining
                  .originalJoiningDate
              )}
            </strong>

          </div>

          <div>

            <span>
              ACTUAL JOINING
            </span>

            <strong>
              {formatDate(
                joining
                  .actualJoiningDate
              )}
            </strong>

          </div>

          <div>

            <span>
              LAST CONTACT
            </span>

            <strong>
              {formatDate(
                joining
                  .lastContactedAt ||
                joining
                  .candidateConfirmedAt
              )}
            </strong>

          </div>

        </div>

        {/* =================================================
            CANDIDATE DETAILS
        ================================================== */}

        <div className="selection-joining-person-grid">

          <div>

            <span>
              CANDIDATE
            </span>

            <strong>
              {selection
                ?.candidate
                ?.fullName ||
                "—"}
            </strong>

            <small>
              {selection
                ?.candidate
                ?.email ||
                "—"}
            </small>

          </div>

          <div>

            <span>
              POSITION
            </span>

            <strong>
              {selection
                ?.positionTitle ||
                "—"}
            </strong>

            <small>
              {selection
                ?.officeLocation ||
                "—"}
            </small>

          </div>

          <div>

            <span>
              HIRING HR
            </span>

            <strong>
              {actorName(
                selection
                  ?.hiringHr
              )}
            </strong>

            <small>
              {selection
                ?.hiringHr
                ?.email ||
                "—"}
            </small>

          </div>

        </div>

        {/* =================================================
            CURRENT ACTION
        ================================================== */}

        {!joined &&
        !declined ? (
          <div className="selection-joining-action-strip">

            <div>

              <span>
                CURRENT ACTION
              </span>

              <strong>
                {noShow
                  ? "Candidate did not report"
                  : joining.status ===
                      "RESCHEDULED"
                    ? "Joining date revised"
                    : joining.status ===
                        "FOLLOW_UP"
                      ? "Candidate follow-up required"
                      : "Candidate expected to join"}
              </strong>

              <p>
                {noShow
                  ? "Update the candidate after HR follow-up or reschedule the joining date."
                  : `Expected joining date is ${formatDate(
                      joining
                        .expectedJoiningDate
                    )}.`}
              </p>

            </div>

            <div className="selection-joining-actions">

              <button
                type="button"
                className="selection-joining-secondary"
                onClick={
                  openUpdate
                }
              >
                Update Joining
              </button>

              <button
                type="button"
                className="selection-joining-primary"
                onClick={
                  openDay1
                }
              >
                Confirm Day 1
                <span>
                  →
                </span>
              </button>

            </div>

          </div>
        ) : null}

        {/* =================================================
            DAY 1 CONFIRMED
        ================================================== */}

        {joined ? (
          <div className="selection-joining-success-banner">

            <div className="selection-joining-success-icon">
              ✓
            </div>

            <div>

              <span>
                DAY 1 CONFIRMED
              </span>

              <strong>
                Candidate successfully joined
              </strong>

              <p>
                Actual joining date:{" "}
                {formatDate(
                  joining
                    .actualJoiningDate
                )}
                . Recruitment handover to the People module can be completed later.
              </p>

            </div>

          </div>
        ) : null}

        {/* =================================================
            DECLINED
        ================================================== */}

        {declined ? (
          <div className="selection-joining-declined-banner">

            <div>
              ×
            </div>

            <div>

              <span>
                JOINING CLOSED
              </span>

              <strong>
                Candidate declined joining
              </strong>

              <p>
                {joining
                  ?.declinedReason ||
                  "Candidate joining has been closed."}
              </p>

            </div>

          </div>
        ) : null}

        {/* =================================================
            HISTORY
        ================================================== */}

        {Array.isArray(
          joining.history
        ) &&
        joining.history.length >
          0 ? (
          <details className="selection-joining-history">

            <summary>

              <div>

                <span>
                  AUDIT TRAIL
                </span>

                <strong>
                  Joining History
                </strong>

              </div>

              <small>
                {joining
                  .history
                  .length}
                {" events"}
              </small>

            </summary>

            <div className="selection-joining-history-list">

              {[...joining.history]
                .reverse()
                .map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      className="selection-joining-history-item"
                      key={
                        item._id ||
                        `${item.action}-${index}`
                      }
                    >

                      <div className="selection-joining-history-dot">
                        {index +
                          1}
                      </div>

                      <div>

                        <strong>
                          {pretty(
                            item.action
                          )}
                        </strong>

                        <span>
                          {formatDate(
                            item.at
                          )}
                          {" · "}
                          {actorName(
                            item
                              .performedBy
                          )}
                        </span>

                        {item
                          .joiningDate ? (
                          <small>
                            Joining date:{" "}
                            {formatDate(
                              item
                                .joiningDate
                            )}
                          </small>
                        ) : null}

                        {item
                          .reason ? (
                          <p>
                            <b>
                              Reason:
                            </b>{" "}
                            {item
                              .reason}
                          </p>
                        ) : null}

                        {item
                          .remarks ? (
                          <p>
                            {item
                              .remarks}
                          </p>
                        ) : null}

                      </div>

                    </div>
                  )
                )}

            </div>

          </details>
        ) : null}

      </section>

      {/* ===================================================
          MODAL
      ==================================================== */}

      {modal ? (
        <div className="selection-joining-modal-overlay">

          <div className="selection-joining-modal">

            {/* =============================================
                UPDATE
            ============================================== */}

            {modal.type ===
            "UPDATE_JOINING" ? (
              <>

                <div className="selection-joining-modal-head">

                  <div className="selection-joining-modal-icon">
                    J
                  </div>

                  <div>

                    <span>
                      JOINING UPDATE
                    </span>

                    <h2>
                      Update Candidate Joining
                    </h2>

                    <p>
                      Record the latest candidate confirmation after HR communication.
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setModal(
                        null
                      )
                    }
                  >
                    ×
                  </button>

                </div>

                <div className="selection-joining-form">

                  <label>

                    <span>
                      Update Type *
                    </span>

                    <select
                      value={
                        actionForm
                          .action
                      }
                      onChange={(
                        event
                      ) =>
                        updateActionField(
                          "action",
                          event
                            .target
                            .value
                        )
                      }
                    >

                      <option value="CONFIRM_DATE">
                        Candidate confirmed current joining date
                      </option>

                      <option value="RESCHEDULE">
                        Reschedule joining date
                      </option>

                      <option value="FOLLOW_UP">
                        Follow-up required
                      </option>

                      <option value="NO_SHOW">
                        Candidate did not report / No show
                      </option>

                      <option value="DECLINED">
                        Candidate declined joining
                      </option>

                    </select>

                  </label>

                  {actionForm
                    .action ===
                  "RESCHEDULE" ? (
                    <label>

                      <span>
                        New Joining Date *
                      </span>

                      <input
                        type="date"
                        value={
                          actionForm
                            .joiningDate
                        }
                        onChange={(
                          event
                        ) =>
                          updateActionField(
                            "joiningDate",
                            event
                              .target
                              .value
                          )
                        }
                      />

                    </label>
                  ) : null}

                  {actionForm
                    .action ===
                  "FOLLOW_UP" ? (
                    <label>

                      <span>
                        Next Follow-up Date
                      </span>

                      <input
                        type="date"
                        value={
                          actionForm
                            .nextFollowUpAt
                        }
                        onChange={(
                          event
                        ) =>
                          updateActionField(
                            "nextFollowUpAt",
                            event
                              .target
                              .value
                          )
                        }
                      />

                    </label>
                  ) : null}

                  {[
                    "RESCHEDULE",
                    "FOLLOW_UP",
                    "NO_SHOW",
                    "DECLINED",
                  ].includes(
                    actionForm
                      .action
                  ) ? (
                    <label>

                      <span>
                        {[
                          "RESCHEDULE",
                          "DECLINED",
                        ].includes(
                          actionForm
                            .action
                        )
                          ? "Reason *"
                          : "Reason"}

                      </span>

                      <input
                        placeholder="Enter reason"
                        value={
                          actionForm
                            .reason
                        }
                        onChange={(
                          event
                        ) =>
                          updateActionField(
                            "reason",
                            event
                              .target
                              .value
                          )
                        }
                      />

                    </label>
                  ) : null}

                  <label>

                    <span>
                      HR Note
                    </span>

                    <textarea
                      placeholder="Example: Spoke with candidate over phone and confirmed revised date."
                      value={
                        actionForm
                          .remarks
                      }
                      onChange={(
                        event
                      ) =>
                        updateActionField(
                          "remarks",
                          event
                            .target
                            .value
                        )
                      }
                    />

                  </label>

                </div>

                <div className="selection-joining-modal-actions">

                  <button
                    type="button"
                    className="selection-joining-secondary"
                    onClick={() =>
                      setModal(
                        null
                      )
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="selection-joining-primary"
                    onClick={
                      saveJoiningUpdate
                    }
                    disabled={
                      busy ===
                      "UPDATE"
                    }
                  >
                    {busy ===
                    "UPDATE"
                      ? "Updating..."
                      : "Update Joining"}
                  </button>

                </div>

              </>
            ) : null}

            {/* =============================================
                DAY 1
            ============================================== */}

            {modal.type ===
            "DAY1" ? (
              <>

                <div className="selection-joining-modal-head">

                  <div className="selection-joining-modal-icon is-success">
                    ✓
                  </div>

                  <div>

                    <span>
                      DAY 1
                    </span>

                    <h2>
                      Confirm Candidate Joining
                    </h2>

                    <p>
                      Confirm only after the candidate has physically reported for joining.
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setModal(
                        null
                      )
                    }
                  >
                    ×
                  </button>

                </div>

                <div className="selection-joining-day1-candidate">

                  <div>

                    <span>
                      CANDIDATE
                    </span>

                    <strong>
                      {selection
                        ?.candidate
                        ?.fullName ||
                        "—"}
                    </strong>

                  </div>

                  <div>

                    <span>
                      POSITION
                    </span>

                    <strong>
                      {selection
                        ?.positionTitle ||
                        "—"}
                    </strong>

                  </div>

                  <div>

                    <span>
                      EXPECTED DATE
                    </span>

                    <strong>
                      {formatDate(
                        joining
                          ?.expectedJoiningDate
                      )}
                    </strong>

                  </div>

                </div>

                <div className="selection-joining-form">

                  <label>

                    <span>
                      Actual Joining Date *
                    </span>

                    <input
                      type="date"
                      value={
                        day1Form
                          .actualJoiningDate
                      }
                      onChange={(
                        event
                      ) =>
                        setDay1Form(
                          (
                            previous
                          ) => ({
                            ...previous,

                            actualJoiningDate:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                    />

                  </label>

                  <label>

                    <span>
                      HR Note
                    </span>

                    <textarea
                      placeholder="Example: Candidate reported at Sonipat office and completed joining formalities."
                      value={
                        day1Form
                          .remarks
                      }
                      onChange={(
                        event
                      ) =>
                        setDay1Form(
                          (
                            previous
                          ) => ({
                            ...previous,

                            remarks:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                    />

                  </label>

                  <div className="selection-joining-day1-notice">

                    <span>
                      ✓
                    </span>

                    <div>

                      <strong>
                        Recruitment stage will be completed up to Day 1
                      </strong>

                      <p>
                        Employee creation is intentionally not automatic yet. Existing and legacy employees remain managed independently in the People module.
                      </p>

                    </div>

                  </div>

                </div>

                <div className="selection-joining-modal-actions">

                  <button
                    type="button"
                    className="selection-joining-secondary"
                    onClick={() =>
                      setModal(
                        null
                      )
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="selection-joining-primary"
                    onClick={
                      confirmDay1
                    }
                    disabled={
                      busy ===
                      "DAY1"
                    }
                  >
                    {busy ===
                    "DAY1"
                      ? "Confirming..."
                      : "Confirm Day 1"}
                  </button>

                </div>

              </>
            ) : null}

            {/* =============================================
                UPDATED
            ============================================== */}

            {modal.type ===
            "UPDATED" ? (
              <div className="selection-joining-state">

                <div className="selection-joining-state-success">
                  ✓
                </div>

                <span>
                  JOINING UPDATED
                </span>

                <h2>
                  Candidate joining updated
                </h2>

                <p>
                  The latest joining information has been saved and added to the audit trail.
                </p>

                <button
                  type="button"
                  className="selection-joining-primary"
                  onClick={() =>
                    setModal(
                      null
                    )
                  }
                >
                  Done
                </button>

              </div>
            ) : null}

            {/* =============================================
                DAY 1 DONE
            ============================================== */}

            {modal.type ===
            "DAY1_DONE" ? (
              <div className="selection-joining-state">

                <div className="selection-joining-state-success">
                  ✓
                </div>

                <span>
                  DAY 1 CONFIRMED
                </span>

                <h2>
                  Candidate has joined
                </h2>

                <p>
                  The candidate's actual joining has been recorded successfully. Recruitment is complete up to the Day 1 stage.
                </p>

                <button
                  type="button"
                  className="selection-joining-primary"
                  onClick={() =>
                    setModal(
                      null
                    )
                  }
                >
                  Done
                </button>

              </div>
            ) : null}

            {/* =============================================
                ERROR
            ============================================== */}

            {modal.type ===
            "ERROR" ? (
              <div className="selection-joining-state">

                <div className="selection-joining-state-error">
                  !
                </div>

                <span className="is-error">
                  ACTION FAILED
                </span>

                <h2>
                  {modal.title}
                </h2>

                <p>
                  {modal.message}
                </p>

                <button
                  type="button"
                  className="selection-joining-primary"
                  onClick={() =>
                    setModal(
                      null
                    )
                  }
                >
                  Close
                </button>

              </div>
            ) : null}

          </div>

        </div>
      ) : null}

    </>
  );
}

export default JoiningWorkspace;
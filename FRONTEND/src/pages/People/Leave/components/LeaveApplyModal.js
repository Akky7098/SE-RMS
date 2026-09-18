import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  formatDays,
  getAvailableBalance,
  getBalanceType,
  toDateInputValue,
} from "../utils/leaveHelpers";

const initialForm = {
  leaveTypeId: "",
  fromDate: "",
  toDate: "",
  durationType:
    "FULL_DAY",
  reason: "",
  emergency: false,
  emergencyReason: "",
  contactDuringLeave: "",
};

function LeaveApplyModal({
  open,
  types = [],
  balances = [],
  submitting = false,
  onClose,
  onSubmit,
}) {
  const [form, setForm] =
    useState(
      initialForm
    );

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!open) return;

    setForm({
      ...initialForm,
      fromDate:
        toDateInputValue(
          new Date()
        ),
      toDate:
        toDateInputValue(
          new Date()
        ),
    });

    setError("");
  }, [open]);

  const selectedType =
    useMemo(
      () =>
        types.find(
          (type) =>
            String(
              type._id
            ) ===
            String(
              form.leaveTypeId
            )
        ),
      [
        types,
        form.leaveTypeId,
      ]
    );

  const selectedBalance =
    useMemo(
      () =>
        balances.find(
          (balance) => {
            const type =
              getBalanceType(
                balance
              );

            return (
              String(
                type?._id
              ) ===
              String(
                form.leaveTypeId
              )
            );
          }
        ),
      [
        balances,
        form.leaveTypeId,
      ]
    );

  const available =
    selectedBalance
      ? getAvailableBalance(
          selectedBalance
        )
      : null;

  const estimatedDays =
    useMemo(() => {
      if (
        !form.fromDate ||
        !form.toDate
      ) {
        return 0;
      }

      if (
        form.durationType ===
          "FIRST_HALF" ||
        form.durationType ===
          "SECOND_HALF"
      ) {
        return 0.5;
      }

      const from =
        new Date(
          `${form.fromDate}T00:00:00`
        );

      const to =
        new Date(
          `${form.toDate}T00:00:00`
        );

      if (
        Number.isNaN(
          from.getTime()
        ) ||
        Number.isNaN(
          to.getTime()
        ) ||
        to < from
      ) {
        return 0;
      }

      return (
        Math.floor(
          (to - from) /
            86400000
        ) + 1
      );
    }, [
      form.fromDate,
      form.toDate,
      form.durationType,
    ]);

  if (!open) {
    return null;
  }

  const update = (
    key,
    value
  ) => {
    setForm(
      (current) => ({
        ...current,
        [key]: value,
      })
    );

    setError("");
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (
      !form.leaveTypeId
    ) {
      setError(
        "Select a leave type."
      );
      return;
    }

    if (
      !form.fromDate ||
      !form.toDate
    ) {
      setError(
        "Select the leave dates."
      );
      return;
    }

    if (
      form.toDate <
      form.fromDate
    ) {
      setError(
        "End date cannot be before start date."
      );
      return;
    }

    if (
      (
        form.durationType ===
          "FIRST_HALF" ||
        form.durationType ===
          "SECOND_HALF"
      ) &&
      form.fromDate !==
        form.toDate
    ) {
      setError(
        "Half-day leave can only be applied for one date."
      );
      return;
    }

    if (
      !form.reason.trim()
    ) {
      setError(
        "Enter the reason for leave."
      );
      return;
    }

    if (
      form.emergency &&
      !form.emergencyReason.trim()
    ) {
      setError(
        "Enter the emergency reason."
      );
      return;
    }

    await onSubmit({
      ...form,
      reason:
        form.reason.trim(),
      emergencyReason:
        form.emergencyReason.trim(),
      contactDuringLeave:
        form.contactDuringLeave.trim(),
      source: "WEB",
    });
  };

  return (
    <div
      className="se-leave-modal-layer"
      role="presentation"
    >
      <button
        type="button"
        className="se-leave-modal-backdrop"
        aria-label="Close apply leave"
        onClick={onClose}
      />

      <section
        className="se-leave-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-apply-title"
      >
        <header className="se-leave-modal-head">
          <div>
            <span className="se-leave-section-label">
              NEW REQUEST
            </span>

            <h2 id="leave-apply-title">
              Apply for leave
            </h2>

            <p>
              Your reporting
              manager will be
              selected automatically.
            </p>
          </div>

          <button
            type="button"
            className="se-leave-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <form
          className="se-leave-form"
          onSubmit={
            handleSubmit
          }
        >
          <div className="se-leave-field se-leave-field--full">
            <label htmlFor="leave-type">
              Leave type
            </label>

            <select
              id="leave-type"
              value={
                form.leaveTypeId
              }
              onChange={(
                event
              ) =>
                update(
                  "leaveTypeId",
                  event.target
                    .value
                )
              }
            >
              <option value="">
                Select leave type
              </option>

              {types.map(
                (type) => (
                  <option
                    key={
                      type._id
                    }
                    value={
                      type._id
                    }
                  >
                    {type.code
                      ? `${type.code} · `
                      : ""}
                    {type.name}
                  </option>
                )
              )}
            </select>
          </div>

          {selectedType ? (
            <div className="se-leave-selected-balance">
              <div>
                <span>
                  AVAILABLE
                </span>

                <strong>
                  {available ===
                  null
                    ? "—"
                    : formatDays(
                        available
                      )}
                </strong>
              </div>

              <div>
                <span>
                  REQUESTING
                </span>

                <strong>
                  {formatDays(
                    estimatedDays
                  )}
                </strong>
              </div>

              <div>
                <span>
                  AFTER REQUEST
                </span>

                <strong>
                  {available ===
                  null
                    ? "—"
                    : formatDays(
                        available -
                          estimatedDays
                      )}
                </strong>
              </div>
            </div>
          ) : null}

          <div className="se-leave-form-grid">
            <div className="se-leave-field">
              <label htmlFor="leave-from">
                From
              </label>

              <input
                id="leave-from"
                type="date"
                value={
                  form.fromDate
                }
                onChange={(
                  event
                ) =>
                  update(
                    "fromDate",
                    event.target
                      .value
                  )
                }
              />
            </div>

            <div className="se-leave-field">
              <label htmlFor="leave-to">
                To
              </label>

              <input
                id="leave-to"
                type="date"
                value={
                  form.toDate
                }
                onChange={(
                  event
                ) =>
                  update(
                    "toDate",
                    event.target
                      .value
                  )
                }
              />
            </div>
          </div>

          <div className="se-leave-field se-leave-field--full">
            <label htmlFor="leave-duration">
              Duration
            </label>

            <select
              id="leave-duration"
              value={
                form.durationType
              }
              onChange={(
                event
              ) =>
                update(
                  "durationType",
                  event.target
                    .value
                )
              }
            >
              <option value="FULL_DAY">
                Full day
              </option>

              {selectedType
                ?.allowHalfDay ? (
                <>
                  <option value="FIRST_HALF">
                    First half
                  </option>

                  <option value="SECOND_HALF">
                    Second half
                  </option>
                </>
              ) : null}
            </select>
          </div>

          <div className="se-leave-field se-leave-field--full">
            <label htmlFor="leave-reason">
              Reason
            </label>

            <textarea
              id="leave-reason"
              rows="4"
              maxLength="2000"
              placeholder="Briefly explain the reason for your leave"
              value={
                form.reason
              }
              onChange={(
                event
              ) =>
                update(
                  "reason",
                  event.target
                    .value
                )
              }
            />
          </div>

          <label className="se-leave-check">
            <input
              type="checkbox"
              checked={
                form.emergency
              }
              onChange={(
                event
              ) =>
                update(
                  "emergency",
                  event.target
                    .checked
                )
              }
            />

            <span>
              This is an
              emergency leave
              request
            </span>
          </label>

          {form.emergency ? (
            <div className="se-leave-field se-leave-field--full">
              <label htmlFor="leave-emergency">
                Emergency details
              </label>

              <textarea
                id="leave-emergency"
                rows="3"
                value={
                  form.emergencyReason
                }
                onChange={(
                  event
                ) =>
                  update(
                    "emergencyReason",
                    event.target
                      .value
                  )
                }
              />
            </div>
          ) : null}

          <div className="se-leave-field se-leave-field--full">
            <label htmlFor="leave-contact">
              Contact during leave
              <span>
                Optional
              </span>
            </label>

            <input
              id="leave-contact"
              type="text"
              value={
                form.contactDuringLeave
              }
              onChange={(
                event
              ) =>
                update(
                  "contactDuringLeave",
                  event.target
                    .value
                )
              }
              placeholder="Phone or other contact information"
            />
          </div>

          {error ? (
            <div className="se-leave-form-error">
              {error}
            </div>
          ) : null}

          <footer className="se-leave-modal-actions">
            <button
              type="button"
              className="se-leave-btn se-leave-btn--secondary"
              onClick={onClose}
              disabled={
                submitting
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="se-leave-btn se-leave-btn--primary"
              disabled={
                submitting
              }
            >
              {submitting
                ? "Submitting..."
                : "Submit Request"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default LeaveApplyModal;
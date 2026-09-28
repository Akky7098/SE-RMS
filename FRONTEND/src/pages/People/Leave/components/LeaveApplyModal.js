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
  durationType: "FULL_DAY",
  reason: "",
  emergency: false,
  emergencyReason: "",
  contactDuringLeave: "",
};

const getShortLeaveConfig = (selectedType) => {
  if (!selectedType) {
    return null;
  }

  /*
    Do not invent backend values.

    We only show Short Leave if the leave-type
    object explicitly tells the frontend that
    short leave is supported.

    Supported possible shapes:
      allowShortLeave: true
      shortLeaveEnabled: true
      allowedDurations: [...]
      durationTypes: [...]

    If your backend uses another property,
    add it here.
  */

  const durations =
    selectedType.allowedDurations ||
    selectedType.durationTypes ||
    [];

  const shortValue =
    durations.find((value) =>
      ["SHORT_LEAVE", "SHORT", "SHORT_DAY"].includes(
        String(value).toUpperCase()
      )
    ) || null;

  if (shortValue) {
    return {
      enabled: true,
      value: shortValue,
    };
  }

  if (
    selectedType.allowShortLeave === true ||
    selectedType.shortLeaveEnabled === true
  ) {
    return {
      enabled: true,
      value:
        selectedType.shortLeaveDurationType ||
        "SHORT_LEAVE",
    };
  }

  return null;
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
    useState(initialForm);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    const today =
      toDateInputValue(new Date());

    setForm({
      ...initialForm,
      fromDate: today,
      toDate: today,
    });

    setError("");
  }, [open]);

  const selectedType = useMemo(
    () =>
      types.find(
        (type) =>
          String(type._id) ===
          String(form.leaveTypeId)
      ),
    [types, form.leaveTypeId]
  );

  const selectedBalance = useMemo(
    () =>
      balances.find((balance) => {
        const type =
          getBalanceType(balance);

        return (
          String(type?._id) ===
          String(form.leaveTypeId)
        );
      }),
    [balances, form.leaveTypeId]
  );

  const available = selectedBalance
    ? getAvailableBalance(
        selectedBalance
      )
    : null;

  const shortLeaveConfig =
    useMemo(
      () =>
        getShortLeaveConfig(
          selectedType
        ),
      [selectedType]
    );

  const isHalfDay =
    form.durationType ===
      "FIRST_HALF" ||
    form.durationType ===
      "SECOND_HALF";

  const isShortLeave =
    Boolean(shortLeaveConfig) &&
    form.durationType ===
      shortLeaveConfig?.value;

  const estimatedDays = useMemo(() => {
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

    if (
      shortLeaveConfig &&
      form.durationType ===
        shortLeaveConfig.value
    ) {
      const configured =
        Number(
          selectedType?.shortLeaveDays
        );

      return Number.isFinite(
        configured
      ) &&
        configured > 0
        ? configured
        : 0;
    }

    const from = new Date(
      `${form.fromDate}T00:00:00`
    );

    const to = new Date(
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
        (to - from) / 86400000
      ) + 1
    );
  }, [
    form.fromDate,
    form.toDate,
    form.durationType,
    shortLeaveConfig,
    selectedType,
  ]);

  if (!open) {
    return null;
  }

  const update = (
    key,
    value
  ) => {
    setForm((current) => {
      const next = {
        ...current,
        [key]: value,
      };

      /*
        Half day / short leave must remain
        a single-date request.
      */
      if (
        key === "durationType" &&
        (
          value === "FIRST_HALF" ||
          value === "SECOND_HALF" ||
          value ===
            shortLeaveConfig?.value
        )
      ) {
        next.toDate =
          current.fromDate;
      }

      /*
        When FROM changes during a partial-day
        request, keep TO synchronized.
      */
      if (
        key === "fromDate" &&
        (
          current.durationType ===
            "FIRST_HALF" ||
          current.durationType ===
            "SECOND_HALF" ||
          current.durationType ===
            shortLeaveConfig?.value
        )
      ) {
        next.toDate = value;
      }

      return next;
    });

    setError("");
  };

  const handleLeaveTypeChange = (
    value
  ) => {
    setForm((current) => ({
      ...current,
      leaveTypeId: value,
      durationType: "FULL_DAY",
    }));

    setError("");
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!form.leaveTypeId) {
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
        isHalfDay ||
        isShortLeave
      ) &&
      form.fromDate !==
        form.toDate
    ) {
      setError(
        isShortLeave
          ? "Short leave can only be applied for one date."
          : "Half-day leave can only be applied for one date."
      );
      return;
    }

    if (!form.reason.trim()) {
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
      className="se-leave-modal-layer se-leave-apply-v2-layer"
      role="presentation"
    >
      <button
        type="button"
        className="se-leave-modal-backdrop"
        aria-label="Close apply leave"
        onClick={onClose}
      />

      <section
        className="se-leave-modal se-leave-apply-v2"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-apply-title"
      >
        {/* HEADER */}
        <header className="se-leave-apply-v2-head">
          <div className="se-leave-apply-v2-head-icon">
            <span>＋</span>
          </div>

          <div className="se-leave-apply-v2-head-copy">
            <span>NEW LEAVE REQUEST</span>

            <h2 id="leave-apply-title">
              Apply for leave
            </h2>
          </div>

          <button
            type="button"
            className="se-leave-apply-v2-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <form
          className="se-leave-apply-v2-form"
          onSubmit={handleSubmit}
        >
          {/* LEAVE TYPE */}
          <section className="se-leave-apply-v2-section">
            <div className="se-leave-apply-v2-section-title">
              <span>01</span>

              <div>
                <strong>
                  Leave details
                </strong>

                <small>
                  Select leave type and duration
                </small>
              </div>
            </div>

            <div className="se-leave-apply-v2-grid">
              <div className="se-leave-apply-v2-field">
                <label htmlFor="leave-type">
                  Leave Type
                </label>

                <select
                  id="leave-type"
                  value={
                    form.leaveTypeId
                  }
                  onChange={(event) =>
                    handleLeaveTypeChange(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Select leave type
                  </option>

                  {types.map((type) => (
                    <option
                      key={type._id}
                      value={type._id}
                    >
                      {type.code
                        ? `${type.code} · `
                        : ""}
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="se-leave-apply-v2-field">
                <label htmlFor="leave-duration">
                  Duration
                </label>

                <select
                  id="leave-duration"
                  value={
                    form.durationType
                  }
                  onChange={(event) =>
                    update(
                      "durationType",
                      event.target.value
                    )
                  }
                >
                  <option value="FULL_DAY">
                    Full Day
                  </option>

                  {selectedType
                    ?.allowHalfDay ? (
                    <>
                      <option value="FIRST_HALF">
                        Half Day · First Half
                      </option>

                      <option value="SECOND_HALF">
                        Half Day · Second Half
                      </option>
                    </>
                  ) : null}

                  {shortLeaveConfig ? (
                    <option
                      value={
                        shortLeaveConfig.value
                      }
                    >
                      Short Leave
                    </option>
                  ) : null}
                </select>
              </div>
            </div>

            {selectedType ? (
              <div className="se-leave-apply-v2-balance">
                <div>
                  <span>AVAILABLE</span>

                  <strong>
                    {available === null
                      ? "—"
                      : formatDays(
                          available
                        )}
                  </strong>

                  <small>days</small>
                </div>

                <div>
                  <span>REQUESTING</span>

                  <strong>
                    {formatDays(
                      estimatedDays
                    )}
                  </strong>

                  <small>
                    {isShortLeave
                      ? "short leave"
                      : "days"}
                  </small>
                </div>

                <div>
                  <span>
                    AFTER REQUEST
                  </span>

                  <strong>
                    {available === null
                      ? "—"
                      : formatDays(
                          available -
                            estimatedDays
                        )}
                  </strong>

                  <small>days</small>
                </div>
              </div>
            ) : null}
          </section>

          {/* DATES */}
          <section className="se-leave-apply-v2-section">
            <div className="se-leave-apply-v2-section-title">
              <span>02</span>

              <div>
                <strong>
                  Leave period
                </strong>

                <small>
                  Choose the required date
                  range
                </small>
              </div>
            </div>

            <div className="se-leave-apply-v2-grid">
              <div className="se-leave-apply-v2-field">
                <label htmlFor="leave-from">
                  From Date
                </label>

                <input
                  id="leave-from"
                  type="date"
                  value={
                    form.fromDate
                  }
                  onChange={(event) =>
                    update(
                      "fromDate",
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="se-leave-apply-v2-field">
                <label htmlFor="leave-to">
                  To Date
                </label>

                <input
                  id="leave-to"
                  type="date"
                  value={
                    form.toDate
                  }
                  disabled={
                    isHalfDay ||
                    isShortLeave
                  }
                  onChange={(event) =>
                    update(
                      "toDate",
                      event.target.value
                    )
                  }
                />
              </div>
            </div>

            {(isHalfDay ||
              isShortLeave) ? (
              <div className="se-leave-apply-v2-info">
                <span>i</span>

                <p>
                  {isShortLeave
                    ? "Short leave applies to a single date."
                    : "Half-day leave applies to a single date."}
                </p>
              </div>
            ) : null}
          </section>

          {/* REASON */}
          <section className="se-leave-apply-v2-section">
            <div className="se-leave-apply-v2-section-title">
              <span>03</span>

              <div>
                <strong>
                  Reason & contact
                </strong>

                <small>
                  Add request information
                </small>
              </div>
            </div>

            <div className="se-leave-apply-v2-field se-leave-apply-v2-field--full">
              <label htmlFor="leave-reason">
                Reason
              </label>

              <textarea
                id="leave-reason"
                rows="3"
                maxLength="2000"
                placeholder="Enter the reason for your leave"
                value={form.reason}
                onChange={(event) =>
                  update(
                    "reason",
                    event.target.value
                  )
                }
              />

              <div className="se-leave-apply-v2-char">
                {form.reason.length}
                /2000
              </div>
            </div>

            <div className="se-leave-apply-v2-field se-leave-apply-v2-field--full">
              <label htmlFor="leave-contact">
                Contact During Leave
                <span>Optional</span>
              </label>

              <input
                id="leave-contact"
                type="text"
                value={
                  form.contactDuringLeave
                }
                onChange={(event) =>
                  update(
                    "contactDuringLeave",
                    event.target.value
                  )
                }
                placeholder="Phone or other contact information"
              />
            </div>

            <label className="se-leave-apply-v2-emergency">
              <input
                type="checkbox"
                checked={
                  form.emergency
                }
                onChange={(event) =>
                  update(
                    "emergency",
                    event.target.checked
                  )
                }
              />

              <span className="se-leave-apply-v2-checkmark">
                ✓
              </span>

              <span>
                <strong>
                  Emergency request
                </strong>

                <small>
                  Mark only when immediate
                  attention is required
                </small>
              </span>
            </label>

            {form.emergency ? (
              <div className="se-leave-apply-v2-field se-leave-apply-v2-field--full">
                <label htmlFor="leave-emergency">
                  Emergency Details
                </label>

                <textarea
                  id="leave-emergency"
                  rows="2"
                  value={
                    form.emergencyReason
                  }
                  onChange={(event) =>
                    update(
                      "emergencyReason",
                      event.target.value
                    )
                  }
                  placeholder="Briefly explain the emergency"
                />
              </div>
            ) : null}
          </section>

          {error ? (
            <div className="se-leave-apply-v2-error">
              <span>!</span>
              {error}
            </div>
          ) : null}

          <footer className="se-leave-apply-v2-footer">
            <button
              type="button"
              className="se-leave-apply-v2-cancel"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="se-leave-apply-v2-submit"
              disabled={submitting}
            >
              <span>
                {submitting
                  ? "Submitting..."
                  : "Submit Request"}
              </span>

              {!submitting ? (
                <span>→</span>
              ) : null}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default LeaveApplyModal;
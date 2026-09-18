import React, {
  useState,
} from "react";

function LeaveBalanceAdmin({
  types = [],
  submitting = false,
  onSubmit,
}) {
  const [form, setForm] =
    useState({
      employeeId: "",
      leaveTypeId: "",
      year:
        new Date()
          .getFullYear(),
      quantity: "",
      reason: "",
      effectiveDate: "",
      reference: "",
    });

  const [error, setError] =
    useState("");

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

  const submit = async (
    event
  ) => {
    event.preventDefault();

    if (
      !form.employeeId.trim()
    ) {
      setError(
        "Employee ID is required."
      );
      return;
    }

    if (
      !form.leaveTypeId
    ) {
      setError(
        "Leave type is required."
      );
      return;
    }

    if (
      !Number(
        form.quantity
      )
    ) {
      setError(
        "Enter a non-zero adjustment."
      );
      return;
    }

    if (
      !form.reason.trim()
    ) {
      setError(
        "Adjustment reason is required."
      );
      return;
    }

    await onSubmit({
      ...form,
      quantity:
        Number(
          form.quantity
        ),
    });
  };

  return (
    <section className="se-leave-panel">
      <div className="se-leave-panel-head">
        <div>
          <span className="se-leave-section-label">
            ADMINISTRATION
          </span>

          <h2>
            Balance adjustment
          </h2>
        </div>
      </div>

      <div className="se-leave-admin-notice">
        <strong>
          Audited operation
        </strong>

        <p>
          Every balance
          adjustment is recorded
          in the employee's leave
          transaction history.
        </p>
      </div>

      <form
        className="se-leave-admin-form"
        onSubmit={submit}
      >
        <div className="se-leave-field">
          <label htmlFor="leave-admin-employee">
            Employee ID
          </label>

          <input
            id="leave-admin-employee"
            type="text"
            placeholder="Employee MongoDB ID"
            value={
              form.employeeId
            }
            onChange={(
              event
            ) =>
              update(
                "employeeId",
                event.target
                  .value
              )
            }
          />
        </div>

        <div className="se-leave-field">
          <label htmlFor="leave-admin-type">
            Leave type
          </label>

          <select
            id="leave-admin-type"
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

        <div className="se-leave-field">
          <label htmlFor="leave-admin-year">
            Year
          </label>

          <input
            id="leave-admin-year"
            type="number"
            value={
              form.year
            }
            onChange={(
              event
            ) =>
              update(
                "year",
                event.target
                  .value
              )
            }
          />
        </div>

        <div className="se-leave-field">
          <label htmlFor="leave-admin-quantity">
            Adjustment
          </label>

          <input
            id="leave-admin-quantity"
            type="number"
            step="0.5"
            placeholder="+1 or -1"
            value={
              form.quantity
            }
            onChange={(
              event
            ) =>
              update(
                "quantity",
                event.target
                  .value
              )
            }
          />
        </div>

        <div className="se-leave-field se-leave-field--full">
          <label htmlFor="leave-admin-reason">
            Reason
          </label>

          <textarea
            id="leave-admin-reason"
            rows="3"
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

        {error ? (
          <div className="se-leave-form-error se-leave-field--full">
            {error}
          </div>
        ) : null}

        <div className="se-leave-admin-submit se-leave-field--full">
          <button
            type="submit"
            className="se-leave-btn se-leave-btn--primary"
            disabled={
              submitting
            }
          >
            {submitting
              ? "Saving..."
              : "Save Adjustment"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default LeaveBalanceAdmin;
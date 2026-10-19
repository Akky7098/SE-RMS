import React, {
  useState,
} from "react";

const PayrollAdjustmentModal = ({
  open,
  employee,
  payrollMonth,
  loading = false,
  onClose,
  onSubmit,
}) => {
  const [type, setType] =
    useState("BONUS");

  const [amount, setAmount] =
    useState("");

  const [reason, setReason] =
    useState("");

  if (!open) return null;

  const submit = (event) => {
    event.preventDefault();

    onSubmit?.({
      employeeId:
        employee?.employeeId ||
        employee?._id,

      payrollMonth,

      type,

      amount:
        Number(amount),

      reason,
    });
  };

  return (
    <div className="se-payroll-modal-backdrop">
      <div className="se-payroll-modal">
        <div className="se-payroll-modal__header">
          <div>
            <h2>
              Payroll Adjustment
            </h2>

            <p>
              {employee?.employeeName ||
                employee?.fullName ||
                "Employee"}
            </p>
          </div>

          <button
            type="button"
            className="se-payroll-modal__close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="se-payroll-form-grid">
            <label className="se-payroll-form-full">
              <span>
                Adjustment Type
              </span>

              <select
                value={type}
                onChange={(event) =>
                  setType(
                    event.target.value
                  )
                }
              >
                <option value="BONUS">
                  Bonus
                </option>

                <option value="INCENTIVE">
                  Incentive
                </option>

                <option value="ARREAR">
                  Arrear
                </option>

                <option value="REIMBURSEMENT">
                  Reimbursement
                </option>

                <option value="OTHER_EARNING">
                  Other Earning
                </option>

                <option value="OTHER_DEDUCTION">
                  Other Deduction
                </option>

                <option value="ADVANCE_RECOVERY">
                  Advance Recovery
                </option>

                <option value="LOAN_RECOVERY">
                  Loan Recovery
                </option>
              </select>
            </label>

            <label className="se-payroll-form-full">
              <span>Amount</span>

              <input
                type="number"
                min="0"
                required
                value={amount}
                onChange={(event) =>
                  setAmount(
                    event.target.value
                  )
                }
              />
            </label>

            <label className="se-payroll-form-full">
              <span>Reason</span>

              <textarea
                rows="3"
                required
                value={reason}
                onChange={(event) =>
                  setReason(
                    event.target.value
                  )
                }
              />
            </label>
          </div>

          <div className="se-payroll-modal__footer">
            <button
              type="button"
              className="se-payroll-btn se-payroll-btn--secondary"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="se-payroll-btn se-payroll-btn--primary"
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : "Add Adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PayrollAdjustmentModal;
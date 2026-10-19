import React from "react";

const PayrollConfirmModal = ({
  open,
  title,
  message,
  confirmText = "Confirm",
  danger = false,
  loading = false,
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <div className="se-payroll-modal-backdrop">
      <div className="se-payroll-modal se-payroll-modal--confirm">
        <div className="se-payroll-confirm-icon">
          {danger ? "!" : "✓"}
        </div>

        <h2>
          {title}
        </h2>

        <p>
          {message}
        </p>

        <div className="se-payroll-modal__footer">
          <button
            type="button"
            className="se-payroll-btn se-payroll-btn--secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="button"
            className={
              danger
                ? "se-payroll-btn se-payroll-btn--danger"
                : "se-payroll-btn se-payroll-btn--primary"
            }
            onClick={onConfirm}
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayrollConfirmModal;
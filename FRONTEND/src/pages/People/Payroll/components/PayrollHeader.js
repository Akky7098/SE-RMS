import React from "react";

const normalizeStatus = (value = "") =>
  String(value)
    .trim()
    .toUpperCase();

const PayrollHeader = ({
  payrollMonth,
  onMonthChange,
  onCreateRun,
  onRefresh,
  onOpenSettings,
  onGenerate,
  activeRun = null,
  refreshing = false,
  actionLoading = false,
}) => {
  const status = normalizeStatus(
    activeRun?.status
  );

  const isLocked =
    activeRun?.locked === true ||
    status === "FINALIZED" ||
    status === "LOCKED";

  const canGenerate =
    Boolean(activeRun?._id) &&
    !isLocked &&
    ![
      "UNDER_REVIEW",
      "SUBMITTED",
      "APPROVED",
    ].includes(status);

  const generateLabel =
    actionLoading
      ? "Generating..."
      : status === "GENERATED"
      ? "Regenerate Payroll"
      : "Generate Payroll";

  return (
    <header className="se-payroll-header se-payroll-header--premium">
      <div className="se-payroll-header__copy">
        <span className="se-payroll-eyebrow">
          PEOPLE · PAYROLL
        </span>

        <h1>
          Payroll
        </h1>

      </div>

      <div className="se-payroll-header__right">
        <label className="se-payroll-month-control">
          <span>
            Payroll Month
          </span>

          <input
            type="month"
            value={
              payrollMonth || ""
            }
            onChange={(event) =>
              onMonthChange?.(
                event.target.value
              )
            }
          />
        </label>

        <div className="se-payroll-header__actions">
          <button
            type="button"
            className="se-payroll-btn se-payroll-btn--secondary se-payroll-header-btn"
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh payroll data"
          >
            <span className="se-payroll-header-btn__icon">
              ↻
            </span>

            <span>
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </span>
          </button>

          <button
            type="button"
            className="se-payroll-btn se-payroll-btn--secondary se-payroll-header-btn"
            onClick={
              onOpenSettings
            }
            title="Payroll settings"
          >
            <span className="se-payroll-header-btn__icon">
              ⚙
            </span>

            <span>
              Settings
            </span>
          </button>

          <button
            type="button"
            className="se-payroll-btn se-payroll-btn--primary se-payroll-header-btn se-payroll-header-btn--create"
            onClick={
              onCreateRun
            }
            disabled={
              actionLoading
            }
          >
            <span className="se-payroll-header-btn__plus">
              +
            </span>

            <span>
              New Payroll
            </span>
          </button>

          <button
            type="button"
            className="se-payroll-btn se-payroll-btn--generate se-payroll-header-btn"
            onClick={() =>
              onGenerate?.(
                activeRun
              )
            }
            disabled={
              !canGenerate ||
              actionLoading
            }
            title={
              !activeRun
                ? "Create or select a payroll run first"
                : isLocked
                ? "Finalized payroll cannot be regenerated"
                : "Generate payroll using attendance and salary data"
            }
          >
            <span className="se-payroll-header-btn__icon">
              ₹
            </span>

            <span>
              {generateLabel}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default PayrollHeader;
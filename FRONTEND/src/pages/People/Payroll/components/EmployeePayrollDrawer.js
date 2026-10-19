import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   HELPERS
========================================================= */

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const number = (value) =>
  Number(value || 0);

const minutesLabel = (value) => {
  const total =
    Number(value || 0);

  if (!total) return "—";

  const hours =
    Math.floor(total / 60);

  const minutes =
    total % 60;

  if (!hours) {
    return `${minutes}m`;
  }

  if (!minutes) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
};

const initials = (name = "") =>
  String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "E";

const statusLabel = (value) =>
  String(value || "—")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );

const earningRows = (
  payroll = {}
) => {
  const source =
    payroll.earnings || {};

  if (Array.isArray(source)) {
    return source.map(
      (item, index) => ({
        key:
          item.code ||
          item.name ||
          index,

        label:
          item.name ||
          item.code ||
          "Earning",

        amount:
          number(
            item.amount
          ),
      })
    );
  }

  const rows = [
    {
      key: "basic",
      label: "Basic Salary",
      amount:
        source.basic ??
        payroll.basic ??
        0,
    },
    {
      key: "hra",
      label: "HRA",
      amount:
        source.hra ??
        payroll.hra ??
        0,
    },
    {
      key: "conveyance",
      label: "Conveyance",
      amount:
        source.conveyance ??
        payroll.conveyance ??
        0,
    },
    {
      key: "other",
      label: "Other Allowance",
      amount:
        source.other ??
        source.otherAllowance ??
        payroll.otherAllowance ??
        0,
    },
    {
      key: "overtime",
      label: "Overtime",
      amount:
        source.overtime ??
        source.overtimeAmount ??
        payroll.overtimeAmount ??
        0,
    },
    {
      key: "bonus",
      label: "Bonus",
      amount:
        source.bonus ??
        payroll.bonus ??
        0,
    },
    {
      key: "incentive",
      label: "Incentive",
      amount:
        source.incentive ??
        payroll.incentive ??
        0,
    },
    {
      key: "arrear",
      label: "Arrear",
      amount:
        source.arrear ??
        payroll.arrear ??
        0,
    },
    {
      key: "otherEarning",
      label: "Other Earning",
      amount:
        source.otherEarning ??
        payroll.otherEarning ??
        0,
    },
  ];

  return rows.filter(
    (row) =>
      row.amount !== 0 ||
      [
        "basic",
        "hra",
        "conveyance",
        "other",
      ].includes(row.key)
  );
};

const deductionRows = (
  payroll = {}
) => {
  const source =
    payroll.deductions || {};

  if (Array.isArray(source)) {
    return source.map(
      (item, index) => ({
        key:
          item.code ||
          item.name ||
          index,

        label:
          item.name ||
          item.code ||
          "Deduction",

        amount:
          number(
            item.amount
          ),
      })
    );
  }

  return [
    {
      key: "pf",
      label: "PF",
      amount:
        source.pf ??
        payroll.pf ??
        0,
    },
    {
      key: "esi",
      label: "ESI",
      amount:
        source.esi ??
        payroll.esi ??
        0,
    },
    {
      key: "professionalTax",
      label:
        "Professional Tax",
      amount:
        source.professionalTax ??
        source.pt ??
        payroll.professionalTax ??
        0,
    },
    {
      key: "tds",
      label: "TDS",
      amount:
        source.tds ??
        payroll.tds ??
        0,
    },
    {
      key: "lop",
      label: "LOP Deduction",
      amount:
        source.lop ??
        source.lopDeduction ??
        payroll.lopDeduction ??
        0,
    },
    {
      key: "advance",
      label:
        "Advance Recovery",
      amount:
        source.advanceRecovery ??
        payroll.advanceRecovery ??
        0,
    },
    {
      key: "loan",
      label:
        "Loan Recovery",
      amount:
        source.loanRecovery ??
        payroll.loanRecovery ??
        0,
    },
    {
      key: "other",
      label:
        "Other Deduction",
      amount:
        source.other ??
        source.otherDeduction ??
        payroll.otherDeduction ??
        0,
    },
  ].filter(
    (row) =>
      row.amount !== 0
  );
};

/* =========================================================
   COMPONENT
========================================================= */

const EmployeePayrollDrawer = ({
  open,
  record,
  loading = false,
  saving = false,
  locked = false,
  onClose,
  onSaveReview,
  onAddAdjustment,
  onSalaryStructure,
}) => {
  const attendance =
    record?.attendanceSnapshot ||
    record?.attendance ||
    {};

  const payroll =
    record?.money ||
    record?.payroll ||
    {};

  const employee =
    record?.employeeSnapshot ||
    record?.employee ||
    {};

  const exceptions =
    Array.isArray(
      record?.exceptions
    )
      ? record.exceptions
      : [];

  const [review, setReview] =
    useState({
      approvedOvertimeMinutes:
        0,

      remarks: "",
    });

  useEffect(() => {
    if (!record) return;

    setReview({
      approvedOvertimeMinutes:
        number(
          attendance
            .approvedOvertimeMinutes
        ),

      remarks:
        record.reviewRemarks ||
        record.remarks ||
        "",
    });
  }, [
    record,
    attendance
      .approvedOvertimeMinutes,
  ]);

  const earnings =
    useMemo(
      () =>
        earningRows(
          payroll
        ),
      [payroll]
    );

  const deductions =
    useMemo(
      () =>
        deductionRows(
          payroll
        ),
      [payroll]
    );

  const gross =
    number(
      payroll.grossEarnings ??
      payroll.grossPay
    );

  const totalDeductions =
    number(
      payroll.totalDeductions
    );

  const netPay =
    number(
      payroll.netPay
    );

  if (!open) {
    return null;
  }

  const employeeName =
    employee.employeeName ||
    employee.fullName ||
    record?.employeeName ||
    "Employee";

  const employeeCode =
    employee.employeeCode ||
    record?.employeeCode ||
    "—";

  const detectedOT =
    number(
      attendance
        .overtimeMinutes ??
      attendance
        .detectedOvertimeMinutes
    );

  const saveReview = () => {
    onSaveReview?.({
      approvedOvertimeMinutes:
        number(
          review
            .approvedOvertimeMinutes
        ),

      remarks:
        review.remarks,
    });
  };

  return (
    <div
      className="se-payroll-drawer-backdrop"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose?.();
        }
      }}
    >
      <aside className="se-payroll-drawer">
        <header className="se-payroll-drawer__header">
          <div className="se-payroll-drawer-person">
            <span className="se-payroll-drawer-avatar">
              {initials(
                employeeName
              )}
            </span>

            <div>
              <span className="se-payroll-eyebrow">
                EMPLOYEE PAYROLL
              </span>

              <h2>
                {employeeName}
              </h2>

              <p>
                {employeeCode}

                {employee.designation
                  ? ` · ${employee.designation}`
                  : ""}

                {employee.departmentName
                  ? ` · ${employee.departmentName}`
                  : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="se-payroll-drawer__close"
            onClick={onClose}
            aria-label="Close payroll details"
          >
            ×
          </button>
        </header>

        <div className="se-payroll-drawer__body">
          {loading ? (
            <div className="se-payroll-drawer-loading">
              Loading employee
              payroll...
            </div>
          ) : (
            <>
              {/* =========================
                  TOP STATUS
              ========================== */}

              <section className="se-payroll-employee-status">
                <div>
                  <span>
                    Payroll Status
                  </span>

                  <strong>
                    {statusLabel(
                      record?.status
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Payable Days
                  </span>

                  <strong>
                    {attendance
                      .payableDays ??
                      0}
                  </strong>
                </div>

                <div>
                  <span>
                    Gross
                  </span>

                  <strong>
                    {money(
                      gross
                    )}
                  </strong>
                </div>

                <div className="is-net">
                  <span>
                    Net Pay
                  </span>

                  <strong>
                    {money(
                      netPay
                    )}
                  </strong>
                </div>
              </section>

              {/* =========================
                  EMPLOYEE / STRUCTURE
              ========================== */}

              <section className="se-payroll-drawer-section">
                <div className="se-payroll-drawer-section__head">
                  <div>
                    <h3>
                      Salary Structure
                    </h3>

                    <p>
                      Current compensation
                      used for this payroll.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="se-payroll-text-btn"
                    onClick={() =>
                      onSalaryStructure?.(
                        record
                      )
                    }
                  >
                    View Structure
                  </button>
                </div>

                <div className="se-payroll-structure-grid">
                  {earnings
                    .filter((item) =>
                      [
                        "basic",
                        "hra",
                        "conveyance",
                        "other",
                      ].includes(
                        item.key
                      )
                    )
                    .map((item) => (
                      <div
                        key={
                          item.key
                        }
                      >
                        <span>
                          {
                            item.label
                          }
                        </span>

                        <strong>
                          {money(
                            item.amount
                          )}
                        </strong>
                      </div>
                    ))}
                </div>
              </section>

              {/* =========================
                  ATTENDANCE
              ========================== */}

              <section className="se-payroll-drawer-section">
                <div className="se-payroll-drawer-section__head">
                  <div>
                    <h3>
                      Attendance
                    </h3>

                    <p>
                      Attendance snapshot
                      used in payroll
                      calculation.
                    </p>
                  </div>
                </div>

                <div className="se-payroll-attendance-grid">
                  <div>
                    <span>
                      Present
                    </span>

                    <strong>
                      {attendance
                        .presentDays ??
                        0}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Absent
                    </span>

                    <strong>
                      {attendance
                        .absentDays ??
                        0}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Paid Leave
                    </span>

                    <strong>
                      {attendance
                        .paidLeaveDays ??
                        attendance
                          .leaveDays ??
                        0}
                    </strong>
                  </div>

                  <div>
                    <span>
                      LOP
                    </span>

                    <strong>
                      {attendance
                        .lopDays ??
                        0}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Week Off
                    </span>

                    <strong>
                      {attendance
                        .weekOffDays ??
                        0}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Holidays
                    </span>

                    <strong>
                      {attendance
                        .holidayDays ??
                        0}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Half Days
                    </span>

                    <strong>
                      {attendance
                        .halfDays ??
                        attendance
                          .halfDayCount ??
                        0}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Payable
                    </span>

                    <strong>
                      {attendance
                        .payableDays ??
                        0}
                    </strong>
                  </div>
                </div>
              </section>

              {/* =========================
                  WORKING TIME / OT
              ========================== */}

              <section className="se-payroll-drawer-section">
                <div className="se-payroll-drawer-section__head">
                  <div>
                    <h3>
                      Working Time &
                      Overtime
                    </h3>

                    <p>
                      Review overtime
                      before payroll is
                      locked.
                    </p>
                  </div>
                </div>

                <div className="se-payroll-time-summary">
                  <div>
                    <span>
                      Working Time
                    </span>

                    <strong>
                      {minutesLabel(
                        attendance
                          .totalWorkingMinutes
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Late Days
                    </span>

                    <strong>
                      {attendance
                        .lateDays ??
                        attendance
                          .lateCount ??
                        0}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Missing Checkout
                    </span>

                    <strong>
                      {attendance
                        .missingCheckoutCount ??
                        0}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Detected OT
                    </span>

                    <strong>
                      {minutesLabel(
                        detectedOT
                      )}
                    </strong>
                  </div>
                </div>

                <div className="se-payroll-review-form">
                  <label>
                    <span>
                      Approved OT
                      (minutes)
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={
                        review
                          .approvedOvertimeMinutes
                      }
                      disabled={
                        locked
                      }
                      onChange={(
                        event
                      ) =>
                        setReview(
                          (
                            current
                          ) => ({
                            ...current,

                            approvedOvertimeMinutes:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                    />

                    <small>
                      Detected:{" "}
                      {minutesLabel(
                        detectedOT
                      )}
                    </small>
                  </label>

                  <label>
                    <span>
                      HR Review Note
                    </span>

                    <textarea
                      rows="3"
                      value={
                        review
                          .remarks
                      }
                      disabled={
                        locked
                      }
                      placeholder="Optional review note"
                      onChange={(
                        event
                      ) =>
                        setReview(
                          (
                            current
                          ) => ({
                            ...current,

                            remarks:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                    />
                  </label>
                </div>
              </section>

              {/* =========================
                  EARNINGS + DEDUCTIONS
              ========================== */}

              <section className="se-payroll-drawer-section">
                <div className="se-payroll-drawer-section__head">
                  <div>
                    <h3>
                      Salary Calculation
                    </h3>

                    <p>
                      Earnings and
                      deductions for the
                      selected month.
                    </p>
                  </div>

                  {!locked && (
                    <button
                      type="button"
                      className="se-payroll-text-btn"
                      onClick={() =>
                        onAddAdjustment?.(
                          record
                        )
                      }
                    >
                      + Adjustment
                    </button>
                  )}
                </div>

                <div className="se-payroll-money-columns">
                  <div className="se-payroll-money-card">
                    <div className="se-payroll-money-card__title">
                      Earnings
                    </div>

                    {earnings.map(
                      (item) => (
                        <div
                          className="se-payroll-money-row"
                          key={
                            item.key
                          }
                        >
                          <span>
                            {
                              item.label
                            }
                          </span>

                          <strong>
                            {money(
                              item.amount
                            )}
                          </strong>
                        </div>
                      )
                    )}

                    <div className="se-payroll-money-total">
                      <span>
                        Gross
                      </span>

                      <strong>
                        {money(
                          gross
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="se-payroll-money-card">
                    <div className="se-payroll-money-card__title">
                      Deductions
                    </div>

                    {deductions.length ? (
                      deductions.map(
                        (item) => (
                          <div
                            className="se-payroll-money-row"
                            key={
                              item.key
                            }
                          >
                            <span>
                              {
                                item.label
                              }
                            </span>

                            <strong>
                              {money(
                                item.amount
                              )}
                            </strong>
                          </div>
                        )
                      )
                    ) : (
                      <div className="se-payroll-money-empty">
                        No deductions
                      </div>
                    )}

                    <div className="se-payroll-money-total">
                      <span>
                        Total
                      </span>

                      <strong>
                        {money(
                          totalDeductions
                        )}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="se-payroll-final-pay">
                  <span>
                    Net Payable
                  </span>

                  <strong>
                    {money(
                      netPay
                    )}
                  </strong>
                </div>
              </section>

              {/* =========================
                  EXCEPTIONS
              ========================== */}

              <section className="se-payroll-drawer-section">
                <div className="se-payroll-drawer-section__head">
                  <div>
                    <h3>
                      Exceptions
                    </h3>

                    <p>
                      Items requiring HR
                      attention before
                      finalization.
                    </p>
                  </div>

                  <span
                    className={
                      exceptions.length
                        ? "se-payroll-exception-count is-warning"
                        : "se-payroll-exception-count"
                    }
                  >
                    {
                      exceptions.length
                    }
                  </span>
                </div>

                {exceptions.length ? (
                  <div className="se-payroll-exception-list">
                    {exceptions.map(
                      (
                        exception,
                        index
                      ) => {
                        const title =
                          typeof exception ===
                          "string"
                            ? exception
                            : exception.title ||
                              exception.code ||
                              exception.type ||
                              "Payroll Exception";

                        const detail =
                          typeof exception ===
                          "object"
                            ? exception.message ||
                              exception.description ||
                              ""
                            : "";

                        return (
                          <div
                            key={`${title}-${index}`}
                            className="se-payroll-exception-item"
                          >
                            <span>
                              !
                            </span>

                            <div>
                              <strong>
                                {statusLabel(
                                  title
                                )}
                              </strong>

                              {detail && (
                                <p>
                                  {
                                    detail
                                  }
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="se-payroll-no-exceptions">
                    <strong>
                      No payroll
                      exceptions
                    </strong>

                    <span>
                      This employee is
                      clear for payroll
                      review.
                    </span>
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {!loading && (
          <footer className="se-payroll-drawer__footer">
            <div>
              {locked ? (
                <span className="se-payroll-lock-note">
                  Payroll is finalized
                  and locked.
                </span>
              ) : (
                <span className="se-payroll-save-note">
                  Review changes are
                  recalculated by the
                  backend.
                </span>
              )}
            </div>

            <div className="se-payroll-drawer__footer-actions">
              <button
                type="button"
                className="se-payroll-btn se-payroll-btn--secondary"
                onClick={onClose}
              >
                Close
              </button>

              {!locked && (
                <button
                  type="button"
                  className="se-payroll-btn se-payroll-btn--primary"
                  disabled={saving}
                  onClick={
                    saveReview
                  }
                >
                  {saving
                    ? "Saving..."
                    : "Save Review"}
                </button>
              )}
            </div>
          </footer>
        )}
      </aside>
    </div>
  );
};

export default EmployeePayrollDrawer;
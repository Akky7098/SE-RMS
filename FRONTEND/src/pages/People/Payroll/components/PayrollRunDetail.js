import React from "react";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(
    Number(value || 0)
  );

const prettyStatus = (
  value = ""
) =>
  String(value || "DRAFT")
    .replaceAll("_", " ");

const formatPeriod = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
};

const PayrollRunDetail = ({
  run,
  busy = false,
  onSubmit,
  onApprove,
  onFinalize,
}) => {
  if (!run) {
    return null;
  }

  const status =
    String(
      run.status || "DRAFT"
    ).toUpperCase();

  const locked =
    run.locked === true ||
    status === "FINALIZED" ||
    status === "LOCKED";

  const employees =
    Number(
      run.employeeCount ??
        run.summary
          ?.employeeCount ??
        run.summary
          ?.employees ??
        run.totalEmployees ??
        0
    );

  const gross =
    Number(
      run.grossEarnings ??
        run.summary
          ?.grossEarnings ??
        run.summary
          ?.gross ??
        0
    );

  const deductions =
    Number(
      run.totalDeductions ??
        run.summary
          ?.totalDeductions ??
        run.summary
          ?.deductions ??
        0
    );

  const net =
    Number(
      run.netPayroll ??
        run.netPay ??
        run.summary
          ?.netPayroll ??
        run.summary
          ?.netPay ??
        0
    );

  const canSubmit =
    status === "GENERATED" &&
    !locked;

  const canApprove =
    [
      "SUBMITTED",
      "UNDER_REVIEW",
    ].includes(status) &&
    !locked;

  const canFinalize =
    status === "APPROVED" &&
    !locked;

  return (
    <section className="se-payroll-run-detail se-payroll-run-detail--compact">
      <div className="se-payroll-run-detail__top">
        <div className="se-payroll-run-detail__identity">
          <span className="se-payroll-eyebrow">
            ACTIVE PAYROLL
          </span>

          <div className="se-payroll-run-detail__title-row">
            <h2>
              {run.payrollMonth ||
                "Payroll"}
            </h2>

            <span
              className={`se-payroll-status se-payroll-status--${status.toLowerCase()}`}
            >
              {prettyStatus(
                status
              )}
            </span>
          </div>

          <p>
            {formatPeriod(
              run.periodStart
            )}
            {" — "}
            {formatPeriod(
              run.periodEnd
            )}

            {run.companyCode
              ? ` · ${run.companyCode}`
              : ""}
          </p>
        </div>

        <div className="se-payroll-run-detail__workflow">
          {canSubmit && (
            <button
              type="button"
              className="se-payroll-btn se-payroll-btn--primary"
              disabled={busy}
              onClick={() =>
                onSubmit?.(
                  run
                )
              }
            >
              Submit for Review
            </button>
          )}

          {canApprove && (
            <button
              type="button"
              className="se-payroll-btn se-payroll-btn--success"
              disabled={busy}
              onClick={() =>
                onApprove?.(
                  run
                )
              }
            >
              Approve Payroll
            </button>
          )}

          {canFinalize && (
            <button
              type="button"
              className="se-payroll-btn se-payroll-btn--dark"
              disabled={busy}
              onClick={() =>
                onFinalize?.(
                  run
                )
              }
            >
              Finalize & Lock
            </button>
          )}

          {locked && (
            <div className="se-payroll-locked">
              <strong>
                Payroll Locked
              </strong>

              <span>
                Final calculation
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="se-payroll-run-detail__metrics">
        <div>
          <span>
            Employees
          </span>

          <strong>
            {employees}
          </strong>
        </div>

        <div>
          <span>
            Gross
          </span>

          <strong>
            {money(gross)}
          </strong>
        </div>

        <div>
          <span>
            Deductions
          </span>

          <strong>
            {money(
              deductions
            )}
          </strong>
        </div>

        <div>
          <span>
            Net Pay
          </span>

          <strong className="se-payroll-run-net">
            {money(net)}
          </strong>
        </div>
      </div>
    </section>
  );
};

export default PayrollRunDetail;
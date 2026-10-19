import React from "react";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const monthLabel = (value) => {
  if (!value) return "—";

  const [year, month] =
    String(value).split("-");

  const date = new Date(
    Number(year),
    Number(month) - 1,
    1
  );

  return date.toLocaleDateString(
    "en-IN",
    {
      month: "long",
      year: "numeric",
    }
  );
};

const statusLabel = (status) =>
  String(status || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (value) =>
      value.toUpperCase()
    );

const PayrollRunTable = ({
  runs = [],
  loading = false,
  selectedRunId,
  onOpen,
}) => {
  return (
    <section className="se-payroll-panel">
      <div className="se-payroll-panel__header">
        <div>
          <h2>Payroll Runs</h2>
        </div>

        <span className="se-payroll-count">
          {runs.length}
        </span>
      </div>

      <div className="se-payroll-table-wrap">
        <table className="se-payroll-table">
          <thead>
            <tr>
              <th>Payroll Month</th>
              <th>Status</th>
              <th>Employees</th>
              <th>Exceptions</th>
              <th>Gross</th>
              <th>Deductions</th>
              <th>Net Payroll</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan="8"
                  className="se-payroll-empty"
                >
                  Loading payroll...
                </td>
              </tr>
            ) : runs.length === 0 ? (
              <tr>
                <td
                  colSpan="8"
                  className="se-payroll-empty"
                >
                  No payroll runs found.
                </td>
              </tr>
            ) : (
              runs.map((run) => {
                const active =
                  String(selectedRunId) ===
                  String(run._id);

                return (
                  <tr
                    key={run._id}
                    className={
                      active
                        ? "is-selected"
                        : ""
                    }
                    onClick={() =>
                      onOpen?.(run)
                    }
                  >
                    <td>
                      <strong>
                        {monthLabel(
                          run.payrollMonth
                        )}
                      </strong>

                      <small>
                        {run.companyCode}
                      </small>
                    </td>

                    <td>
                      <span
                        className={`se-payroll-status se-payroll-status--${String(
                          run.status || ""
                        ).toLowerCase()}`}
                      >
                        {statusLabel(
                          run.status
                        )}
                      </span>
                    </td>

                    <td>
                      {run.employeeCount ?? 0}
                    </td>

                    <td>
                      <span
                        className={
                          Number(
                            run.exceptionCount ||
                              0
                          ) > 0
                            ? "se-payroll-exception-count is-warning"
                            : "se-payroll-exception-count"
                        }
                      >
                        {run.exceptionCount ??
                          0}
                      </span>
                    </td>

                    <td>
                      {money(
                        run.totals
                          ?.grossEarnings
                      )}
                    </td>

                    <td>
                      {money(
                        run.totals
                          ?.totalDeductions
                      )}
                    </td>

                    <td>
                      <strong>
                        {money(
                          run.totals?.netPay
                        )}
                      </strong>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="se-payroll-row-open"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpen?.(run);
                        }}
                      >
                        →
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default PayrollRunTable;
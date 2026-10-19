import React, {
  useMemo,
  useState,
} from "react";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(
    Number(value || 0)
  );

const initials = (
  name = ""
) =>
  String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]
    )
    .join("")
    .toUpperCase() ||
  "E";

const statusLabel = (
  value
) =>
  String(
    value || "—"
  ).replaceAll(
    "_",
    " "
  );

const overtimeText = (
  minutes
) => {
  const total =
    Number(
      minutes || 0
    );

  if (
    !total ||
    total <= 0
  ) {
    return "—";
  }

  const hours =
    Math.floor(
      total / 60
    );

  const mins =
    total % 60;

  if (
    hours &&
    mins
  ) {
    return `${hours}h ${mins}m`;
  }

  if (hours) {
    return `${hours}h`;
  }

  return `${mins}m`;
};

const PayrollRegister = ({
  records = [],
  loading = false,
  onOpenEmployee,
  filter = "ALL",
  onFilterChange,
}) => {
  const [
    search,
    setSearch,
  ] = useState("");



  const normalizedRecords =
    Array.isArray(records)
      ? records
      : [];

  const filteredRecords =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      return normalizedRecords.filter(
        (record) => {
          const employee =
            record.employeeSnapshot ||
            {};

          const exceptions =
            Array.isArray(
              record.exceptions
            )
              ? record.exceptions
              : [];

          if (
            filter ===
              "EXCEPTION" &&
            exceptions.length ===
              0
          ) {
            return false;
          }

          if (
            filter ===
              "CLEAR" &&
            exceptions.length >
              0
          ) {
            return false;
          }

          if (!term) {
            return true;
          }

          const haystack = [
            employee.employeeName,
            employee.employeeCode,
            employee.designation,
            employee.departmentName,
            record.status,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(
            term
          );
        }
      );
    }, [
      normalizedRecords,
      search,
      filter,
    ]);

  const exceptionCount =
    useMemo(
      () =>
        normalizedRecords.filter(
          (record) =>
            Array.isArray(
              record.exceptions
            ) &&
            record
              .exceptions
              .length > 0
        ).length,
      [normalizedRecords]
    );

  return (
    <section className="se-payroll-panel se-payroll-register se-payroll-register--premium">
      <div className="se-payroll-register__header">
        <div className="se-payroll-register__heading">
          <div>

            <h2>
              Payroll Register
            </h2>
          </div>

          <span className="se-payroll-count se-payroll-register__count">
            {
              normalizedRecords.length
            }
          </span>
        </div>

        <div className="se-payroll-register__tools">
          <div className="se-payroll-register__search">
            <span>
              ⌕
            </span>

            <input
              type="search"
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event
                    .target
                    .value
                )
              }
              aria-label="Search payroll employees"
              placeholder="Search employee..."
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <select
            className={`se-payroll-register__filter${filter !== "ALL" ? " is-active" : ""}`}
            aria-label="Filter payroll employees"
            value={filter}
            onChange={(
              event
            ) =>
              onFilterChange?.(
                event
                  .target
                  .value
              )
            }
          >
            <option value="ALL">
              All Employees
            </option>

            <option value="EXCEPTION">
              Exceptions (
              {exceptionCount})
            </option>

            <option value="CLEAR">
              Clear
            </option>
          </select>
        </div>
      </div>

      <div className="se-payroll-register__meta">
        <span>
          Showing{" "}
          <strong>
            {
              filteredRecords.length
            }
          </strong>{" "}
          of{" "}
          <strong>
            {
              normalizedRecords.length
            }
          </strong>{" "}
          employees
        </span>

        {exceptionCount >
          0 && (
          <span className="se-payroll-register__issue-summary">
            {exceptionCount}{" "}
            employee
            {exceptionCount !==
            1
              ? "s"
              : ""}{" "}
            require review
          </span>
        )}
      </div>

      <div className="se-payroll-table-wrap se-payroll-register__table">
        <table className="se-payroll-table se-payroll-register-table">
          <colgroup>
            <col className="se-col-employee" />
            <col className="se-col-day" />
            <col className="se-col-day" />
            <col className="se-col-day" />
            <col className="se-col-ot" />
            <col className="se-col-money" />
            <col className="se-col-money" />
            <col className="se-col-money" />
            <col className="se-col-exception" />
            <col className="se-col-status" />
            <col className="se-col-action" />
          </colgroup>

          <thead>
            <tr>
              <th className="se-payroll-sticky-employee">
                Employee
              </th>

              <th className="se-payroll-cell--center">
                Payable
              </th>

              <th className="se-payroll-cell--center">
                Present
              </th>

              <th className="se-payroll-cell--center">
                LOP
              </th>

              <th className="se-payroll-cell--center">
                OT
              </th>

              <th className="se-payroll-cell--right">
                Gross
              </th>

              <th className="se-payroll-cell--right">
                Deduction
              </th>

              <th className="se-payroll-cell--right">
                Net Pay
              </th>

              <th>
                Exception
              </th>

              <th>
                Status
              </th>

              <th
                aria-label="Open"
              />
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan="11"
                  className="se-payroll-empty"
                >
                  <div className="se-payroll-register-loading">
                    <span className="se-payroll-spinner" />

                    <strong>
                      Calculating
                      payroll...
                    </strong>
                  </div>
                </td>
              </tr>
            ) : filteredRecords.length ===
              0 ? (
              <tr>
                <td
                  colSpan="11"
                  className="se-payroll-empty"
                >
                  {normalizedRecords.length ===
                  0
                    ? "Generate payroll to view employee calculations."
                    : "No employees match the current search or filter."}
                </td>
              </tr>
            ) : (
              filteredRecords.map(
                (
                  record
                ) => {
                  const employee =
                    record.employeeSnapshot ||
                    {};

                  const attendance =
                    record.attendanceSnapshot ||
                    {};

                  const payroll =
                    record.money ||
                    {};

                  const exceptions =
                    Array.isArray(
                      record.exceptions
                    )
                      ? record.exceptions
                      : [];

                  const hasException =
                    exceptions.length >
                    0;

                  return (
                    <tr
                      key={
                        record._id
                      }
                      className={
                        hasException
                          ? "se-payroll-register-row se-payroll-register-row--issue"
                          : "se-payroll-register-row"
                      }
                      onClick={() =>
                        onOpenEmployee?.(
                          record
                        )
                      }
                    >
                      <td className="se-payroll-sticky-employee">
                        <div className="se-payroll-person">
                          <span className="se-payroll-avatar">
                            {initials(
                              employee.employeeName
                            )}
                          </span>

                          <span className="se-payroll-person__info">
                            <strong title={
                              employee.employeeName ||
                              ""
                            }>
                              {employee.employeeName ||
                                "Employee"}
                            </strong>

                            <small>
                              <span>
                                {employee.employeeCode ||
                                  "—"}
                              </span>

                              {employee.designation && (
                                <>
                                  <i>
                                    ·
                                  </i>

                                  <span>
                                    {
                                      employee.designation
                                    }
                                  </span>
                                </>
                              )}
                            </small>
                          </span>
                        </div>
                      </td>

                      <td className="se-payroll-cell--center">
                        <strong className="se-payroll-day-value">
                          {attendance.payableDays ??
                            0}
                        </strong>
                      </td>

                      <td className="se-payroll-cell--center">
                        <span className="se-payroll-present-value">
                          {attendance.presentDays ??
                            0}
                        </span>
                      </td>

                      <td className="se-payroll-cell--center">
                        <span
                          className={
                            Number(
                              attendance.lopDays ||
                                0
                            ) >
                            0
                              ? "se-payroll-lop-value is-positive"
                              : "se-payroll-lop-value"
                          }
                        >
                          {attendance.lopDays ??
                            0}
                        </span>
                      </td>

                      <td className="se-payroll-cell--center">
                        {overtimeText(
                          attendance.approvedOvertimeMinutes
                        )}
                      </td>

                      <td className="se-payroll-cell--right se-payroll-money-cell">
                        {money(
                          payroll.grossEarnings
                        )}
                      </td>

                      <td className="se-payroll-cell--right se-payroll-money-cell">
                        {money(
                          payroll.totalDeductions
                        )}
                      </td>

                      <td className="se-payroll-cell--right se-payroll-money-cell">
                        <strong className="se-payroll-net-pay">
                          {money(
                            payroll.netPay
                          )}
                        </strong>
                      </td>

                      <td>
                        {hasException ? (
                          <span
                            className="se-payroll-exception"
                            title={exceptions
                              .map(
                                (
                                  item
                                ) =>
                                  typeof item ===
                                  "string"
                                    ? item
                                    : item?.message ||
                                      item?.code ||
                                      "Payroll issue"
                              )
                              .join(
                                "\n"
                              )}
                          >
                            <span>
                              !
                            </span>

                            {exceptions.length}{" "}
                            issue
                            {exceptions.length >
                            1
                              ? "s"
                              : ""}
                          </span>
                        ) : (
                          <span className="se-payroll-clear">
                            ✓ Clear
                          </span>
                        )}
                      </td>

                      <td>
                        <span
                          className={`se-payroll-status se-payroll-status--${String(
                            record.status ||
                              ""
                          ).toLowerCase()}`}
                        >
                          {statusLabel(
                            record.status
                          )}
                        </span>
                      </td>

                      <td className="se-payroll-cell--action">
                        <button
                          type="button"
                          className="se-payroll-row-open"
                          aria-label={`Open ${
                            employee.employeeName ||
                            "employee"
                          } payroll`}
                          onClick={(
                            event
                          ) => {
                            event.stopPropagation();

                            onOpenEmployee?.(
                              record
                            );
                          }}
                        >
                          →
                        </button>
                      </td>
                    </tr>
                  );
                }
              )
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default PayrollRegister;
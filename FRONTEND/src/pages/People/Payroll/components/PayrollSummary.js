import React from "react";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const PayrollSummary = ({
  run,
  loading = false,
  filter = "ALL",
  onFilterChange,
}) => {
  const cards = [
    {
      key: "employees",
      label: "Employees",
      value: run?.employeeCount ?? 0,
      note: "Included in payroll",
    },
    {
      key: "gross",
      label: "Gross Earnings",
      value: money(
        run?.totals?.grossEarnings
      ),
      note: "Monthly earnings",
    },
    {
      key: "deduction",
      label: "Deductions",
      value: money(
        run?.totals?.totalDeductions
      ),
      note: "Total deductions",
    },
    {
      key: "net",
      label: "Net Payroll",
      value: money(
        run?.totals?.netPay
      ),
      note: "Net payable",
    },
    {
      key: "exceptions",
      label: "Exceptions",
      value: run?.exceptionCount ?? 0,
      note:
        Number(run?.exceptionCount || 0) > 0
          ? "Requires review"
          : "No pending exceptions",
    },
  ];

  return (
    <section className="se-payroll-summary">
      {cards.map((card) => (
        <div
          key={card.key}
          className={[
            "se-payroll-summary-card",
            `se-payroll-summary-card--${card.key}`,
            ["employees", "exceptions"].includes(card.key) ? "is-filter" : "",
            (card.key === "employees" && filter === "ALL") || (card.key === "exceptions" && filter === "EXCEPTION") ? "is-active" : "",
          ].join(" ")}
          role={["employees", "exceptions"].includes(card.key) ? "button" : undefined}
          tabIndex={["employees", "exceptions"].includes(card.key) ? 0 : undefined}
          aria-pressed={["employees", "exceptions"].includes(card.key) ? (card.key === "employees" ? filter === "ALL" : filter === "EXCEPTION") : undefined}
          onClick={() => {
            if (card.key === "employees") onFilterChange?.("ALL");
            if (card.key === "exceptions") onFilterChange?.("EXCEPTION");
          }}
          onKeyDown={(event) => {
            if (["employees", "exceptions"].includes(card.key) && ["Enter", " "].includes(event.key)) {
              event.preventDefault();
              onFilterChange?.(card.key === "employees" ? "ALL" : "EXCEPTION");
            }
          }}
        >
          <div className="se-payroll-summary-card__top">
            <span>
              {card.label}
            </span>

            <span className="se-payroll-summary-card__dot" />
          </div>

          <strong>
            {loading ? "—" : card.value}
          </strong>

          <small>
            {card.note}
          </small>
        </div>
      ))}
    </section>
  );
};

export default PayrollSummary;

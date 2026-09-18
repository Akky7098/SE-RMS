import React from "react";

function AttendanceSummary({
  summary = {},
}) {
  const cards = [
    {
      key: "TOTAL",
      label: "Records",
      value: summary.total,
    },
    {
      key: "PRESENT",
      label: "Present",
      value: summary.present,
    },
    {
      key: "ABSENT",
      label: "Absent",
      value: summary.absent,
    },
    {
      key: "LATE",
      label: "Late",
      value: summary.late,
    },
    {
      key: "WFH",
      label: "Work From Home",
      value: summary.wfh,
    },
    {
      key: "FIELD",
      label: "Field / Duty",
      value: summary.field,
    },
  ];

  return (
    <section
      className="se-people-att-kpis"
      aria-label="Attendance summary"
    >
      {cards.map(
        (item) => (
          <article
            key={item.key}
            className={`se-people-att-kpi se-people-att-kpi--${item.key.toLowerCase()}`}
          >
            <span
              className="se-people-att-kpi-mark"
              aria-hidden="true"
            />

            <div className="se-people-att-kpi-content">
              <strong>
                {Number(
                  item.value
                ) || 0}
              </strong>

              <span>
                {item.label}
              </span>
            </div>
          </article>
        )
      )}
    </section>
  );
}

export default AttendanceSummary;
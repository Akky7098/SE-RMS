import React from "react";

function ShiftSummary({
  employees,
  assignments,
  roster,
}) {
  const totalEmployees =
    employees.length;

  const totalCells =
    totalEmployees *
    7;

  const assigned =
    assignments.filter(
      (
        item
      ) =>
        item.dayType ===
          "SHIFT" &&
        item.shiftId
    ).length;

  const weekOff =
    assignments.filter(
      (
        item
      ) =>
        item.dayType ===
        "WEEK_OFF"
    ).length;

  const unassigned =
    Math.max(
      0,
      totalCells -
        assignments.length
    );

  const cards = [
    {
      label:
        "Employees",

      value:
        totalEmployees,

      icon:
        "👥",
    },

    {
      label:
        "Shift Days",

      value:
        assigned,

      icon:
        "◷",
    },

    {
      label:
        "Week Off",

      value:
        weekOff,

      icon:
        "○",
    },

    {
      label:
        "Unassigned",

      value:
        unassigned,

      icon:
        "!",
    },

    {
      label:
        "Status",

      value:
        roster?.status ||
        "DRAFT",

      icon:
        "✓",
    },
  ];

  return (
    <section className="se-shift-summary">

      {cards.map(
        (
          card
        ) => (
          <article
            key={
              card.label
            }
          >
            <span>
              {
                card.icon
              }
            </span>

            <div>
              <small>
                {
                  card.label
                }
              </small>

              <strong>
                {
                  card.value
                }
              </strong>
            </div>
          </article>
        )
      )}

    </section>
  );
}

export default ShiftSummary;
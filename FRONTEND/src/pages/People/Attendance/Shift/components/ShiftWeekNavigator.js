import React from "react";

import {
  addDays,
  weekLabel,
} from "../utils/shiftHelpers";

function ShiftWeekNavigator({
  weekStart,

  onChange,

  onToday,
}) {
  return (
    <section className="se-shift-week-nav">

      <button
        type="button"
        className="se-shift-week-arrow"
        onClick={() =>
          onChange(
            addDays(
              weekStart,
              -7
            )
          )
        }
      >
        ←
      </button>

      <div>
        <span>
          WEEK
        </span>

        <strong>
          {weekLabel(
            weekStart
          )}
        </strong>
      </div>

      <button
        type="button"
        className="se-shift-week-today"
        onClick={
          onToday
        }
      >
        This Week
      </button>

      <button
        type="button"
        className="se-shift-week-arrow"
        onClick={() =>
          onChange(
            addDays(
              weekStart,
              7
            )
          )
        }
      >
        →
      </button>

    </section>
  );
}

export default ShiftWeekNavigator;
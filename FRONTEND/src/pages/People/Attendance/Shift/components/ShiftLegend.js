import React from "react";

import {
  shiftTiming,
} from "../utils/shiftHelpers";

function ShiftLegend({
  shifts,
}) {
  return (
    <section className="se-shift-legend">

      <div className="se-shift-legend-title">
        <span>
          SHIFT LEGEND
        </span>

        <strong>
          Active shifts
        </strong>
      </div>

      <div className="se-shift-legend-items">

        {shifts.map(
          (
            shift
          ) => (
            <article
              key={
                shift._id
              }
            >
              <i>
                {
                  shift.code ||
                  "S"
                }
              </i>

              <div>
                <strong>
                  {
                    shift.name
                  }
                </strong>

                <small>
                  {shiftTiming(
                    shift
                  )}

                  {shift.crossesMidnight
                    ? " · Night"
                    : ""}
                </small>
              </div>
            </article>
          )
        )}

        <article className="week-off">
          <i>
            WO
          </i>

          <div>
            <strong>
              Week Off
            </strong>

            <small>
              Non-working day
            </small>
          </div>
        </article>

      </div>

    </section>
  );
}

export default ShiftLegend;
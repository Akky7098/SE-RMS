import React, {
  useMemo,
  useState,
} from "react";

import {
  weekDays,
} from "../utils/shiftHelpers";

function BulkShiftModal({
  open,

  onClose,

  weekStart,

  shifts,

  selectedEmployeeIds,

  onApply,
}) {
  const days =
    useMemo(
      () =>
        weekDays(
          weekStart
        ),
      [
        weekStart,
      ]
    );

  const [
    shiftId,
    setShiftId,
  ] =
    useState(
      ""
    );

  const [
    dayType,
    setDayType,
  ] =
    useState(
      "SHIFT"
    );

  const [
    selectedDays,
    setSelectedDays,
  ] =
    useState(
      days.map(
        (
          day
        ) =>
          day.date
      )
    );

  if (
    !open
  ) {
    return null;
  }

  const toggleDay =
    (
      date
    ) => {
      setSelectedDays(
        (
          current
        ) =>
          current.includes(
            date
          )
            ? current.filter(
                (
                  item
                ) =>
                  item !==
                  date
              )
            : [
                ...current,
                date,
              ]
      );
    };

  const submit =
    (
      event
    ) => {
      event.preventDefault();

      if (
        !selectedEmployeeIds
          .length ||
        !selectedDays
          .length
      ) {
        return;
      }

      if (
        dayType ===
          "SHIFT" &&
        !shiftId
      ) {
        return;
      }

      onApply({
        employeeIds:
          selectedEmployeeIds,

        dates:
          selectedDays,

        dayType,

        shiftId:
          dayType ===
          "SHIFT"
            ? shiftId
            : null,
      });
    };

  return (
    <div
      className="se-shift-modal-backdrop"
      onMouseDown={
        onClose
      }
    >

      <form
        className="se-shift-modal"
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
        onSubmit={
          submit
        }
      >

        <header>

          <div>
            <span>
              BULK ASSIGN
            </span>

            <h2>
              Assign shift to employees
            </h2>

            <p>
              {selectedEmployeeIds.length} employee(s) selected.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
          >
            ×
          </button>

        </header>

        <div className="se-shift-modal-body">

          <label className="se-shift-field">
            <span>
              DAY TYPE
            </span>

            <select
              value={
                dayType
              }
              onChange={(
                event
              ) =>
                setDayType(
                  event
                    .target
                    .value
                )
              }
            >
              <option value="SHIFT">
                Working Shift
              </option>

              <option value="WEEK_OFF">
                Week Off
              </option>

              <option value="HOLIDAY">
                Holiday
              </option>
            </select>
          </label>

          {dayType ===
          "SHIFT" ? (
            <label className="se-shift-field">
              <span>
                SHIFT
              </span>

              <select
                value={
                  shiftId
                }
                onChange={(
                  event
                ) =>
                  setShiftId(
                    event
                      .target
                      .value
                  )
                }
                required
              >
                <option value="">
                  Select shift
                </option>

                {shifts.map(
                  (
                    shift
                  ) => (
                    <option
                      key={
                        shift._id
                      }
                      value={
                        shift._id
                      }
                    >
                      {
                        shift.code
                      }
                      {" · "}
                      {
                        shift.name
                      }
                    </option>
                  )
                )}
              </select>
            </label>
          ) : null}

          <div className="se-shift-field">
            <span>
              DAYS
            </span>

            <div className="se-shift-day-selector">

              {days.map(
                (
                  day
                ) => (
                  <button
                    key={
                      day.date
                    }
                    type="button"
                    className={
                      selectedDays.includes(
                        day.date
                      )
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      toggleDay(
                        day.date
                      )
                    }
                  >
                    <strong>
                      {
                        day.short
                      }
                    </strong>

                    <small>
                      {
                        day.date
                          .split(
                            "-"
                          )[2]
                      }
                    </small>
                  </button>
                )
              )}

            </div>
          </div>

        </div>

        <footer>
          <button
            type="button"
            className="secondary"
            onClick={
              onClose
            }
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary"
          >
            Apply Assignment
          </button>
        </footer>

      </form>

    </div>
  );
}

export default BulkShiftModal;
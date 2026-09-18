import React from "react";

import {
  assignmentKey,
  initials,
  shiftTiming,
  weekDays,
} from "../utils/shiftHelpers";

function ShiftRosterGrid({
  weekStart,

  employees,

  assignments,

  shifts,

  editable,

  selectedEmployees,

  onToggleEmployee,

  onAssignmentChange,
}) {
  const days =
    weekDays(
      weekStart
    );

  const assignmentMap =
    new Map(
      assignments.map(
        (
          item
        ) => [
          assignmentKey(
            item.employeeId
              ?._id ||
            item.employeeId,
            item.assignmentDate
          ),

          item,
        ]
      )
    );

  const shiftMap =
    new Map(
      shifts.map(
        (
          shift
        ) => [
          String(
            shift._id
          ),

          shift,
        ]
      )
    );

  const selectedSet =
    new Set(
      selectedEmployees.map(
        String
      )
    );

  const changeCell =
    (
      employeeId,
      date,
      value
    ) => {
      if (
        !editable
      ) {
        return;
      }

      if (
        value ===
        "WEEK_OFF"
      ) {
        onAssignmentChange({
          employeeId,

          assignmentDate:
            date,

          dayType:
            "WEEK_OFF",

          shiftId:
            null,
        });

        return;
      }

      if (
        value ===
        "HOLIDAY"
      ) {
        onAssignmentChange({
          employeeId,

          assignmentDate:
            date,

          dayType:
            "HOLIDAY",

          shiftId:
            null,
        });

        return;
      }

      if (
        value ===
        ""
      ) {
        onAssignmentChange({
          employeeId,

          assignmentDate:
            date,

          dayType:
            null,

          shiftId:
            null,

          remove:
            true,
        });

        return;
      }

      onAssignmentChange({
        employeeId,

        assignmentDate:
          date,

        dayType:
          "SHIFT",

        shiftId:
          value,
      });
    };

  return (
    <section className="se-shift-grid-card">

      <div className="se-shift-grid-wrap">

        <table className="se-shift-grid-table">

          <thead>
            <tr>

              {editable ? (
                <th className="select-column">
                  Select
                </th>
              ) : null}

              <th className="employee-column">
                Employee
              </th>

              {days.map(
                (
                  day
                ) => (
                  <th
                    key={
                      day.date
                    }
                  >
                    <span>
                      {
                        day.short
                      }
                    </span>

                    <strong>
                      {
                        day.date
                          .split(
                            "-"
                          )[2]
                      }
                    </strong>
                  </th>
                )
              )}

            </tr>
          </thead>

          <tbody>

            {employees.map(
              (
                employee
              ) => {
                const employeeId =
                  String(
                    employee._id
                  );

                return (
                  <tr
                    key={
                      employeeId
                    }
                  >

                    {editable ? (
                      <td className="select-column">
                        <input
                          type="checkbox"
                          checked={
                            selectedSet.has(
                              employeeId
                            )
                          }
                          onChange={() =>
                            onToggleEmployee(
                              employeeId
                            )
                          }
                        />
                      </td>
                    ) : null}

                    <td className="employee-column">
                      <div className="se-shift-employee">

                        <span>
                          {initials(
                            employee.fullName ||
                            employee.employeeName
                          )}
                        </span>

                        <div>
                          <strong>
                            {
                              employee.fullName ||
                              employee.employeeName ||
                              "Employee"
                            }
                          </strong>

                          <small>
                            {
                              employee.employeeCode ||
                              "—"
                            }

                            {employee.departmentName
                              ? ` · ${employee.departmentName}`
                              : ""}
                          </small>
                        </div>

                      </div>
                    </td>

                    {days.map(
                      (
                        day
                      ) => {
                        const assignment =
                          assignmentMap.get(
                            assignmentKey(
                              employeeId,
                              day.date
                            )
                          );

                        const shift =
                          shiftMap.get(
                            String(
                              assignment?.shiftId
                                ?._id ||
                              assignment?.shiftId ||
                              ""
                            )
                          );

                        const value =
                          assignment
                            ?.dayType ===
                            "WEEK_OFF"
                            ? "WEEK_OFF"
                            : assignment
                                ?.dayType ===
                                "HOLIDAY"
                              ? "HOLIDAY"
                              : assignment
                                  ?.dayType ===
                                  "SHIFT"
                                ? String(
                                    assignment
                                      ?.shiftId
                                      ?._id ||
                                    assignment
                                      ?.shiftId ||
                                    ""
                                  )
                                : "";

                        return (
                          <td
                            key={
                              day.date
                            }
                            className="shift-cell"
                          >

                            {editable ? (
                              <select
                                value={
                                  value
                                }
                                className={
                                  value ===
                                    "WEEK_OFF"
                                    ? "week-off"
                                    : value ===
                                        "HOLIDAY"
                                      ? "holiday"
                                      : value
                                        ? "assigned"
                                        : ""
                                }
                                onChange={(
                                  event
                                ) =>
                                  changeCell(
                                    employeeId,
                                    day.date,
                                    event
                                      .target
                                      .value
                                  )
                                }
                              >
                                <option value="">
                                  —
                                </option>

                                {shifts.map(
                                  (
                                    item
                                  ) => (
                                    <option
                                      key={
                                        item._id
                                      }
                                      value={
                                        item._id
                                      }
                                    >
                                      {
                                        item.code
                                      }
                                      {" · "}
                                      {
                                        item.name
                                      }
                                    </option>
                                  )
                                )}

                                <option value="WEEK_OFF">
                                  WO · Week Off
                                </option>

                                <option value="HOLIDAY">
                                  H · Holiday
                                </option>

                              </select>
                            ) : assignment
                                ?.dayType ===
                                "WEEK_OFF" ? (
                              <div className="se-shift-cell-badge week-off">
                                <strong>
                                  WO
                                </strong>

                                <small>
                                  Week Off
                                </small>
                              </div>
                            ) : assignment
                                ?.dayType ===
                                "HOLIDAY" ? (
                              <div className="se-shift-cell-badge holiday">
                                <strong>
                                  H
                                </strong>

                                <small>
                                  Holiday
                                </small>
                              </div>
                            ) : shift ? (
                              <div className="se-shift-cell-badge shift">
                                <strong>
                                  {
                                    shift.code
                                  }
                                </strong>

                                <small>
                                  {shiftTiming(
                                    shift
                                  )}
                                </small>
                              </div>
                            ) : (
                              <span className="se-shift-cell-empty">
                                —
                              </span>
                            )}

                          </td>
                        );
                      }
                    )}

                  </tr>
                );
              }
            )}

          </tbody>

        </table>

      </div>

    </section>
  );
}

export default ShiftRosterGrid;
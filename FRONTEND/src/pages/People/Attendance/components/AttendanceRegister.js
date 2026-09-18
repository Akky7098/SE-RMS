import React from "react";

import AttendanceStatusBadge from "./AttendanceStatusBadge";

import {
  attendanceSource,
  formatDate,
  formatMinutes,
  formatTime,
  initials,
  workModeLabel,
} from "../utils/attendanceHelpers";

function AttendanceRegister({
  records = [],
  loading,
  canViewLocation,
  onOpen,
}) {
  const getExceptions = (record) =>
    [
      record.isLate
        ? `Late ${record.lateMinutes || 0}m`
        : "",

      record.isEarlyExit
        ? `Early ${record.earlyExitMinutes || 0}m`
        : "",

      record.isShortHours
        ? `Short ${record.shortMinutes || 0}m`
        : "",

      record.missingCheckOut
        ? "Missing checkout"
        : "",
    ].filter(Boolean);

  return (
    <section className="se-people-att-register-card se-att-register-v2">

      <div className="se-people-att-register-head se-att-register-head-v2">

        <div className="se-att-register-title">
          <span>
            REGISTER
          </span>

          <h2>
            Attendance records
          </h2>
        </div>

        <div className="se-att-register-count">
          <strong>
            {records.length}
          </strong>

          <span>
            {records.length === 1
              ? "Record"
              : "Records"}
          </span>
        </div>

      </div>

      {loading ? (
        <div className="se-people-att-loading">
          <span />

          Loading attendance…
        </div>
      ) : !records.length ? (
        <div className="se-people-att-empty se-att-register-empty">

          <div className="se-att-register-empty-icon">
            ▦
          </div>

          <strong>
            No attendance records
          </strong>

          <p>
            Try another date range or filter.
          </p>

        </div>
      ) : (
        <div className="se-people-att-table-wrap se-att-register-table-wrap">

          <table className="se-people-att-table se-att-register-table">

            <thead>
              <tr>
                <th>
                  Employee
                </th>

                <th>
                  Date
                </th>

                <th>
                  Status
                </th>

                <th>
                  Mode
                </th>

                <th>
                  Shift
                </th>

                <th>
                  Check In
                </th>

                <th>
                  Check Out
                </th>

                <th>
                  Working
                </th>

                <th>
                  Exception
                </th>

                <th>
                  Source
                </th>

                <th
                  className="se-att-register-action-head"
                  aria-label="Actions"
                />
              </tr>
            </thead>

            <tbody>

              {records.map((record) => {
                const exceptions =
                  getExceptions(record);

                const recordKey =
                  record._id ||
                  `${record.employeeId}-${record.businessDate}`;

                const employeeName =
                  record.employeeName ||
                  "Employee";

                return (
                  <tr key={recordKey}>

                    <td>
                      <div className="se-people-att-person se-att-register-person">

                        <span>
                          {initials(
                            employeeName
                          )}
                        </span>

                        <div>
                          <strong>
                            {employeeName}
                          </strong>

                          <small>
                            {record.employeeCode ||
                              "—"}

                            {record.departmentName
                              ? ` · ${record.departmentName}`
                              : ""}
                          </small>
                        </div>

                      </div>
                    </td>

                    <td>
                      <strong className="se-people-att-date se-att-register-date">
                        {formatDate(
                          record.businessDate
                        )}
                      </strong>
                    </td>

                    <td>
                      <AttendanceStatusBadge
                        status={
                          record.presenceStatus ||
                          "NOT_MARKED"
                        }
                      />
                    </td>

                    <td>
                      <span
                        className={`se-people-att-mode se-people-att-mode--${String(
                          record.workMode ||
                          "OFFICE"
                        )
                          .toLowerCase()
                          .replaceAll(
                            "_",
                            "-"
                          )}`}
                      >
                        {workModeLabel(
                          record.workMode
                        )}
                      </span>
                    </td>

                    <td>
                      <div className="se-people-att-shift se-att-register-shift">

                        <strong>
                          {record.shiftCode ||
                            record.shiftName ||
                            "—"}
                        </strong>

                        {record.expectedStartAt &&
                        record.expectedEndAt ? (
                          <small>
                            {formatTime(
                              record.expectedStartAt
                            )}

                            {" – "}

                            {formatTime(
                              record.expectedEndAt
                            )}
                          </small>
                        ) : null}

                      </div>
                    </td>

                    <td>
                      <span className="se-att-register-time">
                        {formatTime(
                          record.firstInAt ||
                          record.firstIn?.time
                        )}
                      </span>
                    </td>

                    <td>
                      <span className="se-att-register-time">
                        {formatTime(
                          record.lastOutAt ||
                          record.lastOut?.time
                        )}
                      </span>
                    </td>

                    <td>
                      <strong className="se-att-register-working">
                        {formatMinutes(
                          record.totalWorkingMinutes
                        )}
                      </strong>
                    </td>

                    <td>
                      {exceptions.length ? (
                        <span className="se-people-att-exception se-att-register-exception">

                          {exceptions[0]}

                          {exceptions.length > 1 ? (
                            <strong>
                              +{exceptions.length - 1}
                            </strong>
                          ) : null}

                        </span>
                      ) : (
                        <span className="se-people-att-normal se-att-register-normal">
                          Normal
                        </span>
                      )}
                    </td>

                    <td>
                      <span className="se-people-att-source se-att-register-source">
                        {attendanceSource(
                          record
                        )}
                      </span>
                    </td>

                    <td className="se-att-register-action-cell">
                      <button
                        type="button"
                        className="se-people-att-row-open se-att-register-open"
                        onClick={() =>
                          onOpen(record)
                        }
                        aria-label={`Open attendance details for ${employeeName}`}
                        title={
                          canViewLocation
                            ? "View attendance and location"
                            : "View attendance"
                        }
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M5 12h14M13 6l6 6-6 6"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>

        </div>
      )}

    </section>
  );
}

export default AttendanceRegister;
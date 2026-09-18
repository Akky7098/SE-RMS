import React from "react";

import LeaveEmptyState from "./LeaveEmptyState";

import {
  formatDays,
  formatLeaveDate,
  formatLeaveStatus,
  getEmployeeName,
  getLeaveTypeCode,
  getLeaveTypeName,
} from "../utils/leaveHelpers";

function LeaveRegister({
  requests = [],
  onOpen,
}) {
  return (
    <section className="se-leave-panel">
      <div className="se-leave-panel-head">
        <div>
          <span className="se-leave-section-label">
            LEAVE REGISTER
          </span>

          <h2>
            Team and department leave
          </h2>
        </div>

        <span className="se-leave-record-count">
          {requests.length} records
        </span>
      </div>

      {!requests.length ? (
        <LeaveEmptyState
          title="No leave records"
          description="There are no leave records available in your current access scope."
        />
      ) : (
        <div className="se-leave-table-wrap">
          <table className="se-leave-table">
            <thead>
              <tr>
                <th>
                  Employee
                </th>

                <th>
                  Leave
                </th>

                <th>
                  Period
                </th>

                <th>
                  Days
                </th>

                <th>
                  Status
                </th>

                <th className="se-leave-table-action">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {requests.map(
                (request) => {
                  const employee =
                    request
                      ?.employeeId ||
                    {};

                  return (
                    <tr
                      key={
                        request._id
                      }
                    >
                      <td>
                        <div className="se-leave-employee-cell">
                          <strong>
                            {getEmployeeName(
                              request
                            )}
                          </strong>

                          <small>
                            {employee?.employeeCode ||
                              ""}
                            {employee?.orgUnitCode
                              ? ` · ${employee.orgUnitCode}`
                              : ""}
                          </small>
                        </div>
                      </td>

                      <td>
                        <div className="se-leave-table-leave">
                          <span className="se-leave-type-badge se-leave-type-badge--small">
                            {getLeaveTypeCode(
                              request
                            )}
                          </span>

                          <strong>
                            {getLeaveTypeName(
                              request
                            )}
                          </strong>
                        </div>
                      </td>

                      <td>
                        <span className="se-leave-date-range">
                          {formatLeaveDate(
                            request.fromDate
                          )}

                          <small>
                            to
                          </small>

                          {formatLeaveDate(
                            request.toDate
                          )}
                        </span>
                      </td>

                      <td>
                        {formatDays(
                          request.totalDays
                        )}
                      </td>

                      <td>
                        <span
                          className={`se-leave-status se-leave-status--${String(
                            request.status ||
                              ""
                          ).toLowerCase()}`}
                        >
                          {formatLeaveStatus(
                            request.status
                          )}
                        </span>
                      </td>

                      <td className="se-leave-table-action">
                        <button
                          type="button"
                          className="se-leave-row-view"
                          onClick={() =>
                            onOpen(
                              request
                            )
                          }
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default LeaveRegister;
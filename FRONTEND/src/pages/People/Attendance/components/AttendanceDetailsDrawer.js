import React, {
  useEffect,
  useState,
} from "react";

import {
  getEmployeeAttendanceLocationHistory,
} from "../../../../services/attendanceService";

import AttendanceStatusBadge from "./AttendanceStatusBadge";

import {
  formatDate,
  formatMinutes,
  formatTime,
  workModeLabel,
} from "../utils/attendanceHelpers";

function AttendanceDetailsDrawer({
  record,
  onClose,
  canViewLocation,
}) {
  const [
    location,
    setLocation,
  ] = useState({
    loading: false,
    loaded: false,
    history: [],
    summary: null,
    error: "",
  });

  const mode =
    String(
      record?.workMode ||
      ""
    ).toUpperCase();

  const locationRelevant =
    [
      "OFFICE",
      "WFH",
      "FIELD_VISIT",
      "ON_DUTY",
      "REMOTE",
      "WORK_FROM_HOME",
      "VISIT",
    ].includes(mode);

  useEffect(() => {
    setLocation({
      loading: false,
      loaded: false,
      history: [],
      summary: null,
      error: "",
    });
  }, [
    record?._id,
  ]);

  if (!record) {
    return null;
  }

  const loadLocation =
    async () => {
      if (
        !canViewLocation ||
        !record.employeeId
      ) {
        return;
      }

      try {
        setLocation(
          (current) => ({
            ...current,
            loading: true,
            error: "",
          })
        );

        const response =
          await getEmployeeAttendanceLocationHistory(
            record.employeeId,
            {
              date:
                record.businessDate,
            }
          );

        setLocation({
          loading: false,
          loaded: true,
          history:
            response?.history ||
            response?.records ||
            response?.checkpoints ||
            [],
          summary:
            response?.summary ||
            null,
          error: "",
        });
      } catch (error) {
        setLocation({
          loading: false,
          loaded: false,
          history: [],
          summary: null,
          error:
            error?.response
              ?.data
              ?.message ||
            error?.message ||
            "Location history could not be loaded.",
        });
      }
    };

  const hasException =
    Boolean(
      record.isLate ||
      record.isEarlyExit ||
      record.isShortHours ||
      record.missingCheckOut
    );

  return (
    <div
      className="se-people-att-drawer-backdrop"
      onMouseDown={onClose}
    >
      <aside
        className="se-people-att-drawer se-att-drawer-v2"
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >

        <header className="se-att-drawer-v2-head">

          <div>
            <span>
              ATTENDANCE
            </span>

            <h2>
              {record.employeeName ||
                "Employee"}
            </h2>

            <p>
              {record.employeeCode ||
                "—"}

              <i />

              {formatDate(
                record.businessDate
              )}
            </p>
          </div>

          <button
            type="button"
            className="se-att-drawer-v2-close"
            onClick={onClose}
            aria-label="Close attendance details"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>

        </header>

        <div className="se-att-drawer-v2-body">

          <section className="se-att-drawer-v2-overview">

            <div>
              <small>
                STATUS
              </small>

              <AttendanceStatusBadge
                status={
                  record.presenceStatus
                }
              />
            </div>

            <div>
              <small>
                WORK MODE
              </small>

              <strong>
                {workModeLabel(
                  record.workMode
                )}
              </strong>
            </div>

            <div>
              <small>
                SHIFT
              </small>

              <strong>
                {record.shiftName ||
                  record.shiftCode ||
                  "—"}
              </strong>
            </div>

          </section>

          <section className="se-att-drawer-v2-metrics">

            <article>
              <span>
                CHECK IN
              </span>

              <strong>
                {formatTime(
                  record.firstInAt ||
                  record.firstIn?.time
                )}
              </strong>
            </article>

            <article>
              <span>
                CHECK OUT
              </span>

              <strong>
                {formatTime(
                  record.lastOutAt ||
                  record.lastOut?.time
                )}
              </strong>
            </article>

            <article>
              <span>
                WORKING
              </span>

              <strong>
                {formatMinutes(
                  record.totalWorkingMinutes
                )}
              </strong>
            </article>

            <article>
              <span>
                REQUIRED
              </span>

              <strong>
                {formatMinutes(
                  record.requiredMinutes
                )}
              </strong>
            </article>

            <article>
              <span>
                LATE
              </span>

              <strong>
                {formatMinutes(
                  record.lateMinutes
                )}
              </strong>
            </article>

            <article>
              <span>
                OVERTIME
              </span>

              <strong>
                {formatMinutes(
                  record.overtimeMinutes
                )}
              </strong>
            </article>

          </section>

          <section className="se-att-drawer-v2-section">

            <div className="se-att-drawer-v2-section-head">
              <h3>
                Exceptions
              </h3>
            </div>

            <div className="se-att-drawer-v2-flags">

              {record.isLate ? (
                <span className="warning">
                  Late arrival
                </span>
              ) : null}

              {record.isEarlyExit ? (
                <span className="warning">
                  Early exit
                </span>
              ) : null}

              {record.isShortHours ? (
                <span className="warning">
                  Short hours
                </span>
              ) : null}

              {record.missingCheckOut ? (
                <span className="warning">
                  Missing checkout
                </span>
              ) : null}

              {!hasException ? (
                <span className="good">
                  No exceptions
                </span>
              ) : null}

            </div>

          </section>

          {locationRelevant ? (
            <section className="se-att-drawer-v2-section">

              <div className="se-att-drawer-v2-section-head">

                <h3>
                  Location
                </h3>

                {canViewLocation &&
                !location.loaded ? (
                  <button
                    type="button"
                    className="se-att-drawer-v2-location-btn"
                    onClick={
                      loadLocation
                    }
                    disabled={
                      location.loading
                    }
                  >
                    {location.loading
                      ? "Loading…"
                      : "View location"}
                  </button>
                ) : null}

              </div>

              {!canViewLocation ? (
                <div className="se-att-drawer-v2-message">
                  Location access restricted.
                </div>
              ) : location.error ? (
                <div className="se-att-drawer-v2-message se-att-drawer-v2-message--error">
                  {location.error}
                </div>
              ) : location.loaded ? (
                <>

                  <div className="se-att-drawer-v2-location-stats">

                    <div>
                      <strong>
                        {location.summary
                          ?.totalCheckpoints ??
                          location.history
                            .length}
                      </strong>

                      <span>
                        Checkpoints
                      </span>
                    </div>

                    <div>
                      <strong>
                        {location.summary
                          ?.officeCheckpoints ??
                          0}
                      </strong>

                      <span>
                        In office
                      </span>
                    </div>

                    <div>
                      <strong>
                        {location.summary
                          ?.outsideCheckpoints ??
                          0}
                      </strong>

                      <span>
                        Outside
                      </span>
                    </div>

                  </div>

                  <div className="se-att-drawer-v2-location-list">

                    {location.history
                      .length ? (
                      location.history.map(
                        (
                          point,
                          index
                        ) => {
                          const latitude =
                            point.latitude ??
                            point.lat;

                          const longitude =
                            point.longitude ??
                            point.lng;

                          const hasCoordinates =
                            latitude !==
                              null &&
                            latitude !==
                              undefined &&
                            longitude !==
                              null &&
                            longitude !==
                              undefined;

                          return (
                            <article
                              key={
                                point._id ||
                                index
                              }
                            >

                              <span className="se-att-drawer-v2-location-dot" />

                              <div className="se-att-drawer-v2-location-copy">

                                <div className="se-att-drawer-v2-location-time">
                                  <strong>
                                    {formatTime(
                                      point.capturedAt
                                    )}
                                  </strong>

                                  <span>
                                    {point.source ||
                                      "LOCATION"}

                                    {point.accuracyMeters
                                      ? ` · ±${Math.round(
                                          point.accuracyMeters
                                        )}m`
                                      : ""}
                                  </span>
                                </div>

                                <p
                                  title={
                                    point.locationAddress ||
                                    point.address ||
                                    ""
                                  }
                                >
                                  {point.locationAddress ||
                                    point.address ||
                                    (hasCoordinates
                                      ? `${latitude}, ${longitude}`
                                      : "Location captured")}
                                </p>

                              </div>

                              {hasCoordinates ? (
                                <a
                                  href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="se-att-drawer-v2-map"
                                >
                                  Map

                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    aria-hidden="true"
                                  >
                                    <path
                                      d="M14 5h5v5M19 5l-8 8"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />

                                    <path
                                      d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </a>
                              ) : null}

                            </article>
                          );
                        }
                      )
                    ) : (
                      <div className="se-att-drawer-v2-message">
                        No location checkpoints.
                      </div>
                    )}

                  </div>

                </>
              ) : null}

            </section>
          ) : null}

        </div>

      </aside>
    </div>
  );
}

export default AttendanceDetailsDrawer;
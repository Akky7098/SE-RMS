import React from "react";

import AttendanceStatusBadge from "./AttendanceStatusBadge";

import {
  formatDateLong,
  formatMinutes,
  formatTime,
  initials,
} from "../utils/attendanceHelpers";

/* =========================================================
   LOCATION HELPERS
========================================================= */

const getLocationLabel = (
  point
) => {
  return (
    point?.locationAddress ||
    point?.locationName ||
    point?.address ||
    point?.locationType ||
    "GPS checkpoint"
  );
};

const getLocationTime = (
  point
) => {
  return (
    point?.capturedAt ||
    point?.createdAt ||
    point?.timestamp ||
    null
  );
};

const getMapLink = (
  point
) => {
  if (
    point?.googleMapLink
  ) {
    return point.googleMapLink;
  }

  const latitude =
    Number(
      point?.latitude
    );

  const longitude =
    Number(
      point?.longitude
    );

  if (
    Number.isFinite(
      latitude
    ) &&
    Number.isFinite(
      longitude
    )
  ) {
    return (
      `https://www.google.com/maps?q=` +
      `${latitude},${longitude}`
    );
  }

  return "";
};

/* =========================================================
   TEXT FORMATTER
========================================================= */

const formatLabel = (
  value,
  fallback = "—"
) => {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return fallback;
  }

  return String(value)
    .replaceAll(
      "_",
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (
        character
      ) =>
        character.toUpperCase()
    );
};

/* =========================================================
   ATTENDANCE EMPLOYEE PANEL
========================================================= */

const AttendanceEmployeePanel = ({
  row,
  date,
  location = {
    loading: false,
    loaded: false,
    points: [],
    error: "",
  },
  canViewLocation,
  onLoadLocation,
  onClose,
}) => {
  /* =====================================================
     CLOSE ON ESCAPE

     IMPORTANT:
     React hooks must run before any conditional return.
  ===================================================== */

  React.useEffect(() => {
    const handleKeyDown =
      (
        event
      ) => {
        if (
          event.key ===
          "Escape"
        ) {
          if (
            typeof onClose ===
            "function"
          ) {
            onClose();
          }
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    onClose,
  ]);

  /* =====================================================
     NOTHING SELECTED
  ===================================================== */

  if (!row) {
    return null;
  }

  /* =====================================================
     ATTENDANCE RECORD
  ===================================================== */

  const attendance =
    row.attendance ||
    null;
  /* =====================================================
     PUNCH TIMES
  ===================================================== */

  const firstIn =
    attendance
      ?.firstIn
      ?.time ||
    attendance
      ?.checkIn
      ?.time ||
    null;

  const lastOut =
    attendance
      ?.lastOut
      ?.time ||
    attendance
      ?.checkOut
      ?.time ||
    null;

  /* =====================================================
     WORKING TIME
  ===================================================== */

  const workingMinutes =
    attendance
      ?.totalWorkingMinutes ??
    attendance
      ?.totalPresenceMinutes ??
    0;

  /* =====================================================
     MODE
  ===================================================== */

  const workMode =
    attendance
      ?.workMode ||
    "OFFICE";

  /* =====================================================
     SOURCE
  ===================================================== */

  const source =
    attendance
      ?.primarySource ||
    attendance
      ?.attendanceSource ||
    "—";

  const sourceUpper =
    String(
      source
    ).toUpperCase();

  const biometricSource =
    sourceUpper.includes(
      "BIOMETRIC"
    ) ||
    sourceUpper.includes(
      "ESSL"
    );

  /* =====================================================
     PUNCH COUNT
  ===================================================== */

  const punchCount =
    attendance
      ?.punchCount ??
    attendance
      ?.punches
      ?.length ??
    "—";

  /* =====================================================
     ATTENDANCE STATUS
  ===================================================== */

  const attendanceStatus =
    row.status ||
    attendance
      ?.attendanceStatus ||
    "—";

  /* =====================================================
     REGULARIZATION
  ===================================================== */

  const regularization =
    attendance
      ?.regularization ||
    null;

  const regularizationStatus =
    regularization
      ?.status ||
    "none";

  const hasRegularization =
    regularizationStatus !==
      "none" &&
    regularizationStatus !==
      "NONE";

  /* =====================================================
     FIELD INFORMATION
  ===================================================== */

  const fieldLocation =
    attendance
      ?.locationName ||
    attendance
      ?.visitLocation ||
    attendance
      ?.workLocation ||
    "";

  const fieldPurpose =
    attendance
      ?.purpose ||
    attendance
      ?.visitPurpose ||
    "";

  /* =====================================================
     LOCATION POINTS
  ===================================================== */

  const points =
    Array.isArray(
      location?.points
    )
      ? location.points
      : [];

  /* =====================================================
     CLOSE ON ESCAPE
  ===================================================== */



  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div
      className="se-att-panel-overlay"
      onMouseDown={
        onClose
      }
    >
      <aside
        className="se-att-employee-panel"
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        {/* =================================================
            PANEL TOP
        ================================================= */}

        <div className="se-att-panel-top">
          <div className="se-att-panel-person">
            <span className="se-att-panel-avatar">
              {initials(
                row.name
              )}
            </span>

            <div className="se-att-panel-person-copy">
              <div className="se-att-panel-person-heading">
                <strong>
                  {row.name}
                </strong>

                <AttendanceStatusBadge
                  status={
                    attendanceStatus
                  }
                />
              </div>

              <p>
                {row.designation ||
                  "Employee"}
              </p>

              <small>
                {row.department}
              </small>
            </div>
          </div>

          <button
            type="button"
            className="se-att-panel-close"
            onClick={
              onClose
            }
            aria-label="Close attendance panel"
          >
            ×
          </button>
        </div>

        {/* =================================================
            DATE BANNER
        ================================================= */}

        <div className="se-att-panel-date">
          <div>
            <span>
              ATTENDANCE DATE
            </span>

            <strong>
              {formatDateLong(
                date
              )}
            </strong>
          </div>

          <div className="se-att-panel-date-source">
            <span>
              SOURCE
            </span>

            <strong>
              {formatLabel(
                source
              )}
            </strong>
          </div>
        </div>

        {/* =================================================
            PUNCH FLOW
        ================================================= */}

        <section className="se-att-panel-punch-flow">
          <article>
            <span className="se-att-panel-punch-icon checkin">
              ↘
            </span>

            <div>
              <small>
                CHECK IN
              </small>

              <strong>
                {formatTime(
                  firstIn
                )}
              </strong>
            </div>
          </article>

          <span className="se-att-panel-punch-line">
            <i />
          </span>

          <article>
            <span className="se-att-panel-punch-icon checkout">
              ↗
            </span>

            <div>
              <small>
                CHECK OUT
              </small>

              <strong>
                {formatTime(
                  lastOut
                )}
              </strong>
            </div>
          </article>
        </section>

        {/* =================================================
            METRICS
        ================================================= */}

        <div className="se-att-panel-metrics">
          <div>
            <span>
              WORKING TIME
            </span>

            <strong>
              {formatMinutes(
                workingMinutes
              )}
            </strong>
          </div>

          <div>
            <span>
              WORK MODE
            </span>

            <strong>
              {formatLabel(
                workMode
              )}
            </strong>
          </div>

          <div>
            <span>
              PUNCH COUNT
            </span>

            <strong>
              {punchCount}
            </strong>
          </div>

          <div>
            <span>
              STATUS
            </span>

            <strong>
              {formatLabel(
                attendanceStatus
              )}
            </strong>
          </div>
        </div>

        {/* =================================================
            ATTENDANCE SOURCE INSIGHT
        ================================================= */}

        <section className="se-att-panel-insight">
          <div
            className={
              biometricSource
                ? "se-att-panel-insight-icon biometric"
                : "se-att-panel-insight-icon field"
            }
          >
            {biometricSource
              ? "◎"
              : "⌖"}
          </div>

          <div>
            <span>
              ATTENDANCE SOURCE
            </span>

            <strong>
              {formatLabel(
                source
              )}
            </strong>

            <p>
              {biometricSource
                ? "Office attendance captured through the eSSL biometric attendance system."
                : "Attendance captured through SE-RMS field or remote attendance workflow."}
            </p>
          </div>
        </section>

        {/* =================================================
            FIELD WORK INFORMATION
        ================================================= */}

        {!biometricSource &&
        (
          fieldLocation ||
          fieldPurpose
        ) ? (
          <section className="se-att-panel-field-card">
            <div className="se-att-section-heading">
              <div>
                <span>
                  OUTSIDE-OFFICE WORK
                </span>

                <h3>
                  Field Work Details
                </h3>
              </div>

              <span className="se-att-panel-field-icon">
                ⌖
              </span>
            </div>

            <div className="se-att-panel-field-details">
              <div>
                <span>
                  LOCATION
                </span>

                <strong>
                  {fieldLocation ||
                    "Not specified"}
                </strong>
              </div>

              <div>
                <span>
                  PURPOSE
                </span>

                <strong>
                  {fieldPurpose ||
                    "Not specified"}
                </strong>
              </div>
            </div>
          </section>
        ) : null}

        {/* =================================================
            REGULARIZATION
        ================================================= */}

        {hasRegularization ? (
          <section className="se-att-panel-regularization">
            <div className="se-att-section-heading">
              <div>
                <span>
                  REGULARIZATION
                </span>

                <h3>
                  Attendance Correction
                </h3>
              </div>

              <strong
                className={`se-att-panel-regularization-status ${String(
                  regularizationStatus
                ).toLowerCase()}`}
              >
                {formatLabel(
                  regularizationStatus
                )}
              </strong>
            </div>

            <div className="se-att-panel-regularization-grid">
              <div>
                <span>
                  REQUESTED IN
                </span>

                <strong>
                  {formatTime(
                    regularization
                      ?.requestedCheckIn
                  )}
                </strong>
              </div>

              <div>
                <span>
                  REQUESTED OUT
                </span>

                <strong>
                  {formatTime(
                    regularization
                      ?.requestedCheckOut
                  )}
                </strong>
              </div>
            </div>

            {regularization
              ?.reason ? (
              <div className="se-att-panel-regularization-reason">
                <span>
                  REASON
                </span>

                <p>
                  {
                    regularization.reason
                  }
                </p>
              </div>
            ) : null}

            {regularization
              ?.rejectionReason ? (
              <div className="se-att-panel-regularization-reason rejected">
                <span>
                  REJECTION REASON
                </span>

                <p>
                  {
                    regularization.rejectionReason
                  }
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* =================================================
            LOCATION HISTORY
        ================================================= */}

        {canViewLocation ? (
          <section className="se-att-location-section">
            <div className="se-att-section-heading">
              <div>
                <span>
                  FIELD AUDIT
                </span>

                <h3>
                  Location Journey
                </h3>

                <p>
                  GPS checkpoints captured
                  during the selected workday.
                </p>
              </div>

              {!location
                ?.loaded ? (
                <button
                  type="button"
                  onClick={
                    onLoadLocation
                  }
                  disabled={
                    location
                      ?.loading
                  }
                >
                  {location
                    ?.loading
                    ? "Loading..."
                    : "Load History"}
                </button>
              ) : null}
            </div>

            {/* =============================================
                LOCATION ERROR
            ============================================= */}

            {location?.error ? (
              <div className="se-att-panel-error">
                <span>
                  !
                </span>

                {
                  location.error
                }
              </div>
            ) : null}

            {/* =============================================
                NO POINTS
            ============================================= */}

            {location
              ?.loaded &&
            !points.length ? (
              <div className="se-att-location-empty">
                <span>
                  ⌖
                </span>

                <strong>
                  No GPS checkpoints
                </strong>

                <p>
                  No field-location history
                  is available for this
                  employee on this date.
                </p>
              </div>
            ) : null}

            {/* =============================================
                LOCATION SUMMARY
            ============================================= */}

            {points.length ? (
              <div className="se-att-location-summary">
                <div>
                  <span>
                    CHECKPOINTS
                  </span>

                  <strong>
                    {points.length}
                  </strong>
                </div>

                <div>
                  <span>
                    FIRST
                  </span>

                  <strong>
                    {formatTime(
                      getLocationTime(
                        points[0]
                      )
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    LAST
                  </span>

                  <strong>
                    {formatTime(
                      getLocationTime(
                        points[
                          points.length -
                            1
                        ]
                      )
                    )}
                  </strong>
                </div>
              </div>
            ) : null}

            {/* =============================================
                TIMELINE
            ============================================= */}

            {points.length ? (
              <div className="se-att-location-timeline">
                {points.map(
                  (
                    point,
                    index
                  ) => {
                    const mapLink =
                      getMapLink(
                        point
                      );

                    const accuracy =
                      Number(
                        point?.accuracy
                      );

                    return (
                      <div
                        className="se-att-location-item"
                        key={
                          point?._id ||
                          `${getLocationTime(
                            point
                          )}-${index}`
                        }
                      >
                        <span className="se-att-location-dot" />

                        <div className="se-att-location-content">
                          <strong>
                            {getLocationLabel(
                              point
                            )}
                          </strong>

                          <small>
                            {formatTime(
                              getLocationTime(
                                point
                              )
                            )}

                            {point
                              ?.source
                              ? ` · ${formatLabel(
                                  point.source
                                )}`
                              : ""}
                          </small>

                          <div className="se-att-location-meta">
                            {Number.isFinite(
                              accuracy
                            ) ? (
                              <span>
                                Accuracy{" "}
                                {Math.round(
                                  accuracy
                                )}
                                m
                              </span>
                            ) : null}

                            {point
                              ?.locationStatus ? (
                              <span>
                                {formatLabel(
                                  point.locationStatus
                                )}
                              </span>
                            ) : null}

                            {point
                              ?.isWithinOffice ? (
                              <span className="office">
                                Office
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {mapLink ? (
                          <a
                            href={
                              mapLink
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            Map ↗
                          </a>
                        ) : null}
                      </div>
                    );
                  }
                )}
              </div>
            ) : null}
          </section>
        ) : null}
      </aside>
    </div>
  );
};

export default AttendanceEmployeePanel;
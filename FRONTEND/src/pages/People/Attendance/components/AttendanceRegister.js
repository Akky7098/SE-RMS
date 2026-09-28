import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import AttendanceStatusBadge from "./AttendanceStatusBadge";

import {
  attendanceSource,
  formatDate,
  formatTime,
  initials,
  workModeLabel,
} from "../utils/attendanceHelpers";


/* =========================================================
   REGISTER CONFIG
========================================================= */

const PAGE_SIZE = 100;

/*
 * A second biometric scan only a few seconds after IN
 * must not visually become a checkout.
 *
 * Example:
 * 09:41:21 IN
 * 09:41:22 second scan
 *
 * Old UI:
 * 09:41 -> 09:41
 *
 * New UI:
 * 09:41 -> —
 *
 * Backend remains responsible for final consolidation.
 */
const MINIMUM_CHECKOUT_GAP_MINUTES = 2;


/* =========================================================
   SAFE DATE
========================================================= */

const toDate = (value) => {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
};


/* =========================================================
   CHECK IN
========================================================= */

const checkInOf = (record) =>
  record?.firstInAt ||
  record?.firstIn?.time ||
  null;


/* =========================================================
   RAW CHECK OUT
========================================================= */

const rawCheckOutOf = (record) =>
  record?.lastOutAt ||
  record?.lastOut?.time ||
  null;


/* =========================================================
   VALID CHECK OUT

   Prevent duplicate scan from displaying as checkout.
========================================================= */

const validCheckOutOf = (
  record
) => {
  const checkInValue =
    checkInOf(
      record
    );

  const checkOutValue =
    rawCheckOutOf(
      record
    );

  if (
    !checkInValue ||
    !checkOutValue
  ) {
    return null;
  }

  const checkIn =
    toDate(
      checkInValue
    );

  const checkOut =
    toDate(
      checkOutValue
    );

  if (
    !checkIn ||
    !checkOut
  ) {
    return null;
  }

  const differenceMinutes =
    (
      checkOut.getTime() -
      checkIn.getTime()
    ) /
    60000;

  /*
   * Same punch / duplicate biometric scan.
   */
  if (
    differenceMinutes <
    MINIMUM_CHECKOUT_GAP_MINUTES
  ) {
    return null;
  }

  return checkOutValue;
};


/* =========================================================
   WORKING TIME

   IMPORTANT:
   No valid checkout = 00:00.

   We intentionally DO NOT calculate live elapsed time
   inside the workforce register.

   This keeps:
   IN only -> 00:00
   IN + valid OUT -> backend working minutes
========================================================= */

const formatWorkingHHMM = (
  record
) => {
  const checkOutValue =
    validCheckOutOf(
      record
    );

  if (!checkOutValue) {
    return "00:00";
  }

  const totalMinutes =
    Number(
      record?.totalWorkingMinutes
    );

  if (
    Number.isFinite(
      totalMinutes
    ) &&
    totalMinutes >= 0
  ) {
    const hours =
      Math.floor(
        totalMinutes /
        60
      );

    const minutes =
      Math.floor(
        totalMinutes %
        60
      );

    return `${String(
      hours
    ).padStart(
      2,
      "0"
    )}:${String(
      minutes
    ).padStart(
      2,
      "0"
    )}`;
  }

  /*
   * Fallback only when backend working minutes
   * are unavailable but valid IN/OUT exist.
   */
  const checkIn =
    toDate(
      checkInOf(
        record
      )
    );

  const checkOut =
    toDate(
      checkOutValue
    );

  if (
    !checkIn ||
    !checkOut
  ) {
    return "00:00";
  }

  const calculatedMinutes =
    Math.max(
      0,
      Math.floor(
        (
          checkOut.getTime() -
          checkIn.getTime()
        ) /
        60000
      )
    );

  const hours =
    Math.floor(
      calculatedMinutes /
      60
    );

  const minutes =
    calculatedMinutes %
    60;

  return `${String(
    hours
  ).padStart(
    2,
    "0"
  )}:${String(
    minutes
  ).padStart(
    2,
    "0"
  )}`;
};


/* =========================================================
   MODE
========================================================= */

const normalizedModeOf = (
  record
) =>
  String(
    record?.workMode ||
    "OFFICE"
  )
    .trim()
    .toUpperCase();


/* =========================================================
   DISPLAY STATUS

   Late employee remains PRESENT.

   Late is displayed separately as an exception badge.
========================================================= */

const displayStatusOf = (
  record
) => {
  const checkIn =
    checkInOf(
      record
    );

  if (checkIn) {
    return "PRESENT";
  }

  return (
    record?.presenceStatus ||
    "NOT_MARKED"
  );
};


/* =========================================================
   EXCEPTIONS
========================================================= */

const getExceptions = (
  record,
  late
) => {
  const values = [];

  const checkIn =
    checkInOf(
      record
    );

  const checkOut =
    validCheckOutOf(
      record
    );

  /*
   * LATE
   *
   * Keep this simple in the register.
   * Exact minutes are unnecessary here.
   */
  if (late) {
    values.push("Late");
  }

  /*
   * NO CHECKOUT
   *
   * If employee has checked in but has no genuine
   * checkout yet, this is the ONLY checkout-related
   * exception we should show.
   *
   * Do not show Early Exit / Short Hours before
   * the employee actually checks out.
   */
  if (
    checkIn &&
    !checkOut
  ) {
    values.push(
      "No checkout"
    );

    return values;
  }

  /*
   * EARLY EXIT
   *
   * Only meaningful after a genuine checkout exists.
   */
  if (
    checkOut &&
    record?.isEarlyExit
  ) {
    values.push(
      "Early exit"
    );
  }

  /*
   * SHORT HOURS
   *
   * Only meaningful after a genuine checkout exists.
   */
  if (
    checkOut &&
    record?.isShortHours
  ) {
    values.push(
      "Short hours"
    );
  }

  return values;
};

/* =========================================================
   REGISTER
========================================================= */

function AttendanceRegister({
  records = [],
  loading,
  canViewLocation,
  onOpen,
  compact = false,

  viewLabel = "Present",
  activeView = "PRESENT",

  isRecordLate:
    externalIsRecordLate,
}) {

  /* =======================================================
     PAGINATION
  ======================================================= */

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);


  const totalRecords =
    records.length;


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalRecords /
        PAGE_SIZE
      )
    );


  useEffect(
    () => {
      setCurrentPage(1);
    },
    [
      records,
      activeView,
    ]
  );


  useEffect(
    () => {
      if (
        currentPage >
        totalPages
      ) {
        setCurrentPage(
          totalPages
        );
      }
    },
    [
      currentPage,
      totalPages,
    ]
  );


  const paginatedRecords =
    useMemo(
      () => {
        const start =
          (
            currentPage -
            1
          ) *
          PAGE_SIZE;

        return records.slice(
          start,
          start +
            PAGE_SIZE
        );
      },
      [
        records,
        currentPage,
      ]
    );


  const visibleFrom =
    totalRecords === 0
      ? 0
      : (
          currentPage -
          1
        ) *
          PAGE_SIZE +
        1;


  const visibleTo =
    Math.min(
      currentPage *
        PAGE_SIZE,
      totalRecords
    );


  const visiblePages =
    useMemo(
      () => {
        if (
          totalPages <= 7
        ) {
          return Array.from(
            {
              length:
                totalPages,
            },
            (
              _,
              index
            ) =>
              index + 1
          );
        }

        const pages =
          new Set([
            1,
            totalPages,
            currentPage,
            currentPage - 1,
            currentPage + 1,
          ]);

        return Array.from(
          pages
        )
          .filter(
            (page) =>
              page >= 1 &&
              page <=
                totalPages
          )
          .sort(
            (a, b) =>
              a - b
          );
      },
      [
        currentPage,
        totalPages,
      ]
    );


  const goToPage = (
    page
  ) => {
    const nextPage =
      Math.min(
        Math.max(
          Number(page) ||
            1,
          1
        ),
        totalPages
      );

    setCurrentPage(
      nextPage
    );

    window.requestAnimationFrame(
      () => {
        document
          .querySelector(
            ".se-att-register-v3"
          )
          ?.scrollIntoView({
            behavior:
              "smooth",

            block:
              "start",
          });
      }
    );
  };


  /* =======================================================
     LATE FALLBACK

     AttendancePage passes the company 09:10 rule.

     This fallback exists only so this component remains
     safe if used elsewhere.
  ======================================================= */

  const isLate = (
    record
  ) => {
    if (
      typeof externalIsRecordLate ===
      "function"
    ) {
      return Boolean(
        externalIsRecordLate(
          record
        )
      );
    }

    return Boolean(
      record?.isLate
    );
  };


  /* =======================================================
     OPEN DETAILS
  ======================================================= */

  const openRecord = (
    record
  ) => {
    if (
      typeof onOpen ===
      "function"
    ) {
      onOpen(
        record
      );
    }
  };


  const handleRowKeyDown = (
    event,
    record
  ) => {
    if (
      event.key ===
        "Enter" ||
      event.key ===
        " "
    ) {
      event.preventDefault();

      openRecord(
        record
      );
    }
  };


  /* =======================================================
     VIEW META
  ======================================================= */

  const viewMeta =
    useMemo(
      () => {
        switch (
          activeView
        ) {
          case "ABSENT":
            return {
              eyebrow:
                "ABSENT WORKFORCE",

              description:
                "Employees without attendance for the selected business date.",
            };

          case "LATE":
            return {
              eyebrow:
                "LATE ARRIVALS",

              description:
                "Present employees who checked in after 09:10 AM.",
            };

          case "WFH":
            return {
              eyebrow:
                "WORK FROM HOME",

              description:
                "Present employees currently recorded as work from home.",
            };

          case "FIELD":
            return {
              eyebrow:
                "FIELD VISIT",

              description:
                "Present employees working outside the office on field activity.",
            };

          case "ON_DUTY":
            return {
              eyebrow:
                "ON DUTY",

              description:
                "Present employees assigned to official duty.",
            };

          case "PRESENT":
          default:
            return {
              eyebrow:
                "PRESENT WORKFORCE",

              description:
                "Employees with attendance for the selected business date.",
            };
        }
      },
      [
        activeView,
      ]
    );


  /* =======================================================
     UI
  ======================================================= */

  return (
    <section
      className={`se-people-att-register-card se-att-register-v3 se-att-register-v4 ${
        compact
          ? "se-att-register-v3--compact"
          : ""
      }`}
    >

      {/* ===============================================
          DARK REGISTER HEADER
      =============================================== */}

      <div className="se-att-register-v4-head">

        <div className="se-att-register-v4-head-copy">

          <span className="se-att-register-v4-eyebrow">
            {viewMeta.eyebrow}
          </span>

          <div className="se-att-register-v4-title-row">

            <h2>
              {viewLabel} attendance
            </h2>

            <span className="se-att-register-v4-live">
              <i />
              LIVE REGISTER
            </span>

          </div>

          <p>
            {viewMeta.description}
          </p>

        </div>


        <div className="se-att-register-v4-count">

          <strong>
            {totalRecords}
          </strong>

          <span>
            {activeView ===
            "PRESENT"
              ? "Present"
              : viewLabel}
          </span>

        </div>

      </div>


      {/* ===============================================
          LOADING
      =============================================== */}

      {loading ? (

        <div className="se-people-att-loading se-att-register-v3-loading">

          <span />

          <div>

            <strong>
              Loading attendance
            </strong>

            <small>
              Fetching workforce attendance…
            </small>

          </div>

        </div>

      ) : !records.length ? (

        /* =============================================
           EMPTY
        ============================================= */

        <div className="se-people-att-empty se-att-register-v3-empty">

          <div className="se-att-register-v3-empty-icon">

            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="3.5"
                y="5"
                width="17"
                height="15.5"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.6"
              />

              <path
                d="M8 3.5v4M16 3.5v4M3.5 10h17"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />

              <path
                d="m9 15 2 2 4-4"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

          </div>

          <strong>
            No {viewLabel.toLowerCase()} employees
          </strong>

          <p>
            No employees match this attendance view for the selected date and filters.
          </p>

        </div>

      ) : (

        <>
          {/* ===========================================
              TABLE
          =========================================== */}

          <div className="se-people-att-table-wrap se-att-register-v3-table-wrap se-att-register-v4-table-wrap">

            <table className="se-people-att-table se-att-register-v3-table se-att-register-v4-table">

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

                  {!compact ? (
                    <th>
                      Office
                    </th>
                  ) : null}

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

                  {!compact ? (
                    <th>
                      Source
                    </th>
                  ) : null}

                  <th
                    className="se-att-register-v3-action-head"
                    aria-label="View details"
                  />

                </tr>

              </thead>


              <tbody>

                {paginatedRecords.map(
                  (
                    record
                  ) => {

                    const recordKey =
                      record?._id ||
                      `${record?.employeeId || record?.biometricCode || record?.employeeCode}-${record?.businessDate}-${record?.attendanceDeviceId || ""}`;


                    const employeeName =
                      record?.employeeName ||
                      record?.machineEmployeeName ||
                      record?.biometricEmployeeName ||
                      record?.biometricCode ||
                      record?.employeeCode ||
                      "Biometric Worker";


                    const employeeCode =
                      record?.employeeCode ||
                      record?.biometricCode ||
                      record?.machineUserId ||
                      "—";


                    const officeLabel =
                      record?.officeName ||
                      record?.shortLocation ||
                      record?.workLocation ||
                      record?.locationName ||
                      (
                        String(
                          record?.provider ||
                          ""
                        ).toUpperCase() ===
                        "ESSL"
                          ? "Sonipat"
                          : "—"
                      );


                    const biometricOnly =
                      Boolean(
                        record?.isBiometricOnly ||
                        (
                          !record?.employeeId &&
                          (
                            record?.biometricCode ||
                            record?.machineUserId
                          )
                        )
                      );


                    const sourceLabel =
                      attendanceSource(
                        record
                      );


                    const late =
                      isLate(
                        record
                      );


                    const checkIn =
                      checkInOf(
                        record
                      );


                    const checkOut =
                      validCheckOutOf(
                        record
                      );


                    const status =
                      displayStatusOf(
                        record
                      );


                    const exceptions =
                      getExceptions(
                        record,
                        late
                      );


                    const mode =
                      normalizedModeOf(
                        record
                      );


                    return (
                      <tr
                        key={
                          recordKey
                        }

                        className={`se-att-register-v3-row se-att-register-v4-row ${
                          biometricOnly
                            ? "se-att-register-v3-row--biometric"
                            : ""
                        } ${
                          late
                            ? "se-att-register-v4-row--late"
                            : ""
                        }`}

                        onClick={() =>
                          openRecord(
                            record
                          )
                        }

                        onKeyDown={(
                          event
                        ) =>
                          handleRowKeyDown(
                            event,
                            record
                          )
                        }

                        tabIndex={0}
                        role="button"

                        aria-label={`View attendance details for ${employeeName}`}
                      >

                        {/* EMPLOYEE */}

                        <td className="se-att-register-v3-employee-cell">

                          <div className="se-people-att-person se-att-register-v3-person">

                            <span className="se-att-register-v3-avatar">

                              {initials(
                                employeeName
                              )}

                            </span>


                            <div className="se-att-register-v3-person-copy">

                              <strong>
                                {employeeName}
                              </strong>

                              <small>

                                {employeeCode}

                                {record?.departmentName
                                  ? ` · ${record.departmentName}`
                                  : biometricOnly
                                    ? " · Biometric"
                                    : ""}

                              </small>

                            </div>

                          </div>

                        </td>


                        {/* DATE */}

                        <td>

                          <strong className="se-att-register-v3-date">

                            {formatDate(
                              record?.businessDate
                            )}

                          </strong>

                        </td>


                        {/* STATUS */}

                        <td>

                          <div className="se-att-register-v4-status-stack">

                            <AttendanceStatusBadge
                              status={
                                status
                              }
                            />

                            {late ? (
                              <span className="se-att-register-v4-late-badge">
                                Late
                              </span>
                            ) : null}

                          </div>

                        </td>


                        {/* MODE */}

                        <td>

                          <span
                            className={`se-people-att-mode se-people-att-mode--${mode
                              .toLowerCase()
                              .replaceAll(
                                "_",
                                "-"
                              )}`}
                          >

                            {workModeLabel(
                              mode
                            )}

                          </span>

                        </td>


                        {/* OFFICE */}

                        {!compact ? (

                          <td>

                            <span className="se-att-register-v3-office">

                              {officeLabel}

                            </span>

                          </td>

                        ) : null}


                        {/* SHIFT */}

                        <td>

                          <div className="se-att-register-v3-shift">

                            <strong>

                              {record?.shiftCode ||
                                record?.shiftName ||
                                "—"}

                            </strong>

                            {record?.expectedStartAt &&
                            record?.expectedEndAt ? (

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


                        {/* CHECK IN */}

                        <td>

                          <span className="se-att-register-v3-time se-att-register-v3-time--in">

                            {checkIn
                              ? formatTime(
                                  checkIn
                                )
                              : "—"}

                          </span>

                        </td>


                        {/* CHECK OUT */}

                        <td>

                          <span
                            className={`se-att-register-v3-time se-att-register-v3-time--out ${
                              !checkOut
                                ? "se-att-register-v4-time--empty"
                                : ""
                            }`}
                          >

                            {checkOut
                              ? formatTime(
                                  checkOut
                                )
                              : "—"}

                          </span>

                        </td>


                        {/* WORKING */}

                        <td>

                          <strong className="se-att-register-v4-working">

                            {formatWorkingHHMM(
                              record
                            )}

                          </strong>

                        </td>


                        {/* EXCEPTION */}

                        <td>

                          {exceptions.length ? (

                            <div className="se-att-register-v4-exceptions">

                              {exceptions.map(
                                (
                                  exception,
                                  index
                                ) => (

                                  <span
                                    key={`${recordKey}-exception-${index}`}
                                    className={`se-att-register-v4-exception ${
                                      exception
                                        .toLowerCase()
                                        .includes(
                                          "late"
                                        )
                                        ? "is-late"
                                        : ""
                                    }`}
                                  >

                                    {exception}

                                  </span>

                                )
                              )}

                            </div>

                          ) : (

                            <span className="se-att-register-v4-normal">
                              Normal
                            </span>

                          )}

                        </td>


                        {/* SOURCE */}

                        {!compact ? (

                          <td>

                            <span className="se-att-register-v3-source">

                              {sourceLabel ||
                                "—"}

                            </span>

                          </td>

                        ) : null}


                        {/* ACTION */}

                        <td className="se-att-register-v3-action">

                          <button
                            type="button"
                            className="se-att-register-v4-view-button"

                            onClick={(
                              event
                            ) => {
                              event.stopPropagation();

                              openRecord(
                                record
                              );
                            }}

                            aria-label={`Open ${employeeName} attendance`}
                          >

                            <svg
                              width="17"
                              height="17"
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >

                              <path
                                d="M9 18l6-6-6-6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />

                            </svg>

                          </button>

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>


          {/* ===========================================
              PAGINATION
          =========================================== */}

          {totalPages > 1 ? (

            <div className="se-att-register-v4-pagination">

              <div className="se-att-register-v4-pagination-info">

                Showing

                <strong>
                  {visibleFrom}
                </strong>

                –

                <strong>
                  {visibleTo}
                </strong>

                of

                <strong>
                  {totalRecords}
                </strong>

              </div>


              <div className="se-att-register-v4-pagination-actions">

                <button
                  type="button"
                  disabled={
                    currentPage ===
                    1
                  }
                  onClick={() =>
                    goToPage(
                      currentPage -
                        1
                    )
                  }
                >
                  Previous
                </button>


                {visiblePages.map(
                  (
                    page,
                    index
                  ) => {

                    const previous =
                      visiblePages[
                        index - 1
                      ];

                    return (
                      <React.Fragment
                        key={
                          page
                        }
                      >

                        {previous &&
                        page -
                          previous >
                          1 ? (

                          <span className="se-att-register-v4-page-gap">
                            …
                          </span>

                        ) : null}


                        <button
                          type="button"

                          className={
                            page ===
                            currentPage
                              ? "is-active"
                              : ""
                          }

                          onClick={() =>
                            goToPage(
                              page
                            )
                          }
                        >

                          {page}

                        </button>

                      </React.Fragment>
                    );
                  }
                )}


                <button
                  type="button"
                  disabled={
                    currentPage ===
                    totalPages
                  }
                  onClick={() =>
                    goToPage(
                      currentPage +
                        1
                    )
                  }
                >
                  Next
                </button>

              </div>

            </div>

          ) : null}

        </>
      )}

    </section>
  );
}


export default AttendanceRegister;
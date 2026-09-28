import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../../../auth/AuthContext";

import {
  downloadMonthlyAttendance,
  getAttendance,
  getMyAttendance,
  startWebAttendance,
  stopWebAttendance,
} from "../../../services/attendanceService";

import AttendanceDetailsDrawer from "./components/AttendanceDetailsDrawer";

import AttendanceFilters from "./components/AttendanceFilters";

import AttendanceRegister from "./components/AttendanceRegister";

import AttendanceSummary from "./components/AttendanceSummary";

import MyAttendanceCard from "./components/MyAttendanceCard";

import RegularizationModal from "./components/RegularizationModal";

import {
  attendanceSource,
  formatTime,
  monthRange,
  normalizedMode,
  rangeLabel,
  todayKey,
  weekRange,
} from "./utils/attendanceHelpers";

import "./Attendance.css";

/* =========================================================
   RESPONSE RECORDS
========================================================= */

const recordsOf = (
  result
) => {
  return (
    result?.items ||
    result?.records ||
    []
  );
};

const biometricRecordsOf = (result) => {
  const biometric =
    result?.biometric;

  if (
    Array.isArray(
      biometric?.unmapped
    )
  ) {
    return biometric.unmapped;
  }

  if (
    Array.isArray(
      biometric?.items
    )
  ) {
    return biometric.items;
  }

  if (
    Array.isArray(
      result?.unmapped?.items
    )
  ) {
    return result.unmapped.items;
  }

  if (
    Array.isArray(
      result?.biometricItems
    )
  ) {
    return result.biometricItems;
  }

  return [];
};

const normalizeBiometricRegisterRecord = (
  record
) => {
  const biometricCode =
    record?.biometricCode ||
    record?.machineUserId ||
    record?.employeeCode ||
    "";

  const employeeName =
    record?.employeeName ||
    record?.machineEmployeeName ||
    record?.biometricEmployeeName ||
    biometricCode ||
    "Biometric Worker";

  const firstInAt =
    record?.firstInAt ||
    record?.firstPunchAt ||
    record?.firstPunch ||
    record?.firstIn?.time ||
    null;

  const lastOutAt =
    record?.lastOutAt ||
    record?.lastPunchAt ||
    record?.lastPunch ||
    record?.lastOut?.time ||
    null;

  const rawPunchCount =
    Number(
      record?.rawPunchCount ||
      record?.punchCount ||
      record?.scanCount ||
      0
    ) || 0;

  return {
    ...record,

    _id:
      record?._id ||
      `biometric-${record?.attendanceDeviceId || record?.deviceCode || "device"}-${biometricCode}-${record?.businessDate || record?.date || "day"}`,

    employeeId:
      record?.employeeId ||
      null,

    employeeCode:
      record?.employeeCode ||
      biometricCode,

    biometricCode,

    employeeName,

    machineEmployeeName:
      record?.machineEmployeeName ||
      record?.biometricEmployeeName ||
      employeeName,

    businessDate:
      record?.businessDate ||
      record?.date ||
      "",

    firstInAt,

    lastOutAt,

    presenceStatus:
      record?.presenceStatus ||
      (
        firstInAt
          ? "PRESENT"
          : "NOT_MARKED"
      ),

    workMode:
      record?.workMode ||
      "OFFICE",

    provider:
      record?.provider ||
      "ESSL",

    source:
      record?.source ||
      "BIOMETRIC",

    officeName:
      record?.officeName ||
      record?.shortLocation ||
      record?.locationName ||
      record?.workLocation ||
      (
        String(
          record?.provider ||
          ""
        ).toUpperCase() ===
        "ESSL"
          ? "Sonipat Office"
          : ""
      ),

    workLocation:
      record?.workLocation ||
      record?.shortLocation ||
      record?.locationName ||
      record?.officeName ||
      (
        String(
          record?.provider ||
          ""
        ).toUpperCase() ===
        "ESSL"
          ? "Sonipat"
          : ""
      ),

    rawPunchCount,

    isBiometricOnly:
      !record?.employeeId,

    missingCheckOut:
      Boolean(
        record?.missingCheckOut ||
        (
          firstInAt &&
          !lastOutAt
        )
      ),
  };
};

const mergeUniqueAttendanceRecords = (
  mapped = [],
  biometric = []
) => {
  const output =
    new Map();

  [
    ...mapped,
    ...biometric,
  ].forEach(
    (
      record
    ) => {
      const key =
        record?._id ||
        `${record?.employeeId || record?.biometricCode || record?.employeeCode || "worker"}-${record?.businessDate || record?.date || "day"}-${record?.attendanceDeviceId || record?.deviceCode || ""}`;

      if (
        !output.has(
          key
        )
      ) {
        output.set(
          key,
          record
        );
      }
    }
  );

  return [
    ...output.values(),
  ];
};

/* =========================================================
   VALUE NORMALIZER
========================================================= */

const normalizeValue = (
  value
) =>
  String(
    value ||
    ""
  )
    .trim()
    .toUpperCase();

/* =========================================================
   PERMISSION NORMALIZER
========================================================= */

const collectPermissions =
  (
    user,
    authAccess
  ) => {
    const values = [
      ...(
        Array.isArray(
          authAccess?.permissions
        )
          ? authAccess.permissions
          : []
      ),

      ...(
        Array.isArray(
          user?.permissions
        )
          ? user.permissions
          : []
      ),
    ];

    return new Set(
      values.map(
        normalizeValue
      )
    );
  };

/* =========================================================
   DEPARTMENT MEMBERSHIPS
========================================================= */

const collectMemberships =
  (
    user,
    authAccess
  ) => {
    const candidates = [
      authAccess
        ?.departmentMemberships,

      authAccess
        ?.memberships,

      authAccess
        ?.departments,

      user
        ?.departmentMemberships,

      user
        ?.memberships,
    ];

    const memberships =
      candidates.find(
        Array.isArray
      ) ||
      [];

    const primary =
      authAccess
        ?.primaryDepartment ||
      user
        ?.primaryDepartment ||
      null;

    if (
      primary &&
      typeof primary ===
        "object"
    ) {
      return [
        ...memberships,
        primary,
      ];
    }

    return memberships;
  };

/* =========================================================
   HR MEMBERSHIP
========================================================= */

const findHrMembership =
  (
    memberships
  ) => {
    return memberships.find(
      (
        membership
      ) => {
        const department =
          membership?.department ||
          membership;

        const code =
          normalizeValue(
            department?.code ||
            membership
              ?.departmentCode
          );

        const name =
          normalizeValue(
            department?.name ||
            membership
              ?.departmentName
          );

        return (
          code ===
            "HR" ||
          name ===
            "HR" ||
          name ===
            "HUMAN RESOURCES"
        );
      }
    );
  };

/* =========================================================
   ATTENDANCE ACCESS

   Frontend controls visibility only.

   Backend remains the authority.
========================================================= */

const resolveAttendanceAccess =
  (
    user,
    authAccess
  ) => {
    const permissions =
      collectPermissions(
        user,
        authAccess
      );

    const memberships =
      collectMemberships(
        user,
        authAccess
      );

    const systemRole =
      normalizeValue(
        authAccess
          ?.systemRole ||
        user
          ?.systemRole ||
        user
          ?.role
      );

    const legacyRole =
      normalizeValue(
        user?.role
      );

    const globalSuperAdmin =
      Boolean(
        authAccess
          ?.globalSuperAdmin ||
        authAccess
          ?.superAdmin ||
        systemRole ===
          "SUPER_ADMIN" ||
        legacyRole ===
          "SUPER_ADMIN"
      );

    const hrMembership =
      findHrMembership(
        memberships
      );

    const hrRole =
      normalizeValue(
        hrMembership?.role ||
        hrMembership
          ?.departmentRole
      );

    const isHrHead =
      Boolean(
        hrMembership
      ) &&
      [
        "HOD",
        "HEAD",
        "DEPARTMENT_HEAD",
        "DEPARTMENT_SUPER_ADMIN",
        "ADMIN",
      ].includes(
        hrRole
      );

    const isHead =
      legacyRole ===
        "HEAD" ||
      memberships.some(
        (
          membership
        ) =>
          [
            "HOD",
            "HEAD",
            "DEPARTMENT_HEAD",
            "DEPARTMENT_SUPER_ADMIN",
          ].includes(
            normalizeValue(
              membership
                ?.role ||
              membership
                ?.departmentRole
            )
          )
      );

    const isManager =
      legacyRole ===
        "MANAGER";

    const canViewAll =
      globalSuperAdmin ||
      permissions.has(
        "ATTENDANCE_VIEW_ALL"
      );

    const canViewTeam =
      permissions.has(
        "ATTENDANCE_VIEW_TEAM"
      ) ||
      isManager;

    const canViewRegister =
      canViewAll ||
      canViewTeam ||
      isHead ||
      isHrHead;

    const canRegularizeSelf =
      globalSuperAdmin ||
      permissions.has(
        "ATTENDANCE_REGULARIZE_SELF"
      );

    const canApproveRegularization =
      globalSuperAdmin ||
      permissions.has(
        "ATTENDANCE_APPROVE_REGULARIZATION"
      );

    const canViewLocations =
      globalSuperAdmin ||
      isHrHead ||
      permissions.has(
        "ATTENDANCE_VIEW_FIELD_LOCATION"
      );

    /*
     * Export deliberately stays restricted.

     * HR Head / privileged HR / Super Admin.
     */

    const canExport =
      globalSuperAdmin ||
      isHrHead ||
      (
        canViewAll &&
        permissions.has(
          "ATTENDANCE_EXPORT"
        )
      );

    return {
      globalSuperAdmin,

      isHrHead,

      isHead,

      isManager,

      canViewAll,

      canViewTeam,

      canViewRegister,

      canRegularizeSelf,

      canApproveRegularization,

      canViewLocations,

      canExport,
    };
  };



/* =========================================================
   BROWSER GEOLOCATION

   IMPORTANT:

   Do NOT pre-block using navigator.permissions.query().

   Always call getCurrentPosition().

   Why?

   1. If permission is PROMPT:
      Chrome displays Allow / Block.

   2. If permission is GRANTED:
      Chrome returns location.

   3. If permission is DENIED:
      Chrome returns PERMISSION_DENIED.

   JavaScript cannot force Chrome to reopen a permission
   prompt after the user/browser has permanently blocked it.
========================================================= */

const getBrowserLocation =
  () =>
    new Promise(
      (
        resolve,
        reject
      ) => {
        /* =================================================
           BROWSER SUPPORT
        ================================================= */

        if (
          typeof navigator ===
            "undefined" ||
          !navigator.geolocation
        ) {
          reject(
            new Error(
              "Location is not supported by this browser."
            )
          );

          return;
        }

        /* =================================================
           HTTPS CHECK

           localhost and 127.0.0.1 are valid for development.
        ================================================= */

        if (
          typeof window !==
            "undefined" &&
          !window.isSecureContext &&
          window.location.hostname !==
            "localhost" &&
          window.location.hostname !==
            "127.0.0.1"
        ) {
          reject(
            new Error(
              "Location requires a secure HTTPS connection."
            )
          );

          return;
        }

        /* =================================================
           ACTUAL GEOLOCATION REQUEST

           THIS is what causes Chrome to ask permission when
           permission state is still PROMPT.
        ================================================= */

        navigator.geolocation.getCurrentPosition(
          (
            position
          ) => {
            const latitude =
              Number(
                position
                  ?.coords
                  ?.latitude
              );

            const longitude =
              Number(
                position
                  ?.coords
                  ?.longitude
              );

            const accuracy =
              Number(
                position
                  ?.coords
                  ?.accuracy
              );

            /* =============================================
               VALIDATE LATITUDE
            ============================================= */

            if (
              !Number.isFinite(
                latitude
              ) ||
              latitude < -90 ||
              latitude > 90
            ) {
              reject(
                new Error(
                  "Browser returned an invalid latitude."
                )
              );

              return;
            }

            /* =============================================
               VALIDATE LONGITUDE
            ============================================= */

            if (
              !Number.isFinite(
                longitude
              ) ||
              longitude < -180 ||
              longitude > 180
            ) {
              reject(
                new Error(
                  "Browser returned an invalid longitude."
                )
              );

              return;
            }

            /* =============================================
               SUCCESS
            ============================================= */

            resolve({
              latitude,

              longitude,

              accuracyMeters:
                Number.isFinite(
                  accuracy
                ) &&
                accuracy >= 0
                  ? accuracy
                  : null,
            });
          },

          (
            geoError
          ) => {
            console.error(
              "[Attendance] Geolocation error:",
              {
                code:
                  geoError?.code,

                message:
                  geoError?.message,
              }
            );

            /* =============================================
               PERMISSION DENIED

               Chrome WILL NOT show another permission popup
               when permission was previously permanently
               blocked.

               Employee must change site permission.
            ============================================= */

            if (
              geoError?.code ===
                geoError?.PERMISSION_DENIED ||
              geoError?.code ===
                1
            ) {
              reject(
                new Error(
                  "Location is blocked for this site. Click the site controls icon beside localhost in the address bar, allow Location, then click Start Attendance again."
                )
              );

              return;
            }

            /* =============================================
               LOCATION UNAVAILABLE
            ============================================= */

            if (
              geoError?.code ===
                geoError?.POSITION_UNAVAILABLE ||
              geoError?.code ===
                2
            ) {
              reject(
                new Error(
                  "Your device could not determine your current location. Turn on Location Services and try again."
                )
              );

              return;
            }

            /* =============================================
               TIMEOUT
            ============================================= */

            if (
              geoError?.code ===
                geoError?.TIMEOUT ||
              geoError?.code ===
                3
            ) {
              reject(
                new Error(
                  "Location request timed out. Check Location Services and try again."
                )
              );

              return;
            }

            reject(
              new Error(
                "Your current location could not be obtained."
              )
            );
          },

          {
            enableHighAccuracy:
              true,

            timeout:
              20000,

            maximumAge:
              0,
          }
        );
      }
    );

/* =========================================================
   PERSONAL ATTENDANCE CALENDAR
========================================================= */

const CALENDAR_STATUS_META = {
  PRESENT: {
    label: "Present",
    className: "present",
  },

  ABSENT: {
    label: "Absent",
    className: "absent",
  },

  ON_LEAVE: {
    label: "Leave",
    className: "leave",
  },

  HALF_DAY: {
    label: "Half day",
    className: "half-day",
  },

  WEEK_OFF: {
    label: "Sunday / Week off",
    className: "week-off",
  },

  HOLIDAY: {
    label: "Holiday",
    className: "holiday",
  },

  NO_CHECKOUT: {
    label: "No checkout",
    className: "no-checkout",
  },

  NOT_MARKED: {
    label: "No record",
    className: "not-marked",
  },
};

const calendarDateKey = (
  value
) => {
  if (
    !value
  ) {
    return "";
  }

  return String(
    value
  ).slice(
    0,
    10
  );
};

const calendarStatusOf = (
  record
) => {
  if (
    !record
  ) {
    return "NOT_MARKED";
  }

  if (
    record?.missingCheckOut ||
    (
      (
        record?.firstInAt ||
        record?.firstIn?.time
      ) &&
      !(
        record?.lastOutAt ||
        record?.lastOut?.time
      )
    )
  ) {
    return "NO_CHECKOUT";
  }

  return (
    record?.presenceStatus ||
    "NOT_MARKED"
  );
};

function PersonalAttendanceCalendar({
  records = [],
  from,
  to,
}) {

    /* =========================================================
     SELECTED CALENDAR DAY
  ========================================================= */

  const [
    selectedCalendarDay,
    setSelectedCalendarDay,
  ] = useState(null);
  
  const today = useMemo(
    () => todayKey(),
    []
  );

  /* =========================================================
     CALENDAR MONTH

     IMPORTANT:
     History filters can still be Today / Week / Month / Custom,
     but the calendar ALWAYS renders the complete month.

     We use "from" only to decide which month should be visible.
  ========================================================= */

  const calendarMonth = useMemo(() => {
    const sourceDate =
      from || today;

    const parsed =
      new Date(
        `${sourceDate}T00:00:00+05:30`
      );

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return null;
    }

    return {
      year: Number(
        new Intl.DateTimeFormat(
          "en-IN",
          {
            timeZone:
              "Asia/Kolkata",

            year:
              "numeric",
          }
        ).format(parsed)
      ),

      month: Number(
        new Intl.DateTimeFormat(
          "en-IN",
          {
            timeZone:
              "Asia/Kolkata",

            month:
              "numeric",
          }
        ).format(parsed)
      ),
    };
  }, [
    from,
    today,
  ]);


  /* =========================================================
     MONTH TITLE
  ========================================================= */

  const monthTitle = useMemo(() => {
    if (!calendarMonth) {
      return "Attendance calendar";
    }

    const date =
      new Date(
        Date.UTC(
          calendarMonth.year,
          calendarMonth.month - 1,
          1
        )
      );

    return new Intl.DateTimeFormat(
      "en-IN",
      {
        timeZone:
          "Asia/Kolkata",

        month:
          "long",

        year:
          "numeric",
      }
    ).format(date);
  }, [
    calendarMonth,
  ]);


  /* =========================================================
     RECORD LOOKUP
  ========================================================= */

  const recordsByDate = useMemo(() => {
    const map =
      new Map();

    records.forEach(
      (record) => {
        const key =
          calendarDateKey(
            record?.businessDate ||
            record?.date
          );

        if (key) {
          map.set(
            key,
            record
          );
        }
      }
    );

    return map;
  }, [
    records,
  ]);


  /* =========================================================
     COMPLETE MONTH GRID

     Monday-first calendar.
     Blank cells are inserted before/after the actual month.
  ========================================================= */

  const calendarCells = useMemo(() => {
    if (!calendarMonth) {
      return [];
    }

    const {
      year,
      month,
    } = calendarMonth;

    const firstDay =
      new Date(
        Date.UTC(
          year,
          month - 1,
          1
        )
      );

    const daysInMonth =
      new Date(
        Date.UTC(
          year,
          month,
          0
        )
      ).getUTCDate();

    /*
     JS:
     Sunday = 0
     Monday = 1

     Calendar:
     Monday = column 0
     ...
     Sunday = column 6
    */

    const leadingBlanks =
      (
        firstDay.getUTCDay() +
        6
      ) % 7;

    const cells = [];

    for (
      let i = 0;
      i < leadingBlanks;
      i += 1
    ) {
      cells.push({
        type: "blank",
        key: `before-${i}`,
      });
    }

    for (
      let dayNumber = 1;
      dayNumber <= daysInMonth;
      dayNumber += 1
    ) {
      const monthString =
        String(
          month
        ).padStart(
          2,
          "0"
        );

      const dayString =
        String(
          dayNumber
        ).padStart(
          2,
          "0"
        );

      const key =
        `${year}-${monthString}-${dayString}`;

      const date =
        new Date(
          Date.UTC(
            year,
            month - 1,
            dayNumber
          )
        );

      const weekday =
        new Intl.DateTimeFormat(
          "en-US",
          {
            timeZone:
              "UTC",

            weekday:
              "short",
          }
        ).format(date);

      const record =
        recordsByDate.get(
          key
        ) || null;

      let status =
        calendarStatusOf(
          record
        );

      /*
       * Sunday without attendance record
       * = Week Off.
       */
      if (
        !record &&
        weekday === "Sun"
      ) {
        status =
          "WEEK_OFF";
      }

      const meta =
        CALENDAR_STATUS_META[
          status
        ] ||
        CALENDAR_STATUS_META
          .NOT_MARKED;

      cells.push({
        type: "day",

        key,

        date,

        day:
          dayNumber,

        weekday,

        record,

        status,

        meta,

        isToday:
          key === today,

        isSelectedRange:
          Boolean(
            from &&
            to &&
            key >= from &&
            key <= to
          ),
      });
    }

    /*
     * Complete final week so the calendar
     * always has a clean rectangular grid.
     */

    const remainder =
      cells.length % 7;

    if (remainder) {
      const trailing =
        7 - remainder;

      for (
        let i = 0;
        i < trailing;
        i += 1
      ) {
        cells.push({
          type: "blank",
          key: `after-${i}`,
        });
      }
    }

    return cells;
  }, [
    calendarMonth,
    recordsByDate,
    today,
    from,
    to,
  ]);


  /* =========================================================
     MONTH SUMMARY
  ========================================================= */

  const monthSummary = useMemo(() => {
    const result = {
      present: 0,
      absent: 0,
      leave: 0,
    };

    calendarCells.forEach(
      (cell) => {
        if (
          cell.type !==
          "day"
        ) {
          return;
        }

        if (
          cell.status ===
          "PRESENT"
        ) {
          result.present += 1;
        }

        if (
          cell.status ===
          "ABSENT"
        ) {
          result.absent += 1;
        }

        if (
          cell.status ===
          "ON_LEAVE"
        ) {
          result.leave += 1;
        }
      }
    );

    return result;
  }, [
    calendarCells,
  ]);


  return (
    <section className="se-att-calendar-card se-att-calendar-card--full">

      {/* HEADER */}

      <div className="se-att-calendar-head">

        <div className="se-att-calendar-title">

          <span className="se-att-calendar-eyebrow">
            CALENDAR
          </span>

          <h3>
            {monthTitle}
          </h3>

          <p>
            Your attendance at a glance
          </p>

        </div>


        <div className="se-att-calendar-summary">

          <div className="se-att-calendar-summary-item se-att-calendar-summary-item--present">
            <strong>
              {monthSummary.present}
            </strong>

            <span>
              Present
            </span>
          </div>


          <div className="se-att-calendar-summary-item se-att-calendar-summary-item--absent">
            <strong>
              {monthSummary.absent}
            </strong>

            <span>
              Absent
            </span>
          </div>


          <div className="se-att-calendar-summary-item se-att-calendar-summary-item--leave">
            <strong>
              {monthSummary.leave}
            </strong>

            <span>
              Leave
            </span>
          </div>

        </div>

      </div>


      {/* WEEKDAY HEADER */}

      <div className="se-att-calendar-weekdays">

        {[
          "MON",
          "TUE",
          "WED",
          "THU",
          "FRI",
          "SAT",
          "SUN",
        ].map(
          (day) => (
            <span
              key={day}
            >
              {day}
            </span>
          )
        )}

      </div>


      {/* FULL MONTH */}

      <div className="se-att-calendar-grid">

        {calendarCells.map(
          (cell) => {

            if (
              cell.type ===
              "blank"
            ) {
              return (
                <div
                  key={
                    cell.key
                  }
                  className="se-att-calendar-day se-att-calendar-day--blank"
                  aria-hidden="true"
                />
              );
            }

            const {
              meta,
              record,
            } = cell;

            const firstIn =
              record?.firstInAt ||
              record?.firstIn?.time ||
              null;

            const lastOut =
              record?.lastOutAt ||
              record?.lastOut?.time ||
              null;

            return (
  <button
    type="button"
    key={cell.key}
    className={[
      "se-att-calendar-day",
      "se-att-calendar-day--clickable",

      `se-att-calendar-day--${meta.className}`,

      cell.isToday
        ? "se-att-calendar-day--today"
        : "",

      cell.isSelectedRange
        ? "se-att-calendar-day--selected"
        : "",
    ]
      .filter(Boolean)
      .join(" ")}
    title={`${cell.key} · ${meta.label}`}
    onClick={() =>
      setSelectedCalendarDay(cell)
    }
  >

    <div className="se-att-calendar-day-top">

      <strong>
        {cell.day}
      </strong>

      {cell.isToday ? (
        <span className="se-att-calendar-today">
          TODAY
        </span>
      ) : null}

    </div>


    {/* ROUND ATTENDANCE STATUS */}

    <div
      className={[
        "se-att-calendar-round-status",
        `se-att-calendar-round-status--${meta.className}`,
      ].join(" ")}
      aria-label={meta.label}
    >
      <span className="se-att-calendar-round-dot" />

      {record ? (
        <span className="se-att-calendar-round-mark">
          {cell.status === "PRESENT"
            ? "✓"
            : cell.status === "ABSENT"
              ? "×"
              : cell.status === "ON_LEAVE"
                ? "L"
                : cell.status === "HALF_DAY"
                  ? "½"
                  : cell.status === "NO_CHECKOUT"
                    ? "!"
                    : cell.status === "HOLIDAY"
                      ? "H"
                      : cell.status === "WEEK_OFF"
                        ? "W"
                        : "•"}
        </span>
      ) : (
        <span className="se-att-calendar-round-mark">
          {cell.status === "WEEK_OFF"
            ? "W"
            : "•"}
        </span>
      )}
    </div>

  </button>
);
          }
        )}

      </div>


      {/* LEGEND */}

      <div className="se-att-calendar-legend">

        <span>
          <i className="se-att-calendar-legend-dot se-att-calendar-legend-dot--present" />
          Present
        </span>

        <span>
          <i className="se-att-calendar-legend-dot se-att-calendar-legend-dot--absent" />
          Absent
        </span>

        <span>
          <i className="se-att-calendar-legend-dot se-att-calendar-legend-dot--leave" />
          Leave
        </span>

        <span>
          <i className="se-att-calendar-legend-dot se-att-calendar-legend-dot--half-day" />
          Half day
        </span>

        <span>
          <i className="se-att-calendar-legend-dot se-att-calendar-legend-dot--week-off" />
          Sunday / Week off
        </span>

        <span>
          <i className="se-att-calendar-legend-dot se-att-calendar-legend-dot--holiday" />
          Holiday
        </span>

        <span>
          <i className="se-att-calendar-legend-dot se-att-calendar-legend-dot--no-checkout" />
          No checkout
        </span>

      </div>

            {/* =====================================================
          CALENDAR DAY DETAILS POPUP
      ===================================================== */}

      {selectedCalendarDay ? (() => {

        const dayRecord =
          selectedCalendarDay.record;

        const dayMeta =
          selectedCalendarDay.meta;

        const firstIn =
          dayRecord?.firstInAt ||
          dayRecord?.firstIn?.time ||
          null;

        const lastOut =
          dayRecord?.lastOutAt ||
          dayRecord?.lastOut?.time ||
          null;

        const mode =
          dayRecord
            ? normalizedMode(dayRecord)
            : "";

        const displayMode =
          mode === "WFH"
            ? "Work From Home"
            : mode === "FIELD_VISIT" ||
                mode === "ON_DUTY"
              ? "Field Visit"
              : mode === "OFFICE"
                ? "Office"
                : "—";

        const sourceLabel =
          dayRecord
            ? attendanceSource(dayRecord) ||
              dayRecord?.source ||
              dayRecord?.provider ||
              "—"
            : "—";

        const location =
          dayRecord?.officeName ||
          dayRecord?.workLocation ||
          dayRecord?.locationName ||
          "—";

        const shift =
          dayRecord?.shiftName ||
          dayRecord?.shiftCode ||
          "—";

        const employeeName =
          dayRecord?.employeeName ||
          dayRecord?.employee?.fullName ||
          "";

        const formattedDate =
          selectedCalendarDay.date
            ? new Intl.DateTimeFormat(
                "en-IN",
                {
                  timeZone: "UTC",
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                }
              ).format(
                selectedCalendarDay.date
              )
            : selectedCalendarDay.key;

        return (
          <div
            className="se-att-calendar-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setSelectedCalendarDay(
                  null
                );
              }
            }}
          >

            <div
              className="se-att-calendar-modal"
              role="dialog"
              aria-modal="true"
              aria-label={`Attendance details for ${formattedDate}`}
            >

              {/* HEADER */}

              <div className="se-att-calendar-modal-head">

                <div className="se-att-calendar-modal-date">

                  <div
                    className={[
                      "se-att-calendar-modal-date-circle",
                      `se-att-calendar-modal-date-circle--${dayMeta.className}`,
                    ].join(" ")}
                  >
                    <strong>
                      {selectedCalendarDay.day}
                    </strong>

                    <span>
                      {selectedCalendarDay.weekday}
                    </span>
                  </div>


                  <div className="se-att-calendar-modal-heading">

                    <span>
                      ATTENDANCE DETAILS
                    </span>

                    <h3>
                      {formattedDate}
                    </h3>

                    <p>
                      Complete attendance information for this day
                    </p>

                  </div>

                </div>


                <button
                  type="button"
                  className="se-att-calendar-modal-close"
                  onClick={() =>
                    setSelectedCalendarDay(
                      null
                    )
                  }
                  aria-label="Close attendance details"
                >
                  ×
                </button>

              </div>


              {/* STATUS HERO */}

              <div
                className={[
                  "se-att-calendar-modal-status",
                  `se-att-calendar-modal-status--${dayMeta.className}`,
                ].join(" ")}
              >

                <div className="se-att-calendar-modal-status-icon">
                  {selectedCalendarDay.status ===
                  "PRESENT"
                    ? "✓"
                    : selectedCalendarDay.status ===
                        "ABSENT"
                      ? "×"
                      : selectedCalendarDay.status ===
                          "ON_LEAVE"
                        ? "L"
                        : selectedCalendarDay.status ===
                            "HALF_DAY"
                          ? "½"
                          : selectedCalendarDay.status ===
                              "NO_CHECKOUT"
                            ? "!"
                            : selectedCalendarDay.status ===
                                "WEEK_OFF"
                              ? "W"
                              : selectedCalendarDay.status ===
                                  "HOLIDAY"
                                ? "H"
                                : "•"}
                </div>


                <div>

                  <span>
                    STATUS
                  </span>

                  <strong>
                    {dayMeta.label}
                  </strong>

                  <small>
                    {dayRecord
                      ? "Attendance record available"
                      : selectedCalendarDay.status ===
                          "WEEK_OFF"
                        ? "Scheduled weekly off"
                        : "No attendance record for this date"}
                  </small>

                </div>

              </div>


              {dayRecord ? (
                <>

                  {/* TIME CARDS */}

                  <div className="se-att-calendar-modal-time-grid">

                    <div className="se-att-calendar-modal-time-card">

                      <span className="se-att-calendar-modal-time-label">
                        CHECK IN
                      </span>

                      <strong>
                        {firstIn
                          ? formatTime(
                              firstIn
                            )
                          : "—"}
                      </strong>

                      <small>
                        Start time
                      </small>

                    </div>


                    <div className="se-att-calendar-modal-time-arrow">
                      →
                    </div>


                    <div className="se-att-calendar-modal-time-card">

                      <span className="se-att-calendar-modal-time-label">
                        CHECK OUT
                      </span>

                      <strong>
                        {lastOut
                          ? formatTime(
                              lastOut
                            )
                          : "—"}
                      </strong>

                      <small>
                        {lastOut
                          ? "End time"
                          : "Checkout pending"}
                      </small>

                    </div>

                  </div>


                  {/* INFORMATION */}

                  <div className="se-att-calendar-modal-info-grid">

                    <div className="se-att-calendar-modal-info">

                      <span>
                        WORK MODE
                      </span>

                      <strong>
                        {displayMode}
                      </strong>

                    </div>


                    <div className="se-att-calendar-modal-info">

                      <span>
                        SHIFT
                      </span>

                      <strong>
                        {shift}
                      </strong>

                    </div>


                    <div className="se-att-calendar-modal-info">

                      <span>
                        LOCATION
                      </span>

                      <strong>
                        {location}
                      </strong>

                    </div>


                    <div className="se-att-calendar-modal-info">

                      <span>
                        SOURCE
                      </span>

                      <strong>
                        {sourceLabel}
                      </strong>

                    </div>

                  </div>


                  {employeeName ? (
                    <div className="se-att-calendar-modal-employee">

                      <span>
                        EMPLOYEE
                      </span>

                      <strong>
                        {employeeName}
                      </strong>

                      {dayRecord?.employeeCode ? (
                        <small>
                          {dayRecord.employeeCode}
                        </small>
                      ) : null}

                    </div>
                  ) : null}

                </>
              ) : (

                <div className="se-att-calendar-modal-empty">

                  <div className="se-att-calendar-modal-empty-icon">
                    {selectedCalendarDay.status ===
                    "WEEK_OFF"
                      ? "W"
                      : "—"}
                  </div>

                  <strong>
                    {selectedCalendarDay.status ===
                    "WEEK_OFF"
                      ? "Weekly off"
                      : "No attendance recorded"}
                  </strong>

                  <p>
                    {selectedCalendarDay.status ===
                    "WEEK_OFF"
                      ? "This date is marked as a scheduled weekly off."
                      : "There is no attendance record available for this date."}
                  </p>

                </div>

              )}


              {/* FOOTER */}

              <div className="se-att-calendar-modal-footer">

                <button
                  type="button"
                  onClick={() =>
                    setSelectedCalendarDay(
                      null
                    )
                  }
                >
                  Close
                </button>

              </div>

            </div>

          </div>
        );
      })() : null}

    </section>
  );
}

/* =========================================================
   PAGE
========================================================= */

function AttendancePage() {
  const navigate =
    useNavigate();

  const {
    user,

    access:
      authAccess,
  } =
    useAuth();

  /* =====================================================
     ACCESS
  ===================================================== */

  const access =
    useMemo(
      () =>
        resolveAttendanceAccess(
          user,
          authAccess
        ),
      [
        user,
        authAccess,
      ]
    );

  /* =====================================================
     TODAY / RANGE
  ===================================================== */

  const today =
    useMemo(
      () =>
        todayKey(),
      []
    );

  const initialRange =
  useMemo(
    () => ({
      from:
        today,

      to:
        today,
    }),
    [
      today,
    ]
  );

  const [
    rangeType,
    setRangeType,
  ] =
    useState(
  "TODAY"
);

  const [
    from,
    setFrom,
  ] =
    useState(
      initialRange.from
    );

  const [
    to,
    setTo,
  ] =
    useState(
      initialRange.to
    );

  /* =====================================================
     MAIN WORKSPACE

     DAY:
     today's attendance + attendance start

     HISTORY:
     personal history

     REGISTER:
     management workforce register

     APPROVALS:
     HR approval workspace placeholder

     LOCATIONS:
     field / WFH location workspace placeholder
  ===================================================== */

  const [
    view,
    setView,
  ] =
    useState(
      "DAY"
    );

  /* =====================================================
     DATA
  ===================================================== */

  const [
    myRecords,
    setMyRecords,
  ] =
    useState(
      []
    );

  const [
    records,
    setRecords,
  ] =
    useState(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState(
      ""
    );

  /* =====================================================
     START ATTENDANCE
  ===================================================== */

  const [
    selectedWorkMode,
    setSelectedWorkMode,
  ] =
    useState(
      ""
    );

 const [
  attendanceActionLoading,
  setAttendanceActionLoading,
] =
  useState(
    false
  );

const [
  liveNow,
  setLiveNow,
] =
  useState(
    () =>
      Date.now()
  );

const [
  attendanceLocationStatus,
  setAttendanceLocationStatus,
] =
  useState(
    "IDLE"
  );

const [
  attendanceLocationMessage,
  setAttendanceLocationMessage,
] =
  useState(
    ""
  );

  /* =====================================================
     FILTERS
  ===================================================== */

  const [
    search,
    setSearch,
  ] =
    useState(
      ""
    );

  const [
    status,
    setStatus,
  ] =
    useState(
      ""
    );

  const [
    department,
    setDepartment,
  ] =
    useState(
      ""
    );

  const [
    office,
    setOffice,
  ] =
    useState(
      ""
    );

  const [
    workMode,
    setWorkMode,
  ] =
    useState(
      ""
    );

 const [
  source,
  setSource,
] =
  useState(
    ""
  );

/* =====================================================
   WORKFORCE REGISTER CARD FILTER

   PRESENT is intentionally the default.

   Important:
   - Late employees are still PRESENT.
   - LATE is only a drill-down subset of PRESENT.
   - WFH / FIELD / ON DUTY are attendance modes.
===================================================== */

const [
  registerView,
  setRegisterView,
] = useState("PRESENT");

/* =====================================================
   DRAWERS / MODALS
===================================================== */

  const [
    selectedRecord,
    setSelectedRecord,
  ] =
    useState(
      null
    );

  const [
    regularizationRecord,
    setRegularizationRecord,
  ] =
    useState(
      null
    );

  /* =====================================================
     RANGE MODE
  ===================================================== */

  useEffect(
  () => {
    /*
     * TODAY
     */
    if (
      rangeType ===
      "TODAY"
    ) {
      setFrom(
        today
      );

      setTo(
        today
      );

      return;
    }

    /*
     * THIS WEEK
     */
    if (
      rangeType ===
      "WEEK"
    ) {
      const range =
        weekRange(
          today
        );

      setFrom(
        range.from
      );

      setTo(
        range.to
      );

      return;
    }

    /*
     * THIS MONTH
     */
    if (
      rangeType ===
      "MONTH"
    ) {
      const range =
        monthRange(
          today
        );

      setFrom(
        range.from
      );

      setTo(
        range.to
      );
    }
  },
  [
    rangeType,
    today,
  ]
);

  /* =====================================================
     ALL ATTENDANCE PAGES
  ===================================================== */

  const loadAllAttendance =
    useCallback(
      async (
        query
      ) => {
        /*
         * IMPORTANT:
         * The management register must request includeUnmapped=true.
         *
         * Mapped ERP attendance lives in result.items.
         * Unmapped eSSL workers are returned separately by the backend in
         * result.biometric.items. They are worker/day register rows already;
         * the browser must NOT render the 25K raw punch documents.
         */
        const first =
          await getAttendance({
            ...query,

            includeUnmapped:
              true,

            page:
              1,

            limit:
              500,
          });

        let mapped = [
          ...recordsOf(
            first
          ),
        ];

        /*
         * Biometric rows are read once from page 1 so that a backend response
         * that attaches the same biometric block to every mapped page cannot
         * duplicate workers in the register.
         */
        const biometric =
          biometricRecordsOf(
            first
          ).map(
            normalizeBiometricRegisterRecord
          );

        const pages =
          Number(
            first
              ?.pagination
              ?.pages ||
            1
          );

        for (
          let page = 2;
          page <= pages;
          page += 1
        ) {
          const next =
            await getAttendance({
              ...query,

              includeUnmapped:
                true,

              page,

              limit:
                500,
            });

          mapped.push(
            ...recordsOf(
              next
            )
          );
        }

        return mergeUniqueAttendanceRecords(
          mapped,
          biometric
        );
      },
      []
    );

  /* =====================================================
     LOAD
  ===================================================== */

  const load =
    useCallback(
      async (
        silent = false
      ) => {
        try {
          if (
            silent
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setError(
            ""
          );

          const myPromise =
            getMyAttendance({
              from,

              to,

              page:
                1,

              limit:
                500,
            });

          const managementPromise =
            access
              .canViewRegister
              ? loadAllAttendance({
                  from,

                  to,

                  presenceStatus:
                    status ||
                    undefined,

                  departmentId:
                    department ||
                    undefined,

                  officeId:
                    office ||
                    undefined,

                  workMode:
                    workMode ||
                    undefined,

                  source:
                    source ||
                    undefined,

                  includeUnmapped:
                    true,
                })
              : Promise.resolve(
                  []
                );

          const [
            myResult,
            managementResult,
          ] =
            await Promise.all([
              myPromise,

              managementPromise,
            ]);

          setMyRecords(
            recordsOf(
              myResult
            )
          );

          setRecords(
            managementResult
          );
        } catch (
          requestError
        ) {
          setError(
            requestError
              ?.response
              ?.data
              ?.message ||
            requestError
              ?.message ||
            "Attendance could not be loaded."
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [
        access
          .canViewRegister,

        from,

        to,

        status,

        department,

        office,

        workMode,

        source,

        loadAllAttendance,
      ]
    );

  useEffect(
    () => {
      load();
    },
    [
      load,
    ]
  );

  /* =====================================================
     TODAY
  ===================================================== */

  const todayAttendance =
    useMemo(
      () => {
        return (
          myRecords.find(
            (
              record
            ) =>
              record
                .businessDate ===
              today
          ) ||
          null
        );
      },
      [
        myRecords,
        today,
      ]
    );
const rawTodayMode =
  normalizedMode(
    todayAttendance
  );

const todayMode =
  rawTodayMode === "ON_DUTY"
    ? "FIELD_VISIT"
    : rawTodayMode;

  const attendanceStarted =
    Boolean(
      todayAttendance
        ?.firstInAt ||
      todayAttendance
        ?.firstIn
        ?.time
    );

 const attendanceCompleted =
  Boolean(
    todayAttendance
      ?.lastOutAt ||
    todayAttendance
      ?.lastOut
      ?.time
  );

/* =========================================================
   LIVE WORKING TIME
========================================================= */

useEffect(
  () => {
    if (
      !attendanceStarted ||
      attendanceCompleted
    ) {
      return undefined;
    }

    setLiveNow(
      Date.now()
    );

    const timer =
      window.setInterval(
        () => {
          setLiveNow(
            Date.now()
          );
        },
        1000
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  },
  [
    attendanceStarted,
    attendanceCompleted,
  ]
);

const attendanceStartTime =
  todayAttendance?.firstInAt ||
  todayAttendance?.firstIn?.time ||
  null;

const liveWorkedSeconds =
  useMemo(
    () => {
      if (
        !attendanceStartTime
      ) {
        return 0;
      }

      const start =
        new Date(
          attendanceStartTime
        ).getTime();

      if (
        !Number.isFinite(
          start
        )
      ) {
        return 0;
      }

      const end =
        attendanceCompleted
          ? new Date(
              todayAttendance?.lastOutAt ||
              todayAttendance?.lastOut?.time
            ).getTime()
          : liveNow;

      if (
        !Number.isFinite(
          end
        ) ||
        end <= start
      ) {
        return 0;
      }

      return Math.floor(
        (end - start) /
          1000
      );
    },
    [
      attendanceStartTime,
      attendanceCompleted,
      todayAttendance,
      liveNow,
    ]
  );

const liveWorkedMinutes =
  useMemo(
    () =>
      Math.floor(
        liveWorkedSeconds /
          60
      ),
    [
      liveWorkedSeconds,
    ]
  );

const liveWorkedTime =
  useMemo(
    () => {
      const hours =
        Math.floor(
          liveWorkedSeconds /
            3600
        );

      const minutes =
        Math.floor(
          (
            liveWorkedSeconds %
            3600
          ) /
            60
        );

      const seconds =
        liveWorkedSeconds %
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
      )}:${String(
        seconds
      ).padStart(
        2,
        "0"
      )}`;
    },
    [
      liveWorkedSeconds,
    ]
  );


const currentLocationAddress =
  todayAttendance
    ?.checkInLocation
    ?.address ||
  todayAttendance
    ?.checkInLocation
    ?.locationAddress ||
  todayAttendance
    ?.currentLocation
    ?.address ||
  todayAttendance
    ?.currentLocation
    ?.locationAddress ||
  todayAttendance
    ?.locationAddress ||
  "";

const todaySource =
  normalizeValue(
    attendanceSource(
      todayAttendance
    )
  );

  const isWebAttendance =
  [
    "WFH",
    "FIELD_VISIT",
  ].includes(
    todayMode
  ) ||
  (
    todayMode === "OFFICE" &&
    todaySource.includes(
      "WEB"
    )
  );

  /* =====================================================
     FILTER RECORDS
  ===================================================== */

  const filteredRecords =
    useMemo(
      () => {
        const needle =
          search
            .trim()
            .toLowerCase();

        return records.filter(
          (
            record
          ) => {
            if (
              needle
            ) {
              const haystack =
                [
                  record
                    .employeeName,

                  record
                    .employeeCode,

                  record
                    .departmentName,

                  record
                    .shiftCode,

                  record
                    .shiftName,

                  record
                    .workLocation,
                ]
                  .filter(
                    Boolean
                  )
                  .join(
                    " "
                  )
                  .toLowerCase();

              if (
                !haystack.includes(
                  needle
                )
              ) {
                return false;
              }
            }

            if (
              source &&
              attendanceSource(
                record
              ) !==
                source
            ) {
              return false;
            }

            return true;
          }
        );
      },
      [
        records,
        search,
        source,
      ]
    );

  const personalFilteredRecords =
    useMemo(
      () => {
        return myRecords
          .filter(
            (
              record
            ) => {
              if (
                status &&
                record
                  .presenceStatus !==
                  status
              ) {
                return false;
              }

              if (
                workMode &&
                normalizedMode(
                  record
                ) !==
                  workMode
              ) {
                return false;
              }

              if (
                source &&
                attendanceSource(
                  record
                ) !==
                  source
              ) {
                return false;
              }

              return true;
            }
          );
      },
      [
        myRecords,
        status,
        workMode,
        source,
      ]
    );

  /* =====================================================
     DEPARTMENTS
  ===================================================== */

  const departments =
    useMemo(
      () => {
        const map =
          new Map();

        records.forEach(
          (
            record
          ) => {
            const value =
              record
                .departmentId ||
              record
                .departmentName;

            const label =
              record
                .departmentName ||
              record
                .departmentId;

            if (
              value &&
              label
            ) {
              map.set(
                String(
                  value
                ),
                String(
                  label
                )
              );
            }
          }
        );

        return [
          ...map.entries(),
        ]
          .map(
            ([
              value,
              label,
            ]) => ({
              value,

              label,
            })
          )
          .sort(
            (
              a,
              b
            ) =>
              a.label.localeCompare(
                b.label
              )
          );
      },
      [
        records,
      ]
    );

  /* =====================================================
     OFFICES
  ===================================================== */

  const offices =
    useMemo(
      () => {
        const map =
          new Map();

        records.forEach(
          (
            record
          ) => {
            const value =
              record
                .officeId ||
              record
                .workLocation;

            const label =
              record
                .officeName ||
              record
                .workLocation ||
              (
                record
                  .officeId
                  ? `Office ${String(
                      record
                        .officeId
                    ).slice(
                      -5
                    )}`
                  : ""
              );

            if (
              value &&
              label
            ) {
              map.set(
                String(
                  value
                ),
                String(
                  label
                )
              );
            }
          }
        );

        return [
          ...map.entries(),
        ].map(
          ([
            value,
            label,
          ]) => ({
            value,

            label,
          })
        );
      },
      [
        records,
      ]
    );

 /* =====================================================
   WORKFORCE ATTENDANCE CLASSIFICATION

   Frontend presentation rules:

   1. Any employee with a genuine check-in is part of
      the PRESENT workforce.

   2. LATE is a subset of PRESENT.
      It does NOT remove the employee from Present.

   3. Current business rule requested:
      check-in AFTER 09:10 AM IST = Late.

   4. WFH / FIELD VISIT / ON DUTY are subsets of
      employees who have attendance.

   5. ABSENT / NOT_MARKED remain absent workforce.

   NOTE:
   Backend should ultimately remain the authority for
   payroll/final attendance. This frontend rule controls
   workforce display and drill-down.
===================================================== */

const LATE_AFTER_HOUR = 9;
const LATE_AFTER_MINUTE = 10;

const hasAttendanceCheckIn = useCallback(
  (record) => {
    return Boolean(
      record?.firstInAt ||
      record?.firstIn?.time
    );
  },
  []
);

const getIstTimeParts = useCallback(
  (value) => {
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

    const parts =
      new Intl.DateTimeFormat(
        "en-GB",
        {
          timeZone:
            "Asia/Kolkata",

          hour:
            "2-digit",

          minute:
            "2-digit",

          hourCycle:
            "h23",
        }
      ).formatToParts(
        date
      );

    const hour =
      Number(
        parts.find(
          (part) =>
            part.type ===
            "hour"
        )?.value
      );

    const minute =
      Number(
        parts.find(
          (part) =>
            part.type ===
            "minute"
        )?.value
      );

    if (
      !Number.isFinite(hour) ||
      !Number.isFinite(minute)
    ) {
      return null;
    }

    return {
      hour,
      minute,
    };
  },
  []
);

const isRecordLate = useCallback(
  (record) => {
    /*
     * Backend late flag remains respected.
     */
    if (
      record?.isLate === true
    ) {
      return true;
    }

    const checkIn =
      record?.firstInAt ||
      record?.firstIn?.time;

    if (!checkIn) {
      return false;
    }

    const time =
      getIstTimeParts(
        checkIn
      );

    if (!time) {
      return false;
    }

    const checkInMinutes =
      time.hour * 60 +
      time.minute;

    const lateAfterMinutes =
      LATE_AFTER_HOUR * 60 +
      LATE_AFTER_MINUTE;

    return (
      checkInMinutes >
      lateAfterMinutes
    );
  },
  [
    getIstTimeParts,
  ]
);

const isRecordPresent = useCallback(
  (record) => {
    /*
     * A valid check-in means the employee physically
     * has attendance for the selected business date.
     *
     * This keeps a late employee inside PRESENT.
     */
    if (
      hasAttendanceCheckIn(
        record
      )
    ) {
      return true;
    }

    return (
      normalizeValue(
        record?.presenceStatus
      ) === "PRESENT"
    );
  },
  [
    hasAttendanceCheckIn,
  ]
);

const isRecordAbsent = useCallback(
  (record) => {
    if (
      isRecordPresent(
        record
      )
    ) {
      return false;
    }

    const attendanceStatus =
      normalizeValue(
        record?.presenceStatus
      );

    return [
      "ABSENT",
      "NOT_MARKED",
      "NO_RECORD",
    ].includes(
      attendanceStatus
    );
  },
  [
    isRecordPresent,
  ]
);

/* =====================================================
   SUMMARY

   Present includes Late/WFH/Field employees.

   Therefore:
   Present = overall attendance
   Late    = subset of Present
   WFH     = subset of Present
   Field   = subset of Present
===================================================== */

const summary =
  useMemo(
    () => {
      const value = {
        total:
          filteredRecords.length,

        present:
          0,

        absent:
          0,

        late:
          0,

        wfh:
          0,

        field:
          0,

        onDuty:
          0,
      };

      filteredRecords.forEach(
        (record) => {
          const present =
            isRecordPresent(
              record
            );

          const mode =
            normalizedMode(
              record
            );

          if (present) {
            value.present += 1;
          }

          if (
            isRecordAbsent(
              record
            )
          ) {
            value.absent += 1;
          }

          /*
           * Late remains part of Present.
           */
          if (
            present &&
            isRecordLate(
              record
            )
          ) {
            value.late += 1;
          }

          if (
            present &&
            mode === "WFH"
          ) {
            value.wfh += 1;
          }

          if (
            present &&
            mode ===
              "FIELD_VISIT"
          ) {
            value.field += 1;
          }

          if (
            present &&
            mode ===
              "ON_DUTY"
          ) {
            value.onDuty += 1;
          }
        }
      );

      return value;
    },
    [
      filteredRecords,
      isRecordPresent,
      isRecordAbsent,
      isRecordLate,
    ]
  );

/* =====================================================
   REGISTER DRILL-DOWN

   Default = PRESENT
===================================================== */

const registerRecords =
  useMemo(
    () => {
      switch (
        registerView
      ) {
        case "ABSENT":
          return filteredRecords.filter(
            (record) =>
              isRecordAbsent(
                record
              )
          );

        case "LATE":
          return filteredRecords.filter(
            (record) =>
              isRecordPresent(
                record
              ) &&
              isRecordLate(
                record
              )
          );

        case "WFH":
          return filteredRecords.filter(
            (record) =>
              isRecordPresent(
                record
              ) &&
              normalizedMode(
                record
              ) === "WFH"
          );

        case "FIELD":
          return filteredRecords.filter(
            (record) =>
              isRecordPresent(
                record
              ) &&
              normalizedMode(
                record
              ) ===
                "FIELD_VISIT"
          );

        case "ON_DUTY":
          return filteredRecords.filter(
            (record) =>
              isRecordPresent(
                record
              ) &&
              normalizedMode(
                record
              ) ===
                "ON_DUTY"
          );

        case "PRESENT":
        default:
          return filteredRecords.filter(
            (record) =>
              isRecordPresent(
                record
              )
          );
      }
    },
    [
      filteredRecords,
      registerView,
      isRecordPresent,
      isRecordAbsent,
      isRecordLate,
    ]
  );

const registerViewLabel =
  useMemo(
    () => {
      switch (
        registerView
      ) {
        case "ABSENT":
          return "Absent";

        case "LATE":
          return "Late";

        case "WFH":
          return "Work From Home";

        case "FIELD":
          return "Field Visit";

        case "ON_DUTY":
          return "On Duty";

        case "PRESENT":
        default:
          return "Present";
      }
    },
    [
      registerView,
    ]
  );

/* =====================================================
   WORK MODE OPTIONS
===================================================== */

/* =========================================================
   WORK MODE OPTIONS
   Production:
   OFFICE / WFH / FIELD_VISIT only.

   ON_DUTY is intentionally not offered anymore.
   Existing historical ON_DUTY records remain supported.
========================================================= */

const workModeOptions = [
  {
    code: "OFFICE",
    title: "Office",
    description: "Office / biometric",
    icon: "▦",
  },
  {
    code: "WFH",
    title: "Work From Home",
    description: "Verified location",
    icon: "⌂",
  },
  {
    code: "FIELD_VISIT",
    title: "Field Visit",
    description: "Outside office",
    icon: "⌖",
  },
];

/* =========================================================
   START ATTENDANCE

   OFFICE:
   - biometric remains the normal automatic source
   - manual fallback captures browser location
   - backend validates configured office geofence/radius

   WFH / FIELD_VISIT / ON_DUTY:
   - current browser location is mandatory
   - backend validates profile/policy and records location
========================================================= */

/* =========================================================
   START ATTENDANCE
========================================================= */

const startAttendance = async () => {
  if (!selectedWorkMode) {
    setError(
      "Select your work mode before starting attendance."
    );
    return;
  }

  if (
    ![
      "OFFICE",
      "WFH",
      "FIELD_VISIT",
    ].includes(selectedWorkMode)
  ) {
    setError(
      "The selected attendance mode is not available."
    );
    return;
  }

  try {
    setAttendanceActionLoading(true);

    setError("");
    setSuccessMessage("");

    setAttendanceLocationStatus(
      "REQUESTING"
    );

    setAttendanceLocationMessage(
      selectedWorkMode === "OFFICE"
        ? "Verifying office location..."
        : "Verifying current location..."
    );

    const location =
      await getBrowserLocation();

    setAttendanceLocationStatus(
      "VERIFIED"
    );

    setAttendanceLocationMessage(
      "Location verified."
    );

    const result =
      await startWebAttendance({
        workMode:
          selectedWorkMode,

        latitude:
          location.latitude,

        longitude:
          location.longitude,

        accuracyMeters:
          location.accuracyMeters,
      });

    const backendMessage =
      result?.message ||
      result?.data?.message ||
      "";

    if (backendMessage) {
      setSuccessMessage(
        backendMessage
      );
    } else {
      const modeLabel =
        workModeOptions.find(
          (item) =>
            item.code ===
            selectedWorkMode
        )?.title ||
        "Attendance";

      setSuccessMessage(
        `${modeLabel} attendance started successfully.`
      );
    }

    await load(true);
  } catch (requestError) {
    const message =
      requestError
        ?.response
        ?.data
        ?.message ||
      requestError
        ?.message ||
      "Attendance could not be started.";

    setAttendanceLocationStatus(
      "ERROR"
    );

    setAttendanceLocationMessage(
      message
    );

    setError(
      message
    );
  } finally {
    setAttendanceActionLoading(
      false
    );
  }
};

 /* =========================================================
   STOP ATTENDANCE
========================================================= */

const stopAttendance =
  async () => {
    try {
      setAttendanceActionLoading(
        true
      );

      setError(
        ""
      );

      setSuccessMessage(
        ""
      );

      let location =
        null;

      if (
        isWebAttendance
      ) {
        setAttendanceLocationStatus(
          "REQUESTING"
        );

        setAttendanceLocationMessage(
          "Verifying your current location..."
        );

        location =
          await getBrowserLocation();

        setAttendanceLocationStatus(
          "VERIFIED"
        );

        setAttendanceLocationMessage(
          "Current location verified"
        );
      }

      if (
        !location
      ) {
        throw new Error(
          "Current location is required to complete web attendance."
        );
      }

      await stopWebAttendance({
        latitude:
          location.latitude,

        longitude:
          location.longitude,

        accuracyMeters:
          location.accuracyMeters,
      });

      setSuccessMessage(
        "Attendance completed successfully. Checkout location verified."
      );

      await load(
        true
      );
    } catch (
      requestError
    ) {
      const message =
        requestError
          ?.response
          ?.data
          ?.message ||
        requestError
          ?.message ||
        "Attendance could not be completed.";

      setAttendanceLocationStatus(
        "ERROR"
      );

      setAttendanceLocationMessage(
        message
      );

      setError(
        message
      );
    } finally {
      setAttendanceActionLoading(
        false
      );
    }
  };

  /* =====================================================
     EXPORT
  ===================================================== */

 /* =====================================================
   EXPORT
===================================================== */

const download =
  async (
    format = "csv"
  ) => {
    try {
      setError(
        ""
      );

      const exportDate =
        new Date(
          `${from}T00:00:00`
        );

      if (
        Number.isNaN(
          exportDate.getTime()
        )
      ) {
        throw new Error(
          "A valid attendance month is required."
        );
      }

      const month =
        exportDate.getMonth() +
        1;

      const year =
        exportDate.getFullYear();

      const normalizedFormat =
        String(
          format || "csv"
        )
          .trim()
          .toLowerCase();

      await downloadMonthlyAttendance({
        month,

        year,

        format:
          normalizedFormat,

        departmentId:
          department ||
          undefined,

        officeId:
          office ||
          undefined,

        workMode:
          workMode ||
          undefined,

        filename:
          `SE-RMS-Attendance-${year}-${String(
            month
          ).padStart(
            2,
            "0"
          )}.${normalizedFormat}`,
      });
    } catch (
      requestError
    ) {
      setError(
        requestError
          ?.response
          ?.data
          ?.message ||
        requestError
          ?.message ||
        "Attendance report could not be downloaded."
      );
    }
  };

  /* =====================================================
     RESET
  ===================================================== */

  const resetFilters =
    () => {
      setSearch(
        ""
      );

      setStatus(
        ""
      );

      setDepartment(
        ""
      );

      setOffice(
        ""
      );

      setWorkMode(
        ""
      );

      setSource(
        ""
      );
    };

  /* =====================================================
     MANAGEMENT ACCESS LABEL
  ===================================================== */

  const managementScopeTitle =
    access
      .canViewAll
      ? "Organisation"
      : access
          .isHrHead
        ? "HR Workforce"
        : access
            .isHead
          ? "Department"
          : "Reporting Team";

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <main className="se-people-att-page">

      {/* =================================================
          HEADER
      ================================================== */}

     <header className="se-people-att-header se-people-att-header--premium">

  <div className="se-people-att-heading">

    <button
      type="button"
      className="se-people-att-back"
      aria-label="Back to People overview"
      onClick={() =>
        navigate(
          "/dashboard?app=people&page=overview"
        )
      }
    >
      ←
    </button>

    <div className="se-att-title-block">

      <span className="se-att-title-eyebrow">
        PEOPLE / ATTENDANCE
      </span>

      <h1>
        Attendance
      </h1>

      <p>
        Workday & workforce attendance
      </p>

    </div>

  </div>

  <div className="se-people-att-header-actions">

    <div className="se-people-att-range-chip">

      <span>
        CURRENT RANGE
      </span>

      <strong>
        {rangeLabel(
          from,
          to
        )}
      </strong>

    </div>

    <button
      type="button"
      className="se-people-att-refresh"
      disabled={
        refreshing
      }
      onClick={() =>
        load(true)
      }
    >

      <span
        className={
          refreshing
            ? "spin"
            : ""
        }
      >
        ↻
      </span>

      {refreshing
        ? "Refreshing"
        : "Refresh"}

    </button>

  </div>

</header>

      {/* =================================================
          MAIN BUTTON NAVIGATION

          Only one workspace is shown at a time.
      ================================================== */}

     <section className="se-people-att-nav se-people-att-nav--workspace">

  <button
    type="button"
    className={
      view === "DAY"
        ? "active"
        : ""
    }
    onClick={() =>
      setView("DAY")
    }
  >
    <span>◉</span>

    <div>
      <strong>
        My Day
      </strong>
    </div>
  </button>


  <button
    type="button"
    className={
      view === "HISTORY"
        ? "active"
        : ""
    }
    onClick={() =>
      setView("HISTORY")
    }
  >
    <span>◷</span>

    <div>
      <strong>
        History
      </strong>
    </div>
  </button>


  {access.canViewRegister ? (
    <button
      type="button"
      className={
        view === "REGISTER"
          ? "active"
          : ""
      }
      onClick={() =>
        setView("REGISTER")
      }
    >
      <span>▦</span>

      <div>
        <strong>
          Workforce
        </strong>
      </div>
    </button>
  ) : null}


  {access.canApproveRegularization ? (
    <button
      type="button"
      className={
        view === "APPROVALS"
          ? "active"
          : ""
      }
      onClick={() =>
        setView("APPROVALS")
      }
    >
      <span>✓</span>

      <div>
        <strong>
          Regularization
        </strong>
      </div>
    </button>
  ) : null}


  {access.canViewLocations ? (
    <button
      type="button"
      className={
        view === "LOCATIONS"
          ? "active"
          : ""
      }
      onClick={() =>
        setView("LOCATIONS")
      }
    >
      <span>⌖</span>

      <div>
        <strong>
          Locations
        </strong>
      </div>
    </button>
  ) : null}


  {access.canExport ? (
    <button
      type="button"
      className={
        view === "REPORTS"
          ? "active"
          : ""
      }
      onClick={() =>
        setView("REPORTS")
      }
    >
      <span>↓</span>

      <div>
        <strong>
          Reports
        </strong>
      </div>
    </button>
  ) : null}

</section>

      <section className="se-people-att-content">

        {/* =================================================
            ALERT
        ================================================== */}

        {error ? (
          <div className="se-people-att-alert">

            <span>
              !
            </span>

            <div>

              <strong>
                Attendance notice
              </strong>

              <p>
                {
                  error
                }
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setError(
                  ""
                )
              }
            >
              ×
            </button>

          </div>
        ) : null}

        {successMessage ? (
          <div className="se-people-att-success">

            <span>
              ✓
            </span>

            <div>

              <strong>
                Attendance updated
              </strong>

              <p>
                {
                  successMessage
                }
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage(
                  ""
                )
              }
            >
              ×
            </button>

          </div>
        ) : null}

        {/* =================================================
            MY DAY
        ================================================== */}

        {view ===
        "DAY" ? (
          <>

           <section
  className={`se-att-day-head ${
    attendanceStarted
      ? "is-started"
      : ""
  }`}
>

  <div className="se-att-day-intro">

    <span className="se-att-eyebrow">
      TODAY
    </span>

    <h2>
      {attendanceCompleted
        ? "Workday completed"
        : attendanceStarted
          ? "Workday in progress"
          : "Ready for work?"}
    </h2>

    <p>
      {attendanceCompleted
        ? "Your attendance for today is complete."
        : attendanceStarted
          ? "Your working time is being recorded."
          : "Select where you're working and start attendance."}
    </p>

  </div>


  <div
    className={`se-att-day-status ${
      attendanceCompleted
        ? "is-completed"
        : attendanceStarted
          ? "is-working"
          : "is-waiting"
    }`}
  >

    <span className="se-att-status-pulse" />

    <div>

      <small>
        WORKDAY
      </small>

      <strong>
        {attendanceCompleted
          ? "Completed"
          : attendanceStarted
            ? "Working"
            : "Not started"}
      </strong>

    </div>

  </div>

</section>

          {!attendanceStarted ? (

  <section className="se-att-start-card se-att-start-card--premium">

    <div className="se-att-start-heading">

      <div>

        <span>
          START ATTENDANCE
        </span>

        <h3>
          Where are you working?
        </h3>

      </div>

      <div className="se-att-location-secure">
        <span>⌖</span>
        Location verified
      </div>

    </div>


    <div className="se-att-mode-grid">

      {workModeOptions.map(
        (option) => {

          const active =
            selectedWorkMode ===
            option.code;

          return (
            <button
              key={
                option.code
              }
              type="button"
              className={
                active
                  ? `se-att-mode-card active mode-${option.code.toLowerCase()}`
                  : `se-att-mode-card mode-${option.code.toLowerCase()}`
              }
              onClick={() => {

                setSelectedWorkMode(
                  option.code
                );

                setAttendanceLocationStatus(
                  "IDLE"
                );

                setAttendanceLocationMessage(
                  ""
                );
              }}
            >

              <span className="se-att-mode-card-icon">
                {option.icon}
              </span>

              <div>

                <strong>
                  {option.title}
                </strong>

                <small>
                  {option.description}
                </small>

              </div>

              <i>
                {active
                  ? "✓"
                  : ""}
              </i>

            </button>
          );
        }
      )}

    </div>


    {selectedWorkMode ? (

      <div className="se-att-start-footer">

        <div className="se-att-selected-mode">

          <small>
            SELECTED
          </small>

          <strong>
            {
              workModeOptions.find(
                (item) =>
                  item.code ===
                  selectedWorkMode
              )?.title
            }
          </strong>

          <span
            className={`se-att-location-message status-${attendanceLocationStatus.toLowerCase()}`}
          >
            {attendanceLocationStatus ===
            "REQUESTING"
              ? "Verifying location..."
              : attendanceLocationStatus ===
                  "VERIFIED"
                ? "✓ Location verified"
                : attendanceLocationStatus ===
                    "ERROR"
                  ? attendanceLocationMessage
                  : selectedWorkMode ===
                      "OFFICE"
                    ? "Biometric or verified office location"
                    : selectedWorkMode ===
                        "WFH"
                      ? "Current location will be verified"
                      : "Field location will be recorded"}
          </span>

        </div>


        <button
          type="button"
          className="se-att-start-button"
          disabled={
            attendanceActionLoading
          }
          onClick={
            startAttendance
          }
        >

          {attendanceActionLoading
            ? attendanceLocationStatus ===
                "REQUESTING"
              ? "Verifying..."
              : "Starting..."
            : (
              <>
                Start Attendance
                <span>→</span>
              </>
            )}

        </button>

      </div>

    ) : null}

  </section>

) : (
              <section className="se-att-active-session">

  <div className="se-att-active-indicator">
    <span />
  </div>

  <div className="se-att-active-copy">

    <small>
      ACTIVE ATTENDANCE
    </small>

   <h3>
  {todayMode === "WFH"
    ? "Working from home"
    : todayMode === "FIELD_VISIT"
      ? "Field visit in progress"
      : "Office attendance"}
</h3>

    {isWebAttendance ? (
      <div className="se-att-active-location">

        <span
          className="se-att-active-location-icon"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 21s6-5.35 6-11a6 6 0 1 0-12 0c0 5.65 6 11 6 11Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <circle
              cx="12"
              cy="10"
              r="2.25"
              stroke="currentColor"
              strokeWidth="1.8"
            />
          </svg>
        </span>

        <div className="se-att-active-location-copy">

          <span>
            CURRENT LOCATION
          </span>

          <strong
            title={
              currentLocationAddress ||
              "Location address unavailable"
            }
          >
            {currentLocationAddress ||
              "Location address unavailable"}
          </strong>

        </div>

      </div>
    ) : null}

  </div>

  {!attendanceCompleted &&
  isWebAttendance ? (
    <div className="se-att-active-actions">

      <div className="se-att-live-time">

  <span>
    WORKING TIME
  </span>

  <strong>
    {liveWorkedTime}
  </strong>

  <small>
    HH:MM:SS
  </small>

</div>

      <button
        type="button"
        className="se-att-finish-button"
        disabled={
          attendanceActionLoading
        }
        onClick={
          stopAttendance
        }
      >
        {attendanceActionLoading
          ? "Finishing..."
          : "Finish Workday"}
      </button>

    </div>
  ) : null}

</section>
            )}

            <MyAttendanceCard
  attendance={
    todayAttendance
  }
  liveWorkedMinutes={
    attendanceStarted &&
    !attendanceCompleted
      ? liveWorkedMinutes
      : null
  }
  liveWorkedSeconds={
    attendanceStarted &&
    !attendanceCompleted
      ? liveWorkedSeconds
      : null
  }
  liveWorkedTime={
    attendanceStarted &&
    !attendanceCompleted
      ? liveWorkedTime
      : null
  }
  loading={
    loading
  }
  canRegularize={
    access
      .canRegularizeSelf
  }
  onRegularize={
    setRegularizationRecord
  }
/>

            <div className="se-att-day-shortcuts">

              <button
                type="button"
                onClick={() =>
                  setView(
                    "HISTORY"
                  )
                }
              >

                <span>
                  ◷
                </span>

                <div>

                  <strong>
                    Attendance History
                  </strong>

                  <small>
                    Review previous days
                  </small>

                </div>

                <i>
                  →
                </i>

              </button>

              {access
                .canRegularizeSelf ? (
                <button
                  type="button"
                  onClick={() =>
                    todayAttendance &&
                    setRegularizationRecord(
                      todayAttendance
                    )
                  }
                >

                  <span>
                    ✎
                  </span>

                  <div>

                    <strong>
                      Regularize Attendance
                    </strong>

                    <small>
                      Request a correction
                    </small>

                  </div>

                  <i>
                    →
                  </i>

                </button>
              ) : null}

              {access
                .canViewRegister ? (
                <button
                  type="button"
                  onClick={() =>
                    setView(
                      "REGISTER"
                    )
                  }
                >

                  <span>
                    ▦
                  </span>

                  <div>

                    <strong>
                      Workforce Register
                    </strong>

                    <small>
                      Management attendance
                    </small>

                  </div>

                  <i>
                    →
                  </i>

                </button>
              ) : null}

            </div>

          </>
        ) : null}

        {/* =================================================
            MY HISTORY
        ================================================== */}

        {view ===
        "HISTORY" ? (
          <>

            {/* <section className="se-att-section-heading">

              <div>

                <span>
                  PERSONAL ATTENDANCE
                </span>

                <h2>
                  My attendance history
                </h2>

                <p>
                  Review your daily attendance and calendar in one workspace.
                </p>

              </div>

              <button
                type="button"
                className="se-att-today-button"
                onClick={() => {
                  setRangeType(
                    "CUSTOM"
                  );

                  setFrom(
                    today
                  );

                  setTo(
                    today
                  );
                }}
              >
                Today
              </button>

            </section> */}

            {/* <AttendanceFilters
              rangeType={
                rangeType
              }
              setRangeType={
                setRangeType
              }
              from={
                from
              }
              setFrom={
                setFrom
              }
              to={
                to
              }
              setTo={
                setTo
              }
              search={
                search
              }
              setSearch={
                setSearch
              }
              status={
                status
              }
              setStatus={
                setStatus
              }
              department={
                department
              }
              setDepartment={
                setDepartment
              }
              office={
                office
              }
              setOffice={
                setOffice
              }
              workMode={
                workMode
              }
              setWorkMode={
                setWorkMode
              }
              source={
                source
              }
              setSource={
                setSource
              }
              departments={
                []
              }
              offices={
                []
              }
              canUseManagementFilters={
                false
              }
              onReset={
                resetFilters
              }
            /> */}

           <div className="se-att-history-workspace se-att-history-workspace--premium">

  <div className="se-att-history-register-card">

    <AttendanceRegister
      loading={
        loading
      }
      records={
        personalFilteredRecords
      }
      canViewLocation={
        false
      }
      onOpen={
        setSelectedRecord
      }
      compact
    />

  </div>


  <PersonalAttendanceCalendar
    records={
      myRecords
    }
    from={
      from
    }
    to={
      to
    }
  />

</div>

          </>
        ) : null}

        {/* =================================================
            WORKFORCE REGISTER
        ================================================== */}

        {view ===
          "REGISTER" &&
        access
          .canViewRegister ? (
          <>

            <section className="se-att-section-heading se-att-section-heading--management">

              <div>

                <span>
                  WORKFORCE ATTENDANCE
                </span>

                <h2>
                  Attendance register
                </h2>

                <p>
                  One worker per day. Biometric scans are consolidated into first IN and final OUT for the register.
                </p>

              </div>

              <div className="se-att-register-heading-actions">

                <button
                  type="button"
                  className="se-att-today-button"
                  onClick={() => {
                    setRangeType(
                      "CUSTOM"
                    );

                    setFrom(
                      today
                    );

                    setTo(
                      today
                    );
                  }}
                >
                  Today
                </button>

                <div className="se-att-scope-pill">

                <small>
                  YOUR SCOPE
                </small>

                <strong>
                  {
                    managementScopeTitle
                  }
                </strong>

                </div>

              </div>

            </section>

            <div
  className="se-att-workforce-summary"
  role="group"
  aria-label="Attendance workforce filters"
>

  <button
    type="button"
    className={`se-att-workforce-card se-att-workforce-card--present ${
      registerView === "PRESENT"
        ? "is-active"
        : ""
    }`}
    onClick={() =>
      setRegisterView(
        "PRESENT"
      )
    }
  >
    <span className="se-att-workforce-card-label">
      Present
    </span>

    <strong>
      {summary.present}
    </strong>

    <small>
      Checked in workforce
    </small>
  </button>


  <button
    type="button"
    className={`se-att-workforce-card se-att-workforce-card--absent ${
      registerView === "ABSENT"
        ? "is-active"
        : ""
    }`}
    onClick={() =>
      setRegisterView(
        "ABSENT"
      )
    }
  >
    <span className="se-att-workforce-card-label">
      Absent
    </span>

    <strong>
      {summary.absent}
    </strong>

    <small>
      No attendance marked
    </small>
  </button>


  <button
    type="button"
    className={`se-att-workforce-card se-att-workforce-card--late ${
      registerView === "LATE"
        ? "is-active"
        : ""
    }`}
    onClick={() =>
      setRegisterView(
        "LATE"
      )
    }
  >
    <span className="se-att-workforce-card-label">
      Late
    </span>

    <strong>
      {summary.late}
    </strong>

    <small>
      After 09:10 AM
    </small>
  </button>


  <button
    type="button"
    className={`se-att-workforce-card se-att-workforce-card--wfh ${
      registerView === "WFH"
        ? "is-active"
        : ""
    }`}
    onClick={() =>
      setRegisterView(
        "WFH"
      )
    }
  >
    <span className="se-att-workforce-card-label">
      Work From Home
    </span>

    <strong>
      {summary.wfh}
    </strong>

    <small>
      Remote workforce
    </small>
  </button>


  <button
    type="button"
    className={`se-att-workforce-card se-att-workforce-card--field ${
      registerView === "FIELD"
        ? "is-active"
        : ""
    }`}
    onClick={() =>
      setRegisterView(
        "FIELD"
      )
    }
  >
    <span className="se-att-workforce-card-label">
      Field Visit
    </span>

    <strong>
      {summary.field}
    </strong>

    <small>
      Working in field
    </small>
  </button>




</div>

            <AttendanceFilters
              rangeType={
                rangeType
              }
              setRangeType={
                setRangeType
              }
              from={
                from
              }
              setFrom={
                setFrom
              }
              to={
                to
              }
              setTo={
                setTo
              }
              search={
                search
              }
              setSearch={
                setSearch
              }
              status={
                status
              }
              setStatus={
                setStatus
              }
              department={
                department
              }
              setDepartment={
                setDepartment
              }
              office={
                office
              }
              setOffice={
                setOffice
              }
              workMode={
                workMode
              }
              setWorkMode={
                setWorkMode
              }
              source={
                source
              }
              setSource={
                setSource
              }
              departments={
                departments
              }
              offices={
                offices
              }
              canUseManagementFilters={
                true
              }
              onReset={
                resetFilters
              }
            />

            <AttendanceRegister
  loading={
    loading
  }

  records={
    registerRecords
  }

  viewLabel={
    registerViewLabel
  }

  activeView={
    registerView
  }

  isRecordLate={
    isRecordLate
  }

  canViewLocation={
    access
      .canViewLocations
  }

  onOpen={
    setSelectedRecord
  }
/>

          </>
        ) : null}

        {/* =================================================
            APPROVALS
        ================================================== */}

        {view ===
          "APPROVALS" &&
        access
          .canApproveRegularization ? (
          <section className="se-att-feature-page">

            <div className="se-att-feature-icon">
              ✓
            </div>

            <span>
              REGULARIZATION
            </span>

            <h2>
              Attendance corrections
            </h2>

            <p>
              Pending employee attendance corrections and approval actions belong here, separate from the attendance register.
            </p>

            <div className="se-att-feature-note">
              The approval list can now be connected to the existing pending regularization API.
            </div>

          </section>
        ) : null}

        {/* =================================================
            LOCATIONS
        ================================================== */}

        {view ===
          "LOCATIONS" &&
        access
          .canViewLocations ? (
          <section className="se-att-feature-page">

            <div className="se-att-feature-icon purple">
              ⌖
            </div>

            <span>
              FIELD VISIBILITY
            </span>

            <h2>
              WFH & field locations
            </h2>

            <p>
  Review verified Work From Home and Field Visit attendance locations.
</p>

            <button
              type="button"
              className="se-people-att-primary-btn"
              onClick={() =>
                setView(
                  "REGISTER"
                )
              }
            >
              Open Workforce Register
            </button>

          </section>
        ) : null}

        {/* =================================================
            REPORTS
        ================================================== */}

        {view ===
          "REPORTS" &&
        access
          .canExport ? (
          <section className="se-att-reports-page">

            <div className="se-att-section-heading">

              <div>

                <span>
                  ATTENDANCE REPORTS
                </span>

                <h2>
                  Download attendance
                </h2>

                <p>
                  Select the range and workforce filters before exporting the permitted attendance sheet.
                </p>

              </div>

            </div>

            <AttendanceFilters
              rangeType={
                rangeType
              }
              setRangeType={
                setRangeType
              }
              from={
                from
              }
              setFrom={
                setFrom
              }
              to={
                to
              }
              setTo={
                setTo
              }
              search={
                search
              }
              setSearch={
                setSearch
              }
              status={
                status
              }
              setStatus={
                setStatus
              }
              department={
                department
              }
              setDepartment={
                setDepartment
              }
              office={
                office
              }
              setOffice={
                setOffice
              }
              workMode={
                workMode
              }
              setWorkMode={
                setWorkMode
              }
              source={
                source
              }
              setSource={
                setSource
              }
              departments={
                departments
              }
              offices={
                offices
              }
              canUseManagementFilters={
                true
              }
              onReset={
                resetFilters
              }
            />

            <div className="se-att-download-card">

              <div className="se-att-download-icon">
                ↓
              </div>

              <div>

                <small>
                  ATTENDANCE SHEET
                </small>

                <h3>
                  Export selected attendance
                </h3>

                <p>
                  {rangeLabel(
                    from,
                    to
                  )}
                </p>

              </div>

              <div className="se-att-download-actions">

  <button
    type="button"
    className="se-att-download-btn se-att-download-btn--csv"
    onClick={() =>
      download(
        "csv"
      )
    }
  >
    <span
      className="se-att-download-btn-icon"
      aria-hidden="true"
    >
      ↓
    </span>

    Download CSV
  </button>

  <button
    type="button"
    className="se-att-download-btn se-att-download-btn--pdf"
    onClick={() =>
      download(
        "pdf"
      )
    }
  >
    <span
      className="se-att-download-btn-icon"
      aria-hidden="true"
    >
      ↓
    </span>

    Download PDF
  </button>

</div>

            </div>

          </section>
        ) : null}

      </section>

      {/* =================================================
          DETAILS DRAWER
      ================================================== */}

      <AttendanceDetailsDrawer
        record={
          selectedRecord
        }
        canViewLocation={
          access
            .canViewLocations
        }
        onClose={() =>
          setSelectedRecord(
            null
          )
        }
      />

      {/* =================================================
          REGULARIZATION
      ================================================== */}

      <RegularizationModal
        attendance={
          regularizationRecord
        }
        onClose={() =>
          setRegularizationRecord(
            null
          )
        }
        onSuccess={() =>
          load(
            true
          )
        }
      />

    </main>
  );
}

export default AttendancePage;
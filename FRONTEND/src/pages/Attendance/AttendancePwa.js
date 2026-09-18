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
} from "../../auth/AuthContext";

import {
  getEmployees,
} from "../../services/employeeService";

import {
  createAttendanceLocationCheckpoint,
  getAttendanceList,
  getLocationTrackingStatus,
  getMyTodayAttendance,
  mobileAttendanceCheckIn,
  mobileAttendanceCheckOut,
} from "../../services/attendanceService";

import AttendanceCalendar from "./components/AttendanceCalendar";

import {
  attendanceRoleAccess,
  buildSelectedDayRows,
  checkInTimeOf,
  checkOutTimeOf,
  employeeCodeOf,
  employeeNameOf,
  formatDateLong,
  formatMinutes,
  formatTime,
  monthRange,
  normalizedStatus,
  normalizedWorkMode,
  pad2,
  statusLabel,
  summarizeRows,
  toDateKey,
  workModeLabel,
  workingMinutesOf,
} from "./utils/attendanceHelpers";

import "./AttendancePwa.css";

/* =========================================================
   ATTENDANCE MODES

   IMPORTANT:
   Office is included.

   This allows a web/PWA fallback if eSSL biometric
   attendance is unavailable or a punch is missed.

   Backend remains responsible for validating whether an
   OFFICE punch is genuinely inside the office geofence.
========================================================= */

const ATTENDANCE_MODES = [
  {
    value: "OFFICE",

    label:
      "Office",

    shortLabel:
      "Office",

    description:
      "Office punch when biometric is unavailable",

    icon:
      "▣",

    tone:
      "office",
  },

  {
    value: "VISIT",

    label:
      "Customer Visit",

    shortLabel:
      "Visit",

    description:
      "Customer, supplier or work-site visit",

    icon:
      "↗",

    tone:
      "visit",
  },

  {
    value: "ON_DUTY",

    label:
      "On Duty",

    shortLabel:
      "Duty",

    description:
      "Official work away from office",

    icon:
      "◎",

    tone:
      "duty",
  },

  {
    value: "REMOTE",

    label:
      "Remote Work",

    shortLabel:
      "Remote",

    description:
      "Working from another approved location",

    icon:
      "⌖",

    tone:
      "remote",
  },

  {
    value:
      "WORK_FROM_HOME",

    label:
      "Work From Home",

    shortLabel:
      "WFH",

    description:
      "Approved work from home",

    icon:
      "⌂",

    tone:
      "wfh",
  },
];

/* =========================================================
   GPS
========================================================= */

const getCurrentGps =
  () => {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        if (
          !navigator.geolocation
        ) {
          reject(
            new Error(
              "GPS is not supported on this device."
            )
          );

          return;
        }

        navigator.geolocation.getCurrentPosition(
          (
            position
          ) => {
            resolve({
              latitude:
                position.coords
                  .latitude,

              longitude:
                position.coords
                  .longitude,

              accuracy:
                position.coords
                  .accuracy,
            });
          },

          (
            error
          ) => {
            let message =
              "Unable to access your current location.";

            if (
              error?.code ===
              1
            ) {
              message =
                "Location permission is required for attendance.";
            }

            if (
              error?.code ===
              2
            ) {
              message =
                "Your current location could not be determined.";
            }

            if (
              error?.code ===
              3
            ) {
              message =
                "Location request timed out. Please try again.";
            }

            reject(
              new Error(
                message
              )
            );
          },

          {
            enableHighAccuracy:
              true,

            timeout:
              15000,

            maximumAge:
              10000,
          }
        );
      }
    );
  };

/* =========================================================
   EMPLOYEE RESPONSE
========================================================= */

const normalizeEmployeeResponse =
  (
    response
  ) => {
    if (
      Array.isArray(
        response?.records
      )
    ) {
      return (
        response.records
      );
    }

    const payload =
      response?.data?.data ||
      response?.data ||
      response ||
      {};

    return (
      payload?.records ||
      payload?.employees ||
      payload?.items ||
      []
    );
  };

/* =========================================================
   CURRENT EMPLOYEE ID
========================================================= */

const currentEmployeeIdOf =
  (
    user
  ) => {
    if (
      user?.employee &&
      typeof user.employee ===
        "object"
    ) {
      return (
        user.employee?._id ||
        user.employee?.id ||
        ""
      );
    }

    return (
      user?.employee ||
      ""
    );
  };

/* =========================================================
   ATTENDANCE PWA
========================================================= */

const AttendancePwa =
  () => {
    const navigate =
      useNavigate();

    const {
      user,
    } =
      useAuth();

    /* =====================================================
       ROLE
    ===================================================== */

    const access =
      useMemo(
        () =>
          attendanceRoleAccess(
            user?.role
          ),
        [
          user?.role,
        ]
      );

    const currentEmployeeId =
      useMemo(
        () =>
          String(
            currentEmployeeIdOf(
              user
            ) ||
              ""
          ),
        [
          user,
        ]
      );

    /* =====================================================
       MOBILE VIEW

       EMPLOYEE
       --------
       MY

       HEAD / MANAGER
       --------------
       MY
       TEAM

       ADMIN / SUPER ADMIN
       -------------------
       MY
       WORKFORCE

       We intentionally do NOT put the complete desktop
       control center inside mobile.
    ===================================================== */

    const [
      activeView,
      setActiveView,
    ] =
      useState(
        "MY"
      );

    /* =====================================================
       DATE
    ===================================================== */

    const now =
      useMemo(
        () =>
          new Date(),
        []
      );

    const todayDate =
      useMemo(
        () =>
          toDateKey(
            now
          ),
        [
          now,
        ]
      );

    const [
      year,
      setYear,
    ] =
      useState(
        now.getFullYear()
      );

    const [
      month,
      setMonth,
    ] =
      useState(
        now.getMonth()
      );

    const [
      selectedDate,
      setSelectedDate,
    ] =
      useState(
        todayDate
      );

    /* =====================================================
       PERSONAL ATTENDANCE
    ===================================================== */

    const [
      today,
      setToday,
    ] =
      useState(
        null
      );

    const [
      monthRecords,
      setMonthRecords,
    ] =
      useState([]);

    const [
      tracking,
      setTracking,
    ] =
      useState({
        active:
          false,
      });

    /* =====================================================
       MANAGEMENT
    ===================================================== */

    const [
      employees,
      setEmployees,
    ] =
      useState([]);

    const [
      managementAttendance,
      setManagementAttendance,
    ] =
      useState([]);

    const [
      managementLoading,
      setManagementLoading,
    ] =
      useState(
        false
      );

    const [
      managementSearch,
      setManagementSearch,
    ] =
      useState(
        ""
      );

    const [
      managementStatus,
      setManagementStatus,
    ] =
      useState(
        ""
      );

    /* =====================================================
       UI
    ===================================================== */

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
      actionLoading,
      setActionLoading,
    ] =
      useState(
        ""
      );

    const [
      errorMessage,
      setErrorMessage,
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

    const [
      checkInOpen,
      setCheckInOpen,
    ] =
      useState(
        false
      );

    /* =====================================================
       CHECK-IN FORM
    ===================================================== */

    const [
      workMode,
      setWorkMode,
    ] =
      useState(
        "OFFICE"
      );

    const [
      purpose,
      setPurpose,
    ] =
      useState(
        ""
      );

    const [
      locationName,
      setLocationName,
    ] =
      useState(
        ""
      );

    /* =====================================================
       LOAD PERSONAL ATTENDANCE
    ===================================================== */

    const loadAttendance =
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

            setErrorMessage(
              ""
            );

            const range =
              monthRange(
                year,
                month
              );

            const [
              todayResponse,
              monthResponse,
              trackingResponse,
            ] =
              await Promise.all([
                getMyTodayAttendance(),

                getAttendanceList({
                  from:
                    range.from,

                  to:
                    range.to,

                  page:
                    1,

                  limit:
                    500,
                }),

                getLocationTrackingStatus()
                  .catch(
                    () => ({
                      active:
                        false,
                    })
                  ),
              ]);

            setToday(
              todayResponse
                ?.attendance ||
                todayResponse ||
                null
            );

            let records =
              monthResponse
                ?.records ||
              [];

            /*
             * Management GET /attendance may return
             * more than their own data.
             *
             * My Attendance must always remain personal.
             */
            if (
              access
                .isManagement &&
              currentEmployeeId
            ) {
              records =
                records.filter(
                  (
                    record
                  ) => {
                    const id =
                      String(
                        record
                          ?.employeeId
                          ?._id ||
                        record
                          ?.employeeId ||
                        record
                          ?.employee
                          ?._id ||
                        ""
                      );

                    return (
                      id ===
                      currentEmployeeId
                    );
                  }
                );
            }

            setMonthRecords(
              records
            );

            setTracking(
              trackingResponse ||
                {
                  active:
                    false,
                }
            );
          } catch (
            error
          ) {
            setErrorMessage(
              error?.response
                ?.data
                ?.message ||
                error?.message ||
                "Unable to load attendance."
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
          year,
          month,
          access
            .isManagement,
          currentEmployeeId,
        ]
      );

    useEffect(() => {
      loadAttendance();
    }, [
      loadAttendance,
    ]);

    /* =====================================================
       LOAD TEAM / WORKFORCE
    ===================================================== */

    const loadManagement =
      useCallback(
        async () => {
          if (
            !access
              .isManagement
          ) {
            return;
          }

          try {
            setManagementLoading(
              true
            );

            setErrorMessage(
              ""
            );

            const [
              employeeResponse,
              attendanceResponse,
            ] =
              await Promise.all([
                getEmployees({
                  page:
                    1,

                  limit:
                    500,

                  status:
                    "ACTIVE",
                }),

                getAttendanceList({
                  from:
                    selectedDate,

                  to:
                    selectedDate,

                  date:
                    selectedDate,

                  page:
                    1,

                  limit:
                    500,

                  scope:
                    access
                      .canViewAll
                      ? undefined
                      : "TEAM",
                }),
              ]);

            setEmployees(
              normalizeEmployeeResponse(
                employeeResponse
              )
            );

            setManagementAttendance(
              attendanceResponse
                ?.records ||
                []
            );
          } catch (
            error
          ) {
            setErrorMessage(
              error?.response
                ?.data
                ?.message ||
                error?.message ||
                "Unable to load attendance management data."
            );
          } finally {
            setManagementLoading(
              false
            );
          }
        },
        [
          access
            .isManagement,
          access.canViewAll,
          selectedDate,
        ]
      );

    useEffect(() => {
      if (
        activeView ===
        "TEAM"
      ) {
        loadManagement();
      }
    }, [
      activeView,
      loadManagement,
    ]);

    /* =====================================================
       PERIODIC GPS

       Only while backend says tracking is active.
    ===================================================== */

    useEffect(() => {
      if (
        !tracking?.active
      ) {
        return undefined;
      }

      const timer =
        window.setInterval(
          async () => {
            try {
              const gps =
                await getCurrentGps();

              await createAttendanceLocationCheckpoint(
                {
                  ...gps,

                  source:
                    "PERIODIC",
                }
              );
            } catch (
              error
            ) {
              console.log(
                "Periodic GPS skipped:",
                error?.message
              );
            }
          },

          30 *
            60 *
            1000
        );

      return () => {
        window.clearInterval(
          timer
        );
      };
    }, [
      tracking?.active,
    ]);

    /* =====================================================
       CHECK IN

       FLEXIBLE RULE
       -----------------------------------------------------
       OFFICE:
       - GPS still captured
       - backend can validate office geofence
       - serves as fallback when eSSL punch is missed

       VISIT / ON DUTY / REMOTE / WFH:
       - GPS captured
       - location/purpose required where appropriate
    ===================================================== */

    const handleCheckIn =
      async () => {
        if (
          actionLoading
        ) {
          return;
        }

        setErrorMessage(
          ""
        );

        setSuccessMessage(
          ""
        );

        const outsideOffice =
          workMode !==
          "OFFICE";

        if (
          outsideOffice &&
          !locationName.trim()
        ) {
          setErrorMessage(
            "Enter the customer, site or work location."
          );

          return;
        }

        if (
          outsideOffice &&
          !purpose.trim()
        ) {
          setErrorMessage(
            "Enter the purpose of your outside-office work."
          );

          return;
        }

        try {
          setActionLoading(
            "CHECK_IN"
          );

          const gps =
            await getCurrentGps();

          await mobileAttendanceCheckIn(
            {
              ...gps,

              workMode,

              attendanceMode:
                workMode,

              locationName:
                locationName.trim(),

              purpose:
                purpose.trim(),

              remark:
                purpose.trim(),

              source:
                "PWA",
            }
          );

          setCheckInOpen(
            false
          );

          setSuccessMessage(
            workMode ===
              "OFFICE"
              ? "Office check-in recorded with GPS verification."
              : `${workModeLabel(
                  workMode
                )} check-in recorded successfully.`
          );

          setWorkMode(
            "OFFICE"
          );

          setLocationName(
            ""
          );

          setPurpose(
            ""
          );

          await loadAttendance(
            true
          );
        } catch (
          error
        ) {
          setErrorMessage(
            error?.response
              ?.data
              ?.message ||
            error?.message ||
            "Unable to check in."
          );
        } finally {
          setActionLoading(
            ""
          );
        }
      };

    /* =====================================================
       CHECK OUT

       Everybody can check out through PWA.

       This is intentionally not limited to field attendance.
       If biometric checkout is missed, the PWA remains a
       usable fallback subject to backend policy.
    ===================================================== */

    const handleCheckOut =
      async () => {
        if (
          actionLoading
        ) {
          return;
        }

        try {
          setActionLoading(
            "CHECK_OUT"
          );

          setErrorMessage(
            ""
          );

          setSuccessMessage(
            ""
          );

          let gps =
            {};

          try {
            gps =
              await getCurrentGps();
          } catch (
            gpsError
          ) {
            console.log(
              "Checkout GPS unavailable:",
              gpsError?.message
            );
          }

          await mobileAttendanceCheckOut(
            {
              ...gps,

              source:
                "PWA",
            }
          );

          setSuccessMessage(
            "Check-out recorded successfully."
          );

          await loadAttendance(
            true
          );
        } catch (
          error
        ) {
          setErrorMessage(
            error?.response
              ?.data
              ?.message ||
            error?.message ||
            "Unable to check out."
          );
        } finally {
          setActionLoading(
            ""
          );
        }
      };

    /* =====================================================
       MANUAL LOCATION CHECKPOINT
    ===================================================== */

    const handleLocationRefresh =
      async () => {
        if (
          actionLoading
        ) {
          return;
        }

        try {
          setActionLoading(
            "LOCATION"
          );

          setErrorMessage(
            ""
          );

          const gps =
            await getCurrentGps();

          await createAttendanceLocationCheckpoint(
            {
              ...gps,

              source:
                "MANUAL_REFRESH",
            }
          );

          setSuccessMessage(
            "Current work location updated."
          );

          await loadAttendance(
            true
          );
        } catch (
          error
        ) {
          setErrorMessage(
            error?.response
              ?.data
              ?.message ||
            error?.message ||
            "Unable to update your location."
          );
        } finally {
          setActionLoading(
            ""
          );
        }
      };

    /* =====================================================
       PERSONAL CALENDAR
    ===================================================== */

    const daySummary =
      useMemo(
        () => {
          const output =
            {};

          const totalDays =
            new Date(
              year,
              month + 1,
              0
            ).getDate();

          for (
            let day = 1;
            day <=
            totalDays;
            day += 1
          ) {
            const key =
              `${year}-${pad2(
                month + 1
              )}-${pad2(
                day
              )}`;

            const record =
              monthRecords.find(
                (
                  item
                ) =>
                  toDateKey(
                    item
                      ?.attendanceDate
                  ) ===
                  key
              ) ||
              null;

            const status =
              normalizedStatus(
                record,
                key,
                todayDate
              );

            const summary =
              summarizeRows([
                {
                  status,
                },
              ]);

            output[
              key
            ] =
              summary;
          }

          return output;
        },
        [
          year,
          month,
          monthRecords,
          todayDate,
        ]
      );

    /* =====================================================
       SELECTED PERSONAL RECORD
    ===================================================== */

    const selectedRecord =
      useMemo(
        () => {
          if (
            selectedDate ===
            todayDate
          ) {
            return (
              today ||
              monthRecords.find(
                (
                  record
                ) =>
                  toDateKey(
                    record
                      ?.attendanceDate
                  ) ===
                  selectedDate
              ) ||
              null
            );
          }

          return (
            monthRecords.find(
              (
                record
              ) =>
                toDateKey(
                  record
                    ?.attendanceDate
                ) ===
                selectedDate
            ) ||
            null
          );
        },
        [
          monthRecords,
          selectedDate,
          todayDate,
          today,
        ]
      );

    /* =====================================================
       TODAY
    ===================================================== */

    const todayCheckIn =
      checkInTimeOf(
        today
      );

    const todayCheckOut =
      checkOutTimeOf(
        today
      );

    const checkedIn =
      Boolean(
        todayCheckIn
      );

    const checkedOut =
      Boolean(
        todayCheckOut
      );

    const todayWorkMode =
      normalizedWorkMode(
        today
      );

    const todaySource =
      String(
        today
          ?.primarySource ||
        today
          ?.attendanceSource ||
        ""
      ).toUpperCase();

    /* =====================================================
       TODAY STATE
    ===================================================== */

    const attendanceState =
      useMemo(
        () => {
          if (
            !checkedIn
          ) {
            return {
              label:
                "Ready to check in",

              description:
                "No attendance recorded yet.",

              tone:
                "neutral",

              icon:
                "○",
            };
          }

          if (
            checkedIn &&
            !checkedOut
          ) {
            return {
              label:
                "Attendance active",

              description:
                `${workModeLabel(
                  todayWorkMode
                )} session is currently active.`,

              tone:
                "active",

              icon:
                "●",
            };
          }

          return {
            label:
              "Day completed",

            description:
              "Check-in and check-out are recorded.",

            tone:
              "complete",

            icon:
              "✓",
          };
        },
        [
          checkedIn,
          checkedOut,
          todayWorkMode,
        ]
      );

    /* =====================================================
       MONTH INSIGHTS
    ===================================================== */

    const monthInsights =
      useMemo(
        () => {
          const rows =
            monthRecords.map(
              (
                record
              ) => ({
                status:
                  normalizedStatus(
                    record,
                    toDateKey(
                      record
                        ?.attendanceDate
                    ),
                    todayDate
                  ),
              })
            );

          const summary =
            summarizeRows(
              rows
            );

          return {
            present:
              summary
                .attendanceCount ||
              0,

            office:
              monthRecords.filter(
                (
                  record
                ) =>
                  normalizedWorkMode(
                    record
                  ) ===
                  "OFFICE"
              ).length,

            field:
              (
                summary.visit ||
                0
              ) +
              (
                summary.onDuty ||
                0
              ),

            remote:
              summary.remote ||
              0,

            absent:
              summary.absent ||
              0,

            exceptions:
              summary.exceptions ||
              0,
          };
        },
        [
          monthRecords,
          todayDate,
        ]
      );

    /* =====================================================
       SELECTED DAY
    ===================================================== */

    const selectedCheckIn =
      checkInTimeOf(
        selectedRecord
      );

    const selectedCheckOut =
      checkOutTimeOf(
        selectedRecord
      );

    const selectedMode =
      normalizedWorkMode(
        selectedRecord
      );

    const selectedSource =
      selectedRecord
        ?.primarySource ||
      selectedRecord
        ?.attendanceSource ||
      "—";

    const selectedStatus =
      normalizedStatus(
        selectedRecord,
        selectedDate,
        todayDate
      );

    /* =====================================================
       MANAGEMENT ROWS
    ===================================================== */

    const managementRows =
      useMemo(
        () =>
          buildSelectedDayRows(
            employees,
            managementAttendance,
            selectedDate,
            todayDate
          ),
        [
          employees,
          managementAttendance,
          selectedDate,
          todayDate,
        ]
      );

    const managementSummary =
      useMemo(
        () =>
          summarizeRows(
            managementRows
          ),
        [
          managementRows,
        ]
      );

    const filteredManagementRows =
      useMemo(
        () => {
          const needle =
            managementSearch
              .trim()
              .toLowerCase();

          return managementRows.filter(
            (
              row
            ) => {
              if (
                managementStatus &&
                row.status !==
                  managementStatus
              ) {
                return false;
              }

              if (
                needle
              ) {
                const haystack =
                  [
                    row.name,

                    row.email,

                    row.employeeCode,

                    row.department,

                    row.orgUnitCode,

                    row.designation,
                  ]
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

              return true;
            }
          );
        },
        [
          managementRows,
          managementSearch,
          managementStatus,
        ]
      );

    /* =====================================================
       MONTH NAVIGATION
    ===================================================== */

    const changeMonth =
      (
        delta
      ) => {
        const next =
          new Date(
            year,
            month + delta,
            1
          );

        const nextYear =
          next.getFullYear();

        const nextMonth =
          next.getMonth();

        setYear(
          nextYear
        );

        setMonth(
          nextMonth
        );

        const firstDate =
          `${nextYear}-${pad2(
            nextMonth + 1
          )}-01`;

        setSelectedDate(
          firstDate >
            todayDate
            ? todayDate
            : firstDate
        );
      };

    /* =====================================================
       OPEN CHECK IN

       We no longer label the action as
       "Working outside office?"

       Office fallback is valid as well.
    ===================================================== */

    const openCheckIn =
      () => {
        setErrorMessage(
          ""
        );

        setSuccessMessage(
          ""
        );

        setWorkMode(
          "OFFICE"
        );

        setLocationName(
          ""
        );

        setPurpose(
          ""
        );

        setCheckInOpen(
          true
        );
      };

    /* =====================================================
       RENDER
    ===================================================== */

    return (
      <main className="se-att-pwa-page">
        {/* =================================================
            APP BAR
        ================================================= */}

        <header className="se-att-pwa-top">
          <button
            type="button"
            className="se-att-pwa-back"
            onClick={() =>
              navigate(
                "/dashboard?app=people"
              )
            }
            aria-label="Back"
          >
            ←
          </button>

          <div className="se-att-pwa-top-title">
            <span>
              PEOPLE
            </span>

            <strong>
              Attendance
            </strong>
          </div>

          <button
            type="button"
            className="se-att-pwa-refresh"
            onClick={() => {
              if (
                activeView ===
                "TEAM"
              ) {
                loadManagement();

                return;
              }

              loadAttendance(
                true
              );
            }}
            disabled={
              refreshing ||
              managementLoading
            }
          >
            {refreshing ||
            managementLoading
              ? "···"
              : "↻"}
          </button>
        </header>

        {/* =================================================
            ROLE SWITCH

            Hidden completely for normal employee.
        ================================================= */}

        {access
          .isManagement ? (
          <nav className="se-att-pwa-role-switch">
            <button
              type="button"
              className={
                activeView ===
                "MY"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveView(
                  "MY"
                )
              }
            >
              <span>
                ◉
              </span>

              <div>
                <strong>
                  My Attendance
                </strong>

                <small>
                  My workday
                </small>
              </div>
            </button>

            <button
              type="button"
              className={
                activeView ===
                "TEAM"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveView(
                  "TEAM"
                )
              }
            >
              <span>
                👥
              </span>

              <div>
                <strong>
                  {access
                    .canViewAll
                    ? "Workforce"
                    : "My Team"}
                </strong>

                <small>
                  {access
                    .canViewAll
                    ? "Company view"
                    : "Reporting team"}
                </small>
              </div>
            </button>
          </nav>
        ) : null}

        <section className="se-att-pwa-content">
          {/* =================================================
              ERROR
          ================================================= */}

          {errorMessage ? (
            <div className="se-att-pwa-error">
              <span>
                !
              </span>

              <p>
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={() =>
                  setErrorMessage(
                    ""
                  )
                }
              >
                ×
              </button>
            </div>
          ) : null}

          {/* =================================================
              SUCCESS
          ================================================= */}

          {successMessage ? (
            <div className="se-att-pwa-success">
              <span>
                ✓
              </span>

              <p>
                {successMessage}
              </p>

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
              MY ATTENDANCE
          ================================================= */}

          {activeView ===
          "MY" ? (
            <>
              {/* =============================================
                  HERO
              ============================================= */}

              <section className="se-att-pwa-hero">
                <div className="se-att-pwa-hero-copy">
                  <div className="se-att-pwa-hero-label">
                    <span>
                      MY WORKDAY
                    </span>

                    <i>
                      {checkedIn &&
                      !checkedOut
                        ? "LIVE"
                        : "TODAY"}
                    </i>
                  </div>

                  <h1>
                    Hello,{" "}
                    {user?.displayName ||
                      "User"}
                  </h1>

                  <p>
                    Office, biometric
                    and field attendance
                    in one workday.
                  </p>

                  <div
                    className={`se-att-pwa-session-state ${attendanceState.tone}`}
                  >
                    <span>
                      {
                        attendanceState.icon
                      }
                    </span>

                    <div>
                      <strong>
                        {
                          attendanceState.label
                        }
                      </strong>

                      <small>
                        {
                          attendanceState.description
                        }
                      </small>
                    </div>
                  </div>
                </div>

                <div
                  className="se-att-pwa-hero-visual"
                  aria-hidden="true"
                >
                  <div className="se-att-pwa-calendar-art">
                    <small>
                      {new Intl.DateTimeFormat(
                        "en-US",
                        {
                          month:
                            "short",
                        }
                      )
                        .format(
                          now
                        )
                        .toUpperCase()}
                    </small>

                    <strong>
                      {now.getDate()}
                    </strong>
                  </div>

                  <div className="se-att-pwa-location-art">
                    ⌖
                  </div>

                  <div className="se-att-pwa-clock-art">
                    ◷
                  </div>
                </div>
              </section>

              {/* =============================================
                  TODAY
              ============================================= */}

              <section className="se-att-pwa-today">
                <div className="se-att-pwa-section-heading">
                  <div>
                    <span>
                      TODAY
                    </span>

                    <h2>
                      My Attendance
                    </h2>

                    <p>
                      {formatDateLong(
                        todayDate
                      )}
                    </p>
                  </div>

                  {tracking
                    ?.active ? (
                    <div className="se-att-pwa-live-pill">
                      <i />

                      GPS Active
                    </div>
                  ) : (
                    <div className="se-att-pwa-source-pill">
                      {todaySource ||
                        "Ready"}
                    </div>
                  )}
                </div>

                {/* ===========================================
                    CHECK IN / CHECK OUT
                =========================================== */}

                <div className="se-att-pwa-time-flow">
                  <article className="checkin">
                    <span className="se-att-pwa-flow-icon in">
                      ↘
                    </span>

                    <div>
                      <small>
                        CHECK IN
                      </small>

                      <strong>
                        {formatTime(
                          todayCheckIn
                        )}
                      </strong>
                    </div>
                  </article>

                  <span className="se-att-pwa-flow-line">
                    <i />
                  </span>

                  <article className="checkout">
                    <span className="se-att-pwa-flow-icon out">
                      ↗
                    </span>

                    <div>
                      <small>
                        CHECK OUT
                      </small>

                      <strong>
                        {formatTime(
                          todayCheckOut
                        )}
                      </strong>
                    </div>
                  </article>
                </div>

                {/* ===========================================
                    SUMMARY
                =========================================== */}

                <div className="se-att-pwa-work-summary">
                  <div>
                    <span>
                      WORKING
                    </span>

                    <strong>
                      {formatMinutes(
                        workingMinutesOf(
                          today
                        )
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      MODE
                    </span>

                    <strong>
                      {workModeLabel(
                        todayWorkMode
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      SOURCE
                    </span>

                    <strong>
                      {todaySource ||
                        "—"}
                    </strong>
                  </div>
                </div>

                {/* ===========================================
                    START ATTENDANCE

                    Available for Office also.
                =========================================== */}

                {!checkedIn ? (
                  <button
                    type="button"
                    className="se-att-pwa-primary-action"
                    onClick={
                      openCheckIn
                    }
                  >
                    <span className="se-att-pwa-action-icon">
                      ↘
                    </span>

                    <div>
                      <strong>
                        Check In
                      </strong>

                      <small>
                        Office, visit,
                        duty or remote
                      </small>
                    </div>

                    <i>
                      →
                    </i>
                  </button>
                ) : null}

                {/* ===========================================
                    ACTIVE SESSION
                =========================================== */}

                {checkedIn &&
                !checkedOut ? (
                  <div className="se-att-pwa-field-session">
                    <div className="se-att-pwa-field-session-head">
                      <span>
                        <i />
                      </span>

                      <div>
                        <strong>
                          Attendance
                          active
                        </strong>

                        <small>
                          {workModeLabel(
                            todayWorkMode
                          )}
                          {" · "}
                          started{" "}
                          {formatTime(
                            todayCheckIn
                          )}
                        </small>
                      </div>
                    </div>

                    <div className="se-att-pwa-field-actions">
                      {[
                        "VISIT",
                        "ON_DUTY",
                        "REMOTE",
                        "WORK_FROM_HOME",
                      ].includes(
                        todayWorkMode
                      ) ? (
                        <button
                          type="button"
                          onClick={
                            handleLocationRefresh
                          }
                          disabled={
                            Boolean(
                              actionLoading
                            )
                          }
                        >
                          <span>
                            ⌖
                          </span>

                          <div>
                            <strong>
                              {actionLoading ===
                              "LOCATION"
                                ? "Updating..."
                                : "Update GPS"}
                            </strong>

                            <small>
                              Save current
                              location
                            </small>
                          </div>
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="checkout"
                        onClick={
                          handleCheckOut
                        }
                        disabled={
                          Boolean(
                            actionLoading
                          )
                        }
                      >
                        <span>
                          ↗
                        </span>

                        <div>
                          <strong>
                            {actionLoading ===
                            "CHECK_OUT"
                              ? "Checking out..."
                              : "Check Out"}
                          </strong>

                          <small>
                            End workday
                          </small>
                        </div>
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* ===========================================
                    COMPLETE
                =========================================== */}

                {checkedOut ? (
                  <div className="se-att-pwa-complete-session">
                    <span>
                      ✓
                    </span>

                    <div>
                      <strong>
                        Workday complete
                      </strong>

                      <small>
                        {formatTime(
                          todayCheckIn
                        )}
                        {" — "}
                        {formatTime(
                          todayCheckOut
                        )}
                        {" · "}
                        {formatMinutes(
                          workingMinutesOf(
                            today
                          )
                        )}
                      </small>
                    </div>
                  </div>
                ) : null}
              </section>

              {/* =============================================
                  MONTH SNAPSHOT
              ============================================= */}

              <section className="se-att-pwa-snapshot">
                <div className="se-att-pwa-section-heading compact">
                  <div>
                    <span>
                      THIS MONTH
                    </span>

                    <h2>
                      My Snapshot
                    </h2>
                  </div>

                  <span className="se-att-pwa-snapshot-icon">
                    ◫
                  </span>
                </div>

                <div className="se-att-pwa-snapshot-grid">
                  <article>
                    <span className="present">
                      ✓
                    </span>

                    <div>
                      <strong>
                        {
                          monthInsights.present
                        }
                      </strong>

                      <small>
                        Active
                      </small>
                    </div>
                  </article>

                  <article>
                    <span className="office">
                      ▣
                    </span>

                    <div>
                      <strong>
                        {
                          monthInsights.office
                        }
                      </strong>

                      <small>
                        Office
                      </small>
                    </div>
                  </article>

                  <article>
                    <span className="field">
                      ⌖
                    </span>

                    <div>
                      <strong>
                        {
                          monthInsights.field
                        }
                      </strong>

                      <small>
                        Field
                      </small>
                    </div>
                  </article>

                  <article>
                    <span className="remote">
                      ⌂
                    </span>

                    <div>
                      <strong>
                        {
                          monthInsights.remote
                        }
                      </strong>

                      <small>
                        Remote
                      </small>
                    </div>
                  </article>
                </div>
              </section>

              {/* =============================================
                  CALENDAR
              ============================================= */}

              <section className="se-att-pwa-calendar-section">
                <div className="se-att-pwa-section-heading compact">
                  <div>
                    <span>
                      HISTORY
                    </span>

                    <h2>
                      Attendance Calendar
                    </h2>
                  </div>

                  <span className="se-att-pwa-calendar-section-icon">
                    ◷
                  </span>
                </div>

                <AttendanceCalendar
                  year={
                    year
                  }
                  month={
                    month
                  }
                  selectedDate={
                    selectedDate
                  }
                  todayDate={
                    todayDate
                  }
                  daySummary={
                    daySummary
                  }
                  onSelectDate={
                    setSelectedDate
                  }
                  onPreviousMonth={() =>
                    changeMonth(
                      -1
                    )
                  }
                  onNextMonth={() =>
                    changeMonth(
                      1
                    )
                  }
                />
              </section>

              {/* =============================================
                  SELECTED DAY
              ============================================= */}

              <section className="se-att-pwa-day-card">
                <div className="se-att-pwa-section-heading compact">
                  <div>
                    <span>
                      SELECTED DAY
                    </span>

                    <h2>
                      {formatDateLong(
                        selectedDate
                      )}
                    </h2>
                  </div>

                  <span className="se-att-pwa-selected-date-icon">
                    {selectedDate.slice(
                      -2
                    )}
                  </span>
                </div>

                <div className="se-att-pwa-selected-status">
                  {statusLabel(
                    selectedStatus
                  )}
                </div>

                {selectedRecord ? (
                  <>
                    <div className="se-att-pwa-day-timeline">
                      <div>
                        <span className="start">
                          ●
                        </span>

                        <div>
                          <small>
                            CHECK IN
                          </small>

                          <strong>
                            {formatTime(
                              selectedCheckIn
                            )}
                          </strong>
                        </div>
                      </div>

                      <span className="se-att-pwa-day-timeline-line" />

                      <div>
                        <span className="finish">
                          ●
                        </span>

                        <div>
                          <small>
                            CHECK OUT
                          </small>

                          <strong>
                            {formatTime(
                              selectedCheckOut
                            )}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="se-att-pwa-day-details">
                      <article>
                        <span>
                          WORKING
                        </span>

                        <strong>
                          {formatMinutes(
                            workingMinutesOf(
                              selectedRecord
                            )
                          )}
                        </strong>
                      </article>

                      <article>
                        <span>
                          MODE
                        </span>

                        <strong>
                          {workModeLabel(
                            selectedMode
                          )}
                        </strong>
                      </article>

                      <article>
                        <span>
                          SOURCE
                        </span>

                        <strong>
                          {
                            selectedSource
                          }
                        </strong>
                      </article>
                    </div>
                  </>
                ) : (
                  <div className="se-att-pwa-no-day">
                    <span>
                      ◷
                    </span>

                    <strong>
                      No attendance
                      record
                    </strong>

                    <p>
                      Attendance information
                      is not available for
                      this date.
                    </p>
                  </div>
                )}
              </section>
            </>
          ) : null}

          {/* =================================================
              TEAM / WORKFORCE
          ================================================= */}

          {activeView ===
          "TEAM" &&
          access
            .isManagement ? (
            <>
              <section className="se-att-pwa-management-hero">
                <div>
                  <span>
                    {access
                      .canViewAll
                      ? "WORKFORCE TODAY"
                      : "MY TEAM TODAY"}
                  </span>

                  <h1>
                    {managementSummary
                      .attendanceCount ||
                      0}
                    {" / "}
                    {managementSummary
                      .total ||
                      0}
                  </h1>

                  <p>
                    Employees active on{" "}
                    {formatDateLong(
                      selectedDate
                    )}
                  </p>
                </div>

                <div className="se-att-pwa-management-rate">
                  <strong>
                    {managementSummary
                      .attendanceRate ||
                      0}
                    %
                  </strong>

                  <span>
                    Attendance
                  </span>
                </div>
              </section>

              {/* =============================================
                  MANAGEMENT DATE
              ============================================= */}

              <div className="se-att-pwa-management-date">
                <button
                  type="button"
                  onClick={() => {
                    const date =
                      new Date(
                        `${selectedDate}T00:00:00`
                      );

                    date.setDate(
                      date.getDate() -
                        1
                    );

                    setSelectedDate(
                      toDateKey(
                        date
                      )
                    );
                  }}
                >
                  ‹
                </button>

                <div>
                  <span>
                    ATTENDANCE DATE
                  </span>

                  <strong>
                    {formatDateLong(
                      selectedDate
                    )}
                  </strong>
                </div>

                <button
                  type="button"
                  disabled={
                    selectedDate >=
                    todayDate
                  }
                  onClick={() => {
                    const date =
                      new Date(
                        `${selectedDate}T00:00:00`
                      );

                    date.setDate(
                      date.getDate() +
                        1
                    );

                    setSelectedDate(
                      toDateKey(
                        date
                      )
                    );
                  }}
                >
                  ›
                </button>
              </div>

              {/* =============================================
                  MANAGEMENT KPIs
              ============================================= */}

              <section className="se-att-pwa-management-kpis">
                <article className="active">
                  <span>
                    ✓
                  </span>

                  <strong>
                    {managementSummary
                      .attendanceCount ||
                      0}
                  </strong>

                  <small>
                    Active
                  </small>
                </article>

                <article className="absent">
                  <span>
                    !
                  </span>

                  <strong>
                    {managementSummary
                      .absent ||
                      0}
                  </strong>

                  <small>
                    Absent
                  </small>
                </article>

                <article className="field">
                  <span>
                    ⌖
                  </span>

                  <strong>
                    {managementSummary
                      .field ||
                      0}
                  </strong>

                  <small>
                    Field
                  </small>
                </article>

                <article className="warning">
                  <span>
                    ◷
                  </span>

                  <strong>
                    {managementSummary
                      .exceptions ||
                      0}
                  </strong>

                  <small>
                    Exceptions
                  </small>
                </article>
              </section>

              {/* =============================================
                  SEARCH
              ============================================= */}

              <section className="se-att-pwa-management-tools">
                <div className="se-att-pwa-management-search">
                  <span>
                    ⌕
                  </span>

                  <input
                    type="search"
                    value={
                      managementSearch
                    }
                    placeholder="Search employee..."
                    onChange={(
                      event
                    ) =>
                      setManagementSearch(
                        event.target
                          .value
                      )
                    }
                  />
                </div>

                <select
                  value={
                    managementStatus
                  }
                  onChange={(
                    event
                  ) =>
                    setManagementStatus(
                      event.target
                        .value
                    )
                  }
                >
                  <option value="">
                    All
                  </option>

                  <option value="PRESENT">
                    Present
                  </option>

                  <option value="NOT_CHECKED_IN">
                    Not Checked In
                  </option>

                  <option value="ABSENT">
                    Absent
                  </option>

                  <option value="VISIT">
                    Visit
                  </option>

                  <option value="ON_DUTY">
                    On Duty
                  </option>

                  <option value="REMOTE">
                    Remote
                  </option>

                  <option value="LATE">
                    Late
                  </option>

                  <option value="SHORT">
                    Short
                  </option>

                  <option value="MISSING">
                    Missing
                  </option>
                </select>
              </section>

              {/* =============================================
                  EMPLOYEES
              ============================================= */}

              <section className="se-att-pwa-management-list">
                <div className="se-att-pwa-management-list-head">
                  <div>
                    <span>
                      ATTENDANCE
                    </span>

                    <h2>
                      {filteredManagementRows
                        .length}{" "}
                      Employees
                    </h2>
                  </div>
                </div>

                {managementLoading ? (
                  <div className="se-att-pwa-management-empty">
                    Loading attendance...
                  </div>
                ) : filteredManagementRows
                    .length ===
                  0 ? (
                  <div className="se-att-pwa-management-empty">
                    No employees found.
                  </div>
                ) : (
                  filteredManagementRows.map(
                    (
                      row
                    ) => (
                      <article
                        className="se-att-pwa-employee-row"
                        key={
                          row.employeeId ||
                          row.email
                        }
                      >
                        <span className="se-att-pwa-employee-avatar">
                          {employeeNameOf(
                            row
                          )
                            .charAt(
                              0
                            )
                            .toUpperCase()}
                        </span>

                        <div className="se-att-pwa-employee-info">
                          <strong>
                            {row.name}
                          </strong>

                          <small>
                            {row.employeeCode ||
                              employeeCodeOf(
                                row
                              ) ||
                              row.department ||
                              "Employee"}
                          </small>
                        </div>

                        <div className="se-att-pwa-employee-time">
                          <strong>
                            {formatTime(
                              checkInTimeOf(
                                row.attendance
                              )
                            )}
                          </strong>

                          <small>
                            Check In
                          </small>
                        </div>

                        <span
                          className={`se-att-pwa-row-status status-${String(
                            row.status
                          ).toLowerCase()}`}
                        >
                          {statusLabel(
                            row.status
                          )}
                        </span>
                      </article>
                    )
                  )
                )}
              </section>
            </>
          ) : null}
        </section>

        {/* =================================================
            CHECK-IN SHEET
        ================================================= */}

        {checkInOpen ? (
          <div
            className="se-att-pwa-sheet-overlay"
            onMouseDown={() =>
              setCheckInOpen(
                false
              )
            }
          >
            <section
              className="se-att-pwa-sheet"
              onMouseDown={(
                event
              ) =>
                event.stopPropagation()
              }
            >
              <div className="se-att-pwa-sheet-handle" />

              <div className="se-att-pwa-sheet-head">
                <div>
                  <span>
                    CHECK IN
                  </span>

                  <h2>
                    How are you
                    working today?
                  </h2>

                  <p>
                    Your GPS will be
                    captured for attendance
                    verification.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCheckInOpen(
                      false
                    )
                  }
                >
                  ×
                </button>
              </div>

              {/* =============================================
                  MODES
              ============================================= */}

              <div className="se-att-pwa-mode-grid">
                {ATTENDANCE_MODES.map(
                  (
                    item
                  ) => {
                    const active =
                      workMode ===
                      item.value;

                    return (
                      <button
                        type="button"
                        key={
                          item.value
                        }
                        className={[
                          active
                            ? "active"
                            : "",

                          item.tone,
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            " "
                          )}
                        onClick={() =>
                          setWorkMode(
                            item.value
                          )
                        }
                      >
                        <span className="se-att-pwa-mode-icon">
                          {
                            item.icon
                          }
                        </span>

                        <div>
                          <strong>
                            {
                              item.label
                            }
                          </strong>

                          <small>
                            {
                              item.description
                            }
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

              {/* =============================================
                  OFFICE MESSAGE
              ============================================= */}

              {workMode ===
              "OFFICE" ? (
                <div className="se-att-pwa-office-fallback">
                  <span>
                    ▣
                  </span>

                  <div>
                    <strong>
                      Office web
                      punch
                    </strong>

                    <p>
                      Use eSSL normally.
                      This option is
                      available when your
                      biometric punch is
                      unavailable or was
                      missed.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <label className="se-att-pwa-field">
                    <span>
                      CUSTOMER / LOCATION
                      *
                    </span>

                    <input
                      value={
                        locationName
                      }
                      onChange={(
                        event
                      ) =>
                        setLocationName(
                          event.target
                            .value
                        )
                      }
                      placeholder="Customer, plant, site or work location"
                      maxLength={
                        150
                      }
                    />
                  </label>

                  <label className="se-att-pwa-field">
                    <span>
                      WORK PURPOSE *
                    </span>

                    <textarea
                      value={
                        purpose
                      }
                      onChange={(
                        event
                      ) =>
                        setPurpose(
                          event.target
                            .value
                        )
                      }
                      placeholder="Briefly mention the purpose of your work"
                      maxLength={
                        500
                      }
                    />

                    <small>
                      {
                        purpose.length
                      }
                      /500
                    </small>
                  </label>
                </>
              )}

              {/* =============================================
                  GPS
              ============================================= */}

              <div className="se-att-pwa-gps-notice">
                <span>
                  ⌖
                </span>

                <div>
                  <strong>
                    GPS verification
                  </strong>

                  <p>
                    SE-RMS will capture
                    your current position
                    when you check in.
                  </p>
                </div>
              </div>

              {/* =============================================
                  SUBMIT - GREEN
              ============================================= */}

              <button
                type="button"
                className="se-att-pwa-checkin-submit"
                onClick={
                  handleCheckIn
                }
                disabled={
                  Boolean(
                    actionLoading
                  )
                }
              >
                {actionLoading ===
                "CHECK_IN" ? (
                  <>
                    <span className="se-att-pwa-button-loader" />

                    Verifying location...
                  </>
                ) : (
                  <>
                    <span>
                      ↘
                    </span>

                    Check In

                    <i>
                      →
                    </i>
                  </>
                )}
              </button>

              <p className="se-att-pwa-sheet-security">
                Attendance location
                is available only to
                authorised SE-RMS
                management.
              </p>
            </section>
          </div>
        ) : null}

        {/* =================================================
            INITIAL LOADING
        ================================================= */}

        {loading ? (
          <div className="se-att-pwa-loading-overlay">
            <div className="se-att-pwa-loading-card">
              <span />

              <strong>
                Loading attendance
              </strong>

              <small>
                Syncing your workday
              </small>
            </div>
          </div>
        ) : null}
      </main>
    );
  };

export default AttendancePwa;
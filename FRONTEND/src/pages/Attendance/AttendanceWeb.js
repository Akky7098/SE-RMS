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
  getBiometricDeviceStatus,
  getEmployeeAttendanceLocationHistory,
  getLocationTrackingStatus,
  getMyTodayAttendance,
  mobileAttendanceCheckIn,
  mobileAttendanceCheckOut,
} from "../../services/attendanceService";

import AttendanceCalendar from "./components/AttendanceCalendar";
import AttendanceStatusBadge from "./components/AttendanceStatusBadge";
import AttendanceEmployeePanel from "./components/AttendanceEmployeePanel";

import {
  attendanceRoleAccess,
  buildSelectedDayRows,
  checkInTimeOf,
  checkOutTimeOf,
  formatDateLong,
  formatMinutes,
  formatTime,
  getTodayKey,
  initials,
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

import "./AttendanceWeb.css";

/* =========================================================
   EMPLOYEE RESPONSE
========================================================= */

const normalizeEmployees = (
  response
) => {
  if (
    Array.isArray(
      response?.records
    )
  ) {
    return {
      records:
        response.records,

      pagination:
        response.pagination ||
        {},
    };
  }

  const payload =
    response?.data?.data ||
    response?.data ||
    response ||
    {};

  return {
    records:
      payload.records ||
      payload.employees ||
      payload.items ||
      [],

    pagination:
      payload.pagination ||
      {},
  };
};

/* =========================================================
   PERCENTAGE
========================================================= */

const percentage = (
  value,
  total
) => {
  const numerator =
    Number(value);

  const denominator =
    Number(total);

  if (
    !Number.isFinite(
      numerator
    ) ||
    !Number.isFinite(
      denominator
    ) ||
    denominator <= 0
  ) {
    return 0;
  }

  return Math.round(
    (
      numerator /
      denominator
    ) *
      100
  );
};

/* =========================================================
   ATTENDANCE SOURCE
========================================================= */

const normalizeSource = (
  record
) => {
  const source =
    String(
      record?.primarySource ||
        record?.attendanceSource ||
        ""
    ).toUpperCase();

  const mode =
    String(
      record?.workMode ||
        ""
    ).toUpperCase();

  if (
    source.includes(
      "ESSL"
    ) ||
    source.includes(
      "BIOMETRIC"
    )
  ) {
    return "BIOMETRIC";
  }

  if (
    [
      "VISIT",
      "ON_DUTY",
    ].includes(
      mode
    )
  ) {
    return "FIELD";
  }

  if (
    [
      "REMOTE",
      "WORK_FROM_HOME",
    ].includes(
      mode
    )
  ) {
    return "REMOTE";
  }

  if (
    source.includes(
      "MOBILE"
    ) ||
    source.includes(
      "GPS"
    ) ||
    source.includes(
      "FIELD"
    )
  ) {
    return "FIELD";
  }

  if (
    source.includes(
      "OFFICE"
    )
  ) {
    return "OFFICE";
  }

  return (
    source ||
    "OTHER"
  );
};

/* =========================================================
   GPS

   Browser location is collected at punch time.

   IMPORTANT:
   The backend remains responsible for deciding whether a
   coordinate is genuinely inside an office geofence.
========================================================= */

const getBrowserLocation =
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
              "Location is not supported by this browser."
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
              error?.code === 1
            ) {
              message =
                "Location permission is required for web attendance.";
            }

            if (
              error?.code === 2
            ) {
              message =
                "Your current location could not be determined.";
            }

            if (
              error?.code === 3
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
   CURRENT EMPLOYEE ID
========================================================= */

const getCurrentEmployeeId = (
  user
) => {
  if (
    user?.employee &&
    typeof user.employee ===
      "object"
  ) {
    return (
      user.employee._id ||
      user.employee.id ||
      ""
    );
  }

  return (
    user?.employee ||
    ""
  );
};

/* =========================================================
   ATTENDANCE WEB
========================================================= */

const AttendanceWeb =
  () => {
    const navigate =
      useNavigate();

    const {
      user,
    } =
      useAuth();

    /* =====================================================
       ROLE / ACCESS
    ===================================================== */

    const roleAccess =
      useMemo(
        () =>
          attendanceRoleAccess(
            user?.role
          ),
        [
          user?.role,
        ]
      );

    const role =
      roleAccess.role;

    const currentEmployeeId =
      useMemo(
        () =>
          String(
            getCurrentEmployeeId(
              user
            ) ||
              ""
          ),
        [
          user,
        ]
      );

    const canManage =
      roleAccess.isManagement;

    const canViewDevice =
      roleAccess
        .canViewControlCenter;

    const canViewLocation =
      roleAccess
        .canViewLocationHistory;

    /* =====================================================
       AVAILABLE SUBTABS

       EVERYBODY:
       My Attendance

       HEAD / MANAGER:
       My Attendance
       Team Attendance
       Daily Register

       ADMIN / SUPER_ADMIN:
       My Attendance
       Control Center
       Daily Register
       eSSL Device
    ===================================================== */

    const attendanceTabs =
      useMemo(
        () => {
          const tabs = [
            {
              code:
                "MY_ATTENDANCE",

              icon:
                "◉",

              title:
                "My Attendance",

              subtitle:
                "My punches & history",
            },
          ];

          if (
            roleAccess.isHead ||
            roleAccess.isManager
          ) {
            tabs.push({
              code:
                "TEAM_ATTENDANCE",

              icon:
                "👥",

              title:
                "Team Attendance",

              subtitle:
                "Reporting workforce",
            });
          }

          if (
            roleAccess
              .canViewControlCenter
          ) {
            tabs.push({
              code:
                "CONTROL_CENTER",

              icon:
                "▦",

              title:
                "Control Center",

              subtitle:
                "Organisation overview",
            });
          }

          if (
            roleAccess
              .canViewDailyRegister
          ) {
            tabs.push({
              code:
                "REGISTER",

              icon:
                "≡",

              title:
                "Daily Register",

              subtitle:
                roleAccess.canViewAll
                  ? "Organisation records"
                  : "Team records",
            });
          }

          if (
            canViewDevice
          ) {
            tabs.push({
              code:
                "BIOMETRIC",

              icon:
                "◎",

              title:
                "eSSL Device",

              subtitle:
                "Device & sync health",
            });
          }

          return tabs;
        },
        [
          roleAccess,
          canViewDevice,
        ]
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
          getTodayKey(),
        []
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
       ACTIVE SUBTAB

       Always enter through personal attendance first.
    ===================================================== */

    const [
      activeSubTab,
      setActiveSubTab,
    ] =
      useState(
        "MY_ATTENDANCE"
      );

    /* =====================================================
       PERSONAL ATTENDANCE
    ===================================================== */

    const [
      myToday,
      setMyToday,
    ] =
      useState(
        null
      );

    const [
      myMonthAttendance,
      setMyMonthAttendance,
    ] =
      useState([]);

    const [
      trackingStatus,
      setTrackingStatus,
    ] =
      useState(
        null
      );

    const [
      personalLoading,
      setPersonalLoading,
    ] =
      useState(
        true
      );

    const [
      punchLoading,
      setPunchLoading,
    ] =
      useState(
        ""
      );

    const [
      attendanceMode,
      setAttendanceMode,
    ] =
      useState(
        "OFFICE"
      );

    const [
      attendanceRemark,
      setAttendanceRemark,
    ] =
      useState(
        ""
      );

    /* =====================================================
       MANAGEMENT DATA
    ===================================================== */

    const [
      employees,
      setEmployees,
    ] =
      useState([]);

    const [
      attendance,
      setAttendance,
    ] =
      useState([]);

    const [
      biometric,
      setBiometric,
    ] =
      useState(
        null
      );

    /* =====================================================
       UI
    ===================================================== */

    const [
      loading,
      setLoading,
    ] =
      useState(
        false
      );

    const [
      refreshing,
      setRefreshing,
    ] =
      useState(
        false
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
      search,
      setSearch,
    ] =
      useState(
        ""
      );

    const [
      statusFilter,
      setStatusFilter,
    ] =
      useState(
        ""
      );

    const [
      departmentFilter,
      setDepartmentFilter,
    ] =
      useState(
        ""
      );

    const [
      sourceFilter,
      setSourceFilter,
    ] =
      useState(
        ""
      );

    const [
      selectedRow,
      setSelectedRow,
    ] =
      useState(
        null
      );

    const [
      location,
      setLocation,
    ] =
      useState({
        loading:
          false,

        loaded:
          false,

        points:
          [],

        error:
          "",
      });

    /* =====================================================
       PERSONAL TODAY
    ===================================================== */

    const loadMyToday =
      useCallback(
        async (
          silent = false
        ) => {
          try {
            if (
              !silent
            ) {
              setPersonalLoading(
                true
              );
            }

            const [
              attendanceResponse,
              trackingResponse,
            ] =
              await Promise.all([
                getMyTodayAttendance(),

                getLocationTrackingStatus()
                  .catch(
                    () => null
                  ),
              ]);

            setMyToday(
              attendanceResponse ||
                null
            );

            setTrackingStatus(
              trackingResponse ||
                null
            );
          } catch (
            error
          ) {
            setErrorMessage(
              error?.response
                ?.data
                ?.message ||
                error?.message ||
                "Unable to load your attendance."
            );
          } finally {
            setPersonalLoading(
              false
            );
          }
        },
        []
      );

    /* =====================================================
       PERSONAL MONTH HISTORY

       The backend permission layer should already return
       only allowed data.

       For managers/admins we additionally filter their own
       employee ID for the personal calendar.
    ===================================================== */

    const loadMyMonth =
      useCallback(
        async () => {
          try {
            const range =
              monthRange(
                year,
                month
              );

            const response =
              await getAttendanceList({
                from:
                  range.from,

                to:
                  range.to,

                page:
                  1,

                limit:
                  500,
              });

            let records =
              response?.records ||
              [];

            if (
              currentEmployeeId
            ) {
              const ownRecords =
                records.filter(
                  (
                    record
                  ) => {
                    const recordEmployeeId =
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
                      recordEmployeeId ===
                      currentEmployeeId
                    );
                  }
                );

              /*
               * If backend returned populated management
               * records, use own filtered records.
               *
               * For plain employee scope, records already
               * contain only their own attendance.
               */
              if (
                ownRecords.length ||
                roleAccess
                  .isManagement
              ) {
                records =
                  ownRecords;
              }
            }

            setMyMonthAttendance(
              records
            );
          } catch (
            error
          ) {
            console.error(
              "My attendance history failed:",
              error
            );
          }
        },
        [
          year,
          month,
          currentEmployeeId,
          roleAccess
            .isManagement,
        ]
      );

    useEffect(() => {
      loadMyToday();

      loadMyMonth();
    }, [
      loadMyToday,
      loadMyMonth,
    ]);

    /* =====================================================
       PERSONAL STATUS
    ===================================================== */

    const myStatus =
      useMemo(
        () =>
          normalizedStatus(
            myToday,
            todayDate,
            todayDate
          ),
        [
          myToday,
          todayDate,
        ]
      );

    const myCheckIn =
      checkInTimeOf(
        myToday
      );

    const myCheckOut =
      checkOutTimeOf(
        myToday
      );

    const myWorkingMinutes =
      workingMinutesOf(
        myToday
      );

    const hasCheckedIn =
      Boolean(
        myCheckIn
      );

    const hasCheckedOut =
      Boolean(
        myCheckOut
      );

    /* =====================================================
       CHECK IN

       All modes capture location.

       OFFICE:
       Used as web fallback if biometric attendance is
       unavailable/missed.

       Backend should later validate that OFFICE punches are
       genuinely within configured office geofence.
    ===================================================== */

    const handleCheckIn =
      async () => {
        if (
          punchLoading
        ) {
          return;
        }

        try {
          setPunchLoading(
            "CHECK_IN"
          );

          setErrorMessage(
            ""
          );

          setSuccessMessage(
            ""
          );

          const gps =
            await getBrowserLocation();

          const mode =
            String(
              attendanceMode
            ).toUpperCase();

          await mobileAttendanceCheckIn({
            workMode:
              mode,

            attendanceMode:
              mode,

            latitude:
              gps.latitude,

            longitude:
              gps.longitude,

            accuracy:
              gps.accuracy,

            remark:
              attendanceRemark
                .trim(),

            source:
              "WEB",
          });

          setSuccessMessage(
            mode ===
              "OFFICE"
              ? "Office check-in recorded. GPS was captured for verification."
              : `${workModeLabel(
                  mode
                )} check-in recorded successfully.`
          );

          setAttendanceRemark(
            ""
          );

          await Promise.all([
            loadMyToday(
              true
            ),

            loadMyMonth(),
          ]);
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
          setPunchLoading(
            ""
          );
        }
      };

    /* =====================================================
       CHECK OUT
    ===================================================== */

    const handleCheckOut =
      async () => {
        if (
          punchLoading
        ) {
          return;
        }

        try {
          setPunchLoading(
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
              await getBrowserLocation();
          } catch (
            locationError
          ) {
            /*
             * Backend decides whether checkout location
             * is mandatory for this mode.
             */
            console.warn(
              "Checkout location unavailable:",
              locationError
                ?.message
            );
          }

          await mobileAttendanceCheckOut({
            latitude:
              gps.latitude,

            longitude:
              gps.longitude,

            accuracy:
              gps.accuracy,

            source:
              "WEB",
          });

          setSuccessMessage(
            "Check-out recorded successfully."
          );

          await Promise.all([
            loadMyToday(
              true
            ),

            loadMyMonth(),
          ]);
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
          setPunchLoading(
            ""
          );
        }
      };

    /* =====================================================
       MANUAL LOCATION CHECKPOINT
    ===================================================== */

    const handleLocationCheckpoint =
      async () => {
        if (
          punchLoading
        ) {
          return;
        }

        try {
          setPunchLoading(
            "LOCATION"
          );

          const gps =
            await getBrowserLocation();

          await createAttendanceLocationCheckpoint({
            latitude:
              gps.latitude,

            longitude:
              gps.longitude,

            accuracy:
              gps.accuracy,

            source:
              "manual_refresh",
          });

          setSuccessMessage(
            "Current work location updated."
          );
        } catch (
          error
        ) {
          setErrorMessage(
            error?.response
              ?.data
              ?.message ||
              error?.message ||
              "Unable to update location."
          );
        } finally {
          setPunchLoading(
            ""
          );
        }
      };

    /* =====================================================
       MY MONTH CALENDAR
    ===================================================== */

    const myDaySummary =
      useMemo(
        () => {
          const result =
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
            const dateKey =
              `${year}-${pad2(
                month + 1
              )}-${pad2(
                day
              )}`;

            const record =
              myMonthAttendance.find(
                (
                  item
                ) =>
                  toDateKey(
                    item
                      ?.attendanceDate
                  ) ===
                  dateKey
              ) ||
              null;

            const status =
              normalizedStatus(
                record,
                dateKey,
                todayDate
              );

            const syntheticRow = {
              status,
            };

            result[
              dateKey
            ] =
              summarizeRows([
                syntheticRow,
              ]);
          }

          return result;
        },
        [
          year,
          month,
          myMonthAttendance,
          todayDate,
        ]
      );

    const selectedMyAttendance =
      useMemo(
        () => {
          if (
            selectedDate ===
            todayDate
          ) {
            return myToday;
          }

          return (
            myMonthAttendance.find(
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
          selectedDate,
          todayDate,
          myToday,
          myMonthAttendance,
        ]
      );

    const selectedMyStatus =
      useMemo(
        () =>
          normalizedStatus(
            selectedMyAttendance,
            selectedDate,
            todayDate
          ),
        [
          selectedMyAttendance,
          selectedDate,
          todayDate,
        ]
      );

    /* =====================================================
       LOAD MANAGEMENT EMPLOYEES
    ===================================================== */

    const loadAllEmployees =
      useCallback(
        async () => {
          if (
            !canManage
          ) {
            return [];
          }

          const output =
            [];

          let page =
            1;

          let totalPages =
            1;

          do {
            const response =
              await getEmployees({
                page,

                limit:
                  100,

                status:
                  "ACTIVE",
              });

            const normalized =
              normalizeEmployees(
                response
              );

            output.push(
              ...normalized.records
            );

            totalPages =
              Number(
                normalized
                  ?.pagination
                  ?.pages ||
                  1
              );

            page += 1;
          } while (
            page <=
              totalPages &&
            page <= 25
          );

          return output;
        },
        [
          canManage,
        ]
      );

    /* =====================================================
       LOAD MANAGEMENT MONTH

       Permission middleware/service remains responsible for
       actual ALL / DEPARTMENT / TEAM scope.

       Frontend does not attempt to recreate security rules.
    ===================================================== */

    const loadManagementMonth =
      useCallback(
        async (
          silent = false
        ) => {
          if (
            !canManage
          ) {
            return;
          }

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
              employeeRecords,
              firstPage,
            ] =
              await Promise.all([
                loadAllEmployees(),

                getAttendanceList({
                  from:
                    range.from,

                  to:
                    range.to,

                  page:
                    1,

                  limit:
                    100,

                  scope:
                    activeSubTab ===
                    "TEAM_ATTENDANCE"
                      ? "TEAM"
                      : undefined,
                }),
              ]);

            let records = [
              ...(
                firstPage
                  ?.records ||
                []
              ),
            ];

            const totalPages =
              Number(
                firstPage
                  ?.pagination
                  ?.pages ||
                  1
              );

            for (
              let page = 2;
              page <=
              totalPages;
              page += 1
            ) {
              const response =
                await getAttendanceList({
                  from:
                    range.from,

                  to:
                    range.to,

                  page,

                  limit:
                    100,

                  scope:
                    activeSubTab ===
                    "TEAM_ATTENDANCE"
                      ? "TEAM"
                      : undefined,
                });

              records.push(
                ...(
                  response
                    ?.records ||
                  []
                )
              );
            }

            setEmployees(
              employeeRecords
            );

            setAttendance(
              records
            );
          } catch (
            error
          ) {
            setErrorMessage(
              error?.response
                ?.data
                ?.message ||
                error?.message ||
                "Unable to load workforce attendance."
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
          canManage,
          loadAllEmployees,
          activeSubTab,
        ]
      );

    useEffect(() => {
      if (
        [
          "TEAM_ATTENDANCE",
          "CONTROL_CENTER",
          "REGISTER",
        ].includes(
          activeSubTab
        )
      ) {
        loadManagementMonth();
      }
    }, [
      activeSubTab,
      loadManagementMonth,
    ]);

    /* =====================================================
       BIOMETRIC
    ===================================================== */

    const loadBiometric =
      useCallback(
        async () => {
          if (
            !canViewDevice
          ) {
            return;
          }

          try {
            const response =
              await getBiometricDeviceStatus();

            setBiometric(
              response ||
                null
            );
          } catch (
            error
          ) {
            setBiometric(
              null
            );
          }
        },
        [
          canViewDevice,
        ]
      );

    useEffect(() => {
      loadBiometric();
    }, [
      loadBiometric,
    ]);

    /* =====================================================
       MANAGEMENT ROWS
    ===================================================== */

    const rows =
      useMemo(
        () =>
          buildSelectedDayRows(
            employees,
            attendance,
            selectedDate,
            todayDate
          ),
        [
          employees,
          attendance,
          selectedDate,
          todayDate,
        ]
      );

    const summary =
      useMemo(
        () =>
          summarizeRows(
            rows
          ),
        [
          rows,
        ]
      );

    /* =====================================================
       MANAGEMENT KPIs
    ===================================================== */

    const managementMetrics =
      useMemo(
        () => {
          const total =
            summary.total ||
            0;

          const working =
            summary
              .attendanceCount ||
            (
              summary.present ||
              0
            ) +
              (
                summary.remote ||
                0
              ) +
              (
                summary.visit ||
                0
              ) +
              (
                summary.onDuty ||
                0
              ) +
              (
                summary.late ||
                0
              ) +
              (
                summary.short ||
                0
              );

          return {
            total,

            working,

            attendanceRate:
              percentage(
                working,
                total
              ),

            exceptions:
              summary
                .exceptions ||
              0,

            field:
              summary.field ||
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

            leave:
              summary.leave ||
              0,

            absent:
              summary.absent ||
              0,

            pending:
              summary
                .notCheckedIn ||
              0,
          };
        },
        [
          summary,
        ]
      );

    /* =====================================================
       DEPARTMENT / ORG UNIT PERFORMANCE
    ===================================================== */

    const departmentStats =
      useMemo(
        () => {
          const map =
            new Map();

          rows.forEach(
            (
              row
            ) => {
              const department =
                row.department ||
                row.orgUnitCode ||
                "Not Assigned";

              if (
                !map.has(
                  department
                )
              ) {
                map.set(
                  department,
                  {
                    department,

                    total:
                      0,

                    working:
                      0,

                    absent:
                      0,

                    exceptions:
                      0,
                  }
                );
              }

              const entry =
                map.get(
                  department
                );

              entry.total +=
                1;

              if (
                [
                  "PRESENT",
                  "REMOTE",
                  "VISIT",
                  "ON_DUTY",
                  "LATE",
                  "SHORT",
                  "REGULARIZED",
                ].includes(
                  row.status
                )
              ) {
                entry.working +=
                  1;
              }

              if (
                row.status ===
                "ABSENT"
              ) {
                entry.absent +=
                  1;
              }

              if (
                [
                  "ABSENT",
                  "LATE",
                  "SHORT",
                  "MISSING",
                  "REGULARIZATION_PENDING",
                ].includes(
                  row.status
                )
              ) {
                entry.exceptions +=
                  1;
              }
            }
          );

          return [
            ...map.values(),
          ]
            .map(
              (
                item
              ) => ({
                ...item,

                rate:
                  percentage(
                    item.working,
                    item.total
                  ),
              })
            )
            .sort(
              (
                first,
                second
              ) =>
                second.rate -
                first.rate
            );
        },
        [
          rows,
        ]
      );

    /* =====================================================
       SOURCES
    ===================================================== */

    const sourceStats =
      useMemo(
        () => {
          const result = {
            biometric:
              0,

            office:
              0,

            field:
              0,

            remote:
              0,

            other:
              0,
          };

          rows.forEach(
            (
              row
            ) => {
              if (
                !row.attendance
              ) {
                return;
              }

              const source =
                normalizeSource(
                  row.attendance
                );

              if (
                source ===
                "BIOMETRIC"
              ) {
                result.biometric +=
                  1;

                return;
              }

              if (
                source ===
                "OFFICE"
              ) {
                result.office +=
                  1;

                return;
              }

              if (
                source ===
                "FIELD"
              ) {
                result.field +=
                  1;

                return;
              }

              if (
                source ===
                "REMOTE"
              ) {
                result.remote +=
                  1;

                return;
              }

              result.other +=
                1;
            }
          );

          return result;
        },
        [
          rows,
        ]
      );

    const sourceTotal =
      sourceStats.biometric +
      sourceStats.office +
      sourceStats.field +
      sourceStats.remote +
      sourceStats.other;

    /* =====================================================
       DAY SUMMARY
    ===================================================== */

    const daySummary =
      useMemo(
        () => {
          const result =
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
            const dateKey =
              `${year}-${pad2(
                month + 1
              )}-${pad2(
                day
              )}`;

            result[
              dateKey
            ] =
              summarizeRows(
                buildSelectedDayRows(
                  employees,
                  attendance,
                  dateKey,
                  todayDate
                )
              );
          }

          return result;
        },
        [
          year,
          month,
          employees,
          attendance,
          todayDate,
        ]
      );

    /* =====================================================
       TREND
    ===================================================== */

    const trendData =
      useMemo(
        () =>
          Object.entries(
            daySummary
          )
            .filter(
              (
                [
                  dateKey,
                ]
              ) =>
                dateKey <=
                todayDate
            )
            .map(
              ([
                dateKey,
                value,
              ]) => ({
                date:
                  dateKey,

                rate:
                  value
                    ?.attendanceRate ||
                  percentage(
                    value
                      ?.attendanceCount ||
                      0,
                    value.total ||
                      0
                  ),
              })
            ),
        [
          daySummary,
          todayDate,
        ]
      );

    const trendPoints =
      useMemo(
        () => {
          if (
            !trendData.length
          ) {
            return "";
          }

          const width =
            600;

          const height =
            120;

          const denominator =
            Math.max(
              trendData.length -
                1,
              1
            );

          return trendData
            .map(
              (
                item,
                index
              ) => {
                const x =
                  (
                    index /
                    denominator
                  ) *
                  width;

                const y =
                  height -
                  (
                    item.rate /
                    100
                  ) *
                    height;

                return `${x},${y}`;
              }
            )
            .join(" ");
        },
        [
          trendData,
        ]
      );

    /* =====================================================
       FILTERS
    ===================================================== */

    const departments =
      useMemo(
        () =>
          [
            ...new Set(
              rows
                .map(
                  (
                    item
                  ) =>
                    item.department ||
                    item.orgUnitCode
                )
                .filter(
                  Boolean
                )
            ),
          ].sort(
            (
              first,
              second
            ) =>
              first.localeCompare(
                second
              )
          ),
        [
          rows,
        ]
      );

    const filteredRows =
      useMemo(
        () => {
          const needle =
            search
              .trim()
              .toLowerCase();

          return rows.filter(
            (
              row
            ) => {
              if (
                needle
              ) {
                const searchValue =
                  [
                    row.name,
                    row.email,
                    row.employeeCode,
                    row.department,
                    row.orgUnitCode,
                    row.designation,
                  ]
                    .join(" ")
                    .toLowerCase();

                if (
                  !searchValue.includes(
                    needle
                  )
                ) {
                  return false;
                }
              }

              if (
                statusFilter &&
                row.status !==
                  statusFilter
              ) {
                return false;
              }

              if (
                departmentFilter &&
                (
                  row.department ||
                  row.orgUnitCode
                ) !==
                  departmentFilter
              ) {
                return false;
              }

              if (
                sourceFilter
              ) {
                const source =
                  normalizeSource(
                    row.attendance
                  );

                if (
                  source !==
                  sourceFilter
                ) {
                  return false;
                }
              }

              return true;
            }
          );
        },
        [
          rows,
          search,
          statusFilter,
          departmentFilter,
          sourceFilter,
        ]
      );

    /* =====================================================
       MONTH
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

        const nextDate =
          `${nextYear}-${pad2(
            nextMonth + 1
          )}-01`;

        setSelectedDate(
          nextDate >
            todayDate
            ? todayDate
            : nextDate
        );

        setSearch(
          ""
        );

        setStatusFilter(
          ""
        );

        setDepartmentFilter(
          ""
        );

        setSourceFilter(
          ""
        );
      };

    const goToToday =
      () => {
        setYear(
          now.getFullYear()
        );

        setMonth(
          now.getMonth()
        );

        setSelectedDate(
          todayDate
        );
      };

    /* =====================================================
       EMPLOYEE PANEL
    ===================================================== */

    const openEmployee =
      (
        row
      ) => {
        setSelectedRow(
          row
        );

        setLocation({
          loading:
            false,

          loaded:
            false,

          points:
            [],

          error:
            "",
        });
      };

    const loadLocationHistory =
      async () => {
        if (
          !selectedRow
            ?.employeeId
        ) {
          return;
        }

        try {
          setLocation({
            loading:
              true,

            loaded:
              false,

            points:
              [],

            error:
              "",
          });

          const response =
            await getEmployeeAttendanceLocationHistory(
              selectedRow
                .employeeId,

              {
                date:
                  selectedDate,
              }
            );

          const points =
            Array.isArray(
              response
            )
              ? response
              : response
                  ?.history ||
                response
                  ?.checkpoints ||
                response
                  ?.records ||
                [];

          setLocation({
            loading:
              false,

            loaded:
              true,

            points,

            error:
              "",
          });
        } catch (
          error
        ) {
          setLocation({
            loading:
              false,

            loaded:
              false,

            points:
              [],

            error:
              error?.response
                ?.data
                ?.message ||
              error?.message ||
              "Unable to load location history.",
          });
        }
      };

    const clearFilters =
      () => {
        setSearch(
          ""
        );

        setStatusFilter(
          ""
        );

        setDepartmentFilter(
          ""
        );

        setSourceFilter(
          ""
        );
      };

    const hasFilters =
      Boolean(
        search ||
        statusFilter ||
        departmentFilter ||
        sourceFilter
      );

    /* =====================================================
       RENDER
    ===================================================== */

    return (
      <main className="se-att-web-page">
        {/* =================================================
            TOP
        ================================================= */}

        <header className="se-att-web-top">
          <div className="se-att-web-brand">
            <button
              type="button"
              className="se-att-web-back"
              onClick={() =>
                navigate(
                  "/dashboard?app=people"
                )
              }
            >
              ←
            </button>

            <img
              src="/se-logo.png"
              alt="Sandeep Edgetech"
            />

            <div className="se-att-web-title">
              <span>
                PEOPLE
              </span>

              <strong>
                Attendance
              </strong>
            </div>
          </div>

          <div className="se-att-web-top-actions">
            <div className="se-att-web-current-date">
              <span>
                SELECTED DATE
              </span>

              <strong>
                {formatDateLong(
                  selectedDate
                )}
              </strong>
            </div>

            <button
              type="button"
              className="se-att-web-today-btn"
              onClick={
                goToToday
              }
            >
              Today
            </button>

            <button
              type="button"
              className="se-att-web-refresh-btn"
              onClick={() => {
                if (
                  activeSubTab ===
                  "MY_ATTENDANCE"
                ) {
                  loadMyToday();

                  loadMyMonth();

                  return;
                }

                loadManagementMonth(
                  true
                );

                loadBiometric();
              }}
              disabled={
                refreshing ||
                personalLoading
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

              Refresh
            </button>

            <div className="se-att-web-user-chip">
              <span>
                {initials(
                  user?.displayName ||
                    "User"
                )}
              </span>

              <div>
                <strong>
                  {user?.displayName ||
                    "User"}
                </strong>

                <small>
                  {role.replaceAll(
                    "_",
                    " "
                  )}
                </small>
              </div>
            </div>
          </div>
        </header>

        {/* =================================================
            ROLE-AWARE SUB TABS
        ================================================= */}

        <nav className="se-att-web-subtabs">
          {attendanceTabs.map(
            (
              tab
            ) => (
              <button
                type="button"
                key={
                  tab.code
                }
                className={
                  activeSubTab ===
                  tab.code
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveSubTab(
                    tab.code
                  )
                }
              >
                <span className="se-att-web-subtab-icon">
                  {
                    tab.icon
                  }
                </span>

                <span>
                  <strong>
                    {
                      tab.title
                    }
                  </strong>

                  <small>
                    {
                      tab.subtitle
                    }
                  </small>
                </span>

                {tab.code ===
                  "BIOMETRIC" ? (
                  <i
                    className={
                      biometric
                        ?.isOnline
                        ? "online"
                        : ""
                    }
                  />
                ) : null}
              </button>
            )
          )}
        </nav>

        <section className="se-att-web-content">
          {/* =================================================
              MESSAGES
          ================================================= */}

          {errorMessage ? (
            <div className="se-att-web-error">
              <span>
                !
              </span>

              <div>
                <strong>
                  Attendance notice
                </strong>

                <p>
                  {errorMessage}
                </p>
              </div>

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

          {successMessage ? (
            <div className="se-att-web-success">
              <span>
                ✓
              </span>

              <div>
                <strong>
                  Attendance updated
                </strong>

                <p>
                  {successMessage}
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
              MY ATTENDANCE

              AVAILABLE TO EVERY ROLE
          ================================================= */}

          {activeSubTab ===
          "MY_ATTENDANCE" ? (
            <section className="se-att-web-my-page">
              {/* HERO */}

              <section className="se-att-web-command-hero se-att-web-my-hero">
                <div className="se-att-web-command-copy">
                  <div className="se-att-web-command-label">
                    <span>
                      MY ATTENDANCE
                    </span>

                    <i>
                      {statusLabel(
                        myStatus
                      )}
                    </i>
                  </div>

                  <h1>
                    Your working day,
                    in one view.
                  </h1>

                  <p>
                    Office biometric,
                    web fallback,
                    customer visits,
                    on-duty and remote
                    attendance are
                    consolidated into
                    one daily record.
                  </p>

                  <div className="se-att-web-command-meta">
                    <div>
                      <span>
                        CHECK IN
                      </span>

                      <strong>
                        {formatTime(
                          myCheckIn
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        CHECK OUT
                      </span>

                      <strong>
                        {formatTime(
                          myCheckOut
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        WORKING
                      </span>

                      <strong>
                        {formatMinutes(
                          myWorkingMinutes
                        )}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="se-att-web-rate-card se-att-web-personal-status-card">
                  <div className="se-att-web-my-status-icon">
                    {hasCheckedOut
                      ? "✓"
                      : hasCheckedIn
                        ? "◉"
                        : "○"}
                  </div>

                  <div className="se-att-web-rate-copy">
                    <span>
                      TODAY
                    </span>

                    <strong>
                      {statusLabel(
                        myStatus
                      )}
                    </strong>

                    <small>
                      {trackingStatus
                        ?.active
                        ? "Location tracking active"
                        : "Attendance ready"}
                    </small>
                  </div>
                </div>
              </section>

              {/* PUNCH ACTION */}

              <section className="se-att-web-punch-card">
                <div className="se-att-web-punch-heading">
                  <div>
                    <span>
                      ATTENDANCE ACTION
                    </span>

                    <h2>
                      {hasCheckedOut
                        ? "Today's attendance is complete"
                        : hasCheckedIn
                          ? "Attendance is active"
                          : "Start your working day"}
                    </h2>

                    <p>
                      {hasCheckedIn
                        ? "Your check-in has been recorded. Check out when your working day is complete."
                        : "Choose how you are working today. Office web punch is available as a fallback when the biometric punch is unavailable or missed."}
                    </p>
                  </div>

                  <span className="se-att-web-essl-note">
                    ◎ eSSL +
                    SE-RMS
                  </span>
                </div>

                {!hasCheckedIn ? (
                  <div className="se-att-web-punch-form">
                    <label>
                      <span>
                        CHECK-IN TYPE
                      </span>

                      <select
                        value={
                          attendanceMode
                        }
                        onChange={(
                          event
                        ) =>
                          setAttendanceMode(
                            event
                              .target
                              .value
                          )
                        }
                      >
                        <option value="OFFICE">
                          Office / Biometric Fallback
                        </option>

                        <option value="VISIT">
                          Customer Visit
                        </option>

                        <option value="ON_DUTY">
                          On Duty
                        </option>

                        <option value="REMOTE">
                          Remote Work
                        </option>
                      </select>
                    </label>

                    <label className="se-att-web-punch-remark">
                      <span>
                        NOTE
                      </span>

                      <input
                        type="text"
                        value={
                          attendanceRemark
                        }
                        placeholder={
                          attendanceMode ===
                          "VISIT"
                            ? "Customer / visit details"
                            : attendanceMode ===
                                "ON_DUTY"
                              ? "Duty / work location"
                              : attendanceMode ===
                                  "REMOTE"
                                ? "Remote work note"
                                : "Reason for office web punch, if required"
                        }
                        onChange={(
                          event
                        ) =>
                          setAttendanceRemark(
                            event
                              .target
                              .value
                          )
                        }
                      />
                    </label>

                    <button
                      type="button"
                      className="se-att-web-checkin-button"
                      disabled={
                        Boolean(
                          punchLoading
                        )
                      }
                      onClick={
                        handleCheckIn
                      }
                    >
                      {punchLoading ===
                      "CHECK_IN"
                        ? "Getting Location..."
                        : "Check In"}
                    </button>
                  </div>
                ) : !hasCheckedOut ? (
                  <div className="se-att-web-active-session">
                    <div className="se-att-web-active-session-status">
                      <span />

                      <div>
                        <strong>
                          Checked in at{" "}
                          {formatTime(
                            myCheckIn
                          )}
                        </strong>

                        <small>
                          {workModeLabel(
                            normalizedWorkMode(
                              myToday
                            )
                          )}
                          {" · "}
                          {formatMinutes(
                            myWorkingMinutes
                          )}
                        </small>
                      </div>
                    </div>

                    <div className="se-att-web-active-session-actions">
                      {[
                        "VISIT",
                        "ON_DUTY",
                        "REMOTE",
                        "WORK_FROM_HOME",
                      ].includes(
                        normalizedWorkMode(
                          myToday
                        )
                      ) ? (
                        <button
                          type="button"
                          className="secondary"
                          disabled={
                            Boolean(
                              punchLoading
                            )
                          }
                          onClick={
                            handleLocationCheckpoint
                          }
                        >
                          {punchLoading ===
                          "LOCATION"
                            ? "Updating..."
                            : "⌖ Update Location"}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="danger"
                        disabled={
                          Boolean(
                            punchLoading
                          )
                        }
                        onClick={
                          handleCheckOut
                        }
                      >
                        {punchLoading ===
                        "CHECK_OUT"
                          ? "Checking Out..."
                          : "Check Out"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="se-att-web-completed-session">
                    <span>
                      ✓
                    </span>

                    <div>
                      <strong>
                        Attendance
                        completed
                      </strong>

                      <p>
                        {formatTime(
                          myCheckIn
                        )}
                        {" — "}
                        {formatTime(
                          myCheckOut
                        )}
                        {" · "}
                        {formatMinutes(
                          myWorkingMinutes
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {!hasCheckedIn ? (
                  <div className="se-att-web-mode-guidance">
                    <article
                      className={
                        attendanceMode ===
                        "OFFICE"
                          ? "active"
                          : ""
                      }
                    >
                      <strong>
                        Office
                      </strong>

                      <span>
                        Use biometric normally.
                        Web punch is fallback.
                      </span>
                    </article>

                    <article
                      className={
                        attendanceMode ===
                        "VISIT"
                          ? "active"
                          : ""
                      }
                    >
                      <strong>
                        Visit
                      </strong>

                      <span>
                        Customer visit with
                        GPS attendance.
                      </span>
                    </article>

                    <article
                      className={
                        attendanceMode ===
                        "ON_DUTY"
                          ? "active"
                          : ""
                      }
                    >
                      <strong>
                        On Duty
                      </strong>

                      <span>
                        Official work away
                        from office.
                      </span>
                    </article>

                    <article
                      className={
                        attendanceMode ===
                        "REMOTE"
                          ? "active"
                          : ""
                      }
                    >
                      <strong>
                        Remote
                      </strong>

                      <span>
                        Approved remote
                        working day.
                      </span>
                    </article>
                  </div>
                ) : null}
              </section>

              {/* PERSONAL CALENDAR */}

              <section className="se-att-web-overview-grid">
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
                    myDaySummary
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

                <article className="se-att-web-personal-day-card">
                  <div className="se-att-web-insight-head">
                    <div>
                      <span>
                        SELECTED DAY
                      </span>

                      <h3>
                        {formatDateLong(
                          selectedDate
                        )}
                      </h3>

                      <p>
                        Your recorded attendance
                        for this date.
                      </p>
                    </div>

                    <AttendanceStatusBadge
                      status={
                        selectedMyStatus
                      }
                    />
                  </div>

                  <div className="se-att-web-personal-day-grid">
                    <div>
                      <span>
                        CHECK IN
                      </span>

                      <strong>
                        {formatTime(
                          checkInTimeOf(
                            selectedMyAttendance
                          )
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        CHECK OUT
                      </span>

                      <strong>
                        {formatTime(
                          checkOutTimeOf(
                            selectedMyAttendance
                          )
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        WORKING
                      </span>

                      <strong>
                        {formatMinutes(
                          workingMinutesOf(
                            selectedMyAttendance
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
                          normalizedWorkMode(
                            selectedMyAttendance
                          )
                        )}
                      </strong>
                    </div>
                  </div>
                </article>
              </section>
            </section>
          ) : null}

          {/* =================================================
              TEAM / CONTROL CENTER

              SAME PREMIUM MANAGEMENT UI.
              Scope differs via backend permissions.
          ================================================= */}

          {[
            "TEAM_ATTENDANCE",
            "CONTROL_CENTER",
          ].includes(
            activeSubTab
          ) ? (
            <>
              <section className="se-att-web-command-hero">
                <div className="se-att-web-command-copy">
                  <div className="se-att-web-command-label">
                    <span>
                      {activeSubTab ===
                      "TEAM_ATTENDANCE"
                        ? "TEAM ATTENDANCE"
                        : "ATTENDANCE INTELLIGENCE"}
                    </span>

                    <i>
                      LIVE VIEW
                    </i>
                  </div>

                  <h1>
                    {activeSubTab ===
                    "TEAM_ATTENDANCE"
                      ? "Your team's attendance, without the noise."
                      : "Workforce status at a glance."}
                  </h1>

                  <p>
                    {activeSubTab ===
                    "TEAM_ATTENDANCE"
                      ? "Monitor attendance across your reporting scope while keeping your own attendance separate."
                      : "One management view for biometric, office, field and remote attendance across your permitted organisation."}
                  </p>

                  <div className="se-att-web-command-meta">
                    <div>
                      <span>
                        DATE
                      </span>

                      <strong>
                        {formatDateLong(
                          selectedDate
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        WORKFORCE
                      </span>

                      <strong>
                        {
                          managementMetrics.total
                        }{" "}
                        employees
                      </strong>
                    </div>

                    <div>
                      <span>
                        DATA SCOPE
                      </span>

                      <strong>
                        {activeSubTab ===
                        "TEAM_ATTENDANCE"
                          ? "Reporting Team"
                          : "Organisation"}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="se-att-web-rate-card">
                  <div
                    className="se-att-web-rate-ring"
                    style={{
                      "--attendance-rate":
                        `${managementMetrics.attendanceRate}%`,
                    }}
                  >
                    <div>
                      <strong>
                        {
                          managementMetrics.attendanceRate
                        }
                        %
                      </strong>

                      <span>
                        Attendance
                      </span>
                    </div>
                  </div>

                  <div className="se-att-web-rate-copy">
                    <span>
                      DAY HEALTH
                    </span>

                    <strong>
                      {managementMetrics.attendanceRate >=
                      95
                        ? "Excellent"
                        : managementMetrics.attendanceRate >=
                            85
                          ? "Healthy"
                          : "Needs Attention"}
                    </strong>

                    <small>
                      {
                        managementMetrics.working
                      }{" "}
                      active
                    </small>
                  </div>
                </div>
              </section>

              {/* KPIs */}

              <section className="se-att-web-kpi-grid">
                <article className="se-att-web-kpi-card workforce">
                  <div className="se-att-web-kpi-icon">
                    👥
                  </div>

                  <div>
                    <span>
                      WORKFORCE
                    </span>

                    <strong>
                      {
                        managementMetrics.total
                      }
                    </strong>

                    <small>
                      Employees in scope
                    </small>
                  </div>
                </article>

                <article className="se-att-web-kpi-card present">
                  <div className="se-att-web-kpi-icon">
                    ✓
                  </div>

                  <div>
                    <span>
                      ACTIVE TODAY
                    </span>

                    <strong>
                      {
                        managementMetrics.working
                      }
                    </strong>

                    <small>
                      {
                        managementMetrics.attendanceRate
                      }
                      % attendance
                    </small>
                  </div>
                </article>

                <article className="se-att-web-kpi-card absent">
                  <div className="se-att-web-kpi-icon">
                    !
                  </div>

                  <div>
                    <span>
                      ABSENT
                    </span>

                    <strong>
                      {
                        managementMetrics.absent
                      }
                    </strong>

                    <small>
                      Requires review
                    </small>
                  </div>
                </article>

                <article className="se-att-web-kpi-card field">
                  <div className="se-att-web-kpi-icon">
                    ⌖
                  </div>

                  <div>
                    <span>
                      FIELD WORK
                    </span>

                    <strong>
                      {
                        managementMetrics.field
                      }
                    </strong>

                    <small>
                      Visit / On Duty
                    </small>
                  </div>
                </article>

                <article className="se-att-web-kpi-card remote">
                  <div className="se-att-web-kpi-icon">
                    ⌂
                  </div>

                  <div>
                    <span>
                      REMOTE
                    </span>

                    <strong>
                      {
                        managementMetrics.remote
                      }
                    </strong>

                    <small>
                      Remote work
                    </small>
                  </div>
                </article>

                <article className="se-att-web-kpi-card exception">
                  <div className="se-att-web-kpi-icon">
                    ◷
                  </div>

                  <div>
                    <span>
                      EXCEPTIONS
                    </span>

                    <strong>
                      {
                        managementMetrics.exceptions
                      }
                    </strong>

                    <small>
                      Late / short / missing
                    </small>
                  </div>
                </article>
              </section>

              {/* TREND / EXCEPTION / SOURCE */}

              <section className="se-att-web-intelligence-grid">
                <article className="se-att-web-insight-card se-att-web-trend-card">
                  <div className="se-att-web-insight-head">
                    <div>
                      <span>
                        MONTH TREND
                      </span>

                      <h3>
                        Attendance Rate
                      </h3>

                      <p>
                        Daily attendance
                        health this month.
                      </p>
                    </div>

                    <strong>
                      {
                        managementMetrics.attendanceRate
                      }
                      %
                    </strong>
                  </div>

                  <div className="se-att-web-trend-chart">
                    {trendPoints ? (
                      <svg
                        viewBox="0 0 600 120"
                        preserveAspectRatio="none"
                      >
                        <line
                          x1="0"
                          y1="30"
                          x2="600"
                          y2="30"
                          className="grid-line"
                        />

                        <line
                          x1="0"
                          y1="60"
                          x2="600"
                          y2="60"
                          className="grid-line"
                        />

                        <line
                          x1="0"
                          y1="90"
                          x2="600"
                          y2="90"
                          className="grid-line"
                        />

                        <polyline
                          points={
                            trendPoints
                          }
                          className="trend-line"
                        />
                      </svg>
                    ) : (
                      <div className="se-att-web-no-insight">
                        No attendance
                        trend available.
                      </div>
                    )}
                  </div>
                </article>

                <article className="se-att-web-insight-card">
                  <div className="se-att-web-insight-head">
                    <div>
                      <span>
                        EXCEPTIONS
                      </span>

                      <h3>
                        Needs Attention
                      </h3>

                      <p>
                        Attendance requiring
                        review.
                      </p>
                    </div>

                    <strong className="warning">
                      {
                        managementMetrics.exceptions
                      }
                    </strong>
                  </div>

                  <div className="se-att-web-exception-list">
                    {[
                      [
                        "ABSENT",
                        "Absent",
                        summary.absent ||
                          0,
                      ],

                      [
                        "LATE",
                        "Late Arrival",
                        summary.late ||
                          0,
                      ],

                      [
                        "SHORT",
                        "Short Hours",
                        summary.short ||
                          0,
                      ],

                      [
                        "MISSING",
                        "Missing Punch",
                        summary.missing ||
                          0,
                      ],
                    ].map(
                      ([
                        code,
                        label,
                        value,
                      ]) => (
                        <button
                          type="button"
                          key={
                            code
                          }
                          onClick={() => {
                            setStatusFilter(
                              code
                            );

                            setActiveSubTab(
                              "REGISTER"
                            );
                          }}
                        >
                          <span className="warning">
                            !
                          </span>

                          <div>
                            <strong>
                              {
                                label
                              }
                            </strong>

                            <small>
                              Review attendance
                            </small>
                          </div>

                          <b>
                            {
                              value
                            }
                          </b>
                        </button>
                      )
                    )}
                  </div>
                </article>

                <article className="se-att-web-insight-card">
                  <div className="se-att-web-insight-head">
                    <div>
                      <span>
                        ATTENDANCE SOURCE
                      </span>

                      <h3>
                        Source Mix
                      </h3>

                      <p>
                        How attendance was
                        recorded.
                      </p>
                    </div>

                    <strong>
                      {
                        sourceTotal
                      }
                    </strong>
                  </div>

                  <div className="se-att-web-source-list">
                    {[
                      [
                        "Biometric",
                        sourceStats
                          .biometric,
                      ],

                      [
                        "Office Web",
                        sourceStats
                          .office,
                      ],

                      [
                        "Field",
                        sourceStats
                          .field,
                      ],

                      [
                        "Remote",
                        sourceStats
                          .remote,
                      ],
                    ].map(
                      ([
                        label,
                        value,
                      ]) => (
                        <div
                          key={
                            label
                          }
                        >
                          <header>
                            <span>
                              {
                                label
                              }
                            </span>

                            <strong>
                              {
                                value
                              }
                            </strong>
                          </header>

                          <div>
                            <span
                              style={{
                                width:
                                  `${percentage(
                                    value,
                                    sourceTotal
                                  )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </article>
              </section>

              {/* CALENDAR + UNIT */}

              <section className="se-att-web-overview-grid">
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

                <article className="se-att-web-department-card">
                  <div className="se-att-web-department-head">
                    <div>
                      <span>
                        ORGANISATION PULSE
                      </span>

                      <h3>
                        Attendance by Unit
                      </h3>

                      <p>
                        Compare workforce
                        availability across
                        your scope.
                      </p>
                    </div>

                    <span className="se-att-web-pulse-icon">
                      ≋
                    </span>
                  </div>

                  <div className="se-att-web-department-list">
                    {departmentStats
                      .slice(
                        0,
                        8
                      )
                      .map(
                        (
                          item
                        ) => (
                          <button
                            type="button"
                            key={
                              item.department
                            }
                            onClick={() => {
                              setDepartmentFilter(
                                item.department
                              );

                              setActiveSubTab(
                                "REGISTER"
                              );
                            }}
                          >
                            <div className="se-att-web-department-row">
                              <span>
                                {
                                  item.department
                                }
                              </span>

                              <strong>
                                {
                                  item.rate
                                }
                                %
                              </strong>
                            </div>

                            <div className="se-att-web-department-bar">
                              <span
                                style={{
                                  width:
                                    `${item.rate}%`,
                                }}
                              />
                            </div>

                            <small>
                              {
                                item.working
                              }{" "}
                              active ·{" "}
                              {
                                item.absent
                              }{" "}
                              absent
                            </small>
                          </button>
                        )
                      )}
                  </div>
                </article>
              </section>
            </>
          ) : null}

          {/* =================================================
              DAILY REGISTER
          ================================================= */}

          {activeSubTab ===
          "REGISTER" ? (
            <section className="se-att-web-register-page">
              <div className="se-att-web-register-page-head">
                <div>
                  <span>
                    DAILY REGISTER
                  </span>

                  <h1>
                    {formatDateLong(
                      selectedDate
                    )}
                  </h1>

                  <p>
                    {rows.length} employees
                    available in your
                    permitted attendance scope.
                  </p>
                </div>
              </div>

              <div className="se-att-web-register-toolbar">
                <div className="se-att-web-search">
                  <span>
                    ⌕
                  </span>

                  <input
                    type="search"
                    placeholder="Search employee, code, unit or designation..."
                    value={
                      search
                    }
                    onChange={(
                      event
                    ) =>
                      setSearch(
                        event
                          .target
                          .value
                      )
                    }
                  />

                  <kbd>
                    {
                      filteredRows.length
                    }{" "}
                    results
                  </kbd>
                </div>

                <select
                  value={
                    departmentFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setDepartmentFilter(
                      event
                        .target
                        .value
                    )
                  }
                >
                  <option value="">
                    All Units
                  </option>

                  {departments.map(
                    (
                      department
                    ) => (
                      <option
                        key={
                          department
                        }
                        value={
                          department
                        }
                      >
                        {
                          department
                        }
                      </option>
                    )
                  )}
                </select>

                <select
                  value={
                    statusFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setStatusFilter(
                      event
                        .target
                        .value
                    )
                  }
                >
                  <option value="">
                    All Status
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

                  <option value="LATE">
                    Late
                  </option>

                  <option value="SHORT">
                    Short Hours
                  </option>

                  <option value="MISSING">
                    Missing Punch
                  </option>

                  <option value="VISIT">
                    Customer Visit
                  </option>

                  <option value="ON_DUTY">
                    On Duty
                  </option>

                  <option value="REMOTE">
                    Remote
                  </option>

                  <option value="LEAVE">
                    Leave
                  </option>
                </select>

                <select
                  value={
                    sourceFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setSourceFilter(
                      event
                        .target
                        .value
                    )
                  }
                >
                  <option value="">
                    All Sources
                  </option>

                  <option value="BIOMETRIC">
                    Biometric
                  </option>

                  <option value="OFFICE">
                    Office Web
                  </option>

                  <option value="FIELD">
                    Field / GPS
                  </option>

                  <option value="REMOTE">
                    Remote
                  </option>
                </select>

                {hasFilters ? (
                  <button
                    type="button"
                    className="se-att-web-clear-filter"
                    onClick={
                      clearFilters
                    }
                  >
                    Clear
                  </button>
                ) : null}
              </div>

              <div className="se-att-web-register-summary">
                <span>
                  <strong>
                    {summary.total ||
                      0}
                  </strong>
                  Employees
                </span>

                <span className="present">
                  <strong>
                    {
                      managementMetrics.working
                    }
                  </strong>
                  Active
                </span>

                <span className="absent">
                  <strong>
                    {summary.absent ||
                      0}
                  </strong>
                  Absent
                </span>

                <span className="field">
                  <strong>
                    {
                      managementMetrics.field
                    }
                  </strong>
                  Field
                </span>

                <span className="warning">
                  <strong>
                    {
                      managementMetrics.exceptions
                    }
                  </strong>
                  Exceptions
                </span>
              </div>

              <div className="se-att-web-table-wrap">
                <table className="se-att-web-table">
                  <thead>
                    <tr>
                      <th>
                        Employee
                      </th>

                      <th>
                        Unit
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
                        Mode
                      </th>

                      <th>
                        Source
                      </th>

                      <th>
                        Status
                      </th>

                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {!loading &&
                    filteredRows.map(
                      (
                        row
                      ) => (
                        <tr
                          key={
                            row.employeeId ||
                            row.email
                          }
                          onClick={() =>
                            openEmployee(
                              row
                            )
                          }
                        >
                          <td>
                            <div className="se-att-web-person">
                              <span>
                                {initials(
                                  row.name
                                )}
                              </span>

                              <div>
                                <strong>
                                  {
                                    row.name
                                  }
                                </strong>

                                <small>
                                  {row.employeeCode ||
                                    row.email ||
                                    row.designation ||
                                    "Employee"}
                                </small>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="se-att-web-department-label">
                              {row.department ||
                                row.orgUnitCode ||
                                "—"}
                            </span>
                          </td>

                          <td>
                            <strong className="se-att-web-time-value">
                              {formatTime(
                                checkInTimeOf(
                                  row.attendance
                                )
                              )}
                            </strong>
                          </td>

                          <td>
                            <strong className="se-att-web-time-value">
                              {formatTime(
                                checkOutTimeOf(
                                  row.attendance
                                )
                              )}
                            </strong>
                          </td>

                          <td>
                            {formatMinutes(
                              workingMinutesOf(
                                row.attendance
                              )
                            )}
                          </td>

                          <td>
                            <span className="se-att-web-mode-label">
                              {workModeLabel(
                                normalizedWorkMode(
                                  row.attendance
                                )
                              )}
                            </span>
                          </td>

                          <td>
                            <span className="se-att-web-source-label">
                              {normalizeSource(
                                row.attendance
                              )}
                            </span>
                          </td>

                          <td>
                            <AttendanceStatusBadge
                              status={
                                row.status
                              }
                            />
                          </td>

                          <td>
                            <button
                              type="button"
                              className="se-att-web-row-open"
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                openEmployee(
                                  row
                                );
                              }}
                            >
                              ›
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>

                {loading ? (
                  <div className="se-att-web-loading">
                    <span />

                    <strong>
                      Loading attendance...
                    </strong>
                  </div>
                ) : null}

                {!loading &&
                !filteredRows.length ? (
                  <div className="se-att-web-empty">
                    <span>
                      ⌕
                    </span>

                    <strong>
                      No employees found
                    </strong>

                    <p>
                      Try changing the
                      search or attendance
                      filters.
                    </p>

                    {hasFilters ? (
                      <button
                        type="button"
                        onClick={
                          clearFilters
                        }
                      >
                        Clear filters
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {/* =================================================
              ESSL DEVICE
          ================================================= */}

          {activeSubTab ===
            "BIOMETRIC" &&
          canViewDevice ? (
            <section className="se-att-web-device-page">
              <div className="se-att-web-device-hero">
                <div>
                  <div className="se-att-web-device-kicker">
                    <span>
                      ◎
                    </span>

                    BIOMETRIC ATTENDANCE
                  </div>

                  <h1>
                    eSSL Device
                    Operations
                  </h1>

                  <p>
                    Monitor biometric
                    ingestion and device
                    health independently
                    from employee web and
                    field attendance.
                  </p>

                  <div className="se-att-web-device-state">
                    <i
                      className={
                        biometric
                          ?.isOnline
                          ? "online"
                          : ""
                      }
                    />

                    <div>
                      <strong>
                        {biometric
                          ?.isOnline
                          ? "Device Online"
                          : "Device Offline"}
                      </strong>

                      <span>
                        {biometric
                          ?.isOnline
                          ? "Receiving attendance events"
                          : "No live connection detected"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="se-att-web-device-visual">
                  <span className="se-att-web-device-machine">
                    <i />

                    <strong>
                      ◎
                    </strong>

                    <small>
                      eSSL
                    </small>
                  </span>
                </div>
              </div>

              <div className="se-att-web-device-grid">
                <article>
                  <span>
                    DEVICE
                  </span>

                  <strong>
                    {biometric
                      ?.name ||
                      "SE-RMS eSSL"}
                  </strong>

                  <small>
                    Registered terminal
                  </small>
                </article>

                <article>
                  <span>
                    DEVICE CODE
                  </span>

                  <strong>
                    {biometric
                      ?.code ||
                      "SE_MAIN_01"}
                  </strong>

                  <small>
                    Internal identifier
                  </small>
                </article>

                <article>
                  <span>
                    CONNECTION
                  </span>

                  <strong>
                    {biometric
                      ?.isOnline
                      ? "Online"
                      : biometric
                          ?.status ||
                        "Offline"}
                  </strong>

                  <small>
                    Current state
                  </small>
                </article>

                <article>
                  <span>
                    LAST PUNCH
                  </span>

                  <strong>
                    {formatTime(
                      biometric
                        ?.lastPunchReceivedAt
                    )}
                  </strong>

                  <small>
                    Last event
                  </small>
                </article>

                <article>
                  <span>
                    LAST SYNC
                  </span>

                  <strong>
                    {formatTime(
                      biometric
                        ?.lastSuccessfulSyncAt
                    )}
                  </strong>

                  <small>
                    Last ingestion
                  </small>
                </article>

                <article>
                  <span>
                    PROVIDER
                  </span>

                  <strong>
                    {biometric
                      ?.provider ||
                      "ESSL"}
                  </strong>

                  <small>
                    Hardware provider
                  </small>
                </article>
              </div>
            </section>
          ) : null}
        </section>

        {/* =================================================
            MANAGEMENT EMPLOYEE PANEL
        ================================================= */}

        {canManage ? (
          <AttendanceEmployeePanel
            row={
              selectedRow
            }
            date={
              selectedDate
            }
            location={
              location
            }
            canViewLocation={
              canViewLocation
            }
            onLoadLocation={
              loadLocationHistory
            }
            onClose={() =>
              setSelectedRow(
                null
              )
            }
          />
        ) : null}
      </main>
    );
  };

export default AttendanceWeb;
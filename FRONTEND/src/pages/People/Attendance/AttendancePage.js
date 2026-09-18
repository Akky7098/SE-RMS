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
      () =>
        weekRange(
          today
        ),
      [
        today,
      ]
    );

  const [
    rangeType,
    setRangeType,
  ] =
    useState(
      "WEEK"
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
      }

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
        const first =
          await getAttendance({
            ...query,

            page:
              1,

            limit:
              500,
          });

        let result = [
          ...recordsOf(
            first
          ),
        ];

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

              page,

              limit:
                500,
            });

          result.push(
            ...recordsOf(
              next
            )
          );
        }

        return result;
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

  const todayMode =
    normalizedMode(
      todayAttendance
    );

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
      "ON_DUTY",
    ].includes(
      todayMode
    ) ||
    (
      todayMode ===
        "OFFICE" &&
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
     SUMMARY
  ===================================================== */

  const summary =
    useMemo(
      () => {
        const value = {
          total:
            filteredRecords
              .length,

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
        };

        filteredRecords.forEach(
          (
            record
          ) => {
            if (
              record
                .presenceStatus ===
              "PRESENT"
            ) {
              value.present +=
                1;
            }

            if (
              record
                .presenceStatus ===
              "ABSENT"
            ) {
              value.absent +=
                1;
            }

            if (
              record
                .isLate
            ) {
              value.late +=
                1;
            }

            const mode =
              normalizedMode(
                record
              );

            if (
              mode ===
              "WFH"
            ) {
              value.wfh +=
                1;
            }

            if (
              [
                "FIELD_VISIT",
                "ON_DUTY",
              ].includes(
                mode
              )
            ) {
              value.field +=
                1;
            }
          }
        );

        return value;
      },
      [
        filteredRecords,
      ]
    );

  /* =====================================================
     WORK MODE OPTIONS
  ===================================================== */

  const workModeOptions =
    [
      {
        code:
          "OFFICE",

        title:
          "Office",

        description:
          "Biometric or office location",

        icon:
          "▦",
      },

      {
        code:
          "WFH",

        title:
          "Work From Home",

        description:
          "Location verified",

        icon:
          "⌂",
      },

      {
        code:
          "FIELD_VISIT",

        title:
          "Field Visit",

        description:
          "Live field location",

        icon:
          "⌖",
      },

      {
        code:
          "ON_DUTY",

        title:
          "On Duty",

        description:
          "Official outside duty",

        icon:
          "◎",
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

const startAttendance =
  async () => {
    if (
      !selectedWorkMode
    ) {
      setError(
        "Choose how you are working today."
      );

      return;
    }

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

      /* ===================================================
         STEP 1 — REQUEST LOCATION
      =================================================== */

      setAttendanceLocationStatus(
        "REQUESTING"
      );

      setAttendanceLocationMessage(
        selectedWorkMode ===
          "OFFICE"
          ? "Checking your office location..."
          : "Requesting your current location..."
      );

      console.log(
        "[Attendance] Requesting browser location for:",
        selectedWorkMode
      );

      /* ===================================================
         THIS INVOKES BROWSER GEOLOCATION
      =================================================== */

      const location =
        await getBrowserLocation();

      console.log(
        "[Attendance] Location obtained:",
        {
          latitude:
            location.latitude,

          longitude:
            location.longitude,

          accuracyMeters:
            location.accuracyMeters,
        }
      );

      setAttendanceLocationStatus(
        "VERIFIED"
      );

      setAttendanceLocationMessage(
        "Current location verified."
      );

      /* ===================================================
         STEP 2 — CALL BACKEND

         Only reached after valid location.
      =================================================== */

      const payload = {
        workMode:
          selectedWorkMode,

        latitude:
          location.latitude,

        longitude:
          location.longitude,

        accuracyMeters:
          location.accuracyMeters,
      };

      console.log(
        "[Attendance] Starting attendance:",
        payload
      );

      const result =
        await startWebAttendance(
          payload
        );

      console.log(
        "[Attendance] Start response:",
        result
      );

      const backendMessage =
        result?.message ||
        result?.data?.message ||
        "";

      /* ===================================================
         SUCCESS MESSAGE
      =================================================== */

      if (
        backendMessage
      ) {
        setSuccessMessage(
          backendMessage
        );
      } else if (
        selectedWorkMode ===
          "OFFICE"
      ) {
        setSuccessMessage(
          "Office attendance started after location verification."
        );
      } else if (
        selectedWorkMode ===
          "WFH"
      ) {
        setSuccessMessage(
          "Work From Home attendance started. Location verified."
        );
      } else if (
        selectedWorkMode ===
          "FIELD_VISIT"
      ) {
        setSuccessMessage(
          "Field Visit attendance started. Location verified."
        );
      } else if (
        selectedWorkMode ===
          "ON_DUTY"
      ) {
        setSuccessMessage(
          "On Duty attendance started. Location verified."
        );
      } else {
        setSuccessMessage(
          "Attendance started successfully."
        );
      }

      /* ===================================================
         REFRESH ATTENDANCE
      =================================================== */

      await load(
        true
      );
    } catch (
      requestError
    ) {
      console.error(
        "[Attendance] Start failed:",
        requestError
      );

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

      <header className="se-people-att-header">

        <div className="se-people-att-heading">

          <button
            type="button"
            className="se-people-att-back"
            onClick={() =>
              navigate(
                "/dashboard?app=people&page=overview"
              )
            }
          >
            ←
          </button>

          <div>

            <span>
              PEOPLE · ATTENDANCE
            </span>

            <h1>
              Attendance
            </h1>

            <p>
              Your workday, attendance history and workforce controls.
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
              load(
                true
              )
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
            view ===
            "DAY"
              ? "active"
              : ""
          }
          onClick={() =>
            setView(
              "DAY"
            )
          }
        >

          <span>
            ◉
          </span>

          <div>

            <strong>
              My Day
            </strong>

            <small>
              Start and manage today
            </small>

          </div>

        </button>

        <button
          type="button"
          className={
            view ===
            "HISTORY"
              ? "active"
              : ""
          }
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
              My History
            </strong>

            <small>
              Personal attendance
            </small>

          </div>

        </button>

        {access
          .canViewRegister ? (
          <button
            type="button"
            className={
              view ===
              "REGISTER"
                ? "active"
                : ""
            }
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
                Workforce
              </strong>

              <small>
                {
                  managementScopeTitle
                }
              </small>

            </div>

          </button>
        ) : null}

        {access
          .canApproveRegularization ? (
          <button
            type="button"
            className={
              view ===
              "APPROVALS"
                ? "active"
                : ""
            }
            onClick={() =>
              setView(
                "APPROVALS"
              )
            }
          >

            <span>
              ✓
            </span>

            <div>

              <strong>
                Regularization
              </strong>

              <small>
                Review requests
              </small>

            </div>

          </button>
        ) : null}

        {access
          .canViewLocations ? (
          <button
            type="button"
            className={
              view ===
              "LOCATIONS"
                ? "active"
                : ""
            }
            onClick={() =>
              setView(
                "LOCATIONS"
              )
            }
          >

            <span>
              ⌖
            </span>

            <div>

              <strong>
                Locations
              </strong>

              <small>
                WFH & field tracking
              </small>

            </div>

          </button>
        ) : null}

        {access
          .canExport ? (
          <button
            type="button"
            className={
              view ===
              "REPORTS"
                ? "active"
                : ""
            }
            onClick={() =>
              setView(
                "REPORTS"
              )
            }
          >

            <span>
              ↓
            </span>

            <div>

              <strong>
                Reports
              </strong>

              <small>
                Export attendance
              </small>

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

            <section className="se-att-day-head">

              <div>

                <span className="se-att-eyebrow">
                  MY WORKDAY
                </span>

                <h2>
                  Start your workday.
                </h2>

                <p>
                  Choose how you are working today. Office attendance is normally recorded through biometric, with verified office-location attendance available when biometric is unavailable. WFH, Field Visit and On Duty use verified location attendance.
                </p>

              </div>

              <div className="se-att-day-status">

                <small>
                  TODAY
                </small>

                <strong>
                  {attendanceCompleted
                    ? "Completed"
                    : attendanceStarted
                      ? "Working"
                      : "Not started"}
                </strong>

                <span
                  className={
                    attendanceCompleted
                      ? "done"
                      : attendanceStarted
                        ? "working"
                        : ""
                  }
                >
                  {attendanceCompleted
                    ? "✓ Day completed"
                    : attendanceStarted
                      ? `● ${todayMode}`
                      : "○ Waiting for attendance"}
                </span>

              </div>

            </section>

            {!attendanceStarted ? (
              <section className="se-att-start-card">

                <div className="se-att-start-heading">

                  <div>

                    <span>
                      START ATTENDANCE
                    </span>

                    <h3>
                      Where are you working today?
                    </h3>

                    <p>
                      Select one option before starting attendance.
                    </p>

                  </div>

                  <div className="se-att-start-step">
                    Step 1 of 2
                  </div>

                </div>

                <div className="se-att-mode-grid">

                  {workModeOptions.map(
                    (
                      option
                    ) => (
                      <button
                        key={
                          option.code
                        }
                        type="button"
                        className={
                          selectedWorkMode ===
                          option.code
                            ? `se-att-mode-card active mode-${option.code.toLowerCase()}`
                            : `se-att-mode-card mode-${option.code.toLowerCase()}`
                        }
                        onClick={() =>
                          setSelectedWorkMode(
                            option.code
                          )
                        }
                      >

                        <span className="se-att-mode-card-icon">
                          {
                            option.icon
                          }
                        </span>

                        <div>

                          <strong>
                            {
                              option.title
                            }
                          </strong>

                          <small>
                            {
                              option.description
                            }
                          </small>

                        </div>

                        <i>
                          {selectedWorkMode ===
                          option.code
                            ? "✓"
                            : "○"}
                        </i>

                      </button>
                    )
                  )}

                </div>

                {selectedWorkMode ? (
                  <div className="se-att-start-footer">

                    <div>

                      <small>
                        SELECTED MODE
                      </small>

                      <strong>
                        {
                          workModeOptions.find(
                            (
                              item
                            ) =>
                              item.code ===
                              selectedWorkMode
                          )?.title
                        }
                      </strong>

                     <span>
  {attendanceLocationStatus ===
  "REQUESTING"
    ? selectedWorkMode ===
        "OFFICE"
      ? "Checking your office location..."
      : "Requesting location permission..."
    : attendanceLocationStatus ===
        "VERIFIED"
      ? "✓ Current location verified"
      : attendanceLocationStatus ===
          "ERROR"
        ? attendanceLocationMessage
        : selectedWorkMode ===
            "OFFICE"
          ? "Biometric is automatic. If biometric is unavailable, verified office location can be used."
          : selectedWorkMode ===
              "WFH"
            ? "Your current location will be verified before Work From Home attendance starts."
            : selectedWorkMode ===
                "FIELD_VISIT"
              ? "Your current field location will be recorded when attendance starts."
              : selectedWorkMode ===
                  "ON_DUTY"
                ? "Your current location will be recorded for official duty attendance."
                : ""}
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
      ? "Getting Location..."
      : "Starting..."
    : "Start Attendance →"}
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
      {todayMode ===
      "WFH"
        ? "Working from home"
        : todayMode ===
            "FIELD_VISIT"
          ? "Field visit in progress"
          : todayMode ===
              "ON_DUTY"
            ? "On duty"
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

            <section className="se-att-section-heading">

              <div>

                <span>
                  PERSONAL ATTENDANCE
                </span>

                <h2>
                  My attendance history
                </h2>

                <p>
                  Review previous attendance without mixing it with management records.
                </p>

              </div>

            </section>

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
            />

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
            />

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
                  Filter only the records you need. Department, office and hierarchy access remain backend controlled.
                </p>

              </div>

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

            </section>

            <AttendanceSummary
              summary={
                summary
              }
            />

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
                filteredRecords
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
              Open a workforce attendance record to view its authorized WFH, field visit or on-duty location trail.
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
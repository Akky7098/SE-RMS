import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../../../../auth/AuthContext";

import {
  getEmployees,
} from "../../../../services/employeeService";

import {
  bulkAssignShift,
  createAttendanceShift,
  ensureShiftRoster,
  getAttendanceShifts,
  getMyShiftWeek,
  getShiftRoster,
  publishShiftRoster,
  saveShiftAssignments,
  updateAttendanceShift,
} from "../../../../services/shiftService";

import MyShiftWeek from "./components/MyShiftWeek";

import ShiftAssignmentForm from "./components/ShiftAssignmentForm";

import ShiftLegend from "./components/ShiftLegend";

import ShiftMasterDrawer from "./components/ShiftMasterDrawer";

import ShiftRosterGrid from "./components/ShiftRosterGrid";

import ShiftSummary from "./components/ShiftSummary";

import ShiftWeekNavigator from "./components/ShiftWeekNavigator";

import {
  assignmentKey,
  startOfWeek,
  todayKey,
  weekLabel,
} from "./utils/shiftHelpers";

import {
  getShiftAccess,
} from "./utils/shiftAccess";

import "./Shift.css";

/* =========================================================
   CONSTANTS
========================================================= */

const REVIEW_PAGE_SIZE =
  50;

const DRILLDOWN_PAGE_SIZE =
  20;

/* =========================================================
   BASIC HELPERS
========================================================= */

const normalize = (
  value
) =>
  String(
    value ||
    ""
  )
    .trim()
    .toUpperCase();

/* =========================================================
   EMPLOYEE ID
========================================================= */

const employeeIdOf = (
  employee
) =>
  String(
    employee?._id ||
    employee?.id ||
    employee?.employeeId?._id ||
    employee?.employeeId ||
    ""
  );

/* =========================================================
   ASSIGNMENT EMPLOYEE ID
========================================================= */

const assignmentEmployeeId = (
  assignment
) =>
  String(
    assignment
      ?.employeeId
      ?._id ||
    assignment
      ?.employeeId ||
    ""
  );

/* =========================================================
   ASSIGNMENT SHIFT ID
========================================================= */

const assignmentShiftId = (
  assignment
) =>
  String(
    assignment
      ?.shiftId
      ?._id ||
    assignment
      ?.shiftId ||
    ""
  );

/* =========================================================
   EMPLOYEE RESPONSE
========================================================= */

const employeeRecords = (
  response
) => {
  if (
    Array.isArray(
      response
    )
  ) {
    return response;
  }

  return (
    response?.records ||
    response?.employees ||
    response?.items ||
    response?.data?.records ||
    response?.data?.employees ||
    response?.data?.items ||
    []
  );
};

/* =========================================================
   EMPLOYEE NAME
========================================================= */

const getEmployeeName = (
  employee
) =>
  employee?.fullName ||
  employee?.employeeName ||
  employee?.name ||
  "Employee";

/* =========================================================
   DEPARTMENT VALUE

   IMPORTANT:
   Prefer orgUnitCode for roster assignment because shift
   backend now uses orgUnitCode as primary roster scope.
========================================================= */

const getEmployeeDepartmentValue = (
  employee
) => {
  return String(
    employee?.orgUnitCode ||
    employee?.departmentCode ||
    employee?.department?._id ||
    employee?.departmentId ||
    employee?.departmentName ||
    ""
  );
};

/* =========================================================
   DEPARTMENT LABEL
========================================================= */

const getEmployeeDepartmentLabel = (
  employee
) => {
  return (
    employee?.department?.name ||
    employee?.departmentName ||
    employee?.orgUnitCode ||
    employee?.departmentCode ||
    ""
  );
};

/* =========================================================
   OFFICE VALUE
========================================================= */

const getEmployeeOfficeValue = (
  employee
) => {
  return String(
    employee?.office?._id ||
    employee?.officeId ||
    employee?.workLocation ||
    ""
  );
};

/* =========================================================
   OFFICE LABEL
========================================================= */

const getEmployeeOfficeLabel = (
  employee
) => {
  return (
    employee?.office?.name ||
    employee?.officeName ||
    employee?.workLocation ||
    ""
  );
};

/* =========================================================
   EMPLOYEE INITIALS
========================================================= */

const getInitials = (
  value
) => {
  const words =
    String(
      value ||
      "E"
    )
      .trim()
      .split(
        /\s+/
      )
      .filter(
        Boolean
      );

  return words
    .slice(
      0,
      2
    )
    .map(
      (word) =>
        word
          .charAt(
            0
          )
          .toUpperCase()
    )
    .join(
      ""
    );
};

/* =========================================================
   DISPLAY DATE
========================================================= */

const displayDate = (
  value
) => {
  if (
    !value
  ) {
    return "—";
  }

  const [
    year,
    month,
    day,
  ] =
    String(
      value
    )
      .split(
        "-"
      )
      .map(
        Number
      );

  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    }
  ).format(
    new Date(
      year,
      month - 1,
      day
    )
  );
};

/* =========================================================
   ASSIGNMENT COMPARISON
========================================================= */

const isSameAssignment = (
  existing,
  dayType,
  shiftId
) => {
  if (
    !existing
  ) {
    return false;
  }

  const existingType =
    normalize(
      existing?.dayType
    );

  const requestedType =
    normalize(
      dayType
    );

  if (
    existingType !==
    requestedType
  ) {
    return false;
  }

  if (
    requestedType !==
    "SHIFT"
  ) {
    return true;
  }

  return (
    assignmentShiftId(
      existing
    ) ===
    String(
      shiftId ||
      ""
    )
  );
};

/* =========================================================
   PAGE
========================================================= */

function ShiftPage() {
  const navigate =
    useNavigate();

  const {
    user,

    access:
      authAccess,
  } =
    useAuth();

  /* =======================================================
     ACCESS
  ======================================================= */

  const access =
    useMemo(
      () =>
        getShiftAccess(
          user,
          authAccess
        ),
      [
        user,
        authAccess,
      ]
    );

  /* =======================================================
     VIEW
  ======================================================= */

  const [
    view,
    setView,
  ] =
    useState(
      "MY_SHIFT"
    );

  const initialViewSet =
    useRef(
      false
    );

  useEffect(
    () => {
      if (
        initialViewSet
          .current
      ) {
        return;
      }

      if (
        access
          .canManageRoster
      ) {
        setView(
          "ASSIGN"
        );
      }

      initialViewSet
        .current =
        true;
    },
    [
      access
        .canManageRoster,
    ]
  );

  /* =======================================================
     WEEK
  ======================================================= */

  const thisWeek =
    useMemo(
      () =>
        startOfWeek(
          todayKey()
        ),
      []
    );

  const [
    weekStart,
    setWeekStart,
  ] =
    useState(
      thisWeek
    );

  /* =======================================================
     DATA
  ======================================================= */

  const [
    shifts,
    setShifts,
  ] =
    useState(
      []
    );

  const [
    myAssignments,
    setMyAssignments,
  ] =
    useState(
      []
    );

  const [
    roster,
    setRoster,
  ] =
    useState(
      null
    );

  const [
    rosters,
    setRosters,
  ] =
    useState(
      []
    );

  const [
    assignments,
    setAssignments,
  ] =
    useState(
      []
    );

  const [
    employees,
    setEmployees,
  ] =
    useState(
      []
    );

  /* =======================================================
     LOADING
  ======================================================= */

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

  /* =======================================================
     MESSAGE
  ======================================================= */

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  const [
    success,
    setSuccess,
  ] =
    useState(
      ""
    );

  /* =======================================================
     REVIEW FILTER
  ======================================================= */

  const [
    search,
    setSearch,
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
    reviewPage,
    setReviewPage,
  ] =
    useState(
      1
    );

  /* =======================================================
     REVIEW CHANGES
  ======================================================= */

  const [
    dirtyAssignments,
    setDirtyAssignments,
  ] =
    useState(
      new Map()
    );

  /* =======================================================
     ASSIGNMENT MODAL
  ======================================================= */

  const [
    assignmentModalOpen,
    setAssignmentModalOpen,
  ] =
    useState(
      false
    );

  /* =======================================================
     DRILL DOWN
  ======================================================= */

  const [
    drilldown,
    setDrilldown,
  ] =
    useState(
      null
    );

  const [
    drilldownPage,
    setDrilldownPage,
  ] =
    useState(
      1
    );

  /* =======================================================
     SHIFT MASTER
  ======================================================= */

  const [
    shiftDrawerOpen,
    setShiftDrawerOpen,
  ] =
    useState(
      false
    );

  const [
    editingShift,
    setEditingShift,
  ] =
    useState(
      null
    );

  const [
    shiftSaving,
    setShiftSaving,
  ] =
    useState(
      false
    );

  /* =======================================================
     SAFE ARRAYS
  ======================================================= */

  const safeShifts =
    useMemo(
      () =>
        Array.isArray(
          shifts
        )
          ? shifts
          : [],
      [
        shifts,
      ]
    );

  const safeEmployees =
    useMemo(
      () =>
        Array.isArray(
          employees
        )
          ? employees
          : [],
      [
        employees,
      ]
    );

  const safeAssignments =
    useMemo(
      () =>
        Array.isArray(
          assignments
        )
          ? assignments
          : [],
      [
        assignments,
      ]
    );

  const safeRosters =
    useMemo(
      () =>
        Array.isArray(
          rosters
        )
          ? rosters
          : [],
      [
        rosters,
      ]
    );

  /* =======================================================
     LOAD SHIFTS
  ======================================================= */

  const loadShifts =
    useCallback(
      async () => {
        const response =
          await getAttendanceShifts({
            active:
              true,

            limit:
              100,
          });

        setShifts(
          Array.isArray(
            response?.records
          )
            ? response.records
            : []
        );
      },
      []
    );

  /* =======================================================
     LOAD MY SHIFT
  ======================================================= */

  const loadMyShift =
    useCallback(
      async () => {
        try {
          const response =
            await getMyShiftWeek({
              weekStart,
            });

          setMyAssignments(
            Array.isArray(
              response
                ?.assignments
            )
              ? response
                  .assignments
              : Array.isArray(
                    response
                      ?.records
                  )
                ? response
                    .records
                : []
          );
        } catch (
          requestError
        ) {
          console.warn(
            "My Shift load failed:",
            requestError
              ?.response
              ?.data
              ?.message ||
            requestError
              ?.message
          );

          setMyAssignments(
            []
          );
        }
      },
      [
        weekStart,
      ]
    );

  /* =======================================================
     LOAD EMPLOYEES
  ======================================================= */

  const loadEmployees =
    useCallback(
      async () => {
        if (
          !access
            .canViewTeam
        ) {
          setEmployees(
            []
          );

          return;
        }

        const first =
          await getEmployees({
            page:
              1,

            limit:
              500,

            status:
              "ACTIVE",
          });

        let records = [
          ...employeeRecords(
            first
          ),
        ];

        const totalPages =
          Math.max(
            1,

            Number(
              first
                ?.pagination
                ?.pages ||
              first
                ?.pagination
                ?.totalPages ||
              1
            )
          );

        for (
          let page = 2;
          page <= totalPages;
          page += 1
        ) {
          const next =
            await getEmployees({
              page,

              limit:
                500,

              status:
                "ACTIVE",
            });

          records.push(
            ...employeeRecords(
              next
            )
          );
        }

        const unique =
          new Map();

        records.forEach(
          (
            employee
          ) => {
            const id =
              employeeIdOf(
                employee
              );

            if (
              id
            ) {
              unique.set(
                id,
                employee
              );
            }
          }
        );

        setEmployees([
          ...unique.values(),
        ]);
      },
      [
        access
          .canViewTeam,
      ]
    );

  /* =======================================================
     LOAD WEEK ROSTER
  ======================================================= */

  const loadRoster =
    useCallback(
      async () => {
        if (
          !access
            .canViewTeam
        ) {
          setRoster(
            null
          );

          setRosters(
            []
          );

          setAssignments(
            []
          );

          return;
        }

        const response =
          await getShiftRoster({
            weekStart,
          });

        const nextRosters =
          Array.isArray(
            response
              ?.rosters
          )
            ? response
                .rosters
            : response
                ?.roster
              ? [
                  response
                    .roster,
                ]
              : [];

        const nextAssignments =
          Array.isArray(
            response
              ?.assignments
          )
            ? response
                .assignments
            : [];

        setRoster(
          response
            ?.roster ||
          nextRosters[0] ||
          null
        );

        setRosters(
          nextRosters
        );

        setAssignments(
          nextAssignments
        );

        /* =================================================
           MERGE ROSTER EMPLOYEES INTO EMPLOYEE LIST
        ================================================= */

        if (
          Array.isArray(
            response
              ?.employees
          ) &&
          response
            .employees
            .length
        ) {
          setEmployees(
            (
              current
            ) => {
              const map =
                new Map();

              [
                ...(
                  Array.isArray(
                    current
                  )
                    ? current
                    : []
                ),

                ...response
                  .employees,
              ].forEach(
                (
                  employee
                ) => {
                  const id =
                    employeeIdOf(
                      employee
                    );

                  if (
                    id
                  ) {
                    map.set(
                      id,
                      employee
                    );
                  }
                }
              );

              return [
                ...map.values(),
              ];
            }
          );
        }

        setDirtyAssignments(
          new Map()
        );
      },
      [
        access
          .canViewTeam,

        weekStart,
      ]
    );

  /* =======================================================
     LOAD PAGE
  ======================================================= */

  const loadPage =
    useCallback(
      async (
        silent = false
      ) => {
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

        try {
          const tasks = [
            loadShifts(),

            loadMyShift(),
          ];

          if (
            access
              .canViewTeam
          ) {
            tasks.push(
              loadEmployees()
            );

            tasks.push(
              loadRoster()
            );
          }

          const results =
            await Promise.allSettled(
              tasks
            );

          const rejected =
            results.find(
              (
                result
              ) =>
                result.status ===
                "rejected"
            );

          if (
            rejected
          ) {
            const requestError =
              rejected.reason;

            setError(
              requestError
                ?.response
                ?.data
                ?.message ||
              requestError
                ?.message ||
              "Some shift information could not be loaded."
            );
          }
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
          .canViewTeam,

        loadShifts,

        loadMyShift,

        loadEmployees,

        loadRoster,
      ]
    );

  useEffect(
    () => {
      loadPage();
    },
    [
      loadPage,
    ]
  );

  /* =======================================================
     CLEAR TRANSIENT STATE WHEN WEEK CHANGES
  ======================================================= */

  useEffect(
    () => {
      setSearch(
        ""
      );

      setDepartment(
        ""
      );

      setOffice(
        ""
      );

      setReviewPage(
        1
      );

      setDrilldown(
        null
      );

      setDrilldownPage(
        1
      );

      setDirtyAssignments(
        new Map()
      );
    },
    [
      weekStart,
    ]
  );

  /* =======================================================
     NIGHT SHIFT
  ======================================================= */

  const nightShift =
    useMemo(
      () => {
        return (
          safeShifts.find(
            (
              shift
            ) =>
              normalize(
                shift?.type
              ) ===
              "NIGHT"
          ) ||
          safeShifts.find(
            (
              shift
            ) =>
              Boolean(
                shift
                  ?.crossesMidnight
              )
          ) ||
          null
        );
      },
      [
        safeShifts,
      ]
    );

  /* =======================================================
     MERGED ASSIGNMENTS
  ======================================================= */

  const mergedAssignments =
    useMemo(
      () => {
        const map =
          new Map();

        safeAssignments.forEach(
          (
            assignment
          ) => {
            const employeeId =
              assignmentEmployeeId(
                assignment
              );

            const date =
              assignment
                ?.assignmentDate;

            if (
              employeeId &&
              date
            ) {
              map.set(
                assignmentKey(
                  employeeId,
                  date
                ),
                assignment
              );
            }
          }
        );

        dirtyAssignments.forEach(
          (
            assignment,
            key
          ) => {
            if (
              assignment
                ?.remove
            ) {
              map.delete(
                key
              );

              return;
            }

            map.set(
              key,
              assignment
            );
          }
        );

        return [
          ...map.values(),
        ];
      },
      [
        safeAssignments,
        dirtyAssignments,
      ]
    );

  /* =======================================================
     SAVED ASSIGNMENT MAP
  ======================================================= */

  const assignmentMap =
    useMemo(
      () => {
        const map =
          new Map();

        safeAssignments.forEach(
          (
            assignment
          ) => {
            const employeeId =
              assignmentEmployeeId(
                assignment
              );

            const date =
              assignment
                ?.assignmentDate;

            if (
              employeeId &&
              date
            ) {
              map.set(
                assignmentKey(
                  employeeId,
                  date
                ),
                assignment
              );
            }
          }
        );

        return map;
      },
      [
        safeAssignments,
      ]
    );

  /* =======================================================
     EMPLOYEE MAP
  ======================================================= */

  const employeeMap =
    useMemo(
      () => {
        const map =
          new Map();

        safeEmployees.forEach(
          (
            employee
          ) => {
            const id =
              employeeIdOf(
                employee
              );

            if (
              id
            ) {
              map.set(
                id,
                employee
              );
            }
          }
        );

        return map;
      },
      [
        safeEmployees,
      ]
    );

  /* =======================================================
     DEPARTMENTS
  ======================================================= */

  const departments =
    useMemo(
      () => {
        const map =
          new Map();

        safeEmployees.forEach(
          (
            employee
          ) => {
            const value =
              getEmployeeDepartmentValue(
                employee
              );

            const label =
              getEmployeeDepartmentLabel(
                employee
              );

            if (
              value &&
              label
            ) {
              map.set(
                value,
                label
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
        safeEmployees,
      ]
    );

  /* =======================================================
     OFFICES
  ======================================================= */

  const offices =
    useMemo(
      () => {
        const map =
          new Map();

        safeEmployees.forEach(
          (
            employee
          ) => {
            const value =
              getEmployeeOfficeValue(
                employee
              );

            const label =
              getEmployeeOfficeLabel(
                employee
              );

            if (
              value &&
              label
            ) {
              map.set(
                value,
                label
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
        safeEmployees,
      ]
    );

  /* =======================================================
     FILTER EMPLOYEES
  ======================================================= */

  const filteredEmployees =
    useMemo(
      () => {
        const needle =
          String(
            search ||
            ""
          )
            .trim()
            .toLowerCase();

        return safeEmployees.filter(
          (
            employee
          ) => {
            if (
              department &&
              getEmployeeDepartmentValue(
                employee
              ) !==
                department
            ) {
              return false;
            }

            if (
              office &&
              getEmployeeOfficeValue(
                employee
              ) !==
                office
            ) {
              return false;
            }

            if (
              !needle
            ) {
              return true;
            }

            const haystack =
              [
                getEmployeeName(
                  employee
                ),

                employee
                  ?.employeeCode,

                getEmployeeDepartmentLabel(
                  employee
                ),

                employee
                  ?.designation,

                employee
                  ?.designationName,

                employee
                  ?.workLocation,
              ]
                .filter(
                  Boolean
                )
                .join(
                  " "
                )
                .toLowerCase();

            return haystack.includes(
              needle
            );
          }
        );
      },
      [
        safeEmployees,

        search,

        department,

        office,
      ]
    );

  useEffect(
    () => {
      setReviewPage(
        1
      );
    },
    [
      search,
      department,
      office,
    ]
  );

  /* =======================================================
     REVIEW PAGINATION
  ======================================================= */

  const reviewPages =
    Math.max(
      1,

      Math.ceil(
        filteredEmployees
          .length /
        REVIEW_PAGE_SIZE
      )
    );

  const safeReviewPage =
    Math.min(
      reviewPage,
      reviewPages
    );

  const reviewEmployees =
    useMemo(
      () => {
        const start =
          (
            safeReviewPage -
            1
          ) *
          REVIEW_PAGE_SIZE;

        return filteredEmployees.slice(
          start,
          start +
            REVIEW_PAGE_SIZE
        );
      },
      [
        filteredEmployees,
        safeReviewPage,
      ]
    );

  /* =======================================================
     ROSTER STATUS
  ======================================================= */

  const statusList =
    useMemo(
      () => {
        return [
          ...new Set(
            safeRosters
              .map(
                (
                  item
                ) =>
                  normalize(
                    item?.status
                  )
              )
              .filter(
                Boolean
              )
          ),
        ];
      },
      [
        safeRosters,
      ]
    );

  const rosterStatus =
    statusList.length ===
      1
      ? statusList[0]
      : statusList.length >
          1
        ? "MIXED"
        : normalize(
            roster
              ?.status ||
            "DRAFT"
          );

  const editable =
    Boolean(
      access
        .canManageRoster &&
      rosterStatus !==
        "PUBLISHED"
    );

  /* =======================================================
     ASSIGNED EMPLOYEE IDS
  ======================================================= */

  const assignedEmployeeIds =
    useMemo(
      () => {
        return [
          ...new Set(
            safeAssignments
              .map(
                assignmentEmployeeId
              )
              .filter(
                Boolean
              )
          ),
        ];
      },
      [
        safeAssignments,
      ]
    );

  /* =======================================================
     ASSIGNED EMPLOYEES
  ======================================================= */

  const assignedEmployees =
    useMemo(
      () => {
        return assignedEmployeeIds
          .map(
            (
              employeeId
            ) =>
              employeeMap.get(
                employeeId
              )
          )
          .filter(
            Boolean
          )
          .sort(
            (
              a,
              b
            ) =>
              getEmployeeName(
                a
              ).localeCompare(
                getEmployeeName(
                  b
                )
              )
          );
      },
      [
        assignedEmployeeIds,
        employeeMap,
      ]
    );

  /* =======================================================
     ASSIGNMENT DETAIL RECORDS
  ======================================================= */

  const assignmentDetails =
    useMemo(
      () => {
        return safeAssignments
          .map(
            (
              assignment
            ) => {
              const employeeId =
                assignmentEmployeeId(
                  assignment
                );

              const employee =
                employeeMap.get(
                  employeeId
                ) ||
                (
                  typeof assignment
                    ?.employeeId ===
                    "object"
                    ? assignment
                        .employeeId
                    : null
                );

              const shiftId =
                assignmentShiftId(
                  assignment
                );

              const shift =
                safeShifts.find(
                  (
                    item
                  ) =>
                    String(
                      item?._id ||
                      ""
                    ) ===
                    shiftId
                ) ||
                (
                  typeof assignment
                    ?.shiftId ===
                    "object"
                    ? assignment
                        .shiftId
                    : null
                );

              const dayType =
                normalize(
                  assignment
                    ?.dayType
                );

              let scheduleCode =
                "DAY";

              let scheduleName =
                "Day Shift";

              if (
                dayType ===
                "SHIFT"
              ) {
                scheduleCode =
                  shift?.code ||
                  assignment
                    ?.shiftCode ||
                  "SHIFT";

                scheduleName =
                  shift?.name ||
                  assignment
                    ?.shiftName ||
                  "Assigned Shift";
              }

              if (
                dayType ===
                "WEEK_OFF"
              ) {
                scheduleCode =
                  "WO";

                scheduleName =
                  "Week Off";
              }

              if (
                dayType ===
                "HOLIDAY"
              ) {
                scheduleCode =
                  "H";

                scheduleName =
                  "Holiday";
              }

              if (
                dayType ===
                "LEAVE"
              ) {
                scheduleCode =
                  "L";

                scheduleName =
                  "Leave";
              }

              const departmentLabel =
                getEmployeeDepartmentLabel(
                  employee
                ) ||
                assignment
                  ?.orgUnitCode ||
                assignment
                  ?.departmentName ||
                "—";

              return {
                assignment,

                employee,

                employeeId,

                employeeName:
                  getEmployeeName(
                    employee
                  ),

                employeeCode:
                  employee
                    ?.employeeCode ||
                  assignment
                    ?.employeeCode ||
                  "—",

                department:
                  departmentLabel,

                office:
                  getEmployeeOfficeLabel(
                    employee
                  ) ||
                  assignment
                    ?.officeName ||
                  "—",

                assignmentDate:
                  assignment
                    ?.assignmentDate ||
                  "",

                dayType,

                scheduleCode,

                scheduleName,

                shift,
              };
            }
          )
          .sort(
            (
              a,
              b
            ) => {
              const dateCompare =
                String(
                  a
                    .assignmentDate
                ).localeCompare(
                  String(
                    b
                      .assignmentDate
                  )
                );

              if (
                dateCompare
              ) {
                return dateCompare;
              }

              return a
                .employeeName
                .localeCompare(
                  b
                    .employeeName
                );
            }
          );
      },
      [
        safeAssignments,
        employeeMap,
        safeShifts,
      ]
    );

  /* =======================================================
     DEPARTMENT ROSTER DETAILS
  ======================================================= */

  const departmentRosterDetails =
    useMemo(
      () => {
        return safeRosters.map(
          (
            item
          ) => {
            const orgUnitCode =
              String(
                item
                  ?.orgUnitCode ||
                item
                  ?.department
                  ?.orgUnitCode ||
                item
                  ?.departmentCode ||
                ""
              );

            const departmentId =
              String(
                item
                  ?.departmentId
                  ?._id ||
                item
                  ?.departmentId ||
                item
                  ?.department
                  ?._id ||
                ""
              );

            const departmentName =
              item
                ?.department
                ?.name ||
              item
                ?.departmentId
                ?.name ||
              item
                ?.departmentName ||
              orgUnitCode ||
              "Department";

            const employeeCount =
              new Set(
                safeAssignments
                  .filter(
                    (
                      assignment
                    ) => {
                      const assignmentRosterId =
                        String(
                          assignment
                            ?.rosterId
                            ?._id ||
                          assignment
                            ?.rosterId ||
                          ""
                        );

                      return (
                        assignmentRosterId ===
                        String(
                          item?._id ||
                          ""
                        )
                      );
                    }
                  )
                  .map(
                    assignmentEmployeeId
                  )
                  .filter(
                    Boolean
                  )
              ).size;

            const assignmentCount =
              safeAssignments.filter(
                (
                  assignment
                ) => {
                  const assignmentRosterId =
                    String(
                      assignment
                        ?.rosterId
                        ?._id ||
                      assignment
                        ?.rosterId ||
                      ""
                    );

                  return (
                    assignmentRosterId ===
                    String(
                      item?._id ||
                      ""
                    )
                  );
                }
              ).length;

            return {
              ...item,

              orgUnitCode,

              departmentId,

              departmentName,

              employeeCount,

              assignmentCount,
            };
          }
        );
      },
      [
        safeRosters,
        safeAssignments,
      ]
    );

  /* =======================================================
     DRILL DOWN CONTROL
  ======================================================= */

  const openDrilldown = (
    type
  ) => {
    setDrilldown(
      type
    );

    setDrilldownPage(
      1
    );
  };

  const closeDrilldown =
    () => {
      setDrilldown(
        null
      );

      setDrilldownPage(
        1
      );
    };

  /* =======================================================
     DRILL DOWN RECORDS
  ======================================================= */

  const drilldownRecords =
    useMemo(
      () => {
        if (
          drilldown ===
          "EMPLOYEES"
        ) {
          return assignedEmployees;
        }

        if (
          drilldown ===
          "ASSIGNMENTS"
        ) {
          return assignmentDetails;
        }

        if (
          drilldown ===
          "ROSTERS"
        ) {
          return departmentRosterDetails;
        }

        return [];
      },
      [
        drilldown,

        assignedEmployees,

        assignmentDetails,

        departmentRosterDetails,
      ]
    );

  const drilldownPages =
    Math.max(
      1,

      Math.ceil(
        drilldownRecords
          .length /
        DRILLDOWN_PAGE_SIZE
      )
    );

  const safeDrilldownPage =
    Math.min(
      drilldownPage,
      drilldownPages
    );

  const pagedDrilldownRecords =
    useMemo(
      () => {
        const start =
          (
            safeDrilldownPage -
            1
          ) *
          DRILLDOWN_PAGE_SIZE;

        return drilldownRecords.slice(
          start,
          start +
            DRILLDOWN_PAGE_SIZE
        );
      },
      [
        drilldownRecords,
        safeDrilldownPage,
      ]
    );

  /* =======================================================
     OPEN EMPLOYEE IN REVIEW
  ======================================================= */

  const openEmployeeReview =
    (
      employee
    ) => {
      setSearch(
        employee
          ?.employeeCode ||
        getEmployeeName(
          employee
        )
      );

      setDepartment(
        ""
      );

      setOffice(
        ""
      );

      setView(
        "REVIEW"
      );

      closeDrilldown();
    };

  /* =======================================================
     OPEN DEPARTMENT IN REVIEW
  ======================================================= */

  const openDepartmentReview =
    (
      item
    ) => {
      const possibleValues = [
        item
          ?.orgUnitCode,

        item
          ?.departmentId,

        item
          ?.departmentName,
      ]
        .map(
          (
            value
          ) =>
            String(
              value ||
              ""
            )
        )
        .filter(
          Boolean
        );

      const matched =
        departments.find(
          (
            option
          ) =>
            possibleValues.includes(
              String(
                option
                  .value
              )
            ) ||
            normalize(
              option
                .label
            ) ===
            normalize(
              item
                ?.departmentName
            )
        );

      setDepartment(
        matched
          ?.value ||
        item
          ?.orgUnitCode ||
        ""
      );

      setSearch(
        ""
      );

      setOffice(
        ""
      );

      setView(
        "REVIEW"
      );

      closeDrilldown();
    };

  /* =======================================================
     QUICK ASSIGNMENT

     IMPORTANT DUPLICATE RULE

     Existing identical assignment:
     SKIP.

     Existing different assignment:
     BLOCK.

     HR must use Review for correction.
  ======================================================= */

  const applyQuickAssignment =
    async (
      payload
    ) => {
      try {
        setActionLoading(
          "ASSIGN"
        );

        setError(
          ""
        );

        setSuccess(
          ""
        );

        const selectedIds =
          Array.isArray(
            payload
              ?.employeeIds
          )
            ? [
                ...new Set(
                  payload
                    .employeeIds
                    .map(
                      String
                    )
                ),
              ]
            : [];

        const selectedDates =
          Array.isArray(
            payload
              ?.dates
          )
            ? [
                ...new Set(
                  payload
                    .dates
                    .map(
                      String
                    )
                ),
              ]
            : [];

        const departmentValues =
          Array.isArray(
            payload
              ?.departmentValues
          )
            ? payload
                .departmentValues
                .map(
                  String
                )
            : [];

        if (
          !departmentValues
            .length
        ) {
          setError(
            "Select at least one department."
          );

          return false;
        }

        if (
          !selectedIds
            .length
        ) {
          setError(
            "Select at least one employee."
          );

          return false;
        }

        if (
          !selectedDates
            .length
        ) {
          setError(
            "Select at least one assignment date."
          );

          return false;
        }

        if (
          payload
            ?.dayType ===
              "SHIFT" &&
          !payload
            ?.shiftId
        ) {
          setError(
            "Night Shift is not configured."
          );

          return false;
        }

        const selectedEmployees =
          safeEmployees.filter(
            (
              employee
            ) =>
              selectedIds.includes(
                employeeIdOf(
                  employee
                )
              )
          );

        if (
          !selectedEmployees
            .length
        ) {
          setError(
            "Selected employees could not be resolved."
          );

          return false;
        }

        const conflicts =
          [];

        let skippedDuplicates =
          0;

        const groupedRequests =
          new Map();

        /* =================================================
           BUILD NEW WORK ONLY
        ================================================= */

        selectedEmployees.forEach(
          (
            employee
          ) => {
            const employeeId =
              employeeIdOf(
                employee
              );

            const departmentValue =
              getEmployeeDepartmentValue(
                employee
              );

            if (
              !employeeId ||
              !departmentValue
            ) {
              return;
            }

            /*
             * If popup returned selected department values,
             * employee must belong to one of them.
             */
            const allowedDepartment =
              departmentValues.some(
                (
                  value
                ) =>
                  normalize(
                    value
                  ) ===
                    normalize(
                      departmentValue
                    ) ||
                  normalize(
                    value
                  ) ===
                    normalize(
                      getEmployeeDepartmentLabel(
                        employee
                      )
                    )
              );

            if (
              !allowedDepartment
            ) {
              return;
            }

            const newDates =
              [];

            selectedDates.forEach(
              (
                date
              ) => {
                const existing =
                  assignmentMap.get(
                    assignmentKey(
                      employeeId,
                      date
                    )
                  );

                /* =========================================
                   NEW ASSIGNMENT
                ========================================= */

                if (
                  !existing
                ) {
                  newDates.push(
                    date
                  );

                  return;
                }

                /* =========================================
                   EXACT SAME ASSIGNMENT

                   Do not send to backend again.
                ========================================= */

                if (
                  isSameAssignment(
                    existing,

                    payload
                      ?.dayType,

                    payload
                      ?.shiftId
                  )
                ) {
                  skippedDuplicates +=
                    1;

                  return;
                }

                /* =========================================
                   CONFLICTING EXISTING ASSIGNMENT

                   Must be intentionally corrected in Review.
                ========================================= */

                conflicts.push({
                  employeeId,

                  employeeName:
                    getEmployeeName(
                      employee
                    ),

                  date,

                  existing,
                });
              }
            );

            if (
              !newDates
                .length
            ) {
              return;
            }

            /* =============================================
               Group employees by:
               department + exact dates.

               Bulk endpoint can then be used efficiently.
            ============================================= */

            const dateSignature =
              [
                ...newDates,
              ]
                .sort()
                .join(
                  "|"
                );

            const groupKey =
              `${departmentValue}::${dateSignature}`;

            if (
              !groupedRequests.has(
                groupKey
              )
            ) {
              groupedRequests.set(
                groupKey,
                {
                  departmentValue,

                  dates:
                    [
                      ...newDates,
                    ],

                  employeeIds:
                    [],
                }
              );
            }

            groupedRequests
              .get(
                groupKey
              )
              .employeeIds
              .push(
                employeeId
              );
          }
        );

        /* =================================================
           CONFLICT FOUND
        ================================================= */

        if (
          conflicts.length
        ) {
          const first =
            conflicts[0];

          setError(
            conflicts.length ===
              1
              ? `${first.employeeName} already has a different schedule on ${displayDate(first.date)}. Open Review to correct the existing assignment.`
              : `${conflicts.length} selected employee/date entries already have a different schedule. Open Review to make corrections.`
          );

          return false;
        }

        /* =================================================
           EVERYTHING ALREADY EXISTS
        ================================================= */

        if (
          !groupedRequests
            .size
        ) {
          setSuccess(
            skippedDuplicates >
              0
              ? `${skippedDuplicates} selected schedule entr${skippedDuplicates === 1 ? "y is" : "ies are"} already assigned. No duplicate records were created.`
              : "No new schedule entries were required."
          );

          return true;
        }

        /* =================================================
           SAVE
        ================================================= */

        let assignedEntries =
          0;

        const assignedEmployeeSet =
          new Set();

        const affectedDepartments =
          new Set();

        for (
          const request
          of groupedRequests.values()
        ) {
          const rosterResponse =
            await ensureShiftRoster({
              weekStart,

              /*
               * Frontend calls it department.
               *
               * Backend now interprets this as orgUnitCode.
               */
              department:
                request
                  .departmentValue,

              office:
                payload
                  ?.office ||
                undefined,
            });

          const activeRoster =
            rosterResponse
              ?.roster ||
            rosterResponse;

          if (
            !activeRoster
              ?._id
          ) {
            throw new Error(
              `Weekly roster could not be created for ${request.departmentValue}.`
            );
          }

          await bulkAssignShift(
            activeRoster._id,
            {
              employeeIds:
                request
                  .employeeIds,

              dates:
                request
                  .dates,

              dayType:
                payload
                  .dayType,

              shiftId:
                payload
                  .dayType ===
                  "SHIFT"
                  ? payload
                      .shiftId
                  : null,
            }
          );

          request
            .employeeIds
            .forEach(
              (
                id
              ) =>
                assignedEmployeeSet.add(
                  id
                )
            );

          affectedDepartments.add(
            request
              .departmentValue
          );

          assignedEntries +=
            request
              .employeeIds
              .length *
            request
              .dates
              .length;
        }

        /* =================================================
           RELOAD BACKEND TRUTH

           Do not rely on stale local state.
        ================================================= */

        await Promise.allSettled([
          loadRoster(),

          loadMyShift(),
        ]);

        const assignmentName =
          payload
            ?.dayType ===
            "WEEK_OFF"
            ? "Week Off"
            : payload
                ?.dayType ===
                "HOLIDAY"
              ? "Holiday"
              : "Night Shift";

        const duplicateMessage =
          skippedDuplicates >
            0
            ? ` ${skippedDuplicates} existing entr${skippedDuplicates === 1 ? "y was" : "ies were"} skipped.`
            : "";

        setSuccess(
          `${assignmentName} assigned to ${assignedEmployeeSet.size} employee(s) across ${affectedDepartments.size} department(s) — ${assignedEntries} new schedule entr${assignedEntries === 1 ? "y" : "ies"}.${duplicateMessage}`
        );

        return true;
      } catch (
        requestError
      ) {
        console.error(
          "Shift assignment failed:",
          requestError
        );

        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError
            ?.message ||
          "Shift assignment could not be applied."
        );

        return false;
      } finally {
        setActionLoading(
          ""
        );
      }
    };

  /* =======================================================
     REVIEW CELL CHANGE
  ======================================================= */

  const changeAssignment =
    (
      next
    ) => {
      if (
        !editable
      ) {
        return;
      }

      const employeeId =
        String(
          next
            ?.employeeId ||
          ""
        );

      const date =
        String(
          next
            ?.assignmentDate ||
          ""
        );

      if (
        !employeeId ||
        !date
      ) {
        return;
      }

      const key =
        assignmentKey(
          employeeId,
          date
        );

      const existing =
        assignmentMap.get(
          key
        );

      /* =================================================
         USER RETURNED CELL TO EXISTING VALUE
      ================================================= */

      if (
        !next
          ?.remove &&
        existing &&
        isSameAssignment(
          existing,

          next
            ?.dayType,

          next
            ?.shiftId
        )
      ) {
        setDirtyAssignments(
          (
            current
          ) => {
            const copy =
              new Map(
                current
              );

            copy.delete(
              key
            );

            return copy;
          }
        );

        return;
      }

      setDirtyAssignments(
        (
          current
        ) => {
          const copy =
            new Map(
              current
            );

          copy.set(
            key,
            {
              ...next,

              employeeId,

              assignmentDate:
                date,
            }
          );

          return copy;
        }
      );
    };

  /* =======================================================
     SAVE REVIEW CORRECTIONS

     Separate roster by department/org unit.
  ======================================================= */

  const saveReviewCorrections =
    async () => {
      if (
        !dirtyAssignments
          .size
      ) {
        return;
      }

      try {
        setActionLoading(
          "SAVE"
        );

        setError(
          ""
        );

        setSuccess(
          ""
        );

        const changesByDepartment =
          new Map();

        dirtyAssignments.forEach(
          (
            item
          ) => {
            const employee =
              employeeMap.get(
                String(
                  item
                    ?.employeeId ||
                  ""
                )
              );

            const departmentValue =
              getEmployeeDepartmentValue(
                employee
              );

            if (
              !departmentValue
            ) {
              return;
            }

            if (
              !changesByDepartment.has(
                departmentValue
              )
            ) {
              changesByDepartment.set(
                departmentValue,
                []
              );
            }

            changesByDepartment
              .get(
                departmentValue
              )
              .push({
                employeeId:
                  String(
                    item
                      .employeeId
                  ),

                assignmentDate:
                  item
                    .assignmentDate,

                dayType:
                  item
                    .dayType,

                shiftId:
                  item
                    .dayType ===
                    "SHIFT"
                    ? item
                        .shiftId
                    : null,

                remove:
                  Boolean(
                    item
                      .remove
                  ),
              });
          }
        );

        if (
          !changesByDepartment
            .size
        ) {
          throw new Error(
            "Employee organization unit could not be resolved for the selected corrections."
          );
        }

        for (
          const [
            departmentValue,
            changes,
          ]
          of changesByDepartment
        ) {
          const rosterResponse =
            await ensureShiftRoster({
              weekStart,

              department:
                departmentValue,
            });

          const activeRoster =
            rosterResponse
              ?.roster ||
            rosterResponse;

          if (
            !activeRoster
              ?._id
          ) {
            throw new Error(
              `Roster could not be resolved for ${departmentValue}.`
            );
          }

          await saveShiftAssignments(
            activeRoster._id,
            changes
          );
        }

        await Promise.allSettled([
          loadRoster(),

          loadMyShift(),
        ]);

        setDirtyAssignments(
          new Map()
        );

        setSuccess(
          "Roster corrections saved successfully."
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
          "Roster corrections could not be saved."
        );
      } finally {
        setActionLoading(
          ""
        );
      }
    };

  /* =======================================================
     SUBMIT ALL DRAFT ROSTERS
  ======================================================= */

//   const submitAllRosters =
//     async () => {
//       const targets =
//         safeRosters.filter(
//           (
//             item
//           ) =>
//             normalize(
//               item
//                 ?.status
//             ) ===
//             "DRAFT"
//         );

//       if (
//         !targets
//           .length
//       ) {
//         setError(
//           "There are no draft rosters to submit."
//         );

//         return;
//       }

//       try {
//         setActionLoading(
//           "SUBMIT"
//         );

//         setError(
//           ""
//         );

//         setSuccess(
//           ""
//         );

//         await Promise.all(
//           targets.map(
//             (
//               item
//             ) =>
//               submitShiftRoster(
//                 item._id
//               )
//           )
//         );

//         await loadRoster();

//         setSuccess(
//           `${targets.length} department roster${targets.length === 1 ? "" : "s"} submitted to HR.`
//         );
//       } catch (
//         requestError
//       ) {
//         setError(
//           requestError
//             ?.response
//             ?.data
//             ?.message ||
//           requestError
//             ?.message ||
//           "Roster submission failed."
//         );
//       } finally {
//         setActionLoading(
//           ""
//         );
//       }
//     };

  /* =======================================================
     PUBLISH ALL ELIGIBLE ROSTERS
  ======================================================= */

 /* =========================================================
   DIRECT PUBLISH

   FINAL WORKFLOW:
   DRAFT / SUBMITTED
   ↓
   PUBLISHED

   No separate Submit-to-HR step.
========================================================= */

 /* =========================================================
   PUBLISH WEEK

   Publish only department rosters that actually contain
   assignments.

   ShiftAssignment is still verified again by backend.
========================================================= */

/* =========================================================
   PUBLISH WEEK

   FINAL SE-RMS FLOW

   IMPORTANT:
   Frontend does NOT decide whether a roster is empty.

   It sends every non-published roster to backend.

   Backend is authoritative:
   - roster with assignments -> publish
   - empty roster -> return success + skipped
   - published roster -> frontend does not send again
========================================================= */

/* =========================================================
   PUBLISH WEEK

   FINAL RULE:

   Frontend sends every non-published roster.

   Backend is authoritative:
   - roster with assignments -> publish
   - empty roster -> skip safely
   - already published roster -> frontend does not resend

   IMPORTANT:
   Do NOT match assignments to rosters here.
   Do NOT use cached assignmentCount here.
========================================================= */

const publishAllRosters =
  async () => {
    try {
      setActionLoading(
        "PUBLISH"
      );

      setError(
        ""
      );

      setSuccess(
        ""
      );

      /* ===================================================
         ALL NON-PUBLISHED ROSTERS
      ==================================================== */

      const publishTargets =
        safeRosters.filter(
          (
            rosterItem
          ) => {
            const rosterId =
              String(
                rosterItem?._id ||
                ""
              ).trim();

            const status =
              normalize(
                rosterItem?.status
              );

            return (
              Boolean(
                rosterId
              ) &&
              status !==
                "PUBLISHED"
            );
          }
        );

      console.log(
        "SHIFT PUBLISH START:",
        {
          totalRosters:
            safeRosters.length,

          publishTargets:
            publishTargets.map(
              (
                item
              ) => ({
                id:
                  item?._id,

                status:
                  item?.status,

                orgUnitCode:
                  item?.orgUnitCode,

                department:
                  item
                    ?.departmentName ||
                  item
                    ?.department
                    ?.name ||
                  "",
              })
            ),
        }
      );

      /* ===================================================
         NOTHING TO PUBLISH
      ==================================================== */

      if (
        !publishTargets.length
      ) {
        const allPublished =
          safeRosters.length >
            0 &&
          safeRosters.every(
            (
              item
            ) =>
              normalize(
                item?.status
              ) ===
              "PUBLISHED"
          );

        if (
          allPublished
        ) {
          setSuccess(
            "This week's schedule is already published."
          );
        } else {
          setError(
            "No weekly roster is available to publish."
          );
        }

        return;
      }

      /* ===================================================
         PUBLISH ONE BY ONE

         We intentionally call every non-published roster.

         Backend decides:
         published = true
         OR
         skipped = true / EMPTY_ROSTER
      ==================================================== */

      const results =
        [];

      for (
        const rosterItem
        of publishTargets
      ) {
        const rosterId =
          String(
            rosterItem._id
          );

        console.log(
          "PUBLISH API CALL:",
          rosterId
        );

        const response =
          await publishShiftRoster(
            rosterId,
            {
              directPublish:
                true,
            }
          );

        console.log(
          "PUBLISH API RESPONSE:",
          {
            rosterId,

            response,
          }
        );

        results.push({
          rosterId,

          response,
        });
      }

      /* ===================================================
         COUNTS
      ==================================================== */

      const publishedCount =
        results.filter(
          (
            item
          ) =>
            item
              ?.response
              ?.published ===
              true ||
            normalize(
              item
                ?.response
                ?.roster
                ?.status
            ) ===
              "PUBLISHED"
        ).length;

      const skippedCount =
        results.filter(
          (
            item
          ) =>
            item
              ?.response
              ?.skipped ===
              true ||
            item
              ?.response
              ?.reason ===
              "EMPTY_ROSTER"
        ).length;

      /* ===================================================
         RELOAD BACKEND TRUTH

         This is essential.

         After publication:
         Review must refresh
         My Shift must refresh
      ==================================================== */

      await Promise.allSettled([
        loadRoster(),

        loadMyShift(),
      ]);

      /* ===================================================
         RESULT MESSAGE
      ==================================================== */

      if (
        publishedCount >
        0
      ) {
        setSuccess(
          `${publishedCount} roster${
            publishedCount ===
            1
              ? ""
              : "s"
          } published successfully.${
            skippedCount >
            0
              ? ` ${skippedCount} empty roster${
                  skippedCount ===
                  1
                    ? ""
                    : "s"
                } skipped.`
              : ""
          } Employee schedules are now live.`
        );
      } else if (
        skippedCount >
        0
      ) {
        setSuccess(
          "No roster with shift exceptions required publication. Empty rosters were skipped."
        );
      } else {
        setSuccess(
          "Schedule publication completed."
        );
      }
    } catch (
      requestError
    ) {
      console.error(
        "Schedule publication failed:",
        requestError
      );

      setError(
        requestError
          ?.response
          ?.data
          ?.message ||
        requestError
          ?.message ||
        "Schedule could not be published."
      );
    } finally {
      setActionLoading(
        ""
      );
    }
  };

  /* =======================================================
     DOWNLOAD NIGHT SHIFT PDF
  ======================================================= */

  const downloadNightShiftPdf =
    () => {
      try {
        setError(
          ""
        );

        const nightRecords =
          assignmentDetails.filter(
            (
              item
            ) => {
              if (
                normalize(
                  item?.dayType
                ) !==
                "SHIFT"
              ) {
                return false;
              }

              const shift =
                item?.shift;

              const shiftType =
                normalize(
                  shift?.type
                );

              const shiftCode =
                normalize(
                  shift?.code ||
                  item?.scheduleCode
                );

              return (
                shiftType ===
                  "NIGHT" ||
                Boolean(
                  shift
                    ?.crossesMidnight
                ) ||
                shiftCode.includes(
                  "NIGHT"
                )
              );
            }
          );

        if (
          !nightRecords.length
        ) {
          setError(
            "There are no Night Shift employees for this week."
          );

          return;
        }

        const grouped =
          new Map();

        nightRecords.forEach(
          (
            record
          ) => {
            const employeeId =
              record.employeeId;

            if (
              !grouped.has(
                employeeId
              )
            ) {
              grouped.set(
                employeeId,
                {
                  employeeId,

                  employeeCode:
                    record.employeeCode,

                  employeeName:
                    record.employeeName,

                  department:
                    record.department,

                  office:
                    record.office,

                  dates:
                    [],

                  shiftName:
                    record.scheduleName,

                  startTime:
                    record
                      ?.shift
                      ?.startTime ||
                    "",

                  endTime:
                    record
                      ?.shift
                      ?.endTime ||
                    "",
                }
              );
            }

            grouped
              .get(
                employeeId
              )
              .dates
              .push(
                record.assignmentDate
              );
          }
        );

        const records =
          [
            ...grouped.values(),
          ].sort(
            (
              a,
              b
            ) =>
              String(
                a.employeeName
              ).localeCompare(
                String(
                  b.employeeName
                )
              )
          );

        const escapeHtml =
          (
            value
          ) =>
            String(
              value ??
              ""
            )
              .replaceAll(
                "&",
                "&amp;"
              )
              .replaceAll(
                "<",
                "&lt;"
              )
              .replaceAll(
                ">",
                "&gt;"
              )
              .replaceAll(
                '"',
                "&quot;"
              )
              .replaceAll(
                "'",
                "&#039;"
              );

        const tableRows =
          records
            .map(
              (
                record,
                index
              ) => {
                const dates =
                  [
                    ...record.dates,
                  ]
                    .sort()
                    .map(
                      displayDate
                    )
                    .join(
                      ", "
                    );

                const timing =
                  record.startTime &&
                  record.endTime
                    ? `${record.startTime} - ${record.endTime}`
                    : record.shiftName ||
                      "Night Shift";

                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(record.employeeCode || "—")}</td>
                    <td><strong>${escapeHtml(record.employeeName || "—")}</strong></td>
                    <td>${escapeHtml(record.department || "—")}</td>
                    <td>${escapeHtml(record.office || "—")}</td>
                    <td>${escapeHtml(dates || "—")}</td>
                    <td>${escapeHtml(timing)}</td>
                  </tr>
                `;
              }
            )
            .join(
              ""
            );

        const printableWindow =
          window.open(
            "",
            "_blank",
            "width=1200,height=800"
          );

        if (
          !printableWindow
        ) {
          setError(
            "Popup blocked. Please allow popups to generate the Night Shift PDF."
          );

          return;
        }

        printableWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8" />

              <title>
                Night Shift Schedule - ${escapeHtml(
                  weekLabel(
                    weekStart
                  )
                )}
              </title>

              <style>
                * {
                  box-sizing: border-box;
                }

                @page {
                  size: A4 landscape;
                  margin: 12mm;
                }

                body {
                  margin: 0;
                  padding: 0;
                  font-family:
                    Arial,
                    Helvetica,
                    sans-serif;
                  color: #20262d;
                  background: #ffffff;
                }

                .document {
                  width: 100%;
                }

                .header {
                  padding: 24px 26px;
                  border-radius: 12px;
                  background: #20242b;
                  color: #ffffff;
                }

                .eyebrow {
                  margin-bottom: 7px;
                  font-size: 10px;
                  font-weight: 700;
                  letter-spacing: 1.5px;
                  color: #ff8b94;
                }

                h1 {
                  margin: 0;
                  font-size: 26px;
                }

                .subtitle {
                  margin-top: 7px;
                  font-size: 12px;
                  color: #cbd0d6;
                }

                .meta {
                  display: flex;
                  gap: 12px;
                  margin-top: 18px;
                }

                .meta-box {
                  min-width: 180px;
                  padding: 10px 13px;
                  border: 1px solid rgba(255,255,255,0.16);
                  border-radius: 8px;
                  background: rgba(255,255,255,0.06);
                }

                .meta-label {
                  display: block;
                  margin-bottom: 4px;
                  font-size: 8px;
                  font-weight: 700;
                  letter-spacing: 1px;
                  text-transform: uppercase;
                  color: #aeb5bd;
                }

                .meta-value {
                  font-size: 12px;
                  font-weight: 700;
                }

                .section {
                  margin-top: 20px;
                }

                .section-label {
                  margin-bottom: 8px;
                  font-size: 9px;
                  font-weight: 700;
                  letter-spacing: 1.2px;
                  color: #e30613;
                }

                table {
                  width: 100%;
                  border-collapse: collapse;
                }

                th {
                  padding: 10px;
                  border: 1px solid #dce1e6;
                  background: #f4f6f8;
                  text-align: left;
                  font-size: 9px;
                  text-transform: uppercase;
                  color: #66717c;
                }

                td {
                  padding: 11px 10px;
                  border: 1px solid #e1e5e9;
                  font-size: 10px;
                }

                tbody tr:nth-child(even) {
                  background: #fafbfc;
                }

                .footer {
                  display: flex;
                  justify-content: space-between;
                  margin-top: 18px;
                  padding-top: 10px;
                  border-top: 1px solid #e1e5e9;
                  font-size: 8px;
                  color: #8b949e;
                }

                @media print {
                  .header,
                  th,
                  tbody tr:nth-child(even) {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                }
              </style>
            </head>

            <body>

              <div class="document">

                <div class="header">

                  <div class="eyebrow">
                    SE-RMS · PEOPLE · ATTENDANCE
                  </div>

                  <h1>
                    Night Shift Schedule
                  </h1>

                  <div class="subtitle">
                    Weekly Night Shift employee schedule
                  </div>

                  <div class="meta">

                    <div class="meta-box">
                      <span class="meta-label">
                        Schedule Week
                      </span>

                      <span class="meta-value">
                        ${escapeHtml(
                          weekLabel(
                            weekStart
                          )
                        )}
                      </span>
                    </div>

                    <div class="meta-box">
                      <span class="meta-label">
                        Night Shift Employees
                      </span>

                      <span class="meta-value">
                        ${records.length}
                      </span>
                    </div>

                    <div class="meta-box">
                      <span class="meta-label">
                        Schedule Status
                      </span>

                      <span class="meta-value">
                        ${escapeHtml(
                          rosterStatus ||
                          "DRAFT"
                        )}
                      </span>
                    </div>

                  </div>

                </div>

                <div class="section">

                  <div class="section-label">
                    NIGHT SHIFT EMPLOYEES
                  </div>

                  <table>

                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Employee Code</th>
                        <th>Employee</th>
                        <th>Department</th>
                        <th>Office</th>
                        <th>Night Shift Dates</th>
                        <th>Timing</th>
                      </tr>
                    </thead>

                    <tbody>
                      ${tableRows}
                    </tbody>

                  </table>

                </div>

                <div class="footer">

                  <span>
                    SE-RMS · Shift Management
                  </span>

                  <span>
                    Generated ${escapeHtml(
                      new Intl.DateTimeFormat(
                        "en-IN",
                        {
                          day:
                            "2-digit",

                          month:
                            "short",

                          year:
                            "numeric",

                          hour:
                            "2-digit",

                          minute:
                            "2-digit",
                        }
                      ).format(
                        new Date()
                      )
                    )}
                  </span>

                </div>

              </div>

              <script>
                window.onload =
                  function () {
                    setTimeout(
                      function () {
                        window.print();
                      },
                      250
                    );
                  };
              </script>

            </body>
          </html>
        `);

        printableWindow
          .document
          .close();
      } catch (
        pdfError
      ) {
        console.error(
          "Night Shift PDF failed:",
          pdfError
        );

        setError(
          "Night Shift PDF could not be generated."
        );
      }
    };

  /* =======================================================
     SAVE SHIFT MASTER
  ======================================================= */

  const saveShift =
    async (
      form
    ) => {
      try {
        setShiftSaving(
          true
        );

        setError(
          ""
        );

        setSuccess(
          ""
        );

        if (
          editingShift
            ?._id
        ) {
          await updateAttendanceShift(
            editingShift._id,
            form
          );
        } else {
          await createAttendanceShift(
            form
          );
        }

        setShiftDrawerOpen(
          false
        );

        setSuccess(
          editingShift
            ? "Shift updated successfully."
            : "Shift created successfully."
        );

        setEditingShift(
          null
        );

        await loadShifts();
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
          "Shift could not be saved."
        );
      } finally {
        setShiftSaving(
          false
        );
      }
    };

  /* =======================================================
     DRILLDOWN TITLE
  ======================================================= */

  /* =======================================================
     DRILLDOWN TITLE
  ======================================================= */

  const drilldownTitle =
    drilldown ===
      "EMPLOYEES"
      ? "Assigned Employees"
      : drilldown ===
          "ASSIGNMENTS"
        ? "Exception Entries"
        : "Department Rosters";

  const drilldownDescription =
    drilldown ===
      "EMPLOYEES"
      ? "Employees with at least one shift exception during this week."
      : drilldown ===
          "ASSIGNMENTS"
        ? "Every employee and date where a weekly exception has been recorded."
        : "Department-level weekly rosters created for this schedule.";

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="se-shift-page">

      {/* ===================================================
          HEADER
      ==================================================== */}

      <header className="se-shift-header">

        <div className="se-shift-header-left">

          <button
            type="button"
            className="se-shift-back"
            onClick={() =>
              navigate(
                "/dashboard?app=people&page=attendance"
              )
            }
            aria-label="Back to Attendance"
          >
            ←
          </button>

          <div>

            <span>
              PEOPLE · ATTENDANCE · SHIFT
            </span>

            <h1>
              Shift Management
            </h1>

            <p>
              Weekly shift exceptions, review and publishing.
            </p>

          </div>

        </div>

        <div className="se-shift-header-actions">

          <button
            type="button"
            className="se-shift-refresh"
            disabled={
              refreshing
            }
            onClick={() =>
              loadPage(
                true
              )
            }
          >
            {refreshing
              ? "Refreshing..."
              : "↻ Refresh"}
          </button>

        </div>

      </header>

      {/* ===================================================
          NAVIGATION
      ==================================================== */}

      <nav className="se-shift-tabs se-shift-tabs-v7">

        <button
          type="button"
          className={
            view ===
            "MY_SHIFT"
              ? "active"
              : ""
          }
          onClick={() =>
            setView(
              "MY_SHIFT"
            )
          }
        >

          <span>
            ◷
          </span>

          <div>

            <strong>
              My Shift
            </strong>

            <small>
              Published schedule
            </small>

          </div>

        </button>

        {access
          .canManageRoster ? (
          <button
            type="button"
            className={
              view ===
              "ASSIGN"
                ? "active"
                : ""
            }
            onClick={() =>
              setView(
                "ASSIGN"
              )
            }
          >

            <span>
              +
            </span>

            <div>

              <strong>
                Assign
              </strong>

              <small>
                Shift exceptions
              </small>

            </div>

          </button>
        ) : null}

        {access
          .canViewTeam ? (
          <button
            type="button"
            className={
              view ===
              "REVIEW"
                ? "active"
                : ""
            }
            onClick={() =>
              setView(
                "REVIEW"
              )
            }
          >

            <span>
              ▦
            </span>

            <div>

              <strong>
                Review
              </strong>

              <small>
                Weekly roster
              </small>

            </div>

          </button>
        ) : null}

        {access
          .canManageShiftMaster ? (
          <button
            type="button"
            className={
              view ===
              "SHIFT_MASTER"
                ? "active"
                : ""
            }
            onClick={() =>
              setView(
                "SHIFT_MASTER"
              )
            }
          >

            <span>
              ⚙
            </span>

            <div>

              <strong>
                Shift Master
              </strong>

              <small>
                Timing setup
              </small>

            </div>

          </button>
        ) : null}

      </nav>

      {/* ===================================================
          CONTENT
      ==================================================== */}

      <section className="se-shift-content">

        {/* =================================================
            ERROR
        ================================================== */}

        {error ? (
          <div className="se-shift-alert error">

            <span>
              !
            </span>

            <div>

              <strong>
                Action required
              </strong>

              <p>
                {error}
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

        {/* =================================================
            SUCCESS
        ================================================== */}

        {success ? (
          <div className="se-shift-alert success">

            <span>
              ✓
            </span>

            <div>

              <strong>
                Updated
              </strong>

              <p>
                {success}
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setSuccess(
                  ""
                )
              }
            >
              ×
            </button>

          </div>
        ) : null}

        {/* =================================================
            WEEK NAVIGATION
        ================================================== */}

        <ShiftWeekNavigator
          weekStart={
            weekStart
          }
          onChange={
            setWeekStart
          }
          onToday={() =>
            setWeekStart(
              thisWeek
            )
          }
        />

        {/* =================================================
            MY SHIFT
        ================================================== */}

        {view ===
        "MY_SHIFT" ? (
          <>

            <section className="se-shift-clean-heading">

              <div>

                <span>
                  MY SCHEDULE
                </span>

                <h2>
                  {weekLabel(
                    weekStart
                  )}
                </h2>

                <p>
                  Your published weekly schedule. Days without an exception continue on your normal day shift.
                </p>

              </div>

              <aside>

                <small>
                  VIEW
                </small>

                <strong>
                  Published schedule
                </strong>

              </aside>

            </section>

            <MyShiftWeek
              weekStart={
                weekStart
              }
              assignments={
                Array.isArray(
                  myAssignments
                )
                  ? myAssignments
                  : []
              }
              shifts={
                safeShifts
              }
              loading={
                loading
              }
            />

            <section className="se-shift-default-info">

              <span>
                ☀
              </span>

              <div>

                <small>
                  STANDARD RULE
                </small>

                <strong>
                  No exception means normal day shift
                </strong>

                <p>
                  Night Shift, Week Off and Holiday appear only when specifically assigned.
                </p>

              </div>

            </section>

          </>
        ) : null}

        {/* =================================================
            ASSIGN
        ================================================== */}

        {view ===
          "ASSIGN" &&
        access
          .canManageRoster ? (
          <>

            <section className="se-shift-clean-heading">

              <div>

                <span>
                  WEEKLY ASSIGNMENT
                </span>

                <h2>
                  Assign only exceptions
                </h2>

                <p>
                  Day shift remains automatic. Assign Night Shift, Week Off or Holiday only where the normal schedule changes.
                </p>

              </div>

              <aside>

                <small>
                  WEEK
                </small>

                <strong>
                  {weekLabel(
                    weekStart
                  )}
                </strong>

              </aside>

            </section>

            {/* ===============================================
                CLICKABLE KPI CARDS
            ================================================ */}

            <section className="se-shift-assignment-overview se-shift-assignment-overview-v7">

              <button
                type="button"
                className="se-shift-kpi-card"
                onClick={() =>
                  openDrilldown(
                    "EMPLOYEES"
                  )
                }
              >

                <span className="se-shift-metric-icon">
                  ◐
                </span>

                <div>

                  <small>
                    ASSIGNED EMPLOYEES
                  </small>

                  <strong>
                    {
                      assignedEmployees
                        .length
                    }
                  </strong>

                  <p>
                    Employees with weekly exceptions
                  </p>

                </div>

                <span className="se-shift-kpi-arrow">
                  →
                </span>

              </button>

              <button
                type="button"
                className="se-shift-kpi-card"
                onClick={() =>
                  openDrilldown(
                    "ASSIGNMENTS"
                  )
                }
              >

                <span className="se-shift-metric-icon">
                  ▦
                </span>

                <div>

                  <small>
                    EXCEPTION ENTRIES
                  </small>

                  <strong>
                    {
                      assignmentDetails
                        .length
                    }
                  </strong>

                  <p>
                    Employee/date assignments
                  </p>

                </div>

                <span className="se-shift-kpi-arrow">
                  →
                </span>

              </button>

              <button
                type="button"
                className="se-shift-kpi-card"
                onClick={() =>
                  openDrilldown(
                    "ROSTERS"
                  )
                }
              >

                <span className="se-shift-metric-icon">
                  ◎
                </span>

                <div>

                  <small>
                    DEPARTMENT ROSTERS
                  </small>

                  <strong>
                    {
                      departmentRosterDetails
                        .length
                    }
                  </strong>

                  <p>
                    Departments scheduled this week
                  </p>

                </div>

                <span className="se-shift-kpi-arrow">
                  →
                </span>

              </button>

            </section>

            {/* ===============================================
                PRIMARY ASSIGN ACTION
            ================================================ */}

            <section className="se-shift-primary-assignment">

              <div className="se-shift-primary-assignment-icon">
                +
              </div>

              <div>

                <span>
                  SHIFT EXCEPTION
                </span>

                <h3>
                  Assign employees
                </h3>

                <p>
                  Select departments, employees and dates in one focused form. Identical schedules are automatically skipped.
                </p>

              </div>

              <button
                type="button"
                disabled={
                  !editable ||
                  actionLoading ===
                    "ASSIGN"
                }
                onClick={() =>
                  setAssignmentModalOpen(
                    true
                  )
                }
              >
                + Assign Shift
              </button>

            </section>

            {/* ===============================================
                REVIEW SHORTCUT
            ================================================ */}

            {safeAssignments
              .length ? (
              <section className="se-shift-review-preview">

                <div>

                  <span>
                    CURRENT WEEK
                  </span>

                  <strong>
                    {safeAssignments.length} schedule exception{safeAssignments.length === 1 ? "" : "s"} recorded
                  </strong>

                  <p>
                    Review existing assignments or make an intentional correction to an employee/date schedule.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setView(
                      "REVIEW"
                    )
                  }
                >
                  Review Roster →
                </button>

              </section>
            ) : (
              <section className="se-shift-empty-week">

                <span>
                  ▦
                </span>

                <div>

                  <strong>
                    No exceptions assigned yet
                  </strong>

                  <p>
                    Employees continue on their normal day shift until an exception is assigned.
                  </p>

                </div>

              </section>
            )}

          </>
        ) : null}

        {/* =================================================
            REVIEW
        ================================================== */}

        {view ===
          "REVIEW" &&
        access
          .canViewTeam ? (
          <>

            <section className="se-shift-clean-heading">

              <div>

                <span>
                  WEEKLY ROSTER
                </span>

                <h2>
                  Review and correct
                </h2>

                <p>
                  Search employees, inspect their week and make individual corrections only when required.
                </p>

              </div>

              <aside>

                <small>
                  ROSTER STATUS
                </small>

                <strong>
                  {
                    rosterStatus
                  }
                </strong>

              </aside>

            </section>

            {/* ===============================================
                REVIEW SUMMARY
            ================================================ */}

            <ShiftSummary
              employees={
                safeEmployees
              }
              assignments={
                mergedAssignments
              }
              roster={
                roster
              }
            />

            {/* ===============================================
                REVIEW FILTERS
            ================================================ */}

            <section className="se-shift-review-toolbar se-shift-review-toolbar-v7">

              <label className="search">

                <span>
                  SEARCH
                </span>

                <input
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
                  placeholder="Employee name or code"
                />

              </label>

              <label>

                <span>
                  DEPARTMENT
                </span>

                <select
                  value={
                    department
                  }
                  onChange={(
                    event
                  ) =>
                    setDepartment(
                      event
                        .target
                        .value
                    )
                  }
                >

                  <option value="">
                    All Departments
                  </option>

                  {departments.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item
                            .value
                        }
                        value={
                          item
                            .value
                        }
                      >
                        {
                          item
                            .label
                        }
                      </option>
                    )
                  )}

                </select>

              </label>

              <label>

                <span>
                  OFFICE
                </span>

                <select
                  value={
                    office
                  }
                  onChange={(
                    event
                  ) =>
                    setOffice(
                      event
                        .target
                        .value
                    )
                  }
                >

                  <option value="">
                    All Offices
                  </option>

                  {offices.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item
                            .value
                        }
                        value={
                          item
                            .value
                        }
                      >
                        {
                          item
                            .label
                        }
                      </option>
                    )
                  )}

                </select>

              </label>

              {(search ||
                department ||
                office) ? (
                <button
                  type="button"
                  className="se-shift-clear-filter"
                  onClick={() => {
                    setSearch(
                      ""
                    );

                    setDepartment(
                      ""
                    );

                    setOffice(
                      ""
                    );
                  }}
                >
                  Clear
                </button>
              ) : null}

            </section>

            {/* ===============================================
                EMPLOYEE COUNT
            ================================================ */}

            <div className="se-shift-review-count se-shift-review-count-v7">

              <div>

                <span>
                  EMPLOYEE SCHEDULE
                </span>

                <strong>
                  {filteredEmployees.length} employees
                </strong>

              </div>

              <div>

                <span>
                  Showing{" "}
                  {filteredEmployees
                    .length
                    ? (
                        safeReviewPage -
                        1
                      ) *
                        REVIEW_PAGE_SIZE +
                      1
                    : 0}
                  {" – "}
                  {Math.min(
                    safeReviewPage *
                      REVIEW_PAGE_SIZE,

                    filteredEmployees
                      .length
                  )}
                </span>

                <small>
                  50 per page
                </small>

              </div>

            </div>

            {/* ===============================================
                GRID

                IMPORTANT:
                selectedEmployees MUST be passed because your
                current ShiftRosterGrid calls .map() on it.

                CSS below hides the obsolete checkbox column.
            ================================================ */}

            <ShiftRosterGrid
              weekStart={
                weekStart
              }
              employees={
                Array.isArray(
                  reviewEmployees
                )
                  ? reviewEmployees
                  : []
              }
              assignments={
                Array.isArray(
                  mergedAssignments
                )
                  ? mergedAssignments
                  : []
              }
              shifts={
                safeShifts
              }
              editable={
                editable
              }
              selectedEmployees={
                []
              }
              onToggleEmployee={() => {}}
              onAssignmentChange={
                changeAssignment
              }
            />

            {/* ===============================================
                UNSAVED CORRECTIONS
            ================================================ */}

            {dirtyAssignments
              .size ? (
              <div className="se-shift-unsaved-bar se-shift-unsaved-bar-v7">

                <div>

                  <strong>
                    {dirtyAssignments.size} unsaved correction{dirtyAssignments.size === 1 ? "" : "s"}
                  </strong>

                  <span>
                    Save these changes before leaving Review.
                  </span>

                </div>

                <button
                  type="button"
                  disabled={
                    actionLoading ===
                    "SAVE"
                  }
                  onClick={
                    saveReviewCorrections
                  }
                >
                  {actionLoading ===
                  "SAVE"
                    ? "Saving..."
                    : "Save Corrections"}
                </button>

              </div>
            ) : null}

            {/* ===============================================
                PAGINATION
            ================================================ */}

            {reviewPages >
            1 ? (
              <div className="se-shift-review-pagination">

                <button
                  type="button"
                  disabled={
                    safeReviewPage <=
                    1
                  }
                  onClick={() =>
                    setReviewPage(
                      (
                        current
                      ) =>
                        Math.max(
                          1,

                          current -
                            1
                        )
                    )
                  }
                >
                  ← Previous
                </button>

                <span>
                  Page{" "}
                  <strong>
                    {
                      safeReviewPage
                    }
                  </strong>
                  {" of "}
                  <strong>
                    {
                      reviewPages
                    }
                  </strong>
                </span>

                <button
                  type="button"
                  disabled={
                    safeReviewPage >=
                    reviewPages
                  }
                  onClick={() =>
                    setReviewPage(
                      (
                        current
                      ) =>
                        Math.min(
                          reviewPages,

                          current +
                            1
                        )
                    )
                  }
                >
                  Next →
                </button>

              </div>
            ) : null}

            <ShiftLegend
              shifts={
                safeShifts
              }
            />

            {/* ===============================================
                FINAL WORKFLOW
            ================================================ */}

            {safeRosters
              .length ? (
              <section className="se-shift-final-workflow">

                <div>

                  <span>
                    WEEKLY WORKFLOW
                  </span>

                  <strong>
                    Finalize weekly schedule
                  </strong>

                  <p>
                    Submit completed department rosters for review. HR publishes the final schedule used by attendance processing.
                  </p>

                </div>

               <div className="se-shift-final-workflow-actions">

  {assignmentDetails.some(
    (
      item
    ) => {
      if (
        normalize(
          item?.dayType
        ) !==
        "SHIFT"
      ) {
        return false;
      }

      return (
        normalize(
          item
            ?.shift
            ?.type
        ) ===
          "NIGHT" ||
        Boolean(
          item
            ?.shift
            ?.crossesMidnight
        ) ||
        normalize(
          item
            ?.scheduleCode
        ).includes(
          "NIGHT"
        )
      );
    }
  ) ? (
    <button
      type="button"
      className="download"
      onClick={
        downloadNightShiftPdf
      }
    >
      ↓ Night Shift PDF
    </button>
  ) : null}

 {(access
  .canPublishRoster ||
  access
    .canManageRoster) &&
safeRosters.some(
  (
    item
  ) =>
    normalize(
      item?.status
    ) !==
    "PUBLISHED"
) ? (
  <button
    type="button"
    className="primary"
    disabled={
      actionLoading ===
      "PUBLISH"
    }
    onClick={
      publishAllRosters
    }
  >
    {actionLoading ===
    "PUBLISH"
      ? "Publishing..."
      : "Publish Schedule"}
  </button>
) : null}


  {safeRosters.length >
    0 &&
  safeRosters.every(
    (
      item
    ) =>
      normalize(
        item?.status
      ) ===
      "PUBLISHED"
  ) ? (
    <span className="se-shift-published-state">
      ✓ Published
    </span>
  ) : null}

</div>

              </section>
            ) : (
              <section className="se-shift-workflow-empty">

                <span>
                  i
                </span>

                <p>
                  No department roster exists for this week yet. Assign an exception first.
                </p>

              </section>
            )}

          </>
        ) : null}

        {/* =================================================
            SHIFT MASTER
        ================================================== */}

        {view ===
          "SHIFT_MASTER" &&
        access
          .canManageShiftMaster ? (
          <section className="se-shift-master-page se-shift-master-page-v7">

            <div className="se-shift-section-head">

              <div>

                <span>
                  SHIFT MASTER
                </span>

                <h2>
                  Shift definitions
                </h2>

                <p>
                  Configure working timings used by attendance processing.
                </p>

              </div>

              <button
                type="button"
                className="se-shift-create"
                onClick={() => {
                  setEditingShift(
                    null
                  );

                  setShiftDrawerOpen(
                    true
                  );
                }}
              >
                + Create Shift
              </button>

            </div>

            <div className="se-shift-master-grid">

              {!safeShifts
                .length &&
              !loading ? (
                <div className="se-shift-master-empty">

                  <span>
                    ⚙
                  </span>

                  <strong>
                    No shifts configured
                  </strong>

                  <p>
                    Create your Day and Night shift definitions.
                  </p>

                </div>
              ) : null}

              {safeShifts.map(
                (
                  shift
                ) => (
                  <article
                    key={
                      shift._id
                    }
                    className="se-shift-master-card"
                  >

                    <header>

                      <span>
                        {
                          shift.code
                        }
                      </span>

                      <i
                        className={
                          shift.active
                            ? "active"
                            : ""
                        }
                      />

                    </header>

                    <h3>
                      {
                        shift.name
                      }
                    </h3>

                    <strong>
                      {
                        shift.startTime
                      }
                      {" → "}
                      {
                        shift.endTime
                      }
                    </strong>

                    <p>
                      {
                        shift.type
                      }

                      {shift
                        .crossesMidnight
                        ? " · Crosses midnight"
                        : ""}
                    </p>

                    <footer>

                      <span>
                        {
                          shift.requiredMinutes ||
                          0
                        }{" "}
                        min
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingShift(
                            shift
                          );

                          setShiftDrawerOpen(
                            true
                          );
                        }}
                      >
                        Edit
                      </button>

                    </footer>

                  </article>
                )
              )}

            </div>

          </section>
        ) : null}

      </section>

      {/* ===================================================
          ASSIGNMENT MODAL
      ==================================================== */}

      <ShiftAssignmentForm
        open={
          assignmentModalOpen
        }
        onClose={() =>
          setAssignmentModalOpen(
            false
          )
        }
        employees={
          safeEmployees
        }
        weekStart={
          weekStart
        }
        nightShift={
          nightShift
        }
        editable={
          editable
        }
        applying={
          actionLoading ===
          "ASSIGN"
        }
        onApply={
          applyQuickAssignment
        }
      />

      {/* ===================================================
          SHIFT MASTER DRAWER
      ==================================================== */}

      <ShiftMasterDrawer
        open={
          shiftDrawerOpen
        }
        shift={
          editingShift
        }
        saving={
          shiftSaving
        }
        onClose={() => {
          setShiftDrawerOpen(
            false
          );

          setEditingShift(
            null
          );
        }}
        onSave={
          saveShift
        }
      />

      {/* ===================================================
          KPI DRILL DOWN DRAWER
      ==================================================== */}

      {drilldown ? (
        <div
          className="se-shift-drilldown-backdrop"
          onMouseDown={
            closeDrilldown
          }
        >

          <aside
            className="se-shift-drilldown"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            {/* =============================================
                DRAWER HEADER
            ============================================== */}

            <header className="se-shift-drilldown-header">

              <div>

                <span>
                  WEEKLY ROSTER
                </span>

                <h2>
                  {
                    drilldownTitle
                  }
                </h2>

                <p>
                  {weekLabel(
                    weekStart
                  )}
                </p>

              </div>

              <button
                type="button"
                onClick={
                  closeDrilldown
                }
                aria-label="Close"
              >
                ×
              </button>

            </header>

            {/* =============================================
                DRAWER SUMMARY
            ============================================== */}

            <section className="se-shift-drilldown-summary">

              <div>

                <small>
                  TOTAL
                </small>

                <strong>
                  {
                    drilldownRecords
                      .length
                  }
                </strong>

              </div>

              <p>
                {
                  drilldownDescription
                }
              </p>

            </section>

            {/* =============================================
                DRAWER BODY
            ============================================== */}

            <div className="se-shift-drilldown-body">

              {!drilldownRecords
                .length ? (
                <div className="se-shift-drilldown-empty">

                  <span>
                    ▦
                  </span>

                  <strong>
                    No records
                  </strong>

                  <p>
                    Nothing has been assigned for this week yet.
                  </p>

                </div>
              ) : null}

              {/* ===========================================
                  ASSIGNED EMPLOYEES
              ============================================ */}

              {drilldown ===
              "EMPLOYEES" ? (
                <div className="se-shift-drilldown-list">

                  {pagedDrilldownRecords.map(
                    (
                      employee
                    ) => {
                      const id =
                        employeeIdOf(
                          employee
                        );

                      const count =
                        assignmentDetails.filter(
                          (
                            item
                          ) =>
                            item
                              .employeeId ===
                            id
                        ).length;

                      return (
                        <button
                          type="button"
                          className="se-shift-drilldown-person"
                          key={
                            id
                          }
                          onClick={() =>
                            openEmployeeReview(
                              employee
                            )
                          }
                        >

                          <span className="avatar">
                            {getInitials(
                              getEmployeeName(
                                employee
                              )
                            )}
                          </span>

                          <div>

                            <strong>
                              {getEmployeeName(
                                employee
                              )}
                            </strong>

                            <small>

                              {
                                employee
                                  ?.employeeCode ||
                                "—"
                              }

                              {" · "}

                              {
                                getEmployeeDepartmentLabel(
                                  employee
                                ) ||
                                "No Department"
                              }

                            </small>

                          </div>

                          <aside>

                            <strong>
                              {
                                count
                              }
                            </strong>

                            <small>
                              {count ===
                              1
                                ? "entry"
                                : "entries"}
                            </small>

                          </aside>

                          <i>
                            →
                          </i>

                        </button>
                      );
                    }
                  )}

                </div>
              ) : null}

              {/* ===========================================
                  EXCEPTION ENTRIES
              ============================================ */}

              {drilldown ===
              "ASSIGNMENTS" ? (
                <div className="se-shift-drilldown-table-wrap">

                  <table className="se-shift-drilldown-table">

                    <thead>

                      <tr>

                        <th>
                          Employee
                        </th>

                        <th>
                          Date
                        </th>

                        <th>
                          Assignment
                        </th>

                        <th>
                          Timing
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {pagedDrilldownRecords.map(
                        (
                          item,
                          index
                        ) => (
                          <tr
                            key={
                              `${item.employeeId}-${item.assignmentDate}-${index}`
                            }
                            onClick={() => {
                              if (
                                item
                                  .employee
                              ) {
                                openEmployeeReview(
                                  item.employee
                                );
                              }
                            }}
                          >

                            <td>

                              <strong>
                                {
                                  item
                                    .employeeName
                                }
                              </strong>

                              <small>

                                {
                                  item
                                    .employeeCode
                                }

                                {" · "}

                                {
                                  item
                                    .department
                                }

                              </small>

                            </td>

                            <td>
                              {displayDate(
                                item
                                  .assignmentDate
                              )}
                            </td>

                            <td>

                              <span
                                className={
                                  `se-shift-type-pill ${item.dayType.toLowerCase()}`
                                }
                              >
                                {
                                  item
                                    .scheduleCode
                                }
                              </span>

                              {
                                item
                                  .scheduleName
                              }

                            </td>

                            <td>

                              {item
                                .shift ? (
                                <>
                                  {
                                    item
                                      .shift
                                      ?.startTime ||
                                    "—"
                                  }

                                  {" → "}

                                  {
                                    item
                                      .shift
                                      ?.endTime ||
                                    "—"
                                  }
                                </>
                              ) : (
                                "—"
                              )}

                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>
              ) : null}

              {/* ===========================================
                  DEPARTMENT ROSTERS
              ============================================ */}

              {drilldown ===
              "ROSTERS" ? (
                <div className="se-shift-drilldown-list">

                  {pagedDrilldownRecords.map(
                    (
                      item,
                      index
                    ) => (
                      <button
                        type="button"
                        className="se-shift-department-row"
                        key={
                          item
                            ?._id ||
                          `${item.departmentName}-${index}`
                        }
                        onClick={() =>
                          openDepartmentReview(
                            item
                          )
                        }
                      >

                        <span>
                          {getInitials(
                            item
                              .departmentName
                          )}
                        </span>

                        <div>

                          <strong>
                            {
                              item
                                .departmentName
                            }
                          </strong>

                          <small>
                            {item.employeeCount} employee{item.employeeCount === 1 ? "" : "s"} · {item.assignmentCount} exception{item.assignmentCount === 1 ? "" : "s"}
                          </small>

                        </div>

                        <em
                          className={
                            `status ${normalize(
                              item
                                .status ||
                              "DRAFT"
                            ).toLowerCase()}`
                          }
                        >
                          {normalize(
                            item
                              .status ||
                            "DRAFT"
                          )}
                        </em>

                        <i>
                          →
                        </i>

                      </button>
                    )
                  )}

                </div>
              ) : null}

            </div>

            {/* =============================================
                DRILLDOWN PAGINATION
            ============================================== */}

            {drilldownPages >
            1 ? (
              <footer className="se-shift-drilldown-footer">

                <span>
                  Page{" "}
                  {
                    safeDrilldownPage
                  }
                  {" of "}
                  {
                    drilldownPages
                  }
                </span>

                <div>

                  <button
                    type="button"
                    disabled={
                      safeDrilldownPage <=
                      1
                    }
                    onClick={() =>
                      setDrilldownPage(
                        (
                          current
                        ) =>
                          Math.max(
                            1,

                            current -
                              1
                          )
                      )
                    }
                  >
                    ←
                  </button>

                  <button
                    type="button"
                    disabled={
                      safeDrilldownPage >=
                      drilldownPages
                    }
                    onClick={() =>
                      setDrilldownPage(
                        (
                          current
                        ) =>
                          Math.min(
                            drilldownPages,

                            current +
                              1
                          )
                      )
                    }
                  >
                    →
                  </button>

                </div>

              </footer>
            ) : null}

          </aside>

        </div>
      ) : null}

    </main>
  );
}

export default ShiftPage;
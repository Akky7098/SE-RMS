import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   CONSTANTS
========================================================= */

const DAY_LABELS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

/* =========================================================
   DATE HELPERS
========================================================= */

const parseDateKey = (
  value
) => {
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

  return new Date(
    year,
    month - 1,
    day
  );
};

const toDateKey = (
  date
) => {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
      1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
};

const buildWeekDays = (
  weekStart
) => {
  const monday =
    parseDateKey(
      weekStart
    );

  return DAY_LABELS.map(
    (
      label,
      index
    ) => {
      const date =
        new Date(
          monday
        );

      date.setDate(
        monday.getDate() +
        index
      );

      return {
        label,

        value:
          toDateKey(
            date
          ),

        day:
          String(
            date.getDate()
          ).padStart(
            2,
            "0"
          ),
      };
    }
  );
};

/* =========================================================
   EMPLOYEE HELPERS
========================================================= */

const getEmployeeId = (
  employee
) =>
  String(
    employee?._id ||
    employee?.id ||
    ""
  );

const getEmployeeName = (
  employee
) =>
  employee?.fullName ||
  employee?.employeeName ||
  employee?.name ||
  "Employee";

const getEmployeeCode = (
  employee
) =>
  employee?.employeeCode ||
  "";

/* =========================================================
   DEPARTMENT

   IMPORTANT:
   Do NOT force ObjectId here.

   Existing employee API can expose:
   department._id
   departmentId
   departmentName
   orgUnitCode

   Backend will canonicalize to Department ObjectId.
========================================================= */

const getEmployeeDepartment =
  (
    employee
  ) => ({
    value:
      String(
        employee
          ?.department
          ?._id ||
        employee
          ?.departmentId ||
        employee
          ?.departmentName ||
        employee
          ?.orgUnitCode ||
        ""
      ),

    label:
      employee
        ?.department
        ?.name ||
      employee
        ?.departmentName ||
      employee
        ?.orgUnitCode ||
      "",
  });

/* =========================================================
   OFFICE
========================================================= */

const getEmployeeOffice =
  (
    employee
  ) => ({
    value:
      String(
        employee
          ?.office
          ?._id ||
        employee
          ?.officeId ||
        employee
          ?.workLocation ||
        ""
      ),

    label:
      employee
        ?.office
        ?.name ||
      employee
        ?.officeName ||
      employee
        ?.workLocation ||
      "",
  });

/* =========================================================
   UNIQUE OPTIONS
========================================================= */

const uniqueOptions = (
  items
) => {
  const map =
    new Map();

  items.forEach(
    (
      item
    ) => {
      if (
        item?.value &&
        item?.label
      ) {
        map.set(
          String(
            item.value
          ),
          item.label
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
};

/* =========================================================
   COMPONENT
========================================================= */

function ShiftAssignmentForm({
  open,

  onClose,

  employees = [],

  weekStart,

  nightShift,

  editable = false,

  applying = false,

  onApply,
}) {
  /* =====================================================
     TYPE
  ===================================================== */

  const [
    assignmentType,
    setAssignmentType,
  ] =
    useState(
      "NIGHT_SHIFT"
    );

  /* =====================================================
     SEARCH
  ===================================================== */

  const [
    search,
    setSearch,
  ] =
    useState(
      ""
    );

  /* =====================================================
     MULTIPLE DEPARTMENTS
  ===================================================== */

  const [
    selectedDepartments,
    setSelectedDepartments,
  ] =
    useState(
      []
    );

  const [
    departmentMenuOpen,
    setDepartmentMenuOpen,
  ] =
    useState(
      false
    );

  /* =====================================================
     OFFICE
  ===================================================== */

  const [
    office,
    setOffice,
  ] =
    useState(
      ""
    );

  /* =====================================================
     EMPLOYEES / DATES
  ===================================================== */

  const [
    selectedEmployeeIds,
    setSelectedEmployeeIds,
  ] =
    useState(
      []
    );

  const [
    selectedDates,
    setSelectedDates,
  ] =
    useState(
      []
    );

  /* =====================================================
     RESET
  ===================================================== */

  useEffect(
    () => {
      if (
        open
      ) {
        setAssignmentType(
          "NIGHT_SHIFT"
        );

        setSearch(
          ""
        );

        setSelectedDepartments(
          []
        );

        setDepartmentMenuOpen(
          false
        );

        setOffice(
          ""
        );

        setSelectedEmployeeIds(
          []
        );

        setSelectedDates(
          []
        );
      }
    },
    [
      open,
    ]
  );

  /* =====================================================
     ESC CLOSE
  ===================================================== */

  useEffect(
    () => {
      if (
        !open
      ) {
        return undefined;
      }

      const handler =
        (
          event
        ) => {
          if (
            event.key ===
            "Escape"
          ) {
            onClose?.();
          }
        };

      window.addEventListener(
        "keydown",
        handler
      );

      return () =>
        window.removeEventListener(
          "keydown",
          handler
        );
    },
    [
      open,
      onClose,
    ]
  );

  /* =====================================================
     WEEK
  ===================================================== */

  const weekDays =
    useMemo(
      () =>
        buildWeekDays(
          weekStart
        ),
      [
        weekStart,
      ]
    );

  /* =====================================================
     DEPARTMENTS
  ===================================================== */

  const departments =
    useMemo(
      () =>
        uniqueOptions(
          employees.map(
            getEmployeeDepartment
          )
        ),
      [
        employees,
      ]
    );

  /* =====================================================
     OFFICES
  ===================================================== */

  const offices =
    useMemo(
      () =>
        uniqueOptions(
          employees.map(
            getEmployeeOffice
          )
        ),
      [
        employees,
      ]
    );

  /* =====================================================
     EMPLOYEE MAP
  ===================================================== */

  const employeeMap =
    useMemo(
      () => {
        const map =
          new Map();

        employees.forEach(
          (
            employee
          ) => {
            map.set(
              getEmployeeId(
                employee
              ),
              employee
            );
          }
        );

        return map;
      },
      [
        employees,
      ]
    );

  /* =====================================================
     DEPARTMENT LABEL MAP
  ===================================================== */

  const departmentMap =
    useMemo(
      () => {
        const map =
          new Map();

        departments.forEach(
          (
            item
          ) => {
            map.set(
              String(
                item.value
              ),
              item.label
            );
          }
        );

        return map;
      },
      [
        departments,
      ]
    );

  /* =====================================================
     TOGGLE DEPARTMENT
  ===================================================== */

  const toggleDepartment =
  (
    value
  ) => {
    const id =
      String(
        value
      );

    setSelectedDepartments(
      (
        current
      ) => {
        if (
          current.includes(
            id
          )
        ) {
          return current.filter(
            (
              item
            ) =>
              item !==
              id
          );
        }

        return [
          ...current,
          id,
        ];
      }
    );

    /*
     * Department scope changed.
     * Clear employee selection so an employee from an old
     * department cannot remain selected.
     */

    setSelectedEmployeeIds(
      []
    );

    setSearch(
      ""
    );

    /*
     * CLOSE DROPDOWN IMMEDIATELY AFTER ONE SELECTION.
     *
     * User can open it again to add another department.
     */

    setDepartmentMenuOpen(
      false
    );
  };

  /* =====================================================
     REMOVE DEPARTMENT
  ===================================================== */

  const removeDepartment =
    (
      value
    ) => {
      const id =
        String(
          value
        );

      setSelectedDepartments(
        (
          current
        ) =>
          current.filter(
            (
              item
            ) =>
              item !==
              id
          )
      );

      setSelectedEmployeeIds(
        []
      );
    };

  /* =====================================================
     FILTER EMPLOYEES

     Union of all selected departments.
  ===================================================== */

  const matchingEmployees =
    useMemo(
      () => {
        if (
          !selectedDepartments
            .length
        ) {
          return [];
        }

        const needle =
          search
            .trim()
            .toLowerCase();

        return employees.filter(
          (
            employee
          ) => {
            const department =
              getEmployeeDepartment(
                employee
              );

            const employeeOffice =
              getEmployeeOffice(
                employee
              );

            if (
              !selectedDepartments.includes(
                String(
                  department.value
                )
              )
            ) {
              return false;
            }

            if (
              office &&
              employeeOffice
                .value !==
                office
            ) {
              return false;
            }

            if (
              !needle
            ) {
              return true;
            }

            const text =
              [
                getEmployeeName(
                  employee
                ),

                getEmployeeCode(
                  employee
                ),

                department.label,

                employeeOffice.label,

                employee
                  ?.designation,

                employee
                  ?.designationName,
              ]
                .filter(
                  Boolean
                )
                .join(
                  " "
                )
                .toLowerCase();

            return text.includes(
              needle
            );
          }
        );
      },
      [
        employees,
        selectedDepartments,
        office,
        search,
      ]
    );

  /* =====================================================
     MAX 60 VISIBLE
  ===================================================== */

  const visibleEmployees =
    useMemo(
      () =>
        matchingEmployees.slice(
          0,
          60
        ),
      [
        matchingEmployees,
      ]
    );

  /* =====================================================
     SELECTED EMPLOYEE RECORDS
  ===================================================== */

  const selectedEmployees =
    useMemo(
      () =>
        selectedEmployeeIds
          .map(
            (
              id
            ) =>
              employeeMap.get(
                String(
                  id
                )
              )
          )
          .filter(
            Boolean
          ),
      [
        selectedEmployeeIds,
        employeeMap,
      ]
    );

  /* =====================================================
     TOGGLE EMPLOYEE
  ===================================================== */

  const toggleEmployee =
    (
      id
    ) => {
      const value =
        String(
          id
        );

      setSelectedEmployeeIds(
        (
          current
        ) =>
          current.includes(
            value
          )
            ? current.filter(
                (
                  item
                ) =>
                  item !==
                  value
              )
            : [
                ...current,
                value,
              ]
      );
    };

  /* =====================================================
     SELECT ALL FILTERED
  ===================================================== */

  const selectFiltered =
    () => {
      const ids =
        matchingEmployees.map(
          (
            employee
          ) =>
            getEmployeeId(
              employee
            )
        );

      setSelectedEmployeeIds(
        (
          current
        ) =>
          Array.from(
            new Set([
              ...current,
              ...ids,
            ])
          )
      );
    };

  /* =====================================================
     REMOVE EMPLOYEE
  ===================================================== */

  const removeEmployee =
    (
      id
    ) => {
      setSelectedEmployeeIds(
        (
          current
        ) =>
          current.filter(
            (
              item
            ) =>
              item !==
              String(
                id
              )
          )
      );
    };

  /* =====================================================
     DATE
  ===================================================== */

  const toggleDate =
    (
      value
    ) => {
      setSelectedDates(
        (
          current
        ) =>
          current.includes(
            value
          )
            ? current.filter(
                (
                  item
                ) =>
                  item !==
                  value
              )
            : [
                ...current,
                value,
              ]
      );
    };

  /* =====================================================
     VALIDATION
  ===================================================== */

  const missingDepartments =
    selectedDepartments
      .length ===
    0;

  const missingNightShift =
    assignmentType ===
      "NIGHT_SHIFT" &&
    !nightShift?._id;

  const missingEmployees =
    selectedEmployeeIds
      .length ===
    0;

  const missingDates =
    selectedDates
      .length ===
    0;

  const canApply =
    Boolean(
      editable &&
      !missingDepartments &&
      !missingNightShift &&
      !missingEmployees &&
      !missingDates
    );

  /* =====================================================
     APPLY
  ===================================================== */

  const handleApply =
    async () => {
      if (
        !canApply ||
        applying
      ) {
        return;
      }

      let dayType =
        "SHIFT";

      let shiftId =
        null;

      if (
        assignmentType ===
        "NIGHT_SHIFT"
      ) {
        dayType =
          "SHIFT";

        shiftId =
          nightShift._id;
      }

      if (
        assignmentType ===
        "WEEK_OFF"
      ) {
        dayType =
          "WEEK_OFF";
      }

      if (
        assignmentType ===
        "HOLIDAY"
      ) {
        dayType =
          "HOLIDAY";
      }

      const result =
        await onApply?.({
          employeeIds:
            selectedEmployeeIds,

          departmentValues:
            selectedDepartments,

          dates:
            selectedDates,

          dayType,

          shiftId,

          office:
            office ||
            null,
        });

      /*
       * Close only after successful assignment.
       */

      if (
        result ===
        true
      ) {
        onClose?.();
      }
    };

  /* =====================================================
     ACTION LABEL
  ===================================================== */

  const actionLabel =
    assignmentType ===
      "NIGHT_SHIFT"
      ? "Assign Night Shift"
      : assignmentType ===
          "WEEK_OFF"
        ? "Assign Week Off"
        : "Assign Holiday";

  /* =====================================================
     CLOSED
  ===================================================== */

  if (
    !open
  ) {
    return null;
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div
      className="se-shift-assign-overlay"
      role="presentation"
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose?.();
        }
      }}
    >

      <section
        className="se-shift-assign-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Assign weekly shift"
      >

        {/* =================================================
            HEADER
        ================================================== */}

        <header className="se-shift-assign-modal-header">

          <div>

            <span>
              WEEKLY SHIFT ASSIGNMENT
            </span>

            <h2>
              Assign shift exception
            </h2>

            <p>
              Select one or more departments, choose employees and assign only the days that differ from their normal day shift.
            </p>

          </div>

          <button
            type="button"
            className="se-shift-modal-close"
            onClick={
              onClose
            }
            aria-label="Close"
          >
            ×
          </button>

        </header>

        {/* =================================================
            BODY
        ================================================== */}

        <div className="se-shift-assign-modal-body">

          {/* =================================================
              TYPE
          ================================================== */}

          <div className="se-shift-modal-section">

            <div className="se-shift-modal-section-title">

              <span>
                1
              </span>

              <div>

                <strong>
                  What are you assigning?
                </strong>

                <small>
                  Day shift stays automatic.
                </small>

              </div>

            </div>

            <div className="se-shift-assignment-type-grid">

              <button
                type="button"
                className={
                  assignmentType ===
                  "NIGHT_SHIFT"
                    ? "active night"
                    : ""
                }
                onClick={() =>
                  setAssignmentType(
                    "NIGHT_SHIFT"
                  )
                }
              >

                <span>
                  ☾
                </span>

                <div>

                  <strong>
                    Night Shift
                  </strong>

                  <small>
                    Weekly night duty
                  </small>

                </div>

                <i>
                  {assignmentType ===
                  "NIGHT_SHIFT"
                    ? "✓"
                    : ""}
                </i>

              </button>

              <button
                type="button"
                className={
                  assignmentType ===
                  "WEEK_OFF"
                    ? "active weekoff"
                    : ""
                }
                onClick={() =>
                  setAssignmentType(
                    "WEEK_OFF"
                  )
                }
              >

                <span>
                  W
                </span>

                <div>

                  <strong>
                    Week Off
                  </strong>

                  <small>
                    Weekly off day
                  </small>

                </div>

                <i>
                  {assignmentType ===
                  "WEEK_OFF"
                    ? "✓"
                    : ""}
                </i>

              </button>

              <button
                type="button"
                className={
                  assignmentType ===
                  "HOLIDAY"
                    ? "active holiday"
                    : ""
                }
                onClick={() =>
                  setAssignmentType(
                    "HOLIDAY"
                  )
                }
              >

                <span>
                  H
                </span>

                <div>

                  <strong>
                    Holiday
                  </strong>

                  <small>
                    Special holiday
                  </small>

                </div>

                <i>
                  {assignmentType ===
                  "HOLIDAY"
                    ? "✓"
                    : ""}
                </i>

              </button>

            </div>

            {assignmentType ===
            "NIGHT_SHIFT" ? (
              <div
                className={
                  nightShift
                    ? "se-shift-night-master-info"
                    : "se-shift-night-master-info error"
                }
              >

                <span>
                  ☾
                </span>

                <div>

                  <small>
                    NIGHT SHIFT MASTER
                  </small>

                  <strong>
                    {nightShift
                      ? `${nightShift.name} · ${nightShift.startTime} → ${nightShift.endTime}`
                      : "Night Shift is not configured."}
                  </strong>

                </div>

              </div>
            ) : null}

          </div>

          {/* =================================================
              EMPLOYEE SCOPE
          ================================================== */}

          <div className="se-shift-modal-section">

            <div className="se-shift-modal-section-title">

              <span>
                2
              </span>

              <div>

                <strong>
                  Select employees
                </strong>

                <small>
                  Select one or more departments. Employees from all selected departments will appear below.
                </small>

              </div>

            </div>

            <div className="se-shift-employee-filter-row">

              {/* =============================================
                  MULTI DEPARTMENT
              ============================================== */}

              <div className="se-shift-multi-department">

                <span className="se-shift-filter-label">
                  DEPARTMENTS *
                </span>

                <button
                  type="button"
                  className="se-shift-multi-department-trigger"
                  onClick={() =>
                    setDepartmentMenuOpen(
                      (
                        current
                      ) =>
                        !current
                    )
                  }
                >

                  <span>
                    {selectedDepartments.length
                      ? `${selectedDepartments.length} department${selectedDepartments.length === 1 ? "" : "s"} selected`
                      : "Select Departments"}
                  </span>

                  <i>
                    ▾
                  </i>

                </button>

                {departmentMenuOpen ? (
                  <div className="se-shift-multi-department-menu">

                    <div className="se-shift-multi-department-actions">

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDepartments(
                            departments.map(
                              (
                                item
                              ) =>
                                String(
                                  item.value
                                )
                            )
                          );

                          setSelectedEmployeeIds(
                            []
                          );
                        }}
                      >
                        Select All
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDepartments(
                            []
                          );

                          setSelectedEmployeeIds(
                            []
                          );
                        }}
                      >
                        Clear
                      </button>

                    </div>

                    <div className="se-shift-multi-department-list">

                      {departments.map(
                        (
                          item
                        ) => {
                          const selected =
                            selectedDepartments.includes(
                              String(
                                item.value
                              )
                            );

                          return (
                            <button
                              key={
                                item.value
                              }
                              type="button"
                              className={
                                selected
                                  ? "selected"
                                  : ""
                              }
                              onClick={() =>
                                toggleDepartment(
                                  item.value
                                )
                              }
                            >

                              <span className="check">
                                {selected
                                  ? "✓"
                                  : ""}
                              </span>

                              <strong>
                                {
                                  item.label
                                }
                              </strong>

                            </button>
                          );
                        }
                      )}

                    </div>

                  </div>
                ) : null}

              </div>

              {/* =============================================
                  OFFICE
              ============================================== */}

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
                  ) => {
                    setOffice(
                      event.target.value
                    );

                    setSelectedEmployeeIds(
                      []
                    );
                  }}
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
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {
                          item.label
                        }
                      </option>
                    )
                  )}

                </select>

              </label>

            </div>

            {/* ===============================================
                SELECTED DEPARTMENT CHIPS
            ================================================ */}

            {selectedDepartments
              .length ? (
              <div className="se-shift-selected-departments">

                {selectedDepartments.map(
                  (
                    value
                  ) => (
                    <span
                      key={
                        value
                      }
                    >

                      {departmentMap.get(
                        value
                      ) ||
                        value}

                      <button
                        type="button"
                        onClick={() =>
                          removeDepartment(
                            value
                          )
                        }
                      >
                        ×
                      </button>

                    </span>
                  )
                )}

              </div>
            ) : null}

            {/* ===============================================
                SEARCH
            ================================================ */}

            <div className="se-shift-employee-search">

              <span>
                ⌕
              </span>

              <input
                type="text"
                disabled={
                  !selectedDepartments
                    .length
                }
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder={
                  selectedDepartments.length
                    ? "Search employee name or code..."
                    : "Select department first"
                }
              />

              <strong>
                {
                  selectedEmployeeIds
                    .length
                } selected
              </strong>

            </div>

            {/* ===============================================
                RESULT TOOLBAR
            ================================================ */}

            <div className="se-shift-result-toolbar">

              <div>

                <strong>
                  {selectedDepartments.length
                    ? `${matchingEmployees.length} employees found`
                    : "Select department"}
                </strong>

                {matchingEmployees
                  .length >
                visibleEmployees
                  .length ? (
                  <small>
                    Showing first 60. Search to narrow results.
                  </small>
                ) : null}

              </div>

              <div>

                <button
                  type="button"
                  disabled={
                    !matchingEmployees
                      .length
                  }
                  onClick={
                    selectFiltered
                  }
                >
                  Select All Results
                </button>

                {selectedEmployeeIds
                  .length ? (
                  <button
                    type="button"
                    className="clear"
                    onClick={() =>
                      setSelectedEmployeeIds(
                        []
                      )
                    }
                  >
                    Clear
                  </button>
                ) : null}

              </div>

            </div>

            {/* ===============================================
                EMPLOYEES
            ================================================ */}

            <div className="se-shift-employee-results">

              {!selectedDepartments
                .length ? (
                <div className="se-shift-no-results">

                  <strong>
                    Select one or more departments
                  </strong>

                  <span>
                    Employees from the selected departments will appear here.
                  </span>

                </div>
              ) : null}

              {selectedDepartments
                .length &&
              !visibleEmployees
                .length ? (
                <div className="se-shift-no-results">

                  <strong>
                    No employees found
                  </strong>

                  <span>
                    Change your search or office filter.
                  </span>

                </div>
              ) : null}

              {visibleEmployees.map(
                (
                  employee
                ) => {
                  const id =
                    getEmployeeId(
                      employee
                    );

                  const selected =
                    selectedEmployeeIds.includes(
                      id
                    );

                  const department =
                    getEmployeeDepartment(
                      employee
                    );

                  return (
                    <button
                      key={
                        id
                      }
                      type="button"
                      className={
                        selected
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        toggleEmployee(
                          id
                        )
                      }
                    >

                      <span className="check">
                        {selected
                          ? "✓"
                          : ""}
                      </span>

                      <span className="avatar">
                        {getEmployeeName(
                          employee
                        )
                          .charAt(
                            0
                          )
                          .toUpperCase()}
                      </span>

                      <div>

                        <strong>
                          {getEmployeeName(
                            employee
                          )}
                        </strong>

                        <small>
                          {getEmployeeCode(
                            employee
                          )}

                          {department.label
                            ? ` · ${department.label}`
                            : ""}
                        </small>

                      </div>

                    </button>
                  );
                }
              )}

            </div>

            {/* ===============================================
                SELECTED EMPLOYEES
            ================================================ */}

            {selectedEmployees
              .length ? (
              <div className="se-shift-selected-employees">

                <header>

                  <strong>
                    Selected employees
                  </strong>

                  <span>
                    {
                      selectedEmployees
                        .length
                    }
                  </span>

                </header>

                <div>

                  {selectedEmployees.map(
                    (
                      employee
                    ) => (
                      <span
                        key={
                          getEmployeeId(
                            employee
                          )
                        }
                      >

                        {getEmployeeName(
                          employee
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            removeEmployee(
                              getEmployeeId(
                                employee
                              )
                            )
                          }
                        >
                          ×
                        </button>

                      </span>
                    )
                  )}

                </div>

              </div>
            ) : null}

          </div>

          {/* =================================================
              DATES
          ================================================== */}

          <div className="se-shift-modal-section">

            <div className="se-shift-modal-section-title">

              <span>
                3
              </span>

              <div>

                <strong>
                  Select dates
                </strong>

                <small>
                  Choose the days this exception applies.
                </small>

              </div>

            </div>

            <div className="se-shift-day-actions">

              <button
                type="button"
                onClick={() =>
                  setSelectedDates(
                    weekDays
                      .slice(
                        0,
                        6
                      )
                      .map(
                        (
                          day
                        ) =>
                          day.value
                      )
                  )
                }
              >
                Mon–Sat
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedDates(
                    weekDays.map(
                      (
                        day
                      ) =>
                        day.value
                    )
                  )
                }
              >
                Full Week
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedDates(
                    []
                  )
                }
              >
                Clear
              </button>

            </div>

            <div className="se-shift-popup-days">

              {weekDays.map(
                (
                  day
                ) => {
                  const selected =
                    selectedDates.includes(
                      day.value
                    );

                  return (
                    <button
                      key={
                        day.value
                      }
                      type="button"
                      className={
                        selected
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        toggleDate(
                          day.value
                        )
                      }
                    >

                      <span>
                        {
                          day.label
                        }
                      </span>

                      <strong>
                        {
                          day.day
                        }
                      </strong>

                      <i>
                        {selected
                          ? "✓"
                          : ""}
                      </i>

                    </button>
                  );
                }
              )}

            </div>

          </div>

        </div>

        {/* =================================================
            FOOTER
        ================================================== */}

        <footer className="se-shift-assign-modal-footer">

          <div>

            <small>
              ASSIGNMENT
            </small>

            <strong>
              {selectedEmployeeIds.length} employee
              {selectedEmployeeIds.length ===
              1
                ? ""
                : "s"}
              {" · "}
              {selectedDepartments.length} department
              {selectedDepartments.length ===
              1
                ? ""
                : "s"}
              {" · "}
              {selectedDates.length} day
              {selectedDates.length ===
              1
                ? ""
                : "s"}
            </strong>

            <span>
              {selectedEmployeeIds.length *
                selectedDates.length} schedule entries
            </span>

          </div>

          <div>

            <button
              type="button"
              className="secondary"
              onClick={
                onClose
              }
            >
              Cancel
            </button>

            <button
              type="button"
              className="primary"
              disabled={
                !canApply ||
                applying
              }
              title={
                missingDepartments
                  ? "Select at least one department."
                  : missingNightShift
                    ? "Create Night Shift master first."
                    : missingEmployees
                      ? "Select at least one employee."
                      : missingDates
                        ? "Select at least one date."
                        : ""
              }
              onClick={
                handleApply
              }
            >
              {applying
                ? "Applying..."
                : actionLabel}
            </button>

          </div>

        </footer>

      </section>

    </div>
  );
}

export default ShiftAssignmentForm;
import api from "./api";

/* =========================================================
   RESPONSE
========================================================= */

const responseData = (
  response
) => {
  return (
    response?.data?.data ||
    response?.data ||
    {}
  );
};

/* =========================================================
   RECORDS
========================================================= */

const recordsFrom = (
  data
) => {
  if (
    Array.isArray(
      data
    )
  ) {
    return data;
  }

  return (
    data?.records ||
    data?.items ||
    data?.shifts ||
    data?.rosters ||
    []
  );
};

/* =========================================================
   ID
========================================================= */

const idOf = (
  value
) => {
  if (
    !value
  ) {
    return "";
  }

  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  return String(
    value?._id ||
    value?.id ||
    value?.employeeId ||
    ""
  );
};

/* =========================================================
   ASSIGNMENT EMPLOYEE ID
========================================================= */

const assignmentEmployeeId = (
  assignment
) => {
  return String(
    assignment
      ?.employeeId
      ?._id ||
    assignment
      ?.employeeId ||
    ""
  );
};

/* =========================================================
   ASSIGNMENT KEY

   There can be only one schedule entry for:

   employee + date
========================================================= */

export const shiftAssignmentKey =
  (
    employeeId,
    assignmentDate
  ) => {
    return `${String(
      employeeId ||
      ""
    )}::${String(
      assignmentDate ||
      ""
    )}`;
  };

/* =========================================================
   NORMALIZE ROSTER EMPLOYEE

   Backend detailed roster may return:

   {
     employeeId: ObjectId,
     employeeCode,
     employeeName,
     ...
   }

   Main Employee API returns:

   {
     _id,
     fullName,
     ...
   }

   Normalize so ShiftPage can use either.
========================================================= */

const normalizeRosterEmployee =
  (
    employee
  ) => {
    if (
      !employee
    ) {
      return null;
    }

    const id =
      String(
        employee?._id ||
        employee?.id ||
        employee?.employeeId?._id ||
        employee?.employeeId ||
        ""
      );

    if (
      !id
    ) {
      return null;
    }

    return {
      ...employee,

      _id:
        id,

      id,

      fullName:
        employee?.fullName ||
        employee?.employeeName ||
        employee?.name ||
        "Employee",

      employeeName:
        employee?.employeeName ||
        employee?.fullName ||
        employee?.name ||
        "Employee",
    };
  };

/* =========================================================
   SHIFT MASTER
========================================================= */

export const getAttendanceShifts =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        "/attendance/shifts/master",
        {
          params,
        }
      );

    const data =
      responseData(
        response
      );

    return {
      ...(
        data &&
        typeof data ===
          "object" &&
        !Array.isArray(
          data
        )
          ? data
          : {}
      ),

      records:
        recordsFrom(
          data
        ),

      pagination:
        data?.pagination ||
        {},
    };
  };

/* =========================================================
   CREATE SHIFT MASTER
========================================================= */

export const createAttendanceShift =
  async (
    payload
  ) => {
    const response =
      await api.post(
        "/attendance/shifts/master",
        payload
      );

    const data =
      responseData(
        response
      );

    return (
      data?.shift ||
      data
    );
  };

/* =========================================================
   UPDATE SHIFT MASTER
========================================================= */

export const updateAttendanceShift =
  async (
    shiftId,
    payload
  ) => {
    if (
      !shiftId
    ) {
      throw new Error(
        "Shift ID is required."
      );
    }

    const response =
      await api.patch(
        `/attendance/shifts/master/${shiftId}`,
        payload
      );

    const data =
      responseData(
        response
      );

    return (
      data?.shift ||
      data
    );
  };

/* =========================================================
   ROSTER BY ID
========================================================= */

export const getShiftRosterById =
  async (
    rosterId
  ) => {
    if (
      !rosterId
    ) {
      throw new Error(
        "Roster ID is required."
      );
    }

    const response =
      await api.get(
        `/attendance/shifts/rosters/${rosterId}`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   GET WEEK ROSTERS

   IMPORTANT:

   One week may now contain multiple rosters:

   HR
   ENGINEERING
   OPERATIONS
   DIR_BOARD
   etc.

   This function:

   1. Gets all roster headers for the week.
   2. Fetches every roster detail.
   3. Combines all assignments.
   4. Combines all roster employees.
   5. Prevents duplicate employee/date records.

   Existing ShiftPage can continue calling:

   getShiftRoster({
     weekStart
   })
========================================================= */

export const getShiftRoster =
  async (
    params = {}
  ) => {
    /* =====================================================
       LIST ROSTERS
    ===================================================== */

    const response =
      await api.get(
        "/attendance/shifts/rosters",
        {
          params,
        }
      );

    const data =
      responseData(
        response
      );

    /*
     * Backend may someday directly return detailed roster
     * instead of roster list.
     */
    if (
      data?.roster &&
      Array.isArray(
        data?.assignments
      )
    ) {
      return data;
    }

    const rosterHeaders =
      recordsFrom(
        data
      );

    /* =====================================================
       EMPTY WEEK
    ===================================================== */

    if (
      !rosterHeaders.length
    ) {
      return {
        success:
          true,

        roster:
          null,

        rosters:
          [],

        assignments:
          [],

        employees:
          [],

        calendars:
          [],

        multiRoster:
          false,

        rosterCount:
          0,
      };
    }

    /* =====================================================
       FETCH DETAILS
    ===================================================== */

    const detailResults =
      await Promise.allSettled(
        rosterHeaders
          .filter(
            (
              item
            ) =>
              Boolean(
                item?._id
              )
          )
          .map(
            (
              item
            ) =>
              getShiftRosterById(
                item._id
              )
          )
      );

    const details =
      detailResults
        .filter(
          (
            result
          ) =>
            result.status ===
            "fulfilled"
        )
        .map(
          (
            result
          ) =>
            result.value
        );

    /* =====================================================
       FALLBACK

       If detail route failed, still return roster headers.
    ===================================================== */

    if (
      !details.length
    ) {
      return {
        success:
          true,

        roster:
          rosterHeaders[0] ||
          null,

        rosters:
          rosterHeaders,

        assignments:
          [],

        employees:
          [],

        calendars:
          [],

        multiRoster:
          rosterHeaders.length >
          1,

        rosterCount:
          rosterHeaders.length,
      };
    }

    /* =====================================================
       MERGE ROSTERS
    ===================================================== */

    const rosterMap =
      new Map();

    rosterHeaders.forEach(
      (
        roster
      ) => {
        if (
          roster?._id
        ) {
          rosterMap.set(
            String(
              roster._id
            ),
            roster
          );
        }
      }
    );

    details.forEach(
      (
        detail
      ) => {
        const roster =
          detail?.roster;

        if (
          roster?._id
        ) {
          rosterMap.set(
            String(
              roster._id
            ),
            roster
          );
        }
      }
    );

    const rosters = [
      ...rosterMap.values(),
    ];

    /* =====================================================
       MERGE ASSIGNMENTS

       employeeId + assignmentDate is globally unique.
    ===================================================== */

    const assignmentMap =
      new Map();

    details.forEach(
      (
        detail
      ) => {
        const list =
          Array.isArray(
            detail?.assignments
          )
            ? detail.assignments
            : [];

        list.forEach(
          (
            assignment
          ) => {
            const employeeId =
              assignmentEmployeeId(
                assignment
              );

            const date =
              String(
                assignment
                  ?.assignmentDate ||
                ""
              );

            if (
              !employeeId ||
              !date
            ) {
              return;
            }

            assignmentMap.set(
              shiftAssignmentKey(
                employeeId,
                date
              ),
              assignment
            );
          }
        );
      }
    );

    const assignments = [
      ...assignmentMap.values(),
    ];

    /* =====================================================
       MERGE EMPLOYEES
    ===================================================== */

    const employeeMap =
      new Map();

    details.forEach(
      (
        detail
      ) => {
        const rosterEmployees =
          Array.isArray(
            detail?.employees
          )
            ? detail.employees
            : [];

        rosterEmployees.forEach(
          (
            employee
          ) => {
            const normalized =
              normalizeRosterEmployee(
                employee
              );

            if (
              normalized?._id
            ) {
              employeeMap.set(
                String(
                  normalized._id
                ),
                normalized
              );
            }
          }
        );

        /*
         * Also obtain employees from populated assignment.
         */
        const detailAssignments =
          Array.isArray(
            detail?.assignments
          )
            ? detail.assignments
            : [];

        detailAssignments.forEach(
          (
            assignment
          ) => {
            if (
              assignment
                ?.employeeId &&
              typeof assignment
                .employeeId ===
                "object"
            ) {
              const normalized =
                normalizeRosterEmployee(
                  assignment
                    .employeeId
                );

              if (
                normalized?._id
              ) {
                employeeMap.set(
                  String(
                    normalized._id
                  ),
                  normalized
                );
              }
            }
          }
        );
      }
    );

    /* =====================================================
       CALENDARS
    ===================================================== */

    const calendars =
      details
        .map(
          (
            detail
          ) =>
            detail?.calendar
        )
        .filter(
          Boolean
        );

    /* =====================================================
       AGGREGATE STATUS

       If all rosters have same status, expose it.

       If different departments are at different workflow
       stages, expose MIXED.
    ===================================================== */

    const statuses =
      [
        ...new Set(
          rosters
            .map(
              (
                roster
              ) =>
                String(
                  roster?.status ||
                  ""
                )
                  .trim()
                  .toUpperCase()
            )
            .filter(
              Boolean
            )
        ),
      ];

    const aggregateStatus =
      statuses.length ===
        1
        ? statuses[0]
        : statuses.length >
            1
          ? "MIXED"
          : "DRAFT";

    /*
     * Keep `roster` for compatibility with your current
     * ShiftPage / normalizeRoster logic.
     *
     * `rosters` contains the real complete list.
     */
    const primaryRoster = {
      ...(
        rosters[0] ||
        {}
      ),

      status:
        aggregateStatus,

      rosterCount:
        rosters.length,

      employeeCount:
        employeeMap.size,

      assignmentCount:
        assignments.length,

      isAggregate:
        rosters.length >
        1,
    };

    return {
      success:
        true,

      roster:
        primaryRoster,

      rosters,

      assignments,

      employees: [
        ...employeeMap.values(),
      ],

      calendar:
        calendars[0] ||
        null,

      calendars,

      multiRoster:
        rosters.length >
        1,

      rosterCount:
        rosters.length,

      assignmentCount:
        assignments.length,
    };
  };

/* =========================================================
   MY SHIFT

   Keep current endpoint contract.
========================================================= */

export const getMyShiftWeek =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        "/attendance/shifts/rosters",
        {
          params: {
            ...params,

            mine:
              true,
          },
        }
      );

    const data =
      responseData(
        response
      );

    return {
      ...(
        data &&
        typeof data ===
          "object" &&
        !Array.isArray(
          data
        )
          ? data
          : {}
      ),

      assignments:
        data?.assignments ||
        data?.records ||
        data?.items ||
        [],
    };
  };

/* =========================================================
   CREATE / ENSURE WEEK
========================================================= */

export const ensureShiftRoster =
  async (
    payload
  ) => {
    const response =
      await api.post(
        "/attendance/shifts/rosters",
        payload
      );

    return responseData(
      response
    );
  };

/* =========================================================
   SAVE ONE ASSIGNMENT
========================================================= */

export const saveShiftAssignment =
  async (
    rosterId,
    assignment
  ) => {
    if (
      !rosterId
    ) {
      throw new Error(
        "Roster ID is required."
      );
    }

    const response =
      await api.put(
        `/attendance/shifts/rosters/${rosterId}/assignment`,
        assignment
      );

    return responseData(
      response
    );
  };

/* =========================================================
   SAVE MULTIPLE INDIVIDUAL CHANGES
========================================================= */

export const saveShiftAssignments =
  async (
    rosterId,
    assignments = []
  ) => {
    if (
      !rosterId
    ) {
      throw new Error(
        "Roster ID is required."
      );
    }

    if (
      !Array.isArray(
        assignments
      ) ||
      !assignments.length
    ) {
      return {
        records:
          [],
      };
    }

    const results =
      [];

    for (
      const assignment
      of assignments
    ) {
      const response =
        await saveShiftAssignment(
          rosterId,
          assignment
        );

      results.push(
        response
      );
    }

    return {
      records:
        results,
    };
  };

/* =========================================================
   BULK ASSIGN
========================================================= */

export const bulkAssignShift =
  async (
    rosterId,
    payload
  ) => {
    if (
      !rosterId
    ) {
      throw new Error(
        "Roster ID is required."
      );
    }

    const response =
      await api.post(
        `/attendance/shifts/rosters/${rosterId}/bulk-assign`,
        payload
      );

    return responseData(
      response
    );
  };

/* =========================================================
   ASSIGN WHOLE WEEK
========================================================= */

export const assignShiftWeek =
  async (
    rosterId,
    payload
  ) => {
    if (
      !rosterId
    ) {
      throw new Error(
        "Roster ID is required."
      );
    }

    const response =
      await api.post(
        `/attendance/shifts/rosters/${rosterId}/assign-week`,
        payload
      );

    return responseData(
      response
    );
  };

/* =========================================================
   COPY PREVIOUS WEEK
========================================================= */

export const copyPreviousShiftWeek =
  async (
    rosterId
  ) => {
    if (
      !rosterId
    ) {
      throw new Error(
        "Roster ID is required."
      );
    }

    const response =
      await api.post(
        `/attendance/shifts/rosters/${rosterId}/copy-previous-week`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   SUBMIT
========================================================= */

export const submitShiftRoster =
  async (
    rosterId,
    payload = {}
  ) => {
    if (
      !rosterId
    ) {
      throw new Error(
        "Roster ID is required."
      );
    }

    const response =
      await api.post(
        `/attendance/shifts/rosters/${rosterId}/submit`,
        payload
      );

    return responseData(
      response
    );
  };

/* =========================================================
   PUBLISH
========================================================= */

export const publishShiftRoster =
  async (
    rosterId,
    payload = {}
  ) => {
    if (
      !rosterId
    ) {
      throw new Error(
        "Roster ID is required."
      );
    }

    const response =
      await api.post(
        `/attendance/shifts/rosters/${rosterId}/publish`,
        payload
      );

    return responseData(
      response
    );
  };

/* =========================================================
   DUPLICATE / EXISTING ASSIGNMENT CHECK

   Frontend utility.

   Returns existing assignment for employee + date.
========================================================= */

export const findShiftAssignment =
  (
    assignments = [],
    employeeId,
    assignmentDate
  ) => {
    const key =
      shiftAssignmentKey(
        employeeId,
        assignmentDate
      );

    return (
      assignments.find(
        (
          assignment
        ) =>
          shiftAssignmentKey(
            assignmentEmployeeId(
              assignment
            ),
            assignment
              ?.assignmentDate
          ) ===
          key
      ) ||
      null
    );
  };

/* =========================================================
   HAS EXISTING ASSIGNMENT
========================================================= */

export const hasShiftAssignment =
  (
    assignments = [],
    employeeId,
    assignmentDate
  ) => {
    return Boolean(
      findShiftAssignment(
        assignments,
        employeeId,
        assignmentDate
      )
    );
  };

/* =========================================================
   DEFAULT
========================================================= */

const shiftService = {
  getAttendanceShifts,

  createAttendanceShift,

  updateAttendanceShift,

  getMyShiftWeek,

  getShiftRoster,

  getShiftRosterById,

  ensureShiftRoster,

  saveShiftAssignment,

  saveShiftAssignments,

  bulkAssignShift,

  assignShiftWeek,

  copyPreviousShiftWeek,

  submitShiftRoster,

  publishShiftRoster,

  shiftAssignmentKey,

  findShiftAssignment,

  hasShiftAssignment,
};

export default shiftService;
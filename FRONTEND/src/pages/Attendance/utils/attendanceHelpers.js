/* =========================================================
   SE-RMS ATTENDANCE HELPERS

   PURPOSE
   ---------------------------------------------------------
   One normalization layer for:

   - My Attendance
   - Team Attendance
   - Attendance Control Center
   - Daily Register
   - Calendar
   - Employee Drawer
   - PWA attendance
   - eSSL attendance
   - Field / Visit attendance

   Backend Employee fields:
   ---------------------------------------------------------
   employeeCode
   fullName
   officialEmail
   orgUnitCode
   designation
   reportsTo

   Backend Attendance fields:
   ---------------------------------------------------------
   employeeId
   attendanceDate
   workMode
   checkIn
   checkOut
   attendanceStatus
   attendanceSource
   totalWorkingMinutes
========================================================= */

/* =========================================================
   BASIC
========================================================= */

export const pad2 = (
  value
) => {
  return String(
    value
  ).padStart(
    2,
    "0"
  );
};

/* =========================================================
   DATE KEY
========================================================= */

export const toDateKey = (
  value
) => {
  if (!value) {
    return "";
  }

  /*
   * Already YYYY-MM-DD or ISO beginning with date.
   */
  if (
    typeof value ===
      "string" &&
    /^\d{4}-\d{2}-\d{2}/.test(
      value
    )
  ) {
    return value.slice(
      0,
      10
    );
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return [
    date.getFullYear(),

    pad2(
      date.getMonth() +
        1
    ),

    pad2(
      date.getDate()
    ),
  ].join("-");
};

/* =========================================================
   TODAY KEY
========================================================= */

export const getTodayKey =
  () => {
    return toDateKey(
      new Date()
    );
  };

/* =========================================================
   MONTH RANGE
========================================================= */

export const monthRange = (
  year,
  month
) => {
  const first =
    `${year}-${pad2(
      month + 1
    )}-01`;

  const lastDay =
    new Date(
      year,
      month + 1,
      0
    ).getDate();

  const last =
    `${year}-${pad2(
      month + 1
    )}-${pad2(
      lastDay
    )}`;

  return {
    from:
      first,

    to:
      last,
  };
};

/* =========================================================
   LONG DATE
========================================================= */

export const formatDateLong = (
  value
) => {
  const dateKey =
    toDateKey(
      value
    );

  if (!dateKey) {
    return "-";
  }

  const [
    year,
    month,
    day,
  ] =
    dateKey
      .split("-")
      .map(Number);

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      weekday:
        "short",

      day:
        "2-digit",

      month:
        "long",

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
   SHORT DATE
========================================================= */

export const formatDateShort = (
  value
) => {
  const dateKey =
    toDateKey(
      value
    );

  if (!dateKey) {
    return "-";
  }

  const [
    year,
    month,
    day,
  ] =
    dateKey
      .split("-")
      .map(Number);

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day:
        "2-digit",

      month:
        "short",
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
   TIME
========================================================= */

export const formatTime = (
  value
) => {
  if (!value) {
    return "--";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "--";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      hour:
        "2-digit",

      minute:
        "2-digit",

      hour12:
        true,
    }
  ).format(
    date
  );
};

/* =========================================================
   MINUTES -> WORKING TIME
========================================================= */

export const formatMinutes = (
  value
) => {
  const minutes =
    Number(
      value
    );

  if (
    !Number.isFinite(
      minutes
    ) ||
    minutes <= 0
  ) {
    return "0h 00m";
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  const remaining =
    Math.round(
      minutes % 60
    );

  return `${hours}h ${pad2(
    remaining
  )}m`;
};

/* =========================================================
   EMPLOYEE OBJECT RESOLVER

   Attendance may contain populated employeeId.

   Employee directory rows may contain employee directly.
========================================================= */

export const employeeObjectOf = (
  item
) => {
  if (
    item?.employee &&
    typeof item.employee ===
      "object"
  ) {
    return item.employee;
  }

  if (
    item?.employeeId &&
    typeof item.employeeId ===
      "object"
  ) {
    return item.employeeId;
  }

  /*
   * The item itself may already be an Employee.
   */
  if (
    item?.fullName ||
    item?.employeeCode
  ) {
    return item;
  }

  return null;
};

/* =========================================================
   EMPLOYEE ID
========================================================= */

export const employeeIdOf = (
  item
) => {
  const employee =
    employeeObjectOf(
      item
    );

  if (employee) {
    return (
      employee?._id ||
      employee?.id ||
      ""
    );
  }

  if (
    typeof item
      ?.employeeId ===
    "string"
  ) {
    return item.employeeId;
  }

  return (
    item?._id ||
    item?.id ||
    ""
  );
};

/* =========================================================
   EMPLOYEE NAME
========================================================= */

export const employeeNameOf = (
  item
) => {
  const employee =
    employeeObjectOf(
      item
    );

  return (
    item?.employeeName ||

    employee?.fullName ||

    employee?.displayName ||

    employee?.name ||

    item?.fullName ||

    item?.displayName ||

    item?.name ||

    "Employee"
  );
};

/* =========================================================
   EMPLOYEE EMAIL
========================================================= */

export const employeeEmailOf = (
  item
) => {
  const employee =
    employeeObjectOf(
      item
    );

  return (
    item?.employeeEmail ||

    employee?.officialEmail ||

    employee?.email ||

    employee?.companyEmail ||

    item?.officialEmail ||

    item?.email ||

    item?.companyEmail ||

    ""
  );
};

/* =========================================================
   EMPLOYEE CODE
========================================================= */

export const employeeCodeOf = (
  item
) => {
  const employee =
    employeeObjectOf(
      item
    );

  return (
    employee
      ?.employeeCode ||

    item
      ?.employeeCode ||

    ""
  );
};

/* =========================================================
   ORGANISATION UNIT

   Current SE-RMS Employee model uses orgUnitCode.

   We deliberately do NOT invent a separate department here.
========================================================= */

export const orgUnitOf = (
  item
) => {
  const employee =
    employeeObjectOf(
      item
    );

  return (
    employee
      ?.orgUnitCode ||

    item
      ?.orgUnitCode ||

    item
      ?.organizationUnit ||

    item
      ?.organisationUnit ||

    "Not Assigned"
  );
};

/*
 * Backward compatibility for existing components.
 *
 * Current components may still call departmentOf().
 * It now resolves the real organisation unit.
 */
export const departmentOf =
  orgUnitOf;

/* =========================================================
   DESIGNATION
========================================================= */

export const designationOf = (
  item
) => {
  const employee =
    employeeObjectOf(
      item
    );

  const designation =
    employee?.designation ??
    item?.designation ??
    item?.designationName;

  if (
    typeof designation ===
      "string"
  ) {
    return (
      designation ||
      "Not Assigned"
    );
  }

  return (
    designation?.name ||
    designation?.label ||
    designation?.title ||
    "Not Assigned"
  );
};

/* =========================================================
   INITIALS
========================================================= */

export const initials = (
  name = ""
) => {
  const words =
    String(
      name
    )
      .trim()
      .split(/\s+/)
      .filter(
        Boolean
      );

  if (
    words.length ===
    0
  ) {
    return "E";
  }

  if (
    words.length ===
    1
  ) {
    return words[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    words[0]
      .charAt(0) +
    words[
      words.length -
        1
    ].charAt(0)
  ).toUpperCase();
};

/* =========================================================
   CHECK-IN
========================================================= */

export const checkInTimeOf = (
  record
) => {
  return (
    record?.firstIn?.time ||

    record?.checkIn?.time ||

    record?.checkInTime ||

    null
  );
};

/* =========================================================
   CHECK-OUT
========================================================= */

export const checkOutTimeOf = (
  record
) => {
  return (
    record?.lastOut?.time ||

    record?.checkOut?.time ||

    record?.checkOutTime ||

    null
  );
};

/* =========================================================
   WORKING MINUTES
========================================================= */

export const workingMinutesOf = (
  record
) => {
  return Number(
    record
      ?.totalWorkingMinutes ??

    record
      ?.totalPresenceMinutes ??

    record
      ?.workingMinutes ??

    0
  );
};

/* =========================================================
   WORK MODE
========================================================= */

export const normalizedWorkMode = (
  record
) => {
  return String(
    record?.workMode ||
    record?.mode ||
    ""
  )
    .trim()
    .toUpperCase();
};

export const workModeLabel = (
  value
) => {
  const mode =
    String(
      value ||
      ""
    )
      .trim()
      .toUpperCase();

  const map = {
    OFFICE:
      "Office",

    VISIT:
      "Customer Visit",

    ON_DUTY:
      "On Duty",

    REMOTE:
      "Remote",

    WORK_FROM_HOME:
      "Work From Home",
  };

  return (
    map[mode] ||
    mode.replaceAll(
      "_",
      " "
    ) ||
    "—"
  );
};

/* =========================================================
   ATTENDANCE SOURCE
========================================================= */

export const attendanceSourceOf = (
  record
) => {
  return String(
    record
      ?.attendanceSource ||

    record
      ?.primarySource ||

    record
      ?.source ||

    ""
  )
    .trim()
    .toUpperCase();
};

export const attendanceSourceLabel = (
  value
) => {
  const source =
    String(
      value ||
      ""
    )
      .trim()
      .toUpperCase();

  const map = {
    BIOMETRIC:
      "eSSL Biometric",

    ESSL:
      "eSSL Biometric",

    OFFICE_LOCATION:
      "Office",

    MOBILE:
      "Mobile",

    FIELD:
      "Field",

    VISIT:
      "Visit",

    ON_DUTY:
      "On Duty",

    WORK_FROM_HOME:
      "Remote",

    REGULARIZATION:
      "Regularization",

    LEAVE:
      "Leave",
  };

  return (
    map[source] ||
    source.replaceAll(
      "_",
      " "
    ) ||
    "—"
  );
};

/* =========================================================
   RAW STATUS
========================================================= */

export const rawAttendanceStatus = (
  record
) => {
  return String(
    record
      ?.attendanceStatus ||

    record?.status ||

    ""
  )
    .trim()
    .toUpperCase();
};

/* =========================================================
   NORMALIZED STATUS

   This is the SINGLE status used by frontend UI.

   IMPORTANT:
   checked_in / checked_out mean the employee has attendance,
   therefore they resolve to PRESENT unless another explicit
   exception status overrides them.
========================================================= */

export const normalizedStatus = (
  record,
  dateKey,
  todayKey
) => {
  const selectedDate =
    toDateKey(
      dateKey
    );

  const currentDate =
    toDateKey(
      todayKey
    );

  /* =====================================================
     FUTURE
  ===================================================== */

  if (
    selectedDate &&
    currentDate &&
    selectedDate >
      currentDate
  ) {
    return "FUTURE";
  }

  const raw =
    rawAttendanceStatus(
      record
    );

  const workMode =
    normalizedWorkMode(
      record
    );

  const source =
    attendanceSourceOf(
      record
    );

  /* =====================================================
     LEAVE
  ===================================================== */

  if (
    raw.includes(
      "LOSS_OF_PAY"
    )
  ) {
    return "LOSS_OF_PAY";
  }

  if (
    raw.includes(
      "ON_LEAVE"
    ) ||
    raw ===
      "LEAVE"
  ) {
    return "LEAVE";
  }

  /* =====================================================
     REGULARIZATION
  ===================================================== */

  if (
    raw.includes(
      "REGULARIZATION_PENDING"
    )
  ) {
    return "REGULARIZATION_PENDING";
  }

  if (
    raw.includes(
      "REGULARIZED"
    )
  ) {
    return "REGULARIZED";
  }

  /* =====================================================
     ATTENDANCE EXCEPTIONS
  ===================================================== */

  if (
    raw.includes(
      "MISSING"
    )
  ) {
    return "MISSING";
  }

  if (
    raw.includes(
      "SHORT"
    )
  ) {
    return "SHORT";
  }

  if (
    raw.includes(
      "LATE"
    )
  ) {
    return "LATE";
  }

  /* =====================================================
     FIELD MODES
  ===================================================== */

  if (
    raw.includes(
      "ON_DUTY"
    ) ||
    workMode ===
      "ON_DUTY" ||
    source ===
      "ON_DUTY"
  ) {
    return "ON_DUTY";
  }

  if (
    raw.includes(
      "VISIT"
    ) ||
    workMode ===
      "VISIT" ||
    source ===
      "VISIT"
  ) {
    return "VISIT";
  }

  if (
    raw.includes(
      "REMOTE"
    ) ||
    workMode ===
      "REMOTE" ||
    workMode ===
      "WORK_FROM_HOME" ||
    source ===
      "WORK_FROM_HOME"
  ) {
    return "REMOTE";
  }

  /* =====================================================
     ABSENT
  ===================================================== */

  if (
    raw.includes(
      "ABSENT"
    )
  ) {
    return "ABSENT";
  }

  /* =====================================================
     PRESENT

     Covers:
     checked_in
     checked_out
     present
     firstIn
     checkIn
  ===================================================== */

  if (
    raw.includes(
      "CHECKED_IN"
    ) ||
    raw.includes(
      "CHECKED_OUT"
    ) ||
    raw.includes(
      "PRESENT"
    ) ||
    checkInTimeOf(
      record
    )
  ) {
    return "PRESENT";
  }

  /* =====================================================
     WEEK OFF

     Current temporary rule:
     Sunday = Week Off.

     Later this should come from shift/work calendar backend.
  ===================================================== */

  if (
    selectedDate
  ) {
    const [
      year,
      month,
      day,
    ] =
      selectedDate
        .split("-")
        .map(Number);

    const date =
      new Date(
        year,
        month - 1,
        day
      );

    if (
      date.getDay() ===
      0
    ) {
      return "WEEK_OFF";
    }
  }

  /* =====================================================
     TODAY - NOT YET CHECKED IN

     Do NOT show today's employee as absent before the day
     has actually completed.

     This is especially important on dashboard/control
     center during working hours.
  ===================================================== */

  if (
    selectedDate &&
    currentDate &&
    selectedDate ===
      currentDate
  ) {
    return "NOT_CHECKED_IN";
  }

  /* =====================================================
     PAST DATE WITH NO ATTENDANCE
  ===================================================== */

  return "ABSENT";
};

/* =========================================================
   STATUS LABEL
========================================================= */

export const statusLabel = (
  value
) => {
  const normalized =
    String(
      value ||
      ""
    ).toUpperCase();

  const map = {
    PRESENT:
      "Present",

    ABSENT:
      "Absent",

    NOT_CHECKED_IN:
      "Not Checked In",

    LATE:
      "Late",

    SHORT:
      "Short Hours",

    MISSING:
      "Missing Punch",

    LEAVE:
      "Leave",

    LOSS_OF_PAY:
      "Loss of Pay",

    REMOTE:
      "Remote",

    VISIT:
      "Customer Visit",

    ON_DUTY:
      "On Duty",

    WEEK_OFF:
      "Week Off",

    FUTURE:
      "Future",

    REGULARIZATION_PENDING:
      "Regularization Pending",

    REGULARIZED:
      "Regularized",
  };

  return (
    map[
      normalized
    ] ||
    normalized.replaceAll(
      "_",
      " "
    ) ||
    "-"
  );
};

/* =========================================================
   STATUS CATEGORY

   Useful for CSS classes and charts.
========================================================= */

export const statusCategory = (
  status
) => {
  switch (
    String(
      status ||
      ""
    ).toUpperCase()
  ) {
    case "PRESENT":
      return "positive";

    case "VISIT":
    case "ON_DUTY":
      return "field";

    case "REMOTE":
      return "remote";

    case "LEAVE":
    case "WEEK_OFF":
      return "neutral";

    case "LATE":
    case "SHORT":
    case "MISSING":
    case "REGULARIZATION_PENDING":
      return "warning";

    case "ABSENT":
    case "LOSS_OF_PAY":
      return "danger";

    case "NOT_CHECKED_IN":
      return "pending";

    default:
      return "neutral";
  }
};

/* =========================================================
   SELECTED DAY ROWS

   Management UI needs one row per employee even if the
   employee has no attendance record for that date.
========================================================= */

export const buildSelectedDayRows =
  (
    employees = [],
    records = [],
    dateKey,
    todayKey
  ) => {
    const selectedDate =
      toDateKey(
        dateKey
      );

    const currentDate =
      toDateKey(
        todayKey
      );

    const attendanceMap =
      new Map();

    /* =====================================================
       BUILD ATTENDANCE MAP
    ===================================================== */

    records.forEach(
      (
        record
      ) => {
        const recordDate =
          toDateKey(
            record
              ?.attendanceDate ||
            record
              ?.date
          );

        if (
          recordDate !==
          selectedDate
        ) {
          return;
        }

        const id =
          String(
            employeeIdOf(
              record
            )
          );

        if (id) {
          attendanceMap.set(
            id,
            record
          );
        }
      }
    );

    /* =====================================================
       BUILD EMPLOYEE ROWS
    ===================================================== */

    return employees.map(
      (
        employee
      ) => {
        const id =
          String(
            employeeIdOf(
              employee
            )
          );

        const record =
          attendanceMap.get(
            id
          ) ||
          null;

        const status =
          normalizedStatus(
            record,
            selectedDate,
            currentDate
          );

        return {
          employeeId:
            id,

          employee,

          attendance:
            record,

          name:
            employeeNameOf(
              employee
            ),

          email:
            employeeEmailOf(
              employee
            ),

          employeeCode:
            employeeCodeOf(
              employee
            ),

          /*
           * Current UI components may still expect
           * department. Keep alias temporarily.
           */
          department:
            orgUnitOf(
              employee
            ),

          orgUnitCode:
            orgUnitOf(
              employee
            ),

          designation:
            designationOf(
              employee
            ),

          status,

          statusLabel:
            statusLabel(
              status
            ),

          statusCategory:
            statusCategory(
              status
            ),

          checkInTime:
            checkInTimeOf(
              record
            ),

          checkOutTime:
            checkOutTimeOf(
              record
            ),

          totalWorkingMinutes:
            workingMinutesOf(
              record
            ),

          workMode:
            normalizedWorkMode(
              record
            ),

          attendanceSource:
            attendanceSourceOf(
              record
            ),
        };
      }
    );
  };

/* =========================================================
   SUMMARY

   Used by:
   Control Center
   Team Attendance
   Daily Register
   Charts / KPI cards
========================================================= */

export const summarizeRows = (
  rows = []
) => {
  const result = {
    total:
      rows.length,

    present: 0,

    absent: 0,

    notCheckedIn: 0,

    remote: 0,

    visit: 0,

    onDuty: 0,

    field: 0,

    leave: 0,

    lossOfPay: 0,

    weekOff: 0,

    late: 0,

    short: 0,

    missing: 0,

    regularizationPending:
      0,

    regularized: 0,

    exceptions: 0,

    active: 0,
  };

  rows.forEach(
    (
      row
    ) => {
      switch (
        row?.status
      ) {
        case "PRESENT":
          result.present +=
            1;

          result.active +=
            1;
          break;

        case "ABSENT":
          result.absent +=
            1;
          break;

        case "NOT_CHECKED_IN":
          result.notCheckedIn +=
            1;
          break;

        case "REMOTE":
          result.remote +=
            1;

          result.active +=
            1;
          break;

        case "VISIT":
          result.visit +=
            1;

          result.field +=
            1;

          result.active +=
            1;
          break;

        case "ON_DUTY":
          result.onDuty +=
            1;

          result.field +=
            1;

          result.active +=
            1;
          break;

        case "LEAVE":
          result.leave +=
            1;
          break;

        case "LOSS_OF_PAY":
          result.lossOfPay +=
            1;
          break;

        case "WEEK_OFF":
          result.weekOff +=
            1;
          break;

        case "LATE":
          result.late +=
            1;

          result.exceptions +=
            1;

          result.active +=
            1;
          break;

        case "SHORT":
          result.short +=
            1;

          result.exceptions +=
            1;

          result.active +=
            1;
          break;

        case "MISSING":
          result.missing +=
            1;

          result.exceptions +=
            1;
          break;

        case "REGULARIZATION_PENDING":
          result
            .regularizationPending +=
            1;

          result.exceptions +=
            1;
          break;

        case "REGULARIZED":
          result.regularized +=
            1;

          result.active +=
            1;
          break;

        default:
          break;
      }
    }
  );

  /* =====================================================
     DERIVED MANAGEMENT VALUES
  ===================================================== */

  result.exceptions =
    result.late +
    result.short +
    result.missing +
    result
      .regularizationPending;

  result.field =
    result.visit +
    result.onDuty;

  result.attendanceCount =
    result.present +
    result.remote +
    result.visit +
    result.onDuty +
    result.late +
    result.short +
    result.regularized;

  result.attendanceRate =
    result.total >
    0
      ? Math.round(
          (
            result
              .attendanceCount /
            result.total
          ) *
            100
        )
      : 0;

  return result;
};

/* =========================================================
   ROLE CAPABILITIES

   IMPORTANT REQUIREMENT:

   SUPER_ADMIN / ADMIN
   - own attendance
   - organisation attendance

   HEAD / MANAGER
   - own attendance
   - scoped team attendance

   EMPLOYEE
   - own attendance only
========================================================= */

export const attendanceRoleAccess = (
  role
) => {
  const normalized =
    String(
      role ||
      "EMPLOYEE"
    ).toUpperCase();

  const isSuperAdmin =
    normalized ===
    "SUPER_ADMIN";

  const isAdmin =
    normalized ===
    "ADMIN";

  const isHead =
    normalized ===
    "HEAD";

  const isManager =
    normalized ===
    "MANAGER";

  const isEmployee =
    normalized ===
    "EMPLOYEE";

  return {
    role:
      normalized,

    /*
     * Everyone has own attendance.
     */
    canViewOwn:
      true,

    canMarkOwn:
      true,

    /*
     * Management.
     */
    canViewTeam:
      isHead ||
      isManager ||
      isAdmin ||
      isSuperAdmin,

    canViewDepartment:
      isHead ||
      isAdmin ||
      isSuperAdmin,

    canViewAll:
      isAdmin ||
      isSuperAdmin,

    canViewControlCenter:
      isAdmin ||
      isSuperAdmin,

    canViewDailyRegister:
      !isEmployee,

    canViewLocationHistory:
      !isEmployee,

    canReviewRegularization:
      isManager ||
      isHead ||
      isAdmin ||
      isSuperAdmin,

    isManagement:
      !isEmployee,

    isEmployee,
    isManager,
    isHead,
    isAdmin,
    isSuperAdmin,
  };
};

/* =========================================================
   PERSONAL ATTENDANCE STATE

   Useful for My Attendance buttons.
========================================================= */

export const personalAttendanceState = (
  attendance
) => {
  const checkIn =
    checkInTimeOf(
      attendance
    );

  const checkOut =
    checkOutTimeOf(
      attendance
    );

  const checkedIn =
    Boolean(
      checkIn
    );

  const checkedOut =
    Boolean(
      checkOut
    );

  return {
    checkedIn,

    checkedOut,

    canCheckIn:
      !checkedIn,

    canCheckOut:
      checkedIn &&
      !checkedOut,

    complete:
      checkedIn &&
      checkedOut,

    checkIn,

    checkOut,

    workingMinutes:
      workingMinutesOf(
        attendance
      ),
  };
};
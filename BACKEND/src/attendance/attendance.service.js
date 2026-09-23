const mongoose =
  require(
    "mongoose"
  );

const {
  reverseGeocode,
} =
  require(
    "../utils/reverseGeocode.util"
  );

const {
  verifyOfficeLocation,
} =
  require(
    "../utils/location.util"
  );

const AttendanceModule =
  require(
    "./attendance.model"
  );

const Attendance =
  AttendanceModule
    .Attendance ||
  AttendanceModule
    .default ||
  AttendanceModule;

const RawAttendancePunchModule =
  require(
    "./RawAttendancePunch.model"
  );

const AttendanceShift =
  require(
    "./shift/attendanceShift.model"
  );

const ShiftRoster =
  require(
    "./shift/shiftRoster.model"
  );

const ShiftAssignment =
  require(
    "./shift/shiftAssignment.model"
  );

const AttendancePolicy =
  require(
    "./attendancePolicy.model"
  );

const EmployeeAttendanceProfile =
  require(
    "./employeeAttendanceProfile.model"
  );

const AttendanceLocationLogModule =
  require(
    "./attendanceLocationLog.model"
  );

const AttendanceLocationLog =
  AttendanceLocationLogModule
    .AttendanceLocationLog ||
  AttendanceLocationLogModule
    .default ||
  AttendanceLocationLogModule;

const employeeModule =
  require(
    "../employee/employee.model"
  );

/* =========================================================
   MODEL COMPATIBILITY
========================================================= */

const RawAttendancePunch =
  RawAttendancePunchModule
    .RawAttendancePunch ||
  RawAttendancePunchModule
    .default ||
  RawAttendancePunchModule;

const Employee =
  employeeModule.Employee ||
  employeeModule.default ||
  employeeModule;

/* =========================================================
   ERROR
========================================================= */

const createError =
  (
    message,
    statusCode = 400
  ) => {
    const error =
      new Error(
        message
      );

    error.statusCode =
      statusCode;

    return error;
  };

/* =========================================================
   OBJECT ID
========================================================= */

const validObjectId =
  (
    value
  ) => {
    return Boolean(
      value &&
      mongoose.Types.ObjectId
        .isValid(
          value
        )
    );
  };

/* =========================================================
   DATE HELPERS
========================================================= */

const pad =
  (
    value
  ) =>
    String(
      value
    ).padStart(
      2,
      "0"
    );

/* =========================================================
   LOCAL DATE PARTS

   India:
   UTC +05:30 = 330 minutes.

   Shift carries utcOffsetMinutes so this can support
   another timezone later.
========================================================= */

const getLocalParts =
  (
    date,
    offsetMinutes = 330
  ) => {
    const parsedDate =
      new Date(
        date
      );

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      throw createError(
        "Invalid date supplied to attendance date resolver."
      );
    }

    const adjusted =
      new Date(
        parsedDate.getTime() +
        Number(
          offsetMinutes ||
          0
        ) *
          60000
      );

    return {
      year:
        adjusted
          .getUTCFullYear(),

      month:
        adjusted
          .getUTCMonth() +
        1,

      day:
        adjusted
          .getUTCDate(),

      hour:
        adjusted
          .getUTCHours(),

      minute:
        adjusted
          .getUTCMinutes(),

      second:
        adjusted
          .getUTCSeconds(),
    };
  };

/* =========================================================
   PARTS → YYYY-MM-DD
========================================================= */

const partsToDateKey =
  (
    parts
  ) => {
    return [
      parts.year,

      pad(
        parts.month
      ),

      pad(
        parts.day
      ),
    ].join(
      "-"
    );
  };

/* =========================================================
   ADD DAYS TO YYYY-MM-DD

   UTC arithmetic prevents server timezone from changing
   calendar dates.
========================================================= */

const addDaysToDateKey =
  (
    dateKey,
    days
  ) => {
    const [
      year,
      month,
      day,
    ] =
      String(
        dateKey
      )
        .split("-")
        .map(Number);

    const date =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day +
            Number(
              days
            )
        )
      );

    return [
      date.getUTCFullYear(),

      pad(
        date.getUTCMonth() +
        1
      ),

      pad(
        date.getUTCDate()
      ),
    ].join(
      "-"
    );
  };

/* =========================================================
   CALENDAR DATE KEY FROM PUNCH

   IMPORTANT:

   This is only physical/local calendar date.

   It is NOT necessarily attendance businessDate because
   night-shift checkout after midnight belongs to previous
   businessDate.
========================================================= */

const getCalendarDateKey =
  (
    date,
    offsetMinutes = 330
  ) => {
    const parts =
      getLocalParts(
        date,
        offsetMinutes
      );

    return partsToDateKey(
      parts
    );
  };

/* =========================================================
   HH:mm → MINUTES
========================================================= */

const timeToMinutes =
  (
    value
  ) => {
    const [
      hour,
      minute,
    ] =
      String(
        value
      )
        .split(":")
        .map(Number);

    return (
      hour *
        60 +
      minute
    );
  };

/* =========================================================
   BUSINESS DATE RESOLVER

   Example:

   Shift:
   13 Sep 17:30
   →
   14 Sep 03:00

   Punch:
   14 Sep 02:30

   businessDate:
   2026-09-13
========================================================= */

const resolveBusinessDate =
  (
    punchTime,
    shift
  ) => {
    if (
      !shift
    ) {
      throw createError(
        "Attendance shift could not be resolved."
      );
    }

    const parts =
      getLocalParts(
        punchTime,
        shift.utcOffsetMinutes ??
          330
      );

    const calendarDate =
      partsToDateKey(
        parts
      );

    if (
      !shift.crossesMidnight
    ) {
      return calendarDate;
    }

    const currentMinutes =
      parts.hour *
        60 +
      parts.minute;

    const shiftEndMinutes =
      timeToMinutes(
        shift.endTime
      );

    /*
     * After-midnight punch before shift end belongs
     * to yesterday's business date.
     */
    if (
      currentMinutes <=
      shiftEndMinutes
    ) {
      return addDaysToDateKey(
        calendarDate,
        -1
      );
    }

    return calendarDate;
  };

/* =========================================================
   LOCAL BUSINESS DATE + LOCAL TIME → UTC DATE

   Example India:

   businessDate = 2026-09-13
   time         = 09:00
   offset       = 330

   returns UTC Date representing 09:00 IST.
========================================================= */

const localDateTimeToUtc =
  (
    businessDate,
    time,
    offsetMinutes = 330,
    addDays = 0
  ) => {
    const [
      year,
      month,
      day,
    ] =
      String(
        businessDate
      )
        .split("-")
        .map(Number);

    const [
      hour,
      minute,
    ] =
      String(
        time
      )
        .split(":")
        .map(Number);

    return new Date(
      Date.UTC(
        year,
        month - 1,
        day +
          Number(
            addDays
          ),
        hour,
        minute,
        0,
        0
      ) -
        Number(
          offsetMinutes ||
          0
        ) *
          60000
    );
  };

/* =========================================================
   EMPLOYEE BY LOGGED-IN USER
========================================================= */

const getEmployeeByUser =
  async (
    userId
  ) => {
    if (
      !validObjectId(
        userId
      )
    ) {
      return null;
    }

    return Employee.findOne({
      user:
        userId,

      status: {
        $ne:
          "EXITED",
      },
    }).lean();
  };

/* =========================================================
   EMPLOYEE ATTENDANCE PROFILE

   Profile controls:

   - office
   - policy
   - attendance enabled
   - biometric required
   - allowed modes
   - default/fallback shift

   It does NOT decide weekly actual shift.

   Weekly published ShiftAssignment has priority.
========================================================= */

const resolveAttendanceProfile =
  async (
    employeeId,
    atDate
  ) => {
    if (
      !validObjectId(
        employeeId
      )
    ) {
      throw createError(
        "Invalid employeeId."
      );
    }

    const date =
      new Date(
        atDate
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      throw createError(
        "Invalid date supplied while resolving attendance profile."
      );
    }

    const profile =
      await EmployeeAttendanceProfile
        .findOne({
          employeeId,

          attendanceEnabled:
            true,

          effectiveFrom: {
            $lte:
              date,
          },

          $or: [
            {
              effectiveTo:
                null,
            },

            {
              effectiveTo: {
                $gte:
                  date,
              },
            },
          ],
        })
        .sort({
          effectiveFrom:
            -1,
        })
        .lean();

    if (
      !profile
    ) {
      return null;
    }

    const policy =
      await AttendancePolicy
        .findOne({
          _id:
            profile
              .attendancePolicyId,

          active:
            true,
        })
        .lean();

    if (
      !policy
    ) {
      throw createError(
        "Employee attendance policy is missing or inactive."
      );
    }

    let defaultShift =
      null;

    if (
      profile.defaultShiftId
    ) {
      defaultShift =
        await AttendanceShift
          .findOne({
            _id:
              profile
                .defaultShiftId,

            active:
              true,
          })
          .lean();
    }

    const fallbackRequired =
      profile.shiftManagementMode ===
        "DEFAULT" ||
      profile
        .allowDefaultShiftFallback !==
        false;

    if (
      fallbackRequired &&
      !defaultShift
    ) {
      throw createError(
        "Employee default attendance shift is missing or inactive."
      );
    }

    return {
      profile,

      policy,

      defaultShift,
    };
  };

/* =========================================================
   PUBLISHED SHIFT ASSIGNMENT

   DRAFT and SUBMITTED rosters never affect attendance.

   Only PUBLISHED roster counts.
========================================================= */

const getPublishedShiftAssignment =
  async (
    employeeId,
    assignmentDate
  ) => {
    const assignment =
      await ShiftAssignment
        .findOne({
          employeeId,

          assignmentDate,
        })
        .lean();

    if (
      !assignment
    ) {
      return null;
    }

    const roster =
      await ShiftRoster
        .findOne({
          _id:
            assignment.rosterId,

          status:
            "PUBLISHED",
        })
        .lean();

    if (
      !roster
    ) {
      return null;
    }

    let shift =
      null;

    if (
      assignment.dayType ===
      "SHIFT"
    ) {
      if (
        !assignment.shiftId
      ) {
        throw createError(
          `Published assignment for ${assignmentDate} has no shiftId.`
        );
      }

      shift =
        await AttendanceShift
          .findOne({
            _id:
              assignment.shiftId,

            active:
              true,
          })
          .lean();

      if (
        !shift
      ) {
        throw createError(
          `Assigned shift for ${assignmentDate} is missing or inactive.`
        );
      }
    }

    return {
      assignment,

      roster,

      shift,
    };
  };

/* =========================================================
   PUNCH INSIDE SHIFT WINDOW

   Used especially for previous-day night-shift resolution.
========================================================= */

const isPunchWithinShiftWindow =
  (
    punchTime,
    businessDate,
    shift
  ) => {
    if (
      !shift
    ) {
      return false;
    }

    const offset =
      shift.utcOffsetMinutes ??
      330;

    const expectedStart =
      localDateTimeToUtc(
        businessDate,
        shift.startTime,
        offset,
        0
      );

    const expectedEnd =
      localDateTimeToUtc(
        businessDate,
        shift.endTime,
        offset,
        shift.crossesMidnight
          ? 1
          : 0
      );

    const beforeMinutes =
      Math.max(
        0,
        Number(
          shift
            .punchWindowBeforeMinutes ||
          0
        )
      );

    const afterMinutes =
      Math.max(
        0,
        Number(
          shift
            .punchWindowAfterMinutes ||
          0
        )
      );

    const windowStart =
      new Date(
        expectedStart.getTime() -
          beforeMinutes *
            60000
      );

    const windowEnd =
      new Date(
        expectedEnd.getTime() +
          afterMinutes *
            60000
      );

    const punch =
      new Date(
        punchTime
      );

    return (
      punch >=
        windowStart &&
      punch <=
        windowEnd
    );
  };

/* =========================================================
   PUNCH → ATTENDANCE CONTEXT

   PRIORITY:

   1. Previous-date published NIGHT assignment
      when after-midnight punch belongs to that shift.

   2. Current-date published assignment.

   3. Employee profile defaultShift fallback.

   This is the critical weekly roster resolver.
========================================================= */

const resolvePunchAttendanceContext =
  async (
    employeeId,
    punchTime
  ) => {
    const profileContext =
      await resolveAttendanceProfile(
        employeeId,
        punchTime
      );

    if (
      !profileContext
    ) {
      throw createError(
        "No active attendance profile found for employee."
      );
    }

    const {
      profile,
      policy,
      defaultShift,
    } =
      profileContext;

    /*
     * Current organization is India.
     *
     * defaultShift normally supplies 330.
     *
     * If weekly roster shift differs, the actual assigned
     * shift will still determine expectedStart/end.
     */
    const calendarOffset =
      defaultShift
        ?.utcOffsetMinutes ??
      330;

    const calendarDate =
      getCalendarDateKey(
        punchTime,
        calendarOffset
      );

    const previousDate =
      addDaysToDateKey(
        calendarDate,
        -1
      );

    /* =====================================================
       1. CHECK PREVIOUS DAY NIGHT SHIFT
    ===================================================== */

    const previousAssignment =
      await getPublishedShiftAssignment(
        employeeId,
        previousDate
      );

    if (
      previousAssignment &&
      previousAssignment
        .assignment
        .dayType ===
        "SHIFT" &&
      previousAssignment
        .shift &&
      previousAssignment
        .shift
        .crossesMidnight &&
      isPunchWithinShiftWindow(
        punchTime,
        previousDate,
        previousAssignment
          .shift
      )
    ) {
      return {
        profile,

        policy,

        shift:
          previousAssignment
            .shift,

        assignment:
          previousAssignment
            .assignment,

        roster:
          previousAssignment
            .roster,

        businessDate:
          previousDate,

        shiftSource:
          "WEEKLY_ROSTER",

        scheduledDayType:
          "SHIFT",
      };
    }

    /* =====================================================
       2. CURRENT CALENDAR DATE ASSIGNMENT
    ===================================================== */

    const currentAssignment =
      await getPublishedShiftAssignment(
        employeeId,
        calendarDate
      );

    if (
      currentAssignment
    ) {
      if (
        currentAssignment
          .assignment
          .dayType !==
        "SHIFT"
      ) {
        return {
          profile,

          policy,

          shift:
            null,

          assignment:
            currentAssignment
              .assignment,

          roster:
            currentAssignment
              .roster,

          businessDate:
            calendarDate,

          shiftSource:
            "WEEKLY_ROSTER",

          scheduledDayType:
            currentAssignment
              .assignment
              .dayType,
        };
      }

      return {
        profile,

        policy,

        shift:
          currentAssignment
            .shift,

        assignment:
          currentAssignment
            .assignment,

        roster:
          currentAssignment
            .roster,

        businessDate:
          calendarDate,

        shiftSource:
          "WEEKLY_ROSTER",

        scheduledDayType:
          "SHIFT",
      };
    }

    /* =====================================================
       3. DEFAULT PROFILE FALLBACK
    ===================================================== */

    const allowFallback =
      profile.shiftManagementMode ===
        "DEFAULT" ||
      profile
        .allowDefaultShiftFallback !==
        false;

    if (
      allowFallback &&
      defaultShift
    ) {
      return {
        profile,

        policy,

        shift:
          defaultShift,

        assignment:
          null,

        roster:
          null,

        businessDate:
          resolveBusinessDate(
            punchTime,
            defaultShift
          ),

        shiftSource:
          "DEFAULT_PROFILE",

        scheduledDayType:
          "SHIFT",
      };
    }

    throw createError(
      `No published shift assignment found for employee on ${calendarDate}.`
    );
  };

/* =========================================================
   BUSINESS DATE → ATTENDANCE CONTEXT

   Used when businessDate has already been resolved.

   Published weekly assignment wins.
========================================================= */

const resolveAttendanceContextForBusinessDate =
  async (
    employeeId,
    businessDate,
    representativeDate
  ) => {
    const profileContext =
      await resolveAttendanceProfile(
        employeeId,
        representativeDate
      );

    if (
      !profileContext
    ) {
      throw createError(
        "Attendance profile not found."
      );
    }

    const {
      profile,
      policy,
      defaultShift,
    } =
      profileContext;

    const published =
      await getPublishedShiftAssignment(
        employeeId,
        businessDate
      );

    if (
      published
    ) {
      if (
        published
          .assignment
          .dayType !==
        "SHIFT"
      ) {
        return {
          profile,

          policy,

          shift:
            null,

          assignment:
            published
              .assignment,

          roster:
            published
              .roster,

          shiftSource:
            "WEEKLY_ROSTER",

          scheduledDayType:
            published
              .assignment
              .dayType,
        };
      }

      return {
        profile,

        policy,

        shift:
          published.shift,

        assignment:
          published.assignment,

        roster:
          published.roster,

        shiftSource:
          "WEEKLY_ROSTER",

        scheduledDayType:
          "SHIFT",
      };
    }

    const allowFallback =
      profile.shiftManagementMode ===
        "DEFAULT" ||
      profile
        .allowDefaultShiftFallback !==
        false;

    if (
      allowFallback &&
      defaultShift
    ) {
      return {
        profile,

        policy,

        shift:
          defaultShift,

        assignment:
          null,

        roster:
          null,

        shiftSource:
          "DEFAULT_PROFILE",

        scheduledDayType:
          "SHIFT",
      };
    }

    throw createError(
      `No published shift assignment exists for ${businessDate}.`
    );
  };

/* =========================================================
   PROCESS RAW PUNCH
========================================================= */

const processRawPunch =
  async (
    punchId
  ) => {
    if (
      !validObjectId(
        punchId
      )
    ) {
      throw createError(
        "Invalid raw attendance punch id."
      );
    }

    const punch =
      await RawAttendancePunch
        .findById(
          punchId
        );

    if (
      !punch
    ) {
      throw createError(
        "Raw attendance punch not found.",
        404
      );
    }

    punch.processingAttempts =
      Number(
        punch.processingAttempts ||
        0
      ) +
      1;

    if (
      !punch.employeeId
    ) {
      punch.processingStatus =
        "UNMAPPED";

      punch.resolved =
        false;

      punch.processingError =
        "";

      await punch.save();

      return {
        punch,

        attendance:
          null,

        reason:
          "UNMAPPED_EMPLOYEE",
      };
    }

    try {
      const context =
        await resolvePunchAttendanceContext(
          punch.employeeId,
          punch.punchTime
        );

      punch.businessDate =
        context.businessDate;

      punch.shiftId =
        context.shift?._id ||
        null;

      punch.officeId =
        context.assignment
          ?.officeId ||
        context.profile
          ?.officeId ||
        punch.officeId ||
        null;

      punch.resolved =
        true;

      punch.processingError =
        "";

      /*
       * WEEK_OFF/HOLIDAY/LEAVE/NOT_SCHEDULED punch remains
       * immutable raw evidence.
       *
       * We mark raw processing completed so queue does not
       * process the same punch endlessly.
       *
       * Daily finalizer will determine final special-day
       * attendance later.
       */
      if (
        context
          .scheduledDayType !==
        "SHIFT"
      ) {
        punch.processingStatus =
          "PROCESSED";

        punch.processedAt =
          new Date();

        await punch.save();

        return {
          punch,

          attendance:
            null,

          businessDate:
            context.businessDate,

          scheduledDayType:
            context
              .scheduledDayType,

          shiftSource:
            context.shiftSource,
        };
      }

      punch.processingStatus =
        "PENDING";

      await punch.save();

      const attendance =
        await rebuildAttendanceDay(
          punch.employeeId,
          context.businessDate
        );

      punch.processingStatus =
        "PROCESSED";

      punch.processedAt =
        new Date();

      punch.processingError =
        "";

      await punch.save();

      return {
        punch,

        attendance,

        businessDate:
          context.businessDate,

        shiftSource:
          context.shiftSource,
      };
    } catch (
      error
    ) {
      punch.processingStatus =
        "ERROR";

      punch.processingError =
        String(
          error.message ||
          error
        ).slice(
          0,
          2000
        );

      await punch.save();

      throw error;
    }
  };

/* =========================================================
   EMPLOYEE SNAPSHOT
========================================================= */

const buildEmployeeSnapshot =
  (
    employee
  ) => {
    return {
      employeeId:
        employee._id,

      userId:
        employee.user ||
        null,

      employeeCode:
        employee.employeeCode ||
        "",

      employeeName:
        employee.fullName ||
        "",

      biometricCode:
        employee.biometricCode ||
        null,

      companyCode:
        employee.companyCode ||
        null,

      organizationUnitId:
        employee.organizationUnit ||
        employee.organizationUnitId ||
        null,

      orgUnitCode:
        employee.orgUnitCode ||
        null,

      departmentId:
        employee.department ||
        null,

      departmentName:
        employee.departmentName ||
        "",

      designationName:
        employee.designation ||
        employee.designationName ||
        "",

      reportingManagerId:
        employee.reportsTo ||
        employee.reportingManagerId ||
        null,

      workLocation:
        employee.workLocation ||
        "",
    };
  };

/* =========================================================
   CALCULATE ATTENDANCE

   Raw punches are sorted.

   Current rule:
   first punch = firstIn
   last punch  = lastOut

   Break/session pairing can be added separately later.
========================================================= */

const calculateAttendance =
  ({
    punches,
    shift,
    policy,
    businessDate,
  }) => {
    if (
      !shift
    ) {
      throw createError(
        "Shift is required for attendance calculation."
      );
    }

    if (
      !policy
    ) {
      throw createError(
        "Attendance policy is required for calculation."
      );
    }

    const sorted =
      [
        ...punches,
      ].sort(
        (
          a,
          b
        ) =>
          new Date(
            a.punchTime
          ).getTime() -
          new Date(
            b.punchTime
          ).getTime()
      );

    const first =
      sorted[0] ||
      null;

    const last =
      sorted.length >
        1
        ? sorted[
            sorted.length -
              1
          ]
        : null;

    const offset =
      shift.utcOffsetMinutes ??
      330;

    const expectedStartAt =
      localDateTimeToUtc(
        businessDate,
        shift.startTime,
        offset,
        0
      );

    const expectedEndAt =
      localDateTimeToUtc(
        businessDate,
        shift.endTime,
        offset,
        shift.crossesMidnight
          ? 1
          : 0
      );

    const requiredMinutes =
      Number(
        policy
          .requiredWorkingMinutes ||
        0
      ) >
      0
        ? Number(
            policy
              .requiredWorkingMinutes
          )
        : Number(
            shift.requiredMinutes ||
            0
          );

    const firstInAt =
      first?.punchTime ||
      null;

    const lastOutAt =
      last?.punchTime ||
      null;

    let totalPresenceMinutes =
      0;

    if (
      firstInAt &&
      lastOutAt
    ) {
      totalPresenceMinutes =
        Math.max(
          0,
          Math.round(
            (
              new Date(
                lastOutAt
              ).getTime() -
              new Date(
                firstInAt
              ).getTime()
            ) /
              60000
          )
        );
    }

    /*
     * Later session/break engine may replace this.
     */
    const breakMinutes =
      0;

    const totalWorkingMinutes =
      Math.max(
        0,
        totalPresenceMinutes -
          breakMinutes
      );

    const lateGraceMinutes =
      Math.max(
        0,
        Number(
          policy
            .lateGraceMinutes ||
          0
        )
      );

    const earlyExitGraceMinutes =
      Math.max(
        0,
        Number(
          policy
            .earlyExitGraceMinutes ||
          0
        )
      );

    const lateThreshold =
      new Date(
        expectedStartAt.getTime() +
          lateGraceMinutes *
            60000
      );

    const earlyThreshold =
      new Date(
        expectedEndAt.getTime() -
          earlyExitGraceMinutes *
            60000
      );

    const lateMinutes =
      firstInAt &&
      new Date(
        firstInAt
      ) >
        lateThreshold
        ? Math.max(
            0,
            Math.round(
              (
                new Date(
                  firstInAt
                ).getTime() -
                expectedStartAt
                  .getTime()
              ) /
                60000
            )
          )
        : 0;

    const earlyExitMinutes =
      lastOutAt &&
      new Date(
        lastOutAt
      ) <
        earlyThreshold
        ? Math.max(
            0,
            Math.round(
              (
                expectedEndAt
                  .getTime() -
                new Date(
                  lastOutAt
                ).getTime()
              ) /
                60000
            )
          )
        : 0;

    const shortMinutes =
      Math.max(
        0,
        requiredMinutes -
          totalWorkingMinutes
      );

    let overtimeMinutes =
      0;

    if (
      policy.overtimeEnabled
    ) {
      const overtimeBase =
        Number(
          policy
            .overtimeAfterMinutes ||
          0
        ) >
        0
          ? Number(
              policy
                .overtimeAfterMinutes
            )
          : requiredMinutes;

      const calculatedOvertime =
        Math.max(
          0,
          totalWorkingMinutes -
            overtimeBase
        );

      const minimumOvertime =
        Math.max(
          0,
          Number(
            policy
              .minimumOvertimeMinutes ||
            0
          )
        );

      overtimeMinutes =
        calculatedOvertime >=
        minimumOvertime
          ? calculatedOvertime
          : 0;
    }

    let presenceStatus =
      "NOT_MARKED";

    if (
      firstInAt
    ) {
      if (
        !lastOutAt
      ) {
        presenceStatus =
          policy
            .singlePunchCountsAsPresent
            ? "PRESENT"
            : "NOT_MARKED";
      } else if (
        totalWorkingMinutes >=
        Number(
          policy
            .minimumFullDayMinutes ||
          0
        )
      ) {
        presenceStatus =
          "PRESENT";
      } else if (
        totalWorkingMinutes >=
        Number(
          policy
            .minimumHalfDayMinutes ||
          0
        )
      ) {
        presenceStatus =
          "HALF_DAY";
      } else {
        /*
         * Below minimum half-day threshold.
         *
         * Final payroll policy can later decide ABSENT
         * vs HALF_DAY.
         */
        presenceStatus =
          "HALF_DAY";
      }
    }

    return {
      sorted,

      first,

      last,

      expectedStartAt,

      expectedEndAt,

      requiredMinutes,

      firstInAt,

      lastOutAt,

      totalPresenceMinutes,

      totalWorkingMinutes,

      breakMinutes,

      lateMinutes,

      earlyExitMinutes,

      shortMinutes,

      overtimeMinutes,

      presenceStatus,

      isLate:
        lateMinutes >
        0,

      isEarlyExit:
        earlyExitMinutes >
        0,

      isShortHours:
        Boolean(
          lastOutAt &&
          shortMinutes >
            0
        ),

      missingCheckIn:
        false,

      missingCheckOut:
        Boolean(
          firstInAt &&
          !lastOutAt
        ),
    };
  };

/* =========================================================
   REBUILD DAILY ATTENDANCE
========================================================= */

async function rebuildAttendanceDay(
  employeeId,
  businessDate
) {
  if (
    !validObjectId(
      employeeId
    )
  ) {
    throw createError(
      "Invalid employeeId."
    );
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      String(
        businessDate ||
        ""
      )
    )
  ) {
    throw createError(
      "businessDate must be YYYY-MM-DD."
    );
  }

  const employee =
    await Employee
      .findById(
        employeeId
      )
      .lean();

  if (
    !employee
  ) {
    throw createError(
      "Employee not found.",
      404
    );
  }

  const representativePunch =
    await RawAttendancePunch
      .findOne({
        employeeId,

        businessDate,

        processingStatus: {
          $ne:
            "IGNORED",
        },
      })
      .sort({
        punchTime:
          1,
      })
      .lean();

  if (
    !representativePunch
  ) {
    throw createError(
      "No raw punches found for attendance business date."
    );
  }

  const resolved =
    await resolveAttendanceContextForBusinessDate(
      employeeId,
      businessDate,
      representativePunch
        .punchTime
    );

  const {
    profile,
    shift,
    policy,
    assignment,
    roster,
    shiftSource,
    scheduledDayType,
  } =
    resolved;

  if (
    scheduledDayType !==
    "SHIFT"
  ) {
    throw createError(
      `Business date ${businessDate} is scheduled as ${scheduledDayType}.`
    );
  }

  if (
    !shift
  ) {
    throw createError(
      "Attendance shift could not be resolved for business date."
    );
  }

  const punches =
    await RawAttendancePunch
      .find({
        employeeId,

        businessDate,

        processingStatus: {
          $ne:
            "IGNORED",
        },
      })
      .sort({
        punchTime:
          1,
      })
      .lean();

  if (
    !punches.length
  ) {
    throw createError(
      "No usable raw punches found for attendance calculation."
    );
  }

  const result =
    calculateAttendance({
      punches,

      shift,

      policy,

      businessDate,
    });

  const snapshot =
    buildEmployeeSnapshot(
      employee
    );

  const attendanceDate =
    new Date(
      `${businessDate}T00:00:00.000Z`
    );

  const update = {
    ...snapshot,

    businessDate,

    attendanceDate,

    timezone:
      shift.timezone ||
      "Asia/Kolkata",

    officeId:
      assignment
        ?.officeId ||
      profile.officeId ||
      null,

    shiftId:
      shift._id,

    shiftCode:
      shift.code,

    shiftName:
      shift.name,

    shiftCrossesMidnight:
      Boolean(
        shift.crossesMidnight
      ),

    attendancePolicyId:
      policy._id,

    expectedStartAt:
      result.expectedStartAt,

    expectedEndAt:
      result.expectedEndAt,

    requiredMinutes:
      result.requiredMinutes,

    workMode:
      "OFFICE",

    firstIn: {
      time:
        result.firstInAt,

      source:
        result.firstInAt
          ? "BIOMETRIC"
          : null,

      punchId:
        result.first?._id ||
        null,
    },

    lastOut: {
      time:
        result.lastOutAt,

      source:
        result.lastOutAt
          ? "BIOMETRIC"
          : null,

      punchId:
        result.last?._id ||
        null,
    },

    /*
     * Never lose actual biometric source punches when later
     * regularization changes effective attendance.
     */
    originalFirstInAt:
      result.firstInAt,

    originalLastOutAt:
      result.lastOutAt,

    punchCount:
      punches.length,

    firstRawPunchId:
      result.first?._id ||
      null,

    lastRawPunchId:
      result.last?._id ||
      null,

    totalPresenceMinutes:
      result
        .totalPresenceMinutes,

    totalWorkingMinutes:
      result
        .totalWorkingMinutes,

    breakMinutes:
      result.breakMinutes,

    lateMinutes:
      result.lateMinutes,

    earlyExitMinutes:
      result
        .earlyExitMinutes,

    shortMinutes:
      result.shortMinutes,

    overtimeMinutes:
      result
        .overtimeMinutes,

    presenceStatus:
      result
        .presenceStatus,

    isLate:
      result.isLate,

    isEarlyExit:
      result
        .isEarlyExit,

    isShortHours:
      result
        .isShortHours,

    missingCheckIn:
      result
        .missingCheckIn,

    missingCheckOut:
      result
        .missingCheckOut,

    primarySource:
      "BIOMETRIC",

    processingStatus:
      "PROCESSED",

    needsRecalculation:
      false,

    lastCalculatedAt:
      new Date(),

    calculationError:
      null,
  };

  /*
   * Optional fields:
   *
   * Only set when Attendance schema actually contains them.
   */
  if (
    Attendance.schema.path(
      "shiftAssignmentId"
    )
  ) {
    update.shiftAssignmentId =
      assignment?._id ||
      null;
  }

  if (
    Attendance.schema.path(
      "shiftRosterId"
    )
  ) {
    update.shiftRosterId =
      roster?._id ||
      null;
  }

  if (
    Attendance.schema.path(
      "shiftSource"
    )
  ) {
    update.shiftSource =
      shiftSource;
  }

  const attendance =
    await Attendance
      .findOneAndUpdate(
        {
          employeeId,

          businessDate,
        },

        {
          $set:
            update,

          $inc: {
            processingVersion:
              1,
          },
        },

        {
          upsert:
            true,

          new:
            true,

          setDefaultsOnInsert:
            true,
        }
      );

  await RawAttendancePunch
    .updateMany(
      {
        employeeId,

        businessDate,

        processingStatus: {
          $ne:
            "IGNORED",
        },
      },

      {
        $set: {
          processingStatus:
            "PROCESSED",

          processedAt:
            new Date(),

          processingError:
            "",
        },
      }
    );

  return attendance;
}

/* =========================================================
   PROCESS PENDING RAW PUNCHES

   Used for:

   - historical import
   - live backlog
   - punches mapped after employee mapping
   - retryable processing errors
========================================================= */

const processPendingPunches =
  async ({
    limit = 500,
  } = {}) => {
    const safeLimit =
      Math.min(
        Math.max(
          Number(
            limit
          ) ||
            500,
          1
        ),
        5000
      );

    const punches =
      await RawAttendancePunch
        .find({
          employeeId: {
            $ne:
              null,
          },

          processingStatus: {
            $in: [
              "PENDING",
              "ERROR",
            ],
          },
        })
        .sort({
          punchTime:
            1,
        })
        .limit(
          safeLimit
        )
        .select(
          "_id"
        )
        .lean();

    const summary = {
      found:
        punches.length,

      processed:
        0,

      failed:
        0,

      failures:
        [],
    };

    for (
      const punch
      of punches
    ) {
      try {
        await processRawPunch(
          punch._id
        );

        summary.processed +=
          1;
      } catch (
        error
      ) {
        summary.failed +=
          1;

        if (
          summary.failures.length <
          25
        ) {
          summary.failures.push({
            punchId:
              punch._id,

            message:
              error.message,
          });
        }
      }
    }

    return summary;
  };

/* =========================================================
   REPORTING TREE

   Includes manager himself + all descendants.
========================================================= */

const getReportingTreeIds =
  async (
    managerEmployeeId
  ) => {
    if (
      !validObjectId(
        managerEmployeeId
      )
    ) {
      return [];
    }

    const rootId =
      new mongoose.Types.ObjectId(
        managerEmployeeId
      );

    const ids =
      new Map();

    ids.set(
      String(
        rootId
      ),
      rootId
    );

    let frontier = [
      rootId,
    ];

    while (
      frontier.length
    ) {
      const reports =
        await Employee
          .find({
            reportsTo: {
              $in:
                frontier,
            },

            status: {
              $ne:
                "EXITED",
            },
          })
          .select(
            "_id"
          )
          .lean();

      frontier =
        [];

      for (
        const employee
        of reports
      ) {
        const key =
          String(
            employee._id
          );

        if (
          ids.has(
            key
          )
        ) {
          continue;
        }

        ids.set(
          key,
          employee._id
        );

        frontier.push(
          employee._id
        );
      }
    }

    return [
      ...ids.values(),
    ];
  };

/* =========================================================
   SCOPED ATTENDANCE QUERY

   Backend authorization boundary.

   Scope types:

   SELF
   TEAM
   DEPARTMENT
   ALL
========================================================= */

const buildScopedEmployeeQuery =
  async (
    actorEmployee,
    access = {}
  ) => {
    const type =
      String(
        access.type ||
        "SELF"
      )
        .trim()
        .toUpperCase();

    if (
      type ===
      "ALL"
    ) {
      return {};
    }

    if (
      type ===
      "DEPARTMENT"
    ) {
      if (
        Array.isArray(
          access.departmentIds
        ) &&
        access.departmentIds
          .length
      ) {
        return {
          departmentId: {
            $in:
              access
                .departmentIds,
          },
        };
      }

      if (
        actorEmployee
          ?.department
      ) {
        return {
          departmentId:
            actorEmployee
              .department,
        };
      }

      return {
        employeeId:
          actorEmployee?._id ||
          null,
      };
    }

    if (
      type ===
      "TEAM"
    ) {
      const ids =
        await getReportingTreeIds(
          actorEmployee?._id
        );

      return {
        employeeId: {
          $in:
            ids,
        },
      };
    }

    return {
      employeeId:
        actorEmployee?._id ||
        null,
    };
  };

/* =========================================================
   GET ATTENDANCE
========================================================= */

/* =========================================================
   GET UNMAPPED BIOMETRIC ATTENDANCE

   PURPOSE

   Physical biometric machines can contain workers/operators
   who do not use Nuvanata and therefore do not yet have an
   Employee Master record.

   Their biometric punches must still be visible to
   authorized HR / Admin / Head users.

   IMPORTANT

   We DO NOT create fake Employee ObjectIds.

   biometricCode remains the permanent machine identity.

   When an Employee is created later with the same
   biometricCode, existing RawAttendancePunch records can be
   mapped and processed into normal Attendance records.

   SELF / TEAM users must never see globally unmapped
   biometric workers because there is no Employee hierarchy
   available to authorize those records.
========================================================= */

const getUnmappedBiometricAttendance =
  async ({
    access,

    from = null,

    to = null,

    officeId = null,

    provider = null,

    limit = 5000,
  } = {}) => {
    const accessType =
      String(
        access?.type ||
        ""
      )
        .trim()
        .toUpperCase();

    /*
     * Unmapped machine workers have no Employee hierarchy.
     *
     * Therefore only broad authorized attendance scopes can
     * see these records.
     */
    if (
      ![
        "ALL",
        "DEPARTMENT",
      ].includes(
        accessType
      )
    ) {
      return {
        items:
          [],

        rawPunchCount:
          0,

        workerDayCount:
          0,
      };
    }

    const query = {
      employeeId:
        null,

      processingStatus:
        "UNMAPPED",
    };

    /* =====================================================
       DATE RANGE

       Raw punches store actual UTC Date values.

       API dates are organization-local India dates.
    ===================================================== */

    if (
      from ||
      to
    ) {
      query.punchTime =
        {};

      if (
        from
      ) {
        query.punchTime.$gte =
          new Date(
            `${String(
              from
            )}T00:00:00.000+05:30`
          );
      }

      if (
        to
      ) {
        query.punchTime.$lte =
          new Date(
            `${String(
              to
            )}T23:59:59.999+05:30`
          );
      }
    }

    /* =====================================================
       LOCATION
    ===================================================== */

    if (
      officeId &&
      validObjectId(
        officeId
      )
    ) {
      query.officeId =
        officeId;
    }

    /* =====================================================
       PROVIDER

       Sonipat:
       ESSL

       Delhi:
       REALTIME
    ===================================================== */

    if (
      provider
    ) {
      const normalizedProvider =
        String(
          provider
        )
          .trim()
          .toUpperCase();

      if (
        ![
          "ESSL",
          "REALTIME",
          "ZKTECO",
          "OTHER",
        ].includes(
          normalizedProvider
        )
      ) {
        throw createError(
          "Invalid biometric provider."
        );
      }

      query.provider =
        normalizedProvider;
    }

    const safeLimit =
      Math.min(
        Math.max(
          Number(
            limit
          ) ||
            5000,
          1
        ),
        20000
      );

    const [
      punches,
      rawPunchCount,
    ] =
      await Promise.all([
        RawAttendancePunch
          .find(
            query
          )
          .sort({
            punchTime:
              1,
          })
          .limit(
            safeLimit
          )
          .lean(),

        RawAttendancePunch
          .countDocuments(
            query
          ),
      ]);

    /*
     * One register row =
     *
     * device + biometric employee + local calendar date
     *
     * We intentionally don't generate Attendance documents
     * here because no Employee mapping exists yet.
     */
    const registerMap =
      new Map();

    for (
      const punch
      of punches
    ) {
      const localDate =
        getCalendarDateKey(
          punch.punchTime,
          330
        );

      const key =
        [
          String(
            punch
              .attendanceDeviceId ||
              punch.deviceCode ||
              ""
          ),

          String(
            punch.biometricCode ||
              ""
          ),

          localDate,
        ].join(
          "|"
        );

      if (
        !registerMap.has(
          key
        )
      ) {
        registerMap.set(
          key,
          {
            recordType:
              "UNMAPPED_BIOMETRIC",

            mapped:
              false,

            employeeId:
              null,

            /*
             * Temporary employee-facing identity.
             *
             * This is NOT Mongo employeeId.
             */
            employeeCode:
              punch.biometricCode ||
              "",

            biometricCode:
              punch.biometricCode ||
              "",

            employeeName:
              punch
                .biometricEmployeeName ||
              "",

            businessDate:
              localDate,

            provider:
              punch.provider ||
              "",

            attendanceDeviceId:
              punch
                .attendanceDeviceId ||
              null,

            deviceCode:
              punch.deviceCode ||
              "",

            deviceSerialNumber:
              punch
                .deviceSerialNumber ||
              "",

            officeId:
              punch.officeId ||
              null,

            departmentId:
              null,

            departmentName:
              "",

            workMode:
              "OFFICE",

            /*
             * We cannot calculate shift/policy status before
             * Employee Master mapping exists.
             */
            presenceStatus:
              "BIOMETRIC_ONLY",

            processingStatus:
              "UNMAPPED",

            firstIn: {
              time:
                null,

              source:
                "BIOMETRIC",

              punchId:
                null,
            },

            lastOut: {
              time:
                null,

              source:
                null,

              punchId:
                null,
            },

            punchCount:
              0,

            punches:
              [],
          }
        );
      }

      const register =
        registerMap.get(
          key
        );

      /*
       * Prefer a machine name whenever one is available.
       */
      if (
        !register.employeeName &&
        punch.biometricEmployeeName
      ) {
        register.employeeName =
          punch.biometricEmployeeName;
      }

      register.punches.push({
        _id:
          punch._id,

        punchTime:
          punch.punchTime,

        source:
          punch.source,

        machineRecordId:
          punch.machineRecordId ||
          "",

        machineUserId:
          punch.machineUserId ||
          "",

        machineVerifyMode:
          punch
            .machineVerifyMode ||
          "",

        machineInOutMode:
          punch
            .machineInOutMode ||
          "",
      });
    }

    const items =
      Array.from(
        registerMap.values()
      );

    for (
      const item
      of items
    ) {
      item.punches.sort(
        (
          left,
          right
        ) =>
          new Date(
            left.punchTime
          ).getTime() -
          new Date(
            right.punchTime
          ).getTime()
      );

      item.punchCount =
        item.punches.length;

      const firstPunch =
        item.punches[0] ||
        null;

      const lastPunch =
        item.punches[
          item.punches.length -
            1
        ] ||
        null;

      item.firstIn = {
        time:
          firstPunch
            ?.punchTime ||
          null,

        source:
          "BIOMETRIC",

        punchId:
          firstPunch?._id ||
          null,
      };

      /*
       * A single punch is not both IN and OUT.
       */
      if (
        item.punches.length >
        1
      ) {
        item.lastOut = {
          time:
            lastPunch
              ?.punchTime ||
            null,

          source:
            "BIOMETRIC",

          punchId:
            lastPunch?._id ||
            null,
        };
      }
    }

    /*
     * Latest business date first, then worker.
     */
    items.sort(
      (
        left,
        right
      ) => {
        const dateCompare =
          String(
            right.businessDate
          ).localeCompare(
            String(
              left.businessDate
            )
          );

        if (
          dateCompare !==
          0
        ) {
          return dateCompare;
        }

        return String(
          left.employeeName ||
          left.biometricCode ||
          ""
        ).localeCompare(
          String(
            right.employeeName ||
            right.biometricCode ||
            ""
          )
        );
      }
    );

    return {
      items,

      rawPunchCount,

      workerDayCount:
        items.length,

      truncated:
        punches.length <
        rawPunchCount,
    };
  };



const getAttendance =
  async ({
    actorUserId,
    access,
    from,
    to,
    employeeId,
    departmentId,
    officeId,
    presenceStatus,
    workMode,

    /*
     * Optional biometric register controls.
     *
     * Existing callers remain unchanged.
     */
    includeUnmapped =
      false,

    provider =
      null,

    page = 1,
    limit = 100,
  }) => {
    const actorEmployee =
      await getEmployeeByUser(
        actorUserId
      );

    if (
      !actorEmployee &&
      String(
        access?.type ||
        ""
      ).toUpperCase() !==
        "ALL"
    ) {
      throw createError(
        "Employee profile not found for logged-in user.",
        403
      );
    }

    const query =
      await buildScopedEmployeeQuery(
        actorEmployee,
        access
      );

    if (
      from ||
      to
    ) {
      query.businessDate =
        {};

      if (
        from
      ) {
        query.businessDate
          .$gte =
          String(
            from
          );
      }

      if (
        to
      ) {
        query.businessDate
          .$lte =
          String(
            to
          );
      }
    }

    /*
     * Filters only narrow an already authorized scope.
     */
    if (
      employeeId
    ) {
      query.$and =
        query.$and ||
        [];

      query.$and.push({
        employeeId,
      });
    }

    if (
      departmentId
    ) {
      query.$and =
        query.$and ||
        [];

      query.$and.push({
        departmentId,
      });
    }

    if (
      officeId
    ) {
      query.officeId =
        officeId;
    }

    if (
      presenceStatus
    ) {
      query.presenceStatus =
        String(
          presenceStatus
        ).toUpperCase();
    }

    if (
      workMode
    ) {
      query.workMode =
        String(
          workMode
        ).toUpperCase();
    }

    const safeLimit =
      Math.min(
        Math.max(
          Number(
            limit
          ) ||
            100,
          1
        ),
        500
      );

    const safePage =
      Math.max(
        Number(
          page
        ) ||
          1,
        1
      );

    const [
      items,
      total,
    ] =
      await Promise.all([
        Attendance
          .find(
            query
          )
          .sort({
            businessDate:
              -1,

            employeeName:
              1,
          })
          .skip(
            (
              safePage -
              1
            ) *
              safeLimit
          )
          .limit(
            safeLimit
          )
          .lean(),

        Attendance
          .countDocuments(
            query
          ),
      ]);

    /* =====================================================
   OPTIONAL UNMAPPED BIOMETRIC REGISTER

   Existing Attendance response remains intact.

   We add biometric information separately so current
   frontend/API consumers are not broken.
===================================================== */

const normalizedIncludeUnmapped =
  String(
    includeUnmapped
  )
    .trim()
    .toLowerCase();

const shouldIncludeUnmapped =
  includeUnmapped ===
    true ||
  normalizedIncludeUnmapped ===
    "true" ||
  normalizedIncludeUnmapped ===
    "1";

let biometric = {
  unmapped:
    [],

  rawPunchCount:
    0,

  workerDayCount:
    0,

  truncated:
    false,
};

if (
  shouldIncludeUnmapped
) {
  biometric =
    await getUnmappedBiometricAttendance({
      access,

      from,

      to,

      officeId,

      provider,

      limit:
        20000,
    });
}

return {
  /*
   * Existing mapped Attendance.
   */
  items,

  /*
   * New biometric-only workers.
   *
   * Existing clients can safely ignore this property.
   */
  biometric,

  pagination: {
    page:
      safePage,

    limit:
      safeLimit,

    total,

    pages:
      Math.ceil(
        total /
          safeLimit
      ),
  },
};
  };

/* =========================================================
   MONTHLY SUMMARY
========================================================= */

const getMonthlySummary =
  async (
    options
  ) => {
    /*
     * Monthly payroll may exceed 500 Attendance rows.
     *
     * Fetch directly with authorized scope instead of relying
     * on one paginated page.
     */

    const actorEmployee =
      await getEmployeeByUser(
        options.actorUserId
      );

    if (
      !actorEmployee &&
      String(
        options.access
          ?.type ||
        ""
      ).toUpperCase() !==
        "ALL"
    ) {
      throw createError(
        "Employee profile not found for logged-in user.",
        403
      );
    }

    const query =
      await buildScopedEmployeeQuery(
        actorEmployee,
        options.access
      );

    query.businessDate =
      {};

    if (
      options.from
    ) {
      query.businessDate
        .$gte =
        String(
          options.from
        );
    }

    if (
      options.to
    ) {
      query.businessDate
        .$lte =
        String(
          options.to
        );
    }

    if (
      options.employeeId
    ) {
      query.$and =
        query.$and ||
        [];

      query.$and.push({
        employeeId:
          options.employeeId,
      });
    }

    if (
      options.departmentId
    ) {
      query.$and =
        query.$and ||
        [];

      query.$and.push({
        departmentId:
          options.departmentId,
      });
    }

    if (
      options.officeId
    ) {
      query.officeId =
        options.officeId;
    }

    const items =
      await Attendance
        .find(
          query
        )
        .sort({
          employeeName:
            1,

          businessDate:
            1,
        })
        .lean();

    const employeeMap =
      new Map();

    for (
      const item
      of items
    ) {
      const key =
        String(
          item.employeeId
        );

      if (
        !employeeMap.has(
          key
        )
      ) {
        employeeMap.set(
          key,
          {
            employeeId:
              item.employeeId,

            employeeCode:
              item.employeeCode,

            employeeName:
              item.employeeName,

            departmentId:
              item.departmentId,

            departmentName:
              item.departmentName ||
              "",

            present:
              0,

            absent:
              0,

            halfDay:
              0,

            leave:
              0,

            weekOff:
              0,

            holiday:
              0,

            notApplicable:
              0,

            notMarked:
              0,

            wfh:
              0,

            fieldVisit:
              0,

            onDuty:
              0,

            late:
              0,

            earlyExit:
              0,

            shortHours:
              0,

            totalWorkingMinutes:
              0,

            overtimeMinutes:
              0,
          }
        );
      }

      const summary =
        employeeMap.get(
          key
        );

      switch (
        item.presenceStatus
      ) {
        case "PRESENT":
          summary.present +=
            1;
          break;

        case "ABSENT":
          summary.absent +=
            1;
          break;

        case "HALF_DAY":
          summary.halfDay +=
            1;
          break;

        case "ON_LEAVE":
          summary.leave +=
            1;
          break;

        case "WEEK_OFF":
          summary.weekOff +=
            1;
          break;

        case "HOLIDAY":
          summary.holiday +=
            1;
          break;

        case "NOT_APPLICABLE":
          summary.notApplicable +=
            1;
          break;

        case "NOT_MARKED":
          summary.notMarked +=
            1;
          break;

        default:
          break;
      }

      if (
        item.workMode ===
        "WFH"
      ) {
        summary.wfh +=
          1;
      }

      if (
        item.workMode ===
        "FIELD_VISIT"
      ) {
        summary.fieldVisit +=
          1;
      }

      if (
        item.workMode ===
        "ON_DUTY"
      ) {
        summary.onDuty +=
          1;
      }

      if (
        item.isLate
      ) {
        summary.late +=
          1;
      }

      if (
        item.isEarlyExit
      ) {
        summary.earlyExit +=
          1;
      }

      if (
        item.isShortHours
      ) {
        summary.shortHours +=
          1;
      }

      summary
        .totalWorkingMinutes +=
        Number(
          item
            .totalWorkingMinutes ||
          0
        );

      summary
        .overtimeMinutes +=
        Number(
          item
            .overtimeMinutes ||
          0
        );
    }

    return [
      ...employeeMap.values(),
    ];
  };

/* =========================================================
   REQUEST REGULARIZATION
========================================================= */

const requestRegularization =
  async ({
    actorUserId,
    attendanceId,
    type,
    requested,
    reason,
    attachmentUrl,
  }) => {
    const employee =
      await getEmployeeByUser(
        actorUserId
      );

    if (
      !employee
    ) {
      throw createError(
        "Employee profile not found.",
        403
      );
    }

    if (
      !validObjectId(
        attendanceId
      )
    ) {
      throw createError(
        "Invalid attendanceId."
      );
    }

    const attendance =
      await Attendance
        .findOne({
          _id:
            attendanceId,

          employeeId:
            employee._id,
        });

    if (
      !attendance
    ) {
      throw createError(
        "Attendance record not found.",
        404
      );
    }

    const existing =
      await AttendanceRegularization
        .findOne({
          attendanceId:
            attendance._id,

          status:
            "PENDING",
        })
        .lean();

    if (
      existing
    ) {
      throw createError(
        "A regularization request is already pending for this attendance.",
        409
      );
    }

    const normalizedType =
      String(
        type ||
        ""
      )
        .trim()
        .toUpperCase();

    if (
      !normalizedType
    ) {
      throw createError(
        "Regularization type is required."
      );
    }

    if (
      !String(
        reason ||
        ""
      ).trim()
    ) {
      throw createError(
        "Regularization reason is required."
      );
    }

    const regularization =
      await AttendanceRegularization
        .create({
          attendanceId:
            attendance._id,

          employeeId:
            employee._id,

          businessDate:
            attendance
              .businessDate,

          type:
            normalizedType,

          original: {
            firstInAt:
              attendance
                .firstIn
                ?.time ||
              null,

            lastOutAt:
              attendance
                .lastOut
                ?.time ||
              null,

            workMode:
              attendance
                .workMode,

            shiftId:
              attendance
                .shiftId,

            presenceStatus:
              attendance
                .presenceStatus,

            totalWorkingMinutes:
              attendance
                .totalWorkingMinutes,
          },

          requested:
            requested ||
            {},

          reason:
            String(
              reason
            ).trim(),

          attachmentUrl:
            attachmentUrl ||
            null,

          requestedBy:
            actorUserId,

          status:
            "PENDING",
        });

    attendance.regularization = {
      requested:
        true,

      requestId:
        regularization._id,

      status:
        "PENDING",

      approvedBy:
        null,

      approvedAt:
        null,
    };

    await attendance.save();

    return regularization;
  };

/* =========================================================
   RECALCULATE REGULARIZED ATTENDANCE

   This is intentionally separate from raw punch rebuilding.

   Raw punches stay immutable.

   Effective firstIn/lastOut may be overridden by approved
   regularization.
========================================================= */

const calculateRegularizedAttendance =
  ({
    attendance,
    shift,
    policy,
    firstInAt,
    lastOutAt,
  }) => {
    const offset =
      shift.utcOffsetMinutes ??
      330;

    const expectedStartAt =
      localDateTimeToUtc(
        attendance.businessDate,
        shift.startTime,
        offset,
        0
      );

    const expectedEndAt =
      localDateTimeToUtc(
        attendance.businessDate,
        shift.endTime,
        offset,
        shift.crossesMidnight
          ? 1
          : 0
      );

    const requiredMinutes =
      Number(
        policy
          .requiredWorkingMinutes ||
        0
      ) >
      0
        ? Number(
            policy
              .requiredWorkingMinutes
          )
        : Number(
            shift.requiredMinutes ||
            0
          );

    const totalPresenceMinutes =
      firstInAt &&
      lastOutAt
        ? Math.max(
            0,
            Math.round(
              (
                new Date(
                  lastOutAt
                ).getTime() -
                new Date(
                  firstInAt
                ).getTime()
              ) /
                60000
            )
          )
        : 0;

    const breakMinutes =
      Math.max(
        0,
        Number(
          attendance
            .breakMinutes ||
          0
        )
      );

    const totalWorkingMinutes =
      Math.max(
        0,
        totalPresenceMinutes -
          breakMinutes
      );

    const lateGraceMinutes =
      Math.max(
        0,
        Number(
          policy
            .lateGraceMinutes ||
          0
        )
      );

    const earlyGraceMinutes =
      Math.max(
        0,
        Number(
          policy
            .earlyExitGraceMinutes ||
          0
        )
      );

    const lateThreshold =
      new Date(
        expectedStartAt.getTime() +
          lateGraceMinutes *
            60000
      );

    const earlyThreshold =
      new Date(
        expectedEndAt.getTime() -
          earlyGraceMinutes *
            60000
      );

    const lateMinutes =
      firstInAt &&
      new Date(
        firstInAt
      ) >
        lateThreshold
        ? Math.max(
            0,
            Math.round(
              (
                new Date(
                  firstInAt
                ).getTime() -
                expectedStartAt
                  .getTime()
              ) /
                60000
            )
          )
        : 0;

    const earlyExitMinutes =
      lastOutAt &&
      new Date(
        lastOutAt
      ) <
        earlyThreshold
        ? Math.max(
            0,
            Math.round(
              (
                expectedEndAt
                  .getTime() -
                new Date(
                  lastOutAt
                ).getTime()
              ) /
                60000
            )
          )
        : 0;

    const shortMinutes =
      Math.max(
        0,
        requiredMinutes -
          totalWorkingMinutes
      );

    let overtimeMinutes =
      0;

    if (
      policy.overtimeEnabled
    ) {
      const overtimeBase =
        Number(
          policy
            .overtimeAfterMinutes ||
          0
        ) >
        0
          ? Number(
              policy
                .overtimeAfterMinutes
            )
          : requiredMinutes;

      const calculated =
        Math.max(
          0,
          totalWorkingMinutes -
            overtimeBase
        );

      overtimeMinutes =
        calculated >=
        Number(
          policy
            .minimumOvertimeMinutes ||
          0
        )
          ? calculated
          : 0;
    }

    let presenceStatus =
      "NOT_MARKED";

    if (
      firstInAt
    ) {
      if (
        !lastOutAt
      ) {
        presenceStatus =
          policy
            .singlePunchCountsAsPresent
            ? "PRESENT"
            : "NOT_MARKED";
      } else if (
        totalWorkingMinutes >=
        Number(
          policy
            .minimumFullDayMinutes ||
          0
        )
      ) {
        presenceStatus =
          "PRESENT";
      } else if (
        totalWorkingMinutes >=
        Number(
          policy
            .minimumHalfDayMinutes ||
          0
        )
      ) {
        presenceStatus =
          "HALF_DAY";
      } else {
        presenceStatus =
          "HALF_DAY";
      }
    }

    return {
      expectedStartAt,

      expectedEndAt,

      requiredMinutes,

      totalPresenceMinutes,

      totalWorkingMinutes,

      lateMinutes,

      earlyExitMinutes,

      shortMinutes,

      overtimeMinutes,

      presenceStatus,

      isLate:
        lateMinutes >
        0,

      isEarlyExit:
        earlyExitMinutes >
        0,

      isShortHours:
        Boolean(
          lastOutAt &&
          shortMinutes >
            0
        ),

      missingCheckOut:
        Boolean(
          firstInAt &&
          !lastOutAt
        ),
    };
  };

/* =========================================================
   APPROVE REGULARIZATION

   IMPORTANT:

   Shift correction now recalculates attendance completely.

   It does NOT simply replace shiftId.
========================================================= */

const approveRegularization =
  async ({
    regularizationId,
    reviewerUserId,
    remarks = "",
  }) => {
    if (
      !validObjectId(
        regularizationId
      )
    ) {
      throw createError(
        "Invalid regularizationId."
      );
    }

    const request =
      await AttendanceRegularization
        .findOne({
          _id:
            regularizationId,

          status:
            "PENDING",
        });

    if (
      !request
    ) {
      throw createError(
        "Pending regularization request not found.",
        404
      );
    }

    const attendance =
      await Attendance
        .findById(
          request.attendanceId
        );

    if (
      !attendance
    ) {
      throw createError(
        "Attendance record not found.",
        404
      );
    }

    /* =====================================================
       DETERMINE EFFECTIVE SHIFT
    ===================================================== */

    let effectiveShift =
      null;

    const requestedShiftId =
      request.requested
        ?.shiftId ||
      attendance.shiftId;

    if (
      requestedShiftId
    ) {
      effectiveShift =
        await AttendanceShift
          .findOne({
            _id:
              requestedShiftId,

            active:
              true,
          })
          .lean();
    }

    if (
      !effectiveShift
    ) {
      throw createError(
        "Effective shift for regularization is missing or inactive."
      );
    }

    /* =====================================================
       POLICY
    ===================================================== */

    const policy =
      await AttendancePolicy
        .findOne({
          _id:
            attendance
              .attendancePolicyId,

          active:
            true,
        })
        .lean();

    if (
      !policy
    ) {
      throw createError(
        "Attendance policy is missing or inactive."
      );
    }

    /* =====================================================
       EFFECTIVE TIMES
    ===================================================== */

    const firstInAt =
      request.requested
        ?.firstInAt ||
      attendance.firstIn
        ?.time ||
      null;

    const lastOutAt =
      request.requested
        ?.lastOutAt ||
      attendance.lastOut
        ?.time ||
      null;

    if (
      firstInAt &&
      lastOutAt &&
      new Date(
        lastOutAt
      ) <
        new Date(
          firstInAt
        )
    ) {
      throw createError(
        "Regularized checkout cannot be earlier than check-in."
      );
    }

    const recalculated =
      calculateRegularizedAttendance({
        attendance,

        shift:
          effectiveShift,

        policy,

        firstInAt,

        lastOutAt,
      });

    /* =====================================================
       APPLY EFFECTIVE IN / OUT
    ===================================================== */

    if (
      firstInAt
    ) {
      attendance.firstIn = {
        time:
          firstInAt,

        source:
          request.requested
            ?.firstInAt
            ? "REGULARIZATION"
            : attendance
                .firstIn
                ?.source ||
              "BIOMETRIC",

        punchId:
          request.requested
            ?.firstInAt
            ? null
            : attendance
                .firstIn
                ?.punchId ||
              null,
      };
    }

    if (
      lastOutAt
    ) {
      attendance.lastOut = {
        time:
          lastOutAt,

        source:
          request.requested
            ?.lastOutAt
            ? "REGULARIZATION"
            : attendance
                .lastOut
                ?.source ||
              "BIOMETRIC",

        punchId:
          request.requested
            ?.lastOutAt
            ? null
            : attendance
                .lastOut
                ?.punchId ||
              null,
      };
    }

    if (
      request.requested
        ?.workMode
    ) {
      attendance.workMode =
        request.requested
          .workMode;
    }

    /* =====================================================
       SHIFT CORRECTION SNAPSHOT
    ===================================================== */

    attendance.shiftId =
      effectiveShift._id;

    attendance.shiftCode =
      effectiveShift.code;

    attendance.shiftName =
      effectiveShift.name;

    attendance.shiftCrossesMidnight =
      Boolean(
        effectiveShift
          .crossesMidnight
      );

    attendance.timezone =
      effectiveShift.timezone ||
      attendance.timezone ||
      "Asia/Kolkata";

    /* =====================================================
       RECALCULATED VALUES
    ===================================================== */

    attendance.expectedStartAt =
      recalculated
        .expectedStartAt;

    attendance.expectedEndAt =
      recalculated
        .expectedEndAt;

    attendance.requiredMinutes =
      recalculated
        .requiredMinutes;

    attendance.totalPresenceMinutes =
      recalculated
        .totalPresenceMinutes;

    attendance.totalWorkingMinutes =
      recalculated
        .totalWorkingMinutes;

    attendance.lateMinutes =
      recalculated
        .lateMinutes;

    attendance.earlyExitMinutes =
      recalculated
        .earlyExitMinutes;

    attendance.shortMinutes =
      recalculated
        .shortMinutes;

    attendance.overtimeMinutes =
      recalculated
        .overtimeMinutes;

    attendance.presenceStatus =
      recalculated
        .presenceStatus;

    attendance.isLate =
      recalculated.isLate;

    attendance.isEarlyExit =
      recalculated
        .isEarlyExit;

    attendance.isShortHours =
      recalculated
        .isShortHours;

    attendance.missingCheckOut =
      recalculated
        .missingCheckOut;

    attendance.wasRegularized =
      true;

    attendance.primarySource =
      "REGULARIZATION";

    attendance.regularization = {
      requested:
        true,

      requestId:
        request._id,

      status:
        "APPROVED",

      approvedBy:
        reviewerUserId,

      approvedAt:
        new Date(),
    };

    attendance.processingStatus =
      "PROCESSED";

    attendance.needsRecalculation =
      false;

    attendance.lastCalculatedAt =
      new Date();

    attendance.calculationError =
      null;

    if (
      Attendance.schema.path(
        "updatedBy"
      )
    ) {
      attendance.updatedBy =
        reviewerUserId;
    }

    if (
      Attendance.schema.path(
        "processingVersion"
      )
    ) {
      attendance.processingVersion =
        Number(
          attendance
            .processingVersion ||
          0
        ) +
        1;
    }

    await attendance.save();

    /* =====================================================
       APPROVE REQUEST
    ===================================================== */

    request.status =
      "APPROVED";

    request.reviewedBy =
      reviewerUserId;

    request.reviewedAt =
      new Date();

    request.reviewRemarks =
      remarks;

    request.recalculated = {
      firstInAt:
        attendance.firstIn
          ?.time ||
        null,

      lastOutAt:
        attendance.lastOut
          ?.time ||
        null,

      presenceStatus:
        attendance
          .presenceStatus,

      totalWorkingMinutes:
        attendance
          .totalWorkingMinutes,

      lateMinutes:
        attendance
          .lateMinutes,

      earlyExitMinutes:
        attendance
          .earlyExitMinutes,
    };

    await request.save();

    return {
      regularization:
        request,

      attendance,
    };
  };

/* =========================================================
   REJECT REGULARIZATION
========================================================= */

const rejectRegularization =
  async ({
    regularizationId,
    reviewerUserId,
    remarks = "",
  }) => {
    if (
      !validObjectId(
        regularizationId
      )
    ) {
      throw createError(
        "Invalid regularizationId."
      );
    }

    const request =
      await AttendanceRegularization
        .findOne({
          _id:
            regularizationId,

          status:
            "PENDING",
        });

    if (
      !request
    ) {
      throw createError(
        "Pending regularization request not found.",
        404
      );
    }

    request.status =
      "REJECTED";

    request.reviewedBy =
      reviewerUserId;

    request.reviewedAt =
      new Date();

    request.reviewRemarks =
      remarks;

    await request.save();

    await Attendance
      .updateOne(
        {
          _id:
            request.attendanceId,
        },

        {
          $set: {
            "regularization.status":
              "REJECTED",

            "regularization.requested":
              true,
          },
        }
      );

    return request;
  };

/* =========================================================
   REGULARIZATION LIST
========================================================= */

const getRegularizations =
  async ({
    employeeId = null,
    status = null,
    limit = 100,
  } = {}) => {
    const query =
      {};

    if (
      employeeId
    ) {
      query.employeeId =
        employeeId;
    }

    if (
      status
    ) {
      query.status =
        String(
          status
        )
          .trim()
          .toUpperCase();
    }

    return AttendanceRegularization
      .find(
        query
      )
      .sort({
        requestedAt:
          -1,
      })
      .limit(
        Math.min(
          Math.max(
            Number(
              limit
            ) ||
              100,
            1
          ),
          500
        )
      )
      .lean();
  };

/* =========================================================
   EXPORT
========================================================= */


/* =========================================================
   WEB ATTENDANCE

   Supported modes:

   WFH
   FIELD_VISIT
   ON_DUTY

   OFFICE remains biometric-first.

   Attendance is the daily summary.
   AttendanceLocationLog contains individual GPS checkpoints.
========================================================= */

/* =========================================================
   WEB ATTENDANCE MODE
========================================================= */

const WEB_ATTENDANCE_MODES = [
  "WFH",
  "FIELD_VISIT",
  "ON_DUTY",
];

/* =========================================================
   NORMALIZE WORK MODE
========================================================= */

const normalizeWebWorkMode =
  (
    value
  ) => {
    return String(
      value ||
        ""
    )
      .trim()
      .toUpperCase();
  };

/* =========================================================
   GPS VALIDATION
========================================================= */

const normalizeGpsPayload =
  (
    payload = {}
  ) => {
    const latitude =
      Number(
        payload.latitude
      );

    const longitude =
      Number(
        payload.longitude
      );

    const accuracyMeters =
      payload.accuracyMeters !==
        undefined &&
      payload.accuracyMeters !==
        null
        ? Number(
            payload
              .accuracyMeters
          )
        : payload.accuracy !==
            undefined &&
          payload.accuracy !==
            null
          ? Number(
              payload.accuracy
            )
          : null;

    if (
      !Number.isFinite(
        latitude
      ) ||
      latitude <
        -90 ||
      latitude >
        90
    ) {
      throw createError(
        "Valid latitude is required."
      );
    }

    if (
      !Number.isFinite(
        longitude
      ) ||
      longitude <
        -180 ||
      longitude >
        180
    ) {
      throw createError(
        "Valid longitude is required."
      );
    }

    if (
      accuracyMeters !==
        null &&
      (
        !Number.isFinite(
          accuracyMeters
        ) ||
        accuracyMeters <
          0
      )
    ) {
      throw createError(
        "accuracyMeters must be a positive number."
      );
    }

    return {
      latitude,
      longitude,
      accuracyMeters,
    };
  };

/* =========================================================
   DEVICE TYPE
========================================================= */

const resolveDeviceType =
  (
    userAgent = ""
  ) => {
    const value =
      String(
        userAgent ||
          ""
      ).toLowerCase();

    if (
      /ipad|tablet/.test(
        value
      )
    ) {
      return "TABLET";
    }

    if (
      /android|iphone|ipod|mobile/.test(
        value
      )
    ) {
      return "MOBILE";
    }

    if (
      value
    ) {
      return "DESKTOP";
    }

    return "UNKNOWN";
  };

/* =========================================================
   REQUEST META
========================================================= */

const normalizeRequestMeta =
  (
    requestMeta = {}
  ) => {
    return {
      ipAddress:
        String(
          requestMeta
            .ipAddress ||
            ""
        ).trim(),

      userAgent:
        String(
          requestMeta
            .userAgent ||
            ""
        ).trim(),

      deviceType:
        requestMeta
          .deviceType ||
        resolveDeviceType(
          requestMeta
            .userAgent
        ),
    };
  };

/* =========================================================
   WEB ATTENDANCE CONTEXT

   IMPORTANT:

   We deliberately use the existing attendance context resolver.

   Therefore:
   - published weekly roster still wins
   - night shift still works
   - default shift fallback still works
   - policy remains authoritative
========================================================= */

const resolveWebAttendanceContext =
  async (
    employee,
    now
  ) => {
    const profileContext =
      await resolveAttendanceProfile(
        employee._id,
        now
      );

    if (
      !profileContext
    ) {
      throw createError(
        "No active attendance profile found for employee.",
        403
      );
    }

    const {
      profile,
    } =
      profileContext;

    if (
      profile
        .attendanceEnabled ===
      false
    ) {
      throw createError(
        "Attendance is disabled for this employee.",
        403
      );
    }

    /*
     * Use existing punch/business-date resolver so web
     * attendance follows exactly the same shift date logic.
     */
    const context =
      await resolvePunchAttendanceContext(
        employee._id,
        now
      );

    if (
      context
        .scheduledDayType !==
      "SHIFT"
    ) {
      throw createError(
        `Attendance cannot be started because ${context.scheduledDayType} is scheduled for this date.`,
        409
      );
    }

    if (
      !context.shift
    ) {
      throw createError(
        "Attendance shift could not be resolved.",
        409
      );
    }

    return context;
  };

/* =========================================================
   CHECK ALLOWED WEB MODE
========================================================= */

const assertWebModeAllowed =
  (
    profile,
    workMode
  ) => {
    if (
      !WEB_ATTENDANCE_MODES
        .includes(
          workMode
        )
    ) {
      throw createError(
        "Web attendance supports WFH, FIELD_VISIT or ON_DUTY only."
      );
    }

    const allowedModes =
      Array.isArray(
        profile
          ?.allowedModes
      )
        ? profile
            .allowedModes
            .map(
              (
                item
              ) =>
                String(
                  item ||
                    ""
                )
                  .trim()
                  .toUpperCase()
            )
        : [];

    if (
      !allowedModes.includes(
        workMode
      )
    ) {
      throw createError(
        `${workMode} attendance is not enabled for this employee.`,
        403
      );
    }
  };

/* =========================================================
   BUILD WEB ATTENDANCE BASE
========================================================= */

const buildWebAttendanceBase =
  ({
    employee,
    context,
    workMode,
    actorUserId,
  }) => {
    const {
      profile,
      policy,
      shift,
      businessDate,
    } =
      context;

    const snapshot =
      buildEmployeeSnapshot(
        employee
      );

    const offset =
      shift
        .utcOffsetMinutes ??
      330;

    const expectedStartAt =
      localDateTimeToUtc(
        businessDate,
        shift.startTime,
        offset,
        0
      );

    const expectedEndAt =
      localDateTimeToUtc(
        businessDate,
        shift.endTime,
        offset,
        shift.crossesMidnight
          ? 1
          : 0
      );

    const requiredMinutes =
      Number(
        policy
          ?.requiredWorkingMinutes ||
          0
      ) >
      0
        ? Number(
            policy
              .requiredWorkingMinutes
          )
        : Number(
            shift
              .requiredMinutes ||
              0
          );

    return {
      ...snapshot,

      businessDate,

      attendanceDate:
        new Date(
          `${businessDate}T00:00:00.000Z`
        ),

      timezone:
        shift.timezone ||
        "Asia/Kolkata",

      officeId:
        profile.officeId ||
        null,

      shiftId:
        shift._id,

      shiftCode:
        shift.code ||
        null,

      shiftName:
        shift.name ||
        "",

      shiftCrossesMidnight:
        Boolean(
          shift
            .crossesMidnight
        ),

      attendancePolicyId:
        policy?._id ||
        profile
          .attendancePolicyId ||
        null,

      expectedStartAt,

      expectedEndAt,

      requiredMinutes,

      workMode,

      primarySource:
        "WEB",

      processingStatus:
        "PROCESSED",

      needsRecalculation:
        false,

      calculationError:
        null,

      lastCalculatedAt:
        new Date(),

      updatedBy:
        actorUserId ||
        null,
    };
  };

/* =========================================================
   CREATE LOCATION LOG
========================================================= */

const createAttendanceLocationLog =
  async ({
    attendance,
    employee,
    workMode,
    gps,
    source,
    requestMeta,
    capturedAt,
  }) => {
    const meta =
      normalizeRequestMeta(
        requestMeta
      );

    /*
     * Convert the browser GPS coordinates into a
     * human-readable address.
     *
     * reverseGeocode() is intentionally fault-tolerant.
     * If the provider is unavailable, attendance should
     * still be recorded using the authoritative coordinates.
     */
    const locationAddress =
      await reverseGeocode(
        gps.latitude,
        gps.longitude
      );

    const log =
      await AttendanceLocationLog
        .create({
          employeeId:
            employee._id,

          userId:
            employee.user ||
            null,

          attendanceId:
            attendance._id,

          businessDate:
            attendance
              .businessDate,

          capturedAt:
            capturedAt ||
            new Date(),

          latitude:
            gps.latitude,

          longitude:
            gps.longitude,

          accuracyMeters:
            gps.accuracyMeters,

          source,

          workMode,

          officeId:
            attendance
              .officeId ||
            null,

          /*
           * Office geofence classification will be
           * calculated separately from the employee's
           * configured office.
           */
          distanceFromOfficeMeters:
            null,

          isWithinOffice:
            false,

          locationType:
            "UNKNOWN",

          locationAddress:
            locationAddress ||
            "",

          ipAddress:
            meta.ipAddress,

          userAgent:
            meta.userAgent,

          deviceType:
            meta.deviceType,
        });

    return log;
  };

/* =========================================================
   START WEB ATTENDANCE
========================================================= */

const startWebAttendance =
  async ({
    actorUserId,
    workMode,
    latitude,
    longitude,
    accuracy,
    accuracyMeters,
    dutyPurpose,
    purpose,
    dutyLocation,
    locationName,
    requestMeta = {},
  }) => {
    const employee =
      await getEmployeeByUser(
        actorUserId
      );

    if (
      !employee
    ) {
      throw createError(
        "Employee profile not found for logged-in user.",
        403
      );
    }

    const normalizedMode =
      normalizeWebWorkMode(
        workMode
      );

    const gps =
      normalizeGpsPayload({
        latitude,
        longitude,

        accuracy,

        accuracyMeters,
      });

    const now =
      new Date();

    const context =
      await resolveWebAttendanceContext(
        employee,
        now
      );

    assertWebModeAllowed(
      context.profile,
      normalizedMode
    );

    const normalizedPurpose =
      String(
        dutyPurpose ||
          purpose ||
          ""
      ).trim();

    const normalizedLocation =
      String(
        dutyLocation ||
          locationName ||
          ""
      ).trim();

    if (
      [
        "FIELD_VISIT",
        "ON_DUTY",
      ].includes(
        normalizedMode
      )
    ) {
      if (
        !normalizedPurpose
      ) {
        throw createError(
          "Work purpose is required for Field Visit / On Duty attendance."
        );
      }

      if (
        !normalizedLocation
      ) {
        throw createError(
          "Work location is required for Field Visit / On Duty attendance."
        );
      }
    }

    const existing =
      await Attendance
        .findOne({
          employeeId:
            employee._id,

          businessDate:
            context
              .businessDate,
        });

    if (
      existing
        ?.firstIn
        ?.time
    ) {
      throw createError(
        "Attendance has already been started for this business date.",
        409
      );
    }

    const base =
      buildWebAttendanceBase({
        employee,

        context,

        workMode:
          normalizedMode,

        actorUserId,
      });

    const update = {
      ...base,

      firstIn: {
        time:
          now,

        source:
          "WEB",

        punchId:
          null,
      },

      lastOut: {
        time:
          null,

        source:
          null,

        punchId:
          null,
      },

      punchCount:
        1,

      totalPresenceMinutes:
        0,

      totalWorkingMinutes:
        0,

      lateMinutes:
        0,

      earlyExitMinutes:
        0,

      shortMinutes:
        0,

      overtimeMinutes:
        0,

      presenceStatus:
        "PRESENT",

      isLate:
        false,

      isEarlyExit:
        false,

      isShortHours:
        false,

      missingCheckIn:
        false,

      missingCheckOut:
        true,

      createdBy:
        actorUserId ||
        null,
    };

    if (
      normalizedMode ===
      "WFH"
    ) {
      update.wfh = {
        requested:
          true,

        approved:
          true,

        referenceId:
          null,

        checkInLocation: {
          latitude:
            gps.latitude,

          longitude:
            gps.longitude,

          accuracyMeters:
            gps.accuracyMeters,

          capturedAt:
            now,
        },

        checkOutLocation: {
          latitude:
            null,

          longitude:
            null,

          accuracyMeters:
            null,

          capturedAt:
            null,
        },
      };
    }

    if (
      [
        "FIELD_VISIT",
        "ON_DUTY",
      ].includes(
        normalizedMode
      )
    ) {
      update.dutyPurpose =
        normalizedPurpose;

      update.dutyLocation =
        normalizedLocation;
    }

    const shouldTrack =
      Boolean(
        context.profile
          .trackingRequired
      ) ||
      [
        "FIELD_VISIT",
        "ON_DUTY",
      ].includes(
        normalizedMode
      );

    update.fieldTracking = {
      enabled:
        shouldTrack,

      startedAt:
        shouldTrack
          ? now
          : null,

      stoppedAt:
        null,

      lastLocationAt:
        now,

      pointCount:
        1,

      trackingIntervalMinutes:
        30,
    };

    let attendance;

    if (
      existing
    ) {
      Object.assign(
        existing,
        update
      );

      attendance =
        await existing.save();
    } else {
      attendance =
        await Attendance
          .create(
            update
          );
    }

    await createAttendanceLocationLog({
      attendance,

      employee,

      workMode:
        normalizedMode,

      gps,

      source:
        "CHECK_IN",

      requestMeta,

      capturedAt:
        now,
    });

    return attendance;
  };

/* =========================================================
   STOP WEB ATTENDANCE
========================================================= */

const stopWebAttendance =
  async ({
    actorUserId,
    latitude,
    longitude,
    accuracy,
    accuracyMeters,
    requestMeta = {},
  }) => {
    const employee =
      await getEmployeeByUser(
        actorUserId
      );

    if (
      !employee
    ) {
      throw createError(
        "Employee profile not found for logged-in user.",
        403
      );
    }

    const now =
      new Date();

    /*
     * Resolve today's shift context first so night-shift
     * checkout correctly resolves to previous businessDate.
     */
    const context =
      await resolveWebAttendanceContext(
        employee,
        now
      );

    const attendance =
      await Attendance
        .findOne({
          employeeId:
            employee._id,

          businessDate:
            context
              .businessDate,
        });

    if (
      !attendance
    ) {
      throw createError(
        "Active web attendance was not found.",
        404
      );
    }

    if (
      attendance
        .primarySource !==
      "WEB"
    ) {
      throw createError(
        "This attendance is not an active web attendance session.",
        409
      );
    }

    if (
      !WEB_ATTENDANCE_MODES
        .includes(
          attendance
            .workMode
        )
    ) {
      throw createError(
        "This attendance cannot be checked out through web attendance.",
        409
      );
    }

    if (
      !attendance
        .firstIn
        ?.time
    ) {
      throw createError(
        "Attendance has not been started.",
        409
      );
    }

    if (
      attendance
        .lastOut
        ?.time
    ) {
      throw createError(
        "Attendance has already been completed.",
        409
      );
    }

    const gps =
      normalizeGpsPayload({
        latitude,
        longitude,

        accuracy,

        accuracyMeters,
      });

    const firstInAt =
      new Date(
        attendance
          .firstIn
          .time
      );

    const totalPresenceMinutes =
      Math.max(
        0,
        Math.round(
          (
            now.getTime() -
            firstInAt.getTime()
          ) /
            60000
        )
      );

    const breakMinutes =
      Math.max(
        0,
        Number(
          attendance
            .breakMinutes ||
            0
        )
      );

    const totalWorkingMinutes =
      Math.max(
        0,
        totalPresenceMinutes -
          breakMinutes
      );

    const policy =
      context.policy;

    const shift =
      context.shift;

    const requiredMinutes =
      Number(
        attendance
          .requiredMinutes ||
          policy
            ?.requiredWorkingMinutes ||
          shift
            ?.requiredMinutes ||
          0
      );

    const lateGraceMinutes =
      Math.max(
        0,
        Number(
          policy
            ?.lateGraceMinutes ||
            0
        )
      );

    const earlyGraceMinutes =
      Math.max(
        0,
        Number(
          policy
            ?.earlyExitGraceMinutes ||
            0
        )
      );

    const expectedStartAt =
      attendance
        .expectedStartAt
        ? new Date(
            attendance
              .expectedStartAt
          )
        : null;

    const expectedEndAt =
      attendance
        .expectedEndAt
        ? new Date(
            attendance
              .expectedEndAt
          )
        : null;

    let lateMinutes =
      0;

    if (
      expectedStartAt &&
      firstInAt >
        expectedStartAt
    ) {
      lateMinutes =
        Math.max(
          0,
          Math.round(
            (
              firstInAt.getTime() -
              expectedStartAt.getTime()
            ) /
              60000
          ) -
            lateGraceMinutes
        );
    }

    let earlyExitMinutes =
      0;

    if (
      expectedEndAt &&
      now <
        expectedEndAt
    ) {
      earlyExitMinutes =
        Math.max(
          0,
          Math.round(
            (
              expectedEndAt.getTime() -
              now.getTime()
            ) /
              60000
          ) -
            earlyGraceMinutes
        );
    }

    const shortMinutes =
      Math.max(
        0,
        requiredMinutes -
          totalWorkingMinutes
      );

    const overtimeMinutes =
      Math.max(
        0,
        totalWorkingMinutes -
          requiredMinutes
      );

    attendance.lastOut = {
      time:
        now,

      source:
        "WEB",

      punchId:
        null,
    };

    attendance.punchCount =
      Math.max(
        Number(
          attendance
            .punchCount ||
            0
        ),
        1
      ) +
      1;

    attendance
      .totalPresenceMinutes =
      totalPresenceMinutes;

    attendance
      .totalWorkingMinutes =
      totalWorkingMinutes;

    attendance.lateMinutes =
      lateMinutes;

    attendance
      .earlyExitMinutes =
      earlyExitMinutes;

    attendance.shortMinutes =
      shortMinutes;

    attendance
      .overtimeMinutes =
      overtimeMinutes;

    attendance.isLate =
      lateMinutes >
      0;

    attendance.isEarlyExit =
      earlyExitMinutes >
      0;

    attendance.isShortHours =
      shortMinutes >
      0;

    attendance.missingCheckIn =
      false;

    attendance.missingCheckOut =
      false;

    attendance.presenceStatus =
      "PRESENT";

    attendance.processingStatus =
      "PROCESSED";

    attendance.needsRecalculation =
      false;

    attendance.lastCalculatedAt =
      now;

    attendance.updatedBy =
      actorUserId;

    if (
      attendance.workMode ===
      "WFH"
    ) {
      attendance.wfh =
        attendance.wfh ||
        {};

      attendance
        .wfh
        .checkOutLocation = {
          latitude:
            gps.latitude,

          longitude:
            gps.longitude,

          accuracyMeters:
            gps.accuracyMeters,

          capturedAt:
            now,
        };
    }

    attendance.fieldTracking =
      attendance
        .fieldTracking ||
      {};

    attendance
      .fieldTracking
      .lastLocationAt =
      now;

    attendance
      .fieldTracking
      .stoppedAt =
      now;

    attendance
      .fieldTracking
      .enabled =
      false;

    attendance
      .fieldTracking
      .pointCount =
      Math.max(
        0,
        Number(
          attendance
            .fieldTracking
            .pointCount ||
            0
        )
      ) +
      1;

    await attendance.save();

    await createAttendanceLocationLog({
      attendance,

      employee,

      workMode:
        attendance
          .workMode,

      gps,

      source:
        "CHECK_OUT",

      requestMeta,

      capturedAt:
        now,
    });

    return attendance;
  };

/* =========================================================
   ADD LOCATION CHECKPOINT
========================================================= */

const addLocationCheckpoint =
  async ({
    actorUserId,
    latitude,
    longitude,
    accuracy,
    accuracyMeters,
    source =
      "PERIODIC",
    requestMeta = {},
  }) => {
    const employee =
      await getEmployeeByUser(
        actorUserId
      );

    if (
      !employee
    ) {
      throw createError(
        "Employee profile not found for logged-in user.",
        403
      );
    }

    const now =
      new Date();

    const context =
      await resolveWebAttendanceContext(
        employee,
        now
      );

    const attendance =
      await Attendance
        .findOne({
          employeeId:
            employee._id,

          businessDate:
            context
              .businessDate,
        });

    if (
      !attendance ||
      !attendance
        .firstIn
        ?.time ||
      attendance
        .lastOut
        ?.time
    ) {
      throw createError(
        "No active web attendance session found.",
        409
      );
    }

    if (
      attendance
        .primarySource !==
      "WEB"
    ) {
      throw createError(
        "Location checkpoints are available only for active web attendance.",
        409
      );
    }

    if (
      !WEB_ATTENDANCE_MODES
        .includes(
          attendance
            .workMode
        )
    ) {
      throw createError(
        "Location checkpoint is not supported for this work mode.",
        409
      );
    }

    const gps =
      normalizeGpsPayload({
        latitude,
        longitude,

        accuracy,

        accuracyMeters,
      });

    const normalizedSource =
      String(
        source ||
          "PERIODIC"
      )
        .trim()
        .toUpperCase();

    const allowedSources = [
      "PERIODIC",
      "FOREGROUND",
      "MANUAL_REFRESH",
    ];

    if (
      !allowedSources.includes(
        normalizedSource
      )
    ) {
      throw createError(
        "Invalid location checkpoint source."
      );
    }

    const log =
      await createAttendanceLocationLog({
        attendance,

        employee,

        workMode:
          attendance
            .workMode,

        gps,

        source:
          normalizedSource,

        requestMeta,

        capturedAt:
          now,
      });

    attendance.fieldTracking =
      attendance
        .fieldTracking ||
      {};

    attendance
      .fieldTracking
      .lastLocationAt =
      now;

    attendance
      .fieldTracking
      .pointCount =
      Math.max(
        0,
        Number(
          attendance
            .fieldTracking
            .pointCount ||
            0
        )
      ) +
      1;

    attendance.updatedBy =
      actorUserId;

    await attendance.save();

    return {
      attendanceId:
        attendance._id,

      businessDate:
        attendance
          .businessDate,

      workMode:
        attendance
          .workMode,

      location:
        log,

      pointCount:
        attendance
          .fieldTracking
          .pointCount,
    };
  };

/* =========================================================
   LOCATION HISTORY

   IMPORTANT:
   Controller must pass already-authorized scope.

   This function also enforces that requested employee belongs
   to that scope.
========================================================= */

const getEmployeeLocationHistory =
  async ({
    actorUserId,
    access,
    employeeId,
    businessDate,
    from,
    to,
    limit = 500,
  }) => {
    if (
      !validObjectId(
        employeeId
      )
    ) {
      throw createError(
        "Invalid employeeId."
      );
    }

    const actorEmployee =
      await getEmployeeByUser(
        actorUserId
      );

    if (
      !actorEmployee &&
      String(
        access?.type ||
          ""
      ).toUpperCase() !==
        "ALL"
    ) {
      throw createError(
        "Employee profile not found for logged-in user.",
        403
      );
    }

    const scopedQuery =
      await buildScopedEmployeeQuery(
        actorEmployee,
        access
      );

    const attendanceScope = {
      ...scopedQuery,

      employeeId:
        new mongoose.Types.ObjectId(
          employeeId
        ),
    };

    const authorizedAttendance =
      await Attendance
        .findOne(
          attendanceScope
        )
        .select(
          "_id employeeId businessDate workMode firstIn lastOut"
        )
        .lean();

    /*
     * If scope query contains employeeId already, object spread
     * above intentionally narrows to requested employee.
     *
     * Explicit self/team/department verification follows.
     */
    const accessType =
      String(
        access?.type ||
          "SELF"
      )
        .trim()
        .toUpperCase();

    if (
      accessType ===
        "SELF" &&
      String(
        actorEmployee?._id ||
          ""
      ) !==
        String(
          employeeId
        )
    ) {
      throw createError(
        "You are not authorized to view this employee's location history.",
        403
      );
    }

    if (
      accessType !==
        "ALL" &&
      !authorizedAttendance
    ) {
      /*
       * Verify through employee scope even if there is no
       * attendance record matching the first query.
       */
      let employeeAuthorized =
        false;

      if (
        accessType ===
        "TEAM"
      ) {
        const teamIds =
          await getReportingTreeIds(
            actorEmployee?._id
          );

        employeeAuthorized =
          teamIds.some(
            (
              id
            ) =>
              String(
                id
              ) ===
              String(
                employeeId
              )
          );
      } else if (
        accessType ===
        "DEPARTMENT"
      ) {
        const targetEmployee =
          await Employee
            .findById(
              employeeId
            )
            .select(
              "department"
            )
            .lean();

        const allowedDepartments =
          Array.isArray(
            access
              ?.departmentIds
          ) &&
          access
            .departmentIds
            .length
            ? access
                .departmentIds
                .map(String)
            : actorEmployee
                ?.department
              ? [
                  String(
                    actorEmployee
                      .department
                  ),
                ]
              : [];

        employeeAuthorized =
          Boolean(
            targetEmployee &&
            allowedDepartments
              .includes(
                String(
                  targetEmployee
                    .department ||
                    ""
                )
              )
          );
      }

      if (
        !employeeAuthorized
      ) {
        throw createError(
          "You are not authorized to view this employee's location history.",
          403
        );
      }
    }

    const query = {
      employeeId:
        new mongoose.Types.ObjectId(
          employeeId
        ),
    };

    if (
      businessDate
    ) {
      query.businessDate =
        String(
          businessDate
        );
    } else if (
      from ||
      to
    ) {
      query.businessDate =
        {};

      if (
        from
      ) {
        query.businessDate
          .$gte =
          String(
            from
          );
      }

      if (
        to
      ) {
        query.businessDate
          .$lte =
          String(
            to
          );
      }
    }

    const safeLimit =
      Math.min(
        Math.max(
          Number(
            limit
          ) ||
            500,
          1
        ),
        2000
      );

    return AttendanceLocationLog
      .find(
        query
      )
      .sort({
        capturedAt:
          1,
      })
      .limit(
        safeLimit
      )
      .lean();
  };

module.exports = {
  // KEEP ALL YOUR EXISTING EXPORTS EXACTLY AS THEY ARE

  resolveBusinessDate,

  resolveAttendanceProfile,

  getPublishedShiftAssignment,

  isPunchWithinShiftWindow,

  resolvePunchAttendanceContext,

  resolveAttendanceContextForBusinessDate,

  calculateAttendance,

  processRawPunch,

  processPendingPunches,

  rebuildAttendanceDay,

  getEmployeeByUser,

  getReportingTreeIds,

  getUnmappedBiometricAttendance,


  getAttendance,

  getMonthlySummary,

  requestRegularization,

  approveRegularization,

  // KEEP THE REST OF YOUR CURRENT EXPORTS

  startWebAttendance,

  stopWebAttendance,

  addLocationCheckpoint,

  getEmployeeLocationHistory,
};
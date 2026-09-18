const mongoose = require("mongoose");

const AttendanceShift =
  require(
    "./attendanceShift.model"
  );

const ShiftRoster =
  require(
    "./shiftRoster.model"
  );

const ShiftAssignment =
  require(
    "./shiftAssignment.model"
  );

const employeeModule =
  require(
    "../../employee/employee.model"
  );

const {
  assertDateKey,
  getWeekRange,
  getWeekDates,
  getDayName,
  getIsoWeekInfo,
  isDateWithinRange,
  addDays,
} =
  require(
    "./shiftCalendar.util"
  );

const Employee =
  employeeModule?.Employee ||
  employeeModule?.default ||
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

const assertObjectId =
  (
    value,
    name
  ) => {
    if (
      !mongoose
        .Types
        .ObjectId
        .isValid(
          String(
            value ||
            ""
          )
        )
    ) {
      throw createError(
        `${name} is invalid.`
      );
    }
  };

/* =========================================================
   NORMALIZE
========================================================= */

const normalizeOrgUnitCode =
  (
    value
  ) =>
    String(
      value ||
      ""
    )
      .trim()
      .toUpperCase();

const normalizeStatus =
  (
    value
  ) =>
    String(
      value ||
      ""
    )
      .trim()
      .toUpperCase();

const sameId =
  (
    a,
    b
  ) =>
    String(
      a ||
      ""
    ) ===
    String(
      b ||
      ""
    );

/* =========================================================
   SHIFT MASTER - CREATE
========================================================= */

const createShift =
  async (
    payload,
    userId
  ) => {
    return AttendanceShift
      .create({
        ...payload,

        createdBy:
          userId ||
          null,

        updatedBy:
          userId ||
          null,
      });
  };

/* =========================================================
   SHIFT MASTER - UPDATE
========================================================= */

const updateShift =
  async (
    shiftId,
    payload,
    userId
  ) => {
    assertObjectId(
      shiftId,
      "shiftId"
    );

    const shift =
      await AttendanceShift
        .findById(
          shiftId
        );

    if (
      !shift
    ) {
      throw createError(
        "Shift not found.",
        404
      );
    }

    const allowed = [
      "name",
      "code",
      "type",
      "officeId",
      "startTime",
      "endTime",
      "timezone",
      "utcOffsetMinutes",
      "requiredMinutes",
      "punchWindowBeforeMinutes",
      "punchWindowAfterMinutes",
      "applicableGenders",
      "isDefault",
      "active",
      "description",
    ];

    allowed.forEach(
      (
        key
      ) => {
        if (
          Object
            .prototype
            .hasOwnProperty
            .call(
              payload,
              key
            )
        ) {
          shift[key] =
            payload[key];
        }
      }
    );

    shift.updatedBy =
      userId ||
      null;

    await shift.save();

    return shift;
  };

/* =========================================================
   SHIFT MASTER - LIST
========================================================= */

const getShifts =
  async ({
    officeId = null,
    active = null,
  } = {}) => {
    const query =
      {};

    if (
      officeId
    ) {
      assertObjectId(
        officeId,
        "officeId"
      );

      query.$or = [
        {
          officeId,
        },
        {
          officeId:
            null,
        },
      ];
    }

    if (
      active !==
        null &&
      active !==
        undefined &&
      active !==
        ""
    ) {
      query.active =
        String(
          active
        ) !==
        "false";
    }

    return AttendanceShift
      .find(
        query
      )
      .sort({
        name:
          1,
      })
      .lean();
  };

/* =========================================================
   REFRESH ROSTER COUNTS

   ShiftAssignment is source of truth.
========================================================= */

async function refreshRosterCounts(
  rosterId
) {
  const assignments =
    await ShiftAssignment
      .find({
        rosterId,
      })
      .select(
        "employeeId"
      )
      .lean();

  const employeeIds =
    new Set(
      assignments.map(
        (
          item
        ) =>
          String(
            item.employeeId
          )
      )
    );

  await ShiftRoster
    .updateOne(
      {
        _id:
          rosterId,
      },
      {
        $set: {
          employeeCount:
            employeeIds.size,

          assignmentCount:
            assignments.length,
        },
      }
    );

  return {
    employeeCount:
      employeeIds.size,

    assignmentCount:
      assignments.length,
  };
}

/* =========================================================
   DEPARTMENT ID FOR ORG UNIT

   orgUnitCode is primary.

   departmentId is compatibility metadata, useful for repairing
   older roster records.
========================================================= */

const resolveDepartmentIdForOrgUnit =
  async (
    orgUnitCode,
    departmentId = null
  ) => {
    if (
      departmentId
    ) {
      assertObjectId(
        departmentId,
        "departmentId"
      );

      return departmentId;
    }

    const employee =
      await Employee
        .findOne({
          orgUnitCode:
            normalizeOrgUnitCode(
              orgUnitCode
            ),

          department: {
            $exists:
              true,

            $ne:
              null,
          },
        })
        .select(
          "department"
        )
        .lean();

    return (
      employee
        ?.department ||
      null
    );
  };

/* =========================================================
   COPY STRONGER WORKFLOW STATE

   PUBLISHED > SUBMITTED > DRAFT
========================================================= */

const applyStrongerWorkflowState =
  (
    target,
    source
  ) => {
    const rank = {
      DRAFT:
        1,

      SUBMITTED:
        2,

      PUBLISHED:
        3,
    };

    const sourceRank =
      rank[
        normalizeStatus(
          source?.status
        )
      ] ||
      0;

    const targetRank =
      rank[
        normalizeStatus(
          target?.status
        )
      ] ||
      0;

    if (
      sourceRank <=
      targetRank
    ) {
      return;
    }

    target.status =
      source.status;

    target.submittedBy =
      source.submittedBy ||
      target.submittedBy;

    target.submittedAt =
      source.submittedAt ||
      target.submittedAt;

    target.reviewedBy =
      source.reviewedBy ||
      target.reviewedBy;

    target.reviewedAt =
      source.reviewedAt ||
      target.reviewedAt;

    target.reviewRemarks =
      source.reviewRemarks ||
      target.reviewRemarks ||
      "";

    target.publishedBy =
      source.publishedBy ||
      target.publishedBy;

    target.publishedAt =
      source.publishedAt ||
      target.publishedAt;
  };

/* =========================================================
   CANCEL DUPLICATE ROSTER SHELL
========================================================= */

const cancelDuplicateRoster =
  async (
    duplicate,
    canonicalRosterId,
    userId = null
  ) => {
    if (
      !duplicate?._id
    ) {
      return;
    }

    const nextNotes =
      `${
        duplicate.notes ||
        ""
      }
Auto-consolidated into roster ${canonicalRosterId}.`
        .trim();

    /*
     * IMPORTANT:
     *
     * Do NOT call duplicate.save() here.
     *
     * Legacy roster documents may not contain orgUnitCode.
     * The current schema requires orgUnitCode, so .save()
     * would trigger full document validation and fail.
     *
     * updateOne() intentionally repairs/cancels the legacy
     * document without re-validating missing historical fields.
     */
    await ShiftRoster
      .updateOne(
        {
          _id:
            duplicate._id,
        },
        {
          $set: {
            status:
              "CANCELLED",

            cancelledAt:
              duplicate.cancelledAt ||
              new Date(),

            cancelledBy:
              userId ||
              duplicate.cancelledBy ||
              null,

            notes:
              nextNotes,

            employeeCount:
              Number(
                duplicate.employeeCount ||
                0
              ),

            assignmentCount:
              Number(
                duplicate.assignmentCount ||
                0
              ),
          },
        },
        {
          runValidators:
            false,
        }
      );

    /*
     * Keep the in-memory object consistent too.
     */
    duplicate.status =
      "CANCELLED";

    duplicate.cancelledAt =
      duplicate.cancelledAt ||
      new Date();

    duplicate.cancelledBy =
      userId ||
      duplicate.cancelledBy ||
      null;

    duplicate.notes =
      nextNotes;
  };

/* =========================================================
   CONSOLIDATE ROSTER SCOPE

   ONE REAL ACTIVE ROSTER:

   orgUnitCode
   +
   officeId
   +
   weekStartDate

   This repairs the previous situation:

   old HR roster
   -> actual Night Shift assignments

   new HR roster
   -> empty DRAFT

   The result becomes ONE canonical roster.
========================================================= */

const consolidateRosterScope =
  async ({
    orgUnitCode,
    departmentId = null,
    officeId = null,
    weekStartDate,
    weekEndDate,
    weekKey,
    companyCode = null,
    sourceAttachmentUrl = null,
    sourceAttachmentName = "",
    notes = "",
    createdBy,
  }) => {
    const normalizedOrgUnitCode =
      normalizeOrgUnitCode(
        orgUnitCode
      );

    const effectiveDepartmentId =
      await resolveDepartmentIdForOrgUnit(
        normalizedOrgUnitCode,
        departmentId
      );

    /* =====================================================
       FIND CANONICAL NEW-SCHEMA ROSTER
    ===================================================== */

    const canonicalCandidates =
  await ShiftRoster
    .find({
      orgUnitCode:
        normalizedOrgUnitCode,

      officeId:
        officeId ||
        null,

      weekStartDate,

      status: {
        $ne:
          "CANCELLED",
      },
    });

let canonical =
  null;

if (
  canonicalCandidates.length
) {
  const scoredCandidates =
    [];

  for (
    const candidate
    of canonicalCandidates
  ) {
    const assignmentCount =
      await ShiftAssignment
        .countDocuments({
          rosterId:
            candidate._id,
        });

    scoredCandidates.push({
      roster:
        candidate,

      assignmentCount,
    });
  }

  scoredCandidates.sort(
    (
      a,
      b
    ) => {
      const rank = {
        PUBLISHED:
          3,

        SUBMITTED:
          2,

        DRAFT:
          1,
      };

      const assignmentDifference =
        b.assignmentCount -
        a.assignmentCount;

      /*
       * Real roster containing assignments wins over
       * an empty duplicate shell.
       */
      if (
        assignmentDifference !==
        0
      ) {
        return assignmentDifference;
      }

      const statusDifference =
        (
          rank[
            normalizeStatus(
              b.roster.status
            )
          ] ||
          0
        ) -
        (
          rank[
            normalizeStatus(
              a.roster.status
            )
          ] ||
          0
        );

      if (
        statusDifference !==
        0
      ) {
        return statusDifference;
      }

      return (
        new Date(
          a.roster.createdAt ||
          0
        ).getTime() -
        new Date(
          b.roster.createdAt ||
          0
        ).getTime()
      );
    }
  );

  canonical =
    scoredCandidates[0]
      .roster;
}

    /* =====================================================
       FIND OLD LEGACY ROSTERS

       Old records:
       departmentId exists
       orgUnitCode missing
    ===================================================== */

    let legacy =
  [];

if (
  effectiveDepartmentId
) {
  legacy =
    await ShiftRoster
      .find({
        departmentId:
          effectiveDepartmentId,

        officeId:
          officeId ||
          null,

        weekStartDate,

        status: {
          $ne:
            "CANCELLED",
        },
      });
}

/*
 * Also find same org-unit records.
 *
 * This catches duplicate records created during the
 * departmentId -> orgUnitCode migration.
 */
const sameOrgUnitRosters =
  await ShiftRoster
    .find({
      orgUnitCode:
        normalizedOrgUnitCode,

      officeId:
        officeId ||
        null,

      weekStartDate,

      status: {
        $ne:
          "CANCELLED",
      },
    });

const rosterMap =
  new Map();

for (
  const item
  of [
    ...legacy,
    ...sameOrgUnitRosters,
  ]
) {
  rosterMap.set(
    String(
      item._id
    ),
    item
  );
}

legacy = [
  ...rosterMap.values(),
].filter(
  (
    item
  ) =>
    !canonical ||
    !sameId(
      item._id,
      canonical._id
    )
);

    /* =====================================================
       NO CANONICAL YET

       Reuse best legacy roster rather than create duplicate.

       Priority:
       PUBLISHED
       SUBMITTED
       DRAFT

       Then highest assignment count.
    ===================================================== */

    if (
      !canonical &&
      legacy.length
    ) {
      const scored =
        [];

      for (
        const roster
        of legacy
      ) {
        const assignmentCount =
          await ShiftAssignment
            .countDocuments({
              rosterId:
                roster._id,
            });

        scored.push({
          roster,

          assignmentCount,
        });
      }

      scored.sort(
        (
          a,
          b
        ) => {
          const rank = {
            PUBLISHED:
              3,

            SUBMITTED:
              2,

            DRAFT:
              1,
          };

          const statusDiff =
            (
              rank[
                normalizeStatus(
                  b.roster
                    .status
                )
              ] ||
              0
            ) -
            (
              rank[
                normalizeStatus(
                  a.roster
                    .status
                )
              ] ||
              0
            );

          if (
            statusDiff
          ) {
            return statusDiff;
          }

          if (
            b.assignmentCount !==
            a.assignmentCount
          ) {
            return (
              b.assignmentCount -
              a.assignmentCount
            );
          }

          return (
            new Date(
              a.roster
                .createdAt ||
              0
            ).getTime() -
            new Date(
              b.roster
                .createdAt ||
              0
            ).getTime()
          );
        }
      );

      canonical =
        scored[0]
          .roster;

      legacy =
        legacy.filter(
          (
            item
          ) =>
            !sameId(
              item._id,
              canonical._id
            )
        );
    }

    /* =====================================================
       NOTHING EXISTS

       CREATE NEW.
    ===================================================== */

    if (
      !canonical
    ) {
      return ShiftRoster
        .create({
          orgUnitCode:
            normalizedOrgUnitCode,

          departmentId:
            effectiveDepartmentId ||
            null,

          officeId:
            officeId ||
            null,

          companyCode:
            companyCode
              ? String(
                  companyCode
                )
                  .trim()
                  .toUpperCase()
              : null,

          weekStartDate,

          weekEndDate,

          weekKey,

          status:
            "DRAFT",

          sourceAttachmentUrl,

          sourceAttachmentName,

          notes,

          createdBy,
        });
    }

    /* =====================================================
       MERGE/CANCEL LEGACY DUPLICATES
    ===================================================== */

    for (
      const duplicate
      of legacy
    ) {
      if (
        sameId(
          duplicate._id,
          canonical._id
        )
      ) {
        continue;
      }

      const canonicalStatus =
        normalizeStatus(
          canonical.status
        );

      const duplicateStatus =
        normalizeStatus(
          duplicate.status
        );

      /* ===================================================
         PUBLISHED ROSTER IS IMMUTABLE

         If old broken code created a new DRAFT/SUBMITTED
         duplicate AFTER publication, do NOT merge that draft
         data into the published schedule.

         Those are invalid duplicate records.
      =================================================== */

      if (
        canonicalStatus ===
          "PUBLISHED" &&
        duplicateStatus !==
          "PUBLISHED"
      ) {
        await ShiftAssignment
          .deleteMany({
            rosterId:
              duplicate._id,
          });

       await cancelDuplicateRoster(
  duplicate,
  canonical._id,
  createdBy ||
    null
);

        continue;
      }

      /* ===================================================
         VALID LEGACY DATA

         Move assignments into canonical roster.
      =================================================== */

      await ShiftAssignment
        .updateMany(
          {
            rosterId:
              duplicate._id,
          },
          {
            $set: {
              rosterId:
                canonical._id,

              orgUnitCode:
                normalizedOrgUnitCode,

              departmentId:
                effectiveDepartmentId ||
                canonical
                  .departmentId ||
                null,
            },
          }
        );

      applyStrongerWorkflowState(
        canonical,
        duplicate
      );

     await cancelDuplicateRoster(
  duplicate,
  targetRoster._id,
  userId
);
    }

    /* =====================================================
       BACKFILL CANONICAL DATA
    ===================================================== */

    canonical.orgUnitCode =
      normalizedOrgUnitCode;

    if (
      !canonical.departmentId &&
      effectiveDepartmentId
    ) {
      canonical.departmentId =
        effectiveDepartmentId;
    }

    if (
      !canonical.companyCode &&
      companyCode
    ) {
      canonical.companyCode =
        String(
          companyCode
        )
          .trim()
          .toUpperCase();
    }

    if (
      !canonical.weekEndDate
    ) {
      canonical.weekEndDate =
        weekEndDate;
    }

    if (
      !canonical.weekKey
    ) {
      canonical.weekKey =
        weekKey;
    }

    await canonical.save();

    /* =====================================================
       BACKFILL ASSIGNMENT SNAPSHOT
    ===================================================== */

    await ShiftAssignment
      .updateMany(
        {
          rosterId:
            canonical._id,
        },
        {
          $set: {
            orgUnitCode:
              normalizedOrgUnitCode,

            departmentId:
              canonical
                .departmentId ||
              null,
          },
        }
      );

    await refreshRosterCounts(
      canonical._id
    );

    return ShiftRoster
      .findById(
        canonical._id
      );
  };

/* =========================================================
   CREATE / GET ROSTER
========================================================= */

const createOrGetRoster =
  async ({
    orgUnitCode,
    departmentId = null,
    officeId = null,
    companyCode = null,
    date,
    weekStart = null,
    sourceAttachmentUrl = null,
    sourceAttachmentName = "",
    notes = "",
    createdBy,
  }) => {
    const normalizedOrgUnitCode =
      normalizeOrgUnitCode(
        orgUnitCode
      );

    if (
      !normalizedOrgUnitCode
    ) {
      throw createError(
        "orgUnitCode is required."
      );
    }

    const effectiveDate =
      date ||
      weekStart;

    assertDateKey(
      effectiveDate,
      "date"
    );

    if (
      officeId
    ) {
      assertObjectId(
        officeId,
        "officeId"
      );
    }

    if (
      createdBy
    ) {
      assertObjectId(
        createdBy,
        "createdBy"
      );
    }

    const {
      weekStartDate,
      weekEndDate,
    } =
      getWeekRange(
        effectiveDate
      );

    const {
      weekKey,
    } =
      getIsoWeekInfo(
        weekStartDate
      );

    return consolidateRosterScope({
      orgUnitCode:
        normalizedOrgUnitCode,

      departmentId,

      officeId,

      weekStartDate,

      weekEndDate,

      weekKey,

      companyCode,

      sourceAttachmentUrl,

      sourceAttachmentName,

      notes,

      createdBy,
    });
  };

/* =========================================================
   REQUIRE EDITABLE ROSTER

   PUBLISHED = LOCKED.
========================================================= */

const requireEditableRoster =
  async (
    rosterId
  ) => {
    assertObjectId(
      rosterId,
      "rosterId"
    );

    const roster =
      await ShiftRoster
        .findById(
          rosterId
        );

    if (
      !roster
    ) {
      throw createError(
        "Shift roster not found.",
        404
      );
    }

    if (
      [
        "PUBLISHED",
        "CANCELLED",
      ].includes(
        roster.status
      )
    ) {
      throw createError(
        `Roster cannot be edited because it is ${roster.status}.`,
        409
      );
    }

    return roster;
  };

/* =========================================================
   EMPLOYEE FOR ROSTER
========================================================= */

const getRosterEmployee =
  async (
    employeeId,
    roster
  ) => {
    assertObjectId(
      employeeId,
      "employeeId"
    );

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

    if (
      employee.status ===
      "EXITED"
    ) {
      throw createError(
        `${employee.fullName} is exited and cannot be assigned.`,
        409
      );
    }

    const employeeOrgUnit =
      normalizeOrgUnitCode(
        employee.orgUnitCode
      );

    const rosterOrgUnit =
      normalizeOrgUnitCode(
        roster.orgUnitCode
      );

    if (
      !employeeOrgUnit
    ) {
      throw createError(
        `${employee.fullName} does not have an organization unit configured.`,
        409
      );
    }

    if (
      !rosterOrgUnit
    ) {
      throw createError(
        "Shift roster does not have an organization unit configured.",
        409
      );
    }

    if (
      employeeOrgUnit !==
      rosterOrgUnit
    ) {
      throw createError(
        `${employee.fullName} belongs to ${employeeOrgUnit}, not ${rosterOrgUnit}.`,
        409
      );
    }

    return employee;
  };

/* =========================================================
   ACTIVE SHIFT
========================================================= */

const requireActiveShift =
  async (
    shiftId
  ) => {
    assertObjectId(
      shiftId,
      "shiftId"
    );

    const shift =
      await AttendanceShift
        .findOne({
          _id:
            shiftId,

          active:
            true,
        })
        .lean();

    if (
      !shift
    ) {
      throw createError(
        "Active shift not found.",
        404
      );
    }

    return shift;
  };

/* =========================================================
   ASSIGN ONE EMPLOYEE / DATE

   Model uniqueness:
   employeeId + assignmentDate

   Same employee/date cannot be duplicated.
========================================================= */

const assignDay =
  async ({
    rosterId,
    employeeId,
    assignmentDate,
    dayType = "SHIFT",
    shiftId = null,
    assignmentSource = "HEAD",
    assignedBy,
    overrideReason = "",
  }) => {
    const roster =
      await requireEditableRoster(
        rosterId
      );

    assertDateKey(
      assignmentDate,
      "assignmentDate"
    );

    if (
      !isDateWithinRange(
        assignmentDate,
        roster.weekStartDate,
        roster.weekEndDate
      )
    ) {
      throw createError(
        "assignmentDate is outside this Monday-Sunday roster week.",
        409
      );
    }

    const employee =
      await getRosterEmployee(
        employeeId,
        roster
      );

    const normalizedDayType =
      normalizeStatus(
        dayType
      );

    const allowedDayTypes = [
      "SHIFT",
      "WEEK_OFF",
      "HOLIDAY",
      "LEAVE",
      "NOT_SCHEDULED",
    ];

    if (
      !allowedDayTypes
        .includes(
          normalizedDayType
        )
    ) {
      throw createError(
        "Invalid shift assignment dayType."
      );
    }

    let shift =
      null;

    if (
      normalizedDayType ===
      "SHIFT"
    ) {
      shift =
        await requireActiveShift(
          shiftId
        );
    }

    /* =====================================================
       EXISTING EMPLOYEE/DATE
    ===================================================== */

    const existing =
      await ShiftAssignment
        .findOne({
          employeeId:
            employee._id,

          assignmentDate,
        });

    if (
      existing &&
      !sameId(
        existing.rosterId,
        roster._id
      )
    ) {
      const existingRoster =
        await ShiftRoster
          .findById(
            existing.rosterId
          )
          .select(
            "status orgUnitCode weekStartDate"
          )
          .lean();

      if (
        existingRoster
          ?.status ===
        "PUBLISHED"
      ) {
        throw createError(
          "Employee already has a published shift assignment for this date.",
          409
        );
      }

      throw createError(
        "Employee already has a shift assignment for this date from another roster.",
        409
      );
    }

    const originalShiftId =
      existing?.shiftId ||
      null;

    const changedByOverride =
      Boolean(
        existing &&
        String(
          existing.shiftId ||
          ""
        ) !==
          String(
            shift?._id ||
            ""
          )
      );

    /* =====================================================
       UPSERT

       Reassigning same employee/date updates same document.
       It does not create duplicate.
    ===================================================== */

    const assignment =
      await ShiftAssignment
        .findOneAndUpdate(
          {
            employeeId:
              employee._id,

            assignmentDate,
          },
          {
            $set: {
              rosterId:
                roster._id,

              orgUnitCode:
                normalizeOrgUnitCode(
                  roster.orgUnitCode
                ),

              departmentId:
                roster.departmentId ||
                null,

              officeId:
                roster.officeId ||
                null,

              reportingManagerId:
                employee.reportsTo ||
                null,

              dayName:
                getDayName(
                  assignmentDate
                ),

              dayType:
                normalizedDayType,

              shiftId:
                shift?._id ||
                null,

              shiftCode:
                shift?.code ||
                null,

              shiftName:
                shift?.name ||
                "",

              shiftStartTime:
                shift?.startTime ||
                null,

              shiftEndTime:
                shift?.endTime ||
                null,

              shiftCrossesMidnight:
                Boolean(
                  shift
                    ?.crossesMidnight
                ),

              assignmentSource:
                normalizeStatus(
                  assignmentSource ||
                  "HEAD"
                ),

              assignedBy,

              assignedAt:
                new Date(),

              overridden:
                changedByOverride,

              originalShiftId:
                changedByOverride
                  ? originalShiftId
                  : existing
                      ?.originalShiftId ||
                    null,

              overrideReason:
                changedByOverride
                  ? overrideReason
                  : existing
                      ?.overrideReason ||
                    "",

              updatedBy:
                assignedBy,
            },

            $setOnInsert: {
              assignmentDate,
            },
          },
          {
            upsert:
              true,

            new:
              true,

            setDefaultsOnInsert:
              true,

            runValidators:
              true,
          }
        );

    await refreshRosterCounts(
      roster._id
    );

    return assignment;
  };

/* =========================================================
   BULK ASSIGN
========================================================= */

const bulkAssign =
  async ({
    rosterId,
    employeeIds,
    dates,
    assignmentDates = null,
    shiftId = null,
    dayType = "SHIFT",
    assignmentSource = "HEAD",
    assignedBy,
  }) => {
    const effectiveDates =
      Array.isArray(
        dates
      ) &&
      dates.length
        ? dates
        : assignmentDates;

    if (
      !Array.isArray(
        employeeIds
      ) ||
      !employeeIds.length
    ) {
      throw createError(
        "At least one employee is required."
      );
    }

    if (
      !Array.isArray(
        effectiveDates
      ) ||
      !effectiveDates.length
    ) {
      throw createError(
        "At least one assignment date is required."
      );
    }

    const uniqueEmployeeIds = [
      ...new Set(
        employeeIds.map(
          (
            id
          ) =>
            String(
              id ||
              ""
            ).trim()
        )
      ),
    ];

    const uniqueDates = [
      ...new Set(
        effectiveDates.map(
          (
            date
          ) =>
            String(
              date ||
              ""
            ).trim()
        )
      ),
    ];

    const results =
      [];

    for (
      const employeeId
      of uniqueEmployeeIds
    ) {
      for (
        const assignmentDate
        of uniqueDates
      ) {
        const assignment =
          await assignDay({
            rosterId,

            employeeId,

            assignmentDate,

            dayType,

            shiftId,

            assignmentSource,

            assignedBy,
          });

        results.push(
          assignment
        );
      }
    }

    return {
      assigned:
        results.length,

      assignments:
        results,
    };
  };

/* =========================================================
   ASSIGN COMPLETE WEEK
========================================================= */

const assignCompleteWeek =
  async ({
    rosterId,
    employeeIds,
    shiftId,
    workingDays = [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ],
    weekOffDays = [
      "SUNDAY",
    ],
    assignmentSource = "HEAD",
    assignedBy,
  }) => {
    const roster =
      await requireEditableRoster(
        rosterId
      );

    if (
      !Array.isArray(
        employeeIds
      ) ||
      !employeeIds.length
    ) {
      throw createError(
        "At least one employee is required."
      );
    }

    const {
      dates,
    } =
      getWeekDates(
        roster.weekStartDate
      );

    let assigned =
      0;

    for (
      const employeeId
      of employeeIds
    ) {
      for (
        const date
        of dates
      ) {
        const dayName =
          getDayName(
            date
          );

        if (
          workingDays.includes(
            dayName
          )
        ) {
          await assignDay({
            rosterId,

            employeeId,

            assignmentDate:
              date,

            dayType:
              "SHIFT",

            shiftId,

            assignmentSource,

            assignedBy,
          });

          assigned +=
            1;
        } else if (
          weekOffDays.includes(
            dayName
          )
        ) {
          await assignDay({
            rosterId,

            employeeId,

            assignmentDate:
              date,

            dayType:
              "WEEK_OFF",

            assignmentSource,

            assignedBy,
          });

          assigned +=
            1;
        }
      }
    }

    return {
      assigned,
    };
  };

/* =========================================================
   GET ROSTER
========================================================= */

const getRoster =
  async (
    rosterId
  ) => {
    assertObjectId(
      rosterId,
      "rosterId"
    );

    const roster =
      await ShiftRoster
        .findById(
          rosterId
        )
        .lean();

    if (
      !roster
    ) {
      throw createError(
        "Shift roster not found.",
        404
      );
    }

    const assignments =
      await ShiftAssignment
        .find({
          rosterId,
        })
        .sort({
          employeeId:
            1,

          assignmentDate:
            1,
        })
        .populate(
          "employeeId",
          "employeeCode fullName designation reportsTo orgUnitCode department workLocation"
        )
        .populate(
          "shiftId"
        )
        .lean();

    const {
      dates,
    } =
      getWeekDates(
        roster.weekStartDate
      );

    const employeeMap =
      new Map();

    for (
      const assignment
      of assignments
    ) {
      const employee =
        assignment.employeeId;

      if (
        !employee
      ) {
        continue;
      }

      const key =
        String(
          employee._id
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
              employee._id,

            employeeCode:
              employee.employeeCode,

            employeeName:
              employee.fullName,

            designation:
              employee.designation,

            orgUnitCode:
              employee.orgUnitCode,

            department:
              employee.department ||
              null,

            days:
              {},
          }
        );
      }

      employeeMap
        .get(
          key
        )
        .days[
          assignment
            .assignmentDate
        ] =
        assignment;
    }

    const counts =
      await refreshRosterCounts(
        rosterId
      );

    return {
      roster: {
        ...roster,
        ...counts,
      },

      assignments,

      calendar: {
        weekStartDate:
          roster.weekStartDate,

        weekEndDate:
          roster.weekEndDate,

        dates:
          dates.map(
            (
              date
            ) => ({
              date,

              dayName:
                getDayName(
                  date
                ),
            })
          ),
      },

      employees: [
        ...employeeMap
          .values(),
      ],
    };
  };

/* =========================================================
   SUBMIT ROSTER

   Retained for compatibility.
========================================================= */

const submitRoster =
  async (
    rosterId,
    userId
  ) => {
    assertObjectId(
      rosterId,
      "rosterId"
    );

    assertObjectId(
      userId,
      "userId"
    );

    const roster =
      await ShiftRoster
        .findById(
          rosterId
        );

    if (
      !roster
    ) {
      throw createError(
        "Shift roster not found.",
        404
      );
    }

    if (
      roster.status !==
      "DRAFT"
    ) {
      throw createError(
        "Only DRAFT roster can be submitted.",
        409
      );
    }

    const count =
      await ShiftAssignment
        .countDocuments({
          rosterId:
            roster._id,
        });

    if (
      !count
    ) {
      throw createError(
        "Roster has no shift assignments.",
        409
      );
    }

    roster.status =
      "SUBMITTED";

    roster.submittedBy =
      userId;

    roster.submittedAt =
      new Date();

    await roster.save();

    await refreshRosterCounts(
      roster._id
    );

    return ShiftRoster
      .findById(
        roster._id
      );
  };

/* =========================================================
   PUBLISH ROSTER

   DRAFT -> PUBLISHED
   SUBMITTED -> PUBLISHED

   Repeated publish is idempotent.
========================================================= */

const publishRoster =
  async (
    rosterId,
    userId,
    remarks = ""
  ) => {
    assertObjectId(
      rosterId,
      "rosterId"
    );

    assertObjectId(
      userId,
      "userId"
    );

    /* =====================================================
       LOAD REQUESTED ROSTER

       IMPORTANT:
       Frontend may still have an old orphan roster id.

       We use it only to determine the week.
    ===================================================== */

    const requestedRoster =
      await ShiftRoster
        .findById(
          rosterId
        );

    if (
      !requestedRoster
    ) {
      throw createError(
        "Shift roster not found.",
        404
      );
    }

    const requestedRosterId =
      String(
        requestedRoster._id
      );

    const weekStartDate =
      requestedRoster.weekStartDate;

    const weekEndDate =
      requestedRoster.weekEndDate;

    assertDateKey(
      weekStartDate,
      "weekStartDate"
    );

    assertDateKey(
      weekEndDate,
      "weekEndDate"
    );

    /* =====================================================
       STEP 1
       GET EVERY REAL ASSIGNMENT FOR THIS WEEK

       ShiftAssignment is authoritative.

       We intentionally DO NOT depend on requested roster id
       here because old broken roster ids may be empty.
    ===================================================== */

    const weekAssignments =
      await ShiftAssignment
        .find({
          assignmentDate: {
            $gte:
              weekStartDate,

            $lte:
              weekEndDate,
          },
        })
        .select(
          "_id rosterId employeeId assignmentDate orgUnitCode departmentId shiftId dayType"
        )
        .lean();

    /* =====================================================
       STEP 2
       REQUESTED ROSTER ITSELF HAS NO ASSIGNMENTS?

       If yes and it cannot represent real schedule data,
       permanently cancel the dead shell.

       This is critical:
       otherwise frontend keeps seeing DRAFT forever.
    ===================================================== */

    const requestedAssignments =
      weekAssignments.filter(
        (
          item
        ) =>
          sameId(
            item.rosterId,
            requestedRoster._id
          )
      );

    if (
  requestedAssignments.length ===
    0 &&
  requestedRoster.status !==
    "PUBLISHED" &&
  requestedRoster.status !==
    "CANCELLED"
) {
  const cancelledAt =
    new Date();

  const nextNotes =
    [
      requestedRoster.notes ||
        "",

      `Automatically cancelled orphan empty roster ${requestedRosterId}.`,
    ]
      .filter(
        Boolean
      )
      .join(
        "\n"
      )
      .trim();

  /*
   * IMPORTANT:
   *
   * This can be an old legacy roster with no orgUnitCode.
   * Never call requestedRoster.save() here because current
   * schema validation requires orgUnitCode.
   */
  await ShiftRoster
    .updateOne(
      {
        _id:
          requestedRoster._id,
      },
      {
        $set: {
          status:
            "CANCELLED",

          cancelledBy:
            userId,

          cancelledAt,

          employeeCount:
            0,

          assignmentCount:
            0,

          notes:
            nextNotes,
        },
      },
      {
        runValidators:
          false,
      }
    );

  /*
   * Keep local document state synchronized.
   */
  requestedRoster.status =
    "CANCELLED";

  requestedRoster.cancelledBy =
    userId;

  requestedRoster.cancelledAt =
    cancelledAt;

  requestedRoster.employeeCount =
    0;

  requestedRoster.assignmentCount =
    0;

  requestedRoster.notes =
    nextNotes;
}


    /* =====================================================
       STEP 3
       GROUP REAL WEEK ASSIGNMENTS BY THEIR ACTUAL ROSTER ID

       Example:

       roster A -> HR -> Renu + Roshan -> 10 assignments
       roster B -> Engineering -> 3 assignments

       Both are genuine schedules and can be published by the
       one weekly Publish Schedule action.
    ===================================================== */

    const assignmentsByRoster =
      new Map();

    for (
      const assignment
      of weekAssignments
    ) {
      const assignmentRosterId =
        String(
          assignment.rosterId ||
          ""
        );

      if (
        !assignmentRosterId
      ) {
        continue;
      }

      if (
        !assignmentsByRoster.has(
          assignmentRosterId
        )
      ) {
        assignmentsByRoster.set(
          assignmentRosterId,
          []
        );
      }

      assignmentsByRoster
        .get(
          assignmentRosterId
        )
        .push(
          assignment
        );
    }

    /* =====================================================
       TRUE EMPTY WEEK

       No exception assignments exist anywhere this week.

       Normal Day Shift is fallback.
    ===================================================== */

    if (
      assignmentsByRoster.size ===
      0
    ) {
      return {
        skipped:
          true,

        published:
          false,

        redirected:
          false,

        alreadyPublished:
          false,

        reason:
          "EMPTY_WEEK",

        requestedRosterId,

        targetRosterId:
          null,

        assignmentCount:
          0,

        employeeCount:
          0,

        publishedRosterCount:
          0,

        publishedRosters:
          [],

        roster:
          requestedRoster,
      };
    }

    /* =====================================================
       STEP 4
       LOAD ACTUAL ROSTERS THAT OWN THOSE ASSIGNMENTS
    ===================================================== */

    const actualRosterIds = [
      ...assignmentsByRoster
        .keys(),
    ];

    const actualRosters =
      await ShiftRoster
        .find({
          _id: {
            $in:
              actualRosterIds,
          },

          status: {
            $ne:
              "CANCELLED",
          },
        });

    /* =====================================================
       STEP 5
       PUBLISH EVERY REAL NON-EMPTY ROSTER

       This matches your UX:
       ONE Publish Schedule button for the week.
    ===================================================== */

    const publishedRosters =
      [];

    const alreadyPublishedRosters =
      [];

    const invalidRosters =
      [];

    for (
      const roster
      of actualRosters
    ) {
      const realAssignments =
        assignmentsByRoster.get(
          String(
            roster._id
          )
        ) ||
        [];

      if (
        !realAssignments.length
      ) {
        continue;
      }

      /* ===================================================
         REPAIR ORG UNIT FROM ASSIGNMENTS / EMPLOYEES

         Old roster may not have orgUnitCode.
      =================================================== */

      let orgUnitCode =
        normalizeOrgUnitCode(
          roster.orgUnitCode
        );

      if (
        !orgUnitCode
      ) {
        orgUnitCode =
          normalizeOrgUnitCode(
            realAssignments.find(
              (
                item
              ) =>
                normalizeOrgUnitCode(
                  item.orgUnitCode
                )
            )
              ?.orgUnitCode
          );
      }

      if (
        !orgUnitCode
      ) {
        for (
          const assignment
          of realAssignments
        ) {
          if (
            !assignment.employeeId
          ) {
            continue;
          }

          const employee =
            await Employee
              .findById(
                assignment.employeeId
              )
              .select(
                "orgUnitCode department"
              )
              .lean();

          const employeeOrgUnit =
            normalizeOrgUnitCode(
              employee
                ?.orgUnitCode
            );

          if (
            employeeOrgUnit
          ) {
            orgUnitCode =
              employeeOrgUnit;

            if (
              !roster.departmentId &&
              employee?.department
            ) {
              roster.departmentId =
                employee.department;
            }

            break;
          }
        }
      }

      /* ===================================================
         IMPORTANT

         A real assignment-owning roster should have an
         organization unit repaired before publication.
      =================================================== */

      if (
        orgUnitCode
      ) {
        roster.orgUnitCode =
          orgUnitCode;

        await ShiftAssignment
          .updateMany(
            {
              rosterId:
                roster._id,
            },
            {
              $set: {
                orgUnitCode,

                departmentId:
                  roster.departmentId ||
                  null,
              },
            }
          );
      }

      /* ===================================================
         ALREADY PUBLISHED

         Keep idempotent.
      =================================================== */

      if (
        normalizeStatus(
          roster.status
        ) ===
        "PUBLISHED"
      ) {
        const counts =
          await refreshRosterCounts(
            roster._id
          );

        alreadyPublishedRosters.push({
          rosterId:
            String(
              roster._id
            ),

          orgUnitCode:
            orgUnitCode ||
            null,

          assignmentCount:
            counts.assignmentCount,

          employeeCount:
            counts.employeeCount,
        });

        continue;
      }

      /* ===================================================
         ONLY DRAFT / SUBMITTED ARE VALID
      =================================================== */

      if (
        ![
          "DRAFT",
          "SUBMITTED",
        ].includes(
          normalizeStatus(
            roster.status
          )
        )
      ) {
        invalidRosters.push({
          rosterId:
            String(
              roster._id
            ),

          status:
            roster.status,

          assignmentCount:
            realAssignments.length,
        });

        continue;
      }

      /* ===================================================
         DUPLICATE EMPLOYEE+DATE CHECK WITHIN WEEK

         Database index should also enforce this, but this
         catches historical bad data before publication.
      =================================================== */

      const duplicateGroups =
        await ShiftAssignment
          .aggregate([
            {
              $match: {
                employeeId: {
                  $in:
                    realAssignments.map(
                      (
                        item
                      ) =>
                        item.employeeId
                    ),
                },

                assignmentDate: {
                  $gte:
                    weekStartDate,

                  $lte:
                    weekEndDate,
                },
              },
            },

            {
              $group: {
                _id: {
                  employeeId:
                    "$employeeId",

                  assignmentDate:
                    "$assignmentDate",
                },

                count: {
                  $sum:
                    1,
                },

                ids: {
                  $push:
                    "$_id",
                },
              },
            },

            {
              $match: {
                count: {
                  $gt:
                    1,
                },
              },
            },
          ]);

      if (
        duplicateGroups.length
      ) {
        throw createError(
          "Duplicate shift assignments exist for one or more employees/dates. Clean the duplicate assignment records before publication.",
          409
        );
      }

      const employeeIds =
        new Set(
          realAssignments.map(
            (
              item
            ) =>
              String(
                item.employeeId
              )
          )
        );

      const now =
        new Date();

      roster.employeeCount =
        employeeIds.size;

      roster.assignmentCount =
        realAssignments.length;

      roster.status =
        "PUBLISHED";

      roster.reviewedBy =
        userId;

      roster.reviewedAt =
        now;

      roster.reviewRemarks =
        remarks ||
        "";

      roster.publishedBy =
        userId;

      roster.publishedAt =
        now;

      await roster.save();

      publishedRosters.push({
        rosterId:
          String(
            roster._id
          ),

        orgUnitCode:
          orgUnitCode ||
          null,

        assignmentCount:
          realAssignments.length,

        employeeCount:
          employeeIds.size,
      });
    }

    /* =====================================================
       STEP 6
       TOTAL COUNTS
    ===================================================== */

    const totalAssignmentCount =
      [
        ...publishedRosters,
        ...alreadyPublishedRosters,
      ].reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.assignmentCount ||
            0
          ),
        0
      );

    const totalEmployeeCount =
      [
        ...publishedRosters,
        ...alreadyPublishedRosters,
      ].reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.employeeCount ||
            0
          ),
        0
      );

    /* =====================================================
       STEP 7
       IF NOTHING COULD BE PUBLISHED
    ===================================================== */

    if (
      publishedRosters.length ===
        0 &&
      alreadyPublishedRosters.length ===
        0
    ) {
      return {
        skipped:
          true,

        published:
          false,

        redirected:
          true,

        alreadyPublished:
          false,

        reason:
          "NO_PUBLISHABLE_ROSTER",

        requestedRosterId,

        targetRosterId:
          null,

        assignmentCount:
          0,

        employeeCount:
          0,

        publishedRosterCount:
          0,

        publishedRosters:
          [],

        invalidRosters,

        roster:
          requestedRoster,
      };
    }

    /* =====================================================
       SUCCESS

       requestedRoster may have been the dead empty shell.

       targetRosterId points at first actual roster.
    ===================================================== */

    return {
      skipped:
        false,

      published:
        true,

      redirected:
        !actualRosterIds.includes(
          requestedRosterId
        ),

      alreadyPublished:
        publishedRosters.length ===
          0 &&
        alreadyPublishedRosters.length >
          0,

      requestedRosterId,

      targetRosterId:
        publishedRosters[0]
          ?.rosterId ||
        alreadyPublishedRosters[0]
          ?.rosterId ||
        null,

      assignmentCount:
        totalAssignmentCount,

      employeeCount:
        totalEmployeeCount,

      publishedRosterCount:
        publishedRosters.length,

      alreadyPublishedRosterCount:
        alreadyPublishedRosters.length,

      publishedRosters,

      alreadyPublishedRosters,

      invalidRosters,

      roster:
        actualRosters[0] ||
        null,
    };
  };

/* =========================================================
   COPY PREVIOUS WEEK
========================================================= */

const copyPreviousWeek =
  async ({
    rosterId,
    userId,
  }) => {
    const target =
      await requireEditableRoster(
        rosterId
      );

    const previousWeekStart =
      addDays(
        target.weekStartDate,
        -7
      );

    const previous =
      await ShiftRoster
        .findOne({
          orgUnitCode:
            normalizeOrgUnitCode(
              target.orgUnitCode
            ),

          officeId:
            target.officeId ||
            null,

          weekStartDate:
            previousWeekStart,

          status:
            "PUBLISHED",
        })
        .lean();

    if (
      !previous
    ) {
      throw createError(
        "No published previous-week roster found.",
        404
      );
    }

    const previousAssignments =
      await ShiftAssignment
        .find({
          rosterId:
            previous._id,
        })
        .lean();

    let copied =
      0;

    for (
      const assignment
      of previousAssignments
    ) {
      const newDate =
        addDays(
          assignment.assignmentDate,
          7
        );

      const employee =
        await Employee
          .findOne({
            _id:
              assignment.employeeId,

            orgUnitCode:
              normalizeOrgUnitCode(
                target.orgUnitCode
              ),

            status: {
              $ne:
                "EXITED",
            },
          })
          .select(
            "_id"
          )
          .lean();

      if (
        !employee
      ) {
        continue;
      }

      await assignDay({
        rosterId:
          target._id,

        employeeId:
          employee._id,

        assignmentDate:
          newDate,

        dayType:
          assignment.dayType,

        shiftId:
          assignment.shiftId ||
          null,

        assignmentSource:
          "COPY_PREVIOUS_WEEK",

        assignedBy:
          userId,
      });

      copied +=
        1;
    }

    return {
      copied,
    };
  };

/* =========================================================
   PUBLISHED ASSIGNMENT

   Attendance engine calls this.

   Draft roster is ignored.
========================================================= */

const getPublishedAssignment =
  async (
    employeeId,
    assignmentDate
  ) => {
    assertObjectId(
      employeeId,
      "employeeId"
    );

    assertDateKey(
      assignmentDate,
      "assignmentDate"
    );

    const assignment =
      await ShiftAssignment
        .findOne({
          employeeId,

          assignmentDate,
        })
        .populate({
          path:
            "rosterId",

          match: {
            status:
              "PUBLISHED",
          },
        })
        .populate(
          "shiftId"
        )
        .lean();

    if (
      !assignment ||
      !assignment.rosterId
    ) {
      return null;
    }

    return assignment;
  };

/* =========================================================
   MY SHIFT WEEK

   User._id -> Employee.user

   IMPORTANT:

   employee sees ONLY PUBLISHED shift exceptions.

   Blank day:
   frontend shows normal/default Day Shift.
========================================================= */

const getMyShiftWeek =
  async ({
    userId,
    employeeId = null,
    weekStart,
  }) => {
    assertDateKey(
      weekStart,
      "weekStart"
    );

    let employee =
      null;

    /* =====================================================
       OPTIONAL AUTH EMPLOYEE ID
    ===================================================== */

    if (
      employeeId
    ) {
      assertObjectId(
        employeeId,
        "employeeId"
      );

      employee =
        await Employee
          .findOne({
            _id:
              employeeId,

            status: {
              $ne:
                "EXITED",
            },
          })
          .select(
            "_id employeeCode fullName designation orgUnitCode department workLocation reportsTo user"
          )
          .lean();
    }

    /* =====================================================
       STANDARD SE-RMS USER -> EMPLOYEE LINK
    ===================================================== */

    if (
      !employee &&
      userId
    ) {
      assertObjectId(
        userId,
        "userId"
      );

      employee =
        await Employee
          .findOne({
            user:
              userId,

            status: {
              $ne:
                "EXITED",
            },
          })
          .select(
            "_id employeeCode fullName designation orgUnitCode department workLocation reportsTo user"
          )
          .lean();
    }

    if (
      !employee
    ) {
      throw createError(
        "Employee record is not linked to this user account.",
        404
      );
    }

    const {
      weekStartDate,
      weekEndDate,
    } =
      getWeekRange(
        weekStart
      );

    /* =====================================================
       EMPLOYEE'S ASSIGNMENTS
    ===================================================== */

    const candidates =
      await ShiftAssignment
        .find({
          employeeId:
            employee._id,

          assignmentDate: {
            $gte:
              weekStartDate,

            $lte:
              weekEndDate,
          },
        })
        .populate(
          "shiftId"
        )
        .populate(
          "rosterId"
        )
        .sort({
          assignmentDate:
            1,
        })
        .lean();

    /* =====================================================
       PUBLISHED ONLY
    ===================================================== */

    const assignments =
      candidates.filter(
        (
          item
        ) =>
          item?.rosterId &&
          normalizeStatus(
            item.rosterId
              .status
          ) ===
            "PUBLISHED"
      );

    const {
      dates,
    } =
      getWeekDates(
        weekStartDate
      );

    return {
      employee: {
        _id:
          employee._id,

        employeeCode:
          employee.employeeCode,

        fullName:
          employee.fullName,

        designation:
          employee.designation ||
          "",

        orgUnitCode:
          employee.orgUnitCode ||
          null,

        department:
          employee.department ||
          null,

        workLocation:
          employee.workLocation ||
          null,
      },

      weekStartDate,

      weekEndDate,

      calendar: {
        weekStartDate,

        weekEndDate,

        dates:
          dates.map(
            (
              date
            ) => ({
              date,

              dayName:
                getDayName(
                  date
                ),
            })
          ),
      },

      assignments,
    };
  };

/* =========================================================
   REPAIR LEGACY ROSTERS FOR WEEK

   Runs when Shift page loads the week.

   It finds old roster documents with:
   departmentId
   but missing orgUnitCode.

   Then it consolidates them automatically.
========================================================= */

const repairLegacyRostersForWeek =
  async (
    requestedWeek
  ) => {
    if (
      !requestedWeek
    ) {
      return;
    }

    assertDateKey(
      requestedWeek,
      "weekStart"
    );

    const {
      weekStartDate,
    } =
      getWeekRange(
        requestedWeek
      );

    const legacyRosters =
      await ShiftRoster
        .find({
          weekStartDate,

          status: {
            $ne:
              "CANCELLED",
          },

          $or: [
            {
              orgUnitCode: {
                $exists:
                  false,
              },
            },
            {
              orgUnitCode:
                null,
            },
            {
              orgUnitCode:
                "",
            },
          ],
        })
        .lean();

    for (
      const legacyRoster
      of legacyRosters
    ) {
      let orgUnitCode =
        "";

      /* ===================================================
         1. ASSIGNMENT SNAPSHOT
      =================================================== */

      const assignment =
        await ShiftAssignment
          .findOne({
            rosterId:
              legacyRoster._id,
          })
          .select(
            "employeeId orgUnitCode"
          )
          .lean();

      if (
        assignment
          ?.orgUnitCode
      ) {
        orgUnitCode =
          normalizeOrgUnitCode(
            assignment
              .orgUnitCode
          );
      }

      /* ===================================================
         2. ASSIGNED EMPLOYEE
      =================================================== */

      if (
        !orgUnitCode &&
        assignment
          ?.employeeId
      ) {
        const employee =
          await Employee
            .findById(
              assignment
                .employeeId
            )
            .select(
              "orgUnitCode"
            )
            .lean();

        orgUnitCode =
          normalizeOrgUnitCode(
            employee
              ?.orgUnitCode
          );
      }

      /* ===================================================
         3. LEGACY DEPARTMENT
      =================================================== */

      if (
        !orgUnitCode &&
        legacyRoster
          .departmentId
      ) {
        const employee =
          await Employee
            .findOne({
              department:
                legacyRoster
                  .departmentId,

              orgUnitCode: {
                $exists:
                  true,

                $ne:
                  null,
              },
            })
            .select(
              "orgUnitCode"
            )
            .lean();

        orgUnitCode =
          normalizeOrgUnitCode(
            employee
              ?.orgUnitCode
          );
      }

      if (
        !orgUnitCode
      ) {
        continue;
      }

      await createOrGetRoster({
        orgUnitCode,

        departmentId:
          legacyRoster
            .departmentId ||
          null,

        officeId:
          legacyRoster
            .officeId ||
          null,

        companyCode:
          legacyRoster
            .companyCode ||
          null,

        date:
          weekStartDate,

        createdBy:
          legacyRoster
            .createdBy,
      });
    }
  };

/* =========================================================
   LIST ROSTERS

   Exact week filtering.
   Cancelled duplicate shells hidden by default.
   Counts are recalculated from real assignments.
========================================================= */

const listRosters =
  async ({
    orgUnitCode = null,
    departmentId = null,
    officeId = null,
    from = null,
    to = null,
    weekStart = null,
    date = null,
    status = null,
    limit = 50,
  } = {}) => {
    const requestedWeek =
      weekStart ||
      date;

    /* =====================================================
       AUTO REPAIR CURRENT WEEK
    ===================================================== */

    if (
      requestedWeek
    ) {
      await repairLegacyRostersForWeek(
        requestedWeek
      );
    }

    const query =
      {};

    if (
      orgUnitCode
    ) {
      query.orgUnitCode =
        normalizeOrgUnitCode(
          orgUnitCode
        );
    }

    if (
      departmentId
    ) {
      assertObjectId(
        departmentId,
        "departmentId"
      );

      query.departmentId =
        departmentId;
    }

    if (
      officeId
    ) {
      assertObjectId(
        officeId,
        "officeId"
      );

      query.officeId =
        officeId;
    }

    /* =====================================================
       STATUS

       Hide CANCELLED repair shells unless explicitly asked.
    ===================================================== */

    if (
      status
    ) {
      query.status =
        normalizeStatus(
          status
        );
    } else {
      query.status = {
        $ne:
          "CANCELLED",
      };
    }

    /* =====================================================
       WEEK
    ===================================================== */

    if (
      requestedWeek
    ) {
      assertDateKey(
        requestedWeek,
        "weekStart"
      );

      query.weekStartDate =
        getWeekRange(
          requestedWeek
        )
          .weekStartDate;
    } else if (
      from ||
      to
    ) {
      query.weekStartDate =
        {};

      if (
        from
      ) {
        assertDateKey(
          from,
          "from"
        );

        query.weekStartDate
          .$gte =
          getWeekRange(
            from
          )
            .weekStartDate;
      }

      if (
        to
      ) {
        assertDateKey(
          to,
          "to"
        );

        query.weekStartDate
          .$lte =
          getWeekRange(
            to
          )
            .weekStartDate;
      }
    }

    const safeLimit =
      Math.min(
        Math.max(
          Number(
            limit
          ) ||
          50,
          1
        ),
        200
      );

    const rosters =
      await ShiftRoster
        .find(
          query
        )
        .sort({
          weekStartDate:
            -1,

          orgUnitCode:
            1,

          createdAt:
            1,
        })
        .limit(
          safeLimit
        )
        .lean();

    const results =
      [];

    /* =====================================================
       REAL COUNTS

       Never trust old cached zeros.
    ===================================================== */

    for (
      const roster
      of rosters
    ) {
      const assignments =
        await ShiftAssignment
          .find({
            rosterId:
              roster._id,
          })
          .select(
            "employeeId"
          )
          .lean();

      const employeeIds =
        new Set(
          assignments.map(
            (
              item
            ) =>
              String(
                item.employeeId
              )
          )
        );

      const employeeCount =
        employeeIds.size;

      const assignmentCount =
        assignments.length;

      results.push({
        ...roster,

        employeeCount,

        assignmentCount,
      });

      if (
        Number(
          roster.employeeCount ||
          0
        ) !==
          employeeCount ||
        Number(
          roster.assignmentCount ||
          0
        ) !==
          assignmentCount
      ) {
        await ShiftRoster
          .updateOne(
            {
              _id:
                roster._id,
            },
            {
              $set: {
                employeeCount,

                assignmentCount,
              },
            }
          );
      }
    }

    return results;
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  createShift,

  updateShift,

  getShifts,

  createOrGetRoster,

  assignDay,

  bulkAssign,

  assignCompleteWeek,

  getRoster,

  submitRoster,

  publishRoster,

  copyPreviousWeek,

  getPublishedAssignment,

  getMyShiftWeek,

  listRosters,
};
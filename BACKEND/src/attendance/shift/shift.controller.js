const mongoose =
  require(
    "mongoose"
  );

const shiftService =
  require(
    "./shift.service"
  );

const employeeModule =
  require(
    "../../employee/employee.model"
  );

const {
  getWeekDates,
} =
  require(
    "./shiftCalendar.util"
  );

const Employee =
  employeeModule?.Employee ||
  employeeModule?.default ||
  employeeModule;

/* =========================================================
   RESPONSE
========================================================= */

const sendError =
  (
    res,
    error
  ) => {
    console.error(
      "Shift Management Error:",
      error
    );

    return res
      .status(
        error.statusCode ||
        500
      )
      .json({
        success:
          false,

        message:
          error.message ||
          "Shift operation failed.",
      });
  };

/* =========================================================
   CREATE ERROR
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
   USER ID
========================================================= */

const getUserId =
  (
    req
  ) =>
    req.user?._id ||
    req.user?.id ||
    null;

/* =========================================================
   NORMALIZE
========================================================= */

const normalize =
  (
    value
  ) =>
    String(
      value ||
      ""
    )
      .trim()
      .toUpperCase();

/* =========================================================
   OBJECT ID
========================================================= */

const validObjectId =
  (
    value
  ) =>
    Boolean(
      value &&
      mongoose
        .Types
        .ObjectId
        .isValid(
          String(
            value
          )
        )
    );

/* =========================================================
   DATE
========================================================= */

const DATE_KEY_REGEX =
  /^\d{4}-\d{2}-\d{2}$/;

const isValidDateKey =
  (
    value
  ) => {
    const raw =
      String(
        value ||
        ""
      ).trim();

    if (
      !DATE_KEY_REGEX.test(
        raw
      )
    ) {
      return false;
    }

    const [
      year,
      month,
      day,
    ] =
      raw
        .split(
          "-"
        )
        .map(
          Number
        );

    const date =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      );

    return (
      date.getUTCFullYear() ===
        year &&
      date.getUTCMonth() + 1 ===
        month &&
      date.getUTCDate() ===
        day
    );
  };

/* =========================================================
   ROSTER DATE
========================================================= */

const resolveRosterDate =
  (
    body = {}
  ) => {
    const raw =
      String(
        body.weekStart ||
        body.date ||
        body.rosterDate ||
        ""
      ).trim();

    if (
      !isValidDateKey(
        raw
      )
    ) {
      throw createError(
        "weekStart must be a valid YYYY-MM-DD date."
      );
    }

    return raw;
  };

/* =========================================================
   ROLE
========================================================= */

const getSystemRole =
  (
    req
  ) =>
    normalize(
      req.user
        ?.systemRole
    );

const getLegacyRole =
  (
    req
  ) =>
    normalize(
      req.user
        ?.role
    );

/* =========================================================
   SUPER ADMIN
========================================================= */

const isSuperAdmin =
  (
    req
  ) =>
    getSystemRole(
      req
    ) ===
      "SUPER_ADMIN" ||
    getLegacyRole(
      req
    ) ===
      "SUPER_ADMIN";

/* =========================================================
   LEGACY ADMIN
========================================================= */

const isLegacyAdmin =
  (
    req
  ) =>
    getLegacyRole(
      req
    ) ===
    "ADMIN";

/* =========================================================
   LEGACY HEAD
========================================================= */

const isLegacyHead =
  (
    req
  ) =>
    getLegacyRole(
      req
    ) ===
    "HEAD";

/* =========================================================
   PERMISSIONS
========================================================= */

const getPermissions =
  (
    req
  ) => {
    const values = [
      ...(
        Array.isArray(
          req.user
            ?.permissions
        )
          ? req.user
              .permissions
          : []
      ),

      ...(
        Array.isArray(
          req.permissions
        )
          ? req.permissions
          : []
      ),

      ...(
        Array.isArray(
          req.access
            ?.permissions
        )
          ? req.access
              .permissions
          : []
      ),
    ];

    return new Set(
      values.map(
        normalize
      )
    );
  };

/* =========================================================
   HAS PERMISSION
========================================================= */

const hasAnyPermission =
  (
    req,
    ...permissions
  ) => {
    if (
      isSuperAdmin(
        req
      )
    ) {
      return true;
    }

    const owned =
      getPermissions(
        req
      );

    return permissions.some(
      (
        permission
      ) =>
        owned.has(
          normalize(
            permission
          )
        )
    );
  };

/* =========================================================
   DEPARTMENT MEMBERSHIP
========================================================= */

const getDepartmentMemberships =
  (
    req
  ) => {
    const candidates = [
      req.access
        ?.departmentMemberships,

      req.access
        ?.memberships,

      req.user
        ?.departmentMemberships,

      req.user
        ?.memberships,
    ];

    return (
      candidates.find(
        Array.isArray
      ) ||
      []
    );
  };

/* =========================================================
   HR MEMBERSHIP
========================================================= */

const isHrMembership =
  (
    membership
  ) => {
    const department =
      membership
        ?.department ||
      {};

    const code =
      normalize(
        department
          ?.code ||
        department
          ?.departmentCode ||
        department
          ?.orgUnitCode ||
        membership
          ?.departmentCode ||
        membership
          ?.orgUnitCode
      );

    const name =
      normalize(
        department
          ?.name ||
        department
          ?.departmentName ||
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
  };

/* =========================================================
   HEAD MEMBERSHIP
========================================================= */

const isHeadMembership =
  (
    membership
  ) => {
    const role =
      normalize(
        membership
          ?.role ||
        membership
          ?.departmentRole ||
        membership
          ?.membershipRole
      );

    return [
      "HEAD",
      "HOD",
      "DEPARTMENT_HEAD",
      "DEPARTMENT_SUPER_ADMIN",
    ].includes(
      role
    );
  };

/* =========================================================
   HR HEAD
========================================================= */

const isHrHead =
  (
    req
  ) =>
    getDepartmentMemberships(
      req
    ).some(
      (
        membership
      ) =>
        isHrMembership(
          membership
        ) &&
        isHeadMembership(
          membership
        )
    );

/* =========================================================
   DEPARTMENT HEAD
========================================================= */

const isDepartmentHead =
  (
    req
  ) => {
    if (
      isLegacyHead(
        req
      )
    ) {
      return true;
    }

    return getDepartmentMemberships(
      req
    ).some(
      isHeadMembership
    );
  };

/* =========================================================
   SHIFT MASTER ACCESS
========================================================= */

const canManageShiftMaster =
  (
    req
  ) =>
    isSuperAdmin(
      req
    ) ||
    isLegacyAdmin(
      req
    ) ||
    isHrHead(
      req
    ) ||
    hasAnyPermission(
      req,
      "ATTENDANCE_MANAGE_SHIFT",
      "ATTENDANCE_SHIFT_MANAGE"
    );

/* =========================================================
   ROSTER ACCESS
========================================================= */

const canManageRoster =
  (
    req
  ) =>
    isSuperAdmin(
      req
    ) ||
    isLegacyAdmin(
      req
    ) ||
    isHrHead(
      req
    ) ||
    isDepartmentHead(
      req
    ) ||
    hasAnyPermission(
      req,
      "ATTENDANCE_MANAGE_SHIFT",
      "ATTENDANCE_SHIFT_ASSIGN_DEPARTMENT"
    );

/* =========================================================
   PUBLISH ACCESS
========================================================= */

const canPublishRoster =
  (
    req
  ) =>
    isSuperAdmin(
      req
    ) ||
    isLegacyAdmin(
      req
    ) ||
    isHrHead(
      req
    ) ||
    hasAnyPermission(
      req,
      "ATTENDANCE_MANAGE_SHIFT",
      "ATTENDANCE_SHIFT_PUBLISH"
    );

/* =========================================================
   REQUIRE SHIFT MASTER
========================================================= */

const requireShiftManagement =
  (
    req
  ) => {
    if (
      canManageShiftMaster(
        req
      )
    ) {
      return;
    }

    throw createError(
      "Shift management permission is required.",
      403
    );
  };

/* =========================================================
   REQUIRE ROSTER
========================================================= */

const requireShiftAssignment =
  (
    req
  ) => {
    if (
      canManageRoster(
        req
      )
    ) {
      return;
    }

    throw createError(
      "Shift roster management permission is required.",
      403
    );
  };

/* =========================================================
   REQUIRE PUBLISH
========================================================= */

const requireShiftPublish =
  (
    req
  ) => {
    if (
      canPublishRoster(
        req
      )
    ) {
      return;
    }

    throw createError(
      "Shift roster publishing permission is required.",
      403
    );
  };

/* =========================================================
   ORG UNIT
========================================================= */

const normalizeOrgUnitCode =
  (
    value
  ) => {
    if (
      !value
    ) {
      return "";
    }

    if (
      typeof value ===
      "object"
    ) {
      return normalizeOrgUnitCode(
        value?.orgUnitCode ||
        value?.code ||
        value?.departmentCode ||
        value?.departmentName ||
        value?.name ||
        ""
      );
    }

    return String(
      value
    )
      .trim()
      .toUpperCase();
  };

/* =========================================================
   RESOLVE ORG UNIT
========================================================= */

const resolveOrgUnitCode =
  async (
    body = {}
  ) => {
    const explicit =
      body.orgUnitCode ||
      body.departmentCode ||
      null;

    if (
      explicit
    ) {
      return normalizeOrgUnitCode(
        explicit
      );
    }

    if (
      body.department
    ) {
      if (
        typeof body.department ===
          "string" &&
        validObjectId(
          body.department
        )
      ) {
        const employee =
          await Employee
            .findOne({
              department:
                body.department,

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

        if (
          employee
            ?.orgUnitCode
        ) {
          return normalizeOrgUnitCode(
            employee.orgUnitCode
          );
        }
      }

      return normalizeOrgUnitCode(
        body.department
      );
    }

    if (
      body.departmentId &&
      validObjectId(
        body.departmentId
      )
    ) {
      const employee =
        await Employee
          .findOne({
            department:
              body.departmentId,

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

      if (
        employee
          ?.orgUnitCode
      ) {
        return normalizeOrgUnitCode(
          employee.orgUnitCode
        );
      }
    }

    return "";
  };

/* =========================================================
   OPTIONAL DEPARTMENT ID
========================================================= */

const extractOptionalDepartmentId =
  (
    body = {}
  ) => {
    if (
      body.departmentId &&
      validObjectId(
        body.departmentId
      )
    ) {
      return body.departmentId;
    }

    if (
      body.department &&
      typeof body.department ===
        "string" &&
      validObjectId(
        body.department
      )
    ) {
      return body.department;
    }

    return null;
  };

/* =========================================================
   OPTIONAL OFFICE ID
========================================================= */

const extractOptionalOfficeId =
  (
    body = {}
  ) => {
    if (
      body.officeId &&
      validObjectId(
        body.officeId
      )
    ) {
      return body.officeId;
    }

    if (
      body.office &&
      validObjectId(
        body.office
      )
    ) {
      return body.office;
    }

    return null;
  };

/* =========================================================
   CALENDAR WEEK
========================================================= */

exports.getWeek =
  async (
    req,
    res
  ) => {
    try {
      const date =
        req.query?.date ||
        req.query?.weekStart;

      if (
        !isValidDateKey(
          date
        )
      ) {
        throw createError(
          "date must be a valid YYYY-MM-DD date."
        );
      }

      const range =
        getWeekDates(
          date
        );

      return res.json({
        success:
          true,

        ...range,
      });
    } catch (
      error
    ) {
      return sendError(
        res,
        error
      );
    }
  };

/* =========================================================
   SHIFT MASTER - LIST
========================================================= */

exports.getShifts =
  async (
    req,
    res
  ) => {
    try {
      const shifts =
        await shiftService
          .getShifts(
            req.query
          );

      return res.json({
        success:
          true,

        shifts,
      });
    } catch (
      error
    ) {
      return sendError(
        res,
        error
      );
    }
  };

/* =========================================================
   SHIFT MASTER - CREATE
========================================================= */

exports.createShift =
  async (
    req,
    res
  ) => {
    try {
      requireShiftManagement(
        req
      );

      const shift =
        await shiftService
          .createShift(
            req.body,
            getUserId(
              req
            )
          );

      return res
        .status(
          201
        )
        .json({
          success:
            true,

          message:
            "Shift created successfully.",

          shift,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error
      );
    }
  };

/* =========================================================
   SHIFT MASTER - UPDATE
========================================================= */

exports.updateShift =
  async (
    req,
    res
  ) => {
    try {
      requireShiftManagement(
        req
      );

      const shift =
        await shiftService
          .updateShift(
            req.params.id,
            req.body,
            getUserId(
              req
            )
          );

      return res.json({
        success:
          true,

        message:
          "Shift updated successfully.",

        shift,
      });
    } catch (
      error
    ) {
      return sendError(
        res,
        error
      );
    }
  };

/* =========================================================
   CREATE / ENSURE WEEKLY ROSTER
========================================================= */

exports.createRoster =
  async (
    req,
    res
  ) => {
    try {
      requireShiftAssignment(
        req
      );

      const body =
        req.body ||
        {};

      const rosterDate =
        resolveRosterDate(
          body
        );

      const orgUnitCode =
        await resolveOrgUnitCode(
          body
        );

      if (
        !orgUnitCode
      ) {
        throw createError(
          "Organization unit is required for shift roster creation."
        );
      }

      const roster =
        await shiftService
          .createOrGetRoster({
            date:
              rosterDate,

            weekStart:
              rosterDate,

            orgUnitCode,

            departmentId:
              extractOptionalDepartmentId(
                body
              ),

            officeId:
              extractOptionalOfficeId(
                body
              ),

            companyCode:
              body.companyCode ||
              null,

            sourceAttachmentUrl:
              body.sourceAttachmentUrl ||
              null,

            sourceAttachmentName:
              body.sourceAttachmentName ||
              "",

            notes:
              body.notes ||
              "",

            createdBy:
              getUserId(
                req
              ),
          });

      return res
        .status(
          201
        )
        .json({
          success:
            true,

          message:
            "Weekly shift roster is ready.",

          roster,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error
      );
    }
  };

/* =========================================================
   LIST ROSTERS / MY SHIFT
========================================================= */

exports.listRosters =
  async (
    req,
    res
  ) => {
    try {
      const query = {
        ...req.query,
      };

      const mine =
        String(
          query.mine ||
          ""
        )
          .trim()
          .toLowerCase() ===
        "true";

      /* =====================================================
         MY SHIFT
      ===================================================== */

      if (
        mine
      ) {
        const weekStart =
          query.weekStart ||
          query.date;

        if (
          !isValidDateKey(
            weekStart
          )
        ) {
          throw createError(
            "weekStart must be a valid YYYY-MM-DD date."
          );
        }

        const rawAuthEmployee =
          req.user
            ?.employeeId ||
          req.user
            ?.employee
            ?._id ||
          req.user
            ?.employee ||
          null;

        const authEmployeeId =
          validObjectId(
            rawAuthEmployee
          )
            ? rawAuthEmployee
            : null;

        const result =
          await shiftService
            .getMyShiftWeek({
              userId:
                getUserId(
                  req
                ),

              employeeId:
                authEmployeeId,

              weekStart,
            });

        return res.json({
          success:
            true,

          ...result,
        });
      }

      delete query.mine;

      /* =====================================================
         ORG UNIT FILTER
      ===================================================== */

      const explicitOrgUnit =
        query.orgUnitCode ||
        query.department ||
        query.departmentCode ||
        null;

      if (
        explicitOrgUnit
      ) {
        if (
          validObjectId(
            explicitOrgUnit
          )
        ) {
          const employee =
            await Employee
              .findOne({
                department:
                  explicitOrgUnit,

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

          if (
            employee
              ?.orgUnitCode
          ) {
            query.orgUnitCode =
              normalizeOrgUnitCode(
                employee.orgUnitCode
              );
          }
        } else {
          query.orgUnitCode =
            normalizeOrgUnitCode(
              explicitOrgUnit
            );
        }
      }

      delete query.department;
      delete query.departmentCode;

      if (
        query.departmentId &&
        !validObjectId(
          query.departmentId
        )
      ) {
        delete query.departmentId;
      }

      if (
        query.officeId &&
        !validObjectId(
          query.officeId
        )
      ) {
        delete query.officeId;
      }

      if (
        query.weekStart &&
        !isValidDateKey(
          query.weekStart
        )
      ) {
        throw createError(
          "weekStart must be a valid YYYY-MM-DD date."
        );
      }

      const items =
        await shiftService
          .listRosters(
            query
          );

      return res.json({
        success:
          true,

        items,
      });
    } catch (
      error
    ) {
      return sendError(
        res,
        error
      );
    }
  };

/* =========================================================
   GET ROSTER
========================================================= */

exports.getRoster =
  async (
    req,
    res
  ) => {
    try {
      if (
        !validObjectId(
          req.params.id
        )
      ) {
        throw createError(
          "Roster ID is invalid."
        );
      }

      const result =
        await shiftService
          .getRoster(
            req.params.id
          );

      return res.json({
        success:
          true,

        ...result,
      });
    } catch (
      error
    ) {
      return sendError(
        res,
        error
      );
    }
  };

/* =========================================================
   ASSIGN ONE DAY
========================================================= */

exports.assignDay =
  async (
    req,
    res
  ) => {
    try {
      requireShiftAssignment(
        req
      );

      if (
        !validObjectId(
          req.params.id
        )
      ) {
        throw createError(
          "Roster ID is invalid."
        );
      }

      const body =
        req.body ||
        {};

      const assignmentDate =
        body.assignmentDate ||
        body.date;

      if (
        !isValidDateKey(
          assignmentDate
        )
      ) {
        throw createError(
          "assignmentDate must be a valid YYYY-MM-DD date."
        );
      }

      if (
        !body.employeeId ||
        !validObjectId(
          body.employeeId
        )
      ) {
        throw createError(
          "Employee ID is invalid."
        );
      }

      const normalizedDayType =
        normalize(
          body.dayType ||
          "SHIFT"
        );

      if (
        normalizedDayType ===
          "SHIFT" &&
        (
          !body.shiftId ||
          !validObjectId(
            body.shiftId
          )
        )
      ) {
        throw createError(
          "Shift ID is invalid."
        );
      }

      const assignment =
        await shiftService
          .assignDay({
            rosterId:
              req.params.id,

            employeeId:
              body.employeeId,

            assignmentDate,

            dayType:
              normalizedDayType,

            shiftId:
              normalizedDayType ===
                "SHIFT"
                ? body.shiftId
                : null,

            assignmentSource:
              body.assignmentSource ||
              "HEAD",

            overrideReason:
              body.overrideReason ||
              "",

            assignedBy:
              getUserId(
                req
              ),
          });

      return res.json({
        success:
          true,

        message:
          "Shift assignment updated.",

        assignment,
      });
    } catch (
      error
    ) {
      return sendError(
        res,
        error
      );
    }
  };

/* =========================================================
   BULK ASSIGN
========================================================= */

exports.bulkAssign =
  async (
    req,
    res
  ) => {
    try {
      requireShiftAssignment(
        req
      );

      if (
        !validObjectId(
          req.params.id
        )
      ) {
        throw createError(
          "Roster ID is invalid."
        );
      }

      const body =
        req.body ||
        {};

      const employeeIds =
        body.employeeIds;

      const sourceDates =
        Array.isArray(
          body.dates
        ) &&
        body.dates.length
          ? body.dates
          : body.assignmentDates;

      if (
        !Array.isArray(
          employeeIds
        ) ||
        !employeeIds.length
      ) {
        throw createError(
          "Select at least one employee."
        );
      }

      const normalizedEmployeeIds = [
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

      const invalidEmployeeId =
        normalizedEmployeeIds
          .find(
            (
              id
            ) =>
              !validObjectId(
                id
              )
          );

      if (
        invalidEmployeeId
      ) {
        throw createError(
          `Employee ID "${invalidEmployeeId}" is invalid.`
        );
      }

      if (
        !Array.isArray(
          sourceDates
        ) ||
        !sourceDates.length
      ) {
        throw createError(
          "Select at least one assignment date."
        );
      }

      const normalizedDates = [
        ...new Set(
          sourceDates.map(
            (
              value
            ) =>
              String(
                value ||
                ""
              ).trim()
          )
        ),
      ];

      const invalidDate =
        normalizedDates
          .find(
            (
              value
            ) =>
              !isValidDateKey(
                value
              )
          );

      if (
        invalidDate
      ) {
        throw createError(
          `Invalid assignment date "${invalidDate}". Dates must be YYYY-MM-DD.`
        );
      }

      const normalizedDayType =
        normalize(
          body.dayType ||
          "SHIFT"
        );

      const allowedDayTypes = [
        "SHIFT",
        "WEEK_OFF",
        "HOLIDAY",
        "LEAVE",
        "NOT_SCHEDULED",
      ];

      if (
        !allowedDayTypes.includes(
          normalizedDayType
        )
      ) {
        throw createError(
          "Invalid roster day type."
        );
      }

      if (
        normalizedDayType ===
        "SHIFT"
      ) {
        if (
          !body.shiftId ||
          !validObjectId(
            body.shiftId
          )
        ) {
          throw createError(
            "Shift ID is invalid."
          );
        }
      }

      const result =
        await shiftService
          .bulkAssign({
            rosterId:
              req.params.id,

            employeeIds:
              normalizedEmployeeIds,

            dates:
              normalizedDates,

            assignmentDates:
              normalizedDates,

            dayType:
              normalizedDayType,

            shiftId:
              normalizedDayType ===
                "SHIFT"
                ? body.shiftId
                : null,

            assignmentSource:
              body.assignmentSource ||
              "HEAD",

            assignedBy:
              getUserId(
                req
              ),
          });

      return res.json({
        success:
          true,

        message:
          "Shift assignments applied successfully.",

        ...result,
      });
    } catch (
      error
    ) {
      return sendError(
        res,
        error
      );
    }
  };

/* =========================================================
   ASSIGN COMPLETE WEEK
========================================================= */

exports.assignCompleteWeek =
  async (
    req,
    res
  ) => {
    try {
      requireShiftAssignment(
        req
      );

      if (
        !validObjectId(
          req.params.id
        )
      ) {
        throw createError(
          "Roster ID is invalid."
        );
      }

      const body =
        req.body ||
        {};

      if (
        !Array.isArray(
          body.employeeIds
        ) ||
        !body.employeeIds.length
      ) {
        throw createError(
          "Select at least one employee."
        );
      }

      if (
        !body.shiftId ||
        !validObjectId(
          body.shiftId
        )
      ) {
        throw createError(
          "Shift ID is invalid."
        );
      }

      const result =
        await shiftService
          .assignCompleteWeek({
            rosterId:
              req.params.id,

            employeeIds:
              body.employeeIds,

            shiftId:
              body.shiftId,

            workingDays:
              Array.isArray(
                body.workingDays
              )
                ? body.workingDays
                : undefined,

            weekOffDays:
              Array.isArray(
                body.weekOffDays
              )
                ? body.weekOffDays
                : undefined,

            assignmentSource:
              body.assignmentSource ||
              "HEAD",

            assignedBy:
              getUserId(
                req
              ),
          });

      return res.json({
        success:
          true,

        message:
          "Complete week assignment updated.",

        ...result,
      });
    } catch (
      error
    ) {
      return sendError(
        res,
        error
      );
    }
  };

/* =========================================================
   COPY PREVIOUS WEEK
========================================================= */

exports.copyPreviousWeek =
  async (
    req,
    res
  ) => {
    try {
      requireShiftAssignment(
        req
      );

      if (
        !validObjectId(
          req.params.id
        )
      ) {
        throw createError(
          "Roster ID is invalid."
        );
      }

      const result =
        await shiftService
          .copyPreviousWeek({
            rosterId:
              req.params.id,

            userId:
              getUserId(
                req
              ),
          });

      return res.json({
        success:
          true,

        message:
          "Previous week's shift exceptions copied.",

        ...result,
      });
    } catch (
      error
    ) {
      return sendError(
        res,
        error
      );
    }
  };

/* =========================================================
   SUBMIT ROSTER
========================================================= */

exports.submitRoster =
  async (
    req,
    res
  ) => {
    try {
      requireShiftAssignment(
        req
      );

      if (
        !validObjectId(
          req.params.id
        )
      ) {
        throw createError(
          "Roster ID is invalid."
        );
      }

      const roster =
        await shiftService
          .submitRoster(
            req.params.id,
            getUserId(
              req
            )
          );

      return res.json({
        success:
          true,

        message:
          "Shift roster submitted for HR review.",

        roster,
      });
    } catch (
      error
    ) {
      return sendError(
        res,
        error
      );
    }
  };

/* =========================================================
   PUBLISH ROSTER

   IMPORTANT:

   Controller does NOT inspect ShiftAssignment directly.

   Service is authoritative because service can resolve:

   requested empty legacy roster
   ->
   real roster containing assignments
========================================================= */

exports.publishRoster =
  async (
    req,
    res
  ) => {
    try {
      requireShiftPublish(
        req
      );

      const rosterId =
        String(
          req.params
            ?.id ||
          ""
        ).trim();

      /* =====================================================
         VALIDATE ROSTER ID
      ===================================================== */

      if (
        !validObjectId(
          rosterId
        )
      ) {
        throw createError(
          "Roster ID is invalid."
        );
      }

      /* =====================================================
         AUTHENTICATED USER
      ===================================================== */

      const userId =
        getUserId(
          req
        );

      if (
        !userId
      ) {
        throw createError(
          "Authenticated user is required to publish shift roster.",
          401
        );
      }

      /* =====================================================
         SERVICE IS AUTHORITATIVE

         IMPORTANT:

         Controller must NOT:
         - count assignments itself
         - decide whether roster is empty
         - resolve orgUnitCode
         - resolve duplicate roster
         - create/cancel roster

         Service handles the complete weekly publish workflow.

         It can receive an old empty roster ID and still find
         the real assignment-owning rosters for that week.
      ===================================================== */

      const result =
        await shiftService
          .publishRoster(
            rosterId,
            userId,
            req.body
              ?.remarks ||
              ""
          );

      /* =====================================================
         SAFETY

         Service should always return a result.
      ===================================================== */

      if (
        !result
      ) {
        throw createError(
          "Shift publication returned no result.",
          500
        );
      }

      /* =====================================================
         SKIPPED

         Possible reasons:

         EMPTY_WEEK
         ORPHAN_EMPTY_ROSTER
         NO_PUBLISHABLE_ROSTER

         This is HTTP 200 intentionally.

         Normal/default Day Shift remains active where no
         explicit shift exception exists.
      ===================================================== */

      if (
        result.skipped ===
        true
      ) {
        let message =
          "No shift exceptions require publication for this week. Employees continue on their normal Day Shift.";

        if (
          result.reason ===
          "EMPTY_WEEK"
        ) {
          message =
            "No shift exceptions exist for this week. Employees continue on their normal Day Shift.";
        } else if (
          result.reason ===
          "ORPHAN_EMPTY_ROSTER"
        ) {
          message =
            "The obsolete empty roster was skipped. No shift exceptions exist on that roster.";
        } else if (
          result.reason ===
          "NO_PUBLISHABLE_ROSTER"
        ) {
          message =
            "Shift assignments exist, but no roster is currently eligible for publication.";
        }

        return res
          .status(
            200
          )
          .json({
            success:
              true,

            skipped:
              true,

            published:
              false,

            redirected:
              Boolean(
                result.redirected
              ),

            alreadyPublished:
              Boolean(
                result.alreadyPublished
              ),

            reason:
              result.reason ||
              "EMPTY_WEEK",

            message,

            requestedRosterId:
              result.requestedRosterId ||
              rosterId,

            targetRosterId:
              result.targetRosterId ||
              null,

            assignmentCount:
              Number(
                result.assignmentCount ||
                0
              ),

            employeeCount:
              Number(
                result.employeeCount ||
                0
              ),

            publishedRosterCount:
              Number(
                result.publishedRosterCount ||
                0
              ),

            alreadyPublishedRosterCount:
              Number(
                result.alreadyPublishedRosterCount ||
                0
              ),

            publishedRosters:
              Array.isArray(
                result.publishedRosters
              )
                ? result.publishedRosters
                : [],

            alreadyPublishedRosters:
              Array.isArray(
                result.alreadyPublishedRosters
              )
                ? result.alreadyPublishedRosters
                : [],

            invalidRosters:
              Array.isArray(
                result.invalidRosters
              )
                ? result.invalidRosters
                : [],

            roster:
              result.roster ||
              null,
          });
      }

      /* =====================================================
         SUCCESSFUL PUBLICATION

         One Publish Schedule action may publish more than one
         real roster for the selected Monday-Sunday week.

         Example:

         HR
         -> Night Shift assignments

         Operations
         -> Week Off exceptions

         Both can be published in one backend operation.
      ===================================================== */

      if (
        result.published ===
        true
      ) {
        const newlyPublishedCount =
          Number(
            result.publishedRosterCount ||
            0
          );

        const alreadyPublishedCount =
          Number(
            result.alreadyPublishedRosterCount ||
            0
          );

        let message =
          "Weekly shift schedule published successfully.";

        if (
          result.alreadyPublished ===
            true &&
          newlyPublishedCount ===
            0
        ) {
          message =
            "Weekly shift schedule is already published.";
        } else if (
          newlyPublishedCount >
            1
        ) {
          message =
            `${newlyPublishedCount} shift rosters published successfully for this week.`;
        } else if (
          newlyPublishedCount ===
            1 &&
          result.redirected
        ) {
          message =
            "The obsolete empty roster was ignored and the real shift schedule was published successfully.";
        }

        return res
          .status(
            200
          )
          .json({
            success:
              true,

            skipped:
              false,

            published:
              true,

            redirected:
              Boolean(
                result.redirected
              ),

            alreadyPublished:
              Boolean(
                result.alreadyPublished
              ),

            message,

            requestedRosterId:
              result.requestedRosterId ||
              rosterId,

            targetRosterId:
              result.targetRosterId ||
              null,

            assignmentCount:
              Number(
                result.assignmentCount ||
                0
              ),

            employeeCount:
              Number(
                result.employeeCount ||
                0
              ),

            publishedRosterCount:
              newlyPublishedCount,

            alreadyPublishedRosterCount:
              alreadyPublishedCount,

            publishedRosters:
              Array.isArray(
                result.publishedRosters
              )
                ? result.publishedRosters
                : [],

            alreadyPublishedRosters:
              Array.isArray(
                result.alreadyPublishedRosters
              )
                ? result.alreadyPublishedRosters
                : [],

            invalidRosters:
              Array.isArray(
                result.invalidRosters
              )
                ? result.invalidRosters
                : [],

            roster:
              result.roster ||
              null,
          });
      }

      /* =====================================================
         UNEXPECTED SERVICE STATE

         We should never silently return success if service
         reports neither published nor skipped.
      ===================================================== */

      throw createError(
        result.reason
          ? `Shift publication could not be completed: ${result.reason}.`
          : "Shift publication could not be completed.",
        409
      );
    } catch (
      error
    ) {
      return sendError(
        res,
        error
      );
    }
  };
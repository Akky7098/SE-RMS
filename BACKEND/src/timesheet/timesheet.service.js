const mongoose = require("mongoose");

const Timesheet =
  require("./timesheet.model");

/*
 * CHANGE ONLY THESE IMPORT PATHS
 * if your existing files have different names.
 */
const Employee =
  require("../employee/employee.model");

const User =
  require("../user/user.model");

const transporter =
  require("../utils/mailTransporter");

/* =========================================================
   CONFIG
========================================================= */

const TIMEZONE =
  "Asia/Kolkata";

const TIMESHEET_ADMIN_EMAIL =
  String(
    process.env
      .TIMESHEET_ADMIN_EMAIL ||
      process.env
        .MANAGER_EMAIL ||
      ""
  ).trim();

/* =========================================================
   ERROR HELPER
========================================================= */

const createError = (
  message,
  statusCode = 400
) => {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  return error;
};

/* =========================================================
   ROLE HELPERS
========================================================= */

const normalizeRole = (
  user
) =>
  String(
    user?.role || ""
  )
    .trim()
    .toUpperCase();

const isGlobalManager = (
  user
) => {
  return [
    "SUPER_ADMIN",
    "ADMIN",
  ].includes(
    normalizeRole(user)
  );
};

const isDepartmentHead = (
  user
) => {
  return [
    "HEAD",
    "DEPARTMENT_HEAD",
  ].includes(
    normalizeRole(user)
  );
};

const isManager = (
  user
) => {
  return [
    "MANAGER",
    "TEAM_LEAD",
  ].includes(
    normalizeRole(user)
  );
};

/* =========================================================
   DATE HELPERS
========================================================= */

const getIndiaDateParts = (
  date = new Date()
) => {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          TIMEZONE,

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      }
    );

  const parts =
    formatter.formatToParts(
      date
    );

  const map = {};

  parts.forEach(
    (part) => {
      if (
        part.type !==
        "literal"
      ) {
        map[
          part.type
        ] =
          part.value;
      }
    }
  );

  return {
    year:
      Number(
        map.year
      ),

    month:
      Number(
        map.month
      ),

    day:
      Number(
        map.day
      ),
  };
};

const getDateKey = (
  date = new Date()
) => {
  const {
    year,
    month,
    day,
  } =
    getIndiaDateParts(
      date
    );

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      0,
      0,
      0,
      0
    )
  );
};

const parseDateKey = (
  value
) => {
  if (!value) {
    return null;
  }

  const match =
    String(value).match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    throw createError(
      "Date must be in YYYY-MM-DD format."
    );
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  const day =
    Number(match[3]);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw createError(
      "Invalid date."
    );
  }

  return date;
};

const formatIndiaDate = (
  value
) => {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      timeZone:
        TIMEZONE,

      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",
    }
  ).format(
    new Date(value)
  );
};

const formatIndiaTime = (
  value
) => {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      timeZone:
        TIMEZONE,

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    new Date(value)
  );
};

/* =========================================================
   EMPLOYEE HELPERS
========================================================= */

const findEmployeeByUser =
  async (
    userId
  ) => {
    if (!userId) {
      return null;
    }

    return Employee.findOne({
      $or: [
        {
          userId,
        },
        {
          user:
            userId,
        },
      ],
    }).lean();
  };

const getEmployeeUserId = (
  employee
) =>
  employee?.userId ||
  employee?.user ||
  null;

const getDepartmentId = (
  employee
) =>
  employee
    ?.departmentId ||
  employee
    ?.department ||
  null;

const getOrganizationUnitId =
  (
    employee
  ) =>
    employee
      ?.organizationUnitId ||
    employee
      ?.organizationUnit ||
    null;

const getDesignationId = (
  employee
) =>
  employee
    ?.designationId ||
  employee
    ?.designation ||
  null;

const getReportingManagerId =
  (
    employee
  ) =>
    employee
      ?.reportingManagerId ||
    employee
      ?.reportingManager ||
    null;

/* =========================================================
   GET USER RECORD FOR EMPLOYEE
========================================================= */

const getEmployeeUser =
  async (
    employee
  ) => {
    const userId =
      getEmployeeUserId(
        employee
      );

    if (!userId) {
      return null;
    }

    return User.findById(
      userId
    )
      .select(
        "displayName name email role"
      )
      .lean();
  };

/* =========================================================
   REPORTING MANAGER USER
========================================================= */

const getManagerDetails =
  async (
    employee
  ) => {
    const managerEmployeeId =
      getReportingManagerId(
        employee
      );

    if (!managerEmployeeId) {
      return {
        employeeId:
          null,

        userId:
          null,

        name:
          "",

        email:
          "",
      };
    }

    const managerEmployee =
      await Employee.findById(
        managerEmployeeId
      ).lean();

    if (!managerEmployee) {
      return {
        employeeId:
          managerEmployeeId,

        userId:
          null,

        name:
          "",

        email:
          "",
      };
    }

    const managerUser =
      await getEmployeeUser(
        managerEmployee
      );

    return {
      employeeId:
        managerEmployee
          ._id,

      userId:
        managerUser
          ?._id ||
        getEmployeeUserId(
          managerEmployee
        ),

      name:
        managerUser
          ?.displayName ||
        managerEmployee
          ?.employeeName ||
        managerEmployee
          ?.name ||
        "",

      email:
        managerUser
          ?.email ||
        managerEmployee
          ?.email ||
        "",
    };
  };

/* =========================================================
   EMPLOYEE SNAPSHOT
========================================================= */

const buildEmployeeSnapshot =
  async (
    employee,
    user
  ) => {
    const manager =
      await getManagerDetails(
        employee
      );

    return {
      employeeId:
        employee._id,

      userId:
        user._id,

      employeeCode:
        employee.employeeCode ||
        "",

      employeeName:
        user.displayName ||
        employee.employeeName ||
        employee.name ||
        "Employee",

      employeeEmail:
        user.email ||
        employee.email ||
        "",

      organizationUnitId:
        getOrganizationUnitId(
          employee
        ),

      departmentId:
        getDepartmentId(
          employee
        ),

      departmentName:
        employee.departmentName ||
        "",

      designationId:
        getDesignationId(
          employee
        ),

      designationName:
        employee.designationName ||
        "",

      reportingManagerId:
        manager.employeeId,

      reportingManagerUserId:
        manager.userId,

      manager,
    };
  };

/* =========================================================
   VALIDATION
========================================================= */

const validateReport = (
  payload = {}
) => {
  const workSummary =
    String(
      payload.workSummary ||
      ""
    ).trim();

  const challenges =
    String(
      payload.challenges ||
      ""
    ).trim();

  const nextDayPlan =
    String(
      payload.nextDayPlan ||
      ""
    ).trim();

  if (
    workSummary.length <
    10
  ) {
    throw createError(
      "Work summary must contain at least 10 characters."
    );
  }

  if (
    workSummary.length >
    10000
  ) {
    throw createError(
      "Work summary is too long."
    );
  }

  if (
    challenges.length >
    5000
  ) {
    throw createError(
      "Challenges field is too long."
    );
  }

  if (
    nextDayPlan.length >
    10000
  ) {
    throw createError(
      "Next day plan is too long."
    );
  }

  return {
    workSummary,
    challenges,
    nextDayPlan,
  };
};

/* =========================================================
   EMAIL TEXT FORMATTER
========================================================= */

const escapeHtml = (
  value = ""
) => {
  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
};

const formatTextForMail = (
  text = ""
) => {
  const value =
    String(
      text || ""
    ).trim();

  if (!value) {
    return `
      <div style="
        color:#8b8e95;
        font-size:13px;
      ">
        -
      </div>
    `;
  }

  return value
    .split(/\n+/)
    .map(
      (line) =>
        line.trim()
    )
    .filter(Boolean)
    .map(
      (line) => {
        const clean =
          line.replace(
            /^\s*(?:\d+[.)]|[-•*])\s*/,
            ""
          );

        return `
          <div
            style="
              display:flex;
              align-items:flex-start;
              gap:9px;
              margin-bottom:8px;
              line-height:1.55;
            "
          >
            <div
              style="
                color:#e30613;
                font-weight:900;
              "
            >
              •
            </div>

            <div>
              ${escapeHtml(
                clean
              )}
            </div>
          </div>
        `;
      }
    )
    .join("");
};

/* =========================================================
   SEND REPORT EMAIL

   IMPORTANT:
   Report submission succeeds even if mail fails.
========================================================= */

const sendTimesheetEmail =
  async (
    timesheet,
    manager
  ) => {
    if (
      !transporter
    ) {
      return;
    }

    const recipients =
      [];

    if (
      manager?.email
    ) {
      recipients.push(
        manager.email
      );
    }

    if (
      TIMESHEET_ADMIN_EMAIL
    ) {
      recipients.push(
        TIMESHEET_ADMIN_EMAIL
      );
    }

    const uniqueRecipients =
      [
        ...new Set(
          recipients
            .map(
              (item) =>
                String(
                  item
                )
                  .trim()
                  .toLowerCase()
            )
            .filter(Boolean)
        ),
      ];

    if (
      uniqueRecipients.length ===
      0
    ) {
      return;
    }

    const submittedTime =
      formatIndiaTime(
        timesheet
          .submittedAt
      );

    const reportDate =
      formatIndiaDate(
        timesheet
          .reportDate
      );

    await transporter.sendMail({
      from:
        process.env
          .EMAIL_FROM ||
        "SE-RMS <no-reply@sandeepedgetech.com>",

      to:
        uniqueRecipients,

      cc:
        timesheet.employeeEmail ||
        undefined,

      replyTo:
        timesheet.employeeEmail ||
        undefined,

      subject:
        `DAILY WORK REPORT | ${reportDate} | ` +
        `${timesheet.employeeName} | ${submittedTime}`,

      html: `
        <div
          style="
            margin:0;
            padding:30px;
            background:#f5f6f8;
            font-family:Arial,sans-serif;
            color:#202228;
          "
        >
          <div
            style="
              max-width:680px;
              margin:auto;
              background:#ffffff;
              border:1px solid #e5e6e9;
              border-radius:18px;
              overflow:hidden;
            "
          >
            <div
              style="
                padding:24px 28px;
                background:
                  linear-gradient(
                    120deg,
                    #202228,
                    #e30613
                  );
                color:#ffffff;
              "
            >
              <div
                style="
                  font-size:10px;
                  letter-spacing:1.4px;
                  font-weight:900;
                  opacity:.75;
                "
              >
                SE-RMS
              </div>

              <h2
                style="
                  margin:8px 0 0;
                  font-size:22px;
                "
              >
                Daily Work Report
              </h2>
            </div>

            <div
              style="
                padding:26px 28px;
              "
            >
              <table
                style="
                  width:100%;
                  border-collapse:collapse;
                  margin-bottom:26px;
                  font-size:13px;
                "
              >
                <tr>
                  <td
                    style="
                      padding:6px 0;
                      color:#8c8f96;
                      width:140px;
                    "
                  >
                    Employee
                  </td>

                  <td
                    style="
                      padding:6px 0;
                      font-weight:700;
                    "
                  >
                    ${escapeHtml(
                      timesheet
                        .employeeName
                    )}
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:6px 0;
                      color:#8c8f96;
                    "
                  >
                    Department
                  </td>

                  <td
                    style="
                      padding:6px 0;
                      font-weight:700;
                    "
                  >
                    ${escapeHtml(
                      timesheet
                        .departmentName ||
                      "-"
                    )}
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:6px 0;
                      color:#8c8f96;
                    "
                  >
                    Date
                  </td>

                  <td
                    style="
                      padding:6px 0;
                      font-weight:700;
                    "
                  >
                    ${reportDate}
                  </td>
                </tr>
              </table>

              <h3
                style="
                  margin:0 0 10px;
                  font-size:14px;
                  color:#e30613;
                "
              >
                Work Summary
              </h3>

              <div
                style="
                  margin-bottom:24px;
                  font-size:13px;
                "
              >
                ${formatTextForMail(
                  timesheet
                    .workSummary
                )}
              </div>

              <h3
                style="
                  margin:0 0 10px;
                  font-size:14px;
                  color:#e30613;
                "
              >
                Challenges
              </h3>

              <div
                style="
                  margin-bottom:24px;
                  font-size:13px;
                "
              >
                ${formatTextForMail(
                  timesheet
                    .challenges
                )}
              </div>

              <h3
                style="
                  margin:0 0 10px;
                  font-size:14px;
                  color:#e30613;
                "
              >
                Next Day Plan
              </h3>

              <div
                style="
                  font-size:13px;
                "
              >
                ${formatTextForMail(
                  timesheet
                    .nextDayPlan
                )}
              </div>
            </div>
          </div>
        </div>
      `,
    });
  };

/* =========================================================
   CREATE TIMESHEET
========================================================= */

const createTimesheet =
  async (
    payload = {},
    user
  ) => {
    if (!user?._id) {
      throw createError(
        "Authentication required.",
        401
      );
    }

    const employee =
      await findEmployeeByUser(
        user._id
      );

    if (!employee) {
      throw createError(
        "Employee profile is not linked to this user.",
        404
      );
    }

    const report =
      validateReport(
        payload
      );

    const reportDate =
      getDateKey();

    const alreadySubmitted =
      await Timesheet.findOne({
        employeeId:
          employee._id,

        reportDate,
      }).lean();

    if (
      alreadySubmitted
    ) {
      throw createError(
        "You have already submitted today's work report.",
        409
      );
    }

    const snapshot =
      await buildEmployeeSnapshot(
        employee,
        user
      );

    let timesheet;

    try {
      timesheet =
        await Timesheet.create({
          employeeId:
            snapshot
              .employeeId,

          userId:
            snapshot
              .userId,

          employeeCode:
            snapshot
              .employeeCode,

          employeeName:
            snapshot
              .employeeName,

          employeeEmail:
            snapshot
              .employeeEmail,

          organizationUnitId:
            snapshot
              .organizationUnitId,

          departmentId:
            snapshot
              .departmentId,

          departmentName:
            snapshot
              .departmentName,

          designationId:
            snapshot
              .designationId,

          designationName:
            snapshot
              .designationName,

          reportingManagerId:
            snapshot
              .reportingManagerId,

          reportingManagerUserId:
            snapshot
              .reportingManagerUserId,

          reportDate,

          workSummary:
            report
              .workSummary,

          challenges:
            report
              .challenges,

          nextDayPlan:
            report
              .nextDayPlan,

          status:
            "SUBMITTED",

          submittedAt:
            new Date(),
        });
    } catch (error) {
      if (
        error?.code ===
        11000
      ) {
        throw createError(
          "You have already submitted today's work report.",
          409
        );
      }

      throw error;
    }

    /* =====================================================
       EMAIL

       Save first.
       Mail failure must not lose employee report.
    ===================================================== */

    timesheet
      .notification
      .emailAttempted =
      true;

    try {
      await sendTimesheetEmail(
        timesheet,
        snapshot.manager
      );

      timesheet
        .notification
        .emailSent =
        true;

      timesheet
        .notification
        .emailSentAt =
        new Date();

      timesheet
        .notification
        .emailError =
        "";
    } catch (error) {
      console.error(
        "TIMESHEET EMAIL FAILED:",
        error?.message ||
          error
      );

      timesheet
        .notification
        .emailSent =
        false;

      timesheet
        .notification
        .emailError =
        String(
          error?.message ||
          "Email delivery failed."
        ).slice(
          0,
          1000
        );
    }

    await timesheet.save();

    return timesheet;
  };

/* =========================================================
   MY TODAY
========================================================= */

const getMyToday =
  async (
    user
  ) => {
    const employee =
      await findEmployeeByUser(
        user?._id
      );

    if (!employee) {
      throw createError(
        "Employee profile not found.",
        404
      );
    }

    const reportDate =
      getDateKey();

    const timesheet =
      await Timesheet.findOne({
        employeeId:
          employee._id,

        reportDate,
      }).lean();

    return {
      reportDate,

      submitted:
        Boolean(
          timesheet
        ),

      timesheet:
        timesheet ||
        null,
    };
  };

/* =========================================================
   MANAGEMENT SCOPE
========================================================= */

const buildScope =
  async (
    user
  ) => {
    if (
      isGlobalManager(
        user
      )
    ) {
      return {};
    }

    const employee =
      await findEmployeeByUser(
        user?._id
      );

    if (!employee) {
      throw createError(
        "Employee profile not found.",
        403
      );
    }

    if (
      isDepartmentHead(
        user
      )
    ) {
      const departmentId =
        getDepartmentId(
          employee
        );

      if (!departmentId) {
        throw createError(
          "Department scope is not configured.",
          403
        );
      }

      return {
        departmentId,
      };
    }

    if (
      isManager(
        user
      )
    ) {
      return {
        reportingManagerId:
          employee._id,
      };
    }

    return {
      employeeId:
        employee._id,
    };
  };

/* =========================================================
   GET TIMESHEETS
========================================================= */

const getTimesheets =
  async (
    query = {},
    user
  ) => {
    const scope =
      await buildScope(
        user
      );

    const filter = {
      ...scope,
    };

    /* =====================================================
       GLOBAL FILTERS
    ===================================================== */

    if (
      isGlobalManager(
        user
      )
    ) {
      if (
        query.organizationUnitId &&
        mongoose.Types.ObjectId.isValid(
          query.organizationUnitId
        )
      ) {
        filter.organizationUnitId =
          query.organizationUnitId;
      }

      if (
        query.departmentId &&
        mongoose.Types.ObjectId.isValid(
          query.departmentId
        )
      ) {
        filter.departmentId =
          query.departmentId;
      }

      if (
        query.employeeId &&
        mongoose.Types.ObjectId.isValid(
          query.employeeId
        )
      ) {
        filter.employeeId =
          query.employeeId;
      }
    }

    /* =====================================================
       STATUS
    ===================================================== */

    if (
      query.status
    ) {
      filter.status =
        String(
          query.status
        )
          .trim()
          .toUpperCase();
    }

    /* =====================================================
       DATE RANGE
    ===================================================== */

    const from =
      parseDateKey(
        query.from
      );

    const to =
      parseDateKey(
        query.to
      );

    if (
      from ||
      to
    ) {
      filter.reportDate =
        {};

      if (from) {
        filter
          .reportDate
          .$gte =
          from;
      }

      if (to) {
        filter
          .reportDate
          .$lte =
          to;
      }
    }

    /* =====================================================
       MONTH + YEAR

       month = 1..12
    ===================================================== */

    if (
      query.month &&
      query.year
    ) {
      const month =
        Number(
          query.month
        );

      const year =
        Number(
          query.year
        );

      if (
        month < 1 ||
        month > 12 ||
        !Number.isInteger(
          year
        )
      ) {
        throw createError(
          "Invalid month or year."
        );
      }

      const start =
        new Date(
          Date.UTC(
            year,
            month - 1,
            1
          )
        );

      const end =
        new Date(
          Date.UTC(
            year,
            month,
            0
          )
        );

      filter.reportDate = {
        $gte:
          start,

        $lte:
          end,
      };
    }

    /* =====================================================
       SEARCH
    ===================================================== */

    if (
      query.search
    ) {
      const search =
        String(
          query.search
        )
          .trim()
          .slice(
            0,
            100
          );

      if (search) {
        filter.$or = [
          {
            employeeName: {
              $regex:
                search,

              $options:
                "i",
            },
          },

          {
            employeeCode: {
              $regex:
                search,

              $options:
                "i",
            },
          },

          {
            workSummary: {
              $regex:
                search,

              $options:
                "i",
            },
          },
        ];
      }
    }

    /* =====================================================
       PAGINATION
    ===================================================== */

    const page =
      Math.max(
        1,
        Number(
          query.page ||
          1
        )
      );

    const limit =
      Math.min(
        100,
        Math.max(
          1,
          Number(
            query.limit ||
            30
          )
        )
      );

    const skip =
      (
        page - 1
      ) *
      limit;

    const [
      records,
      total,
    ] =
      await Promise.all([
        Timesheet.find(
          filter
        )
          .sort({
            reportDate:
              -1,

            submittedAt:
              -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        Timesheet
          .countDocuments(
            filter
          ),
      ]);

    return {
      records,

      pagination: {
        page,
        limit,
        total,

        pages:
          Math.ceil(
            total /
              limit
          ),
      },
    };
  };

/* =========================================================
   GET ONE TIMESHEET

   Uses same hierarchy scope.
========================================================= */

const getTimesheetById =
  async (
    timesheetId,
    user
  ) => {
    if (
      !mongoose.Types.ObjectId.isValid(
        timesheetId
      )
    ) {
      throw createError(
        "Invalid timesheet ID."
      );
    }

    const scope =
      await buildScope(
        user
      );

    const timesheet =
      await Timesheet.findOne({
        _id:
          timesheetId,

        ...scope,
      }).lean();

    if (!timesheet) {
      throw createError(
        "Timesheet not found or access denied.",
        404
      );
    }

    return timesheet;
  };

/* =========================================================
   REVIEW TIMESHEET

   Admin / Head / Manager only.
========================================================= */

const reviewTimesheet =
  async (
    timesheetId,
    payload = {},
    user
  ) => {
    if (
      !mongoose.Types.ObjectId.isValid(
        timesheetId
      )
    ) {
      throw createError(
        "Invalid timesheet ID."
      );
    }

    if (
      !(
        isGlobalManager(
          user
        ) ||
        isDepartmentHead(
          user
        ) ||
        isManager(
          user
        )
      )
    ) {
      throw createError(
        "You are not authorized to review timesheets.",
        403
      );
    }

    const scope =
      await buildScope(
        user
      );

    const timesheet =
      await Timesheet.findOne({
        _id:
          timesheetId,

        ...scope,
      });

    if (!timesheet) {
      throw createError(
        "Timesheet not found or access denied.",
        404
      );
    }

    timesheet.status =
      "REVIEWED";

    timesheet.reviewedBy =
      user._id;

    timesheet.reviewedAt =
      new Date();

    timesheet.reviewRemark =
      String(
        payload
          .reviewRemark ||
        ""
      )
        .trim()
        .slice(
          0,
          2000
        );

    await timesheet.save();

    return timesheet;
  };

/* =========================================================
   DASHBOARD SUMMARY
========================================================= */

const getTimesheetSummary =
  async (
    query = {},
    user
  ) => {
    const scope =
      await buildScope(
        user
      );

    const reportDate =
      query.date
        ? parseDateKey(
            query.date
          )
        : getDateKey();

    const [
      submitted,
      reviewed,
    ] =
      await Promise.all([
        Timesheet.countDocuments({
          ...scope,

          reportDate,
        }),

        Timesheet.countDocuments({
          ...scope,

          reportDate,

          status:
            "REVIEWED",
        }),
      ]);

    return {
      reportDate,

      submitted,

      reviewed,

      pendingReview:
        Math.max(
          0,
          submitted -
            reviewed
        ),
    };
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createTimesheet,

  getMyToday,

  getTimesheets,

  getTimesheetById,

  reviewTimesheet,

  getTimesheetSummary,
};
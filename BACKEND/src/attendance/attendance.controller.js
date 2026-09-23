const attendanceService =
  require(
    "./attendance.service"
  );

/* =========================================================
   RESPONSE HELPERS
========================================================= */

const sendError =
  (
    res,
    error
  ) => {
    console.error(
      "Attendance Error:",
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
          "Attendance operation failed.",
      });
  };

/* =========================================================
   USER ID
========================================================= */

const getUserId =
  (
    req
  ) => {
    return (
      req.user?._id ||
      req.user?.id ||
      null
    );
  };

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
    ];

    return new Set(
      values.map(
        (
          value
        ) =>
          String(
            value
          )
            .trim()
            .toUpperCase()
      )
    );
  };

/* =========================================================
   ATTENDANCE ACCESS SCOPE
========================================================= */

const getAttendanceScope =
  (
    req
  ) => {
    const systemRole =
      String(
        req.user
          ?.systemRole ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      systemRole ===
      "SUPER_ADMIN"
    ) {
      return {
        type:
          "ALL",
      };
    }

    if (
      req.attendanceScope
    ) {
      return req
        .attendanceScope;
    }

    const permissions =
      getPermissions(
        req
      );

    if (
      permissions.has(
        "ATTENDANCE_VIEW_ALL"
      )
    ) {
      return {
        type:
          "ALL",
      };
    }

    if (
      permissions.has(
        "ATTENDANCE_VIEW_DEPARTMENT"
      )
    ) {
      return {
        type:
          "DEPARTMENT",
      };
    }

    if (
      permissions.has(
        "ATTENDANCE_VIEW_TEAM"
      )
    ) {
      return {
        type:
          "TEAM",
      };
    }

    /*
     * Legacy compatibility only.
     */

    const legacyRole =
      String(
        req.user
          ?.role ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      legacyRole ===
      "HEAD"
    ) {
      return {
        type:
          "DEPARTMENT",
      };
    }

    if (
      legacyRole ===
      "MANAGER"
    ) {
      return {
        type:
          "TEAM",
      };
    }

    return {
      type:
        "SELF",
    };
  };

/* =========================================================
   APPROVAL PERMISSION
========================================================= */

const canApproveRegularization =
  (
    req
  ) => {
    const systemRole =
      String(
        req.user
          ?.systemRole ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      systemRole ===
      "SUPER_ADMIN"
    ) {
      return true;
    }

    return getPermissions(
      req
    ).has(
      "ATTENDANCE_APPROVE_REGULARIZATION"
    );
  };

/* =========================================================
   FIELD LOCATION PERMISSION
========================================================= */

const canViewFieldLocation =
  (
    req
  ) => {
    const systemRole =
      String(
        req.user
          ?.systemRole ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      systemRole ===
      "SUPER_ADMIN"
    ) {
      return true;
    }

    return getPermissions(
      req
    ).has(
      "ATTENDANCE_VIEW_FIELD_LOCATION"
    );
  };

/* =========================================================
   REQUEST META
========================================================= */

const getRequestMeta =
  (
    req
  ) => {
    const forwardedFor =
      req.headers[
        "x-forwarded-for"
      ];

    const ipAddress =
      Array.isArray(
        forwardedFor
      )
        ? forwardedFor[0]
        : String(
            forwardedFor ||
              req.ip ||
              req.socket
                ?.remoteAddress ||
              ""
          )
            .split(",")[0]
            .trim();

    return {
      ipAddress,

      userAgent:
        String(
          req.headers[
            "user-agent"
          ] ||
            ""
        ),
    };
  };

/* =========================================================
   MY ATTENDANCE
========================================================= */

exports.getMyAttendance =
  async (
    req,
    res
  ) => {
    try {
      const result =
        await attendanceService
          .getAttendance({
            actorUserId:
              getUserId(
                req
              ),

            access: {
              type:
                "SELF",
            },

            from:
              req.query.from,

            to:
              req.query.to,

            employeeId:
              req.query.employeeId,

            departmentId:
              req.query.departmentId,

            officeId:
              req.query.officeId,

            presenceStatus:
              req.query
                .presenceStatus,

            workMode:
              req.query.workMode,

            provider:
              req.query.provider,

            /*
             * IMPORTANT:
             *
             * My Attendance is SELF scope.
             *
             * Unmapped biometric operators do not have an
             * Employee/User identity in ERP, so they must
             * never be exposed through this endpoint.
             */
            includeUnmapped:
              false,

            page:
              req.query.page,

            limit:
              req.query.limit,
          });

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
   START WEB ATTENDANCE
========================================================= */

exports.startWebAttendance =
  async (
    req,
    res
  ) => {
    try {
      const attendance =
        await attendanceService
          .startWebAttendance({
            actorUserId:
              getUserId(
                req
              ),

            workMode:
              req.body
                ?.workMode,

            latitude:
              req.body
                ?.latitude,

            longitude:
              req.body
                ?.longitude,

            accuracy:
              req.body
                ?.accuracy,

            accuracyMeters:
              req.body
                ?.accuracyMeters,

            dutyPurpose:
              req.body
                ?.dutyPurpose,

            purpose:
              req.body
                ?.purpose,

            dutyLocation:
              req.body
                ?.dutyLocation,

            locationName:
              req.body
                ?.locationName,

            requestMeta:
              getRequestMeta(
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
            "Attendance started successfully.",

          attendance,
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
   STOP WEB ATTENDANCE
========================================================= */

exports.stopWebAttendance =
  async (
    req,
    res
  ) => {
    try {
      const attendance =
        await attendanceService
          .stopWebAttendance({
            actorUserId:
              getUserId(
                req
              ),

            latitude:
              req.body
                ?.latitude,

            longitude:
              req.body
                ?.longitude,

            accuracy:
              req.body
                ?.accuracy,

            accuracyMeters:
              req.body
                ?.accuracyMeters,

            requestMeta:
              getRequestMeta(
                req
              ),
          });

      return res.json({
        success:
          true,

        message:
          "Attendance completed successfully.",

        attendance,
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
   LOCATION CHECKPOINT
========================================================= */

exports.addLocationCheckpoint =
  async (
    req,
    res
  ) => {
    try {
      const result =
        await attendanceService
          .addLocationCheckpoint({
            actorUserId:
              getUserId(
                req
              ),

            latitude:
              req.body
                ?.latitude,

            longitude:
              req.body
                ?.longitude,

            accuracy:
              req.body
                ?.accuracy,

            accuracyMeters:
              req.body
                ?.accuracyMeters,

            source:
              req.body
                ?.source ||
              "PERIODIC",

            requestMeta:
              getRequestMeta(
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
            "Location checkpoint recorded.",

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
   LOCATION HISTORY
========================================================= */

exports.getEmployeeLocationHistory =
  async (
    req,
    res
  ) => {
    try {
      if (
        !canViewFieldLocation(
          req
        )
      ) {
        return res
          .status(
            403
          )
          .json({
            success:
              false,

            message:
              "Attendance field-location permission is required.",
          });
      }

      const items =
        await attendanceService
          .getEmployeeLocationHistory({
            actorUserId:
              getUserId(
                req
              ),

            access:
              getAttendanceScope(
                req
              ),

            employeeId:
              req.params
                .employeeId,

            businessDate:
              req.query
                .businessDate,

            from:
              req.query
                .from,

            to:
              req.query
                .to,

            limit:
              req.query
                .limit,
          });

      return res.json({
        success:
          true,

        count:
          items.length,

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
   SCOPED ATTENDANCE
========================================================= */

exports.getAttendance =
  async (
    req,
    res
  ) => {
    try {
      const result =
        await attendanceService
          .getAttendance({
            actorUserId:
              getUserId(
                req
              ),

            access:
              getAttendanceScope(
                req
              ),

            ...req.query,
          });

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
   MONTHLY SUMMARY
========================================================= */

exports.getMonthlySummary =
  async (
    req,
    res
  ) => {
    try {
      const {
        month,
        year,
      } =
        req.query;

      if (
        !month ||
        !year
      ) {
        return res
          .status(
            400
          )
          .json({
            success:
              false,

            message:
              "month and year are required.",
          });
      }

      const y =
        Number(
          year
        );

      const m =
        Number(
          month
        );

      if (
        !Number.isInteger(
          y
        ) ||
        !Number.isInteger(
          m
        ) ||
        m <
          1 ||
        m >
          12
      ) {
        return res
          .status(
            400
          )
          .json({
            success:
              false,

            message:
              "Valid month and year are required.",
          });
      }

      const lastDay =
        new Date(
          Date.UTC(
            y,
            m,
            0
          )
        ).getUTCDate();

      const from =
        `${y}-${String(
          m
        ).padStart(
          2,
          "0"
        )}-01`;

      const to =
        `${y}-${String(
          m
        ).padStart(
          2,
          "0"
        )}-${String(
          lastDay
        ).padStart(
          2,
          "0"
        )}`;

      const result =
        await attendanceService
          .getMonthlySummary({
            actorUserId:
              getUserId(
                req
              ),

            access:
              getAttendanceScope(
                req
              ),

            ...req.query,

            from,

            to,
          });

      return res.json({
        success:
          true,

        month:
          m,

        year:
          y,

        from,

        to,

        items:
          result,
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
   CSV EXPORT
========================================================= */

exports.exportMonthlyAttendance =
  async (
    req,
    res
  ) => {
    try {
      const {
        month,
        year,
      } =
        req.query;

      if (
        !month ||
        !year
      ) {
        return res
          .status(
            400
          )
          .json({
            success:
              false,

            message:
              "month and year are required.",
          });
      }

      const y =
        Number(
          year
        );

      const m =
        Number(
          month
        );

      if (
        !Number.isInteger(
          y
        ) ||
        !Number.isInteger(
          m
        ) ||
        m <
          1 ||
        m >
          12
      ) {
        return res
          .status(
            400
          )
          .json({
            success:
              false,

            message:
              "Valid month and year are required.",
          });
      }

      const lastDay =
        new Date(
          Date.UTC(
            y,
            m,
            0
          )
        ).getUTCDate();

      const from =
        `${y}-${String(
          m
        ).padStart(
          2,
          "0"
        )}-01`;

      const to =
        `${y}-${String(
          m
        ).padStart(
          2,
          "0"
        )}-${String(
          lastDay
        ).padStart(
          2,
          "0"
        )}`;

      const rows =
        await attendanceService
          .getMonthlySummary({
            actorUserId:
              getUserId(
                req
              ),

            access:
              getAttendanceScope(
                req
              ),

            ...req.query,

            from,

            to,
          });

      const escapeCsv =
        (
          value
        ) => {
          const text =
            String(
              value ??
                ""
            );

          return `"${text.replace(
            /"/g,
            '""'
          )}"`;
        };

      const header = [
        "Employee Code",
        "Employee Name",
        "Present",
        "Absent",
        "Half Day",
        "Leave",
        "Week Off",
        "Holiday",
        "WFH",
        "Field Visit",
        "On Duty",
        "Late",
        "Working Minutes",
        "Overtime Minutes",
      ];

      const csv = [
        header
          .map(
            escapeCsv
          )
          .join(
            ","
          ),

        ...rows.map(
          (
            row
          ) =>
            [
              row.employeeCode,
              row.employeeName,
              row.present,
              row.absent,
              row.halfDay,
              row.leave,
              row.weekOff,
              row.holiday,
              row.wfh,
              row.fieldVisit,
              row.onDuty,
              row.late,
              row
                .totalWorkingMinutes,
              row
                .overtimeMinutes,
            ]
              .map(
                escapeCsv
              )
              .join(
                ","
              )
        ),
      ].join(
        "\n"
      );

      const filename =
        `attendance-${y}-${String(
          m
        ).padStart(
          2,
          "0"
        )}.csv`;

      res.setHeader(
        "Content-Type",
        "text/csv; charset=utf-8"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      return res
        .status(
          200
        )
        .send(
          csv
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

/* =========================================================
   REQUEST REGULARIZATION
========================================================= */

exports.requestRegularization =
  async (
    req,
    res
  ) => {
    try {
      const result =
        await attendanceService
          .requestRegularization({
            actorUserId:
              getUserId(
                req
              ),

            attendanceId:
              req.body
                .attendanceId,

            type:
              req.body.type,

            requested:
              req.body
                .requested,

            reason:
              req.body
                .reason,

            attachmentUrl:
              req.body
                .attachmentUrl,
          });

      return res
        .status(
          201
        )
        .json({
          success:
            true,

          regularization:
            result,
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
   MY REGULARIZATION REQUESTS
========================================================= */

exports.getMyRegularizations =
  async (
    req,
    res
  ) => {
    try {
      const employee =
        await attendanceService
          .getEmployeeByUser(
            getUserId(
              req
            )
          );

      if (
        !employee
      ) {
        return res
          .status(
            403
          )
          .json({
            success:
              false,

            message:
              "Employee profile not found.",
          });
      }

      const items =
        await attendanceService
          .getRegularizations({
            employeeId:
              employee._id,

            status:
              req.query
                .status,
          });

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
   PENDING REGULARIZATIONS
========================================================= */

exports.getPendingRegularizations =
  async (
    req,
    res
  ) => {
    try {
      if (
        !canApproveRegularization(
          req
        )
      ) {
        return res
          .status(
            403
          )
          .json({
            success:
              false,

            message:
              "You are not authorized to approve attendance regularization.",
          });
      }

      const items =
        await attendanceService
          .getRegularizations({
            status:
              "PENDING",
          });

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
   APPROVE REGULARIZATION
========================================================= */

exports.approveRegularization =
  async (
    req,
    res
  ) => {
    try {
      if (
        !canApproveRegularization(
          req
        )
      ) {
        return res
          .status(
            403
          )
          .json({
            success:
              false,

            message:
              "Attendance approval permission is required.",
          });
      }

      const result =
        await attendanceService
          .approveRegularization({
            regularizationId:
              req.params.id,

            reviewerUserId:
              getUserId(
                req
              ),

            remarks:
              req.body
                .remarks ||
              "",
          });

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
   REJECT REGULARIZATION
========================================================= */

exports.rejectRegularization =
  async (
    req,
    res
  ) => {
    try {
      if (
        !canApproveRegularization(
          req
        )
      ) {
        return res
          .status(
            403
          )
          .json({
            success:
              false,

            message:
              "Attendance approval permission is required.",
          });
      }

      const result =
        await attendanceService
          .rejectRegularization({
            regularizationId:
              req.params.id,

            reviewerUserId:
              getUserId(
                req
              ),

            remarks:
              req.body
                .remarks ||
              "",
          });

      return res.json({
        success:
          true,

        regularization:
          result,
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
   PROCESS ONE RAW PUNCH
========================================================= */

exports.processRawPunch =
  async (
    req,
    res
  ) => {
    try {
      const result =
        await attendanceService
          .processRawPunch(
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
   PROCESS PENDING
========================================================= */

exports.processPending =
  async (
    req,
    res
  ) => {
    try {
      const result =
        await attendanceService
          .processPendingPunches({
            limit:
              req.body
                ?.limit ||
              500,
          });

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
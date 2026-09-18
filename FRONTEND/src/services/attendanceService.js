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
    null
  );
};

/* =========================================================
   DATE NORMALIZER
========================================================= */

const normalizeDateKey = (
  value
) => {
  if (
    !value
  ) {
    return "";
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      String(
        value
      )
    )
  ) {
    return String(
      value
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

  return date
    .toISOString()
    .slice(
      0,
      10
    );
};

/* =========================================================
   ATTENDANCE NORMALIZER
========================================================= */

export const normalizeAttendance =
  (
    record
  ) => {
    if (
      !record
    ) {
      return null;
    }

    return {
      ...record,

      id:
        record?._id ||
        record?.id ||
        "",

      _id:
        record?._id ||
        record?.id ||
        "",

      /* ===================================================
         EMPLOYEE
      =================================================== */

      employeeId:
        record
          ?.employeeId
          ?._id ||
        record
          ?.employeeId ||
        "",

      employeeCode:
        record
          ?.employeeCode ||
        "",

      employeeName:
        record
          ?.employeeName ||
        record
          ?.fullName ||
        "Employee",

      biometricCode:
        record
          ?.biometricCode ||
        record
          ?.biometricCodeSnapshot ||
        "",

      /* ===================================================
         ORGANISATION
      =================================================== */

      companyCode:
        record
          ?.companyCode ||
        "",

      organizationUnitId:
        record
          ?.organizationUnitId
          ?._id ||
        record
          ?.organizationUnitId ||
        "",

      orgUnitCode:
        record
          ?.orgUnitCode ||
        "",

      departmentId:
        record
          ?.departmentId
          ?._id ||
        record
          ?.departmentId ||
        "",

      departmentName:
        record
          ?.departmentName ||
        record
          ?.departmentId
          ?.name ||
        "",

      designation:
        record
          ?.designation ||
        record
          ?.designationName ||
        "",

      reportingManagerId:
        record
          ?.reportingManagerId
          ?._id ||
        record
          ?.reportingManagerId ||
        "",

      /* ===================================================
         OFFICE
      =================================================== */

      officeId:
        record
          ?.officeId
          ?._id ||
        record
          ?.officeId ||
        "",

      officeName:
        record
          ?.officeName ||
        record
          ?.office
          ?.name ||
        record
          ?.workLocation ||
        "",

      workLocation:
        record
          ?.workLocation ||
        record
          ?.officeName ||
        record
          ?.office
          ?.name ||
        "",

      /* ===================================================
         SHIFT
      =================================================== */

      shiftId:
        record
          ?.shiftId
          ?._id ||
        record
          ?.shiftId ||
        "",

      shiftCode:
        record
          ?.shiftCode ||
        record
          ?.shiftId
          ?.code ||
        "",

      shiftName:
        record
          ?.shiftName ||
        record
          ?.shiftId
          ?.name ||
        "",

      /* ===================================================
         DATE
      =================================================== */

      businessDate:
        normalizeDateKey(
          record
            ?.businessDate ||
          record
            ?.attendanceDate
        ),

      attendanceDate:
        record
          ?.attendanceDate ||
        null,

      /* ===================================================
         MODE / STATUS
      =================================================== */

      workMode:
        String(
          record
            ?.workMode ||
          "OFFICE"
        )
          .trim()
          .toUpperCase(),

      presenceStatus:
        String(
          record
            ?.presenceStatus ||
          record
            ?.status ||
          "NOT_MARKED"
        )
          .trim()
          .toUpperCase(),

      status:
        String(
          record
            ?.presenceStatus ||
          record
            ?.status ||
          "NOT_MARKED"
        )
          .trim()
          .toUpperCase(),

      /* ===================================================
         PUNCHES
      =================================================== */

      firstIn:
        record
          ?.firstIn ||
        null,

      lastOut:
        record
          ?.lastOut ||
        null,

      firstInAt:
        record
          ?.firstIn
          ?.time ||
        record
          ?.firstInAt ||
        null,

      lastOutAt:
        record
          ?.lastOut
          ?.time ||
        record
          ?.lastOutAt ||
        null,

      originalFirstInAt:
        record
          ?.originalFirstInAt ||
        null,

      originalLastOutAt:
        record
          ?.originalLastOutAt ||
        null,

      expectedStartAt:
        record
          ?.expectedStartAt ||
        null,

      expectedEndAt:
        record
          ?.expectedEndAt ||
        null,

      /* ===================================================
         TIME
      =================================================== */

      totalWorkingMinutes:
        Number(
          record
            ?.totalWorkingMinutes ||
          0
        ),

      totalPresenceMinutes:
        Number(
          record
            ?.totalPresenceMinutes ||
          0
        ),

      requiredMinutes:
        Number(
          record
            ?.requiredMinutes ||
          0
        ),

      breakMinutes:
        Number(
          record
            ?.breakMinutes ||
          0
        ),

      lateMinutes:
        Number(
          record
            ?.lateMinutes ||
          0
        ),

      earlyExitMinutes:
        Number(
          record
            ?.earlyExitMinutes ||
          0
        ),

      shortMinutes:
        Number(
          record
            ?.shortMinutes ||
          0
        ),

      overtimeMinutes:
        Number(
          record
            ?.overtimeMinutes ||
          0
        ),

      punchCount:
        Number(
          record
            ?.punchCount ||
          0
        ),

      /* ===================================================
         EXCEPTIONS
      =================================================== */

      isLate:
        Boolean(
          record
            ?.isLate
        ),

      isEarlyExit:
        Boolean(
          record
            ?.isEarlyExit
        ),

      isShortHours:
        Boolean(
          record
            ?.isShortHours
        ),

      missingCheckIn:
        Boolean(
          record
            ?.missingCheckIn
        ),

      missingCheckOut:
        Boolean(
          record
            ?.missingCheckOut
        ),

      /* ===================================================
         REGULARIZATION
      =================================================== */

      wasRegularized:
        Boolean(
          record
            ?.wasRegularized
        ),

      regularization:
        record
          ?.regularization ||
        null,

      /* ===================================================
         LOCATION
      =================================================== */

      locationSummary:
        record
          ?.locationSummary ||
        record
          ?.fieldTrackingSummary ||
        record
          ?.wfhLocationSummary ||
        null,

      /* ===================================================
         SOURCE
      =================================================== */

      source:
        record
          ?.source ||
        record
          ?.primarySource ||
        "",

      primarySource:
        record
          ?.primarySource ||
        record
          ?.source ||
        "",

      /* ===================================================
         PROCESSING
      =================================================== */

      processingStatus:
        record
          ?.processingStatus ||
        "",

      needsRecalculation:
        Boolean(
          record
            ?.needsRecalculation
        ),
    };
  };

/* =========================================================
   ARRAY NORMALIZER
========================================================= */

const normalizeAttendanceArray =
  (
    records
  ) => {
    if (
      !Array.isArray(
        records
      )
    ) {
      return [];
    }

    return records
      .map(
        normalizeAttendance
      )
      .filter(
        Boolean
      );
  };

/* =========================================================
   LIST RESPONSE
========================================================= */

export const normalizeAttendanceListResponse =
  (
    response
  ) => {
    const payload =
      response
        ?.data
        ?.data ||
      response
        ?.data ||
      {};

    const rawItems =
      payload
        ?.items ||
      payload
        ?.records ||
      payload
        ?.attendance ||
      (
        Array.isArray(
          payload
        )
          ? payload
          : []
      );

    const items =
      normalizeAttendanceArray(
        rawItems
      );

    const pagination =
      payload
        ?.pagination ||
      {};

    const total =
      Number(
        pagination
          ?.total ??
        payload
          ?.total ??
        items.length
      );

    const limit =
      Number(
        pagination
          ?.limit ||
        payload
          ?.limit ||
        100
      );

    return {
      items,

      records:
        items,

      pagination: {
        page:
          Number(
            pagination
              ?.page ||
            payload
              ?.page ||
            1
          ),

        limit,

        total,

        pages:
          Number(
            pagination
              ?.pages ||
            payload
              ?.pages ||
            Math.max(
              1,
              Math.ceil(
                total /
                Math.max(
                  limit,
                  1
                )
              )
            )
          ),
      },
    };
  };

/* =========================================================
   QUERY BUILDER
========================================================= */

const buildAttendanceParams =
  (
    params = {}
  ) => {
    const clean =
      {};

    /* =====================================================
       RANGE
    ===================================================== */

    if (
      params.from
    ) {
      clean.from =
        normalizeDateKey(
          params.from
        );
    }

    if (
      params.to
    ) {
      clean.to =
        normalizeDateKey(
          params.to
        );
    }

    if (
      params
        .businessDate
    ) {
      clean.businessDate =
        normalizeDateKey(
          params
            .businessDate
        );
    }

    if (
      params.date
    ) {
      clean.date =
        normalizeDateKey(
          params.date
        );
    }

    if (
      params.month !==
        undefined &&
      params.month !==
        null &&
      params.month !==
        ""
    ) {
      clean.month =
        Number(
          params.month
        );
    }

    if (
      params.year !==
        undefined &&
      params.year !==
        null &&
      params.year !==
        ""
    ) {
      clean.year =
        Number(
          params.year
        );
    }

    /* =====================================================
       ORGANISATION
    ===================================================== */

    if (
      params.employeeId
    ) {
      clean.employeeId =
        params.employeeId;
    }

    if (
      params.departmentId
    ) {
      clean.departmentId =
        params.departmentId;
    }

    if (
      params
        .organizationUnitId
    ) {
      clean.organizationUnitId =
        params.organizationUnitId;
    }

    if (
      params.officeId
    ) {
      clean.officeId =
        params.officeId;
    }

    if (
      params.shiftId
    ) {
      clean.shiftId =
        params.shiftId;
    }

    /* =====================================================
       ATTENDANCE
    ===================================================== */

    if (
      params
        .presenceStatus
    ) {
      clean.presenceStatus =
        String(
          params
            .presenceStatus
        )
          .trim()
          .toUpperCase();
    }

    /*
     * Compatibility with controllers using "status".
     */

    if (
      params.status
    ) {
      clean.status =
        String(
          params.status
        )
          .trim()
          .toUpperCase();
    }

    if (
      params.workMode
    ) {
      clean.workMode =
        String(
          params.workMode
        )
          .trim()
          .toUpperCase();
    }

    if (
      params.source
    ) {
      clean.source =
        String(
          params.source
        )
          .trim()
          .toUpperCase();
    }

    /* =====================================================
       SEARCH
    ===================================================== */

    if (
      params.search
    ) {
      clean.search =
        String(
          params.search
        )
          .trim();
    }

    /* =====================================================
       PAGINATION
    ===================================================== */

    if (
      params.page
    ) {
      clean.page =
        Number(
          params.page
        );
    }

    if (
      params.limit
    ) {
      clean.limit =
        Number(
          params.limit
        );
    }

    if (
      params.sort
    ) {
      clean.sort =
        params.sort;
    }

    return clean;
  };

/* =========================================================
   MY ATTENDANCE
========================================================= */

export const getMyAttendance =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        "/attendance/me",
        {
          params:
            buildAttendanceParams(
              params
            ),
        }
      );

    return normalizeAttendanceListResponse(
      response
    );
  };

/* =========================================================
   SCOPED ATTENDANCE

   Backend determines:
   SELF
   TEAM
   DEPARTMENT
   ALL
========================================================= */

export const getAttendance =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        "/attendance",
        {
          params:
            buildAttendanceParams(
              params
            ),
        }
      );

    return normalizeAttendanceListResponse(
      response
    );
  };

/* =========================================================
   MONTHLY SUMMARY
========================================================= */

export const getMonthlyAttendanceSummary =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        "/attendance/monthly",
        {
          params:
            buildAttendanceParams(
              params
            ),
        }
      );

    const payload =
      responseData(
        response
      );

    if (
      Array.isArray(
        payload
      )
    ) {
      return payload;
    }

    return (
      payload
        ?.items ||
      payload
        ?.records ||
      payload
        ?.summary ||
      []
    );
  };

/* =========================================================
   EXPORT MONTHLY ATTENDANCE
========================================================= */

export const exportMonthlyAttendance =
  async ({
    month,
    year,
    format = "csv",
  } = {}) => {
    const normalizedMonth =
      Number(month);

    const normalizedYear =
      Number(year);

    const normalizedFormat =
      String(
        format || "csv"
      )
        .trim()
        .toLowerCase();

    if (
      !Number.isInteger(
        normalizedMonth
      ) ||
      normalizedMonth < 1 ||
      normalizedMonth > 12
    ) {
      throw new Error(
        "A valid month is required."
      );
    }

    if (
      !Number.isInteger(
        normalizedYear
      ) ||
      normalizedYear < 2000
    ) {
      throw new Error(
        "A valid year is required."
      );
    }

    if (
      ![
        "csv",
        "pdf",
      ].includes(
        normalizedFormat
      )
    ) {
      throw new Error(
        "Export format must be CSV or PDF."
      );
    }

    return api.get(
      "/attendance/export/monthly",
      {
        params: {
          month:
            normalizedMonth,

          year:
            normalizedYear,

          format:
            normalizedFormat,
        },

        responseType:
          "blob",
      }
    );
  };

/* =========================================================
   DOWNLOAD MONTHLY ATTENDANCE
========================================================= */

export const downloadMonthlyAttendance =
  async ({
    month,
    year,
    format = "csv",
    filename = "",
  } = {}) => {
    const normalizedFormat =
      String(
        format || "csv"
      )
        .trim()
        .toLowerCase();

    const response =
      await exportMonthlyAttendance({
        month,
        year,
        format:
          normalizedFormat,
      });

    const contentType =
      response
        ?.headers
        ?.["content-type"] ||
      (
        normalizedFormat ===
        "pdf"
          ? "application/pdf"
          : "text/csv;charset=utf-8"
      );

    const blob =
      response
        ?.data instanceof
      Blob
        ? response.data
        : new Blob(
            [
              response?.data,
            ],
            {
              type:
                contentType,
            }
          );

    const monthText =
      String(
        Number(month)
      ).padStart(
        2,
        "0"
      );

    const downloadName =
      filename ||
      `attendance-${year}-${monthText}.${normalizedFormat}`;

    const url =
      window.URL
        .createObjectURL(
          blob
        );

    const anchor =
      document
        .createElement(
          "a"
        );

    anchor.href =
      url;

    anchor.download =
      downloadName;

    anchor.style.display =
      "none";

    document.body
      .appendChild(
        anchor
      );

    anchor.click();

    anchor.remove();

    window.URL
      .revokeObjectURL(
        url
      );

    return {
      success: true,
      filename:
        downloadName,
      format:
        normalizedFormat,
    };
  };

/* =========================================================
   WEB ATTENDANCE LOCATION VALIDATOR
========================================================= */

const normalizeWebLocation =
  ({
    latitude,
    longitude,
    accuracyMeters =
      null,
  } = {}) => {
    const lat =
      Number(
        latitude
      );

    const lng =
      Number(
        longitude
      );

    const accuracy =
      accuracyMeters ===
        null ||
      accuracyMeters ===
        undefined ||
      accuracyMeters ===
        ""
        ? null
        : Number(
            accuracyMeters
          );

    if (
      !Number.isFinite(
        lat
      ) ||
      lat < -90 ||
      lat > 90
    ) {
      throw new Error(
        "A valid current location is required to start attendance."
      );
    }

    if (
      !Number.isFinite(
        lng
      ) ||
      lng < -180 ||
      lng > 180
    ) {
      throw new Error(
        "A valid current location is required to start attendance."
      );
    }

    if (
      accuracy !==
        null &&
      (
        !Number.isFinite(
          accuracy
        ) ||
        accuracy < 0
      )
    ) {
      throw new Error(
        "Location accuracy is invalid."
      );
    }

    return {
      latitude:
        lat,

      longitude:
        lng,

      accuracyMeters:
        accuracy,
    };
  };

/* =========================================================
   START WEB ATTENDANCE

   Supported modes:
   WFH
   FIELD_VISIT
   ON_DUTY

   OFFICE remains biometric-first.

   IMPORTANT:
   Backend expects latitude / longitude / accuracyMeters
   directly in req.body.

   DO NOT send:
   {
     location: {
       latitude,
       longitude
     }
   }
========================================================= */

export const startWebAttendance =
  async ({
    workMode,

    latitude,

    longitude,

    accuracyMeters =
      null,

    dutyPurpose =
      "",

    dutyLocation =
      "",
  }) => {
    const mode =
      String(
        workMode ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      ![
        "WFH",
        "FIELD_VISIT",
        "ON_DUTY",
      ].includes(
        mode
      )
    ) {
      throw new Error(
        "Select Work From Home, Field Visit or On Duty."
      );
    }

    const location =
      normalizeWebLocation({
        latitude,
        longitude,
        accuracyMeters,
      });

    const payload = {
      workMode:
        mode,

      latitude:
        location.latitude,

      longitude:
        location.longitude,

      accuracyMeters:
        location.accuracyMeters,
    };

    /*
     * Field Visit / On Duty support.
     *
     * The current AttendancePage does not yet collect these
     * fields, but the service supports them when the UI does.
     */

    if (
      [
        "FIELD_VISIT",
        "ON_DUTY",
      ].includes(
        mode
      )
    ) {
      const normalizedPurpose =
        String(
          dutyPurpose ||
            ""
        ).trim();

      const normalizedLocation =
        String(
          dutyLocation ||
            ""
        ).trim();

      if (
        normalizedPurpose
      ) {
        payload.dutyPurpose =
          normalizedPurpose;
      }

      if (
        normalizedLocation
      ) {
        payload.dutyLocation =
          normalizedLocation;
      }
    }

    const response =
      await api.post(
        "/attendance/web/start",
        payload
      );

    return responseData(
      response
    );
  };

/* =========================================================
   STOP WEB ATTENDANCE
========================================================= */

export const stopWebAttendance =
  async ({
    latitude,

    longitude,

    accuracyMeters =
      null,
  } = {}) => {
    const location =
      normalizeWebLocation({
        latitude,
        longitude,
        accuracyMeters,
      });

    const response =
      await api.post(
        "/attendance/web/stop",
        {
          latitude:
            location.latitude,

          longitude:
            location.longitude,

          accuracyMeters:
            location.accuracyMeters,
        }
      );

    return responseData(
      response
    );
  };

/* =========================================================
   LOCATION CHECKPOINT

   Used for active WFH / Field Visit / On Duty attendance.
========================================================= */

export const addAttendanceLocationCheckpoint =
  async ({
    workMode,

    latitude,

    longitude,

    accuracyMeters =
      null,

    source =
      "FOREGROUND",
  }) => {
    const location =
      normalizeWebLocation({
        latitude,
        longitude,
        accuracyMeters,
      });

    const normalizedMode =
      String(
        workMode ||
          ""
      )
        .trim()
        .toUpperCase();

    const normalizedSource =
      String(
        source ||
          "FOREGROUND"
      )
        .trim()
        .toUpperCase();

    const response =
      await api.post(
        "/attendance/web/location",
        {
          workMode:
            normalizedMode,

          latitude:
            location.latitude,

          longitude:
            location.longitude,

          accuracyMeters:
            location.accuracyMeters,

          source:
            normalizedSource,
        }
      );

    return responseData(
      response
    );
  };

/* =========================================================
   EMPLOYEE LOCATION HISTORY

   Backend hierarchy / permission remains authoritative.
========================================================= */

export const getEmployeeAttendanceLocationHistory =
  async (
    employeeId,
    params = {}
  ) => {
    if (
      !employeeId
    ) {
      throw new Error(
        "Employee ID is required."
      );
    }

    const response =
      await api.get(
        `/attendance/location-history/${employeeId}`,
        {
          params:
            buildAttendanceParams(
              params
            ),
        }
      );

    const payload =
      responseData(
        response
      );

    if (
      Array.isArray(
        payload
      )
    ) {
      return {
        history:
          payload,

        records:
          payload,

        checkpoints:
          payload,

        summary:
          null,
      };
    }

    const history =
      payload
        ?.history ||
      payload
        ?.records ||
      payload
        ?.checkpoints ||
      payload
        ?.locations ||
      payload
        ?.items ||
      [];

    return {
      ...(
        payload ||
        {}
      ),

      history,

      records:
        history,

      checkpoints:
        history,

      summary:
        payload
          ?.summary ||
        payload
          ?.locationSummary ||
        null,
    };
  };

/* =========================================================
   REQUEST REGULARIZATION
========================================================= */

export const requestAttendanceRegularization =
  async ({
    attendanceId,

    type,

    requested = {},

    reason = "",

    attachmentUrl =
      null,
  }) => {
    if (
      !attendanceId
    ) {
      throw new Error(
        "Attendance ID is required."
      );
    }

    const response =
      await api.post(
        "/attendance/regularization",
        {
          attendanceId,

          type:
            String(
              type ||
              ""
            )
              .trim()
              .toUpperCase(),

          requested,

          reason:
            String(
              reason ||
              ""
            )
              .trim(),

          attachmentUrl,
        }
      );

    return responseData(
      response
    );
  };

/* =========================================================
   MY REGULARIZATIONS
========================================================= */

export const getMyRegularizations =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        "/attendance/regularization/me",
        {
          params:
            buildAttendanceParams(
              params
            ),
        }
      );

    const payload =
      responseData(
        response
      );

    return Array.isArray(
      payload
    )
      ? payload
      : payload
          ?.items ||
        payload
          ?.records ||
        [];
  };

/* =========================================================
   PENDING REGULARIZATIONS
========================================================= */

export const getPendingRegularizations =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        "/attendance/regularization/pending",
        {
          params:
            buildAttendanceParams(
              params
            ),
        }
      );

    const payload =
      responseData(
        response
      );

    return Array.isArray(
      payload
    )
      ? payload
      : payload
          ?.items ||
        payload
          ?.records ||
        [];
  };

/* =========================================================
   APPROVE REGULARIZATION
========================================================= */

export const approveAttendanceRegularization =
  async (
    regularizationId,
    remarks = ""
  ) => {
    if (
      !regularizationId
    ) {
      throw new Error(
        "Regularization ID is required."
      );
    }

    const response =
      await api.patch(
        `/attendance/regularization/${regularizationId}/approve`,
        {
          remarks:
            String(
              remarks ||
              ""
            )
              .trim(),
        }
      );

    return responseData(
      response
    );
  };

/* =========================================================
   REJECT REGULARIZATION
========================================================= */

export const rejectAttendanceRegularization =
  async (
    regularizationId,
    remarks = ""
  ) => {
    if (
      !regularizationId
    ) {
      throw new Error(
        "Regularization ID is required."
      );
    }

    const response =
      await api.patch(
        `/attendance/regularization/${regularizationId}/reject`,
        {
          remarks:
            String(
              remarks ||
              ""
            )
              .trim(),
        }
      );

    return responseData(
      response
    );
  };

/* =========================================================
   PROCESS ONE RAW PUNCH
========================================================= */

export const processAttendancePunch =
  async (
    punchId
  ) => {
    if (
      !punchId
    ) {
      throw new Error(
        "Punch ID is required."
      );
    }

    const response =
      await api.post(
        `/attendance/processing/punch/${punchId}`
      );

    return responseData(
      response
    );
  };

/* =========================================================
   PROCESS PENDING RAW PUNCHES
========================================================= */

export const processPendingAttendancePunches =
  async (
    limit = 500
  ) => {
    const response =
      await api.post(
        "/attendance/processing/pending",
        {
          limit:
            Number(
              limit
            ) ||
            500,
        }
      );

    return responseData(
      response
    );
  };

/* =========================================================
   STATUS LABEL
========================================================= */

export const attendanceStatusLabel =
  (
    status
  ) => {
    const value =
      String(
        status ||
        ""
      )
        .trim()
        .toUpperCase();

    const labels = {
      NOT_MARKED:
        "Not Marked",

      PRESENT:
        "Present",

      ABSENT:
        "Absent",

      HALF_DAY:
        "Half Day",

      ON_LEAVE:
        "On Leave",

      WEEK_OFF:
        "Week Off",

      HOLIDAY:
        "Holiday",

      NOT_APPLICABLE:
        "Not Applicable",
    };

    return (
      labels[
        value
      ] ||
      value ||
      "Unknown"
    );
  };

/* =========================================================
   WORK MODE LABEL
========================================================= */

export const attendanceWorkModeLabel =
  (
    mode
  ) => {
    const value =
      String(
        mode ||
        ""
      )
        .trim()
        .toUpperCase();

    const labels = {
      OFFICE:
        "Office",

      WFH:
        "Work From Home",

      FIELD_VISIT:
        "Field Visit",

      ON_DUTY:
        "On Duty",
    };

    return (
      labels[
        value
      ] ||
      value ||
      "Office"
    );
  };

/* =========================================================
   MINUTES → TEXT
========================================================= */

export const formatAttendanceMinutes =
  (
    value
  ) => {
    const minutes =
      Math.max(
        0,
        Number(
          value
        ) ||
        0
      );

    const hours =
      Math.floor(
        minutes /
        60
      );

    const remainder =
      minutes %
      60;

    if (
      !hours
    ) {
      return `${remainder}m`;
    }

    if (
      !remainder
    ) {
      return `${hours}h`;
    }

    return `${hours}h ${remainder}m`;
  };

/* =========================================================
   DEFAULT EXPORT
========================================================= */

const attendanceService = {
  normalizeAttendance,

  normalizeAttendanceListResponse,

  getMyAttendance,

  getAttendance,

  getMonthlyAttendanceSummary,

  exportMonthlyAttendance,

  downloadMonthlyAttendance,

  startWebAttendance,

  stopWebAttendance,

  addAttendanceLocationCheckpoint,

  getEmployeeAttendanceLocationHistory,

  requestAttendanceRegularization,

  getMyRegularizations,

  getPendingRegularizations,

  approveAttendanceRegularization,

  rejectAttendanceRegularization,

  processAttendancePunch,

  processPendingAttendancePunches,

  attendanceStatusLabel,

  attendanceWorkModeLabel,

  formatAttendanceMinutes,
};

export default attendanceService;
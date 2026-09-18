const mongoose =
  require(
    "mongoose"
  );

const crypto =
  require(
    "crypto"
  );

const {
  Schema,
} = mongoose;

/* =========================================================
   PUNCH PROVIDERS
========================================================= */

const ATTENDANCE_PROVIDERS = [
  "ESSL",
  "REALTIME",
  "ZKTECO",
  "SE_RMS",
  "OTHER",
];

/* =========================================================
   EVENT SOURCE

   HISTORICAL_SYNC:
   Initial 3-month import or later backfill.

   LIVE:
   Punch received from biometric device in near real time.

   WEB / PWA / MOBILE:
   SE-RMS generated attendance.

   ADMIN:
   Administrative attendance event.

   SYSTEM:
   Generated internally.
========================================================= */

const ATTENDANCE_EVENT_SOURCES = [
  "HISTORICAL_SYNC",
  "LIVE",
  "WEB",
  "PWA",
  "MOBILE",
  "ADMIN",
  "SYSTEM",
];

/* =========================================================
   WORK MODE
========================================================= */

const ATTENDANCE_PUNCH_WORK_MODES = [
  "OFFICE",
  "WFH",
  "FIELD_VISIT",
  "ON_DUTY",
];

/* =========================================================
   PROCESSING STATUS
========================================================= */

const PUNCH_PROCESSING_STATUSES = [
  "PENDING",
  "UNMAPPED",
  "PROCESSED",
  "IGNORED",
  "ERROR",
];

/* =========================================================
   RAW ATTENDANCE PUNCH

   ONE DOCUMENT = ONE RAW ATTENDANCE EVENT

   IMPORTANT:

   Raw biometric attendance should never be overwritten.

   Historical and live biometric punches use this same model.
========================================================= */

const rawAttendancePunchSchema =
  new Schema(
    {
      /* =====================================================
         DEVICE
      ===================================================== */

      attendanceDeviceId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "AttendanceDevice",

        default:
          null,

        index:
          true,
      },

      deviceCode: {
        type:
          String,

        trim:
          true,

        default:
          "",

        index:
          true,
      },

      deviceSerialNumber: {
        type:
          String,

        trim:
          true,

        default:
          "",

        index:
          true,
      },

      provider: {
        type:
          String,

        enum:
          ATTENDANCE_PROVIDERS,

        required:
          true,

        index:
          true,
      },

      /* =====================================================
         BIOMETRIC IDENTITY

         biometricCode comes directly from the device.

         Employee mapping can happen later.
      ===================================================== */

      biometricCode: {
        type:
          String,

        trim:
          true,

        required:
          true,

        index:
          true,
      },

      /*
       * Device-provided employee name is informational only.
       *
       * NEVER use employeeName as the mapping key.
       */
      biometricEmployeeName: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      /* =====================================================
         RESOLVED EMPLOYEE

         Can remain null until HR maps biometricCode.
      ===================================================== */

      employeeId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Employee",

        default:
          null,

        index:
          true,
      },

      userId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,

        index:
          true,
      },

      /* =====================================================
         PUNCH
      ===================================================== */

      punchTime: {
        type:
          Date,

        required:
          true,

        index:
          true,
      },

      /*
       * IMPORTANT:
       *
       * businessDate may be null when punch first arrives.
       *
       * It gets calculated after:
       *
       * Employee
       * → Shift
       * → Business Date Resolver
       *
       * Example:
       *
       * 14 Sep 02:50
       *
       * Night shift 13 Sep 17:30 → 14 Sep 03:00
       *
       * businessDate = 2026-09-13
       */
      businessDate: {
        type:
          String,

        trim:
          true,

        default:
          null,

        match:
          /^\d{4}-\d{2}-\d{2}$/,

        index:
          true,
      },

      /* =====================================================
         SOURCE
      ===================================================== */

      source: {
        type:
          String,

        enum:
          ATTENDANCE_EVENT_SOURCES,

        required:
          true,

        index:
          true,
      },

      workMode: {
        type:
          String,

        enum:
          ATTENDANCE_PUNCH_WORK_MODES,

        default:
          "OFFICE",

        index:
          true,
      },

      /* =====================================================
         MACHINE INFORMATION
      ===================================================== */

      machineRecordId: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      machineUserId: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      machineVerifyMode: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      machineInOutMode: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      /* =====================================================
         ORGANIZATION SNAPSHOT

         Populated after employee mapping.
      ===================================================== */

      companyCode: {
        type:
          String,

        trim:
          true,

        default:
          null,

        index:
          true,
      },

      organizationUnitId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "OrganizationUnit",

        default:
          null,

        index:
          true,
      },

      orgUnitCode: {
        type:
          String,

        trim:
          true,

        default:
          null,
      },

      departmentId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Department",

        default:
          null,

        index:
          true,
      },

      /* =====================================================
         OFFICE
      ===================================================== */

      officeId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "AttendanceOffice",

        default:
          null,

        index:
          true,
      },

      /* =====================================================
         SHIFT RESOLUTION
      ===================================================== */

      shiftId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "AttendanceShift",

        default:
          null,

        index:
          true,
      },

      /* =====================================================
         GPS

         Check-in/check-out GPS can be stored with the event.

         Periodic 30-minute tracking does NOT go here.
         That belongs in AttendanceLocationLog.
      ===================================================== */

      location: {
        latitude: {
          type:
            Number,

          default:
            null,

          min:
            -90,

          max:
            90,
        },

        longitude: {
          type:
            Number,

          default:
            null,

          min:
            -180,

          max:
            180,
        },

        accuracyMeters: {
          type:
            Number,

          default:
            null,

          min:
            0,
        },

        address: {
          type:
            String,

          trim:
            true,

          default:
            "",
        },
      },

      /* =====================================================
         HISTORICAL IMPORT / SYNC
      ===================================================== */

      syncBatchId: {
        type:
          String,

        trim:
          true,

        default:
          null,

        index:
          true,
      },

      /* =====================================================
         DEDUPLICATION
      ===================================================== */

      externalEventKey: {
        type:
          String,

        required:
          true,

        trim:
          true,

        unique:
          true,

        index:
          true,
      },

      /* =====================================================
         PROCESSING
      ===================================================== */

      processingStatus: {
        type:
          String,

        enum:
          PUNCH_PROCESSING_STATUSES,

        default:
          "PENDING",

        index:
          true,
      },

      resolved: {
        type:
          Boolean,

        default:
          false,

        index:
          true,
      },

      processedAt: {
        type:
          Date,

        default:
          null,
      },

      processingError: {
        type:
          String,

        trim:
          true,

        default:
          "",

        maxlength:
          2000,
      },

      processingAttempts: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      /* =====================================================
         RAW PROVIDER PAYLOAD

         Preserve exactly what machine/integration gave us.
      ===================================================== */

      rawPayload: {
        type:
          Schema.Types.Mixed,

        default:
          null,
      },

      /* =====================================================
         AUDIT
      ===================================================== */

      receivedAt: {
        type:
          Date,

        default:
          Date.now,

        index:
          true,
      },
    },
    {
      timestamps:
        true,

      minimize:
        false,

      versionKey:
        false,
    }
  );

/* =========================================================
   GENERATE DEDUPE KEY

   If adapter has already generated externalEventKey,
   leave it untouched.

   Otherwise create deterministic SHA-256 key.
========================================================= */

rawAttendancePunchSchema.pre(
  "validate",
  function () {
    if (
      typeof this.biometricCode ===
      "string"
    ) {
      this.biometricCode =
        this.biometricCode.trim();
    }

    if (
      this.externalEventKey
    ) {
      return;
    }

    if (
      !this.provider ||
      !this.biometricCode ||
      !this.punchTime
    ) {
      return;
    }

    const parts = [
      this.provider,
      this.deviceCode ||
        this.deviceSerialNumber ||
        "UNKNOWN_DEVICE",
      this.machineRecordId ||
        "",
      this.biometricCode,
      new Date(
        this.punchTime
      ).toISOString(),
      this.machineInOutMode ||
        "",
    ];

    this.externalEventKey =
      crypto
        .createHash(
          "sha256"
        )
        .update(
          parts.join(
            "|"
          )
        )
        .digest(
          "hex"
        );
  }
);

/* =========================================================
   INDEXES
========================================================= */

rawAttendancePunchSchema.index({
  employeeId:
    1,

  punchTime:
    1,
});

rawAttendancePunchSchema.index({
  employeeId:
    1,

  businessDate:
    1,

  punchTime:
    1,
});

rawAttendancePunchSchema.index({
  biometricCode:
    1,

  punchTime:
    1,
});

rawAttendancePunchSchema.index({
  attendanceDeviceId:
    1,

  punchTime:
    -1,
});

rawAttendancePunchSchema.index({
  officeId:
    1,

  businessDate:
    1,
});

rawAttendancePunchSchema.index({
  departmentId:
    1,

  businessDate:
    1,
});

rawAttendancePunchSchema.index({
  processingStatus:
    1,

  punchTime:
    1,
});

rawAttendancePunchSchema.index({
  source:
    1,

  syncBatchId:
    1,
});

/* =========================================================
   MODEL
========================================================= */

const RawAttendancePunch =
  mongoose.models
    .RawAttendancePunch ||
  mongoose.model(
    "RawAttendancePunch",
    rawAttendancePunchSchema
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  RawAttendancePunch,

  ATTENDANCE_PROVIDERS,

  ATTENDANCE_EVENT_SOURCES,

  ATTENDANCE_PUNCH_WORK_MODES,

  PUNCH_PROCESSING_STATUSES,
};
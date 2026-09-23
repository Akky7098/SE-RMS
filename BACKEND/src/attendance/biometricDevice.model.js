const mongoose =
  require(
    "mongoose"
  );

const {
  Schema,
} = mongoose;

/* =========================================================
   BIOMETRIC DEVICE PROVIDERS

   Keep provider separate from integration type.

   Example:

   provider:
   REALTIME

   integrationType:
   FKWEB
========================================================= */

const BIOMETRIC_DEVICE_PROVIDERS = [
  "ESSL",
  "REALTIME",
  "ZKTECO",
  "OTHER",
];

/* =========================================================
   CONNECTION MODES

   POLL
   ----
   SE-RMS / connector connects to machine and pulls records.

   PUSH
   ----
   Machine sends attendance directly to SE-RMS/public
   attendance endpoint.

   CONNECTOR
   ---------
   An office-side service talks to the LAN device and sends
   attendance to central SE-RMS.

   API
   ---
   Vendor cloud/API integration.
========================================================= */

const BIOMETRIC_CONNECTION_MODES = [
  "POLL",
  "PUSH",
  "CONNECTOR",
  "API",
];

/* =========================================================
   DEVICE STATUS
========================================================= */

const BIOMETRIC_DEVICE_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "OFFLINE",
  "MAINTENANCE",
];

/* =========================================================
   SYNC STATUS
========================================================= */

const BIOMETRIC_SYNC_STATUSES = [
  "NEVER_SYNCED",
  "RUNNING",
  "SUCCESS",
  "FAILED",
  "PARTIAL",
];

/* =========================================================
   BIOMETRIC DEVICE
========================================================= */

const biometricDeviceSchema =
  new Schema(
    {
      /* =====================================================
         IDENTITY
      ===================================================== */

      name: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          120,
      },

      /*
       * Internal SE-RMS device code.
       *
       * Examples:
       *
       * SONIPAT_ESSL_01
       * DELHI_REALTIME_01
       */
      code: {
        type:
          String,

        required:
          true,

        trim:
          true,

        uppercase:
          true,

        unique:
          true,

        index:
          true,

        maxlength:
          60,
      },

      /* =====================================================
         DEVICE DETAILS
      ===================================================== */

      provider: {
        type:
          String,

        enum:
          BIOMETRIC_DEVICE_PROVIDERS,

        default:
          "OTHER",

        required:
          true,

        index:
          true,
      },

      /*
       * Integration/protocol used with this device.
       *
       * Examples:
       *
       * ESSL_SDK
       * ESSL_ADMS
       * ICLOCK
       * FKWEB
       * VENDOR_API
       *
       * Keep this configurable rather than putting protocol
       * behavior inside provider.
       */
      integrationType: {
        type:
          String,

        trim:
          true,

        uppercase:
          true,

        default:
          "",
      },

      model: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      serialNumber: {
        type:
          String,

        trim:
          true,

        default:
          null,
      },

      /* =====================================================
         ORGANISATION / OFFICE
      ===================================================== */

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

      /*
       * Keep Office reference compatible with your existing
       * project.

       * We do NOT need to rename this ref right now.
       */
      officeId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Office",

        default:
          null,

        index:
          true,
      },

      /*
       * Historical/display snapshot.
       */
      officeName: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      locationName: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      /* =====================================================
         CONNECTION

         IMPORTANT:

         IP/port are OPTIONAL.

         Local testing:
           POLL + local IP

         Production:
           PUSH / CONNECTOR / API

         Therefore production attendance is not dependent
         upon somebody's laptop remaining connected to the
         biometric machine Wi-Fi/LAN.
      ===================================================== */

      connectionMode: {
        type:
          String,

        enum:
          BIOMETRIC_CONNECTION_MODES,

        default:
          "CONNECTOR",

        index:
          true,
      },

      /*
       * Used mainly for POLL / CONNECTOR modes.

       * Example:
       * 192.168.1.201

       * Never treat this as the permanent identity of
       * the device.
       */
      ipAddress: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      port: {
        type:
          Number,

        default:
          null,

        min:
          1,

        max:
          65535,
      },

      /*
       * Optional public/vendor API base URL identifier.

       * Do NOT store passwords/API secrets here.
       *
       * Secrets should remain in environment variables or
       * a proper secrets/config system.
       */
      apiBaseUrl: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      /*
       * Identifier used by push/cloud integrations.

       * This may differ from serialNumber.
       */
      externalDeviceId: {
        type:
          String,

        trim:
          true,

        default:
          "",

        index:
          true,
      },

      /* =====================================================
         SYNC CONFIGURATION
      ===================================================== */

      syncEnabled: {
        type:
          Boolean,

        default:
          true,

        index:
          true,
      },

      /*
       * Mainly used for POLL / CONNECTOR/API integrations.

       * PUSH devices may ignore this.
       */
      syncIntervalMinutes: {
        type:
          Number,

        default:
          5,

        min:
          1,
      },

      /*
       * Initial implementation requires approximately
       * 3 months of historical attendance.

       * This is configuration only.

       * Historical sync service will use actual requested
       * from/to dates.
       */
      defaultHistoricalSyncDays: {
  type:
    Number,

  /*
   * Approximately six months.
   *
   * Used as the default historical biometric
   * synchronization window.
   */
  default:
    183,

  min:
    1,

  max:
    366,
},

      /* =====================================================
         SYNC STATE
      ===================================================== */

      lastSyncAt: {
        type:
          Date,

        default:
          null,

        index:
          true,
      },

      lastSuccessfulSyncAt: {
        type:
          Date,

        default:
          null,
      },

      /*
       * Last device punch SE-RMS received.

       * This is more useful for live monitoring than only
       * checking lastSyncAt.
       */
      lastPunchReceivedAt: {
        type:
          Date,

        default:
          null,

        index:
          true,
      },

      /*
       * Last historical point successfully synchronized.

       * Helpful for incremental synchronization.

       * Example:
       *
       * Device synced successfully until:
       * 2026-09-13T09:30...
       *
       * Next sync can continue after that point instead of
       * repeatedly downloading all three months.
       */
      syncCursorAt: {
        type:
          Date,

        default:
          null,

        index:
          true,
      },

      lastSyncStatus: {
        type:
          String,

        enum:
          BIOMETRIC_SYNC_STATUSES,

        default:
          "NEVER_SYNCED",

        index:
          true,
      },

      lastSyncMessage: {
        type:
          String,

        trim:
          true,

        default:
          "",

        maxlength:
          2000,
      },

      /*
       * Simple counters for monitoring/debugging.

       * These are summaries only.
       */
      lastSyncStats: {
        received: {
          type:
            Number,

          default:
            0,

          min:
            0,
        },

        inserted: {
          type:
            Number,

          default:
            0,

          min:
            0,
        },

        duplicates: {
          type:
            Number,

          default:
            0,

          min:
            0,
        },

        mapped: {
          type:
            Number,

          default:
            0,

          min:
            0,
        },

        unmapped: {
          type:
            Number,

          default:
            0,

          min:
            0,
        },

        errors: {
          type:
            Number,

          default:
            0,

          min:
            0,
        },
      },

      /* =====================================================
         DEVICE HEALTH
      ===================================================== */

      status: {
        type:
          String,

        enum:
          BIOMETRIC_DEVICE_STATUSES,

        default:
          "ACTIVE",

        index:
          true,
      },

      /*
       * Runtime observation.

       * Do not use this field to decide whether device
       * configuration itself is enabled.
       */
      isOnline: {
        type:
          Boolean,

        default:
          false,

        index:
          true,
      },

      lastHeartbeatAt: {
        type:
          Date,

        default:
          null,

        index:
          true,
      },

      /*
       * Last time SE-RMS successfully communicated with
       * the machine/vendor integration.
       */
      lastConnectionAt: {
        type:
          Date,

        default:
          null,
      },

      lastConnectionError: {
        type:
          String,

        trim:
          true,

        default:
          "",

        maxlength:
          2000,
      },

      /* =====================================================
         CONFIGURATION
      ===================================================== */

      timezone: {
        type:
          String,

        trim:
          true,

        default:
          "Asia/Kolkata",
      },

      enabled: {
        type:
          Boolean,

        default:
          true,

        index:
          true,
      },

      notes: {
        type:
          String,

        trim:
          true,

        default:
          "",

        maxlength:
          1000,
      },

      /* =====================================================
         AUDIT
      ===================================================== */

      createdBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      updatedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },
    },
    {
      timestamps:
        true,

      versionKey:
        false,

      minimize:
        false,
    }
  );

/* =========================================================
   NORMALIZATION
========================================================= */

biometricDeviceSchema.pre(
  "validate",
  function () {
    if (
      typeof this.code ===
      "string"
    ) {
      this.code =
        this.code
          .trim()
          .toUpperCase();
    }

    if (
      typeof this.serialNumber ===
      "string"
    ) {
      this.serialNumber =
        this.serialNumber.trim();

      if (
        !this.serialNumber
      ) {
        this.serialNumber =
          null;
      }
    }

    if (
      typeof this.externalDeviceId ===
      "string"
    ) {
      this.externalDeviceId =
        this.externalDeviceId.trim();
    }
  }
);

/* =========================================================
   INDEXES
========================================================= */

/*
 * Device management by office.
 */
biometricDeviceSchema.index({
  officeId:
    1,

  enabled:
    1,
});

/*
 * Device management by organization.
 */
biometricDeviceSchema.index({
  organizationUnitId:
    1,

  enabled:
    1,
});

/*
 * Device monitoring.
 */
biometricDeviceSchema.index({
  provider:
    1,

  status:
    1,
});

/*
 * Sync workers can efficiently find devices that require
 * synchronization.
 */
biometricDeviceSchema.index({
  enabled:
    1,

  syncEnabled:
    1,

  connectionMode:
    1,

  lastSyncAt:
    1,
});

/*
 * Serial number should normally identify a machine.

 * Sparse/partial behavior allows us to configure devices
 * where serial number has not yet been discovered.
 */
biometricDeviceSchema.index(
  {
    serialNumber:
      1,
  },
  {
    unique:
      true,

    sparse:
      true,
  }
);

/* =========================================================
   MODEL
========================================================= */

const BiometricDevice =
  mongoose.models
    .BiometricDevice ||
  mongoose.model(
    "BiometricDevice",
    biometricDeviceSchema
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  BiometricDevice,

  BIOMETRIC_DEVICE_PROVIDERS,

  BIOMETRIC_CONNECTION_MODES,

  BIOMETRIC_DEVICE_STATUSES,

  BIOMETRIC_SYNC_STATUSES,
};
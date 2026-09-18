const mongoose =
  require(
    "mongoose"
  );

const {
  Schema,
} = mongoose;

/* =========================================================
   BIOMETRIC MACHINE USER

   Represents a user/enrollment discovered directly
   from a biometric device.

   This is NOT the Employee master.

   Employee remains authoritative.
========================================================= */

const biometricMachineUserSchema =
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

        required:
          true,

        index:
          true,
      },

      deviceCode: {
        type:
          String,

        trim:
          true,

        required:
          true,

        index:
          true,
      },

      provider: {
        type:
          String,

        enum: [
          "ESSL",
          "REALTIME",
          "ZKTECO",
          "OTHER",
        ],

        required:
          true,

        index:
          true,
      },

      /* =====================================================
         MACHINE USER
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

      machineUserId: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      machineEmployeeName: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      /* =====================================================
         SE-RMS EMPLOYEE MAPPING
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

      mapped: {
        type:
          Boolean,

        default:
          false,

        index:
          true,
      },

      mappedAt: {
        type:
          Date,

        default:
          null,
      },

      mappedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      /* =====================================================
         DEVICE SYNC
      ===================================================== */

      firstSeenAt: {
        type:
          Date,

        default:
          Date.now,
      },

      lastSeenAt: {
        type:
          Date,

        default:
          Date.now,

        index:
          true,
      },

      lastEnrollmentAt: {
        type:
          Date,

        default:
          null,
      },

      activeOnDevice: {
        type:
          Boolean,

        default:
          true,

        index:
          true,
      },

      /* =====================================================
         RAW DEVICE RECORD
      ===================================================== */

      rawPayload: {
        type:
          Schema.Types.Mixed,

        default:
          null,
      },
    },
    {
      timestamps:
        true,

      versionKey:
        false,
    }
  );

/* =========================================================
   UNIQUE USER PER DEVICE
========================================================= */

biometricMachineUserSchema.index(
  {
    attendanceDeviceId:
      1,

    biometricCode:
      1,
  },
  {
    unique:
      true,
  }
);

/* =========================================================
   MAPPING QUERIES
========================================================= */

biometricMachineUserSchema.index({
  mapped:
    1,

  attendanceDeviceId:
    1,
});

biometricMachineUserSchema.index({
  employeeId:
    1,

  mapped:
    1,
});

/* =========================================================
   MODEL
========================================================= */

const BiometricMachineUser =
  mongoose.models
    .BiometricMachineUser ||
  mongoose.model(
    "BiometricMachineUser",
    biometricMachineUserSchema
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  BiometricMachineUser,
};
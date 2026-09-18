require("dotenv").config();

const mongoose =
  require("mongoose");

const connectDB =
  require("../config/db");

const attendanceService =
  require("../attendance/attendance.service");

/* =========================================================
   DEMO CONFIG

   IMPORTANT:
   employeeCode must match an employee in your Employee model.

   Change DEMO_EMPLOYEE_CODE below to one real SE-RMS
   employeeCode from MongoDB.
========================================================= */

const DEMO_EMPLOYEE_CODE =
  process.env
    .DEMO_BIOMETRIC_EMPLOYEE_CODE ||
  "SE001";

const DEVICE_CODE =
  process.env
    .FKWEB_DEVICE_CODE ||
  "SE_MAIN_01";

/* =========================================================
   LOGGER
========================================================= */

const line = () =>
  console.log(
    "============================================================"
  );

const success = (
  message
) =>
  console.log(
    `✅ ${message}`
  );

const info = (
  message
) =>
  console.log(
    `ℹ️  ${message}`
  );

const fail = (
  message,
  error = null
) => {
  console.error(
    `❌ ${message}`
  );

  if (error) {
    console.error(
      error
    );
  }
};

/* =========================================================
   MAIN
========================================================= */

const run =
  async () => {
    try {
      line();

      console.log(
        "SE-RMS DEMO BIOMETRIC PUNCH"
      );

      line();

      /* =====================================================
         DATABASE
      ===================================================== */

      info(
        "Connecting to MongoDB..."
      );

      await connectDB();

      success(
        "MongoDB connected."
      );

      /* =====================================================
         BUILD DEMO PUNCH
      ===================================================== */

      const now =
        new Date();

      const machineRecordId =
        [
          "DEMO",
          DEVICE_CODE,
          DEMO_EMPLOYEE_CODE,
          now.getTime(),
        ].join("-");

      const payload = {
        employeeCode:
          DEMO_EMPLOYEE_CODE,

        machineUserId:
          DEMO_EMPLOYEE_CODE,

        machineRecordId,

        punchTime:
          now.toISOString(),

        verifyMode:
          "FINGERPRINT",

        inOutMode:
          "1",

        deviceCode:
          DEVICE_CODE,

        deviceSerialNumber:
          "RSS20241199635",

        provider:
          "REALTIME",
      };

      info(
        `Creating biometric punch for ${DEMO_EMPLOYEE_CODE}...`
      );

      /* =====================================================
         EXISTING ATTENDANCE SERVICE

         This should create:
         AttendancePunch
         Attendance
         BiometricDevice
      ===================================================== */

      const result =
        await attendanceService
          .ingestBiometricPunch(
            payload
          );

      success(
        "Biometric punch saved successfully."
      );

      /* =====================================================
         OUTPUT
      ===================================================== */

      console.log(
        "\nRESULT:"
      );

      console.dir(
        result,
        {
          depth: 5,
          colors: true,
        }
      );

      line();

      success(
        "Demo completed."
      );

      console.log(
        "Check MongoDB collections:"
      );

      console.log(
        "- attendancepunches"
      );

      console.log(
        "- attendances"
      );

      console.log(
        "- biometricdevices"
      );

      line();
    } catch (
      error
    ) {
      line();

      fail(
        "Demo biometric punch failed.",
        error
      );

      line();

      process.exitCode =
        1;
    } finally {
      try {
        await mongoose
          .connection
          .close();

        info(
          "MongoDB disconnected."
        );
      } catch (
        error
      ) {
        fail(
          "MongoDB disconnect failed.",
          error
        );
      }
    }
  };

run();
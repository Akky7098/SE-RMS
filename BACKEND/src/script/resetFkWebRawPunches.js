require("dotenv").config();

const mongoose =
  require("mongoose");

const connectDB =
  require("../config/db");

const FkWebRawEvent =
  require(
    "../attendance/fkwebRawEvent.model"
  );

const DEVICE_ID =
  String(
    process.env
      .FKWEB_REAL_DEVICE_ID ||
      "RSS20241199635"
  ).trim();

const run =
  async () => {
    try {
      console.log(
        "============================================================"
      );

      console.log(
        "RESET FKWEB RAW ATTENDANCE"
      );

      console.log(
        "============================================================"
      );

      await connectDB();

      console.log(
        "✅ MongoDB connected"
      );

      const before =
        await FkWebRawEvent.countDocuments({
          deviceId:
            DEVICE_ID,

          eventType:
            "PUNCH",
        });

      console.log(
        `Current raw punches: ${before}`
      );

      /*
       * IMPORTANT
       *
       * We are clearing ONLY the temporary FKWeb raw
       * attendance collection for this biometric device.
       *
       * This does NOT delete:
       * - Employee
       * - Attendance
       * - User
       * - SE-RMS data
       */
      const result =
        await FkWebRawEvent.deleteMany({
          deviceId:
            DEVICE_ID,

          eventType:
            "PUNCH",
        });

      console.log(
        `✅ Deleted raw punches: ${result.deletedCount}`
      );

      const after =
        await FkWebRawEvent.countDocuments({
          deviceId:
            DEVICE_ID,

          eventType:
            "PUNCH",
        });

      console.log(
        `Remaining raw punches: ${after}`
      );

      console.log(
        "============================================================"
      );

      if (
        after === 0
      ) {
        console.log(
          "✅ RAW ATTENDANCE RESET SUCCESSFUL"
        );
      } else {
        console.log(
          "⚠️ Some raw punches still remain"
        );
      }

      console.log(
        "============================================================"
      );
    } catch (
      error
    ) {
      console.error(
        "❌ RESET FAILED:",
        error
      );

      process.exitCode =
        1;
    } finally {
      await mongoose
        .connection
        .close();
    }
  };

run();
require("dotenv").config();

const mongoose =
  require("mongoose");

const connectDB =
  require("../config/db");

const FkWebRawEvent =
  require(
    "../attendance/fkwebRawEvent.model"
  );

const run =
  async () => {
    try {
      console.log(
        "============================================"
      );

      console.log(
        "CLEANING FKWEB DEMO / IMPORTED DATA"
      );

      console.log(
        "============================================"
      );

      await connectDB();

      /*
       * Delete records created by our earlier demo/import.
       *
       * Keep genuine live Realtime events.
       */
      const result =
        await FkWebRawEvent.deleteMany({
          $or: [
            {
              "rawPayload.importedForDemo":
                true,
            },

            {
              "rawPayload.source":
                /Captured earlier|Captured from Realtime/i,
            },

            {
              recordId: {
                $regex:
                  /^IMPORTED-/i,
              },
            },

            {
              uniqueEventKey: {
                $regex:
                  /:IMPORTED:/i,
              },
            },
          ],
        });

      console.log(
        `✅ Removed ${result.deletedCount} demo/imported events`
      );

      console.log(
        "✅ Genuine FKWeb live events kept"
      );
    } catch (
      error
    ) {
      console.error(
        "❌ Cleanup failed:",
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
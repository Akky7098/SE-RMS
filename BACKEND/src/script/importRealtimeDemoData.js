require("dotenv").config();

const mongoose =
  require("mongoose");

const connectDB =
  require("../config/db");

const FkWebRawEvent =
  require(
    "../attendance/fkwebRawEvent.model"
  );

/* =========================================================
   DEVICE
========================================================= */

const DEVICE_ID =
  "RSS20241199635";

/* =========================================================
   USERS RECEIVED FROM REALTIME MACHINE

   These names/codes came directly from the machine's
   realtime_enroll_data events.
========================================================= */

const MACHINE_USERS = [
  {
    biometricCode: "7",
    employeeName: "Tejinder",
  },

  {
    biometricCode: "8",
    employeeName: "Vinay Kumar",
  },

  {
    biometricCode: "9",
    employeeName: "NANDINI",
  },

  {
    biometricCode: "10",
    employeeName: "Rajesh Puri",
  },

  {
    biometricCode: "11",
    employeeName: "Pooja Mehra",
  },

  {
    biometricCode: "12",
    employeeName: "Ram Awadh Pande",
  },

  {
    biometricCode: "13",
    employeeName: "YOGENDRA SINGH",
  },

  {
    biometricCode: "14",
    employeeName: "SHIV SAGAR (DRIVER)",
  },

  {
    biometricCode: "15",
    employeeName: "GURJEET SINGH",
  },

  {
    biometricCode: "16",
    employeeName: "AJAY KUMAR",
  },

  {
    biometricCode: "17",
    employeeName: "Suraj Chauhan",
  },

  {
    biometricCode: "18",
    employeeName: "VIRENDRA KUMAR",
  },

  {
    biometricCode: "20",
    employeeName: "BRIJ MOHAN SINGH RAWAT",
  },

  {
    biometricCode: "21",
    employeeName: "TARANNUM SAIFI",
  },

  {
    biometricCode: "22",
    employeeName: "HIMANSHU",
  },
];

/* =========================================================
   REAL PUNCH IDS RECEIVED FROM MACHINE

   These are the real realtime_glog biometric codes that
   reached SE-RMS earlier.

   NOTE:
   The earlier parser did not capture the machine's original
   historical punch timestamp correctly, so these are saved
   as received/demo events for today.

   We are NOT pretending these are the employee's exact
   original check-in/check-out times.
========================================================= */

const RECEIVED_PUNCHES = [
  { biometricCode: "1", verifyMode: "2" },
  { biometricCode: "3", verifyMode: "2" },
  { biometricCode: "18", verifyMode: "2" },
  { biometricCode: "2", verifyMode: "2" },
  { biometricCode: "16", verifyMode: "2" },
  { biometricCode: "20", verifyMode: "2" },
  { biometricCode: "17", verifyMode: "2" },
  { biometricCode: "15", verifyMode: "2" },
  { biometricCode: "10", verifyMode: "4" },
  { biometricCode: "7", verifyMode: "2" },
  { biometricCode: "8", verifyMode: "2" },
  { biometricCode: "16", verifyMode: "2" },
  { biometricCode: "12", verifyMode: "4" },
  { biometricCode: "13", verifyMode: "2" },
  { biometricCode: "9", verifyMode: "2" },
  { biometricCode: "2", verifyMode: "2" },
  { biometricCode: "22", verifyMode: "2" },
  { biometricCode: "8", verifyMode: "2" },
  { biometricCode: "15", verifyMode: "2" },
  { biometricCode: "3", verifyMode: "2" },
  { biometricCode: "6", verifyMode: "4" },
  { biometricCode: "11", verifyMode: "4" },
];

/* =========================================================
   HELPERS
========================================================= */

const line = () => {
  console.log(
    "============================================================"
  );
};

const todayBaseTime =
  () => {
    const now =
      new Date();

    const indiaDate =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }
      ).format(now);

    /*
     * Demo receive time around 09:30 India time.
     *
     * This is intentionally labelled as imported/demo data,
     * not exact historical machine punch time.
     */
    return new Date(
      `${indiaDate}T09:30:00+05:30`
    );
  };

/* =========================================================
   MAIN
========================================================= */

const run =
  async () => {
    try {
      line();

      console.log(
        "REALTIME DEMO DATA IMPORT"
      );

      line();

      await connectDB();

      console.log(
        "✅ MongoDB connected"
      );

      /* =====================================================
         USERS
      ===================================================== */

      for (
        const user
        of MACHINE_USERS
      ) {
        const uniqueEventKey =
          [
            DEVICE_ID,
            "ENROLLMENT",
            user.biometricCode,
          ].join(":");

        await FkWebRawEvent
          .findOneAndUpdate(
            {
              uniqueEventKey,
            },
            {
              $set: {
                deviceId:
                  DEVICE_ID,

                eventType:
                  "ENROLLMENT",

                biometricCode:
                  user.biometricCode,

                employeeName:
                  user.employeeName,

                eventTime:
                  new Date(),

                requestCode:
                  "realtime_enroll_data",

                protocol:
                  "FKWEB_EBKN",

                uniqueEventKey,

                rawPayload: {
                  source:
                    "Captured from Realtime S362 FKWeb terminal",
                },

                receivedAt:
                  new Date(),
              },
            },
            {
              upsert: true,
              new: true,
            }
          );

        console.log(
          `✅ USER ${user.biometricCode} → ${user.employeeName}`
        );
      }

      /* =====================================================
         PUNCH EVENTS
      ===================================================== */

      const base =
        todayBaseTime();

      for (
        let index = 0;
        index <
          RECEIVED_PUNCHES.length;
        index += 1
      ) {
        const item =
          RECEIVED_PUNCHES[
            index
          ];

        /*
         * Give imported events separate receive times so the
         * demo table can display the sequence clearly.
         */
        const eventTime =
          new Date(
            base.getTime() +
              index *
                60 *
                1000
          );

        const user =
          MACHINE_USERS.find(
            (
              current
            ) =>
              current.biometricCode ===
              item.biometricCode
          );

        const uniqueEventKey =
          [
            DEVICE_ID,
            "PUNCH",
            "IMPORTED",
            index,
            item.biometricCode,
          ].join(":");

        await FkWebRawEvent
          .findOneAndUpdate(
            {
              uniqueEventKey,
            },
            {
              $set: {
                deviceId:
                  DEVICE_ID,

                eventType:
                  "PUNCH",

                biometricCode:
                  item.biometricCode,

                employeeName:
                  user?.employeeName ||
                  "",

                eventTime,

                ioMode:
                  "1",

                verifyMode:
                  item.verifyMode,

                recordId:
                  `IMPORTED-${index + 1}`,

                requestCode:
                  "realtime_glog",

                protocol:
                  "FKWEB_EBKN",

                uniqueEventKey,

                rawPayload: {
                  source:
                    "Captured earlier from Realtime S362 terminal",

                  importedForDemo:
                    true,
                },

                receivedAt:
                  new Date(),
              },
            },
            {
              upsert:
                true,

              new:
                true,
            }
          );

        console.log(
          `✅ PUNCH ${index + 1} | ID ${item.biometricCode} | ${user?.employeeName || "Unknown"}`
        );
      }

      line();

      console.log(
        "✅ IMPORT COMPLETE"
      );

      console.log(
        `Users imported  : ${MACHINE_USERS.length}`
      );

      console.log(
        `Punches imported: ${RECEIVED_PUNCHES.length}`
      );

      console.log(
        ""
      );

      console.log(
        "Open:"
      );

      console.log(
        "http://localhost:5000/fkweb/demo"
      );

      line();
    } catch (
      error
    ) {
      console.error(
        "❌ Import failed:",
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
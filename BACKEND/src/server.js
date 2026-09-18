const mongoose =
  require("mongoose");

const app =
  require("./app");

const connectDB =
  require("./config/db");

const env =
  require("./config/env");

const {
  ensureDefaultAccessProfiles,
} =
  require("./access/access.service");

let server;

/* =========================================================
   SERVER CONFIG

   0.0.0.0 makes the backend reachable from other devices
   on the same LAN, including the biometric machine.
========================================================= */

const HOST =
  "0.0.0.0";

const startServer =
  async () => {
    try {
      /* =====================================================
         DATABASE
      ===================================================== */

      await connectDB();

      /* =====================================================
         DEFAULT ACCESS PROFILES
      ===================================================== */

      await ensureDefaultAccessProfiles();

      /* =====================================================
         START HTTP SERVER
      ===================================================== */

      server =
        app.listen(
          env.port,
          HOST,
          () => {
            console.log(
              "================================="
            );

            console.log(
              "SE-RMS BACKEND STARTED"
            );

            console.log(
              `Environment: ${env.nodeEnv}`
            );

            console.log(
              `Host: ${HOST}`
            );

            console.log(
              `Port: ${env.port}`
            );

            console.log(
              `Local Health: http://localhost:${env.port}/api/health`
            );

            console.log(
              `Local FKWeb: http://localhost:${env.port}/fkweb`
            );

            console.log(
              `LAN FKWeb: http://192.168.1.103:${env.port}/fkweb`
            );

            console.log(
              "================================="
            );
          }
        );
    } catch (
      error
    ) {
      console.error(
        "Failed to start server:",
        error
      );

      process.exit(1);
    }
  };

/* =========================================================
   GRACEFUL SHUTDOWN
========================================================= */

const gracefulShutdown =
  async (
    signal
  ) => {
    console.log(
      `\n${signal} received. Shutting down gracefully...`
    );

    if (
      server
    ) {
      server.close(
        async () => {
          try {
            await mongoose
              .connection
              .close();

            console.log(
              "MongoDB connection closed"
            );

            process.exit(0);
          } catch (
            error
          ) {
            console.error(
              "Shutdown error:",
              error
            );

            process.exit(1);
          }
        }
      );

      return;
    }

    try {
      await mongoose
        .connection
        .close();
    } catch (
      error
    ) {
      console.error(
        "MongoDB shutdown error:",
        error
      );
    }

    process.exit(0);
  };

/* =========================================================
   PROCESS EVENTS
========================================================= */

process.on(
  "SIGTERM",
  () =>
    gracefulShutdown(
      "SIGTERM"
    )
);

process.on(
  "SIGINT",
  () =>
    gracefulShutdown(
      "SIGINT"
    )
);

process.on(
  "unhandledRejection",
  (
    error
  ) => {
    console.error(
      "Unhandled Promise Rejection:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  (
    error
  ) => {
    console.error(
      "Uncaught Exception:",
      error
    );

    process.exit(1);
  }
);

/* =========================================================
   BOOT
========================================================= */

startServer();
const mongoose =
  require("mongoose");

const os =
  require("os");

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

  const {
  initBaileysClient,
} =
  require(
    "./baileys/baileysClient"
  );

let server;

/* =========================================================
   SERVER CONFIG

   0.0.0.0 makes the backend reachable from other devices
   on the same LAN, including the biometric machine.
========================================================= */

const HOST =
  "0.0.0.0";

/* =========================================================
   RESOLVE LAN IPV4

   Used only for displaying the correct LAN URL in logs.

   It does NOT control which interface Express listens on.
   Express continues listening on 0.0.0.0.
========================================================= */

const getLanIPv4 =
  () => {
    const interfaces =
      os.networkInterfaces();

    for (
      const addresses of Object.values(
        interfaces
      )
    ) {
      if (
        !Array.isArray(
          addresses
        )
      ) {
        continue;
      }

      for (
        const address of addresses
      ) {
        if (
          address.family ===
            "IPv4" &&
          !address.internal
        ) {
          return address.address;
        }
      }
    }

    return null;
  };

/* =========================================================
   START SERVER
========================================================= */

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
            const lanIp =
              getLanIPv4();

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
              `Local FKWeb Ping: http://localhost:${env.port}/fkweb/ping`
            );

            console.log(
              `Local FKWeb Receiver: http://localhost:${env.port}/fkweb/device`
            );

            if (
              lanIp
            ) {
              console.log(
                `LAN IP: ${lanIp}`
              );

              console.log(
                `LAN FKWeb Ping: http://${lanIp}:${env.port}/fkweb/ping`
              );

              console.log(
                `LAN FKWeb Receiver: http://${lanIp}:${env.port}/fkweb/device`
              );
            } else {
              console.log(
                "LAN IP: NOT DETECTED"
              );
            }

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

      process.exit(
        1
      );
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

            process.exit(
              0
            );
          } catch (
            error
          ) {
            console.error(
              "Shutdown error:",
              error
            );

            process.exit(
              1
            );
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

    process.exit(
      0
    );
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

    process.exit(
      1
    );
  }
);

/* =========================================================
   BOOT
========================================================= */

startServer();
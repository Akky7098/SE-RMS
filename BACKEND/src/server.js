const mongoose =
  require(
    "mongoose"
  );

const app =
  require(
    "./app"
  );

const connectDB =
  require(
    "./config/db"
  );

const env =
  require(
    "./config/env"
  );

const {
  ensureDefaultAccessProfiles,
} =
  require(
    "./access/access.service"
  );

const {
  initBaileysClient,
} =
  require(
    "./baileys/baileysClient"
  );

let server = null;

let isShuttingDown =
  false;

/* =========================================================
   SERVER
========================================================= */

const HOST =
  "0.0.0.0";

/* =========================================================
   INITIALIZE BAILEYS

   WhatsApp is an auxiliary service.

   A WhatsApp connection/QR/session failure must NOT prevent
   the main SE-RMS API from starting.
========================================================= */

const initializeBaileys =
  async () => {
    try {
      await initBaileysClient();

      console.log(
        "[Baileys] WhatsApp service initialized"
      );
    } catch (
      error
    ) {
      console.error(
        "[Baileys] Initialization failed:",
        error?.message ||
          error
      );

      /*
       * Do NOT throw.
       *
       * Authentication, attendance, recruitment and the rest
       * of the ERP must continue running even when WhatsApp
       * is temporarily unavailable.
       */
    }
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

      console.log(
        "[Startup] MongoDB connected"
      );

      /* =====================================================
         DEFAULT ACCESS PROFILES
      ===================================================== */

      await ensureDefaultAccessProfiles();

      /* =====================================================
         HTTP SERVER

         Start the API before Baileys.

         This ensures a QR/session problem cannot block
         production HTTP availability.
      ===================================================== */

      await new Promise(
        (
          resolve,
          reject
        ) => {
          server =
            app.listen(
              env.port,
              HOST,
              () => {
                resolve();
              }
            );

          server.once(
            "error",
            reject
          );
        }
      );

      console.log(
        "========================================"
      );

      console.log(
        "NUVANATA API STARTED"
      );

      console.log(
        `Environment : ${env.nodeEnv}`
      );

      console.log(
        `Port        : ${env.port}`
      );

      console.log(
        "Health      : /api/health"
      );

      console.log(
        "eSSL ADMS   : /iclock"
      );

      console.log(
        "Baileys API : /api/v1/baileys"
      );

      console.log(
        "========================================"
      );

      /* =====================================================
         BAILEYS

         Initialize after HTTP server is already available.

         Do not await this from the main startup path.
      ===================================================== */

      void initializeBaileys();
    } catch (
      error
    ) {
      console.error(
        "[Startup] Failed:",
        error?.message ||
          error
      );

      try {
        await mongoose
          .connection
          .close();
      } catch (
        closeError
      ) {
        console.error(
          "[Startup] MongoDB cleanup failed:",
          closeError?.message ||
            closeError
        );
      }

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
    if (
      isShuttingDown
    ) {
      return;
    }

    isShuttingDown =
      true;

    console.log(
      `[Shutdown] ${signal} received`
    );

    /*
     * Stop accepting new HTTP requests first.
     */
    if (
      server
    ) {
      await new Promise(
        (
          resolve
        ) => {
          server.close(
            () => {
              resolve();
            }
          );
        }
      );

      console.log(
        "[Shutdown] HTTP server closed"
      );
    }

    /*
     * Close MongoDB cleanly.
     */
    try {
      if (
        mongoose.connection
          .readyState !==
        0
      ) {
        await mongoose
          .connection
          .close();

        console.log(
          "[Shutdown] MongoDB connection closed"
        );
      }
    } catch (
      error
    ) {
      console.error(
        "[Shutdown] MongoDB close failed:",
        error?.message ||
          error
      );
    }

    process.exit(
      0
    );
  };

/* =========================================================
   PROCESS SIGNALS
========================================================= */

process.once(
  "SIGTERM",
  () => {
    void gracefulShutdown(
      "SIGTERM"
    );
  }
);

process.once(
  "SIGINT",
  () => {
    void gracefulShutdown(
      "SIGINT"
    );
  }
);

/* =========================================================
   PROCESS ERROR REPORTING

   Rejections are logged.

   An uncaught exception is treated as fatal because the
   process may be in an unknown state. PM2 will restart it.
========================================================= */

process.on(
  "unhandledRejection",
  (
    error
  ) => {
    console.error(
      "[Process] Unhandled rejection:",
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
      "[Process] Uncaught exception:",
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

void startServer();
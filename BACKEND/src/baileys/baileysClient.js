const fs =
  require("fs");

const path =
  require("path");

const pino =
  require("pino");

/* =========================================================
   PATHS
========================================================= */

const HOME =
  process.env.HOME ||
  process.env.USERPROFILE ||
  process.cwd();

const BAILEYS_AUTH_PATH =
  process.env.BAILEYS_AUTH_PATH ||
  path.join(
    HOME,
    ".se-rms",
    "baileys-auth"
  );

const BAILEYS_RUNTIME_PATH =
  process.env.BAILEYS_RUNTIME_PATH ||
  path.join(
    HOME,
    ".se-rms",
    "baileys-runtime"
  );

const OWNER_LOCK_FILE =
  path.join(
    BAILEYS_RUNTIME_PATH,
    "owner.json"
  );

const STATUS_FILE =
  path.join(
    BAILEYS_RUNTIME_PATH,
    "status.json"
  );

/* =========================================================
   STATE
========================================================= */

let sock =
  null;

let latestQr =
  null;

let connectionState =
  "DISCONNECTED";

let isConnecting =
  false;

let reconnectTimer =
  null;

let ownerHeartbeatTimer =
  null;

let isOwner =
  false;

let baileysModule =
  null;

let isResettingAuth =
  false;

/* =========================================================
   CONFIG
========================================================= */

const RECONNECT_DELAY_MS =
  15000;

const OWNER_HEARTBEAT_MS =
  15000;

const OWNER_STALE_MS =
  60000;

const QR_RECONNECT_DELAY_MS =
  2000;

/* =========================================================
   LOGGER
========================================================= */

const logger =
  pino({
    level:
      process.env.BAILEYS_LOG_LEVEL ||
      "silent",
  });

/* =========================================================
   HELPERS
========================================================= */

const sleep =
  (
    ms
  ) =>
    new Promise(
      (
        resolve
      ) =>
        setTimeout(
          resolve,
          ms
        )
    );

const ensureDirectory =
  (
    directory
  ) => {
    if (
      !fs.existsSync(
        directory
      )
    ) {
      fs.mkdirSync(
        directory,
        {
          recursive:
            true,

          mode:
            0o700,
        }
      );
    }

    try {
      fs.chmodSync(
        directory,
        0o700
      );
    } catch (
      error
    ) {}
  };

const writeJson =
  (
    filePath,
    data
  ) => {
    try {
      ensureDirectory(
        path.dirname(
          filePath
        )
      );

      const tempFile =
        `${filePath}.${process.pid}.tmp`;

      fs.writeFileSync(
        tempFile,
        JSON.stringify(
          data,
          null,
          2
        ),
        {
          mode:
            0o600,
        }
      );

      fs.renameSync(
        tempFile,
        filePath
      );
    } catch (
      error
    ) {
      console.error(
        "BAILEYS STATUS WRITE ERROR =>",
        error.message
      );
    }
  };

const readJson =
  (
    filePath
  ) => {
    try {
      if (
        !fs.existsSync(
          filePath
        )
      ) {
        return null;
      }

      return JSON.parse(
        fs.readFileSync(
          filePath,
          "utf8"
        )
      );
    } catch (
      error
    ) {
      return null;
    }
  };

const removeFile =
  (
    filePath
  ) => {
    try {
      if (
        fs.existsSync(
          filePath
        )
      ) {
        fs.unlinkSync(
          filePath
        );
      }
    } catch (
      error
    ) {}
  };

const removeDirectory =
  (
    directory
  ) => {
    if (
      fs.existsSync(
        directory
      )
    ) {
      fs.rmSync(
        directory,
        {
          recursive:
            true,

          force:
            true,
        }
      );
    }
  };

const isPidAlive =
  (
    pid
  ) => {
    if (
      !pid
    ) {
      return false;
    }

    try {
      process.kill(
        Number(
          pid
        ),
        0
      );

      return true;
    } catch (
      error
    ) {
      return false;
    }
  };

/* =========================================================
   IMPORT BAILEYS
========================================================= */

const loadBaileys =
  async () => {
    if (
      baileysModule
    ) {
      return baileysModule;
    }

    baileysModule =
      await import(
        "@whiskeysockets/baileys"
      );

    return baileysModule;
  };

/* =========================================================
   STATUS
========================================================= */

const writeStatus =
  (
    state,
    extra = {}
  ) => {
    connectionState =
      state;

    writeJson(
      STATUS_FILE,
      {
        state,

        ready:
          state ===
          "CONNECTED",

        qr:
          latestQr,

        ownerPid:
          isOwner
            ? process.pid
            : null,

        updatedAt:
          new Date()
            .toISOString(),

        ...extra,
      }
    );
  };

const getSharedStatus =
  () => {
    const status =
      readJson(
        STATUS_FILE
      );

    if (
      !status
    ) {
      return {
        ready:
          false,

        state:
          "NOT_STARTED",

        qr:
          null,

        ownerPid:
          null,
      };
    }

    return status;
  };

/* =========================================================
   OWNER
========================================================= */

const hasFreshOwner =
  () => {
    const owner =
      readJson(
        OWNER_LOCK_FILE
      );

    if (
      !owner?.pid
    ) {
      return false;
    }

    if (
      !isPidAlive(
        owner.pid
      )
    ) {
      return false;
    }

    const heartbeatTime =
      new Date(
        owner.heartbeatAt ||
        owner.startedAt
      ).getTime();

    if (
      !Number.isFinite(
        heartbeatTime
      )
    ) {
      return false;
    }

    return (
      Date.now() -
        heartbeatTime <
      OWNER_STALE_MS
    );
  };

const startOwnerHeartbeat =
  () => {
    if (
      ownerHeartbeatTimer
    ) {
      return;
    }

    const update =
      () => {
        if (
          !isOwner
        ) {
          return;
        }

        const existing =
          readJson(
            OWNER_LOCK_FILE
          );

        writeJson(
          OWNER_LOCK_FILE,
          {
            pid:
              process.pid,

            startedAt:
              existing
                ?.startedAt ||
              new Date()
                .toISOString(),

            heartbeatAt:
              new Date()
                .toISOString(),
          }
        );
      };

    update();

    ownerHeartbeatTimer =
      setInterval(
        update,
        OWNER_HEARTBEAT_MS
      );

    ownerHeartbeatTimer
      .unref?.();
  };

const acquireOwnership =
  () => {
    ensureDirectory(
      BAILEYS_RUNTIME_PATH
    );

    if (
      isOwner
    ) {
      return true;
    }

    const existing =
      readJson(
        OWNER_LOCK_FILE
      );

    if (
      existing &&
      hasFreshOwner()
    ) {
      return (
        Number(
          existing.pid
        ) ===
        Number(
          process.pid
        )
      );
    }

    removeFile(
      OWNER_LOCK_FILE
    );

    writeJson(
      OWNER_LOCK_FILE,
      {
        pid:
          process.pid,

        startedAt:
          new Date()
            .toISOString(),

        heartbeatAt:
          new Date()
            .toISOString(),
      }
    );

    const verification =
      readJson(
        OWNER_LOCK_FILE
      );

    if (
      Number(
        verification?.pid
      ) !==
      Number(
        process.pid
      )
    ) {
      return false;
    }

    isOwner =
      true;

    startOwnerHeartbeat();

    console.log(
      "BAILEYS OWNERSHIP ACQUIRED =>",
      process.pid
    );

    return true;
  };

const releaseOwnership =
  () => {
    if (
      !isOwner
    ) {
      return;
    }

    const owner =
      readJson(
        OWNER_LOCK_FILE
      );

    if (
      Number(
        owner?.pid
      ) ===
      Number(
        process.pid
      )
    ) {
      removeFile(
        OWNER_LOCK_FILE
      );
    }

    if (
      ownerHeartbeatTimer
    ) {
      clearInterval(
        ownerHeartbeatTimer
      );

      ownerHeartbeatTimer =
        null;
    }

    isOwner =
      false;
  };

/* =========================================================
   RECONNECT
========================================================= */

const scheduleReconnect =
  (
    delay =
      RECONNECT_DELAY_MS
  ) => {
    if (
      reconnectTimer
    ) {
      return;
    }

    reconnectTimer =
      setTimeout(
        async () => {
          reconnectTimer =
            null;

          try {
            await initBaileysClient();
          } catch (
            error
          ) {
            console.error(
              "BAILEYS RECONNECT FAILED =>",
              error.message
            );

            scheduleReconnect();
          }
        },
        delay
      );

    reconnectTimer
      .unref?.();
  };

/* =========================================================
   CLEAR LOGGED OUT AUTH
========================================================= */

const clearLoggedOutAuth =
  async () => {
    if (
      isResettingAuth
    ) {
      return;
    }

    isResettingAuth =
      true;

    try {
      if (
        reconnectTimer
      ) {
        clearTimeout(
          reconnectTimer
        );

        reconnectTimer =
          null;
      }

      if (
        sock
      ) {
        try {
          sock.ws?.close?.();
        } catch (
          error
        ) {}

        sock =
          null;
      }

      isConnecting =
        false;

      latestQr =
        null;

      removeDirectory(
        BAILEYS_AUTH_PATH
      );

      ensureDirectory(
        BAILEYS_AUTH_PATH
      );

      writeStatus(
        "PAIRING_REQUIRED"
      );

      console.log(
        "BAILEYS OLD AUTH REMOVED"
      );
    } finally {
      isResettingAuth =
        false;
    }
  };

/* =========================================================
   FRESH QR
========================================================= */

const startFreshQrSession =
  async () => {
    if (
      !acquireOwnership()
    ) {
      return null;
    }

    await clearLoggedOutAuth();

    await sleep(
      500
    );

    return initBaileysClient();
  };

/* =========================================================
   INITIALIZE
========================================================= */

const initBaileysClient =
  async () => {
    if (
      !acquireOwnership()
    ) {
      console.log(
        "BAILEYS INIT SKIPPED - ANOTHER PROCESS OWNS CONNECTION"
      );

      return null;
    }

    if (
      isConnecting
    ) {
      return sock;
    }

    if (
      sock &&
      connectionState ===
        "CONNECTED"
    ) {
      return sock;
    }

    isConnecting =
      true;

    latestQr =
      null;

    writeStatus(
      "CONNECTING"
    );

    try {
      ensureDirectory(
        BAILEYS_AUTH_PATH
      );

      const baileys =
        await loadBaileys();

      const {
        default:
          makeWASocket,

        useMultiFileAuthState,

        DisconnectReason,

        fetchLatestWaWebVersion,

        Browsers,
      } =
        baileys;

      const {
        state,
        saveCreds,
      } =
        await useMultiFileAuthState(
          BAILEYS_AUTH_PATH
        );

      const {
        version,
      } =
        await fetchLatestWaWebVersion();

      console.log(
        "BAILEYS WA VERSION =>",
        version.join(
          "."
        )
      );

      const newSock =
        makeWASocket({
          version,

          auth:
            state,

          logger,

          printQRInTerminal:
            false,

          markOnlineOnConnect:
            false,

          syncFullHistory:
            false,

          generateHighQualityLinkPreview:
            false,

          browser:
            Browsers.macOS(
              "Desktop"
            ),

          connectTimeoutMs:
            60000,

          defaultQueryTimeoutMs:
            60000,

          keepAliveIntervalMs:
            25000,

          retryRequestDelayMs:
            250,
        });

      sock =
        newSock;

      newSock.ev.on(
        "creds.update",
        saveCreds
      );

      newSock.ev.on(
        "connection.update",
        async (
          update
        ) => {
          const {
            connection,
            lastDisconnect,
            qr,
          } =
            update;

          if (
            qr
          ) {
            latestQr =
              qr;

            writeStatus(
              "QR_REQUIRED"
            );

            console.log(
              "BAILEYS QR READY"
            );
          }

          if (
            connection ===
              "connecting" &&
            !qr
          ) {
            writeStatus(
              "CONNECTING"
            );
          }

          if (
            connection ===
            "open"
          ) {
            latestQr =
              null;

            isConnecting =
              false;

            writeStatus(
              "CONNECTED",
              {
                user:
                  newSock
                    .user?.id ||
                  null,
              }
            );

            console.log(
              "BAILEYS WHATSAPP CONNECTED"
            );

            return;
          }

          if (
            connection ===
            "close"
          ) {
            isConnecting =
              false;

            if (
              sock ===
              newSock
            ) {
              sock =
                null;
            }

            let statusCode =
              null;

            try {
              statusCode =
                lastDisconnect
                  ?.error
                  ?.output
                  ?.statusCode ||
                lastDisconnect
                  ?.error
                  ?.statusCode ||
                null;
            } catch (
              error
            ) {}

            console.log(
              "BAILEYS CONNECTION CLOSED =>",
              statusCode
            );

            if (
              statusCode ===
              DisconnectReason.loggedOut
            ) {
              latestQr =
                null;

              writeStatus(
                "LOGGED_OUT"
              );

              await clearLoggedOutAuth();

              scheduleReconnect(
                QR_RECONNECT_DELAY_MS
              );

              return;
            }

            if (
              statusCode ===
              DisconnectReason.restartRequired
            ) {
              writeStatus(
                "RESTART_REQUIRED"
              );

              scheduleReconnect(
                2000
              );

              return;
            }

            writeStatus(
              "DISCONNECTED",
              {
                disconnectCode:
                  statusCode,
              }
            );

            scheduleReconnect();
          }
        }
      );

      isConnecting =
        false;

      return newSock;
    } catch (
      error
    ) {
      isConnecting =
        false;

      sock =
        null;

      writeStatus(
        "ERROR",
        {
          error:
            error.message,
        }
      );

      console.error(
        "BAILEYS INIT ERROR =>",
        error.message
      );

      scheduleReconnect();

      throw error;
    }
  };

/* =========================================================
   STATUS
========================================================= */

const getBaileysStatus =
  () => {
    if (
      isOwner
    ) {
      return {
        ready:
          connectionState ===
          "CONNECTED",

        state:
          connectionState,

        qr:
          latestQr,

        ownerPid:
          process.pid,
      };
    }

    return getSharedStatus();
  };

/* =========================================================
   SOCKET
========================================================= */

const getBaileysSocket =
  () => {
    if (
      connectionState !==
        "CONNECTED" ||
      !sock
    ) {
      return null;
    }

    return sock;
  };

/* =========================================================
   PHONE
========================================================= */

const normalizePhoneJid =
  (
    number
  ) => {
    const cleaned =
      String(
        number ||
        ""
      ).replace(
        /\D/g,
        ""
      );

    if (
      !cleaned
    ) {
      throw new Error(
        "WhatsApp phone number is required."
      );
    }

    /*
     * SE-RMS currently operates in India.
     *
     * A 10 digit local number receives +91.
     * Already international numbers remain unchanged.
     */
    const normalized =
      cleaned.length ===
        10
        ? `91${cleaned}`
        : cleaned;

    return `${normalized}@s.whatsapp.net`;
  };

/* =========================================================
   SEND TEXT
========================================================= */

const sendTextMessage =
  async (
    jid,
    text
  ) => {
    if (
      !jid
    ) {
      throw new Error(
        "WhatsApp JID is required."
      );
    }

    if (
      !text
    ) {
      throw new Error(
        "WhatsApp message is required."
      );
    }

    const currentSock =
      getBaileysSocket();

    if (
      !currentSock
    ) {
      throw new Error(
        "SE-RMS WhatsApp is not connected."
      );
    }

    return currentSock.sendMessage(
      jid,
      {
        text,
      }
    );
  };

const sendTextToPhone =
  async (
    number,
    text
  ) => {
    const jid =
      normalizePhoneJid(
        number
      );

    return sendTextMessage(
      jid,
      text
    );
  };

/* =========================================================
   DISCONNECT
========================================================= */

const disconnectBaileys =
  async () => {
    if (
      reconnectTimer
    ) {
      clearTimeout(
        reconnectTimer
      );

      reconnectTimer =
        null;
    }

    if (
      sock
    ) {
      try {
        sock.ws?.close?.();
      } catch (
        error
      ) {}
    }

    sock =
      null;

    latestQr =
      null;

    connectionState =
      "DISCONNECTED";

    writeStatus(
      "DISCONNECTED"
    );
  };

/* =========================================================
   LOGOUT
========================================================= */

const logoutBaileys =
  async () => {
    const currentSock =
      getBaileysSocket();

    if (
      !currentSock
    ) {
      throw new Error(
        "Baileys socket is not connected."
      );
    }

    await currentSock.logout();
  };

/* =========================================================
   CLEANUP
========================================================= */

const cleanup =
  () => {
    if (
      reconnectTimer
    ) {
      clearTimeout(
        reconnectTimer
      );

      reconnectTimer =
        null;
    }

    releaseOwnership();
  };

process.once(
  "SIGTERM",
  cleanup
);

process.once(
  "SIGINT",
  cleanup
);

process.once(
  "exit",
  cleanup
);

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  initBaileysClient,

  startFreshQrSession,

  getBaileysStatus,

  getBaileysSocket,

  sendTextMessage,

  sendTextToPhone,

  normalizePhoneJid,

  disconnectBaileys,

  logoutBaileys,
};
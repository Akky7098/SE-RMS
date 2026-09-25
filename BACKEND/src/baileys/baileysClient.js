const fs =
  require("fs");

const path =
  require("path");

const pino =
  require("pino");

const {
  handleIncomingMprMessage,
} =
  require(
    "../manpower/manpower.whatsapp.service"
  );

const {
  handleIncomingLeaveMessage,
} =
  require(
    "../leave/leave.whatsapp.service"
  );

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
   WHATSAPP SENDER IDENTITY

   WhatsApp/Baileys may identify group participants using:

   PN:
     919305127159@s.whatsapp.net

   OR LID:
     84353375846563@lid

   SE-RMS stores the actual WhatsApp phone number in:

     User.whatsappNumber

   Therefore an @lid value must NEVER be interpreted as a
   phone number.

   Resolution order:

   1. participantAlt PN
   2. participant PN
   3. Baileys internal LID -> PN mapping
   4. group metadata phoneNumber mapping
   5. unresolved -> reject safely
========================================================= */

const isPhoneJid =
  (
    jid
  ) =>
    String(
      jid || ""
    )
      .trim()
      .endsWith(
        "@s.whatsapp.net"
      );

const isLidJid =
  (
    jid
  ) =>
    String(
      jid || ""
    )
      .trim()
      .endsWith(
        "@lid"
      );

const stripDeviceFromJid =
  (
    jid
  ) => {
    const raw =
      String(
        jid || ""
      ).trim();

    if (
      !raw
    ) {
      return "";
    }

    const atIndex =
      raw.indexOf(
        "@"
      );

    if (
      atIndex ===
      -1
    ) {
      return raw;
    }

    const userPart =
      raw
        .slice(
          0,
          atIndex
        )
        .split(
          ":"
        )[0];

    const serverPart =
      raw.slice(
        atIndex +
          1
      );

    return `${userPart}@${serverPart}`;
  };

const phoneFromPnJid =
  (
    jid
  ) => {
    const normalizedJid =
      stripDeviceFromJid(
        jid
      );

    if (
      !isPhoneJid(
        normalizedJid
      )
    ) {
      return "";
    }

    return String(
      normalizedJid
        .split(
          "@"
        )[0] ||
      ""
    ).replace(
      /\D/g,
      ""
    );
  };

const resolveGroupParticipantPhone =
  async ({
    socket,
    groupJid,
    participant,
    participantAlt,
  }) => {
    const primary =
      stripDeviceFromJid(
        participant
      );

    const alternate =
      stripDeviceFromJid(
        participantAlt
      );

    console.log(
      "[BAILEYS][IDENTITY][START]",
      {
        groupJid,

        participant:
          primary,

        participantAlt:
          alternate,
      }
    );

    /* =====================================================
       1. PARTICIPANT ALT IS ALREADY PHONE JID

       Modern Baileys normally provides:

       participant:
         XXXXX@lid

       participantAlt:
         919XXXXXXXXX@s.whatsapp.net
    ===================================================== */

    if (
      isPhoneJid(
        alternate
      )
    ) {
      const phone =
        phoneFromPnJid(
          alternate
        );

      console.log(
        "[BAILEYS][IDENTITY][PARTICIPANT_ALT_PN]",
        {
          phone,

          pnJid:
            alternate,
        }
      );

      return {
        resolved:
          Boolean(
            phone
          ),

        phone,

        pnJid:
          alternate,

        lidJid:
          isLidJid(
            primary
          )
            ? primary
            : "",

        source:
          "PARTICIPANT_ALT",
      };
    }

    /* =====================================================
       2. PARTICIPANT ITSELF IS PHONE JID
    ===================================================== */

    if (
      isPhoneJid(
        primary
      )
    ) {
      const phone =
        phoneFromPnJid(
          primary
        );

      console.log(
        "[BAILEYS][IDENTITY][PARTICIPANT_PN]",
        {
          phone,

          pnJid:
            primary,
        }
      );

      return {
        resolved:
          Boolean(
            phone
          ),

        phone,

        pnJid:
          primary,

        lidJid:
          isLidJid(
            alternate
          )
            ? alternate
            : "",

        source:
          "PARTICIPANT",
      };
    }

    /* =====================================================
       3. LID -> PN USING BAILEYS INTERNAL MAPPING

       This is the important production path.

       Baileys itself maintains this mapping.
    ===================================================== */

    const lidJid =
      isLidJid(
        primary
      )
        ? primary
        : (
            isLidJid(
              alternate
            )
              ? alternate
              : ""
          );

    if (
      lidJid
    ) {
      try {
        const lidMapping =
          socket
            ?.signalRepository
            ?.lidMapping;

        if (
          lidMapping &&
          typeof lidMapping
            .getPNForLID ===
            "function"
        ) {
          const mappedPn =
            await lidMapping
              .getPNForLID(
                lidJid
              );

          const normalizedMappedPn =
            stripDeviceFromJid(
              mappedPn
            );

          console.log(
            "[BAILEYS][IDENTITY][LID_MAPPING_RESULT]",
            {
              lidJid,

              mappedPn:
                normalizedMappedPn ||
                null,
            }
          );

          if (
            isPhoneJid(
              normalizedMappedPn
            )
          ) {
            const phone =
              phoneFromPnJid(
                normalizedMappedPn
              );

            if (
              phone
            ) {
              return {
                resolved:
                  true,

                phone,

                pnJid:
                  normalizedMappedPn,

                lidJid,

                source:
                  "BAILEYS_LID_MAPPING",
              };
            }
          }
        } else {
          console.warn(
            "[BAILEYS][IDENTITY][LID_MAPPING_API_UNAVAILABLE]",
            {
              lidJid,
            }
          );
        }
      } catch (
        error
      ) {
        console.warn(
          "[BAILEYS][IDENTITY][LID_MAPPING_ERROR]",
          {
            lidJid,

            error:
              error.message,
          }
        );
      }
    }

    /* =====================================================
       4. GROUP METADATA FALLBACK

       Baileys group participant metadata may contain:

       id
       phoneNumber
       lid

       This gives us another authoritative WhatsApp mapping
       source without guessing the number.
    ===================================================== */

    if (
      lidJid &&
      groupJid
    ) {
      try {
        const metadata =
          await socket
            .groupMetadata(
              groupJid
            );

        const participants =
          Array.isArray(
            metadata
              ?.participants
          )
            ? metadata.participants
            : [];

        const matchingParticipant =
          participants.find(
            (
              item
            ) => {
              const id =
                stripDeviceFromJid(
                  item
                    ?.id
                );

              const lid =
                stripDeviceFromJid(
                  item
                    ?.lid
                );

              return (
                id ===
                  lidJid ||
                lid ===
                  lidJid
              );
            }
          );

        if (
          matchingParticipant
        ) {
          const possiblePn =
            stripDeviceFromJid(
              matchingParticipant
                ?.phoneNumber ||
              (
                isPhoneJid(
                  matchingParticipant
                    ?.id
                )
                  ? matchingParticipant.id
                  : ""
              )
            );

          console.log(
            "[BAILEYS][IDENTITY][GROUP_METADATA_MATCH]",
            {
              lidJid,

              participantId:
                matchingParticipant
                  ?.id ||
                null,

              participantLid:
                matchingParticipant
                  ?.lid ||
                null,

              participantPhoneNumber:
                matchingParticipant
                  ?.phoneNumber ||
                null,

              possiblePn:
                possiblePn ||
                null,
            }
          );

          if (
            isPhoneJid(
              possiblePn
            )
          ) {
            const phone =
              phoneFromPnJid(
                possiblePn
              );

            if (
              phone
            ) {
              return {
                resolved:
                  true,

                phone,

                pnJid:
                  possiblePn,

                lidJid,

                source:
                  "GROUP_METADATA",
              };
            }
          }

          /*
           * Some metadata versions may expose phoneNumber as
           * digits instead of a PN JID.
           */

          const metadataPhone =
            String(
              matchingParticipant
                ?.phoneNumber ||
              ""
            ).replace(
              /\D/g,
              ""
            );

          if (
            metadataPhone
          ) {
            return {
              resolved:
                true,

              phone:
                metadataPhone,

              pnJid:
                `${metadataPhone}@s.whatsapp.net`,

              lidJid,

              source:
                "GROUP_METADATA_PHONE",
            };
          }
        }
      } catch (
        error
      ) {
        console.warn(
          "[BAILEYS][IDENTITY][GROUP_METADATA_ERROR]",
          {
            groupJid,

            lidJid,

            error:
              error.message,
          }
        );
      }
    }

    /* =====================================================
       5. UNRESOLVED

       SECURITY RULE:

       Never use the numeric part of @lid as a phone number.
    ===================================================== */

    console.warn(
      "[BAILEYS][IDENTITY][UNRESOLVED]",
      {
        groupJid,

        participant:
          primary,

        participantAlt:
          alternate,

        lidJid:
          lidJid ||
          null,
      }
    );

    return {
      resolved:
        false,

      phone:
        "",

      pnJid:
        "",

      lidJid:
        lidJid ||
        "",

      source:
        "UNRESOLVED",
    };
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

      /* =====================================================
         MANPOWER WHATSAPP GROUP LISTENER

         Reads ONLY the configured group.

         Ordinary messages are silently ignored.
      ===================================================== */

           /* =====================================================
         MANPOWER WHATSAPP GROUP LISTENER

         PRODUCTION IDENTITY FLOW:

         WhatsApp may provide either:

         participant:
           919XXXXXXXXX@s.whatsapp.net

         OR:

         participant:
           XXXXX@lid

         SE-RMS never treats an LID as a phone number.

         Identity resolution happens here before the MPR
         service receives the message.
      ===================================================== */

            /* =====================================================
         MANPOWER + LEAVE WHATSAPP GROUP LISTENER

         IMPORTANT:

         MANPOWER:
         → Existing behavior remains unchanged.

         LEAVE:
         → Same PN/LID identity resolver as Manpower.
         → No Leave parsing happens here.
         → Parser lives in leave.whatsapp.service.js.
         → No success/error spam is posted in Leave group.
      ===================================================== */

           newSock.ev.on(
        "messages.upsert",
        async (
          event
        ) => {
          if (
            event?.type !==
              "notify" ||
            !Array.isArray(
              event.messages
            )
          ) {
            return;
          }

          for (
            const message of
              event.messages
          ) {
            try {
              /* =================================================
                 REMOTE JID
              ================================================= */

              const jid =
                String(
                  message
                    ?.key
                    ?.remoteJid ||
                  ""
                ).trim();

              /* =================================================
                 CONFIGURED GROUPS
              ================================================= */

              const configuredMprGroup =
                String(
                  process.env
                    .WHATSAPP_MPR_GROUP_ID ||
                  ""
                ).trim();

              const configuredLeaveGroup =
                String(
                  process.env
                    .WHATSAPP_LEAVE_GROUP_ID ||
                  ""
                ).trim();

              const isMprGroup =
                Boolean(
                  configuredMprGroup
                ) &&
                jid ===
                  configuredMprGroup;

              const isLeaveGroup =
                Boolean(
                  configuredLeaveGroup
                ) &&
                jid ===
                  configuredLeaveGroup;

              /*
               * Ignore every WhatsApp chat/group except:
               *
               * WHATSAPP_MPR_GROUP_ID
               * WHATSAPP_LEAVE_GROUP_ID
               */

              if (
                !jid ||
                (
                  !isMprGroup &&
                  !isLeaveGroup
                )
              ) {
                continue;
              }

              /* =================================================
                 MESSAGE TEXT
              ================================================= */

              const content =
                message.message ||
                {};

              const text =
                content
                  .conversation ||
                content
                  .extendedTextMessage
                  ?.text ||
                content
                  .imageMessage
                  ?.caption ||
                content
                  .videoMessage
                  ?.caption ||
                "";

              const normalizedText =
                String(
                  text || ""
                ).trim();

              if (
                !normalizedText
              ) {
                continue;
              }

              /* =================================================
                 COMMAND DETECTION

                 IMPORTANT:

                 Detect the command BEFORE choosing MPR/Leave.

                 This is required because during testing:

                 WHATSAPP_MPR_GROUP_ID
                 and
                 WHATSAPP_LEAVE_GROUP_ID

                 can point to the SAME WhatsApp group.
              ================================================= */

              const isMprCommand =
                /^MANPOWER REQUEST\b/i
                  .test(
                    normalizedText
                  );

              const isLeaveCommand =
                /^(LEAVE REQUEST|LEAVE APPLY|APPLY LEAVE)\b/i
                  .test(
                    normalizedText
                  );

              /*
               * Normal group conversation should remain ignored.
               */

              if (
                !isMprCommand &&
                !isLeaveCommand
              ) {
                continue;
              }

              /*
               * If the command belongs to a group that is not
               * configured for that feature, ignore it.
               */

              const shouldProcessMpr =
                isMprGroup &&
                isMprCommand;

              const shouldProcessLeave =
                isLeaveGroup &&
                isLeaveCommand;

              if (
                !shouldProcessMpr &&
                !shouldProcessLeave
              ) {
                continue;
              }

              /*
               * Existing MPR testing allowed commands sent by
               * the connected WhatsApp account itself.
               *
               * Leave gets the same behaviour for testing.
               *
               * Therefore DO NOT reject fromMe when it is a
               * recognized MPR/Leave command.
               */

              if (
                message
                  ?.key
                  ?.fromMe &&
                !isMprCommand &&
                !isLeaveCommand
              ) {
                continue;
              }

              /* =================================================
                 COMMAND RECEIVED LOG
              ================================================= */

              if (
                shouldProcessMpr
              ) {
                console.log(
                  "\n[BAILEYS][MPR][MESSAGE]",
                  {
                    remoteJid:
                      jid,

                    fromMe:
                      Boolean(
                        message
                          ?.key
                          ?.fromMe
                      ),

                    participant:
                      message
                        ?.key
                        ?.participant ||
                      null,

                    participantAlt:
                      message
                        ?.key
                        ?.participantAlt ||
                      null,

                    addressingMode:
                      message
                        ?.key
                        ?.addressingMode ||
                      null,

                    messageId:
                      message
                        ?.key
                        ?.id ||
                      null,
                  }
                );
              }

              if (
                shouldProcessLeave
              ) {
                console.log(
                  "\n[BAILEYS][LEAVE][MESSAGE]",
                  {
                    remoteJid:
                      jid,

                    fromMe:
                      Boolean(
                        message
                          ?.key
                          ?.fromMe
                      ),

                    participant:
                      message
                        ?.key
                        ?.participant ||
                      null,

                    participantAlt:
                      message
                        ?.key
                        ?.participantAlt ||
                      null,

                    addressingMode:
                      message
                        ?.key
                        ?.addressingMode ||
                      null,

                    messageId:
                      message
                        ?.key
                        ?.id ||
                      null,
                  }
                );
              }

              /* =================================================
                 SENDER IDENTITY

                 Resolve ONCE.

                 Same existing PN/LID resolver is used for:
                 - Manpower
                 - Leave

                 IMPORTANT:
                 Never treat @lid digits as a phone number.
              ================================================= */

              const participant =
                message
                  ?.key
                  ?.participant ||
                "";

              const participantAlt =
                message
                  ?.key
                  ?.participantAlt ||
                "";

              const identity =
                await resolveGroupParticipantPhone({
                  socket:
                    newSock,

                  groupJid:
                    jid,

                  participant,

                  participantAlt,
                });

              console.log(
                "[BAILEYS][COMMAND][IDENTITY_RESULT]",
                {
                  command:
                    shouldProcessMpr
                      ? "MANPOWER"
                      : "LEAVE",

                  resolved:
                    identity.resolved,

                  phone:
                    identity.phone ||
                    null,

                  pnJid:
                    identity.pnJid ||
                    null,

                  lidJid:
                    identity.lidJid ||
                    null,

                  source:
                    identity.source,
                }
              );

              /* =================================================
                 MANPOWER
              ================================================= */

              if (
                shouldProcessMpr
              ) {
                /*
                 * Security boundary:
                 *
                 * Never send an @lid to Manpower service as
                 * though it were a phone number.
                 */

                if (
                  !identity.resolved ||
                  !identity.phone ||
                  !identity.pnJid
                ) {
                  console.warn(
                    "[BAILEYS][MPR][IDENTITY_REJECTED]",
                    {
                      participant:
                        participant ||
                        null,

                      participantAlt:
                        participantAlt ||
                        null,

                      lidJid:
                        identity.lidJid ||
                        null,
                    }
                  );

                  /*
                   * Keep existing MPR group error behaviour.
                   */

                  await newSock
                    .sendMessage(
                      jid,
                      {
                        text:
                          "Your WhatsApp identity could not be verified by SE-RMS.\n\n" +
                          "The Manpower Request was not created.\n" +
                          "Please contact the SE-RMS administrator if your registered WhatsApp number has recently changed.",
                      },
                      {
                        quoted:
                          message,
                      }
                    );

                  continue;
                }

                console.log(
                  "[BAILEYS][MPR][PROCESSING]",
                  {
                    phone:
                      identity.phone,

                    pnJid:
                      identity.pnJid,

                    source:
                      identity.source,

                    messageId:
                      message
                        ?.key
                        ?.id ||
                      null,
                  }
                );

                const result =
                  await handleIncomingMprMessage({
                    jid,

                    senderJid:
                      identity.pnJid,

                    senderPhone:
                      identity.phone,

                    senderLid:
                      identity.lidJid ||
                      "",

                    senderIdentitySource:
                      identity.source,

                    messageId:
                      message
                        ?.key
                        ?.id ||
                      "",

                    text:
                      normalizedText,
                  });

                /*
                 * Normal conversation / intentionally ignored
                 * input produces no response.
                 */

                if (
                  result
                    ?.ignored
                ) {
                  continue;
                }

                /*
                 * Preserve existing Manpower group reply.
                 */

                if (
                  result
                    ?.reply
                ) {
                  await newSock
                    .sendMessage(
                      jid,
                      {
                        text:
                          result.reply,

                        mentions:
                          Array.isArray(
                            result.mentions
                          )
                            ? result.mentions
                            : [],
                      },
                      {
                        quoted:
                          message,
                      }
                    );
                }

                continue;
              }

              /* =================================================
                 LEAVE
              ================================================= */

              if (
                shouldProcessLeave
              ) {
                /*
                 * SECURITY:
                 *
                 * Never use @lid digits as employee phone.
                 *
                 * If PN cannot be resolved:
                 *
                 * - do NOT create Leave
                 * - do NOT send error to Leave group
                 * - just log it
                 */

                if (
                  !identity.resolved ||
                  !identity.phone ||
                  !identity.pnJid
                ) {
                  console.warn(
                    "[BAILEYS][LEAVE][IDENTITY_REJECTED]",
                    {
                      participant:
                        participant ||
                        null,

                      participantAlt:
                        participantAlt ||
                        null,

                      lidJid:
                        identity.lidJid ||
                        null,

                      source:
                        identity.source ||
                        null,
                    }
                  );

                  continue;
                }

                console.log(
                  "[BAILEYS][LEAVE][PROCESSING]",
                  {
                    phone:
                      identity.phone,

                    pnJid:
                      identity.pnJid,

                    lidJid:
                      identity.lidJid ||
                      null,

                    source:
                      identity.source,

                    messageId:
                      message
                        ?.key
                        ?.id ||
                      null,
                  }
                );

                /* =============================================
                   LEAVE WHATSAPP SERVICE

                   IMPORTANT:

                   Parser is NOT inside baileysClient.js.

                   Parser stays inside:

                   leave.whatsapp.service.js

                   It handles:
                   - employee code
                   - employee name
                   - leave type
                   - date
                   - duration
                   - reason
                   - User.whatsappNumber
                   - Employee lookup
                   - createLeaveRequest()
                   - private employee response
                   - manager approval WhatsApp
                ============================================= */

                const leaveResult =
                  await handleIncomingLeaveMessage({
                    jid,

                    senderJid:
                      identity.pnJid,

                    senderPhone:
                      identity.phone,

                    senderLid:
                      identity.lidJid ||
                      "",

                    senderIdentitySource:
                      identity.source,

                    messageId:
                      message
                        ?.key
                        ?.id ||
                      "",

                    text:
                      normalizedText,
                  });

                console.log(
                  "[BAILEYS][LEAVE][RESULT]",
                  leaveResult ||
                    null
                );

                /*
                 * IMPORTANT:
                 *
                 * DO NOT send result.reply into Leave group.
                 *
                 * Leave service handles private employee
                 * success/error notification itself.
                 */

                continue;
              }
            } catch (
              messageError
            ) {
              /* =================================================
                 PER-MESSAGE ERROR BOUNDARY

                 One bad WhatsApp message must never kill the
                 complete Baileys listener.
              ================================================= */

              const fallbackJid =
                String(
                  message
                    ?.key
                    ?.remoteJid ||
                  ""
                ).trim();

              const configuredMprGroup =
                String(
                  process.env
                    .WHATSAPP_MPR_GROUP_ID ||
                  ""
                ).trim();

              const configuredLeaveGroup =
                String(
                  process.env
                    .WHATSAPP_LEAVE_GROUP_ID ||
                  ""
                ).trim();

              /* =================================================
                 DETERMINE WHICH COMMAND FAILED

                 Required when both features use same group.
              ================================================= */

              const fallbackContent =
                message
                  ?.message ||
                {};

              const fallbackText =
                fallbackContent
                  .conversation ||
                fallbackContent
                  .extendedTextMessage
                  ?.text ||
                fallbackContent
                  .imageMessage
                  ?.caption ||
                fallbackContent
                  .videoMessage
                  ?.caption ||
                "";

              const fallbackNormalizedText =
                String(
                  fallbackText ||
                    ""
                ).trim();

              const failedMprCommand =
                /^MANPOWER REQUEST\b/i
                  .test(
                    fallbackNormalizedText
                  );

              const failedLeaveCommand =
                /^(LEAVE REQUEST|LEAVE APPLY|APPLY LEAVE)\b/i
                  .test(
                    fallbackNormalizedText
                  );

              /* =================================================
                 MANPOWER ERROR

                 Preserve existing Manpower group behavior.
              ================================================= */

              if (
                fallbackJid &&
                fallbackJid ===
                  configuredMprGroup &&
                failedMprCommand
              ) {
                console.error(
                  "WHATSAPP MPR LISTENER ERROR =>",
                  messageError
                    ?.stack ||
                  messageError
                    ?.message ||
                  messageError
                );

                try {
                  await newSock
                    .sendMessage(
                      fallbackJid,
                      {
                        text:
                          "❌ *Manpower Request could not be processed.*\n\n" +
                          "An unexpected system error occurred.\n\n" +
                          "Please try again. If the issue continues, contact the SE-RMS administrator.",
                      },
                      {
                        quoted:
                          message,
                      }
                    );
                } catch (
                  replyError
                ) {
                  console.error(
                    "[MPR][WHATSAPP][ERROR_REPLY_FAILED] =>",
                    replyError
                      ?.message ||
                    replyError
                  );
                }

                continue;
              }

              /* =================================================
                 LEAVE ERROR

                 Never send Leave system errors to group.

                 If real PN can still be resolved safely,
                 send the unexpected-error message privately.
              ================================================= */

              if (
                fallbackJid &&
                fallbackJid ===
                  configuredLeaveGroup &&
                failedLeaveCommand
              ) {
                console.error(
                  "WHATSAPP LEAVE LISTENER ERROR =>",
                  messageError
                    ?.stack ||
                  messageError
                    ?.message ||
                  messageError
                );

                try {
                  const participant =
                    message
                      ?.key
                      ?.participant ||
                    "";

                  const participantAlt =
                    message
                      ?.key
                      ?.participantAlt ||
                    "";

                  const identity =
                    await resolveGroupParticipantPhone({
                      socket:
                        newSock,

                      groupJid:
                        fallbackJid,

                      participant,

                      participantAlt,
                    });

                  if (
                    identity.resolved &&
                    identity.pnJid
                  ) {
                    await newSock
                      .sendMessage(
                        identity.pnJid,
                        {
                          text:
                            "❌ Your leave request could not be processed due to a system issue.\n\n" +
                            "Please try again. If the issue continues, contact the SE-RMS administrator.",
                        }
                      );
                  }
                } catch (
                  replyError
                ) {
                  console.error(
                    "[LEAVE][WHATSAPP][PRIVATE_ERROR_REPLY_FAILED] =>",
                    replyError
                      ?.message ||
                    replyError
                  );
                }

                continue;
              }

              /* =================================================
                 UNKNOWN MESSAGE ERROR
              ================================================= */

              console.error(
                "[BAILEYS][MESSAGE_PROCESSING_ERROR] =>",
                messageError
                  ?.stack ||
                messageError
                  ?.message ||
                messageError
              );
            }
          }
        }
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

            try {
  const groups =
    await newSock
      .groupFetchAllParticipating();

  console.log(
    "\n========== WHATSAPP GROUPS =========="
  );

  Object.values(
    groups
  ).forEach(
    (
      group
    ) => {
      console.log(
        `${group.subject} => ${group.id}`
      );
    }
  );

  console.log(
    "=====================================\n"
  );
} catch (
  error
) {
  console.error(
    "WHATSAPP GROUP LIST ERROR =>",
    error.message
  );
}

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
    text,
    options = {}
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

        mentions:
          Array.isArray(
            options.mentions
          )
            ? options.mentions
            : [],
      }
    );
}

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
   LIST WHATSAPP GROUPS

   Temporary helper for finding WHATSAPP_MPR_GROUP_ID.
========================================================= */

const getWhatsAppGroups =
  async () => {
    const currentSock =
      getBaileysSocket();

    if (
      !currentSock
    ) {
      throw new Error(
        "SE-RMS WhatsApp is not connected."
      );
    }

    const groups =
      await currentSock
        .groupFetchAllParticipating();

    return Object.values(
      groups
    ).map(
      (
        group
      ) => ({
        id:
          group.id,

        name:
          group.subject,

        participants:
          Array.isArray(
            group.participants
          )
            ? group.participants.length
            : 0,
      })
    );
  };

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

  getWhatsAppGroups,

  normalizePhoneJid,

  disconnectBaileys,

  logoutBaileys,
};
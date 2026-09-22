const {
  BiometricDevice,
} =
  require(
    "./biometricDevice.model"
  );

/* =========================================================
   ERROR
========================================================= */

const createError =
  (
    message,
    statusCode = 400
  ) => {
    const error =
      new Error(
        message
      );

    error.statusCode =
      statusCode;

    return error;
  };

/* =========================================================
   NORMALIZE
========================================================= */

const normalizeText =
  (
    value
  ) => {
    return String(
      value ??
        ""
    ).trim();
  };

const normalizeUpper =
  (
    value
  ) => {
    return normalizeText(
      value
    ).toUpperCase();
  };

/* =========================================================
   FIND DEVICE
========================================================= */

const findDevice =
  async ({
    deviceId = null,
    externalDeviceId = "",
    serialNumber = "",
    code = "",
    provider = "",
  } = {}) => {
    const conditions =
      [];

    if (
      deviceId
    ) {
      conditions.push({
        _id:
          deviceId,
      });
    }

    if (
      normalizeText(
        externalDeviceId
      )
    ) {
      conditions.push({
        externalDeviceId:
          normalizeText(
            externalDeviceId
          ),
      });
    }

    if (
      normalizeText(
        serialNumber
      )
    ) {
      conditions.push({
        serialNumber:
          normalizeText(
            serialNumber
          ),
      });
    }

    if (
      normalizeText(
        code
      )
    ) {
      conditions.push({
        code:
          normalizeUpper(
            code
          ),
      });
    }

    if (
      !conditions.length
    ) {
      return null;
    }

    const query = {
      $or:
        conditions,
    };

    if (
      normalizeText(
        provider
      )
    ) {
      query.provider =
        normalizeUpper(
          provider
        );
    }

    return BiometricDevice.findOne(
      query
    );
  };

/* =========================================================
   REQUIRE DEVICE
========================================================= */

const requireDevice =
  async (
    identity = {}
  ) => {
    const device =
      await findDevice(
        identity
      );

    if (
      !device
    ) {
      throw createError(
        "Biometric device is not registered in SE-RMS.",
        404
      );
    }

    if (
      device.enabled ===
      false
    ) {
      throw createError(
        `Biometric device ${device.code} is disabled.`,
        403
      );
    }

    if (
      device.status ===
      "INACTIVE"
    ) {
      throw createError(
        `Biometric device ${device.code} is inactive.`,
        403
      );
    }

    return device;
  };

/* =========================================================
   MARK HEARTBEAT / DEVICE CONTACT

   Any valid request from the registered physical device
   proves that SE-RMS communicated with it.

   This includes:
   - heartbeat
   - command polling
   - other verified FKWeb requests
========================================================= */

const markHeartbeat =
  async (
    device,
    {
      ipAddress = "",
    } = {}
  ) => {
    const now =
      new Date();

    device.isOnline =
      true;

    device.lastHeartbeatAt =
      now;

    device.lastConnectionAt =
      now;

    /*
     * IP is informational only.
     *
     * Never use IP as device identity.
     */
    if (
      ipAddress &&
      !device.ipAddress &&
      device.connectionMode ===
        "POLL"
    ) {
      device.ipAddress =
        normalizeText(
          ipAddress
        );
    }

    device.lastConnectionError =
      "";

    await device.save();

    return device;
  };

/* =========================================================
   MARK PUNCH RECEIVED
========================================================= */

const markPunchReceived =
  async (
    device,
    punchTime = new Date()
  ) => {
    const now =
      new Date();

    device.lastPunchReceivedAt =
      punchTime;

    device.lastConnectionAt =
      now;

    device.lastSuccessfulSyncAt =
      now;

    device.lastSyncStatus =
      "SUCCESS";

    device.isOnline =
      true;

    device.lastConnectionError =
      "";

    await device.save();

    return device;
  };

/* =========================================================
   MARK SYNC START
========================================================= */

const markSyncStarted =
  async (
    device,
    message =
      "Attendance synchronization started."
  ) => {
    device.lastSyncAt =
      new Date();

    device.lastSyncStatus =
      "RUNNING";

    device.lastSyncMessage =
      message;

    await device.save();

    return device;
  };

/* =========================================================
   MARK SYNC SUCCESS
========================================================= */

const markSyncSuccess =
  async (
    device,
    {
      message =
        "Attendance synchronization completed.",

      cursorAt =
        null,

      stats =
        {},
    } = {}
  ) => {
    const now =
      new Date();

    device.lastSyncAt =
      now;

    device.lastSuccessfulSyncAt =
      now;

    device.lastSyncStatus =
      "SUCCESS";

    device.lastSyncMessage =
      message;

    device.lastConnectionError =
      "";

    if (
      cursorAt
    ) {
      device.syncCursorAt =
        cursorAt;
    }

    device.lastSyncStats = {
      received:
        Number(
          stats.received ||
            0
        ),

      inserted:
        Number(
          stats.inserted ||
            0
        ),

      duplicates:
        Number(
          stats.duplicates ||
            0
        ),

      mapped:
        Number(
          stats.mapped ||
            0
        ),

      unmapped:
        Number(
          stats.unmapped ||
            0
        ),

      errors:
        Number(
          stats.errors ||
            0
        ),
    };

    await device.save();

    return device;
  };

/* =========================================================
   MARK SYNC FAILURE
========================================================= */

const markSyncFailure =
  async (
    device,
    error
  ) => {
    const message =
      String(
        error?.message ||
          error ||
          "Attendance synchronization failed."
      )
        .trim()
        .slice(
          0,
          2000
        );

    device.lastSyncAt =
      new Date();

    device.lastSyncStatus =
      "FAILED";

    device.lastSyncMessage =
      message;

    device.lastConnectionError =
      message;

    await device.save();

    return device;
  };

/* =========================================================
   DEVICE HEALTH

   "isOnline" stored in Mongo is only the last known state.

   Actual current online status is calculated from
   lastConnectionAt / lastHeartbeatAt.

   Default:
   device is considered online when SE-RMS has heard from it
   during the last 10 minutes.
========================================================= */

const getDeviceHealth =
  async ({
    externalDeviceId = "",
    serialNumber = "",
    code = "",
    provider = "",
    onlineThresholdMinutes = 10,
  } = {}) => {
    const device =
      await findDevice({
        externalDeviceId,
        serialNumber,
        code,
        provider,
      });

    if (
      !device
    ) {
      return {
        registered:
          false,

        online:
          false,

        device:
          null,
      };
    }

    const now =
      new Date();

    const lastSeenAt =
      device.lastConnectionAt ||
      device.lastHeartbeatAt ||
      device.lastPunchReceivedAt ||
      null;

    let secondsSinceLastSeen =
      null;

    if (
      lastSeenAt
    ) {
      secondsSinceLastSeen =
        Math.max(
          0,
          Math.floor(
            (
              now.getTime() -
              new Date(
                lastSeenAt
              ).getTime()
            ) /
              1000
          )
        );
    }

    const thresholdSeconds =
      Math.max(
        1,
        Number(
          onlineThresholdMinutes ||
            10
        )
      ) *
      60;

    const online =
      secondsSinceLastSeen !==
        null &&
      secondsSinceLastSeen <=
        thresholdSeconds;

    /*
     * Correct stale runtime flag when necessary.
     */
    if (
      device.isOnline !==
      online
    ) {
      device.isOnline =
        online;

      await device.save();
    }

    return {
      registered:
        true,

      online,

      secondsSinceLastSeen,

      device,
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  findDevice,

  requireDevice,

  markHeartbeat,

  markPunchReceived,

  markSyncStarted,

  markSyncSuccess,

  markSyncFailure,

  getDeviceHealth,
};
const {
  requireDevice,
  markHeartbeat,
  markPunchReceived,
} =
  require(
    "./biometricDevice.service"
  );

const {
  normalizeBiometricCode,
  ingestRawPunch,
  upsertMachineUser,
} =
  require(
    "./biometricIngestion.service"
  );

/* =========================================================
   PROVIDER
========================================================= */

const FKWEB_PROVIDER =
  "REALTIME";

const FKWEB_INTEGRATION_TYPE =
  "FKWEB";

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

/* =========================================================
   RESOLVE DEVICE
========================================================= */

const resolveFkWebDevice =
  async (
    event
  ) => {
    const externalDeviceId =
      normalizeText(
        event?.deviceId
      );

    if (
      !externalDeviceId
    ) {
      throw new Error(
        "FKWeb device identifier is missing."
      );
    }

    return requireDevice({
      provider:
        FKWEB_PROVIDER,

      externalDeviceId,

      serialNumber:
        externalDeviceId,
    });
  };

/* =========================================================
   PROCESS HEARTBEAT
========================================================= */

const processHeartbeat =
  async (
    event,
    requestMeta = {}
  ) => {
    const device =
      await resolveFkWebDevice(
        event
      );

    await markHeartbeat(
      device,
      {
        ipAddress:
          requestMeta.ipAddress ||
          "",
      }
    );

    return device;
  };

/* =========================================================
   PROCESS ENROLLMENT
========================================================= */

const processEnrollment =
  async (
    event
  ) => {
    const device =
      await resolveFkWebDevice(
        event
      );

    const biometricCode =
      normalizeBiometricCode(
        event.employeeCode
      );

    if (
      !biometricCode
    ) {
      return null;
    }

    return upsertMachineUser({
      device,

      biometricCode,

      machineUserId:
        biometricCode,

      employeeName:
        normalizeText(
          event.employeeName ||
          event.payload
            ?.user_name ||
          event.payload
            ?.name
        ),

      rawPayload: {
        protocol:
          event.protocol ||
          "FKWEB",

        requestCode:
          event.requestCode ||
          "",

        transactionId:
          event.transactionId ||
          "",

        payload:
          event.payload ||
          null,
      },
    });
  };

/* =========================================================
   PROCESS ONE PUNCH
========================================================= */

const processPunch =
  async (
    event,
    {
      source =
        "LIVE",

      syncBatchId =
        null,
    } = {}
  ) => {
    const device =
      await resolveFkWebDevice(
        event
      );

    if (
      !event.employeeCode ||
      !event.punchTime
    ) {
      throw new Error(
        "FKWeb punch requires employeeCode and punchTime."
      );
    }

    const result =
      await ingestRawPunch({
        device,

        biometricCode:
          event.employeeCode,

        biometricEmployeeName:
          event.employeeName ||
          event.payload
            ?.user_name ||
          event.payload
            ?.name ||
          "",

        punchTime:
          event.punchTime,

        source,

        workMode:
          "OFFICE",

        machineRecordId:
          event.recordId ||
          "",

        machineUserId:
          event.employeeCode,

        machineVerifyMode:
          event.verifyMode ||
          "",

        machineInOutMode:
          event.ioMode ||
          "",

        syncBatchId,

        rawPayload: {
          protocol:
            event.protocol ||
            "FKWEB",

          requestCode:
            event.requestCode ||
            "",

          transactionId:
            event.transactionId ||
            "",

          payload:
            event.payload ||
            null,
        },
      });

    await markPunchReceived(
      device,
      new Date(
        event.punchTime
      )
    );

    return result;
  };

/* =========================================================
   PROCESS HISTORY

   Parser must already have converted vendor records into
   normalized events.

   Example normalizedHistoryEvent:

   {
     deviceId,
     employeeCode,
     employeeName,
     punchTime,
     recordId,
     verifyMode,
     ioMode,
     payload
   }
========================================================= */

const processHistoricalPunches =
  async ({
    deviceId,
    records = [],
    syncBatchId,
  }) => {
    const stats = {
      received:
        records.length,

      inserted:
        0,

      duplicates:
        0,

      mapped:
        0,

      unmapped:
        0,

      errors:
        0,
    };

    for (
      const record of records
    ) {
      try {
        const result =
          await processPunch(
            {
              ...record,

              deviceId:
                record.deviceId ||
                deviceId,
            },
            {
              source:
                "HISTORICAL_SYNC",

              syncBatchId,
            }
          );

        if (
          result.inserted
        ) {
          stats.inserted +=
            1;
        } else {
          stats.duplicates +=
            1;
        }

        if (
          result.mapped
        ) {
          stats.mapped +=
            1;
        } else {
          stats.unmapped +=
            1;
        }
      } catch (
        error
      ) {
        stats.errors +=
          1;

        console.error(
          "FKWeb historical punch failed:",
          error
        );
      }
    }

    return stats;
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  FKWEB_PROVIDER,

  FKWEB_INTEGRATION_TYPE,

  resolveFkWebDevice,

  processHeartbeat,

  processEnrollment,

  processPunch,

  processHistoricalPunches,
};
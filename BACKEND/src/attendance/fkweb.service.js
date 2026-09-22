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
   HEARTBEAT
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
   ENROLLMENT
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
   ONE PUNCH
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

    const biometricCode =
      normalizeBiometricCode(
        event.employeeCode
      );

    if (
      !biometricCode ||
      !event.punchTime
    ) {
      throw new Error(
        "FKWeb punch requires employeeCode and punchTime."
      );
    }

    const punchTime =
      event.punchTime instanceof
      Date
        ? event.punchTime
        : new Date(
            event.punchTime
          );

    if (
      Number.isNaN(
        punchTime.getTime()
      )
    ) {
      throw new Error(
        "FKWeb punchTime is invalid."
      );
    }

    const result =
      await ingestRawPunch({
        device,

        biometricCode,

        biometricEmployeeName:
          normalizeText(
            event.employeeName ||
            event.payload
              ?.user_name ||
            event.payload
              ?.name
          ),

        punchTime,

        source,

        workMode:
          "OFFICE",

        machineRecordId:
          normalizeText(
            event.recordId
          ),

        machineUserId:
          biometricCode,

        machineVerifyMode:
          normalizeText(
            event.verifyMode
          ),

        machineInOutMode:
          normalizeText(
            event.ioMode
          ),

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
      punchTime
    );

    return result;
  };

/* =========================================================
   HISTORICAL PUNCHES

   IMPORTANT:

   Historical records enter through EXACTLY the same
   biometric ingestion pipeline as live records.

   We do not write directly to Attendance.

   ingestRawPunch:
      ↓
   RawAttendancePunch
      ↓
   employee mapping
      ↓
   attendance processor
      ↓
   Attendance
========================================================= */

const processHistoricalPunches =
  async ({
    deviceId,

    records =
      [],

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
        if (
          !record ||
          !record.employeeCode ||
          !record.punchTime
        ) {
          stats.errors +=
            1;

          continue;
        }

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

              syncBatchId:
                syncBatchId ||
                null,
            }
          );

        if (
          result?.inserted
        ) {
          stats.inserted +=
            1;
        } else {
          stats.duplicates +=
            1;
        }

        if (
          result?.mapped
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
          "[FKWEB] Historical punch processing failed:",
          {
            deviceId:
              record?.deviceId ||
              deviceId,

            employeeCode:
              record?.employeeCode ||
              "",

            punchTime:
              record?.punchTime ||
              "",

            message:
              error?.message ||
              String(
                error
              ),
          }
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
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
   VALID DATE
========================================================= */

const normalizePunchTime =
  (
    value
  ) => {
    if (
      value instanceof
      Date
    ) {
      if (
        Number.isNaN(
          value.getTime()
        )
      ) {
        return null;
      }

      return value;
    }

    if (
      value ===
        undefined ||
      value ===
        null ||
      normalizeText(
        value
      ) ===
        ""
    ) {
      return null;
    }

    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null;
    }

    return date;
  };

/* =========================================================
   RESOLVE DEVICE

   Device Master remains authoritative.

   We DO NOT automatically create unknown physical devices.

   A request from an unregistered FKWeb machine must fail
   device resolution rather than silently creating an
   untrusted production device.
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
          normalizeText(
            requestMeta
              ?.ipAddress
          ),
      }
    );

    return device;
  };

/* =========================================================
   ENROLLMENT / MACHINE USER DIRECTORY

   Machine users remain independent of ERP Employee records.

   An operator may exist on the biometric machine without
   having an ERP login or Employee record.

   Later mapping can connect the same biometric code to an
   Employee without losing historical raw punches.
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
        event?.employeeCode
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
          event?.employeeName ||
          event?.payload
            ?.user_name ||
          event?.payload
            ?.employee_name ||
          event?.payload
            ?.name
        ),

      rawPayload: {
        protocol:
          normalizeText(
            event?.protocol
          ) ||
          "FKWEB",

        requestCode:
          normalizeText(
            event?.requestCode
          ),

        transactionId:
          normalizeText(
            event?.transactionId
          ),

        payload:
          event?.payload ??
          null,
      },
    });
  };

/* =========================================================
   ONE PUNCH

   This is the single canonical entry point for both:

      LIVE
      HISTORICAL_SYNC

   Nothing in FKWeb writes directly to Attendance.

   FKWeb
      ↓
   RawAttendancePunch
      ↓
   mapping / processor
      ↓
   Attendance
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
        event?.employeeCode
      );

    if (
      !biometricCode
    ) {
      throw new Error(
        "FKWeb punch requires employeeCode."
      );
    }

    const punchTime =
      normalizePunchTime(
        event?.punchTime
      );

    if (
      !punchTime
    ) {
      throw new Error(
        "FKWeb punch requires a valid punchTime."
      );
    }

    const normalizedSource =
      normalizeText(
        source
      ).toUpperCase() ||
      "LIVE";

    const result =
      await ingestRawPunch({
        device,

        biometricCode,

        biometricEmployeeName:
          normalizeText(
            event?.employeeName ||
            event?.payload
              ?.user_name ||
            event?.payload
              ?.employee_name ||
            event?.payload
              ?.name
          ),

        punchTime,

        source:
          normalizedSource,

        workMode:
          "OFFICE",

        machineRecordId:
          normalizeText(
            event?.recordId
          ),

        machineUserId:
          biometricCode,

        machineVerifyMode:
          normalizeText(
            event?.verifyMode
          ),

        machineInOutMode:
          normalizeText(
            event?.ioMode
          ),

        syncBatchId:
          syncBatchId ||
          null,

        rawPayload: {
          protocol:
            normalizeText(
              event?.protocol
            ) ||
            "FKWEB",

          requestCode:
            normalizeText(
              event?.requestCode
            ),

          transactionId:
            normalizeText(
              event?.transactionId
            ),

          payload:
            event?.payload ??
            null,
        },
      });

    /*
     * lastPunchReceivedAt represents actual device punch
     * activity. It is updated even when ingestRawPunch detects
     * a duplicate because the device really communicated the
     * punch to SE-RMS.
     */

    await markPunchReceived(
      device,
      punchTime
    );

    return result;
  };

/* =========================================================
   HISTORICAL PUNCHES

   Historical records use EXACTLY the same ingestion pipeline
   as live punches.

   This gives us:

   - one RawAttendancePunch model
   - one duplicate strategy
   - one Employee mapping strategy
   - one attendance processor
   - one audit trail
========================================================= */

const processHistoricalPunches =
  async ({
    deviceId,

    records =
      [],

    syncBatchId =
      null,
  }) => {
    const safeRecords =
      Array.isArray(
        records
      )
        ? records
        : [];

    const normalizedDeviceId =
      normalizeText(
        deviceId
      );

    const stats = {
      received:
        safeRecords.length,

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
      const record of
      safeRecords
    ) {
      try {
        if (
          !record
        ) {
          stats.errors +=
            1;

          continue;
        }

        const employeeCode =
          normalizeBiometricCode(
            record.employeeCode
          );

        const punchTime =
          normalizePunchTime(
            record.punchTime
          );

        if (
          !employeeCode ||
          !punchTime
        ) {
          stats.errors +=
            1;

          console.warn(
            "[FKWEB] Historical record skipped because required punch data is missing.",
            {
              deviceId:
                normalizeText(
                  record.deviceId
                ) ||
                normalizedDeviceId,

              employeeCode:
                employeeCode ||
                "",

              punchTime:
                record.punchTime ||
                null,
            }
          );

          continue;
        }

        const result =
          await processPunch(
            {
              ...record,

              deviceId:
                normalizeText(
                  record.deviceId
                ) ||
                normalizedDeviceId,

              employeeCode,

              punchTime,
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
              normalizeText(
                record
                  ?.deviceId
              ) ||
              normalizedDeviceId,

            employeeCode:
              normalizeText(
                record
                  ?.employeeCode
              ),

            punchTime:
              record
                ?.punchTime ||
              null,

            syncBatchId:
              syncBatchId ||
              null,

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
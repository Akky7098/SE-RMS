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

  const {
  processRawPunch,
} =
  require(
    "./attendance.service"
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

    /*
     * Preserve the employee name supplied by the
     * biometric machine.
     *
     * This is especially useful for unmapped punches
     * because HR/Admin can see both:
     *
     * biometricCode
     * biometricEmployeeName
     */
    const biometricEmployeeName =
      normalizeText(
        event?.employeeName ||
        event?.payload
          ?.user_name ||
        event?.payload
          ?.employee_name ||
        event?.payload
          ?.name
      );

    /*
     * STEP 1:
     *
     * Always preserve the raw biometric punch first.
     *
     * RawAttendancePunch remains the permanent machine
     * evidence even if attendance calculation fails later.
     */
    const result =
      await ingestRawPunch({
        device,

        biometricCode,

        biometricEmployeeName,

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
     * STEP 2:
     *
     * The machine successfully communicated this punch
     * to SE-RMS.
     *
     * Keep device activity tracking independent from
     * attendance processing.
     */
    await markPunchReceived(
      device,
      punchTime
    );

    /*
     * STEP 3:
     *
     * If Employee Master mapping exists, immediately send
     * this raw punch through the canonical attendance
     * processor.
     *
     * This is the missing link that previously caused:
     *
     * processingStatus: "PENDING"
     * processingAttempts: 0
     *
     * to remain indefinitely.
     */
    if (
      result?.mapped &&
      result?.punch?._id
    ) {
      try {
        const processingResult =
          await processRawPunch(
            result.punch._id
          );

        return {
          ...result,

          attendanceProcessed:
            true,

          attendance:
            processingResult
              ?.attendance ||
            null,

          businessDate:
            processingResult
              ?.businessDate ||
            null,

          processingStatus:
            processingResult
              ?.punch
              ?.processingStatus ||
            "PROCESSED",
        };
      } catch (
        error
      ) {
        /*
         * IMPORTANT:
         *
         * Do NOT throw away the machine punch.
         *
         * ingestRawPunch() has already stored the raw
         * machine evidence.
         *
         * processRawPunch() records the processing failure
         * on RawAttendancePunch so it can later be retried
         * by processPendingPunches().
         */
        console.error(
          "[FKWEB] Attendance processing failed after raw punch ingestion:",
          {
            rawPunchId:
              result?.punch?._id ||
              null,

            biometricCode,

            biometricEmployeeName,

            punchTime,

            message:
              error?.message ||
              String(
                error
              ),
          }
        );

        return {
          ...result,

          attendanceProcessed:
            false,

          attendanceProcessingError:
            error?.message ||
            String(
              error
            ),
        };
      }
    }

    /*
     * STEP 4:
     *
     * No Employee Master mapping exists yet.
     *
     * Keep the raw punch as UNMAPPED. Do not create false
     * Attendance data.
     *
     * biometricCode + biometricEmployeeName remain
     * available for mapping/admin visibility.
     */
    return {
      ...result,

      attendanceProcessed:
        false,

      attendanceProcessingReason:
        result?.mapped
          ? "RAW_PUNCH_ID_MISSING"
          : "UNMAPPED_EMPLOYEE",
    };
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
const crypto =
  require(
    "crypto"
  );

const RawAttendancePunchModule =
  require(
    "./RawAttendancePunch.model"
  );

const BiometricMachineUserModule =
  require(
    "./biometricMachineUser.model"
  );

const employeeModule =
  require(
    "../employee/employee.model"
  );

/* =========================================================
   MODEL COMPATIBILITY

   Supports either:

   module.exports = Model

   OR

   module.exports = {
     RawAttendancePunch
   }
========================================================= */

const RawAttendancePunch =
  RawAttendancePunchModule
    .RawAttendancePunch ||
  RawAttendancePunchModule
    .default ||
  RawAttendancePunchModule;

const BiometricMachineUser =
  BiometricMachineUserModule
    .BiometricMachineUser ||
  BiometricMachineUserModule
    .default ||
  BiometricMachineUserModule;

const Employee =
  employeeModule.Employee ||
  employeeModule.default ||
  employeeModule;

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
   NORMALIZE BIOMETRIC CODE

   IMPORTANT:

   Do NOT convert every code to Number.

   eSSL IDs include values such as:

   SE1338
   CS1257

   Numeric FKWeb IDs such as "0007" are normalized to "7"
   only when purely numeric.
========================================================= */

const normalizeBiometricCode =
  (
    value
  ) => {
    const text =
      normalizeText(
        value
      );

    if (
      !text
    ) {
      return "";
    }

    if (
      /^\d+$/.test(
        text
      )
    ) {
      return String(
        Number(
          text
        )
      );
    }

    return text
      .toUpperCase();
  };

/* =========================================================
   FIND EMPLOYEE

   Authoritative mapping:
   Employee.biometricCode

   DO NOT fall back to employeeCode in production.

   This prevents accidental mapping when the two identifiers
   happen to look alike.
========================================================= */

const findEmployeeByBiometricCode =
  async (
    biometricCode
  ) => {
    const code =
      normalizeBiometricCode(
        biometricCode
      );

    if (
      !code
    ) {
      return null;
    }

    /*
     * Primary authoritative mapping:
     * Employee.biometricCode
     *
     * We intentionally do NOT use employeeCode
     * as an automatic fallback because employeeCode
     * and biometricCode are separate business identifiers.
     */
    const employee =
      await Employee.findOne({
        biometricCode:
          code,

        status: {
          $ne:
            "EXITED",
        },
      }).lean();

    return (
      employee ||
      null
    );
  };

/* =========================================================
   EMPLOYEE SNAPSHOT
========================================================= */

const getEmployeeSnapshot =
  (
    employee
  ) => {
    if (
      !employee
    ) {
      return {};
    }

    return {
      employeeId:
        employee._id,

      userId:
        employee.user ||
        null,

      companyCode:
        employee.companyCode ||
        null,

      orgUnitCode:
        employee.orgUnitCode ||
        null,

      departmentId:
        employee.department ||
        null,
    };
  };

/* =========================================================
   EXTERNAL EVENT KEY
========================================================= */

const buildExternalEventKey =
  ({
    provider,
    deviceCode,
    externalDeviceId,
    machineRecordId,
    biometricCode,
    punchTime,
    machineInOutMode,
    machineVerifyMode,
  }) => {
    const components = [
      normalizeUpper(
        provider
      ),

      normalizeUpper(
        deviceCode
      ),

      normalizeText(
        externalDeviceId
      ),

      normalizeText(
        machineRecordId
      ),

      normalizeBiometricCode(
        biometricCode
      ),

      new Date(
        punchTime
      ).toISOString(),

      normalizeText(
        machineInOutMode
      ),

      normalizeText(
        machineVerifyMode
      ),
    ];

    return crypto
      .createHash(
        "sha256"
      )
      .update(
        components.join(
          "|"
        )
      )
      .digest(
        "hex"
      );
  };

/* =========================================================
   UPSERT MACHINE USER

   Device directory != Employee Master.

   Device users may exist before they are mapped to SE-RMS.
========================================================= */

const upsertMachineUser =
  async ({
    device,
    biometricCode,
    machineUserId = "",
    employeeName = "",
    rawPayload = null,
  }) => {
    if (
      !device?._id
    ) {
      throw new Error(
        "Device is required."
      );
    }

    const code =
      normalizeBiometricCode(
        biometricCode
      );

    if (
      !code
    ) {
      return null;
    }

    const employee =
      await findEmployeeByBiometricCode(
        code
      );

    const now =
      new Date();

    const update = {
      attendanceDeviceId:
        device._id,

      deviceCode:
        device.code,

      provider:
        device.provider,

      biometricCode:
        code,

      machineUserId:
        normalizeText(
          machineUserId
        ),

      machineEmployeeName:
        normalizeText(
          employeeName
        ),

      employeeId:
        employee?._id ||
        null,

      mapped:
        Boolean(
          employee
        ),

      lastSeenAt:
        now,

      activeOnDevice:
        true,

      rawPayload,
    };

    if (
      employee
    ) {
      update.mappedAt =
        now;
    }

    return BiometricMachineUser.findOneAndUpdate(
      {
        attendanceDeviceId:
          device._id,

        biometricCode:
          code,
      },

      {
        $set:
          update,

        $setOnInsert: {
          firstSeenAt:
            now,
        },
      },

      {
        upsert:
          true,

        new:
          true,

        setDefaultsOnInsert:
          true,
      }
    );
  };

/* =========================================================
   INGEST RAW PUNCH

   This method does NOT reject historical data.

   Live and 3-month historical punches enter the exact
   same collection.

   It does NOT directly calculate Attendance.
========================================================= */

const ingestRawPunch =
  async ({
    device,

    biometricCode,

    biometricEmployeeName = "",

    punchTime,

    source,

    workMode =
      "OFFICE",

    machineRecordId = "",

    machineUserId = "",

    machineVerifyMode = "",

    machineInOutMode = "",

    syncBatchId = null,

    rawPayload = null,

    location = null,
  }) => {
    if (
      !device?._id
    ) {
      throw new Error(
        "Registered biometric device is required."
      );
    }

    const code =
      normalizeBiometricCode(
        biometricCode
      );

    if (
      !code
    ) {
      throw new Error(
        "biometricCode is required."
      );
    }

    const actualPunchTime =
      new Date(
        punchTime
      );

    if (
      Number.isNaN(
        actualPunchTime.getTime()
      )
    ) {
      throw new Error(
        "Invalid biometric punch time."
      );
    }

    /*
     * =====================================================
     * RESOLVE EMPLOYEE DIRECTLY FROM EMPLOYEE MASTER
     * =====================================================
     *
     * Employee.biometricCode is authoritative.
     *
     * Example:
     *
     * Employee.biometricCode = SE1325
     * Machine biometricCode   = SE1325
     *
     * => automatically maps to that employee.
     */
    const employee =
      await findEmployeeByBiometricCode(
        code
      );

    const externalEventKey =
      buildExternalEventKey({
        provider:
          device.provider,

        deviceCode:
          device.code,

        externalDeviceId:
          device.externalDeviceId ||
          device.serialNumber ||
          "",

        machineRecordId,

        biometricCode:
          code,

        punchTime:
          actualPunchTime,

        machineInOutMode,

        machineVerifyMode,
      });

    const employeeSnapshot =
      getEmployeeSnapshot(
        employee
      );

    const now =
      new Date();

    const insertDocument = {
      attendanceDeviceId:
        device._id,

      deviceCode:
        device.code,

      deviceSerialNumber:
        device.serialNumber ||
        device.externalDeviceId ||
        "",

      provider:
        device.provider,

      biometricCode:
        code,

      biometricEmployeeName:
        normalizeText(
          biometricEmployeeName
        ),

      employeeId:
        employee?._id ||
        null,

      userId:
        employee?.user ||
        null,

      punchTime:
        actualPunchTime,

      /*
       * Shift/business-date processor
       * will calculate this.
       */
      businessDate:
        null,

      source,

      workMode,

      machineRecordId:
        normalizeText(
          machineRecordId
        ),

      machineUserId:
        normalizeText(
          machineUserId ||
          code
        ),

      machineVerifyMode:
        normalizeText(
          machineVerifyMode
        ),

      machineInOutMode:
        normalizeText(
          machineInOutMode
        ),

      companyCode:
        employeeSnapshot.companyCode ||
        null,

      organizationUnitId:
        null,

      orgUnitCode:
        employeeSnapshot.orgUnitCode ||
        null,

      departmentId:
        employeeSnapshot.departmentId ||
        null,

      officeId:
        device.officeId ||
        null,

      shiftId:
        null,

      location:
        location ||
        undefined,

      syncBatchId,

      externalEventKey,

      processingStatus:
        employee
          ? "PENDING"
          : "UNMAPPED",

      resolved:
        Boolean(
          employee
        ),

      processingAttempts:
        0,

      processingError:
        "",

      rawPayload,

      receivedAt:
        now,
    };

    try {
      /*
       * ===================================================
       * UPSERT RAW PUNCH
       * ===================================================
       *
       * IMPORTANT FIX:
       *
       * Previously everything was inside $setOnInsert.
       *
       * Therefore an existing UNMAPPED punch remained
       * UNMAPPED forever even after Employee Master had
       * the correct biometricCode.
       *
       * Now:
       *
       * 1. New punches are inserted normally.
       * 2. Existing punches are automatically repaired
       *    when Employee Master can resolve them.
       * 3. PROCESSED punches are NOT reset.
       */

      let existing =
        await RawAttendancePunch.findOne({
          externalEventKey,
        });

      let document;
      let wasInserted =
        false;

      if (
        !existing
      ) {
        try {
          document =
            await RawAttendancePunch.create(
              insertDocument
            );

          wasInserted =
            true;
        } catch (
          error
        ) {
          /*
           * Another simultaneous device request may
           * have inserted the exact same punch.
           */
          if (
            error?.code !==
            11000
          ) {
            throw error;
          }

          existing =
            await RawAttendancePunch.findOne({
              externalEventKey,
            });

          document =
            existing;
        }
      } else {
        document =
          existing;
      }

      /*
       * ===================================================
       * SELF-HEAL EXISTING UNMAPPED PUNCH
       * ===================================================
       */

      if (
        employee &&
        document &&
        document.processingStatus !==
          "PROCESSED" &&
        (
          !document.employeeId ||
          document.processingStatus ===
            "UNMAPPED"
        )
      ) {
        document =
          await RawAttendancePunch.findByIdAndUpdate(
            document._id,

            {
              $set: {
                employeeId:
                  employee._id,

                userId:
                  employee.user ||
                  null,

                companyCode:
                  employeeSnapshot.companyCode ||
                  null,

                orgUnitCode:
                  employeeSnapshot.orgUnitCode ||
                  null,

                departmentId:
                  employeeSnapshot.departmentId ||
                  null,

                officeId:
                  device.officeId ||
                  document.officeId ||
                  null,

                resolved:
                  true,

                processingStatus:
                  "PENDING",

                processingError:
                  "",
              },
            },

            {
              new:
                true,
            }
          );
      }

      /*
       * Keep machine directory synchronized separately.
       */
      await upsertMachineUser({
        device,

        biometricCode:
          code,

        machineUserId:
          machineUserId ||
          code,

        employeeName:
          biometricEmployeeName,

        rawPayload: {
          source:
            "PUNCH_DISCOVERY",

          lastPunchTime:
            actualPunchTime,
        },
      });

      return {
        punch:
          document,

        inserted:
          wasInserted,

        duplicate:
          !wasInserted,

        mapped:
          Boolean(
            document?.employeeId ||
            employee
          ),

        employeeId:
          document?.employeeId ||
          employee?._id ||
          null,
      };
    } catch (
      error
    ) {
      /*
       * Duplicate race fallback.
       */
      if (
        error?.code ===
        11000
      ) {
        let existing =
          await RawAttendancePunch.findOne({
            externalEventKey,
          });

        /*
         * Even in duplicate race condition,
         * repair an old UNMAPPED punch.
         */
        if (
          employee &&
          existing &&
          existing.processingStatus !==
            "PROCESSED" &&
          (
            !existing.employeeId ||
            existing.processingStatus ===
              "UNMAPPED"
          )
        ) {
          existing =
            await RawAttendancePunch.findByIdAndUpdate(
              existing._id,

              {
                $set: {
                  employeeId:
                    employee._id,

                  userId:
                    employee.user ||
                    null,

                  companyCode:
                    employeeSnapshot.companyCode ||
                    null,

                  orgUnitCode:
                    employeeSnapshot.orgUnitCode ||
                    null,

                  departmentId:
                    employeeSnapshot.departmentId ||
                    null,

                  officeId:
                    device.officeId ||
                    existing.officeId ||
                    null,

                  resolved:
                    true,

                  processingStatus:
                    "PENDING",

                  processingError:
                    "",
                },
              },

              {
                new:
                  true,
              }
            );
        }

        return {
          punch:
            existing,

          inserted:
            false,

          duplicate:
            true,

          mapped:
            Boolean(
              existing?.employeeId
            ),

          employeeId:
            existing?.employeeId ||
            null,
        };
      }

      throw error;
    }
  };

/* =========================================================
   REPROCESS UNMAPPED EMPLOYEE

   Called after HR maps Employee.biometricCode.

   It does not yet calculate final attendance.
   It prepares punches for the processor.
========================================================= */

const mapPendingPunchesForEmployee =
  async (
    employee
  ) => {
    if (
      !employee?._id ||
      !employee?.biometricCode
    ) {
      return {
        matched:
          0,
      };
    }

    const code =
      normalizeBiometricCode(
        employee.biometricCode
      );

    if (
      !code
    ) {
      return {
        matched:
          0,
      };
    }

    /*
     * =====================================================
     * REPAIR RAW PUNCH MAPPING
     * =====================================================
     *
     * Do NOT touch punches that have already successfully
     * reached PROCESSED.
     *
     * This repairs:
     *
     * UNMAPPED + employeeId null
     *
     * and any other not-yet-processed punch whose employee
     * mapping was missing.
     */
    const result =
      await RawAttendancePunch.updateMany(
        {
          biometricCode:
            code,

          processingStatus: {
            $in: [
              "UNMAPPED",
              "PENDING",
            ],
          },

          $or: [
            {
              employeeId:
                null,
            },

            {
              employeeId: {
                $exists:
                  false,
              },
            },
          ],
        },

        {
          $set: {
            employeeId:
              employee._id,

            userId:
              employee.user ||
              null,

            companyCode:
              employee.companyCode ||
              null,

            orgUnitCode:
              employee.orgUnitCode ||
              null,

            departmentId:
              employee.department ||
              null,

            resolved:
              true,

            processingStatus:
              "PENDING",

            processingError:
              "",
          },
        }
      );

    /*
     * =====================================================
     * REPAIR BIOMETRIC MACHINE USER DIRECTORY
     * =====================================================
     */

    await BiometricMachineUser.updateMany(
      {
        biometricCode:
          code,
      },

      {
        $set: {
          employeeId:
            employee._id,

          mapped:
            true,

          mappedAt:
            new Date(),
        },
      }
    );

    return {
      matched:
        result.modifiedCount ||
        0,
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  normalizeBiometricCode,

  findEmployeeByBiometricCode,

  upsertMachineUser,

  ingestRawPunch,

  mapPendingPunchesForEmployee,
};
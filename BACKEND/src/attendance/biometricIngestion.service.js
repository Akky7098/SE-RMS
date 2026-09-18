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

    return Employee.findOne({
      biometricCode:
        code,

      status: {
        $ne:
          "EXITED",
      },
    }).lean();
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
       * businessDate intentionally null here.

       * Shift/business-date processor sets this later.
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

      rawPayload,

      receivedAt:
        new Date(),
    };

    try {
      const punch =
        await RawAttendancePunch.findOneAndUpdate(
          {
            externalEventKey,
          },

          {
            $setOnInsert:
              insertDocument,
          },

          {
            upsert:
              true,

            new:
              true,

            setDefaultsOnInsert:
              true,

            rawResult:
              true,
          }
        );

      /*
       * Mongoose return shape varies depending on version when
       * rawResult/includeResultMetadata is used.

       * Normalize it.
       */
      const document =
        punch?.value ||
        punch;

      const wasInserted =
        Boolean(
          punch?.lastErrorObject
            ?.upserted
        );

      /*
       * Keep device directory updated independently.
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
            employee
          ),

        employeeId:
          employee?._id ||
          null,
      };
    } catch (
      error
    ) {
      /*
       * Duplicate race between simultaneous device requests.
       */
      if (
        error?.code ===
        11000
      ) {
        const existing =
          await RawAttendancePunch.findOne({
            externalEventKey,
          });

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

    const result =
      await RawAttendancePunch.updateMany(
        {
          biometricCode:
            code,

          employeeId:
            null,

          processingStatus:
            "UNMAPPED",
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
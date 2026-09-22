const {
  extractDecodedM50Records,
  decodeEbknBinary,
} =
  require(
    "./fkwebEbkn.parser"
  );

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
   MACHINE DATE
========================================================= */

const parseMachineDate =
  (
    value
  ) => {
    if (
      !value
    ) {
      return null;
    }

    if (
      value instanceof
      Date
    ) {
      return Number.isNaN(
        value.getTime()
      )
        ? null
        : value;
    }

    const text =
      normalizeText(
        value
      );

    let match =
      text.match(
        /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/
      );

    if (
      match
    ) {
      const date =
        new Date(
          `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}+05:30`
        );

      return Number.isNaN(
        date.getTime()
      )
        ? null
        : date;
    }

    match =
      text.match(
        /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/
      );

    if (
      match
    ) {
      const date =
        new Date(
          `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}+05:30`
        );

      return Number.isNaN(
        date.getTime()
      )
        ? null
        : date;
    }

    const date =
      new Date(
        text
      );

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  };

/* =========================================================
   DEVICE ID
========================================================= */

const getDeviceId =
  (
    req
  ) => {
    return normalizeText(
      req.headers[
        "device_id"
      ] ||
      req.headers[
        "device-id"
      ] ||
      req.headers[
        "sn"
      ] ||
      req.query
        ?.device_id ||
      req.query
        ?.deviceId ||
      req.query
        ?.SN ||
      req.query
        ?.sn
    );
  };

/* =========================================================
   HEADERS
========================================================= */

const getRequestCode =
  (
    req
  ) =>
    normalizeText(
      req.headers[
        "request_code"
      ]
    );

const getCommandCode =
  (
    req
  ) =>
    normalizeText(
      req.headers[
        "cmd_code"
      ]
    );

const getTransactionId =
  (
    req
  ) =>
    normalizeText(
      req.headers[
        "trans_id"
      ]
    );

/* =========================================================
   JSON BODY
========================================================= */

const parseJsonBody =
  (
    req
  ) => {
    if (
      req.body &&
      typeof req.body ===
        "object" &&
      !Buffer.isBuffer(
        req.body
      )
    ) {
      return req.body;
    }

    if (
      Buffer.isBuffer(
        req.body
      )
    ) {
      const text =
        req.body
          .toString(
            "utf8"
          )
          .trim();

      if (
        !text
      ) {
        return null;
      }

      try {
        return JSON.parse(
          text
        );
      } catch (
        error
      ) {
        return null;
      }
    }

    if (
      typeof req.body ===
      "string"
    ) {
      try {
        return JSON.parse(
          req.body
        );
      } catch (
        error
      ) {
        return null;
      }
    }

    return null;
  };

/* =========================================================
   NORMALIZE PUNCH
========================================================= */

const normalizePunchPayload =
  (
    payload,
    deviceId,
    protocol =
      "FKWEB"
  ) => {
    if (
      !payload
    ) {
      return null;
    }

    const employeeCode =
      normalizeBiometricCode(
        payload.employeeCode ||
        payload.employee_code ||
        payload.user_id ||
        payload.userId ||
        payload.pin ||
        payload.enroll_id
      );

    const punchTime =
      parseMachineDate(
        payload.punchTime ||
        payload.punch_time ||
        payload.record_time ||
        payload.io_time ||
        payload.time ||
        payload.timestamp
      );

    if (
      !employeeCode ||
      !punchTime
    ) {
      return null;
    }

    return {
      eventType:
        "PUNCH",

      protocol,

      deviceId,

      employeeCode,

      employeeName:
        normalizeText(
          payload.employeeName ||
          payload.employee_name ||
          payload.user_name ||
          payload.name
        ),

      punchTime,

      recordId:
        normalizeText(
          payload.recordId ||
          payload.record_id ||
          payload.log_id ||
          payload.id
        ),

      verifyMode:
        normalizeText(
          payload.verifyMode ??
          payload.verify_mode
        ),

      ioMode:
        normalizeText(
          payload.ioMode ??
          payload.io_mode ??
          payload.in_out_mode
        ),

      payload,
    };
  };

/* =========================================================
   M50 RECORD
========================================================= */

const normalizeM50Record =
  (
    record,
    deviceId
  ) => {
    return normalizePunchPayload(
      record,
      deviceId,
      "FKWEB_EBKN"
    );
  };

/* =========================================================
   REQUEST TYPE HELPERS
========================================================= */

const isCommandResultRequest =
  (
    req
  ) => {
    return Boolean(
      getCommandCode(
        req
      ) ||
      req.headers[
        "cmd_return_code"
      ] !==
        undefined ||
      getRequestCode(
        req
      )
        .toLowerCase() ===
        "send_cmd_result"
    );
  };

const isCommandPollRequest =
  (
    req
  ) => {
    const requestCode =
      getRequestCode(
        req
      )
        .toLowerCase();

    return [
      "receive_cmd",
      "get_cmd",
      "get_command",
    ].includes(
      requestCode
    );
  };

/* =========================================================
   PARSE FKWEB EVENT
========================================================= */

const parseFkWebEvent =
  (
    req
  ) => {
    const deviceId =
      getDeviceId(
        req
      );

    const requestCode =
      getRequestCode(
        req
      );

    const commandCode =
      getCommandCode(
        req
      );

    const transactionId =
      getTransactionId(
        req
      );

    const payload =
      parseJsonBody(
        req
      );

    /* =====================================================
       DEVICE ASKING FOR COMMAND
    ===================================================== */

    if (
      isCommandPollRequest(
        req
      )
    ) {
      return {
        eventType:
          "COMMAND_POLL",

        protocol:
          "FKWEB_EBKN",

        deviceId,

        requestCode,

        transactionId,

        payload:
          payload ||
          {},
      };
    }

    /* =====================================================
       COMMAND RESULT
    ===================================================== */

    if (
      isCommandResultRequest(
        req
      )
    ) {
      let decodedRecords =
        [];

      if (
        payload
      ) {
        const m50 =
          extractDecodedM50Records(
            payload
          );

        if (
          m50.length
        ) {
          decodedRecords =
            m50
              .map(
                (
                  record
                ) =>
                  normalizeM50Record(
                    record,
                    deviceId
                  )
              )
              .filter(
                Boolean
              );
        } else {
          const candidates =
            Array.isArray(
              payload.records
            )
              ? payload.records
              : Array.isArray(
                    payload.log_array
                  )
                ? payload.log_array
                : [];

          decodedRecords =
            candidates
              .map(
                (
                  record
                ) =>
                  normalizePunchPayload(
                    record,
                    deviceId
                  )
              )
              .filter(
                Boolean
              );
        }
      } else if (
        Buffer.isBuffer(
          req.body
        ) &&
        req.body.length
      ) {
        const binaryRecords =
          decodeEbknBinary(
            req.body
          );

        decodedRecords =
          binaryRecords
            .map(
              (
                record
              ) =>
                normalizeM50Record(
                  record,
                  deviceId
                )
            )
            .filter(
              Boolean
            );
      }

      return {
        eventType:
          "COMMAND_RESULT",

        protocol:
          "FKWEB_EBKN",

        deviceId,

        requestCode,

        commandCode,

        transactionId,

        commandReturnCode:
          normalizeText(
            req.headers[
              "cmd_return_code"
            ]
          ),

        records:
          decodedRecords,

        payload:
          payload ||
          null,
      };
    }

    /* =====================================================
       ENROLLMENT
    ===================================================== */

    const userId =
      payload?.user_id ||
      payload?.employeeCode ||
      payload?.pin ||
      payload?.enroll_id;

    const eventName =
      normalizeText(
        payload?.event ||
        payload?.event_type ||
        payload?.type
      ).toUpperCase();

    if (
      [
        "USER",
        "ENROLLMENT",
        "ENROLL",
        "USER_UPDATE",
      ].includes(
        eventName
      ) &&
      userId
    ) {
      return {
        eventType:
          "ENROLLMENT",

        protocol:
          "FKWEB",

        deviceId,

        employeeCode:
          normalizeBiometricCode(
            userId
          ),

        employeeName:
          normalizeText(
            payload?.user_name ||
            payload?.name
          ),

        requestCode,

        transactionId,

        payload,
      };
    }

    /* =====================================================
       LIVE PUNCH
    ===================================================== */

    const punch =
      normalizePunchPayload(
        payload,
        deviceId
      );

    if (
      punch
    ) {
      return {
        ...punch,

        requestCode,

        transactionId,
      };
    }

    /* =====================================================
       HEARTBEAT
    ===================================================== */

    if (
      deviceId
    ) {
      return {
        eventType:
          "HEARTBEAT",

        protocol:
          "FKWEB",

        deviceId,

        requestCode,

        transactionId,

        payload:
          payload ||
          {},
      };
    }

    return {
      eventType:
        "UNKNOWN",

      protocol:
        "FKWEB",

      deviceId,

      requestCode,

      transactionId,

      payload:
        payload ||
        {},
    };
  };

/* =========================================================
   NORMALIZE HISTORY RECORD
========================================================= */

const normalizeHistoryRecord =
  (
    record,
    deviceId
  ) => {
    if (
      record?.eventType ===
        "PUNCH" &&
      record?.punchTime &&
      record?.employeeCode
    ) {
      return {
        ...record,

        deviceId:
          record.deviceId ||
          deviceId,
      };
    }

    if (
      normalizeText(
        record
          ?.fk_bin_data_lib
      ).toUpperCase() ===
      "M50"
    ) {
      return normalizeM50Record(
        record,
        deviceId
      );
    }

    return normalizePunchPayload(
      record,
      deviceId
    );
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  normalizeBiometricCode,

  parseMachineDate,

  getDeviceId,

  getRequestCode,

  getCommandCode,

  getTransactionId,

  parseJsonBody,

  normalizePunchPayload,

  normalizeM50Record,

  isCommandPollRequest,

  isCommandResultRequest,

  parseFkWebEvent,

  normalizeHistoryRecord,
};
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

const firstText =
  (
    ...values
  ) => {
    for (
      const value of
      values
    ) {
      const text =
        normalizeText(
          value
        );

      if (
        text
      ) {
        return text;
      }
    }

    return "";
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

    /*
     * Pure numeric machine IDs are normalized so:
     *
     *   000123
     *   00123
     *   123
     *
     * resolve consistently as 123.
     *
     * Alphanumeric employee codes such as SE1277 remain
     * alphanumeric and are upper-cased.
     */

    if (
      /^\d+$/.test(
        text
      )
    ) {
      const numeric =
        Number(
          text
        );

      if (
        Number.isSafeInteger(
          numeric
        )
      ) {
        return String(
          numeric
        );
      }

      /*
       * Avoid precision loss for unexpectedly large numeric
       * identifiers.
       */

      return text.replace(
        /^0+(?=\d)/,
        ""
      );
    }

    return text
      .toUpperCase();
  };

/* =========================================================
   MACHINE DATE

   FKWeb machine timestamps without timezone information are
   interpreted as India local time.

   MongoDB then stores the resulting Date as the equivalent
   UTC instant.
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

    if (
      typeof value ===
        "number" &&
      Number.isFinite(
        value
      )
    ) {
      const milliseconds =
        value <
        100000000000
          ? value *
            1000
          : value;

      const numericDate =
        new Date(
          milliseconds
        );

      return Number.isNaN(
        numericDate.getTime()
      )
        ? null
        : numericDate;
    }

    const text =
      normalizeText(
        value
      );

    if (
      !text
    ) {
      return null;
    }

    /*
     * YYYYMMDDHHmmss
     */

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

    /*
     * YYYY-MM-DD HH:mm:ss
     * YYYY-MM-DDTHH:mm:ss
     */

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

    /*
     * YYYY/MM/DD HH:mm:ss
     */

    match =
      text.match(
        /^(\d{4})\/(\d{2})\/(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/
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

    /*
     * ISO strings containing an explicit timezone/offset may
     * safely be delegated to Date.
     */

    const hasExplicitTimezone =
      /(?:Z|[+-]\d{2}:?\d{2})$/i.test(
        text
      );

    if (
      hasExplicitTimezone
    ) {
      const date =
        new Date(
          text
        );

      return Number.isNaN(
        date.getTime()
      )
        ? null
        : date;
    }

    /*
     * Unknown timezone-less formats are intentionally rejected
     * rather than interpreted using the VPS timezone.
     */

    return null;
  };

/* =========================================================
   DEVICE ID

   Different FKWeb firmware versions can expose the terminal
   identifier under slightly different names.

   We preserve the exact identifier sent by the machine.
========================================================= */

const getDeviceId =
  (
    req
  ) => {
    const payload =
  getRequestPayload(req);

    return firstText(
      // Standard FKWeb / terminal headers
      req.headers?.["device_id"],
      req.headers?.["device-id"],
      req.headers?.["deviceid"],
      req.headers?.["terminal_id"],
      req.headers?.["terminal-id"],
      req.headers?.["terminalid"],
      req.headers?.["sn"],
      req.headers?.["serial_number"],
      req.headers?.["serial-number"],
      req.headers?.["serialnumber"],
      req.headers?.["cloud_id"],
      req.headers?.["cloud-id"],
      req.headers?.["cloudid"],
      req.headers?.["dev_id"],
      req.headers?.["dev-id"],
      req.headers?.["devid"],

      // Query-string variants
      req.query?.device_id,
      req.query?.deviceId,
      req.query?.deviceid,
      req.query?.DeviceId,
      req.query?.DeviceID,

      req.query?.terminal_id,
      req.query?.terminalId,
      req.query?.terminalid,
      req.query?.TerminalId,

      req.query?.SN,
      req.query?.sn,

      req.query?.serialNumber,
      req.query?.serial_number,
      req.query?.serialnumber,

      req.query?.cloud_id,
      req.query?.cloudId,
      req.query?.cloudid,
      req.query?.CloudId,

      req.query?.dev_id,
      req.query?.devId,
      req.query?.devid,

      // Some FKWeb firmware puts terminal identity in JSON
      payload?.device_id,
      payload?.deviceId,
      payload?.deviceid,
      payload?.terminal_id,
      payload?.terminalId,
      payload?.terminalid,
      payload?.SN,
      payload?.sn,
      payload?.serialNumber,
      payload?.serial_number,
      payload?.cloud_id,
      payload?.cloudId,
      payload?.cloudid,
      payload?.dev_id,
      payload?.devId,
      payload?.devid
    );
  };

/* =========================================================
   PROTOCOL HEADERS
========================================================= */

const getRequestCode =
  (
    req
  ) => {
    const payload =
  getRequestPayload(req);

    return firstText(
      req.headers?.["request_code"],
      req.headers?.["request-code"],
      req.headers?.["requestcode"],
      req.headers?.["request_code_type"],
      req.headers?.["request-code-type"],

      req.query?.request_code,
      req.query?.requestCode,
      req.query?.requestcode,
      req.query?.RequestCode,

      payload?.request_code,
      payload?.requestCode,
      payload?.requestcode
    );
  };

const getCommandCode =
  (
    req
  ) => {
    return firstText(
      req.headers[
        "cmd_code"
      ],

      req.headers[
        "cmd-code"
      ],

      req.headers[
        "command_code"
      ],

      req.headers[
        "command-code"
      ],

      req.query
        ?.cmd_code,

      req.query
        ?.cmdCode,

      req.query
        ?.command_code
    );
  };

const getTransactionId =
  (
    req
  ) => {
    return firstText(
      req.headers[
        "trans_id"
      ],

      req.headers[
        "trans-id"
      ],

      req.headers[
        "transaction_id"
      ],

      req.headers[
        "transaction-id"
      ],

      req.query
        ?.trans_id,

      req.query
        ?.transId,

      req.query
        ?.transaction_id,

      req.query
        ?.transactionId
    );
  };

const getCommandReturnCode =
  (
    req
  ) => {
    return firstText(
      req.headers[
        "cmd_return_code"
      ],

      req.headers[
        "cmd-return-code"
      ],

      req.headers[
        "command_return_code"
      ],

      req.headers[
        "command-return-code"
      ],

      req.query
        ?.cmd_return_code,

      req.query
        ?.commandReturnCode
    );
  };

/* =========================================================
   JSON BODY
========================================================= */

const parseJsonBody = (req) => {
  if (
    req.body &&
    typeof req.body === "object" &&
    !Buffer.isBuffer(req.body)
  ) {
    return req.body;
  }

  let text = "";

  if (Buffer.isBuffer(req.body)) {
    text = req.body.toString("utf8");
  } else if (typeof req.body === "string") {
    text = req.body;
  }

  if (!text) {
    return null;
  }

  /*
   * Standard JSON request.
   */
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    // Continue to FKWeb framed JSON extraction.
  }

  /*
   * RealTime S362 / FKWeb packets may contain binary framing
   * bytes before the JSON object.
   *
   * Example observed from the physical Delhi terminal:
   *
   *   <binary prefix>{"fk_name":"S362", ...}
   *
   * We do NOT interpret or guess the binary prefix here.
   * We only extract an embedded JSON object when a complete
   * JSON object is visibly present.
   */
  const jsonStart =
    text.indexOf("{");

  const jsonEnd =
    text.lastIndexOf("}");

  if (
    jsonStart === -1 ||
    jsonEnd === -1 ||
    jsonEnd <= jsonStart
  ) {
    return null;
  }

  const jsonText =
    text.slice(
      jsonStart,
      jsonEnd + 1
    );

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    return null;
  }
};

const getRawBodyText = (req) => {
  if (Buffer.isBuffer(req.body)) {
    return req.body
      .toString("utf8")
      .trim();
  }

  if (typeof req.body === "string") {
    return req.body.trim();
  }

  return "";
};




const parseFormBody = (req) => {
  const text =
    getRawBodyText(req);

  if (!text) {
    return null;
  }

  // JSON is handled separately.
  if (
    text.startsWith("{") ||
    text.startsWith("[")
  ) {
    return null;
  }

  try {
    const params =
      new URLSearchParams(text);

    const result = {};

    for (
      const [key, value]
      of params.entries()
    ) {
      result[key] = value;
    }

    return Object.keys(result).length
      ? result
      : null;
  } catch (error) {
    return null;
  }
};

const getRequestPayload = (req) => {
  return (
    parseJsonBody(req) ||
    parseFormBody(req) ||
    null
  );
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
      !payload ||
      typeof payload !==
        "object"
    ) {
      return null;
    }

    const employeeCode =
      normalizeBiometricCode(
        payload.employeeCode ||
        payload.employee_code ||
        payload.user_id ||
        payload.userId ||
        payload.userid ||
        payload.pin ||
        payload.PIN ||
        payload.enroll_id ||
        payload.enrollId
      );

    const punchTime =
      parseMachineDate(
        payload.punchTime ||
        payload.punch_time ||
        payload.record_time ||
        payload.recordTime ||
        payload.io_time ||
        payload.ioTime ||
        payload.datetime ||
        payload.date_time ||
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

      deviceId:
        normalizeText(
          deviceId
        ),

      employeeCode,

      employeeName:
        firstText(
          payload.employeeName,
          payload.employee_name,
          payload.user_name,
          payload.userName,
          payload.name
        ),

      punchTime,

      recordId:
        firstText(
          payload.recordId,
          payload.record_id,
          payload.log_id,
          payload.logId,
          payload.id
        ),

      verifyMode:
        firstText(
          payload.verifyMode,
          payload.verify_mode,
          payload.verify
        ),

      ioMode:
        firstText(
          payload.ioMode,
          payload.io_mode,
          payload.in_out_mode,
          payload.inOutMode,
          payload.status
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

const isCommandPollRequest =
  (
    req
  ) => {
    const requestCode =
      getRequestCode(
        req
      ).toLowerCase();

    return [
      "receive_cmd",
      "get_cmd",
      "get_command",
    ].includes(
      requestCode
    );
  };

const isCommandResultRequest =
  (
    req
  ) => {
    const requestCode =
      getRequestCode(
        req
      ).toLowerCase();

    return Boolean(
      getCommandCode(
        req
      ) ||
      getCommandReturnCode(
        req
      ) ||
      requestCode ===
        "send_cmd_result"
    );
  };

/* =========================================================
   PARSE COMMAND RESULT RECORDS
========================================================= */

const extractCommandResultRecords =
  (
    req,
    payload,
    deviceId
  ) => {
    if (
      payload
    ) {
      const m50 =
        extractDecodedM50Records(
          payload
        );

      if (
        Array.isArray(
          m50
        ) &&
        m50.length
      ) {
        return m50
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

      const candidates =
        Array.isArray(
          payload.records
        )
          ? payload.records
          : Array.isArray(
                payload.log_array
              )
            ? payload.log_array
            : Array.isArray(
                  payload.logs
                )
              ? payload.logs
              : Array.isArray(
                    payload.data
                  )
                ? payload.data
                : [];

      return candidates
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

    if (
      Buffer.isBuffer(
        req.body
      ) &&
      req.body.length
    ) {
      const binaryRecords =
        decodeEbknBinary(
          req.body
        );

      if (
        !Array.isArray(
          binaryRecords
        )
      ) {
        return [];
      }

      return binaryRecords
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

    return [];
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

    const commandReturnCode =
      getCommandReturnCode(
        req
      );

   const payload =
  getRequestPayload(
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
      const decodedRecords =
        extractCommandResultRecords(
          req,
          payload,
          deviceId
        );

      return {
        eventType:
          "COMMAND_RESULT",

        protocol:
          "FKWEB_EBKN",

        deviceId,

        requestCode,

        commandCode,

        transactionId,

        commandReturnCode,

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
      payload
        ?.user_id ||
      payload
        ?.userId ||
      payload
        ?.employeeCode ||
      payload
        ?.employee_code ||
      payload
        ?.pin ||
      payload
        ?.PIN ||
      payload
        ?.enroll_id ||
      payload
        ?.enrollId;

    const eventName =
      firstText(
        payload?.event,
        payload?.event_type,
        payload?.eventType,
        payload?.type
      ).toUpperCase();

    if (
      [
        "USER",
        "ENROLLMENT",
        "ENROLL",
        "USER_UPDATE",
        "USER ADD",
        "USER_ADD",
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
          firstText(
            payload
              ?.user_name,
            payload
              ?.userName,
            payload
              ?.employee_name,
            payload
              ?.employeeName,
            payload
              ?.name
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

       A request containing a recognized physical device ID
       but no punch/enrollment/command payload is treated as
       communication from that device.
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

    /* =====================================================
       UNKNOWN
    ===================================================== */

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
          normalizeText(
            record.deviceId
          ) ||
          normalizeText(
            deviceId
          ),
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

  getCommandReturnCode,

  parseJsonBody,

parseFormBody,

getRequestPayload,

normalizePunchPayload,

  normalizeM50Record,

  isCommandPollRequest,

  isCommandResultRequest,

  parseFkWebEvent,

  normalizeHistoryRecord,
};
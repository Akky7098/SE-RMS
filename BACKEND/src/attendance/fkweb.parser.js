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
   PARSE MACHINE DATE
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

    const text =
      normalizeText(
        value
      );

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
   REQUEST DEVICE ID
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
   PARSE JSON PAYLOAD
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
   NORMALIZE PUNCH PAYLOAD
========================================================= */

const normalizePunchPayload =
  (
    payload,
    deviceId
  ) => {
    const employeeCode =
      normalizeBiometricCode(
        payload?.employeeCode ||
        payload?.employee_code ||
        payload?.user_id ||
        payload?.userId ||
        payload?.pin ||
        payload?.enroll_id
      );

    const punchTime =
      parseMachineDate(
        payload?.punchTime ||
        payload?.punch_time ||
        payload?.record_time ||
        payload?.time ||
        payload?.timestamp
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

      protocol:
        "FKWEB",

      deviceId,

      employeeCode,

      employeeName:
        normalizeText(
          payload?.employeeName ||
          payload?.employee_name ||
          payload?.user_name ||
          payload?.name
        ),

      punchTime,

      recordId:
        normalizeText(
          payload?.recordId ||
          payload?.record_id ||
          payload?.log_id ||
          payload?.id
        ),

      verifyMode:
        normalizeText(
          payload?.verifyMode ||
          payload?.verify_mode
        ),

      ioMode:
        normalizeText(
          payload?.ioMode ||
          payload?.io_mode ||
          payload?.in_out_mode
        ),

      payload,
    };
  };

/* =========================================================
   PARSE FKWEB REQUEST

   This handles standard normalized JSON/header cases.

   Any vendor-specific binary EBKN decoding should feed its
   decoded result into normalizePunchPayload instead of
   writing directly to MongoDB.
========================================================= */

const parseFkWebEvent =
  (
    req
  ) => {
    const deviceId =
      getDeviceId(
        req
      );

    const payload =
      parseJsonBody(
        req
      );

    const commandCode =
      normalizeText(
        req.headers[
          "cmd_code"
        ]
      );

    const requestCode =
      normalizeText(
        req.headers[
          "request_code"
        ]
      );

    /*
     * Command result.
     */
    if (
      commandCode ||
      req.headers[
        "cmd_return_code"
      ]
    ) {
      return {
        eventType:
          "COMMAND_RESULT",

        protocol:
          "FKWEB",

        deviceId,

        requestCode,

        transactionId:
          normalizeText(
            req.headers[
              "trans_id"
            ]
          ),

        payload:
          payload ||
          {},
      };
    }

    /*
     * Enrollment/user event.
     */
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

        transactionId:
          normalizeText(
            req.headers[
              "trans_id"
            ]
          ),

        payload,
      };
    }

    /*
     * Punch.
     */
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

        transactionId:
          normalizeText(
            req.headers[
              "trans_id"
            ]
          ),
      };
    }

    /*
     * Heartbeat.
     */
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

      payload:
        payload ||
        {},
    };
  };

/* =========================================================
   NORMALIZE HISTORY RECORD

   Called after JSON or binary history has been decoded.
========================================================= */

const normalizeHistoryRecord =
  (
    record,
    deviceId
  ) => {
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

  parseJsonBody,

  normalizePunchPayload,

  parseFkWebEvent,

  normalizeHistoryRecord,
};
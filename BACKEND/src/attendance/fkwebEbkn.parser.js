/* =========================================================
   FKWEB EBKN / M50 ADAPTER
   PRODUCTION

   VERIFIED SE-RMS / DELHI REALTIME DATA

   The Delhi RealTime terminal uses the FKWeb / EBKN protocol
   and advertises:

     fk_name: "S362"
     fk_bin_data_lib: "M50"

   Previously decoded attendance records have the shape:

   {
     fk_bin_data_lib: "M50",
     user_id: "00000007",
     verify_mode: 2,
     io_mode: 1,
     io_time: "20260824113622"
   }

   IMPORTANT

   This module:

   1. Recognizes VERIFIED M50 attendance objects.
   2. Extracts M50 records from common response containers.
   3. Handles FKWeb length-prefixed frames.
   4. Extracts balanced JSON safely.
   5. Does NOT invent undocumented attendance byte offsets.
   6. Does NOT manufacture punches from unknown binary data.
   7. Ignores unsupported/broken frames safely.
========================================================= */


/* =========================================================
   NORMALIZATION
========================================================= */

const normalizeText = (value) =>
  String(
    value ??
      ""
  ).trim();


/* =========================================================
   M50 RECORD IDENTIFICATION
========================================================= */

const isM50Record = (value) => {
  if (
    !value ||
    typeof value !== "object" ||
    Buffer.isBuffer(value)
  ) {
    return false;
  }

  return (
    normalizeText(
      value.fk_bin_data_lib
    ).toUpperCase() === "M50" &&
    Boolean(
      normalizeText(
        value.user_id
      )
    ) &&
    Boolean(
      normalizeText(
        value.io_time
      )
    )
  );
};


/* =========================================================
   EXTRACT DECODED M50 RECORDS
========================================================= */

const extractDecodedM50Records = (payload) => {
  if (!payload) {
    return [];
  }

  /*
   * Direct single M50 attendance record.
   */
  if (
    isM50Record(
      payload
    )
  ) {
    return [
      payload,
    ];
  }

  /*
   * Known/common command-result containers.
   */
  const candidates = [
    payload.records,
    payload.log_array,
    payload.logs,
    payload.data,
    payload.result,
  ];

  for (
    const candidate of candidates
  ) {
    if (
      !Array.isArray(
        candidate
      )
    ) {
      continue;
    }

    const records =
      candidate.filter(
        isM50Record
      );

    if (
      records.length
    ) {
      return records;
    }
  }

  return [];
};


/* =========================================================
   BALANCED JSON EXTRACTION

   FKWeb packets may contain:

     binary prefix
       +
     JSON
       +
     optional binary tail

   We therefore cannot safely use:

     first "{"
     last "}"

   Instead we locate a balanced JSON object while respecting
   quoted strings and escaped characters.
========================================================= */

const extractBalancedJson = (
  buffer,
  startOffset = 0
) => {
  if (
    !Buffer.isBuffer(
      buffer
    ) ||
    buffer.length === 0
  ) {
    return null;
  }

  let firstBrace = -1;

  for (
    let i = Math.max(
      0,
      startOffset
    );
    i < buffer.length;
    i += 1
  ) {
    if (
      buffer[i] === 0x7b
    ) {
      firstBrace = i;
      break;
    }
  }

  if (
    firstBrace === -1
  ) {
    return null;
  }

  let depth = 0;

  let inString = false;

  let escaped = false;

  for (
    let i = firstBrace;
    i < buffer.length;
    i += 1
  ) {
    const byte =
      buffer[i];

    /*
     * Inside JSON string.
     */
    if (
      inString
    ) {
      if (
        escaped
      ) {
        escaped = false;
        continue;
      }

      if (
        byte === 0x5c
      ) {
        /*
         * Backslash
         */
        escaped = true;
        continue;
      }

      if (
        byte === 0x22
      ) {
        /*
         * Double quote
         */
        inString = false;
      }

      continue;
    }

    /*
     * Start JSON string.
     */
    if (
      byte === 0x22
    ) {
      inString = true;
      continue;
    }

    /*
     * {
     */
    if (
      byte === 0x7b
    ) {
      depth += 1;
      continue;
    }

    /*
     * }
     */
    if (
      byte === 0x7d
    ) {
      depth -= 1;

      if (
        depth === 0
      ) {
        const endOffset =
          i + 1;

        try {
          const jsonText =
            buffer
              .subarray(
                firstBrace,
                endOffset
              )
              .toString(
                "utf8"
              );

          const payload =
            JSON.parse(
              jsonText
            );

          return {
            payload,

            startOffset:
              firstBrace,

            endOffset,

            jsonText,
          };
        } catch (error) {
          return null;
        }
      }

      /*
       * Malformed JSON structure.
       */
      if (
        depth < 0
      ) {
        return null;
      }
    }
  }

  return null;
};


/* =========================================================
   FRAME PAYLOAD DECODER
========================================================= */

const decodeFramePayload = (
  payloadBuffer
) => {
  if (
    !Buffer.isBuffer(
      payloadBuffer
    ) ||
    payloadBuffer.length === 0
  ) {
    return [];
  }

  /*
   * First try direct JSON.

   * This supports frames where the entire payload is JSON.
   */
  try {
    const text =
      payloadBuffer
        .toString(
          "utf8"
        )
        .trim();

    if (
      text.startsWith("{") &&
      text.endsWith("}")
    ) {
      const payload =
        JSON.parse(
          text
        );

      const records =
        extractDecodedM50Records(
          payload
        );

      if (
        records.length
      ) {
        return records;
      }
    }
  } catch (error) {
    /*
     * Continue to framed/balanced extraction.
     */
  }

  /*
   * Binary prefix + JSON + optional binary tail.
   */
  const extracted =
    extractBalancedJson(
      payloadBuffer
    );

  if (
    !extracted
  ) {
    return [];
  }

  return extractDecodedM50Records(
    extracted.payload
  );
};


/* =========================================================
   LENGTH PREFIX VALIDATION
========================================================= */

const isValidFrameLength = (
  payloadLength,
  remainingLength
) => {
  if (
    !Number.isSafeInteger(
      payloadLength
    )
  ) {
    return false;
  }

  if (
    payloadLength <= 0
  ) {
    return false;
  }

  /*
   * Hard safety ceiling.

   * The Express FKWeb route already has its own request size
   * limit, but this protects this parser if called elsewhere.
   */
  const MAX_FRAME_SIZE =
    20 * 1024 * 1024;

  if (
    payloadLength >
    MAX_FRAME_SIZE
  ) {
    return false;
  }

  return (
    payloadLength <=
    remainingLength
  );
};


/* =========================================================
   RAW FKWEB / EBKN / M50 DECODER

   Observed FKWeb packets contain a small binary prefix before
   their JSON data.

   Supported here:

     [4-byte little-endian payload length]
     [payload]

   The payload itself may contain:

     JSON

   or:

     binary prefix + JSON + optional binary tail

   UNKNOWN BINARY DATA IS NEVER CONVERTED INTO ATTENDANCE.
========================================================= */

const decodeEbknBinary = (buffer) => {
  if (
    !Buffer.isBuffer(
      buffer
    ) ||
    buffer.length === 0
  ) {
    return [];
  }

  const records = [];

  /*
   * =======================================================
   * PASS 1
   *
   * Decode length-prefixed frames.
   * =======================================================
   */

  let offset = 0;

  while (
    offset + 4 <=
    buffer.length
  ) {
    let payloadLength = 0;

    try {
      payloadLength =
        buffer.readUInt32LE(
          offset
        );
    } catch (error) {
      break;
    }

    const payloadStart =
      offset + 4;

    const remainingLength =
      buffer.length -
      payloadStart;

    if (
      !isValidFrameLength(
        payloadLength,
        remainingLength
      )
    ) {
      /*
       * We may be positioned before protocol/framing bytes.
       * Move one byte and look for the next valid frame.
       *
       * We intentionally do not interpret those unknown bytes.
       */
      offset += 1;
      continue;
    }

    const payloadEnd =
      payloadStart +
      payloadLength;

    const payloadBuffer =
      buffer.subarray(
        payloadStart,
        payloadEnd
      );

    const decoded =
      decodeFramePayload(
        payloadBuffer
      );

    if (
      decoded.length
    ) {
      records.push(
        ...decoded
      );
    }

    offset =
      payloadEnd;
  }


  /*
   * If valid attendance records were found from framed data,
   * return them.
   */
  if (
    records.length
  ) {
    return records;
  }


  /*
   * =======================================================
   * PASS 2
   *
   * Some S362 packets observed in production contain framing
   * bytes followed directly by a JSON object.
   *
   * If no valid length-prefixed attendance frame was found,
   * safely inspect the complete buffer for balanced JSON.
   *
   * This does NOT interpret unknown binary bytes.
   * =======================================================
   */

  const extracted =
    extractBalancedJson(
      buffer
    );

  if (
    !extracted
  ) {
    return [];
  }

  return extractDecodedM50Records(
    extracted.payload
  );
};


/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  isM50Record,

  extractDecodedM50Records,

  extractBalancedJson,

  decodeEbknBinary,
};
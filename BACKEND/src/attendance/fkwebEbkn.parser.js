/* =========================================================
   FKWEB EBKN / M50 ADAPTER

   IMPORTANT

   Previous SE-RMS development data proves that the Delhi
   machine produced decoded objects shaped like:

   {
     fk_bin_data_lib: "M50",
     user_id: "00000007",
     verify_mode: 2,
     io_mode: 1,
     io_time: "20260824113622"
   }

   This module converts that VERIFIED decoded structure into
   the production normalized FKWeb representation.

   It does NOT guess undocumented byte offsets.
========================================================= */

const normalizeText =
  (
    value
  ) =>
    String(
      value ??
        ""
    ).trim();

const isM50Record =
  (
    value
  ) => {
    if (
      !value ||
      typeof value !==
        "object" ||
      Buffer.isBuffer(
        value
      )
    ) {
      return false;
    }

    return (
      normalizeText(
        value.fk_bin_data_lib
      ).toUpperCase() ===
        "M50" &&
      Boolean(
        value.user_id
      ) &&
      Boolean(
        value.io_time
      )
    );
  };

const extractDecodedM50Records =
  (
    payload
  ) => {
    if (
      !payload
    ) {
      return [];
    }

    if (
      isM50Record(
        payload
      )
    ) {
      return [
        payload,
      ];
    }

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
        Array.isArray(
          candidate
        )
      ) {
        return candidate.filter(
          isM50Record
        );
      }
    }

    return [];
  };

/* =========================================================
   RAW BINARY

   Keep this explicit.

   We know the Delhi device is EBKN/M50 from previous data,
   but byte-level decoding must match the exact vendor
   framing/firmware.

   Unknown binary must NEVER be converted into fake punches.
========================================================= */

const decodeEbknBinary =
  (
    buffer
  ) => {
    if (
      !Buffer.isBuffer(
        buffer
      ) ||
      buffer.length ===
        0
    ) {
      return [];
    }

    const error =
      new Error(
        "Raw FKWeb EBKN/M50 binary payload received, but byte-level M50 decoding is not configured for this firmware."
      );

    error.code =
      "FKWEB_M50_BINARY_DECODER_REQUIRED";

    error.payloadLength =
      buffer.length;

    throw error;
  };

module.exports = {
  isM50Record,

  extractDecodedM50Records,

  decodeEbknBinary,
};
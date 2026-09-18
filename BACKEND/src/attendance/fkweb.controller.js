const {
  parseFkWebEvent,
  normalizeHistoryRecord,
} =
  require(
    "./fkweb.parser"
  );

const {
  processHeartbeat,
  processEnrollment,
  processPunch,
  processHistoricalPunches,
} =
  require(
    "./fkweb.service"
  );

/* =========================================================
   REQUEST IP
========================================================= */

const getRequestIp =
  (
    req
  ) => {
    const forwarded =
      req.headers[
        "x-forwarded-for"
      ];

    if (
      forwarded
    ) {
      return String(
        forwarded
      )
        .split(
          ","
        )[0]
        .trim();
    }

    return String(
      req.ip ||
      req.socket
        ?.remoteAddress ||
      ""
    ).replace(
      "::ffff:",
      ""
    );
  };

/* =========================================================
   ACK

   FKWeb devices generally expect quick HTTP success.

   Keep protocol acknowledgement independent from attendance
   calculation.
========================================================= */

const acknowledge =
  (
    res,
    event
  ) => {
    if (
      event?.transactionId
    ) {
      res.setHeader(
        "trans_id",
        event.transactionId
      );
    }

    res.setHeader(
      "response_code",
      "OK"
    );

    res.setHeader(
      "Connection",
      "close"
    );

    return res
      .status(
        200
      )
      .send(
        ""
      );
  };

/* =========================================================
   RECEIVE FKWEB
========================================================= */

exports.receive =
  async (
    req,
    res
  ) => {
    let event =
      null;

    try {
      event =
        parseFkWebEvent(
          req
        );

      if (
        event.eventType ===
        "HEARTBEAT"
      ) {
        await processHeartbeat(
          event,
          {
            ipAddress:
              getRequestIp(
                req
              ),
          }
        );

        return acknowledge(
          res,
          event
        );
      }

      if (
        event.eventType ===
        "ENROLLMENT"
      ) {
        await processEnrollment(
          event
        );

        return acknowledge(
          res,
          event
        );
      }

      if (
        event.eventType ===
        "PUNCH"
      ) {
        await processPunch(
          event,
          {
            source:
              "LIVE",
          }
        );

        return acknowledge(
          res,
          event
        );
      }

      if (
        event.eventType ===
        "COMMAND_RESULT"
      ) {
        /*
         * If the command result contains normalized JSON
         * history records, process them here.

         * Binary command results will be passed through the
         * verified binary decoder once finalized.
         */
        const possibleRecords =
          Array.isArray(
            event.payload
              ?.records
          )
            ? event.payload
                .records
            : Array.isArray(
                  event.payload
                    ?.log_array
                )
              ? event.payload
                  .log_array
              : [];

        const normalized =
          possibleRecords
            .map(
              (
                record
              ) =>
                normalizeHistoryRecord(
                  record,
                  event.deviceId
                )
            )
            .filter(
              Boolean
            );

        if (
          normalized.length
        ) {
          await processHistoricalPunches({
            deviceId:
              event.deviceId,

            records:
              normalized,

            syncBatchId:
              `FKWEB-${Date.now()}`,
          });
        }

        return acknowledge(
          res,
          event
        );
      }

      return acknowledge(
        res,
        event
      );
    } catch (
      error
    ) {
      console.error(
        "FKWeb receive error:",
        error
      );

      /*
       * ACK transport request so device does not get stuck
       * retransmitting endlessly.

       * Actual failure must remain visible in server logs /
       * device monitoring.
       */
      return acknowledge(
        res,
        event ||
        {}
      );
    }
  };

/* =========================================================
   HEALTH
========================================================= */

exports.ping =
  (
    req,
    res
  ) => {
    return res
      .status(
        200
      )
      .json({
        success:
          true,

        service:
          "REALTIME_FKWEB",

        time:
          new Date(),
      });
  };
const crypto =
  require("crypto");

const {
  FkWebCommand,
} =
  require(
    "./fkwebCommand.model"
  );

/* =========================================================
   CONSTANTS
========================================================= */

const DELHI_TIMEZONE =
  "Asia/Kolkata";

const DEFAULT_HISTORY_START =
  "2026-04-01T00:00:00+05:30";

/* =========================================================
   HELPERS
========================================================= */

const normalizeText =
  (
    value
  ) =>
    String(
      value ??
        ""
    ).trim();

const createTransactionId =
  () =>
    crypto
      .randomBytes(
        12
      )
      .toString(
        "hex"
      );

const createSyncBatchId =
  (
    deviceId
  ) =>
    [
      "FKWEB",
      normalizeText(
        deviceId
      ),
      Date.now(),
      crypto
        .randomBytes(
          4
        )
        .toString(
          "hex"
        ),
    ].join(
      "-"
    );

/* =========================================================
   DEVICE DATE FORMAT

   Asia/Kolkata
   YYYYMMDDHHmmss
========================================================= */

const formatDeviceDate =
  (
    value
  ) => {
    const date =
      value instanceof Date
        ? value
        : new Date(
            value
          );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      throw new Error(
        "Invalid FKWeb command date."
      );
    }

    const parts =
      new Intl.DateTimeFormat(
        "en-GB",
        {
          timeZone:
            DELHI_TIMEZONE,

          year:
            "numeric",

          month:
            "2-digit",

          day:
            "2-digit",

          hour:
            "2-digit",

          minute:
            "2-digit",

          second:
            "2-digit",

          hourCycle:
            "h23",
        }
      ).formatToParts(
        date
      );

    const map =
      {};

    for (
      const part of parts
    ) {
      if (
        part.type !==
        "literal"
      ) {
        map[
          part.type
        ] =
          part.value;
      }
    }

    return [
      map.year,
      map.month,
      map.day,
      map.hour,
      map.minute,
      map.second,
    ].join(
      ""
    );
  };

/* =========================================================
   MONTH CHUNKS

   Large history requests are deliberately split.

   This gives:
   - restart safety
   - smaller device responses
   - easier retries
   - auditable progress
========================================================= */

const buildMonthlyWindows =
  (
    from,
    to
  ) => {
    const start =
      new Date(
        from
      );

    const end =
      new Date(
        to
      );

    if (
      Number.isNaN(
        start.getTime()
      ) ||
      Number.isNaN(
        end.getTime()
      )
    ) {
      throw new Error(
        "Invalid historical sync range."
      );
    }

    if (
      start >
      end
    ) {
      throw new Error(
        "Historical sync start must be before end."
      );
    }

    const windows =
      [];

    let cursor =
      new Date(
        start
      );

    while (
      cursor <
      end
    ) {
      /*
       * Work using Delhi calendar components.
       */
      const formatted =
        new Intl.DateTimeFormat(
          "en-CA",
          {
            timeZone:
              DELHI_TIMEZONE,

            year:
              "numeric",

            month:
              "2-digit",

            day:
              "2-digit",
          }
        ).format(
          cursor
        );

      const [
        year,
        month,
      ] =
        formatted
          .split(
            "-"
          )
          .map(
            Number
          );

      let nextMonth =
        month +
        1;

      let nextYear =
        year;

      if (
        nextMonth >
        12
      ) {
        nextMonth =
          1;

        nextYear +=
          1;
      }

      const nextBoundary =
        new Date(
          `${String(
            nextYear
          ).padStart(
            4,
            "0"
          )}-${String(
            nextMonth
          ).padStart(
            2,
            "0"
          )}-01T00:00:00+05:30`
        );

      const windowEnd =
        nextBoundary <
        end
          ? new Date(
              nextBoundary.getTime() -
                1
            )
          : new Date(
              end
            );

      windows.push({
        from:
          new Date(
            cursor
          ),

        to:
          windowEnd,
      });

      cursor =
        new Date(
          windowEnd.getTime() +
            1
        );
    }

    return windows;
  };

/* =========================================================
   QUEUE HISTORICAL SYNC
========================================================= */

const queueHistoricalSync =
  async ({
    deviceId,

    from =
      DEFAULT_HISTORY_START,

    to =
      new Date(),
  }) => {
    const normalizedDeviceId =
      normalizeText(
        deviceId
      );

    if (
      !normalizedDeviceId
    ) {
      throw new Error(
        "FKWeb deviceId is required."
      );
    }

    const start =
      new Date(
        from
      );

    const end =
      new Date(
        to
      );

    const windows =
      buildMonthlyWindows(
        start,
        end
      );

    const batchRoot =
      createSyncBatchId(
        normalizedDeviceId
      );

    const commands =
      [];

    for (
      let index = 0;
      index <
      windows.length;
      index +=
        1
    ) {
      const window =
        windows[
          index
        ];

      const command =
        await FkWebCommand.create({
          deviceId:
            normalizedDeviceId,

          commandType:
            "GET_LOG_DATA",

          transactionId:
            createTransactionId(),

          from:
            window.from,

          to:
            window.to,

          syncBatchId:
            `${batchRoot}-${String(
              index + 1
            ).padStart(
              2,
              "0"
            )}`,

          status:
            "QUEUED",

          metadata: {
            sequence:
              index + 1,

            total:
              windows.length,

            timezone:
              DELHI_TIMEZONE,
          },
        });

      commands.push(
        command
      );
    }

    return commands;
  };

/* =========================================================
   GET NEXT COMMAND FOR DEVICE
========================================================= */

const getNextQueuedCommand =
  async (
    deviceId
  ) => {
    return FkWebCommand.findOne({
      deviceId:
        normalizeText(
          deviceId
        ),

      status:
        "QUEUED",
    }).sort({
      queuedAt:
        1,
    });
  };

/* =========================================================
   BUILD DEVICE COMMAND

   Isolated here intentionally.

   If exact device firmware requires another wire shape,
   only this adapter changes.
========================================================= */

const buildGetLogDataCommand =
  (
    command
  ) => {
    if (
      !command
    ) {
      return null;
    }

    return {
      cmd_code:
        "GET_LOG_DATA",

      trans_id:
        command.transactionId,

      begin_time:
        formatDeviceDate(
          command.from
        ),

      end_time:
        formatDeviceDate(
          command.to
        ),
    };
  };

/* =========================================================
   MARK SENT
========================================================= */

const markCommandSent =
  async (
    commandId
  ) => {
    return FkWebCommand.findByIdAndUpdate(
      commandId,
      {
        $set: {
          status:
            "SENT",

          sentAt:
            new Date(),

          lastError:
            "",
        },
      },
      {
        new:
          true,
      }
    );
  };

/* =========================================================
   RESULT RECEIVED
========================================================= */

const markCommandReceiving =
  async (
    transactionId,
    resultCode =
      ""
  ) => {
    return FkWebCommand.findOneAndUpdate(
      {
        transactionId:
          normalizeText(
            transactionId
          ),
      },
      {
        $set: {
          status:
            "RECEIVING",

          resultCode:
            normalizeText(
              resultCode
            ),
        },

        

        $inc: {
          resultBlocks:
            1,
        },
      },
      {
        new:
          true,
      }
    );
  };

/* =========================================================
   ADD IMPORT STATS
========================================================= */

const addImportStats =
  async (
    transactionId,
    stats
  ) => {
    return FkWebCommand.findOneAndUpdate(
      {
        transactionId:
          normalizeText(
            transactionId
          ),
      },
      {
        $inc: {
          recordsReceived:
            Number(
              stats?.received ||
                0
            ),

          recordsInserted:
            Number(
              stats?.inserted ||
                0
            ),

          recordsDuplicate:
            Number(
              stats?.duplicates ||
                0
            ),

          recordsMapped:
            Number(
              stats?.mapped ||
                0
            ),

          recordsUnmapped:
            Number(
              stats?.unmapped ||
                0
            ),

          recordsFailed:
            Number(
              stats?.errors ||
                0
            ),
        },
      },
      {
        new:
          true,
      }
    );
  };

/* =========================================================
   COMPLETE
========================================================= */

const completeCommand =
  async (
    transactionId
  ) => {
    return FkWebCommand.findOneAndUpdate(
      {
        transactionId:
          normalizeText(
            transactionId
          ),
      },
      {
        $set: {
          status:
            "COMPLETED",

          completedAt:
            new Date(),

          lastError:
            "",
        },
      },
      {
        new:
          true,
      }
    );
  };

/* =========================================================
   FAIL
========================================================= */

const failCommand =
  async (
    transactionId,
    error
  ) => {
    return FkWebCommand.findOneAndUpdate(
      {
        transactionId:
          normalizeText(
            transactionId
          ),
      },
      {
        $set: {
          status:
            "FAILED",

          failedAt:
            new Date(),

          lastError:
            String(
              error?.message ||
                error ||
                "Unknown FKWeb command error."
            ).slice(
              0,
              4000
            ),
        },
      },
      {
        new:
          true,
      }
    );
  };

/* =========================================================
   FIND COMMAND
========================================================= */

const findCommandByTransaction =
  async (
    transactionId
  ) => {
    if (
      !transactionId
    ) {
      return null;
    }

    return FkWebCommand.findOne({
      transactionId:
        normalizeText(
          transactionId
        ),
    });
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  DELHI_TIMEZONE,

  DEFAULT_HISTORY_START,

  formatDeviceDate,

  buildMonthlyWindows,

  queueHistoricalSync,

  getNextQueuedCommand,

  buildGetLogDataCommand,

  markCommandSent,

  markCommandReceiving,

  addImportStats,

  completeCommand,

  failCommand,

  findCommandByTransaction,
};
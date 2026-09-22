const {
  queueHistoricalSync,
} =
  require(
    "./fkwebCommand.service"
  );

const {
  FkWebCommand,
} =
  require(
    "./fkwebCommand.model"
  );

/* =========================================================
   QUEUE HISTORY
========================================================= */

exports.queueHistory =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        deviceId,
        from,
        to,
      } =
        req.body ||
        {};

      if (
        !deviceId
      ) {
        return res
          .status(
            400
          )
          .json({
            success:
              false,

            message:
              "deviceId is required.",
          });
      }

      const commands =
        await queueHistoricalSync({
          deviceId,

          from:
            from ||
            "2026-04-01T00:00:00+05:30",

          to:
            to ||
            new Date(),
        });

      return res
        .status(
          201
        )
        .json({
          success:
            true,

          message:
            "FKWeb historical synchronization queued.",

          count:
            commands.length,

          commands:
            commands.map(
              (
                command
              ) => ({
                id:
                  command._id,

                transactionId:
                  command.transactionId,

                syncBatchId:
                  command.syncBatchId,

                deviceId:
                  command.deviceId,

                from:
                  command.from,

                to:
                  command.to,

                status:
                  command.status,
              })
            ),
        });
    } catch (
      error
    ) {
      return next(
        error
      );
    }
  };

/* =========================================================
   STATUS
========================================================= */

exports.historyStatus =
  async (
    req,
    res,
    next
  ) => {
    try {
      const deviceId =
        String(
          req.query
            ?.deviceId ||
            ""
        ).trim();

      const query =
        deviceId
          ? {
              deviceId,
            }
          : {};

      const commands =
        await FkWebCommand
          .find(
            query
          )
          .sort({
            createdAt:
              -1,
          })
          .limit(
            100
          )
          .lean();

      return res.json({
        success:
          true,

        commands,
      });
    } catch (
      error
    ) {
      return next(
        error
      );
    }
  };
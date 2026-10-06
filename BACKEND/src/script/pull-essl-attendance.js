require("dotenv").config();

const mongoose =
  require("mongoose");

const {
  EsslCommand,
} =
  require(
    "../attendance/esslCommand.model"
  );

const DEVICE_SERIAL =
  "TBS2261000805";

/*
 * Machine-local IST times.
 *
 * Usage:
 *
 * node scripts/pull-essl-attendance.js \
 *   "2026-10-05 08:51:07" \
 *   "2026-10-06 23:59:59"
 * 
 */

const fromText =
  process.argv[2];

const toText =
  process.argv[3];

const parseIst =
  text => {
    if (
      !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(
        String(text || "")
      )
    ) {
      return null;
    }

    const date =
      new Date(
        `${text.replace(
          " ",
          "T"
        )}+05:30`
      );

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  };

const from =
  parseIst(
    fromText
  );

const to =
  parseIst(
    toText
  );

if (
  !from ||
  !to ||
  from >= to
) {
  console.error(
    "\nUsage:\n" +
    'node scripts/pull-essl-attendance.js "YYYY-MM-DD HH:mm:ss" "YYYY-MM-DD HH:mm:ss"\n'
  );

  process.exit(1);
}

const commandId =
  String(
    Date.now()
  );

const commandText =
  `C:${commandId}:DATA QUERY ATTLOG ` +
  `StartTime=${fromText}\t` +
  `EndTime=${toText}`;

(async () => {

  if (
    !process.env.MONGO_URI
  ) {
    throw new Error(
      "MONGO_URI is missing."
    );
  }

  await mongoose.connect(
    process.env.MONGO_URI
  );

  /*
   * Safety:
   * Don't queue another command while one is already
   * waiting for this terminal.
   */
  const existing =
    await EsslCommand.findOne({
      deviceSerialNumber:
        DEVICE_SERIAL,

      status: {
        $in: [
          "PENDING",
          "SENT",
        ],
      },
    }).lean();

  if (
    existing
  ) {
    console.error(
      "\nNOT QUEUED."
    );

    console.error(
      "An unfinished eSSL command already exists:"
    );

    console.log({
      commandId:
        existing.commandId,

      status:
        existing.status,

      from:
        existing.from,

      to:
        existing.to,

      queuedAt:
        existing.queuedAt,

      sentAt:
        existing.sentAt,
    });

    await mongoose.disconnect();

    process.exit(1);
  }

  const command =
    await EsslCommand.create({
      deviceSerialNumber:
        DEVICE_SERIAL,

      commandId,

      commandType:
        "DATA_QUERY_ATTLOG",

      from,

      to,

      commandText,

      status:
        "PENDING",

      queuedAt:
        new Date(),
    });

  console.log(
    "\n========================================"
  );

  console.log(
    " ESSL HISTORICAL COMMAND QUEUED"
  );

  console.log(
    "========================================"
  );

  console.log(
    "Device:",
    DEVICE_SERIAL
  );

  console.log(
    "Command ID:",
    command.commandId
  );

  console.log(
    "From:",
    fromText,
    "IST"
  );

  console.log(
    "To:",
    toText,
    "IST"
  );

  console.log(
    "Status:",
    command.status
  );

  console.log(
    "\nMachine will receive this command on its next /getrequest poll."
  );

  console.log(
    "\nCommand:"
  );

  console.log(
    commandText
  );

  console.log(
    "========================================\n"
  );

  await mongoose.disconnect();

})().catch(
  async error => {

    console.error(
      "\nFAILED:",
      error
    );

    try {
      await mongoose.disconnect();
    } catch {}

    process.exit(1);
  }
);
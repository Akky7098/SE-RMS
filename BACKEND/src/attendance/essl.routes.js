const express =
  require(
    "express"
  );

const controller =
  require(
    "./essl.controller"
  );

const router =
  express.Router();

/* =========================================================
   IMPORTANT

   This router must be mounted before express.json()
   because eSSL sends raw text/octet-stream bodies.

   Supported firmware:

   standard endpoint
   .aspx endpoint
========================================================= */

/* =========================================================
   OPTIONS / INITIAL CONNECTION
========================================================= */

router.get(
  "/cdata",
  controller.getOptions
);

router.get(
  "/cdata.aspx",
  controller.getOptions
);

/* =========================================================
   DEVICE DATA

   ATTLOG
   OPERLOG
   OPLOG
========================================================= */

router.post(
  "/cdata",
  express.raw({
    type:
      "*/*",

    limit:
      "10mb",
  }),
  controller.receiveData
);

router.post(
  "/cdata.aspx",
  express.raw({
    type:
      "*/*",

    limit:
      "10mb",
  }),
  controller.receiveData
);

/* =========================================================
   SERVER COMMAND POLLING
========================================================= */

router.get(
  "/getrequest",
  controller.getRequest
);

router.get(
  "/getrequest.aspx",
  controller.getRequest
);

/* =========================================================
   DEVICE COMMAND RESULT
========================================================= */

router.post(
  "/devicecmd",
  express.raw({
    type:
      "*/*",

    limit:
      "10mb",
  }),
  controller.deviceCommand
);

router.post(
  "/devicecmd.aspx",
  express.raw({
    type:
      "*/*",

    limit:
      "10mb",
  }),
  controller.deviceCommand
);

/* =========================================================
   HEALTH CHECK
========================================================= */

router.get(
  "/ping",
  controller.ping
);

module.exports =
  router;
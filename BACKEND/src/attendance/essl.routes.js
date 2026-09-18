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

   eSSL ADMS sends text/octet-stream bodies.

   Do not run express.json() before these raw endpoints unless
   your app middleware already excludes /iclock.
========================================================= */

/*
 * Common eSSL ADMS endpoint:
 *
 * GET /iclock/cdata?SN=...
 */
router.get(
  "/cdata",
  controller.getOptions
);

/*
 * Device posts:
 *
 * POST /iclock/cdata?SN=...&table=ATTLOG
 * POST /iclock/cdata?SN=...&table=OPERLOG
 */
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

/*
 * Poll/request heartbeat endpoint.
 */
router.get(
  "/getrequest",
  controller.getRequest
);

router.get(
  "/ping",
  controller.ping
);

module.exports =
  router;
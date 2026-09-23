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

   Supported firmware endpoint styles:

   /iclock/cdata
   /iclock/cdata.aspx

   /iclock/getrequest
   /iclock/getrequest.aspx

   Some eSSL/ZKTeco ADMS firmware versions use the .aspx
   endpoint while others use the endpoint without extension.
========================================================= */


/* =========================================================
   CDATA - DEVICE OPTIONS / INITIAL CONNECTION
========================================================= */

/*
 * Standard ADMS endpoint:
 *
 * GET /iclock/cdata?SN=...
 */
router.get(
  "/cdata",
  controller.getOptions
);

/*
 * eSSL firmware compatibility:
 *
 * GET /iclock/cdata.aspx?SN=...
 *
 * Physical Sonipat device:
 * TBS2261000805
 *
 * is currently requesting this endpoint.
 */
router.get(
  "/cdata.aspx",
  controller.getOptions
);


/* =========================================================
   CDATA - ATTENDANCE / OPERATION DATA
========================================================= */

/*
 * Standard ADMS endpoint.
 *
 * Device may post:
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
 * eSSL firmware compatibility.
 *
 * Device may post:
 *
 * POST /iclock/cdata.aspx?SN=...&table=ATTLOG
 * POST /iclock/cdata.aspx?SN=...&table=OPERLOG
 */
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
   GETREQUEST - DEVICE COMMAND POLLING
========================================================= */

/*
 * Standard ADMS command polling endpoint:
 *
 * GET /iclock/getrequest?SN=...
 */
router.get(
  "/getrequest",
  controller.getRequest
);

/*
 * eSSL firmware compatibility:
 *
 * GET /iclock/getrequest.aspx?SN=...
 */
router.get(
  "/getrequest.aspx",
  controller.getRequest
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
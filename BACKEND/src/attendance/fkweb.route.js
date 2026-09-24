const express =
  require("express");

const controller =
  require(
    "./fkweb.controller"
  );

const router =
  express.Router();

/* =========================================================
   RAW FKWEB TRANSPORT

   IMPORTANT:

   This router MUST be mounted in app.js BEFORE:

      express.json()
      express.urlencoded()

   RealTime / FKWeb devices may send:
   - JSON
   - text
   - binary EBKN/M50 payloads

   Therefore the physical receiver must preserve the original
   request bytes.
========================================================= */

const fkWebRawBody =
  express.raw({
    type:
      "*/*",

    limit:
      "20mb",
  });

/* =========================================================
   PHYSICAL FKWEB DEVICE RECEIVER — ROOT

   Production device Web Server URL can be:

      http://<host>/fkweb/

   Some RealTime/FKWeb firmware sends its protocol traffic
   directly to the configured Web Server URL rather than
   appending another path.

   Therefore "/" is a real device receiver.
========================================================= */

router.all(
  "/",
  fkWebRawBody,
  controller.receive
);

/* =========================================================
   PHYSICAL FKWEB DEVICE RECEIVER — EXPLICIT DEVICE PATH

   Keep this endpoint for:

   - existing integrations
   - diagnostics
   - firmware/configurations using /fkweb/device
   - backward compatibility

   Production may therefore use either:

      /fkweb/
      /fkweb/device
========================================================= */

router.all(
  "/device",
  fkWebRawBody,
  controller.receive
);

/* =========================================================
   BACKEND HEALTH

   This endpoint does NOT represent device online status.

   It only confirms that the FKWeb HTTP integration is
   deployed and reachable.
========================================================= */

router.get(
  "/ping",
  controller.ping
);

/* =========================================================
   DEVICE COMMUNICATION STATUS

   IMPORTANT:

   This endpoint reports persisted device communication
   timestamps. It does not generate a heartbeat.

   Keep Nginx/security policy in mind before exposing device
   diagnostics outside trusted administration.
========================================================= */

router.get(
  "/status/:deviceId",
  controller.status
);

module.exports =
  router;
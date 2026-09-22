const express =
  require("express");

const controller =
  require(
    "./fkweb.controller"
  );

const router =
  express.Router();

/* =========================================================
   PHYSICAL FKWEB DEVICE RECEIVER

   Must remain raw and must be mounted before global
   express.json() in app.js.
========================================================= */

router.all(
  "/device",
  express.raw({
    type:
      "*/*",

    limit:
      "20mb",
  }),
  controller.receive
);

/* =========================================================
   BACKEND HEALTH
========================================================= */

router.get(
  "/ping",
  controller.ping
);

/* =========================================================
   DEVICE COMMUNICATION STATUS

   Local diagnostic endpoint.

   Before exposing publicly in production, protect this
   through the normal authenticated attendance/device
   management API.
========================================================= */

router.get(
  "/status/:deviceId",
  controller.status
);

module.exports =
  router;
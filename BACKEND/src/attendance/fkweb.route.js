const express =
  require(
    "express"
  );

const controller =
  require(
    "./fkweb.controller"
  );

const router =
  express.Router();

/*
 * FKWeb can use binary/octet-stream request bodies.
 */
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

router.get(
  "/ping",
  controller.ping
);

module.exports =
  router;
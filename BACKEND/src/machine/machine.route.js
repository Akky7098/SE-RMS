const express = require("express");
const path = require("path");

const {
  getStatus,
} = require("./machine.controller");

const router = express.Router();

router.get("/status", getStatus);

router.get("/monitor", (req, res) => {
  res.sendFile(
    path.join(__dirname, "machine.html")
  );
});

module.exports = router;
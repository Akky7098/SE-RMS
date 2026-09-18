const express = require("express");

const {
  getMe,
} = require("./user.controller");

const {
  authenticate,
} = require("../middleware/auth.middleware");

const router = express.Router();

router.get(
  "/me",
  authenticate,
  getMe
);

module.exports = router;
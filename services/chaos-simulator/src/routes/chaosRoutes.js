const express = require("express");
const {
  createLatencyRule,
  createErrorRateRule
} = require("../controllers/chaosController");

const router = express.Router();

router.post("/chaos/latency", createLatencyRule);
router.post("/chaos/error-rate", createErrorRateRule);

module.exports = router;

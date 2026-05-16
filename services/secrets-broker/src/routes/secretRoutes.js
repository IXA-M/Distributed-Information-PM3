const express = require("express");
const { createSecret } = require("../controllers/secretController");

const router = express.Router();

router.post("/secrets/issue", createSecret);

module.exports = router;

const express = require("express");

const { getPublicConfig } = require("../controllers/configController");

const router = express.Router();

router.get("/public", getPublicConfig);

module.exports = router;

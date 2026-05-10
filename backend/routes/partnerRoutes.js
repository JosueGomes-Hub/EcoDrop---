const express = require("express");

const partnerController = require("../controllers/partnerController");

const router = express.Router();

router.get("/", partnerController.list);

module.exports = router;

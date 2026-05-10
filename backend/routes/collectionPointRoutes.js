const express = require("express");

const collectionPointController = require("../controllers/collectionPointController");

const router = express.Router();

router.get("/", collectionPointController.list);

module.exports = router;

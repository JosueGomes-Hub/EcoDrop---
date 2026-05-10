const express = require("express");

const missionController = require("../controllers/missionController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", authenticate, missionController.listMine);

module.exports = router;

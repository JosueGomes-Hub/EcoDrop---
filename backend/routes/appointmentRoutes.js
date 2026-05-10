const express = require("express");

const appointmentController = require("../controllers/appointmentController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", authenticate, appointmentController.listMine);
router.post("/", authenticate, appointmentController.create);

module.exports = router;

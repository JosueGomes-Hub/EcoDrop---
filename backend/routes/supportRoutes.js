const express = require("express");

const supportController = require("../controllers/supportController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/tickets", authenticate, supportController.listMine);
router.get("/tickets/:ticketId", authenticate, supportController.getMineById);
router.post("/tickets", authenticate, supportController.create);
router.post("/tickets/:ticketId/messages", authenticate, supportController.reply);

module.exports = router;
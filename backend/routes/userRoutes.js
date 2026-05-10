const express = require("express");

const userController = require("../controllers/userController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", authenticate, userController.getMe);
router.put("/me", authenticate, userController.updateMe);
router.patch("/me/password", authenticate, userController.changePassword);

module.exports = router;

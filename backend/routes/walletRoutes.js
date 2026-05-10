const express = require("express");

const walletController = require("../controllers/walletController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", authenticate, walletController.getMine);
router.get("/me/transactions", authenticate, walletController.listTransactions);
router.get("/me/redemptions", authenticate, walletController.listRedemptions);
router.post("/redeem", authenticate, walletController.redeem);

module.exports = router;

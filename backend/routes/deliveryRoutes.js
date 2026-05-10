const express = require("express");

const deliveryController = require("../controllers/deliveryController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", authenticate, deliveryController.listMine);
router.post("/", authenticate, deliveryController.create);
router.get("/operator/pending", authenticate, authorize("operator", "admin"), deliveryController.listOperatorPending);
router.patch("/:deliveryId/review", authenticate, authorize("operator", "admin"), deliveryController.review);

module.exports = router;
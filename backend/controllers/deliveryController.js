const deliveryService = require("../services/deliveryService");
const asyncHandler = require("../utils/asyncHandler");
const { validateCreateDeliveryPayload, validateReviewDeliveryPayload } = require("../validators/deliveryValidator");

exports.create = asyncHandler(async (req, res) => {
  const payload = validateCreateDeliveryPayload(req.body);
  const delivery = await deliveryService.createDelivery(req.auth.userId, payload);

  res.status(201).json({
    success: true,
    data: delivery,
  });
});

exports.listMine = asyncHandler(async (req, res) => {
  const deliveries = await deliveryService.listUserDeliveries(req.auth.userId);

  res.json({
    success: true,
    data: deliveries,
  });
});

exports.listOperatorPending = asyncHandler(async (req, res) => {
  const deliveries = await deliveryService.listPendingOperatorDeliveries(req.auth.userId, req.auth.role);

  res.json({
    success: true,
    data: deliveries,
  });
});

exports.review = asyncHandler(async (req, res) => {
  const payload = validateReviewDeliveryPayload(req.body);
  const deliveries = await deliveryService.reviewDelivery(req.auth.userId, req.auth.role, Number(req.params.deliveryId), payload);

  res.json({
    success: true,
    data: deliveries,
  });
});
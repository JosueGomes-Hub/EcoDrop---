const walletService = require("../services/walletService");
const asyncHandler = require("../utils/asyncHandler");
const { validateRedeemPayload } = require("../validators/walletValidator");

exports.getMine = asyncHandler(async (req, res) => {
  const wallet = await walletService.getWalletSummary(req.auth.userId);

  res.json({
    success: true,
    data: wallet,
  });
});

exports.listTransactions = asyncHandler(async (req, res) => {
  const transactions = await walletService.listTransactions(req.auth.userId);

  res.json({
    success: true,
    data: transactions,
  });
});

exports.listRedemptions = asyncHandler(async (req, res) => {
  const redemptions = await walletService.listRedemptions(req.auth.userId);

  res.json({
    success: true,
    data: redemptions,
  });
});

exports.redeem = asyncHandler(async (req, res) => {
  const payload = validateRedeemPayload(req.body);
  const result = await walletService.redeemBenefit(req.auth.userId, payload);

  res.status(201).json({
    success: true,
    data: result,
  });
});

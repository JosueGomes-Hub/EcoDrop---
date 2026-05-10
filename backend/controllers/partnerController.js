const partnerService = require("../services/partnerService");
const asyncHandler = require("../utils/asyncHandler");

exports.list = asyncHandler(async (req, res) => {
  const partners = await partnerService.listPartners();

  res.json({
    success: true,
    data: partners,
  });
});

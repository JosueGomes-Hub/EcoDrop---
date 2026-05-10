const collectionPointService = require("../services/collectionPointService");
const asyncHandler = require("../utils/asyncHandler");

exports.list = asyncHandler(async (req, res) => {
  const points = await collectionPointService.listCollectionPoints({
    city: req.query.city,
    material: req.query.material,
  });

  res.json({
    success: true,
    data: points,
  });
});

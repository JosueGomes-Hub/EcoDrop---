const missionService = require("../services/missionService");
const asyncHandler = require("../utils/asyncHandler");

exports.listMine = asyncHandler(async (req, res) => {
  const missions = await missionService.listUserMissions(req.auth.userId);

  res.json({
    success: true,
    data: missions,
  });
});

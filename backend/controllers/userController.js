const userService = require("../services/userService");
const asyncHandler = require("../utils/asyncHandler");
const { validatePasswordChangePayload, validateProfileUpdatePayload } = require("../validators/userValidator");

exports.getMe = asyncHandler(async (req, res) => {
  const profile = await userService.getProfile(req.auth.userId);

  res.json({
    success: true,
    data: profile,
  });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const payload = validateProfileUpdatePayload(req.body);
  const result = await userService.updateProfile(req.auth.userId, payload);

  res.json({
    success: true,
    data: result,
  });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const payload = validatePasswordChangePayload(req.body);
  await userService.changePassword(req.auth.userId, payload);

  res.json({
    success: true,
    data: {
      message: "Senha atualizada com sucesso.",
    },
  });
});

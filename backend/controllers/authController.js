const authService = require("../services/authService");
const asyncHandler = require("../utils/asyncHandler");
const { validateLoginPayload, validateRegisterPayload } = require("../validators/authValidator");

exports.register = asyncHandler(async (req, res) => {
  const payload = validateRegisterPayload(req.body);
  const result = await authService.registerUser(payload);

  res.status(201).json({
    success: true,
    data: result,
  });
});

exports.login = asyncHandler(async (req, res) => {
  const payload = validateLoginPayload(req.body);
  const result = await authService.loginUser(payload);

  res.json({
    success: true,
    data: result,
  });
});

exports.me = asyncHandler(async (req, res) => {
  const user = await authService.getAuthenticatedUser(req.auth.userId);

  res.json({
    success: true,
    data: user,
  });
});

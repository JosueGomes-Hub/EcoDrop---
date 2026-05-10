const ApiError = require("../utils/apiError");

function validateRedeemPayload(body = {}) {
  const benefitId = Number(body.benefitId);

  if (!Number.isInteger(benefitId) || benefitId <= 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Benefício inválido para resgate.");
  }

  return {
    benefitId,
  };
}

module.exports = {
  validateRedeemPayload,
};
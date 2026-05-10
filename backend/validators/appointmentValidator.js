const ApiError = require("../utils/apiError");

function requireText(fieldName, value, maxLength = 255) {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    throw new ApiError(400, "VALIDATION_ERROR", `O campo ${fieldName} é obrigatório.`);
  }

  if (normalizedValue.length > maxLength) {
    throw new ApiError(400, "VALIDATION_ERROR", `O campo ${fieldName} é maior do que o permitido.`);
  }

  return normalizedValue;
}

function validateAppointmentPayload(body = {}) {
  return {
    pointSlug: requireText("pointSlug", body.pointSlug, 150),
    scheduledDate: requireText("scheduledDate", body.scheduledDate, 10),
    startTime: requireText("startTime", body.startTime, 8),
    endTime: requireText("endTime", body.endTime, 8),
    notes: String(body.notes || "").trim() || null,
  };
}

module.exports = {
  validateAppointmentPayload,
};

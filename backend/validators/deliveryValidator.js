const ApiError = require("../utils/apiError");

function requireText(fieldName, value, options = {}) {
  const { min = 1, max = 255 } = options;
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    throw new ApiError(400, "VALIDATION_ERROR", `O campo ${fieldName} é obrigatório.`);
  }

  if (normalizedValue.length < min || normalizedValue.length > max) {
    throw new ApiError(400, "VALIDATION_ERROR", `O campo ${fieldName} está fora do tamanho esperado.`);
  }

  return normalizedValue;
}

function validateCreateDeliveryPayload(body = {}) {
  const items = Array.isArray(body.items) ? body.items : [];

  if (!items.length) {
    throw new ApiError(400, "VALIDATION_ERROR", "Informe ao menos um material na entrega.");
  }

  return {
    pointSlug: requireText("pointSlug", body.pointSlug, { min: 3, max: 150 }),
    appointmentId: body.appointmentId ? Number(body.appointmentId) : null,
    userNotes: String(body.userNotes || "").trim() || null,
    items: items.map((item, index) => {
      const quantity = Number(item.quantity);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new ApiError(400, "VALIDATION_ERROR", `Quantidade inválida para o item ${index + 1}.`);
      }

      return {
        materialSlug: requireText(`materialSlug do item ${index + 1}`, item.materialSlug, { min: 3, max: 100 }),
        quantity: Number(quantity.toFixed(2)),
      };
    }),
  };
}

function validateReviewDeliveryPayload(body = {}) {
  if (!["confirmed", "rejected"].includes(body.status)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Status de revisão inválido.");
  }

  return {
    status: body.status,
    operatorNotes: String(body.operatorNotes || "").trim() || null,
  };
}

module.exports = {
  validateCreateDeliveryPayload,
  validateReviewDeliveryPayload,
};
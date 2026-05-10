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

function validateCreateTicketPayload(body = {}) {
  return {
    category: requireText("categoria", body.category, { min: 2, max: 80 }),
    subject: requireText("assunto", body.subject, { min: 4, max: 150 }),
    description: requireText("descricao", body.description, { min: 10, max: 5000 }),
    priority: ["low", "medium", "high"].includes(body.priority) ? body.priority : "medium",
  };
}

function validateTicketMessagePayload(body = {}) {
  return {
    message: requireText("mensagem", body.message, { min: 2, max: 5000 }),
  };
}

module.exports = {
  validateCreateTicketPayload,
  validateTicketMessagePayload,
};
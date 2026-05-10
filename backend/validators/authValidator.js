const ApiError = require("../utils/apiError");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function validateRegisterPayload(body = {}) {
  const nome = requireText("nome", body.nome, { min: 2, max: 100 });
  const sobrenome = requireText("sobrenome", body.sobrenome, { min: 2, max: 100 });
  const cpf = onlyDigits(requireText("cpf", body.cpf, { min: 11, max: 20 }));
  const telefone = onlyDigits(requireText("telefone", body.telefone, { min: 10, max: 20 }));
  const cep = onlyDigits(requireText("cep", body.cep, { min: 8, max: 10 }));
  const cidade = requireText("cidade", body.cidade, { min: 2, max: 100 });
  const estado = requireText("estado", body.estado, { min: 2, max: 2 }).toUpperCase();
  const email = requireText("email", body.email, { min: 5, max: 150 }).toLowerCase();
  const senha = String(body.senha || "");

  if (cpf.length !== 11) {
    throw new ApiError(400, "VALIDATION_ERROR", "CPF inválido.");
  }

  if (telefone.length < 10 || telefone.length > 11) {
    throw new ApiError(400, "VALIDATION_ERROR", "Telefone inválido.");
  }

  if (cep.length !== 8) {
    throw new ApiError(400, "VALIDATION_ERROR", "CEP inválido.");
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw new ApiError(400, "VALIDATION_ERROR", "E-mail inválido.");
  }

  if (senha.length < 8) {
    throw new ApiError(400, "VALIDATION_ERROR", "A senha deve ter pelo menos 8 caracteres.");
  }

  return {
    nome,
    sobrenome,
    cpf,
    telefone,
    cep,
    cidade,
    estado,
    email,
    senha,
  };
}

function validateLoginPayload(body = {}) {
  const email = requireText("email", body.email, { min: 5, max: 150 }).toLowerCase();
  const senha = String(body.senha || "");

  if (!EMAIL_PATTERN.test(email)) {
    throw new ApiError(400, "VALIDATION_ERROR", "E-mail inválido.");
  }

  if (!senha) {
    throw new ApiError(400, "VALIDATION_ERROR", "A senha é obrigatória.");
  }

  return {
    email,
    senha,
  };
}

module.exports = {
  validateLoginPayload,
  validateRegisterPayload,
};

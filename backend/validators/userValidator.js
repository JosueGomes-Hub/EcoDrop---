const ApiError = require("../utils/ApiError");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PROFILE_ALLOWED_FIELDS = new Set([
  "nome",
  "sobrenome",
  "telefone",
  "cep",
  "cidade",
  "estado",
  "email",
  "senhaAtual",
]);

const PASSWORD_ALLOWED_FIELDS = new Set(["senhaAtual", "novaSenha", "confirmacaoNovaSenha"]);

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

function rejectUnexpectedFields(body, allowedFields) {
  const unexpectedFields = Object.keys(body || {}).filter((field) => !allowedFields.has(field));

  if (unexpectedFields.length) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "O payload contém campos que não podem ser alterados.",
      { unexpectedFields },
    );
  }
}

function validateProfileUpdatePayload(body = {}) {
  rejectUnexpectedFields(body, PROFILE_ALLOWED_FIELDS);

  const changes = {};

  if (Object.prototype.hasOwnProperty.call(body, "nome")) {
    changes.nome = requireText("nome", body.nome, { min: 2, max: 100 });
  }

  if (Object.prototype.hasOwnProperty.call(body, "sobrenome")) {
    changes.sobrenome = requireText("sobrenome", body.sobrenome, { min: 2, max: 100 });
  }

  if (Object.prototype.hasOwnProperty.call(body, "telefone")) {
    const telefone = onlyDigits(requireText("telefone", body.telefone, { min: 10, max: 20 }));

    if (telefone.length < 10 || telefone.length > 11) {
      throw new ApiError(400, "VALIDATION_ERROR", "Telefone inválido.");
    }

    changes.telefone = telefone;
  }

  if (Object.prototype.hasOwnProperty.call(body, "cep")) {
    const cep = onlyDigits(requireText("cep", body.cep, { min: 8, max: 10 }));

    if (cep.length !== 8) {
      throw new ApiError(400, "VALIDATION_ERROR", "CEP inválido.");
    }

    changes.cep = cep;
  }

  if (Object.prototype.hasOwnProperty.call(body, "cidade")) {
    changes.cidade = requireText("cidade", body.cidade, { min: 2, max: 100 });
  }

  if (Object.prototype.hasOwnProperty.call(body, "estado")) {
    changes.estado = requireText("estado", body.estado, { min: 2, max: 2 }).toUpperCase();
  }

  if (Object.prototype.hasOwnProperty.call(body, "email")) {
    const email = requireText("email", body.email, { min: 5, max: 150 }).toLowerCase();

    if (!EMAIL_PATTERN.test(email)) {
      throw new ApiError(400, "VALIDATION_ERROR", "E-mail inválido.");
    }

    changes.email = email;
  }

  if (!Object.keys(changes).length) {
    throw new ApiError(400, "VALIDATION_ERROR", "Informe ao menos um dado para atualização.");
  }

  return {
    changes,
    currentPassword: String(body.senhaAtual || ""),
  };
}

function validatePasswordChangePayload(body = {}) {
  rejectUnexpectedFields(body, PASSWORD_ALLOWED_FIELDS);

  const currentPassword = String(body.senhaAtual || "");
  const newPassword = String(body.novaSenha || "");
  const confirmNewPassword = String(body.confirmacaoNovaSenha || "");

  if (!currentPassword) {
    throw new ApiError(400, "VALIDATION_ERROR", "A senha atual é obrigatória.");
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, "VALIDATION_ERROR", "A nova senha deve ter pelo menos 8 caracteres.");
  }

  if (newPassword !== confirmNewPassword) {
    throw new ApiError(400, "VALIDATION_ERROR", "A confirmação da nova senha não confere.");
  }

  return {
    currentPassword,
    newPassword,
  };
}

module.exports = {
  validatePasswordChangePayload,
  validateProfileUpdatePayload,
};
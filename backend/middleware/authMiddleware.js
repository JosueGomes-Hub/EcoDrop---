const jwt = require("jsonwebtoken");

const ApiError = require("../utils/apiError");

function getBearerToken(headerValue) {
  if (!headerValue || !headerValue.startsWith("Bearer ")) {
    return null;
  }

  return headerValue.slice("Bearer ".length).trim();
}

function authenticate(req, res, next) {
  const token = getBearerToken(req.headers.authorization);

  if (!token) {
    return next(new ApiError(401, "UNAUTHORIZED", "Token de acesso não informado."));
  }

  if (!process.env.JWT_SECRET) {
    return next(new ApiError(500, "JWT_NOT_CONFIGURED", "JWT_SECRET não configurado."));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.auth = {
      userId: Number(payload.sub),
      role: payload.role,
      email: payload.email,
    };

    return next();
  } catch (error) {
    return next(new ApiError(401, "INVALID_TOKEN", "Token inválido ou expirado."));
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth) {
      return next(new ApiError(401, "UNAUTHORIZED", "Autenticação obrigatória."));
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return next(new ApiError(403, "FORBIDDEN", "Acesso não autorizado para este perfil."));
    }

    return next();
  };
}

module.exports = {
  authenticate,
  authorize,
};

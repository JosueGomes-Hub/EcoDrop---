const ApiError = require("../utils/apiError");

function notFoundHandler(req, res, next) {
  next(new ApiError(404, "ROUTE_NOT_FOUND", "A rota solicitada não existe."));
}

module.exports = {
  notFoundHandler,
};

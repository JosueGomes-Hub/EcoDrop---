const supportService = require("../services/supportService");
const asyncHandler = require("../utils/asyncHandler");
const { validateCreateTicketPayload, validateTicketMessagePayload } = require("../validators/supportValidator");

exports.listMine = asyncHandler(async (req, res) => {
  const tickets = await supportService.listUserTickets(req.auth.userId);

  res.json({
    success: true,
    data: tickets,
  });
});

exports.getMineById = asyncHandler(async (req, res) => {
  const ticket = await supportService.getTicketDetails(req.auth.userId, Number(req.params.ticketId));

  res.json({
    success: true,
    data: ticket,
  });
});

exports.create = asyncHandler(async (req, res) => {
  const payload = validateCreateTicketPayload(req.body);
  const ticket = await supportService.createTicket(req.auth.userId, payload);

  res.status(201).json({
    success: true,
    data: ticket,
  });
});

exports.reply = asyncHandler(async (req, res) => {
  const payload = validateTicketMessagePayload(req.body);
  const ticket = await supportService.addTicketMessage(req.auth.userId, Number(req.params.ticketId), payload);

  res.json({
    success: true,
    data: ticket,
  });
});
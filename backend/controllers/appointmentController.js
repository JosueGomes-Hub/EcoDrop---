const appointmentService = require("../services/appointmentService");
const asyncHandler = require("../utils/asyncHandler");
const { validateAppointmentPayload } = require("../validators/appointmentValidator");

exports.create = asyncHandler(async (req, res) => {
  const payload = validateAppointmentPayload(req.body);
  const appointment = await appointmentService.createAppointment(req.auth.userId, payload);

  res.status(201).json({
    success: true,
    data: appointment,
  });
});

exports.listMine = asyncHandler(async (req, res) => {
  const appointments = await appointmentService.listUserAppointments(req.auth.userId);

  res.json({
    success: true,
    data: appointments,
  });
});

const moment = require('moment');
const Appointment = require('../models/Appointment');
const ApiError = require('./ApiError');

const toM = (hhmm) => moment(hhmm, 'HH:mm');

// Throws ApiError(400, ...) on any conflict/invalid-slot condition.
// Pass excludeId when rescheduling so the appointment being moved is ignored.
async function validateAppointmentSlot({
  optometrist,
  date,
  startTime,
  duration,
  excludeId,
}) {
  const m = moment(date);
  if (!m.isValid()) throw new ApiError(400, 'Invalid date');

  if (m.clone().startOf('day').isBefore(moment().startOf('day'))) {
    throw new ApiError(400, 'Cannot book in the past');
  }

  const dayOfWeek = m.format('dddd').toLowerCase();
  const wh = optometrist.workingHours && optometrist.workingHours[dayOfWeek];
  if (!wh || !wh.working) {
    throw new ApiError(400, 'Optometrist is not working on this day');
  }

  const newStart = toM(startTime);
  const newEnd = newStart.clone().add(duration, 'minutes');
  const workStart = toM(wh.start);
  const workEnd = toM(wh.end);

  if (newStart.isBefore(workStart) || newEnd.isAfter(workEnd)) {
    throw new ApiError(
      400,
      `Slot must fall within working hours ${wh.start}-${wh.end}`,
    );
  }

  const lunchStart = toM((optometrist.lunchBreak && optometrist.lunchBreak.start) || '12:00');
  const lunchEnd = toM((optometrist.lunchBreak && optometrist.lunchBreak.end) || '13:00');
  if (newStart.isBefore(lunchEnd) && newEnd.isAfter(lunchStart)) {
    throw new ApiError(400, 'Slot overlaps lunch break');
  }

  const dayStart = m.clone().startOf('day').toDate();
  const dayEnd = m.clone().endOf('day').toDate();
  const query = {
    optometrist: optometrist._id,
    date: { $gte: dayStart, $lte: dayEnd },
    status: { $ne: 'cancelled' },
  };
  if (excludeId) query._id = { $ne: excludeId };

  const sameDay = await Appointment.find(query).select('startTime duration');

  const max = optometrist.maxAppointmentsPerDay || 16;
  if (sameDay.length >= max) {
    throw new ApiError(400, 'Daily booking limit reached for this optometrist');
  }

  const buffer = optometrist.bufferTime || 0;
  for (const e of sameDay) {
    const eStart = toM(e.startTime);
    const eEnd = eStart.clone().add(e.duration || 30, 'minutes');
    const blockStart = eStart.clone().subtract(buffer, 'minutes');
    const blockEnd = eEnd.clone().add(buffer, 'minutes');
    if (newStart.isBefore(blockEnd) && newEnd.isAfter(blockStart)) {
      throw new ApiError(
        400,
        `Slot conflicts with an existing appointment at ${e.startTime}`,
      );
    }
  }
}

module.exports = { validateAppointmentSlot };

export const getUserRole = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  return user;
};

const getAppointmentDateTime = (appointment) => {
  return new Date(appointment.date);
};

export const getNextAppointment = (appointments = []) => {
  const now = new Date();

  const upcoming = appointments
    .filter(
      (appt) =>
        appt.status !== "cancelled" && getAppointmentDateTime(appt) > now,
    )
    .sort((a, b) => getAppointmentDateTime(a) - getAppointmentDateTime(b));

  return upcoming.length ? upcoming[0] : null;
};

export const getDaysUntilAppointment = (appointment) => {
  if (!appointment) return null;

  const now = new Date();
  const apptDate = getAppointmentDateTime(appointment);

  const diffMs = apptDate - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
};

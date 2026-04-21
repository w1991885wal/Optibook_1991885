import API from "./api";

export const getMe = () => API.get("/auth/me");

// future-ready
export const getPatientAppointments = () => API.get("/appointments"); // backend later

export const getPatientRecords = () => API.get("/records/my"); // backend later

import API from "./api";

// Phase E: in-app notifications. The backend scopes results by the caller's
// role (optometrist → their own; admin → admin-scope rows).
export const listNotifications = () => API.get("/notifications");
export const markNotificationRead = (id) =>
  API.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () =>
  API.post("/notifications/mark-all-read");

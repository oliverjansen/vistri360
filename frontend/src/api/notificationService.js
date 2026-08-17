import { request } from "./apiConfig";

export const fetchNotifications = () => request("notifications");
export const markNotificationRead = (id) => request(`notifications/${id}/read`, { method: "PATCH" });

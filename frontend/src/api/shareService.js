import { request } from "./apiConfig";

export const createShareLink = (projectId) => request(`projects/${projectId}/share`, { method: "POST" });
export const updateShareLink = (projectId, expiresAt) => request(`projects/${projectId}/share`, { method: "PUT", body: JSON.stringify({ expires_at: expiresAt || null }) });
export const getShareSnapshot = (token) => request(`shares/${token}`);

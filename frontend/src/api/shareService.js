import { request } from "./apiConfig";

export const createShareLink = (projectId) => request(`projects/${projectId}/share`, { method: "POST" });
export const getShareSnapshot = (token) => request(`shares/${token}`);

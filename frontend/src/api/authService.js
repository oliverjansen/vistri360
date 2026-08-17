import { request } from "./apiConfig";
import { CACHE_KEYS, getCached, invalidateCache } from "./dashboardCache";

export const login = (credentials) => request("auth/login", { method: "POST", body: JSON.stringify(credentials) });
export const logout = () => request("auth/logout", { method: "POST" });
export const fetchMe = () => request("auth/me");
export const fetchProfile = () => request("profile");
export const fetchProfileCached = (forceRefresh = false) => getCached(CACHE_KEYS.profile, fetchProfile, forceRefresh);
export const updateProfile = (payload) => request("profile", { method: "PUT", body: JSON.stringify(payload) });
export const invalidateProfileCache = () => invalidateCache(CACHE_KEYS.profile);

export const isAuthenticated = () => Boolean(localStorage.getItem("vistri_token"));
export const clearAuth = () => localStorage.removeItem("vistri_token");

import { request } from "./apiConfig";
import { CACHE_KEYS, getCached, invalidateCache } from "./dashboardCache";

export const fetchClients = () => request("clients");

export const fetchClientsCached = (forceRefresh = false) => getCached(CACHE_KEYS.clients, fetchClients, forceRefresh);

export const fetchClient = (clientId) => request(`clients/${clientId}`);

export const fetchClientCached = (clientId, forceRefresh = false) => getCached(
  CACHE_KEYS.client(clientId),
  () => fetchClient(clientId),
  forceRefresh,
);

export const createClient = (payload) => request("clients", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const invalidateClientsCache = () => invalidateCache(CACHE_KEYS.clients);

export const deleteClient = (clientId) => request("clients/" + clientId, {
  method: "DELETE",
});

export const restoreClient = (clientId) => request("clients/" + clientId + "/restore", {
  method: "POST",
});

export const fetchClientProjects = (clientId) => request(`clients/${clientId}/projects`);

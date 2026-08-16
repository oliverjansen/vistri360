const CACHE_TTL = 5 * 60 * 60 * 1000;
const cache = new Map();

export const getCached = async (key, loader, forceRefresh = false) => {
  const current = cache.get(key);
  const isFresh = current?.value !== undefined && Date.now() - current.updatedAt < CACHE_TTL;

  if (!forceRefresh && isFresh) return current.value;
  if (current?.promise) return current.promise;

  const promise = loader()
    .then((value) => {
      cache.set(key, { value, updatedAt: Date.now() });
      return value;
    })
    .catch((error) => {
      cache.delete(key);
      throw error;
    });

  cache.set(key, { ...current, promise });
  return promise;
};

export const invalidateCache = (key) => {
  cache.delete(key);
};

export const getCacheUpdatedAt = (key) => cache.get(key)?.updatedAt ?? null;

export const CACHE_KEYS = {
  profile: "account:profile",
  clients: "dashboard:clients",
  client: (clientId) => `dashboard:client:${clientId}`,
  projects: (clientId) => `dashboard:projects:${clientId}`,
};

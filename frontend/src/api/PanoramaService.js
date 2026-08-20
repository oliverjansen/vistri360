import { request } from "./apiConfig";

// React Strict Mode can re-run the viewer initialization effect while the
// first request is still pending. Share those pending GETs so one mount does
// not create duplicate API calls.
const panoramaRequestCache = new Map();

const requestPanoramaOnce = (key, endpoint) => {
    const cachedRequest = panoramaRequestCache.get(key);
    if (cachedRequest && cachedRequest.expiresAt > Date.now()) {
        return cachedRequest.promise;
    }

    const pendingRequest = request(endpoint).finally(() => {
        const currentRequest = panoramaRequestCache.get(key);
        if (currentRequest?.promise === pendingRequest) {
            // Also cover immediately repeated effect runs after a fast
            // response. Mutations clear this short-lived cache.
            currentRequest.expiresAt = Date.now() + 1000;
        }
    });

    panoramaRequestCache.set(key, { promise: pendingRequest, expiresAt: Number.POSITIVE_INFINITY });
    return pendingRequest;
};

export const clearPanoramaRequestCache = () => {
    panoramaRequestCache.clear();
};


export const getPanoramas = async(params) => {
    try {

        const queryBuilder = new URLSearchParams(
            Object.entries(params ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
        ).toString()

        const endpoint = `panorama/?${queryBuilder}`;
        const panoramas = await requestPanoramaOnce(`assets:${queryBuilder}`, endpoint);

        return panoramas;

    } catch (error) {
        console.log(error);
        throw error;
    }
}

export const attachPanorama = (panoramaId, projectId, groupId, allowCrossGroup = false, moveFromGroupId = null) => request(`panorama/${panoramaId}/attach`, {
    method: 'POST',
    body: JSON.stringify({
        project_id: projectId,
        group_id: groupId,
        allow_cross_group: allowCrossGroup,
        move_from_group_id: moveFromGroupId,
    }),
}).finally(clearPanoramaRequestCache);

export const showPanorama = async (user_id) => {
    try {
        const data = await request(`panorama/${user_id}`); // GET project by ID
        return data;
    } catch (error) {
        console.error('Failed to load the Project',error);
        throw error;
    }
}

export const updatePanoramaName = (panoramaId, name) => request(`panorama/${panoramaId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
}).finally(clearPanoramaRequestCache);

export const getPanoramaGroups = (projectId, clientId) => {
    const query = clientId ? `?client_id=${encodeURIComponent(clientId)}` : "";
    return requestPanoramaOnce(`groups:${projectId}:${clientId ?? ""}`, `panorama/projects/${projectId}/groups${query}`);
};

export const createPanoramaGroup = (projectId, name) => request(`panorama/projects/${projectId}/groups`, {
    method: 'POST',
    body: JSON.stringify({ name }),
}).finally(clearPanoramaRequestCache);

export const updatePanoramaGroup = (projectId, groupId, name) => request(`panorama/projects/${projectId}/groups/${groupId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
}).finally(clearPanoramaRequestCache);

export const deletePanoramaGroup = (projectId, groupId) => request(`panorama/projects/${projectId}/groups/${groupId}`, {
    method: 'DELETE',
}).finally(clearPanoramaRequestCache);

export const AddPanoramas = async (files, project_id, group_id, client_id) => {

    const formData = new FormData();

    files.forEach((file) => {
        formData.append('panoramas[]', file);
    });
    
    // Append the owning project ID from the active scene route.
    formData.append('project_id', project_id);
    if (group_id) formData.append('group_id', group_id);
    if (client_id) formData.append('client_id', client_id);
    
    return await request('panorama/upload',{
        method: 'POST',
        body: formData
    }).finally(clearPanoramaRequestCache);
    
}

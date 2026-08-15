import { request } from "./apiConfig";
import { CACHE_KEYS, getCacheUpdatedAt, getCached, invalidateCache } from "./dashboardCache";

export const fetchProject = async (projectId) => {
    try {
        const data = await request(`projects/${projectId}`); // GET project by ID
        return data;
    } catch (error) {
        console.error('Failed to load the Project',error);
        throw error;
    }
}

export const fetchProjects = async (clientId) => {
    const data = await request(`projects?client_id=${encodeURIComponent(clientId)}`);
    return data;
};

export const fetchProjectsCached = (clientId, forceRefresh = false) => getCached(
    CACHE_KEYS.projects(clientId),
    () => fetchProjects(clientId),
    forceRefresh,
);

export const getProjectsCacheUpdatedAt = (clientId) => getCacheUpdatedAt(CACHE_KEYS.projects(clientId));

export const invalidateProjectsCache = (clientId) => invalidateCache(CACHE_KEYS.projects(clientId));

export const createProject = async (payload) => {
    return request('projects', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
};


export const AddPanoramas = async (files, projectId) => {

    const formData = new FormData();

    files.forEach((file) => {
        formData.append('panoramas[]', file);
    });
    
    // Append project id and panorama id
    formData.append('project_id', projectId);
    
    return await request('projects/images/upload',{
        method: 'POST',
        body: formData
    });
    
}

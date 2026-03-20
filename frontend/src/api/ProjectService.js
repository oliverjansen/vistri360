import { request } from "./apiConfig";

export const fetchProject = async (projectId) => {
    try {
        const data = await request(`projects/${projectId}`); // GET project by ID
        return data;
    } catch (error) {
        console.error('Failed to load the Project',error);
        throw error;
    }
}
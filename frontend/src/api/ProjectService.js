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


export const AddPanoramas = async (files, projectId) => {

    const formData = new FormData();

    files.forEach((file) => {
        formData.append('panoramas[]', file);
    });
    
    // Append project id and panorama id
    formData.append('project_id', 1); 
    
    return await request('projects/images/upload',{
        method: 'POST',
        body: formData
    });
    
}

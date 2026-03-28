import { request } from "./apiConfig";


export const getPanoramas = async(params) => {
    try {

        const queryBuilder = new URLSearchParams(params).toString()

        const panoramas = await request(`panorama/?${queryBuilder}`);

        return panoramas;

    } catch (error) {
        console.log(error);
        throw error;
    }
}


export const showPanorama = async (user_id) => {
    try {
        const data = await request(`panorama/${user_id}`); // GET project by ID
        return data;
    } catch (error) {
        console.error('Failed to load the Project',error);
        throw error;
    }
}

export const AddPanoramas = async (files, user_id) => {

    const formData = new FormData();

    files.forEach((file) => {
        formData.append('panoramas[]', file);
    });
    
    // Append project id and panorama id
    formData.append('user_id', 1); 
    
    return await request('panorama/upload',{
        method: 'POST',
        body: formData
    });
    
}
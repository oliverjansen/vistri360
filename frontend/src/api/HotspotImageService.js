import { request } from "./apiConfig";
import { useState } from "react";

export const AddPanoramas = async (files, projectId, hotspotId) => {

    const formData = new FormData();

    files.forEach((file) => {
        formData.append('panoramas[]', file);
    });
    
    // Append project id and panorama id
    formData.append('project_id', 1); 
    formData.append('hotspot_id',1);
    
    return await request('projects/hotspots/images/upload',{
        method: 'POST',
        body: formData
    });
    
}

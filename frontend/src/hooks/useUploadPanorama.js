import { useState } from "react";
import { AddPanoramas } from "../api/HotspotImageService"

export const useUploadPanoramas = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    const uploadPanoramas = async(files, projectId, hotspotId) => {
        try {
            setIsLoading(true);
            const response = await AddPanoramas(files, projectId, hotspotId);

            const data = (typeof response.json === 'function') ? await response.json() : response;

            if(response.status && !response.ok){
                throw new error(data.message || 'Server Error');
            }

            return data;

        } catch (error) {
            console.error('Error in Uploading Panoramas', error);
            setErrorMessage(error.message);
            throw error;
            
        } finally {
            setIsLoading(false);
        }
    }

    return { uploadPanoramas, isLoading, errorMessage};

}
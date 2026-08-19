import { useState } from "react";
import { AddPanoramas } from "../api/PanoramaService"

export const useUploadPanoramas = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    const uploadPanoramas = async(files, projectId, locationId, clientId) => {
        try {
            setIsLoading(true);
            const response = await AddPanoramas(files, projectId, locationId, clientId);

            return response;

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

import { request } from "./apiConfig";

export const getHotSpot = async (payload) => {
    try {
        const payloadBuilder = new URLSearchParams(payload).toString();
        return await request("projects/hotspots/?" + payloadBuilder);
    } catch (error) {
        console.error("Error fetching hotspots", error);
        throw error;
    }
};

export const saveProject = async (projectId, payload) => {
    try {
        return await request(`projects/${projectId}`, {
            method: "PUT",
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error("Error saving project panorama data", error);
        throw error;
    }
};

export const saveHotspots = (payload) => saveProject(payload.project_id, payload);

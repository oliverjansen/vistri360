import {request} from "./apiConfig";

export const fetchHotSpot = async () => {
    try {
        const data = await request('hotspots'); // GET hotspots
        return data;
    } catch (error) {
        console.error('Error Fetching Hotspot', error);
        throw error;
    }
}




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


export const saveHotspots = async(payload) => {
    try {
        const data = await request('projects/hotspots/updateHotspost',{
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body:JSON.stringify(payload)
        });

        return data;
    } catch (error) {
        console.log('Error saving Coordinates', error);
        throw error;
    }
}




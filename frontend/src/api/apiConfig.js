
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8080/api'}`.replace(/\/$/, '') + '/';

export const request = async (endpoint, options = {}) => {
    
    //stop request if signal is aborted and get the custom config
    const {signal, ...customConfig} = options;
    const isFormdata = customConfig.body instanceof FormData;
    const requestMethod = (customConfig.method ?? 'GET').toUpperCase();

    const config = {
        method: 'GET',
        headers:{
            'Accept': 'application/json',
            ...(!isFormdata && { 'Content-Type': 'application/json' }),
            ...(localStorage.getItem('vistri_token') ? { Authorization: `Bearer ${localStorage.getItem('vistri_token')}` } : {}),
            ...(customConfig.headers || {}),
        },
        // Panorama and group reads must reflect uploads immediately. Prevent
        // the browser from reusing an older JSON response.
        ...(requestMethod === 'GET' ? { cache: 'no-store' } : {}),
        signal,
        ...customConfig,
    };

    const response = await fetch(BASE_URL + endpoint, config);

    if (!response.ok) {
        const error = new Error(`Request failed with status ${response.status}`);
        error.status = response.status;
        error.data = await response.json().catch(() => null);
        throw error;
    }

    return response.json();
}


const BASE_URL = 'http://127.0.0.1:8080/api/';

export const request = async (endpoint, options = {}) => {
    
    //stop request if signal is aborted and get the custom config
    const {signal, ...customConfig} = options;

    const config = {
        method: 'GET',
        // headers:{'Content-Type': 'application/json'},
        signal,
        ...customConfig,
    };

    const response = await fetch(BASE_URL + endpoint, config);

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json();
}
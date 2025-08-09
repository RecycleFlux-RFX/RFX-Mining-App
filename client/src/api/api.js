import axios from 'axios';

const api = axios.create({
    baseURL: 'https://rfx-mining-app.onrender.com',
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true // Required for CORS with credentials
});

export default api;
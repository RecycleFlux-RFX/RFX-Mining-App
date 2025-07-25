import axios from 'axios';

// Create an Axios instance with default configuration
const api = axios.create({
    baseURL: 'http://localhost:3000', // Adjust if backend runs on a different port
    timeout: 10000, // 10 seconds timeout
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Request interceptor to add authentication token if available
api.interceptors.request.use(
    (config) => {
        // Add token from localStorage
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors globally
api.interceptors.response.use(
    (response) => {
        return response.data; // Return only the data portion of the response
    },
    (error) => {
        // Handle common error cases
        if (error.response) {
            const { status, data } = error.response;
            if (status === 401) {
                console.error('Unauthorized, please log in again');
                localStorage.removeItem('authToken');
                window.location.href = '/login';
            } else if (status >= 500) {
                console.error('Server error, please try again later');
            }
            return Promise.reject(data.message || 'An error occurred');
        } else if (error.request) {
            console.error('No response received from server');
            return Promise.reject('Network error, please check your connection');
        } else {
            console.error('Error setting up request:', error.message);
            return Promise.reject('An unexpected error occurred');
        }
    }
);

export default api;
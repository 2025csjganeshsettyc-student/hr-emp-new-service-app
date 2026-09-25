import axios from 'axios';

// Create a centralized Axios instance to make API calls to the backend.
const api = axios.create({
    baseURL: 'http://localhost:8000',
});

// Interceptor: Runs automatically before every request is sent.
// This is used to attach the JWT token (if logged in) to the Authorization header,
// so the backend knows who is making the request.
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;

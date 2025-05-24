import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api', // Use env var, fallback to /api
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add an interceptor to include the token in Authorization headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken'); // Get token from localStorage
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Add response interceptor for handling 401 errors globally
// apiClient.interceptors.response.use(
//   response => response,
//   error => {
//     if (error.response && error.response.status === 401) {
//       // Token might be invalid or expired
//       // Here you could trigger a logout or redirect to login
//       // Example: AuthContext.logout(); window.location.href = '/login';
//       console.error("Unauthorized access - 401. Token may be invalid.");
//     }
//     return Promise.reject(error);
//   }
// );

export default apiClient;

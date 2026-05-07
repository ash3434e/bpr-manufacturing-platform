import axios from 'axios';

const isElectron = window.location.protocol === 'file:';

const api = axios.create({
  baseURL: window.Capacitor?.isNativePlatform() ? 'http://172.31.204.40:8421/api' : (isElectron ? 'http://localhost:8421/api' : '/api'),
  headers: { 'Content-Type': 'application/json' }
});

// Add auth token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('bpr_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('bpr_token');
      localStorage.removeItem('bpr_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;


import axios from 'axios';

// Limpiamos la URL para evitar duplicados indeseados
const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
// Si la base ya termina en /api, la usamos; si no, se lo agregamos.
const API_URL = base.endsWith('/api') ? base : `${base}/api`;

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default client;

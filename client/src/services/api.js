import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000, // 45 seconds for vision analysis
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('visioninspect_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't loop redirect if already on login or register
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('visioninspect_token');
        localStorage.removeItem('visioninspect_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (email, password, fullName, role) => {
    const res = await api.post('/auth/register', { email, password, fullName, role });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  }
};

export const linesApi = {
  getLines: async () => {
    const res = await api.get('/lines');
    return res.data;
  },
  createLine: async (lineData) => {
    const res = await api.post('/lines', lineData);
    return res.data;
  },
  getLineById: async (id) => {
    const res = await api.get(`/lines/${id}`);
    return res.data;
  }
};

export const inspectionsApi = {
  getInspections: async (params = {}) => {
    const res = await api.get('/inspections', { params });
    return res.data;
  },
  getInspectionById: async (id) => {
    const res = await api.get(`/inspections/${id}`);
    return res.data;
  },
  createInspection: async (formData, onProgress) => {
    const res = await api.post('/inspections', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
    return res.data;
  },
  updateStatus: async (id, status, operatorNotes) => {
    const res = await api.patch(`/inspections/${id}/status`, { status, operatorNotes });
    return res.data;
  },
  downloadCsv: async (id, itemSku) => {
    const res = await api.get(`/inspections/${id}/export/csv`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inspection-${itemSku}-${id.substring(0, 8)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};

export const analyticsApi = {
  getSummary: async () => {
    const res = await api.get('/analytics/summary');
    return res.data;
  }
};

export default api;

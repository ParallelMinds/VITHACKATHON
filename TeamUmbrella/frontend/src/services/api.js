import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track pending requests to avoid duplicate toasts
let pendingRequests = new Map();

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only clear auth on actual auth failure, not on missing token
      if (error.response?.data?.detail?.includes('invalid') ||
          error.response?.data?.detail?.includes('expired')) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ==================== AUTHENTICATION ====================

export async function login(email, password) {
  const response = await api.post('/api/auth/login', { email, password });
  return response.data;
}

export async function signup(username, email, password) {
  const response = await api.post('/api/auth/signup', { username, email, password });
  return response.data;
}

export async function logout() {
  try {
    await api.post('/api/auth/logout');
  } catch (err) {
    // Ignore logout errors
  }
}

export async function getCurrentUser() {
  const response = await api.get('/api/auth/me');
  return response.data;
}

// ==================== SHIPS / VESSELS ====================

export async function fetchNearbyShips(lat, lon, radius = 50) {
  const response = await api.get('/api/ships/nearby', {
    params: { lat, lon, radius },
  });
  return response.data;
}

export async function fetchVessels() {
  const response = await api.get('/api/vessels');
  return response.data;
}

export async function fetchShipDetails(mmsi) {
  const response = await api.get(`/api/ships/${mmsi}`);
  return response.data;
}

export async function fetchShipHistory(mmsi) {
  const response = await api.get(`/api/ships/${mmsi}/history`);
  return response.data;
}

// ==================== CARGO INSPECTION ====================

export async function uploadCargoImage(imageFile, manifestText = '') {
  const formData = new FormData();
  formData.append('image', imageFile);
  if (manifestText && manifestText.trim()) {
    formData.append('manifest', manifestText);
  }

  const response = await api.post('/api/inspect', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 120000,
  });

  return response.data;
}

export async function analyzeWithAI(detections, manifestText = '') {
  const response = await api.post('/api/ai/analyze', {
    detections,
    manifest: manifestText,
  });
  return response.data;
}

// ==================== INSPECTION HISTORY ====================

export async function fetchInspectionHistory(limit = 50) {
  const response = await api.get('/api/inspections/history', {
    params: { limit },
  });
  return response.data;
}

export async function fetchInspections(limit = 20) {
  const response = await api.get('/api/inspections', {
    params: { limit },
  });
  return response.data;
}

export async function fetchInspectionById(inspectionId) {
  const response = await api.get(`/api/inspections/${inspectionId}`);
  return response.data;
}

// ==================== REPORTS ====================

export async function generateReport(caseId) {
  const response = await api.post('/report/generate', { case_id: caseId });
  return response.data;
}

export async function fetchReports(limit = 50) {
  const response = await api.get('/api/reports', {
    params: { limit },
  });
  return response.data;
}

export async function fetchReportById(reportId) {
  const response = await api.get(`/api/reports/${reportId}`);
  return response.data;
}

export async function downloadReport(reportId) {
  const response = await api.get(`/api/reports/${reportId}/download`, {
    responseType: 'blob',
  });
  return response.data;
}

// ==================== PROFILE ====================

export async function fetchUserProfile() {
  const response = await api.get('/api/profile');
  return response.data;
}

export async function updateUserProfile(profileData) {
  const response = await api.put('/api/profile', profileData);
  return response.data;
}

export async function fetchUserStats() {
  const response = await api.get('/api/profile/stats');
  return response.data;
}

// ==================== UTILITIES ====================

export async function checkHealth() {
  const response = await axios.get(`${API_BASE_URL}/health`, {
    timeout: 5000,
  });
  return response.data;
}

/**
 * Clear authentication session
 */
export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('demo_user');
}

export default api;

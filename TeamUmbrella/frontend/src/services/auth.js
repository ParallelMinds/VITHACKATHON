import api from './api';

/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

/**
 * Login user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<{access_token: string, user: object}>}
 */
export async function login(email, password) {
  try {
    const response = await api.post('/api/auth/login', { email, password });
    const data = response.data;

    // Store token in localStorage
    const token = data.access_token || data.token;
    if (token) {
      localStorage.setItem('token', token);
    }

    // Return user data
    return {
      token,
      user: data.user || {
        username: data.username || '',
        email: data.email || email,
        role: data.role || 'analyst',
      },
    };
  } catch (error) {
    const message = error.response?.data?.detail || error.response?.data?.message || 'Authentication failed';
    throw new Error(message);
  }
}

/**
 * Signup new user
 * @param {string} username - User's username
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<{access_token: string, user: object}>}
 */
export async function signup(username, email, password) {
  try {
    const response = await api.post('/api/auth/signup', { username, email, password });
    const data = response.data;

    // Store token in localStorage
    const token = data.access_token || data.token;
    if (token) {
      localStorage.setItem('token', token);
    }

    return {
      token,
      user: data.user || {
        username: data.username || username,
        email: data.email || email,
        role: data.role || 'analyst',
      },
    };
  } catch (error) {
    const message = error.response?.data?.detail || error.response?.data?.message || 'Registration failed';
    throw new Error(message);
  }
}

/**
 * Logout user and clear session
 */
export async function logout() {
  try {
    await api.post('/api/auth/logout');
  } catch (error) {
    // Ignore logout errors
    console.warn('Logout API call failed:', error.message);
  } finally {
    // Always clear local storage
    clearSession();
  }
}

/**
 * Get current authenticated user
 * @returns {Promise<object>}
 */
export async function getCurrentUser() {
  try {
    const response = await api.get('/api/auth/me');
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }
    throw error;
  }
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!localStorage.getItem('token');
}

/**
 * Get stored auth token
 * @returns {string|null}
 */
export function getToken() {
  return localStorage.getItem('token');
}

/**
 * Clear auth session
 */
export function clearSession() {
  localStorage.removeItem('token');
}

/**
 * Create demo session (for testing without backend auth)
 * @param {object} user - User data
 */
export function createDemoSession(user) {
  const demoToken = `demo-token-${Date.now()}`;
  localStorage.setItem('token', demoToken);
  localStorage.setItem('demo_user', JSON.stringify(user));
  return { token: demoToken, user };
}

/**
 * Get demo user from localStorage
 * @returns {object|null}
 */
export function getDemoUser() {
  try {
    const demoUser = localStorage.getItem('demo_user');
    return demoUser ? JSON.parse(demoUser) : null;
  } catch {
    return null;
  }
}

/**
 * Check if current session is a demo session
 * @returns {boolean}
 */
export function isDemoSession() {
  return !!localStorage.getItem('demo_user');
}

export default {
  login,
  signup,
  logout,
  getCurrentUser,
  isAuthenticated,
  getToken,
  clearSession,
  createDemoSession,
  getDemoUser,
  isDemoSession,
};

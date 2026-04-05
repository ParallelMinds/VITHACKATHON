import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout, getCurrentUser, clearSession } from '../services/api';
import { getDemoUser, isDemoSession } from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          // Check if this is a demo session
          if (isDemoSession()) {
            const demoUser = getDemoUser();
            if (demoUser) {
              setUser(demoUser);
            } else {
              clearSession();
              setUser(null);
            }
          } else {
            // Real session - validate with backend
            try {
              const userData = await getCurrentUser();
              setUser(userData);
            } catch (err) {
              // Token invalid, clear it
              clearSession();
              setUser(null);
            }
          }
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        clearSession();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      setError(null);
      const data = await apiLogin(email, password);

      // Store token
      const token = data.access_token || data.token;
      if (token) {
        localStorage.setItem('token', token);
      }

      // Set user data
      const userData = data.user || {
        username: data.username || '',
        email: data.email || email,
        role: data.role || 'analyst',
      };
      setUser(userData);

      return data;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Authentication failed';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const logout = useCallback(async () => {
    // Call API logout (best effort, don't fail if it errors)
    try {
      await apiLogout();
    } catch (err) {
      console.warn('Logout API call failed:', err);
    }

    // Always clear local state
    clearSession();
    setUser(null);
    setError(null);
  }, []);

  const setDemoUser = useCallback((userData) => {
    setUser(userData);
    // Store demo user in localStorage for persistence
    localStorage.setItem('demo_user', JSON.stringify(userData));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    logout,
    setDemoUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

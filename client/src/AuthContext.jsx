import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL as API_BASE } from './config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cc_token') || null);
  const [loading, setLoading] = useState(true);

  // Verify stored token on mount
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    axios.get(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setUser(res.data.user);
      })
      .catch(() => {
        // Token expired or invalid
        localStorage.removeItem('cc_token');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = async (username, password) => {
    const res = await axios.post(`${API_BASE}/api/auth/login`, { username, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('cc_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('cc_token');
    setToken(null);
    setUser(null);
  };

  // Axios helper with auth header
  const authAxios = axios.create();
  authAxios.interceptors.request.use(config => {
    const t = localStorage.getItem('cc_token');
    if (t) config.headers.Authorization = `Bearer ${t}`;
    return config;
  });

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, authAxios }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('fva_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(({ user }) => setUser(user))
      .catch(() => localStorage.removeItem('fva_token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const { token, user } = await api.post('/auth/login', { email, password });
    localStorage.setItem('fva_token', token);
    setUser(user);
  }

  function logout() {
    localStorage.removeItem('fva_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

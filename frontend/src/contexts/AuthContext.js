'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, register as apiRegister, getProfile } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accountType, setAccountTypeState] = useState('demo'); // 'demo' | 'real'

  // Check for existing token on mount
  useEffect(() => {
    const stored = localStorage.getItem('token');
    const savedType = localStorage.getItem('account_type') || 'demo';
    setAccountTypeState(savedType);

    if (stored) {
      setToken(stored);
      getProfile()
        .then((data) => setUser(data.user))
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (email, username, password) => {
    const data = await apiRegister(email, username, password);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  // Switch between demo and real account
  const setAccountType = useCallback((type) => {
    const t = type === 'real' ? 'real' : 'demo';
    setAccountTypeState(t);
    localStorage.setItem('account_type', t);
  }, []);

  // Get the active balance based on account type
  const activeBalance = accountType === 'real'
    ? (user?.balance ?? 0)
    : (user?.demo_balance ?? 0);

  // Update the correct balance field
  const updateBalance = useCallback((newBalance) => {
    setUser((prev) => {
      if (!prev) return prev;
      if (localStorage.getItem('account_type') === 'real') {
        return { ...prev, balance: newBalance };
      } else {
        return { ...prev, demo_balance: newBalance };
      }
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      accountType,
      setAccountType,
      activeBalance,
      updateBalance
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export default AuthContext;

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  demoUsers: User[];
  login: (identifier: string, otp?: string, password?: string) => Promise<void>;
  register: (username: string, displayName: string, phone?: string, avatarUrl?: string) => Promise<void>;
  switchUser: (targetUser: User) => Promise<void>;
  logout: () => void;
  updateUser: (data: { display_name?: string; about?: string; avatar_url?: string }) => Promise<void>;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Load theme and session on mount
  useEffect(() => {
    const savedTheme = (localStorage.getItem('signal_theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    const savedToken = localStorage.getItem('signal_token');
    if (savedToken) {
      setToken(savedToken);
      api.getMe()
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          localStorage.removeItem('signal_token');
          setToken(null);
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    // Fetch demo users for switch menu
    api.getDemoUsers()
      .then((users) => setDemoUsers(users))
      .catch((err) => console.error('Failed to load demo users', err));
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('signal_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const login = async (identifier: string, otp: string = '123456', password?: string) => {
    const res = await api.login(identifier, otp, password);
    localStorage.setItem('signal_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  };

  const register = async (username: string, displayName: string, phone?: string, avatarUrl?: string) => {
    const res = await api.register(username, displayName, phone, avatarUrl);
    localStorage.setItem('signal_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  };

  const switchUser = async (targetUser: User) => {
    // Quick switch demo user with fixed OTP
    await login(targetUser.username, '123456');
  };

  const logout = () => {
    localStorage.removeItem('signal_token');
    setToken(null);
    setUser(null);
  };

  const updateUser = async (data: { display_name?: string; about?: string; avatar_url?: string }) => {
    const updated = await api.updateProfile(data);
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        demoUsers,
        login,
        register,
        switchUser,
        logout,
        updateUser,
        theme,
        toggleTheme,
      }}
    >
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

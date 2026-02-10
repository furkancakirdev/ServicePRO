'use client';

// Authentication Context Provider
// ServicePro ERP - Marlin Yatçılık

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  ad: string;
  role: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

function clearTokenCookieEverywhere() {
  if (typeof window === 'undefined') return;

  const expires = 'Thu, 01 Jan 1970 00:00:00 GMT';
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  const host = window.location.hostname;
  const domainCandidates = Array.from(
    new Set(
      [host, `.${host}`].filter(Boolean)
    )
  );
  const pathCandidates = Array.from(
    new Set(
      ['/', window.location.pathname || '/'].filter(Boolean)
    )
  );

  for (const path of pathCandidates) {
    document.cookie = `token=; path=${path}; expires=${expires}; SameSite=Lax${secure}`;
    document.cookie = `token=; path=${path}; domain=; expires=${expires}; SameSite=Lax${secure}`;

    for (const domain of domainCandidates) {
      document.cookie = `token=; path=${path}; domain=${domain}; expires=${expires}; SameSite=Lax${secure}`;
    }
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * Verify current authentication status
   */
  async function checkAuth() {
    try {
      // Get token from localStorage or cookie
      let token = null;

      if (typeof window !== 'undefined') {
        token = localStorage.getItem('token');

        // If not in localStorage, try to get from cookie
        if (!token) {
          const match = document.cookie.match(/(^|;) ?token=([^;]*)(;|$)/);
          token = match ? match[2] : null;
          if (token) {
            // Store in localStorage for consistency
            localStorage.setItem('token', token);
          }
        }
      }

      if (!token) {
        setIsLoading(false);
        return;
      }

      // Call /me endpoint to validate token
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        // Also store user in localStorage for pages that need it
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      } else {
        // Token is invalid, remove it
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        }
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Login with email and password
   */
  async function login(email: string, password: string): Promise<void> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Giriş başarısız');
    }

    const data = await res.json();
    setUser(data.user);

    // Store token and user in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Also set token as cookie for middleware
      document.cookie = `token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    }
  }

  /**
   * Logout current user
   */
  function logout() {
    setUser(null);

    if (typeof window !== 'undefined') {
      localStorage.clear();
      clearTokenCookieEverywhere();
    }

    // Optional: Call logout API for audit logging
    fetch('/api/auth/logout', {
      method: 'POST',
      keepalive: true,
    }).catch((err) => console.error('Logout API error:', err));

    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
  }

  /**
   * Refresh user data from server
   */
  async function refreshUser(): Promise<void> {
    await checkAuth();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

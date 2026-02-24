'use client';

import { useMemo } from 'react';

/**
 * Authentication token hook
 * Centralized token management to avoid localStorage access duplication
 * and provide a clean API for token operations.
 *
 * @returns Token getter/setter methods
 */
export function useAuthToken() {
  const getToken = useMemo(() => {
    return (): string | null => {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem('token');
    };
  }, []);

  const setToken = useMemo(() => {
    return (token: string): void => {
      if (typeof window === 'undefined') return;
      localStorage.setItem('token', token);
    };
  }, []);

  const removeToken = useMemo(() => {
    return (): void => {
      if (typeof window === 'undefined') return;
      localStorage.removeItem('token');
    };
  }, []);

  const getAuthHeaders = useMemo(() => {
    return (): Record<string, string> => {
      const token = getToken();
      if (!token) return {};
      return {
        'Authorization': `Bearer ${token}`,
      };
    };
  }, [getToken]);

  return {
    getToken,
    setToken,
    removeToken,
    getAuthHeaders,
  };
}

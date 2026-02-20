'use client';

import { useContext } from 'react';
import { ThemeContext } from '@/components/ThemeProvider';

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme hook sadece ThemeProvider icinde kullanilabilir');
  }

  return context;
}


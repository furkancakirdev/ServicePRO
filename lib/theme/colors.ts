export const CLASSIC_NAVY_LIGHT = {
  primary: '#003366',
  primaryForeground: '#FFFFFF',
  secondary: '#F3F6FA',
  secondaryForeground: '#0F172A',
  accent: '#0096E0',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  background: '#FFFFFF',
  foreground: '#0F172A',
  muted: '#F1F5F9',
  mutedForeground: '#64748B',
  border: '#E2E8F0',
} as const;

export const CLASSIC_NAVY_DARK = {
  primary: '#3B82F6',
  primaryForeground: '#FFFFFF',
  background: '#0F172A',
  foreground: '#F1F5F9',
  muted: '#1E293B',
  mutedForeground: '#94A3B8',
  border: '#1E293B',
} as const;

export const CLASSIC_NAVY_HSL = {
  light: {
    primary: '210 100% 20%',
    primaryForeground: '0 0% 100%',
    secondary: '210 20% 96%',
    secondaryForeground: '222 47% 11%',
    accent: '199 100% 44%',
    success: '142 76% 36%',
    warning: '38 92% 50%',
    error: '0 72% 51%',
    background: '0 0% 100%',
    foreground: '222 47% 11%',
    muted: '210 40% 96%',
    mutedForeground: '215 16% 47%',
    border: '214 32% 91%',
  },
  dark: {
    primary: '217.2 91.2% 59.8%',
    primaryForeground: '0 0% 100%',
    background: '222 47% 11%',
    foreground: '210 40% 98%',
    muted: '217 33% 17%',
    mutedForeground: '215 20% 65%',
    border: '217 33% 17%',
  },
} as const;

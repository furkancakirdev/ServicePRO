'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { UiDensityMode } from '@/types/ui';
import { normalizeRole } from '@/lib/auth/role';
import { useAuth } from '@/lib/auth/auth-context';

const HINT_VISIBILITY_KEY = 'servicepro.ui.hints.visible';
const DENSITY_MODE_KEY = 'servicepro.ui.density';
const UI_PREFERENCES_KEY = 'servicepro.ui.preferences';
const UI_PREFERENCES_CHANGED_EVENT = 'servicepro-ui-preferences-change';

const REDESIGN_FLAG = process.env.NEXT_PUBLIC_UI_REDESIGN_V1 === 'true';
const REDESIGN_ROLE_LIST = (process.env.NEXT_PUBLIC_UI_REDESIGN_ROLES ?? 'ADMIN')
  .split(',')
  .map((value) => normalizeRole(value))
  .filter((value): value is 'ADMIN' | 'YETKILI' => value === 'ADMIN' || value === 'YETKILI');

interface UiRedesignContextValue {
  enabled: boolean;
  hintsVisible: boolean;
  setHintsVisible: (next: boolean) => void;
  densityMode: UiDensityMode;
  setDensityMode: (next: UiDensityMode) => void;
}

type UiPreferences = {
  showAnimations: boolean;
  highContrastMode: boolean;
  largeTouchTargets: boolean;
  focusMode: boolean;
  readableTypography: boolean;
  pinOperationsToSidebar: boolean;
};

const DEFAULT_UI_PREFERENCES: UiPreferences = {
  showAnimations: true,
  highContrastMode: false,
  largeTouchTargets: false,
  focusMode: false,
  readableTypography: false,
  pinOperationsToSidebar: true,
};

const UiRedesignContext = createContext<UiRedesignContextValue | undefined>(undefined);

function getStoredUserRole(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { role?: string; rol?: string };
    return parsed.role ?? parsed.rol ?? null;
  } catch {
    return null;
  }
}

export function UiRedesignProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [hintsVisible, setHintsVisibleState] = useState(true);
  const [densityMode, setDensityModeState] = useState<UiDensityMode>('compact');
  const [uiPreferences, setUiPreferences] = useState<UiPreferences>(DEFAULT_UI_PREFERENCES);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedHintsVisible = window.localStorage.getItem(HINT_VISIBILITY_KEY);
    const storedDensityMode = window.localStorage.getItem(DENSITY_MODE_KEY);
    const storedPreferences = window.localStorage.getItem(UI_PREFERENCES_KEY);

    if (storedHintsVisible === 'false') {
      setHintsVisibleState(false);
    }

    if (storedDensityMode === 'compact' || storedDensityMode === 'comfortable') {
      setDensityModeState(storedDensityMode);
    }

    if (storedPreferences) {
      try {
        const parsed = JSON.parse(storedPreferences) as Partial<UiPreferences>;
        setUiPreferences({
          ...DEFAULT_UI_PREFERENCES,
          ...parsed,
        });
      } catch {
        setUiPreferences(DEFAULT_UI_PREFERENCES);
      }
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadPreferences = () => {
      const raw = window.localStorage.getItem(UI_PREFERENCES_KEY);
      if (!raw) {
        setUiPreferences(DEFAULT_UI_PREFERENCES);
        return;
      }

      try {
        const parsed = JSON.parse(raw) as Partial<UiPreferences>;
        setUiPreferences({
          ...DEFAULT_UI_PREFERENCES,
          ...parsed,
        });
      } catch {
        setUiPreferences(DEFAULT_UI_PREFERENCES);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== UI_PREFERENCES_KEY) return;
      loadPreferences();
    };

    const handleCustomEvent = () => {
      loadPreferences();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(UI_PREFERENCES_CHANGED_EVENT, handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(UI_PREFERENCES_CHANGED_EVENT, handleCustomEvent);
    };
  }, []);

  const normalizedRole = useMemo(() => {
    const liveRole = normalizeRole(user?.role ?? null);
    if (liveRole) return liveRole;
    return normalizeRole(getStoredUserRole());
  }, [user?.role]);

  const roleAllowed = useMemo(() => {
    if (!REDESIGN_FLAG) return false;
    if (REDESIGN_ROLE_LIST.length === 0) return true;
    if (!normalizedRole) return false;
    return REDESIGN_ROLE_LIST.includes(normalizedRole);
  }, [normalizedRole]);

  const enabled = hydrated && REDESIGN_FLAG && roleAllowed;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const { body } = document;

    body.classList.toggle('ui-redesign', enabled);
    body.classList.toggle('ui-density-compact', enabled && densityMode === 'compact');
    body.classList.toggle('ui-no-motion', !uiPreferences.showAnimations);
    body.classList.toggle('ui-high-contrast', uiPreferences.highContrastMode);
    body.classList.toggle('ui-large-hit-targets', uiPreferences.largeTouchTargets);
    body.classList.toggle('ui-focus-mode', uiPreferences.focusMode);
    body.classList.toggle('ui-readable-typography', uiPreferences.readableTypography);
    body.classList.toggle('ui-sidebar-pinned-operations', uiPreferences.pinOperationsToSidebar);
    body.dataset.uiRedesign = enabled ? 'on' : 'off';
    body.dataset.uiDensity = densityMode;

    return () => {
      body.classList.remove('ui-redesign');
      body.classList.remove('ui-density-compact');
      body.classList.remove('ui-no-motion');
      body.classList.remove('ui-high-contrast');
      body.classList.remove('ui-large-hit-targets');
      body.classList.remove('ui-focus-mode');
      body.classList.remove('ui-readable-typography');
      body.classList.remove('ui-sidebar-pinned-operations');
      delete body.dataset.uiRedesign;
      delete body.dataset.uiDensity;
    };
  }, [densityMode, enabled, uiPreferences]);

  const setHintsVisible = (next: boolean) => {
    setHintsVisibleState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(HINT_VISIBILITY_KEY, String(next));
    }
  };

  const setDensityMode = (next: UiDensityMode) => {
    setDensityModeState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DENSITY_MODE_KEY, next);
    }
  };

  const value = useMemo<UiRedesignContextValue>(
    () => ({
      enabled,
      hintsVisible,
      setHintsVisible,
      densityMode,
      setDensityMode,
    }),
    [densityMode, enabled, hintsVisible]
  );

  return <UiRedesignContext.Provider value={value}>{children}</UiRedesignContext.Provider>;
}

export function useUiRedesign() {
  const context = useContext(UiRedesignContext);
  if (!context) {
    throw new Error('useUiRedesign must be used within UiRedesignProvider');
  }
  return context;
}

'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/lib/hooks/use-theme';
import type { ThemePreference } from '@/components/ThemeProvider';

const labelByTheme: Record<ThemePreference, string> = {
  light: 'Açık',
  dark: 'Koyu',
  system: 'Sistem',
};

export function ThemeSwitcher() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const Icon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full justify-start gap-2 border-[var(--color-border)]"
          data-testid="theme-switcher-trigger"
        >
          <Icon className="h-4 w-4" />
          Tema: {labelByTheme[theme]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-44 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
      >
        <DropdownMenuLabel>Tema Seçimi</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          data-testid="theme-switcher-option-light"
        >
          <Sun className="mr-2 h-4 w-4" />
          Açık
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          data-testid="theme-switcher-option-dark"
        >
          <Moon className="mr-2 h-4 w-4" />
          Koyu
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          data-testid="theme-switcher-option-system"
        >
          <Monitor className="mr-2 h-4 w-4" />
          Sistem
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


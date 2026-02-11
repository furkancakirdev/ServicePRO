'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type DatePreset = 'ALL' | 'BUGUN' | 'YARIN' | 'BU_HAFTA';

interface DatePresetFilterProps {
  value: DatePreset;
  onChange: (next: DatePreset) => void;
}

const PRESET_ITEMS: Array<{ value: DatePreset; label: string }> = [
  { value: 'BUGUN', label: 'Bugun' },
  { value: 'YARIN', label: 'Yarin' },
  { value: 'BU_HAFTA', label: 'Bu Hafta' },
];

export function DatePresetFilter({ value, onChange }: DatePresetFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-surface)]/60 p-3">
      {PRESET_ITEMS.map((item) => (
        <Button
          key={item.value}
          type="button"
          size="sm"
          variant={value === item.value ? 'default' : 'outline'}
          onClick={() => onChange(value === item.value ? 'ALL' : item.value)}
          className={cn(
            'h-9',
            value === item.value
              ? 'bg-sky-600 text-white hover:bg-sky-700'
              : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
          )}
        >
          {item.label}
        </Button>
      ))}
      {value !== 'ALL' && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="ml-auto h-9 text-slate-300 hover:bg-slate-800 hover:text-white"
          onClick={() => onChange('ALL')}
        >
          Temizle
        </Button>
      )}
    </div>
  );
}

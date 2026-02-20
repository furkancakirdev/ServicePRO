'use client';

import type { ServiceApiItem } from './types';
import { CLOSED_STATUSES } from './utils';
import { toDateOnlyISO } from '@/lib/date-utils';

interface MiniWeekStripProps {
  services: ServiceApiItem[];
}

export default function MiniWeekStrip({ services }: MiniWeekStripProps) {
  const openScheduled = services.filter(
    (service) => !CLOSED_STATUSES.has(service.durum) && Boolean(service.tarih)
  );

  const days = Array.from({ length: 7 }, (_, dayOffset) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + dayOffset);

    const dayIso = day.toISOString().slice(0, 10);
    const count = openScheduled.filter((service) => toDateOnlyISO(service.tarih) === dayIso).length;
    const width = count > 0 ? Math.min(100, Math.max(12, count * 12)) : 0;

    return {
      key: dayIso,
      label: new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(day),
      dateLabel: new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit' }).format(day),
      count,
      width,
    };
  });

  return (
    <div className="grid gap-2 sm:grid-cols-7">
      {days.map((day) => (
        <div
          key={day.key}
          className="rounded-lg border border-slate-700/70 bg-slate-900/40 px-3 py-2"
          data-testid={`operations-mini-day-${day.key}`}
        >
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span>{day.label}</span>
            <span>{day.dateLabel}</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-100">{day.count} iş</p>
          <div className="mt-2 h-1.5 rounded-full bg-slate-800">
            <div className="h-1.5 rounded-full bg-cyan-500" style={{ width: `${day.width}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

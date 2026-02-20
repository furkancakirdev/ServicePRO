'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDateTimeForUi } from '@/lib/timezone';
import { cn } from '@/lib/utils';
import type { DispatchAppointment } from './types';

type Props = {
  items: DispatchAppointment[];
  search: string;
  onSearchChange: (value: string) => void;
  onDragStart: (appointmentId: string) => void;
  onOpenDetail: (appointment: DispatchAppointment) => void;
};

export function JobTray({ items, search, onSearchChange, onDragStart, onOpenDetail }: Props) {
  return (
    <aside className="surface-panel space-y-4 p-4 xl:sticky xl:top-4 xl:self-start">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Job Tray (Unassigned)</h2>
        <p className="text-xs text-muted-foreground">
          Atanmamis appointment kayitlarini teknisyen lane&apos;ine surukleyin.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pl-8"
          placeholder="Tekne veya aciklama ara"
          data-testid="dispatch-job-tray-search"
        />
      </div>

      <div className="max-h-[68vh] space-y-2 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            Atanmamis appointment bulunamadi.
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              draggable={!item.kilitli}
              onDragStart={(event) => {
                event.dataTransfer.setData('text/appointment-id', item.id);
                event.dataTransfer.effectAllowed = 'move';
                onDragStart(item.id);
              }}
              onClick={() => onOpenDetail(item)}
              className={cn(
                'w-full rounded-md border border-border/70 bg-background p-3 text-left transition',
                item.kilitli
                  ? 'cursor-not-allowed opacity-85'
                  : 'cursor-grab hover:border-primary/50 hover:bg-muted/20'
              )}
              data-testid={`dispatch-tray-item-${item.id}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="line-clamp-1 text-sm font-semibold text-foreground">{item.job.tekneAdi}</p>
                {item.kilitli ? <Badge variant="secondary">Locked</Badge> : null}
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {item.job.servisAciklamasi}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {formatDateTimeForUi(item.baslangicAt)} - {formatDateTimeForUi(item.bitisAt)}
              </p>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}

export default JobTray;

'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DashboardWidgetDefinition } from '@/lib/dashboard/widget-registry';

type WidgetLibraryProps = {
  open: boolean;
  availableWidgets: DashboardWidgetDefinition[];
  onAdd: (id: string) => void;
  onClose: () => void;
};

export default function WidgetLibrary({
  open,
  availableWidgets,
  onAdd,
  onClose,
}: WidgetLibraryProps) {
  if (!open) return null;

  return (
    <div
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-3"
      data-testid="dashboard-widget-library"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">Widget Kütüphanesi</p>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Kapat
        </Button>
      </div>

      {availableWidgets.length === 0 ? (
        <p className="text-xs text-muted-foreground">Tüm widgetlar zaten dashboarda eklenmiş.</p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {availableWidgets.map((widget) => (
            <div
              key={widget.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-3"
            >
              <p className="text-sm font-medium">{widget.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{widget.description}</p>
              <Button
                type="button"
                size="sm"
                className="mt-2 h-8"
                onClick={() => onAdd(widget.id)}
                data-testid={`dashboard-widget-library-add-${widget.id}`}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Ekle
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


'use client';

import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type DashboardWidgetProps = {
  id: string;
  title: string;
  description: string;
  editMode: boolean;
  gridClassName?: string;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDragStart: (id: string) => void;
  onDrop: (targetId: string, draggedId: string | null) => void;
  children: ReactNode;
};

export default function DashboardWidget({
  id,
  title,
  description,
  editMode,
  gridClassName,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onDragStart,
  onDrop,
  children,
}: DashboardWidgetProps) {
  return (
    <Card
      className={`border-[var(--color-border)] bg-[var(--color-surface)]/60 ${gridClassName ?? ''}`}
      draggable={editMode}
      onDragStart={(event) => {
        if (!editMode) return;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', id);
        onDragStart(id);
      }}
      onDragOver={(event) => {
        if (!editMode) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        if (!editMode) return;
        event.preventDefault();
        const draggedId = event.dataTransfer.getData('text/plain') || null;
        onDrop(id, draggedId);
      }}
      data-testid={`dashboard-widget-${id}`}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        {editMode ? (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onMoveUp(id)}
              disabled={!canMoveUp}
              data-testid={`dashboard-widget-move-up-${id}`}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onMoveDown(id)}
              disabled={!canMoveDown}
              data-testid={`dashboard-widget-move-down-${id}`}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-muted-foreground">
              <GripVertical className="h-4 w-4" />
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onRemove(id)}
              data-testid={`dashboard-widget-remove-${id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

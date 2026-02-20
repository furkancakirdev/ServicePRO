'use client';

import { Lock, LockOpen, Minus, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTimeForUi } from '@/lib/timezone';
import { cn } from '@/lib/utils';
import type { DispatchAppointment } from './types';

type Props = {
  appointment: DispatchAppointment;
  dense: boolean;
  disabled?: boolean;
  onDragStart: (appointmentId: string) => void;
  onOpenDetail: (appointment: DispatchAppointment) => void;
  onResize: (appointment: DispatchAppointment, deltaMinutes: number) => void;
  onToggleLock: (appointment: DispatchAppointment) => void;
};

export function AppointmentCard({
  appointment,
  dense,
  disabled,
  onDragStart,
  onOpenDetail,
  onResize,
  onToggleLock,
}: Props) {
  const isLocked = appointment.kilitli;
  const durationMinutes = Math.max(
    0,
    Math.round(
      (new Date(appointment.bitisAt).getTime() - new Date(appointment.baslangicAt).getTime()) / 60000
    )
  );

  return (
    <button
      type="button"
      className={cn(
        'w-full rounded-md border border-border/70 bg-muted/25 text-left transition',
        dense ? 'p-2' : 'p-3',
        isLocked ? 'cursor-not-allowed opacity-90' : 'hover:border-primary/60 hover:bg-muted/40',
        disabled ? 'opacity-60' : ''
      )}
      draggable={!isLocked && !disabled}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/appointment-id', appointment.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStart(appointment.id);
      }}
      onClick={() => onOpenDetail(appointment)}
      data-testid={`dispatch-appointment-${appointment.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn('line-clamp-1 font-semibold text-foreground', dense ? 'text-xs' : 'text-sm')}>
          {appointment.job.tekneAdi}
        </p>
        <div className="flex items-center gap-1">
          {isLocked ? <Lock className="h-3.5 w-3.5 text-amber-500" /> : null}
          {appointment.confirmedAt ? (
            <Badge className="bg-emerald-600/20 text-emerald-300">Confirmed</Badge>
          ) : (
            <Badge variant="outline">Unconfirmed</Badge>
          )}
        </div>
      </div>

      <p className={cn('mt-1 line-clamp-2 text-muted-foreground', dense ? 'text-[11px]' : 'text-xs')}>
        {appointment.job.servisAciklamasi}
      </p>

      <div className={cn('mt-2 flex flex-wrap items-center gap-2', dense ? 'text-[10px]' : 'text-[11px]')}>
        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
          {formatDateTimeForUi(appointment.baslangicAt)} - {formatDateTimeForUi(appointment.bitisAt)}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
          {Math.max(30, durationMinutes)} dk
        </span>
      </div>

      <div
        className="mt-2 flex flex-wrap items-center gap-1"
        onClick={(event) => event.stopPropagation()}
      >
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px]"
          onClick={() => onResize(appointment, -30)}
          disabled={isLocked || disabled || durationMinutes <= 30}
          data-testid={`dispatch-resize-minus-${appointment.id}`}
        >
          <Minus className="mr-1 h-3 w-3" />
          30m
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px]"
          onClick={() => onResize(appointment, 30)}
          disabled={isLocked || disabled}
          data-testid={`dispatch-resize-plus-${appointment.id}`}
        >
          <Plus className="mr-1 h-3 w-3" />
          30m
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px]"
          onClick={() => onToggleLock(appointment)}
          disabled={disabled}
          data-testid={`dispatch-toggle-lock-${appointment.id}`}
        >
          {isLocked ? (
            <>
              <LockOpen className="mr-1 h-3 w-3" />
              Unlock
            </>
          ) : (
            <>
              <Lock className="mr-1 h-3 w-3" />
              Lock
            </>
          )}
        </Button>
      </div>
    </button>
  );
}

export default AppointmentCard;

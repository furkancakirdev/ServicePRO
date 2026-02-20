'use client';

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import AppointmentCard from './AppointmentCard';
import type { DispatchAppointment } from './types';

type Props = {
  technician: {
    id: string;
    label: string;
  };
  days: string[];
  appointmentsByDay: Record<string, DispatchAppointment[]>;
  dense: boolean;
  busyAppointmentIds: Set<string>;
  dropTarget: { personelId: string; dayKey: string } | null;
  onCardDragStart: (appointmentId: string) => void;
  onOpenDetail: (appointment: DispatchAppointment) => void;
  onResize: (appointment: DispatchAppointment, deltaMinutes: number) => void;
  onToggleLock: (appointment: DispatchAppointment) => void;
  onCellDragOver: (personelId: string, dayKey: string) => void;
  onCellDragLeave: (personelId: string, dayKey: string) => void;
  onCellDrop: (personelId: string, dayKey: string, appointmentIdFromData: string | null) => void;
};

function durationHours(appointment: DispatchAppointment): number {
  const ms =
    new Date(appointment.bitisAt).getTime() - new Date(appointment.baslangicAt).getTime();
  return Math.max(0, ms / (1000 * 60 * 60));
}

export function TechnicianLane({
  technician,
  days,
  appointmentsByDay,
  dense,
  busyAppointmentIds,
  dropTarget,
  onCardDragStart,
  onOpenDetail,
  onResize,
  onToggleLock,
  onCellDragOver,
  onCellDragLeave,
  onCellDrop,
}: Props) {
  const totalHours = days.reduce((sum, dayKey) => {
    return (
      sum +
      (appointmentsByDay[dayKey] ?? []).reduce((inner, appointment) => inner + durationHours(appointment), 0)
    );
  }, 0);
  const warningDays = days.filter((dayKey) => {
    const dayHours = (appointmentsByDay[dayKey] ?? []).reduce(
      (inner, appointment) => inner + durationHours(appointment),
      0
    );
    return dayHours > 8;
  }).length;

  return (
    <tr className="border-b border-border/70 last:border-b-0">
      <th className="w-48 align-top px-4 py-3 text-left">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{technician.label}</p>
          <p className="text-xs text-muted-foreground">Toplam: {totalHours.toFixed(1)} saat</p>
          {warningDays > 0 ? (
            <p className="inline-flex items-center gap-1 text-xs text-amber-500">
              <AlertTriangle className="h-3.5 w-3.5" />
              {warningDays} gun kapasite asimi
            </p>
          ) : null}
        </div>
      </th>
      {days.map((dayKey) => {
        const appointments = appointmentsByDay[dayKey] ?? [];
        const isTarget =
          dropTarget?.personelId === technician.id && dropTarget?.dayKey === dayKey;
        return (
          <td
            key={`${technician.id}-${dayKey}`}
            className={cn('align-top p-2 transition', isTarget ? 'bg-primary/10' : 'bg-background')}
            onDragOver={(event) => {
              event.preventDefault();
              onCellDragOver(technician.id, dayKey);
            }}
            onDragLeave={() => onCellDragLeave(technician.id, dayKey)}
            onDrop={(event) => {
              event.preventDefault();
              const transferId = event.dataTransfer.getData('text/appointment-id');
              onCellDrop(technician.id, dayKey, transferId || null);
            }}
            data-testid={`dispatch-cell-${technician.id}-${dayKey}`}
          >
            <div className={cn('rounded-md border border-dashed border-border/70', dense ? 'min-h-[110px] p-2' : 'min-h-[136px] p-3', 'space-y-2')}>
              {appointments.length === 0 ? (
                <p className="text-xs text-muted-foreground">Surukle-birak ile planla</p>
              ) : (
                appointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    dense={dense}
                    disabled={busyAppointmentIds.has(appointment.id)}
                    onDragStart={onCardDragStart}
                    onOpenDetail={onOpenDetail}
                    onResize={onResize}
                    onToggleLock={onToggleLock}
                  />
                ))
              )}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

export default TechnicianLane;

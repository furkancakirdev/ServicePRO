'use client';

import { AlertTriangle, Clock3, MapPin, UsersRound } from 'lucide-react';
import type { ServiceApiItem } from './types';
import {
  assignmentCount,
  compareForPlanList,
  formatDateLabel,
  isOverdue,
  locationGroupFrom,
} from './utils';
import MiniWeekStrip from './mini-week-strip';
import { OperationStatusBadge } from './operation-status-badge';

interface PlanListViewProps {
  services: ServiceApiItem[];
  onEditService: (serviceId: string) => void;
}

interface GroupMeta {
  key: 'YATMARIN' | 'NETSEL' | 'DIS_SERVIS';
  label: string;
}

const GROUP_ORDER: GroupMeta[] = [
  { key: 'YATMARIN', label: 'Yatmarin' },
  { key: 'NETSEL', label: 'Netsel' },
  { key: 'DIS_SERVIS', label: 'Dış Servis' },
];

export default function PlanListView({ services, onEditService }: PlanListViewProps) {
  const grouped = GROUP_ORDER.map((group) => {
    const rows = services
      .filter((service) => locationGroupFrom(service.yer, service.adres) === group.key)
      .sort(compareForPlanList);

    return { ...group, rows };
  }).filter((group) => group.rows.length > 0);

  return (
    <div className="space-y-4" data-testid="operations-plan-list">
      <MiniWeekStrip services={services} />

      {grouped.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-sm text-slate-300">
          Filtrelere uygun planlama kaydı bulunamadı.
        </div>
      ) : (
        grouped.map((group) => (
          <section key={group.key} className="space-y-2">
            <header className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">{group.label}</h3>
              <span className="text-xs text-slate-400">{group.rows.length} kayıt</span>
            </header>

            <div className="space-y-2">
              {group.rows.map((service) => {
                const overdue = isOverdue(service);
                const unassigned = assignmentCount(service) === 0;
                const unscheduled = !service.tarih;
                const dueDate = service.tahminiBitisTarihi ?? service.tarih ?? null;

                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => onEditService(service.id)}
                    className="w-full rounded-lg border border-slate-700/70 bg-slate-900/40 p-3 text-left transition hover:border-cyan-500/60 hover:bg-slate-900/65"
                    data-testid={`operations-plan-row-${service.id}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm text-slate-200">
                          <Clock3 className="h-4 w-4 text-slate-400" />
                          <span className={overdue ? 'font-semibold text-red-300' : 'font-medium text-slate-100'}>
                            {formatDateLabel(service.tarih)}
                          </span>
                          <span className="text-slate-400">{service.saat || '--:--'}</span>
                        </div>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-100">{service.tekneAdi}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-300">{service.servisAciklamasi}</p>
                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate">{service.yer || service.adres || '-'}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <OperationStatusBadge status={service.durum} compact />
                        <div className="flex items-center gap-1 text-xs text-slate-300">
                          <UsersRound className="h-3.5 w-3.5" />
                          <span>{unassigned ? 'Atama yok' : `${assignmentCount(service)} kişi`}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {overdue && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-200">
                          <AlertTriangle className="h-3 w-3" />
                          Gecikme
                        </span>
                      )}
                      {unscheduled && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                          Tarihsiz
                        </span>
                      )}
                      {unassigned && (
                        <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-medium text-sky-200">
                          Atanmamış
                        </span>
                      )}
                      {dueDate && (
                        <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[11px] font-medium text-indigo-200">
                          Tahmini bitiş: {formatDateLabel(dueDate)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

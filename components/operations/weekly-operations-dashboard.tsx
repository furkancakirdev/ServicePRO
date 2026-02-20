'use client';

import { Calendar, MapPin, Ship, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { OperationsOverviewDto } from './types';

interface WeeklyOperationsDashboardProps {
  overview: OperationsOverviewDto | null;
  loading?: boolean;
}

function pct(value: number): string {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

export function WeeklyOperationsDashboard({ overview, loading = false }: WeeklyOperationsDashboardProps) {
  if (loading || !overview) {
    return (
      <Card className="surface-panel" data-testid="operations-overview-loading">
        <CardContent className="pt-4 text-sm text-slate-300">Operasyon özeti yükleniyor...</CardContent>
      </Card>
    );
  }

  const locationMax = Math.max(1, ...overview.locationBreakdown.map((item) => item.count));

  return (
    <div className="space-y-4" data-testid="operations-weekly-overview">
      <Card className="surface-panel" data-testid="operations-first-glance-panel">
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white" data-testid="operations-first-glance-title">
              <Calendar className="h-5 w-5 text-cyan-400" />
              Operasyon İlk Bakış
            </h3>
            <Badge variant="secondary" className="text-xs">
              {overview.range.label}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="operations-kpi-grid">
            <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Açık İş</p>
              <p className="mt-1 text-2xl font-bold text-cyan-300">{overview.totals.openServices}</p>
            </div>
            <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Bu Hafta Planlanan</p>
              <p className="mt-1 text-2xl font-bold text-sky-300">{overview.totals.scheduledInRange}</p>
            </div>
            <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3" data-testid="operations-unscheduled-kpi">
              <p className="text-xs uppercase tracking-wide text-slate-400">Tarihsiz (Açık)</p>
              <p className="mt-1 text-2xl font-bold text-amber-300">{overview.totals.unscheduledOpen}</p>
            </div>
            <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3" data-testid="operations-external-kpi">
              <p className="text-xs uppercase tracking-wide text-slate-400">Dış Servis (Hafta)</p>
              <p className="mt-1 text-2xl font-bold text-purple-300">{overview.totals.externalInRange}</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-3" data-testid="operations-capacity-block">
            <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
              <span>Haftalık Doluluk</span>
              <span>{pct(overview.capacity.utilizationPct)} ({overview.capacity.plannedInRange}/{overview.capacity.weeklyCapacity || 0})</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                style={{ width: pct(overview.capacity.utilizationPct) }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Aktif Teknik Ekip: {overview.capacity.activeTechnicianCount}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="surface-panel xl:col-span-6" data-testid="operations-yatmarin-by-day-table">
          <CardContent className="space-y-3 pt-4">
            <h3 className="flex items-center gap-2 text-base font-semibold text-white">
              <Ship className="h-4 w-4 text-cyan-400" />
              Yatmarin&apos;de Hangi Gün Kaç Tekne/İş
            </h3>
            <div className="space-y-2">
              {overview.yatmarinByDay.map((day) => (
                <div key={day.date} className="grid grid-cols-3 items-center rounded-lg border border-slate-700/50 bg-slate-900/30 px-3 py-2 text-sm">
                  <span className="text-slate-200">{day.dayLabel}</span>
                  <span className="text-slate-300">{day.serviceCount} iş</span>
                  <span className="text-right text-cyan-300">{day.boatCount} tekne</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="surface-panel xl:col-span-6" data-testid="operations-external-destinations-table">
          <CardContent className="space-y-3 pt-4">
            <h3 className="flex items-center gap-2 text-base font-semibold text-white">
              <MapPin className="h-4 w-4 text-rose-400" />
              Bu Hafta Dış Servis Nereye Gideceğiz?
            </h3>
            {overview.externalDestinations.length === 0 ? (
              <p className="text-sm text-slate-400">Bu hafta dış servis lokasyonu bulunmuyor.</p>
            ) : (
              <div className="space-y-2" data-testid="operations-external-destination-list">
                {overview.externalDestinations.slice(0, 10).map((destination) => (
                  <div key={destination.destination} className="grid grid-cols-3 items-center rounded-lg border border-slate-700/50 bg-slate-900/30 px-3 py-2 text-sm">
                    <span className="truncate text-slate-200">{destination.destination}</span>
                    <span className="text-slate-300">{destination.serviceCount} iş</span>
                    <span className="text-right text-purple-300">{destination.boatCount} tekne</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="surface-panel xl:col-span-7" data-testid="operations-location-breakdown">
          <CardContent className="space-y-3 pt-4">
            <h3 className="flex items-center gap-2 text-base font-semibold text-white">
              <MapPin className="h-4 w-4 text-sky-400" />
              Lokasyon Dağılımı (Açık & Haftalık)
            </h3>
            {overview.locationBreakdown.map((item) => (
              <div key={item.group} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>{item.group}</span>
                  <span>{item.count}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-cyan-500"
                    style={{ width: `${Math.round((item.count / locationMax) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="surface-panel xl:col-span-5" data-testid="operations-unscheduled-by-status">
          <CardContent className="space-y-3 pt-4">
            <h3 className="flex items-center gap-2 text-base font-semibold text-white">
              <Users className="h-4 w-4 text-amber-400" />
              Tarihsiz İşler (Durum Bazlı)
            </h3>
            {overview.unscheduledByStatus.length === 0 ? (
              <p className="text-sm text-slate-400">Tarihsiz açık servis bulunmuyor.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {overview.unscheduledByStatus.map((item) => (
                  <Badge key={item.status} className="bg-amber-500/20 text-amber-100 border-amber-500/30">
                    {item.status}: {item.count}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

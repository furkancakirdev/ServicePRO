'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { AlertTriangle, CalendarClock, Wrench } from 'lucide-react';
import type { ProactiveMaintenanceAlert } from '@/lib/api/dashboard-service';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProactiveMaintenanceAlertsProps {
  alerts: ProactiveMaintenanceAlert[];
}

function formatDate(isoValue: string): string {
  return format(new Date(isoValue), 'd MMM yyyy', { locale: tr });
}

function formatDueMessage(alert: ProactiveMaintenanceAlert): string {
  if (alert.seviye === 'GECIKTI') {
    return `${Math.abs(alert.gunFarki)} gun gecikti`;
  }

  if (alert.gunFarki === 0) {
    return 'Bugun';
  }

  return `${alert.gunFarki} gun kaldi`;
}

function getLevelConfig(level: ProactiveMaintenanceAlert['seviye']) {
  if (level === 'GECIKTI') {
    return {
      label: 'Gecikti',
      badgeClass: 'bg-red-500/15 text-red-100 border-red-500/30',
    };
  }

  if (level === 'YAKLASIYOR') {
    return {
      label: 'Yaklasiyor',
      badgeClass: 'bg-amber-500/15 text-amber-100 border-amber-500/30',
    };
  }

  return {
    label: 'Planli',
    badgeClass: 'bg-sky-500/15 text-sky-100 border-sky-500/30',
  };
}

export default function ProactiveMaintenanceAlerts({ alerts }: ProactiveMaintenanceAlertsProps) {
  return (
    <Card className="border-slate-700 bg-slate-900/55 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            Proaktif bakim uyarilari
          </CardTitle>
          <Badge className="border border-slate-600 bg-slate-800/70 text-slate-100">{alerts.length} kayit</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {alerts.length === 0 ? (
          <div className="rounded-md border border-slate-700/70 bg-slate-800/35 p-3 text-sm text-slate-300">
            Onumuzdeki 45 gun icin kritik bakim uyarisi yok.
          </div>
        ) : (
          alerts.map((alert) => {
            const levelConfig = getLevelConfig(alert.seviye);
            return (
              <div
                key={alert.id}
                className="rounded-md border border-slate-700/70 bg-slate-800/45 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{alert.tekneAdi}</p>
                    <p className="text-xs text-slate-400">{alert.arizaTipi}</p>
                  </div>
                  <Badge className={`border ${levelConfig.badgeClass}`}>{levelConfig.label}</Badge>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <div className="rounded-md bg-slate-900/50 p-2">
                    <p className="text-slate-400">Son servis</p>
                    <p className="font-medium text-white">{formatDate(alert.sonServisTarihi)}</p>
                  </div>
                  <div className="rounded-md bg-slate-900/50 p-2">
                    <p className="text-slate-400">Sonraki bakim</p>
                    <p className="font-medium text-white">{formatDate(alert.sonrakiBakimTarihi)}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{formatDueMessage(alert)}</p>
                  </div>
                </div>

                <p className="mt-2 text-xs text-slate-300">{alert.oneri}</p>

                <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 text-slate-400">
                    <Wrench className="h-3.5 w-3.5" />
                    Tekrar: {alert.tekrarSayisi} • Ortalama dongu: {alert.ortalamaAralikGun} gun
                  </span>
                  <Link
                    href={`/is-emirleri?search=${encodeURIComponent(alert.tekneAdi)}`}
                    className="inline-flex items-center gap-1 text-sky-300 transition-colors hover:text-sky-200"
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                    Kayitlari ac
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import type { ComponentType } from 'react';
import { Activity, AlertTriangle, CalendarCheck2, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export interface StatsCardsProps {
  bugunToplamOperasyon: number;
  aktifServisler: number;
  bugunTamamlanan: number;
  gecikenServisler: number;
  loading?: boolean;
}

type StatCard = {
  key: string;
  label: string;
  value: number;
  description: string;
  className: string;
  icon: ComponentType<{ className?: string }>;
};

export default function StatsCards({
  bugunToplamOperasyon,
  aktifServisler,
  bugunTamamlanan,
  gecikenServisler,
  loading = false,
}: StatsCardsProps) {
  const cards: StatCard[] = [
    {
      key: 'today',
      label: 'Bugun Operasyon',
      value: bugunToplamOperasyon,
      description: 'Bugun planlanan toplam operasyon',
      className: 'border-sky-500/35 bg-sky-500/10 text-sky-200',
      icon: CalendarCheck2,
    },
    {
      key: 'active',
      label: 'Aktif Servis',
      value: aktifServisler,
      description: 'Su an acik olan isler',
      className: 'border-indigo-500/35 bg-indigo-500/10 text-indigo-200',
      icon: Activity,
    },
    {
      key: 'completed',
      label: 'Bugun Tamamlanan',
      value: bugunTamamlanan,
      description: 'Ayni gun icinde kapanan isler',
      className: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200',
      icon: Wrench,
    },
    {
      key: 'overdue',
      label: 'Geciken Is',
      value: gecikenServisler,
      description: gecikenServisler > 0 ? 'Takip gerektiren gecikmeler var' : 'Geciken is yok',
      className:
        gecikenServisler > 0
          ? 'border-red-500/40 bg-red-500/10 text-red-200'
          : 'border-slate-700 bg-slate-800/60 text-slate-200',
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.key} className={`backdrop-blur-sm ${card.className}`}>
          <CardContent className="p-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-5 bg-slate-700" />
                <Skeleton className="h-6 w-20 bg-slate-700" />
                <Skeleton className="h-4 w-full bg-slate-700" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <card.icon className="h-4 w-4" />
                  <span className="text-2xl font-semibold">{card.value}</span>
                </div>
                <p className="text-sm font-medium">{card.label}</p>
                <p className="text-xs text-slate-300/80">{card.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

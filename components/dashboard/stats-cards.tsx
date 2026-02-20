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
  variant: 'default' | 'success' | 'warning' | 'info';
  icon: ComponentType<{ className?: string }>;
};

/**
 * Grand Maritime StatsCards Component
 *
 * KPI cards with:
 * - Navy/gold color scheme
 * - Icon containers with gradients
 * - Consistent spacing and typography
 */
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
      label: 'Bugün Operasyon',
      value: bugunToplamOperasyon,
      variant: 'info',
      icon: CalendarCheck2,
    },
    {
      key: 'active',
      label: 'Aktif Servis',
      value: aktifServisler,
      variant: 'default',
      icon: Activity,
    },
    {
      key: 'completed',
      label: 'Bugün Tamamlanan',
      value: bugunTamamlanan,
      variant: 'success',
      icon: Wrench,
    },
    {
      key: 'overdue',
      label: 'Geciken İş',
      value: gecikenServisler,
      variant: gecikenServisler > 0 ? 'warning' : 'default',
      icon: AlertTriangle,
    },
  ];

  const getVariantStyles = (variant: StatCard['variant']) => {
    switch (variant) {
      case 'success':
        return {
          bg: 'bg-gradient-to-br from-seafoam-500 to-seafoam-700',
          border: 'border-l-seafoam-500',
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-br from-sunset-500 to-sunset-700',
          border: 'border-l-sunset-500',
        };
      case 'info':
        return {
          bg: 'bg-gradient-to-br from-skyblue-500 to-skyblue-700',
          border: 'border-l-skyblue-500',
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-navy-700 to-navy-900',
          border: 'border-l-navy-700',
        };
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const styles = getVariantStyles(card.variant);
        return (
          <Card
            key={card.key}
            className={`border-l-4 ${styles.border} transition-shadow hover:shadow-md`}
          >
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-6">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : (
                <div className="flex items-center gap-4 p-6">
                  {/* Icon container with gradient */}
                  <div className={`flex h-14 w-14 items-center justify-center rounded-lg ${styles.bg} shadow-sm`}>
                    <card.icon className="h-6 w-6 text-white" />
                  </div>

                  {/* Value and label */}
                  <div>
                    <p className="font-display text-2xl font-bold text-navy-900">
                      {card.value}
                    </p>
                    <p className="text-sm text-slate-500">{card.label}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

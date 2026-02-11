'use client';

// ServicePro ERP - Operations List
// Bugünün operasyonları listesi

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/lib/components/ui/card';
import { Badge } from '@/lib/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ServisDurumu } from '@prisma/client';
import { DURUM_CONFIG } from '@/types';
import { normalizeServisDurumuForApp } from '@/lib/domain-mappers';

export interface TodayOperation {
  id: string;
  tekneAdi: string;
  tarih: string | null;
  saat: string | null;
  yer: string;
  durum: ServisDurumu;
  isTuru: string;
  personelSayisi: number;
}

export interface OperationsListProps {
  operations: TodayOperation[];
  loading?: boolean;
}

// Durum badge rengi
const getStatusBadgeColor = (durum: ServisDurumu): string => {
  const normalizedDurum = normalizeServisDurumuForApp(durum) as keyof typeof DURUM_CONFIG;
  const config = DURUM_CONFIG[normalizedDurum];
  return config?.bgColor || 'bg-slate-600';
};

// İş türü ikonu
const getIsTuruIcon = (isTuru: string): string => {
  switch (isTuru) {
    case 'PAKET':
      return '📦';
    case 'ARIZA':
      return '🔧';
    case 'PROJE':
      return '🏗️';
    default:
      return '📋';
  }
};

// Saat formatla
const formatTime = (saat: string | null): string => {
  if (!saat) return '--:--';
  return saat;
};

export default function OperationsList({ operations, loading = false }: OperationsListProps) {
  return (
    <Card className="bg-slate-900/50 border-slate-700 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-xl">⚓</span>
          Bugünün Operasyonları
        </CardTitle>
        <Link
          href="/servisler"
          className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
        >
          Tümünü Gör →
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full bg-slate-800" />
            ))}
          </div>
        ) : operations.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <div className="text-4xl mb-2">🌊</div>
            <p>Bugün planlı operasyon yok</p>
          </div>
        ) : (
          <div className="space-y-2">
            {operations.map((op) => (
              <Link
                key={op.id}
                href={`/services/${op.id}/edit`}
                className="block group"
              >
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600 transition-all">
                  {/* Saat */}
                  <div className="flex-shrink-0 w-14 text-center">
                    <div className="text-lg font-bold text-white">
                      {formatTime(op.saat)}
                    </div>
                  </div>

                  {/* İş Türü */}
                  <div className="flex-shrink-0 text-xl">
                    {getIsTuruIcon(op.isTuru)}
                  </div>

                  {/* Tekne Adı */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {op.tekneAdi}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {op.yer}
                    </div>
                  </div>

                  {/* Personel Sayısı */}
                  <div className="flex-shrink-0 text-center px-2">
                    <div className="text-sm font-medium text-slate-300">
                      {op.personelSayisi}
                    </div>
                    <div className="text-xs text-slate-500">kişi</div>
                  </div>

                  {/* Durum Badge */}
                  <div className="flex-shrink-0">
                    <Badge
                      className={`${getStatusBadgeColor(op.durum)} text-white text-xs px-2 py-1`}
                    >
                      {DURUM_CONFIG[normalizeServisDurumuForApp(op.durum) as keyof typeof DURUM_CONFIG]?.label || op.durum}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

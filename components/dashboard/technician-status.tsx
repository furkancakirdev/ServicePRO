'use client';

// ServicePro ERP - Technician Status
// Teknisyen durumu ve müsaitlik bilgisi

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/lib/components/ui/card';
import { Badge } from '@/lib/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export interface TechnicianStatus {
  id: string;
  ad: string;
  unvan: string;
  aktifServisSayisi: number;
  bosMu: boolean;
}

export interface TechnicianStatusProps {
  technicians: TechnicianStatus[];
  loading?: boolean;
}

// Unvan badge rengi
const getUnvanBadgeColor = (unvan: string): string => {
  switch (unvan) {
    case 'USTA':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'CIRAK':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'YONETICI':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'OFIS':
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    default:
      return 'bg-slate-600/20 text-slate-400 border-slate-600/30';
  }
};

// Unvan etiketi
const getUnvanLabel = (unvan: string): string => {
  switch (unvan) {
    case 'USTA':
      return 'Usta';
    case 'CIRAK':
      return 'Çırak';
    case 'YONETICI':
      return 'Yönetici';
    case 'OFIS':
      return 'Ofis';
    default:
      return unvan;
  }
};

// Durum ikonu
const getStatusIcon = (bosMu: boolean): string => {
  return bosMu ? '✅' : '🔧';
};

// Durum rengi
const getStatusColor = (bosMu: boolean): string => {
  return bosMu ? 'text-green-400' : 'text-amber-400';
};

// Durum etiketi
const getStatusLabel = (bosMu: boolean): string => {
  return bosMu ? 'Müsait' : 'Meşgul';
};

export default function TechnicianStatus({ technicians, loading = false }: TechnicianStatusProps) {
  // Önce boş olanları, sonra meşgul olanları sırala
  const sortedTechnicians = [...technicians].sort((a, b) => {
    if (a.bosMu && !b.bosMu) return -1;
    if (!a.bosMu && b.bosMu) return 1;
    return a.ad.localeCompare(b.ad);
  });

  const availableCount = technicians.filter((t) => t.bosMu).length;
  const busyCount = technicians.length - availableCount;

  return (
    <Card className="bg-slate-900/50 border-slate-700 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-xl">👷</span>
          Teknisyen Durumu
        </CardTitle>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            <span className="text-slate-400">Müsait: {availableCount}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="text-slate-400">Meşgul: {busyCount}</span>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full bg-slate-800" />
            ))}
          </div>
        ) : technicians.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <div className="text-4xl mb-2">👤</div>
            <p>Personel bulunamadı</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedTechnicians.map((tech) => (
              <Link
                key={tech.id}
                href={`/personel/${tech.id}`}
                className="block group"
              >
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600 transition-all">
                  {/* Durum İkonu */}
                  <div className="flex-shrink-0 text-xl">
                    {getStatusIcon(tech.bosMu)}
                  </div>

                  {/* Personel Bilgisi */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {tech.ad}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`${getUnvanBadgeColor(tech.unvan)} text-xs px-2 py-0.5 border`}
                      >
                        {getUnvanLabel(tech.unvan)}
                      </Badge>
                      <span className={`text-xs ${getStatusColor(tech.bosMu)}`}>
                        {getStatusLabel(tech.bosMu)}
                      </span>
                    </div>
                  </div>

                  {/* Aktif Servis Sayısı */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-lg font-bold text-white">
                      {tech.aktifServisSayisi}
                    </div>
                    <div className="text-xs text-slate-500">iş</div>
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

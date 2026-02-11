'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ArrowRight, Plus, RefreshCw } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import OperationsList from '@/components/dashboard/operations-list';
import StatsCards from '@/components/dashboard/stats-cards';
import TechnicianStatus from '@/components/dashboard/technician-status';
import WeatherWidget from '@/components/dashboard/weather-widget';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getStatusConfig } from '@/lib/config/status-config';
import { DashboardStats } from '@/lib/api/dashboard-service';
import { useAuth } from '@/lib/hooks/use-auth';

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      if (!isLoading) {
        router.push('/login');
      }
      return;
    }

    const controller = new AbortController();
    let ignore = false;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard-stats', { signal: controller.signal });
        if (!response.ok) {
          throw new Error('Istatistikler getirilemedi');
        }
        const payload = (await response.json()) as DashboardStats;
        setStats(payload);
        setError(null);
      } catch (fetchError) {
        if (ignore || controller.signal.aborted) return;
        console.error(fetchError);
        setError(fetchError instanceof Error ? fetchError.message : 'Veriler yuklenemedi');
      } finally {
        if (!ignore && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchStats();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [isAuthenticated, isLoading, router]);

  const statusBreakdown = useMemo(
    () =>
      (stats?.durumDagilimi ?? [])
        .slice()
        .sort((left, right) => right.count - left.count)
        .slice(0, 6),
    [stats?.durumDagilimi]
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Gunaydin';
    if (hour < 18) return 'Iyi gunler';
    return 'Iyi aksamlar';
  }, []);

  const todayLabel = format(new Date(), 'EEEE, d MMMM yyyy', { locale: tr });

  if (isLoading || loading) {
    return (
      <PageLayout title="Servis Kontrol Merkezi" subtitle="Anlik operasyon ozeti">
        <div className="space-y-4">
          <div className="h-28 animate-pulse rounded-xl bg-slate-800/50" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-xl bg-slate-800/50" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="h-80 animate-pulse rounded-xl bg-slate-800/50 lg:col-span-8" />
            <div className="h-80 animate-pulse rounded-xl bg-slate-800/50 lg:col-span-4" />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Servis Kontrol Merkezi" subtitle="Anlik operasyon ozeti">
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="flex flex-col gap-3 p-5">
            <p className="text-sm text-red-200">{error}</p>
            <div>
              <Button size="sm" onClick={() => window.location.reload()}>
                Tekrar dene
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Servis Kontrol Merkezi" subtitle="Anlik operasyon ozeti">
      <div className="space-y-4">
        <Card className="hero-panel border-none">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-200">
                  {greeting}, <span className="font-semibold text-white">{user?.ad || 'Ekip'}</span>
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-white">Bugunun servis akisina hazirsin</h2>
                <p className="mt-1 text-sm text-slate-300">{todayLabel}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/servisler/yeni">
                  <Button size="sm" className="bg-sky-600 text-white hover:bg-sky-500">
                    <Plus className="mr-1 h-4 w-4" />
                    Yeni servis
                  </Button>
                </Link>
                <Link href="/servisler">
                  <Button size="sm" variant="outline" className="border-slate-600 bg-slate-900/30 text-slate-100">
                    Servis listesi
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-600 bg-slate-900/30 text-slate-100"
                  onClick={() => router.refresh()}
                >
                  <RefreshCw className="mr-1 h-4 w-4" />
                  Yenile
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="bg-sky-500/15 text-sky-100">Toplam Tekne: {stats?.toplamTekne ?? 0}</Badge>
              <Badge className="bg-indigo-500/15 text-indigo-100">
                Aktif Teknisyen: {stats?.aktifTeknisyen ?? 0}/{stats?.toplamPersonel ?? 0}
              </Badge>
              <Badge className="bg-red-500/15 text-red-100">Geciken Is: {stats?.gecikenServisler ?? 0}</Badge>
            </div>
          </CardContent>
        </Card>

        <StatsCards
          bugunToplamOperasyon={stats?.bugunToplamOperasyon ?? 0}
          aktifServisler={stats?.aktifServisler ?? 0}
          bugunTamamlanan={stats?.bugunTamamlanan ?? 0}
          gecikenServisler={stats?.gecikenServisler ?? 0}
          loading={false}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <WeatherWidget />
          </div>

          <Card className="border-slate-700 bg-slate-900/55 backdrop-blur-sm lg:col-span-4">
            <CardContent className="space-y-3 p-4">
              <p className="text-sm font-semibold text-white">Durum Dagilimi</p>

              <div className="space-y-2">
                {statusBreakdown.length > 0 ? (
                  statusBreakdown.map((item) => {
                    const config = getStatusConfig(item.durum);
                    return (
                      <div
                        key={item.durum}
                        className="flex items-center justify-between rounded-md border border-slate-700/60 bg-slate-800/45 px-3 py-2"
                      >
                        <span className="text-sm text-slate-200">{config.label}</span>
                        <span className="text-sm font-semibold text-white">{item.count}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-400">Veri bulunamadi.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-slate-700/60 pt-3 text-xs text-slate-300">
                <div className="rounded-md bg-slate-800/40 p-2">
                  <p className="text-slate-400">Parca bekleyen</p>
                  <p className="text-base font-semibold text-white">{stats?.parcaBekleyen ?? 0}</p>
                </div>
                <div className="rounded-md bg-slate-800/40 p-2">
                  <p className="text-slate-400">Onay bekleyen</p>
                  <p className="text-base font-semibold text-white">{stats?.onayBekleyen ?? 0}</p>
                </div>
                <div className="rounded-md bg-slate-800/40 p-2">
                  <p className="text-slate-400">Rapor bekleyen</p>
                  <p className="text-base font-semibold text-white">{stats?.raporBekleyen ?? 0}</p>
                </div>
                <div className="rounded-md bg-slate-800/40 p-2">
                  <p className="text-slate-400">Devam eden</p>
                  <p className="text-base font-semibold text-white">{stats?.devamEden ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <OperationsList operations={stats?.bugununOperasyonlari ?? []} loading={false} />
          </div>
          <div className="lg:col-span-4">
            <TechnicianStatus technicians={stats?.teknisyenDurumu ?? []} loading={false} />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

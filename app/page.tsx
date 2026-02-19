'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ArrowRight, Plus, RefreshCw } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import OperationsList from '@/components/dashboard/operations-list';
import ProactiveMaintenanceAlerts from '@/components/dashboard/proactive-maintenance-alerts';
import TechnicianStatus from '@/components/dashboard/technician-status';
import WeatherWidget from '@/components/dashboard/weather-widget';
import QuickActions from '@/components/QuickActions';
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
      <PageLayout title="Ana Ekran" subtitle="Anlik operasyon ozeti">
        <div className="space-y-4">
          <div className="h-28 animate-pulse rounded-xl bg-muted/70" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-xl bg-muted/70" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="h-80 animate-pulse rounded-xl bg-muted/70 lg:col-span-8" />
            <div className="h-80 animate-pulse rounded-xl bg-muted/70 lg:col-span-4" />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Ana Ekran" subtitle="Anlik operasyon ozeti">
        <Card className="border-destructive/35 bg-destructive/10">
          <CardContent className="flex flex-col gap-3 p-5">
            <p className="text-sm text-destructive">{error}</p>
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
    <PageLayout title="Ana Ekran" subtitle="Anlik operasyon ozeti">
      <div className="space-y-6">
        <Card className="hero-panel border-none">
          <CardContent className="flex flex-col gap-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-[color:var(--color-marine-subtitle)]">
                  {greeting}, <span className="font-semibold text-[color:var(--color-marine-text)]">{user?.ad || 'Ekip'}</span>
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-[color:var(--color-marine-text)]">
                  Bugunku servis akisini yonet
                </h2>
                <p className="mt-1 text-sm text-[color:var(--color-marine-subtitle)]">{todayLabel}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/servisler/yeni">
                  <Button size="sm" className="sp-btn-default border-transparent text-white hover:text-white">
                    <Plus className="mr-1 h-4 w-4" />
                    Yeni servis
                  </Button>
                </Link>
                <Link href="/servisler">
                  <Button
                    size="sm"
                    variant="outline"
                    className="sp-btn-outline border-border/70 bg-background/20 text-foreground hover:bg-background/30"
                  >
                    Servis listesi
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  className="sp-btn-outline border-border/70 bg-background/20 text-foreground hover:bg-background/30"
                  onClick={() => router.refresh()}
                >
                  <RefreshCw className="mr-1 h-4 w-4" />
                  Yenile
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="chip border-transparent text-foreground">Toplam Tekne: {stats?.toplamTekne ?? 0}</Badge>
              <Badge className="chip border-transparent text-foreground">
                Aktif Teknisyen: {stats?.aktifTeknisyen ?? 0}/{stats?.toplamPersonel ?? 0}
              </Badge>
              <Badge className="chip border-transparent text-foreground">Geciken Is: {stats?.gecikenServisler ?? 0}</Badge>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-6" data-testid="dashboard-primary-section">
          <DashboardGrid stats={stats} loading={false} />
        </section>

        <details className="surface-panel overflow-hidden" data-testid="dashboard-detail-collapse">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-foreground">
            Detay Panelleri
          </summary>
          <div className="space-y-6 px-4 pb-4 pt-1" data-testid="dashboard-detail-grid">
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
          <Link href="/servisler?durum=RANDEVU_VERILDI">
            <Card className="surface-panel transition hover:border-primary/45">
              <CardContent className="p-6">
                <p className="text-xs text-muted-foreground">Bugun Planlanan</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{stats?.bugunRandevulu ?? 0}</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/servisler?durum=DEVAM_EDIYOR">
            <Card className="surface-panel transition hover:border-primary/45">
              <CardContent className="p-6">
                <p className="text-xs text-muted-foreground">Bugun Aktif</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{stats?.bugunDevamEden ?? 0}</p>
              </CardContent>
            </Card>
          </Link>
          <Card className="surface-panel">
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground">Bu Hafta Tamamlanan</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{stats?.thisWeekCompleted ?? 0}</p>
            </CardContent>
          </Card>
          <Link href="/servisler?queue=UNSCHEDULED">
            <Card className="surface-panel transition hover:border-primary/45">
              <CardContent className="p-6">
                <p className="text-xs text-muted-foreground">Tarihsiz Isler</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{stats?.unscheduledActive ?? 0}</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/servisler?queue=WAITING">
            <Card className="surface-panel transition hover:border-primary/45">
              <CardContent className="p-6">
                <p className="text-xs text-muted-foreground">SLA Riski / Bekleyen Yas</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {stats?.gecikenServisler ?? 0} / {stats?.waitingAgingDays ?? 0} gun
                </p>
              </CardContent>
            </Card>
          </Link>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <WeatherWidget />
          </div>

          <div className="space-y-6 lg:col-span-4">
            <Card className="surface-panel backdrop-blur-sm">
              <CardContent className="space-y-3 p-6">
                <p className="text-sm font-semibold text-foreground">Durum Dagilimi</p>

                <div className="space-y-2">
                  {statusBreakdown.length > 0 ? (
                    statusBreakdown.map((item) => {
                      const config = getStatusConfig(item.durum);
                      return (
                        <div
                          key={item.durum}
                          className="flex items-center justify-between rounded-md border border-border/70 bg-background/50 px-3 py-2"
                        >
                          <span className="text-sm text-foreground/90">{config.label}</span>
                          <span className="text-sm font-semibold text-foreground">{item.count}</span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">Veri bulunamadi.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                  <div className="rounded-md border border-border/60 bg-background/40 p-2">
                    <p className="text-muted-foreground">Parca bekleyen</p>
                    <p className="text-base font-semibold text-foreground">{stats?.parcaBekleyen ?? 0}</p>
                  </div>
                  <div className="rounded-md border border-border/60 bg-background/40 p-2">
                    <p className="text-muted-foreground">Onay bekleyen</p>
                    <p className="text-base font-semibold text-foreground">{stats?.onayBekleyen ?? 0}</p>
                  </div>
                  <div className="rounded-md border border-border/60 bg-background/40 p-2">
                    <p className="text-muted-foreground">Rapor bekleyen</p>
                    <p className="text-base font-semibold text-foreground">{stats?.raporBekleyen ?? 0}</p>
                  </div>
                  <div className="rounded-md border border-border/60 bg-background/40 p-2">
                    <p className="text-muted-foreground">Devam eden</p>
                    <p className="text-base font-semibold text-foreground">{stats?.devamEden ?? 0}</p>
                  </div>
                </div>
                <div className="rounded-md border border-border/70 bg-background/35 p-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Sync Sagligi</span>
                    <span
                      className={
                        stats?.syncHealth?.stale
                          ? 'font-semibold text-rose-300'
                          : 'font-semibold text-emerald-300'
                      }
                    >
                      {stats?.syncHealth?.stale ? 'Gecikmeli' : 'Saglikli'}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Son basarili senkron: {stats?.syncHealth?.ageMinutes ?? '-'} dk once
                  </div>
                </div>
              </CardContent>
            </Card>

            <QuickActions />
          </div>
        </section>

        <Card className="surface-panel">
          <CardContent className="p-6">
            <p className="text-sm font-semibold text-foreground">Lokasyon Bazli Yuk Dagilimi</p>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              {(stats?.locationWorkload ?? []).map((item) => (
                <Link
                  key={item.adres}
                  href={`/servisler?search=${encodeURIComponent(item.adres)}`}
                  className="rounded-md border border-border/70 bg-background/40 px-3 py-2 text-sm text-foreground/90 transition hover:border-primary/45"
                >
                  <div className="truncate">{item.adres}</div>
                  <div className="text-xs text-muted-foreground">{item.count} is</div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="surface-panel lg:col-span-4">
            <CardContent className="p-6">
              <p className="text-sm font-semibold text-foreground">Durum Gecis Hunisi</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-md border border-border/70 bg-background/50 px-3 py-2">
                  <span className="text-muted-foreground">Planlanan</span>
                  <span className="font-semibold text-foreground">{stats?.statusTransitionFunnel?.planned ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border/70 bg-background/50 px-3 py-2">
                  <span className="text-muted-foreground">Aktif</span>
                  <span className="font-semibold text-foreground">{stats?.statusTransitionFunnel?.active ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border/70 bg-background/50 px-3 py-2">
                  <span className="text-muted-foreground">Bekleyen</span>
                  <span className="font-semibold text-foreground">{stats?.statusTransitionFunnel?.waiting ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border/70 bg-background/50 px-3 py-2">
                  <span className="text-muted-foreground">Bu Hafta Tamamlanan</span>
                  <span className="font-semibold text-foreground">
                    {stats?.statusTransitionFunnel?.completedThisWeek ?? 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-panel lg:col-span-4">
            <CardContent className="p-6">
              <p className="text-sm font-semibold text-foreground">Tarihsiz Is Trendi (Son 7 Gun)</p>
              <div className="mt-3 space-y-2">
                {(stats?.unscheduledTrend ?? []).map((item) => (
                  <div
                    key={item.date}
                    className="flex items-center justify-between rounded-md border border-border/70 bg-background/50 px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {format(new Date(item.date), 'd MMM', { locale: tr })}
                    </span>
                    <span className="font-semibold text-foreground">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="surface-panel lg:col-span-4">
            <CardContent className="p-6">
              <p className="text-sm font-semibold text-foreground">Personel Is Yuku / Kapasite</p>
              <div className="mt-3 space-y-2">
                {(stats?.personnelWorkload ?? []).map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between rounded-md border border-border/70 bg-background/50 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="text-foreground/90">{person.ad}</p>
                      <p className="text-xs text-muted-foreground">{person.unvan}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{person.aktifServisSayisi} aktif</p>
                      <span
                        className={
                          person.capacityStatus === 'HIGH'
                            ? 'text-xs text-rose-300'
                            : person.capacityStatus === 'LOW'
                              ? 'text-xs text-emerald-300'
                              : 'text-xs text-amber-300'
                        }
                      >
                        {person.capacityStatus === 'HIGH'
                          ? 'Yuksek'
                          : person.capacityStatus === 'LOW'
                            ? 'Dusuk'
                            : 'Normal'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <OperationsList operations={stats?.bugununOperasyonlari ?? []} loading={false} />
          </div>
          <div className="space-y-4 lg:col-span-4">
            <ProactiveMaintenanceAlerts alerts={stats?.proaktifBakimUyarilari ?? []} />
            <TechnicianStatus technicians={stats?.teknisyenDurumu ?? []} loading={false} />
          </div>
        </section>
          </div>
        </details>
      </div>
    </PageLayout>
  );
}

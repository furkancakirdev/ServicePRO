'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CalendarClock, CheckCircle2, Plus, Wrench } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageEmptyState, PageErrorState, PageLoadingState } from '@/components/ui/page-states';
import { DashboardStats } from '@/lib/api/dashboard-service';
import { getStatusConfig } from '@/lib/config/status-config';
import { formatDateDdmmyyyShortMonth } from '@/lib/date-utils';
import { useAuth } from '@/lib/hooks/use-auth';

type ServiceListResponse = {
  services: Array<{
    id: string;
    tekneAdi: string;
    servisAciklamasi: string;
    durum: string;
    tarih: string | null;
    saat: string | null;
  }>;
};

type DashboardRange = 7 | 30 | 90;
type DashboardTab = 'operasyon' | 'analitik' | 'kalite';

const DASHBOARD_RANGE_OPTIONS: Array<{ value: DashboardRange; label: string }> = [
  { value: 7, label: 'Son 7 Gün' },
  { value: 30, label: 'Son 30 Gün' },
  { value: 90, label: 'Son 90 Gün' },
];

function kaliteSkoruSinifi(ortalamaPuan: number): string {
  if (ortalamaPuan >= 80) return 'text-emerald-300';
  if (ortalamaPuan >= 60) return 'text-amber-300';
  return 'text-rose-300';
}

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [blockedRows, setBlockedRows] = useState<ServiceListResponse['services']>([]);
  const [dashboardRange, setDashboardRange] = useState<DashboardRange>(7);
  const [activeTab, setActiveTab] = useState<DashboardTab>('operasyon');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      if (!isLoading) router.push('/login');
      return;
    }

    const controller = new AbortController();
    let ignore = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsResponse, blockedResponse] = await Promise.all([
          fetch(`/api/dashboard-stats?range=${dashboardRange}`, { signal: controller.signal }),
          fetch('/api/services?status=PARCA_BEKLIYOR,MUSTERI_ONAY_BEKLIYOR,RAPOR_BEKLIYOR&limit=12', {
            signal: controller.signal,
          }),
        ]);

        if (!statsResponse.ok) {
          throw new Error('Dashboard verisi getirilemedi');
        }
        if (!blockedResponse.ok) {
          throw new Error('Blokaj listesi getirilemedi');
        }

        const statsPayload = (await statsResponse.json()) as DashboardStats;
        const blockedPayload = (await blockedResponse.json()) as ServiceListResponse;

        if (ignore || controller.signal.aborted) return;
        setStats(statsPayload);
        setBlockedRows(blockedPayload.services ?? []);
        setError(null);
      } catch (fetchError) {
        if (ignore || controller.signal.aborted) return;
        setError(fetchError instanceof Error ? fetchError.message : 'Panel yüklenemedi');
      } finally {
        if (!ignore && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [dashboardRange, isAuthenticated, isLoading, router]);

  const plannedRows = useMemo(
    () =>
      (stats?.bugununOperasyonlari ?? []).filter(
        (item) => item.durum === 'RANDEVU_VERILDI'
      ),
    [stats?.bugununOperasyonlari]
  );

  const analyticsFunnelRows = useMemo(() => {
    if (!stats) return [];
    return [
      { key: 'planned', label: 'Planlandi', count: stats.statusTransitionFunnel.planned },
      { key: 'active', label: 'Devam Eden', count: stats.statusTransitionFunnel.active },
      { key: 'waiting', label: 'Bekleyen', count: stats.statusTransitionFunnel.waiting },
      { key: 'completed', label: 'Bu Hafta Tamam', count: stats.statusTransitionFunnel.completedThisWeek },
    ];
  }, [stats]);

  const kpiItems = useMemo(
    () => [
      {
        id: 'acik',
        label: 'Açık İş',
        value: stats?.aktifServisler ?? 0,
        href: '/is-emirleri?status=RANDEVU_VERILDI,DEVAM_EDIYOR,PARCA_BEKLIYOR,MUSTERI_ONAY_BEKLIYOR,RAPOR_BEKLIYOR',
        icon: <Wrench className="h-4 w-4" />,
      },
      {
        id: 'planli',
        label: 'Bugün Planlı',
        value: stats?.bugunRandevulu ?? 0,
        href: '/is-emirleri?status=RANDEVU_VERILDI&preset=BUGUN',
        icon: <CalendarClock className="h-4 w-4" />,
      },
      {
        id: 'blokaj',
        label: 'Blokajlı',
        value: (stats?.parcaBekleyen ?? 0) + (stats?.onayBekleyen ?? 0) + (stats?.raporBekleyen ?? 0),
        href: '/is-emirleri?status=PARCA_BEKLIYOR,MUSTERI_ONAY_BEKLIYOR,RAPOR_BEKLIYOR',
        icon: <AlertTriangle className="h-4 w-4" />,
      },
      {
        id: 'risk',
        label: 'SLA Risk',
        value: stats?.gecikenServisler ?? 0,
        href: '/is-emirleri?queue=OVERDUE',
        icon: <CheckCircle2 className="h-4 w-4" />,
      },
    ],
    [stats]
  );

  const isAnalyticDataEmpty = useMemo(() => {
    if (!stats) return true;
    const unscheduledHasData = stats.unscheduledTrend.some((row) => row.count > 0);
    const locationHasData = stats.locationWorkload.some((row) => row.count > 0);
    const funnelHasData = analyticsFunnelRows.some((row) => row.count > 0);
    return !unscheduledHasData && !locationHasData && !funnelHasData;
  }, [analyticsFunnelRows, stats]);

  const isQualityDataEmpty = useMemo(() => {
    if (!stats) return true;
    const trendHasData = stats.qualityTrend.some((row) => row.sampleSize > 0);
    return !trendHasData && stats.qualityTopPerformers.length === 0 && stats.qualityLowPerformers.length === 0;
  }, [stats]);

  if (isLoading || loading) {
    return (
      <PageContent>
        <PageHeader title="Operasyon Paneli" description="Günlük akış" />
        <PageLoadingState label="Operasyon verileri yükleniyor..." />
      </PageContent>
    );
  }

  if (error) {
    return (
      <PageContent>
        <PageHeader title="Operasyon Paneli" description="Günlük akış" />
        <PageErrorState
          title="Panel yüklenemedi"
          description={error}
          onRetry={() => window.location.reload()}
        />
      </PageContent>
    );
  }

  return (
    <PageContent data-testid="dashboard-operation-page">
      <PageHeader
        title="Operasyon Paneli"
        description="Bugün + risk + kapasite"
        breadcrumbs={[
          { label: 'Operasyon' },
        ]}
        rightActions={
          <Link href="/is-emirleri/yeni" className="btn btn-primary h-10 px-4 py-2">
            <Plus className="mr-2 h-4 w-4" />
            Yeni İş Emri
          </Link>
        }
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DashboardTab)}>
        <TabsList>
          <TabsTrigger value="operasyon">Operasyon</TabsTrigger>
          <TabsTrigger value="analitik">Analitik</TabsTrigger>
          <TabsTrigger value="kalite">Kalite</TabsTrigger>
        </TabsList>

        <TabsContent value="operasyon" className="space-y-4">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" data-testid="operation-kpi-row">
            {kpiItems.map((kpi) => (
              <Link
                key={kpi.id}
                href={kpi.href}
                title={`${kpi.label} detayını aç`}
                className="surface-panel p-4 transition hover:border-primary/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{kpi.label}</span>
                  {kpi.icon}
                </div>
                <p className="mt-2 text-2xl font-semibold text-foreground">{kpi.value}</p>
              </Link>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_340px]">
            <Card className="surface-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Bugünün Kuyruğu: Planlanacaklar</CardTitle>
              </CardHeader>
              <CardContent>
                {plannedRows.length === 0 ? (
                  <PageEmptyState
                    title="Bugün planlanacak kayıt yok"
                    description="Yeni iş emri oluşturabilir veya filtreleri kontrol edebilirsiniz."
                    className="min-h-[180px] p-4"
                  />
                ) : (
                  <ul className="space-y-2">
                    {plannedRows.slice(0, 10).map((item) => (
                      <li key={item.id} className="rounded-md border border-border/70 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.tekneAdi}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.tarih ? formatDateDdmmyyyShortMonth(item.tarih) : 'Tarihsiz'} {item.saat || '--:--'}
                            </p>
                          </div>
                          <Link href={`/is-emirleri/${item.id}`} className="btn btn-secondary h-8 px-3 py-1 text-xs">
                            Aç
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="surface-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Bugünün Kuyruğu: Blokajlılar</CardTitle>
              </CardHeader>
              <CardContent>
                {blockedRows.length === 0 ? (
                  <PageEmptyState
                    title="Aktif blokaj kaydı yok"
                    description="Bekleyen kayıt oluşursa bu alanda listelenir."
                    className="min-h-[180px] p-4"
                  />
                ) : (
                  <ul className="space-y-2">
                    {blockedRows.slice(0, 10).map((item) => {
                      const status = getStatusConfig(item.durum);
                      return (
                        <li key={item.id} className="rounded-md border border-border/70 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-foreground">{item.tekneAdi}</p>
                              <p className="text-xs text-muted-foreground">{item.servisAciklamasi}</p>
                              <Badge className={`mt-2 ${status.bgColor} ${status.color}`}>{status.label}</Badge>
                            </div>
                            <Link href={`/is-emirleri/${item.id}`} className="btn btn-secondary h-8 px-3 py-1 text-xs">
                              Aç
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="surface-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Teknisyen Özeti</CardTitle>
              </CardHeader>
              <CardContent>
                {(stats?.teknisyenDurumu ?? []).length === 0 ? (
                  <PageEmptyState
                    title="Teknisyen kaydı yok"
                    description="Personel kayıtları eklendiğinde burada görünür."
                    className="min-h-[180px] p-4"
                  />
                ) : (
                  <ul className="space-y-2">
                    {(stats?.teknisyenDurumu ?? []).slice(0, 12).map((tech) => (
                      <li key={tech.id} className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{tech.ad}</p>
                          <p className="text-xs text-muted-foreground">{tech.unvan}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">{tech.aktifServisSayisi}</p>
                          <p className="text-xs text-muted-foreground">{tech.bosMu ? 'Müsait' : 'Yoğun'}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="analitik">
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Zaman aralığı seçimi grafikleri son {dashboardRange} gün verisine göre günceller.
              </p>
              <div className="flex items-center gap-2" data-testid="dashboard-range-filter">
                {DASHBOARD_RANGE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={dashboardRange === option.value ? 'default' : 'outline'}
                    data-testid={`dashboard-range-${option.value}`}
                    onClick={() => setDashboardRange(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {isAnalyticDataEmpty ? (
              <Card className="surface-panel">
                <CardContent className="p-4">
                  <PageEmptyState
                    title="Analitik veri bulunamadi"
                    description="Seçili tarih aralığında panel analitik verisi oluşmadı."
                    className="min-h-[220px] p-2"
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card className="surface-panel" data-testid="dashboard-analytics-unscheduled-chart">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Planlanmamış İş Trendi</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={stats?.unscheduledTrend ?? []}
                        margin={{ top: 8, right: 16, left: -16, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value: string) => formatDateDdmmyyyShortMonth(value)}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#38bdf8"
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          activeDot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="surface-panel" data-testid="dashboard-analytics-location-chart">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Lokasyon Yük Dağılımı</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats?.locationWorkload ?? []}
                        margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="adres" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="surface-panel xl:col-span-2" data-testid="dashboard-analytics-funnel-chart">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Durum Akışı (Plan / Aktif / Bekleyen / Tamam)</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analyticsFunnelRows}
                        margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#818cf8" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="kalite">
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Kalite kartları seçili aralıkta oluşan servis puanlarıyla hesaplanır.
              </p>
              <div className="flex items-center gap-2" data-testid="dashboard-quality-range-filter">
                {DASHBOARD_RANGE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={dashboardRange === option.value ? 'default' : 'outline'}
                    data-testid={`dashboard-quality-range-${option.value}`}
                    onClick={() => setDashboardRange(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {isQualityDataEmpty ? (
              <Card className="surface-panel">
                <CardContent className="p-4">
                  <PageEmptyState
                    title="Kalite verisi bulunamadi"
                    description="Seçili aralıkta puanlama kaydı olmadığı için kalite özeti oluşmadı."
                    className="min-h-[220px] p-2"
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px_320px]">
                <Card className="surface-panel" data-testid="dashboard-quality-trend-chart">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Kalite Puan Trendi</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={stats?.qualityTrend ?? []}
                        margin={{ top: 8, right: 16, left: -16, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value: string) => formatDateDdmmyyyShortMonth(value)}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="averageScore"
                          stroke="#22c55e"
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          activeDot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="surface-panel" data-testid="dashboard-quality-top-list">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">En İyi Performans</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(stats?.qualityTopPerformers ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Yeterli kayıt yok.</p>
                    ) : (
                      <ol className="space-y-2">
                        {(stats?.qualityTopPerformers ?? []).map((item, index) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {index + 1}. {item.ad}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.unvan} - {item.servisSayisi} servis
                              </p>
                            </div>
                            <span className={`text-sm font-semibold ${kaliteSkoruSinifi(item.ortalamaPuan)}`}>
                              {item.ortalamaPuan}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </CardContent>
                </Card>

                <Card className="surface-panel" data-testid="dashboard-quality-low-list">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Gelişime Açık Performans</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(stats?.qualityLowPerformers ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Yeterli kayıt yok.</p>
                    ) : (
                      <ol className="space-y-2">
                        {(stats?.qualityLowPerformers ?? []).map((item, index) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {index + 1}. {item.ad}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.unvan} - {item.servisSayisi} servis
                              </p>
                            </div>
                            <span className={`text-sm font-semibold ${kaliteSkoruSinifi(item.ortalamaPuan)}`}>
                              {item.ortalamaPuan}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </PageContent>
  );
}

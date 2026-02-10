'use client';

// Dashboard Page - Modern Redesign
// ServicePro ERP - Marlin Yatçılık

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Skeleton,
} from '@/lib/components/ui';
import PageLayout from '@/components/PageLayout';
import { useAuth } from '@/lib/hooks/use-auth';
import { DURUM_CONFIG } from '@/types';
import { formatDateOnlyTR, parseDateOnlyToUtcDate } from '@/lib/date-utils';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface StatData {
  toplamServis: number;
  aktifServisler: number;
  tamamlananServisler: number;
  bekleyenServisler: number;
  toplamBekleyenServisler?: number;
  bugunServisler: number;
  bugunRandevuluServisler?: number;
  bugunDevamEdenServisler?: number;
  bugunTamamlananServisler?: number;
  bugunBekleyenServisler?: number;
  teknelerSayisi: number;
  personelSayisi: number;
  durumDagilimi: Array<{ durum: string; sayi: number }>;
  isTuruDagilimi: Array<{ isTuru: string; sayi: number }>;
  gunlukTrend: Array<{ tarih: string; sayi: number }>;
  sonAktiviteler: Array<{
    id: string;
    islem: string;
    userAd: string;
    createdAt: string;
  }>;
}

interface QuickAction {
  href: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface WeatherData {
  current: {
    time: string;
    temperature: number;
    weatherCode: number;
    weatherLabel: string;
    windSpeed: number;
  };
}

interface MetricServiceItem {
  id: string;
  tekneAdi: string;
  tarih: string | null;
  saat: string | null;
  yer: string;
  durum: string;
}

// SVG Icons as components
interface IconProps {
  className?: string;
}

const Icons = {
  Calendar: ({ className }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Refresh: ({ className }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  CheckCircle: ({ className }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  Clock: ({ className }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Anchor: ({ className }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="5" r="3" />
      <line x1="12" y1="22" x2="12" y2="8" />
      <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
    </svg>
  ),
  Users: ({ className }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Plus: ({ className }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  TrendingUp: ({ className }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  Activity: ({ className }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  ArrowRight: ({ className }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const [stats, setStats] = useState<StatData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMetricKey, setActiveMetricKey] = useState<string | null>(null);
  const [metricServices, setMetricServices] = useState<MetricServiceItem[]>([]);
  const [metricLoading, setMetricLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      if (!isLoading) router.push('/login');
      return;
    }

    const fetchStats = async () => {
      try {
        const [statsRes, weatherRes] = await Promise.allSettled([
          fetch('/api/stats'),
          fetch('/api/weather'),
        ]);

        if (statsRes.status === 'fulfilled') {
          if (!statsRes.value.ok) throw new Error('İstatistikler getirilemedi');
          const data = await statsRes.value.json();
          setStats(data);
        } else {
          throw statsRes.reason;
        }

        if (weatherRes.status === 'fulfilled' && weatherRes.value.ok) {
          const weatherData = await weatherRes.value.json();
          setWeather(weatherData);
        }
      } catch (err) {
        console.error('İstatistik hatası:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const fetchMetricServices = async () => {
      if (!activeMetricKey) {
        setMetricServices([]);
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const apiHrefMap: Record<string, string> = {
        'today-randevu': `/api/services?limit=100&date=${today}&durum=RANDEVU_VERILDI&sort=tarih&order=desc`,
        'today-devam': `/api/services?limit=100&date=${today}&durum=DEVAM_EDIYOR&sort=tarih&order=desc`,
        'all-bekleyen':
          '/api/services?limit=100&durum=RANDEVU_VERILDI&durum=PARCA_BEKLIYOR&durum=MUSTERI_ONAY_BEKLIYOR&durum=RAPOR_BEKLIYOR&sort=tarih&order=desc',
        'all-active':
          '/api/services?limit=100&durum=RANDEVU_VERILDI&durum=DEVAM_EDIYOR&durum=PARCA_BEKLIYOR&durum=MUSTERI_ONAY_BEKLIYOR&durum=RAPOR_BEKLIYOR&sort=tarih&order=desc',
        'all-completed': '/api/services?limit=100&durum=TAMAMLANDI&sort=tarih&order=desc',
        'all-services': '/api/services?limit=100&sort=tarih&order=desc',
      };

      const apiHref = apiHrefMap[activeMetricKey];
      if (!apiHref) {
        setMetricServices([]);
        return;
      }

      try {
        setMetricLoading(true);
        const res = await fetch(apiHref);
        if (!res.ok) throw new Error('Servis listesi alınamadı');
        const data = await res.json();
        setMetricServices(data.services ?? []);
      } catch (error) {
        console.error('Metric services error:', error);
        setMetricServices([]);
      } finally {
        setMetricLoading(false);
      }
    };

    fetchMetricServices();
  }, [activeMetricKey]);

  if (isLoading || loading) {
    return (
      <PageLayout>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-12 w-12 rounded-lg mb-4" />
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      </PageLayout>
    );
  }

  if (!stats) {
    return (
      <PageLayout>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Veri yüklenirken hata oluştu.</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Yeniden Dene
            </Button>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const statCards = [
    {
      key: 'today-randevu',
      title: 'Bugünkü Randevulu',
      value: stats.bugunRandevuluServisler ?? 0,
      icon: Icons.Calendar,
      color: 'var(--color-primary)',
      bgColor: 'rgba(14, 165, 233, 0.1)',
      trend: '',
      trendUp: true,
      href: `/servisler?date=${today}&durum=RANDEVU_VERILDI`,
    },
    {
      key: 'today-devam',
      title: 'Bugün Devam Eden',
      value: stats.bugunDevamEdenServisler ?? 0,
      icon: Icons.Refresh,
      color: 'var(--color-success)',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      trend: '',
      trendUp: true,
      href: `/servisler?date=${today}&durum=DEVAM_EDIYOR`,
    },
    {
      key: 'all-bekleyen',
      title: 'Toplam Bekleyen',
      value: stats.toplamBekleyenServisler ?? stats.bekleyenServisler,
      icon: Icons.Clock,
      color: 'var(--color-warning)',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      trend: '',
      trendUp: false,
      href: '/servisler?durum=RANDEVU_VERILDI&durum=PARCA_BEKLIYOR&durum=MUSTERI_ONAY_BEKLIYOR&durum=RAPOR_BEKLIYOR',
    },
    {
      key: 'all-services',
      title: 'Tüm Servisler',
      value: stats.toplamServis,
      icon: Icons.CheckCircle,
      color: 'var(--color-info)',
      bgColor: 'rgba(6, 182, 212, 0.1)',
      trend: '',
      trendUp: true,
      href: '/servisler',
    },
    {
      key: 'all-active',
      title: 'Aktif Servisler',
      value: stats.aktifServisler ?? 0,
      icon: Icons.Refresh,
      color: 'var(--color-success)',
      bgColor: 'rgba(16, 185, 129, 0.12)',
      trend: '',
      trendUp: true,
      href: '/servisler?durum=RANDEVU_VERILDI&durum=DEVAM_EDIYOR&durum=PARCA_BEKLIYOR&durum=MUSTERI_ONAY_BEKLIYOR&durum=RAPOR_BEKLIYOR',
    },
    {
      key: 'all-completed',
      title: 'Tamamlanan Servisler',
      value: stats.tamamlananServisler ?? 0,
      icon: Icons.CheckCircle,
      color: 'var(--color-text-muted)',
      bgColor: 'rgba(120, 113, 108, 0.14)',
      trend: '',
      trendUp: true,
      href: '/servisler?durum=TAMAMLANDI',
    },
  ];

  const activeMetric = statCards.find((card) => card.key === activeMetricKey) ?? null;
  const weeklyDensityData = stats.gunlukTrend.map((item) => ({
    gun: parseDateOnlyToUtcDate(item.tarih)?.toLocaleDateString('tr-TR', { weekday: 'short' }) ?? item.tarih,
    servis: item.sayi,
  }));
  const todayStatusPieData = [
    { name: 'Tamamlanan', value: stats.bugunTamamlananServisler ?? 0, color: '#22c55e' },
    { name: 'Bekleyen', value: stats.bugunBekleyenServisler ?? 0, color: '#f59e0b' },
    { name: 'Devam Eden', value: stats.bugunDevamEdenServisler ?? 0, color: '#06b6d4' },
  ].filter((x) => x.value > 0);

  const quickActions: QuickAction[] = [
    {
      href: '/servisler/yeni',
      label: 'Yeni Servis',
      icon: <Icons.Plus />,
      color: 'var(--color-primary)',
    },
    {
      href: '/servisler',
      label: 'Tekneler',
      icon: <Icons.Anchor />,
      color: 'var(--color-accent-gold)',
    },
    {
      href: '/personel',
      label: 'Personel',
      icon: <Icons.Users />,
      color: 'var(--color-info)',
    },
    {
      href: '/puanlama',
      label: 'Performans',
      icon: <Icons.TrendingUp />,
      color: 'var(--color-success)',
    },
  ];

  const getActivityIcon = (islem: string) => {
    switch (islem) {
      case 'CREATE':
        return <span style={{ color: 'var(--color-success)' }}>+</span>;
      case 'UPDATE':
        return <span style={{ color: 'var(--color-primary)' }}>✎</span>;
      case 'DELETE':
        return <span style={{ color: 'var(--color-error)' }}>×</span>;
      case 'LOGIN':
        return <span style={{ color: 'var(--color-info)' }}>⎆</span>;
      case 'LOGOUT':
        return <span style={{ color: 'var(--color-text-muted)' }}>⇥</span>;
      default:
        return <span style={{ color: 'var(--color-text-muted)' }}>•</span>;
    }
  };

  return (
    <PageLayout>
      {/* Welcome Section */}
      <div className="hero-panel mb-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Hoş Geldin, {user?.ad}!</h1>
            <p className="text-sm text-slate-200/90">Günlük operasyonel özetiniz ve kritik metrikler</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">Aktif Servis: {stats.aktifServisler}</span>
            <span className="chip">Bugün: {stats.bugunServisler}</span>
            <span className="chip">Bekleyen: {stats.toplamBekleyenServisler ?? stats.bekleyenServisler}</span>
          </div>
        </div>
      </div>

      {weather && (
        <Card className="mb-8 surface-panel">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="text-sm text-muted-foreground">Anlık Hava Durumu</div>
                <div className="text-xl font-semibold">
                  {weather.current.weatherLabel} • {Math.round(weather.current.temperature)}°C
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Rüzgar: {Math.round(weather.current.windSpeed)} km/sa • {new Date(weather.current.time).toLocaleString('tr-TR')}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <Card
            key={index}
            className="stat-card cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setActiveMetricKey(stat.key)}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div
                  className="stat-icon"
                  style={{
                    background: stat.bgColor,
                    color: stat.color,
                  }}
                >
                  <stat.icon />
                </div>
                {stat.trend ? (
                  <div
                    className="flex items-center gap-1 text-xs font-medium"
                    style={{ color: stat.trendUp ? 'var(--color-success)' : 'var(--color-error)' }}
                  >
                    <Icons.TrendingUp />
                    {stat.trend}
                  </div>
                ) : (
                  <Icons.ArrowRight className="text-muted-foreground" />
                )}
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {stat.title}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="surface-panel">
          <CardHeader>
            <CardTitle>Haftalık Yoğunluk</CardTitle>
            <CardDescription>Günlük servis sayısı (son 7 gün)</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyDensityData}>
                <XAxis dataKey="gun" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <RechartsTooltip />
                <Bar dataKey="servis" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="surface-panel">
          <CardHeader>
            <CardTitle>Bugün Durum Dağılımı</CardTitle>
            <CardDescription>Tamamlanan / Bekleyen / Devam Eden</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {todayStatusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={todayStatusPieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95}>
                    {todayStatusPieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Bugün için durum verisi bulunmuyor.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {activeMetric && (
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>{activeMetric.title} - Tekne Listesi</CardTitle>
              <CardDescription>Bu karta karşılık gelen servisler</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => router.push(activeMetric.href)}>
                Servisler Sayfasını Aç
              </Button>
              <Button variant="ghost" onClick={() => setActiveMetricKey(null)}>
                Kapat
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {metricLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))}
              </div>
            ) : metricServices.length === 0 ? (
              <div className="text-sm text-muted-foreground">Bu filtreye uygun servis bulunamadı.</div>
            ) : (
              <div className="space-y-2">
                {metricServices.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    className="w-full text-left rounded-lg border px-4 py-3 hover:bg-muted/40 transition-colors"
                    onClick={() => router.push(`/servisler/${service.id}/duzenle`)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{service.tekneAdi}</div>
                      <Badge variant="outline">{service.durum}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {(service.tarih ? formatDateOnlyTR(service.tarih) : '-') +
                        (service.saat ? ` • ${service.saat}` : '') +
                        (service.yer ? ` • ${service.yer}` : '')}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="mb-8 surface-panel">
        <CardHeader>
          <CardTitle>Hızlı Erişim</CardTitle>
          <CardDescription>Sık kullanılan işlemlere hızlıca erişin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/50 transition-all duration-200 group"
              >
                <div
                  className="p-3 rounded-lg transition-transform group-hover:scale-110"
                  style={{
                    background: `${action.color}20`,
                    color: action.color,
                  }}
                >
                  {action.icon}
                </div>
                <span className="font-medium">{action.label}</span>
                <Icons.ArrowRight className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 surface-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icons.Activity />
              Son Aktiviteler
            </CardTitle>
            <CardDescription>
              Sisteminizdeki son işlemler
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.sonAktiviteler.length === 0 ? (
              <div className="empty-state py-12">
                <Icons.Activity className="empty-state-icon" />
                <div className="empty-state-title">Aktivite Bulunamadı</div>
                <div className="empty-state-description">
                  Henüz sisteme kaydedilmiş bir aktivite yok.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.sonAktiviteler.slice(0, 6).map((aktivite) => (
                  <div
                    key={aktivite.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0">{getActivityIcon(aktivite.islem)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{aktivite.userAd}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(aktivite.createdAt).toLocaleString('tr-TR')}
                      </div>
                    </div>
                    <Badge
                      variant={
                        aktivite.islem === 'CREATE'
                          ? 'default'
                          : aktivite.islem === 'DELETE'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {aktivite.islem === 'CREATE'
                        ? 'Oluşturuldu'
                        : aktivite.islem === 'UPDATE'
                        ? 'Güncellendi'
                        : aktivite.islem === 'DELETE'
                        ? 'Silindi'
                        : aktivite.islem}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="surface-panel">
          <CardHeader>
            <CardTitle>Durum Dağılımı</CardTitle>
            <CardDescription>Servis durumlarının genel görünümü</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {stats.durumDagilimi.map((item) => {
                const config = DURUM_CONFIG[item.durum as keyof typeof DURUM_CONFIG];
                const percentage = stats.toplamServis
                  ? Math.round((item.sayi / stats.toplamServis) * 100)
                  : 0;

                return (
                  <div key={item.durum}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: config?.color }}
                        />
                        <span className="text-sm font-medium">
                          {config?.label || item.durum}
                        </span>
                      </div>
                      <span className="text-sm font-semibold">{item.sayi}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: config?.color,
                        }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 text-right">
                      {percentage}%
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Stats */}
            <div className="mt-8 pt-6 border-t border-border">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{stats.teknelerSayisi}</div>
                  <div className="text-xs text-muted-foreground">Toplam Tekne</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{stats.personelSayisi}</div>
                  <div className="text-xs text-muted-foreground">Toplam Personel</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}




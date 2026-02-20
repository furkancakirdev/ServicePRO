'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Bell,
  Command,
  ExternalLink,
  Gauge,
  HeartPulse,
  MapPin,
  Palette,
  RefreshCw,
  Shield,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/auth-context';
import { normalizeRole } from '@/lib/auth/role';
import { cn } from '@/lib/utils';
import { useUiRedesign } from '@/components/ui/ui-redesign-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DEFAULT_APP_SETTINGS,
  SYNC_SHEET_OPTIONS,
  type AppSettings,
  type SyncSheetOption,
} from '@/lib/settings/types';

type Role = 'ADMIN' | 'YETKILI';
type BusyAction = 'sync' | 'fullReset' | 'validate' | null;

type StatsResponse = {
  aktifServisler: number;
  bugunServisler: number;
  personelSayisi: number;
  teknelerSayisi: number;
};

type SyncLog = {
  id: string;
  sheetName: string;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL' | string;
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  createdAt: string;
};

type SyncStatus = {
  latestSuccess: SyncLog | null;
  lastSuccessfulAt?: string | null;
  ageSeconds?: number | null;
  stale?: boolean;
  recentLogs: SyncLog[];
  cronHealth: {
    isStale: boolean;
    minutesSinceLastRun: number | null;
    lastSuccessfulAt?: string | null;
    ageSeconds?: number | null;
  };
  summary: {
    successCount: number;
    failedCount: number;
    partialCount: number;
  };
};

type EndpointHealth = {
  label: string;
  ok: boolean;
  detail?: string;
  responseMs?: number;
  source?: string;
};

type UiPreferences = {
  compactDensity: boolean;
  showAnimations: boolean;
  pinOperationsToSidebar: boolean;
  highContrastMode: boolean;
  largeTouchTargets: boolean;
  focusMode: boolean;
  readableTypography: boolean;
};

type HealthResult<T> = {
  data: T | null;
  ok: boolean;
  status: number;
  detail?: string;
  responseMs: number;
};

const UI_PREFERENCES_KEY = 'servicepro.ui.preferences';

const DEFAULT_UI_PREFERENCES: UiPreferences = {
  compactDensity: false,
  showAnimations: true,
  pinOperationsToSidebar: true,
  highContrastMode: false,
  largeTouchTargets: false,
  focusMode: false,
  readableTypography: false,
};

const SHEET_LABELS: Record<SyncSheetOption, string> = {
  PLANLAMA: 'Planlama',
  PERSONEL: 'Personel',
  TEKNELER: 'Tekneler',
  PUANLAMA: 'Puanlama',
  AYLIK_OZET: 'Aylık Özet',
};

function parseSettings(value: AppSettings | null): AppSettings {
  if (!value) return DEFAULT_APP_SETTINGS;
  return {
    ...DEFAULT_APP_SETTINGS,
    ...value,
    theme: { ...DEFAULT_APP_SETTINGS.theme, ...value.theme },
    weather: { ...DEFAULT_APP_SETTINGS.weather, ...value.weather },
    sync: { ...DEFAULT_APP_SETTINGS.sync, ...value.sync },
    access: { ...DEFAULT_APP_SETTINGS.access, ...value.access },
    company: { ...DEFAULT_APP_SETTINGS.company, ...value.company },
    ui: { ...DEFAULT_APP_SETTINGS.ui, ...value.ui },
    partsEta: { ...DEFAULT_APP_SETTINGS.partsEta, ...value.partsEta },
    formGuards: { ...DEFAULT_APP_SETTINGS.formGuards, ...value.formGuards },
  };
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function fetchWithHealth<T>(url: string): Promise<HealthResult<T>> {
  const startedAt = performance.now();
  try {
    const response = await fetch(url, { cache: 'no-store', credentials: 'include' });
    const responseMs = Math.round(performance.now() - startedAt);
    if (!response.ok) {
      return {
        data: null,
        ok: false,
        status: response.status,
        detail: `HTTP ${response.status}`,
        responseMs,
      };
    }
    return {
      data: (await response.json()) as T,
      ok: true,
      status: response.status,
      responseMs,
    };
  } catch {
    return {
      data: null,
      ok: false,
      status: 0,
      detail: 'Ağ hatası',
      responseMs: Math.round(performance.now() - startedAt),
    };
  }
}

function loadUiPreferences(): UiPreferences {
  if (typeof window === 'undefined') return DEFAULT_UI_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(UI_PREFERENCES_KEY);
    if (!raw) return DEFAULT_UI_PREFERENCES;
    return { ...DEFAULT_UI_PREFERENCES, ...(JSON.parse(raw) as Partial<UiPreferences>) };
  } catch {
    return DEFAULT_UI_PREFERENCES;
  }
}

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function AyarlarPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const {
    enabled: redesignEnabled,
    hintsVisible,
    setHintsVisible,
    densityMode,
    setDensityMode,
  } = useUiRedesign();
  const role = (normalizeRole(user?.role) ?? 'YETKILI') as Role;
  const isAdmin = role === 'ADMIN';

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [uiPreferences, setUiPreferences] = useState<UiPreferences>(DEFAULT_UI_PREFERENCES);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [endpointHealth, setEndpointHealth] = useState<EndpointHealth[]>([]);
  const [lastHealthCheckAt, setLastHealthCheckAt] = useState<string | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<SyncSheetOption>('PLANLAMA');
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const canRunValidation = isAdmin || settings.access.yetkiliCanRunSyncValidation;
  const canViewSyncLogs = isAdmin || settings.access.yetkiliCanViewSyncLogs;

  const loadAllData = useCallback(async () => {
    const settingsRes = await fetchWithHealth<AppSettings>('/api/settings');

    if (settingsRes.status === 403) {
      toast.error('Ayarlar erişimi rolünüz için kapalı.');
      router.replace('/');
      return;
    }

    if (!settingsRes.ok || !settingsRes.data) {
      toast.error('Ayarlar yüklenemedi.');
      return;
    }

    const nextSettings = parseSettings(settingsRes.data);

    const [statsRes, healthRes, syncRes] = await Promise.all([
      fetchWithHealth<StatsResponse>('/api/stats'),
      fetchWithHealth<{ status?: string; db?: string }>('/api/health'),
      isAdmin || nextSettings.access.yetkiliCanViewSyncLogs
        ? fetchWithHealth<SyncStatus>('/api/sync/status')
        : Promise.resolve<HealthResult<SyncStatus>>({
            data: null,
            ok: true,
            status: 200,
            detail: 'Yetkili için kapalı',
            responseMs: 0,
          }),
    ]);

    setSettings(nextSettings);
    setSelectedSheet(nextSettings.sync.defaultSheet);
    setStats(statsRes.data);
    setSyncStatus(syncRes.data);

    setEndpointHealth([
      {
        label: '/api/health',
        ok: healthRes.ok,
        detail: healthRes.ok
          ? `${healthRes.data?.status ?? '-'} / db:${healthRes.data?.db ?? '-'}`
          : healthRes.detail,
        responseMs: healthRes.responseMs,
        source: 'Veritabanı erişimi',
      },
      {
        label: '/api/stats',
        ok: statsRes.ok,
        detail: statsRes.ok
          ? `aktif:${statsRes.data?.aktifServisler ?? '-'} bugün:${statsRes.data?.bugunServisler ?? '-'}`
          : statsRes.detail,
        responseMs: statsRes.responseMs,
        source: 'Operasyon istatistikleri',
      },
      {
        label: '/api/sync/status',
        ok: syncRes.ok,
        detail: syncRes.data
          ? `son10:${syncRes.data.summary.successCount}/${syncRes.data.summary.partialCount}/${syncRes.data.summary.failedCount}`
          : syncRes.detail,
        responseMs: syncRes.responseMs,
        source: 'Sync telemetri',
      },
      {
        label: '/api/settings',
        ok: settingsRes.ok,
        detail: settingsRes.ok ? `varsayılan:${nextSettings.sync.defaultSheet}` : settingsRes.detail,
        responseMs: settingsRes.responseMs,
        source: 'Ayar deposu',
      },
    ]);

    setLastHealthCheckAt(new Date().toISOString());
  }, [isAdmin, router]);

  useEffect(() => {
    const preferences = loadUiPreferences();
    setUiPreferences(preferences);
    if (redesignEnabled) {
      setDensityMode(preferences.compactDensity ? 'compact' : 'comfortable');
    }
  }, [redesignEnabled, setDensityMode]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const { body } = document;
    body.classList.toggle('ui-no-motion', !uiPreferences.showAnimations);
    body.classList.toggle('ui-high-contrast', uiPreferences.highContrastMode);
    body.classList.toggle('ui-large-hit-targets', uiPreferences.largeTouchTargets);
    body.classList.toggle('ui-focus-mode', uiPreferences.focusMode);
    body.classList.toggle('ui-readable-typography', uiPreferences.readableTypography);
    body.classList.toggle('ui-sidebar-pinned-operations', uiPreferences.pinOperationsToSidebar);

    return () => {
      body.classList.remove('ui-no-motion');
      body.classList.remove('ui-high-contrast');
      body.classList.remove('ui-large-hit-targets');
      body.classList.remove('ui-focus-mode');
      body.classList.remove('ui-readable-typography');
      body.classList.remove('ui-sidebar-pinned-operations');
    };
  }, [uiPreferences]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(UI_PREFERENCES_KEY);
    if (raw) return;

    const derived: UiPreferences = {
      compactDensity: settings.ui.compactTablesByDefault || settings.ui.densityDefault === 'compact',
      showAnimations: settings.ui.animationsEnabled,
      pinOperationsToSidebar: settings.ui.stickyQuickActions,
      highContrastMode: settings.ui.highContrastMode,
      largeTouchTargets: settings.ui.largeTouchTargets,
      focusMode: false,
      readableTypography: false,
    };

    setUiPreferences(derived);
    if (redesignEnabled) {
      setDensityMode(derived.compactDensity ? 'compact' : 'comfortable');
      if (settings.ui.hintsDefaultVisible !== hintsVisible) {
        setHintsVisible(settings.ui.hintsDefaultVisible);
      }
    }
  }, [
    hintsVisible,
    redesignEnabled,
    setDensityMode,
    setHintsVisible,
    settings.ui.animationsEnabled,
    settings.ui.compactTablesByDefault,
    settings.ui.densityDefault,
    settings.ui.highContrastMode,
    settings.ui.hintsDefaultVisible,
    settings.ui.largeTouchTargets,
    settings.ui.stickyQuickActions,
  ]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    void loadAllData();
  }, [isLoading, loadAllData, router, user]);

  const syncHealthBadge = useMemo(() => {
    if (!syncStatus) return { label: 'Bilinmiyor', className: 'text-muted-foreground border-border/70' };
    if (syncStatus.cronHealth.isStale) {
      return { label: 'Gecikmeli', className: 'text-amber-300 border-amber-900/60' };
    }
    return { label: 'Sağlıklı', className: 'text-emerald-300 border-emerald-900/60' };
  }, [syncStatus]);

  const saveUiPreferences = () => {
    window.localStorage.setItem(UI_PREFERENCES_KEY, JSON.stringify(uiPreferences));
    window.dispatchEvent(new Event('servicepro-ui-preferences-change'));
    toast.success('UI tercihleri kaydedildi');
  };

  const saveSettings = async () => {
    if (!isAdmin) return;
    setSavingSettings(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('save_failed');
      }

      toast.success('Ayarlar kaydedildi');
      await loadAllData();
    } catch {
      toast.error('Ayarlar kaydedilemedi');
    } finally {
      setSavingSettings(false);
    }
  };

  const runSync = async (action: Exclude<BusyAction, null>) => {
    if (!isAdmin && action !== 'validate') return;
    if (action === 'validate' && !canRunValidation) {
      toast.error('Doğrulama bu rol için kapalı.');
      return;
    }
    if (action === 'fullReset' && !settings.sync.allowFullReset) {
      toast.error('Full reset izni kapalı.');
      return;
    }
    if (
      action === 'fullReset' &&
      !window.confirm('Full reset tüm sync verisini yeniden oluşturur. Devam edilsin mi?')
    ) {
      return;
    }

    setBusyAction(action);

    try {
      const endpoint =
        action === 'sync'
          ? '/api/sync'
          : action === 'fullReset'
            ? '/api/sync/full-reset'
            : `/api/sync/validate?sampleLimit=${settings.sync.validationSampleLimit}&includeAll=1`;

      const response = await fetch(endpoint, {
        method: action === 'validate' ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:
          action === 'validate'
            ? undefined
            : JSON.stringify({
                sheet: selectedSheet,
                confirm: action === 'fullReset',
                scope: action === 'fullReset' ? 'sheet-only' : undefined,
                mode: action === 'fullReset' ? 'full_reset' : 'incremental',
              }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(typeof body?.error === 'string' ? body.error : 'Sync işlemi başarısız');
      }

      toast.success(action === 'validate' ? 'Doğrulama tamamlandı' : 'Senkronizasyon tamamlandı');
      await loadAllData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Sync işlemi başarısız');
    } finally {
      setBusyAction(null);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="rounded-xl border border-border/70 bg-background/40 p-6 text-sm text-muted-foreground">
        Ayarlar yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="hero-panel flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="page-title">Sistem Ayarları ve Yönetim</h1>
          <p className="page-subtitle">
            Operasyon, entegrasyon ve yetki davranışlarını tek merkezden yönetin.
          </p>
        </div>
        <Badge className="bg-background/70 text-foreground">{isAdmin ? 'Admin' : 'Yetkili'}</Badge>
      </header>

      <Tabs defaultValue="genel" className="space-y-4">
        <TabsList className="w-full justify-start bg-background/40">
          <TabsTrigger value="genel">Genel</TabsTrigger>
          <TabsTrigger value="sync">Google Sheets Sync</TabsTrigger>
          {isAdmin ? <TabsTrigger value="admin">Admin Kontrol</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="genel" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="surface-panel border-border/70 bg-background/40"><CardHeader className="pb-3"><CardDescription>Aktif Servis</CardDescription><CardTitle className="text-3xl text-sky-300">{stats?.aktifServisler ?? '-'}</CardTitle></CardHeader></Card>
            <Card className="surface-panel border-border/70 bg-background/40"><CardHeader className="pb-3"><CardDescription>Bugün Planlanan</CardDescription><CardTitle className="text-3xl text-emerald-300">{stats?.bugunServisler ?? '-'}</CardTitle></CardHeader></Card>
            <Card className="surface-panel border-border/70 bg-background/40"><CardHeader className="pb-3"><CardDescription>Aktif Personel</CardDescription><CardTitle className="text-3xl text-amber-300">{stats?.personelSayisi ?? '-'}</CardTitle></CardHeader></Card>
            <Card className="surface-panel border-border/70 bg-background/40"><CardHeader className="pb-3"><CardDescription>Aktif Tekne</CardDescription><CardTitle className="text-3xl text-fuchsia-300">{stats?.teknelerSayisi ?? '-'}</CardTitle></CardHeader></Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="surface-panel border-border/70 bg-background/40 xl:col-span-2">
              <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><Palette className="h-4 w-4 text-sky-300" />UI Tercihleri</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">Kompakt tablo yogunlugu</span><Switch checked={uiPreferences.compactDensity} onCheckedChange={(checked) => { setUiPreferences((prev) => ({ ...prev, compactDensity: checked })); if (redesignEnabled) { setDensityMode(checked ? 'compact' : 'comfortable'); } }} /></div>
                <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">Arayüz animasyonlarını göster</span><Switch checked={uiPreferences.showAnimations} onCheckedChange={(checked) => setUiPreferences((prev) => ({ ...prev, showAnimations: checked }))} /></div>
                <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">Operasyon menüsünü sabitle</span><Switch checked={uiPreferences.pinOperationsToSidebar} onCheckedChange={(checked) => setUiPreferences((prev) => ({ ...prev, pinOperationsToSidebar: checked }))} /></div>
                <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">Yüksek kontrast modu</span><Switch checked={uiPreferences.highContrastMode} onCheckedChange={(checked) => setUiPreferences((prev) => ({ ...prev, highContrastMode: checked }))} /></div>
                <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">Büyük tıklama alanları</span><Switch checked={uiPreferences.largeTouchTargets} onCheckedChange={(checked) => setUiPreferences((prev) => ({ ...prev, largeTouchTargets: checked }))} /></div>
                <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">Odak modu (görsel yük azalt)</span><Switch checked={uiPreferences.focusMode} onCheckedChange={(checked) => setUiPreferences((prev) => ({ ...prev, focusMode: checked }))} /></div>
                <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">Okunabilir tipografi</span><Switch checked={uiPreferences.readableTypography} onCheckedChange={(checked) => setUiPreferences((prev) => ({ ...prev, readableTypography: checked }))} /></div>
                {redesignEnabled ? <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">Inline yardim ipuclari</span><Switch checked={hintsVisible} onCheckedChange={setHintsVisible} /></div> : null}
                {redesignEnabled ? <p className="text-xs text-muted-foreground">Aktif yogunluk modu: {densityMode === 'compact' ? 'compact' : 'comfortable'}</p> : null}
                <Button data-testid="save-ui-preferences" onClick={saveUiPreferences}>UI tercihlerini kaydet</Button>
              </CardContent>
            </Card>

            <Card className="surface-panel border-border/70 bg-background/40">
              <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><Gauge className="h-4 w-4 text-cyan-300" />Canlı Sistem Durumu</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {endpointHealth.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-md border border-border/70 bg-background/40 p-2 text-xs">
                    <div><p className="text-foreground/90">{item.label}</p><p className="text-[11px] text-muted-foreground">{item.source} • {item.detail ?? '-'}</p></div>
                    <div className="flex items-center gap-2"><span className="text-[11px] text-muted-foreground">{item.responseMs ?? 0}ms</span><Badge variant="outline" className={cn('border-border/70', item.ok ? 'text-emerald-300' : 'text-rose-300')}>{item.ok ? 'OK' : 'Hata'}</Badge></div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1"><p className="text-[11px] text-muted-foreground">Son kontrol: {formatDateTime(lastHealthCheckAt)}</p><Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => void loadAllData()}>Yenile</Button></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-3">
            <Card className="surface-panel border-border/70 bg-background/40"><CardContent className="pt-4"><p className="flex items-center gap-2 text-xs text-muted-foreground"><HeartPulse className="h-3.5 w-3.5 text-emerald-300" />Cron Sağlığı</p><div className="mt-2 flex items-center gap-2"><Badge variant="outline" className={syncHealthBadge.className}>{syncHealthBadge.label}</Badge><span className="text-xs text-muted-foreground">{syncStatus?.cronHealth.minutesSinceLastRun != null ? `${syncStatus.cronHealth.minutesSinceLastRun} dk önce` : 'Kayıt yok'}</span></div></CardContent></Card>
            <Card className="surface-panel border-border/70 bg-background/40"><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Son Başarılı Senkron</p><p className="mt-2 text-sm text-foreground">{formatDateTime(syncStatus?.latestSuccess?.createdAt)}</p></CardContent></Card>
            <Card className="surface-panel border-border/70 bg-background/40"><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Son 10 Çalıştırma Özeti</p><div className="mt-2 flex flex-wrap gap-2 text-xs"><Badge variant="outline" className="border-emerald-900/60 text-emerald-300">Başarılı: {syncStatus?.summary.successCount ?? 0}</Badge><Badge variant="outline" className="border-amber-900/60 text-amber-300">Kısmi: {syncStatus?.summary.partialCount ?? 0}</Badge><Badge variant="outline" className="border-rose-900/60 text-rose-300">Hatalı: {syncStatus?.summary.failedCount ?? 0}</Badge></div></CardContent></Card>
          </div>

          <Card className="surface-panel border-border/70 bg-background/40">
            <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><RefreshCw className="h-4 w-4 text-sky-300" />Sync Kontrol Merkezi</CardTitle><CardDescription>Yazma etkili sync komutları yalnızca Admin kullanıcılar içindir.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2"><Label>Çalıştırılacak Sheet</Label><Select value={selectedSheet} onValueChange={(value) => setSelectedSheet(value as SyncSheetOption)}><SelectTrigger className="bg-background/40"><SelectValue /></SelectTrigger><SelectContent>{SYNC_SHEET_OPTIONS.map((sheetKey) => <SelectItem key={sheetKey} value={sheetKey}>{SHEET_LABELS[sheetKey]}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Doğrulama örnek limiti</Label><Input type="number" min={50} max={10000} className="bg-background/40" value={settings.sync.validationSampleLimit} onChange={(e) => setSettings((prev) => ({ ...prev, sync: { ...prev.sync, validationSampleLimit: toNumber(e.target.value, prev.sync.validationSampleLimit) } }))} disabled={!isAdmin} /></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {isAdmin ? <><Button data-testid="sync-incremental" onClick={() => void runSync('sync')} disabled={busyAction !== null}>{busyAction === 'sync' ? 'Çalışıyor...' : 'Incremental Sync'}</Button><Button data-testid="sync-full-reset" variant="secondary" onClick={() => void runSync('fullReset')} disabled={busyAction !== null}>{busyAction === 'fullReset' ? 'Çalışıyor...' : 'Full Reset'}</Button></> : null}
                <Button data-testid="sync-validate" variant="outline" onClick={() => void runSync('validate')} disabled={busyAction !== null || !canRunValidation}>{busyAction === 'validate' ? 'Doğrulanıyor...' : 'Sheet-DB Validate'}</Button>
              </div>
              <div className="rounded-md border border-border/70 bg-background/40 p-3 text-xs text-muted-foreground"><p className="mb-2 flex items-center gap-2"><Command className="h-3.5 w-3.5 text-cyan-300" />Önerilen komutlar</p><p className="font-mono text-cyan-300">npm run sync:validate</p><p className="font-mono text-cyan-300">npm run sync:reconcile:dry</p><p className="mt-2 font-mono text-cyan-300">POST /api/sync</p><p className="font-mono text-cyan-300">POST /api/sync/full-reset</p><p className="font-mono text-cyan-300">GET /api/sync/status</p></div>
            </CardContent>
          </Card>

          <Card className="surface-panel border-border/70 bg-background/40">
            <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><Activity className="h-4 w-4 text-cyan-300" />Son Sync Logları</CardTitle></CardHeader>
            <CardContent>
              {!canViewSyncLogs ? (
                <div className="rounded-md border border-border/70 bg-background/35 p-3 text-sm text-muted-foreground">Sync logları bu rol için kapalı.</div>
              ) : (
                <Table><TableHeader><TableRow><TableHead>Sheet</TableHead><TableHead>Durum</TableHead><TableHead className="text-right">Oluşturulan</TableHead><TableHead className="text-right">Güncellenen</TableHead><TableHead className="text-right">Silinen</TableHead><TableHead>Tarih</TableHead></TableRow></TableHeader><TableBody>{(syncStatus?.recentLogs ?? []).length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Kayıt bulunamadı</TableCell></TableRow> : syncStatus?.recentLogs.map((log) => <TableRow key={log.id}><TableCell className="font-medium text-foreground/90">{SHEET_LABELS[log.sheetName as SyncSheetOption] ?? log.sheetName}</TableCell><TableCell><Badge variant="outline" className={cn('border-border/70', log.status === 'SUCCESS' ? 'text-emerald-300' : log.status === 'PARTIAL' ? 'text-amber-300' : 'text-rose-300')}>{log.status}</Badge></TableCell><TableCell className="text-right">{log.recordsCreated}</TableCell><TableCell className="text-right">{log.recordsUpdated}</TableCell><TableCell className="text-right">{log.recordsDeleted}</TableCell><TableCell>{formatDateTime(log.createdAt)}</TableCell></TableRow>)}</TableBody></Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin ? (
          <TabsContent value="admin" className="space-y-4">
            <Card className="surface-panel border-border/70 bg-background/40">
              <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><Shield className="h-4 w-4 text-emerald-300" />Admin Kontrolleri</CardTitle><CardDescription>Senkronizasyon politikası, yetki sınırları ve operasyon varsayılanları.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">Senkronizasyon aktif</span><Switch checked={settings.sync.enabled} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, sync: { ...prev.sync, enabled: checked } }))} /></div>
                  <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">Full reset izni</span><Switch checked={settings.sync.allowFullReset} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, sync: { ...prev.sync, allowFullReset: checked } }))} /></div>
                  <div className="space-y-2"><Label>Varsayılan sheet</Label><Select value={settings.sync.defaultSheet} onValueChange={(value) => setSettings((prev) => ({ ...prev, sync: { ...prev.sync, defaultSheet: value as SyncSheetOption } }))}><SelectTrigger className="bg-background/40"><SelectValue /></SelectTrigger><SelectContent>{SYNC_SHEET_OPTIONS.map((sheetKey) => <SelectItem key={sheetKey} value={sheetKey}>{SHEET_LABELS[sheetKey]}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Stale threshold (dk)</Label><Input type="number" min={5} max={180} className="bg-background/40" value={settings.sync.staleThresholdMinutes} onChange={(e) => setSettings((prev) => ({ ...prev, sync: { ...prev.sync, staleThresholdMinutes: toNumber(e.target.value, prev.sync.staleThresholdMinutes) } }))} /></div>
                  <div className="space-y-2"><Label>Cron ifadesi</Label><Input className="bg-background/40" value={settings.sync.cronExpression} onChange={(e) => setSettings((prev) => ({ ...prev, sync: { ...prev.sync, cronExpression: e.target.value } }))} /></div>
                  <div className="space-y-2"><Label>Saat dilimi</Label><Input className="bg-background/40" value={settings.sync.timezone} onChange={(e) => setSettings((prev) => ({ ...prev, sync: { ...prev.sync, timezone: e.target.value } }))} /></div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">Yetkili ayarlara girebilsin</span><Switch checked={settings.access.yetkiliCanAccessSettings} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, access: { ...prev.access, yetkiliCanAccessSettings: checked } }))} /></div>
                  <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">Yetkili sync doğrulama çalıştırabilsin</span><Switch checked={settings.access.yetkiliCanRunSyncValidation} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, access: { ...prev.access, yetkiliCanRunSyncValidation: checked } }))} /></div>
                  <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">Yetkili sync loglarını görebilsin</span><Switch checked={settings.access.yetkiliCanViewSyncLogs} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, access: { ...prev.access, yetkiliCanViewSyncLogs: checked } }))} /></div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2"><Label>Varsayılan hava konumu</Label><Input className="bg-background/40" value={settings.weather.defaultLocationName} onChange={(e) => setSettings((prev) => ({ ...prev, weather: { ...prev.weather, defaultLocationName: e.target.value } }))} /></div>
                  <div className="space-y-2"><Label>Enlem</Label><Input type="number" className="bg-background/40" value={settings.weather.defaultLatitude ?? ''} onChange={(e) => setSettings((prev) => ({ ...prev, weather: { ...prev.weather, defaultLatitude: e.target.value.trim() === '' ? null : toNumber(e.target.value, prev.weather.defaultLatitude ?? 0) } }))} /></div>
                  <div className="space-y-2"><Label>Boylam</Label><Input type="number" className="bg-background/40" value={settings.weather.defaultLongitude ?? ''} onChange={(e) => setSettings((prev) => ({ ...prev, weather: { ...prev.weather, defaultLongitude: e.target.value.trim() === '' ? null : toNumber(e.target.value, prev.weather.defaultLongitude ?? 0) } }))} /></div>
                  <div className="space-y-2"><Label>Şirket adı</Label><Input className="bg-background/40" value={settings.company.name} onChange={(e) => setSettings((prev) => ({ ...prev, company: { ...prev.company, name: e.target.value } }))} /></div>
                  <div className="space-y-2"><Label>Destek e-posta</Label><Input className="bg-background/40" value={settings.company.supportEmail} onChange={(e) => setSettings((prev) => ({ ...prev, company: { ...prev.company, supportEmail: e.target.value } }))} /></div>
                  <div className="space-y-2"><Label>Destek telefon</Label><Input className="bg-background/40" value={settings.company.supportPhone} onChange={(e) => setSettings((prev) => ({ ...prev, company: { ...prev.company, supportPhone: e.target.value } }))} /></div>
                </div>

                <div className="space-y-3 rounded-lg border border-border/70 bg-background/30 p-3">
                  <p className="text-sm font-medium text-foreground">UI varsayılanları (global)</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2"><Label>Varsayılan yoğunluk</Label><Select value={settings.ui.densityDefault} onValueChange={(value) => setSettings((prev) => ({ ...prev, ui: { ...prev.ui, densityDefault: value === 'compact' ? 'compact' : 'comfortable' } }))}><SelectTrigger className="bg-background/40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="comfortable">Comfortable</SelectItem><SelectItem value="compact">Compact</SelectItem></SelectContent></Select></div>
                    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">İpucu metinleri varsayılan açık</span><Switch checked={settings.ui.hintsDefaultVisible} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, ui: { ...prev.ui, hintsDefaultVisible: checked } }))} /></div>
                    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">Animasyonlar varsayılan açık</span><Switch checked={settings.ui.animationsEnabled} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, ui: { ...prev.ui, animationsEnabled: checked } }))} /></div>
                    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">Yüksek kontrast varsayılan</span><Switch checked={settings.ui.highContrastMode} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, ui: { ...prev.ui, highContrastMode: checked } }))} /></div>
                    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">Büyük hit area varsayılan</span><Switch checked={settings.ui.largeTouchTargets} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, ui: { ...prev.ui, largeTouchTargets: checked } }))} /></div>
                    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">Kompakt tablo varsayılan</span><Switch checked={settings.ui.compactTablesByDefault} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, ui: { ...prev.ui, compactTablesByDefault: checked } }))} /></div>
                    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">Hızlı aksiyonlar sabit</span><Switch checked={settings.ui.stickyQuickActions} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, ui: { ...prev.ui, stickyQuickActions: checked } }))} /></div>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-border/70 bg-background/30 p-3">
                  <p className="text-sm font-medium text-foreground">Parça Bekleme ETA Tahmini</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">ETA tahmini aktif</span><Switch checked={settings.partsEta.enabled} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, partsEta: { ...prev.partsEta, enabled: checked } }))} /></div>
                    <div className="space-y-2"><Label>Min. geçmiş kayıt</Label><Input type="number" min={1} max={20} className="bg-background/40" value={settings.partsEta.minHistoryRecords} onChange={(e) => setSettings((prev) => ({ ...prev, partsEta: { ...prev.partsEta, minHistoryRecords: toNumber(e.target.value, prev.partsEta.minHistoryRecords) } }))} /></div>
                    <div className="space-y-2"><Label>Geçmiş bakış süresi (gün)</Label><Input type="number" min={30} max={1095} className="bg-background/40" value={settings.partsEta.historyLookbackDays} onChange={(e) => setSettings((prev) => ({ ...prev, partsEta: { ...prev.partsEta, historyLookbackDays: toNumber(e.target.value, prev.partsEta.historyLookbackDays) } }))} /></div>
                    <div className="space-y-2"><Label>Taşeron bekleyen varsayılan ETA (gün)</Label><Input type="number" min={1} max={90} className="bg-background/40" value={settings.partsEta.defaultWaitingEtaDays} onChange={(e) => setSettings((prev) => ({ ...prev, partsEta: { ...prev.partsEta, defaultWaitingEtaDays: toNumber(e.target.value, prev.partsEta.defaultWaitingEtaDays) } }))} /></div>
                    <div className="space-y-2"><Label>Sipariş edilen yedek varsayılan ETA (gün)</Label><Input type="number" min={1} max={90} className="bg-background/40" value={settings.partsEta.defaultOrderedEtaDays} onChange={(e) => setSettings((prev) => ({ ...prev, partsEta: { ...prev.partsEta, defaultOrderedEtaDays: toNumber(e.target.value, prev.partsEta.defaultOrderedEtaDays) } }))} /></div>
                    <div className="space-y-2"><Label>Maksimum ETA (gün)</Label><Input type="number" min={3} max={180} className="bg-background/40" value={settings.partsEta.maxEtaDays} onChange={(e) => setSettings((prev) => ({ ...prev, partsEta: { ...prev.partsEta, maxEtaDays: toNumber(e.target.value, prev.partsEta.maxEtaDays) } }))} /></div>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-border/70 bg-background/30 p-3">
                  <p className="text-sm font-medium text-foreground">Hata önleyici form kuralları</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">Başlangıç tarihi zorunlu</span><Switch checked={settings.formGuards.requireStartDate} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, formGuards: { ...prev.formGuards, requireStartDate: checked } }))} /></div>
                    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">En az bir personel zorunlu</span><Switch checked={settings.formGuards.requireAssignedPersonnel} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, formGuards: { ...prev.formGuards, requireAssignedPersonnel: checked } }))} /></div>
                    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">Taşeron bekleyen için ETA zorunlu</span><Switch checked={settings.formGuards.requireEtaForWaitingParts} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, formGuards: { ...prev.formGuards, requireEtaForWaitingParts: checked } }))} /></div>
                    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">Sipariş edilen parça için ETA zorunlu</span><Switch checked={settings.formGuards.requireEtaForOrderedParts} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, formGuards: { ...prev.formGuards, requireEtaForOrderedParts: checked } }))} /></div>
                    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">Taşeron firma bilgisi zorunlu</span><Switch checked={settings.formGuards.requireSupplierForWaitingParts} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, formGuards: { ...prev.formGuards, requireSupplierForWaitingParts: checked } }))} /></div>
                    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2"><span className="text-sm text-foreground/90">İrtibat bilgisi boşsa uyar</span><Switch checked={settings.formGuards.warnOnMissingContactInfo} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, formGuards: { ...prev.formGuards, warnOnMissingContactInfo: checked } }))} /></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button data-testid="save-admin-settings" onClick={saveSettings} disabled={savingSettings}>{savingSettings ? 'Kaydediliyor...' : 'Admin ayarlarını kaydet'}</Button>
              <Button asChild variant="secondary" className="gap-2">
                <Link href="/ayarlar/kullanicilar"><Users className="h-4 w-4" />Kullanıcı Yönetimi</Link>
              </Button>
              <Button asChild variant="secondary" className="gap-2">
                <Link href="/ayarlar/durumlar"><Activity className="h-4 w-4" />Durum Yönetimi</Link>
              </Button>
              <Button asChild variant="secondary" className="gap-2">
                <Link href="/ayarlar/konumlar"><MapPin className="h-4 w-4" />Konum Yönetimi</Link>
              </Button>
              <Button asChild variant="secondary" className="gap-2">
                <Link href="/ayarlar/blokaj-nedenleri"><Shield className="h-4 w-4" />Blokaj Nedenleri</Link>
              </Button>
              <Button asChild variant="secondary" className="gap-2">
                <Link href="/ayarlar/alerts"><Bell className="h-4 w-4" />Alert Rules</Link>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link href="/servisler">Servis Listesine Git<ExternalLink className="h-4 w-4" /></Link>
              </Button>
            </div>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}



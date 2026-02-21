'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Input, Row, Select, Switch, Table, Tabs, Tag, message } from 'antd';
import { PageContainer } from '@ant-design/pro-components';
import SozluklerYonetimPanel from '@/components/ayarlar/SozluklerYonetimPanel';
import KullanicilarYonetimPanel from '@/components/ayarlar/KullanicilarYonetimPanel';
import { useAuth } from '@/lib/auth/auth-context';
import { normalizeRole } from '@/lib/auth/role';
import {
  DEFAULT_APP_SETTINGS,
  SYNC_SHEET_OPTIONS,
  type AppSettings,
  type SyncSheetOption,
} from '@/lib/settings/types';

type SyncLog = {
  id: string;
  sheetName: string;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL' | string;
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  createdAt: string;
};

type SyncStatusResponse = {
  lastSuccessfulAt?: string | null;
  stale?: boolean;
  recentLogs: SyncLog[];
};

const SHEET_LABELS: Record<SyncSheetOption, string> = {
  PLANLAMA: 'Planlama',
  PERSONEL: 'Personel',
  TEKNELER: 'Tekneler',
  PUANLAMA: 'Puanlama',
  AYLIK_OZET: 'Aylık Özet',
};

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function parseError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const row = payload as { error?: string };
  return row.error ?? fallback;
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

export default function AyarlarPage() {
  const { user, isLoading } = useAuth();
  const [mesajApi, mesajBaglami] = message.useMessage();
  const [ayarlar, setAyarlar] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [sayfaYukleniyor, setSayfaYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const role = normalizeRole(user?.role ?? null);
  const isAdmin = role === 'ADMIN';

  const loadData = useCallback(async () => {
    setSayfaYukleniyor(true);
    try {
      if (isAdmin) {
        const settingsResponse = await fetch('/api/settings', {
          cache: 'no-store',
          credentials: 'include',
          headers: getAuthHeaders(),
        });
        const settingsPayload = (await settingsResponse.json().catch(() => null)) as AppSettings | { error?: string } | null;
        if (!settingsResponse.ok) {
          throw new Error(parseError(settingsPayload, 'Ayarlar getirilemedi.'));
        }
        setAyarlar(settingsPayload as AppSettings);
      }

      const syncResponse = await fetch('/api/sync/status', {
        cache: 'no-store',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const syncPayload = (await syncResponse.json().catch(() => null)) as SyncStatusResponse | { error?: string } | null;
      if (syncResponse.ok) {
        setSyncStatus(syncPayload as SyncStatusResponse);
      } else {
        setSyncStatus(null);
      }
    } catch (error) {
      mesajApi.error(error instanceof Error ? error.message : 'Ayarlar yüklenemedi.');
    } finally {
      setSayfaYukleniyor(false);
    }
  }, [isAdmin, mesajApi]);

  useEffect(() => {
    if (!isLoading) {
      void loadData();
    }
  }, [isLoading, loadData]);

  const saveSettings = useCallback(async () => {
    if (!isAdmin) return;
    setKaydediliyor(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(ayarlar),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(parseError(payload, 'Ayarlar kaydedilemedi.'));
      mesajApi.success('Ayarlar kaydedildi.');
      await loadData();
    } catch (error) {
      mesajApi.error(error instanceof Error ? error.message : 'Ayarlar kaydedilemedi.');
    } finally {
      setKaydediliyor(false);
    }
  }, [ayarlar, isAdmin, loadData, mesajApi]);

  const syncRows = useMemo(() => syncStatus?.recentLogs ?? [], [syncStatus?.recentLogs]);

  if (isLoading || sayfaYukleniyor) {
    return (
      <div className="rounded-xl border border-border/70 bg-background/40 p-6 text-sm text-muted-foreground">
        Ayarlar yükleniyor...
      </div>
    );
  }

  return (
    <>
      {mesajBaglami}
      <PageContainer title="Ayarlar" subTitle="Genel, sözlükler, entegrasyonlar ve güvenlik ayarları">
        {!isAdmin ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Yönetici görünümü kapalı"
            description="Yalnızca izinli alanlar gösterilir."
          />
        ) : null}

        <Tabs
          defaultActiveKey="genel"
          items={[
            {
              key: 'genel',
              label: 'Genel',
              children: (
                <Card>
                  <Form layout="vertical">
                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item label="Firma Adı">
                          <Input value={ayarlar.company.name} onChange={(e) => setAyarlar((p) => ({ ...p, company: { ...p.company, name: e.target.value } }))} disabled={!isAdmin} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item label="Logo Adresi">
                          <Input value={ayarlar.company.logoUrl} onChange={(e) => setAyarlar((p) => ({ ...p, company: { ...p.company, logoUrl: e.target.value } }))} disabled={!isAdmin} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item label="Varsayılan Lokasyon">
                          <Input value={ayarlar.weather.defaultLocationName} onChange={(e) => setAyarlar((p) => ({ ...p, weather: { ...p.weather, defaultLocationName: e.target.value } }))} disabled={!isAdmin} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item label="Saat Dilimi">
                          <Input value={ayarlar.sync.timezone} onChange={(e) => setAyarlar((p) => ({ ...p, sync: { ...p.sync, timezone: e.target.value } }))} disabled={!isAdmin} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Button type="primary" onClick={() => void saveSettings()} loading={kaydediliyor} disabled={!isAdmin}>
                      Kaydet
                    </Button>
                  </Form>
                </Card>
              ),
            },
            {
              key: 'sozlukler',
              label: 'Sözlükler',
              children: isAdmin ? (
                <SozluklerYonetimPanel aktif />
              ) : (
                <Alert type="warning" showIcon message="Sözlük yönetimi için yönetici yetkisi gerekir." />
              ),
            },
            {
              key: 'entegrasyonlar',
              label: 'Entegrasyonlar (Google E-Tablolar)',
              children: (
                <Card>
                  <Form layout="vertical">
                    <Row gutter={16}>
                      <Col xs={24} md={8}>
                        <Form.Item label="Eşitleme Aktif">
                          <Switch checked={ayarlar.sync.enabled} onChange={(checked) => setAyarlar((p) => ({ ...p, sync: { ...p.sync, enabled: checked } }))} disabled={!isAdmin} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="Varsayılan Çalışma Sayfası">
                          <Select value={ayarlar.sync.defaultSheet} onChange={(value) => setAyarlar((p) => ({ ...p, sync: { ...p.sync, defaultSheet: value as SyncSheetOption } }))} disabled={!isAdmin} options={SYNC_SHEET_OPTIONS.map((item) => ({ value: item, label: SHEET_LABELS[item] }))} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="Son Başarılı Eşitleme">
                          <Input readOnly value={formatDateTime(syncStatus?.lastSuccessfulAt)} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Table<SyncLog>
                      rowKey="id"
                      size="small"
                      dataSource={syncRows}
                      pagination={{ pageSize: 5 }}
                      scroll={{ x: 860 }}
                      columns={[
                        { title: 'Sayfa', dataIndex: 'sheetName', render: (value: string) => SHEET_LABELS[value as SyncSheetOption] ?? value },
                        { title: 'Durum', dataIndex: 'status', render: (value: string) => <Tag color={value === 'SUCCESS' ? 'green' : value === 'PARTIAL' ? 'gold' : 'red'}>{value}</Tag> },
                        { title: 'Oluşturulan', dataIndex: 'recordsCreated' },
                        { title: 'Güncellenen', dataIndex: 'recordsUpdated' },
                        { title: 'Silinen', dataIndex: 'recordsDeleted' },
                        { title: 'Tarih', dataIndex: 'createdAt', render: (value: string) => formatDateTime(value) },
                      ]}
                    />
                  </Form>
                </Card>
              ),
            },
            {
              key: 'guvenlik',
              label: 'Güvenlik ve Kullanıcılar',
              children: (
                <Card>
                  <Form layout="vertical">
                    <Row gutter={16}>
                      <Col xs={24} md={8}>
                        <Form.Item label="Yetkili Ayarlara Erişsin">
                          <Switch checked={ayarlar.access.yetkiliCanAccessSettings} onChange={(checked) => setAyarlar((p) => ({ ...p, access: { ...p.access, yetkiliCanAccessSettings: checked } }))} disabled={!isAdmin} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="Yetkili Doğrulama Çalıştırsın">
                          <Switch checked={ayarlar.access.yetkiliCanRunSyncValidation} onChange={(checked) => setAyarlar((p) => ({ ...p, access: { ...p.access, yetkiliCanRunSyncValidation: checked } }))} disabled={!isAdmin} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="Yetkili Eşitleme Loglarını Görsün">
                          <Switch checked={ayarlar.access.yetkiliCanViewSyncLogs} onChange={(checked) => setAyarlar((p) => ({ ...p, access: { ...p.access, yetkiliCanViewSyncLogs: checked } }))} disabled={!isAdmin} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Button type="primary" onClick={() => void saveSettings()} loading={kaydediliyor} disabled={!isAdmin}>
                      Kaydet
                    </Button>
                  </Form>
                  <div style={{ marginTop: 16 }}>
                    {isAdmin ? <KullanicilarYonetimPanel aktif /> : <Alert type="warning" showIcon message="Kullanıcı yönetimi için yönetici yetkisi gerekir." />}
                  </div>
                </Card>
              ),
            },
          ]}
        />
      </PageContainer>
    </>
  );
}

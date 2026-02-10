'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { normalizeRole } from '@/lib/auth/role';

interface User {
  id: string;
  ad: string;
  email: string;
  role: string; // ADMIN veya YETKILI - büyük harf (auth-context ile uyumlu)
}

interface SyncStatus {
  lastRun?: unknown;
  latestSuccess?: {
    status: string;
    recordsCreated: number;
    recordsUpdated: number;
    recordsDeleted: number;
    durationMs?: number | null;
    createdAt: string;
  } | null;
  cronHealth?: {
    hasRun: boolean;
    staleThresholdMinutes: number;
    minutesSinceLastRun: number | null;
    isStale: boolean;
    latestStatus: string | null;
    latestRunAt: string | null;
  };
  summary?: {
    last10Runs: number;
    successCount: number;
    partialCount: number;
    failedCount: number;
  };
  recentLogs?: unknown[];
}

interface SyncValidationSummary {
  totalSheetRows: number;
  effectiveSheetRows: number;
  dbRowsChecked: number;
  missingInDbCount: number;
  extraInDbCount: number;
  mismatchedCount: number;
  skippedByStatusCount: number;
  invalidRowCount: number;
  criticalMismatchCount: number;
}

interface SyncValidationMismatch {
  id: string;
  diffs: Array<{ field: string; sheet: string | null; db: string | null }>;
}

interface SyncValidationHeaderReport {
  field: string;
  expectedColumn: string;
  expectedHeader: string | null;
  resolvedColumn: number | null;
  resolvedHeader: string | null;
}

interface SyncValidationResult {
  ok: boolean;
  error?: string;
  details?: string[];
  sheetName?: string;
  headers?: string[];
  headerReport?: SyncValidationHeaderReport[];
  summary?: SyncValidationSummary;
  mismatchByField?: Record<string, number>;
  samples?: {
    missingInDb: string[];
    extraInDb: string[];
    mismatched: SyncValidationMismatch[];
  };
}

interface SettingsCard {
  title: string;
  description: string;
  icon: string;
  href: string;
  color: string;
}

export default function AyarlarPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [fullValidation, setFullValidation] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncMessage, setSyncMessage] = useState('');
  const [validationMessage, setValidationMessage] = useState('');
  const [validationResult, setValidationResult] = useState<SyncValidationResult | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(storedUser) as User;
    // normalizeRole kullanarak rol kontrolü yap
    const normalizedRole = normalizeRole(parsedUser.role);

    if (normalizedRole !== 'ADMIN') {
      router.push('/');
      return;
    }

    setUser(parsedUser);
    setLoading(false);
  }, [router]);

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch('/api/sync/status');
      if (!res.ok) return;
      const data = await res.json();
      setSyncStatus({
        lastRun: data.lastRun,
        latestSuccess: data.latestSuccess,
        cronHealth: data.cronHealth,
        summary: data.summary,
        recentLogs: data.recentLogs,
      });
    } catch {
      // status widget must not break page
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchSyncStatus();
    }
  }, [loading]);

  const runManualSync = async (mode: 'incremental' | 'full_reset') => {
    if (mode === 'full_reset') {
      const approved = window.confirm(
        'Full Reset tüm servis kayıtlarını silip Google Sheets\'ten baştan yükler. Devam etmek istiyor musunuz?'
      );
      if (!approved) return;
    }

    setSyncing(true);
    setSyncMessage('');

    try {
      const isFullReset = mode === 'full_reset';
      const endpoint = isFullReset ? '/api/sync/full-reset' : '/api/sync';
      const requestInit: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      };

      if (isFullReset) {
        requestInit.body = JSON.stringify({ confirm: true });
      } else {
        requestInit.body = JSON.stringify({ mode, sheet: 'PLANLAMA' });
      }

      const res = await fetch(endpoint, requestInit);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Sync başarısız');
      }

      setSyncMessage(
        `Sync tamamlandı: created=${data?.totals?.created ?? 0}, updated=${data?.totals?.updated ?? 0}, deleted=${data?.totals?.deleted ?? 0}`
      );
      await fetchSyncStatus();
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Sync hatası');
    } finally {
      setSyncing(false);
    }
  };

  const runSyncValidation = async () => {
    setValidating(true);
    setValidationMessage('');
    setValidationResult(null);
    try {
      const query = fullValidation ? '/api/sync/validate?sampleLimit=2000&includeAll=1' : '/api/sync/validate?sampleLimit=25';
      const res = await fetch(query);
      const data: SyncValidationResult = await res.json();
      setValidationResult(data);

      if (!res.ok || !data?.ok || !data.summary) {
        const detail = data.error || data.details?.[0] || 'Sheet doğrulaması başarısız';
        setValidationMessage(detail);
        return;
      }

      setValidationMessage(
        `Doğrulama tamamlandı: mismatch=${data.summary.mismatchedCount}, eksik(DB)=${data.summary.missingInDbCount}, fazla(DB)=${data.summary.extraInDbCount}, geçerli satır=${data.summary.effectiveSheetRows}`
      );
    } catch (error) {
      setValidationMessage(error instanceof Error ? error.message : 'Sheet doğrulama hatası');
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        Yükleniyor...
      </div>
    );
  }

  const settingsCards: SettingsCard[] = [
    {
      title: 'Tema Ayarları',
      description: 'Renk, karanlık mod ve yazı tipi ayarları',
      icon: 'TM',
      href: '/ayarlar/tema',
      color: 'var(--color-primary)',
    },
    {
      title: 'Durum Yönetimi',
      description: 'Servis durumlarını ekle, düzenle, sil',
      icon: 'DR',
      href: '/ayarlar/durumlar',
      color: 'var(--color-success)',
    },
    {
      title: 'Konum Yönetimi',
      description: 'Marina ve dış servis konumları',
      icon: 'KN',
      href: '/ayarlar/konumlar',
      color: 'var(--color-warning)',
    },
    {
      title: 'Kullanıcı Yönetimi',
      description: 'Yetkililer ve admin hesapları',
      icon: 'KY',
      href: '/ayarlar/kullanicilar',
      color: 'var(--color-info)',
    },
    {
      title: 'Personel Yönetimi',
      description: 'Teknisyen listesi ve roller',
      icon: 'PR',
      href: '/personel',
      color: 'var(--color-accent-gold)',
    },
    {
      title: 'Yetki Ayarları',
      description: 'Rol bazlı erişim kontrolü',
      icon: 'YK',
      href: '/ayarlar/yetkiler',
      color: 'var(--color-error)',
    },
    {
      title: 'Şirket Bilgileri',
      description: 'Logo, isim ve iletişim bilgileri',
      icon: 'SK',
      href: '/ayarlar/sirket',
      color: '#8b5cf6',
    },
    {
      title: 'Yedekleme',
      description: 'Veri yedekleme ve geri yükleme',
      icon: 'YD',
      href: '/ayarlar/yedekleme',
      color: '#14b8a6',
    },
  ];

  return (
    <div className="animate-fade-in">
      <header className="hero-panel mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="page-title">Ayarlar</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Yönetim Merkezi - Sadece Admin Erişimi</p>
        </div>
        <div
          style={{
            padding: 'var(--space-sm) var(--space-md)',
            background: 'var(--color-primary)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem',
          }}
        >
          {user?.ad}
        </div>
      </header>

      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 'var(--space-lg)',
        }}
      >
        {settingsCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            style={{
              textDecoration: 'none',
              color: 'var(--color-text)',
            }}
          >
            <div
              className="card surface-panel"
              style={{
                borderLeft: `4px solid ${card.color}`,
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-md)',
                }}
              >
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `${card.color}20`,
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                  }}
                >
                  {card.icon}
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '1rem',
                      fontWeight: 600,
                    }}
                  >
                    {card.title}
                  </h3>
                  <p
                    style={{
                      margin: 'var(--space-xs) 0 0',
                      color: 'var(--color-text-muted)',
                      fontSize: '0.8rem',
                    }}
                  >
                    {card.description}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="card surface-panel" style={{ marginTop: 'var(--space-xl)' }}>
        <h3 className="card-title">Sistem Durumu</h3>
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 'var(--space-md)',
            marginTop: 'var(--space-md)',
          }}
        >
          <div
            style={{
              padding: 'var(--space-md)',
              background: 'var(--color-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>17</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Personel</div>
          </div>
          <div
            style={{
              padding: 'var(--space-md)',
              background: 'var(--color-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)' }}>4</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Yetkili</div>
          </div>
          <div
            style={{
              padding: 'var(--space-md)',
              background: 'var(--color-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-warning)' }}>2754</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Servis</div>
          </div>
          <div
            style={{
              padding: 'var(--space-md)',
              background: 'var(--color-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-info)' }}>v6.0</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Versiyon</div>
          </div>
        </div>
      </div>

      <div className="card surface-panel" style={{ marginTop: 'var(--space-xl)' }}>
        <h3 className="card-title">Google Sheets Sync</h3>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>
          Tek yön senkronizasyon: Sheet -&gt; Uygulama. Cron periyodu: 5 dakika.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <button disabled={syncing} onClick={() => runManualSync('incremental')} className="btn btn-primary">
            {syncing ? 'Çalışıyor...' : 'Sync Now'}
          </button>
          <button disabled={syncing} onClick={() => runManualSync('full_reset')} className="btn btn-secondary">
            Full Reset Sync
          </button>
          <button disabled={validating} onClick={runSyncValidation} className="btn btn-secondary">
            {validating ? 'Doğrulanıyor...' : 'Sheet-DB Doğrula'}
          </button>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              color: 'var(--color-text-muted)',
              padding: '0 4px',
            }}
          >
            <input
              type="checkbox"
              checked={fullValidation}
              onChange={(e) => setFullValidation(e.target.checked)}
            />
            Tam doğrulama (geniş örnek)
          </label>
        </div>
        {syncMessage && (
          <div style={{ marginTop: 'var(--space-sm)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            {syncMessage}
          </div>
        )}
        {validationMessage && (
          <div style={{ marginTop: 'var(--space-sm)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            {validationMessage}
          </div>
        )}
        {validationResult?.summary && (
          <div
            style={{
              marginTop: 'var(--space-md)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--space-sm)',
            }}
          >
            <div style={{ padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-elevated)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Sheet Satır</div>
              <div style={{ fontWeight: 700 }}>{validationResult.summary.totalSheetRows}</div>
            </div>
            <div style={{ padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-elevated)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Etkili Satır</div>
              <div style={{ fontWeight: 700 }}>{validationResult.summary.effectiveSheetRows}</div>
            </div>
            <div style={{ padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-elevated)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Eksik (DB)</div>
              <div style={{ fontWeight: 700, color: 'var(--color-warning)' }}>{validationResult.summary.missingInDbCount}</div>
            </div>
            <div style={{ padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-elevated)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Fazla (DB)</div>
              <div style={{ fontWeight: 700, color: 'var(--color-warning)' }}>{validationResult.summary.extraInDbCount}</div>
            </div>
            <div style={{ padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-elevated)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Mismatch</div>
              <div style={{ fontWeight: 700, color: 'var(--color-error)' }}>{validationResult.summary.mismatchedCount}</div>
            </div>
            <div style={{ padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-elevated)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Kritik Mismatch</div>
              <div style={{ fontWeight: 700, color: 'var(--color-error)' }}>
                {validationResult.summary.criticalMismatchCount}
              </div>
            </div>
            <div style={{ padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-elevated)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Durum Dışı / Geçersiz</div>
              <div style={{ fontWeight: 700 }}>
                {validationResult.summary.skippedByStatusCount} / {validationResult.summary.invalidRowCount}
              </div>
            </div>
          </div>
        )}
        {validationResult?.mismatchByField && Object.keys(validationResult.mismatchByField).length > 0 && (
          <div style={{ marginTop: 'var(--space-sm)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Alan Bazlı Mismatch:
            {' '}
            {Object.entries(validationResult.mismatchByField)
              .sort((a, b) => b[1] - a[1])
              .map(([field, count]) => `${field}:${count}`)
              .join(', ')}
          </div>
        )}
        {validationResult?.samples && (
          <div style={{ marginTop: 'var(--space-md)', display: 'grid', gap: 'var(--space-sm)' }}>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                Eksik Kayıtlar (Sheet var / DB yok): {validationResult.samples.missingInDb.length}
              </summary>
              <div style={{ marginTop: 'var(--space-xs)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {validationResult.samples.missingInDb.length > 0
                  ? validationResult.samples.missingInDb.join(', ')
                  : 'Örnek bulunamadı.'}
              </div>
            </details>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                Fazla Kayıtlar (DB var / Sheet yok): {validationResult.samples.extraInDb.length}
              </summary>
              <div style={{ marginTop: 'var(--space-xs)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {validationResult.samples.extraInDb.length > 0
                  ? validationResult.samples.extraInDb.join(', ')
                  : 'Örnek bulunamadı.'}
              </div>
            </details>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                Alan Uyuşmazlıkları: {validationResult.samples.mismatched.length}
              </summary>
              <div style={{ marginTop: 'var(--space-xs)', display: 'grid', gap: 'var(--space-xs)' }}>
                {validationResult.samples.mismatched.length === 0 && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Örnek bulunamadı.</div>
                )}
                {validationResult.samples.mismatched.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 'var(--space-xs)',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{item.id}</div>
                    {item.diffs.map((diff) => (
                      <div key={`${item.id}-${diff.field}`} style={{ color: 'var(--color-text-muted)' }}>
                        {diff.field}: sheet={diff.sheet ?? '-'} / db={diff.db ?? '-'}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
        {!validationResult?.ok && validationResult?.headerReport && (
          <div style={{ marginTop: 'var(--space-md)' }}>
            <div style={{ fontWeight: 600, marginBottom: 'var(--space-xs)' }}>Kolon Kayması Raporu</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Alan</th>
                    <th>Beklenen Kolon</th>
                    <th>Beklenen Header</th>
                    <th>Bulunan Kolon</th>
                    <th>Bulunan Header</th>
                  </tr>
                </thead>
                <tbody>
                  {validationResult.headerReport.map((row) => (
                    <tr key={row.field}>
                      <td>{row.field}</td>
                      <td>{row.expectedColumn}</td>
                      <td>{row.expectedHeader ?? '-'}</td>
                      <td>{row.resolvedColumn ?? '-'}</td>
                      <td>{row.resolvedHeader ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(syncStatus?.cronHealth || syncStatus?.latestSuccess) && (
          <div
            style={{
              marginTop: 'var(--space-md)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--space-sm)',
            }}
          >
            <div
              style={{
                padding: 'var(--space-sm)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-surface-elevated)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Cron Sağlığı</div>
              <div style={{ fontWeight: 700, marginTop: '4px' }}>
                {syncStatus?.cronHealth?.isStale ? 'Beklemede / Eski' : 'Sağlıklı'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Son çalışma: {syncStatus?.cronHealth?.minutesSinceLastRun ?? '-'} dk önce
              </div>
            </div>

            <div
              style={{
                padding: 'var(--space-sm)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-surface-elevated)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Son Başarılı Çalışma</div>
              <div style={{ fontWeight: 700, marginTop: '4px' }}>
                {syncStatus?.latestSuccess?.createdAt
                  ? new Date(syncStatus.latestSuccess.createdAt).toLocaleString('tr-TR')
                  : '-'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                +{syncStatus?.latestSuccess?.recordsCreated ?? 0} / ~{syncStatus?.latestSuccess?.recordsUpdated ?? 0}
              </div>
            </div>

            <div
              style={{
                padding: 'var(--space-sm)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-surface-elevated)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Son 10 Çalışma Özeti</div>
              <div style={{ fontWeight: 700, marginTop: '4px' }}>
                {syncStatus?.summary?.successCount ?? 0} başarı / {syncStatus?.summary?.failedCount ?? 0} hata
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Kısmi: {syncStatus?.summary?.partialCount ?? 0}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

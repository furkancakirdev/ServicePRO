'use client';

import { useEffect, useMemo, useState } from 'react';
import { Service } from '@/types';
import {
  WhatsAppTemplateVariant,
  generateTechnicalTeamTemplate,
  getDevamEdenler,
  selectServicesByTemplate,
} from '@/lib/report-generator';

const TAB_OPTIONS: Array<{ value: WhatsAppTemplateVariant; label: string }> = [
  { value: 'bugun', label: 'Bugun' },
  { value: 'yarin', label: 'Yarin' },
  { value: 'haftalik', label: 'Bu Hafta' },
];

export default function WhatsAppRaporPage() {
  const [activeTab, setActiveTab] = useState<WhatsAppTemplateVariant>('bugun');
  const [copied, setCopied] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadServices() {
      try {
        setLoading(true);
        setError(null);

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const response = await fetch(
          '/api/services?limit=2000&durum=RANDEVU_VERILDI,DEVAM_EDIYOR&sort=tarih&order=asc',
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || 'Servis listesi alinamadi');
        }

        if (!ignore) {
          setServices(Array.isArray(payload.services) ? (payload.services as Service[]) : []);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : 'Veri yuklenemedi');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadServices();
    return () => {
      ignore = true;
    };
  }, []);

  const reportText = useMemo(
    () =>
      generateTechnicalTeamTemplate({
        variant: activeTab,
        services,
      }),
    [activeTab, services]
  );

  const plannedItems = useMemo(
    () => selectServicesByTemplate(services, activeTab),
    [activeTab, services]
  );
  const ongoingItems = useMemo(() => getDevamEdenler(services), [services]);

  const whatsappLink = useMemo(
    () => `https://wa.me/?text=${encodeURIComponent(reportText)}`,
    [reportText]
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade-in">
      <header className="hero-panel" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="hero-content">
          <div>
            <h1 className="hero-title">WhatsApp Teknik Ekip Sablonlari</h1>
            <p className="hero-subtitle">Bugun, yarin ve haftalik planlari tek tikla olusturun.</p>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={activeTab === tab.value ? 'btn btn-primary' : 'btn btn-secondary'}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="surface-panel" style={{ marginBottom: 'var(--space-lg)', color: 'var(--color-error)' }}>
          {error}
        </div>
      ) : null}

      <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 'var(--space-xl)' }}>
        <div className="surface-panel">
          <div className="card-header">
            <h3 className="card-title">Onizleme</h3>
            <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
              <button className={copied ? 'btn btn-success' : 'btn btn-primary'} onClick={handleCopy} type="button">
                {copied ? 'Kopyalandi' : 'Kopyala'}
              </button>
              <a className="btn btn-secondary" href={whatsappLink} target="_blank" rel="noreferrer">
                WhatsApp&apos;ta Ac
              </a>
            </div>
          </div>

          <pre
            style={{
              background: '#1e293b',
              color: '#e2e8f0',
              padding: 'var(--space-lg)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              overflowX: 'auto',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Rapor olusturuluyor...' : reportText}
          </pre>
        </div>

        <div>
          <div className="surface-panel" style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>
              Ozet
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: 'var(--space-sm)',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span>Planlanan (Secili Sablon)</span>
                <strong>{plannedItems.length}</strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: 'var(--space-sm)',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span>Devam Eden</span>
                <strong style={{ color: 'var(--color-warning)' }}>{ongoingItems.length}</strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: 'var(--space-sm)',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span>Filtre Durumlari</span>
                <strong>RANDEVU_VERILDI + DEVAM_EDIYOR</strong>
              </div>
            </div>
          </div>

          <div className="surface-panel">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>
              Kullanim
            </h3>
            <ol
              style={{
                paddingLeft: 'var(--space-lg)',
                color: 'var(--color-text-muted)',
                fontSize: '0.9rem',
                lineHeight: 1.8,
              }}
            >
              <li>Teknik ekip icin rapor turunu secin (Bugun, Yarin, Bu Hafta).</li>
              <li>Kopyala ile metni panoya alin ya da WhatsApp&apos;ta Ac ile direkt gecin.</li>
              <li>Grupta mesaji gondermeden once gerekiyorsa kisa duzenleme yapin.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Service } from '@/types';
import {
  WhatsAppTemplateVariant,
  generateTechnicalTeamTemplate,
  getDevamEdenler,
  selectServicesByTemplate,
} from '@/lib/report-generator';

type ServiceWithAssignments = Service & {
  personeller?: Array<{
    personelId: string;
    rol: 'SORUMLU' | 'DESTEK';
    personel?: {
      ad?: string | null;
    };
  }>;
};

type TemplateVariable = 'boat' | 'date' | 'summary' | 'technician';

const TAB_OPTIONS: Array<{ value: WhatsAppTemplateVariant; label: string }> = [
  { value: 'bugun', label: 'Bugun' },
  { value: 'yarin', label: 'Yarin' },
  { value: 'haftalik', label: 'Bu Hafta' },
];

const TEMPLATE_VARIABLES: Array<{ key: TemplateVariable; token: string; label: string }> = [
  { key: 'boat', token: '{{boat}}', label: 'Tekne adi' },
  { key: 'date', token: '{{date}}', label: 'Kapanis tarihi' },
  { key: 'summary', token: '{{summary}}', label: 'Servis ozeti' },
  { key: 'technician', token: '{{technician}}', label: 'Teknisyen(ler)' },
];

const DEFAULT_CLOSING_TEMPLATE = `Kapanis Bilgisi
Tekne: {{boat}}
Tarih: {{date}}
Servis Ozeti: {{summary}}
Teknisyen: {{technician}}`;

function formatDateForTemplate(value?: string): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getTechnicianText(service: ServiceWithAssignments | null): string {
  if (!service) return '-';

  const namesFromLegacy = Array.isArray(service.atananPersonel)
    ? service.atananPersonel
        .map((item) => item.personnelAd?.trim())
        .filter((item): item is string => Boolean(item))
    : [];

  const namesFromRelation = Array.isArray(service.personeller)
    ? service.personeller
        .map((item) => item.personel?.ad?.trim())
        .filter((item): item is string => Boolean(item))
    : [];

  const merged = Array.from(new Set([...namesFromLegacy, ...namesFromRelation]));
  return merged.length > 0 ? merged.join(', ') : '-';
}

function renderTemplate(template: string, service: ServiceWithAssignments | null): string {
  if (!service) {
    return template;
  }

  const valueMap: Record<TemplateVariable, string> = {
    boat: service.tekneAdi || '-',
    date: formatDateForTemplate(service.tarih),
    summary: service.servisAciklamasi || '-',
    technician: getTechnicianText(service),
  };

  return template.replace(/\{\{\s*(boat|date|summary|technician)\s*\}\}/gi, (_, rawKey: string) => {
    const key = rawKey.toLowerCase() as TemplateVariable;
    return valueMap[key] ?? '';
  });
}

export default function WhatsAppRaporPage() {
  const searchParams = useSearchParams();
  const initialServiceId = searchParams.get('serviceId') ?? '';

  const [activeTab, setActiveTab] = useState<WhatsAppTemplateVariant>('bugun');
  const [copied, setCopied] = useState(false);
  const [templateCopied, setTemplateCopied] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [completedServices, setCompletedServices] = useState<ServiceWithAssignments[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [templateText, setTemplateText] = useState(DEFAULT_CLOSING_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadServices() {
      try {
        setLoading(true);
        setError(null);

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        const [openResponse, completedResponse] = await Promise.all([
          fetch('/api/services?limit=2000&durum=RANDEVU_VERILDI,DEVAM_EDIYOR&sort=tarih&order=asc', { headers }),
          fetch('/api/services?limit=300&durum=TAMAMLANDI&sort=tarih&order=desc', { headers }),
        ]);

        const openPayload = await openResponse.json().catch(() => ({}));
        const completedPayload = await completedResponse.json().catch(() => ({}));

        if (!openResponse.ok) {
          throw new Error(openPayload?.error || 'Servis listesi alinamadi');
        }
        if (!completedResponse.ok) {
          throw new Error(completedPayload?.error || 'Kapanmis servis listesi alinamadi');
        }

        if (!ignore) {
          const openRows = Array.isArray(openPayload.services) ? (openPayload.services as Service[]) : [];
          const completedRows = Array.isArray(completedPayload.services)
            ? (completedPayload.services as ServiceWithAssignments[])
            : [];

          setServices(openRows);
          setCompletedServices(completedRows);

          if (initialServiceId && completedRows.some((item) => item.id === initialServiceId)) {
            setSelectedServiceId(initialServiceId);
          } else if (completedRows.length > 0) {
            setSelectedServiceId((prev) => prev || completedRows[0].id);
          }
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
  }, [initialServiceId]);

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

  const selectedService = useMemo(
    () => completedServices.find((item) => item.id === selectedServiceId) ?? null,
    [completedServices, selectedServiceId]
  );

  const templatePreview = useMemo(
    () => renderTemplate(templateText, selectedService),
    [templateText, selectedService]
  );

  const whatsappLink = useMemo(
    () => `https://wa.me/?text=${encodeURIComponent(reportText)}`,
    [reportText]
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTemplateCopy = async () => {
    await navigator.clipboard.writeText(templatePreview);
    setTemplateCopied(true);
    setTimeout(() => setTemplateCopied(false), 2000);
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
                <span>Kapanmis Servis Havuzu</span>
                <strong>{completedServices.length}</strong>
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
              <li>Kapanis sablon editorunde tek servis secip mesaji ozellestirin.</li>
            </ol>
          </div>
        </div>
      </div>

      <section
        className="surface-panel"
        style={{ marginTop: 'var(--space-xl)' }}
        data-testid="whatsapp-template-editor"
      >
        <div className="card-header" style={{ marginBottom: 'var(--space-md)' }}>
          <h3 className="card-title">Kapanis Rapor Sablon Editoru</h3>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <label>
              <span style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.85rem' }}>
                Kapanmis Servis
              </span>
              <select
                value={selectedServiceId}
                onChange={(event) => setSelectedServiceId(event.target.value)}
                className="form-select"
                data-testid="whatsapp-template-service-select"
              >
                {completedServices.length === 0 ? (
                  <option value="">Kapanmis servis bulunamadi</option>
                ) : null}
                {completedServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {formatDateForTemplate(service.tarih)} - {service.tekneAdi}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <p style={{ marginBottom: 'var(--space-xs)', fontSize: '0.85rem' }}>Degiskenler</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                {TEMPLATE_VARIABLES.map((variable) => (
                  <span
                    key={variable.key}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg)',
                      fontSize: '0.8rem',
                    }}
                    title={variable.label}
                  >
                    {variable.token}
                  </span>
                ))}
              </div>
            </div>

            <label>
              <span style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.85rem' }}>
                Sablon Metni
              </span>
              <textarea
                className="form-textarea"
                rows={9}
                value={templateText}
                onChange={(event) => setTemplateText(event.target.value)}
                data-testid="whatsapp-template-input"
              />
            </label>

            <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setTemplateText(DEFAULT_CLOSING_TEMPLATE)}>
                Varsayilana Don
              </button>
              <button
                type="button"
                className={templateCopied ? 'btn btn-success' : 'btn btn-primary'}
                onClick={handleTemplateCopy}
                data-testid="whatsapp-template-copy"
              >
                {templateCopied ? 'Kopyalandi' : 'Kopyala'}
              </button>
            </div>
          </div>

          <div>
            <h4 style={{ marginBottom: 'var(--space-sm)' }}>Onizleme</h4>
            <pre
              style={{
                background: '#1e293b',
                color: '#e2e8f0',
                padding: 'var(--space-lg)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                minHeight: '260px',
                whiteSpace: 'pre-wrap',
              }}
              data-testid="whatsapp-template-preview"
            >
              {templatePreview}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}

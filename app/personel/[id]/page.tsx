'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { fetchPersonnelById } from '@/lib/api';
import { Personnel, Service, UNVAN_CONFIG } from '@/types';

type EditablePersonel = {
  ad: string;
  rol: 'teknisyen' | 'yetkili';
  unvan: 'usta' | 'cirak' | 'yonetici' | 'ofis';
  aktif: boolean;
  girisYili: string;
};

function toEditState(personel: Personnel): EditablePersonel {
  return {
    ad: personel.ad ?? '',
    rol: personel.rol ?? 'teknisyen',
    unvan: personel.unvan ?? 'cirak',
    aktif: Boolean(personel.aktif),
    girisYili: personel.girisYili ? String(personel.girisYili) : '',
  };
}

const OPEN_SERVICE_STATUS_PARAM = [
  'RANDEVU_VERILDI',
  'DEVAM_EDIYOR',
  'PARCA_BEKLIYOR',
  'MUSTERI_ONAY_BEKLIYOR',
  'RAPOR_BEKLIYOR',
  'KESIF_KONTROL',
  'ERTELENDI',
].join(',');

async function fetchOpenServicesForPersonnel(personelId: string): Promise<Service[]> {
  const params = new URLSearchParams({
    personelId,
    limit: '200',
    status: OPEN_SERVICE_STATUS_PARAM,
  });

  const response = await fetch(`/api/services?${params.toString()}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Personel is listesi alinamadi');
  }

  const payload = (await response.json()) as {
    services?: Array<
      Service & {
        personeller?: Array<{
          personelId: string;
          rol: 'SORUMLU' | 'DESTEK';
          personel?: { ad?: string | null };
        }>;
      }
    >;
  };

  if (!Array.isArray(payload.services)) {
    return [];
  }

  return payload.services.map((service) => {
    const fallbackAssignments: Service['atananPersonel'] = Array.isArray(service.personeller)
      ? service.personeller.map((assignment) => ({
          personnelId: assignment.personelId,
          personnelAd: assignment.personel?.ad ?? '',
          rol: assignment.rol === 'SORUMLU' ? ('sorumlu' as const) : ('destek' as const),
        }))
      : [];

    return {
      ...service,
      atananPersonel:
        Array.isArray(service.atananPersonel) && service.atananPersonel.length > 0
          ? service.atananPersonel
          : fallbackAssignments,
    };
  });
}

export default function PersonelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const duzenleModu = searchParams.get('duzenle') === '1';

  const [personel, setPersonel] = useState<Personnel | null>(null);
  const [assignedServices, setAssignedServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const adInputRef = useRef<HTMLInputElement | null>(null);
  const [formState, setFormState] = useState<EditablePersonel>({
    ad: '',
    rol: 'teknisyen',
    unvan: 'cirak',
    aktif: true,
    girisYili: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [personnelData, servicesData] = await Promise.all([
          fetchPersonnelById(id),
          fetchOpenServicesForPersonnel(id),
        ]);
        setPersonel(personnelData);

        if (personnelData) {
          setFormState(toEditState(personnelData));
          setAssignedServices(servicesData);
        }
      } catch (error) {
        console.error('Failed to load personnel:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  useEffect(() => {
    if (duzenleModu) {
      setEditing(true);
    }
  }, [duzenleModu]);

  const handleSave = async () => {
    if (!personel) return;
    const temizAd = (adInputRef.current?.value ?? formState.ad).trim();
    if (temizAd.length < 2) {
      setFormError('Ad en az 2 karakter olmalidir');
      setFormSuccess(null);
      return;
    }

    setSaving(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const response = await fetch(`/api/personel/${personel.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ad: temizAd,
          rol: formState.rol,
          unvan: formState.unvan,
          aktif: formState.aktif,
          girisYili: formState.girisYili ? Number(formState.girisYili) : null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const details = payload?.details?.fieldErrors
          ? Object.entries(payload.details.fieldErrors)
              .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
              .join(' | ')
          : null;
        throw new Error(payload?.error || details || 'Personel guncellenemedi');
      }

      const updatedPersonel: Personnel = {
        ...(personel as Personnel),
        ...payload,
        ad: temizAd,
        rol: formState.rol,
        unvan: formState.unvan,
        aktif: formState.aktif,
        girisYili: formState.girisYili ? Number(formState.girisYili) : undefined,
      };

      setPersonel(updatedPersonel);
      setFormState(toEditState(updatedPersonel));
      setEditing(false);
      setFormSuccess('Personel bilgileri guncellendi.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Personel guncellenemedi');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="surface-panel" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        <p>Yukleniyor...</p>
      </div>
    );
  }

  if (!personel) {
    return (
      <div className="surface-panel" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        <h2>Personel bulunamadi</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>ID: {id}</p>
        <Link href="/personel" className="btn btn-primary" style={{ marginTop: 'var(--space-lg)' }}>
          ← Personel listesine don
        </Link>
      </div>
    );
  }

  const avgPuan = personel.aylikOrtalamaPuan ?? 0;
  const unvanConfig = UNVAN_CONFIG[personel.unvan] || { icon: '', label: personel.unvan };

  return (
    <div className="animate-fade-in">
      <header className="hero-panel" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="hero-content" style={{ width: '100%', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
            <button onClick={() => router.back()} className="btn btn-secondary" style={{ padding: 'var(--space-sm)' }}>
              ←
            </button>
            <div>
              <h1 className="hero-title" data-testid="personel-baslik">{personel.ad}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-xs)' }}>
                <span
                  style={{
                    padding: '4px 12px',
                    background: personel.unvan === 'usta' ? 'var(--color-primary)' : 'var(--color-info)',
                    color: 'white',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  {unvanConfig.icon} {unvanConfig.label}
                </span>
                <span
                  style={{
                    padding: '4px 12px',
                    background: personel.aktif ? 'var(--color-success)' : 'var(--color-error)',
                    color: 'white',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  {personel.aktif ? 'Aktif' : 'Pasif'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            {editing ? (
              <>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                  data-testid="personel-kaydet-button"
                >
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditing(false);
                    setFormState(toEditState(personel));
                    setFormError(null);
                  }}
                  disabled={saving}
                >
                  Vazgec
                </button>
              </>
            ) : (
              <button
                className="btn btn-secondary"
                onClick={() => setEditing(true)}
                data-testid="personel-duzenle-button"
              >
                Bilgileri Duzenle
              </button>
            )}
          </div>
        </div>
      </header>

      {formError ? (
        <div
          className="surface-panel"
          style={{ marginBottom: 'var(--space-md)', color: 'var(--color-error)' }}
          data-testid="personel-form-error"
        >
          {formError}
        </div>
      ) : null}
      {formSuccess ? (
        <div
          className="surface-panel"
          style={{ marginBottom: 'var(--space-md)', color: 'var(--color-success)' }}
          data-testid="personel-form-success"
        >
          {formSuccess}
        </div>
      ) : null}

      <div className="grid" style={{ gridTemplateColumns: '1.2fr 1.8fr', gap: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div className="surface-panel">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>
              Personel Bilgileri
            </h3>

            <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Ad</label>
                <input
                  ref={adInputRef}
                  className="form-input"
                  value={formState.ad}
                  disabled={!editing}
                  onChange={(e) => setFormState((prev) => ({ ...prev, ad: e.target.value }))}
                  data-testid="personel-ad-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Rol</label>
                <select
                  className="form-select"
                  value={formState.rol}
                  disabled={!editing}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      rol: e.target.value as EditablePersonel['rol'],
                    }))
                  }
                >
                  <option value="teknisyen">Teknisyen</option>
                  <option value="yetkili">Yetkili</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Unvan</label>
                <select
                  className="form-select"
                  value={formState.unvan}
                  disabled={!editing}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      unvan: e.target.value as EditablePersonel['unvan'],
                    }))
                  }
                >
                  <option value="usta">Usta</option>
                  <option value="cirak">Cirak</option>
                  <option value="yonetici">Yonetici</option>
                  <option value="ofis">Ofis</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Giris Yili</label>
                <input
                  type="number"
                  min={1950}
                  max={new Date().getFullYear() + 1}
                  className="form-input"
                  value={formState.girisYili}
                  disabled={!editing}
                  onChange={(e) => setFormState((prev) => ({ ...prev, girisYili: e.target.value }))}
                />
              </div>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={formState.aktif}
                  disabled={!editing}
                  onChange={(e) => setFormState((prev) => ({ ...prev, aktif: e.target.checked }))}
                />
                Aktif Personel
              </label>
            </div>
          </div>

          <div className="surface-panel" data-testid="personel-score-summary">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>
              Performans
            </h3>
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--space-xl)',
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                borderRadius: 'var(--radius-lg)',
                color: 'white',
              }}
            >
              <div style={{ fontSize: '3rem', fontWeight: 700 }}>{avgPuan || '-'}</div>
              <div style={{ opacity: 0.8 }}>Aylik Ortalama Puan</div>
              <div style={{ marginTop: 'var(--space-sm)', fontSize: '0.85rem', opacity: 0.85 }}>
                Acik Is Emri: {assignedServices.length}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div className="surface-panel">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>
              Rozetler
            </h3>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem' }}>ALTIN</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{personel.altinRozet || 0}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem' }}>GUMUS</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{personel.gumusRozet || 0}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem' }}>BRONZ</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{personel.bronzRozet || 0}</div>
              </div>
            </div>
          </div>

          <div className="surface-panel" data-testid="personel-open-work-orders">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>
              Acik Is Emirleri ({assignedServices.length})
            </h3>

            {assignedServices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-muted)' }}>
                Bu personel icin acik is emri bulunamadi.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {assignedServices.slice(0, 12).map((service) => {
                  const assignment = service.atananPersonel?.find((item) => item.personnelId === id);
                  return (
                    <Link
                      key={service.id}
                      href={`/servisler/${service.id}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 'var(--space-md)',
                        background: 'var(--color-surface-elevated)',
                        borderRadius: 'var(--radius-md)',
                        textDecoration: 'none',
                        color: 'var(--color-text)',
                        borderLeft: `3px solid ${assignment?.rol === 'sorumlu' ? 'var(--color-primary)' : 'var(--color-success)'}`,
                      }}
                      data-testid={`personel-open-service-link-${service.id}`}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>{service.tekneAdi}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          {service.tarih} - {service.adres}
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '2px 8px',
                          background: assignment?.rol === 'sorumlu' ? 'var(--color-primary)' : 'var(--color-success)',
                          color: 'white',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                        }}
                      >
                        {assignment?.rol === 'sorumlu' ? 'Sorumlu' : 'Destek'}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

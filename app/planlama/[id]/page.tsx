'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import { fetchServiceById } from '@/lib/api';
import { Service, KONUM_CONFIG, IS_TURU_CONFIG, UNVAN_CONFIG, getKonumGrubu } from '@/types';

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadService() {
      try {
        const data = await fetchServiceById(id);
        setService(data);
      } catch (error) {
        console.error('Failed to load service:', error);
      } finally {
        setLoading(false);
      }
    }
    loadService();
  }, [id]);

  if (loading) {
    return (
      <div className="surface-panel" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="surface-panel" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        <h2>Servis bulunamadı</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>ID: {id}</p>
        <Link href="/planlama" className="btn btn-primary" style={{ marginTop: 'var(--space-lg)' }}>
          ← Servis listesine dön
        </Link>
      </div>
    );
  }

  const konumGrubu = getKonumGrubu(service.adres);
  const isTuruConfig = IS_TURU_CONFIG[service.isTuru];

  return (
    <div className="animate-fade-in">
      <header className="hero-panel" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="hero-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
            <button onClick={() => router.back()} className="btn btn-secondary" style={{ padding: 'var(--space-sm)' }}>
              ←
            </button>
            <div>
              <h1 className="hero-title">⚓ {service.tekneAdi}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-xs)' }}>
                <StatusBadge durum={service.durum} />
                {isTuruConfig && (
                  <span
                    style={{
                      padding: '4px 10px',
                      background: 'var(--color-accent-gold)',
                      color: 'black',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    {isTuruConfig.label} (×{isTuruConfig.carpan})
                  </span>
                )}
              </div>
            </div>
          </div>
          <Link href={`/planlama/${id}/duzenle`} className="btn btn-primary">
            Düzenle
          </Link>
        </div>
      </header>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div className="surface-panel">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>Servis Bilgileri</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Tarih</div>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                  {service.tarih} {service.saat && `• ${service.saat}`}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Konum</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: KONUM_CONFIG[konumGrubu].color,
                    }}
                  />
                  <span style={{ fontWeight: 600 }}>{service.adres}</span>
                  {service.yer && <span style={{ color: 'var(--color-text-muted)' }}>• {service.yer}</span>}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Servis Açıklaması</div>
              <div style={{ fontSize: '1rem', lineHeight: 1.6 }}>{service.servisAciklamasi}</div>
            </div>

            {(service.irtibatKisi || service.telefon) && (
              <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-sm)' }}>İletişim</div>
                <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
                  {service.irtibatKisi && <div>{service.irtibatKisi}</div>}
                  {service.telefon && (
                    <a href={`tel:${service.telefon}`} style={{ color: 'var(--color-primary-light)', textDecoration: 'none' }}>
                      {service.telefon}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {service.bekleyenParcalar && service.bekleyenParcalar.length > 0 && (
            <div className="surface-panel" style={{ borderColor: 'var(--color-warning)' }}>
              <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)', color: 'var(--color-warning)' }}>
                Bekleyen Parçalar
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {service.bekleyenParcalar.map((parca, index) => (
                  <div
                    key={index}
                    style={{
                      padding: 'var(--space-md)',
                      background: 'var(--color-surface-elevated)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{parca.parcaAdi}</div>
                      {parca.tedarikci && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{parca.tedarikci}</div>}
                    </div>
                    <div style={{ fontWeight: 600 }}>×{parca.miktar}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {service.kapanisRaporu && (
            <div className="surface-panel" style={{ borderColor: 'var(--color-success)' }}>
              <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)', color: 'var(--color-success)' }}>
                Kapanış Raporu
              </h3>
              {service.kapanisRaporu.aciklama && (
                <div style={{ padding: 'var(--space-md)', background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-md)' }}>
                  {service.kapanisRaporu.aciklama}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="surface-panel" style={{ height: 'fit-content' }}>
          <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>Atanan Personel</h3>

          {!service.atananPersonel || service.atananPersonel.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-muted)' }}>
              Henüz personel atanmadı
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {service.atananPersonel.map((p, index) => (
                <Link
                  key={index}
                  href={`/personel/${p.personnelId}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-md)',
                    background: 'var(--color-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: `3px solid ${p.rol === 'sorumlu' ? 'var(--color-primary)' : 'var(--color-success)'}`,
                    textDecoration: 'none',
                    color: 'var(--color-text)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{p.personnelAd}</div>
                    {p.unvan && UNVAN_CONFIG[p.unvan] && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {UNVAN_CONFIG[p.unvan].icon} {UNVAN_CONFIG[p.unvan].label}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      background: p.rol === 'sorumlu' ? 'var(--color-primary)' : 'var(--color-success)',
                      color: 'white',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                    }}
                  >
                    {p.rol === 'sorumlu' ? 'Sorumlu' : 'Destek'}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {service.ofisYetkilisi && (
            <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Ofis Yetkilisi</div>
              <div style={{ fontWeight: 500 }}>{service.ofisYetkilisi}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


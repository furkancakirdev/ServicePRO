'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { fetchPersonnelById, fetchServices } from '@/lib/api';
import { Personnel, Service, UNVAN_CONFIG } from '@/types';

export default function PersonelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [personel, setPersonel] = useState<Personnel | null>(null);
  const [assignedServices, setAssignedServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUnvan, setEditingUnvan] = useState(false);
  const [selectedUnvan, setSelectedUnvan] = useState<'usta' | 'cirak' | 'yonetici' | 'ofis'>('cirak');
  const [savingUnvan, setSavingUnvan] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [personnelData, servicesData] = await Promise.all([fetchPersonnelById(id), fetchServices()]);
        setPersonel(personnelData);
        if (personnelData?.unvan) {
          setSelectedUnvan(personnelData.unvan as 'usta' | 'cirak' | 'yonetici' | 'ofis');
        }

        if (personnelData) {
          const assigned = servicesData.filter((s) => s.atananPersonel?.some((p) => p.personnelId === id));
          setAssignedServices(assigned);
        }
      } catch (error) {
        console.error('Failed to load personnel:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleUnvanSave = async () => {
    if (!personel) return;
    setSavingUnvan(true);
    try {
      const res = await fetch(`/api/personel/${personel.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ unvan: selectedUnvan }),
      });

      if (!res.ok) throw new Error('Unvan güncellenemedi');
      const updated = await res.json();
      setPersonel((prev) => (prev ? { ...prev, unvan: updated.unvan } : prev));
      setEditingUnvan(false);
    } catch (error) {
      console.error('Unvan güncelleme hatası:', error);
      alert('Unvan güncellenemedi');
    } finally {
      setSavingUnvan(false);
    }
  };

  if (loading) {
    return (
      <div className="surface-panel" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!personel) {
    return (
      <div className="surface-panel" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        <h2>Personel bulunamadı</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>ID: {id}</p>
        <Link href="/personel" className="btn btn-primary" style={{ marginTop: 'var(--space-lg)' }}>
          ← Personel listesine dön
        </Link>
      </div>
    );
  }

  const avgPuan = 0;
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
              <h1 className="hero-title">{personel.ad}</h1>
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
                {personel.girisYili && (
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    {new Date().getFullYear() - personel.girisYili} yıldır çalışıyor
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            {editingUnvan ? (
              <>
                <select
                  className="form-select"
                  value={selectedUnvan}
                  onChange={(e) => setSelectedUnvan(e.target.value as 'usta' | 'cirak' | 'yonetici' | 'ofis')}
                  style={{ minWidth: 180 }}
                >
                  <option value="usta">Ustabaşı</option>
                  <option value="cirak">Çırak</option>
                  <option value="yonetici">Yönetici</option>
                  <option value="ofis">Ofis</option>
                </select>
                <button className="btn btn-primary" onClick={handleUnvanSave} disabled={savingUnvan}>
                  {savingUnvan ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button className="btn btn-secondary" onClick={() => setEditingUnvan(false)} disabled={savingUnvan}>
                  Vazgeç
                </button>
              </>
            ) : (
              <button className="btn btn-secondary" onClick={() => setEditingUnvan(true)}>
                Ünvanı Düzenle
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div className="surface-panel">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>Performans</h3>

            <div
              style={{
                textAlign: 'center',
                padding: 'var(--space-xl)',
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                borderRadius: 'var(--radius-lg)',
                color: 'white',
                marginBottom: 'var(--space-lg)',
              }}
            >
              <div style={{ fontSize: '3rem', fontWeight: 700 }}>{avgPuan || '-'}</div>
              <div style={{ opacity: 0.8 }}>Ortalama Puan</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div
                style={{
                  padding: 'var(--space-md)',
                  background: 'var(--color-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)' }}>
                  {assignedServices.filter((s) => s.durum === 'TAMAMLANDI').length}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Tamamlanan</div>
              </div>
              <div
                style={{
                  padding: 'var(--space-md)',
                  background: 'var(--color-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-warning)' }}>
                  {assignedServices.filter((s) => s.durum !== 'TAMAMLANDI').length}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Devam Eden</div>
              </div>
            </div>
          </div>

          <div className="surface-panel">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>Rozetler</h3>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem' }}>🥇</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-accent-gold)' }}>{personel.altinRozet || 0}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem' }}>🥈</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-accent-silver)' }}>{personel.gumusRozet || 0}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem' }}>🥉</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-accent-bronze)' }}>{personel.bronzRozet || 0}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="surface-panel">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>Atanan Servisler ({assignedServices.length})</h3>

          {assignedServices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-muted)' }}>
              Henüz atanan servis yok
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {assignedServices.slice(0, 10).map((service) => {
                const assignment = service.atananPersonel?.find((p) => p.personnelId === id);
                return (
                  <Link
                    key={service.id}
                    href={`/planlama/${service.id}`}
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
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{service.tekneAdi}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {service.tarih} • {service.adres}
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
  );
}


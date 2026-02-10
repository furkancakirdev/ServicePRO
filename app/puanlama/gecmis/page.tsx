'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type AylikItem = {
  sira: number;
  personelId: string;
  personel: string;
  unvan: string;
  servis: number;
  bireyselPuan: number;
  yetkiliPuani: number | null;
  ismailUstaPuani: number | null;
  toplamPuan: number;
};

type YillikItem = {
  personnelId: string;
  personnelAd: string;
  altinRozet: number;
  gumusRozet: number;
  bronzRozet: number;
  toplamPuan: number;
  siralama: number;
};

function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getCurrentYear() {
  return String(new Date().getFullYear());
}

function formatMonthLabel(month: string) {
  const [year, mm] = month.split('-').map(Number);
  const date = new Date(year, (mm || 1) - 1, 1);
  return date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
}

type TabKey = 'aylik' | 'yillik';

export default function GecmisPuanlamaPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('aylik');
  const [ay, setAy] = useState(getCurrentMonth());
  const [yil] = useState(getCurrentYear());

  const [aylikItems, setAylikItems] = useState<AylikItem[]>([]);
  const [yillikItems, setYillikItems] = useState<YillikItem[]>([]);
  const [loadingAylik, setLoadingAylik] = useState(false);
  const [loadingYillik, setLoadingYillik] = useState(false);
  const [errorAylik, setErrorAylik] = useState<string | null>(null);
  const [errorYillik, setErrorYillik] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadAylik() {
      setLoadingAylik(true);
      setErrorAylik(null);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const res = await fetch(`/api/puanlama/aylik?ay=${encodeURIComponent(ay)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || 'Aylık puanlama verisi alınamadı');
        }
        const data = await res.json();
        if (!ignore) {
          setAylikItems(Array.isArray(data?.items) ? data.items : []);
        }
      } catch (err) {
        if (!ignore) {
          setErrorAylik(err instanceof Error ? err.message : 'Aylık veri yüklenemedi');
          setAylikItems([]);
        }
      } finally {
        if (!ignore) setLoadingAylik(false);
      }
    }

    loadAylik();
    return () => {
      ignore = true;
    };
  }, [ay]);

  useEffect(() => {
    let ignore = false;

    async function loadYillik() {
      setLoadingYillik(true);
      setErrorYillik(null);
      try {
        const res = await fetch(`/api/raporlar/rozet-kazananlar?yil=${encodeURIComponent(yil)}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error?.message || 'Yıllık klasman verisi alınamadı');
        }
        const data = await res.json();
        if (!ignore) {
          setYillikItems(Array.isArray(data?.data) ? data.data : []);
        }
      } catch (err) {
        if (!ignore) {
          setErrorYillik(err instanceof Error ? err.message : 'Yıllık veri yüklenemedi');
          setYillikItems([]);
        }
      } finally {
        if (!ignore) setLoadingYillik(false);
      }
    }

    loadYillik();
    return () => {
      ignore = true;
    };
  }, [yil]);

  const topAylik = useMemo(() => aylikItems.slice(0, 3), [aylikItems]);
  const topYillik = useMemo(() => yillikItems.slice(0, 3), [yillikItems]);

  return (
    <div className="animate-fade-in">
      <header className="hero-panel mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="page-title">Geçmiş ve Klasman</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Aylık puan geçmişi ve yıllık rozet klasmanı</p>
        </div>
        <Link href="/puanlama" className="btn btn-secondary">
          Bu Aya Dön
        </Link>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        <button className={activeTab === 'aylik' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setActiveTab('aylik')}>
          Aylık Geçmiş
        </button>
        <button className={activeTab === 'yillik' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setActiveTab('yillik')}>
          Yıllık Klasman
        </button>
      </div>

      {activeTab === 'aylik' && (
        <section>
          <div className="mb-4 flex items-center gap-3">
            <input type="month" className="form-input" value={ay} onChange={(e) => setAy(e.target.value)} style={{ minWidth: 180 }} />
            <span style={{ color: 'var(--color-text-muted)' }}>{formatMonthLabel(ay)} verisi</span>
          </div>

          {topAylik.length > 0 && (
            <div className="grid grid-cols-3 mb-4" style={{ gap: 'var(--space-md)' }}>
              {topAylik.map((row, index) => (
                <div key={row.personelId} className="card surface-panel" style={{ padding: 'var(--space-md)' }}>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                    {index === 0 ? '1.' : index === 1 ? '2.' : '3.'} Sıra
                  </div>
                  <div style={{ fontWeight: 700, marginTop: '0.3rem' }}>{row.personel}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    {row.servis} servis • {row.toplamPuan} puan
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="table-container surface-panel">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Sıra</th>
                  <th>Personel</th>
                  <th style={{ textAlign: 'center' }}>Servis</th>
                  <th style={{ textAlign: 'center' }}>Bireysel</th>
                  <th style={{ textAlign: 'center' }}>Yetkili</th>
                  <th style={{ textAlign: 'center' }}>İsmail Usta</th>
                  <th style={{ textAlign: 'center' }}>Toplam</th>
                </tr>
              </thead>
              <tbody>
                {loadingAylik && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                      Yükleniyor...
                    </td>
                  </tr>
                )}
                {!loadingAylik && errorAylik && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-error)' }}>
                      {errorAylik}
                    </td>
                  </tr>
                )}
                {!loadingAylik && !errorAylik && aylikItems.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                      Seçili ay için puanlama verisi bulunamadı.
                    </td>
                  </tr>
                )}
                {!loadingAylik &&
                  !errorAylik &&
                  aylikItems.map((row) => (
                    <tr key={row.personelId}>
                      <td style={{ fontWeight: 700 }}>{row.sira}</td>
                      <td>{row.personel}</td>
                      <td style={{ textAlign: 'center' }}>{row.servis}</td>
                      <td style={{ textAlign: 'center' }}>{row.bireyselPuan}</td>
                      <td style={{ textAlign: 'center' }}>{row.yetkiliPuani ?? ''}</td>
                      <td style={{ textAlign: 'center' }}>{row.ismailUstaPuani ?? ''}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{row.toplamPuan}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'yillik' && (
        <section>
          {topYillik.length > 0 && (
            <div className="grid grid-cols-3 mb-4" style={{ gap: 'var(--space-md)' }}>
              {topYillik.map((row, index) => (
                <div key={row.personnelId} className="card surface-panel" style={{ padding: 'var(--space-md)' }}>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                    {index === 0 ? 'Lider' : `${index + 1}. Sıra`}
                  </div>
                  <div style={{ fontWeight: 700, marginTop: '0.3rem' }}>{row.personnelAd}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Altın {row.altinRozet} • Gümüş {row.gumusRozet} • Bronz {row.bronzRozet}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="table-container surface-panel">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Sıra</th>
                  <th>Personel</th>
                  <th style={{ textAlign: 'center' }}>Altın</th>
                  <th style={{ textAlign: 'center' }}>Gümüş</th>
                  <th style={{ textAlign: 'center' }}>Bronz</th>
                  <th style={{ textAlign: 'center' }}>Toplam Puan</th>
                </tr>
              </thead>
              <tbody>
                {loadingYillik && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                      Yükleniyor...
                    </td>
                  </tr>
                )}
                {!loadingYillik && errorYillik && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-error)' }}>
                      {errorYillik}
                    </td>
                  </tr>
                )}
                {!loadingYillik && !errorYillik && yillikItems.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                      Bu yıl için klasman verisi bulunamadı.
                    </td>
                  </tr>
                )}
                {!loadingYillik &&
                  !errorYillik &&
                  yillikItems.map((row) => (
                    <tr key={row.personnelId}>
                      <td style={{ fontWeight: 700 }}>{row.siralama}</td>
                      <td>{row.personnelAd}</td>
                      <td style={{ textAlign: 'center' }}>{row.altinRozet}</td>
                      <td style={{ textAlign: 'center' }}>{row.gumusRozet}</td>
                      <td style={{ textAlign: 'center' }}>{row.bronzRozet}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{row.toplamPuan}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}


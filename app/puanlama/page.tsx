'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type LeaderboardItem = {
  sira: number;
  personelId: string;
  personel: string;
  servis: number;
  bireyselPuan: number;
  yetkiliPuani: number | null;
  ismailUstaPuani: number | null;
  toplamPuan: number;
};

type LeaderboardResponse = {
  ay: string;
  items: LeaderboardItem[];
};

function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatMonth(ay: string): string {
  const [year, month] = ay.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, 1);
  return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
}

export default function PuanlamaPage() {
  const [ay, setAy] = useState(getCurrentMonth());
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const res = await fetch(`/api/puanlama/aylik?ay=${encodeURIComponent(ay)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || 'Puanlama verisi alınamadı');
        }

        const data = (await res.json()) as LeaderboardResponse;
        if (!ignore) {
          setItems(data.items || []);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Bilinmeyen hata oluştu');
          setItems([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [ay]);

  const summary = useMemo(() => {
    const toplamServis = items.reduce((acc, item) => acc + item.servis, 0);
    const ortalama =
      items.length > 0 ? Math.round(items.reduce((acc, item) => acc + item.toplamPuan, 0) / items.length) : 0;
    return { toplamServis, ortalama };
  }, [items]);

  return (
    <div className="animate-fade-in">
      <header className="hero-panel mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="page-title">Puanlama</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>{formatMonth(ay)} performans sıralaması</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
          <input
            type="month"
            className="form-input"
            value={ay}
            onChange={(e) => setAy(e.target.value)}
            style={{ minWidth: 170 }}
          />
          <Link href="/deger" className="btn btn-primary">
            Yetkili Puanı Gir
          </Link>
          <Link href="/ismail" className="btn btn-secondary">
            İsmail Usta Puanı Gir
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-3" style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <div className="card surface-panel" style={{ padding: 'var(--space-md)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Personel</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{items.length}</div>
        </div>
        <div className="card surface-panel" style={{ padding: 'var(--space-md)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Toplam Servis</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{summary.toplamServis}</div>
        </div>
        <div className="card surface-panel" style={{ padding: 'var(--space-md)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Toplam Puan Ort.</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{summary.ortalama}</div>
        </div>
      </div>

      <div className="table-container surface-panel">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 70 }}>Sıra</th>
              <th>Personel</th>
              <th style={{ textAlign: 'center' }}>Servis</th>
              <th style={{ textAlign: 'center' }}>Bireysel Puan</th>
              <th style={{ textAlign: 'center' }}>Yetkili Puanı</th>
              <th style={{ textAlign: 'center' }}>İsmail Usta Puanı</th>
              <th style={{ textAlign: 'center' }}>Toplam Puan</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                  Yükleniyor...
                </td>
              </tr>
            )}

            {!loading && error && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-error)' }}>
                  {error}
                </td>
              </tr>
            )}

            {!loading && !error && items.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                  Bu ay için puan verisi bulunamadı.
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              items.map((item) => (
                <tr key={item.personelId}>
                  <td style={{ fontWeight: 700 }}>{item.sira}</td>
                  <td>{item.personel}</td>
                  <td style={{ textAlign: 'center' }}>{item.servis}</td>
                  <td style={{ textAlign: 'center' }}>{item.bireyselPuan}</td>
                  <td style={{ textAlign: 'center' }}>{item.yetkiliPuani === null ? '' : item.yetkiliPuani}</td>
                  <td style={{ textAlign: 'center' }}>{item.ismailUstaPuani === null ? '' : item.ismailUstaPuani}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.toplamPuan}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Leaderboard, type LeaderboardEntry } from '@/components/Leaderboard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

type LeaderboardItem = {
  sira: number;
  personelId: string;
  personel: string;
  servis: number;
  bireyselPuan: number;
  yetkiliPuani: number | null;
  ismailUstaPuani: number | null;
  toplamPuan: number;
  rozetDurumu?: 'ALTIN' | 'GUMUS' | 'BRONZ';
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

function getRozetBadge(sira: number) {
  if (sira === 1) return { icon: '🥇', variant: 'gold' as const, label: 'Altın' };
  if (sira === 2) return { icon: '🥈', variant: 'silver' as const, label: 'Gümüş' };
  if (sira === 3) return { icon: '🥉', variant: 'bronze' as const, label: 'Bronz' };
  return null;
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

  // Convert to LeaderboardEntry format
  const leaderboardEntries: LeaderboardEntry[] = useMemo(() => {
    return items.map((item) => ({
      rank: item.sira,
      personnelId: item.personelId,
      personnelName: item.personel,
      score: item.toplamPuan,
      serviceCount: item.servis,
    }));
  }, [items]);

  const summary = useMemo(() => {
    const toplamServis = items.reduce((acc, item) => acc + item.servis, 0);
    const ortalama =
      items.length > 0 ? Math.round(items.reduce((acc, item) => acc + item.toplamPuan, 0) / items.length) : 0;
    return { toplamServis, ortalama };
  }, [items]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Grand Maritime Page Header */}
      <Card className="border-l-4 border-l-gold-500">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-navy-900">Puanlama</h1>
              <p className="text-slate-500">{formatMonth(ay)} performans sıralaması</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                <span className="sr-only">Ay seçin</span>
                <input
                  type="month"
                  title="Ay seçin"
                  className="rounded-md border border-cream-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500"
                  value={ay}
                  onChange={(e) => setAy(e.target.value)}
                />
              </label>
              <Link href="/deger">
                <button type="button" className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-navy-700 to-navy-900 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg">
                  Yetkili Puanı Gir
                </button>
              </Link>
              <Link href="/ismail">
                <button type="button" className="inline-flex items-center gap-2 rounded-md border-2 border-navy-700 bg-cream-100 px-4 py-2 text-sm font-medium text-navy-900 transition-all hover:bg-cream-200">
                  İsmail Usta Puanı Gir
                </button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats - Grand Maritime Style */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-navy-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-navy-700 to-navy-900 text-white">
                <span className="text-xl">👥</span>
              </div>
              <div>
                <div className="text-sm text-slate-500">Personel</div>
                <div className="font-display text-xl font-bold text-navy-900">{items.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-seafoam-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-seafoam-500 to-seafoam-700 text-white">
                <span className="text-xl">⚙️</span>
              </div>
              <div>
                <div className="text-sm text-slate-500">Toplam Servis</div>
                <div className="font-display text-xl font-bold text-navy-900">{summary.toplamServis}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-gold-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-gold-500 to-gold-600 text-white">
                <span className="text-xl">🏆</span>
              </div>
              <div>
                <div className="text-sm text-slate-500">Ortalama Puan</div>
                <div className="font-display text-xl font-bold text-navy-900">{summary.ortalama}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Leaderboard */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-navy-200 border-t-navy-700" />
              <p className="text-slate-500">Yükleniyor...</p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-coral-500">
          <CardContent className="flex items-center justify-center p-12">
            <p className="text-coral-500">{error}</p>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <p className="text-slate-500">Bu ay için puan verisi bulunamadı.</p>
          </CardContent>
        </Card>
      ) : (
        <Leaderboard
          entries={leaderboardEntries}
          title={`Haftalık Performans - ${formatMonth(ay)}`}
          period={ay}
        />
      )}

      {/* Detailed Table - Collapsible */}
      {!loading && !error && items.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer rounded-lg border border-cream-200 bg-white px-4 py-3 font-medium text-navy-900 hover:bg-cream-50">
            Detaylı Tablo Görünümü
          </summary>
          <div className="mt-4 overflow-hidden rounded-lg border border-cream-200 bg-white">
            <table className="w-full">
              <thead className="bg-cream-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-navy-900">Sıra</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-navy-900">Personel</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-navy-900">Servis</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-navy-900">Bireysel</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-navy-900">Yetkili</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-navy-900">İsmail</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-navy-900">Toplam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {items.map((item) => {
                  const rozet = getRozetBadge(item.sira);
                  return (
                    <tr key={item.personelId} className="hover:bg-cream-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-navy-900">{item.sira}</span>
                          {rozet && <span>{rozet.icon}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-navy-900">{item.personel}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{item.servis}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{item.bireyselPuan}</td>
                      <td className="px-4 py-3 text-center text-slate-600">
                        {item.yetkiliPuani === null ? '-' : item.yetkiliPuani}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">
                        {item.ismailUstaPuani === null ? '-' : item.ismailUstaPuani}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-display font-bold text-navy-900">
                          {item.toplamPuan}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

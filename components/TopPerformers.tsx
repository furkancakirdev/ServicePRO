'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { LeaderboardEntry } from '@/components/Leaderboard';
import { MiniLeaderboard } from '@/components/Leaderboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Performer {
  id: string;
  ad: string;
  puan: number;
  servisSayisi: number;
  rozet?: 'ALTIN' | 'GUMUS' | 'BRONZ';
}

type PuanlamaItem = {
  personelId: string;
  personel: string;
  toplamPuan: number;
  servis: number;
};

const rozetConfig = {
  ALTIN: { emoji: '🥇', color: '#D4AF37' },
  GUMUS: { emoji: '🥈', color: '#C0C0C0' },
  BRONZ: { emoji: '🥉', color: '#B87333' },
};

/**
 * TopPerformers Dashboard Widget
 *
 * Shows weekly performance leaderboard with Grand Maritime styling
 */
export default function TopPerformers() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const now = new Date();
        const ay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const res = await fetch(`/api/puanlama/aylik?ay=${encodeURIComponent(ay)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (res.ok) {
          const data = await res.json() as { items: PuanlamaItem[] };
          const leaderboardEntries: LeaderboardEntry[] = (data.items || []).slice(0, 5).map((item, index) => ({
            rank: index + 1,
            personnelId: item.personelId,
            personnelName: item.personel,
            score: item.toplamPuan,
            serviceCount: item.servis,
          }));
          setEntries(leaderboardEntries);
        }
      } catch (error) {
        console.error('Top performers yüklenemedi:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <Card className="border-l-4 border-l-gold-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>🏆</span>
            <span className="font-display text-lg">Haftalık Performans</span>
          </CardTitle>
          <Link
            href="/puanlama"
            className="text-sm text-navy-700 hover:text-gold-600 hover:underline"
          >
            Detay →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-navy-200 border-t-navy-700" />
          </div>
        ) : entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Bu ay için veri bulunamadı</p>
        ) : (
          <MiniLeaderboard entries={entries} maxEntries={5} />
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';

type Personel = {
  id: string;
  ad: string;
  unvan: 'usta' | 'cirak' | 'yonetici' | 'ofis';
  rol: string;
  aktif: boolean;
};

type IsmailItem = {
  personnelId: string;
  personnelAd: string;
  puan: number;
  kilitlendi?: boolean;
};

type LocalUser = {
  rol?: 'admin' | 'yetkili';
};

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(ay: string): string {
  const [y, m] = ay.split('-').map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
}

export default function IsmailDegerlendirmePage() {
  const [ay, setAy] = useState(getCurrentMonth());
  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [forceOverwrite, setForceOverwrite] = useState(false);
  const [lockUpdating, setLockUpdating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        const parsedUser: LocalUser | null = storedUser ? JSON.parse(storedUser) : null;
        if (!ignore) setIsAdmin(parsedUser?.rol === 'admin');

        const [personelRes, ismailRes] = await Promise.all([
          fetch('/api/personel?aktif=true', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          fetch(`/api/puanlama/ismail?ay=${encodeURIComponent(ay)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
        ]);

        if (!personelRes.ok) throw new Error('Personel listesi alınamadı');

        const personelData = (await personelRes.json()) as Personel[];
        const teknisyenler = personelData.filter((p) => p.rol === 'teknisyen' && (p.unvan === 'usta' || p.unvan === 'cirak'));

        const nextScores: Record<string, number | null> = Object.fromEntries(teknisyenler.map((p) => [p.id, null]));
        const nextSaved = new Set<string>();
        const nextLocked = new Set<string>();

        if (ismailRes.ok) {
          const savedData = (await ismailRes.json()) as { items?: IsmailItem[] };
          for (const item of savedData.items ?? []) {
            nextScores[item.personnelId] = item.puan;
            nextSaved.add(item.personnelId);
            if (item.kilitlendi) nextLocked.add(item.personnelId);
          }
        }

        if (!ignore) {
          setPersoneller(teknisyenler);
          setScores(nextScores);
          setSaved(nextSaved);
          setLocked(nextLocked);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Yükleme hatası');
          setPersoneller([]);
          setScores({});
          setSaved(new Set());
          setLocked(new Set());
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [ay, reloadKey]);

  const stats = useMemo(() => ({
    toplam: personeller.length,
    kaydedilen: saved.size,
  }), [personeller.length, saved]);

  async function saveScore(personel: Personel) {
    const puan = scores[personel.id];
    if (!puan) {
      setError('Kaydetmeden önce puan seçin.');
      return;
    }
    const canOverwriteLocked = isAdmin && forceOverwrite;
    if (locked.has(personel.id) && !canOverwriteLocked) {
      setError('Bu kayıt kilitli. Güncellemek için admin overwrite açılmalı.');
      return;
    }

    setSavingId(personel.id);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/puanlama/ismail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ personelId: personel.id, ay, puan, forceOverwrite: canOverwriteLocked }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Kayıt başarısız');
      }

      setSaved((prev) => { const next = new Set(prev); next.add(personel.id); return next; });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız');
    } finally {
      setSavingId(null);
    }
  }

  async function saveAll() {
    const pending = personeller.filter((p) => typeof scores[p.id] === 'number');
    if (pending.length === 0) {
      setError('Toplu kaydetme için en az bir puan seçin.');
      return;
    }

    setBulkSaving(true);
    setError(null);
    try {
      for (const p of pending) {
        await saveScore(p);
      }
    } finally {
      setBulkSaving(false);
      setSavingId(null);
    }
  }

  async function handleMonthLock(lockState: boolean) {
    if (!isAdmin) return;
    setLockUpdating(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/puanlama/ismail', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ay, lock: lockState }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Kilit işlemi başarısız');
      }

      setReloadKey((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kilit işlemi başarısız');
    } finally {
      setLockUpdating(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <header className="hero-panel mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="page-title">İsmail Usta Değerlendirmesi</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>{monthLabel(ay)} dönemi • 1-5 puan</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
          <input type="month" className="form-input" value={ay} onChange={(e) => setAy(e.target.value)} />
          <div className="btn btn-secondary" style={{ pointerEvents: 'none' }}>
            {stats.kaydedilen} / {stats.toplam} kaydedildi
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={saveAll}
            disabled={bulkSaving || loading}
          >
            {bulkSaving ? 'Toplu Kaydediliyor...' : 'Tümünü Kaydet'}
          </button>
          {isAdmin && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleMonthLock(true)}
                disabled={lockUpdating}
              >
                {lockUpdating ? 'İşleniyor...' : 'Ayı Kilitle'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleMonthLock(false)}
                disabled={lockUpdating}
              >
                {lockUpdating ? 'İşleniyor...' : 'Kilidi Aç'}
              </button>
            </>
          )}
        </div>
      </header>

      {error && (
        <div className="card surface-panel" style={{ color: 'var(--color-error)', marginBottom: 'var(--space-md)' }}>
          {error}
        </div>
      )}

      {isAdmin && (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-md)' }}>
          <input
            type="checkbox"
            checked={forceOverwrite}
            onChange={(e) => setForceOverwrite(e.target.checked)}
          />
          Kilitli kayıtları admin overwrite ile güncelle
        </label>
      )}

      <div className="table-container surface-panel">
        <table className="table">
          <thead>
            <tr>
              <th>Personel</th>
              <th style={{ textAlign: 'center' }}>Ünvan</th>
              <th style={{ textAlign: 'center' }}>Durum</th>
              <th style={{ textAlign: 'center' }}>Puan (1-5)</th>
              <th style={{ textAlign: 'center' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                  Yükleniyor...
                </td>
              </tr>
            )}

            {!loading && personeller.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                  Personel bulunamadı.
                </td>
              </tr>
            )}

            {!loading &&
              personeller.map((p) => (
                <tr key={p.id}>
                  <td>{p.ad}</td>
                  <td style={{ textAlign: 'center' }}>{p.unvan === 'usta' ? 'Usta' : 'Çırak'}</td>
                  <td style={{ textAlign: 'center' }}>{locked.has(p.id) ? 'Kilitli' : 'Açık'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: 'var(--space-xs)' }}>
                      {[1, 2, 3, 4, 5].map((v) => (
                        <button
                          key={v}
                          type="button"
                          className={scores[p.id] === v ? 'btn btn-primary' : 'btn btn-secondary'}
                          style={{ minWidth: 36, padding: 'var(--space-xs) var(--space-sm)' }}
                          onClick={() =>
                            setScores((prev) => ({
                              ...prev,
                              [p.id]: v,
                            }))
                          }
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className={saved.has(p.id) ? 'btn btn-success' : 'btn btn-primary'}
                      disabled={savingId === p.id || !scores[p.id] || (locked.has(p.id) && !(isAdmin && forceOverwrite))}
                      onClick={() => saveScore(p)}
                    >
                      {savingId === p.id ? 'Kaydediliyor...' : saved.has(p.id) ? 'Güncellendi' : 'Kaydet'}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


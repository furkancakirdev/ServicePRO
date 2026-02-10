'use client';

import { useEffect, useMemo, useState } from 'react';

type Answer = 'EVET' | 'KISMEN' | 'HAYIR' | 'ATLA';
type Personel = {
  id: string;
  ad: string;
  unvan: 'usta' | 'cirak' | 'yonetici' | 'ofis';
  rol: string;
  aktif: boolean;
};

type Question = { key: string; label: string; aciklama: string };
type SavedItem = {
  personelId: string;
  cevaplar?: Record<string, Answer | null>;
  kilitlendi?: boolean;
};

type LocalUser = {
  rol?: 'admin' | 'yetkili';
};

const USTA_QUESTIONS: Question[] = [
  { key: 'uniformaVeIsg', label: 'Üniforma ve İSG uyumu', aciklama: 'KKD kullanımı ve saha disiplini' },
  { key: 'musteriIletisimi', label: 'Müşteri iletişimi', aciklama: 'Müşteri ile profesyonel iletişim' },
  { key: 'planlamaKoordinasyon', label: 'Planlama ve koordinasyon', aciklama: 'Plan ve bilgilendirme uyumu' },
  { key: 'teknikTespit', label: 'Teknik tespit', aciklama: 'Arıza/iş ihtiyacını doğru tespit' },
  { key: 'raporDokumantasyon', label: 'Rapor dokümantasyonu', aciklama: 'Raporun eksiksiz ve zamanında girilmesi' },
  { key: 'genelLiderlik', label: 'Genel liderlik', aciklama: 'Ekip yönlendirme ve sorumluluk alma' },
];

const CIRAK_QUESTIONS: Question[] = [
  { key: 'uniformaVeIsg', label: 'Üniforma ve İSG uyumu', aciklama: 'KKD kullanımı ve saha disiplini' },
  { key: 'ekipIciDavranis', label: 'Ekip içi davranış', aciklama: 'Ekip çalışmasına uyum' },
  { key: 'destekKalitesi', label: 'Destek kalitesi', aciklama: 'Ustalara verilen destek kalitesi' },
  { key: 'ogrenmeGelisim', label: 'Öğrenme ve gelişim', aciklama: 'Öğrenme isteği ve gelişim hızı' },
];

const ANSWER_OPTIONS: Array<{ value: Answer; label: string }> = [
  { value: 'EVET', label: 'Evet' },
  { value: 'KISMEN', label: 'Kısmen' },
  { value: 'HAYIR', label: 'Hayır' },
  { value: 'ATLA', label: 'Gözlemlemedim' },
];

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(ay: string): string {
  const [y, m] = ay.split('-').map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
}

export default function YetkiliDegerlendirmePage() {
  const [ay, setAy] = useState(getCurrentMonth());
  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [activeTab, setActiveTab] = useState<'usta' | 'cirak'>('usta');
  const [selectedId, setSelectedId] = useState<string>('');
  const [answers, setAnswers] = useState<Record<string, Record<string, Answer>>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
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
        const admin = parsedUser?.rol === 'admin';
        if (!ignore) setIsAdmin(admin);

        const [personelRes, savedRes] = await Promise.all([
          fetch('/api/personel?aktif=true', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          fetch(`/api/puanlama/yetkili?ay=${encodeURIComponent(ay)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
        ]);

        if (!personelRes.ok) throw new Error('Personel listesi alınamadı');

        const personelData = (await personelRes.json()) as Personel[];
        const teknisyenler = personelData.filter((p) => p.rol === 'teknisyen' && (p.unvan === 'usta' || p.unvan === 'cirak'));

        const nextAnswers: Record<string, Record<string, Answer>> = {};
        for (const p of teknisyenler) {
          const qs = p.unvan === 'usta' ? USTA_QUESTIONS : CIRAK_QUESTIONS;
          nextAnswers[p.id] = Object.fromEntries(qs.map((q) => [q.key, 'ATLA'])) as Record<string, Answer>;
        }

        const nextSaved = new Set<string>();
        const nextLocked = new Set<string>();
        if (savedRes.ok) {
          const savedData = (await savedRes.json()) as { items?: SavedItem[] };
          for (const item of savedData.items ?? []) {
            nextSaved.add(item.personelId);
            if (item.kilitlendi) nextLocked.add(item.personelId);
            if (item.cevaplar && nextAnswers[item.personelId]) {
              for (const [k, v] of Object.entries(item.cevaplar)) {
                if (!v) continue;
                nextAnswers[item.personelId][k] = v;
              }
            }
          }
        }

        if (!ignore) {
          setPersoneller(teknisyenler);
          setAnswers(nextAnswers);
          setSavedIds(nextSaved);
          setLockedIds(nextLocked);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Yükleme hatası');
          setPersoneller([]);
          setAnswers({});
          setSavedIds(new Set());
          setLockedIds(new Set());
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

  const ustalar = useMemo(() => personeller.filter((p) => p.unvan === 'usta'), [personeller]);
  const ciraklar = useMemo(() => personeller.filter((p) => p.unvan === 'cirak'), [personeller]);
  const currentList = activeTab === 'usta' ? ustalar : ciraklar;

  useEffect(() => {
    if (currentList.length === 0) {
      setSelectedId('');
      return;
    }
    if (!currentList.find((p) => p.id === selectedId)) {
      setSelectedId(currentList[0].id);
    }
  }, [currentList, selectedId]);

  const selectedPersonel = currentList.find((p) => p.id === selectedId) ?? null;
  const questions = selectedPersonel?.unvan === 'usta' ? USTA_QUESTIONS : CIRAK_QUESTIONS;
  const selectedLocked = selectedPersonel ? lockedIds.has(selectedPersonel.id) : false;
  const canOverwriteLocked = isAdmin && forceOverwrite;

  function setAnswer(questionKey: string, value: Answer) {
    if (!selectedPersonel) return;
    setAnswers((prev) => ({
      ...prev,
      [selectedPersonel.id]: {
        ...(prev[selectedPersonel.id] ?? {}),
        [questionKey]: value,
      },
    }));
  }

  async function handleSave(): Promise<boolean> {
    if (!selectedPersonel) return false;

    setSaving(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/puanlama/yetkili', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          personelId: selectedPersonel.id,
          ay,
          cevaplar: answers[selectedPersonel.id] ?? {},
          forceOverwrite: canOverwriteLocked,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Kayıt başarısız');
      }

      setSavedIds((prev) => { const next = new Set(prev); next.add(selectedPersonel.id); return next; });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAndNext() {
    if (!selectedPersonel) return;
    const ok = await handleSave();
    if (!ok) return;
    const currentIndex = currentList.findIndex((p) => p.id === selectedPersonel.id);
    if (currentIndex >= 0 && currentIndex < currentList.length - 1) {
      setSelectedId(currentList[currentIndex + 1].id);
    }
  }

  async function handleMonthLock(lock: boolean) {
    if (!isAdmin) return;
    setLockUpdating(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/puanlama/yetkili', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ay, lock, hedef: 'ALL' }),
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

  async function handleDelete() {
    if (!selectedPersonel) return;
    if (!isAdmin) {
      setError('Sadece adminler kayıt silebilir');
      return;
    }
    if (!confirm(`${selectedPersonel.ad} için ${monthLabel(ay)} değerlendirmesini silmek istediğinize emin misiniz?`)) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`/api/puanlama/yetkili?personelId=${selectedPersonel.id}&ay=${ay}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Silme işlemi başarısız');
      }

      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(selectedPersonel.id);
        return next;
      });
      setReloadKey((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silme işlemi başarısız');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <header className="hero-panel mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="page-title">Yetkili Değerlendirmesi</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>{monthLabel(ay)} dönemi</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <input type="month" className="form-input" value={ay} onChange={(e) => setAy(e.target.value)} />
          <div className="btn btn-secondary" style={{ pointerEvents: 'none' }}>
            {savedIds.size} / {personeller.length} kaydedildi
          </div>
          {isAdmin && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={lockUpdating}
                onClick={() => handleMonthLock(true)}
              >
                {lockUpdating ? 'İşleniyor...' : 'Ayı Kilitle'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={lockUpdating}
                onClick={() => handleMonthLock(false)}
              >
                {lockUpdating ? 'İşleniyor...' : 'Kilidi Aç'}
              </button>
            </>
          )}
        </div>
      </header>

      {error && (
        <div className="card surface-panel" style={{ marginBottom: 'var(--space-md)', color: 'var(--color-error)' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
        <button
          className={activeTab === 'usta' ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={() => setActiveTab('usta')}
          type="button"
        >
          Ustalar ({ustalar.length})
        </button>
        <button
          className={activeTab === 'cirak' ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={() => setActiveTab('cirak')}
          type="button"
        >
          Çıraklar ({ciraklar.length})
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '300px 1fr', gap: 'var(--space-lg)' }}>
        <div className="card surface-panel">
          <h3 className="card-title">Personel</h3>
          {loading && <p>Yükleniyor...</p>}
          {!loading && currentList.length === 0 && <p>Bu sekmede personel yok.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {currentList.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={selectedId === p.id ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ justifyContent: 'space-between' }}
              >
                <span>{p.ad}</span>
                {lockedIds.has(p.id) ? (
                  <span>Kilitli</span>
                ) : savedIds.has(p.id) ? (
                  <span>Kaydedildi</span>
                ) : (
                  <span style={{ opacity: 0.5 }}>•</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="card surface-panel">
          <h3 className="card-title">{selectedPersonel ? `${selectedPersonel.ad} değerlendirmesi` : 'Değerlendirme'}</h3>

          {!selectedPersonel && <p>Personel seçin.</p>}

          {selectedPersonel && (
            <>
              {selectedLocked && (
                <div className="card surface-panel" style={{ marginBottom: 'var(--space-md)' }}>
                  Bu personelin {monthLabel(ay)} değerlendirmesi kilitli.
                  {!isAdmin && ' Sadece görüntüleyebilirsiniz.'}
                </div>
              )}

              {isAdmin && selectedLocked && (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-md)' }}>
                  <input
                    type="checkbox"
                    checked={forceOverwrite}
                    onChange={(e) => setForceOverwrite(e.target.checked)}
                  />
                  Kilitli kaydı admin olarak overwrite et
                </label>
              )}

              {questions.map((q, index) => {
                const value = answers[selectedPersonel.id]?.[q.key] ?? 'ATLA';
                return (
                  <div key={q.key} style={{ marginBottom: 'var(--space-lg)' }}>
                    <div style={{ fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
                      {index + 1}. {q.label}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-sm)' }}>
                      {q.aciklama}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                      {ANSWER_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={value === opt.value ? 'btn btn-primary' : 'btn btn-secondary'}
                          disabled={selectedLocked && !canOverwriteLocked}
                          onClick={() => setAnswer(q.key, opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {isAdmin && savedIds.has(selectedPersonel.id) && !selectedLocked && (
                  <button
                    type="button"
                    className="btn btn-error"
                    onClick={handleDelete}
                    disabled={saving}
                    style={{ background: 'var(--color-error)', color: 'white' }}
                  >
                    {saving ? 'Siliniyor...' : 'Kaydı Sil'}
                  </button>
                )}
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginLeft: 'auto' }}>
                  <button type="button" className="btn btn-secondary" onClick={handleSaveAndNext} disabled={saving}>
                    {saving ? 'Kaydediliyor...' : 'Kaydet ve Sonraki'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={handleSave}
                    disabled={saving || (selectedLocked && !canOverwriteLocked)}
                  >
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


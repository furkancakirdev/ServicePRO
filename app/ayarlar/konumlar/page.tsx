'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

interface LokasyonBilgisi {
  lokasyon: string;
  sayi: number;
}

const varsayilanLokasyonlar = [
  'YATMARIN',
  'NETSEL',
  'DIŞ SERVİS',
  'MARINA',
  'LİMAN',
  'TEKNİK OFİS',
  'DEPO',
];

export default function KonumlarPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lokasyonlar, setLokasyonlar] = useState<LokasyonBilgisi[]>([]);
  const [yeniLokasyon, setYeniLokasyon] = useState('');
  const [eklemeLoading, setEklemeLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    loadLokasyonlar();
  }, [user, router]);

  const loadLokasyonlar = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/konumlar');
      if (res.ok) {
        const data = await res.json();
        setLokasyonlar(data);
      }
    } catch (error) {
      console.error('Konumlar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleYeniLokasyon = async () => {
    const trimmed = yeniLokasyon.trim();
    if (!trimmed) return;

    setEklemeLoading(true);
    try {
      const res = await fetch('/api/konumlar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lokasyon: trimmed }),
      });

      if (res.status === 409) {
        alert('Bu lokasyon zaten mevcut.');
        return;
      }

      if (res.ok) {
        setYeniLokasyon('');
        alert(`Lokasyon kaydedildi: ${trimmed}`);
      } else {
        const data = await res.json();
        alert(data.error || 'Bir hata oluştu.');
      }
    } catch (error) {
      console.error('Lokasyon eklenirken hata:', error);
      alert('Bir hata oluştu.');
    } finally {
      setEklemeLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLokasyonlar();
    setRefreshing(false);
  };

  const toplamServis = lokasyonlar.reduce((sum, l) => sum + l.sayi, 0);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <header className="hero-panel" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="hero-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <Link
              href="/ayarlar"
              className="btn btn-secondary"
              style={{ padding: 'var(--space-xs) var(--space-sm)' }}
            >
              ←
            </Link>
            <div>
              <h1 className="hero-title">Konum Yönetimi</h1>
              <p className="hero-subtitle">Marina ve servis konumları</p>
            </div>
          </div>
          <button
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}
          >
            {refreshing ? 'Yenileniyor...' : '🔄 Yenile'}
          </button>
        </div>
      </header>

      <div className="surface-panel" style={{ marginBottom: 'var(--space-lg)' }}>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
          Konumlar, servis kayıtlarındaki <strong>yer</strong> alanından türetilir.
          Yeni bir servis kaydı oluştururken bu konumlardan birini seçebilirsiniz.
        </p>
      </div>

      {/* İstatistik Kartı */}
      <div className="surface-panel" style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <h3 style={{ margin: '0 0 var(--space-xs) 0' }}>Toplam {lokasyonlar.length} Konum</h3>
            <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.9rem' }}>
              {toplamServis} servis kaydı ile ilişkili
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
            <input
              type="text"
              value={yeniLokasyon}
              onChange={(e) => setYeniLokasyon(e.target.value.toUpperCase())}
              placeholder="Yeni konum adı..."
              style={{
                padding: 'var(--space-xs) var(--space-sm)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.9rem',
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleYeniLokasyon()}
            />
            <button
              className="btn btn-primary"
              onClick={handleYeniLokasyon}
              disabled={eklemeLoading || !yeniLokasyon.trim()}
            >
              {eklemeLoading ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </div>
      </div>

      {/* Konumlar Grid */}
      {lokasyonlar.length === 0 ? (
        <div className="surface-panel" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
          <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '1.1rem' }}>
            Henüz hiç konum kaydı yok.
          </p>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-sm)' }}>
            Servis kaydı oluşturduğunuzda konumlar burada görüntülenecek.
          </p>
        </div>
      ) : (
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 'var(--space-md)',
          }}
        >
          {lokasyonlar
            .sort((a, b) => b.sayi - a.sayi || a.lokasyon.localeCompare(b.lokasyon, 'tr'))
            .map((item) => (
              <div
                key={item.lokasyon}
                className="surface-panel"
                style={{
                  borderLeft: '4px solid var(--color-primary)',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
                  <span style={{ fontSize: '1.2rem' }}>📍</span>
                  <h4 style={{ margin: 0, fontSize: '1rem' }}>{item.lokasyon}</h4>
                </div>
                <div
                  style={{
                    padding: 'var(--space-xs) var(--space-sm)',
                    background: 'var(--color-bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    display: 'inline-block',
                  }}
                >
                  {item.sayi} servis
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Varsayılan Konumlar Referansı */}
      <div
        className="surface-panel"
        style={{
          marginTop: 'var(--space-lg)',
          border: '1px dashed var(--color-border)',
        }}
      >
        <h4 style={{ margin: '0 0 var(--space-sm) 0' }}>Varsayılan Konumlar</h4>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-sm)', fontSize: '0.9rem' }}>
          Sistemde sık kullanılan konumlar:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
          {varsayilanLokasyonlar.map((v) => {
            const mevcut = lokasyonlar.find((l) => l.lokasyon === v);
            return (
              <span
                key={v}
                style={{
                  padding: 'var(--space-xs) var(--space-sm)',
                  background: mevcut ? 'var(--color-primary)' : 'var(--color-bg-subtle)',
                  color: mevcut ? 'white' : 'var(--color-text-muted)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                }}
              >
                {v} {mevcut && `(${mevcut.sayi})`}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

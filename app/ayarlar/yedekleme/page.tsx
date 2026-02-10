'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

interface YedekKaydi {
  id: string;
  tarih: string;
  tur: 'manuel' | 'otomatik';
  boyut: string;
  durum: string;
  kayitSayisi: number;
  detay?: {
    servis?: number;
    tekne?: number;
    personel?: number;
    kullanici?: number;
    degerlendirme?: number;
  };
}

export default function YedeklemePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [yedekler, setYedekler] = useState<YedekKaydi[]>([]);
  const [yedekleniyor, setYedekleniyor] = useState(false);
  const [sonYedek, setSonYedek] = useState<YedekKaydi | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    loadYedekler();
  }, [user, router]);

  const loadYedekler = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/yedekleme');
      if (res.ok) {
        const data = await res.json();
        setYedekler(data);
      }
    } catch (error) {
      console.error('Yedekler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleYedekle = async () => {
    if (!confirm('Yeni bir yedekleme başlatmak istediğinizden emin misiniz?')) {
      return;
    }

    setYedekleniyor(true);
    try {
      const res = await fetch('/api/yedekleme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tur: 'manuel' }),
      });

      if (res.ok) {
        const data = await res.json();
        setSonYedek(data);
        alert(`Yedekleme başarıyla tamamlandı!\n\nToplam ${data.kayitSayisi} kayıt yedeklendi.`);
        loadYedekler();
      } else {
        alert('Yedekleme sırasında bir hata oluştu.');
      }
    } catch (error) {
      console.error('Yedekleme hatası:', error);
      alert('Bir hata oluştu.');
    } finally {
      setYedekleniyor(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTurIcon = (tur: string) => {
    return tur === 'manuel' ? '👤' : '🤖';
  };

  const getTurLabel = (tur: string) => {
    return tur === 'manuel' ? 'Manuel' : 'Otomatik';
  };

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
              <h1 className="hero-title">Yedekleme</h1>
              <p className="hero-subtitle">Veri yedekleme ve geri yükleme</p>
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleYedekle}
            disabled={yedekleniyor}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}
          >
            {yedekleniyor ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }} /> Yedekleniyor...
              </>
            ) : (
              <>
                💾 Yeni Yedekle
              </>
            )}
          </button>
        </div>
      </header>

      <div className="surface-panel" style={{ marginBottom: 'var(--space-lg)' }}>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
          Veri tabanınızın tamamını yedekleyebilir ve gerektiğinde geri yükleyebilirsiniz.
          Yedekler otomatik olarak her gün oluşturulur.
        </p>
      </div>

      {/* İstatistik Kartları */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-lg)',
        }}
      >
        <div className="surface-panel" style={{ borderLeft: '4px solid #22c55e' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-xs)' }}>
            Toplam Yedek
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 600 }}>{yedekler.length}</div>
        </div>
        <div className="surface-panel" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-xs)' }}>
            Son Yedek
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>
            {yedekler.length > 0 ? formatDate(yedekler[0].tarih) : '-'}
          </div>
        </div>
        <div className="surface-panel" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-xs)' }}>
            Tahmini Boyut
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
            {yedekler.length > 0 ? yedekler[0].boyut : '-'}
          </div>
        </div>
      </div>

      {/* Son Yedek Detayı */}
      {sonYedek && sonYedek.detay && (
        <div className="surface-panel" style={{ marginBottom: 'var(--space-lg)', border: '2px solid #22c55e' }}>
          <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>
            ✅ Son Yedekleme Detayı
          </h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-sm)' }}>
            <div style={{ padding: 'var(--space-sm)', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Servis</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{sonYedek.detay.servis}</div>
            </div>
            <div style={{ padding: 'var(--space-sm)', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Tekne</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{sonYedek.detay.tekne}</div>
            </div>
            <div style={{ padding: 'var(--space-sm)', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Personel</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{sonYedek.detay.personel}</div>
            </div>
            <div style={{ padding: 'var(--space-sm)', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Kullanıcı</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{sonYedek.detay.kullanici}</div>
            </div>
            <div style={{ padding: 'var(--space-sm)', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Değerlendirme</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{sonYedek.detay.degerlendirme}</div>
            </div>
          </div>
        </div>
      )}

      {/* Yedekleme Geçmişi */}
      <div className="surface-panel">
        <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>
          📋 Yedekleme Geçmişi
        </h3>

        {yedekler.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-xl)' }}>
            Henüz yedek kaydı yok.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: 'var(--space-sm)', fontWeight: 600 }}>
                    Tarih
                  </th>
                  <th style={{ textAlign: 'left', padding: 'var(--space-sm)', fontWeight: 600 }}>
                    Tür
                  </th>
                  <th style={{ textAlign: 'left', padding: 'var(--space-sm)', fontWeight: 600 }}>
                    Boyut
                  </th>
                  <th style={{ textAlign: 'left', padding: 'var(--space-sm)', fontWeight: 600 }}>
                    Kayıt Sayısı
                  </th>
                  <th style={{ textAlign: 'left', padding: 'var(--space-sm)', fontWeight: 600 }}>
                    Durum
                  </th>
                  <th style={{ textAlign: 'center', padding: 'var(--space-sm)', fontWeight: 600 }}>
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody>
                {yedekler.map((yedek) => (
                  <tr
                    key={yedek.id}
                    style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
                  >
                    <td style={{ padding: 'var(--space-sm)' }}>{formatDate(yedek.tarih)}</td>
                    <td style={{ padding: 'var(--space-sm)' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 'var(--space-xs)',
                        }}
                      >
                        {getTurIcon(yedek.tur)} {getTurLabel(yedek.tur)}
                      </span>
                    </td>
                    <td style={{ padding: 'var(--space-sm)' }}>{yedek.boyut}</td>
                    <td style={{ padding: 'var(--space-sm)' }}>{yedek.kayitSayisi.toLocaleString('tr-TR')}</td>
                    <td style={{ padding: 'var(--space-sm)' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          background: yedek.durum === 'tamamlandı' ? '#dcfce7' : '#fee2e2',
                          color: yedek.durum === 'tamamlandı' ? '#166534' : '#991b1b',
                        }}
                      >
                        {yedek.durum}
                      </span>
                    </td>
                    <td style={{ padding: 'var(--space-sm)', textAlign: 'center' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        onClick={() => alert('Bu özellik yakında eklenecek.')}
                      >
                        İndir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bilgi */}
      <div
        className="surface-panel"
        style={{
          marginTop: 'var(--space-lg)',
          border: '1px dashed var(--color-border)',
        }}
      >
        <h4 style={{ margin: '0 0 var(--space-sm) 0' }}>💡 Bilgi</h4>
        <p style={{ color: 'var(--color-text-muted)', margin: '0 0 var(--space-xs) 0', fontSize: '0.9rem' }}>
          <strong>Otomatik Yedekleme:</strong> Sistem her gün otomatik olarak yedekleme yapar.
          Yedekler 30 gün boyunca saklanır.
        </p>
        <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.9rem' }}>
          <strong>Manuel Yedekleme:</strong> "Yeni Yedekle" butonu ile anında yedek alabilirsiniz.
        </p>
      </div>
    </div>
  );
}

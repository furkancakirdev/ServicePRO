'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { ServisDurumu } from '@prisma/client';

interface DurumBilgisi {
  deger: ServisDurumu;
  ad: string;
  aciklama: string;
  renk: string;
  ikon: string;
  siralama: number;
}

const durumlar: DurumBilgisi[] = [
  {
    deger: ServisDurumu.RANDEVU_VERILDI,
    ad: 'Randevu Verildi',
    aciklama: 'Müşteri için randevu tarihi belirlendi, servis planlandı.',
    renk: '#3b82f6',
    ikon: '📅',
    siralama: 1,
  },
  {
    deger: ServisDurumu.DEVAM_EDİYOR,
    ad: 'Devam Ediyor',
    aciklama: 'Servis işlemleri aktif olarak sürdürülüyor.',
    renk: '#f59e0b',
    ikon: '⚙️',
    siralama: 2,
  },
  {
    deger: ServisDurumu.PARCA_BEKLIYOR,
    ad: 'Parça Bekliyor',
    aciklama: 'Servis işlemleri parça tedarik awaiting bekleniyor.',
    renk: '#ef4444',
    ikon: '🔧',
    siralama: 3,
  },
  {
    deger: ServisDurumu.MUSTERI_ONAY_BEKLIYOR,
    ad: 'Müşteri Onayı Bekliyor',
    aciklama: 'Müşteriden onay veya bilgi bekleniyor.',
    renk: '#8b5cf6',
    ikon: '📞',
    siralama: 4,
  },
  {
    deger: ServisDurumu.RAPOR_BEKLIYOR,
    ad: 'Rapor Bekliyor',
    aciklama: 'Teknik rapor veya dokümantasyon bekleniyor.',
    renk: '#06b6d4',
    ikon: '📋',
    siralama: 5,
  },
  {
    deger: ServisDurumu.KESIF_KONTROL,
    ad: 'Keşif/Kontrol',
    aciklama: 'Teknik keşif veya kontrol aşamasında.',
    renk: '#ec4899',
    ikon: '🔍',
    siralama: 6,
  },
  {
    deger: ServisDurumu.TAMAMLANDI,
    ad: 'Tamamlandı',
    aciklama: 'Servis işlemleri başarıyla tamamlandı.',
    renk: '#22c55e',
    ikon: '✅',
    siralama: 7,
  },
  {
    deger: ServisDurumu.IPTAL,
    ad: 'İptal',
    aciklama: 'Servis iptal edildi.',
    renk: '#6b7280',
    ikon: '❌',
    siralama: 8,
  },
  {
    deger: ServisDurumu.ERTELENDI,
    ad: 'Ertelendi',
    aciklama: 'Servis ileri bir tarihe ertelendi.',
    renk: '#f97316',
    ikon: '⏰',
    siralama: 9,
  },
];

export default function DurumlarPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    // Sadece ADMIN erişebilir
    if (user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    setLoading(false);
  }, [user, router]);

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
              <h1 className="hero-title">Durum Yönetimi</h1>
              <p className="hero-subtitle">Servis durumları ve açıklamaları</p>
            </div>
          </div>
        </div>
      </header>

      <div className="surface-panel" style={{ marginBottom: 'var(--space-lg)' }}>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
          Servis durumları, servis kayıtlarının iş akışını takip etmek için kullanılır.
          Her durumun spesifik bir anlamı ve işlevi vardır. Bu durumlar sistem tarafından
          tanımlanmıştır ve değiştirilemez.
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
        {durumlar.sort((a, b) => a.siralama - b.siralama).map((durum) => (
          <div
            key={durum.deger}
            className="surface-panel"
            style={{
              borderLeft: `4px solid ${durum.renk}`,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
              <div
                style={{
                  fontSize: '2rem',
                  lineHeight: 1,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                }}
              >
                {durum.ikon}
              </div>
              <div style={{ flex: 1 }}>
                <h3
                  className="card-title"
                  style={{
                    marginBottom: 'var(--space-xs)',
                    color: durum.renk,
                  }}
                >
                  {durum.ad}
                </h3>
                <p
                  style={{
                    color: 'var(--color-text-muted)',
                    fontSize: '0.85rem',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {durum.aciklama}
                </p>
                <div
                  style={{
                    marginTop: 'var(--space-sm)',
                    padding: 'var(--space-xs) var(--space-sm)',
                    background: 'var(--color-bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {durum.deger}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        className="surface-panel"
        style={{
          marginTop: 'var(--space-lg)',
          border: '1px dashed var(--color-border)',
        }}
      >
        <h4 style={{ margin: '0 0 var(--space-sm) 0', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          ℹ️ Bilgi
        </h4>
        <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.9rem' }}>
          Servis durumları veritabanı şemasında tanımlı enum değerleridir. Bu nedenle
          yeni durum eklemek veya mevcut durumları silmek için veritabanı şemasının
          güncellenmesi gerekir. Lütfen bu işlem için sistem yöneticisiyle iletişime geçin.
        </p>
      </div>
    </div>
  );
}

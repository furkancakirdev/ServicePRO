'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

interface YetkiBilgisi {
  modul: string;
  aciklama: string;
  admin: boolean;
  yetkili: boolean;
}

const yetkiMatrisi: YetkiBilgisi[] = [
  // Genel
  { modul: 'Dashboard Görüntüleme', aciklama: 'Ana sayfa ve özet istatistikler', admin: true, yetkili: true },
  { modul: 'Profil Yönetimi', aciklama: 'Kendi profil bilgilerini düzenleme', admin: true, yetkili: true },

  // Servis Yönetimi
  { modul: 'Servis Listesi Görüntüleme', aciklama: 'Tüm servis kayıtlarını görme', admin: true, yetkili: true },
  { modul: 'Servis Ekleme', aciklama: 'Yeni servis kaydı oluşturma', admin: true, yetkili: true },
  { modul: 'Servis Düzenleme', aciklama: 'Mevcut servis kaydını düzenleme', admin: true, yetkili: true },
  { modul: 'Servis Silme', aciklama: 'Servis kaydını silme', admin: true, yetkili: false },
  { modul: 'Servis Durumu Değiştirme', aciklama: 'Servisin durumunu güncelleme', admin: true, yetkili: true },

  // Tekne Yönetimi
  { modul: 'Tekne Listesi Görüntüleme', aciklama: 'Tüm tekneleri görme', admin: true, yetkili: true },
  { modul: 'Tekne Ekleme', aciklama: 'Yeni tekne kaydı oluşturma', admin: true, yetkili: true },
  { modul: 'Tekne Düzenleme', aciklama: 'Tekne bilgilerini düzenleme', admin: true, yetkili: true },
  { modul: 'Tekne Silme', aciklama: 'Tekne kaydını silme', admin: true, yetkili: false },

  // Personel Yönetimi
  { modul: 'Personel Listesi Görüntüleme', aciklama: 'Tüm personeli görme', admin: true, yetkili: true },
  { modul: 'Personel Ekleme', aciklama: 'Yeni personel kaydı oluşturma', admin: true, yetkili: false },
  { modul: 'Personel Düzenleme', aciklama: 'Personel bilgilerini düzenleme', admin: true, yetkili: false },
  { modul: 'Personel Silme', aciklama: 'Personel kaydını silme', admin: true, yetkili: false },

  // Kullanıcı Yönetimi
  { modul: 'Kullanıcı Listesi Görüntüleme', aciklama: 'Sistem kullanıcılarını görme', admin: true, yetkili: false },
  { modul: 'Kullanıcı Ekleme', aciklama: 'Yeni kullanıcı hesabı oluşturma', admin: true, yetkili: false },
  { modul: 'Kullanıcı Düzenleme', aciklama: 'Kullanıcı bilgilerini düzenleme', admin: true, yetkili: false },
  { modul: 'Kullanıcı Silme', aciklama: 'Kullanıcı hesabını silme', admin: true, yetkili: false },
  { modul: 'Rol Değiştirme', aciklama: 'Kullanıcı rolünü değiştirme', admin: true, yetkili: false },

  // Değerlendirme Sistemi
  { modul: 'Puanlama Görüntüleme', aciklama: 'Personel puanlarını görme', admin: true, yetkili: true },
  { modul: 'Puanlama Düzenleme', aciklama: 'Puan ayarlarını değiştirme', admin: true, yetkili: false },
  { modul: 'Değerlendirme Yapma', aciklama: 'Personel için değerlendirme girme', admin: true, yetkili: true },

  // Ayarlar
  { modul: 'Ayarlar Görüntüleme', aciklama: 'Sistem ayarlarını görme', admin: true, yetkili: true },
  { modul: 'Tema Ayarları', aciklama: 'Tema ve görünürlük ayarları', admin: true, yetkili: false },
  { modul: 'Durum Yönetimi', aciklama: 'Servis durumlarını görüntüleme', admin: true, yetkili: true },
  { modul: 'Konum Yönetimi', aciklama: 'Servis konumlarını görüntüleme', admin: true, yetkili: true },
  { modul: 'Yetki Ayarları', aciklama: 'Rol ve yetki matrisini görüntüleme', admin: true, yetkili: false },
  { modul: 'Şirket Bilgileri', aciklama: 'Şirket bilgilerini düzenleme', admin: true, yetkili: false },
  { modul: 'Yedekleme', aciklama: 'Veri yedekleme ve geri yükleme', admin: true, yetkili: false },

  // Google Sheets Sync
  { modul: 'Google Sheets Görüntüleme', aciklama: 'Senkronizasyon durumunu görme', admin: true, yetkili: true },
  { modul: 'Google Sheets Senkronizasyon', aciklama: 'Manuel senkronizasyon başlatma', admin: true, yetkili: false },
  { modul: 'Sheet-DB Doğrulama', aciklama: 'Veri tutarsızlıklarını kontrol etme', admin: true, yetkili: true },

  // Raporlar
  { modul: 'Kapanış Raporları', aciklama: 'Servis kapanış raporlarını görüntüleme', admin: true, yetkili: true },
  { modul: 'Kapanış Raporu Oluşturma', aciklama: 'Yeni kapanış raporu oluşturma', admin: true, yetkili: true },
  { modul: 'Rapor Yazdırma', aciklama: 'Raporları PDF olarak dışa aktarma', admin: true, yetkili: true },
];

const modullerKategorili = {
  Genel: yetkiMatrisi.filter((y) => y.modul.includes('Dashboard') || y.modul.includes('Profil')),
  'Servis Yönetimi': yetkiMatrisi.filter((y) => y.modul.includes('Servis')),
  'Tekne Yönetimi': yetkiMatrisi.filter((y) => y.modul.includes('Tekne')),
  'Personel Yönetimi': yetkiMatrisi.filter((y) => y.modul.includes('Personel')),
  'Kullanıcı Yönetimi': yetkiMatrisi.filter((y) => y.modul.includes('Kullanıcı') || y.modul.includes('Rol')),
  'Değerlendirme Sistemi': yetkiMatrisi.filter((y) => y.modul.includes('Puan') || y.modul.includes('Değerlendirme')),
  Ayarlar: yetkiMatrisi.filter((y) => y.modul.includes('Ayar') || y.modul.includes('Durum') || y.modul.includes('Konum') || y.modul.includes('Yetki') || y.modul.includes('Şirket') || y.modul.includes('Yedek')),
  'Google Sheets': yetkiMatrisi.filter((y) => y.modul.includes('Google') || y.modul.includes('Sheet')),
  Raporlar: yetkiMatrisi.filter((y) => y.modul.includes('Rapor') || y.modul.includes('Yazdır')),
};

export default function YetkilerPage() {
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

  const YetkiIkonu = (admin: boolean, yetkili: boolean) => {
    if (admin && yetkili) return '✅';
    if (admin && !yetkili) return '🔒';
    return '❌';
  };

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
              <h1 className="hero-title">Yetki Ayarları</h1>
              <p className="hero-subtitle">Rol bazlı erişim kontrolü</p>
            </div>
          </div>
        </div>
      </header>

      <div className="surface-panel" style={{ marginBottom: 'var(--space-lg)' }}>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
          Bu sayfada sistemdeki rollerin (ADMIN ve YETKILI) yetki matrisi görüntülenir.
          Yetki değişiklikleri için kod tabanlı düzenleme gerekir.
        </p>
      </div>

      {/* Rol Bilgileri */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <div className="surface-panel" style={{ borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
            <span style={{ fontSize: '1.5rem' }}>👑</span>
            <h3 style={{ margin: 0 }}>ADMIN</h3>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Tam sistem erişimi. Tüm modülleri görüntüleyebilir, düzenleyebilir ve silebilir.
          </p>
        </div>
        <div className="surface-panel" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
            <span style={{ fontSize: '1.5rem' }}>👤</span>
            <h3 style={{ margin: 0 }}>YETKILI</h3>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Sınırlı erişim. Servis ve tekne yönetimi yapabilir, ayarları değiştiremez.
          </p>
        </div>
      </div>

      {/* Yetki Matrisi */}
      {Object.entries(modullerKategorili).map(([kategori, moduller]) => (
        <div key={kategori} className="surface-panel" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ margin: '0 0 var(--space-md) 0', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)' }}>
            {kategori}
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: 'var(--space-sm)', fontWeight: 600 }}>Modül</th>
                  <th style={{ textAlign: 'left', padding: 'var(--space-sm)', fontWeight: 600 }}>Açıklama</th>
                  <th style={{ textAlign: 'center', padding: 'var(--space-sm)', fontWeight: 600 }}>ADMIN</th>
                  <th style={{ textAlign: 'center', padding: 'var(--space-sm)', fontWeight: 600 }}>YETKILI</th>
                </tr>
              </thead>
              <tbody>
                {moduller.map((yetki) => (
                  <tr
                    key={yetki.modul}
                    style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
                  >
                    <td style={{ padding: 'var(--space-sm)', fontWeight: 500 }}>{yetki.modul}</td>
                    <td style={{ padding: 'var(--space-sm)', color: 'var(--color-text-muted)' }}>{yetki.aciklama}</td>
                    <td style={{ padding: 'var(--space-sm)', textAlign: 'center' }}>
                      {YetkiIkonu(yetki.admin, true)}
                    </td>
                    <td style={{ padding: 'var(--space-sm)', textAlign: 'center' }}>
                      {YetkiIkonu(yetki.yetkili, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Bilgi Notu */}
      <div
        className="surface-panel"
        style={{
          border: '1px dashed var(--color-border)',
        }}
      >
        <h4 style={{ margin: '0 0 var(--space-sm) 0', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          💡 Bilgi
        </h4>
        <p style={{ color: 'var(--color-text-muted)', margin: '0 0 var(--space-xs) 0', fontSize: '0.9rem' }}>
          <strong>Yetki Değişikliği:</strong> Bu yetki matrisi kod tabanlıdır. Değişiklik yapmak için
          <code style={{ background: 'var(--color-bg-subtle)', padding: '2px 6px', borderRadius: '4px', margin: '0 4px' }}>
            app/ayarlar/yetkiler/page.tsx
          </code>
          dosyasını düzenleyin ve API route'larındaki
          <code style={{ background: 'var(--color-bg-subtle)', padding: '2px 6px', borderRadius: '4px', margin: '0 4px' }}>
            requireAuth()
          </code>
          kontrollerini güncelleyin.
        </p>
        <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.9rem' }}>
          <strong>Yeni Rol Ekleme:</strong> Yeni bir rol eklemek için Prisma schema'da
          <code style={{ background: 'var(--color-bg-subtle)', padding: '2px 6px', borderRadius: '4px', margin: '0 4px' }}>
            UserRole
          </code>
          enum'ını güncelleyin ve veritabanı迁移ını çalıştırın.
        </p>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

interface SirketBilgileri {
  adi?: string;
  logo?: string;
  adres?: string;
  tel?: string;
  email?: string;
  vergiNo?: string;
  vergiDairesi?: string;
  webSitesi?: string;
  kurulusYili?: string;
}

interface Settings {
  sirket?: SirketBilgileri;
  theme?: {
    primaryColor?: string;
    darkMode?: boolean;
    fontSize?: string;
  };
}

export default function SirketPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>({ sirket: {} });
  const [sirket, setSirket] = useState<SirketBilgileri>({});

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    loadSettings();
  }, [user, router]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setSirket(data.sirket || {});
      }
    } catch (error) {
      console.error('Ayarlar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          sirket,
        }),
      });
      alert('Şirket bilgileri kaydedildi.');
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      alert('Bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof SirketBilgileri, value: string) => {
    setSirket((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        Yükleniyor...
      </div>
    );
  }

  const formField = (
    label: string,
    field: keyof SirketBilgileri,
    type: 'text' | 'email' | 'tel' | 'url' = 'text',
    placeholder?: string,
    icon?: string
  ) => (
    <div key={field}>
      <label
        style={{
          display: 'block',
          marginBottom: 'var(--space-xs)',
          fontSize: '0.85rem',
          fontWeight: 500,
          color: 'var(--color-text-muted)',
        }}
      >
        {icon && <span style={{ marginRight: 'var(--space-xs)' }}>{icon}</span>}
        {label}
      </label>
      <input
        type={type}
        value={sirket[field] || ''}
        onChange={(e) => handleChange(field, e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: 'var(--space-sm)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.95rem',
        }}
      />
    </div>
  );

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
              <h1 className="hero-title">Şirket Bilgileri</h1>
              <p className="hero-subtitle">Şirket profil ve iletişim bilgileri</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </header>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 'var(--space-lg)' }}>
        {/* Temel Bilgiler */}
        <div className="surface-panel">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>
            🏢 Temel Bilgiler
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {formField('Şirket Adı', 'adi', 'text', 'Şirketinizin adı', '📛')}
            {formField('Logo URL', 'logo', 'url', 'https://...', '🖼️')}
            {formField('Web Sitesi', 'webSitesi', 'url', 'https://...', '🌐')}
            {formField('Kuruluş Yılı', 'kurulusYili', 'text', '2024', '📅')}
          </div>
        </div>

        {/* İletişim Bilgileri */}
        <div className="surface-panel">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>
            📞 İletişim Bilgileri
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {formField('Telefon', 'tel', 'tel', '+90 216 555 0000', '📱')}
            {formField('E-posta', 'email', 'email', 'info@ornek.com', '✉️')}
            {formField(
              'Adres',
              'adres',
              'text',
              'Mahalle, Sokak No, İlçe, İl',
              '📍'
            )}
          </div>
        </div>

        {/* Vergi Bilgileri */}
        <div className="surface-panel">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>
            💰 Vergi Bilgileri
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {formField('Vergi No', 'vergiNo', 'text', '1234567890', '🔢')}
            {formField('Vergi Dairesi', 'vergiDairesi', 'text', 'Vergi Dairesi Adı', '🏛️')}
          </div>
        </div>
      </div>

      {/* Önizleme */}
      <div className="surface-panel" style={{ marginTop: 'var(--space-lg)' }}>
        <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>
          👁️ Önizleme
        </h3>
        <div
          style={{
            padding: 'var(--space-lg)',
            background: 'var(--color-bg-subtle)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
          }}
        >
          {sirket.logo && (
            <img
              src={sirket.logo}
              alt="Şirket Logosu"
              style={{
                maxWidth: '150px',
                maxHeight: '80px',
                objectFit: 'contain',
                marginBottom: 'var(--space-md)',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <h2 style={{ margin: '0 0 var(--space-xs) 0', fontSize: '1.5rem' }}>
            {sirket.adi || 'Şirket Adı'}
          </h2>
          {sirket.adres && (
            <p style={{ color: 'var(--color-text-muted)', margin: 'var(--space-xs) 0' }}>
              {sirket.adres}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-sm)', flexWrap: 'wrap' }}>
            {sirket.tel && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                📱 {sirket.tel}
              </span>
            )}
            {sirket.email && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                ✉️ {sirket.email}
              </span>
            )}
            {sirket.webSitesi && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                🌐 {sirket.webSitesi}
              </span>
            )}
          </div>
          {(sirket.vergiNo || sirket.vergiDairesi) && (
            <div style={{ marginTop: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {sirket.vergiNo && <span>Vergi No: {sirket.vergiNo}</span>}
              {sirket.vergiNo && sirket.vergiDairesi && ' | '}
              {sirket.vergiDairesi && <span>Vergi Dairesi: {sirket.vergiDairesi}</span>}
            </div>
          )}
        </div>
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
        <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.9rem' }}>
          Şirket bilgileri fatura, rapor ve dokümanlarda kullanılacaktır.
          Değişiklikleri kaydetmek için sağ üstteki "Kaydet" butonuna tıklayın.
        </p>
      </div>
    </div>
  );
}

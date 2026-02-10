'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Settings {
  theme: {
    primaryColor: string;
    darkMode: boolean;
    fontSize: string;
  };
}

const colorOptions = [
  { name: 'Mavi', value: '#3b82f6' },
  { name: 'Mor', value: '#8b5cf6' },
  { name: 'Yeşil', value: '#22c55e' },
  { name: 'Kırmızı', value: '#ef4444' },
  { name: 'Turuncu', value: '#f59e0b' },
  { name: 'Pembe', value: '#ec4899' },
  { name: 'Turkuaz', value: '#14b8a6' },
];

export default function TemaAyarlariPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser || JSON.parse(storedUser).rol !== 'admin') {
      router.push('/login');
      return;
    }
    loadSettings();
  }, [router]);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
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
        body: JSON.stringify(settings),
      });
      alert('Ayarlar kaydedildi.');
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>Yükleniyor...</div>;
  }

  return (
    <div className="animate-fade-in">
      <header className="hero-panel" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="hero-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <Link href="/ayarlar" className="btn btn-secondary" style={{ padding: 'var(--space-xs) var(--space-sm)' }}>
              ←
            </Link>
            <div>
              <h1 className="hero-title">Tema Ayarları</h1>
              <p className="hero-subtitle">Görsel özelleştirmeler</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </header>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
        <div className="surface-panel">
          <h3 className="card-title">Ana Renk</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-md)' }}>
            Uygulamanın ana vurgu rengi
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
            {colorOptions.map((color) => (
              <button
                key={color.value}
                onClick={() =>
                  setSettings({
                    ...settings,
                    theme: { ...settings.theme, primaryColor: color.value },
                  })
                }
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  background: color.value,
                  border: settings.theme.primaryColor === color.value ? '2px solid white' : 'none',
                  cursor: 'pointer',
                  boxShadow: settings.theme.primaryColor === color.value ? `0 0 0 2px ${color.value}` : 'none',
                }}
                title={color.name}
              />
            ))}
          </div>
          <div style={{ marginTop: 'var(--space-md)' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Özel renk:</label>
            <input
              type="color"
              value={settings.theme.primaryColor}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  theme: { ...settings.theme, primaryColor: e.target.value },
                })
              }
              style={{ marginLeft: 'var(--space-sm)', cursor: 'pointer' }}
            />
          </div>
        </div>

        <div className="surface-panel">
          <h3 className="card-title">Karanlık Mod</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-md)' }}>
            Arayüz teması
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button
              onClick={() =>
                setSettings({
                  ...settings,
                  theme: { ...settings.theme, darkMode: true },
                })
              }
              className={settings.theme.darkMode ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ flex: 1 }}
            >
              Karanlık
            </button>
            <button
              onClick={() =>
                setSettings({
                  ...settings,
                  theme: { ...settings.theme, darkMode: false },
                })
              }
              className={!settings.theme.darkMode ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ flex: 1 }}
            >
              Aydınlık
            </button>
          </div>
        </div>

        <div className="surface-panel">
          <h3 className="card-title">Yazı Boyutu</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-md)' }}>
            Genel yazı boyutu
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            {['small', 'medium', 'large'].map((size) => (
              <button
                key={size}
                onClick={() =>
                  setSettings({
                    ...settings,
                    theme: { ...settings.theme, fontSize: size },
                  })
                }
                className={settings.theme.fontSize === size ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ flex: 1 }}
              >
                {size === 'small' ? 'Küçük' : size === 'large' ? 'Büyük' : 'Normal'}
              </button>
            ))}
          </div>
        </div>

        <div className="surface-panel" style={{ borderLeft: `3px solid ${settings.theme.primaryColor}` }}>
          <h3 className="card-title">Önizleme</h3>
          <div
            style={{
              padding: 'var(--space-md)',
              background: settings.theme.darkMode ? '#1a1a2e' : '#f8fafc',
              borderRadius: 'var(--radius-md)',
              color: settings.theme.darkMode ? '#e2e8f0' : '#1e293b',
            }}
          >
            <div
              style={{
                padding: 'var(--space-xs) var(--space-sm)',
                background: settings.theme.primaryColor,
                color: 'white',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 'var(--space-sm)',
                display: 'inline-block',
              }}
            >
              Örnek Buton
            </div>
            <p style={{ margin: 0 }}>Seçtiğiniz ayarların kısa önizlemesi.</p>
          </div>
        </div>
      </div>
    </div>
  );
}


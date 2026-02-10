'use client';

import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div className="hero-panel" style={{ maxWidth: '540px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔒</div>
        <h1 style={{ fontSize: '30px', fontWeight: 700, marginBottom: '12px' }}>Yetkisiz Erişim</h1>
        <p style={{ fontSize: '15px', color: '#c6d8e8', marginBottom: '28px', lineHeight: 1.6 }}>
          Bu sayfaya erişim yetkiniz bulunmuyor. Lütfen yöneticinizle iletişime geçin veya ana sayfaya dönün.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="btn btn-primary">
            Ana Sayfaya Dön
          </Link>
          <button onClick={() => window.history.back()} className="btn btn-secondary">
            Geri Dön
          </button>
        </div>

        <p style={{ marginTop: '24px', fontSize: '13px', color: '#9fb6c9' }}>
          Sorun devam ediyorsa:{' '}
          <a href="mailto:support@servicepro.com" style={{ color: 'var(--color-primary-light)', textDecoration: 'none' }}>
            support@servicepro.com
          </a>
        </p>
      </div>
    </div>
  );
}


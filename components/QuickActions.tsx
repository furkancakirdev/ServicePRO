'use client';

import Link from 'next/link';

const actions = [
    { href: '/servisler/yeni', icon: 'â•', label: 'Yeni Servis Ekle', color: 'var(--color-primary)' },
    { href: '/raporlar/whatsapp', icon: 'ğŸ“¤', label: 'WhatsApp Rapor', color: 'var(--color-success)' },
    { href: '/deger', icon: 'â­', label: 'AylÄ±k DeÄŸerlendirme', color: 'var(--color-accent-gold)' },
];

export default function QuickActions() {
    return (
        <div className="card">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>
                HÄ±zlÄ± Ä°ÅŸlemler
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {actions.map((action, i) => (
                    <Link
                        key={i}
                        href={action.href}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-sm)',
                            padding: 'var(--space-sm) var(--space-md)',
                            background: 'var(--color-bg)',
                            borderRadius: 'var(--radius-md)',
                            textDecoration: 'none',
                            color: 'var(--color-text)',
                            transition: 'all var(--transition-fast)',
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = action.color;
                            e.currentTarget.style.color = 'white';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'var(--color-bg)';
                            e.currentTarget.style.color = 'var(--color-text)';
                        }}
                    >
                        <span style={{ fontSize: '1.2rem' }}>{action.icon}</span>
                        <span style={{ fontWeight: 500 }}>{action.label}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}


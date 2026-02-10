'use client';

import Link from 'next/link';

interface Performer {
    id: string;
    ad: string;
    puan: number;
    servisSayisi: number;
    rozet?: 'ALTIN' | 'GUMUS' | 'BRONZ';
}

// Mock data
const mockPerformers: Performer[] = [
    { id: '1', ad: 'İbrahim Yayalık', puan: 94, servisSayisi: 28, rozet: 'ALTIN' },
    { id: '2', ad: 'Alican Yaylalı', puan: 91, servisSayisi: 24, rozet: 'GUMUS' },
    { id: '3', ad: 'Mehmet Güven', puan: 88, servisSayisi: 26, rozet: 'BRONZ' },
];

const rozetConfig = {
    ALTIN: { emoji: '🥇', color: '#fbbf24' },
    GUMUS: { emoji: '🥈', color: '#9ca3af' },
    BRONZ: { emoji: '🥉', color: '#d97706' },
};

export default function TopPerformers() {
    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">🏆 Bu Ay En İyiler</h3>
                <Link href="/puanlama" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Detay →
                </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {mockPerformers.map((p, index) => (
                    <div
                        key={p.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-md)',
                            padding: 'var(--space-sm)',
                            borderRadius: 'var(--radius-md)',
                            background: index === 0 ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 'var(--color-bg)',
                        }}
                    >
                        <div style={{
                            fontSize: '1.5rem',
                            width: '40px',
                            textAlign: 'center',
                        }}>
                            {p.rozet ? rozetConfig[p.rozet].emoji : `${index + 1}.`}
                        </div>

                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                                {p.ad}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                {p.servisSayisi} servis
                            </div>
                        </div>

                        <div style={{
                            fontWeight: 700,
                            fontSize: '1.1rem',
                            color: 'var(--color-primary)',
                        }}>
                            {p.puan}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

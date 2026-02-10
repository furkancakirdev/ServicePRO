'use client';

import { useState } from 'react';
import { ParcaBekleme } from '@/types';

interface PartsSidebarProps {
    tekneAdi: string;
    initialParcalar?: ParcaBekleme[];
    initialNot?: string;
    isOpen: boolean;
    onClose: () => void;
    onSave: (parcalar: ParcaBekleme[], taseronNotu: string) => void;
}

export default function PartsSidebar({
    tekneAdi,
    initialParcalar = [],
    initialNot = '',
    isOpen,
    onClose,
    onSave,
}: PartsSidebarProps) {
    const [parcalar, setParcalar] = useState<ParcaBekleme[]>(
        initialParcalar.length > 0 ? initialParcalar : [{ parcaAdi: '', miktar: 1 }]
    );
    const [taseronNotu, setTaseronNotu] = useState(initialNot);

    if (!isOpen) return null;

    const addParca = () => {
        setParcalar([...parcalar, { parcaAdi: '', miktar: 1 }]);
    };

    const removeParca = (index: number) => {
        setParcalar(parcalar.filter((_, i) => i !== index));
    };

    const updateParca = (index: number, field: keyof ParcaBekleme, value: string | number) => {
        const updated = [...parcalar];
        updated[index] = { ...updated[index], [field]: value };
        setParcalar(updated);
    };

    const handleSave = () => {
        const validParcalar = parcalar.filter(p => p.parcaAdi.trim() !== '');
        onSave(validParcalar, taseronNotu);
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: 200,
                }}
            />

            {/* Sidebar */}
            <div style={{
                position: 'fixed',
                right: 0,
                top: 0,
                bottom: 0,
                width: '450px',
                background: 'var(--color-surface)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 201,
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideIn 0.3s ease',
            }}>
                {/* Header */}
                <div style={{
                    padding: 'var(--space-lg)',
                    borderBottom: '1px solid var(--color-border)',
                    background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                    color: 'white',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>📦 Beklenen Parçalar</h2>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: 'var(--radius-full)',
                                width: '32px',
                                height: '32px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '1.2rem',
                            }}
                        >
                            ×
                        </button>
                    </div>
                    <div style={{ marginTop: 'var(--space-sm)', opacity: 0.9 }}>
                        {tekneAdi}
                    </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-lg)' }}>
                    {/* Parça Listesi */}
                    <div style={{ marginBottom: 'var(--space-lg)' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 'var(--space-md)',
                        }}>
                            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                PARÇA LİSTESİ
                            </h3>
                            <button
                                onClick={addParca}
                                style={{
                                    background: 'var(--color-primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '4px 8px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                }}
                            >
                                + Parça Ekle
                            </button>
                        </div>

                        {parcalar.map((parca, index) => (
                            <div
                                key={index}
                                style={{
                                    background: 'var(--color-bg)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: 'var(--space-md)',
                                    marginBottom: 'var(--space-sm)',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                        Parça #{index + 1}
                                    </span>
                                    {parcalar.length > 1 && (
                                        <button
                                            onClick={() => removeParca(index)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--color-error)',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                            }}
                                        >
                                            Kaldır
                                        </button>
                                    )}
                                </div>

                                <input
                                    type="text"
                                    placeholder="Parça adı..."
                                    value={parca.parcaAdi}
                                    onChange={(e) => updateParca(index, 'parcaAdi', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: 'var(--space-sm)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-sm)',
                                        marginBottom: 'var(--space-sm)',
                                    }}
                                />

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Miktar</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={parca.miktar}
                                            onChange={(e) => updateParca(index, 'miktar', parseInt(e.target.value) || 1)}
                                            style={{
                                                width: '100%',
                                                padding: 'var(--space-xs)',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: 'var(--radius-sm)',
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Tedarikçi</label>
                                        <input
                                            type="text"
                                            placeholder="Firma adı"
                                            value={parca.tedarikci || ''}
                                            onChange={(e) => updateParca(index, 'tedarikci', e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: 'var(--space-xs)',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: 'var(--radius-sm)',
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginTop: 'var(--space-sm)' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Beklenen Tarih</label>
                                    <input
                                        type="date"
                                        value={parca.beklenenTarih || ''}
                                        onChange={(e) => updateParca(index, 'beklenenTarih', e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--space-xs)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-sm)',
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Taşeron Notları */}
                    <div>
                        <h3 style={{ marginBottom: 'var(--space-sm)', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                            TAŞERON NOTLARI
                        </h3>
                        <textarea
                            value={taseronNotu}
                            onChange={(e) => setTaseronNotu(e.target.value)}
                            placeholder="Hangi firmaya gönderildi, ne zaman dönecek, iletişim bilgileri vs..."
                            style={{
                                width: '100%',
                                padding: 'var(--space-sm)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                minHeight: '120px',
                                resize: 'vertical',
                            }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: 'var(--space-lg)',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    gap: 'var(--space-sm)',
                }}>
                    <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
                        İptal
                    </button>
                    <button className="btn btn-primary" onClick={handleSave} style={{ flex: 2 }}>
                        💾 Kaydet
                    </button>
                </div>
            </div>

            <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
        </>
    );
}

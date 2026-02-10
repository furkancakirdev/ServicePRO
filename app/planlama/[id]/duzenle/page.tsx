'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    IsTuru, IS_TURU_CONFIG, ServisDurumu, DURUM_CONFIG, YETKILI_LISTESI
} from '@/types';

// Mock personnel
const personnel = [
    { id: '1', ad: 'Ali Can Yaylalı', unvan: 'cirak' },
    { id: '2', ad: 'Alican Yaylalı', unvan: 'usta' },
    { id: '3', ad: 'Batuhan Çoban', unvan: 'cirak' },
    { id: '4', ad: 'Cüneyt Yaylalı', unvan: 'usta' },
    { id: '5', ad: 'İbrahim Yayalık', unvan: 'usta' },
    { id: '6', ad: 'Mehmet Güven', unvan: 'usta' },
    { id: '7', ad: 'Sercan Sarız', unvan: 'usta' },
];

// Mock service data
const mockService = {
    id: '2735',
    tarih: '2026-01-14',
    saat: '09:30',
    tekneAdi: 'S/Y DAISY DAISY',
    adres: 'NETSEL',
    yer: 'ALBATROS',
    servisAciklamasi: 'YANMAR SD60 KÖRÜK + ÜST GRUP SERVİSİ',
    irtibatKisi: 'EMRE ÖZKUL',
    telefon: '0 533 276 65 99',
    isTuru: 'paket' as IsTuru,
    durum: 'DEVAM_EDIYOR' as ServisDurumu,
    sorumluId: '6',
    destekId: '',
    ofisYetkilisi: 'Furkan Çakır',
};

export default function ServisDuzenlePage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        ...mockService,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // TODO: API call
        console.log('Updated form data:', formData);

        await new Promise(resolve => setTimeout(resolve, 1000));
        router.push('/planlama');
    };

    return (
        <div className="animate-fade-in">
            <header className="hero-panel" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="hero-content">
                    <h1 className="hero-title">Servis Düzenle</h1>
                    <span style={{
                        padding: 'var(--space-sm) var(--space-md)',
                        background: DURUM_CONFIG[formData.durum].bgColor,
                        color: DURUM_CONFIG[formData.durum].color,
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 600,
                    }}>
                        {DURUM_CONFIG[formData.durum].icon} {DURUM_CONFIG[formData.durum].label}
                    </span>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="surface-panel" style={{ maxWidth: '900px' }}>
                <div className="grid grid-cols-2" style={{ gap: 'var(--space-lg)' }}>
                    {/* Tarih & Saat */}
                    <div className="form-group">
                        <label className="form-label">Tarih *</label>
                        <input
                            type="date"
                            className="form-input"
                            required
                            value={formData.tarih}
                            onChange={(e) => setFormData({ ...formData, tarih: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Saat</label>
                        <input
                            type="time"
                            className="form-input"
                            value={formData.saat}
                            onChange={(e) => setFormData({ ...formData, saat: e.target.value })}
                        />
                    </div>

                    {/* Tekne */}
                    <div className="form-group">
                        <label className="form-label">Tekne Adı *</label>
                        <input
                            type="text"
                            className="form-input"
                            required
                            value={formData.tekneAdi}
                            onChange={(e) => setFormData({ ...formData, tekneAdi: e.target.value })}
                        />
                    </div>

                    {/* İş Tipi */}
                    <div className="form-group">
                        <label className="form-label">İş Tipi *</label>
                        <select
                            className="form-select"
                            required
                            value={formData.isTuru}
                            onChange={(e) => setFormData({ ...formData, isTuru: e.target.value as IsTuru })}
                        >
                            {Object.entries(IS_TURU_CONFIG).map(([key, config]) => (
                                <option key={key} value={key}>
                                    {config.label} (×{config.carpan})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Konum */}
                    <div className="form-group">
                        <label className="form-label">Adres *</label>
                        <input
                            type="text"
                            className="form-input"
                            required
                            value={formData.adres}
                            onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Yer (Detay)</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.yer}
                            onChange={(e) => setFormData({ ...formData, yer: e.target.value })}
                        />
                    </div>

                    {/* İletişim */}
                    <div className="form-group">
                        <label className="form-label">İrtibat Kişi</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.irtibatKisi}
                            onChange={(e) => setFormData({ ...formData, irtibatKisi: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Telefon</label>
                        <input
                            type="tel"
                            className="form-input"
                            value={formData.telefon}
                            onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                        />
                    </div>

                    {/* Personel Atama */}
                    <div className="form-group">
                        <label className="form-label">Sorumlu Personel *</label>
                        <select
                            className="form-select"
                            required
                            value={formData.sorumluId}
                            onChange={(e) => setFormData({ ...formData, sorumluId: e.target.value })}
                        >
                            <option value="">Seçiniz...</option>
                            {personnel.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.ad} ({p.unvan})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Destek Personel</label>
                        <select
                            className="form-select"
                            value={formData.destekId}
                            onChange={(e) => setFormData({ ...formData, destekId: e.target.value })}
                        >
                            <option value="">Yok</option>
                            {personnel.filter(p => p.id !== formData.sorumluId).map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.ad} ({p.unvan})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Ofis Yetkilisi */}
                    <div className="form-group">
                        <label className="form-label">Ofis Yetkilisi (Takip Eden)</label>
                        <select
                            className="form-select"
                            value={formData.ofisYetkilisi}
                            onChange={(e) => setFormData({ ...formData, ofisYetkilisi: e.target.value })}
                        >
                            <option value="">Seçiniz...</option>
                            {YETKILI_LISTESI.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    {/* Durum */}
                    <div className="form-group">
                        <label className="form-label">Durum</label>
                        <select
                            className="form-select"
                            value={formData.durum}
                            onChange={(e) => setFormData({ ...formData, durum: e.target.value as ServisDurumu })}
                        >
                            {Object.entries(DURUM_CONFIG).map(([key, config]) => (
                                <option key={key} value={key}>
                                    {config.icon} {config.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Servis Açıklaması */}
                <div className="form-group" style={{ marginTop: 'var(--space-lg)' }}>
                    <label className="form-label">Servis Açıklaması *</label>
                    <textarea
                        className="form-textarea"
                        required
                        rows={4}
                        value={formData.servisAciklamasi}
                        onChange={(e) => setFormData({ ...formData, servisAciklamasi: e.target.value })}
                    />
                </div>

                {/* Submit */}
                <div style={{
                    display: 'flex',
                    gap: 'var(--space-md)',
                    marginTop: 'var(--space-xl)',
                    justifyContent: 'flex-end',
                }}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => router.back()}
                    >
                        İptal
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Kaydediliyor...' : '✓ Değişiklikleri Kaydet'}
                    </button>
                </div>
            </form>
        </div>
    );
}





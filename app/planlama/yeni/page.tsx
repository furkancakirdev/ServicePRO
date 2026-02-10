'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IsTuru, IS_TURU_CONFIG, ServisDurumu, DURUM_CONFIG } from '@/types';

// Mock personnel data
const personnel = [
    { id: '1', ad: 'Ali Can Yaylalı' },
    { id: '2', ad: 'Alican Yaylalı' },
    { id: '3', ad: 'Batuhan Çoban' },
    { id: '4', ad: 'Berkay Yalınkaya' },
    { id: '5', ad: 'Cüneyt Yaylalı' },
    { id: '6', ad: 'Emre Kaya' },
    { id: '7', ad: 'Erhan Turhan' },
    { id: '8', ad: 'Halil İbrahim Duru' },
    { id: '9', ad: 'İbrahim Yayalık' },
    { id: '10', ad: 'İbrahim Yaylalı' },
    { id: '11', ad: 'Mehmet Bacak' },
    { id: '12', ad: 'Mehmet Güven' },
    { id: '13', ad: 'Melih Çoban' },
    { id: '14', ad: 'Muhammed Bacak' },
    { id: '15', ad: 'Ömer Büdan' },
    { id: '16', ad: 'Sercan Sarız' },
    { id: '17', ad: 'Volkan Özkan' },
];

export default function YeniServisPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        tarih: new Date().toISOString().split('T')[0],
        saat: '',
        tekneAdi: '',
        adres: '',
        yer: '',
        servisAciklamasi: '',
        irtibatKisi: '',
        telefon: '',
        isTuru: 'paket' as IsTuru,
        durum: 'DEVAM_EDIYOR' as ServisDurumu,
        sorumluId: '',
        destekId: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // TODO: API call
        console.log('Form data:', formData);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        router.push('/planlama');
    };

    return (
        <div className="animate-fade-in">
            <header className="hero-panel" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="hero-content">
                    <h1 className="hero-title">Yeni Servis Ekle</h1>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="surface-panel" style={{ maxWidth: '800px' }}>
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
                            placeholder="Örn: S/Y BELLA BLUE"
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
                            placeholder="Örn: NETSEL, YATMARİN, BOZBURUN"
                            value={formData.adres}
                            onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Yer (Detay)</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Örn: L Pontonu, Kara, DSV Marina"
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
                            placeholder="Kaptan / Yetkili adı"
                            value={formData.irtibatKisi}
                            onChange={(e) => setFormData({ ...formData, irtibatKisi: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Telefon</label>
                        <input
                            type="tel"
                            className="form-input"
                            placeholder="+90 5XX XXX XX XX"
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
                                <option key={p.id} value={p.id}>{p.ad}</option>
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
                                <option key={p.id} value={p.id}>{p.ad}</option>
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
                        placeholder="Yapılacak işin detaylı açıklaması..."
                        value={formData.servisAciklamasi}
                        onChange={(e) => setFormData({ ...formData, servisAciklamasi: e.target.value })}
                    />
                </div>

                {/* Durum */}
                <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                    <label className="form-label">Başlangıç Durumu</label>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                        {Object.entries(DURUM_CONFIG).map(([key, config]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setFormData({ ...formData, durum: key as ServisDurumu })}
                                style={{
                                    padding: 'var(--space-sm) var(--space-md)',
                                    borderRadius: 'var(--radius-md)',
                                    border: formData.durum === key ? `2px solid ${config.color}` : '1px solid var(--color-border)',
                                    background: formData.durum === key ? config.bgColor : 'white',
                                    color: config.color,
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                }}
                            >
                                {config.icon} {config.label}
                            </button>
                        ))}
                    </div>
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
                        {isSubmitting ? 'Kaydediliyor...' : '✓ Servisi Kaydet'}
                    </button>
                </div>
            </form>
        </div>
    );
}





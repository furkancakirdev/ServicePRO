'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IsTuru, IS_TURU_CONFIG, RAPOR_GEREKSINIMLERI, KapanisRaporu } from '@/types';
import { hesaplaRaporBasarisi, hesaplaBireyselPuan } from '@/lib/scoring-calculator';

type RaporAlanKey = keyof Omit<KapanisRaporu, 'aciklama' | 'raporlayanPersonel' | 'raporTarihi'>;

// Mock service data
const mockService = {
    id: '2735',
    tekneAdi: 'S/Y DAISY DAISY',
    servisAciklamasi: 'YANMAR SD60 KÖRÜK + ÜST GRUP SERVİSİ',
    isTuru: 'paket' as IsTuru,
    atananPersonel: [
        { personnelId: '1', personnelAd: 'Mehmet Güven', rol: 'sorumlu' as const },
        { personnelId: '2', personnelAd: 'Sercan Sarız', rol: 'destek' as const },
    ],
};

const raporAlanlari: { key: RaporAlanKey; label: string }[] = [
    { key: 'uniteBilgileri', label: 'Ünite Bilgileri (Seri No, Model vb.) girildi mi?' },
    { key: 'fotograf', label: 'Fotoğraf (Öncesi/Sonrası) eklendi mi?' },
    { key: 'tekneKonum', label: 'Tekne/Konum bilgisi doğru mu?' },
    { key: 'sarfMalzeme', label: 'Sarf Malzeme yazıldı mı?' },
    { key: 'adamSaat', label: 'Adam/Saat girildi mi?' },
    { key: 'taseronBilgisi', label: 'Taşeron bilgisi var mı?' },
    { key: 'stokMalzeme', label: 'Stok Malzeme kaydedildi mi?' },
];

const puanDisiAlanlar: { key: 'saatiOlmayanUnitePuanDisi' | 'adamSaatUygulanmazPuanDisi'; label: string; conditionField?: RaporAlanKey }[] = [
    {
        key: 'saatiOlmayanUnitePuanDisi',
        label: 'Saati olmayan ünite (puan dışı)',
        conditionField: 'uniteBilgileri',
    },
    {
        key: 'adamSaatUygulanmazPuanDisi',
        label: 'Adam/saat uygulanmaz (puan dışı)',
        conditionField: 'adamSaat',
    },
];

export default function KapanisRaporPage() {
    const router = useRouter();

    const gerekliAlanlar = RAPOR_GEREKSINIMLERI[mockService.isTuru];

    const [rapor, setRapor] = useState<KapanisRaporu>({
        uniteBilgileri: false,
        fotograf: false,
        tekneKonum: false,
        sarfMalzeme: false,
        adamSaat: false,
        taseronBilgisi: false,
        stokMalzeme: false,
        saatiOlmayanUnitePuanDisi: false,
        adamSaatUygulanmazPuanDisi: false,
        aciklama: '',
        raporlayanPersonel: mockService.atananPersonel[0]?.personnelAd || '',
        raporTarihi: new Date().toISOString().split('T')[0],
    });

    const raporBasarisi = hesaplaRaporBasarisi(rapor, mockService.isTuru);
    const sorumlPuan = hesaplaBireyselPuan(raporBasarisi, mockService.isTuru, 'sorumlu', false);
    const destekPuan = hesaplaBireyselPuan(1, mockService.isTuru, 'destek', false);

    const handleSubmit = async () => {
        // TODO: API call
        console.log('Rapor:', rapor);
        console.log('Başarı:', raporBasarisi, 'Sorumlu Puan:', sorumlPuan.finalPuan);
        router.push('/servisler');
    };

    return (
        <div className="animate-fade-in">
            <header className="hero-panel" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="hero-content">
                    <div>
                        <h1 className="hero-title">Servis Kapanış Raporu</h1>
                        <p className="hero-subtitle">
                            {mockService.tekneAdi} - {mockService.servisAciklamasi}
                        </p>
                    </div>
                    <span style={{
                        padding: 'var(--space-sm) var(--space-md)',
                        background: 'var(--color-accent-gold)',
                        color: 'white',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 600,
                    }}>
                        {IS_TURU_CONFIG[mockService.isTuru].label}
                    </span>
                </div>
            </header>

            <div className="grid" style={{ gridTemplateColumns: '1fr 350px', gap: 'var(--space-xl)' }}>
                {/* Form */}
                <div className="surface-panel">
                    <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>
                        Rapor Kontrol Listesi
                    </h3>

                    {raporAlanlari.map((alan, index) => {
                        const key = alan.key;
                        const isGerekli = gerekliAlanlar.includes(alan.key);
                        const isChecked = rapor[key] === true;

                        return (
                            <div
                                key={alan.key}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-md)',
                                    padding: 'var(--space-md)',
                                    background: index % 2 === 0 ? 'var(--color-bg)' : 'transparent',
                                    borderRadius: 'var(--radius-md)',
                                    opacity: isGerekli ? 1 : 0.5,
                                }}
                            >
                                <button
                                    onClick={() => isGerekli && setRapor({ ...rapor, [key]: !isChecked })}
                                    disabled={!isGerekli}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: isChecked
                                            ? '2px solid var(--color-success)'
                                            : '2px solid var(--color-border)',
                                        background: isChecked ? 'var(--color-success)' : 'white',
                                        color: 'white',
                                        fontSize: '1.2rem',
                                        cursor: isGerekli ? 'pointer' : 'not-allowed',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {isChecked ? '✓' : ''}
                                </button>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 500 }}>{alan.label}</div>
                                    {!isGerekli && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                            Bu iş tipi için gerekli değil
                                        </div>
                                    )}
                                </div>
                                {isGerekli && (
                                    <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: 'var(--color-error)',
                                    }}>
                                        ZORUNLU
                                    </span>
                                )}
                            </div>
                        );
                    })}

                    {/* Puan Dışı Alanlar */}
                    <div style={{ marginTop: 'var(--space-xl)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--color-border)' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>
                            Puan Dışı Seçenekler
                        </h4>
                        {puanDisiAlanlar.map((alan) => {
                            const isChecked = rapor[alan.key] === true;
                            const conditionMet = !alan.conditionField || rapor[alan.conditionField] === false;
                            const isEnabled = !alan.conditionField || !rapor[alan.conditionField];

                            return (
                                <div
                                    key={alan.key}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-md)',
                                        padding: 'var(--space-md)',
                                        background: 'var(--color-surface-elevated)',
                                        borderRadius: 'var(--radius-md)',
                                        marginBottom: 'var(--space-sm)',
                                        opacity: isEnabled ? 1 : 0.5,
                                    }}
                                >
                                    <button
                                        onClick={() => isEnabled && setRapor({ ...rapor, [alan.key]: !isChecked })}
                                        disabled={!isEnabled}
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: 'var(--radius-sm)',
                                            border: isChecked
                                                ? '2px solid var(--color-warning)'
                                                : '2px solid var(--color-border)',
                                            background: isChecked ? 'var(--color-warning)' : 'white',
                                            color: 'white',
                                            fontSize: '1.2rem',
                                            cursor: isEnabled ? 'pointer' : 'not-allowed',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {isChecked ? '✓' : ''}
                                    </button>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 500 }}>{alan.label}</div>
                                        {isEnabled && alan.conditionField && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-warning)' }}>
                                                Bu işlemin puanlamaya dahil edilmeyeceğini onaylıyorsunuz
                                            </div>
                                        )}
                                        {!isEnabled && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                İlgili alan işaretlendiği için kullanılamaz
                                            </div>
                                        )}
                                    </div>
                                    <span style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        color: 'var(--color-warning)',
                                        background: 'rgba(245, 158, 11, 0.1)',
                                        padding: '2px 8px',
                                        borderRadius: 'var(--radius-sm)',
                                    }}>
                                        PUAN DIŞI
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Açıklama */}
                    <div className="form-group" style={{ marginTop: 'var(--space-xl)' }}>
                        <label className="form-label">Servis Notu / Açıklama</label>
                        <textarea
                            className="form-textarea"
                            rows={4}
                            placeholder="Yapılan işle ilgili notlar, öneriler veya müşteriye iletilen bilgiler..."
                            value={rapor.aciklama}
                            onChange={(e) => setRapor({ ...rapor, aciklama: e.target.value })}
                        />
                    </div>

                    {/* Submit */}
                    <div style={{
                        display: 'flex',
                        gap: 'var(--space-md)',
                        justifyContent: 'flex-end',
                        marginTop: 'var(--space-xl)',
                    }}>
                        <button className="btn btn-secondary" onClick={() => router.back()}>
                            İptal
                        </button>
                        <button className="btn btn-success" onClick={handleSubmit}>
                            ✓ Servisi Tamamla
                        </button>
                    </div>
                </div>

                {/* Puan Önizleme */}
                <div>
                    <div className="surface-panel" style={{ marginBottom: 'var(--space-lg)' }}>
                        <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>
                             Puan Hesaplama
                        </h3>

                        <div style={{
                            padding: 'var(--space-lg)',
                            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
                            borderRadius: 'var(--radius-md)',
                            textAlign: 'center',
                            marginBottom: 'var(--space-lg)',
                        }}>
                            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                                Rapor Başarı Oranı
                            </div>
                            <div style={{
                                fontSize: '2.5rem',
                                fontWeight: 700,
                                color: 'white',
                            }}>
                                %{Math.round(raporBasarisi * 100)}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: 'var(--space-sm)',
                                background: 'var(--color-bg)',
                                borderRadius: 'var(--radius-sm)',
                            }}>
                                <span>Zorluk Çarpanı</span>
                                <strong>×{IS_TURU_CONFIG[mockService.isTuru].carpan}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="surface-panel">
                        <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>
                             Personel Puanları
                        </h3>

                        {mockService.atananPersonel.map((p, i) => {
                            const puan = p.rol === 'sorumlu' ? sorumlPuan : destekPuan;
                            return (
                                <div
                                    key={i}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: 'var(--space-md)',
                                        background: 'var(--color-bg)',
                                        borderRadius: 'var(--radius-md)',
                                        marginBottom: 'var(--space-sm)',
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 500 }}>{p.personnelAd}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                            {p.rol === 'sorumlu' ? ' Sorumlu' : ' Destek'}
                                        </div>
                                    </div>
                                    <div style={{
                                        fontSize: '1.5rem',
                                        fontWeight: 700,
                                        color: 'var(--color-success)',
                                    }}>
                                        {puan.finalPuan}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}





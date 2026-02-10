'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import ServisKapanisModal from '@/components/ServisKapanisModal';
import PartsSidebar from '@/components/PartsSidebar';
import { fetchServices, updateService } from '@/lib/api';
import {
    Service, ServisDurumu, DURUM_CONFIG,
    KonumGrubu, KONUM_CONFIG, getKonumGrubu, ParcaBekleme
} from '@/types';

const durumSirasi: ServisDurumu[] = [
    'RANDEVU_VERILDI', 'DEVAM_EDIYOR', 'PARCA_BEKLIYOR',
    'MUSTERI_ONAY_BEKLIYOR', 'RAPOR_BEKLIYOR', 'KESIF_KONTROL', 'TAMAMLANDI'
];

const konumListesi: KonumGrubu[] = ['YATMARIN', 'NETSEL', 'DIS_SERVIS'];

export default function PlanlamaPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [selectedDurumlar, setSelectedDurumlar] = useState<ServisDurumu[]>([
        'RANDEVU_VERILDI', 'DEVAM_EDIYOR', 'PARCA_BEKLIYOR', 'MUSTERI_ONAY_BEKLIYOR', 'RAPOR_BEKLIYOR', 'KESIF_KONTROL'
    ]);
    const [selectedKonumlar, setSelectedKonumlar] = useState<KonumGrubu[]>(['YATMARIN', 'NETSEL', 'DIS_SERVIS']);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'tarih' | 'konum' | 'durum'>('tarih');

    // Sidebar states
    const [completionService, setCompletionService] = useState<Service | null>(null);
    const [partsService, setPartsService] = useState<Service | null>(null);

    useEffect(() => {
        loadServices();
    }, []);

    const loadServices = async () => {
        try {
            const data = await fetchServices();
            setServices(data);
        } catch (error) {
            console.error('Failed to load services:', error);
        }
    };

    const toggleDurum = (durum: ServisDurumu) => {
        setSelectedDurumlar(prev =>
            prev.includes(durum)
                ? prev.filter(d => d !== durum)
                : [...prev, durum]
        );
    };

    const toggleKonum = (konum: KonumGrubu) => {
        setSelectedKonumlar(prev =>
            prev.includes(konum)
                ? prev.filter(k => k !== konum)
                : [...prev, konum]
        );
    };

    const handleDurumChange = async (service: Service, newDurum: ServisDurumu) => {
        if (newDurum === 'TAMAMLANDI') {
            setCompletionService(service);
        } else if (newDurum === 'PARCA_BEKLIYOR') {
            // Optimistic update
            setServices(prev => prev.map(s => s.id === service.id ? { ...s, durum: newDurum } : s));
            setPartsService(service);
            await updateService(service.id, { durum: newDurum });
        } else {
            // Optimistic update
            setServices(prev => prev.map(s => s.id === service.id ? { ...s, durum: newDurum } : s));
            await updateService(service.id, { durum: newDurum });
        }
    };

    const toModalUnvan = (unvan?: string): 'USTA' | 'CIRAK' | 'YONETICI' | 'OFIS' => {
        const normalized = (unvan || '').toLocaleLowerCase('tr-TR');
        if (normalized === 'usta') return 'USTA';
        if (normalized === 'cirak') return 'CIRAK';
        if (normalized === 'yonetici') return 'YONETICI';
        return 'OFIS';
    };

    const toModalRole = (rol: 'sorumlu' | 'destek'): 'SORUMLU' | 'DESTEK' => {
        return rol === 'sorumlu' ? 'SORUMLU' : 'DESTEK';
    };

    const completionModalService = completionService
        ? {
            servisId: completionService.id,
            tekneAdi: completionService.tekneAdi,
            isTuru: completionService.isTuru,
            servisAciklamasi: completionService.servisAciklamasi,
            yer: completionService.yer,
            zorlukSeviyesi: null,
            personeller: completionService.atananPersonel.map((p) => ({
                personelId: p.personnelId,
                personelAd: p.personnelAd,
                rol: toModalRole(p.rol),
                unvan: toModalUnvan(p.unvan),
            })),
        }
        : null;

    const handlePuanlamaKaydet = async (servisId: string, payload: {
        personeller: Array<{ personelId: string; rol: 'SORUMLU' | 'DESTEK' }>;
        bonusPersonelIds: string[];
        kaliteKontrol: {
            uniteModelVar: boolean;
            uniteSaatiVar: boolean;
            uniteSaatiMuaf: boolean;
            uniteSeriNoVar: boolean;
            aciklamaYeterli: boolean;
            adamSaatVar: boolean;
            adamSaatMuaf: boolean;
            fotograflarVar: boolean;
        };
        zorlukOverride: 'RUTIN' | 'ARIZA' | 'PROJE' | null;
    }) => {
        if (completionService) {
            try {
                const res = await fetch(`/api/services/${servisId}/complete`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    throw new Error('Servis tamamlanamadı');
                }

                await loadServices();
                setCompletionService(null);
            } catch (error) {
                console.error('Servis tamamlanma hatası:', error);
                alert('Servis tamamlanırken bir hata oluştu');
            }
        }
    };

    const handlePartsSave = async (parcalar: ParcaBekleme[], taseronNotu: string) => {
        if (partsService) {
            const updated = { bekleyenParcalar: parcalar, taseronNotlari: taseronNotu };
            setServices(prev => prev.map(s =>
                s.id === partsService.id ? { ...s, ...updated } : s
            ));
            await updateService(partsService.id, updated);
        }
    };

    // Filtreleme
    const filteredServices = services.filter(s => {
        const durumMatch = selectedDurumlar.includes(s.durum);
        const konumMatch = selectedKonumlar.includes(getKonumGrubu(s.adres));
        const searchMatch =
            s.tekneAdi.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.servisAciklamasi.toLowerCase().includes(searchQuery.toLowerCase());
        return durumMatch && konumMatch && searchMatch;
    });

    // Sıralama
    const sortedServices = [...filteredServices].sort((a, b) => {
        if (sortBy === 'tarih') return new Date(b.tarih).getTime() - new Date(a.tarih).getTime();
        if (sortBy === 'konum') return getKonumGrubu(a.adres).localeCompare(getKonumGrubu(b.adres));
        if (sortBy === 'durum') return durumSirasi.indexOf(a.durum) - durumSirasi.indexOf(b.durum);
        return 0;
    });

    return (
        <div className="animate-fade-in">
            <header className="hero-panel mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="page-title"> Servis Planlama</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                        {filteredServices.length} / {services.length} servis gösteriliyor
                    </p>
                </div>
                <Link href="/planlama/yeni" className="btn btn-primary">
                    Yeni Servis Ekle
                </Link>
            </header>

            {/* Filtreler */}
            <div className="card surface-panel" style={{ marginBottom: 'var(--space-lg)' }}>
                {/* Arama + Sıralama */}
                <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder=" Tekne adı veya açıklama ara..."
                        className="form-input"
                        style={{ flex: 1, minWidth: '250px' }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <select
                        className="form-select"
                        style={{ width: '150px' }}
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'tarih' | 'konum' | 'durum')}
                    >
                        <option value="tarih">Tarihe Göre</option>
                        <option value="konum">Konuma Göre</option>
                        <option value="durum">Duruma Göre</option>
                    </select>
                </div>

                {/* Durum Filtreleri */}
                <div style={{ marginBottom: 'var(--space-md)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Durum
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                        {durumSirasi.map(durum => (
                            <button
                                key={durum}
                                onClick={() => toggleDurum(durum)}
                                style={{
                                    padding: '4px 10px',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    borderRadius: 'var(--radius-full)',
                                    border: selectedDurumlar.includes(durum)
                                        ? `2px solid ${DURUM_CONFIG[durum].color}`
                                        : '1px solid var(--color-border)',
                                    background: selectedDurumlar.includes(durum) ? DURUM_CONFIG[durum].color : 'transparent',
                                    color: selectedDurumlar.includes(durum) ? 'white' : 'var(--color-text-muted)',
                                    cursor: 'pointer',
                                }}
                            >
                                {DURUM_CONFIG[durum].icon} {DURUM_CONFIG[durum].label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Konum Filtreleri */}
                <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Konum
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                        {konumListesi.map(konum => (
                            <button
                                key={konum}
                                onClick={() => toggleKonum(konum)}
                                style={{
                                    padding: '4px 12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    borderRadius: 'var(--radius-md)',
                                    border: selectedKonumlar.includes(konum)
                                        ? `2px solid ${KONUM_CONFIG[konum].color}`
                                        : '1px solid var(--color-border)',
                                    background: selectedKonumlar.includes(konum) ? KONUM_CONFIG[konum].color : 'transparent',
                                    color: selectedKonumlar.includes(konum) ? 'white' : 'var(--color-text-muted)',
                                    cursor: 'pointer',
                                }}
                            >
                                {KONUM_CONFIG[konum].icon} {KONUM_CONFIG[konum].label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Servis Tablosu */}
            <div className="table-container surface-panel">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Tarih</th>
                            <th>Tekne</th>
                            <th>Konum</th>
                            <th>Servis</th>
                            <th>Durum</th>
                            <th>Sorumlu / Ofis</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedServices.map(service => (
                            <ServiceRow
                                key={service.id}
                                service={service}
                                onDurumChange={(newDurum) => handleDurumChange(service, newDurum)}
                                onPartsClick={() => setPartsService(service)}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            <ServisKapanisModal
                acik={!!completionService}
                onKapat={() => setCompletionService(null)}
                servis={completionModalService}
                onPuanlamaKaydet={handlePuanlamaKaydet}
            />

            <PartsSidebar
                tekneAdi={partsService?.tekneAdi || ''}
                initialParcalar={partsService?.bekleyenParcalar}
                initialNot={partsService?.taseronNotlari}
                isOpen={!!partsService}
                onClose={() => setPartsService(null)}
                onSave={handlePartsSave}
            />
        </div>
    );
}

function ServiceRow({
    service,
    onDurumChange,
    onPartsClick,
}: {
    service: Service;
    onDurumChange: (durum: ServisDurumu) => void;
    onPartsClick: () => void;
}) {
    const [showDurumDropdown, setShowDurumDropdown] = useState(false);
    const konumGrubu = getKonumGrubu(service.adres);

    return (
        <tr>
            <td>
                <div style={{ fontWeight: 600 }}>{service.tarih}</div>
                {service.saat && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)' }}>{service.saat}</div>
                )}
            </td>
            <td>
                <Link href={`/planlama/${service.id}`} style={{ fontWeight: 500, color: 'var(--color-text)', textDecoration: 'none' }}>
                    {service.tekneAdi}
                </Link>
            </td>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: KONUM_CONFIG[konumGrubu].color,
                    }} />
                    <span>{service.adres}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{service.yer}</div>
            </td>
            <td style={{ maxWidth: '250px' }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {service.servisAciklamasi}
                </div>
            </td>
            <td>
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowDurumDropdown(!showDurumDropdown)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                        }}
                    >
                        <StatusBadge durum={service.durum} />
                    </button>

                    {showDurumDropdown && (
                        <>
                            <div
                                onClick={() => setShowDurumDropdown(false)}
                                style={{ position: 'fixed', inset: 0, zIndex: 50 }}
                            />
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                background: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: 'var(--shadow-lg)',
                                zIndex: 51,
                                minWidth: '180px',
                                padding: 'var(--space-xs)',
                            }}>
                                {Object.entries(DURUM_CONFIG).map(([key, config]) => (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            onDurumChange(key as ServisDurumu);
                                            setShowDurumDropdown(false);
                                        }}
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            textAlign: 'left',
                                            padding: 'var(--space-sm)',
                                            border: 'none',
                                            background: service.durum === key ? config.color : 'transparent',
                                            color: service.durum === key ? 'white' : 'var(--color-text)',
                                            cursor: 'pointer',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: '0.8rem',
                                        }}
                                    >
                                        {config.icon} {config.label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {service.durum === 'PARCA_BEKLIYOR' && service.bekleyenParcalar && service.bekleyenParcalar.length > 0 && (
                    <button
                        onClick={onPartsClick}
                        style={{
                            marginTop: '4px',
                            fontSize: '0.65rem',
                            color: 'var(--color-warning)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                        }}
                    >
                        {service.bekleyenParcalar.length} parça bekliyor
                    </button>
                )}
            </td>
            <td>
                <div style={{ fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: 500 }}>
                         {service.atananPersonel.find(p => p.rol === 'sorumlu')?.personnelAd || '-'}
                    </div>
                    {service.ofisYetkilisi && (
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                             {service.ofisYetkilisi}
                        </div>
                    )}
                </div>
            </td>
            <td>
                <Link
                    href={`/planlama/${service.id}/duzenle`}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                >
                    Düzenle
                </Link>
            </td>
        </tr>
    );
}




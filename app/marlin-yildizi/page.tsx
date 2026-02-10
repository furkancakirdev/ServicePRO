'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Personel {
    id: string;
    ad: string;
    unvan: 'usta' | 'cirak' | 'yonetici' | 'ofis';
}

interface Soru {
    id: string;
    key: string;
    label: string;
    aciklama: string;
}

type CevapDeger = 'EVET' | 'KISMEN' | 'HAYIR';

// Puanlama Soruları - ServicePRO.xlsx AYLIK_PERFORMANS sayfasından
const puanlamaSorulari: Soru[] = [
    { id: '1', key: 'uniforme', label: 'Üniforma, Kişisel Bakım ve Marka Temsili', aciklama: 'Personel uygun muydu?' },
    { id: '2', key: 'isg', label: 'İSG Kuralları ve Güvenlik Talimatları', aciklama: 'KKD kullandı mı?' },
    { id: '3', key: 'iletisim', label: 'Müşteri İletişimi', aciklama: 'Saygılı, net ve çözüm odaklı mıydı?' },
    { id: '4', key: 'bildirim', label: 'Plan Değişikliği Bildirimi', aciklama: 'Gecikmelerde zamanında haber verdi mi?' },
    { id: '5', key: 'tespit', label: 'Parça/Ek İş Tespiti', aciklama: 'Doğru tespit edip zamanında bildirdi mi?' },
    { id: '6', key: 'genel', label: 'Genel Saha Performansı', aciklama: 'Bu ayki genel performans nasıldı?' },
];

const cevapSecenekleri: { value: CevapDeger; label: string; color: string; puan: number }[] = [
    { value: 'EVET', label: 'Evet', color: 'var(--color-success)', puan: 100 },
    { value: 'KISMEN', label: 'Kısmen', color: 'var(--color-warning)', puan: 50 },
    { value: 'HAYIR', label: 'Hayır', color: 'var(--color-error)', puan: 0 },
];

export default function MarlinYildiziPage() {
    const [personelList, setPersonelList] = useState<Personel[]>([]);
    const [selectedPersonel, setSelectedPersonel] = useState<string>('');
    const [cevaplar, setCevaplar] = useState<Record<string, CevapDeger>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchPersonel();
    }, []);

    const fetchPersonel = async () => {
        try {
            const res = await fetch('/api/personel');
            if (res.ok) {
                const data = await res.json();
                setPersonelList(data);
            }
        } catch (error) {
            console.error('Personel yüklenemedi:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCevapChange = (soruKey: string, value: CevapDeger) => {
        setCevaplar(prev => ({ ...prev, [soruKey]: value }));
    };

    const calculateTotalScore = () => {
        const answered = Object.values(cevaplar).length;
        if (answered === 0) return 0;

        const total = Object.values(cevaplar).reduce((acc, cevap) => {
            const secenek = cevapSecenekleri.find(s => s.value === cevap);
            return acc + (secenek?.puan || 0);
        }, 0);

        return Math.round(total / puanlamaSorulari.length);
    };

    const handleSubmit = async () => {
        if (!selectedPersonel) {
            toast.error('Lütfen bir personel seçin');
            return;
        }

        const unanswered = puanlamaSorulari.filter(s => !cevaplar[s.key]);
        if (unanswered.length > 0) {
            toast.error('Lütfen tüm soruları yanıtlayın');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/puanlama/kaydet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    personelId: selectedPersonel,
                    cevaplar,
                    toplamPuan: calculateTotalScore(),
                    ay: new Date().toISOString().slice(0, 7),
                }),
            });

            if (res.ok) {
                toast.success('Puanlama kaydedildi');
                setCevaplar({});
                setSelectedPersonel('');
            } else {
                toast.error('Puanlama kaydedilemedi');
            }
        } catch (error) {
            console.error('Kayıt hatası:', error);
            toast.error('Bir hata oluştu');
        } finally {
            setSubmitting(false);
        }
    };

    const selectedPersonelData = personelList.find(p => p.id === selectedPersonel);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-primary)' }} />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div className="hero-panel flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Marlin Yıldızı Puanlama</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Personel performans değerlendirmesi</p>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2">
                    {new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                </Badge>
            </div>

            {/* Personel Seçimi */}
            <Card className="surface-panel">
                <CardHeader>
                    <CardTitle>Personel Seçimi</CardTitle>
                </CardHeader>
                <CardContent>
                    <Select value={selectedPersonel} onValueChange={setSelectedPersonel}>
                        <SelectTrigger className="w-full max-w-md">
                            <SelectValue placeholder="Değerlendirilecek personeli seçin" />
                        </SelectTrigger>
                        <SelectContent>
                            {personelList.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.ad} - <span style={{ color: 'var(--color-text-muted)' }}>{p.unvan}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {selectedPersonelData && (
                        <div className="mt-4 p-4 rounded-lg" style={{ background: 'color-mix(in oklab, var(--color-primary) 14%, var(--color-surface-elevated))' }}>
                            <p className="font-medium">{selectedPersonelData.ad}</p>
                            <Badge variant={selectedPersonelData.unvan === 'usta' ? 'default' : 'secondary'}>
                                {selectedPersonelData.unvan.toUpperCase()}
                            </Badge>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Puanlama Soruları */}
            {selectedPersonel && (
                <Card className="surface-panel">
                    <CardHeader>
                        <CardTitle>Değerlendirme Soruları</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {puanlamaSorulari.map((soru, index) => (
                            <div key={soru.id} className="border-b pb-4 last:border-0">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <p className="font-medium">
                                            {index + 1}. {soru.label}
                                        </p>
                                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{soru.aciklama}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    {cevapSecenekleri.map(secenek => (
                                        <button
                                            key={secenek.value}
                                            onClick={() => handleCevapChange(soru.key, secenek.value)}
                                            className={`px-4 py-2 rounded-lg font-medium transition-all ${cevaplar[soru.key] === secenek.value
                                                    ? 'text-white'
                                                    : ''
                                                }`}
                                            style={
                                                cevaplar[soru.key] === secenek.value
                                                    ? { background: secenek.color }
                                                    : {
                                                        background: 'var(--color-surface-elevated)',
                                                        color: 'var(--color-text)',
                                                        border: '1px solid var(--color-border)',
                                                    }
                                            }
                                        >
                                            {secenek.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Toplam Puan */}
                        <div
                            className="mt-6 p-4 rounded-lg"
                            style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--color-primary) 14%, var(--color-surface-elevated)) 0%, var(--color-surface-elevated) 100%)' }}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-medium">Toplam Puan:</span>
                                <span className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>{calculateTotalScore()}/100</span>
                            </div>
                        </div>

                        {/* Kaydet Butonu */}
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || Object.keys(cevaplar).length !== puanlamaSorulari.length}
                            className="w-full"
                            size="lg"
                        >
                            {submitting ? 'Kaydediliyor...' : '✓ Puanlamayı Kaydet'}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}



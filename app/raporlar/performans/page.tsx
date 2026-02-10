'use client';

// ServicePro - Aylık Performans Raporu Sayfası
// Personel bazlı performans sıralaması ve rozet dağılımı

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Trophy, Medal, Award, Download, Calendar, TrendingUp, User, Star } from 'lucide-react';

interface PerformansData {
    personelId: string;
    personelAd: string;
    unvan: string;
    servisSayisi: number;
    sorumluServis: number;
    destekServis: number;
    toplamPuan: number;
    ortalamaFinalPuan: number;
    bonusSayisi: number;
    siralama: number;
    rozet: 'ALTIN' | 'GUMUS' | 'BRONZ' | null;
}

// Rozet ikonları ve renkleri
const ROZET_CONFIG = {
    ALTIN: { icon: Trophy, color: '#fbbf24', bg: 'color-mix(in oklab, #fbbf24 16%, var(--color-surface-elevated))', label: 'Altın' },
    GUMUS: { icon: Medal, color: '#94a3b8', bg: 'color-mix(in oklab, #94a3b8 16%, var(--color-surface-elevated))', label: 'Gümüş' },
    BRONZ: { icon: Award, color: '#d97706', bg: 'color-mix(in oklab, #d97706 16%, var(--color-surface-elevated))', label: 'Bronz' },
};

export default function PerformansRaporuPage() {
    const [yukleniyor, setYukleniyor] = useState(true);
    const [performanslar, setPerformanslar] = useState<PerformansData[]>([]);
    const [meta, setMeta] = useState<{ ay: string; lokasyon: string; personelSayisi: number; toplamServis: number }>({
        ay: '',
        lokasyon: 'Tümü',
        personelSayisi: 0,
        toplamServis: 0,
    });

    // Filtreler
    const [seciliAy, setSeciliAy] = useState(() => {
        const bugun = new Date();
        return `${bugun.getFullYear()}-${String(bugun.getMonth() + 1).padStart(2, '0')}`;
    });
    const [seciliLokasyon, setSeciliLokasyon] = useState('ALL');

    // Raporları yükle
    useEffect(() => {
        const raporuYukle = async () => {
            setYukleniyor(true);
            try {
                const params = new URLSearchParams({ ay: seciliAy });
                if (seciliLokasyon && seciliLokasyon !== 'ALL') params.append('lokasyon', seciliLokasyon);

                const response = await fetch(`/api/raporlar/aylik-performans?${params}`);
                if (response.ok) {
                    const data = await response.json();
                    setPerformanslar(data.data || []);
                    setMeta(data.meta);
                } else {
                    toast.error('Rapor yüklenemedi');
                }
            } catch (error) {
                console.error('Rapor hatası:', error);
                toast.error('Rapor yüklenirken hata oluştu');
            } finally {
                setYukleniyor(false);
            }
        };

        raporuYukle();
    }, [seciliAy, seciliLokasyon]);

    // Excel export
    const exportToExcel = () => {
        // CSV formatında export
        const headers = ['Sıra', 'Personel', 'Ünvan', 'Servis Sayısı', 'Ortalama Puan', 'Bonus', 'Rozet'];
        const rows = performanslar.map((p) => [
            p.siralama,
            p.personelAd,
            p.unvan,
            p.servisSayisi,
            p.ortalamaFinalPuan,
            p.bonusSayisi,
            p.rozet || '-',
        ]);

        const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `performans_raporu_${seciliAy}.csv`;
        link.click();

        toast.success('Rapor indirildi');
    };

    // Ay seçenekleri (son 12 ay)
    const aySecenekleri = Array.from({ length: 12 }, (_, i) => {
        const tarih = new Date();
        tarih.setMonth(tarih.getMonth() - i);
        const value = `${tarih.getFullYear()}-${String(tarih.getMonth() + 1).padStart(2, '0')}`;
        const label = tarih.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
        return { value, label };
    });

    if (yukleniyor) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--color-primary)' }} />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 px-4 max-w-6xl animate-fade-in">
            {/* Header */}
            <div className="hero-panel mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <TrendingUp className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
                        Aylık Performans Raporu
                    </h1>
                    <p className="mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        Personel bazlı performans sıralaması ve rozet durumu
                    </p>
                </div>
                <Button onClick={exportToExcel} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Excel İndir
                </Button>
            </div>

            {/* Filtreler */}
            <Card className="mb-6 surface-panel">
                <CardContent className="pt-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                            <Select value={seciliAy} onValueChange={setSeciliAy}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Ay Seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    {aySecenekleri.map((ay) => (
                                        <SelectItem key={ay.value} value={ay.value}>
                                            {ay.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Select value={seciliLokasyon} onValueChange={setSeciliLokasyon}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Tüm Lokasyonlar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Tüm Lokasyonlar</SelectItem>
                                    <SelectItem value="YATMARIN">Yatmarin</SelectItem>
                                    <SelectItem value="NETSEL">Netsel</SelectItem>
                                    <SelectItem value="DIS_SERVIS">Dış Servis</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="ml-auto flex gap-4">
                            <Badge variant="outline" className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {meta.personelSayisi} Personel
                            </Badge>
                            <Badge variant="outline">
                                {meta.toplamServis} Servis
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Rozet Kazananları */}
            {performanslar.filter((p) => p.rozet).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {performanslar
                        .filter((p) => p.rozet)
                        .map((p) => {
                            const rozet = ROZET_CONFIG[p.rozet!];
                            const Icon = rozet.icon;

                            return (
                                <Card key={p.personelId} className="border-0 surface-panel" style={{ background: rozet.bg }}>
                                    <CardContent className="pt-6 text-center">
                                        <Icon className="w-12 h-12 mx-auto mb-2" style={{ color: rozet.color }} />
                                        <h3 className="font-bold text-lg">{p.personelAd}</h3>
                                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{p.unvan}</p>
                                        <div className="mt-3 flex justify-center gap-4 text-sm">
                                            <span>
                                                <strong>{p.ortalamaFinalPuan}</strong> ort. puan
                                            </span>
                                            <span>
                                                <strong>{p.servisSayisi}</strong> servis
                                            </span>
                                        </div>
                                        <Badge className="mt-3" style={{ color: rozet.color }}>{rozet.label} Rozet</Badge>
                                    </CardContent>
                                </Card>
                            );
                        })}
                </div>
            )}

            {/* Performans Tablosu */}
            <Card className="surface-panel">
                <CardHeader>
                    <CardTitle>Personel Performans Sıralaması</CardTitle>
                    <CardDescription>Ortalama puana göre sıralanmış liste</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16">Sıra</TableHead>
                                <TableHead>Personel</TableHead>
                                <TableHead className="text-center">Servis</TableHead>
                                <TableHead className="text-center">Sorumlu</TableHead>
                                <TableHead className="text-center">Destek</TableHead>
                                <TableHead className="text-center">Bonus</TableHead>
                                <TableHead className="text-center">Ort. Puan</TableHead>
                                <TableHead className="text-center">Rozet</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {performanslar.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                                        Bu dönem için performans verisi bulunamadı
                                    </TableCell>
                                </TableRow>
                            ) : (
                                performanslar.map((p) => (
                                    <TableRow key={p.personelId}>
                                        <TableCell>
                                            <span className="font-bold text-lg">{p.siralama}</span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'color-mix(in oklab, var(--color-primary) 20%, var(--color-surface-elevated))' }}>
                                                    <User className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{p.personelAd}</p>
                                                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{p.unvan}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">{p.servisSayisi}</TableCell>
                                        <TableCell className="text-center">{p.sorumluServis}</TableCell>
                                        <TableCell className="text-center">{p.destekServis}</TableCell>
                                        <TableCell className="text-center">
                                            {p.bonusSayisi > 0 && (
                                                <div className="flex items-center justify-center gap-1 text-yellow-500">
                                                    <Star className="w-4 h-4 fill-yellow-500" />
                                                    {p.bonusSayisi}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>{p.ortalamaFinalPuan}</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {p.rozet && (
                                                <Badge style={{ background: ROZET_CONFIG[p.rozet].bg, color: ROZET_CONFIG[p.rozet].color }}>
                                                    {ROZET_CONFIG[p.rozet].label}
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}


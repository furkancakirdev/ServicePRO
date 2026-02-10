'use client';

// ServicePro - Rozet Kazananları Sayfası
// Aylık ve yıllık rozet klasmanı

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Trophy, Medal, Award, Calendar, Crown, User } from 'lucide-react';

interface AylikKazanan {
    personelId: string;
    personelAd: string;
    rozet: 'ALTIN' | 'GUMUS' | 'BRONZ';
    siralama: number;
    toplamPuan: number;
    servisSayisi: number;
}

interface YillikKlasmanItem {
    personnelId: string;
    personnelAd: string;
    altinRozet: number;
    gumusRozet: number;
    bronzRozet: number;
    toplamPuan: number;
    siralama: number;
}

// Rozet ikonları ve renkleri
const ROZET_CONFIG = {
    ALTIN: { icon: Trophy, color: '#fbbf24', bg: 'color-mix(in oklab, #fbbf24 16%, var(--color-surface-elevated))', label: 'Altın' },
    GUMUS: { icon: Medal, color: '#94a3b8', bg: 'color-mix(in oklab, #94a3b8 16%, var(--color-surface-elevated))', label: 'Gümüş' },
    BRONZ: { icon: Award, color: '#d97706', bg: 'color-mix(in oklab, #d97706 16%, var(--color-surface-elevated))', label: 'Bronz' },
};

export default function RozetKazananlariPage() {
    const [yukleniyor, setYukleniyor] = useState(true);
    const [aylikData, setAylikData] = useState<Record<string, AylikKazanan[]>>({});
    const [yillikKlasman, setYillikKlasman] = useState<YillikKlasmanItem[]>([]);

    const buYil = new Date().getFullYear();

    // Verileri yükle
    useEffect(() => {
        const verileriYukle = async () => {
            setYukleniyor(true);
            try {
                // Son 3 ayın rozet kazananları
                const aylikRes = await fetch('/api/raporlar/rozet-kazananlar');
                if (aylikRes.ok) {
                    const data = await aylikRes.json();
                    setAylikData(data.data || {});
                }

                // Yıllık klasman
                const yillikRes = await fetch(`/api/raporlar/rozet-kazananlar?yil=${buYil}`);
                if (yillikRes.ok) {
                    const data = await yillikRes.json();
                    setYillikKlasman(data.data || []);
                }
            } catch (error) {
                console.error('Rozet verileri hatası:', error);
                toast.error('Veriler yüklenirken hata oluştu');
            } finally {
                setYukleniyor(false);
            }
        };

        verileriYukle();
    }, [buYil]);

    // Ay formatla
    const formatAy = (ayStr: string) => {
        const [yil, ay] = ayStr.split('-');
        const tarih = new Date(parseInt(yil), parseInt(ay) - 1, 1);
        return tarih.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
    };

    if (yukleniyor) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--color-primary)' }} />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 px-4 max-w-6xl animate-fade-in">
            <header className="hero-panel mb-6">
                <div className="hero-content">
                    <div>
                        <h1 className="hero-title flex items-center gap-2">
                    <Trophy className="w-6 h-6" style={{ color: '#fbbf24' }} />
                    Rozet Kazananları
                        </h1>
                        <p className="hero-subtitle">Aylık performans ödülleri ve yıllık klasman</p>
                    </div>
                </div>
            </header>

            <Tabs defaultValue="aylik" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="aylik" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Aylık Kazananlar
                    </TabsTrigger>
                    <TabsTrigger value="yillik" className="flex items-center gap-2">
                        <Crown className="w-4 h-4" />
                        {buYil} Yıllık Klasman
                    </TabsTrigger>
                </TabsList>

                {/* Aylık Kazananlar */}
                <TabsContent value="aylik">
                    {Object.keys(aylikData).length === 0 ? (
                        <Card className="surface-panel">
                            <CardContent className="py-12 text-center" style={{ color: 'var(--color-text-muted)' }}>
                                Henüz rozet kazanan bulunmuyor
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(aylikData)
                                .sort(([a], [b]) => b.localeCompare(a))
                                .map(([ay, kazananlar]) => (
                                    <Card key={ay} className="surface-panel">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Calendar className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                                                {formatAy(ay)}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {kazananlar.map((k) => {
                                                    const rozet = ROZET_CONFIG[k.rozet];
                                                    const Icon = rozet.icon;

                                                    return (
                                                        <div
                                                            key={k.personelId}
                                                            className="p-4 rounded-lg flex items-center gap-4"
                                                            style={{ background: rozet.bg }}
                                                        >
                                                            <Icon className="w-10 h-10" style={{ color: rozet.color }} />
                                                            <div>
                                                                <p className="font-bold">{k.personelAd}</p>
                                                                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                                                    {k.toplamPuan} puan • {k.servisSayisi} servis
                                                                </p>
                                                                <Badge className="mt-1" style={{ color: rozet.color }}>{rozet.label}</Badge>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                        </div>
                    )}
                </TabsContent>

                {/* Yıllık Klasman */}
                <TabsContent value="yillik">
                    <Card className="surface-panel">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Crown className="w-5 h-5" style={{ color: '#fbbf24' }} />
                                {buYil} Yılı Rozet Klasmanı
                            </CardTitle>
                            <CardDescription>Toplanan rozetlere göre sıralama</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {yillikKlasman.length === 0 ? (
                                <div className="py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
                                    Bu yıl için klasman verisi bulunmuyor
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-16">Sıra</TableHead>
                                            <TableHead>Personel</TableHead>
                                                <TableHead className="text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                    <Trophy className="w-4 h-4" style={{ color: '#fbbf24' }} />
                                                    Altın
                                                </div>
                                            </TableHead>
                                            <TableHead className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Medal className="w-4 h-4" style={{ color: '#94a3b8' }} />
                                                    Gümüş
                                                </div>
                                            </TableHead>
                                            <TableHead className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Award className="w-4 h-4" style={{ color: '#d97706' }} />
                                                    Bronz
                                                </div>
                                            </TableHead>
                                            <TableHead className="text-center">Toplam Puan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {yillikKlasman.map((k) => (
                                            <TableRow key={k.personnelId}>
                                                <TableCell>
                                                    <div className="flex items-center justify-center">
                                                        {k.siralama === 1 && <Crown className="w-6 h-6" style={{ color: '#fbbf24' }} />}
                                                        {k.siralama === 2 && <Medal className="w-5 h-5" style={{ color: '#94a3b8' }} />}
                                                        {k.siralama === 3 && <Award className="w-5 h-5" style={{ color: '#d97706' }} />}
                                                        {k.siralama > 3 && <span className="font-bold">{k.siralama}</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'color-mix(in oklab, var(--color-primary) 20%, var(--color-surface-elevated))' }}>
                                                            <User className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                                                        </div>
                                                        <span className="font-medium">{k.personnelAd}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {k.altinRozet > 0 && (
                                                        <Badge style={{ background: ROZET_CONFIG.ALTIN.bg, color: ROZET_CONFIG.ALTIN.color }}>{k.altinRozet}</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {k.gumusRozet > 0 && (
                                                        <Badge style={{ background: ROZET_CONFIG.GUMUS.bg, color: ROZET_CONFIG.GUMUS.color }}>{k.gumusRozet}</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {k.bronzRozet > 0 && (
                                                        <Badge style={{ background: ROZET_CONFIG.BRONZ.bg, color: ROZET_CONFIG.BRONZ.color }}>{k.bronzRozet}</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center font-bold" style={{ color: 'var(--color-primary)' }}>
                                                    {k.toplamPuan}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}


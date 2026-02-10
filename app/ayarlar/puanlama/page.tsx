'use client';

// ServicePro - Admin Puanlama Ayarları Sayfası
// Zorluk katsayıları, soru havuzu ve rozet kriterleri yönetimi
//
// Not: Bu sayfada katsayı/puanlama ayarları sadece admin tarafından düzenlenir.

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Settings, Calculator, HelpCircle, Award, Plus, Save, Trash2, Edit2, GripVertical, Lock } from 'lucide-react';

// Tip tanımlamaları
interface ZorlukKatsayi {
    id: string;
    isTuru: 'PAKET' | 'ARIZA' | 'PROJE';
    label: string;
    carpan: number;
    gecerliTarih: string;
}

interface PuanlamaSoru {
    id: string;
    key: string;
    label: string;
    aciklama: string;
    kategori: 'USTA' | 'CIRAK' | 'GENEL';
    aktif: boolean;
    sira: number;
    agirlik: number;
}

interface RozetKriteri {
    id: string;
    rozet: 'ALTIN' | 'GUMUS' | 'BRONZ';
    siralama: number;
    aktif: boolean;
}

export default function PuanlamaAyarlariPage() {
    const [yukleniyor, setYukleniyor] = useState(true);
    const [kayitEdiliyor, setKayitEdiliyor] = useState(false);

    // Yetki kontrolü state'i
    const [adminMi, setAdminMi] = useState(false);
    const [userEmail, setUserEmail] = useState('');

    // State'ler
    const [katsayilar, setKatsayilar] = useState<ZorlukKatsayi[]>([]);
    const [sorular, setSorular] = useState<PuanlamaSoru[]>([]);
    const [rozetKriterleri, setRozetKriterleri] = useState<RozetKriteri[]>([]);

    // Veri yükleme
    useEffect(() => {
        const verileriYukle = async () => {
            try {
                // Önce localStorage üzerinden rolü kontrol et (fallback)
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    const parsed = JSON.parse(storedUser);
                    if (parsed?.rol === 'admin') {
                        setAdminMi(true);
                        setUserEmail(parsed?.email || '');
                    }
                }

                // Ardından API üzerinden doğrula
                const userRes = await fetch('/api/auth/me');
                if (userRes.ok) {
                    const userData = await userRes.json();
                    setAdminMi(userData.user?.role === 'ADMIN');
                    setUserEmail(userData.user?.email || '');
                }

                // API endpoint'lerini kullan
                const [katsayiRes, soruRes, rozetRes] = await Promise.all([
                    fetch('/api/admin/puanlama-agirlik'),
                    fetch('/api/admin/rapor-kontrol-sorular?raporKontrolMu=true'),
                    fetch('/api/admin/rozet-kriterleri'),
                ]);

                if (katsayiRes.ok) {
                    const data = await katsayiRes.json();
                    setKatsayilar(data.data?.katsayilar || []);
                }

                if (soruRes.ok) {
                    const data = await soruRes.json();
                    setSorular(data.data || []);
                }

                if (rozetRes.ok) {
                    const data = await rozetRes.json();
                    setRozetKriterleri(data.data || []);
                }
            } catch (error) {
                console.error('Ayarlar yüklenemedi:', error);
                toast.error('Ayarlar yüklenirken hata oluştu');
            } finally {
                setYukleniyor(false);
            }
        };

        verileriYukle();
    }, []);

    // Katsayı güncelleme
    const katsayiGuncelle = async (isTuru: string, yeniCarpan: number) => {
        // Yetki kontrolü
        if (!adminMi) {
            toast.error('Bu işlem için yetkiniz yok');
            return;
        }

        setKayitEdiliyor(true);
        try {
            const response = await fetch('/api/admin/puanlama-agirlik', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    katsayilar: [{ isTuru, carpan: yeniCarpan }],
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setKatsayilar(data.data?.katsayilar || []);
                toast.success('Katsayı güncellendi - Geçmiş puanlar etkilenmez');
            } else {
                const data = await response.json();
                toast.error(data.error || 'Güncelleme başarısız');
            }
        } catch {
            toast.error('Hata oluştu');
        } finally {
            setKayitEdiliyor(false);
        }
    };

    // Soru aktif/pasif toggle
    const soruToggle = async (soruId: string, aktif: boolean) => {
        try {
            const response = await fetch('/api/puanlama/sorular', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: soruId, aktif }),
            });

            if (response.ok) {
                setSorular((prev) =>
                    prev.map((s) => (s.id === soruId ? { ...s, aktif } : s))
                );
                toast.success(aktif ? 'Soru aktif edildi' : 'Soru pasif yapıldı');
            }
        } catch {
            toast.error('Güncelleme başarısız');
        }
    };

    // İş türü renkleri
    const IS_TURU_RENK: Record<string, string> = {
        PAKET: 'color-mix(in oklab, #3b82f6 16%, var(--color-surface-elevated));#3b82f6',
        ARIZA: 'color-mix(in oklab, #f97316 16%, var(--color-surface-elevated));#f97316',
        PROJE: 'color-mix(in oklab, #a855f7 16%, var(--color-surface-elevated));#a855f7',
    };

    // Rozet renkleri
    const ROZET_RENK: Record<string, string> = {
        ALTIN: 'color-mix(in oklab, #fbbf24 16%, var(--color-surface-elevated));#fbbf24',
        GUMUS: 'color-mix(in oklab, #94a3b8 16%, var(--color-surface-elevated));#94a3b8',
        BRONZ: 'color-mix(in oklab, #d97706 16%, var(--color-surface-elevated));#d97706',
    };

    if (yukleniyor) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--color-primary)' }} />
            </div>
        );
    }

    // Admin değilse uyarı göster (read-only mod)
    const yetkiUyarisi = !adminMi && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-lg" style={{ background: 'color-mix(in oklab, var(--color-warning) 15%, var(--color-surface-elevated))', border: '1px solid color-mix(in oklab, var(--color-warning) 40%, var(--color-border))' }}>
            <Lock className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-warning)' }} />
            <div className="flex-1">
                <p className="font-medium" style={{ color: 'var(--color-warning)' }}>Salt Okunur Mod</p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Bu sayfa sadece yetkili kişiler tarafından düzenlenebilir. Değişiklik yapmak için yöneticinizle iletişime geçin.
                </p>
            </div>
        </div>
    );

    return (
        <div className="container mx-auto py-6 px-4 max-w-6xl animate-fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Settings className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
                    Puanlama Ayarları
                </h1>
                <p className="mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Zorluk katsayıları, soru havuzu ve rozet kriterlerini yönetin
                </p>
                {adminMi && (
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" style={{ background: 'color-mix(in oklab, var(--color-success) 14%, var(--color-surface-elevated))', color: 'var(--color-success)' }}>
                            Admin Erişimi
                        </Badge>
                        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{userEmail}</span>
                    </div>
                )}
            </div>

            {yetkiUyarisi}

            <Tabs defaultValue="katsayilar" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="katsayilar" className="flex items-center gap-2">
                        <Calculator className="w-4 h-4" />
                        Zorluk Katsayıları
                    </TabsTrigger>
                    <TabsTrigger value="sorular" className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4" />
                        Soru Havuzu
                    </TabsTrigger>
                    <TabsTrigger value="rozetler" className="flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        Rozet Kriterleri
                    </TabsTrigger>
                </TabsList>

                {/* Zorluk Katsayıları */}
                <TabsContent value="katsayilar">
                    <Card className="surface-panel">
                        <CardHeader>
                            <CardTitle>İş Türü Zorluk Katsayıları</CardTitle>
                            <CardDescription>
                                Her iş türü için puan çarpanını ayarlayın. Değişiklikler yeni puanlamalara uygulanır, geçmiş puanları etkilemez.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {katsayilar.map((katsayi) => (
                                <div key={katsayi.id} className="border rounded-lg p-4" style={{ borderColor: 'var(--color-border)' }}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <Badge style={{ background: IS_TURU_RENK[katsayi.isTuru].split(';')[0], color: IS_TURU_RENK[katsayi.isTuru].split(';')[1] }}>
                                                {katsayi.isTuru}
                                            </Badge>
                                            <span className="font-medium">{katsayi.label}</span>
                                        </div>
                                        <span className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                                            {katsayi.carpan.toFixed(1)}x
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm w-12" style={{ color: 'var(--color-text-muted)' }}>0.5x</span>
                                        <Slider
                                            value={[katsayi.carpan]}
                                            min={0.5}
                                            max={3.0}
                                            step={0.1}
                                            onValueChange={(value) =>
                                                setKatsayilar((prev) =>
                                                    prev.map((k) =>
                                                        k.id === katsayi.id ? { ...k, carpan: value[0] } : k
                                                    )
                                                )
                                            }
                                            className="flex-1"
                                        />
                                        <span className="text-sm w-12" style={{ color: 'var(--color-text-muted)' }}>3.0x</span>
                                    </div>
                                    <div className="flex justify-end mt-4">
                                        <Button
                                            size="sm"
                                            onClick={() => katsayiGuncelle(katsayi.isTuru, katsayi.carpan)}
                                            disabled={kayitEdiliyor || !adminMi}
                                        >
                                            <Save className="w-4 h-4 mr-1" />
                                            Kaydet
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Soru Havuzu */}
                <TabsContent value="sorular">
                    <Card className="surface-panel">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Puanlama Soruları</CardTitle>
                                    <CardDescription>
                                        Personel değerlendirmesi için kullanılacak soruları yönetin
                                    </CardDescription>
                                </div>
                                <Button>
                                    <Plus className="w-4 h-4 mr-1" />
                                    Yeni Soru
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="USTA">
                                <TabsList className="mb-4">
                                    <TabsTrigger value="USTA">Usta Soruları</TabsTrigger>
                                    <TabsTrigger value="CIRAK">Çırak Soruları</TabsTrigger>
                                </TabsList>

                                {['USTA', 'CIRAK'].map((kategori) => (
                                    <TabsContent key={kategori} value={kategori}>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-10"></TableHead>
                                                    <TableHead>Soru</TableHead>
                                                    <TableHead className="w-24">Ağırlık</TableHead>
                                                    <TableHead className="w-20">Aktif</TableHead>
                                                    <TableHead className="w-20">İşlemler</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sorular
                                                    .filter((s) => s.kategori === kategori)
                                                    .sort((a, b) => a.sira - b.sira)
                                                    .map((soru) => (
                                                        <TableRow key={soru.id}>
                                                            <TableCell>
                                                                <GripVertical className="w-4 h-4 cursor-grab" style={{ color: 'var(--color-text-muted)' }} />
                                                            </TableCell>
                                                            <TableCell>
                                                                <div>
                                                                    <span className="font-medium">{soru.label}</span>
                                                                    <p className="text-sm truncate max-w-md" style={{ color: 'var(--color-text-muted)' }}>
                                                                        {soru.aciklama}
                                                                    </p>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">×{soru.agirlik}</Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Switch
                                                                    checked={soru.aktif}
                                                                    onCheckedChange={(checked) => soruToggle(soru.id, checked)}
                                                                    disabled={!adminMi}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex gap-1">
                                                                    <Button variant="ghost" size="icon">
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="text-red-500">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                            </TableBody>
                                        </Table>
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Rozet Kriterleri */}
                <TabsContent value="rozetler">
                    <Card className="surface-panel">
                        <CardHeader>
                            <CardTitle>Aylık Rozet Kriterleri</CardTitle>
                            <CardDescription>
                                Aylık performans sıralamasına göre rozet kazanma kurallarını belirleyin
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4">
                                {rozetKriterleri.map((kriter) => (
                                    <div
                                        key={kriter.id}
                                        className="flex items-center justify-between p-4 border rounded-lg"
                                    >
                                        <div className="flex items-center gap-4">
                                            <Badge style={{ background: ROZET_RENK[kriter.rozet].split(';')[0], color: ROZET_RENK[kriter.rozet].split(';')[1] }}>{kriter.rozet}</Badge>
                                            <span style={{ color: 'var(--color-text-muted)' }}>
                                                Aylık sıralamada <strong>{kriter.siralama}. olan</strong> personele verilir
                                            </span>
                                        </div>
                                        <Switch checked={kriter.aktif} disabled={!adminMi} />
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 p-4 rounded-lg" style={{ background: 'var(--color-surface-elevated)' }}>
                                <h4 className="font-medium mb-2">Rozet Hesaplama Mantığı</h4>
                                <ul className="text-sm space-y-1" style={{ color: 'var(--color-text-muted)' }}>
                                    <li>• Her ayın sonunda, tüm personellerin ortalama puanı hesaplanır</li>
                                    <li>• En yüksek puana sahip 3 personel rozet kazanır</li>
                                    <li>• Rozetler yıllık klasmanda toplanır</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}



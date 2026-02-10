
'use client';

// Service Edit Page
// ServicePro ERP - Marlin Yatçılık

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { normalizeServisDurumuForApp } from '@/lib/domain-mappers';

// Form validation schema
const editServisSchema = z.object({
    tekneId: z.string().min(1, 'Tekne Seçiniz'),
    tarih: z.string().min(1, 'Tarih giriniz'),
    saat: z.string().optional(),
    isTuru: z.enum(['PAKET', 'ARIZA', 'PROJE']),
    adres: z.string().min(1, 'Adres giriniz'),
    yer: z.string().min(1, 'Lokasyon giriniz'),
    servisAciklamasi: z.string().min(5, 'Servis açıklaması en az 5 karakter olmalı'),
    irtibatKisi: z.string().optional(),
    telefon: z.string().optional(),
    durum: z.enum(['RANDEVU_VERILDI', 'DEVAM_EDIYOR', 'PARCA_BEKLIYOR', 'MUSTERI_ONAY_BEKLIYOR', 'RAPOR_BEKLIYOR', 'KESIF_KONTROL', 'TAMAMLANDI', 'IPTAL', 'ERTELENDI']),
    taseronNotlari: z.string().optional(),
});

type EditServisForm = z.infer<typeof editServisSchema>;

interface Tekne {
    id: string;
    ad: string;
}

export default function EditServisPage() {
    const router = useRouter();
    const params = useParams();
    const { isAuthenticated } = useAuth();
    const [tekneler, setTekneler] = useState<Tekne[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<EditServisForm>({
        resolver: zodResolver(editServisSchema),
    });

    // Fetch initial data
    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                // 1. Fetch Tekneler
                const tekneRes = await fetch('/api/tekneler');
                if (tekneRes.ok) {
                    setTekneler(await tekneRes.json());
                }

                // 2. Fetch Service Data
                const serviceRes = await fetch(`/api/services/${params.id}`);
                if (!serviceRes.ok) throw new Error('Servis bilgileri alınamadı');
                const serviceData = await serviceRes.json();

                // 3. Set Form Values
                setValue('tekneId', serviceData.tekneId);
                setValue('tarih', serviceData.tarih ? serviceData.tarih.split('T')[0] : '');
                setValue('saat', serviceData.saat || '');
                setValue('isTuru', serviceData.isTuru);
                setValue('adres', serviceData.adres);
                setValue('yer', serviceData.yer);
                setValue('servisAciklamasi', serviceData.servisAciklamasi);
                setValue('irtibatKisi', serviceData.irtibatKisi || '');
                setValue('telefon', serviceData.telefon || '');
                setValue('durum', normalizeServisDurumuForApp(serviceData.durum) as EditServisForm['durum']);
                setValue('taseronNotlari', serviceData.taseronNotlari || '');

            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Bir hata oluştu');
            } finally {
                setLoading(false);
            }
        };

        if (isAuthenticated && params.id) {
            init();
        }
    }, [isAuthenticated, params.id, setValue]);

    const onSubmit = async (data: EditServisForm) => {
        setSubmitting(true);
        setError('');

        try {
            const shouldOpenCompleteFlow = data.durum === 'TAMAMLANDI';
            const restData = { ...data };
            delete (restData as Partial<EditServisForm>).durum;

            const res = await fetch(`/api/services/${params.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                    ...(shouldOpenCompleteFlow ? restData : data),
                    tekneAdi: tekneler.find((t) => t.id === data.tekneId)?.ad || '',
                }),
            });

            if (!res.ok) {
                throw new Error('Servis güncellenemedi');
            }

            if (shouldOpenCompleteFlow) {
                router.push(`/servisler/${params.id}?action=complete`);
            } else {
                router.push(`/servisler/${params.id}`);
            }
            router.refresh();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Bir hata oluştu');
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-10 text-center">Yükleniyor...</div>;
    }

    return (
        <div className="container mx-auto py-10 max-w-2xl">
            <Button
                variant="ghost"
                onClick={() => router.back()}
                className="mb-6 pl-0 hover:bg-transparent"
            >
                <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle>Servis Düzenle</CardTitle>
                    <CardDescription>Servis bilgilerini güncelleyin</CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-6 border border-destructive/20">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                        <div className="space-y-2">
                            <Label>Tekne</Label>
                            <select
                                {...register('tekneId')}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Seçiniz</option>
                                {tekneler.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
                            </select>
                            {errors.tekneId && <p className="text-sm text-destructive">{errors.tekneId.message}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tarih</Label>
                                <Input type="date" {...register('tarih')} />
                                {errors.tarih && <p className="text-sm text-destructive">{errors.tarih.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Saat</Label>
                                <Input type="time" {...register('saat')} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>İş Türü</Label>
                                <select
                                    {...register('isTuru')}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="PAKET">Paket İş</option>
                                    <option value="ARIZA">Arıza / Keşif</option>
                                    <option value="PROJE">Proje / Refit</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Durum</Label>
                                <select
                                    {...register('durum')}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="RANDEVU_VERILDI">Randevu Verildi</option>
                                    <option value="DEVAM_EDIYOR">Devam Ediyor</option>
                                    <option value="PARCA_BEKLIYOR">Parça Bekliyor</option>
                                    <option value="MUSTERI_ONAY_BEKLIYOR">Müşteri Onay Bekliyor</option>
                                    <option value="RAPOR_BEKLIYOR">Rapor Bekliyor</option>
                                    <option value="KESIF_KONTROL">Keşif-Kontrol</option>
                                    <option value="TAMAMLANDI">Tamamlandı</option>
                                    <option value="IPTAL">İptal</option>
                                    <option value="ERTELENDI">Ertelendi</option>
                                </select>
                                <p className="text-xs text-muted-foreground">
                                    Not: Durumu <strong>Tamamlandı</strong> seçip kaydettiğinizde kalite kontrol ve puanlama ekranı açılır.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2 space-y-2">
                                <Label>Adres</Label>
                                <Input {...register('adres')} />
                                {errors.adres && <p className="text-sm text-destructive">{errors.adres.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Lokasyon</Label>
                                <Input {...register('yer')} />
                                {errors.yer && <p className="text-sm text-destructive">{errors.yer.message}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Servis Açıklaması</Label>
                            <Textarea rows={4} {...register('servisAciklamasi')} />
                            {errors.servisAciklamasi && <p className="text-sm text-destructive">{errors.servisAciklamasi.message}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>İrtibat Kişi</Label>
                                <Input {...register('irtibatKisi')} />
                            </div>
                            <div className="space-y-2">
                                <Label>Telefon</Label>
                                <Input type="tel" {...register('telefon')} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Taşeron Notları</Label>
                            <Textarea rows={2} {...register('taseronNotlari')} />
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" type="button" onClick={() => router.back()} disabled={submitting}>İptal</Button>
                            <Button type="submit" disabled={submitting}>{submitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</Button>
                        </div>

                    </form>
                </CardContent>
            </Card>
        </div>
    );
}







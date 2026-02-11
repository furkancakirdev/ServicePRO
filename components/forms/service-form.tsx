'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ServisKapanisModal from '@/components/ServisKapanisModal';
import { normalizeServisDurumuForApp, normalizeServisDurumuForDb } from '@/lib/domain-mappers';

const serviceFormSchema = z.object({
  boatName: z.string().trim().min(1, 'Tekne adi zorunlu'),
  tarih: z.string().min(1, 'Tarih giriniz'),
  saat: z.string().optional(),
  isTuru: z.enum(['PAKET', 'ARIZA', 'PROJE']),
  adres: z.string().min(1, 'Adres giriniz'),
  yer: z.string().min(1, 'Lokasyon giriniz'),
  servisAciklamasi: z.string().min(5, 'Servis aciklamasi en az 5 karakter olmali'),
  irtibatKisi: z.string().optional(),
  telefon: z.string().optional(),
  durum: z.enum([
    'RANDEVU_VERILDI',
    'DEVAM_EDIYOR',
    'PARCA_BEKLIYOR',
    'MUSTERI_ONAY_BEKLIYOR',
    'RAPOR_BEKLIYOR',
    'KESIF_KONTROL',
    'TAMAMLANDI',
    'IPTAL',
    'ERTELENDI',
  ]),
  taseronNotlari: z.string().optional(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;
type PersonelRol = 'SORUMLU' | 'DESTEK';

interface ServiceDetail {
  id: string;
  tarih: string | null;
  saat: string | null;
  isTuru: 'PAKET' | 'ARIZA' | 'PROJE';
  tekneAdi: string;
  adres: string;
  yer: string;
  servisAciklamasi: string;
  irtibatKisi: string | null;
  telefon: string | null;
  durum: string;
  taseronNotlari: string | null;
  zorlukSeviyesi?: 'RUTIN' | 'ARIZA' | 'PROJE' | null;
  personeller: Array<{
    personelId: string;
    rol: PersonelRol;
    personel: {
      ad: string;
      unvan: 'USTA' | 'CIRAK' | 'YONETICI' | 'OFIS';
    };
  }>;
}

interface ScoringServiceData {
  servisId: string;
  tekneAdi: string;
  isTuru: 'PAKET' | 'ARIZA' | 'PROJE';
  servisAciklamasi: string;
  yer: string;
  personeller: Array<{
    personelId: string;
    personelAd: string;
    rol: PersonelRol;
    unvan: 'USTA' | 'CIRAK' | 'YONETICI' | 'OFIS';
  }>;
  zorlukSeviyesi?: 'RUTIN' | 'ARIZA' | 'PROJE' | null;
}

interface CompletePayload {
  personeller: Array<{ personelId: string; rol: PersonelRol }>;
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
}

export interface ServiceFormProps {
  mode: 'create' | 'edit';
  serviceId?: string;
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function authorizedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const authHeaders = getAuthHeaders();
  const firstHeaders = new Headers(init?.headers ?? {});
  if (authHeaders.Authorization) {
    firstHeaders.set('Authorization', authHeaders.Authorization);
  }

  let response = await fetch(input, {
    ...init,
    headers: firstHeaders,
  });

  if (response.status === 401 && authHeaders.Authorization) {
    response = await fetch(input, {
      ...init,
      headers: init?.headers,
    });
  }

  return response;
}

function toDateInput(value: string | null): string {
  if (!value) return '';
  return value.split('T')[0] ?? '';
}

function mapServiceToScoringData(service: ServiceDetail): ScoringServiceData {
  return {
    servisId: service.id,
    tekneAdi: service.tekneAdi,
    isTuru: service.isTuru,
    servisAciklamasi: service.servisAciklamasi,
    yer: service.yer,
    zorlukSeviyesi: service.zorlukSeviyesi ?? null,
    personeller: service.personeller.map((personel) => ({
      personelId: personel.personelId,
      personelAd: personel.personel.ad,
      rol: personel.rol,
      unvan: personel.personel.unvan,
    })),
  };
}

export function ServiceForm({ mode, serviceId }: ServiceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(mode === 'edit');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [showScoring, setShowScoring] = React.useState(false);
  const [isScored, setIsScored] = React.useState(false);
  const [currentService, setCurrentService] = React.useState<ServiceDetail | null>(null);
  const [scoringService, setScoringService] = React.useState<ScoringServiceData | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      boatName: '',
      tarih: new Date().toISOString().split('T')[0],
      saat: '',
      isTuru: 'PAKET',
      adres: '',
      yer: '',
      servisAciklamasi: '',
      irtibatKisi: '',
      telefon: '',
      durum: 'RANDEVU_VERILDI',
      taseronNotlari: '',
    },
  });

  const selectedStatus = watch('durum');

  const fetchServiceDetail = React.useCallback(async (id: string): Promise<ServiceDetail> => {
    const response = await authorizedFetch(`/api/services/${id}`);

    if (!response.ok) {
      throw new Error('Servis detaylari alinamadi');
    }

    return (await response.json()) as ServiceDetail;
  }, []);

  React.useEffect(() => {
    if (mode !== 'edit' || !serviceId) return;

    const load = async () => {
      try {
        setLoading(true);
        const service = await fetchServiceDetail(serviceId);
        setCurrentService(service);

        setValue('boatName', service.tekneAdi || '');
        setValue('tarih', toDateInput(service.tarih));
        setValue('saat', service.saat || '');
        setValue('isTuru', service.isTuru);
        setValue('adres', service.adres);
        setValue('yer', service.yer);
        setValue('servisAciklamasi', service.servisAciklamasi);
        setValue('irtibatKisi', service.irtibatKisi || '');
        setValue('telefon', service.telefon || '');
        setValue('durum', normalizeServisDurumuForApp(service.durum) as ServiceFormValues['durum']);
        setValue('taseronNotlari', service.taseronNotlari || '');
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Servis verisi yuklenemedi';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [fetchServiceDetail, mode, serviceId, setValue]);

  const saveService = React.useCallback(
    async (
      values: ServiceFormValues,
      options?: { overrideDurum?: ServiceFormValues['durum'] }
    ): Promise<ServiceDetail> => {
      const payload = {
        tarih: values.tarih,
        saat: values.saat || null,
        isTuru: values.isTuru,
        adres: values.adres,
        yer: values.yer,
        servisAciklamasi: values.servisAciklamasi,
        irtibatKisi: values.irtibatKisi || null,
        telefon: values.telefon || null,
        durum: normalizeServisDurumuForDb(options?.overrideDurum ?? values.durum),
        taseronNotlari: values.taseronNotlari || null,
        boatName: values.boatName.trim(),
      };

      const endpoint = mode === 'edit' && serviceId ? `/api/services/${serviceId}` : '/api/services';
      const method = mode === 'edit' && serviceId ? 'PUT' : 'POST';

      const response = await authorizedFetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseBody = (await response.json().catch(() => null)) as ServiceDetail | { error?: string } | null;
      if (!response.ok) {
        const message =
          responseBody && typeof responseBody === 'object' && 'error' in responseBody
            ? responseBody.error
            : 'Servis kaydi basarisiz';
        throw new Error(message || 'Servis kaydi basarisiz');
      }

      return responseBody as ServiceDetail;
    },
    [mode, serviceId]
  );

  const openScoringGuard = React.useCallback(
    async (values: ServiceFormValues) => {
      const fallbackStatus =
        mode === 'edit'
          ? (normalizeServisDurumuForApp(currentService?.durum ?? 'DEVAM_EDIYOR') as ServiceFormValues['durum'])
          : 'RANDEVU_VERILDI';

      const persisted = await saveService(values, {
        overrideDurum: fallbackStatus,
      });

      const detailed = await fetchServiceDetail(persisted.id);
      setCurrentService(detailed);
      setScoringService(mapServiceToScoringData(detailed));
      setShowScoring(true);
      toast.info('Tamamlandi icin once puanlama yapilmalidir.');
    },
    [currentService?.durum, fetchServiceDetail, mode, saveService]
  );

  const handleScoringSave = React.useCallback(
    async (servisId: string, payload: CompletePayload) => {
      const response = await authorizedFetch(`/api/services/${servisId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || 'Puanlama kaydedilemedi');
      }

      setIsScored(true);
      setShowScoring(false);
      toast.success('Puanlama kaydedildi, servis tamamlandi.');
      router.push(`/servisler/${servisId}/duzenle`);
      router.refresh();
    },
    [router]
  );

  const onSubmit = async (values: ServiceFormValues) => {
    setError('');
    setSubmitting(true);

    try {
      if (values.durum === 'TAMAMLANDI' && !isScored) {
        await openScoringGuard(values);
        return;
      }

      const saved = await saveService(values);
      setCurrentService(saved);

      toast.success(mode === 'create' ? 'Servis olusturuldu.' : 'Servis guncellendi.');
      router.push(`/servisler/${saved.id}/duzenle`);
      router.refresh();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Islem basarisiz';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center">Yukleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="surface-panel">
        <CardHeader>
          <CardTitle>{mode === 'create' ? 'Yeni Servis' : 'Servis Duzenle'}</CardTitle>
          <CardDescription>
            Tekne adi serbest metin olarak girilir. Tamamlandi icin puanlama zorunludur.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-6 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label>Tekne Adi</Label>
              <Input {...register('boatName')} placeholder="Orn: Moonlight (Eski)" />
              {errors.boatName && <p className="text-sm text-destructive">{errors.boatName.message}</p>}
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
                <Label>Is Turu</Label>
                <select
                  {...register('isTuru')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="PAKET">Paket Is</option>
                  <option value="ARIZA">Ariza / Kesif</option>
                  <option value="PROJE">Proje / Refit</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Durum</Label>
                <select
                  {...register('durum')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="RANDEVU_VERILDI">Randevu Verildi</option>
                  <option value="DEVAM_EDIYOR">Devam Ediyor</option>
                  <option value="PARCA_BEKLIYOR">Parca Bekliyor</option>
                  <option value="MUSTERI_ONAY_BEKLIYOR">Musteri Onay Bekliyor</option>
                  <option value="RAPOR_BEKLIYOR">Rapor Bekliyor</option>
                  <option value="KESIF_KONTROL">Kesif-Kontrol</option>
                  <option value="TAMAMLANDI">Tamamlandi</option>
                  <option value="IPTAL">Iptal</option>
                  <option value="ERTELENDI">Ertelendi</option>
                </select>
                {selectedStatus === 'TAMAMLANDI' && (
                  <p className="text-xs text-amber-400">
                    Kaydet sirasinda puanlama bariyeri calisir, puanlama tamamlanmadan servis kapanmaz.
                  </p>
                )}
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
              <Label>Servis Aciklamasi</Label>
              <Textarea rows={4} {...register('servisAciklamasi')} />
              {errors.servisAciklamasi && (
                <p className="text-sm text-destructive">{errors.servisAciklamasi.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Irtibat Kisi</Label>
                <Input {...register('irtibatKisi')} />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input type="tel" {...register('telefon')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Beklenen Malzeme Notlari</Label>
              <Textarea rows={2} {...register('taseronNotlari')} />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" type="button" onClick={() => router.back()} disabled={submitting}>
                Iptal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Kaydediliyor...' : mode === 'create' ? 'Servis Olustur' : 'Degisiklikleri Kaydet'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ServisKapanisModal
        acik={showScoring}
        onKapat={() => setShowScoring(false)}
        servis={scoringService}
        onPuanlamaKaydet={handleScoringSave}
      />
    </div>
  );
}

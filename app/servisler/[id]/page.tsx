'use client';

// Service Detail Page
// ServicePro ERP - Marlin Yatçılık

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { DURUM_CONFIG, type ServisDurumu, IsTuru } from '@/types';
import { useAuth } from '@/lib/hooks/use-auth';
import { MinimumRole } from '@/components/auth/ProtectedComponents';
import ServisKapanisModal from '@/components/ServisKapanisModal';
import { ArrowLeft, Edit, Calendar, MapPin, User, Sailboat, Users, Box, ClipboardList, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Service {
  id: string;
  tarih: string | null;
  saat: string | null;
  isTuru: IsTuru;
  tekneAdi: string;
  adres: string;
  yer: string;
  servisAciklamasi: string;
  irtibatKisi: string | null;
  telefon: string | null;
  durum: ServisDurumu;
  taseronNotlari: string | null;
  tamamlanmaAt: string | null;
  createdAt: string;
  updatedAt: string;
  zorlukSeviyesi?: 'RUTIN' | 'ARIZA' | 'PROJE' | null;
  tekne: {
    id: string;
    ad: string;
    marka: string | null;
    model: string | null;
    boyut: number | null;
    motorTipi: string | null;
  };
  ofisYetkili: {
    id: string;
    ad: string;
    email: string;
  } | null;
  personeller: Array<{
    id: string;
    rol: string;
    bonus: boolean;
    personel: {
      id: string;
      ad: string;
      unvan: string;
    };
  }>;
  bekleyenParcalar: Array<{
    id: string;
    parcaAdi: string;
    miktar: number;
    birim: string | null;
    tedarikci: string | null;
    beklenenTarih: string | null;
    tamamlandi: boolean;
  }>;
}

type CompletePayload = {
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
};

export default function ServiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingDurum, setEditingDurum] = useState(false);
  const [kapanisModalAcik, setKapanisModalAcik] = useState(false);

  const fetchService = useCallback(async () => {
    try {
      const res = await fetch(`/api/services/${params.id}`);
      if (!res.ok) {
        if (res.status === 404) {
          router.push('/servisler');
          return;
        }
        throw new Error('Servis getirilemedi');
      }

      const data = await res.json();
      setService(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    if (isAuthenticated && params.id) {
      fetchService();
    }
  }, [isAuthenticated, params.id, fetchService]);

  useEffect(() => {
    if (searchParams.get('action') === 'complete') {
      setKapanisModalAcik(true);
      setEditingDurum(false);
    }
  }, [searchParams]);

  const handleDurumUpdate = async (newDurum: ServisDurumu) => {
    if (newDurum === 'TAMAMLANDI') {
      setKapanisModalAcik(true);
      setEditingDurum(false);
      return;
    }

    try {
      const res = await fetch(`/api/services/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ durum: newDurum }),
      });

      if (!res.ok) throw new Error('Durum güncellenemedi');

      const updated = await res.json();
      setService(updated);
      setEditingDurum(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Bir hata oluştu');
    }
  };

  const handlePuanlamaKaydet = async (servisId: string, payload: CompletePayload) => {
    try {
      const res = await fetch(`/api/services/${servisId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Servis tamamlanamadı');

      // Başarılı
      await fetchService(); // Verileri yenile
      setKapanisModalAcik(false);
    } catch (err: unknown) {
      console.error(err);
      alert('Bir hata oluştu: ' + (err instanceof Error ? err.message : 'Bilinmiyor'));
    }
  };


  if (loading) {
    return <div className="p-10 text-center">Yükleniyor...</div>;
  }

  if (error || !service) {
    return (
      <div className="p-10 text-center">
        <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--color-error)' }}>
          {error || 'Servis bulunamadı'}
        </h2>
        <Button onClick={() => router.back()}>
          Geri Dön
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="hero-panel">
        <Button
          variant="ghost"
          className="mb-4 pl-0 hover:bg-transparent text-muted-foreground"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Servislere Dön
        </Button>

        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              {service.tekneAdi}
              <Badge variant="outline" className="text-base font-normal">
                {service.isTuru === 'PAKET' && 'Paket İş'}
                {service.isTuru === 'ARIZA' && 'Arıza / Keşif'}
                {service.isTuru === 'PROJE' && 'Proje / Refit'}
              </Badge>
            </h1>
            <p className="text-muted-foreground text-lg">
              {service.servisAciklamasi}
            </p>
          </div>

          <MinimumRole minimumRole="YETKILI" fallback={<div></div>}>
            <Button
              onClick={() => router.push(`/servisler/${service.id}/duzenle`)}
              className="btn btn-primary"
            >
              <Edit className="w-4 h-4 mr-2" />
              Düzenle
            </Button>
          </MinimumRole>
        </div>
      </div>

      {/* Durum Badge & Actions */}
      <div className="surface-panel flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-muted/30 p-4 rounded-xl border">
        <div
          className="flex items-center gap-4 px-6 py-4 rounded-xl border flex-1 w-full sm:w-auto"
          style={{
            backgroundColor: DURUM_CONFIG[service.durum]?.bgColor,
            borderColor: DURUM_CONFIG[service.durum]?.color,
          }}
        >
          <span className="text-3xl">
            {DURUM_CONFIG[service.durum]?.icon}
          </span>
          <div>
            <div className="text-xl font-bold" style={{ color: DURUM_CONFIG[service.durum]?.color }}>
              {DURUM_CONFIG[service.durum]?.label}
            </div>
            {service.tamamlanmaAt && (
              <div className="text-xs opacity-80 mt-1">
                Tamamlanma: {new Date(service.tamamlanmaAt).toLocaleDateString('tr-TR')}
              </div>
            )}
          </div>
        </div>

        <MinimumRole minimumRole="YETKILI" fallback={<div></div>}>
          <div className="w-full sm:w-auto space-y-2">
            {editingDurum ? (
              <Card className="w-full sm:w-80 shadow-sm animate-in fade-in zoom-in-95 duration-200 surface-panel">
                <div className="p-2 grid gap-1">
                  {(Object.keys(DURUM_CONFIG) as ServisDurumu[]).map((durum) => (
                    <button
                      key={durum}
                      onClick={() => handleDurumUpdate(durum)}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-md hover:brightness-95 transition-all"
                      style={{
                        backgroundColor: DURUM_CONFIG[durum]?.bgColor,
                        color: DURUM_CONFIG[durum]?.color,
                      }}
                    >
                      <span>{DURUM_CONFIG[durum]?.icon}</span>
                      {DURUM_CONFIG[durum]?.label}
                    </button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingDurum(false)}
                    className="mt-2 w-full"
                  >
                    İptal
                  </Button>
                </div>
              </Card>
            ) : (
              <Button
                onClick={() => setEditingDurum(true)}
                variant="outline"
                className="w-full sm:w-auto"
                style={{ borderColor: 'color-mix(in oklab, var(--color-primary) 40%, var(--color-border))', color: 'var(--color-primary)' }}
              >
                Durum Değiştir
              </Button>
            )}
            {/* Boş div editing açılınca layout kaymasın diye yer tutabilir ama absolute olduğu için gerek yok */}
          </div>
        </MinimumRole>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-muted/10 surface-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Tarih & Saat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {service.tarih ? new Date(service.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
            </div>
            <div className="text-sm text-muted-foreground">
              {service.saat || 'Saat belirtilmedi'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/10 surface-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Lokasyon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {service.yer}
            </div>
            <div className="text-sm text-muted-foreground truncate" title={service.adres}>
              {service.adres}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/10 surface-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="w-4 h-4" /> İrtibat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {service.irtibatKisi || '-'}
            </div>
            <div className="text-sm text-muted-foreground">
              {service.telefon || '-'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/10 surface-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Sailboat className="w-4 h-4" /> Tekne Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {service.tekne.marka ? `${service.tekne.marka} - ${service.tekne.model}` : service.tekne.model || service.tekne.ad}
            </div>
            {service.tekne.boyut && (
              <div className="text-sm text-muted-foreground">
                {service.tekne.boyut}m
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">

          {/* Personel Listesi */}
          <Card className="surface-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                Atanan Personel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {service.personeller && service.personeller.length > 0 ? (
                service.personeller.map((sp) => (
                  <div key={sp.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                        style={{
                          background: 'color-mix(in oklab, var(--color-primary) 20%, var(--color-surface-elevated))',
                          color: 'var(--color-primary)',
                        }}
                      >
                        {sp.personel.ad.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{sp.personel.ad}</div>
                        <div className="text-xs text-muted-foreground">{sp.personel.unvan}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={sp.rol === 'SORUMLU' ? 'default' : 'secondary'}>
                        {sp.rol === 'SORUMLU' ? 'Sorumlu' : 'Destek'}
                      </Badge>
                      {sp.bonus && (
                        <Badge
                          variant="outline"
                          style={{
                            color: 'var(--color-warning)',
                            borderColor: 'color-mix(in oklab, var(--color-warning) 40%, var(--color-border))',
                            background: 'color-mix(in oklab, var(--color-warning) 14%, var(--color-surface-elevated))',
                          }}
                        >
                          Star Bonus
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  Henüz personel atanmamış.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Taşeron Notları */}
          {service.taseronNotlari && (
            <Card className="surface-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />
                  Taşeron Notları
              </CardTitle>
            </CardHeader>
            <CardContent>
                <div
                  className="p-4 rounded-lg border text-sm leading-relaxed whitespace-pre-wrap"
                  style={{
                    background: 'color-mix(in oklab, var(--color-warning) 10%, var(--color-surface-elevated))',
                    borderColor: 'color-mix(in oklab, var(--color-warning) 30%, var(--color-border))',
                    color: 'var(--color-text)',
                  }}
                >
                  {service.taseronNotlari}
                </div>
              </CardContent>
            </Card>
          )}

        </div>

        {/* Right Column - Parts & Extras */}
        <div className="space-y-6">
          {/* Bekleyen Parçalar */}
          <Card className="surface-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Box className="w-5 h-5" style={{ color: 'var(--color-info)' }} />
                Bekleyen Parçalar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {service.bekleyenParcalar && service.bekleyenParcalar.length > 0 ? (
                service.bekleyenParcalar.map((parca) => (
                  <div
                    key={parca.id}
                    className="p-3 rounded-lg border"
                    style={
                      parca.tamamlandi
                        ? {
                            background: 'color-mix(in oklab, var(--color-success) 12%, var(--color-surface-elevated))',
                            borderColor: 'color-mix(in oklab, var(--color-success) 38%, var(--color-border))',
                          }
                        : {
                            background: 'color-mix(in oklab, var(--color-warning) 12%, var(--color-surface-elevated))',
                            borderColor: 'color-mix(in oklab, var(--color-warning) 38%, var(--color-border))',
                          }
                    }
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm">{parca.parcaAdi}</span>
                      {parca.tamamlandi ? (
                        <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
                      ) : (
                        <span className="w-2 h-2 rounded-full mt-1.5" style={{ background: 'var(--color-warning)' }} />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-col gap-1">
                      <div className="flex justify-between">
                        <span>Adet: {parca.miktar} {parca.birim}</span>
                        {parca.beklenenTarih && <span>{new Date(parca.beklenenTarih).toLocaleDateString('tr-TR')}</span>}
                      </div>
                      {parca.tedarikci && <div>Ted: {parca.tedarikci}</div>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Bekleyen parça kaydı yok.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timestamps Info */}
          <div className="text-xs text-muted-foreground space-y-1 px-1">
            <div>Oluşturulma: {new Date(service.createdAt).toLocaleString('tr-TR')}</div>
            {service.updatedAt !== service.createdAt && (
              <div>Güncelleme: {new Date(service.updatedAt).toLocaleString('tr-TR')}</div>
            )}
          </div>
        </div>
      </div>

      {/* Kapanış Modalı */}
      {service && (
        <ServisKapanisModal
          acik={kapanisModalAcik}
          onKapat={() => setKapanisModalAcik(false)}
          servis={{
            servisId: service.id,
            tekneAdi: service.tekneAdi,
            isTuru: service.isTuru,
            servisAciklamasi: service.servisAciklamasi,
            yer: service.yer,
            personeller: service.personeller.map(p => ({
              personelId: p.personel.id,
              personelAd: p.personel.ad,
              rol: p.rol as 'SORUMLU' | 'DESTEK',
              unvan: p.personel.unvan as 'USTA' | 'CIRAK'
            })),
            zorlukSeviyesi: service.zorlukSeviyesi // null olabilir
          }}
          onPuanlamaKaydet={handlePuanlamaKaydet}
        />
      )}
    </div>
  );
}




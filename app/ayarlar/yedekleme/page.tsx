'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type YedekListeElemani = {
  id: string;
  dosyaAdi: string;
  tarih: string;
  tur: 'manuel' | 'otomatik';
  boyut: string;
  durum: 'tamamlandi' | 'hatali';
  kayitSayisi: number;
};

function tarihFormatla(tarih: string): string {
  const parsed = new Date(tarih);
  if (Number.isNaN(parsed.getTime())) return tarih;
  return parsed.toLocaleString('tr-TR');
}

export default function YedeklemePage() {
  const [yedekler, setYedekler] = useState<YedekListeElemani[]>([]);
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);
  const [basariMesaji, setBasariMesaji] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState<boolean>(true);
  const [olusturuluyor, setOlusturuluyor] = useState<boolean>(false);

  const yedekleriYukle = useCallback(async () => {
    setYukleniyor(true);
    setHataMesaji(null);

    try {
      const response = await fetch('/api/yedekleme', {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Yedek listesi alinamadi');
      }

      const data = (await response.json()) as YedekListeElemani[];
      setYedekler(data);
    } catch (hata) {
      console.error(hata);
      setHataMesaji('Yedekler yuklenirken bir hata olustu.');
    } finally {
      setYukleniyor(false);
    }
  }, []);

  const yedekOlustur = useCallback(async () => {
    setOlusturuluyor(true);
    setHataMesaji(null);
    setBasariMesaji(null);

    try {
      const response = await fetch('/api/yedekleme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tur: 'manuel' }),
      });

      if (!response.ok) {
        throw new Error('Yedek olusturulamadi');
      }

      const yedek = (await response.json()) as YedekListeElemani;
      setBasariMesaji(`Yedek olusturuldu: ${yedek.dosyaAdi}`);
      await yedekleriYukle();
    } catch (hata) {
      console.error(hata);
      setHataMesaji('Yedek olusturma sirasinda bir hata olustu.');
    } finally {
      setOlusturuluyor(false);
    }
  }, [yedekleriYukle]);

  useEffect(() => {
    void yedekleriYukle();
  }, [yedekleriYukle]);

  const toplamKayit = useMemo(() => yedekler.length, [yedekler]);

  return (
    <div className="container mx-auto space-y-6 py-8" data-testid="backup-page">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Veri Yedekleme</h1>
        <p className="text-sm text-muted-foreground">
          Veritabani, ayarlar ve sync log verilerini NAS dizinine JSON formatinda yedekleyin.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Yeni Yedek</CardTitle>
          <CardDescription>Manuel yedek olusturup dosya listesini yeniler.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            type="button"
            onClick={() => void yedekOlustur()}
            disabled={olusturuluyor}
            data-testid="backup-create-button"
          >
            {olusturuluyor ? 'Yedek olusturuluyor...' : 'Yedek Olustur'}
          </Button>

          {basariMesaji ? (
            <div
              className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700"
              data-testid="backup-success-message"
            >
              {basariMesaji}
            </div>
          ) : null}

          {hataMesaji ? (
            <div
              className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700"
              data-testid="backup-error-message"
            >
              {hataMesaji}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Yedek Gecmisi</CardTitle>
          <CardDescription>
            Toplam {toplamKayit} adet yedek bulundu. En guncel yedek ustte gorunur.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {yukleniyor ? (
            <p className="text-sm text-muted-foreground">Yedekler yukleniyor...</p>
          ) : (
            <div className="space-y-2" data-testid="backup-list">
              {yedekler.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henuz yedek dosyasi yok.</p>
              ) : (
                yedekler.map((yedek) => (
                  <div
                    key={yedek.id}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                    data-testid={`backup-item-${yedek.id}`}
                  >
                    <div className="font-medium">{yedek.dosyaAdi}</div>
                    <div className="text-xs text-muted-foreground">
                      {tarihFormatla(yedek.tarih)} | {yedek.tur} | {yedek.boyut} | Kayit:{' '}
                      {yedek.kayitSayisi}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

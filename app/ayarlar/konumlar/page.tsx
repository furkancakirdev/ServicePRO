'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { KonumDialog, type KonumFormVerisi } from '@/components/admin/konumlar/KonumDialog';
import { KonumlarTable, type KonumKaydiDto } from '@/components/admin/konumlar/KonumlarTable';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type DialogDurumu = {
  acik: boolean;
  mod: 'create' | 'edit';
  hedef: KonumKaydiDto | null;
};

const ILK_DIALOG_DURUMU: DialogDurumu = {
  acik: false,
  mod: 'create',
  hedef: null,
};

export default function KonumlarPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [konumlar, setKonumlar] = useState<KonumKaydiDto[]>([]);
  const [veriYukleniyor, setVeriYukleniyor] = useState(true);
  const [kaydetmeYukleniyor, setKaydetmeYukleniyor] = useState(false);
  const [silinenKonumId, setSilinenKonumId] = useState<string | null>(null);
  const [dialogDurumu, setDialogDurumu] = useState<DialogDurumu>(ILK_DIALOG_DURUMU);

  async function konumlariYukle(): Promise<void> {
    setVeriYukleniyor(true);
    try {
      const response = await fetch('/api/admin/konumlar', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Konumlar yüklenemedi');
      }

      const body = (await response.json()) as KonumKaydiDto[];
      setKonumlar(body);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Konumlar yüklenemedi');
    } finally {
      setVeriYukleniyor(false);
    }
  }

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'ADMIN') {
      router.replace('/');
      return;
    }
    void konumlariYukle();
  }, [isLoading, router, user]);

  const dialogVarsayilanDegerleri = useMemo<Partial<KonumFormVerisi> | undefined>(() => {
    if (dialogDurumu.mod !== 'edit' || !dialogDurumu.hedef) return undefined;
    return {
      key: dialogDurumu.hedef.key,
      label: dialogDurumu.hedef.label,
      adres: dialogDurumu.hedef.adres ?? '',
      telefon: dialogDurumu.hedef.telefon ?? '',
      sirasi: dialogDurumu.hedef.sirasi,
      aktif: dialogDurumu.hedef.aktif,
    };
  }, [dialogDurumu.hedef, dialogDurumu.mod]);

  async function konumKaydet(formVerisi: KonumFormVerisi): Promise<void> {
    setKaydetmeYukleniyor(true);
    try {
      const payload = {
        key: formVerisi.key,
        label: formVerisi.label,
        adres: formVerisi.adres || null,
        telefon: formVerisi.telefon || null,
        sirasi: formVerisi.sirasi,
        aktif: formVerisi.aktif,
      };

      if (dialogDurumu.mod === 'create') {
        const response = await fetch('/api/admin/konumlar', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({ error: 'Konum eklenemedi' }));
          throw new Error(typeof body.error === 'string' ? body.error : 'Konum eklenemedi');
        }

        toast.success('Konum eklendi');
      } else if (dialogDurumu.hedef) {
        const response = await fetch(`/api/admin/konumlar/${dialogDurumu.hedef.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({ error: 'Konum güncellenemedi' }));
          throw new Error(typeof body.error === 'string' ? body.error : 'Konum güncellenemedi');
        }

        toast.success('Konum güncellendi');
      }

      setDialogDurumu(ILK_DIALOG_DURUMU);
      await konumlariYukle();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Konum kaydedilemedi');
    } finally {
      setKaydetmeYukleniyor(false);
    }
  }

  async function konumSil(konum: KonumKaydiDto): Promise<void> {
    if (!window.confirm(`"${konum.label}" konumunu silmek istediğinize emin misiniz?`)) {
      return;
    }

    setSilinenKonumId(konum.id);
    try {
      const response = await fetch(`/api/admin/konumlar/${konum.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Konum silinemedi' }));
        throw new Error(typeof body.error === 'string' ? body.error : 'Konum silinemedi');
      }

      toast.success('Konum silindi');
      await konumlariYukle();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Konum silinemedi');
    } finally {
      setSilinenKonumId(null);
    }
  }

  if (isLoading || veriYukleniyor) {
    return (
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-6 text-sm text-slate-300">
        Konumlar yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="hero-panel flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ayarlar">
            <Button variant="secondary" size="icon" aria-label="Ayarlar sayfasına dön">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="page-title">Konum Yönetimi</h1>
            <p className="page-subtitle">Toplam {konumlar.length} konum kaydı</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => void konumlariYukle()}
            disabled={veriYukleniyor}
          >
            <RefreshCw className="h-4 w-4" />
            Yenile
          </Button>
          <Button
            className="gap-2"
            data-testid="konum-create-button"
            onClick={() =>
              setDialogDurumu({
                acik: true,
                mod: 'create',
                hedef: null,
              })
            }
          >
            <Plus className="h-4 w-4" />
            Yeni Ekle
          </Button>
        </div>
      </header>

      <Card className="surface-panel border-slate-800/80 bg-slate-950/50">
        <CardHeader>
          <CardTitle className="text-slate-100">Servis Konumları</CardTitle>
        </CardHeader>
        <CardContent>
          <KonumlarTable
            konumlar={konumlar}
            silinenKonumId={silinenKonumId}
            onDuzenle={(konum) =>
              setDialogDurumu({
                acik: true,
                mod: 'edit',
                hedef: konum,
              })
            }
            onSil={konumSil}
          />
        </CardContent>
      </Card>

      <KonumDialog
        acik={dialogDurumu.acik}
        mod={dialogDurumu.mod}
        kaydediliyor={kaydetmeYukleniyor}
        varsayilanDegerler={dialogVarsayilanDegerleri}
        onAcikDegisti={(acik) => {
          if (!acik) {
            setDialogDurumu(ILK_DIALOG_DURUMU);
            return;
          }
          setDialogDurumu((prev) => ({ ...prev, acik }));
        }}
        onKaydet={konumKaydet}
      />
    </div>
  );
}

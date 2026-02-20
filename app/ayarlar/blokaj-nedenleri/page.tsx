'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  BlokajNedeniDialog,
  type BlokajNedeniDurumSecenegi,
  type BlokajNedeniFormVerisi,
} from '@/components/admin/blokaj-nedenleri/BlokajNedeniDialog';
import {
  BlokajNedenleriTable,
  type BlokajNedeniKaydiDto,
} from '@/components/admin/blokaj-nedenleri/BlokajNedenleriTable';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type DialogDurumu = {
  acik: boolean;
  mod: 'create' | 'edit';
  hedef: BlokajNedeniKaydiDto | null;
};

type SozlukYanit = {
  statuses: Array<{
    key: string;
    label: string;
  }>;
};

const ILK_DIALOG_DURUMU: DialogDurumu = {
  acik: false,
  mod: 'create',
  hedef: null,
};

export default function BlokajNedenleriPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [nedenler, setNedenler] = useState<BlokajNedeniKaydiDto[]>([]);
  const [durumSecenekleri, setDurumSecenekleri] = useState<BlokajNedeniDurumSecenegi[]>([]);
  const [veriYukleniyor, setVeriYukleniyor] = useState(true);
  const [kaydetmeYukleniyor, setKaydetmeYukleniyor] = useState(false);
  const [silinenNedenId, setSilinenNedenId] = useState<string | null>(null);
  const [dialogDurumu, setDialogDurumu] = useState<DialogDurumu>(ILK_DIALOG_DURUMU);

  async function nedenleriYukle(): Promise<void> {
    setVeriYukleniyor(true);
    try {
      const response = await fetch('/api/admin/blokaj-nedenleri', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Blokaj nedenleri yuklenemedi');
      }

      const body = (await response.json()) as BlokajNedeniKaydiDto[];
      setNedenler(body);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Blokaj nedenleri yuklenemedi');
    } finally {
      setVeriYukleniyor(false);
    }
  }

  async function durumSecenekleriniYukle(): Promise<void> {
    try {
      const response = await fetch('/api/dictionaries/work-order', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) throw new Error('Durum sozlugu yuklenemedi');
      const body = (await response.json()) as SozlukYanit;
      const secenekler = body.statuses.map((durum) => ({
        value: durum.key,
        label: durum.label,
      }));
      setDurumSecenekleri(secenekler);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Durum secenekleri yuklenemedi');
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
    void Promise.all([nedenleriYukle(), durumSecenekleriniYukle()]);
  }, [isLoading, router, user]);

  const dialogVarsayilanDegerleri = useMemo<Partial<BlokajNedeniFormVerisi> | undefined>(() => {
    if (dialogDurumu.mod !== 'edit' || !dialogDurumu.hedef) return undefined;
    return {
      key: dialogDurumu.hedef.key,
      label: dialogDurumu.hedef.label,
      description: dialogDurumu.hedef.description ?? '',
      durumKey: dialogDurumu.hedef.durumKey,
      sirasi: dialogDurumu.hedef.sirasi,
      aktif: dialogDurumu.hedef.aktif,
    };
  }, [dialogDurumu.hedef, dialogDurumu.mod]);

  async function nedenKaydet(formVerisi: BlokajNedeniFormVerisi): Promise<void> {
    setKaydetmeYukleniyor(true);
    try {
      const payload = {
        key: formVerisi.key,
        label: formVerisi.label,
        description: formVerisi.description || null,
        durumKey: formVerisi.durumKey,
        sirasi: formVerisi.sirasi,
        aktif: formVerisi.aktif,
      };

      if (dialogDurumu.mod === 'create') {
        const response = await fetch('/api/admin/blokaj-nedenleri', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({ error: 'Blokaj nedeni eklenemedi' }));
          throw new Error(typeof body.error === 'string' ? body.error : 'Blokaj nedeni eklenemedi');
        }

        toast.success('Blokaj nedeni eklendi');
      } else if (dialogDurumu.hedef) {
        const response = await fetch(`/api/admin/blokaj-nedenleri/${dialogDurumu.hedef.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({ error: 'Blokaj nedeni guncellenemedi' }));
          throw new Error(typeof body.error === 'string' ? body.error : 'Blokaj nedeni guncellenemedi');
        }

        toast.success('Blokaj nedeni guncellendi');
      }

      setDialogDurumu(ILK_DIALOG_DURUMU);
      await nedenleriYukle();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Blokaj nedeni kaydedilemedi');
    } finally {
      setKaydetmeYukleniyor(false);
    }
  }

  async function nedenSil(neden: BlokajNedeniKaydiDto): Promise<void> {
    if (!window.confirm(`"${neden.label}" blokaj nedenini silmek istediginize emin misiniz?`)) {
      return;
    }

    setSilinenNedenId(neden.id);
    try {
      const response = await fetch(`/api/admin/blokaj-nedenleri/${neden.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Blokaj nedeni silinemedi' }));
        throw new Error(typeof body.error === 'string' ? body.error : 'Blokaj nedeni silinemedi');
      }

      toast.success('Blokaj nedeni silindi');
      await nedenleriYukle();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Blokaj nedeni silinemedi');
    } finally {
      setSilinenNedenId(null);
    }
  }

  if (isLoading || veriYukleniyor) {
    return (
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-6 text-sm text-slate-300">
        Blokaj nedenleri yukleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="hero-panel flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ayarlar">
            <Button variant="secondary" size="icon" aria-label="Ayarlar sayfasina don">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="page-title">Blokaj Nedeni Yonetimi</h1>
            <p className="page-subtitle">Toplam {nedenler.length} blokaj nedeni kaydi</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => void nedenleriYukle()}
            disabled={veriYukleniyor}
          >
            <RefreshCw className="h-4 w-4" />
            Yenile
          </Button>
          <Button
            className="gap-2"
            data-testid="blocking-reason-create-button"
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
          <CardTitle className="text-slate-100">Blokaj Nedenleri</CardTitle>
        </CardHeader>
        <CardContent>
          <BlokajNedenleriTable
            nedenler={nedenler}
            silinenNedenId={silinenNedenId}
            onDuzenle={(neden) =>
              setDialogDurumu({
                acik: true,
                mod: 'edit',
                hedef: neden,
              })
            }
            onSil={nedenSil}
          />
        </CardContent>
      </Card>

      <BlokajNedeniDialog
        acik={dialogDurumu.acik}
        mod={dialogDurumu.mod}
        kaydediliyor={kaydetmeYukleniyor}
        durumSecenekleri={durumSecenekleri}
        varsayilanDegerler={dialogVarsayilanDegerleri}
        onAcikDegisti={(acik) => {
          if (!acik) {
            setDialogDurumu(ILK_DIALOG_DURUMU);
            return;
          }
          setDialogDurumu((prev) => ({ ...prev, acik }));
        }}
        onKaydet={nedenKaydet}
      />
    </div>
  );
}

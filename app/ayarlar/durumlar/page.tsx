'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { DurumDialog, type DurumFormVerisi } from '@/components/admin/durumlar/DurumDialog';
import { DurumlarTable, type DurumKaydiDto } from '@/components/admin/durumlar/DurumlarTable';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type DialogDurumu = {
  acik: boolean;
  mod: 'create' | 'edit';
  hedef: DurumKaydiDto | null;
};

const ILK_DIALOG_DURUMU: DialogDurumu = {
  acik: false,
  mod: 'create',
  hedef: null,
};

export default function DurumlarPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [durumlar, setDurumlar] = useState<DurumKaydiDto[]>([]);
  const [veriYukleniyor, setVeriYukleniyor] = useState(true);
  const [kaydetmeYukleniyor, setKaydetmeYukleniyor] = useState(false);
  const [silinenDurumId, setSilinenDurumId] = useState<string | null>(null);
  const [dialogDurumu, setDialogDurumu] = useState<DialogDurumu>(ILK_DIALOG_DURUMU);

  async function durumlariYukle(): Promise<void> {
    setVeriYukleniyor(true);
    try {
      const response = await fetch('/api/admin/durumlar', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Durumlar yüklenemedi');
      }

      const body = (await response.json()) as DurumKaydiDto[];
      setDurumlar(body);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Durumlar yüklenemedi');
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
    void durumlariYukle();
  }, [isLoading, router, user]);

  const dialogVarsayilanDegerleri = useMemo<Partial<DurumFormVerisi> | undefined>(() => {
    if (dialogDurumu.mod !== 'edit' || !dialogDurumu.hedef) return undefined;
    return {
      key: dialogDurumu.hedef.key,
      label: dialogDurumu.hedef.label,
      description: dialogDurumu.hedef.description ?? '',
      color: dialogDurumu.hedef.color,
      icon: dialogDurumu.hedef.icon ?? '',
      sirasi: dialogDurumu.hedef.sirasi,
      aktif: dialogDurumu.hedef.aktif,
    };
  }, [dialogDurumu.hedef, dialogDurumu.mod]);

  async function durumKaydet(formVerisi: DurumFormVerisi): Promise<void> {
    setKaydetmeYukleniyor(true);
    try {
      const payload = {
        key: formVerisi.key,
        label: formVerisi.label,
        description: formVerisi.description || null,
        color: formVerisi.color,
        icon: formVerisi.icon || null,
        sirasi: formVerisi.sirasi,
        aktif: formVerisi.aktif,
      };

      if (dialogDurumu.mod === 'create') {
        const response = await fetch('/api/admin/durumlar', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({ error: 'Durum eklenemedi' }));
          throw new Error(typeof body.error === 'string' ? body.error : 'Durum eklenemedi');
        }

        toast.success('Durum eklendi');
      } else if (dialogDurumu.hedef) {
        const response = await fetch(`/api/admin/durumlar/${dialogDurumu.hedef.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({ error: 'Durum güncellenemedi' }));
          throw new Error(typeof body.error === 'string' ? body.error : 'Durum güncellenemedi');
        }

        toast.success('Durum güncellendi');
      }

      setDialogDurumu(ILK_DIALOG_DURUMU);
      await durumlariYukle();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Durum kaydedilemedi');
    } finally {
      setKaydetmeYukleniyor(false);
    }
  }

  async function durumSil(durum: DurumKaydiDto): Promise<void> {
    if (!window.confirm(`"${durum.label}" durumunu silmek istediğinize emin misiniz?`)) {
      return;
    }

    setSilinenDurumId(durum.id);
    try {
      const response = await fetch(`/api/admin/durumlar/${durum.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Durum silinemedi' }));
        throw new Error(typeof body.error === 'string' ? body.error : 'Durum silinemedi');
      }

      toast.success('Durum silindi');
      await durumlariYukle();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Durum silinemedi');
    } finally {
      setSilinenDurumId(null);
    }
  }

  if (isLoading || veriYukleniyor) {
    return (
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-6 text-sm text-slate-300">
        Durumlar yükleniyor...
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
            <h1 className="page-title">Durum Yönetimi</h1>
            <p className="page-subtitle">Toplam {durumlar.length} durum kaydı</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => void durumlariYukle()}
            disabled={veriYukleniyor}
          >
            <RefreshCw className="h-4 w-4" />
            Yenile
          </Button>
          <Button
            className="gap-2"
            data-testid="status-create-button"
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
          <CardTitle className="text-slate-100">Servis Durumları</CardTitle>
        </CardHeader>
        <CardContent>
          <DurumlarTable
            durumlar={durumlar}
            silinenDurumId={silinenDurumId}
            onDuzenle={(durum) =>
              setDialogDurumu({
                acik: true,
                mod: 'edit',
                hedef: durum,
              })
            }
            onSil={durumSil}
          />
        </CardContent>
      </Card>

      <DurumDialog
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
        onKaydet={durumKaydet}
      />
    </div>
  );
}

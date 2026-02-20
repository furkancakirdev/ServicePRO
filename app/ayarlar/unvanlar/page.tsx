'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { UnvanDialog, type UnvanFormVerisi } from '@/components/admin/unvanlar/UnvanDialog';
import { UnvanlarTable, type UnvanKaydiDto } from '@/components/admin/unvanlar/UnvanlarTable';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type DialogDurumu = {
  acik: boolean;
  mod: 'create' | 'edit';
  hedef: UnvanKaydiDto | null;
};

const ILK_DIALOG_DURUMU: DialogDurumu = {
  acik: false,
  mod: 'create',
  hedef: null,
};

export default function UnvanlarPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [unvanlar, setUnvanlar] = useState<UnvanKaydiDto[]>([]);
  const [veriYukleniyor, setVeriYukleniyor] = useState(true);
  const [kaydetmeYukleniyor, setKaydetmeYukleniyor] = useState(false);
  const [silinenUnvanId, setSilinenUnvanId] = useState<string | null>(null);
  const [dialogDurumu, setDialogDurumu] = useState<DialogDurumu>(ILK_DIALOG_DURUMU);

  async function unvanlariYukle(): Promise<void> {
    setVeriYukleniyor(true);
    try {
      const response = await fetch('/api/admin/unvanlar', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Unvanlar yüklenemedi');
      }

      const body = (await response.json()) as UnvanKaydiDto[];
      setUnvanlar(body);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unvanlar yüklenemedi');
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
    void unvanlariYukle();
  }, [isLoading, router, user]);

  const dialogVarsayilanDegerleri = useMemo<Partial<UnvanFormVerisi> | undefined>(() => {
    if (dialogDurumu.mod !== 'edit' || !dialogDurumu.hedef) return undefined;
    return {
      key: dialogDurumu.hedef.key,
      label: dialogDurumu.hedef.label,
      puanCarpani: dialogDurumu.hedef.puanCarpani,
      sirasi: dialogDurumu.hedef.sirasi,
      aktif: dialogDurumu.hedef.aktif,
    };
  }, [dialogDurumu.hedef, dialogDurumu.mod]);

  async function unvanKaydet(formVerisi: UnvanFormVerisi): Promise<void> {
    setKaydetmeYukleniyor(true);
    try {
      const payload = {
        key: formVerisi.key,
        label: formVerisi.label,
        puanCarpani: formVerisi.puanCarpani,
        sirasi: formVerisi.sirasi,
        aktif: formVerisi.aktif,
      };

      if (dialogDurumu.mod === 'create') {
        const response = await fetch('/api/admin/unvanlar', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({ error: 'Unvan eklenemedi' }));
          throw new Error(typeof body.error === 'string' ? body.error : 'Unvan eklenemedi');
        }

        toast.success('Unvan eklendi');
      } else if (dialogDurumu.hedef) {
        const response = await fetch(`/api/admin/unvanlar/${dialogDurumu.hedef.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({ error: 'Unvan güncellenemedi' }));
          throw new Error(typeof body.error === 'string' ? body.error : 'Unvan güncellenemedi');
        }

        toast.success('Unvan güncellendi');
      }

      setDialogDurumu(ILK_DIALOG_DURUMU);
      await unvanlariYukle();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unvan kaydedilemedi');
    } finally {
      setKaydetmeYukleniyor(false);
    }
  }

  async function unvanSil(unvan: UnvanKaydiDto): Promise<void> {
    if (!window.confirm(`"${unvan.label}" unvanını silmek istediğinize emin misiniz?`)) {
      return;
    }

    setSilinenUnvanId(unvan.id);
    try {
      const response = await fetch(`/api/admin/unvanlar/${unvan.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Unvan silinemedi' }));
        throw new Error(typeof body.error === 'string' ? body.error : 'Unvan silinemedi');
      }

      toast.success('Unvan silindi');
      await unvanlariYukle();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unvan silinemedi');
    } finally {
      setSilinenUnvanId(null);
    }
  }

  if (isLoading || veriYukleniyor) {
    return (
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-6 text-sm text-slate-300">
        Unvanlar yükleniyor...
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
            <h1 className="page-title">Personel Unvan Yönetimi</h1>
            <p className="page-subtitle">Toplam {unvanlar.length} unvan kaydı</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => void unvanlariYukle()}
            disabled={veriYukleniyor}
          >
            <RefreshCw className="h-4 w-4" />
            Yenile
          </Button>
          <Button
            className="gap-2"
            data-testid="unvan-create-button"
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
          <CardTitle className="text-slate-100">Personel Unvanları</CardTitle>
        </CardHeader>
        <CardContent>
          <UnvanlarTable
            unvanlar={unvanlar}
            silinenUnvanId={silinenUnvanId}
            onDuzenle={(unvan) =>
              setDialogDurumu({
                acik: true,
                mod: 'edit',
                hedef: unvan,
              })
            }
            onSil={unvanSil}
          />
        </CardContent>
      </Card>

      <UnvanDialog
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
        onKaydet={unvanKaydet}
      />
    </div>
  );
}

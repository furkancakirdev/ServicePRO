'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export type UnvanFormVerisi = {
  key: string;
  label: string;
  puanCarpani: number;
  sirasi: number;
  aktif: boolean;
};

type UnvanDialogProps = {
  acik: boolean;
  mod: 'create' | 'edit';
  kaydediliyor: boolean;
  varsayilanDegerler?: Partial<UnvanFormVerisi>;
  onAcikDegisti: (acik: boolean) => void;
  onKaydet: (degerler: UnvanFormVerisi) => Promise<void>;
};

const BOS_FORM: UnvanFormVerisi = {
  key: '',
  label: '',
  puanCarpani: 1,
  sirasi: 0,
  aktif: true,
};

function formDegerleriniBirlestir(
  varsayilanDegerler: Partial<UnvanFormVerisi> | undefined
): UnvanFormVerisi {
  return {
    ...BOS_FORM,
    ...varsayilanDegerler,
    puanCarpani: varsayilanDegerler?.puanCarpani ?? 1,
    sirasi: varsayilanDegerler?.sirasi ?? 0,
    aktif: varsayilanDegerler?.aktif ?? true,
  };
}

export function UnvanDialog({
  acik,
  mod,
  kaydediliyor,
  varsayilanDegerler,
  onAcikDegisti,
  onKaydet,
}: UnvanDialogProps) {
  const [form, setForm] = useState<UnvanFormVerisi>(formDegerleriniBirlestir(varsayilanDegerler));

  useEffect(() => {
    if (!acik) return;
    setForm(formDegerleriniBirlestir(varsayilanDegerler));
  }, [acik, varsayilanDegerler]);

  const baslik = mod === 'create' ? 'Yeni Unvan Ekle' : 'Unvan Düzenle';
  const aciklama =
    mod === 'create'
      ? 'Personel unvanlarını ve puan çarpanlarını dinamik yönetin.'
      : 'Unvan ve katsayı güncellemeleri puanlama akışını etkiler.';
  const dialogTestId = useMemo(
    () => (mod === 'create' ? 'unvan-create-dialog' : 'unvan-edit-dialog'),
    [mod]
  );

  return (
    <Dialog open={acik} onOpenChange={onAcikDegisti}>
      <DialogContent
        className="border-slate-800 bg-slate-950 text-slate-100"
        data-testid={dialogTestId}
      >
        <DialogHeader>
          <DialogTitle>{baslik}</DialogTitle>
          <DialogDescription>{aciklama}</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            await onKaydet(form);
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="unvan-key-input">Key</Label>
              <Input
                id="unvan-key-input"
                data-testid="unvan-key-input"
                value={form.key}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    key: event.target.value.toUpperCase().replace(/\s+/g, '_'),
                  }))
                }
                placeholder="USTA"
                disabled={kaydediliyor}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unvan-label-input">Etiket</Label>
              <Input
                id="unvan-label-input"
                data-testid="unvan-label-input"
                value={form.label}
                onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                placeholder="Usta"
                disabled={kaydediliyor}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="unvan-puan-carpani-input">Puan Çarpanı</Label>
              <Input
                id="unvan-puan-carpani-input"
                data-testid="unvan-puan-carpani-input"
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={String(form.puanCarpani)}
                onChange={(event) => {
                  const sayi = Number.parseFloat(event.target.value);
                  setForm((prev) => ({ ...prev, puanCarpani: Number.isFinite(sayi) ? sayi : 1 }));
                }}
                disabled={kaydediliyor}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unvan-sira-input">Sıra</Label>
              <Input
                id="unvan-sira-input"
                data-testid="unvan-sira-input"
                type="number"
                min={0}
                value={String(form.sirasi)}
                onChange={(event) => {
                  const sayi = Number.parseInt(event.target.value, 10);
                  setForm((prev) => ({ ...prev, sirasi: Number.isFinite(sayi) ? sayi : 0 }));
                }}
                disabled={kaydediliyor}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-slate-800 p-3">
            <div>
              <p className="text-sm font-medium text-slate-200">Unvan aktif</p>
              <p className="text-xs text-slate-400">Pasif unvanlar atama listesinde görünmez.</p>
            </div>
            <Switch
              checked={form.aktif}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, aktif: checked }))}
              disabled={kaydediliyor}
              data-testid="unvan-active-switch"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onAcikDegisti(false)}>
              İptal
            </Button>
            <Button type="submit" data-testid="unvan-save-button" disabled={kaydediliyor}>
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

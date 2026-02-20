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

export type KonumFormVerisi = {
  key: string;
  label: string;
  adres: string;
  telefon: string;
  sirasi: number;
  aktif: boolean;
};

type KonumDialogProps = {
  acik: boolean;
  mod: 'create' | 'edit';
  kaydediliyor: boolean;
  varsayilanDegerler?: Partial<KonumFormVerisi>;
  onAcikDegisti: (acik: boolean) => void;
  onKaydet: (degerler: KonumFormVerisi) => Promise<void>;
};

const BOS_FORM: KonumFormVerisi = {
  key: '',
  label: '',
  adres: '',
  telefon: '',
  sirasi: 0,
  aktif: true,
};

function formDegerleriniBirlestir(
  varsayilanDegerler: Partial<KonumFormVerisi> | undefined
): KonumFormVerisi {
  return {
    ...BOS_FORM,
    ...varsayilanDegerler,
    adres: varsayilanDegerler?.adres ?? '',
    telefon: varsayilanDegerler?.telefon ?? '',
    sirasi: varsayilanDegerler?.sirasi ?? 0,
    aktif: varsayilanDegerler?.aktif ?? true,
  };
}

export function KonumDialog({
  acik,
  mod,
  kaydediliyor,
  varsayilanDegerler,
  onAcikDegisti,
  onKaydet,
}: KonumDialogProps) {
  const [form, setForm] = useState<KonumFormVerisi>(formDegerleriniBirlestir(varsayilanDegerler));

  useEffect(() => {
    if (!acik) return;
    setForm(formDegerleriniBirlestir(varsayilanDegerler));
  }, [acik, varsayilanDegerler]);

  const baslik = mod === 'create' ? 'Yeni Konum Ekle' : 'Konum Düzenle';
  const aciklama =
    mod === 'create'
      ? 'Konum tanımları servis kayıtlarında lokasyon standardını korur.'
      : 'Konum bilgilerini güncelleyerek lokasyon yönetimini düzene alın.';
  const dialogTestId = useMemo(
    () => (mod === 'create' ? 'konum-create-dialog' : 'konum-edit-dialog'),
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
              <Label htmlFor="konum-key-input">Key</Label>
              <Input
                id="konum-key-input"
                data-testid="konum-key-input"
                value={form.key}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    key: event.target.value.toUpperCase().replace(/\s+/g, '_'),
                  }))
                }
                placeholder="YATMARIN"
                disabled={kaydediliyor}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="konum-label-input">Etiket</Label>
              <Input
                id="konum-label-input"
                data-testid="konum-label-input"
                value={form.label}
                onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                placeholder="Yatmarin (Merkez)"
                disabled={kaydediliyor}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="konum-adres-input">Adres</Label>
              <Input
                id="konum-adres-input"
                data-testid="konum-adres-input"
                value={form.adres}
                onChange={(event) => setForm((prev) => ({ ...prev, adres: event.target.value }))}
                placeholder="Marmaris Marina No:1"
                disabled={kaydediliyor}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="konum-telefon-input">Telefon</Label>
              <Input
                id="konum-telefon-input"
                data-testid="konum-telefon-input"
                value={form.telefon}
                onChange={(event) => setForm((prev) => ({ ...prev, telefon: event.target.value }))}
                placeholder="+90 252 000 00 00"
                disabled={kaydediliyor}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="konum-sira-input">Sıra</Label>
              <Input
                id="konum-sira-input"
                data-testid="konum-sira-input"
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

            <div className="flex items-end">
              <div className="flex w-full items-center justify-between rounded-md border border-slate-800 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-200">Konum aktif</p>
                  <p className="text-xs text-slate-400">Pasif konumlar seçimlerde görünmez.</p>
                </div>
                <Switch
                  checked={form.aktif}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, aktif: checked }))}
                  disabled={kaydediliyor}
                  data-testid="konum-active-switch"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onAcikDegisti(false)}>
              İptal
            </Button>
            <Button type="submit" data-testid="konum-save-button" disabled={kaydediliyor}>
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

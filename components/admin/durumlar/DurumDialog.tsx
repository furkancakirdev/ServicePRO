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
import { Textarea } from '@/components/ui/textarea';

export type DurumFormVerisi = {
  key: string;
  label: string;
  description: string;
  color: string;
  icon: string;
  sirasi: number;
  aktif: boolean;
};

type DurumDialogProps = {
  acik: boolean;
  mod: 'create' | 'edit';
  kaydediliyor: boolean;
  varsayilanDegerler?: Partial<DurumFormVerisi>;
  onAcikDegisti: (acik: boolean) => void;
  onKaydet: (degerler: DurumFormVerisi) => Promise<void>;
};

const BOS_FORM: DurumFormVerisi = {
  key: '',
  label: '',
  description: '',
  color: '#0ea5e9',
  icon: '',
  sirasi: 0,
  aktif: true,
};

function formDegerleriniBirlestir(
  varsayilanDegerler: Partial<DurumFormVerisi> | undefined
): DurumFormVerisi {
  return {
    ...BOS_FORM,
    ...varsayilanDegerler,
    description: varsayilanDegerler?.description ?? '',
    icon: varsayilanDegerler?.icon ?? '',
    sirasi: varsayilanDegerler?.sirasi ?? 0,
    aktif: varsayilanDegerler?.aktif ?? true,
  };
}

export function DurumDialog({
  acik,
  mod,
  kaydediliyor,
  varsayilanDegerler,
  onAcikDegisti,
  onKaydet,
}: DurumDialogProps) {
  const [form, setForm] = useState<DurumFormVerisi>(formDegerleriniBirlestir(varsayilanDegerler));

  useEffect(() => {
    if (!acik) return;
    setForm(formDegerleriniBirlestir(varsayilanDegerler));
  }, [acik, varsayilanDegerler]);

  const baslik = mod === 'create' ? 'Yeni Durum Ekle' : 'Durum Düzenle';
  const aciklama =
    mod === 'create'
      ? 'Servis durumlarını sistemde dinamik olarak yönetebilirsiniz.'
      : 'Durum bilgilerini güncelleyerek servis akışını düzenleyin.';
  const dialogTestId = useMemo(
    () => (mod === 'create' ? 'status-create-dialog' : 'status-edit-dialog'),
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
              <Label htmlFor="status-key-input">Key</Label>
              <Input
                id="status-key-input"
                data-testid="status-key-input"
                value={form.key}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    key: event.target.value.toUpperCase().replace(/\s+/g, '_'),
                  }))
                }
                placeholder="RANDEVU_VERILDI"
                disabled={kaydediliyor}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-label-input">Etiket</Label>
              <Input
                id="status-label-input"
                data-testid="status-label-input"
                value={form.label}
                onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                placeholder="Randevu Verildi"
                disabled={kaydediliyor}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status-description-input">Açıklama</Label>
            <Textarea
              id="status-description-input"
              data-testid="status-description-input"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Opsiyonel açıklama"
              disabled={kaydediliyor}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="status-color-input">Renk</Label>
              <Input
                id="status-color-input"
                data-testid="status-color-input"
                value={form.color}
                onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                placeholder="#0ea5e9"
                disabled={kaydediliyor}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-icon-input">Icon</Label>
              <Input
                id="status-icon-input"
                data-testid="status-icon-input"
                value={form.icon}
                onChange={(event) => setForm((prev) => ({ ...prev, icon: event.target.value }))}
                placeholder="calendar"
                disabled={kaydediliyor}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-sira-input">Sıra</Label>
              <Input
                id="status-sira-input"
                data-testid="status-sira-input"
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
              <p className="text-sm font-medium text-slate-200">Durum aktif</p>
              <p className="text-xs text-slate-400">Pasif durumlar listelerde gösterilmez.</p>
            </div>
            <Switch
              checked={form.aktif}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, aktif: checked }))}
              disabled={kaydediliyor}
              data-testid="status-active-switch"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onAcikDegisti(false)}>
              İptal
            </Button>
            <Button type="submit" data-testid="status-save-button" disabled={kaydediliyor}>
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

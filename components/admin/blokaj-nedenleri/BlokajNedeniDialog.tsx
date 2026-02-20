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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export type BlokajNedeniFormVerisi = {
  key: string;
  label: string;
  description: string;
  durumKey: string;
  sirasi: number;
  aktif: boolean;
};

export type BlokajNedeniDurumSecenegi = {
  value: string;
  label: string;
};

type BlokajNedeniDialogProps = {
  acik: boolean;
  mod: 'create' | 'edit';
  kaydediliyor: boolean;
  durumSecenekleri: BlokajNedeniDurumSecenegi[];
  varsayilanDegerler?: Partial<BlokajNedeniFormVerisi>;
  onAcikDegisti: (acik: boolean) => void;
  onKaydet: (degerler: BlokajNedeniFormVerisi) => Promise<void>;
};

const BOS_FORM: BlokajNedeniFormVerisi = {
  key: '',
  label: '',
  description: '',
  durumKey: 'PARCA_BEKLIYOR',
  sirasi: 0,
  aktif: true,
};

function formDegerleriniBirlestir(
  varsayilanDegerler: Partial<BlokajNedeniFormVerisi> | undefined,
  durumSecenekleri: BlokajNedeniDurumSecenegi[]
): BlokajNedeniFormVerisi {
  const ilkDurum = durumSecenekleri[0]?.value ?? BOS_FORM.durumKey;
  return {
    ...BOS_FORM,
    durumKey: varsayilanDegerler?.durumKey ?? ilkDurum,
    ...varsayilanDegerler,
    description: varsayilanDegerler?.description ?? '',
    sirasi: varsayilanDegerler?.sirasi ?? 0,
    aktif: varsayilanDegerler?.aktif ?? true,
  };
}

export function BlokajNedeniDialog({
  acik,
  mod,
  kaydediliyor,
  durumSecenekleri,
  varsayilanDegerler,
  onAcikDegisti,
  onKaydet,
}: BlokajNedeniDialogProps) {
  const [form, setForm] = useState<BlokajNedeniFormVerisi>(
    formDegerleriniBirlestir(varsayilanDegerler, durumSecenekleri)
  );

  useEffect(() => {
    if (!acik) return;
    setForm(formDegerleriniBirlestir(varsayilanDegerler, durumSecenekleri));
  }, [acik, durumSecenekleri, varsayilanDegerler]);

  const baslik = mod === 'create' ? 'Yeni Blokaj Nedeni Ekle' : 'Blokaj Nedeni Duzenle';
  const aciklama =
    mod === 'create'
      ? 'Blokaja alma isleminde kullanilan nedenleri yonetin.'
      : 'Neden ve hedef durum bilgisini guncelleyerek akis kurallarini duzenleyin.';
  const dialogTestId = useMemo(
    () => (mod === 'create' ? 'blocking-reason-create-dialog' : 'blocking-reason-edit-dialog'),
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
              <Label htmlFor="blocking-reason-key-input">Key</Label>
              <Input
                id="blocking-reason-key-input"
                data-testid="blocking-reason-key-input"
                value={form.key}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    key: event.target.value.toUpperCase().replace(/\s+/g, '_'),
                  }))
                }
                placeholder="ONAY_BEKLIYOR"
                disabled={kaydediliyor}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="blocking-reason-label-input">Etiket</Label>
              <Input
                id="blocking-reason-label-input"
                data-testid="blocking-reason-label-input"
                value={form.label}
                onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                placeholder="Onay Bekliyor"
                disabled={kaydediliyor}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="blocking-reason-status-select">Hedef Durum</Label>
              <Select
                value={form.durumKey}
                onValueChange={(value) => setForm((prev) => ({ ...prev, durumKey: value }))}
                disabled={kaydediliyor}
              >
                <SelectTrigger id="blocking-reason-status-select" data-testid="blocking-reason-status-select">
                  <SelectValue placeholder="Durum secin" />
                </SelectTrigger>
                <SelectContent>
                  {durumSecenekleri.map((secenek) => (
                    <SelectItem key={secenek.value} value={secenek.value}>
                      {secenek.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="blocking-reason-sira-input">Sira</Label>
              <Input
                id="blocking-reason-sira-input"
                data-testid="blocking-reason-sira-input"
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

          <div className="space-y-2">
            <Label htmlFor="blocking-reason-description-input">Aciklama</Label>
            <Textarea
              id="blocking-reason-description-input"
              data-testid="blocking-reason-description-input"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Opsiyonel aciklama"
              disabled={kaydediliyor}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-slate-800 p-3">
            <div>
              <p className="text-sm font-medium text-slate-200">Neden aktif</p>
              <p className="text-xs text-slate-400">Pasif nedenler blokaj ekraninda listelenmez.</p>
            </div>
            <Switch
              checked={form.aktif}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, aktif: checked }))}
              disabled={kaydediliyor}
              data-testid="blocking-reason-active-switch"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onAcikDegisti(false)}>
              Iptal
            </Button>
            <Button type="submit" data-testid="blocking-reason-save-button" disabled={kaydediliyor}>
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

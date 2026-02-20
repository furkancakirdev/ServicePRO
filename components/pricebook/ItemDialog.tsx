'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
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
import {
  PRICEBOOK_ITEM_TYPE_LABELS,
  PRICEBOOK_ITEM_TYPE_VALUES,
  type PricebookItemRecord,
  type PricebookItemTypeValue,
} from '@/types/pricebook';

export type PricebookCategoryOption = {
  id: string;
  ad: string;
};

export type ItemDialogPayload = {
  tip: PricebookItemTypeValue;
  kod: string | null;
  ad: string;
  aciklama: string | null;
  birim: string | null;
  varsayilanSureSaat: number | null;
  varsayilanFiyat: number | null;
  maliyet: number | null;
  categoryId: string | null;
  aktif: boolean;
};

type ItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: PricebookCategoryOption[];
  initialValue?: PricebookItemRecord | null;
  submitting?: boolean;
  onSubmit: (payload: ItemDialogPayload) => Promise<void> | void;
};

export function ItemDialog({
  open,
  onOpenChange,
  categories,
  initialValue,
  submitting,
  onSubmit,
}: ItemDialogProps) {
  const [tip, setTip] = useState<PricebookItemTypeValue>('HIZMET');
  const [kod, setKod] = useState('');
  const [ad, setAd] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [birim, setBirim] = useState('');
  const [varsayilanSureSaat, setVarsayilanSureSaat] = useState('');
  const [varsayilanFiyat, setVarsayilanFiyat] = useState('');
  const [maliyet, setMaliyet] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [aktif, setAktif] = useState(true);

  const editing = Boolean(initialValue);

  useEffect(() => {
    if (!open) return;

    if (initialValue) {
      setTip(initialValue.tip);
      setKod(initialValue.kod ?? '');
      setAd(initialValue.ad);
      setAciklama(initialValue.aciklama ?? '');
      setBirim(initialValue.birim ?? '');
      setVarsayilanSureSaat(
        initialValue.varsayilanSureSaat !== null ? String(initialValue.varsayilanSureSaat) : ''
      );
      setVarsayilanFiyat(
        initialValue.varsayilanFiyat !== null ? String(initialValue.varsayilanFiyat) : ''
      );
      setMaliyet(initialValue.maliyet !== null ? String(initialValue.maliyet) : '');
      setCategoryId(initialValue.categoryId);
      setAktif(initialValue.aktif);
      return;
    }

    setTip('HIZMET');
    setKod('');
    setAd('');
    setAciklama('');
    setBirim('');
    setVarsayilanSureSaat('');
    setVarsayilanFiyat('');
    setMaliyet('');
    setCategoryId(null);
    setAktif(true);
  }, [initialValue, open]);

  const handleSubmit = async () => {
    const trimmedName = ad.trim();
    if (!trimmedName) {
      toast.error('Kalem adi zorunludur');
      return;
    }

    const sure = varsayilanSureSaat.trim() ? Number(varsayilanSureSaat) : null;
    if (sure !== null && (!Number.isFinite(sure) || sure < 0)) {
      toast.error('Varsayilan sure gecersiz');
      return;
    }

    const fiyat = varsayilanFiyat.trim() ? Number(varsayilanFiyat) : null;
    if (fiyat !== null && (!Number.isFinite(fiyat) || fiyat < 0)) {
      toast.error('Varsayilan fiyat gecersiz');
      return;
    }

    const cost = maliyet.trim() ? Number(maliyet) : null;
    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
      toast.error('Maliyet gecersiz');
      return;
    }

    await onSubmit({
      tip,
      kod: kod.trim() ? kod.trim() : null,
      ad: trimmedName,
      aciklama: aciklama.trim() ? aciklama.trim() : null,
      birim: birim.trim() ? birim.trim() : null,
      varsayilanSureSaat: sure,
      varsayilanFiyat: fiyat,
      maliyet: cost,
      categoryId,
      aktif,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]" data-testid="pricebook-item-dialog">
        <DialogHeader>
          <DialogTitle>{editing ? 'Pricebook Kalem Duzenle' : 'Pricebook Kalem Ekle'}</DialogTitle>
          <DialogDescription>
            Hizmet/malzeme/paket kalemlerini standart kod ve fiyat bilgisi ile yonetin.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Tip</Label>
              <Select value={tip} onValueChange={(value) => setTip(value as PricebookItemTypeValue)}>
                <SelectTrigger data-testid="pricebook-item-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICEBOOK_ITEM_TYPE_VALUES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {PRICEBOOK_ITEM_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricebook-item-kod">Kod</Label>
              <Input
                id="pricebook-item-kod"
                value={kod}
                onChange={(event) => setKod(event.target.value)}
                placeholder="ORN-001"
                data-testid="pricebook-item-kod-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricebook-item-birim">Birim</Label>
              <Input
                id="pricebook-item-birim"
                value={birim}
                onChange={(event) => setBirim(event.target.value)}
                placeholder="adet, saat, paket"
                data-testid="pricebook-item-birim-input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pricebook-item-ad">Ad</Label>
            <Input
              id="pricebook-item-ad"
              value={ad}
              onChange={(event) => setAd(event.target.value)}
              placeholder="Kalem adi"
              data-testid="pricebook-item-ad-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pricebook-item-aciklama">Aciklama</Label>
            <Input
              id="pricebook-item-aciklama"
              value={aciklama}
              onChange={(event) => setAciklama(event.target.value)}
              placeholder="Opsiyonel aciklama"
              data-testid="pricebook-item-aciklama-input"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="pricebook-item-sure">Varsayilan Sure (saat)</Label>
              <Input
                id="pricebook-item-sure"
                type="number"
                min="0"
                step="0.01"
                value={varsayilanSureSaat}
                onChange={(event) => setVarsayilanSureSaat(event.target.value)}
                data-testid="pricebook-item-sure-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricebook-item-fiyat">Varsayilan Fiyat</Label>
              <Input
                id="pricebook-item-fiyat"
                type="number"
                min="0"
                step="0.01"
                value={varsayilanFiyat}
                onChange={(event) => setVarsayilanFiyat(event.target.value)}
                data-testid="pricebook-item-fiyat-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricebook-item-maliyet">Maliyet</Label>
              <Input
                id="pricebook-item-maliyet"
                type="number"
                min="0"
                step="0.01"
                value={maliyet}
                onChange={(event) => setMaliyet(event.target.value)}
                data-testid="pricebook-item-maliyet-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select
                value={categoryId ?? 'NONE'}
                onValueChange={(value) => setCategoryId(value === 'NONE' ? null : value)}
              >
                <SelectTrigger data-testid="pricebook-item-category-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Kategori yok</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.ad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
            <div>
              <p className="text-sm font-medium">Aktif</p>
              <p className="text-xs text-muted-foreground">Pasif kalemler estimate seciminde gorunmez</p>
            </div>
            <Switch checked={aktif} onCheckedChange={setAktif} data-testid="pricebook-item-active-switch" />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Iptal
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting} data-testid="pricebook-item-submit">
            {submitting ? 'Kaydediliyor...' : editing ? 'Guncelle' : 'Olustur'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ItemDialog;

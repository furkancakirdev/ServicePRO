'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Copy, Loader2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { buildServisUrlFromFilterState } from '@/lib/servisler/filter-url';
import {
  normalizeServisFilterState,
  type ServisFilterState,
} from '@/lib/servisler/filter-state';

type KayitliFiltre = {
  id: string;
  name: string;
  state: ServisFilterState;
  createdAt: string;
  updatedAt: string;
};

type SavedFiltersProps = {
  aktifFiltreDurumu: ServisFilterState;
  onFiltreYukle: (state: ServisFilterState) => void;
};

export function SavedFilters({ aktifFiltreDurumu, onFiltreYukle }: SavedFiltersProps) {
  const pathname = usePathname();
  const [kayitlar, setKayitlar] = useState<KayitliFiltre[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [kayitAdi, setKayitAdi] = useState('');

  const normalAktifDurum = useMemo(
    () => normalizeServisFilterState(aktifFiltreDurumu),
    [aktifFiltreDurumu]
  );

  const kayitlariYukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const response = await fetch('/api/servisler/saved-filters');
      if (!response.ok) {
        throw new Error('Kayitli filtreler yuklenemedi');
      }

      const body = (await response.json()) as KayitliFiltre[];
      setKayitlar(Array.isArray(body) ? body : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kayitli filtreler yuklenemedi';
      toast.error(message);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    void kayitlariYukle();
  }, [kayitlariYukle]);

  const filtreKaydet = async () => {
    if (!kayitAdi.trim()) {
      toast.error('Filtre adi zorunludur');
      return;
    }

    if (Object.keys(normalAktifDurum).length === 0) {
      toast.error('Kaydetmek icin once en az bir filtre secin');
      return;
    }

    setKaydediliyor(true);
    try {
      const response = await fetch('/api/servisler/saved-filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: kayitAdi.trim(),
          state: normalAktifDurum,
        }),
      });

      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(body?.error || 'Kayitli filtre kaydedilemedi');
      }

      setKayitAdi('');
      toast.success('Filtre kaydedildi');
      await kayitlariYukle();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Filtre kaydedilemedi';
      toast.error(message);
    } finally {
      setKaydediliyor(false);
    }
  };

  const filtreSil = async (id: string) => {
    try {
      const response = await fetch(`/api/servisler/saved-filters/${id}`, {
        method: 'DELETE',
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(body?.error || 'Filtre silinemedi');
      }

      toast.success('Kayitli filtre silindi');
      await kayitlariYukle();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Filtre silinemedi';
      toast.error(message);
    }
  };

  const filtreBaglantisiKopyala = async (state: ServisFilterState) => {
    const hedef = buildServisUrlFromFilterState(pathname, state);
    const mutlakUrl = `${window.location.origin}${hedef}`;
    try {
      await navigator.clipboard.writeText(mutlakUrl);
      toast.success('Filtre baglantisi panoya kopyalandi');
    } catch {
      toast.error('Filtre baglantisi kopyalanamadi');
    }
  };

  return (
    <div
      className="space-y-2 rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-surface)]/50 p-3"
      data-testid="saved-filters-panel"
    >
      <div className="flex flex-col gap-2 md:flex-row">
        <Input
          value={kayitAdi}
          onChange={(event) => setKayitAdi(event.target.value)}
          placeholder="Filtre adini yazin..."
          className="h-9"
          data-testid="saved-filter-name-input"
        />
        <Button
          type="button"
          onClick={() => void filtreKaydet()}
          disabled={kaydediliyor}
          className="h-9 md:w-auto"
          data-testid="saved-filter-save-button"
        >
          {kaydediliyor ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Kaydediliyor
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Kaydet
            </>
          )}
        </Button>
      </div>

      <div className="space-y-2" data-testid="saved-filter-list">
        {yukleniyor ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Kayitli filtreler yukleniyor...
          </div>
        ) : kayitlar.length === 0 ? (
          <p className="text-xs text-muted-foreground">Kayitli filtre bulunamadi</p>
        ) : (
          kayitlar.map((kayit) => (
            <div
              key={kayit.id}
              className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)]/70 bg-[var(--color-surface)]/70 p-2 md:flex-row md:items-center md:justify-between"
              data-testid="saved-filter-item"
            >
              <button
                type="button"
                className="text-left text-sm font-medium hover:text-[var(--color-primary)]"
                onClick={() => onFiltreYukle(kayit.state)}
                data-testid="saved-filter-apply-button"
              >
                {kayit.name}
              </button>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => void filtreBaglantisiKopyala(kayit.state)}
                  data-testid="saved-filter-share-button"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-destructive hover:text-destructive"
                  onClick={() => void filtreSil(kayit.id)}
                  data-testid="saved-filter-delete-button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type MultiSelectFilterSecenegi = {
  value: string;
  label: string;
  count?: number;
};

type MultiSelectFilterProps = {
  secenekler: MultiSelectFilterSecenegi[];
  seciliDegerler: string[];
  dataTestId: string;
  onDegerDegisti: (degerler: string[]) => void;
};

function testIdParcasiOlustur(deger: string): string {
  return deger.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function MultiSelectFilter({
  secenekler,
  seciliDegerler,
  dataTestId,
  onDegerDegisti,
}: MultiSelectFilterProps) {
  const [arama, setArama] = useState('');
  const seciliSet = useMemo(() => new Set(seciliDegerler), [seciliDegerler]);

  const filtreliSecenekler = useMemo(
    () =>
      secenekler.filter((secenek) =>
        secenek.label.toLocaleLowerCase('tr-TR').includes(arama.toLocaleLowerCase('tr-TR'))
      ),
    [arama, secenekler]
  );

  const secimDegistir = (value: string, secili: boolean) => {
    const sonraki = new Set(seciliSet);
    if (secili) {
      sonraki.add(value);
    } else {
      sonraki.delete(value);
    }
    onDegerDegisti(Array.from(sonraki));
  };

  return (
    <div className="space-y-2 p-2">
      <Input
        value={arama}
        onChange={(event) => setArama(event.target.value)}
        placeholder="Filtre ara..."
        className="h-8"
        data-testid={`${dataTestId}-search-input`}
      />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => onDegerDegisti(secenekler.map((secenek) => secenek.value))}
        >
          Hepsini Seç
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => onDegerDegisti([])}
        >
          Temizle
        </Button>
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {filtreliSecenekler.map((secenek) => {
          const idParcasi = testIdParcasiOlustur(secenek.value);
          const secili = seciliSet.has(secenek.value);

          return (
            <label
              key={secenek.value}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-1 py-1 text-sm hover:bg-accent/70"
            >
              <span className="inline-flex items-center gap-2">
                <Checkbox
                  checked={secili}
                  onCheckedChange={(durum) => secimDegistir(secenek.value, Boolean(durum))}
                  data-testid={`${dataTestId}-option-${idParcasi}`}
                />
                <span>{secenek.label}</span>
              </span>
              <span className="text-xs text-muted-foreground">{secenek.count ?? 0}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

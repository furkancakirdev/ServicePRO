'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type DateRangeFilterProps = {
  baslangic: string;
  bitis: string;
  dataTestId: string;
  onDegerDegisti: (deger: { baslangic: string; bitis: string }) => void;
};

function bugunTarihi(): string {
  return new Date().toISOString().slice(0, 10);
}

function haftaAraligi(): { baslangic: string; bitis: string } {
  const bugun = new Date();
  const gun = bugun.getDay();
  const pazartesiFarki = gun === 0 ? -6 : 1 - gun;
  const baslangic = new Date(bugun);
  baslangic.setDate(bugun.getDate() + pazartesiFarki);
  const bitis = new Date(baslangic);
  bitis.setDate(baslangic.getDate() + 6);
  return {
    baslangic: baslangic.toISOString().slice(0, 10),
    bitis: bitis.toISOString().slice(0, 10),
  };
}

function ayAraligi(): { baslangic: string; bitis: string } {
  const bugun = new Date();
  const yil = bugun.getFullYear();
  const ay = bugun.getMonth();
  const baslangic = new Date(yil, ay, 1);
  const bitis = new Date(yil, ay + 1, 0);
  return {
    baslangic: baslangic.toISOString().slice(0, 10),
    bitis: bitis.toISOString().slice(0, 10),
  };
}

export function DateRangeFilter({
  baslangic,
  bitis,
  dataTestId,
  onDegerDegisti,
}: DateRangeFilterProps) {
  return (
    <div className="space-y-2 p-2">
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="date"
          value={baslangic}
          onChange={(event) => onDegerDegisti({ baslangic: event.target.value, bitis })}
          data-testid={`${dataTestId}-start-input`}
          className="h-8"
        />
        <Input
          type="date"
          value={bitis}
          onChange={(event) => onDegerDegisti({ baslangic, bitis: event.target.value })}
          data-testid={`${dataTestId}-end-input`}
          className="h-8"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => {
            const bugun = bugunTarihi();
            onDegerDegisti({ baslangic: bugun, bitis: bugun });
          }}
        >
          Bugün
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => onDegerDegisti(haftaAraligi())}
        >
          Bu Hafta
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => onDegerDegisti(ayAraligi())}
        >
          Bu Ay
        </Button>
      </div>
    </div>
  );
}

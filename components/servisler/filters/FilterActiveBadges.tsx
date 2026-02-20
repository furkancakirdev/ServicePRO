'use client';

import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type AktifFiltreRozeti = {
  id: string;
  etiket: string;
  deger: string;
  onKaldir: () => void;
};

type FilterActiveBadgesProps = {
  filtreler: AktifFiltreRozeti[];
  onTumunuTemizle: () => void;
};

function testIdParcasiOlustur(deger: string): string {
  return deger.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function FilterActiveBadges({
  filtreler,
  onTumunuTemizle,
}: FilterActiveBadgesProps) {
  if (filtreler.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="inline-filter-active-badges">
      {filtreler.map((filtre) => (
        <Badge
          key={filtre.id}
          variant="outline"
          className="inline-flex items-center gap-2 border-border bg-muted/60 text-foreground"
        >
          <span className="text-xs">
            {filtre.etiket}: {filtre.deger}
          </span>
          <button
            type="button"
            onClick={filtre.onKaldir}
            className="rounded p-0.5 hover:bg-accent/70"
            data-testid={`inline-filter-badge-remove-${testIdParcasiOlustur(filtre.id)}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        onClick={onTumunuTemizle}
        data-testid="inline-filter-clear-all-button"
      >
        Tümünü Temizle
      </Button>
    </div>
  );
}

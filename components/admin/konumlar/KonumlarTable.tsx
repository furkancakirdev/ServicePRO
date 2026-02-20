'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type KonumKaydiDto = {
  id: string;
  key: string;
  label: string;
  adres: string | null;
  telefon: string | null;
  sirasi: number;
  aktif: boolean;
};

type KonumlarTableProps = {
  konumlar: KonumKaydiDto[];
  silinenKonumId: string | null;
  onDuzenle: (konum: KonumKaydiDto) => void;
  onSil: (konum: KonumKaydiDto) => Promise<void>;
};

export function KonumlarTable({
  konumlar,
  silinenKonumId,
  onDuzenle,
  onSil,
}: KonumlarTableProps) {
  return (
    <Table data-testid="konum-list-table">
      <TableHeader>
        <TableRow>
          <TableHead>Key</TableHead>
          <TableHead>Etiket</TableHead>
          <TableHead>Adres</TableHead>
          <TableHead>Telefon</TableHead>
          <TableHead className="text-right">Sıra</TableHead>
          <TableHead>Durum</TableHead>
          <TableHead className="text-right">İşlem</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {konumlar.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-slate-400">
              Henüz konum kaydı bulunmuyor.
            </TableCell>
          </TableRow>
        ) : (
          konumlar.map((konum) => (
            <TableRow key={konum.id}>
              <TableCell className="font-mono text-xs">{konum.key}</TableCell>
              <TableCell className="font-medium text-slate-100">{konum.label}</TableCell>
              <TableCell>{konum.adres ?? '-'}</TableCell>
              <TableCell>{konum.telefon ?? '-'}</TableCell>
              <TableCell className="text-right">{konum.sirasi}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${
                    konum.aktif
                      ? 'border-emerald-500/40 text-emerald-300'
                      : 'border-slate-600 text-slate-400'
                  }`}
                >
                  {konum.aktif ? 'Aktif' : 'Pasif'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="inline-flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    data-testid={`konum-edit-button-${konum.key}`}
                    onClick={() => onDuzenle(konum)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    data-testid={`konum-delete-button-${konum.key}`}
                    disabled={silinenKonumId === konum.id}
                    onClick={async () => onSil(konum)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

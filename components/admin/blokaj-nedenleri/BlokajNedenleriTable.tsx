'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type BlokajNedeniKaydiDto = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  durumKey: string;
  sirasi: number;
  aktif: boolean;
};

type BlokajNedenleriTableProps = {
  nedenler: BlokajNedeniKaydiDto[];
  silinenNedenId: string | null;
  onDuzenle: (neden: BlokajNedeniKaydiDto) => void;
  onSil: (neden: BlokajNedeniKaydiDto) => Promise<void>;
};

export function BlokajNedenleriTable({
  nedenler,
  silinenNedenId,
  onDuzenle,
  onSil,
}: BlokajNedenleriTableProps) {
  return (
    <Table data-testid="blocking-reason-list-table">
      <TableHeader>
        <TableRow>
          <TableHead>Key</TableHead>
          <TableHead>Etiket</TableHead>
          <TableHead>Hedef Durum</TableHead>
          <TableHead>Aciklama</TableHead>
          <TableHead className="text-right">Sira</TableHead>
          <TableHead>Durum</TableHead>
          <TableHead className="text-right">Islem</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {nedenler.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-slate-400">
              Henuz blokaj nedeni kaydi bulunmuyor.
            </TableCell>
          </TableRow>
        ) : (
          nedenler.map((neden) => (
            <TableRow key={neden.id}>
              <TableCell className="font-mono text-xs">{neden.key}</TableCell>
              <TableCell className="font-medium text-slate-100">{neden.label}</TableCell>
              <TableCell>{neden.durumKey}</TableCell>
              <TableCell className="max-w-[260px] truncate">{neden.description ?? '-'}</TableCell>
              <TableCell className="text-right">{neden.sirasi}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${
                    neden.aktif
                      ? 'border-emerald-500/40 text-emerald-300'
                      : 'border-slate-600 text-slate-400'
                  }`}
                >
                  {neden.aktif ? 'Aktif' : 'Pasif'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="inline-flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    data-testid={`blocking-reason-edit-button-${neden.key}`}
                    onClick={() => onDuzenle(neden)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    data-testid={`blocking-reason-delete-button-${neden.key}`}
                    disabled={silinenNedenId === neden.id}
                    onClick={async () => onSil(neden)}
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

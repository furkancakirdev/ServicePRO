'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type UnvanKaydiDto = {
  id: string;
  key: string;
  label: string;
  puanCarpani: number;
  sirasi: number;
  aktif: boolean;
};

type UnvanlarTableProps = {
  unvanlar: UnvanKaydiDto[];
  silinenUnvanId: string | null;
  onDuzenle: (unvan: UnvanKaydiDto) => void;
  onSil: (unvan: UnvanKaydiDto) => Promise<void>;
};

export function UnvanlarTable({
  unvanlar,
  silinenUnvanId,
  onDuzenle,
  onSil,
}: UnvanlarTableProps) {
  return (
    <Table data-testid="unvan-list-table">
      <TableHeader>
        <TableRow>
          <TableHead>Key</TableHead>
          <TableHead>Etiket</TableHead>
          <TableHead className="text-right">Puan Çarpanı</TableHead>
          <TableHead className="text-right">Sıra</TableHead>
          <TableHead>Durum</TableHead>
          <TableHead className="text-right">İşlem</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {unvanlar.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-slate-400">
              Henüz unvan kaydı bulunmuyor.
            </TableCell>
          </TableRow>
        ) : (
          unvanlar.map((unvan) => (
            <TableRow key={unvan.id}>
              <TableCell className="font-mono text-xs">{unvan.key}</TableCell>
              <TableCell className="font-medium text-slate-100">{unvan.label}</TableCell>
              <TableCell className="text-right">{unvan.puanCarpani}</TableCell>
              <TableCell className="text-right">{unvan.sirasi}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${
                    unvan.aktif
                      ? 'border-emerald-500/40 text-emerald-300'
                      : 'border-slate-600 text-slate-400'
                  }`}
                >
                  {unvan.aktif ? 'Aktif' : 'Pasif'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="inline-flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    data-testid={`unvan-edit-button-${unvan.key}`}
                    onClick={() => onDuzenle(unvan)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    data-testid={`unvan-delete-button-${unvan.key}`}
                    disabled={silinenUnvanId === unvan.id}
                    onClick={async () => onSil(unvan)}
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
